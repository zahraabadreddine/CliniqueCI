// ─── Espace Médecin ───
// Pages: dashboard, agenda, patients, consultation, prescriptions, facturation, stats

// ── Dashboard
function MedecinDashboard({ currentUser, onNavigate, onSetAIContext }) {
  const store = useStore();
  const today = window.CCI.todayStr;
  const todays = store.appointments.filter(a => a.date === today && a.medecinId === currentUser.id);
  const waiting = todays.filter(a => a.status === 'waiting' || a.status === 'in-room');
  const upcoming = todays.filter(a => a.status === 'confirmed');
  const done = todays.filter(a => a.status === 'done');
  const todayRevenue = store.invoices
    .filter(i => i.date === today && i.status === 'paid')
    .reduce((s, i) => s + i.total, 0);
  const unpaidCount = store.invoices.filter(i => i.status !== 'paid').length;

  return (
    <>
      <PageHeader
        title={`Bonjour, Dr. ${currentUser.lastName}`}
        subtitle={`${formatDateLong(today)} · ${todays.length} consultations prévues`}
      >
        <button className="btn btn-secondary" onClick={() => onNavigate('agenda')}>
          <Icon name="calendar" size={15}/> Voir l'agenda
        </button>
        <button className="btn btn-primary" onClick={() => onNavigate('consultation')}>
          <Icon name="stethoscope" size={15}/> Démarrer une consultation
        </button>
      </PageHeader>

      <div className="grid-4 mb-3">
        <KPI label="Patients aujourd'hui" value={todays.length} delta="+2 vs hier"/>
        <KPI label="En salle d'attente" value={waiting.length} delta={waiting.length > 0 ? 'à voir maintenant' : 'aucun'} deltaDir={waiting.length > 0 ? 'down' : 'up'}/>
        <KPI label="Consultations terminées" value={done.length}/>
        <KPI label="Recettes du jour" value={new Intl.NumberFormat('fr-FR').format(todayRevenue) + ' F'} delta={unpaidCount + ' factures à encaisser'}/>
      </div>

      <div className="grid-main-side">
        <div className="card">
          <div className="card-title">
            <span>Prochains patients</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('agenda')}>
              Tout voir <Icon name="chevronRight" size={13}/>
            </button>
          </div>
          {[...waiting, ...upcoming].slice(0, 6).length === 0 ? (
            <EmptyState icon="calendar" title="Aucun RDV à venir aujourd'hui" message="Profitez d'une pause méritée."/>
          ) : (
            <div className="data-list">
              {[...waiting, ...upcoming].slice(0, 6).map(a => {
                const p = window.CCI.findPatient(a.patientId);
                return (
                  <div key={a.id} className="data-row">
                    <div className="mono fw-600" style={{ width: 56, color: 'var(--muted)' }}>{a.time}</div>
                    <Avatar initials={p.initials} color={p.color}/>
                    <div style={{ flex: 1 }}>
                      <div className="fw-600">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-muted">{a.reason}</div>
                    </div>
                    <ApptStatusBadge status={a.status}/>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { onSetAIContext({ patientId: p.id, reason: a.reason }); onNavigate('consultation', { apptId: a.id }); }}
                    >
                      Démarrer →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="col gap-lg">
          <div className="card card-subtle">
            <div className="row" style={{ gap: '.75rem', marginBottom: '.75rem' }}>
              <div className="ai-assist-mark"><Icon name="sparkles" size={13}/></div>
              <div className="fw-600">Brief du jour par Awa</div>
            </div>
            <div className="text-sm" style={{ color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              {waiting.length > 0 ? (
                <>
                  <strong>{waiting.length}</strong> patient{waiting.length > 1 ? 's' : ''} en salle d'attente.{' '}
                  Le prochain est <strong>{(() => {
                    const p = window.CCI.findPatient(waiting[0].patientId);
                    return `${p.firstName} ${p.lastName}`;
                  })()}</strong> pour <em>{waiting[0].reason}</em>.
                </>
              ) : (
                <>Tous vos patients sont à l'heure. Votre prochaine consultation est à <strong>{upcoming[0]?.time || '—'}</strong>.</>
              )}
              <br/><br/>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onSetAIContext({})}
              >
                <Icon name="sparkles" size={12}/> Approfondir avec Awa
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Raccourcis</div>
            <div className="col" style={{ gap: '.4rem' }}>
              <button className="btn btn-secondary full-w" onClick={() => onNavigate('patients')}>
                <Icon name="users" size={14}/> Rechercher un patient
              </button>
              <button className="btn btn-secondary full-w" onClick={() => onNavigate('prescriptions')}>
                <Icon name="pill" size={14}/> Mes ordonnances
              </button>
              <button className="btn btn-secondary full-w" onClick={() => onNavigate('facturation')}>
                <Icon name="invoice" size={14}/> Facturation
              </button>
              <button className="btn btn-secondary full-w" onClick={() => onNavigate('stats')}>
                <Icon name="chart" size={14}/> Statistiques
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Agenda
function MedecinAgenda({ currentUser, onStartConsult, onSetAIContext }) {
  const store = useStore();
  const [dateStr, setDateStr] = useState(window.CCI.todayStr);
  const slots = useMemo(() => timeSlots(8, 18, 30), []);
  const list = store.appointments.filter(a => a.date === dateStr && a.medecinId === currentUser.id);
  const byTime = Object.fromEntries(list.map(a => [a.time, a]));

  function shiftDay(delta) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + delta);
    setDateStr(d.toISOString().slice(0, 10));
  }

  function updateApptStatus(id, status) {
    window.CCI.set(prev => ({
      ...prev,
      appointments: prev.appointments.map(a => a.id === id ? { ...a, status } : a),
    }));
  }

  return (
    <>
      <PageHeader title="Agenda" subtitle={formatDateLong(dateStr)}>
        <div className="row">
          <button className="icon-btn" onClick={() => shiftDay(-1)}><Icon name="chevronLeft"/></button>
          <button className="btn btn-secondary btn-sm" onClick={() => setDateStr(window.CCI.todayStr)}>Aujourd'hui</button>
          <button className="icon-btn" onClick={() => shiftDay(1)}><Icon name="chevronRight"/></button>
        </div>
      </PageHeader>

      <div className="grid-main-side">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '.75rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', fontSize: 12, color: 'var(--muted)' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--green)', borderRadius: 2, marginRight: 6 }}/>Confirmé</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--gold)', borderRadius: 2, marginRight: 6 }}/>En attente</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--blue)', borderRadius: 2, marginRight: 6 }}/>En consultation</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--muted-light)', borderRadius: 2, marginRight: 6 }}/>Terminé</span>
          </div>
          <div>
            {slots.map(t => {
              const a = byTime[t];
              return (
                <div key={t} className="time-slot">
                  <div className="time-label">{t}</div>
                  <div className="time-slot-content">
                    {a ? (() => {
                      const p = window.CCI.findPatient(a.patientId);
                      return (
                        <div className={`appt-card ${a.status}`}>
                          <div className="row-between">
                            <div style={{ flex: 1 }}>
                              <div className="appt-name">{p.firstName} {p.lastName} <span className="text-xs text-muted">· {p.age} ans</span></div>
                              <div className="appt-reason">{a.reason}</div>
                              <div className="appt-meta">
                                <ApptStatusBadge status={a.status}/>
                                <span className="text-xs text-muted">{a.duration} min · via {a.channel === 'app' ? 'app' : a.channel === 'phone' ? 'téléphone' : 'sur place'}</span>
                              </div>
                            </div>
                            <div className="row" style={{ gap: 4 }}>
                              {a.status === 'waiting' && (
                                <button className="btn btn-primary btn-sm" onClick={() => { updateApptStatus(a.id, 'in-room'); onSetAIContext({ patientId: p.id, reason: a.reason }); onStartConsult(a.id); }}>
                                  Faire entrer
                                </button>
                              )}
                              {a.status === 'in-room' && (
                                <button className="btn btn-primary btn-sm" onClick={() => onStartConsult(a.id)}>
                                  Reprendre
                                </button>
                              )}
                              {a.status === 'confirmed' && (
                                <button className="btn btn-secondary btn-sm" onClick={() => updateApptStatus(a.id, 'waiting')}>
                                  Arrivé
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="text-xs text-muted" style={{ padding: '.5rem .25rem', opacity: .5 }}>Libre</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col gap-lg">
          <div className="card card-subtle">
            <div className="card-title" style={{ marginBottom: '.65rem' }}>Aperçu de la journée</div>
            <div className="col gap-sm">
              <div className="row-between text-sm"><span>Total</span><span className="fw-600">{list.length}</span></div>
              <div className="row-between text-sm"><span>Terminés</span><span className="fw-600">{list.filter(a => a.status === 'done').length}</span></div>
              <div className="row-between text-sm"><span>En attente</span><span className="fw-600text-red">{list.filter(a => a.status === 'waiting').length}</span></div>
              <div className="row-between text-sm"><span>À venir</span><span className="fw-600">{list.filter(a => a.status === 'confirmed').length}</span></div>
            </div>
          </div>

          <AIAssistBox label="Suggestion Awa">
            Vous avez 30 min de battement à 11h00. Souhaitez-vous proposer ce créneau aux patients en liste d'attente ?
          </AIAssistBox>
        </div>
      </div>
    </>
  );
}

// ── Patients list + detail
function MedecinPatients({ onOpenPatient, onSetAIContext }) {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = store.patients.filter(p => {
    const m = (p.firstName + ' ' + p.lastName).toLowerCase().includes(query.toLowerCase());
    if (!m) return false;
    if (filter === 'chronic' && !p.chronic?.length) return false;
    if (filter === 'allergy' && !p.allergies?.length) return false;
    return true;
  });

  return (
    <>
      <PageHeader title="Patients" subtitle={`${store.patients.length} dossiers actifs`}>
        <button className="btn btn-secondary"><Icon name="download" size={14}/> Exporter</button>
        <button className="btn btn-primary"><Icon name="plus" size={14}/> Nouveau patient</button>
      </PageHeader>

      <div className="card mb-2" style={{ padding: '.85rem 1rem' }}>
        <div className="row">
          <div className="row" style={{ flex: 1, gap: '.5rem', background: 'var(--cream)', padding: '.45rem .75rem', borderRadius: 8 }}>
            <Icon name="search" size={15} color="var(--muted)"/>
            <input
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13.5 }}
              placeholder="Rechercher un patient par nom, téléphone ou ID…"
              value={query} onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="row gap-sm">
            {[
              ['all', 'Tous'],
              ['chronic', 'Maladie chronique'],
              ['allergy', 'Allergies'],
            ].map(([k, l]) => (
              <button key={k} className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="simple">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Âge · Sexe</th>
              <th>Téléphone</th>
              <th>Allergies</th>
              <th>Dernière visite</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="row">
                    <Avatar initials={p.initials} color={p.color} size="sm"/>
                    <div>
                      <div className="fw-600">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-muted">{p.id} · {p.bloodType}</div>
                    </div>
                  </div>
                </td>
                <td className="text-sm">{p.age} ans · {p.gender === 'M' ? 'H' : 'F'}</td>
                <td className="text-sm mono">{p.phone}</td>
                <td>{p.allergies?.length ? p.allergies.map(a => <span key={a} className="badge red" style={{ marginRight: 4 }}>{a}</span>) : <span className="text-xs text-muted">—</span>}</td>
                <td className="text-sm">{formatDateFR(p.lastVisit)}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => { onSetAIContext({ patientId: p.id }); onOpenPatient(p.id); }}>
                    Ouvrir <Icon name="chevronRight" size={13}/>
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="6"><EmptyState icon="search" title="Aucun résultat" message="Essayez un autre nom ou retirez les filtres."/></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PatientDetailDrawer({ patientId, open, onClose, onSetAIContext }) {
  const store = useStore();
  const p = patientId && window.CCI.findPatient(patientId);
  if (!open || !p) return null;

  const visits = store.consultations.filter(c => c.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  const rxs = store.prescriptions.filter(r => r.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  const appts = store.appointments.filter(a => a.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Drawer open={open} onClose={onClose} title={`${p.firstName} ${p.lastName}`}>
      <div className="row gap-lg mb-3">
        <Avatar initials={p.initials} color={p.color} size="lg"/>
        <div style={{ flex: 1 }}>
          <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{p.firstName} {p.lastName}</div>
          <div className="text-muted text-sm">{p.age} ans · {p.gender === 'M' ? 'Homme' : 'Femme'} · né(e) {formatDateFR(p.birth)}</div>
          <div className="row gap-sm mt-1">
            <span className="badge green">Groupe {p.bloodType}</span>
            {p.allergies?.map(a => <span key={a} className="badge red">⚠ {a}</span>)}
            {p.chronic?.map(c => <span key={c} className="badge gold">{c}</span>)}
          </div>
        </div>
      </div>

      <AIAssistBox
        label="Synthèse Awa"
        action={
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onSetAIContext({ patientId: p.id })}
          >
            Demander à Awa
          </button>
        }
      >
        {p.chronic?.length
          ? `Patient suivi pour ${p.chronic.join(', ').toLowerCase()}. ${rxs.filter(r => r.status === 'active').length} ordonnance(s) active(s). Dernière visite le ${formatDateFR(p.lastVisit)}.`
          : `Pas d'antécédent chronique connu. ${visits.length} consultation(s) dans l'historique. Dernière visite le ${formatDateFR(p.lastVisit)}.`}
      </AIAssistBox>

      <div className="grid-2 mt-3 mb-3">
        <div className="card" style={{ padding: '.85rem 1rem' }}>
          <div className="text-xs text-muted">Téléphone</div>
          <div className="fw-600 mono">{p.phone}</div>
        </div>
        <div className="card" style={{ padding: '.85rem 1rem' }}>
          <div className="text-xs text-muted">Assurance</div>
          <div className="fw-600">{p.insurance?.provider || 'Aucune'} {p.insurance?.number ? `· ${p.insurance.number}` : ''}</div>
        </div>
      </div>

      <div className="card mb-2">
        <div className="card-title">Historique consultations ({visits.length})</div>
        {visits.length === 0 ? <div className="text-sm text-muted">Aucune consultation enregistrée.</div> :
          visits.map(v => (
            <div key={v.id} style={{ padding: '.65rem 0', borderTop: '1px solid var(--border)' }}>
              <div className="row-between">
                <div className="fw-600 text-sm">{formatDateFR(v.date)} — {v.reason}</div>
                <span className="badge muted">{v.vitals?.tension}</span>
              </div>
              <div className="text-xs text-muted mt-1">{v.diagnosis}</div>
            </div>
          ))}
      </div>

      <div className="card mb-2">
        <div className="card-title">Ordonnances ({rxs.length})</div>
        {rxs.length === 0 ? <div className="text-sm text-muted">Aucune ordonnance.</div> :
          rxs.map(r => (
            <div key={r.id} style={{ padding: '.65rem 0', borderTop: '1px solid var(--border)' }}>
              <div className="row-between text-sm">
                <span className="fw-600">{formatDateFR(r.date)}</span>
                <span className={`badge ${r.status === 'active' ? 'green' : 'muted'}`}>{r.status === 'active' ? 'Active' : 'Archivée'}</span>
              </div>
              <div className="text-xs text-muted mt-1">{r.items.map(i => i.med).join(' · ')}</div>
            </div>
          ))}
      </div>

      <div className="card">
        <div className="card-title">Rendez-vous ({appts.length})</div>
        {appts.slice(0, 6).map(a => (
          <div key={a.id} style={{ padding: '.55rem 0', borderTop: '1px solid var(--border)' }} className="row-between">
            <div className="text-sm">
              <span className="fw-600">{formatDateFR(a.date)} {a.time}</span>
              <span className="text-muted"> · {a.reason}</span>
            </div>
            <ApptStatusBadge status={a.status}/>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

// ── Consultation en cours
function MedecinConsultation({ currentUser, apptId, onSetAIContext, onDone }) {
  const store = useStore();
  const toast = useToast();
  const today = window.CCI.todayStr;

  // Auto-pick first waiting/in-room appt if no specific
  const targetAppt = apptId
    ? store.appointments.find(a => a.id === apptId)
    : store.appointments.find(a => a.date === today && a.medecinId === currentUser.id && (a.status === 'in-room' || a.status === 'waiting'));

  const [vitals, setVitals] = useState({ tension: '', pouls: '', temp: '', poids: '' });
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [rxItems, setRxItems] = useState([{ med: '', pos: '' }]);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  useEffect(() => {
    if (targetAppt) onSetAIContext({ patientId: targetAppt.patientId, reason: targetAppt.reason });
  }, [targetAppt?.id]);

  if (!targetAppt) {
    return (
      <>
        <PageHeader title="Consultation" subtitle="Aucun patient en consultation"/>
        <div className="card">
          <EmptyState
            icon="stethoscope"
            title="Personne en salle de consultation"
            message="Sélectionnez un patient depuis l'agenda pour démarrer."
            action={<button className="btn btn-primary mt-2" onClick={() => onDone()}>Retour à l'agenda</button>}
          />
        </div>
      </>
    );
  }

  const p = window.CCI.findPatient(targetAppt.patientId);
  const lastConsult = store.consultations.filter(c => c.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
  const activeRx = store.prescriptions.filter(r => r.patientId === p.id && r.status === 'active');

  async function askAIForPlan() {
    setAiSuggesting(true); setAiSuggestion('');
    const prompt = `Patient : ${p.firstName} ${p.lastName}, ${p.age} ans, groupe ${p.bloodType}.
Allergies : ${p.allergies?.join(', ') || 'aucune'}.
Antécédents : ${p.chronic?.join(', ') || 'aucun'}.
Traitements actuels : ${activeRx.flatMap(r => r.items.map(i => i.med)).join(', ') || 'aucun'}.
Motif de visite : ${targetAppt.reason}.
Constantes : ${vitals.tension ? 'TA ' + vitals.tension : '—'}, ${vitals.pouls ? 'pouls ' + vitals.pouls : '—'}, ${vitals.temp ? 'temp. ' + vitals.temp + '°C' : '—'}.
Symptômes décrits : ${symptoms || 'à recueillir'}.

Propose en 4-5 lignes : 1) 2 ou 3 hypothèses diagnostiques plausibles, 2) examens complémentaires à envisager, 3) ébauche de plan de prise en charge. Termine par une note de prudence brève. N'invente pas de données.`;
    try {
      const r = await window.claude.complete({
        system: "Tu es Awa, assistant IA pour médecins en Côte d'Ivoire. Tu réponds en français, court, professionnel. Tu ne poses jamais de diagnostic définitif.",
        messages: [{ role: 'user', content: prompt }],
      });
      setAiSuggestion(r || '');
    } catch (e) {
      setAiSuggestion("Impossible de joindre Awa pour l'instant. Réessayez.");
    } finally {
      setAiSuggesting(false);
    }
  }

  function addRxLine() { setRxItems([...rxItems, { med: '', pos: '' }]); }
  function setRxLine(i, field, val) {
    setRxItems(rxItems.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }
  function removeRxLine(i) {
    setRxItems(rxItems.filter((_, idx) => idx !== i));
  }

  function finish() {
    if (!diagnosis.trim()) {
      toast("Veuillez renseigner un diagnostic avant de clôturer.", "error");
      return;
    }
    const consultId = 'cons-' + Date.now();
    const newConsult = {
      id: consultId,
      patientId: p.id, medecinId: currentUser.id, date: today,
      reason: targetAppt.reason, vitals, symptoms, diagnosis, notes,
    };
    const validRx = rxItems.filter(it => it.med.trim());
    const newRx = validRx.length ? [{
      id: 'rx-' + Date.now(), patientId: p.id, medecinId: currentUser.id, date: today,
      items: validRx, status: 'active',
    }] : [];
    const newInvoice = {
      id: 'fac-' + Date.now(), patientId: p.id, date: today,
      items: [{ label: 'Consultation médecine générale', amount: 15000 }],
      total: 15000, status: 'pending',
    };
    window.CCI.set(prev => ({
      ...prev,
      consultations: [...prev.consultations, newConsult],
      prescriptions: [...prev.prescriptions, ...newRx],
      invoices: [...prev.invoices, newInvoice],
      appointments: prev.appointments.map(a => a.id === targetAppt.id ? { ...a, status: 'done' } : a),
      patients: prev.patients.map(pp => pp.id === p.id ? { ...pp, lastVisit: today } : pp),
    }));
    toast(`Consultation clôturée pour ${p.firstName}. Ordonnance envoyée par SMS.`, "success");
    onDone();
  }

  return (
    <>
      <PageHeader
        title="Consultation en cours"
        subtitle={`${p.firstName} ${p.lastName} · ${p.age} ans · motif : ${targetAppt.reason}`}
      >
        <button className="btn btn-secondary" onClick={onDone}>Mettre en pause</button>
        <button className="btn btn-primary" onClick={finish}>
          <Icon name="check" size={14}/> Clôturer
        </button>
      </PageHeader>

      <div className="grid-main-side">
        <div className="col gap-lg">

          <div className="card">
            <div className="card-title">
              <span>Patient — synthèse rapide</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onSetAIContext({ patientId: p.id, reason: targetAppt.reason })}>
                <Icon name="sparkles" size={12}/> Approfondir avec Awa
              </button>
            </div>
            <div className="row gap-lg">
              <Avatar initials={p.initials} color={p.color} size="lg"/>
              <div style={{ flex: 1 }}>
                <div className="row gap-sm mb-1">
                  <span className="badge green">Groupe {p.bloodType}</span>
                  {p.allergies?.map(a => <span key={a} className="badge red">⚠ {a}</span>)}
                  {p.chronic?.map(c => <span key={c} className="badge gold">{c}</span>)}
                </div>
                <div className="text-sm text-muted">
                  {lastConsult ? `Dernière visite : ${formatDateFR(lastConsult.date)} — ${lastConsult.diagnosis}` : 'Première consultation enregistrée.'}
                </div>
                {activeRx.length > 0 && (
                  <div className="text-sm mt-1">
                    <strong>Traitement en cours :</strong> {activeRx.flatMap(r => r.items.map(i => i.med)).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Constantes</div>
            <div className="grid-4">
              <div className="field">
                <label>Tension (mmHg)</label>
                <input className="input" placeholder="120/80" value={vitals.tension} onChange={e => setVitals({ ...vitals, tension: e.target.value })}/>
              </div>
              <div className="field">
                <label>Pouls (bpm)</label>
                <input className="input" placeholder="72" value={vitals.pouls} onChange={e => setVitals({ ...vitals, pouls: e.target.value })}/>
              </div>
              <div className="field">
                <label>Température (°C)</label>
                <input className="input" placeholder="36.8" value={vitals.temp} onChange={e => setVitals({ ...vitals, temp: e.target.value })}/>
              </div>
              <div className="field">
                <label>Poids (kg)</label>
                <input className="input" placeholder="70" value={vitals.poids} onChange={e => setVitals({ ...vitals, poids: e.target.value })}/>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Anamnèse · Symptômes</div>
            <textarea className="textarea" placeholder="Décrivez les symptômes rapportés par le patient…" value={symptoms} onChange={e => setSymptoms(e.target.value)}/>
          </div>

          <div className="card">
            <div className="card-title">
              <span>Hypothèses & plan</span>
              <button className="btn btn-secondary btn-sm" onClick={askAIForPlan} disabled={aiSuggesting}>
                {aiSuggesting ? <span className="spinner"/> : <Icon name="sparkles" size={12}/>}
                {aiSuggesting ? ' Awa réfléchit…' : ' Demander un plan à Awa'}
              </button>
            </div>
            {aiSuggestion && (
              <div className="mb-2">
                <AIAssistBox label="Proposition d'Awa">
                  <span style={{ whiteSpace: 'pre-wrap' }}>{aiSuggestion}</span>
                  <div className="text-xs text-muted mt-1" style={{ marginTop: 8 }}>
                    ⚠ Suggestion IA — à valider par votre jugement clinique.
                  </div>
                </AIAssistBox>
              </div>
            )}
            <div className="field mb-2">
              <label>Diagnostic / Impression</label>
              <textarea className="textarea" placeholder="Diagnostic principal et hypothèses…" value={diagnosis} onChange={e => setDiagnosis(e.target.value)}/>
            </div>
            <div className="field">
              <label>Notes complémentaires (visibles uniquement par vous)</label>
              <textarea className="textarea" placeholder="Examens demandés, suivi, etc." value={notes} onChange={e => setNotes(e.target.value)}/>
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <span>Ordonnance</span>
              <button className="btn btn-secondary btn-sm" onClick={addRxLine}><Icon name="plus" size={12}/> Ligne</button>
            </div>
            {rxItems.map((it, i) => (
              <div key={i} className="grid-2 mb-1" style={{ gridTemplateColumns: '1fr 1.4fr auto', gap: '.5rem', alignItems: 'flex-end' }}>
                <div className="field">
                  {i === 0 && <label>Médicament</label>}
                  <input className="input" placeholder="Ex. Paracétamol 1000mg" value={it.med} onChange={e => setRxLine(i, 'med', e.target.value)}/>
                </div>
                <div className="field">
                  {i === 0 && <label>Posologie / durée</label>}
                  <input className="input" placeholder="Ex. 1 cp x 3/jour — 5 jours" value={it.pos} onChange={e => setRxLine(i, 'pos', e.target.value)}/>
                </div>
                <button className="icon-btn" onClick={() => removeRxLine(i)} style={{ color: 'var(--red)' }}><Icon name="trash" size={15}/></button>
              </div>
            ))}
            <div className="text-xs text-muted mt-2">
              <Icon name="info" size={11} style={{ verticalAlign: '-2px' }}/> L'ordonnance sera envoyée au patient par SMS + accessible dans son espace.
            </div>
          </div>

        </div>

        <div className="col gap-lg">
          <div className="card card-subtle">
            <div className="card-title">Allergies & interactions</div>
            {p.allergies?.length ? (
              <div className="text-sm">
                ⚠ Allergie connue à <strong>{p.allergies.join(', ')}</strong>. Évitez ces molécules et leurs dérivés dans l'ordonnance.
              </div>
            ) : (
              <div className="text-sm text-muted">Aucune allergie connue déclarée.</div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Visites précédentes</div>
            {store.consultations.filter(c => c.patientId === p.id).slice(0, 3).map(v => (
              <div key={v.id} style={{ padding: '.55rem 0', borderTop: '1px solid var(--border)' }}>
                <div className="text-sm fw-600">{formatDateFR(v.date)}</div>
                <div className="text-xs text-muted">{v.diagnosis}</div>
              </div>
            ))}
            {store.consultations.filter(c => c.patientId === p.id).length === 0 && (
              <div className="text-sm text-muted">Aucun historique.</div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Timer de consultation</div>
            <ConsultTimer/>
          </div>
        </div>
      </div>
    </>
  );
}

function ConsultTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(i);
  }, [running]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return (
    <div>
      <div className="serif" style={{ fontSize: '2rem', fontWeight: 700, textAlign: 'center', marginBottom: '.5rem' }}>
        {mm}:{ss}
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: '.4rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Reprendre'}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setSeconds(0); setRunning(true); }}>Réinitialiser</button>
      </div>
    </div>
  );
}

// ── Prescriptions list
function MedecinPrescriptions() {
  const store = useStore();
  const list = [...store.prescriptions].sort((a, b) => b.date.localeCompare(a.date));
  const [openId, setOpenId] = useState(null);
  return (
    <>
      <PageHeader title="Ordonnances" subtitle={`${list.length} ordonnances émises`}>
        <button className="btn btn-secondary"><Icon name="download" size={14}/> Exporter PDF</button>
      </PageHeader>

      <div className="card" style={{ padding: 0 }}>
        <table className="simple">
          <thead><tr>
            <th>Date</th><th>Patient</th><th>Médicaments</th><th>Statut</th><th></th>
          </tr></thead>
          <tbody>
            {list.map(r => {
              const p = window.CCI.findPatient(r.patientId);
              return (
                <tr key={r.id}>
                  <td className="text-sm mono">{formatDateFR(r.date)}</td>
                  <td className="row" style={{ padding: '.85rem .75rem' }}>
                    <Avatar initials={p.initials} color={p.color} size="sm"/>
                    <span className="fw-600 text-sm">{p.firstName} {p.lastName}</span>
                  </td>
                  <td className="text-sm">{r.items.map(i => i.med).join(' · ')}</td>
                  <td><span className={`badge ${r.status === 'active' ? 'green' : 'muted'}`}>{r.status === 'active' ? 'Active' : 'Archivée'}</span></td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => setOpenId(r.id)}>Voir <Icon name="chevronRight" size={13}/></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Ordonnance" size="lg"
        footer={<>
          <button className="btn btn-secondary"><Icon name="print" size={14}/> Imprimer</button>
          <button className="btn btn-secondary"><Icon name="download" size={14}/> PDF</button>
          <button className="btn btn-primary"><Icon name="send" size={14}/> Envoyer SMS</button>
        </>}>
        {openId && (() => {
          const r = list.find(x => x.id === openId);
          const p = window.CCI.findPatient(r.patientId);
          return (
            <div className="rx-doc">
              <div className="row-between mb-2">
                <div>
                  <div className="serif" style={{ fontSize: '1.4rem', color: 'var(--green)', fontWeight: 700 }}>CliniqueCI</div>
                  <div className="text-xs text-muted">{window.CCI.store.clinic.name} · {window.CCI.store.clinic.address}</div>
                </div>
                <div className="text-xs text-muted text-right">
                  Ordonnance n° <span className="mono">{r.id.toUpperCase()}</span><br/>
                  {formatDateLong(r.date)}
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '.85rem 0', marginBottom: '1rem' }}>
                <div className="text-xs text-muted">Patient</div>
                <div className="fw-600">{p.firstName} {p.lastName} · {p.age} ans · groupe {p.bloodType}</div>
                {p.allergies?.length > 0 && <div className="text-xs text-red mt-1">⚠ Allergies : {p.allergies.join(', ')}</div>}
              </div>
              <h4>Prescription</h4>
              {r.items.map((it, i) => (
                <div key={i} className="rx-line">
                  <div className="rx-med">{i + 1}. {it.med}</div>
                  <div className="rx-pos">{it.pos}</div>
                </div>
              ))}
              <div className="mt-3" style={{ textAlign: 'right' }}>
                <div className="text-xs text-muted">Dr. Aminata Koné</div>
                <div className="text-xs text-muted">Médecine générale · Ordre #CI-MG-4421</div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}

// ── Facturation
function MedecinFacturation() {
  const store = useStore();
  const list = [...store.invoices].sort((a, b) => b.date.localeCompare(a.date));
  const totalMonth = list.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const pending = list.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
  return (
    <>
      <PageHeader title="Facturation" subtitle="Encaissements & impayés"/>
      <div className="grid-4 mb-3">
        <KPI label="Encaissé ce mois" value={new Intl.NumberFormat('fr-FR').format(totalMonth) + ' F'} delta="+18% vs mois -1"/>
        <KPI label="À encaisser" value={new Intl.NumberFormat('fr-FR').format(pending) + ' F'} delta={list.filter(i => i.status !== 'paid').length + ' factures'} deltaDir="down"/>
        <KPI label="Mobile Money" value="62%" delta="Wave + Orange dominants"/>
        <KPI label="Espèces" value="38%"/>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="simple">
          <thead><tr>
            <th>Date</th><th>Patient</th><th>Détail</th><th>Montant</th><th>Mode</th><th>Statut</th>
          </tr></thead>
          <tbody>
            {list.map(i => {
              const p = window.CCI.findPatient(i.patientId);
              return (
                <tr key={i.id}>
                  <td className="text-sm mono">{formatDateFR(i.date)}</td>
                  <td>
                    <div className="row">
                      <Avatar initials={p.initials} color={p.color} size="sm"/>
                      <span className="fw-600 text-sm">{p.firstName} {p.lastName}</span>
                    </div>
                  </td>
                  <td className="text-sm">{i.items.map(x => x.label).join(' + ')}</td>
                  <td className="fw-600 mono">{window.CCI.formatCFA(i.total)}</td>
                  <td>{i.method ? <span className="badge muted">{i.method === 'wave' ? 'Wave' : i.method === 'orange' ? 'Orange MM' : i.method === 'cash' ? 'Espèces' : i.method}</span> : <span className="text-xs text-muted">—</span>}</td>
                  <td><span className={`badge ${i.status === 'paid' ? 'green' : i.status === 'pending' ? 'gold' : 'red'}`}>
                    {i.status === 'paid' ? 'Payée' : i.status === 'pending' ? 'En attente' : 'Impayée'}
                  </span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Stats
function MedecinStats() {
  const store = useStore();
  // Simple bar chart of consultations per day (last 7 days mock)
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const values = [12, 16, 9, 18, 22, 14, 0];
  const maxV = Math.max(...values);
  const revenue = [180000, 240000, 135000, 270000, 330000, 210000, 0];
  return (
    <>
      <PageHeader title="Statistiques" subtitle="Vue propriétaire — performance de la clinique"/>
      <div className="grid-4 mb-3">
        <KPI label="Consultations / mois" value="287" delta="+12% vs M-1"/>
        <KPI label="Recettes / mois" value="4.3M F" delta="+18% vs M-1"/>
        <KPI label="Nouveau patients" value="42" delta="+8 vs M-1"/>
        <KPI label="Taux occupation" value="78%" delta="vs 65% en avril"/>
      </div>

      <div className="grid-main-side">
        <div className="card">
          <div className="card-title">Consultations cette semaine</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '.5rem', alignItems: 'end', height: 220, paddingTop: '1rem' }}>
            {days.map((d, i) => (
              <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem', height: '100%' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    height: `${(values[i] / maxV) * 100}%`,
                    background: i === 4 ? 'var(--green)' : 'var(--green-pale)',
                    borderRadius: '6px 6px 0 0',
                    border: '1px solid rgba(13,122,95,.2)',
                    position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'var(--ink)', fontWeight: 600 }}>{values[i]}</div>
                  </div>
                </div>
                <div className="text-xs text-muted">{d}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted mt-2 text-right">Total : {values.reduce((a, b) => a + b, 0)} consultations</div>
        </div>

        <div className="col gap-lg">
          <div className="card">
            <div className="card-title">Top motifs de consultation</div>
            {[
              ['Consultation générale', 42, 'var(--green)'],
              ['Suivi diabète/HTA', 24, 'var(--gold)'],
              ['Pédiatrie', 18, 'var(--blue)'],
              ['Renouvellement Rx', 16, 'var(--muted-light)'],
            ].map(([label, pct, color]) => (
              <div key={label} className="mb-2">
                <div className="row-between text-sm mb-1"><span>{label}</span><span className="fw-600">{pct}%</span></div>
                <div style={{ height: 6, background: 'var(--cream-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct * 2}%`, height: '100%', background: color }}/>
                </div>
              </div>
            ))}
          </div>

          <AIAssistBox label="Insight Awa">
            Les jeudis et vendredis sont vos plus chargés. Considérez ouvrir un créneau supplémentaire le mercredi matin pour absorber le surplus.
          </AIAssistBox>
        </div>
      </div>
    </>
  );
}

// ── Main Médecin shell
function MedecinApp({ currentUser, onLogout, aiContext, setAIContext, onToggleAI, aiOpen, openNotifs, onOpenNotifs }) {
  const store = useStore();
  const [page, setPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState({});
  const [openPatientId, setOpenPatientId] = useState(null);

  function navigate(p, params = {}) {
    setPage(p); setPageParams(params);
  }

  const today = window.CCI.todayStr;
  const todaysCount = store.appointments.filter(a => a.date === today && a.medecinId === currentUser.id && a.status !== 'done').length;
  const waitingCount = store.appointments.filter(a => a.date === today && a.medecinId === currentUser.id && (a.status === 'waiting' || a.status === 'in-room')).length;

  const sidebarItems = [
    { kind: 'label', label: 'Aujourd\'hui' },
    { id: 'dashboard', icon: 'home', label: 'Tableau de bord' },
    { id: 'agenda', icon: 'calendar', label: 'Agenda', count: todaysCount },
    { id: 'consultation', icon: 'stethoscope', label: 'Consultation', count: waitingCount },
    { kind: 'label', label: 'Suivi' },
    { id: 'patients', icon: 'users', label: 'Patients' },
    { id: 'prescriptions', icon: 'pill', label: 'Ordonnances' },
    { id: 'facturation', icon: 'invoice', label: 'Facturation' },
    { kind: 'label', label: 'Gestion' },
    { id: 'stats', icon: 'chart', label: 'Statistiques' },
  ];

  return (
    <div className="app-shell">
      <TopBar
        role="medecin"
        currentUser={currentUser}
        onLogout={onLogout}
        onToggleAI={onToggleAI}
        aiOpen={aiOpen}
        notifications={store.notifications}
        onOpenNotifs={onOpenNotifs}
      />
      <Sidebar
        items={sidebarItems}
        active={page}
        onChange={navigate}
        footer={
          <div className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
            <strong>{store.clinic.name}</strong><br/>
            Plan {store.clinic.plan} · {store.staff.filter(s => s.role === 'medecin').length} médecins
          </div>
        }
      />
      <main className="main" style={{ paddingRight: aiOpen ? 'calc(2rem + 380px)' : '2rem' }}>
        {page === 'dashboard' && <MedecinDashboard currentUser={currentUser} onNavigate={navigate} onSetAIContext={setAIContext}/>}
        {page === 'agenda' && <MedecinAgenda currentUser={currentUser} onStartConsult={(id) => navigate('consultation', { apptId: id })} onSetAIContext={setAIContext}/>}
        {page === 'consultation' && <MedecinConsultation currentUser={currentUser} apptId={pageParams.apptId} onSetAIContext={setAIContext} onDone={() => navigate('agenda')}/>}
        {page === 'patients' && <MedecinPatients onOpenPatient={(id) => setOpenPatientId(id)} onSetAIContext={setAIContext}/>}
        {page === 'prescriptions' && <MedecinPrescriptions/>}
        {page === 'facturation' && <MedecinFacturation/>}
        {page === 'stats' && <MedecinStats/>}
      </main>

      <PatientDetailDrawer
        patientId={openPatientId}
        open={!!openPatientId}
        onClose={() => setOpenPatientId(null)}
        onSetAIContext={setAIContext}
      />
    </div>
  );
}

window.MedecinApp = MedecinApp;

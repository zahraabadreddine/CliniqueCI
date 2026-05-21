// ─── Espace Secrétaire ───
// Pages: accueil (file d'attente / check-in), planning, prise de rdv, patients, encaissement

// ── Accueil — file d'attente / check-in
function SecAccueil({ currentUser, onSetAIContext }) {
  const store = useStore();
  const toast = useToast();
  const today = window.CCI.todayStr;
  const todays = store.appointments.filter(a => a.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const arrived = todays.filter(a => a.status === 'waiting' || a.status === 'in-room');
  const expected = todays.filter(a => a.status === 'confirmed');

  function markArrived(id) {
    window.CCI.set(prev => ({
      ...prev,
      appointments: prev.appointments.map(a => a.id === id ? { ...a, status: 'waiting' } : a),
    }));
    toast("Patient enregistré à l'accueil.", "success");
  }
  function cancel(id) {
    window.CCI.set(prev => ({
      ...prev,
      appointments: prev.appointments.map(a => a.id === id ? { ...a, status: 'cancelled' } : a),
    }));
    toast("RDV annulé.", "");
  }

  return (
    <>
      <PageHeader
        title="Accueil"
        subtitle={`${todays.length} rendez-vous aujourd'hui · ${arrived.length} en attente / consultation`}
      >
        <button className="btn btn-secondary"><Icon name="phone" size={14}/> Standard</button>
        <button className="btn btn-primary"><Icon name="plus" size={14}/> RDV au comptoir</button>
      </PageHeader>

      <div className="grid-4 mb-3">
        <KPI label="Total RDV jour" value={todays.length}/>
        <KPI label="Arrivés" value={arrived.length} delta={arrived.length + ' en salle'} accent/>
        <KPI label="Encore attendus" value={expected.length} delta="à confirmer"/>
        <KPI label="Annulés" value={todays.filter(a => a.status === 'cancelled').length}/>
      </div>

      <div className="grid-main-side">
        <div className="card">
          <div className="card-title">
            <span>File d'attente · arrivés</span>
            <span className="badge gold">{arrived.length}</span>
          </div>
          {arrived.length === 0 ? (
            <EmptyState icon="users" title="Personne n'attend" message="La salle d'attente est vide."/>
          ) : (
            <div className="data-list">
              {arrived.map(a => {
                const p = window.CCI.findPatient(a.patientId);
                const m = window.CCI.findStaff(a.medecinId);
                return (
                  <div key={a.id} className="data-row">
                    <Avatar initials={p.initials} color={p.color}/>
                    <div style={{ flex: 1 }}>
                      <div className="fw-600">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-muted">
                        RDV {a.time} avec Dr. {m.lastName} · {a.reason}
                      </div>
                    </div>
                    <ApptStatusBadge status={a.status}/>
                    <button className="btn btn-secondary btn-sm">
                      <Icon name="file" size={13}/> Dossier
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="col gap-lg">
          <div className="card card-subtle">
            <div className="card-title">Prochains arrivants</div>
            {expected.length === 0 && <div className="text-sm text-muted">Aucun RDV en attente d'arrivée.</div>}
            {expected.slice(0, 6).map(a => {
              const p = window.CCI.findPatient(a.patientId);
              return (
                <div key={a.id} className="row" style={{ padding: '.55rem 0', borderTop: '1px solid var(--border)' }}>
                  <div className="mono text-sm fw-600" style={{ width: 50 }}>{a.time}</div>
                  <div style={{ flex: 1 }} className="text-sm">{p.firstName} {p.lastName}</div>
                  <button className="btn btn-primary btn-sm" onClick={() => markArrived(a.id)}>
                    <Icon name="check" size={12}/> Arrivé
                  </button>
                  <button className="icon-btn" onClick={() => cancel(a.id)} style={{ color: 'var(--red)' }}><Icon name="close" size={15}/></button>
                </div>
              );
            })}
          </div>

          <AIAssistBox
            label="Conseil Awa"
            action={
              <button className="btn btn-sm btn-secondary" onClick={() => onSetAIContext({})}>
                Rédiger
              </button>
            }
          >
            3 patients attendus dans l'heure ne sont pas encore arrivés. Voulez-vous que je rédige un SMS de rappel groupé ?
          </AIAssistBox>
        </div>
      </div>
    </>
  );
}

// ── Planning hebdo
function SecPlanning() {
  const store = useStore();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(window.CCI.todayStr);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    return d.toISOString().slice(0, 10);
  });
  const [selectedMed, setSelectedMed] = useState('all');

  const days = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  const slots = timeSlots(8, 18, 60);

  const medecins = store.staff.filter(s => s.role === 'medecin');
  const activeMedecins = selectedMed === 'all' ? medecins : medecins.filter(m => m.id === selectedMed);

  function shiftWeek(delta) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }

  return (
    <>
      <PageHeader title="Planning de la clinique" subtitle="Vue hebdomadaire">
        <select className="select" style={{ width: 'auto' }} value={selectedMed} onChange={e => setSelectedMed(e.target.value)}>
          <option value="all">Tous les médecins</option>
          {medecins.map(m => <option key={m.id} value={m.id}>Dr. {m.lastName} ({m.specialty})</option>)}
        </select>
        <button className="icon-btn" onClick={() => shiftWeek(-1)}><Icon name="chevronLeft"/></button>
        <button className="icon-btn" onClick={() => shiftWeek(1)}><Icon name="chevronRight"/></button>
      </PageHeader>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="simple" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Heure</th>
              {days.map(d => (
                <th key={d}>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(d).toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </div>
                  <div className="fw-600" style={{ color: 'var(--ink)', fontSize: 14 }}>
                    {new Date(d).getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(t => (
              <tr key={t}>
                <td className="mono text-xs text-muted">{t}</td>
                {days.map(d => {
                  const inHour = store.appointments.filter(a =>
                    a.date === d &&
                    a.time.startsWith(t.split(':')[0]) &&
                    (selectedMed === 'all' || a.medecinId === selectedMed)
                  );
                  return (
                    <td key={d} style={{ padding: '.4rem', verticalAlign: 'top', minHeight: 50 }}>
                      {inHour.slice(0, 2).map(a => {
                        const p = window.CCI.findPatient(a.patientId);
                        const m = window.CCI.findStaff(a.medecinId);
                        return (
                          <div key={a.id} className={`appt-card ${a.status}`} style={{ padding: '.35rem .5rem', marginBottom: 4 }}>
                            <div className="text-xs fw-600">{a.time} · {p.lastName}</div>
                            <div className="text-xs text-muted" style={{ marginTop: 2 }}>Dr. {m.lastName}</div>
                          </div>
                        );
                      })}
                      {inHour.length > 2 && <div className="text-xs text-muted">+{inHour.length - 2} autres</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Prise de RDV
function SecPriseDeRDV({ onSetAIContext }) {
  const store = useStore();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [searchPat, setSearchPat] = useState('');
  const [chosenPat, setChosenPat] = useState(null);
  const [chosenMed, setChosenMed] = useState(null);
  const [date, setDate] = useState(window.CCI.todayStr);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const filtered = store.patients.filter(p =>
    !searchPat || (p.firstName + ' ' + p.lastName).toLowerCase().includes(searchPat.toLowerCase())
  ).slice(0, 6);

  const medecins = store.staff.filter(s => s.role === 'medecin');
  const slots = timeSlots(8, 18, 30);
  const taken = store.appointments
    .filter(a => a.date === date && (!chosenMed || a.medecinId === chosenMed.id) && a.status !== 'cancelled')
    .map(a => a.time);
  const available = slots.filter(s => !taken.includes(s));

  function confirm() {
    if (!chosenPat || !chosenMed || !time || !reason) {
      toast("Complétez toutes les informations.", "error");
      return;
    }
    const newRDV = {
      id: 'rdv-' + Date.now(),
      patientId: chosenPat.id, medecinId: chosenMed.id,
      date, time, duration: 30, reason, status: 'confirmed', channel: 'phone',
    };
    window.CCI.set(prev => ({ ...prev, appointments: [...prev.appointments, newRDV] }));
    toast(`RDV confirmé : ${chosenPat.firstName} ${chosenPat.lastName} le ${formatDateFR(date)} à ${time}. SMS de confirmation envoyé.`, "success");
    setStep(4);
  }

  function reset() {
    setStep(1); setChosenPat(null); setChosenMed(null); setTime(''); setReason(''); setSearchPat('');
  }

  return (
    <>
      <PageHeader title="Nouvelle prise de RDV" subtitle="3 étapes — moins de 90 secondes"/>

      <div className="row mb-3" style={{ gap: 0, background: '#fff', padding: '.5rem .75rem', borderRadius: 10, border: '1px solid var(--border)' }}>
        {['Patient', 'Médecin & créneau', 'Confirmation'].map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <React.Fragment key={n}>
              <div className="row" style={{ gap: '.5rem' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 12,
                  background: done ? 'var(--green)' : active ? 'var(--ink)' : 'var(--cream-2)',
                  color: done || active ? '#fff' : 'var(--muted)',
                  display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600,
                }}>
                  {done ? '✓' : n}
                </div>
                <span className="text-sm fw-600" style={{ color: active || done ? 'var(--ink)' : 'var(--muted)' }}>{label}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 2, background: done ? 'var(--green)' : 'var(--border)', margin: '0 .75rem' }}/>}
            </React.Fragment>
          );
        })}
      </div>

      {step === 1 && (
        <div className="card">
          <div className="card-title">Sélectionnez le patient</div>
          <div className="row mb-2" style={{ gap: '.5rem', background: 'var(--cream)', padding: '.45rem .75rem', borderRadius: 8 }}>
            <Icon name="search" size={15} color="var(--muted)"/>
            <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13.5 }}
              placeholder="Nom, téléphone…"
              value={searchPat} onChange={e => setSearchPat(e.target.value)}/>
          </div>
          <div className="data-list">
            {filtered.map(p => (
              <div key={p.id} className="data-row">
                <Avatar initials={p.initials} color={p.color}/>
                <div style={{ flex: 1 }}>
                  <div className="fw-600">{p.firstName} {p.lastName}</div>
                  <div className="text-xs text-muted">{p.phone} · {p.age} ans</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { setChosenPat(p); setStep(2); }}>
                  Sélectionner →
                </button>
              </div>
            ))}
          </div>
          <div className="row mt-2" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm"><Icon name="plus" size={12}/> Nouveau dossier patient</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="row-between mb-2">
            <div className="row">
              <Avatar initials={chosenPat.initials} color={chosenPat.color}/>
              <div>
                <div className="fw-600">{chosenPat.firstName} {chosenPat.lastName}</div>
                <div className="text-xs text-muted">{chosenPat.phone}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>Changer</button>
          </div>

          <div className="grid-2 mb-2">
            <div className="field">
              <label>Médecin</label>
              <select className="select" value={chosenMed?.id || ''} onChange={e => setChosenMed(medecins.find(m => m.id === e.target.value))}>
                <option value="">-- Sélectionner --</option>
                {medecins.map(m => <option key={m.id} value={m.id}>Dr. {m.firstName} {m.lastName} · {m.specialty}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" className="input" value={date} min={window.CCI.todayStr} onChange={e => setDate(e.target.value)}/>
            </div>
          </div>

          {chosenMed && (
            <>
              <div className="text-sm fw-600 mb-1">Créneaux disponibles le {formatDateFR(date)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '.4rem' }} className="mb-2">
                {slots.map(s => {
                  const isTaken = taken.includes(s);
                  const isSelected = s === time;
                  return (
                    <button key={s}
                      className="btn btn-sm"
                      disabled={isTaken}
                      onClick={() => setTime(s)}
                      style={{
                        background: isSelected ? 'var(--green)' : isTaken ? 'var(--cream-2)' : '#fff',
                        color: isSelected ? '#fff' : isTaken ? 'var(--muted-light)' : 'var(--ink)',
                        border: '1px solid ' + (isSelected ? 'var(--green)' : 'var(--border-strong)'),
                        cursor: isTaken ? 'not-allowed' : 'pointer',
                        textDecoration: isTaken ? 'line-through' : 'none',
                      }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="field mb-2">
            <label>Motif de visite</label>
            <input className="input" placeholder="Ex. Suivi tension, fièvre + maux de tête…" value={reason} onChange={e => setReason(e.target.value)}/>
          </div>

          <AIAssistBox label="Suggestion Awa">
            Le créneau de <strong>11:30</strong> est libre et le patient préfère les matinées (selon ses RDV précédents).
          </AIAssistBox>

          <div className="row mt-3" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Retour</button>
            <button className="btn btn-primary" disabled={!chosenMed || !time || !reason} onClick={() => setStep(3)}>
              Continuer →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <div className="card-title">Confirmer le rendez-vous</div>
          <div className="card card-subtle">
            <div className="grid-2">
              <div>
                <div className="text-xs text-muted">Patient</div>
                <div className="fw-600">{chosenPat.firstName} {chosenPat.lastName}</div>
                <div className="text-xs text-muted mono">{chosenPat.phone}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Médecin</div>
                <div className="fw-600">Dr. {chosenMed.firstName} {chosenMed.lastName}</div>
                <div className="text-xs text-muted">{chosenMed.specialty}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Date & heure</div>
                <div className="fw-600">{formatDateFR(date)} à {time}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Motif</div>
                <div className="fw-600">{reason}</div>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <label className="row text-sm" style={{ gap: '.5rem' }}>
              <input type="checkbox" defaultChecked/>
              Envoyer un SMS de confirmation immédiat au patient
            </label>
            <label className="row text-sm mt-1" style={{ gap: '.5rem' }}>
              <input type="checkbox" defaultChecked/>
              Envoyer un rappel WhatsApp 24h avant le RDV
            </label>
          </div>

          <div className="row mt-3" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Retour</button>
            <button className="btn btn-primary btn-lg" onClick={confirm}>
              <Icon name="check" size={14}/> Réserver & Confirmer
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--green-pale)', display: 'grid', placeItems: 'center', margin: '0 auto 1rem' }}>
            <Icon name="check" size={32} color="var(--green)"/>
          </div>
          <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '.25rem' }}>RDV confirmé !</div>
          <div className="text-muted mb-3">SMS de confirmation envoyé à {chosenPat.phone}</div>
          <div className="row" style={{ justifyContent: 'center', gap: '.5rem' }}>
            <button className="btn btn-secondary" onClick={reset}>Nouveau RDV</button>
            <button className="btn btn-primary" onClick={reset}>Retour à l'accueil</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Encaissement (Mobile Money)
function SecEncaissement() {
  const store = useStore();
  const toast = useToast();
  const pending = store.invoices.filter(i => i.status !== 'paid');
  const [openId, setOpenId] = useState(null);
  const [method, setMethod] = useState('wave');
  const [processing, setProcessing] = useState(false);

  async function payInvoice() {
    setProcessing(true);
    // Simulate mobile money flow
    await new Promise(r => setTimeout(r, 1400));
    window.CCI.set(prev => ({
      ...prev,
      invoices: prev.invoices.map(i => i.id === openId ? { ...i, status: 'paid', method } : i),
    }));
    setProcessing(false);
    toast("Paiement validé. Reçu envoyé au patient.", "success");
    setOpenId(null);
  }

  return (
    <>
      <PageHeader title="Encaissement" subtitle={`${pending.length} factures en attente`}/>
      <div className="card" style={{ padding: 0 }}>
        <table className="simple">
          <thead><tr>
            <th>Patient</th><th>Détail</th><th>Montant</th><th>Statut</th><th></th>
          </tr></thead>
          <tbody>
            {pending.map(i => {
              const p = window.CCI.findPatient(i.patientId);
              return (
                <tr key={i.id}>
                  <td className="row" style={{ padding: '.85rem .75rem' }}>
                    <Avatar initials={p.initials} color={p.color} size="sm"/>
                    <div>
                      <div className="fw-600 text-sm">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-muted mono">{p.phone}</div>
                    </div>
                  </td>
                  <td className="text-sm">{i.items.map(x => x.label).join(' + ')}</td>
                  <td className="fw-600 mono">{window.CCI.formatCFA(i.total)}</td>
                  <td><span className={`badge ${i.status === 'pending' ? 'gold' : 'red'}`}>{i.status === 'pending' ? 'En attente' : 'Impayée'}</span></td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => setOpenId(i.id)}>
                      <Icon name="wallet" size={13}/> Encaisser
                    </button>
                  </td>
                </tr>
              );
            })}
            {pending.length === 0 && (
              <tr><td colSpan="5"><EmptyState icon="check" title="Tout est encaissé" message="Aucune facture en attente."/></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!openId} onClose={() => !processing && setOpenId(null)} title="Encaisser la facture"
        footer={<>
          <button className="btn btn-secondary" disabled={processing} onClick={() => setOpenId(null)}>Annuler</button>
          <button className="btn btn-primary" disabled={processing} onClick={payInvoice}>
            {processing ? <><span className="spinner"/> Traitement…</> : <>Valider le paiement</>}
          </button>
        </>}>
        {openId && (() => {
          const inv = store.invoices.find(x => x.id === openId);
          const p = window.CCI.findPatient(inv.patientId);
          return (
            <>
              <div className="row mb-3">
                <Avatar initials={p.initials} color={p.color} size="lg"/>
                <div>
                  <div className="fw-600">{p.firstName} {p.lastName}</div>
                  <div className="text-xs text-muted">Facture {inv.id.toUpperCase()}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div className="text-xs text-muted">À payer</div>
                  <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{window.CCI.formatCFA(inv.total)}</div>
                </div>
              </div>
              <div className="text-sm fw-600 mb-2">Mode de paiement</div>
              <div className="col gap-sm">
                <button className={`momo-option ${method === 'wave' ? 'selected' : ''}`} onClick={() => setMethod('wave')}>
                  <div className="momo-logo momo-wave">Wave</div>
                  <div style={{ flex: 1 }}>
                    <div className="fw-600 text-sm">Wave</div>
                    <div className="text-xs text-muted">0% commission · transfert instantané</div>
                  </div>
                  {method === 'wave' && <Icon name="check" size={18} color="var(--green)"/>}
                </button>
                <button className={`momo-option ${method === 'orange' ? 'selected' : ''}`} onClick={() => setMethod('orange')}>
                  <div className="momo-logo momo-orange">OM</div>
                  <div style={{ flex: 1 }}>
                    <div className="fw-600 text-sm">Orange Money</div>
                    <div className="text-xs text-muted">Code marchand #5524</div>
                  </div>
                  {method === 'orange' && <Icon name="check" size={18} color="var(--green)"/>}
                </button>
                <button className={`momo-option ${method === 'moov' ? 'selected' : ''}`} onClick={() => setMethod('moov')}>
                  <div className="momo-logo momo-moov">Moov</div>
                  <div style={{ flex: 1 }}>
                    <div className="fw-600 text-sm">MoovMoney</div>
                    <div className="text-xs text-muted">Code marchand #8812</div>
                  </div>
                  {method === 'moov' && <Icon name="check" size={18} color="var(--green)"/>}
                </button>
                <button className={`momo-option ${method === 'cash' ? 'selected' : ''}`} onClick={() => setMethod('cash')}>
                  <div className="momo-logo" style={{ background: 'var(--ink)' }}><Icon name="moneybill" size={20}/></div>
                  <div style={{ flex: 1 }}>
                    <div className="fw-600 text-sm">Espèces</div>
                    <div className="text-xs text-muted">Caisse — reçu papier</div>
                  </div>
                  {method === 'cash' && <Icon name="check" size={18} color="var(--green)"/>}
                </button>
              </div>
              {method !== 'cash' && (
                <div className="mt-3" style={{ padding: '.85rem 1rem', background: 'var(--cream)', borderRadius: 10 }}>
                  <div className="text-xs text-muted mb-1">Le patient recevra une notification de paiement sur</div>
                  <div className="fw-600 mono">{p.phone}</div>
                </div>
              )}
            </>
          );
        })()}
      </Modal>
    </>
  );
}

// ── Main Secrétaire app
function SecretaireApp({ currentUser, onLogout, aiContext, setAIContext, onToggleAI, aiOpen, openNotifs, onOpenNotifs }) {
  const store = useStore();
  const [page, setPage] = useState('accueil');

  const today = window.CCI.todayStr;
  const waitingCount = store.appointments.filter(a => a.date === today && (a.status === 'waiting' || a.status === 'confirmed')).length;
  const pendingPay = store.invoices.filter(i => i.status !== 'paid').length;

  const items = [
    { kind: 'label', label: 'Quotidien' },
    { id: 'accueil', icon: 'home', label: 'Accueil & file', count: waitingCount },
    { id: 'rdv', icon: 'plus', label: 'Nouveau RDV' },
    { id: 'planning', icon: 'calendar', label: 'Planning clinique' },
    { kind: 'label', label: 'Suivi' },
    { id: 'patients', icon: 'users', label: 'Dossiers patients' },
    { id: 'encaissement', icon: 'wallet', label: 'Encaissement', count: pendingPay },
  ];

  return (
    <div className="app-shell">
      <TopBar role="secretaire" currentUser={currentUser} onLogout={onLogout} onToggleAI={onToggleAI} aiOpen={aiOpen} notifications={store.notifications} onOpenNotifs={onOpenNotifs}/>
      <Sidebar items={items} active={page} onChange={setPage}
        footer={<div className="text-xs text-muted">Secrétariat · {store.clinic.name}</div>}/>
      <main className="main" style={{ paddingRight: aiOpen ? 'calc(2rem + 380px)' : '2rem' }}>
        {page === 'accueil' && <SecAccueil currentUser={currentUser} onSetAIContext={setAIContext}/>}
        {page === 'rdv' && <SecPriseDeRDV onSetAIContext={setAIContext}/>}
        {page === 'planning' && <SecPlanning/>}
        {page === 'patients' && <MedecinPatients onOpenPatient={() => {}} onSetAIContext={setAIContext}/>}
        {page === 'encaissement' && <SecEncaissement/>}
      </main>
    </div>
  );
}

window.SecretaireApp = SecretaireApp;

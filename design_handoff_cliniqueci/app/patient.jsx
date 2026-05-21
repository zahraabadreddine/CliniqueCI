// ─── Espace Patient (mobile) ───
// Tab bar: Accueil, RDV, Ordonnances, Profil. AI accessible via floating button.

function PatientHome({ currentUser, onNavigate, onOpenAI }) {
  const store = useStore();
  const today = window.CCI.todayStr;
  const myRdv = store.appointments
    .filter(a => a.patientId === currentUser.id && a.date >= today && a.status !== 'cancelled' && a.status !== 'done')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const next = myRdv[0];
  const myRx = store.prescriptions.filter(r => r.patientId === currentUser.id && r.status === 'active');

  return (
    <>
      <div style={{ padding: '1rem 0 1.5rem' }}>
        <div className="text-sm text-muted">Bonjour,</div>
        <div className="serif" style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1.1 }}>
          {currentUser.firstName} 👋
        </div>
      </div>

      {next && (() => {
        const m = window.CCI.findStaff(next.medecinId);
        return (
          <div className="card" style={{ background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)', marginBottom: '1rem' }}>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.5rem' }}>Prochain rendez-vous</div>
            <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>
              {formatDateLong(next.date)}
            </div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, marginBottom: '1rem' }}>
              à <span className="mono fw-600" style={{ color: '#fff' }}>{next.time}</span> avec Dr. {m.lastName} · {m.specialty}
            </div>
            <div className="row" style={{ gap: '.5rem' }}>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', flex: 1 }}>
                <Icon name="mapPin" size={13}/> Itinéraire
              </button>
              <button className="btn btn-sm" style={{ background: 'var(--green-light)', color: '#fff', flex: 1 }}>
                <Icon name="phone" size={13}/> Appeler
              </button>
            </div>
          </div>
        );
      })()}

      <div className="grid-2 mb-2" style={{ gap: '.5rem' }}>
        <button className="card" style={{ textAlign: 'left', padding: '.85rem' }} onClick={() => onNavigate('book')}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--green-pale)', display: 'grid', placeItems: 'center', color: 'var(--green)', marginBottom: '.5rem' }}>
            <Icon name="calendar" size={16}/>
          </div>
          <div className="fw-600 text-sm">Prendre RDV</div>
          <div className="text-xs text-muted">en moins de 90 sec</div>
        </button>
        <button className="card" style={{ textAlign: 'left', padding: '.85rem' }} onClick={onOpenAI}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#12a07c,#0d7a5f)', display: 'grid', placeItems: 'center', color: '#fff', marginBottom: '.5rem' }}>
            <Icon name="sparkles" size={16}/>
          </div>
          <div className="fw-600 text-sm">Parler à Awa</div>
          <div className="text-xs text-muted">aide santé 24/7</div>
        </button>
        <button className="card" style={{ textAlign: 'left', padding: '.85rem' }} onClick={() => onNavigate('rx')}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gold-soft)', display: 'grid', placeItems: 'center', color: '#8a6f1f', marginBottom: '.5rem' }}>
            <Icon name="pill" size={16}/>
          </div>
          <div className="fw-600 text-sm">Mes ordonnances</div>
          <div className="text-xs text-muted">{myRx.length} active{myRx.length > 1 ? 's' : ''}</div>
        </button>
        <button className="card" style={{ textAlign: 'left', padding: '.85rem' }} onClick={() => onNavigate('profil')}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue-soft)', display: 'grid', placeItems: 'center', color: 'var(--blue)', marginBottom: '.5rem' }}>
            <Icon name="file" size={16}/>
          </div>
          <div className="fw-600 text-sm">Mon dossier</div>
          <div className="text-xs text-muted">santé personnelle</div>
        </button>
      </div>

      <div className="card-subtle card" style={{ marginBottom: '1rem' }}>
        <div className="row" style={{ gap: '.6rem', marginBottom: '.5rem' }}>
          <div className="ai-assist-mark"><Icon name="sparkles" size={12}/></div>
          <div className="fw-600 text-sm">Awa peut vous aider</div>
        </div>
        <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Décrivez vos symptômes en français et Awa vous oriente vers le bon médecin — sans jamais vous diagnostiquer à votre place.
        </div>
        <button className="btn btn-primary btn-sm mt-2" onClick={onOpenAI} style={{ width: '100%' }}>
          Démarrer une discussion →
        </button>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: '.5rem' }}>Actualité de votre clinique</div>
        <div className="text-sm text-muted">{store.clinic.name} ouvre désormais le samedi matin. Profitez-en pour vos consultations de suivi.</div>
      </div>
    </>
  );
}

function PatientBooking({ currentUser, onDone }) {
  const store = useStore();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [specialty, setSpecialty] = useState('');
  const [med, setMed] = useState(null);
  const [date, setDate] = useState(window.CCI.todayStr);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const medecins = store.staff.filter(s => s.role === 'medecin');
  const specialties = [...new Set(medecins.map(m => m.specialty))];
  const slots = timeSlots(8, 18, 30);
  const taken = med ? store.appointments.filter(a => a.date === date && a.medecinId === med.id && a.status !== 'cancelled').map(a => a.time) : [];

  function confirm() {
    if (!med || !time || !reason) return;
    const newRDV = {
      id: 'rdv-' + Date.now(),
      patientId: currentUser.id, medecinId: med.id,
      date, time, duration: 30, reason, status: 'confirmed', channel: 'app',
    };
    window.CCI.set(prev => ({
      ...prev,
      appointments: [...prev.appointments, newRDV],
      notifications: [{ id: 'n-' + Date.now(), text: `Nouveau RDV en ligne — ${currentUser.firstName} ${currentUser.lastName} à ${time}`, time: 'à l\'instant', unread: true }, ...prev.notifications],
    }));
    toast("RDV confirmé ! SMS envoyé.", "success");
    setStep(5);
  }

  return (
    <>
      <div className="row" style={{ padding: '.5rem 0 1rem' }}>
        <button className="icon-btn" onClick={() => step === 1 ? onDone() : setStep(step - 1)}>
          <Icon name="chevronLeft"/>
        </button>
        <div className="fw-600">Prendre un rendez-vous</div>
        <div style={{ marginLeft: 'auto' }} className="text-xs text-muted">Étape {Math.min(step, 4)}/4</div>
      </div>

      {step === 1 && (
        <>
          <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Quel type de consultation ?</div>
          <div className="text-sm text-muted mb-3">Choisissez la spécialité du médecin</div>
          <div className="col gap-sm">
            {specialties.map(s => (
              <button key={s}
                className="card" style={{ padding: '1rem', textAlign: 'left', borderColor: specialty === s ? 'var(--green)' : 'var(--border)' }}
                onClick={() => { setSpecialty(s); setStep(2); }}>
                <div className="fw-600">{s}</div>
                <div className="text-xs text-muted">{medecins.filter(m => m.specialty === s).length} médecin(s) disponible(s)</div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Choisissez un médecin</div>
          <div className="text-sm text-muted mb-3">{specialty}</div>
          <div className="col gap-sm">
            {medecins.filter(m => m.specialty === specialty).map(m => (
              <button key={m.id} className="card" style={{ padding: '1rem', textAlign: 'left' }} onClick={() => { setMed(m); setStep(3); }}>
                <div className="row">
                  <Avatar initials={m.initials} color={m.color} size="lg"/>
                  <div style={{ flex: 1 }}>
                    <div className="fw-600">Dr. {m.firstName} {m.lastName}</div>
                    <div className="text-xs text-muted">{m.specialty} · {store.clinic.name}</div>
                    <div className="row mt-1 gap-sm">
                      <span className="badge green">★ 4.8</span>
                      <span className="text-xs text-muted">Disponible demain</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Choisissez un créneau</div>
          <div className="text-sm text-muted mb-2">avec Dr. {med.lastName}</div>
          <input type="date" className="input mb-2" value={date} min={window.CCI.todayStr} onChange={e => setDate(e.target.value)}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.4rem' }}>
            {slots.map(s => {
              const isTaken = taken.includes(s);
              const isSelected = s === time;
              return (
                <button key={s} className="btn btn-sm"
                  disabled={isTaken} onClick={() => setTime(s)}
                  style={{
                    background: isSelected ? 'var(--green)' : isTaken ? 'var(--cream-2)' : '#fff',
                    color: isSelected ? '#fff' : isTaken ? 'var(--muted-light)' : 'var(--ink)',
                    border: '1px solid ' + (isSelected ? 'var(--green)' : 'var(--border-strong)'),
                    textDecoration: isTaken ? 'line-through' : 'none',
                  }}>{s}</button>
              );
            })}
          </div>
          <button className="btn btn-primary mt-3" style={{ width: '100%' }} disabled={!time} onClick={() => setStep(4)}>
            Continuer →
          </button>
        </>
      )}

      {step === 4 && (
        <>
          <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.5rem' }}>Motif de visite</div>
          <textarea className="textarea mb-2" placeholder="Ex. Fièvre depuis 2 jours, douleur abdominale…"
            value={reason} onChange={e => setReason(e.target.value)} rows={4}/>
          <AIAssistBox label="Pas sûr ?">
            Décrivez vos symptômes à Awa et il vous aidera à formuler le motif de votre visite.
          </AIAssistBox>
          <div className="card card-subtle mt-3">
            <div className="text-xs text-muted">Récapitulatif</div>
            <div className="fw-600 mt-1">Dr. {med.firstName} {med.lastName}</div>
            <div className="text-sm">{formatDateLong(date)} · {time}</div>
            <div className="text-xs text-muted mt-1">15 000 FCFA · payable sur place ou Mobile Money</div>
          </div>
          <button className="btn btn-primary mt-3" style={{ width: '100%' }} disabled={!reason.trim()} onClick={confirm}>
            <Icon name="check" size={14}/> Réserver & Confirmer
          </button>
        </>
      )}

      {step === 5 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--green-pale)', display: 'grid', placeItems: 'center', margin: '0 auto 1rem' }}>
            <Icon name="check" size={40} color="var(--green)"/>
          </div>
          <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '.5rem' }}>C'est confirmé !</div>
          <div className="text-sm text-muted mb-3">
            Vous recevrez un SMS de confirmation et un rappel 24h avant.
          </div>
          <div className="card card-subtle text-left">
            <div className="row-between">
              <div>
                <div className="text-xs text-muted">RDV</div>
                <div className="fw-600">{formatDateFR(date)} · {time}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Médecin</div>
                <div className="fw-600">Dr. {med.lastName}</div>
              </div>
            </div>
          </div>
          <button className="btn btn-primary mt-3" style={{ width: '100%' }} onClick={onDone}>Retour à l'accueil</button>
        </div>
      )}
    </>
  );
}

function PatientRDVList({ currentUser }) {
  const store = useStore();
  const toast = useToast();
  const myAll = store.appointments.filter(a => a.patientId === currentUser.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const upcoming = myAll.filter(a => a.date >= window.CCI.todayStr && a.status !== 'cancelled' && a.status !== 'done');
  const past = myAll.filter(a => a.date < window.CCI.todayStr || a.status === 'done' || a.status === 'cancelled');
  const [tab, setTab] = useState('upcoming');
  const list = tab === 'upcoming' ? upcoming : past;

  function cancel(id) {
    window.CCI.set(prev => ({
      ...prev,
      appointments: prev.appointments.map(a => a.id === id ? { ...a, status: 'cancelled' } : a),
    }));
    toast("RDV annulé. Merci de prévenir tôt à l'avenir.", "");
  }

  return (
    <>
      <div style={{ padding: '1rem 0' }}>
        <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Mes rendez-vous</div>
      </div>
      <div className="tabs mb-2">
        <button className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>À venir ({upcoming.length})</button>
        <button className={`tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>Historique</button>
      </div>
      {list.length === 0 && <EmptyState icon="calendar" title="Aucun rendez-vous" message={tab === 'upcoming' ? "Vous n'avez aucun RDV à venir." : "Aucun historique."}/>}
      <div className="col gap-sm">
        {list.map(a => {
          const m = window.CCI.findStaff(a.medecinId);
          return (
            <div key={a.id} className="card" style={{ padding: '.85rem' }}>
              <div className="row-between mb-1">
                <div className="fw-600">{formatDateLong(a.date)}</div>
                <ApptStatusBadge status={a.status}/>
              </div>
              <div className="text-sm">
                <span className="mono fw-600">{a.time}</span> · Dr. {m.lastName} · {m.specialty}
              </div>
              <div className="text-xs text-muted mt-1">Motif : {a.reason}</div>
              {a.status === 'confirmed' && (
                <div className="row mt-2 gap-sm">
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Modifier</button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => cancel(a.id)}>Annuler</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function PatientRxList({ currentUser }) {
  const store = useStore();
  const myRx = store.prescriptions.filter(r => r.patientId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));
  const [openId, setOpenId] = useState(null);

  return (
    <>
      <div style={{ padding: '1rem 0' }}>
        <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Mes ordonnances</div>
        <div className="text-sm text-muted">Toutes vos ordonnances en un seul endroit</div>
      </div>
      {myRx.length === 0 && <EmptyState icon="pill" title="Aucune ordonnance" message="Aucune ordonnance n'a été émise pour le moment."/>}
      <div className="col gap-sm">
        {myRx.map(r => {
          const m = window.CCI.findStaff(r.medecinId);
          return (
            <button key={r.id} className="card" style={{ padding: '.85rem', textAlign: 'left' }} onClick={() => setOpenId(r.id)}>
              <div className="row-between mb-1">
                <div className="fw-600">{formatDateLong(r.date)}</div>
                <span className={`badge ${r.status === 'active' ? 'green' : 'muted'}`}>{r.status === 'active' ? 'Active' : 'Archivée'}</span>
              </div>
              <div className="text-sm text-muted">Dr. {m.lastName} · {m.specialty}</div>
              <div className="text-sm mt-1">{r.items.length} médicament{r.items.length > 1 ? 's' : ''} : {r.items.map(i => i.med.split(' ')[0]).join(', ')}</div>
            </button>
          );
        })}
      </div>

      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Ordonnance">
        {openId && (() => {
          const r = myRx.find(x => x.id === openId);
          const m = window.CCI.findStaff(r.medecinId);
          return (
            <div className="rx-doc" style={{ border: 'none', padding: 0 }}>
              <div className="text-xs text-muted">Émise le {formatDateLong(r.date)}</div>
              <div className="fw-600 mt-1">Dr. {m.firstName} {m.lastName}</div>
              <div className="text-xs text-muted mb-3">{m.specialty} · {store.clinic.name}</div>
              {r.items.map((it, i) => (
                <div key={i} className="rx-line">
                  <div className="rx-med">{i + 1}. {it.med}</div>
                  <div className="rx-pos">{it.pos}</div>
                </div>
              ))}
              <div className="row mt-3" style={{ gap: '.4rem' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}><Icon name="download" size={13}/> PDF</button>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}><Icon name="qr" size={13}/> QR Pharmacie</button>
              </div>
              <AIAssistBox label="Demander à Awa" >
                Voulez-vous qu'Awa explique cette ordonnance en mots simples ?
              </AIAssistBox>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}

function PatientProfile({ currentUser, onLogout }) {
  const store = useStore();
  const me = window.CCI.findPatient(currentUser.id);
  return (
    <>
      <div style={{ padding: '1rem 0', textAlign: 'center' }}>
        <Avatar initials={me.initials} color={me.color} size="lg"/>
        <div className="serif mt-2" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{me.firstName} {me.lastName}</div>
        <div className="text-sm text-muted">{me.age} ans · {me.gender === 'M' ? 'Homme' : 'Femme'}</div>
      </div>

      <div className="card mb-2">
        <div className="card-title">Informations santé</div>
        <div className="data-list">
          <div className="data-row text-sm" style={{ padding: '.5rem 0' }}>
            <span style={{ flex: 1, color: 'var(--muted)' }}>Groupe sanguin</span>
            <span className="fw-600">{me.bloodType}</span>
          </div>
          <div className="data-row text-sm" style={{ padding: '.5rem 0' }}>
            <span style={{ flex: 1, color: 'var(--muted)' }}>Allergies</span>
            <span className="fw-600 text-red">{me.allergies?.join(', ') || 'Aucune'}</span>
          </div>
          <div className="data-row text-sm" style={{ padding: '.5rem 0' }}>
            <span style={{ flex: 1, color: 'var(--muted)' }}>Antécédents</span>
            <span className="fw-600">{me.chronic?.join(', ') || 'Aucun'}</span>
          </div>
          <div className="data-row text-sm" style={{ padding: '.5rem 0' }}>
            <span style={{ flex: 1, color: 'var(--muted)' }}>Assurance</span>
            <span className="fw-600">{me.insurance?.provider || '—'}</span>
          </div>
        </div>
      </div>

      <div className="card mb-2">
        <div className="card-title">Contact</div>
        <div className="data-list">
          <div className="data-row text-sm" style={{ padding: '.5rem 0' }}>
            <Icon name="phone" size={14} color="var(--muted)"/>
            <span className="mono" style={{ flex: 1 }}>{me.phone}</span>
          </div>
          <div className="data-row text-sm" style={{ padding: '.5rem 0' }}>
            <Icon name="mapPin" size={14} color="var(--muted)"/>
            <span style={{ flex: 1 }}>{me.address}</span>
          </div>
        </div>
      </div>

      <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onLogout}>
        <Icon name="logout" size={14}/> Changer de profil
      </button>

      <div className="text-xs text-muted text-right mt-2" style={{ textAlign: 'center', opacity: .6 }}>
        CliniqueCI v0.4 · prototype
      </div>
    </>
  );
}

function PatientApp({ currentUser, onLogout, aiContext, setAIContext, onToggleAI, aiOpen }) {
  const [page, setPage] = useState('home');
  const tabs = [
    { id: 'home', icon: 'home', label: 'Accueil' },
    { id: 'rdv', icon: 'calendar', label: 'RDV' },
    { id: 'rx', icon: 'pill', label: 'Ordonnances' },
    { id: 'profil', icon: 'user', label: 'Profil' },
  ];

  // Set AI context to this patient
  useEffect(() => {
    setAIContext({ patientId: currentUser.id });
  }, [currentUser.id]);

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  return (
    <div className="patient-shell">
      <button className="btn btn-secondary btn-sm patient-back-to-prototype" onClick={onLogout}>
        <Icon name="logout" size={13}/> Changer de profil
      </button>

      <div className="phone-frame">
        <div className="phone-screen">
          <div className="phone-notch"/>
          <div className="phone-statusbar">
            <span>{hh}:{mm}</span>
            <span style={{ fontSize: 11 }}>●●●● 4G  ▮</span>
          </div>
          <div className="phone-content">
            {page === 'home' && <PatientHome currentUser={currentUser} onNavigate={setPage} onOpenAI={onToggleAI}/>}
            {page === 'book' && <PatientBooking currentUser={currentUser} onDone={() => setPage('rdv')}/>}
            {page === 'rdv' && <PatientRDVList currentUser={currentUser}/>}
            {page === 'rx' && <PatientRxList currentUser={currentUser}/>}
            {page === 'profil' && <PatientProfile currentUser={currentUser} onLogout={onLogout}/>}
          </div>
          <div className="phone-tabbar">
            {tabs.map(t => (
              <button key={t.id} className={`phone-tab ${page === t.id || (t.id === 'rdv' && page === 'book') ? 'active' : ''}`}
                onClick={() => setPage(t.id)}>
                <Icon name={t.icon} size={20}/>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating AI trigger that opens chat above phone frame */}
      {!aiOpen && (
        <button className="ai-trigger-btn" onClick={onToggleAI}>
          <span className="ai-mark"><Icon name="sparkles" size={12}/></span>
          <span>Demander à Awa</span>
        </button>
      )}
    </div>
  );
}

window.PatientApp = PatientApp;

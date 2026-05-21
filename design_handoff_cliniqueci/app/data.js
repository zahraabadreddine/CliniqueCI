// ─── Mock data + persistent store for CliniqueCI prototype ───
// All data lives on `window.CCI`. Mutations call setStore(...) which
// notifies subscribed React components.

(function () {
  const STORAGE_KEY = 'cci-store-v3';

  const CLINIC = {
    id: 'clin-riviera',
    name: 'Clinique Riviera',
    address: 'Riviera 3, Cocody — Abidjan',
    phone: '+225 27 22 48 19 02',
    plan: 'Pro',
  };

  const STAFF = [
    { id: 'med-1', firstName: 'Aminata', lastName: 'Koné', role: 'medecin', specialty: 'Médecine générale', initials: 'AK', color: '#0d7a5f' },
    { id: 'med-2', firstName: 'Souleymane', lastName: 'Bamba', role: 'medecin', specialty: 'Pédiatrie', initials: 'SB', color: '#2f6bd6' },
    { id: 'med-3', firstName: 'Yasmine', lastName: 'Diallo', role: 'medecin', specialty: 'Gynécologie', initials: 'YD', color: '#c8a84b' },
    { id: 'sec-1', firstName: 'Rana', lastName: 'Touré', role: 'secretaire', initials: 'RT', color: '#c8a84b' },
  ];

  const PATIENTS = [
    {
      id: 'pat-1', firstName: 'Karim', lastName: 'Meïté',
      birth: '1994-03-12', age: 31, gender: 'M', phone: '+225 07 78 12 45 90',
      bloodType: 'A+', allergies: ['Pénicilline'], chronic: [],
      lastVisit: '2026-05-06',
      initials: 'KM', color: '#2f6bd6',
      insurance: { provider: 'CNAM', number: 'CI-2018-44581' },
      address: 'Plateau, Abidjan',
    },
    {
      id: 'pat-2', firstName: 'Fatou', lastName: 'Diallo',
      birth: '1986-11-04', age: 39, gender: 'F', phone: '+225 05 04 18 22 11',
      bloodType: 'O+', allergies: [], chronic: ['Hypertension'],
      lastVisit: '2026-05-02',
      initials: 'FD', color: '#0d7a5f',
      address: 'Cocody, Abidjan',
    },
    {
      id: 'pat-3', firstName: 'Aboubacar', lastName: 'Koné',
      birth: '1958-07-19', age: 67, gender: 'M', phone: '+225 01 32 88 76 54',
      bloodType: 'B-', allergies: ['Aspirine'], chronic: ['Diabète type 2', 'Hypertension'],
      lastVisit: '2026-04-28',
      initials: 'AK', color: '#c8a84b',
      address: 'Yopougon, Abidjan',
    },
    {
      id: 'pat-4', firstName: 'Mariam', lastName: 'Ouédraogo',
      birth: '2019-09-10', age: 6, gender: 'F', phone: '+225 07 11 22 33 44',
      bloodType: 'A+', allergies: [], chronic: ['Asthme léger'],
      lastVisit: '2026-04-15',
      initials: 'MO', color: '#d64c3f',
      address: 'Marcory, Abidjan',
    },
    {
      id: 'pat-5', firstName: 'Lassana', lastName: 'Sékou',
      birth: '1972-01-22', age: 54, gender: 'M', phone: '+225 05 55 66 77 88',
      bloodType: 'AB+', allergies: [], chronic: [],
      lastVisit: '2026-05-10',
      initials: 'LS', color: '#0d7a5f',
      address: 'Treichville, Abidjan',
    },
    {
      id: 'pat-6', firstName: 'Aïcha', lastName: 'Camara',
      birth: '1998-06-15', age: 27, gender: 'F', phone: '+225 07 99 88 77 66',
      bloodType: 'O-', allergies: ['Iode'], chronic: [],
      lastVisit: '2026-05-08',
      initials: 'AC', color: '#2f6bd6',
      address: 'Riviera, Abidjan',
    },
  ];

  // today helper
  const today = new Date();
  const toYMD = (d) => d.toISOString().slice(0, 10);
  const todayStr = toYMD(today);
  const tomorrowStr = toYMD(new Date(today.getTime() + 86400000));
  const yesterdayStr = toYMD(new Date(today.getTime() - 86400000));

  const APPOINTMENTS = [
    { id: 'rdv-1', patientId: 'pat-2', medecinId: 'med-1', date: todayStr, time: '08:30', duration: 30, reason: 'Suivi tension', status: 'done', channel: 'walk-in', notes: '' },
    { id: 'rdv-2', patientId: 'pat-5', medecinId: 'med-1', date: todayStr, time: '09:00', duration: 30, reason: 'Douleurs lombaires', status: 'in-room', channel: 'app', notes: '' },
    { id: 'rdv-3', patientId: 'pat-1', medecinId: 'med-1', date: todayStr, time: '09:30', duration: 30, reason: 'Fièvre + maux de tête', status: 'waiting', channel: 'app' },
    { id: 'rdv-4', patientId: 'pat-3', medecinId: 'med-1', date: todayStr, time: '10:30', duration: 45, reason: 'Bilan diabète', status: 'confirmed', channel: 'phone' },
    { id: 'rdv-5', patientId: 'pat-6', medecinId: 'med-1', date: todayStr, time: '11:30', duration: 30, reason: 'Consultation générale', status: 'confirmed', channel: 'app' },
    { id: 'rdv-6', patientId: 'pat-4', medecinId: 'med-2', date: todayStr, time: '14:00', duration: 30, reason: 'Toux persistante', status: 'confirmed', channel: 'app' },
    { id: 'rdv-7', patientId: 'pat-2', medecinId: 'med-1', date: todayStr, time: '15:00', duration: 30, reason: 'Renouvellement ordonnance', status: 'confirmed', channel: 'app' },
    { id: 'rdv-8', patientId: 'pat-5', medecinId: 'med-1', date: tomorrowStr, time: '08:30', duration: 30, reason: 'Suivi lombaire', status: 'confirmed', channel: 'app' },
    { id: 'rdv-9', patientId: 'pat-1', medecinId: 'med-1', date: yesterdayStr, time: '10:00', duration: 30, reason: 'Consultation générale', status: 'done', channel: 'app' },
  ];

  const CONSULTATIONS = [
    {
      id: 'cons-1', patientId: 'pat-1', medecinId: 'med-1', date: yesterdayStr,
      reason: 'Consultation générale',
      vitals: { tension: '120/80', pouls: 72, temp: 36.8, poids: 78 },
      symptoms: 'Patient rapporte fatigue passagère, pas de fièvre. Sommeil correct.',
      diagnosis: 'Fatigue passagère sans pathologie identifiée.',
      notes: 'Recommandé repos + hydratation. Bilan sanguin si persistance.',
    },
    {
      id: 'cons-2', patientId: 'pat-3', medecinId: 'med-1', date: '2026-04-28',
      reason: 'Bilan diabète trimestriel',
      vitals: { tension: '142/88', pouls: 78, temp: 36.6, poids: 92 },
      symptoms: 'Glycémie à jeun élevée (1.78 g/L). Pas de complication récente.',
      diagnosis: 'Diabète type 2 déséquilibré. HTA stable.',
      notes: 'Ajustement Metformine. Bilan HbA1c dans 3 mois.',
    },
  ];

  const PRESCRIPTIONS = [
    {
      id: 'rx-1', patientId: 'pat-1', medecinId: 'med-1', date: yesterdayStr,
      items: [
        { med: 'Paracétamol 1000mg', pos: '1 cp x 3/jour si fièvre — 5 jours' },
        { med: 'Vitamine C 500mg', pos: '1 cp matin — 10 jours' },
      ],
      status: 'active',
    },
    {
      id: 'rx-2', patientId: 'pat-3', medecinId: 'med-1', date: '2026-04-28',
      items: [
        { med: 'Metformine 1000mg', pos: '1 cp matin et soir — Renouvelable' },
        { med: 'Amlodipine 5mg', pos: '1 cp matin — Renouvelable' },
        { med: 'Aspirine 100mg', pos: '1 cp soir — Renouvelable' },
      ],
      status: 'active',
    },
    {
      id: 'rx-3', patientId: 'pat-2', medecinId: 'med-1', date: '2026-05-02',
      items: [
        { med: 'Losartan 50mg', pos: '1 cp matin — 30 jours' },
      ],
      status: 'active',
    },
  ];

  const INVOICES = [
    { id: 'fac-1', patientId: 'pat-2', date: todayStr, items: [{ label: 'Consultation médecine générale', amount: 15000 }], total: 15000, status: 'paid', method: 'wave' },
    { id: 'fac-2', patientId: 'pat-5', date: todayStr, items: [{ label: 'Consultation médecine générale', amount: 15000 }, { label: 'Pansement', amount: 3000 }], total: 18000, status: 'pending' },
    { id: 'fac-3', patientId: 'pat-3', date: '2026-04-28', items: [{ label: 'Consultation + bilan', amount: 20000 }], total: 20000, status: 'paid', method: 'orange' },
    { id: 'fac-4', patientId: 'pat-1', date: yesterdayStr, items: [{ label: 'Consultation médecine générale', amount: 15000 }], total: 15000, status: 'paid', method: 'cash' },
    { id: 'fac-5', patientId: 'pat-6', date: '2026-05-08', items: [{ label: 'Consultation médecine générale', amount: 15000 }], total: 15000, status: 'unpaid' },
  ];

  const NOTIFICATIONS = [
    { id: 'n-1', text: 'Nouveau RDV en ligne — Karim Meïté à 09h30', time: 'il y a 3 min', unread: true },
    { id: 'n-2', text: 'Mariam Ouédraogo a confirmé son RDV de 14h00', time: 'il y a 22 min', unread: true },
    { id: 'n-3', text: 'Paiement reçu — Wave (15 000 FCFA)', time: 'il y a 1 h', unread: false },
  ];

  // ── store helpers ──
  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }
  function saveStore(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  const initial = loadStore() || {
    clinic: CLINIC,
    staff: STAFF,
    patients: PATIENTS,
    appointments: APPOINTMENTS,
    consultations: CONSULTATIONS,
    prescriptions: PRESCRIPTIONS,
    invoices: INVOICES,
    notifications: NOTIFICATIONS,
    waitlist: ['rdv-3'], // patient pat-1 in waiting room
  };

  const listeners = new Set();
  let store = initial;

  function notify() {
    listeners.forEach(fn => { try { fn(store); } catch (e) {} });
  }

  window.CCI = {
    get store() { return store; },
    set(updater) {
      const next = typeof updater === 'function' ? updater(store) : { ...store, ...updater };
      store = next;
      saveStore(store);
      notify();
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      store = {
        clinic: CLINIC, staff: STAFF, patients: PATIENTS,
        appointments: APPOINTMENTS, consultations: CONSULTATIONS,
        prescriptions: PRESCRIPTIONS, invoices: INVOICES,
        notifications: NOTIFICATIONS, waitlist: ['rdv-3'],
      };
      saveStore(store);
      notify();
    },
    todayStr, tomorrowStr, yesterdayStr,
    // helpers
    findPatient(id) { return store.patients.find(p => p.id === id); },
    findStaff(id) { return store.staff.find(s => s.id === id); },
    formatCFA(n) { return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'; },
    fullName(p) { return p ? `${p.firstName} ${p.lastName}` : ''; },
  };
})();

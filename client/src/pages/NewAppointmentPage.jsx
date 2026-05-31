import { useState, useContext } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30',
];

const REASONS = [
  'Consultation générale',
  'Suivi médical',
  'Urgence',
  'Bilan de santé',
  'Vaccination',
  'Renouvellement ordonnance',
  'Résultats d\'analyses',
  'Autre',
];

const STEP_LABELS = ['Patient', 'Créneau', 'Confirmation'];

export default function NewAppointmentPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Step 2
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  // Step 3
  const [sendSms, setSendSms] = useState(true);
  const [sendDoctorNotif, setSendDoctorNotif] = useState(true);

  // Step 4 (success)
  const [createdAppt, setCreatedAppt] = useState(null);

  // Data
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/users'),
  });

  const doctors = users.filter(u => u.role === 'doctor');

  // Taken slots for selected doctor + date
  const { data: takenAppts = [] } = useQuery({
    queryKey: ['appointments', selectedDate, selectedDoctor?.id],
    queryFn: () => api.get(`/appointments?date=${selectedDate}${selectedDoctor ? `&doctor_id=${selectedDoctor.id}` : ''}`),
    enabled: !!selectedDate,
  });

  const takenTimes = new Set(
    takenAppts
      .filter(a => !['cancelled', 'completed'].includes(a.status))
      .map(a => {
        const d = new Date(a.scheduled_at);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      })
  );

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/appointments', payload),
    onSuccess: (appt) => {
      setCreatedAppt(appt);
      setStep(4);
      setErrorMsg('');
    },
    onError: (err) => setErrorMsg(err?.error || 'Erreur lors de la création du rendez-vous'),
  });

  // Filtered patients
  const filteredPatients = patients.filter(p => {
    const q = patientSearch.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.phone?.includes(q)
    );
  }).slice(0, 20);

  const finalReason = reason === 'Autre' ? customReason : reason;

  function handleConfirm() {
    setErrorMsg('');
    if (!selectedPatient || !selectedDoctor || !selectedDate || !selectedTime || !finalReason) {
      setErrorMsg('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    const scheduled_at = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
    createMutation.mutate({
      patient_id: selectedPatient.id,
      doctor_id: selectedDoctor.id,
      scheduled_at,
      reason: finalReason,
    });
  }

  const canGoNext1 = !!selectedPatient;
  const canGoNext2 = !!selectedDoctor && !!selectedDate && !!selectedTime && !!finalReason.trim();

  // Today's date string for min date input
  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="page-content" style={{ maxWidth: 760 }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="icon-btn" onClick={() => navigate(-1)} title="Retour">
            <Icon name="chevronDown" size={18} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <div>
            <h1>Prise de rendez-vous</h1>
            <p className="subtitle">Nouveau rendez-vous patient</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      {step < 4 && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const isActive = step === num;
            const isDone = step > num;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexShrink: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    background: isDone ? 'var(--green)' : isActive ? 'var(--green)' : 'var(--cream-2)',
                    color: isDone || isActive ? '#fff' : 'var(--muted)',
                    fontWeight: 700, fontSize: '.875rem',
                    transition: 'all .2s',
                  }}>
                    {isDone ? <Icon name="check" size={14} /> : num}
                  </div>
                  <span style={{
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '.875rem',
                    color: isActive ? 'var(--ink)' : isDone ? 'var(--green)' : 'var(--muted)',
                  }}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div style={{
                    flex: 1, height: 2, margin: '0 .75rem',
                    background: step > num ? 'var(--green)' : 'var(--border)',
                    transition: 'background .2s',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {errorMsg && (
        <div style={{ marginBottom: '1rem', padding: '.65rem .9rem', borderRadius: 8, background: 'var(--red-soft)', border: '1px solid var(--red-border)', color: 'var(--red)', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <Icon name="warning" size={15} /> {errorMsg}
        </div>
      )}

      {/* ─── STEP 1: Patient selection ─── */}
      {step === 1 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '1rem', fontSize: '1rem' }}>
            Rechercher un patient
          </div>

          <div className="field" style={{ marginBottom: '1rem' }}>
            <label className="field-label">Nom, prénom ou téléphone</label>
            <div style={{ position: 'relative' }}>
              <Icon name="search" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Rechercher un patient…"
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {patientsLoading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)' }}>Chargement…</div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
              {filteredPatients.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '.875rem' }}>
                  Aucun patient trouvé
                </div>
              ) : (
                filteredPatients.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '.75rem 1rem', cursor: 'pointer',
                      borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                      background: selectedPatient?.id === p.id ? 'var(--green-paler)' : 'transparent',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => { if (selectedPatient?.id !== p.id) e.currentTarget.style.background = 'var(--cream-2)'; }}
                    onMouseLeave={e => { if (selectedPatient?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: selectedPatient?.id === p.id ? 'var(--green)' : 'var(--cream-2)',
                      color: selectedPatient?.id === p.id ? '#fff' : 'var(--muted)',
                      display: 'grid', placeItems: 'center', fontWeight: 700,
                      fontSize: '.85rem', flexShrink: 0,
                    }}>
                      {(p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.9rem' }}>
                        {p.first_name} {p.last_name}
                      </div>
                      <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                        {p.phone || 'Pas de téléphone'}
                        {p.date_of_birth ? ` · né(e) le ${new Date(p.date_of_birth).toLocaleDateString('fr-FR')}` : ''}
                      </div>
                    </div>
                    {selectedPatient?.id === p.id && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--green)', display: 'grid', placeItems: 'center' }}>
                        <Icon name="check" size={12} style={{ color: '#fff' }} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {selectedPatient && (
            <div style={{ marginTop: '1rem', padding: '.75rem 1rem', borderRadius: 10, background: 'var(--green-paler)', border: '1px solid var(--green-pale)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <Icon name="check" size={15} style={{ color: 'var(--green)' }} />
              <span style={{ fontWeight: 600, color: 'var(--green)', fontSize: '.875rem' }}>
                Patient sélectionné : {selectedPatient.first_name} {selectedPatient.last_name}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              className="btn btn-primary"
              disabled={!canGoNext1}
              onClick={() => setStep(2)}
            >
              Suivant <Icon name="chevronDown" size={14} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Doctor, date, time, reason ─── */}
      {step === 2 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '1.25rem', fontSize: '1rem' }}>
            Choisir le créneau
          </div>

          {/* Doctor */}
          <div className="field" style={{ marginBottom: '1.1rem' }}>
            <label className="field-label">Médecin *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '.6rem' }}>
              {doctors.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoctor(doc)}
                  style={{
                    border: `2px solid ${selectedDoctor?.id === doc.id ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '.75rem',
                    cursor: 'pointer',
                    background: selectedDoctor?.id === doc.id ? 'var(--green-paler)' : 'var(--surface)',
                    transition: 'all .15s',
                    display: 'flex', alignItems: 'center', gap: '.6rem',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: selectedDoctor?.id === doc.id ? 'var(--green)' : 'var(--cream-2)',
                    color: selectedDoctor?.id === doc.id ? '#fff' : 'var(--muted)',
                    display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '.8rem', flexShrink: 0,
                  }}>
                    {(doc.first_name?.[0] ?? '') + (doc.last_name?.[0] ?? '')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--ink)' }}>
                      Dr. {doc.first_name} {doc.last_name}
                    </div>
                    {doc.specialty && (
                      <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{doc.specialty}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="field" style={{ marginBottom: '1.1rem' }}>
            <label className="field-label">Date *</label>
            <input
              type="date"
              className="input"
              min={minDate}
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }}
              style={{ maxWidth: 200 }}
            />
          </div>

          {/* Time slots */}
          <div className="field" style={{ marginBottom: '1.1rem' }}>
            <label className="field-label">Heure *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '.4rem' }}>
              {TIME_SLOTS.map(t => {
                const taken = takenTimes.has(t);
                const selected = selectedTime === t;
                return (
                  <button
                    key={t}
                    disabled={taken}
                    onClick={() => setSelectedTime(t)}
                    style={{
                      padding: '.4rem',
                      border: `1.5px solid ${selected ? 'var(--green)' : taken ? 'var(--border)' : 'var(--border)'}`,
                      borderRadius: 8,
                      background: selected ? 'var(--green)' : taken ? 'var(--cream-2)' : 'var(--surface)',
                      color: selected ? '#fff' : taken ? 'var(--muted)' : 'var(--ink)',
                      fontSize: '.8rem', fontWeight: 500,
                      cursor: taken ? 'not-allowed' : 'pointer',
                      textDecoration: taken ? 'line-through' : 'none',
                      opacity: taken ? .5 : 1,
                      transition: 'all .12s',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {selectedDoctor && (
              <div style={{ marginTop: '.4rem', fontSize: '.75rem', color: 'var(--muted)' }}>
                Les créneaux barrés sont déjà pris pour Dr. {selectedDoctor.last_name}
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="field" style={{ marginBottom: '1.1rem' }}>
            <label className="field-label">Motif de consultation *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '.5rem' }}>
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  style={{
                    padding: '.35rem .75rem', borderRadius: 20,
                    border: `1.5px solid ${reason === r ? 'var(--green)' : 'var(--border)'}`,
                    background: reason === r ? 'var(--green-paler)' : 'var(--surface)',
                    color: reason === r ? 'var(--green)' : 'var(--ink)',
                    fontSize: '.8rem', cursor: 'pointer', fontWeight: reason === r ? 600 : 400,
                    transition: 'all .12s',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            {reason === 'Autre' && (
              <input
                className="input"
                placeholder="Précisez le motif…"
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                autoFocus
              />
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <button className="btn" onClick={() => setStep(1)}>
              <Icon name="chevronDown" size={14} style={{ transform: 'rotate(90deg)' }} /> Retour
            </button>
            <button
              className="btn btn-primary"
              disabled={!canGoNext2}
              onClick={() => setStep(3)}
            >
              Suivant <Icon name="chevronDown" size={14} style={{ transform: 'rotate(-90deg)' }} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Confirmation ─── */}
      {step === 3 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '1.25rem', fontSize: '1rem' }}>
            Confirmer le rendez-vous
          </div>

          {/* Summary */}
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '1.25rem' }}>
            {[
              { label: 'Patient', value: `${selectedPatient?.first_name} ${selectedPatient?.last_name}`, icon: 'user' },
              { label: 'Médecin', value: `Dr. ${selectedDoctor?.first_name} ${selectedDoctor?.last_name}`, icon: 'stethoscope' },
              {
                label: 'Date & Heure',
                value: `${new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} à ${selectedTime}`,
                icon: 'calendar',
              },
              { label: 'Motif', value: finalReason, icon: 'file' },
            ].map((row, i) => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
                padding: '.85rem 1rem',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--green-paler)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name={row.icon} size={15} style={{ color: 'var(--green)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: '.1rem' }}>{row.label}</div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.9rem' }}>{row.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Notifications */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 500, fontSize: '.875rem', color: 'var(--ink)', marginBottom: '.6rem' }}>
              Notifications
            </div>
            {[
              { key: 'sms', label: `Envoyer un SMS de confirmation au patient (${selectedPatient?.phone || 'aucun numéro'})`, value: sendSms, set: setSendSms },
              { key: 'doc', label: `Notifier le Dr. ${selectedDoctor?.last_name}`, value: sendDoctorNotif, set: setSendDoctorNotif },
            ].map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem 0', cursor: 'pointer', fontSize: '.875rem', color: 'var(--ink)' }}>
                <input
                  type="checkbox"
                  checked={opt.value}
                  onChange={e => opt.set(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--green)', cursor: 'pointer' }}
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <button className="btn" onClick={() => setStep(2)} disabled={createMutation.isPending}>
              <Icon name="chevronDown" size={14} style={{ transform: 'rotate(90deg)' }} /> Retour
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Enregistrement…' : 'Confirmer le RDV'}
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: Success ─── */}
      {step === 4 && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--green-paler)', display: 'grid', placeItems: 'center',
            margin: '0 auto 1rem',
          }}>
            <Icon name="check" size={28} style={{ color: 'var(--green)' }} />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '.5rem' }}>
            Rendez-vous confirmé !
          </h2>
          <div style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: '1.5rem' }}>
            Le rendez-vous de{' '}
            <strong>{selectedPatient?.first_name} {selectedPatient?.last_name}</strong>{' '}
            avec <strong>Dr. {selectedDoctor?.first_name} {selectedDoctor?.last_name}</strong>{' '}
            le{' '}
            <strong>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {selectedTime}
            </strong>{' '}
            a été enregistré.
          </div>

          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setStep(1);
                setSelectedPatient(null);
                setSelectedDoctor(null);
                setSelectedDate(new Date().toISOString().slice(0, 10));
                setSelectedTime('');
                setReason('');
                setCustomReason('');
                setPatientSearch('');
                setCreatedAppt(null);
              }}
            >
              <Icon name="plus" size={14} /> Nouveau RDV
            </button>
            <button className="btn" onClick={() => navigate('/secretary-home')}>
              Retour à l'accueil
            </button>
            <button className="btn" onClick={() => navigate('/appointments')}>
              Voir l'agenda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const STATUS_MAP = {
  pending:   { cls: 'waiting',   badge: 'gold',  label: 'En attente' },
  confirmed: { cls: 'confirmed', badge: 'green', label: 'Confirmé' },
  waiting:   { cls: 'waiting',   badge: 'blue',  label: 'Salle d\'attente' },
  'in-room': { cls: 'in-room',   badge: 'blue',  label: 'En consultation' },
  completed: { cls: 'done',      badge: 'muted', label: 'Terminé' },
  cancelled: { cls: 'cancelled', badge: 'red',   label: 'Annulé' },
};

const HOURS = Array.from({ length: 21 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function slotKey(date) {
  const d = new Date(date);
  const h = d.getHours();
  const m = d.getMinutes() < 30 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
}

// ── BookingModal ──────────────────────────────────────────────────────────────
function BookingModal({ onClose }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/users'),
  });

  const doctorList = users.filter(u => u.role === 'doctor');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/appointments', {
      ...data,
      scheduled_at: new Date(data.scheduled_at).toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    },
    onError: (err) => setServerError(err?.error || 'Erreur lors de la création'),
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Nouveau rendez-vous</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          {serverError && (
            <div style={{
              background: 'var(--red-soft)', border: '1px solid var(--red)',
              color: 'var(--red)', padding: '.65rem .9rem', borderRadius: 8,
              fontSize: 13, marginBottom: '1rem',
            }}>
              {serverError}
            </div>
          )}

          <form id="booking-form" onSubmit={handleSubmit(d => mutation.mutate(d))}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
              <div className="field">
                <label>Patient</label>
                <select className="select" {...register('patient_id', { required: 'Requis' })}>
                  <option value="">Sélectionner un patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
                {errors.patient_id && <span className="form-error">{errors.patient_id.message}</span>}
              </div>

              <div className="field">
                <label>Médecin</label>
                <select className="select" {...register('doctor_id', { required: 'Requis' })}>
                  <option value="">Sélectionner un médecin</option>
                  {doctorList.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>
                  ))}
                </select>
                {errors.doctor_id && <span className="form-error">{errors.doctor_id.message}</span>}
              </div>

              <div className="field">
                <label>Date et heure</label>
                <input
                  type="datetime-local"
                  className="input"
                  min={new Date().toISOString().slice(0, 16)}
                  {...register('scheduled_at', { required: 'Requis' })}
                />
                {errors.scheduled_at && <span className="form-error">{errors.scheduled_at.message}</span>}
              </div>

              <div className="field">
                <label>Motif (optionnel)</label>
                <input className="input" placeholder="Consultation générale" {...register('reason')} />
              </div>

              <div className="field">
                <label>Notes (optionnel)</label>
                <textarea className="textarea" rows={2} placeholder="Informations complémentaires..." {...register('notes')} />
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button type="submit" form="booking-form" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? <><span className="spinner" /> Création...</> : 'Créer le rendez-vous'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ActiveConsultationModal ───────────────────────────────────────────────────
// Ouvert depuis l'agenda quand le RDV est en statut 'in-room'.
// Appelle POST /consultations/close (transaction atomique).
function ActiveConsultationModal({ appointment, onClose }) {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [vitals, setVitals] = useState({ tension: '', pouls: '', temp: '', poids: '' });
  const [rxItems, setRxItems] = useState([{ name: '', dosage: '', instructions: '', duration: '' }]);
  const [amount, setAmount] = useState('');
  const [nextApptDate, setNextApptDate] = useState('');
  const [nextApptReason, setNextApptReason] = useState('');

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  useEffect(() => {
    if (!timerRunning) return;
    const i = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(i);
  }, [timerRunning]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  // Patient history for sidebar
  const { data: history } = useQuery({
    queryKey: ['patient-history', appointment.patient_id],
    queryFn: () => api.get(`/patients/${appointment.patient_id}/history`),
    enabled: !!appointment.patient_id,
  });
  const patient = history?.patient;
  const prevConsultations = (history?.consultations || []).slice(0, 3);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      chief_complaint: appointment.reason || '',
      examination: '',
      diagnosis: '',
      notes: '',
    },
  });

  const symptoms = watch('chief_complaint');

  const closeMutation = useMutation({
    mutationFn: async (data) => {
      // Prepend vitals to examination
      const vitalParts = [];
      if (vitals.tension) vitalParts.push(`TA ${vitals.tension}`);
      if (vitals.pouls)   vitalParts.push(`Pouls ${vitals.pouls} bpm`);
      if (vitals.temp)    vitalParts.push(`Temp. ${vitals.temp}°C`);
      if (vitals.poids)   vitalParts.push(`Poids ${vitals.poids} kg`);
      const vitalStr = vitalParts.join(' · ');
      const examinationFull = vitalStr
        ? (data.examination ? `${vitalStr}\n${data.examination}` : vitalStr)
        : (data.examination || null);

      const validRx = rxItems.filter(it => it.name.trim());

      return api.post('/consultations/close', {
        appointment_id:    appointment.id,
        patient_id:        appointment.patient_id,
        chief_complaint:   data.chief_complaint,
        examination:       examinationFull,
        diagnosis:         data.diagnosis,
        notes:             data.notes || null,
        medications:             validRx.length > 0 ? validRx : null,
        amount:                  parseInt(amount || '0', 10),
        next_appointment_date:   nextApptDate   || null,
        next_appointment_reason: nextApptReason || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['follow-up-requests'] });
      onClose();
    },
    onError: (err) => setServerError(err?.error || 'Erreur lors de la clôture'),
  });

  async function askAI() {
    setAiSuggesting(true);
    setAiSuggestion('');
    const allergies = patient?.allergies || 'aucune';
    const prompt = `Patient : ${appointment.patient_first_name} ${appointment.patient_last_name}.
Allergies : ${allergies}.
Motif : ${appointment.reason || 'non précisé'}.
Constantes : ${vitals.tension ? 'TA ' + vitals.tension : '—'}, ${vitals.pouls ? 'Pouls ' + vitals.pouls + ' bpm' : '—'}, ${vitals.temp ? 'Temp. ' + vitals.temp + '°C' : '—'}.
Symptômes : ${symptoms || 'à recueillir'}.

Propose en 4-5 lignes : 1) 2-3 hypothèses diagnostiques plausibles, 2) examens complémentaires à envisager, 3) ébauche de plan de prise en charge. Termine par une note de prudence brève. N'invente pas de données.`;
    try {
      const res = await api.post('/awa/chat', {
        messages: [{ role: 'user', content: prompt }],
        userRole: user?.role,
      });
      setAiSuggestion(res?.reply || res?.content || '');
    } catch {
      setAiSuggestion("Impossible de joindre Awa pour l'instant. Réessayez.");
    } finally {
      setAiSuggesting(false);
    }
  }

  function addRxLine() { setRxItems(p => [...p, { name: '', dosage: '', instructions: '', duration: '' }]); }
  function setRxLine(i, f, v) { setRxItems(p => p.map((it, idx) => idx === i ? { ...it, [f]: v } : it)); }
  function removeRxLine(i) { setRxItems(p => p.filter((_, idx) => idx !== i)); }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,25,.55)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--cream)', borderRadius: 16, width: '100%', maxWidth: 1100, boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'white' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>
              Consultation — {appointment.patient_first_name} {appointment.patient_last_name}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {appointment.reason || 'Consultation'} · {new Date(appointment.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            {serverError && (
              <span style={{ fontSize: 12, color: 'var(--red)', maxWidth: 260 }}>{serverError}</span>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit(d => closeMutation.mutate(d))}
              disabled={closeMutation.isPending}
            >
              {closeMutation.isPending
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Enregistrement…</>
                : <><Icon name="check" size={14} /> Clôturer la consultation</>}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', padding: '1.5rem', alignItems: 'start' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Patient summary */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title">Patient — synthèse rapide</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--green-paler)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16, color: 'var(--green)', flexShrink: 0 }}>
                  {(appointment.patient_first_name?.[0] || '') + (appointment.patient_last_name?.[0] || '')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{appointment.patient_first_name} {appointment.patient_last_name}</div>
                  <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.35rem' }}>
                    {patient?.blood_type && (
                      <span className="badge" style={{ background: 'var(--green-paler)', color: 'var(--green)', border: '1px solid var(--green-pale)' }}>
                        Groupe {patient.blood_type}
                      </span>
                    )}
                    {patient?.allergies && (
                      <span className="badge" style={{ background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red-border)', fontSize: 11 }}>
                        ⚠ {patient.allergies}
                      </span>
                    )}
                  </div>
                  {prevConsultations.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: '.3rem' }}>
                      Dernière visite : {new Date(prevConsultations[0].created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {prevConsultations[0].diagnosis ? ` — ${prevConsultations[0].diagnosis.slice(0, 50)}` : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vitals */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title">Constantes</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.75rem' }}>
                {[
                  { key: 'tension', label: 'Tension (mmHg)', placeholder: '120/80' },
                  { key: 'pouls',   label: 'Pouls (bpm)',    placeholder: '72' },
                  { key: 'temp',    label: 'Temp. (°C)',     placeholder: '36.8' },
                  { key: 'poids',   label: 'Poids (kg)',     placeholder: '70' },
                ].map(v => (
                  <div key={v.key} className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 11 }}>{v.label}</label>
                    <input
                      className="input"
                      placeholder={v.placeholder}
                      value={vitals[v.key]}
                      onChange={e => setVitals(p => ({ ...p, [v.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title">Anamnèse · Symptômes</div>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Décrivez les symptômes rapportés par le patient…"
                {...register('chief_complaint', { required: 'Requis', maxLength: { value: 500, message: 'Max 500 caractères' } })}
              />
              {errors.chief_complaint && <span className="form-error">{errors.chief_complaint.message}</span>}
            </div>

            {/* Clinical exam */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title">Examen clinique</div>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Observations, auscultation, signes physiques…"
                {...register('examination', { maxLength: { value: 2000, message: 'Max 2000 caractères' } })}
              />
              {errors.examination && <span className="form-error">{errors.examination.message}</span>}
            </div>

            {/* Diagnosis + AI */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title">
                <span>Hypothèses & plan</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={askAI}
                  disabled={aiSuggesting}
                  style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}
                >
                  {aiSuggesting
                    ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Awa réfléchit…</>
                    : <><Icon name="sparkles" size={12} /> Demander à Awa</>}
                </button>
              </div>

              {aiSuggestion && (
                <div style={{ background: 'var(--green-paler)', border: '1px solid var(--green-pale)', borderRadius: 10, padding: '.85rem 1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem' }}>
                    <span style={{ width: 20, height: 20, background: 'var(--green)', borderRadius: 6, display: 'grid', placeItems: 'center' }}>
                      <Icon name="sparkles" size={11} color="white" />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Proposition d'Awa</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{aiSuggestion}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: '.5rem' }}>
                    ⚠ Suggestion IA — à valider par votre jugement clinique.
                  </div>
                </div>
              )}

              <div className="field" style={{ marginBottom: '.85rem' }}>
                <label>Diagnostic / Impression</label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Diagnostic principal et hypothèses…"
                  {...register('diagnosis', { required: 'Requis', maxLength: { value: 1000, message: 'Max 1000 caractères' } })}
                />
                {errors.diagnosis && <span className="form-error">{errors.diagnosis.message}</span>}
              </div>
              <div className="field">
                <label>Notes complémentaires</label>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Examens demandés, suivi, recommandations…"
                  {...register('notes', { maxLength: { value: 2000, message: 'Max 2000 caractères' } })}
                />
                {errors.notes && <span className="form-error">{errors.notes.message}</span>}
              </div>
            </div>

            {/* Prescription */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title">
                <span>Ordonnance (optionnel)</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addRxLine}>
                  <Icon name="plus" size={12} /> Ligne
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {rxItems.map((it, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '.5rem', alignItems: 'flex-end' }}>
                    <div className="field" style={{ margin: 0 }}>
                      {i === 0 && <label style={{ fontSize: 11 }}>Médicament</label>}
                      <input className="input" placeholder="Paracétamol 1000mg" value={it.name} onChange={e => setRxLine(i, 'name', e.target.value)} />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      {i === 0 && <label style={{ fontSize: 11 }}>Dosage</label>}
                      <input className="input" placeholder="1000mg" value={it.dosage} onChange={e => setRxLine(i, 'dosage', e.target.value)} />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      {i === 0 && <label style={{ fontSize: 11 }}>Instructions</label>}
                      <input className="input" placeholder="3x/jour" value={it.instructions} onChange={e => setRxLine(i, 'instructions', e.target.value)} />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      {i === 0 && <label style={{ fontSize: 11 }}>Durée</label>}
                      <input className="input" placeholder="5 jours" value={it.duration} onChange={e => setRxLine(i, 'duration', e.target.value)} />
                    </div>
                    <button type="button" className="icon-btn" onClick={() => removeRxLine(i)} style={{ color: 'var(--red)', marginTop: i === 0 ? 18 : 0 }}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: '.75rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                <Icon name="info" size={11} />
                L'ordonnance sera enregistrée et accessible dans l'espace patient.
              </div>
            </div>

            {/* Invoice amount */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title">Facturation</div>
              <div className="field" style={{ margin: 0 }}>
                <label>Montant à facturer (F CFA)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={500}
                  placeholder="15000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: '.5rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                <Icon name="info" size={11} />
                Une facture en attente sera créée et encaissée par la secrétaire.
              </div>
            </div>

            {/* Prochain RDV */}
            <div className="card" style={{ padding: '1rem 1.25rem', border: nextApptDate ? '1.5px solid var(--green)' : undefined }}>
              <div className="card-title">
                <span>Prochain rendez-vous (optionnel)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Date souhaitée</label>
                  <input
                    className="input"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={nextApptDate}
                    onChange={e => setNextApptDate(e.target.value)}
                  />
                </div>
                {nextApptDate && (
                  <div className="field" style={{ margin: 0 }}>
                    <label>Motif du suivi (optionnel)</label>
                    <input
                      className="input"
                      placeholder="Consultation de suivi, contrôle…"
                      value={nextApptReason}
                      onChange={e => setNextApptReason(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: '.65rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                <Icon name="info" size={11} />
                {nextApptDate
                  ? 'La secrétaire recevra une demande de suivi et confirmera le rendez-vous.'
                  : 'Laissez vide si aucun suivi n\'est nécessaire.'}
              </div>
            </div>

          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Timer */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title" style={{ marginBottom: '.75rem' }}>Timer de consultation</div>
              <div className="serif" style={{ fontSize: '2rem', fontWeight: 700, textAlign: 'center', marginBottom: '.5rem', color: 'var(--ink)', letterSpacing: 2 }}>
                {mm}:{ss}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '.4rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setTimerRunning(r => !r)}>
                  {timerRunning ? 'Pause' : 'Reprendre'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setSeconds(0); setTimerRunning(true); }}>
                  Réinitialiser
                </button>
              </div>
            </div>

            {/* Allergies */}
            <div className="card" style={{ padding: '1rem 1.25rem', background: patient?.allergies ? 'var(--red-soft)' : undefined }}>
              <div className="card-title" style={{ marginBottom: '.5rem' }}>Allergies & interactions</div>
              {patient?.allergies ? (
                <div style={{ fontSize: 13, display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--red)', fontSize: 15, lineHeight: 1.2 }}>⚠</span>
                  <span>Allergie connue à <strong style={{ color: 'var(--red)' }}>{patient.allergies}</strong>. Évitez ces molécules dans l'ordonnance.</span>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune allergie connue déclarée.</div>
              )}
            </div>

            {/* Previous visits */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title" style={{ marginBottom: '.5rem' }}>Visites précédentes</div>
              {prevConsultations.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucun historique disponible.</div>
              ) : prevConsultations.map(v => (
                <div key={v.id} style={{ padding: '.55rem 0', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {new Date(v.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {v.diagnosis && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {v.diagnosis.slice(0, 80)}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── AppointmentCard ───────────────────────────────────────────────────────────
function AppointmentCard({ appointment, onStatusChange, onStartConsultation, userRole, changingId }) {
  const s = STATUS_MAP[appointment.status] ?? STATUS_MAP.pending;
  const dt = new Date(appointment.scheduled_at);
  const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const isChanging = changingId === appointment.id;

  const canEdit      = ['secretary', 'doctor'].includes(userRole);
  const canDoctor    = userRole === 'doctor';
  const canSecretary = userRole === 'secretary';

  const Spinner = () => <span className="spinner" style={{ width: 12, height: 12 }} />;

  return (
    <div className={`appt-card ${s.cls}`}>
      <div className="appt-name">
        {appointment.patient_first_name} {appointment.patient_last_name}
      </div>
      <div className="appt-reason">
        {appointment.reason || 'Consultation'}
      </div>
      <div className="appt-meta">
        <span className={`badge ${s.badge}`}>
          <span className="dot-mark" />{s.label}
        </span>
        <span style={{ color: 'var(--muted)', marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>
          {timeStr}
        </span>
      </div>

      {/* pending → Confirmer / Annuler */}
      {canEdit && appointment.status === 'pending' && (
        <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem' }}>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--green-pale)', color: 'var(--green)', flex: 1, justifyContent: 'center' }}
            disabled={isChanging}
            onClick={() => onStatusChange(appointment.id, 'confirmed')}
          >
            {isChanging ? <Spinner /> : 'Confirmer'}
          </button>
          <button
            className="btn btn-sm btn-danger"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={isChanging}
            onClick={() => onStatusChange(appointment.id, 'cancelled')}
          >
            {isChanging ? <Spinner /> : 'Annuler'}
          </button>
        </div>
      )}

      {/* confirmed:
          - secrétaire → "Arrivé ✓" (→ waiting) + "Annuler"
          - médecin    → "Appeler"  (→ in-room)  + "Annuler" */}
      {canEdit && appointment.status === 'confirmed' && (
        <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem' }}>
          {canDoctor ? (
            <button
              className="btn btn-sm"
              style={{ background: 'var(--blue-pale, #e8f0fe)', color: 'var(--blue, #1a56db)', flex: 1, justifyContent: 'center' }}
              disabled={isChanging}
              onClick={() => onStatusChange(appointment.id, 'in-room')}
            >
              {isChanging ? <Spinner /> : <><Icon name="stethoscope" size={12} /> Appeler</>}
            </button>
          ) : canSecretary ? (
            <button
              className="btn btn-sm"
              style={{ background: 'var(--green-pale)', color: 'var(--green)', flex: 1, justifyContent: 'center' }}
              disabled={isChanging}
              onClick={() => onStatusChange(appointment.id, 'waiting')}
            >
              {isChanging ? <Spinner /> : 'Arrivé ✓'}
            </button>
          ) : null}
          <button
            className="btn btn-sm btn-danger"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={isChanging}
            onClick={() => onStatusChange(appointment.id, 'cancelled')}
          >
            {isChanging ? <Spinner /> : 'Annuler'}
          </button>
        </div>
      )}

      {/* waiting:
          - médecin    → "Faire entrer" (→ in-room) + "Annuler"
          - secrétaire → "Annuler" uniquement */}
      {canEdit && appointment.status === 'waiting' && (
        <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem' }}>
          {canDoctor && (
            <button
              className="btn btn-sm"
              style={{ background: 'var(--blue-pale, #e8f0fe)', color: 'var(--blue, #1a56db)', flex: 1, justifyContent: 'center' }}
              disabled={isChanging}
              onClick={() => onStatusChange(appointment.id, 'in-room')}
            >
              {isChanging ? <Spinner /> : <><Icon name="stethoscope" size={12} /> Faire entrer</>}
            </button>
          )}
          <button
            className="btn btn-sm btn-danger"
            style={{ flex: canDoctor ? 1 : undefined, width: canDoctor ? undefined : '100%', justifyContent: 'center' }}
            disabled={isChanging}
            onClick={() => onStatusChange(appointment.id, 'cancelled')}
          >
            {isChanging ? <Spinner /> : 'Annuler'}
          </button>
        </div>
      )}

      {/* in-room → médecin ouvre le formulaire de consultation complet */}
      {canDoctor && appointment.status === 'in-room' && (
        <div style={{ marginTop: '.5rem' }}>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--green)', color: 'white', width: '100%', justifyContent: 'center' }}
            onClick={() => onStartConsultation(appointment)}
          >
            <Icon name="stethoscope" size={12} /> Ouvrir la consultation
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Day summary sidebar ──────────────────────────────────────────────────────
function DaySidebar({ appointments }) {
  const total     = appointments.length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const inRoom    = appointments.filter(a => a.status === 'in-room').length;
  const waiting   = appointments.filter(a => a.status === 'waiting').length;
  const upcoming  = appointments.filter(a => ['pending', 'confirmed'].includes(a.status)).length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;

  let suggestion = null;
  if (total === 0) {
    suggestion = "Aucun rendez-vous planifié. C'est une bonne occasion pour rattraper votre documentation.";
  } else if (inRoom > 0) {
    suggestion = `Une consultation est en cours. ${waiting > 0 ? `${waiting} patient(s) en salle d'attente.` : ''}`;
  } else if (waiting > 1) {
    suggestion = `${waiting} patients en attente. Pensez à prévenir en cas de retard.`;
  } else if (upcoming > 3) {
    suggestion = `${upcoming} rendez-vous à venir aujourd'hui. Bonne journée !`;
  } else if (completed === total && total > 0) {
    suggestion = 'Tous les rendez-vous du jour sont terminés. Excellent travail !';
  }

  return (
    <div className="agenda-day-sidebar">
      <div className="day-stats-card">
        <div className="card-title">Aperçu du jour</div>
        <div className="day-stat-row">
          <span className="label">Total</span>
          <span className="value">{total}</span>
        </div>
        <div className="day-stat-row">
          <span className="label">Terminés</span>
          <span className="value green">{completed}</span>
        </div>
        <div className="day-stat-row">
          <span className="label">En consultation</span>
          <span className="value">{inRoom}</span>
        </div>
        <div className="day-stat-row">
          <span className="label">En attente</span>
          <span className="value gold">{waiting}</span>
        </div>
        <div className="day-stat-row">
          <span className="label">À venir</span>
          <span className="value">{upcoming}</span>
        </div>
        {cancelled > 0 && (
          <div className="day-stat-row">
            <span className="label">Annulés</span>
            <span className="value" style={{ color: 'var(--red)' }}>{cancelled}</span>
          </div>
        )}
      </div>

      {suggestion && (
        <div className="ai-assist-box">
          <div className="ai-assist-mark">
            <Icon name="sparkles" size={13} />
          </div>
          <div>
            <div className="ai-assist-label">Awa</div>
            <div className="ai-assist-text">{suggestion}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MonthView ─────────────────────────────────────────────────────────────────
function MonthView({ monthStart, monthEnd, user }) {
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const monthEndStr   = monthEnd.toISOString().slice(0, 10);

  const { data: allAppts = [], isLoading } = useQuery({
    queryKey: ['appointments-month', monthStartStr],
    queryFn: () => api.get(`/appointments?date_from=${monthStartStr}&date_to=${monthEndStr}`),
  });

  // Filtrer uniquement les RDV du médecin connecté si rôle doctor
  const appts = user?.role === 'doctor'
    ? allAppts.filter(a => a.doctor_id === user.id)
    : allAppts;

  // Stats rapides
  const total     = appts.length;
  const confirmed = appts.filter(a => a.status === 'confirmed').length;
  const pending   = appts.filter(a => a.status === 'pending').length;
  const completed = appts.filter(a => a.status === 'completed').length;
  const cancelled = appts.filter(a => a.status === 'cancelled').length;
  const upcoming  = appts.filter(a => ['pending', 'confirmed', 'waiting', 'in-room'].includes(a.status)).length;

  // Grouper par jour (YYYY-MM-DD)
  const grouped = appts.reduce((acc, a) => {
    const day = a.scheduled_at.slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(a);
    return acc;
  }, {});
  const sortedDays = Object.keys(grouped).sort();

  const monthLabel = monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="placeholder" style={{ height: 72, borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Résumé du mois */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div className="card-title" style={{ marginBottom: '.85rem', textTransform: 'capitalize' }}>
          {monthLabel}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Total</div>
          </div>
          <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {upcoming > 0 && (
              <div>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--green)' }}>{upcoming}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 5 }}>à venir</span>
              </div>
            )}
            {confirmed > 0 && (
              <div>
                <span className="badge green">{confirmed} confirmé{confirmed > 1 ? 's' : ''}</span>
              </div>
            )}
            {pending > 0 && (
              <div>
                <span className="badge gold">{pending} en attente</span>
              </div>
            )}
            {completed > 0 && (
              <div>
                <span className="badge muted">{completed} terminé{completed > 1 ? 's' : ''}</span>
              </div>
            )}
            {cancelled > 0 && (
              <div>
                <span className="badge red">{cancelled} annulé{cancelled > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Liste par jour */}
      {sortedDays.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📅</div>
            <div className="empty-state-title">Aucun rendez-vous ce mois</div>
            <div className="empty-state-desc">Le mois de {monthLabel} ne contient aucun RDV planifié.</div>
          </div>
        </div>
      ) : sortedDays.map(day => {
        const dayAppts = grouped[day];
        const d = new Date(day + 'T00:00:00');
        const isToday = day === new Date().toISOString().slice(0, 10);
        const isPast  = d < new Date() && !isToday;
        const dayLabel = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

        return (
          <div key={day} className="card" style={{ padding: 0, overflow: 'hidden', opacity: isPast ? .75 : 1 }}>
            {/* En-tête du jour */}
            <div style={{
              padding: '.6rem 1.1rem',
              borderBottom: '1px solid var(--border)',
              background: isToday ? 'var(--green-paler, #f0faf6)' : 'var(--cream-2, #f5f4f0)',
              display: 'flex', alignItems: 'center', gap: '.75rem',
            }}>
              <span style={{
                fontWeight: 700, fontSize: 13,
                color: isToday ? 'var(--green)' : 'var(--ink)',
                textTransform: 'capitalize',
              }}>
                {dayLabel}
              </span>
              {isToday && <span className="badge green" style={{ fontSize: 10 }}>Aujourd'hui</span>}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
                {dayAppts.length} RDV
              </span>
            </div>

            {/* Lignes de RDV */}
            <div>
              {dayAppts.map((a, idx) => {
                const s = STATUS_MAP[a.status] ?? STATUS_MAP.pending;
                const timeStr = new Date(a.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: '.85rem',
                    padding: '.65rem 1.1rem',
                    borderTop: idx > 0 ? '1px solid var(--border)' : undefined,
                  }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--muted)', width: 40, flexShrink: 0 }}>
                      {timeStr}
                    </span>
                    <div style={{
                      width: 4, height: 32, borderRadius: 3, flexShrink: 0,
                      background: s.badge === 'green' ? 'var(--green)'
                        : s.badge === 'gold' ? 'var(--gold)'
                        : s.badge === 'blue' ? 'var(--blue, #1a56db)'
                        : s.badge === 'red'  ? 'var(--red)'
                        : 'var(--muted-light, #d1d5db)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.patient_first_name} {a.patient_last_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                        {a.reason || 'Consultation générale'}
                        {user?.role !== 'doctor' && (
                          <> · Dr. {a.doctor_first_name} {a.doctor_last_name}</>
                        )}
                      </div>
                    </div>
                    <span className={`badge ${s.badge}`}>
                      <span className="dot-mark" />{s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { user } = useContext(AuthContext);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState('day'); // 'day' | 'month'
  const [showModal, setShowModal] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [consultAppt, setConsultAppt] = useState(null); // appointment en cours de consultation
  const queryClient = useQueryClient();

  const canEdit     = ['secretary', 'doctor'].includes(user?.role);
  const canBookAppt = user?.role === 'secretary';

  // Calcul plage du mois courant
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data: appointments = [], isLoading, isError } = useQuery({
    queryKey: ['appointments', date],
    queryFn: () => api.get(`/appointments?date=${date}`),
    enabled: view === 'day',
  });


  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: (updatedAppt) => {
      setStatusError('');
      queryClient.setQueryData(['appointments', date], (old) =>
        Array.isArray(old)
          ? old.map(a => a.id === updatedAppt.id ? { ...a, status: updatedAppt.status } : a)
          : old
      );
    },
    onError: (err) => {
      setStatusError(err?.error || 'Erreur lors de la mise à jour du statut');
    },
  });

  const bySlot = appointments.reduce((acc, a) => {
    const key = slotKey(a.scheduled_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="page-content">
      {statusError && (
        <div style={{
          padding: '.75rem 1rem', marginBottom: '1rem',
          background: 'var(--red-soft)', border: '1px solid var(--red)',
          borderRadius: 10, fontSize: 13, color: 'var(--red)',
          display: 'flex', alignItems: 'center', gap: '.5rem',
        }}>
          <Icon name="warning" size={15} />
          {statusError}
          <button
            onClick={() => setStatusError('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 16 }}
          >×</button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Agenda</h1>
          <div className="subtitle" style={{ textTransform: 'capitalize' }}>
            {view === 'month'
              ? monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              : (isLoading ? '…' : `${appointments.length} rendez-vous · ${dateLabel}`)
            }
          </div>
        </div>
        <div className="page-header-actions">
          {/* Toggle Jour / Mois */}
          <div style={{ display: 'flex', background: 'var(--cream-2, #f5f4f0)', borderRadius: 8, padding: 3, gap: 2 }}>
            <button
              className={`btn btn-sm ${view === 'day' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ minWidth: 60 }}
              onClick={() => setView('day')}
            >
              Jour
            </button>
            <button
              className={`btn btn-sm ${view === 'month' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ minWidth: 60 }}
              onClick={() => setView('month')}
            >
              Mois
            </button>
          </div>

          {view === 'day' && (
            <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="input"
                style={{ width: 'auto' }}
              />
              {date !== new Date().toISOString().slice(0, 10) && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDate(new Date().toISOString().slice(0, 10))}
                  title="Revenir à aujourd'hui"
                >
                  Aujourd'hui
                </button>
              )}
            </div>
          )}

          {canBookAppt && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={15} />
              Nouveau RDV
            </button>
          )}
        </div>
      </div>

      {view === 'month' ? (
        <MonthView monthStart={monthStart} monthEnd={monthEnd} user={user} />
      ) : isError ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--red)' }}>
          Erreur lors du chargement des rendez-vous
        </div>
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="placeholder" style={{ height: 64, borderRadius: 8 }} />
          ))}
        </div>
      ) : (
        <div className="agenda-layout">
          {/* Timeline */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Legend bar */}
            <div style={{
              padding: '.65rem 1.25rem', borderBottom: '1px solid var(--border)',
              display: 'flex', flexWrap: 'wrap', gap: '.75rem 1.25rem',
              fontSize: 12, color: 'var(--muted)',
            }}>
              {[
                { label: 'Confirmé',        color: 'var(--green)' },
                { label: 'En attente',      color: 'var(--gold)' },
                { label: 'En consultation', color: 'var(--blue, #1a56db)' },
                { label: 'Terminé',         color: 'var(--muted-light, #c4c9d4)' },
              ].map(({ label, color }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, background: color, borderRadius: 2, flexShrink: 0 }} />
                  {label}
                </span>
              ))}
            </div>

            <div className="timeline-day">
              {HOURS.map(hour => {
                const appts = bySlot[hour] || [];
                const isEmpty = appts.length === 0;
                return (
                  <div key={hour} className="time-slot" style={isEmpty ? { opacity: .7 } : undefined}>
                    <div className="time-label">{hour}</div>
                    <div className="time-slot-content">
                      {appts.map(a => (
                        <AppointmentCard
                          key={a.id}
                          appointment={a}
                          userRole={user?.role}
                          changingId={statusMutation.isPending ? statusMutation.variables?.id : null}
                          onStatusChange={(id, s) => statusMutation.mutate({ id, status: s })}
                          onStartConsultation={setConsultAppt}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {appointments.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="calendar" size={26} style={{ opacity: .55 }} />
                </div>
                <div className="empty-state-title">Aucun rendez-vous</div>
                <div className="empty-state-desc">Aucun rendez-vous planifié pour cette date</div>
              </div>
            )}
          </div>

          {/* Day sidebar */}
          <DaySidebar appointments={appointments} />
        </div>
      )}

      {showModal && <BookingModal onClose={() => setShowModal(false)} />}

      {/* Formulaire de consultation complet — ouvert uniquement depuis un RDV en-room */}
      {consultAppt && (
        <ActiveConsultationModal
          appointment={consultAppt}
          onClose={() => setConsultAppt(null)}
        />
      )}
    </div>
  );
}

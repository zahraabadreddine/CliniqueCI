import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const STATUS_MAP = {
  confirmed: { cls: 'green', label: 'Confirmé' },
  pending: { cls: 'gold', label: 'En attente' },
  'in-room': { cls: 'blue', label: 'En consultation' },
  completed: { cls: 'muted', label: 'Terminé' },
  cancelled: { cls: 'red', label: 'Annulé' },
};

// Minimum datetime-local value: now + 1 hour
function minDateTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  // Format: YYYY-MM-DDTHH:MM
  return d.toISOString().slice(0, 16);
}

function BookingModal({ onClose }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { doctor_id: '', scheduled_at: '', reason: '' },
  });

  // Fetch doctors list (patients can see only doctors)
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get('/users'),
  });

  // Get this patient's own record to get patient_id
  const { data: myRecord, isLoading: loadingMe } = useQuery({
    queryKey: ['my-patient-record'],
    queryFn: () => api.get('/patients/me'),
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/appointments', {
      patient_id: myRecord.id,
      doctor_id: data.doctor_id,
      scheduled_at: new Date(data.scheduled_at).toISOString(),
      reason: data.reason || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      onClose();
    },
    onError: (err) => setServerError(err?.error || 'Erreur lors de la prise de rendez-vous'),
  });

  const isLoading = loadingDoctors || loadingMe;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>Prendre un rendez-vous</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-body">
          {serverError && (
            <div style={{
              padding: '.75rem 1rem', marginBottom: '1rem',
              background: 'var(--red-soft)', border: '1px solid var(--red)',
              borderRadius: 10, fontSize: 13, color: 'var(--red)',
              display: 'flex', alignItems: 'center', gap: '.5rem',
            }}>
              <Icon name="warning" size={14} />{serverError}
            </div>
          )}

          {!myRecord && !loadingMe && (
            <div style={{
              padding: '.75rem 1rem', marginBottom: '1rem',
              background: 'var(--gold-soft, #fdf8ec)', border: '1px solid var(--gold)',
              borderRadius: 10, fontSize: 13, color: 'var(--gold)',
            }}>
              <Icon name="warning" size={14} style={{ marginRight: 6 }} />
              Votre dossier patient n'a pas encore été créé. Contactez la réception.
            </div>
          )}

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {[1, 2, 3].map(i => <div key={i} className="placeholder" style={{ height: 38, borderRadius: 8 }} />)}
            </div>
          ) : (
            <form
              id="patient-booking-form"
              onSubmit={handleSubmit(d => mutation.mutate(d))}
              style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}
            >
              <div className="field">
                <label>Médecin</label>
                <select className="select" {...register('doctor_id', { required: 'Requis' })}>
                  <option value="">— Choisir un médecin —</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>
                  ))}
                </select>
                {errors.doctor_id && <span className="form-error">{errors.doctor_id.message}</span>}
              </div>

              <div className="field">
                <label>Date et heure souhaitées</label>
                <input
                  type="datetime-local"
                  className="input"
                  min={minDateTime()}
                  {...register('scheduled_at', { required: 'Requis' })}
                />
                {errors.scheduled_at && <span className="form-error">{errors.scheduled_at.message}</span>}
              </div>

              <div className="field">
                <label>Motif (optionnel)</label>
                <input
                  className="input"
                  placeholder="Ex : Consultation générale, renouvellement ordonnance..."
                  {...register('reason')}
                />
              </div>
            </form>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button
            type="submit"
            form="patient-booking-form"
            className="btn btn-primary"
            disabled={mutation.isPending || !myRecord || isLoading}
          >
            {mutation.isPending
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Envoi…</>
              : 'Demander le rendez-vous'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApptCard({ a }) {
  const s = STATUS_MAP[a.status] || { cls: 'muted', label: a.status };
  const dt = new Date(a.scheduled_at);
  const dateStr = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{dateStr}</div>
          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
            <Icon name="clock" size={12} style={{ verticalAlign: -2, marginRight: 3 }} />
            {timeStr}
          </div>
        </div>
        <span className={`badge ${s.cls}`}>
          <span className="dot-mark" />{s.label}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        Dr. {a.doctor_first_name} {a.doctor_last_name}
      </div>
      {a.reason && (
        <div className="text-xs text-muted" style={{ marginTop: .25 + 'rem' }}>{a.reason}</div>
      )}
    </div>
  );
}

export default function MyAppointmentsPage() {
  const [showModal, setShowModal] = useState(false);

  const { data: appointments = [], isLoading, isError } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => api.get('/appointments'),
  });

  // Sort: upcoming first, then past
  const sorted = [...appointments].sort((a, b) =>
    new Date(a.scheduled_at) - new Date(b.scheduled_at)
  );

  const upcoming = sorted.filter(a => new Date(a.scheduled_at) >= new Date() && a.status !== 'cancelled');
  const past = sorted.filter(a => new Date(a.scheduled_at) < new Date() || a.status === 'completed' || a.status === 'cancelled');

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Mes rendez-vous</h1>
          <div className="subtitle">
            {isLoading ? '…' : `${appointments.length} rendez-vous`}
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={16} />
            Prendre un rendez-vous
          </button>
        </div>
      </div>

      {isError ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--red)' }}>
          Erreur lors du chargement
        </div>
      ) : isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="placeholder" style={{ height: 110, borderRadius: 14 }} />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
          <Icon name="calendar" size={40} style={{ opacity: .2, marginBottom: '1rem' }} />
          <div style={{ fontWeight: 500, color: 'var(--ink)' }}>Aucun rendez-vous</div>
          <div className="text-xs" style={{ marginTop: '.4rem' }}>
            Cliquez sur « Prendre un rendez-vous » pour en planifier un
          </div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.65rem',
              }}>
                À venir ({upcoming.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {upcoming.map(a => <ApptCard key={a.id} a={a} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.65rem',
              }}>
                Passés ({past.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {past.map(a => <ApptCard key={a.id} a={a} />)}
              </div>
            </div>
          )}
        </>
      )}

      {showModal && <BookingModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

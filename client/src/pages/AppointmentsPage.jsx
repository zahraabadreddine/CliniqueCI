import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const STATUS_MAP = {
  pending:   { cls: 'waiting', badge: 'gold',  label: 'En attente' },
  confirmed: { cls: 'confirmed', badge: 'green', label: 'Confirmé' },
  'in-room': { cls: 'in-room',  badge: 'blue',  label: 'En consultation' },
  completed: { cls: 'done',    badge: 'muted', label: 'Terminé' },
  cancelled: { cls: 'cancelled', badge: 'red',  label: 'Annulé' },
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
                <select
                  className="select"
                  {...register('patient_id', { required: 'Requis' })}
                >
                  <option value="">Sélectionner un patient</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
                {errors.patient_id && <span className="form-error">{errors.patient_id.message}</span>}
              </div>

              <div className="field">
                <label>Médecin</label>
                <select
                  className="select"
                  {...register('doctor_id', { required: 'Requis' })}
                >
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
                <input
                  className="input"
                  placeholder="Consultation générale"
                  {...register('reason')}
                />
              </div>

              <div className="field">
                <label>Notes (optionnel)</label>
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Informations complémentaires..."
                  {...register('notes')}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button
            type="submit"
            form="booking-form"
            className="btn btn-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <><span className="spinner" /> Création...</> : 'Créer le rendez-vous'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({ appointment, onStatusChange, canEdit }) {
  const s = STATUS_MAP[appointment.status] ?? STATUS_MAP.pending;
  const dt = new Date(appointment.scheduled_at);
  const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

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
      {canEdit && appointment.status === 'pending' && (
        <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem' }}>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--green-pale)', color: 'var(--green)', flex: 1, justifyContent: 'center' }}
            onClick={() => onStatusChange(appointment.id, 'confirmed')}
          >
            Confirmer
          </button>
          <button
            className="btn btn-sm btn-danger"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => onStatusChange(appointment.id, 'cancelled')}
          >
            Annuler
          </button>
        </div>
      )}
      {canEdit && appointment.status === 'confirmed' && (
        <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem' }}>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--blue-pale, #e8f0fe)', color: 'var(--blue, #1a56db)', flex: 1, justifyContent: 'center' }}
            onClick={() => onStatusChange(appointment.id, 'in-room')}
          >
            <Icon name="stethoscope" size={12} /> Appeler
          </button>
          <button
            className="btn btn-sm btn-danger"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => onStatusChange(appointment.id, 'cancelled')}
          >
            Annuler
          </button>
        </div>
      )}
      {canEdit && appointment.status === 'in-room' && (
        <div style={{ marginTop: '.5rem' }}>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--green-pale)', color: 'var(--green)', width: '100%', justifyContent: 'center' }}
            onClick={() => onStatusChange(appointment.id, 'completed')}
          >
            Terminer la consultation
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  const { user } = useContext(AuthContext);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const canEdit = ['admin', 'secretary', 'doctor'].includes(user?.role);

  const { data: appointments = [], isLoading, isError } = useQuery({
    queryKey: ['appointments', date],
    queryFn: () => api.get(`/appointments?date=${date}`),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
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
      <div className="page-header">
        <div>
          <h1>Agenda</h1>
          <div className="subtitle" style={{ textTransform: 'capitalize' }}>
            {isLoading ? '…' : `${appointments.length} rendez-vous · ${dateLabel}`}
          </div>
        </div>
        <div className="page-header-actions">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input"
            style={{ width: 'auto' }}
          />
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={15} />
              Nouveau RDV
            </button>
          )}
        </div>
      </div>

      {isError ? (
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="timeline-day">
            {HOURS.map(hour => {
              const appts = bySlot[hour] || [];
              const isEmpty = appts.length === 0;
              return (
                <div
                  key={hour}
                  className="time-slot"
                  style={isEmpty ? { opacity: .7 } : undefined}
                >
                  <div className="time-label">{hour}</div>
                  <div className="time-slot-content">
                    {appts.map(a => (
                      <AppointmentCard
                        key={a.id}
                        appointment={a}
                        canEdit={canEdit}
                        onStatusChange={(id, s) => statusMutation.mutate({ id, status: s })}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {appointments.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
              <Icon name="calendar" size={40} style={{ opacity: .2, marginBottom: '1rem' }} />
              <div style={{ fontWeight: 500, color: 'var(--ink)', marginBottom: '.35rem' }}>
                Aucun rendez-vous
              </div>
              <div className="text-xs">Aucun rendez-vous planifié pour cette date</div>
            </div>
          )}
        </div>
      )}

      {showModal && <BookingModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

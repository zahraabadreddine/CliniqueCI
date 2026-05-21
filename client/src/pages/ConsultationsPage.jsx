import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

function ConsultationModal({ onClose }) {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      appointment_id: '',
      chief_complaint: '',
      examination: '',
      diagnosis: '',
      notes: '',
    },
  });

  // Fetch this doctor's appointments to pick from
  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['appointments-for-consult', user?.id],
    queryFn: () => api.get(`/appointments?doctor_id=${user.id}`),
    enabled: !!user?.id,
  });

  // Only appointments that are not completed or cancelled
  const availableAppts = appointments.filter(a =>
    !['completed', 'cancelled'].includes(a.status)
  );

  const selectedApptId = watch('appointment_id');
  const selectedAppt = appointments.find(a => a.id === selectedApptId);

  const mutation = useMutation({
    mutationFn: (data) => api.post('/consultations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    },
    onError: (err) => setServerError(err?.error || 'Erreur lors de la création'),
  });

  const onSubmit = (data) => {
    if (!selectedAppt) return;
    mutation.mutate({
      appointment_id: data.appointment_id,
      patient_id: selectedAppt.patient_id,
      chief_complaint: data.chief_complaint,
      examination: data.examination || null,
      diagnosis: data.diagnosis,
      notes: data.notes || null,
    });
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>Nouvelle consultation</h2>
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

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
            <div className="field">
              <label>Rendez-vous associé</label>
              {loadingAppts ? (
                <div className="placeholder" style={{ height: 38, borderRadius: 8 }} />
              ) : (
                <select className="select" {...register('appointment_id', { required: 'Requis' })}>
                  <option value="">— Sélectionner un rendez-vous —</option>
                  {availableAppts.length === 0 ? (
                    <option disabled>Aucun rendez-vous disponible</option>
                  ) : availableAppts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.patient_first_name} {a.patient_last_name} —{' '}
                      {new Date(a.scheduled_at).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}{' '}
                      {new Date(a.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {a.reason ? ` (${a.reason.slice(0, 30)})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {errors.appointment_id && <span className="form-error">{errors.appointment_id.message}</span>}
              {selectedAppt && (
                <div style={{
                  marginTop: '.4rem', padding: '.5rem .75rem',
                  background: 'var(--green-pale)', borderRadius: 8, fontSize: 12, color: 'var(--green)',
                }}>
                  Patient : <strong>{selectedAppt.patient_first_name} {selectedAppt.patient_last_name}</strong>
                </div>
              )}
              {availableAppts.length === 0 && !loadingAppts && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: '.35rem' }}>
                  Aucun rendez-vous en cours ou confirmé. Confirmez d'abord un rendez-vous dans l'agenda.
                </div>
              )}
            </div>

            <div className="field">
              <label>Motif de consultation</label>
              <input
                className="input"
                {...register('chief_complaint', { required: 'Requis', maxLength: { value: 500, message: 'Max 500 caractères' } })}
                placeholder="Ex : Fièvre depuis 3 jours, maux de tête..."
              />
              {errors.chief_complaint && <span className="form-error">{errors.chief_complaint.message}</span>}
            </div>

            <div className="field">
              <label>Examen clinique (optionnel)</label>
              <textarea
                className="textarea"
                rows={3}
                {...register('examination', { maxLength: { value: 2000, message: 'Max 2000 caractères' } })}
                placeholder="Observations, signes vitaux, auscultation..."
              />
              {errors.examination && <span className="form-error">{errors.examination.message}</span>}
            </div>

            <div className="field">
              <label>Diagnostic</label>
              <input
                className="input"
                {...register('diagnosis', { required: 'Requis', maxLength: { value: 1000, message: 'Max 1000 caractères' } })}
                placeholder="Ex : Paludisme simple, Hypertension artérielle..."
              />
              {errors.diagnosis && <span className="form-error">{errors.diagnosis.message}</span>}
            </div>

            <div className="field">
              <label>Notes (optionnel)</label>
              <textarea
                className="textarea"
                rows={2}
                {...register('notes', { maxLength: { value: 2000, message: 'Max 2000 caractères' } })}
                placeholder="Recommandations, suivi, traitement proposé..."
              />
              {errors.notes && <span className="form-error">{errors.notes.message}</span>}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '.25rem' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                {mutation.isPending
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Enregistrement…</>
                  : 'Enregistrer la consultation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ConsultationRow({ c }) {
  const date = c.created_at
    ? new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  return (
    <div className="data-row" style={{ alignItems: 'flex-start' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'var(--green-pale)', display: 'grid', placeItems: 'center', color: 'var(--green)',
      }}>
        <Icon name="stethoscope" size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>
          {c.patient_first_name} {c.patient_last_name}
        </div>
        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
          {c.chief_complaint || 'Consultation'}
        </div>
        {c.diagnosis && (
          <div className="text-xs" style={{ marginTop: 4, color: 'var(--ink-soft)' }}>
            Diagnostic : {c.diagnosis}
          </div>
        )}
      </div>
      <div className="text-xs text-muted" style={{ flexShrink: 0 }}>{date}</div>
    </div>
  );
}

export default function ConsultationsPage() {
  const { user } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);

  const { data: consultations = [], isLoading, isError } = useQuery({
    queryKey: ['consultations'],
    queryFn: () => api.get('/consultations'),
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Consultations</h1>
          <div className="subtitle">
            {isLoading ? '…' : `${consultations.length} consultation${consultations.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {user?.role === 'doctor' && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={16} />
              Nouvelle consultation
            </button>
          </div>
        )}
      </div>

      <div className="card">
        {isError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--red)' }}>
            <Icon name="warning" size={24} style={{ marginBottom: '.5rem' }} />
            <div>Erreur lors du chargement</div>
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="placeholder" style={{ height: 60, borderRadius: 10 }} />
            ))}
          </div>
        ) : consultations.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="stethoscope" size={36} style={{ opacity: .25, marginBottom: '.75rem' }} />
            <div style={{ fontWeight: 500 }}>Aucune consultation enregistrée</div>
            <div className="text-xs" style={{ marginTop: '.25rem' }}>
              Les consultations apparaîtront ici après les rendez-vous
            </div>
          </div>
        ) : (
          <div className="data-list">
            {consultations.map(c => <ConsultationRow key={c.id} c={c} />)}
          </div>
        )}
      </div>

      {showModal && <ConsultationModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

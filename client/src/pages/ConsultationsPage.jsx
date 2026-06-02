import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

// ── Avatar helpers ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#22a05e', '#22a05e', '#d97706', '#156b3d', '#dc2626', '#156b3d'];
function avatarColor(firstName) {
  return AVATAR_COLORS[(firstName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}
function initials(first, last) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}
function AvatarSm({ firstName, lastName }) {
  return (
    <div className="avatar avatar-sm" style={{ background: avatarColor(firstName), flexShrink: 0 }}>
      {initials(firstName, lastName)}
    </div>
  );
}

// ── ConsultationDetailModal ───────────────────────────────────────────────────
// Read-only view of a completed consultation.
// Doctors can activate "Corriger les notes" to fix typos via PATCH /consultations/:id.
function ConsultationDetailModal({ consultation: c, userRole, onClose }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [serverError, setServerError] = useState('');

  // Load patient history to show allergies + associated prescription
  const { data: history } = useQuery({
    queryKey: ['patient-history', c.patient_id],
    queryFn: () => api.get(`/patients/${c.patient_id}/history`),
    enabled: !!c.patient_id,
  });

  const patient = history?.patient;

  // Find prescriptions that were created alongside this consultation
  const prescriptions = history?.prescriptions || [];
  const relatedRx = prescriptions.filter(p => {
    if (p.consultation_id) return p.consultation_id === c.id;
    // Fallback: created within 60 s of the consultation
    const diff = Math.abs(new Date(c.created_at) - new Date(p.created_at));
    return diff < 60_000;
  });

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      chief_complaint: c.chief_complaint ?? '',
      examination: c.examination ?? '',
      diagnosis: c.diagnosis ?? '',
      notes: c.notes ?? '',
    },
  });

  const patchMutation = useMutation({
    mutationFn: (data) => api.patch(`/consultations/${c.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      setEditMode(false);
      setServerError('');
    },
    onError: (err) => setServerError(err?.error || 'Erreur lors de la correction'),
  });

  const date = c.created_at
    ? new Date(c.created_at).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';
  const time = c.created_at
    ? new Date(c.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,20,25,.55)', zIndex: 200,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '1.5rem', overflowY: 'auto',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--cream)', borderRadius: 16, width: '100%', maxWidth: 900,
        boxShadow: '0 20px 60px rgba(0,0,0,.2)', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'white',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>
              Dossier de consultation
            </h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {c.patient_first_name} {c.patient_last_name}
              {date ? ` · ${date}` : ''}
              {time ? ` à ${time}` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            {userRole === 'doctor' && !editMode && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(true)}>
                <Icon name="edit" size={13} /> Corriger les notes
              </button>
            )}
            {editMode && (
              <>
                {serverError && (
                  <span style={{ fontSize: 12, color: 'var(--red)' }}>{serverError}</span>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditMode(false); setServerError(''); }}>
                  Annuler
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSubmit(d => patchMutation.mutate(d))}
                  disabled={patchMutation.isPending || !isDirty}
                >
                  {patchMutation.isPending
                    ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Enregistrement…</>
                    : <><Icon name="check" size={13} /> Enregistrer</>}
                </button>
              </>
            )}
            <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 260px',
          gap: '1.5rem', padding: '1.5rem', alignItems: 'start',
        }}>

          {/* Left: clinical data */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Motif */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title">Motif de consultation</div>
              {editMode ? (
                <>
                  <textarea
                    className="textarea" rows={3}
                    {...register('chief_complaint', {
                      required: 'Requis',
                      maxLength: { value: 500, message: 'Max 500 caractères' },
                    })}
                  />
                  {errors.chief_complaint && (
                    <span className="form-error">{errors.chief_complaint.message}</span>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {c.chief_complaint || <span style={{ color: 'var(--muted)' }}>Non renseigné</span>}
                </p>
              )}
            </div>

            {/* Examen clinique */}
            {(c.examination || editMode) && (
              <div className="card" style={{ padding: '1rem 1.25rem' }}>
                <div className="card-title">Examen clinique</div>
                {editMode ? (
                  <>
                    <textarea
                      className="textarea" rows={4}
                      {...register('examination', {
                        maxLength: { value: 2000, message: 'Max 2000 caractères' },
                      })}
                    />
                    {errors.examination && (
                      <span className="form-error">{errors.examination.message}</span>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {c.examination}
                  </p>
                )}
              </div>
            )}

            {/* Diagnostic */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title">Diagnostic</div>
              {editMode ? (
                <>
                  <textarea
                    className="textarea" rows={3}
                    {...register('diagnosis', {
                      required: 'Requis',
                      maxLength: { value: 1000, message: 'Max 1000 caractères' },
                    })}
                  />
                  {errors.diagnosis && (
                    <span className="form-error">{errors.diagnosis.message}</span>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                  {c.diagnosis || <span style={{ color: 'var(--muted)', fontWeight: 400 }}>Non renseigné</span>}
                </p>
              )}
            </div>

            {/* Notes */}
            {(c.notes || editMode) && (
              <div className="card" style={{ padding: '1rem 1.25rem' }}>
                <div className="card-title">Notes & recommandations</div>
                {editMode ? (
                  <>
                    <textarea
                      className="textarea" rows={3}
                      {...register('notes', {
                        maxLength: { value: 2000, message: 'Max 2000 caractères' },
                      })}
                    />
                    {errors.notes && (
                      <span className="form-error">{errors.notes.message}</span>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {c.notes}
                  </p>
                )}
              </div>
            )}

            {/* Ordonnance associée */}
            {relatedRx.length > 0 && (
              <div className="card" style={{ padding: '1rem 1.25rem' }}>
                <div className="card-title">
                  <span>Ordonnance associée</span>
                  <span className="badge green">{relatedRx.length}</span>
                </div>
                {relatedRx.map((rx, idx) => {
                  const meds = typeof rx.medications === 'string'
                    ? JSON.parse(rx.medications)
                    : (rx.medications || []);
                  return (
                    <div
                      key={rx.id}
                      style={idx > 0
                        ? { borderTop: '1px solid var(--border)', paddingTop: '.75rem', marginTop: '.75rem' }
                        : {}}
                    >
                      <div className="table-wrapper">
                      <table className="simple" style={{ marginTop: 0 }}>
                        <thead>
                          <tr>
                            <th>Médicament</th>
                            <th>Dosage</th>
                            <th>Instructions</th>
                            <th>Durée</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meds.map((m, mi) => (
                            <tr key={mi}>
                              <td style={{ fontWeight: 500 }}>{m.name || '—'}</td>
                              <td>{m.dosage || '—'}</td>
                              <td>{m.instructions || m.frequency || '—'}</td>
                              <td>{m.duration || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                      {rx.notes && (
                        <p style={{ margin: '.5rem 0 0', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                          {rx.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Patient card */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title" style={{ marginBottom: '.75rem' }}>Patient</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: avatarColor(c.patient_first_name),
                  display: 'grid', placeItems: 'center',
                  color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0,
                }}>
                  {initials(c.patient_first_name, c.patient_last_name)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {c.patient_first_name} {c.patient_last_name}
                  </div>
                  {patient?.date_of_birth && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      Né(e) le {new Date(patient.date_of_birth).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              </div>
              {patient?.blood_type && (
                <div style={{ marginTop: '.75rem' }}>
                  <span className="badge" style={{
                    background: 'var(--green-paler)', color: 'var(--green)',
                    border: '1px solid var(--green-pale)',
                  }}>
                    Groupe {patient.blood_type}
                  </span>
                </div>
              )}
            </div>

            {/* Allergies */}
            <div className="card" style={{
              padding: '1rem 1.25rem',
              background: patient?.allergies ? 'var(--red-soft)' : undefined,
            }}>
              <div className="card-title" style={{ marginBottom: '.5rem' }}>Allergies</div>
              {patient?.allergies ? (
                <div style={{ fontSize: 13, display: 'flex', gap: '.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--red)', fontSize: 15 }}>⚠</span>
                  <span style={{ color: 'var(--red)', fontWeight: 500 }}>{patient.allergies}</span>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aucune allergie déclarée</div>
              )}
            </div>

            {/* Médecin traitant */}
            {(c.doctor_first_name || c.doctor_last_name) && (
              <div className="card" style={{ padding: '1rem 1.25rem' }}>
                <div className="card-title" style={{ marginBottom: '.5rem' }}>Médecin</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                  Dr {c.doctor_last_name} {c.doctor_first_name}
                </div>
              </div>
            )}

            {/* Statut */}
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div className="card-title" style={{ marginBottom: '.5rem' }}>Statut</div>
              <span className="badge green">Terminée</span>
              {editMode && (
                <div style={{
                  marginTop: '.5rem', fontSize: 12, color: 'var(--green)',
                  background: 'var(--green-paler)', borderRadius: 6, padding: '.4rem .6rem',
                }}>
                  Mode correction actif
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── ConsultationRow ───────────────────────────────────────────────────────────
function ConsultationRow({ c, onView }) {
  const date = c.created_at
    ? new Date(c.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <tr>
      <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>{date}</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <AvatarSm firstName={c.patient_first_name} lastName={c.patient_last_name} />
          <span style={{ fontWeight: 500, fontSize: 13 }}>
            {c.patient_first_name} {c.patient_last_name}
          </span>
        </div>
      </td>
      <td style={{ fontSize: 12.5, color: 'var(--ink-soft)', maxWidth: 220 }}>
        <span style={{
          display: '-webkit-box', WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {c.chief_complaint || '—'}
        </span>
      </td>
      <td style={{ fontSize: 12.5, color: 'var(--ink-soft)', maxWidth: 240 }}>
        <span style={{
          display: '-webkit-box', WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {c.diagnosis || <span className="text-muted">—</span>}
        </span>
      </td>
      <td><span className="badge green">Terminée</span></td>
      <td style={{ textAlign: 'right' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 12, gap: '.25rem' }}
          onClick={() => onView(c)}
        >
          Voir <Icon name="chevron-right" size={13} />
        </button>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ConsultationsPage() {
  const { user } = useContext(AuthContext);
  const [viewTarget, setViewTarget] = useState(null);

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
            {isLoading
              ? '…'
              : `${consultations.length} consultation${consultations.length !== 1 ? 's' : ''} enregistrée${consultations.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div className="page-header-actions">
          <div style={{
            fontSize: 12, color: 'var(--muted)',
            display: 'flex', alignItems: 'center', gap: '.4rem',
          }}>
            <Icon name="info" size={13} />
            Les consultations se lancent depuis l'Agenda
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--red)' }}>
            <Icon name="warning" size={24} style={{ marginBottom: '.5rem' }} />
            <div>Erreur lors du chargement</div>
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', padding: '1.25rem' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="placeholder" style={{ height: 52, borderRadius: 10 }} />
            ))}
          </div>
        ) : consultations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="stethoscope" size={26} style={{ opacity: .55 }} />
            </div>
            <div className="empty-state-title">Aucune consultation enregistrée</div>
            <div className="empty-state-desc">
              Depuis l'Agenda, passez un rendez-vous en salle puis cliquez sur "Ouvrir la consultation"
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
          <table className="simple">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Motif</th>
                <th>Diagnostic</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {consultations.map(c => (
                <ConsultationRow
                  key={c.id}
                  c={c}
                  onView={setViewTarget}
                />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {viewTarget && (
        <ConsultationDetailModal
          consultation={viewTarget}
          userRole={user?.role}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}

import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const AVATAR_COLORS = ['#22a05e', '#22a05e', '#d97706', '#156b3d', '#dc2626', '#156b3d'];

function avatarColor(firstName) {
  return AVATAR_COLORS[(firstName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

function initials(first, last) {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
}

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000));
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ firstName, lastName }) {
  const color = avatarColor(firstName);
  return (
    <div className="avatar avatar-sm" style={{ background: color, flexShrink: 0 }}>
      {initials(firstName, lastName)}
    </div>
  );
}

// ── PatientModal (création — secrétaire uniquement) ───────────────────────────
function PatientModal({ onClose }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/patients', data),
    onSuccess: (newPatient) => {
      queryClient.setQueriesData({ queryKey: ['patients'] }, (old) =>
        Array.isArray(old) ? [newPatient, ...old] : [newPatient]
      );
      onClose();
    },
    onError: (err) => setServerError(err?.error || "Erreur lors de l'ajout"),
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>Nouveau patient</h2>
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
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
              <div className="field">
                <label>Prénom</label>
                <input className="input" {...register('first_name', { required: 'Requis' })} placeholder="Karim" />
                {errors.first_name && <span className="form-error">{errors.first_name.message}</span>}
              </div>
              <div className="field">
                <label>Nom</label>
                <input className="input" {...register('last_name', { required: 'Requis' })} placeholder="Diallo" />
                {errors.last_name && <span className="form-error">{errors.last_name.message}</span>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
              <div className="field">
                <label>Date de naissance</label>
                <input type="date" className="input" {...register('date_of_birth', { required: 'Requis' })} />
                {errors.date_of_birth && <span className="form-error">{errors.date_of_birth.message}</span>}
              </div>
              <div className="field">
                <label>Groupe sanguin</label>
                <select className="select" {...register('blood_type')}>
                  <option value="">—</option>
                  {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Téléphone</label>
              <input className="input" {...register('phone')} placeholder="+225 07 00 00 00 00" />
            </div>
            <div className="field">
              <label>Email (optionnel)</label>
              <input type="email" className="input" {...register('email')} placeholder="patient@email.com" />
            </div>
            <div className="field">
              <label>Allergies (optionnel)</label>
              <input className="input" {...register('allergies')} placeholder="Pénicilline, Aspirine..." />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: '.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                {mutation.isPending
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Ajout…</>
                  : 'Ajouter le patient'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── EditPatientModal (modification — secrétaire uniquement) ───────────────────
function EditPatientModal({ patient: p, onClose }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      first_name:    p.first_name    ?? '',
      last_name:     p.last_name     ?? '',
      date_of_birth: p.date_of_birth ? p.date_of_birth.slice(0, 10) : '',
      blood_type:    p.blood_type    ?? '',
      phone:         p.phone         ?? '',
      email:         p.email         ?? '',
      allergies:     p.allergies     ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => api.patch(`/patients/${p.id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueriesData({ queryKey: ['patients'] }, (old) =>
        Array.isArray(old)
          ? old.map(x => x.id === updated.id ? { ...x, ...updated } : x)
          : old
      );
      onClose();
    },
    onError: (err) => setServerError(err?.error || 'Erreur lors de la mise à jour'),
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <h2>Modifier le patient</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {p.first_name} {p.last_name}
            </div>
          </div>
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
          <form
            id="edit-patient-form"
            onSubmit={handleSubmit(d => mutation.mutate(d))}
            style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
              <div className="field">
                <label>Prénom</label>
                <input className="input" {...register('first_name', { required: 'Requis' })} />
                {errors.first_name && <span className="form-error">{errors.first_name.message}</span>}
              </div>
              <div className="field">
                <label>Nom</label>
                <input className="input" {...register('last_name', { required: 'Requis' })} />
                {errors.last_name && <span className="form-error">{errors.last_name.message}</span>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
              <div className="field">
                <label>Date de naissance</label>
                <input type="date" className="input" {...register('date_of_birth', { required: 'Requis' })} />
                {errors.date_of_birth && <span className="form-error">{errors.date_of_birth.message}</span>}
              </div>
              <div className="field">
                <label>Groupe sanguin</label>
                <select className="select" {...register('blood_type')}>
                  <option value="">—</option>
                  {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Téléphone</label>
              <input className="input" {...register('phone')} placeholder="+225 07 00 00 00 00" />
            </div>
            <div className="field">
              <label>Email (optionnel)</label>
              <input type="email" className="input" {...register('email')} placeholder="patient@email.com" />
            </div>
            <div className="field">
              <label>Allergies (optionnel)</label>
              <input className="input" {...register('allergies')} placeholder="Pénicilline, Aspirine..." />
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button
            type="submit"
            form="edit-patient-form"
            className="btn btn-primary"
            disabled={mutation.isPending || !isDirty}
          >
            {mutation.isPending
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Enregistrement…</>
              : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PatientDrawer ─────────────────────────────────────────────────────────────
function PatientDrawer({ patient, onClose }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['patient-history', patient.id],
    queryFn: () => api.get(`/patients/${patient.id}/history`),
  });

  const age = calcAge(patient.date_of_birth);

  const STATUS_MAP = {
    confirmed:  { cls: 'green', label: 'Confirmé' },
    pending:    { cls: 'gold',  label: 'En attente' },
    completed:  { cls: 'muted', label: 'Terminé' },
    cancelled:  { cls: 'red',   label: 'Annulé' },
    'in-room':  { cls: 'green', label: 'En salle' },
  };

  const allergyList = patient.allergies
    ? patient.allergies.split(',').map(a => a.trim()).filter(Boolean)
    : [];

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer open">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: avatarColor(patient.first_name),
              display: 'grid', placeItems: 'center',
              fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16,
              color: '#fff',
            }}>
              {initials(patient.first_name, patient.last_name)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{patient.first_name} {patient.last_name}</div>
              <div className="text-xs text-muted">
                {age ? `${age} ans` : ''}
                {patient.blood_type ? ` · ${patient.blood_type}` : ''}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="drawer-body">
          {/* Badges groupes sanguin + allergies */}
          {(patient.blood_type || allergyList.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginBottom: '1rem' }}>
              {patient.blood_type && (
                <span className="badge green">Groupe {patient.blood_type}</span>
              )}
              {allergyList.map(a => (
                <span key={a} className="badge red">⚠ {a}</span>
              ))}
            </div>
          )}

          {/* Alerte allergies */}
          {allergyList.length > 0 && (
            <div style={{
              padding: '.7rem .85rem', background: 'var(--red-soft)',
              border: '1px solid var(--red)', borderRadius: 10,
              marginBottom: '1rem', display: 'flex', gap: '.5rem', alignItems: 'center',
            }}>
              <Icon name="warning" size={14} color="var(--red)" />
              <span style={{ fontSize: 13, color: 'var(--red)' }}>
                <strong>Allergies :</strong> {allergyList.join(', ')}
              </span>
            </div>
          )}

          {/* Contacts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Téléphone', value: patient.phone },
              { label: 'Email',     value: patient.email },
            ].filter(f => f.value).map(f => (
              <div key={f.label} style={{ padding: '.7rem .85rem', background: 'var(--cream)', borderRadius: 10 }}>
                <div className="text-xs text-muted">{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{f.value}</div>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {[1, 2, 3].map(i => <div key={i} className="placeholder" style={{ height: 52, borderRadius: 10 }} />)}
            </div>
          ) : history ? (
            <>
              {/* Consultations */}
              {history.consultations && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                    letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '.65rem',
                  }}>
                    Consultations ({history.consultations?.length ?? 0})
                  </div>
                  {history.consultations?.length === 0 ? (
                    <div className="text-xs text-muted">Aucune consultation enregistrée</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                      {history.consultations?.slice(0, 4).map(c => (
                        <div key={c.id} style={{ padding: '.75rem', background: 'var(--cream)', borderRadius: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.25rem' }}>
                            <div className="text-xs text-muted">
                              {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            {(c.doctor_first_name || c.doctor_last_name) && (
                              <div className="text-xs" style={{ color: 'var(--green)', fontWeight: 500 }}>
                                Dr. {c.doctor_last_name}
                              </div>
                            )}
                          </div>
                          {c.chief_complaint && <div style={{ fontSize: 13, fontWeight: 500 }}>{c.chief_complaint}</div>}
                          {c.diagnosis && <div className="text-xs" style={{ marginTop: 2, color: 'var(--ink-soft)' }}>Diag. : {c.diagnosis}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Ordonnances */}
              {history.prescriptions && history.prescriptions.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                    letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '.65rem',
                  }}>
                    Ordonnances ({history.prescriptions.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {history.prescriptions.slice(0, 3).map(r => {
                      const meds = typeof r.medications === 'string'
                        ? (() => { try { return JSON.parse(r.medications); } catch { return []; } })()
                        : (r.medications ?? []);
                      return (
                        <div key={r.id} style={{ padding: '.75rem', background: 'var(--cream)', borderRadius: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.25rem' }}>
                            <div className="text-xs text-muted">{fmtDate(r.created_at)}</div>
                            {(r.doctor_first_name || r.doctor_last_name) && (
                              <div className="text-xs" style={{ color: 'var(--green)', fontWeight: 500 }}>
                                Dr. {r.doctor_last_name}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                            {meds.map(m => m.name || m.med || m).join(' · ') || r.notes || '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rendez-vous */}
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                  letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '.65rem',
                }}>
                  Rendez-vous ({history.appointments?.length ?? 0})
                </div>
                {history.appointments?.length === 0 ? (
                  <div className="text-xs text-muted">Aucun rendez-vous</div>
                ) : (
                  <div className="data-list">
                    {history.appointments?.slice(0, 5).map(a => {
                      const s = STATUS_MAP[a.status] || { cls: 'muted', label: a.status };
                      return (
                        <div key={a.id} className="data-row" style={{ alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>
                              {new Date(a.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            {(a.doctor_first_name || a.doctor_last_name) && (
                              <div className="text-xs text-muted">Dr. {a.doctor_last_name}</div>
                            )}
                            {a.reason && <div className="text-xs text-muted">{a.reason}</div>}
                          </div>
                          <span className={`badge ${s.cls}`}><span className="dot-mark" />{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PatientsPage() {
  const { user } = useContext(AuthContext);

  const canAddPatient  = user?.role === 'secretary';
  const canEditPatient = user?.role === 'secretary';

  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [selected,   setSelected]   = useState(null);

  const { data: patients = [], isLoading, isError } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => api.get(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });

  // Client-side filter for Maladie chronique / Allergies tabs
  const filtered = patients.filter(p => {
    if (filter === 'allergy') return p.allergies && p.allergies.trim() !== '';
    // 'chronic' filter: no dedicated field yet, show all
    return true;
  });

  return (
    <div className="page-content">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Patients</h1>
          <div className="subtitle">
            {isLoading ? '…' : `${patients.length} dossier${patients.length !== 1 ? 's' : ''} actif${patients.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {canAddPatient && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={16} />
              Nouveau patient
            </button>
          </div>
        )}
      </div>

      {/* Search + filters bar */}
      <div className="card mb-2" style={{ padding: '.85rem 1rem' }}>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{
            flex: 1, minWidth: 200, display: 'flex', alignItems: 'center',
            gap: '.5rem', background: 'var(--cream)', padding: '.45rem .75rem', borderRadius: 8,
          }}>
            <Icon name="search" size={15} color="var(--muted)" />
            <input
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13.5 }}
              placeholder="Rechercher un patient par nom, téléphone ou ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '.4rem' }}>
            {[
              ['all',     'Tous'],
              ['chronic', 'Maladie chronique'],
              ['allergy', 'Allergies'],
            ].map(([k, l]) => (
              <button
                key={k}
                className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isError ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--red)' }}>
            <Icon name="warning" size={28} style={{ marginBottom: '.5rem', opacity: .6 }} />
            <div>Erreur lors du chargement</div>
          </div>
        ) : isLoading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="placeholder" style={{ height: 52, borderRadius: 10 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="users" size={26} style={{ opacity: .55 }} />
            </div>
            <div className="empty-state-title">
              {search ? 'Aucun résultat' : 'Aucun patient enregistré'}
            </div>
            {!search && canAddPatient && (
              <div className="empty-state-desc">
                Ajoutez votre premier patient avec le bouton ci-dessus
              </div>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
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
              {filtered.map(p => {
                const age = calcAge(p.date_of_birth);
                const allergyList = p.allergies
                  ? p.allergies.split(',').map(a => a.trim()).filter(Boolean)
                  : [];

                return (
                  <tr key={p.id}>
                    {/* Patient */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                        <Avatar firstName={p.first_name} lastName={p.last_name} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.first_name} {p.last_name}</div>
                          <div className="text-xs text-muted">
                            {p.id.slice(0, 8).toUpperCase()}
                            {p.blood_type ? ` · ${p.blood_type}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Âge · Sexe */}
                    <td className="text-sm">
                      {age ? `${age} ans` : '—'}
                    </td>

                    {/* Téléphone */}
                    <td className="text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {p.phone || '—'}
                    </td>

                    {/* Allergies */}
                    <td>
                      {allergyList.length > 0
                        ? allergyList.map(a => (
                            <span key={a} className="badge red" style={{ marginRight: 4 }}>{a}</span>
                          ))
                        : <span className="text-xs text-muted">—</span>
                      }
                    </td>

                    {/* Dernière visite */}
                    <td className="text-sm">
                      {p.last_visit ? fmtDate(p.last_visit) : '—'}
                    </td>

                    {/* Actions */}
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelected(p)}
                        >
                          Ouvrir <Icon name="chevronRight" size={13} />
                        </button>
                        {canEditPatient && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditTarget(p)}
                          >
                            <Icon name="edit" size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && canAddPatient && (
        <PatientModal onClose={() => setShowModal(false)} />
      )}
      {editTarget && canEditPatient && (
        <EditPatientModal
          patient={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {selected && (
        <PatientDrawer
          patient={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

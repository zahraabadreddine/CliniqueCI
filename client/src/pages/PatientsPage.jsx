import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function PatientModal({ onClose }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/patients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      onClose();
    },
    onError: (err) => setServerError(err?.error || "Erreur lors de l'ajout"),
  });

  return (
    <div className="modal-backdrop">
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
                {mutation.isPending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                {mutation.isPending ? 'Ajout…' : 'Ajouter le patient'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PatientDrawer({ patient, onClose }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['patient-history', patient.id],
    queryFn: () => api.get(`/patients/${patient.id}/history`),
  });

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
    : null;

  const STATUS_MAP = {
    confirmed: { cls: 'green', label: 'Confirmé' },
    pending: { cls: 'gold', label: 'En attente' },
    completed: { cls: 'muted', label: 'Terminé' },
    cancelled: { cls: 'red', label: 'Annulé' },
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer open">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg,var(--green-light),var(--green))',
              display: 'grid', placeItems: 'center',
              fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16,
              color: '#fff', flexShrink: 0,
            }}>
              {(patient.first_name?.[0] ?? '') + (patient.last_name?.[0] ?? '')}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{patient.first_name} {patient.last_name}</div>
              <div className="text-xs text-muted">{age ? `${age} ans` : ''}{patient.blood_type ? ` · ${patient.blood_type}` : ''}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div className="drawer-body">
          {patient.allergies && (
            <div style={{ padding: '.7rem .85rem', background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 10, marginBottom: '1rem', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
              <Icon name="warning" size={14} color="var(--red)" />
              <span style={{ fontSize: 13, color: 'var(--red)' }}><strong>Allergies :</strong> {patient.allergies}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Téléphone', value: patient.phone, icon: 'phone' },
              { label: 'Email', value: patient.email, icon: 'user' },
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
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '.65rem' }}>
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
                            {a.reason && <div className="text-xs text-muted">{a.reason}</div>}
                          </div>
                          <span className={`badge ${s.cls}`}><span className="dot-mark" />{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '.65rem' }}>
                  Consultations ({history.consultations?.length ?? 0})
                </div>
                {history.consultations?.length === 0 ? (
                  <div className="text-xs text-muted">Aucune consultation enregistrée</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {history.consultations?.slice(0, 3).map(c => (
                      <div key={c.id} style={{ padding: '.75rem', background: 'var(--cream)', borderRadius: 10 }}>
                        <div className="text-xs text-muted" style={{ marginBottom: .25 + 'rem' }}>
                          {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        {c.chief_complaint && <div style={{ fontSize: 13, fontWeight: 500 }}>{c.chief_complaint}</div>}
                        {c.diagnosis && <div className="text-xs" style={{ marginTop: 2, color: 'var(--ink-soft)' }}>Diag. : {c.diagnosis}</div>}
                      </div>
                    ))}
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

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: patients = [], isLoading, isError } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => api.get(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Patients</h1>
          <div className="subtitle">
            {isLoading ? '…' : `${patients.length} patient${patients.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={16} />
            Nouveau patient
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
            <Icon name="search" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un patient…"
              className="input"
              style={{ paddingLeft: 36, paddingTop: '.55rem', paddingBottom: '.55rem' }}
            />
          </div>
        </div>

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
        ) : patients.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="users" size={36} style={{ opacity: .2, marginBottom: '.75rem' }} />
            <div style={{ fontWeight: 500, color: 'var(--ink)' }}>
              {search ? 'Aucun résultat' : 'Aucun patient enregistré'}
            </div>
            {!search && (
              <div className="text-xs" style={{ marginTop: '.35rem' }}>
                Ajoutez votre premier patient avec le bouton ci-dessus
              </div>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Patient', 'Âge', 'Téléphone', 'Inscrit le'].map(h => (
                  <th key={h} style={{ padding: '.6rem 1.25rem', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.07em', textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.map(p => {
                const age = p.date_of_birth
                  ? Math.floor((Date.now() - new Date(p.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
                  : null;
                return (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid var(--border-light, #f0ede6)', cursor: 'pointer', transition: 'background .12s' }}
                    onClick={() => setSelected(p)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '.85rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                          background: 'var(--green-pale)', display: 'grid', placeItems: 'center',
                          fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12,
                          color: 'var(--green)',
                        }}>
                          {(p.first_name?.[0] ?? '') + (p.last_name?.[0] ?? '')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{p.first_name} {p.last_name}</div>
                          {p.email && <div className="text-xs text-muted">{p.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '.85rem 1.25rem', fontSize: 14, color: 'var(--ink-soft)' }}>{age ? `${age} ans` : '—'}</td>
                    <td style={{ padding: '.85rem 1.25rem', fontSize: 14, color: 'var(--ink-soft)' }}>{p.phone || '—'}</td>
                    <td style={{ padding: '.85rem 1.25rem', fontSize: 13, color: 'var(--muted)' }}>
                      {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <PatientModal onClose={() => setShowModal(false)} />}
      {selected && <PatientDrawer patient={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

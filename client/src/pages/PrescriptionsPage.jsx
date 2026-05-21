import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

function printPrescription(p) {
  const meds = Array.isArray(p.medications) ? p.medications : [];
  const date = new Date(p.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const win = window.open('', '_blank', 'width=720,height=960');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Ordonnance — ${p.patient_first_name} ${p.patient_last_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; border-bottom: 2px solid #0d7a5f; padding-bottom: 16px; }
    .clinic { font-size: 18px; font-weight: 700; color: #0d7a5f; }
    .clinic-sub { font-size: 11px; color: #666; margin-top: 4px; }
    .title { font-size: 22px; font-weight: 700; color: #0d7a5f; margin-bottom: 20px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 28px; }
    .meta-item label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #888; display: block; margin-bottom: 2px; }
    .meta-item span { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f0faf6; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #0d7a5f; border-bottom: 1px solid #c8e6dc; }
    td { padding: 10px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .notes-box { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px 14px; margin-bottom: 40px; }
    .notes-box strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #888; margin-bottom: 6px; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 48px; }
    .sig-line { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 6px; font-size: 11px; color: #666; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="clinic">CliniqueCI</div>
      <div class="clinic-sub">Clinique privée — Abidjan, Côte d'Ivoire</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#666">${date}</div>
  </div>

  <div class="title">Ordonnance médicale</div>

  <div class="meta-grid">
    <div class="meta-item"><label>Patient</label><span>${p.patient_first_name} ${p.patient_last_name}</span></div>
    <div class="meta-item"><label>Date</label><span>${date}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Médicament</th>
        <th>Dosage</th>
        <th>Fréquence</th>
        <th>Durée</th>
      </tr>
    </thead>
    <tbody>
      ${meds.map(m => `<tr>
        <td><strong>${m.name}</strong></td>
        <td>${m.dosage}</td>
        <td>${m.frequency}</td>
        <td>${m.duration}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  ${p.notes ? `<div class="notes-box"><strong>Notes du médecin</strong>${p.notes}</div>` : ''}

  <div class="footer">
    <div class="sig-line">Signature et cachet du médecin</div>
    <div style="font-size:11px;color:#aaa">Document généré par CliniqueCI</div>
  </div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function MedRow({ index, register, remove, errors }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '.5rem', alignItems: 'flex-start',
      padding: '.65rem', background: 'var(--cream)', borderRadius: 8, marginBottom: '.4rem',
    }}>
      <div className="field" style={{ margin: 0 }}>
        {index === 0 && <label style={{ fontSize: 11 }}>Médicament</label>}
        <input className="input" {...register(`medications.${index}.name`, { required: 'Requis' })}
          placeholder="Ex: Amoxicilline" />
        {errors?.medications?.[index]?.name && (
          <span className="form-error">{errors.medications[index].name.message}</span>
        )}
      </div>
      <div className="field" style={{ margin: 0 }}>
        {index === 0 && <label style={{ fontSize: 11 }}>Dosage</label>}
        <input className="input" {...register(`medications.${index}.dosage`, { required: 'Requis' })}
          placeholder="500 mg" />
        {errors?.medications?.[index]?.dosage && (
          <span className="form-error">{errors.medications[index].dosage.message}</span>
        )}
      </div>
      <div className="field" style={{ margin: 0 }}>
        {index === 0 && <label style={{ fontSize: 11 }}>Fréquence</label>}
        <input className="input" {...register(`medications.${index}.frequency`, { required: 'Requis' })}
          placeholder="3×/jour" />
        {errors?.medications?.[index]?.frequency && (
          <span className="form-error">{errors.medications[index].frequency.message}</span>
        )}
      </div>
      <div className="field" style={{ margin: 0 }}>
        {index === 0 && <label style={{ fontSize: 11 }}>Durée</label>}
        <input className="input" {...register(`medications.${index}.duration`, { required: 'Requis' })}
          placeholder="7 jours" />
        {errors?.medications?.[index]?.duration && (
          <span className="form-error">{errors.medications[index].duration.message}</span>
        )}
      </div>
      <div style={{ marginTop: index === 0 ? 20 : 0 }}>
        <button type="button" className="icon-btn" onClick={() => remove(index)}
          style={{ color: 'var(--red)', opacity: .7 }} title="Supprimer">
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  );
}

function PrescriptionModal({ onClose }) {
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const {
    register, handleSubmit, control, watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      consultation_id: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'medications' });

  const { data: consultations = [], isLoading: loadingConsults } = useQuery({
    queryKey: ['consultations-for-rx'],
    queryFn: () => api.get('/consultations'),
  });

  // Only show consultations that belong to this doctor
  const myConsults = consultations.filter(c => c.doctor_id === user?.id);

  const selectedConsultId = watch('consultation_id');
  const selectedConsult = myConsults.find(c => c.id === selectedConsultId);

  const mutation = useMutation({
    mutationFn: (data) => api.post('/prescriptions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      onClose();
    },
    onError: (err) => setServerError(err?.error || "Erreur lors de la création"),
  });

  const onSubmit = (data) => {
    if (!selectedConsult) return;
    mutation.mutate({
      consultation_id: data.consultation_id,
      patient_id: selectedConsult.patient_id,
      medications: data.medications,
      notes: data.notes || null,
    });
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <h2>Nouvelle ordonnance</h2>
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
              <label>Consultation liée</label>
              {loadingConsults ? (
                <div className="placeholder" style={{ height: 38, borderRadius: 8 }} />
              ) : (
                <select className="select" {...register('consultation_id', { required: 'Requis' })}>
                  <option value="">— Sélectionner une consultation —</option>
                  {myConsults.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.patient_first_name} {c.patient_last_name} —{' '}
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {c.chief_complaint ? ` (${c.chief_complaint.slice(0, 40)})` : ''}
                    </option>
                  ))}
                </select>
              )}
              {errors.consultation_id && <span className="form-error">{errors.consultation_id.message}</span>}
              {selectedConsult && (
                <div style={{
                  marginTop: '.4rem', padding: '.5rem .75rem',
                  background: 'var(--green-pale)', borderRadius: 8, fontSize: 12,
                  color: 'var(--green)',
                }}>
                  Patient : <strong>{selectedConsult.patient_first_name} {selectedConsult.patient_last_name}</strong>
                  {selectedConsult.diagnosis && <> · Diag. : {selectedConsult.diagnosis}</>}
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                <label style={{ fontWeight: 500, fontSize: 13 }}>Médicaments</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => append({ name: '', dosage: '', frequency: '', duration: '' })}
                  style={{ fontSize: 12 }}
                >
                  <Icon name="plus" size={13} /> Ajouter
                </button>
              </div>
              {fields.map((field, index) => (
                <MedRow
                  key={field.id}
                  index={index}
                  register={register}
                  remove={remove}
                  errors={errors}
                />
              ))}
              {fields.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--red)', padding: '.4rem 0' }}>
                  Au moins un médicament est requis
                </div>
              )}
            </div>

            <div className="field">
              <label>Notes (optionnel)</label>
              <textarea className="textarea" rows={2} {...register('notes')}
                placeholder="Instructions particulières, contre-indications..." />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '.25rem' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={mutation.isPending || fields.length === 0}
              >
                {mutation.isPending
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Création…</>
                  : 'Créer l\'ordonnance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PrescriptionRow({ p }) {
  const date = p.created_at
    ? new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const meds = Array.isArray(p.medications) ? p.medications : [];

  return (
    <div className="data-row" style={{ alignItems: 'flex-start' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'var(--gold-pale, #fdf6e3)', display: 'grid', placeItems: 'center', color: 'var(--gold)',
      }}>
        <Icon name="pill" size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>
          {p.patient_first_name} {p.patient_last_name}
        </div>
        {meds.length > 0 && (
          <div className="text-xs text-muted" style={{ marginTop: 3 }}>
            {meds.slice(0, 3).map((m, i) => (
              <span key={i} style={{ marginRight: 6 }}>
                {m.name}{m.dosage ? ` ${m.dosage}` : ''}
              </span>
            ))}
            {meds.length > 3 && <span>+{meds.length - 3} autre{meds.length - 3 > 1 ? 's' : ''}</span>}
          </div>
        )}
        {p.notes && (
          <div className="text-xs" style={{ marginTop: 3, color: 'var(--ink-soft)' }}>{p.notes}</div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.25rem', flexShrink: 0 }}>
        <div className="text-xs text-muted">{date}</div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: '.2rem .5rem', fontSize: 11 }}
          onClick={() => printPrescription(p)}
        >
          <Icon name="print" size={12} /> Imprimer
        </button>
      </div>
    </div>
  );
}

export default function PrescriptionsPage() {
  const { user } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);

  const { data: prescriptions = [], isLoading, isError } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => api.get('/prescriptions'),
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Ordonnances</h1>
          <div className="subtitle">
            {isLoading ? '…' : `${prescriptions.length} ordonnance${prescriptions.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {user?.role === 'doctor' && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={16} />
              Nouvelle ordonnance
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
            {[1, 2, 3].map(i => (
              <div key={i} className="placeholder" style={{ height: 68, borderRadius: 10 }} />
            ))}
          </div>
        ) : prescriptions.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="pill" size={36} style={{ opacity: .25, marginBottom: '.75rem' }} />
            <div style={{ fontWeight: 500 }}>Aucune ordonnance</div>
            <div className="text-xs" style={{ marginTop: '.25rem' }}>Les ordonnances apparaîtront ici</div>
          </div>
        ) : (
          <div className="data-list">
            {prescriptions.map(p => <PrescriptionRow key={p.id} p={p} />)}
          </div>
        )}
      </div>

      {showModal && <PrescriptionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

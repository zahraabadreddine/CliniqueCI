import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const CAT_LABELS = { general: 'Général', operation: 'Opération', anesthesia: 'Anesthésie', data: 'Données personnelles' };
const CAT_COLORS = { general: '#0d7a5f', operation: '#dc2626', anesthesia: '#d97706', data: '#2563eb' };

// Simple signature pad using canvas
function SignaturePad({ onSave, onClose }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    setDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1a2e1a';
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function stop() { setDrawing(false); }

  function clear() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function save() {
    const dataURL = canvasRef.current.toDataURL('image/png');
    onSave(dataURL);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0008', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440, maxWidth: '95vw' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2e1a', marginBottom: 4 }}>✍️ Signature électronique</h3>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Signez dans la zone ci-dessous avec le doigt ou la souris</p>
        <canvas
          ref={canvasRef}
          width={380}
          height={160}
          style={{ border: '2px solid #0d7a5f', borderRadius: 8, cursor: 'crosshair', display: 'block', touchAction: 'none', background: '#f9fafb', width: '100%' }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={clear} style={{ flex: 1, border: '1px solid #ddd', background: '#f9fafb', borderRadius: 8, padding: '10px', cursor: 'pointer' }}>🗑️ Effacer</button>
          <button onClick={onClose} style={{ flex: 1, border: '1px solid #ddd', background: '#f9fafb', borderRadius: 8, padding: '10px', cursor: 'pointer' }}>Annuler</button>
          <button onClick={save} disabled={!hasDrawn}
            style={{ flex: 2, background: hasDrawn ? '#0d7a5f' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 600, cursor: hasDrawn ? 'pointer' : 'not-allowed' }}>
            ✅ Valider la signature
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConsentPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('signatures'); // signatures | forms
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [showSignPad, setShowSignPad] = useState(null); // signature id
  const [formData, setFormData] = useState({ title: '', content: '', category: 'general' });
  const [sigData, setSigData] = useState({ patient_id: '', consent_form_id: '' });
  const [viewForm, setViewForm] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { data: forms = [] } = useQuery({
    queryKey: ['consent-forms'],
    queryFn: () => api.get('/consent/forms'),
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ['consent-sigs'],
    queryFn: () => api.get('/consent/signatures'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => api.get('/patients'),
  });

  const createFormMut = useMutation({
    mutationFn: (d) => api.post('/consent/forms', d),
    onSuccess: () => { qc.invalidateQueries(['consent-forms']); setShowFormModal(false); setFormData({ title: '', content: '', category: 'general' }); setSuccess('Formulaire créé'); setTimeout(() => setSuccess(''), 3000); },
    onError: (e) => setError(e.message),
  });

  const requestSigMut = useMutation({
    mutationFn: (d) => api.post('/consent/signatures', d),
    onSuccess: () => { qc.invalidateQueries(['consent-sigs']); setShowSigModal(false); setSigData({ patient_id: '', consent_form_id: '' }); setSuccess('Demande de signature créée'); setTimeout(() => setSuccess(''), 3000); },
    onError: (e) => setError(e.message),
  });

  const signMut = useMutation({
    mutationFn: ({ id, signature_data }) => api.patch(`/consent/signatures/${id}/sign`, { signature_data }),
    onSuccess: () => { qc.invalidateQueries(['consent-sigs']); setShowSignPad(null); setSuccess('Consentement signé avec succès'); setTimeout(() => setSuccess(''), 3000); },
    onError: (e) => setError(e.message),
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2e1a', margin: 0 }}>📝 Consentements numériques</h1>
          <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>Formulaires de consentement éclairé et signatures électroniques</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowSigModal(true)} style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>+ Demander signature</button>
          <button onClick={() => setShowFormModal(true)} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #ddd', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>+ Nouveau formulaire</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
        {[{ v: 'signatures', l: `✍️ Signatures (${signatures.length})` }, { v: 'forms', l: `📄 Formulaires (${forms.length})` }].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            style={{ border: 'none', background: 'none', padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.v ? 700 : 400, color: tab === t.v ? '#0d7a5f' : '#666', borderBottom: `2px solid ${tab === t.v ? '#0d7a5f' : 'transparent'}` }}>
            {t.l}
          </button>
        ))}
      </div>

      {success && <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#065f46', fontSize: 14 }}>{success}</div>}
      {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14 }}>{error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right' }}>✕</button></div>}

      {/* Signatures tab */}
      {tab === 'signatures' && (
        signatures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999', background: '#f9fafb', borderRadius: 12 }}>Aucune signature demandée</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {signatures.map(sig => (
              <div key={sig.id} style={{ background: '#fff', border: `1px solid ${sig.signed ? '#6ee7b7' : '#e5e7eb'}`, borderRadius: 10, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1a2e1a' }}>{sig.patient_name}</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{sig.form_title}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span style={{ background: `${CAT_COLORS[sig.form_category] || '#666'}18`, color: CAT_COLORS[sig.form_category] || '#666', borderRadius: 12, padding: '2px 10px', fontSize: 11 }}>{CAT_LABELS[sig.form_category]}</span>
                    <span style={{ background: sig.signed ? '#d1fae5' : '#f3f4f6', color: sig.signed ? '#065f46' : '#374151', borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                      {sig.signed ? `✅ Signé le ${new Date(sig.signed_at).toLocaleDateString('fr-FR')}` : '⏳ En attente'}
                    </span>
                  </div>
                </div>
                {!sig.signed && (
                  <button onClick={() => setShowSignPad(sig.id)}
                    style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                    ✍️ Signer
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Forms tab */}
      {tab === 'forms' && (
        forms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999', background: '#f9fafb', borderRadius: 12 }}>Aucun formulaire. Créez-en un pour commencer.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {forms.map(f => (
              <div key={f.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, cursor: 'pointer' }} onClick={() => setViewForm(f)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ background: `${CAT_COLORS[f.category]}18`, color: CAT_COLORS[f.category], borderRadius: 12, padding: '3px 12px', fontSize: 11, fontWeight: 600 }}>{CAT_LABELS[f.category]}</span>
                  {f.is_active && <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 12, padding: '3px 10px', fontSize: 11 }}>Actif</span>}
                </div>
                <div style={{ fontWeight: 600, color: '#1a2e1a', marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{new Date(f.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Signature pad */}
      {showSignPad && <SignaturePad onSave={(data) => signMut.mutate({ id: showSignPad, signature_data: data })} onClose={() => setShowSignPad(null)} />}

      {/* New form modal */}
      {showFormModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#0006', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowFormModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 540, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Nouveau formulaire de consentement</h2>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Titre *</label>
                <input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Catégorie</label>
                <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14 }}>
                  {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Contenu du formulaire *</label>
                <textarea value={formData.content} onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
                  rows={8} placeholder="Je soussigné(e)... consent à... Risques : ..."
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => setShowFormModal(false)} style={{ flex: 1, border: '1px solid #ddd', background: '#f9fafb', borderRadius: 8, padding: '11px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => createFormMut.mutate(formData)} disabled={createFormMut.isPending || !formData.title || !formData.content}
                style={{ flex: 2, background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 600, cursor: 'pointer' }}>
                Créer le formulaire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request signature modal */}
      {showSigModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#0006', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSigModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 420, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Demander une signature</h2>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Patient *</label>
                <select value={sigData.patient_id} onChange={e => setSigData(p => ({ ...p, patient_id: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14 }}>
                  <option value="">— Sélectionner —</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Formulaire de consentement *</label>
                <select value={sigData.consent_form_id} onChange={e => setSigData(p => ({ ...p, consent_form_id: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14 }}>
                  <option value="">— Sélectionner —</option>
                  {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => setShowSigModal(false)} style={{ flex: 1, border: '1px solid #ddd', background: '#f9fafb', borderRadius: 8, padding: '11px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => requestSigMut.mutate(sigData)} disabled={!sigData.patient_id || !sigData.consent_form_id}
                style={{ flex: 2, background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 600, cursor: 'pointer' }}>
                Créer la demande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View form modal */}
      {viewForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#0006', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setViewForm(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{viewForm.title}</h2>
              <button onClick={() => setViewForm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#666' }}>✕</button>
            </div>
            <span style={{ background: `${CAT_COLORS[viewForm.category]}18`, color: CAT_COLORS[viewForm.category], borderRadius: 12, padding: '3px 12px', fontSize: 12 }}>{CAT_LABELS[viewForm.category]}</span>
            <div style={{ marginTop: 20, fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: '#f9fafb', borderRadius: 8, padding: 16 }}>{viewForm.content}</div>
          </div>
        </div>
      )}
    </div>
  );
}

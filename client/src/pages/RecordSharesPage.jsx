import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

const STATUS_STYLE = {
  pending:  { bg: '#fef3c7', color: '#92400e', label: '⏳ En attente' },
  approved: { bg: '#d1fae5', color: '#065f46', label: '✅ Approuvé' },
  denied:   { bg: '#fee2e2', color: '#991b1b', label: '❌ Refusé' },
  expired:  { bg: '#f3f4f6', color: '#6b7280', label: '🕒 Expiré' },
};

export default function RecordSharesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('incoming');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showRecordsModal, setShowRecordsModal] = useState(null);
  const [requestForm, setRequestForm] = useState({ patient_consent_code: '', reason: '' });
  const [codePatientId, setCodePatientId] = useState('');
  const [generatedCode, setGeneratedCode] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { data: incoming = [] } = useQuery({
    queryKey: ['record-shares-incoming'],
    queryFn: () => api.get('/record-shares/incoming'),
  });

  const { data: outgoing = [] } = useQuery({
    queryKey: ['record-shares-outgoing'],
    queryFn: () => api.get('/record-shares/outgoing'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => api.get('/patients'),
  });

  const requestMut = useMutation({
    mutationFn: (d) => api.post('/record-shares', d),
    onSuccess: () => {
      qc.invalidateQueries(['record-shares-outgoing']);
      setShowRequestModal(false);
      setRequestForm({ patient_consent_code: '', reason: '' });
      setSuccess('Demande envoyée avec succès');
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (e) => setError(e.message),
  });

  const codeMut = useMutation({
    mutationFn: (pid) => api.post('/record-shares/consent-code', { patient_id: pid }),
    onSuccess: (data) => setGeneratedCode(data),
    onError: (e) => setError(e.message),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/record-shares/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries(['record-shares-incoming']);
      qc.invalidateQueries(['record-shares-outgoing']);
      setSuccess('Décision enregistrée');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e) => setError(e.message || e.error || 'Erreur'),
  });

  const { data: sharedRecords, isLoading: loadingRecords, error: recordsError } = useQuery({
    queryKey: ['shared-records', showRecordsModal],
    queryFn: () => api.get(`/record-shares/${showRecordsModal}/records`),
    enabled: !!showRecordsModal,
    retry: false,
  });

  const list = tab === 'incoming' ? incoming : outgoing;

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2e1a', margin: 0 }}>🏥 Dossiers inter-cliniques</h1>
          <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>Partage sécurisé de dossiers patients entre cliniques partenaires</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setShowCodeModal(true); setGeneratedCode(null); setCodePatientId(''); }}
            style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #ddd', borderRadius: 8, padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            🔑 Générer code patient
          </button>
          <button onClick={() => setShowRequestModal(true)}
            style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            + Demander un dossier
          </button>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#166534', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span>① La clinique A génère un <strong>code de consentement</strong> pour le patient</span>
          <span>→</span>
          <span>② Le patient donne ce code à la clinique B</span>
          <span>→</span>
          <span>③ La clinique B envoie une <strong>demande d'accès</strong> avec ce code</span>
          <span>→</span>
          <span>④ La clinique A <strong>approuve ou refuse</strong> la demande</span>
        </div>
      </div>

      {/* Alerts */}
      {success && <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#065f46', fontSize: 14 }}>{success}</div>}
      {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14 }}>{error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right' }}>✕</button></div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
        {[
          { v: 'incoming', l: `📥 Demandes reçues (${incoming.length})` },
          { v: 'outgoing', l: `📤 Demandes envoyées (${outgoing.length})` },
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            style={{ border: 'none', background: 'none', padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: tab === t.v ? 700 : 400, color: tab === t.v ? '#0d7a5f' : '#666', borderBottom: `2px solid ${tab === t.v ? '#0d7a5f' : 'transparent'}` }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999', background: '#f9fafb', borderRadius: 12 }}>
          {tab === 'incoming' ? 'Aucune demande reçue' : 'Aucune demande envoyée'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(req => {
            const st = STATUS_STYLE[req.status] || STATUS_STYLE.pending;
            return (
              <div key={req.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1a2e1a', marginBottom: 4 }}>
                      {tab === 'incoming'
                        ? `Demande de : ${req.requesting_org_name || 'Clinique partenaire'}`
                        : `Demandé à : ${req.source_org_name || 'Clinique source'}`}
                    </div>
                    <div style={{ fontSize: 13, color: '#666' }}>
                      Patient : <strong>{req.patient_name || '—'}</strong>
                    </div>
                    {req.reason && <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Motif : {req.reason}</div>}
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
                      Demande le {new Date(req.created_at).toLocaleDateString('fr-FR')}
                      {req.expires_at && ` · Expire le ${new Date(req.expires_at).toLocaleDateString('fr-FR')}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <span style={{ background: st.bg, color: st.color, borderRadius: 12, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    {tab === 'incoming' && req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => approveMut.mutate({ id: req.id, status: 'approved' })}
                          style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          ✅ Approuver
                        </button>
                        <button onClick={() => approveMut.mutate({ id: req.id, status: 'denied' })}
                          style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          ❌ Refuser
                        </button>
                      </div>
                    )}
                    {tab === 'incoming' && req.status === 'approved' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => approveMut.mutate({ id: req.id, status: 'approved' })}
                          title="Renouveler l'accès pour 7 jours supplémentaires"
                          style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          🔄 Renouveler (7j)
                        </button>
                        <button onClick={() => approveMut.mutate({ id: req.id, status: 'denied' })}
                          style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          ❌ Révoquer
                        </button>
                      </div>
                    )}
                    {tab === 'outgoing' && req.status === 'approved' && (
                      <button onClick={() => setShowRecordsModal(req.id)}
                        style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        📂 Voir le dossier
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate consent code modal */}
      {showCodeModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#0006', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCodeModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 420, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>🔑 Code de consentement patient</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Générez un code unique à donner au patient. Ce code est valable 48h et permet à une autre clinique d'accéder à son dossier avec son consentement.</p>
            {!generatedCode ? (
              <>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Patient *</label>
                  <select value={codePatientId} onChange={e => setCodePatientId(e.target.value)}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14 }}>
                    <option value="">— Sélectionner un patient —</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button onClick={() => setShowCodeModal(false)} style={{ flex: 1, border: '1px solid #ddd', background: '#f9fafb', borderRadius: 8, padding: '11px', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={() => codeMut.mutate(codePatientId)} disabled={!codePatientId || codeMut.isPending}
                    style={{ flex: 2, background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 600, cursor: 'pointer' }}>
                    Générer le code
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: '#f0fdf4', border: '2px dashed #0d7a5f', borderRadius: 12, padding: '24px 32px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#0d7a5f', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Code de consentement</div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#0d7a5f', letterSpacing: 8, fontFamily: 'monospace' }}>{generatedCode.consent_code}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 12 }}>Valable jusqu'au {new Date(generatedCode.expires_at).toLocaleString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Donnez ce code au patient. Il devra le communiquer à la clinique qui souhaite accéder à son dossier.</p>
                <button onClick={() => setShowCodeModal(false)} style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontWeight: 600, cursor: 'pointer' }}>Fermer</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New request modal */}
      {showRequestModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#0006', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowRequestModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 440, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>📤 Demander un dossier patient</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Le patient doit vous donner le code de consentement généré par sa clinique d'origine.</p>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Code de consentement patient *</label>
                <input value={requestForm.patient_consent_code} onChange={e => setRequestForm(p => ({ ...p, patient_consent_code: e.target.value.toUpperCase() }))}
                  placeholder="Ex: A3X9TZ"
                  maxLength={6}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 18, fontFamily: 'monospace', letterSpacing: 4, textAlign: 'center', boxSizing: 'border-box' }} />
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Code à 6 caractères fourni par le patient</div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Motif de la demande</label>
                <textarea value={requestForm.reason} onChange={e => setRequestForm(p => ({ ...p, reason: e.target.value }))}
                  rows={3} placeholder="Ex: Suivi post-opératoire, transfert de soin..."
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => setShowRequestModal(false)} style={{ flex: 1, border: '1px solid #ddd', background: '#f9fafb', borderRadius: 8, padding: '11px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => requestMut.mutate(requestForm)} disabled={requestForm.patient_consent_code.length < 6 || requestMut.isPending}
                style={{ flex: 2, background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 600, cursor: 'pointer' }}>
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared records modal */}
      {showRecordsModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowRecordsModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 640, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>📂 Dossier partagé</h2>
              <button onClick={() => setShowRecordsModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#666' }}>✕</button>
            </div>
            {loadingRecords ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chargement du dossier...</div>
            ) : sharedRecords ? (
              <div>
                {/* Patient info */}
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1a2e1a' }}>{sharedRecords.patient?.first_name} {sharedRecords.patient?.last_name}</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    {sharedRecords.patient?.date_of_birth && `Né(e) le ${new Date(sharedRecords.patient.date_of_birth).toLocaleDateString('fr-FR')} · `}
                    {sharedRecords.patient?.gender === 'M' ? 'Homme' : sharedRecords.patient?.gender === 'F' ? 'Femme' : ''}
                  </div>
                </div>
                {/* Consultations */}
                {sharedRecords.consultations?.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 10 }}>🩺 Consultations ({sharedRecords.consultations.length})</h3>
                    {sharedRecords.consultations.slice(0, 5).map(a => (
                      <div key={a.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 6, fontSize: 13 }}>
                        <strong>{new Date(a.created_at).toLocaleDateString('fr-FR')}</strong> — {a.diagnosis || a.chief_complaint || 'Consultation'}
                        <span style={{ float: 'right', color: '#888' }}>{a.examination ? '📋' : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Prescriptions */}
                {sharedRecords.prescriptions?.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 10 }}>💊 Ordonnances ({sharedRecords.prescriptions.length})</h3>
                    {sharedRecords.prescriptions.slice(0, 5).map(p => (
                      <div key={p.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 6, fontSize: 13 }}>
                        <strong>{new Date(p.created_at).toLocaleDateString('fr-FR')}</strong>
                        {p.notes && <div style={{ color: '#666', marginTop: 4 }}>{p.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {!sharedRecords.consultations?.length && !sharedRecords.prescriptions?.length && (
                  <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>Aucune donnée disponible dans ce dossier</div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#dc2626' }}>
                {recordsError?.error || recordsError?.message || 'Impossible de charger le dossier'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

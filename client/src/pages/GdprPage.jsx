import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function GdprPage() {
  const [patientId, setPatientId] = useState('');
  const [searchName, setSearchName] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [showAnonModal, setShowAnonModal] = useState(null); // patient object
  const [exportStatus, setExportStatus] = useState('');
  const [anonResult, setAnonResult] = useState('');
  const [error, setError] = useState('');

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => api.get('/patients'),
  });

  const filtered = patients.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    return !searchName || name.includes(searchName.toLowerCase());
  });

  async function handleExport(pid) {
    setExportStatus('');
    setError('');
    try {
      // Direct fetch for file download
      const res = await fetch(`/api/gdpr/export/${pid}`, { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur export');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match ? match[1] : `export_patient_${pid}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus('✅ Export téléchargé avec succès');
      setTimeout(() => setExportStatus(''), 4000);
    } catch (e) {
      setError(e.message);
    }
  }

  const anonMut = useMutation({
    mutationFn: ({ pid }) => api.post(`/gdpr/anonymize/${pid}`, { confirm: 'CONFIRMER_ANONYMISATION' }),
    onSuccess: (data) => {
      setShowAnonModal(null);
      setConfirmText('');
      setAnonResult(`✅ ${data.message || 'Patient anonymisé avec succès'}`);
      setTimeout(() => setAnonResult(''), 6000);
    },
    onError: (e) => { setError(e.message); },
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2e1a', margin: 0 }}>🔒 Sauvegarde & Export RGPD</h1>
        <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>Export des données patients et anonymisation conformes au RGPD</p>
      </div>

      {/* Info box */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12 }}>
        <span style={{ fontSize: 20 }}>ℹ️</span>
        <div style={{ fontSize: 13, color: '#1e40af' }}>
          <strong>Droits des patients (RGPD) :</strong> Tout patient peut demander une copie de ses données (droit d'accès) ou leur effacement (droit à l'oubli). L'anonymisation supprime les informations personnelles mais conserve la structure médicale à des fins statistiques.
        </div>
      </div>

      {/* Alerts */}
      {exportStatus && <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#065f46', fontSize: 14 }}>{exportStatus}</div>}
      {anonResult && <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#92400e', fontSize: 14 }}>{anonResult}</div>}
      {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14 }}>{error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right' }}>✕</button></div>}

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input value={searchName} onChange={e => setSearchName(e.target.value)}
          placeholder="🔍 Rechercher un patient..."
          style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 14px', fontSize: 14, boxSizing: 'border-box' }} />
      </div>

      {/* Patient list */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: '#f9fafb', padding: '12px 18px', borderBottom: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: '1fr 140px 80px 120px', gap: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Patient</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Téléphone</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Sexe</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Aucun patient trouvé</div>
        ) : (
          filtered.map((p, i) => (
            <div key={p.id} style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 140px 80px 120px', gap: 16, alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#1a2e1a' }}>{p.first_name} {p.last_name}</div>
                {p.date_of_birth && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{new Date(p.date_of_birth).toLocaleDateString('fr-FR')}</div>}
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>{p.phone || '—'}</div>
              <div style={{ fontSize: 13, color: '#555' }}>{p.gender === 'M' ? '♂ Homme' : p.gender === 'F' ? '♀ Femme' : '—'}</div>
              <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                <button onClick={() => handleExport(p.id)}
                  style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                  📥 Exporter
                </button>
                <button onClick={() => setShowAnonModal(p)}
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                  🗑️ Anonymiser
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Export info */}
      <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 18px', marginTop: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 8 }}>📦 Contenu de l'export JSON</h3>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#666', lineHeight: 1.8 }}>
          <li>Informations personnelles (nom, date de naissance, contact)</li>
          <li>Historique complet des rendez-vous</li>
          <li>Consultations et notes médicales</li>
          <li>Ordonnances et prescriptions</li>
          <li>Factures et paiements</li>
          <li>Consentements signés</li>
        </ul>
      </div>

      {/* Anonymize confirmation modal */}
      {showAnonModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAnonModal(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 480, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#fee2e2', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div style={{ fontSize: 13, color: '#991b1b' }}>
                <strong>Action irréversible.</strong> L'anonymisation de <strong>{showAnonModal.first_name} {showAnonModal.last_name}</strong> supprimera toutes les informations personnelles (nom, contacts, date de naissance). Les données médicales seront conservées de façon anonyme.
              </div>
            </div>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 12 }}>Pour confirmer, tapez exactement : <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>CONFIRMER_ANONYMISATION</code></p>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder="CONFIRMER_ANONYMISATION"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace' }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => { setShowAnonModal(null); setConfirmText(''); }} style={{ flex: 1, border: '1px solid #ddd', background: '#f9fafb', borderRadius: 8, padding: '11px', cursor: 'pointer' }}>Annuler</button>
              <button
                onClick={() => anonMut.mutate({ pid: showAnonModal.id })}
                disabled={confirmText !== 'CONFIRMER_ANONYMISATION' || anonMut.isPending}
                style={{ flex: 2, background: confirmText === 'CONFIRMER_ANONYMISATION' ? '#dc2626' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 600, cursor: confirmText === 'CONFIRMER_ANONYMISATION' ? 'pointer' : 'not-allowed' }}>
                {anonMut.isPending ? 'Anonymisation...' : '🗑️ Confirmer l\'anonymisation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { AuthContext } from '../App';

const STATUS_STYLE = {
  waiting:   { bg: '#f3f4f6', color: '#374151', label: '⏳ En attente' },
  called:    { bg: '#fef3c7', color: '#d97706', label: '📢 Appelé' },
  done:      { bg: '#d1fae5', color: '#065f46', label: '✅ Terminé' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: '❌ Annulé' },
};

export default function QueuePage() {
  const qc = useQueryClient();
  const { user } = useContext(AuthContext);
  const isDoctor = user?.role === 'doctor';
  const isSecretary = user?.role === 'secretary';
  const isAdmin = user?.role === 'admin';
  const canCall = isDoctor; // seul le médecin peut appeler
  const canAdd = isSecretary; // seule la secrétaire peut ajouter à la file
  const [patientName, setPatientName] = useState('');
  const [reason, setReason] = useState('');
  const [tickerPrint, setTickerPrint] = useState(null);

  const { data: queue, isLoading } = useQuery({
    queryKey: ['queue'],
    queryFn: () => api.get('/queue'),
    refetchInterval: 3_000, // refresh every 3s for near-real-time sync
  });

  const addMut = useMutation({
    mutationFn: (data) => api.post('/queue', data),
    onSuccess: (token) => {
      qc.invalidateQueries(['queue']);
      setPatientName('');
      setReason('');
      setTickerPrint(token);
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/queue/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries(['queue']),
  });

  const nextMut = useMutation({
    mutationFn: () => api.post('/queue/next', {}),
    onSuccess: () => qc.invalidateQueries(['queue']),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/queue/${id}`),
    onSuccess: () => qc.invalidateQueries(['queue']),
  });

  const tokens = queue?.tokens || [];
  const waiting = tokens.filter(t => t.status === 'waiting');
  const current = queue?.current;
  // Exclude the currently-called token from the list — it's already shown in the banner
  const listTokens = tokens.filter(t => t.status !== 'called');

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2e1a', margin: 0 }}>🎟️ File d'attente digitale</h1>
          <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#0d7a5f' }}>{waiting.length}</div>
          <div style={{ fontSize: 12, color: '#666' }}>en attente</div>
        </div>
      </div>

      {/* Current number being called */}
      {current && (
        <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '2px solid #d97706', borderRadius: 16, padding: '20px 28px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#92400e', fontWeight: 600, textTransform: 'uppercase' }}>Numéro appelé</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#d97706', lineHeight: 1 }}>#{current.number}</div>
            {current.patient_name && <div style={{ fontSize: 16, color: '#78350f', marginTop: 4 }}>{current.patient_name}</div>}
          </div>
          {canCall && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => statusMut.mutate({ id: current.id, status: 'done' })}
                disabled={statusMut.isPending}
                style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
                ✅ Consultation terminée
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        {/* Queue list */}
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          {/* Actions bar */}
          {canCall && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={() => nextMut.mutate()} disabled={nextMut.isPending || waiting.length === 0}
                style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: waiting.length ? 'pointer' : 'not-allowed', opacity: waiting.length ? 1 : 0.5 }}>
                📢 Appeler le suivant
              </button>
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Chargement...</div>
          ) : listTokens.length === 0 && !current ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999', background: '#f9fafb', borderRadius: 12 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <div>Aucun patient en attente aujourd'hui</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listTokens.map(token => {
                const st = STATUS_STYLE[token.status] || STATUS_STYLE.waiting;
                return (
                  <div key={token.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                      <div style={{ fontSize: 26, fontWeight: 900, color: token.status === 'done' ? '#9ca3af' : '#0d7a5f', minWidth: 50, flexShrink: 0 }}>#{token.number}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#1a2e1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.patient_name || 'Patient anonyme'}</div>
                        {token.reason && <div style={{ fontSize: 12, color: '#666', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.reason}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 12, padding: '3px 12px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{st.label}</span>
                      {token.status === 'waiting' && canCall && (
                        <button onClick={() => statusMut.mutate({ id: token.id, status: 'called' })}
                          disabled={statusMut.isPending}
                          style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #d97706', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          📢 Appeler
                        </button>
                      )}
                      {token.status === 'waiting' && (isSecretary || isAdmin) && (
                        <button onClick={() => statusMut.mutate({ id: token.id, status: 'cancelled' })}
                          disabled={statusMut.isPending}
                          style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 12 }}
                          title="Annuler">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add patient panel — secrétaire seulement */}
        <div style={{ flex: '0 0 300px', minWidth: 260 }}>
          {canAdd && <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a2e1a', marginBottom: 16 }}>➕ Ajouter à la file</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nom du patient</label>
                <input value={patientName} onChange={e => setPatientName(e.target.value)}
                  placeholder="Optionnel"
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Motif de visite</label>
                <input value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Ex: consultation, renouvellement..."
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <button onClick={() => addMut.mutate({ patient_name: patientName, reason })} disabled={addMut.isPending}
                style={{ background: '#0d7a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
                🎟️ Générer un ticket
              </button>
            </div>
          </div>}

          {/* Ticket printout */}
          {canAdd && tickerPrint && (
            <div style={{ marginTop: 16, background: '#f0fdf4', border: '2px dashed #0d7a5f', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#0d7a5f', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Ticket créé</div>
              <div style={{ fontSize: 60, fontWeight: 900, color: '#0d7a5f', margin: '8px 0' }}>#{tickerPrint.number}</div>
              <div style={{ fontSize: 14, color: '#374151' }}>{tickerPrint.patient_name || 'Patient anonyme'}</div>
              {tickerPrint.reason && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{tickerPrint.reason}</div>}
              <button onClick={() => setTickerPrint(null)} style={{ marginTop: 14, background: 'none', border: '1px solid #0d7a5f', color: '#0d7a5f', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}>Fermer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

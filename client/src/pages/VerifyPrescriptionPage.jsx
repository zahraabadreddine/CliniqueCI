import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function VerifyPrescriptionPage() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | valid | invalid
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    fetch(`/api/prescriptions/verify/${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.valid && json.prescription) {
          setData(json.prescription);
          setState('valid');
        } else {
          setState('invalid');
        }
      })
      .catch(() => setState('invalid'));
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 36, width: 480, maxWidth: '100%', boxShadow: '0 4px 24px #0001' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0d7a5f' }}>🏥 CliniqueCI</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Vérification d'ordonnance médicale</div>
        </div>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div style={{ color: '#666' }}>Vérification en cours...</div>
          </div>
        )}

        {state === 'invalid' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#fee2e2', borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>❌</div>
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 18 }}>Ordonnance invalide</div>
              <div style={{ color: '#dc2626', fontSize: 13, marginTop: 6 }}>Ce QR code ne correspond à aucune ordonnance valide dans notre système.</div>
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>Si vous pensez qu'il s'agit d'une erreur, contactez la clinique émettrice.</div>
          </div>
        )}

        {state === 'valid' && data && (
          <div>
            <div style={{ background: '#d1fae5', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 28 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, color: '#065f46', fontSize: 16 }}>Ordonnance authentique</div>
                <div style={{ fontSize: 13, color: '#047857' }}>Document vérifié par CliniqueCI</div>
              </div>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 12, fontWeight: 600 }}>Informations patient</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#999' }}>Patient</div>
                  <div style={{ fontWeight: 600, color: '#1a2e1a' }}>{data.patient_first_name} {data.patient_last_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#999' }}>Date</div>
                  <div style={{ fontWeight: 600, color: '#1a2e1a' }}>{new Date(data.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
                {data.doctor_name && (
                  <div>
                    <div style={{ fontSize: 11, color: '#999' }}>Prescripteur</div>
                    <div style={{ fontWeight: 600, color: '#1a2e1a' }}>Dr {data.doctor_name}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Medications */}
            {Array.isArray(data.medications) && data.medications.length > 0 && (
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 12, fontWeight: 600 }}>Médicaments prescrits</div>
                {data.medications.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < data.medications.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                      {m.dosage && <div style={{ fontSize: 12, color: '#666' }}>{m.dosage}</div>}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>
                      {m.frequency && <div>{m.frequency}</div>}
                      {m.duration && <div>{m.duration}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, fontSize: 11, color: '#bbb', textAlign: 'center' }}>
              Vérifié via le système CliniqueCI · {new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

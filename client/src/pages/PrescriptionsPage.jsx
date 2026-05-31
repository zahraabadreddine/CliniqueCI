import { useState, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

// ── Avatar ────────────────────────────────────────────────────────────────────
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

// ── Impression ────────────────────────────────────────────────────────────────
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
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; border-bottom: 2px solid #22a05e; padding-bottom: 16px; }
    .clinic { font-size: 18px; font-weight: 700; color: #22a05e; }
    .clinic-sub { font-size: 11px; color: #666; margin-top: 4px; }
    .title { font-size: 22px; font-weight: 700; color: #22a05e; margin-bottom: 20px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 28px; }
    .meta-item label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #888; display: block; margin-bottom: 2px; }
    .meta-item span { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #e2f8ec; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #22a05e; border-bottom: 1px solid #a3e8c3; }
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
    ${p.doctor_first_name ? `<div class="meta-item"><label>Médecin</label><span>Dr ${p.doctor_first_name} ${p.doctor_last_name}</span></div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Médicament</th>
        <th>Dosage</th>
        <th>Instructions</th>
        <th>Durée</th>
      </tr>
    </thead>
    <tbody>
      ${meds.map(m => `<tr>
        <td><strong>${m.name}</strong></td>
        <td>${m.dosage || '—'}</td>
        <td>${m.instructions || m.frequency || '—'}</td>
        <td>${m.duration || '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  ${p.notes ? `<div class="notes-box"><strong>Notes du médecin</strong>${p.notes}</div>` : ''}

  <div class="footer">
    <div class="sig-line">Signature et cachet du médecin</div>
    <div style="text-align:right">
      ${p.qr_token ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`${window.location.origin}/verify/rx/${p.qr_token}`)}" style="width:80px;height:80px" alt="QR" /><div style="font-size:10px;color:#aaa;margin-top:4px">Vérifier l'authenticité</div>` : ''}
      <div style="font-size:11px;color:#aaa;margin-top:4px">Document généré par CliniqueCI</div>
    </div>
  </div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

// ── Modal détail ordonnance ───────────────────────────────────────────────────
function RxViewModal({ p, onClose }) {
  const meds = Array.isArray(p.medications) ? p.medications : [];
  const date = p.created_at
    ? new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal rx-doc" style={{ maxWidth: 560 }}>
        {/* En-tête clinique */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>CliniqueCI</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Clinique privée — Abidjan, Côte d'Ivoire</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{date}</div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--green)', marginBottom: '1rem' }}>
          Ordonnance médicale
        </div>

        {/* Méta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem .75rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>Patient</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.patient_first_name} {p.patient_last_name}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>Date</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{date}</div>
          </div>
          {(p.doctor_first_name) && (
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>Médecin</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Dr {p.doctor_first_name} {p.doctor_last_name}</div>
            </div>
          )}
        </div>

        {/* Médicaments */}
        <div style={{ marginBottom: '1rem' }}>
          {meds.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: '.4rem', padding: '0 .65rem', marginBottom: '.35rem',
            }}>
              {['Médicament', 'Dosage', 'Instructions', 'Durée'].map(h => (
                <div key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>{h}</div>
              ))}
            </div>
          )}
          {meds.map((m, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: '.4rem', padding: '.55rem .65rem', borderRadius: 8,
              background: i % 2 === 0 ? 'var(--cream)' : 'transparent',
              fontSize: 13,
            }}>
              <div style={{ fontWeight: 600 }}>{m.name}</div>
              <div style={{ color: 'var(--ink-soft)' }}>{m.dosage || '—'}</div>
              <div style={{ color: 'var(--ink-soft)' }}>{m.instructions || m.frequency || '—'}</div>
              <div style={{ color: 'var(--muted)' }}>{m.duration || '—'}</div>
            </div>
          ))}
          {meds.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Aucun médicament</div>
          )}
        </div>

        {p.notes && (
          <div style={{
            background: 'var(--cream)', borderRadius: 8, padding: '.65rem .75rem',
            fontSize: 12, color: 'var(--ink-soft)', marginBottom: '1rem',
          }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: '.25rem' }}>Notes</div>
            {p.notes}
          </div>
        )}

        {/* QR Code de vérification */}
        {p.qr_token && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            background: 'var(--cream)', borderRadius: 10, padding: '.75rem 1rem',
            marginBottom: '1rem', border: '1px solid var(--border)',
          }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`${window.location.origin}/verify/rx/${p.qr_token}`)}`}
              alt="QR Code vérification"
              style={{ width: 80, height: 80, borderRadius: 6, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: '.3rem' }}>Vérification QR</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Scannez ce code pour vérifier l'authenticité de cette ordonnance.</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: '.25rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                Token : {p.qr_token.slice(0, 8)}…
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: '.5rem',
          marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)',
        }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Fermer</button>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => printPrescription(p)}>
              <Icon name="print" size={13} /> Imprimer
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => printPrescription(p)}>
              <Icon name="download" size={13} /> PDF
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                const phone = p.patient_phone || '';
                if (phone) {
                  window.open(`sms:${phone}?body=Bonjour, votre ordonnance CliniqueCI est disponible.`);
                } else {
                  alert('Numéro de téléphone patient non disponible.');
                }
              }}
            >
              <Icon name="message" size={13} /> SMS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PrescriptionsPage() {
  const { user } = useContext(AuthContext);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [viewing, setViewing] = useState(null);

  const { data: prescriptions = [], isLoading, isError } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => api.get('/prescriptions'),
  });

  // Mois disponibles pour le filtre
  const availableMonths = useMemo(() => {
    const seen = new Set();
    prescriptions.forEach(p => {
      if (p.created_at) {
        const d = new Date(p.created_at);
        seen.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    return [...seen].sort().reverse();
  }, [prescriptions]);

  // Filtrage
  const filtered = useMemo(() => {
    let list = prescriptions;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        `${p.patient_first_name} ${p.patient_last_name}`.toLowerCase().includes(q) ||
        (Array.isArray(p.medications) && p.medications.some(m => m.name?.toLowerCase().includes(q)))
      );
    }
    if (filterMonth) {
      list = list.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === filterMonth;
      });
    }
    return list;
  }, [prescriptions, search, filterMonth]);

  return (
    <div className="page-content">
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1>Ordonnances</h1>
          <div className="subtitle">
            {isLoading
              ? '…'
              : `${filtered.length} ordonnance${filtered.length !== 1 ? 's' : ''}${filtered.length !== prescriptions.length ? ` sur ${prescriptions.length}` : ''}`
            }
          </div>
        </div>
      </div>

      {/* Bannière info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '.65rem',
        padding: '.65rem 1rem', marginBottom: '1.25rem',
        background: 'var(--green-paler)', border: '1px solid var(--green-pale)',
        borderRadius: 10, fontSize: 13, color: 'var(--green)',
      }}>
        <Icon name="info" size={15} style={{ flexShrink: 0 }} />
        <span>
          Les ordonnances sont générées automatiquement lors de la clôture d'une consultation depuis l'<strong>Agenda</strong>.
        </span>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Icon name="search" size={14} style={{
            position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--muted)', pointerEvents: 'none',
          }} />
          <input
            className="input"
            style={{ paddingLeft: '2.2rem' }}
            placeholder="Rechercher par patient ou médicament…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ flex: '0 0 180px' }}
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        >
          <option value="">Tous les mois</option>
          {availableMonths.map(m => {
            const [y, mo] = m.split('-');
            const label = new Date(Number(y), Number(mo) - 1, 1)
              .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            return (
              <option key={m} value={m} style={{ textTransform: 'capitalize' }}>
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </option>
            );
          })}
        </select>
        {(search || filterMonth) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(''); setFilterMonth(''); }}
          >
            <Icon name="close" size={13} /> Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--red)' }}>
            <Icon name="warning" size={24} style={{ marginBottom: '.5rem' }} />
            <div>Erreur lors du chargement</div>
          </div>
        ) : isLoading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="placeholder" style={{ height: 48, borderRadius: 10 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="pill" size={36} style={{ opacity: .25, marginBottom: '.75rem', display: 'block', margin: '0 auto .75rem' }} />
            <div style={{ fontWeight: 500 }}>
              {prescriptions.length === 0
                ? 'Aucune ordonnance pour le moment'
                : 'Aucun résultat pour ce filtre'}
            </div>
            <div className="text-xs" style={{ marginTop: '.35rem' }}>
              {prescriptions.length === 0
                ? 'Les ordonnances seront créées lors des consultations'
                : 'Essayez d\'élargir la recherche'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="simple" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  {user?.role !== 'doctor' && <th>Médecin</th>}
                  <th>Médicaments</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const meds = Array.isArray(p.medications) ? p.medications : [];
                  const medsLabel = meds.map(m => m.name).filter(Boolean).join(' · ') || '—';
                  const date = p.created_at
                    ? new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—';
                  return (
                    <tr key={p.id}>
                      <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>{date}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                          <AvatarSm firstName={p.patient_first_name} lastName={p.patient_last_name} />
                          <span style={{ fontWeight: 500, fontSize: 13 }}>
                            {p.patient_first_name} {p.patient_last_name}
                          </span>
                        </div>
                      </td>
                      {user?.role !== 'doctor' && (
                        <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                          {p.doctor_first_name ? `Dr ${p.doctor_first_name} ${p.doctor_last_name}` : '—'}
                        </td>
                      )}
                      <td style={{ fontSize: 12.5, color: 'var(--ink-soft)', maxWidth: 260 }}>
                        <span style={{
                          display: '-webkit-box', WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {medsLabel}
                        </span>
                        {meds.length > 1 && (
                          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: '.35rem' }}>
                            ({meds.length} médic.)
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.4rem' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 12 }}
                            onClick={() => printPrescription(p)}
                            title="Imprimer"
                          >
                            <Icon name="print" size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 12 }}
                            onClick={() => setViewing(p)}
                          >
                            Voir <Icon name="chevronRight" size={13} />
                          </button>
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

      {viewing && <RxViewModal p={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

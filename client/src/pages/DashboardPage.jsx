import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

/* ─── Utilitaires ───────────────────────────────────────────────────────────── */
function formatFcfa(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)} k`;
  return v.toLocaleString('fr-FR');
}

function buildMonthlyData(rows = []) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d   = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const row = rows.find(r => r.month === key);
    return {
      month: key,
      label: d.toLocaleDateString('fr-FR', { month: 'short' }),
      revenue: Number(row?.revenue ?? 0),
      count:   Number(row?.count   ?? 0),
      isCurrent: i === 5,
    };
  });
}

/* ─── KPI card ──────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, delta, deltaDir = 'up', bg = 'var(--green-pale)', color = 'var(--green)', loading }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 16,
      padding: '1.1rem 1.2rem',
      border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: '.6rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: bg, display: 'grid', placeItems: 'center', color,
        }}>
          <Icon name={icon} size={18} />
        </div>
        {delta && !loading && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '.2rem .5rem',
            borderRadius: 20,
            background: deltaDir === 'down' ? 'var(--red-soft)' : 'var(--green-pale)',
            color:      deltaDir === 'down' ? 'var(--red)'      : 'var(--green)',
          }}>
            {deltaDir === 'down' ? '↓' : '↑'} {delta}
          </span>
        )}
      </div>
      <div>
        {loading
          ? <div className="placeholder" style={{ height: 28, width: 80, borderRadius: 6 }} />
          : <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
        }
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Badge statut RDV ──────────────────────────────────────────────────────── */
const STATUS_CFG = {
  confirmed:  { cls: 'green', label: 'Confirmé'       },
  pending:    { cls: 'gold',  label: 'En attente'      },
  waiting:    { cls: 'blue',  label: 'En salle'        },
  'in-room':  { cls: 'blue',  label: 'En consultation' },
  completed:  { cls: 'muted', label: 'Terminé'         },
  cancelled:  { cls: 'red',   label: 'Annulé'          },
};
function Badge({ status }) {
  const m = STATUS_CFG[status] || { cls: 'muted', label: status };
  return (
    <span className={`badge ${m.cls}`} style={{ fontSize: 11 }}>
      <span className="dot-mark" />{m.label}
    </span>
  );
}

/* ─── Ligne patient dans la file ────────────────────────────────────────────── */
function PatientRow({ appt, index }) {
  const time = appt.scheduled_at
    ? new Date(appt.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '—';
  const initials = (appt.patient_first_name?.[0] ?? '') + (appt.patient_last_name?.[0] ?? '');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '.85rem',
      padding: '.75rem .9rem',
      borderRadius: 12,
      background: index % 2 === 0 ? 'transparent' : 'rgba(34,160,94,.025)',
      transition: 'background .15s',
    }}>
      {/* Numéro */}
      <div style={{
        width: 22, fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        textAlign: 'right', flexShrink: 0,
      }}>
        {String(index + 1).padStart(2, '0')}
      </div>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'var(--green-pale)', display: 'grid', placeItems: 'center',
        fontWeight: 700, fontSize: 13, color: 'var(--green)',
      }}>
        {initials || '?'}
      </div>
      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {appt.patient_first_name} {appt.patient_last_name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
          {appt.reason || 'Consultation générale'}
        </div>
      </div>
      {/* Heure */}
      <div style={{
        fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)',
        background: 'var(--cream-2)', borderRadius: 8,
        padding: '.2rem .55rem', flexShrink: 0,
      }}>
        {time}
      </div>
      {/* Statut */}
      <Badge status={appt.status} />
    </div>
  );
}

/* ─── Mini graphique revenus ────────────────────────────────────────────────── */
function MiniRevenueChart({ data, loading }) {
  if (loading) return <div className="placeholder" style={{ height: 80, borderRadius: 8 }} />;
  const maxV = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80 }}>
      {data.map(d => {
        const h = d.revenue > 0 ? Math.max((d.revenue / maxV) * 60, 5) : 3;
        return (
          <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: '100%', height: h,
              background: d.isCurrent ? 'var(--green)' : d.revenue > 0 ? 'var(--green-pale)' : 'var(--cream-2)',
              borderRadius: '4px 4px 0 0',
            }} />
            <div style={{ fontSize: 9.5, color: d.isCurrent ? 'var(--green)' : 'var(--muted)', fontWeight: d.isCurrent ? 700 : 400, textTransform: 'capitalize' }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tuile action rapide ───────────────────────────────────────────────────── */
function ActionTile({ icon, label, sub, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, borderRadius: 14, padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '.55rem',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        transition: 'transform .12s, box-shadow .12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,.65)', display: 'grid', placeItems: 'center', color,
      }}>
        <Icon name={icon} size={17} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   ════════════════════════════════════════════════════════════════════════════ */
function AdminDashboard({ user, appointments, patients, teamMembers, loading }) {
  const navigate = useNavigate();
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const isOpen = hour >= 7 && hour < 18;

  const pending   = appointments.filter(a => a.status === 'pending').length;
  const inRoom    = appointments.filter(a => ['waiting', 'in-room'].includes(a.status)).length;
  const done      = appointments.filter(a => a.status === 'completed').length;
  const teamCount = teamMembers.filter(u => ['doctor', 'secretary'].includes(u.role)).length;
  const newMonth  = patients.filter(p => new Date(p.created_at) >= new Date(now.getFullYear(), now.getMonth(), 1)).length;

  return (
    <div className="page-content">

      {/* ── Bannière header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #22a05e 0%, #156b3d 60%, #1a8a4e 100%)',
        borderRadius: 20, padding: '1.5rem 1.75rem',
        marginBottom: '1.75rem', position: 'relative', overflow: 'hidden',
        color: '#fff',
      }}>
        {/* Déco */}
        <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:80, bottom:-40, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <div style={{ fontSize: 13, opacity: .75, marginBottom: '.3rem' }}>
              Clinique du Plateau · Administration
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
              {greet}, {user?.first_name} 👋
            </div>
            <div style={{ fontSize: 13, opacity: .75, marginTop: '.4rem', textTransform: 'capitalize' }}>
              {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.5rem',
            background: 'rgba(255,255,255,.15)', borderRadius: 30,
            padding: '.4rem .9rem', fontSize: 12, fontWeight: 600,
            alignSelf: 'flex-start',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOpen ? '#4ade80' : '#f87171', display: 'inline-block' }} />
            {isOpen ? 'Clinique ouverte' : 'Clinique fermée'}
          </div>
        </div>

        {/* Chiffres rapides inline */}
        <div style={{
          display: 'flex', gap: '1.5rem', marginTop: '1.1rem',
          flexWrap: 'wrap',
        }}>
          {[
            { n: appointments.length, label: 'RDV ce jour' },
            { n: pending,             label: 'En attente'  },
            { n: inRoom,              label: 'En salle'    },
            { n: done,                label: 'Terminés'    },
          ].map(({ n, label }) => (
            <div key={label} style={{ display: 'flex', gap: '.4rem', alignItems: 'baseline' }}>
              <span style={{ fontSize: 20, fontWeight: 800 }}>{n}</span>
              <span style={{ fontSize: 12, opacity: .7 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        <StatCard icon="calendar"   label="Rendez-vous aujourd'hui" value={appointments.length} loading={loading.appts}   bg="var(--green-pale)"   color="var(--green)" />
        <StatCard icon="users"      label="Patients enregistrés"    value={patients.length}     loading={loading.patients} bg="#e2f8ec"             color="#22a05e"      delta={newMonth > 0 ? `+${newMonth} ce mois` : null} />
        <StatCard icon="clock"      label="En salle / En cours"     value={inRoom}              loading={loading.appts}   bg="var(--gold-soft)"    color="var(--gold)"  />
        <StatCard icon="shield"     label="Membres de l'équipe"     value={teamCount}           loading={loading.team}    bg="#fef3d3"             color="#b8860b"      />
      </div>

      {/* ── Contenu principal ── */}
      <div className="grid-main-side">

        {/* Colonne gauche : file d'attente */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>File de consultation</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Patients programmés ce jour</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/appointments')}>
                Gérer <Icon name="chevronRight" size={13} />
              </button>
            </div>

            {loading.appts ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                {[1,2,3,4].map(i => <div key={i} className="placeholder" style={{ height: 52, borderRadius: 10 }} />)}
              </div>
            ) : appointments.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🗓</div>
                <div className="empty-state-title">Aucune consultation ce jour</div>
                <div className="empty-state-desc">Le planning est vide pour aujourd'hui</div>
              </div>
            ) : (
              <div>
                {appointments.slice(0, 8).map((a, i) => <PatientRow key={a.id} appt={a} index={i} />)}
                {appointments.length > 8 && (
                  <div style={{ textAlign: 'center', padding: '.65rem', fontSize: 12, color: 'var(--muted)' }}>
                    +{appointments.length - 8} autres consultations ·{' '}
                    <button style={{ color: 'var(--green)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }} onClick={() => navigate('/appointments')}>
                      Voir tout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bilan statuts */}
          {appointments.length > 0 && (
            <div className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: '.75rem' }}>Bilan du jour</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem' }}>
                {Object.entries(STATUS_CFG).map(([key, cfg]) => {
                  const n = appointments.filter(a => a.status === key).length;
                  if (!n) return null;
                  return (
                    <span key={key} className={`badge ${cfg.cls}`}>
                      <span className="dot-mark" />{n} {cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Actions rapides */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: '1rem' }}>
              Navigation rapide
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
              <ActionTile icon="calendar"   label="Agenda"       sub="Planifier les RDV"      color="var(--green)" bg="var(--green-pale)"  onClick={() => navigate('/appointments')} />
              <ActionTile icon="users"      label="Patients"     sub="Dossiers médicaux"       color="#22a05e"      bg="#e2f8ec"            onClick={() => navigate('/patients')}     />
              <ActionTile icon="invoice"    label="Facturation"  sub="Paiements & reçus"       color="var(--gold)"  bg="var(--gold-soft)"   onClick={() => navigate('/invoices')}     />
              <ActionTile icon="shield"     label="Équipe"       sub={`${teamCount} membres`}  color="#b8860b"      bg="#fef3d3"            onClick={() => navigate('/users')}        />
            </div>
          </div>

          {/* Awa AI */}
          <div style={{
            borderRadius: 16, padding: '1.1rem 1.2rem',
            background: 'linear-gradient(135deg, #e2f8ec 0%, #f5f3ff 100%)',
            border: '1px solid var(--green-pale)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '.75rem' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg,#2ec472,#22a05e)',
                display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0,
              }}>
                <Icon name="sparkles" size={15} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>Assistant Awa</div>
                <div style={{ fontSize: 11, color: 'var(--green)' }}>Intelligence clinique</div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.65, margin: 0 }}>
              {appointments.length > 0
                ? `${appointments.length} consultation${appointments.length > 1 ? 's' : ''} planifiée${appointments.length > 1 ? 's' : ''} ce jour${pending > 0 ? `, dont ${pending} en attente de validation` : ''}. Tout se déroule dans les temps.`
                : `Journée sans consultation planifiée. C'est le bon moment pour analyser les performances de la semaine.`
              }
            </p>
          </div>

          {/* Nouveaux patients */}
          <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.65rem' }}>
              <Icon name="users" size={14} style={{ color: 'var(--green)' }} />
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>Patientèle</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                  {patients.length}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>patients au total</div>
              </div>
              {newMonth > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>+{newMonth}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>ce mois</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   DOCTOR / SECRETARY DASHBOARD
   ════════════════════════════════════════════════════════════════════════════ */
function StaffDashboard({ user, appointments, patients, revenueStats, loading, isDoctor }) {
  const navigate = useNavigate();
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const waiting   = appointments.filter(a => ['pending', 'waiting'].includes(a.status)).length;
  const confirmed = appointments.filter(a => a.status === 'confirmed').length;
  const inRoom    = appointments.filter(a => a.status === 'in-room').length;

  const monthlyData  = buildMonthlyData(revenueStats?.monthly ?? []);
  const currentKey   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevKey      = (() => { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const thisMonthRev = monthlyData.find(m => m.month === currentKey)?.revenue ?? 0;
  const lastMonthRev = monthlyData.find(m => m.month === prevKey)?.revenue ?? 0;
  const pendingRev   = revenueStats?.pending ?? { count: 0, amount: 0 };

  // Prochain patient en attente
  const nextPatient = appointments
    .filter(a => ['pending', 'confirmed', 'waiting'].includes(a.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];

  const done    = appointments.filter(a => a.status === 'completed').length;
  const isOpen  = hour >= 7 && hour < 18;

  return (
    <div className="page-content">

      {/* ── Bannière header ── */}
      <div style={{
        background: isDoctor
          ? 'linear-gradient(135deg, #22a05e 0%, #156b3d 60%, #1a8a4e 100%)'
          : 'linear-gradient(135deg, #22a05e 0%, #2ec472 60%, #6ed8a1 100%)',
        borderRadius: 20, padding: '1.5rem 1.75rem',
        marginBottom: '1.75rem', position: 'relative', overflow: 'hidden',
        color: '#fff',
      }}>
        {/* Déco */}
        <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:80, bottom:-40, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <div style={{ fontSize: 13, opacity: .75, marginBottom: '.3rem' }}>
              Clinique du Plateau · {isDoctor ? 'Médecin' : 'Secrétariat'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
              {greet}, {isDoctor ? 'Dr.' : ''} {user?.first_name} 👋
            </div>
            <div style={{ fontSize: 13, opacity: .75, marginTop: '.4rem', textTransform: 'capitalize' }}>
              {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.6rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '.5rem',
              background: 'rgba(255,255,255,.15)', borderRadius: 30,
              padding: '.4rem .9rem', fontSize: 12, fontWeight: 600,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOpen ? '#4ade80' : '#f87171', display: 'inline-block' }} />
              {isOpen ? 'Clinique ouverte' : 'Clinique fermée'}
            </div>
            <button
              style={{
                background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.3)',
                color: '#fff', borderRadius: 10, padding: '.45rem .9rem',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '.4rem',
              }}
              onClick={() => navigate(isDoctor ? '/consultations' : '/new-appointment')}
            >
              <Icon name="plus" size={14} />
              {isDoctor ? 'Nouvelle consultation' : 'Nouveau rendez-vous'}
            </button>
          </div>
        </div>

        {/* Chiffres rapides inline */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
          {[
            { n: appointments.length, label: isDoctor ? 'Patients ce jour' : 'RDV ce jour' },
            { n: waiting + inRoom,    label: 'En attente / Salle' },
            { n: confirmed,           label: 'Confirmés'          },
            { n: done,                label: 'Terminés'           },
          ].map(({ n, label }) => (
            <div key={label} style={{ display: 'flex', gap: '.4rem', alignItems: 'baseline' }}>
              <span style={{ fontSize: 20, fontWeight: 800 }}>{n}</span>
              <span style={{ fontSize: 12, opacity: .7 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        <StatCard icon="calendar"     label="Consultations ce jour"  value={appointments.length} loading={loading.appts}   bg="var(--green-pale)"  color="var(--green)" />
        <StatCard icon="clock"        label="En attente / En salle"  value={waiting + inRoom}    loading={loading.appts}   bg="var(--gold-soft)"   color="var(--gold)"  />
        <StatCard icon="check"        label="Confirmés"              value={confirmed}           loading={loading.appts}   bg="#e2f8ec"            color="#22a05e"      />
        <StatCard icon="users"        label="Total patients"         value={patients.length}     loading={loading.patients} bg="#fef3d3"            color="#b8860b"      />
      </div>

      {/* ── KPIs revenus médecin ── */}
      {isDoctor && (
        <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
          <StatCard icon="invoice"  label="Revenus ce mois"         value={`${formatFcfa(thisMonthRev)} FCFA`}  loading={loading.stats} bg="var(--green-pale)"  color="var(--green)" />
          <StatCard icon="invoice"  label="Mois précédent"          value={`${formatFcfa(lastMonthRev)} FCFA`}  loading={loading.stats} bg="var(--cream-2)"     color="var(--muted)" />
          <StatCard icon="stethoscope" label="Consultations ce mois" value={monthlyData.find(m => m.month === currentKey)?.count ?? 0} loading={loading.stats} bg="#e2f8ec" color="#22a05e" />
          <StatCard icon="clock"    label="Factures à encaisser"    value={pendingRev.count}    loading={loading.stats} bg="var(--gold-soft)"   color="var(--gold)"  />
        </div>
      )}

      {/* ── Corps principal ── */}
      <div className="grid-main-side">

        {/* Gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Prochain patient (si dispo) */}
          {nextPatient && (
            <div style={{
              background: isDoctor
                ? 'linear-gradient(135deg, #22a05e 0%, #156b3d 100%)'
                : 'linear-gradient(135deg, #22a05e 0%, #2ec472 100%)',
              borderRadius: 16, padding: '1.1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem', color: '#fff',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                background: 'rgba(255,255,255,.18)', display: 'grid', placeItems: 'center',
                fontWeight: 700, fontSize: 15,
              }}>
                {(nextPatient.patient_first_name?.[0] ?? '') + (nextPatient.patient_last_name?.[0] ?? '')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
                  {isDoctor ? 'Prochain patient' : 'Prochain rendez-vous'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {nextPatient.patient_first_name} {nextPatient.patient_last_name}
                </div>
                <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>
                  {nextPatient.reason || 'Consultation générale'} · {nextPatient.scheduled_at
                    ? new Date(nextPatient.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </div>
              </div>
              <Badge status={nextPatient.status} />
            </div>
          )}

          {/* Liste RDV */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Programme du jour</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {appointments.length > 0 ? `${appointments.length} patient${appointments.length > 1 ? 's' : ''} attendu${appointments.length > 1 ? 's' : ''}` : 'Aucune consultation planifiée'}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/appointments')}>
                Tout voir <Icon name="chevronRight" size={13} />
              </button>
            </div>

            {loading.appts ? (
              [1,2,3].map(i => <div key={i} className="placeholder" style={{ height: 52, borderRadius: 10, marginBottom: 8 }} />)
            ) : appointments.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: 32, opacity: .3, marginBottom: '.5rem' }}>🗓</div>
                <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>Journée libre</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Aucune consultation prévue ce jour</div>
              </div>
            ) : (
              appointments.slice(0, 6).map((a, i) => <PatientRow key={a.id} appt={a} index={i} />)
            )}
          </div>

          {/* Revenus médecin */}
          {isDoctor && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Évolution des revenus</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>6 derniers mois · factures encaissées</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)' }}>
                    {formatFcfa(monthlyData.reduce((s, m) => s + m.revenue, 0))} FCFA
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>cumul 6 mois</div>
                </div>
              </div>
              <MiniRevenueChart data={monthlyData} loading={loading.stats} />
              {pendingRev.amount > 0 && (
                <div style={{
                  marginTop: '.85rem', padding: '.6rem .85rem',
                  background: 'var(--gold-soft)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5,
                }}>
                  <span style={{ color: 'var(--ink-soft)' }}><strong>{pendingRev.count}</strong> facture{pendingRev.count > 1 ? 's' : ''} à encaisser</span>
                  <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{formatFcfa(pendingRev.amount)} FCFA</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Actions rapides */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: '1rem' }}>Accès direct</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
              <ActionTile icon="users"       label="Patients"       sub="Dossiers"              color="var(--green)" bg="var(--green-pale)" onClick={() => navigate('/patients')}      />
              <ActionTile icon="calendar"    label="Agenda"         sub="Planning"              color="#22a05e"      bg="#e2f8ec"           onClick={() => navigate('/appointments')}  />
              {isDoctor && <ActionTile icon="stethoscope" label="Consultations" sub="Notes & RX" color="var(--gold)"  bg="var(--gold-soft)"  onClick={() => navigate('/consultations')} />}
              {!isDoctor && <ActionTile icon="invoice"   label="Facturation"   sub="Paiements"  color="var(--gold)"  bg="var(--gold-soft)"  onClick={() => navigate('/invoices')}      />}
              <ActionTile icon="calendar-plus" label="Nouveau RDV"  sub="Programmer"            color="#b8860b"      bg="#fef3d3"           onClick={() => navigate(isDoctor ? '/appointments' : '/new-appointment')} />
            </div>
          </div>

          {/* Assistant Awa */}
          <div style={{
            borderRadius: 16, padding: '1.1rem 1.2rem',
            background: 'linear-gradient(135deg, #e2f8ec 0%, #f5f3ff 100%)',
            border: '1px solid var(--green-pale)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '.75rem' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg,#2ec472,#22a05e)',
                display: 'grid', placeItems: 'center', color: '#fff',
              }}>
                <Icon name="sparkles" size={15} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>Assistant Awa</div>
                <div style={{ fontSize: 11, color: 'var(--green)' }}>IA médicale · disponible</div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.65, margin: 0 }}>
              {isDoctor
                ? appointments.length > 0
                  ? `${appointments.length} patient${appointments.length > 1 ? 's' : ''} à voir aujourd'hui. Voulez-vous que je prépare un résumé des dossiers ?`
                  : `Aucun patient prévu. Je peux analyser vos statistiques ou vous aider à rédiger des notes.`
                : waiting > 0
                  ? `${waiting} patient${waiting > 1 ? 's' : ''} en attente de traitement. Je peux vous aider à optimiser le flux de la journée.`
                  : `Planning calme pour l'instant. Je reste disponible pour toute question.`
              }
            </p>
          </div>

          {/* Stat rapide patients */}
          <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 4 }}>
                  Base patients
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                  {patients.length}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>dossiers actifs</div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'flex-end' }}
                onClick={() => navigate('/patients')}
              >
                Voir tout <Icon name="chevronRight" size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   PATIENT DASHBOARD  (fallback — ils sont redirigés vers /patient)
   ════════════════════════════════════════════════════════════════════════════ */
function PatientDashboard({ user, history, loading }) {
  const navigate = useNavigate();
  const now  = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const upcoming = (history?.appointments || [])
    .filter(a => !['cancelled','completed'].includes(a.status) && new Date(a.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const nextRDV  = upcoming[0];
  const lastRx   = history?.prescriptions?.[0];
  const meds     = lastRx ? (typeof lastRx.medications === 'string' ? JSON.parse(lastRx.medications) : lastRx.medications) : [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>{greet}, {user?.first_name} 👋</h1>
          <div className="subtitle" style={{ textTransform: 'capitalize' }}>
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid-main-side">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Prochain RDV */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Prochain rendez-vous</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-appointments')}>
                Tout voir <Icon name="chevronRight" size={13} />
              </button>
            </div>
            {loading ? (
              <div className="placeholder" style={{ height: 68, borderRadius: 10 }} />
            ) : !nextRDV ? (
              <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
                <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🗓</div>
                <div className="empty-state-title" style={{ fontSize: '.95rem' }}>Aucun rendez-vous à venir</div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/my-appointments')}>
                  Prendre un rendez-vous
                </button>
              </div>
            ) : (() => {
              const d = new Date(nextRDV.scheduled_at);
              return (
                <div style={{ display: 'flex', gap: '.85rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 48, textAlign: 'center', background: 'var(--green-pale)', borderRadius: 12, padding: '.5rem .4rem', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase' }}>
                      {d.toLocaleDateString('fr-FR', { month: 'short' })}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', lineHeight: 1 }}>{d.getDate()}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', textTransform: 'capitalize' }}>
                      {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 3 }}>
                      <Icon name="clock" size={11} style={{ marginRight: 3 }} />
                      {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{nextRDV.doctor_first_name && `Dr. ${nextRDV.doctor_first_name} ${nextRDV.doctor_last_name}`}
                    </div>
                  </div>
                  <Badge status={nextRDV.status} />
                </div>
              );
            })()}
          </div>

          {/* Dernière ordonnance */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Dernière ordonnance</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-records', { state: { tab: 'ordonnances' } })}>
                Tout voir <Icon name="chevronRight" size={13} />
              </button>
            </div>
            {loading ? (
              <div className="placeholder" style={{ height: 80, borderRadius: 10 }} />
            ) : !lastRx ? (
              <div className="empty-state" style={{ padding: '1.25rem 1rem' }}>
                <div className="empty-state-icon" style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="pill" size={20} style={{ opacity: .55 }} />
                </div>
                <div className="empty-state-desc">Aucune ordonnance enregistrée</div>
              </div>
            ) : (
              <div>
                <div className="text-xs text-muted" style={{ marginBottom: '.6rem' }}>
                  {new Date(lastRx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                {meds.slice(0, 2).map((m, i) => (
                  <div key={i} style={{ display: 'flex', gap: '.5rem', alignItems: 'baseline', marginBottom: '.3rem' }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', background: 'var(--green-pale)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: 'var(--green)', flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</span>
                    <span className="text-xs text-muted">— {m.dosage}</span>
                  </div>
                ))}
                {meds.length > 2 && <div className="text-xs text-muted" style={{ marginTop: '.3rem' }}>+{meds.length - 2} autre{meds.length - 2 > 1 ? 's' : ''}</div>}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Awa */}
          <div style={{
            borderRadius: 16, padding: '1.1rem 1.2rem',
            background: 'linear-gradient(135deg, #e2f8ec 0%, #f5f3ff 100%)',
            border: '1px solid var(--green-pale)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', marginBottom: '.75rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#2ec472,#22a05e)', display: 'grid', placeItems: 'center', color: '#fff' }}>
                <Icon name="sparkles" size={15} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>Assistant Awa</div>
                <div style={{ fontSize: 11, color: 'var(--green)' }}>À votre service</div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.65, margin: 0 }}>
              Je peux vous aider à prendre un rendez-vous, consulter vos ordonnances ou répondre à vos questions.
            </p>
          </div>

          {/* Mon espace */}
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Mon espace santé</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
              {[
                { to: '/my-appointments', icon: 'calendar', label: 'Mes rendez-vous',  sub: 'Prendre ou consulter'         },
                { to: '/my-records',      icon: 'file',     label: 'Mon dossier',      sub: 'Consultations & historique'   },
                { to: '/my-records',      icon: 'pill',     label: 'Mes ordonnances',  sub: 'Prescriptions actives',  state: { tab: 'ordonnances' } },
                { to: '/my-records',      icon: 'invoice',  label: 'Mes factures',     sub: 'Historique des paiements', state: { tab: 'factures' } },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => navigate(s.to, s.state ? { state: s.state } : undefined)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '.75rem',
                    padding: '.65rem .75rem', borderRadius: 10, textAlign: 'left',
                    background: 'var(--cream)', border: 'none', cursor: 'pointer', width: '100%',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--green-paler)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--green-pale)', display: 'grid', placeItems: 'center', color: 'var(--green)', flexShrink: 0 }}>
                    <Icon name={s.icon} size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.sub}</div>
                  </div>
                  <Icon name="chevronRight" size={13} style={{ color: 'var(--muted-light)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ENTRÉE PRINCIPALE
   ════════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useContext(AuthContext);
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();

  const isAdmin     = user?.role === 'admin';
  const isDoctor    = user?.role === 'doctor';
  const isSecretary = user?.role === 'secretary';
  const isStaff     = isAdmin || isDoctor || isSecretary;

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['appointments', today],
    queryFn: () => api.get(`/appointments?date=${today}`),
    enabled: isStaff,
  });
  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients'),
    enabled: isStaff,
  });
  const { data: teamMembers = [], isLoading: loadingTeam } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/users'),
    enabled: isAdmin,
  });
  const { data: revenueStats, isLoading: loadingStats } = useQuery({
    queryKey: ['my-revenue-stats'],
    queryFn: () => api.get('/invoices/my-stats'),
    enabled: isDoctor,
  });
  const { data: myHistory, isLoading: loadingMyHistory } = useQuery({
    queryKey: ['my-records'],
    queryFn: () => api.get('/patients/me/history'),
    enabled: !isStaff,
    retry: false,
  });

  if (isAdmin) {
    return (
      <AdminDashboard
        user={user}
        appointments={appointments}
        patients={patients}
        teamMembers={teamMembers}
        loading={{ appts: loadingAppts, patients: loadingPatients, team: loadingTeam }}
      />
    );
  }

  if (isStaff) {
    return (
      <StaffDashboard
        user={user}
        appointments={appointments}
        patients={patients}
        revenueStats={revenueStats}
        loading={{ appts: loadingAppts, patients: loadingPatients, stats: loadingStats }}
        isDoctor={isDoctor}
      />
    );
  }

  return (
    <PatientDashboard
      user={user}
      history={myHistory}
      loading={loadingMyHistory}
    />
  );
}

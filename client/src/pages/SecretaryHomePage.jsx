import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const STATUS_LABEL = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  waiting: 'Arrivé',
  'in-room': 'En consultation',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const STATUS_CLS = {
  pending: 'gold',
  confirmed: 'green',
  waiting: 'blue',
  'in-room': 'blue',
  completed: 'muted',
  cancelled: 'red',
};

function StatusBadge({ status }) {
  const cls = STATUS_CLS[status] || 'muted';
  const label = STATUS_LABEL[status] || status;
  return (
    <span className={`badge ${cls}`}>
      <span className="dot-mark" />
      {label}
    </span>
  );
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function patientInitials(a) {
  return ((a.patient_first_name?.[0] ?? '') + (a.patient_last_name?.[0] ?? '')).toUpperCase() || '?';
}

const AVATAR_COLORS = ['#22a05e', '#c8a84b', '#2f6bd6', '#156b3d', '#db2777', '#ea580c'];
function avatarColor(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ── StatCard ── */
function StatCard({ icon, label, value, delta, deltaDir = 'up', bg = 'var(--green-pale)', color = 'var(--green)', loading }) {
  return (
    <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
        <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={15} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
        {loading ? <span style={{ fontSize: '1rem', color: 'var(--muted)' }}>…</span> : value}
      </div>
      {delta !== undefined && (
        <div style={{ marginTop: '.35rem', fontSize: '.75rem', color: deltaDir === 'up' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
          {deltaDir === 'up' ? '▲' : '▼'} {delta}
        </div>
      )}
    </div>
  );
}

/* ── ActionTile ── */
function ActionTile({ icon, label, sub, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1.5px solid var(--border)',
        borderRadius: 14, padding: '.9rem .85rem',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: '.35rem', textAlign: 'left', cursor: 'pointer',
        transition: 'border-color .15s, transform .12s, box-shadow .15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 6px 20px ${color}22`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={17} color={color} />
      </div>
      <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--ink)', lineHeight: 1.2 }}>{label}</div>
      {sub && <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{sub}</div>}
    </button>
  );
}

export default function SecretaryHomePage() {
  const { user } = useContext(AuthContext);
  const now    = new Date();
  const today  = now.toISOString().slice(0, 10);
  const hour   = now.getHours();
  const greet  = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const isOpen = hour >= 7 && hour < 18;

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [changingId, setChangingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', today],
    queryFn: () => api.get(`/appointments?date=${today}`),
  });

  const { data: followUpRequests = [] } = useQuery({
    queryKey: ['follow-up-requests'],
    queryFn: async () => {
      const all = await api.get('/appointments?status=pending');
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      return all.filter(a => new Date(a.scheduled_at) > endOfToday);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/status`, { status }),
    onMutate: ({ id }) => setChangingId(id),
    onSuccess: (updated) => {
      setErrorMsg('');
      setChangingId(null);
      queryClient.setQueryData(['appointments', today], (old) =>
        Array.isArray(old) ? old.map(a => a.id === updated.id ? { ...a, status: updated.status } : a) : old
      );
      queryClient.invalidateQueries({ queryKey: ['follow-up-requests'] });
    },
    onError: (err) => {
      setChangingId(null);
      setErrorMsg(err?.error || 'Erreur lors de la mise à jour');
    },
  });

  const total     = appointments.length;
  const arrived   = appointments.filter(a => ['waiting', 'in-room'].includes(a.status)).length;
  const expected  = appointments.filter(a => ['confirmed', 'pending'].includes(a.status)).length;
  const cancelled = appointments.filter(a => a.status === 'cancelled').length;
  const completed = appointments.filter(a => a.status === 'completed').length;

  const queue = appointments
    .filter(a => ['waiting', 'in-room', 'confirmed', 'pending'].includes(a.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const upcomingExpected = appointments
    .filter(a => ['confirmed', 'pending'].includes(a.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 5);

  const todayLong = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="page-content" style={{ maxWidth: 1200 }}>

      {/* ── Hero banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #22a05e 0%, #2ec472 55%, #6ed8a1 100%)',
        borderRadius: 20, padding: '1.5rem 1.75rem',
        marginBottom: '1.75rem', position: 'relative', overflow: 'hidden',
        color: '#fff',
      }}>
        {/* Décors */}
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 80, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Texte gauche */}
          <div>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.3rem' }}>
              Espace secrétariat
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {greet}, {user?.first_name || 'Secrétaire'} 👋
            </h1>
            <p style={{ margin: '.35rem 0 0', fontSize: '.875rem', color: 'rgba(255,255,255,.72)', textTransform: 'capitalize' }}>
              {todayLong}
            </p>
          </div>

          {/* Badge ouvert/fermé */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.45rem',
            background: isOpen ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.1)',
            borderRadius: 30, padding: '.45rem .9rem',
            fontSize: '.8rem', fontWeight: 600, color: '#fff', flexShrink: 0,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOpen ? '#4ade80' : '#fbbf24', display: 'inline-block' }} />
            {isOpen ? 'Accueil ouvert' : 'Hors horaires'}
          </div>
        </div>

        {/* Mini stats dans le banner */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total RDV', value: isLoading ? '…' : total },
            { label: 'En file', value: isLoading ? '…' : queue.length },
            { label: 'Arrivés', value: isLoading ? '…' : arrived },
            { label: 'Terminés', value: isLoading ? '…' : completed },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: '.1rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>{s.value}</span>
              <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── StatCards ── */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <StatCard icon="calendar" label="Total aujourd'hui" value={isLoading ? '…' : total}     bg="var(--green-pale)"  color="var(--green)"  loading={isLoading} />
        <StatCard icon="check"    label="Arrivés"           value={isLoading ? '…' : arrived}   bg="var(--green-pale)"  color="var(--green)"  loading={isLoading} />
        <StatCard icon="clock"    label="Attendus"          value={isLoading ? '…' : expected}  bg="var(--gold-soft)"   color="var(--gold)"   loading={isLoading} />
        <StatCard icon="close"    label="Annulés"           value={isLoading ? '…' : cancelled} bg="var(--red-soft)"    color="var(--red)"    loading={isLoading} />
      </div>

      {errorMsg && (
        <div className="badge red" style={{ marginBottom: '1rem', display: 'inline-flex', gap: '.4rem', padding: '.5rem .75rem' }}>
          <Icon name="warning" size={15} /> {errorMsg}
        </div>
      )}

      {/* ── Demandes de suivi ── */}
      {followUpRequests.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.25rem' }}>
          <div style={{
            padding: '.85rem 1.25rem', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <Icon name="calendar" size={16} style={{ color: 'var(--gold)' }} />
              Demandes de suivi à confirmer
              <span style={{ background: 'var(--gold)', color: '#fff', borderRadius: 20, fontSize: '.72rem', padding: '1px 8px', fontWeight: 700 }}>
                {followUpRequests.length}
              </span>
            </div>
            <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
              RDV futurs suggérés par les médecins — à confirmer ou annuler
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {followUpRequests.map((appt, idx) => {
              const initials = patientInitials(appt);
              const bg = avatarColor(`${appt.patient_first_name}${appt.patient_last_name}`);
              const isPending = changingId === appt.id;
              const dateStr = new Date(appt.scheduled_at).toLocaleDateString('fr-FR', {
                weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
              });
              return (
                <div key={appt.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '.85rem 1.25rem',
                  borderBottom: idx < followUpRequests.length - 1 ? '1px solid var(--border)' : 'none',
                  background: 'var(--green-paler)',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: bg, color: '#fff', display: 'grid',
                    placeItems: 'center', fontWeight: 700, fontSize: '.85rem', flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.95rem' }}>
                      {appt.patient_first_name} {appt.patient_last_name}
                    </div>
                    <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.1rem' }}>
                      {dateStr} · Dr. {appt.doctor_last_name}
                      {appt.reason && ` · ${appt.reason}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                    <button
                      className="btn"
                      style={{ fontSize: '.78rem', padding: '.3rem .7rem', background: 'var(--green-pale)', color: 'var(--green)', border: '1px solid var(--green)' }}
                      disabled={isPending}
                      onClick={() => statusMutation.mutate({ id: appt.id, status: 'confirmed' })}
                    >
                      {isPending ? '…' : 'Confirmer ✓'}
                    </button>
                    <button
                      className="btn"
                      style={{ fontSize: '.78rem', padding: '.3rem .7rem', background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red-border)' }}
                      disabled={isPending}
                      onClick={() => statusMutation.mutate({ id: appt.id, status: 'cancelled' })}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main: queue + sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem', alignItems: 'start' }}>

        {/* File d'attente */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <Icon name="users" size={16} style={{ color: 'var(--green)' }} />
              File d'attente du jour
              {queue.length > 0 && (
                <span style={{ background: 'var(--green)', color: '#fff', borderRadius: 20, fontSize: '.72rem', padding: '1px 8px', fontWeight: 700 }}>
                  {queue.length}
                </span>
              )}
            </div>
            <button className="btn" style={{ fontSize: '.8rem', padding: '.35rem .85rem' }} onClick={() => navigate('/new-appointment')}>
              <Icon name="plus" size={14} /> Nouveau RDV
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Chargement…</div>
          ) : queue.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted)' }}>
              <Icon name="calendar" size={32} />
              <div style={{ marginTop: '.5rem', fontWeight: 500 }}>Aucun patient en attente</div>
              <div style={{ fontSize: '.85rem', marginTop: '.25rem' }}>La file d'attente est vide pour aujourd'hui.</div>
            </div>
          ) : (
            <div>
              {queue.map((appt, idx) => {
                const initials = patientInitials(appt);
                const bg = avatarColor(`${appt.patient_first_name}${appt.patient_last_name}`);
                const isPending = changingId === appt.id;
                return (
                  <div key={appt.id} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '.85rem 1.25rem',
                    borderBottom: idx < queue.length - 1 ? '1px solid var(--border)' : 'none',
                    background: appt.status === 'in-room' ? 'var(--green-paler)' : 'transparent',
                    transition: 'background .15s',
                  }}>
                    {/* Position */}
                    <div style={{ width: 24, textAlign: 'center', color: 'var(--muted)', fontSize: '.8rem', fontWeight: 600, flexShrink: 0 }}>
                      {idx + 1}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: bg, color: '#fff', display: 'grid',
                      placeItems: 'center', fontWeight: 700, fontSize: '.85rem', flexShrink: 0,
                    }}>
                      {initials}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '.95rem' }}>
                        {appt.patient_first_name} {appt.patient_last_name}
                      </div>
                      <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.1rem' }}>
                        {formatTime(appt.scheduled_at)} · Dr. {appt.doctor_last_name}
                        {appt.reason && ` · ${appt.reason}`}
                      </div>
                    </div>

                    {/* Badge statut */}
                    <StatusBadge status={appt.status} />

                    {/* Boutons d'action */}
                    <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                      {(appt.status === 'confirmed' || appt.status === 'pending') && (
                        <button
                          className="btn"
                          style={{ fontSize: '.78rem', padding: '.3rem .7rem', background: 'var(--green-pale)', color: 'var(--green)', border: '1px solid var(--green)' }}
                          disabled={isPending}
                          onClick={() => statusMutation.mutate({ id: appt.id, status: 'waiting' })}
                        >
                          {isPending ? '…' : 'Arrivé ✓'}
                        </button>
                      )}
                      {appt.status === 'in-room' && (
                        <span style={{
                          fontSize: '.75rem', padding: '.3rem .65rem',
                          background: 'var(--green-paler)', color: 'var(--green)',
                          border: '1px solid var(--green)', borderRadius: '6px',
                          fontWeight: 600,
                        }}>
                          En consultation
                        </span>
                      )}
                      {['confirmed', 'pending', 'waiting'].includes(appt.status) && (
                        <button
                          className="btn"
                          style={{ fontSize: '.78rem', padding: '.3rem .7rem', background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red-border)' }}
                          disabled={isPending}
                          onClick={() => statusMutation.mutate({ id: appt.id, status: 'cancelled' })}
                        >
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Accès direct */}
          <div className="card" style={{ padding: '1rem 1rem .85rem' }}>
            <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--ink)', marginBottom: '.75rem' }}>
              Accès direct
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.55rem' }}>
              <ActionTile icon="calendar"  label="Agenda"     sub="Planning"  color="var(--green)" bg="var(--green-pale)" onClick={() => navigate('/appointments')}     />
              <ActionTile icon="users"     label="Patients"   sub="Dossiers"  color="#22a05e"      bg="#e2f8ec"           onClick={() => navigate('/patients')}         />
              <ActionTile icon="invoice"   label="Facturation" sub="Caisse"   color="var(--gold)"  bg="var(--gold-soft)"  onClick={() => navigate('/invoices')}         />
              <ActionTile icon="plus"      label="Nouveau RDV" sub="Créer"    color="#b8860b"      bg="#fef3d3"           onClick={() => navigate('/new-appointment')}  />
            </div>
          </div>

          {/* Prochaines arrivées */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '.85rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--ink)', fontSize: '.9rem' }}>
              Prochaines arrivées attendues
            </div>
            {upcomingExpected.length === 0 ? (
              <div style={{ padding: '1rem', color: 'var(--muted)', fontSize: '.85rem', textAlign: 'center' }}>
                Aucune arrivée attendue
              </div>
            ) : (
              <div>
                {upcomingExpected.map((appt, idx) => (
                  <div key={appt.id} style={{
                    display: 'flex', alignItems: 'center', gap: '.6rem',
                    padding: '.65rem 1rem',
                    borderBottom: idx < upcomingExpected.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: avatarColor(`${appt.patient_first_name}${appt.patient_last_name}`),
                      color: '#fff', display: 'grid', placeItems: 'center',
                      fontSize: '.75rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {patientInitials(appt)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {appt.patient_first_name} {appt.patient_last_name}
                      </div>
                      <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                        {formatTime(appt.scheduled_at)}
                      </div>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Awa AI */}
          <div style={{
            borderRadius: 12, padding: '1rem',
            background: 'linear-gradient(135deg, #e2f8ec 0%, #f5f3ff 100%)',
            border: '1px solid var(--green-pale)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #2ec472, #22a05e)',
                display: 'grid', placeItems: 'center', color: '#fff',
              }}>
                <Icon name="sparkles" size={13} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '.875rem', color: 'var(--green)' }}>Awa AI</span>
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--ink-soft)', lineHeight: 1.55 }}>
              {total === 0
                ? "Aucun rendez-vous prévu aujourd'hui. C'est le moment de faire le point sur les dossiers en attente."
                : `${expected} patient${expected > 1 ? 's' : ''} attendu${expected > 1 ? 's' : ''} aujourd'hui. ${arrived > 0 ? `${arrived} déjà arrivé${arrived > 1 ? 's' : ''}.` : "Personne n'est encore arrivé."}`}
            </div>
          </div>

          {/* Résumé */}
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontWeight: 600, fontSize: '.875rem', color: 'var(--ink)', marginBottom: '.75rem' }}>
              Résumé du jour
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {[
                { label: 'Total RDV',             value: total,     color: 'var(--ink)'   },
                { label: 'Arrivés / En salle',    value: arrived,   color: 'var(--green)' },
                { label: "En attente d'arrivée",  value: expected,  color: 'var(--gold)'  },
                { label: 'Terminés',              value: completed, color: 'var(--muted)' },
                { label: 'Annulés',               value: cancelled, color: 'var(--red)'   },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.85rem' }}>
                  <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

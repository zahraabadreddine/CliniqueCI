import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

function KPI({ label, value, delta, deltaDir = 'up', loading }) {
  return (
    <div className="kpi">
      <div className="kpi-accent" />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{loading ? '…' : value}</div>
      {delta && (
        <div className={`kpi-delta ${deltaDir === 'down' ? 'down' : ''}`}>
          <span>{deltaDir === 'down' ? '↓' : '↑'}</span>
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}

function ApptStatusBadge({ status }) {
  const map = {
    confirmed: { cls: 'green', label: 'Confirmé' },
    pending: { cls: 'gold', label: 'En attente' },
    'in-room': { cls: 'blue', label: 'En consultation' },
    completed: { cls: 'muted', label: 'Terminé' },
    cancelled: { cls: 'red', label: 'Annulé' },
  };
  const m = map[status] || { cls: 'muted', label: status };
  return (
    <span className={`badge ${m.cls}`}>
      <span className="dot-mark" />
      {m.label}
    </span>
  );
}

function WaitingRow({ appt }) {
  const time = appt.scheduled_at
    ? new Date(appt.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '—';
  return (
    <div className="data-row" style={{ alignItems: 'center' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'var(--green-pale)',
        display: 'grid', placeItems: 'center',
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600, fontSize: 13,
        color: 'var(--green)',
        flexShrink: 0,
      }}>
        {(appt.patient_first_name?.[0] ?? '') + (appt.patient_last_name?.[0] ?? '')}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>
          {appt.patient_first_name} {appt.patient_last_name}
        </div>
        <div className="text-xs text-muted">
          {appt.reason || 'Consultation générale'} · {time}
        </div>
      </div>
      <ApptStatusBadge status={appt.status} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const dateLong = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const isStaff = user?.role !== 'patient';

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['appointments', today],
    queryFn: () => api.get(`/appointments?date=${today}`),
    enabled: isStaff,
  });

  const { data: myHistory, isLoading: loadingMyHistory } = useQuery({
    queryKey: ['my-records'],
    queryFn: () => api.get('/patients/me/history'),
    enabled: !isStaff,
    retry: false,
  });

  const { data: yesterdayAppts = [], isLoading: loadingYesterday } = useQuery({
    queryKey: ['appointments-yesterday', yesterdayStr],
    queryFn: () => api.get(`/appointments?date=${yesterdayStr}`),
    enabled: isStaff,
  });

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients'),
    enabled: isStaff,
  });

  const todayCount = appointments.length;
  const waitingCount = appointments.filter(a => a.status === 'pending' || a.status === 'waiting').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const patientCount = patients.length;

  // Compute real KPI deltas
  const apptDiff = todayCount - yesterdayAppts.length;
  const apptDelta = loadingYesterday ? null
    : apptDiff > 0 ? `+${apptDiff} vs hier`
    : apptDiff < 0 ? `${apptDiff} vs hier`
    : null;
  const apptDeltaDir = apptDiff >= 0 ? 'up' : 'down';

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = patients.filter(p => new Date(p.created_at) >= thisMonthStart).length;
  const patientDelta = !loadingPatients && newThisMonth > 0 ? `+${newThisMonth} ce mois` : null;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>
            Bonjour, {user?.first_name}&nbsp;
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>👋</span>
          </h1>
          <div className="subtitle" style={{ textTransform: 'capitalize' }}>{dateLong}</div>
        </div>
        {isStaff && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => navigate('/appointments')}>
              <Icon name="plus" size={16} />
              Nouveau rendez-vous
            </button>
          </div>
        )}
      </div>

      {isStaff && (
        <div className="grid-4" style={{ marginBottom: '2rem' }}>
          <KPI label="Rendez-vous aujourd'hui" value={todayCount} delta={apptDelta} deltaDir={apptDeltaDir} loading={loadingAppts} />
          <KPI label="En salle d'attente" value={waitingCount} loading={loadingAppts} />
          <KPI label="Confirmés" value={confirmedCount} loading={loadingAppts} />
          <KPI label="Total patients" value={patientCount} delta={patientDelta} deltaDir="up" loading={loadingPatients} />
        </div>
      )}

      {/* ── STAFF view ── */}
      {isStaff && (
        <div className="grid-main-side">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Rendez-vous du jour</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/appointments')}>
                  Voir tout <Icon name="chevronRight" size={14} />
                </button>
              </div>

              {loadingAppts ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="placeholder" style={{ height: 52, borderRadius: 10 }} />
                  ))}
                </div>
              ) : appointments.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
                  <Icon name="calendar" size={32} style={{ opacity: .3, marginBottom: '.5rem' }} />
                  <div>Aucun rendez-vous aujourd'hui</div>
                </div>
              ) : (
                <div className="data-list">
                  {appointments.slice(0, 6).map(a => <WaitingRow key={a.id} appt={a} />)}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{
              background: 'linear-gradient(135deg, var(--green-paler) 0%, #fff 100%)',
              border: '1px solid var(--green-pale)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', marginBottom: '.85rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg,#12a07c,#0d7a5f)',
                  display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0,
                }}>
                  <Icon name="sparkles" size={15} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Awa AI</div>
                  <div style={{ fontSize: 12, color: 'var(--green)' }}>Prête à vous aider</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                {user?.role === 'doctor'
                  ? `Vous avez ${todayCount} rendez-vous aujourd'hui. Voulez-vous que je prépare un résumé des dossiers patients ?`
                  : `${waitingCount} patient(s) en attente. Je peux vous aider à optimiser le planning.`
                }
              </p>
            </div>

            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Accès rapide</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {[
                  { to: '/patients', icon: 'users', label: 'Dossiers patients', sub: 'Rechercher et gérer' },
                  { to: '/appointments', icon: 'calendar', label: 'Agenda', sub: 'Planifier les consultations' },
                  { to: '/consultations', icon: 'stethoscope', label: 'Consultations', sub: 'Notes et prescriptions', roles: ['doctor', 'admin'] },
                  { to: '/invoices', icon: 'invoice', label: 'Facturation', sub: 'Paiements et reçus', roles: ['secretary', 'admin'] },
                ].filter(s => !s.roles || s.roles.includes(user?.role)).map(s => (
                  <button
                    key={s.to}
                    onClick={() => navigate(s.to)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '.75rem',
                      padding: '.65rem .75rem', borderRadius: 10, textAlign: 'left',
                      background: 'var(--cream)', border: 'none', cursor: 'pointer',
                      transition: 'background .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--green-paler)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: 'var(--green-pale)', display: 'grid', placeItems: 'center',
                      color: 'var(--green)', flexShrink: 0,
                    }}>
                      <Icon name={s.icon} size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.sub}</div>
                    </div>
                    <Icon name="chevronRight" size={14} style={{ marginLeft: 'auto', color: 'var(--muted-light)' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PATIENT view ── */}
      {!isStaff && (
        <div className="grid-main-side">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* prochain RDV */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Prochain rendez-vous</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-appointments')}>
                  Voir tout <Icon name="chevronRight" size={14} />
                </button>
              </div>

              {loadingMyHistory ? (
                <div className="placeholder" style={{ height: 68, borderRadius: 10 }} />
              ) : (() => {
                const upcoming = (myHistory?.appointments || [])
                  .filter(a => a.status !== 'cancelled' && a.status !== 'completed' && new Date(a.scheduled_at) >= new Date())
                  .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
                const next = upcoming[0];
                if (!next) {
                  return (
                    <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
                      <Icon name="calendar" size={28} style={{ opacity: .25, marginBottom: '.5rem', display: 'block', margin: '0 auto .5rem' }} />
                      <div style={{ fontSize: 14 }}>Aucun rendez-vous à venir</div>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: '.85rem' }}
                        onClick={() => navigate('/my-appointments')}
                      >
                        Prendre un rendez-vous
                      </button>
                    </div>
                  );
                }
                const d = new Date(next.scheduled_at);
                const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
                const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.85rem' }}>
                    <div style={{
                      minWidth: 48, textAlign: 'center', background: 'var(--green-pale)',
                      borderRadius: 12, padding: '.5rem .4rem', flexShrink: 0,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase' }}>
                        {d.toLocaleDateString('fr-FR', { month: 'short' })}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)', lineHeight: 1 }}>
                        {d.getDate()}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--ink)', textTransform: 'capitalize' }}>
                        {dateStr}
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 3 }}>
                        <Icon name="clock" size={11} style={{ marginRight: 3 }} />
                        {timeStr} · Dr {next.doctor_first_name} {next.doctor_last_name}
                      </div>
                      {next.reason && (
                        <div className="text-xs text-muted" style={{ marginTop: 2, fontStyle: 'italic' }}>
                          {next.reason}
                        </div>
                      )}
                    </div>
                    <ApptStatusBadge status={next.status} />
                  </div>
                );
              })()}
            </div>

            {/* dernière ordonnance */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Dernière ordonnance</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-records', { state: { tab: 'ordonnances' } })}>
                  Voir tout <Icon name="chevronRight" size={14} />
                </button>
              </div>

              {loadingMyHistory ? (
                <div className="placeholder" style={{ height: 80, borderRadius: 10 }} />
              ) : (() => {
                const last = myHistory?.prescriptions?.[0];
                if (!last) {
                  return (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      <Icon name="pill" size={24} style={{ opacity: .2, display: 'block', margin: '0 auto .4rem' }} />
                      Aucune ordonnance
                    </div>
                  );
                }
                const meds = typeof last.medications === 'string' ? JSON.parse(last.medications) : last.medications;
                return (
                  <div>
                    <div className="text-xs text-muted" style={{ marginBottom: '.6rem' }}>
                      {new Date(last.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
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
                    {meds.length > 2 && (
                      <div className="text-xs text-muted" style={{ marginTop: '.3rem' }}>
                        +{meds.length - 2} autre{meds.length - 2 > 1 ? 's' : ''} médicament{meds.length - 2 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Awa AI */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, var(--green-paler) 0%, #fff 100%)',
              border: '1px solid var(--green-pale)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.75rem', marginBottom: '.85rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg,#12a07c,#0d7a5f)',
                  display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0,
                }}>
                  <Icon name="sparkles" size={15} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Awa AI</div>
                  <div style={{ fontSize: 12, color: 'var(--green)' }}>Prête à vous aider</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                Je peux vous aider à prendre un rendez-vous ou répondre à vos questions médicales.
              </p>
            </div>

            {/* accès rapide patient */}
            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Mon espace</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {[
                  { to: '/my-appointments', icon: 'calendar',    label: 'Mes rendez-vous',    sub: 'Prendre ou consulter' },
                  { to: '/my-records',      icon: 'file',        label: 'Mon dossier',        sub: 'Consultations & ordonnances' },
                  { to: '/my-records',      icon: 'invoice',     label: 'Mes factures',       sub: 'Historique des paiements', state: { tab: 'factures' } },
                  { to: '/my-records',      icon: 'pill',        label: 'Mes ordonnances',    sub: 'Prescriptions en cours',   state: { tab: 'ordonnances' } },
                ].map(s => (
                  <button
                    key={s.label}
                    onClick={() => navigate(s.to, s.state ? { state: s.state } : undefined)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '.75rem',
                      padding: '.65rem .75rem', borderRadius: 10, textAlign: 'left',
                      background: 'var(--cream)', border: 'none', cursor: 'pointer',
                      transition: 'background .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--green-paler)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: 'var(--green-pale)', display: 'grid', placeItems: 'center',
                      color: 'var(--green)', flexShrink: 0,
                    }}>
                      <Icon name={s.icon} size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.sub}</div>
                    </div>
                    <Icon name="chevronRight" size={14} style={{ marginLeft: 'auto', color: 'var(--muted-light)' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

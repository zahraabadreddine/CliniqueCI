import { useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatFcfa(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return v.toLocaleString('fr-FR');
}

function formatDateLong(d) {
  return new Date(d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function initials(firstName, lastName) {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase();
}

// ── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, delta, deltaDir = 'up', bg = 'var(--green-pale)', color = 'var(--green)', loading }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 16,
      padding: '1.1rem 1.2rem',
      border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: '.6rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: bg, display: 'grid', placeItems: 'center', color }}>
          <Icon name={icon} size={18} />
        </div>
        {delta && !loading && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '.2rem .5rem', borderRadius: 20,
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

// ── ActionTile ────────────────────────────────────────────────────────────────

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
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.65)', display: 'grid', placeItems: 'center', color }}>
        <Icon name={icon} size={17} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </button>
  );
}

// ── Badge statut ──────────────────────────────────────────────────────────────

function ApptStatusBadge({ status }) {
  const map = {
    confirmed:  { cls: 'green', label: 'Confirmé' },
    pending:    { cls: 'gold',  label: 'En attente' },
    waiting:    { cls: 'gold',  label: 'En attente' },
    'in-room':  { cls: 'blue',  label: 'En consultation' },
    done:       { cls: 'muted', label: 'Terminé' },
    completed:  { cls: 'muted', label: 'Terminé' },
    cancelled:  { cls: 'red',   label: 'Annulé' },
  };
  const m = map[status] || { cls: 'muted', label: status };
  return (
    <span className={`badge ${m.cls}`}>
      <span className="dot-mark" />
      {m.label}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ firstName, lastName, size = 'md' }) {
  const ini = initials(firstName, lastName);
  const colors = ['#22a05e', '#22a05e', '#d97706', '#156b3d', '#dc2626', '#156b3d'];
  const color = colors[(firstName?.charCodeAt(0) ?? 0) % colors.length];
  const cls = `avatar ${size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : ''}`;
  return <div className={cls} style={{ background: color }}>{ini}</div>;
}

// ── Patient detail drawer ─────────────────────────────────────────────────────

function PatientDetailDrawer({ patientId, open, onClose }) {
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-detail', patientId],
    queryFn: () => api.get(`/patients/${patientId}`),
    enabled: open && !!patientId,
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['patient-consultations', patientId],
    queryFn: () => api.get(`/consultations?patientId=${patientId}`),
    enabled: open && !!patientId,
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['patient-prescriptions', patientId],
    queryFn: () => api.get(`/prescriptions?patientId=${patientId}`),
    enabled: open && !!patientId,
  });

  const { data: appts = [] } = useQuery({
    queryKey: ['patient-appointments', patientId],
    queryFn: () => api.get(`/appointments?patientId=${patientId}`),
    enabled: open && !!patientId,
  });

  if (!open) return null;

  function formatDateFR(ymd) {
    if (!ymd) return '—';
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  }

  const p = patient;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 200 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, background: 'var(--bg)', zIndex: 201,
        display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,.1)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
            {isLoading ? 'Chargement…' : `${p?.first_name} ${p?.last_name}`}
          </h3>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {isLoading ? (
            <div className="text-muted text-sm">Chargement du dossier…</div>
          ) : !p ? (
            <div className="text-muted text-sm">Patient introuvable.</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', alignItems: 'flex-start' }}>
                <Avatar firstName={p.first_name} lastName={p.last_name} size="lg" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink)' }}>
                    {p.first_name} {p.last_name}
                  </div>
                  <div className="text-muted text-sm">
                    {p.date_of_birth ? `né(e) le ${formatDateFR(p.date_of_birth)}` : ''}{p.gender === 'M' ? ' · Homme' : p.gender === 'F' ? ' · Femme' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
                    {p.blood_type && <span className="badge green">Groupe {p.blood_type}</span>}
                    {p.allergies && JSON.parse(p.allergies || '[]').map(a => (
                      <span key={a} className="badge red">⚠ {a}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ai-assist-box" style={{ marginBottom: '1rem' }}>
                <div className="ai-assist-mark"><Icon name="sparkles" size={13} /></div>
                <div className="ai-assist-content">
                  <div className="ai-assist-label">Synthèse Awa</div>
                  <div className="text-sm" style={{ color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                    {consultations.length} consultation(s) dans l'historique.
                    {prescriptions.length > 0 ? ` ${prescriptions.length} ordonnance(s) émise(s).` : ''}
                    {p.last_visit ? ` Dernière visite le ${formatDateFR(p.last_visit?.slice(0, 10))}.` : ' Aucune visite enregistrée.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
                <div className="card" style={{ padding: '.85rem 1rem' }}>
                  <div className="text-xs text-muted">Téléphone</div>
                  <div className="fw-600 mono">{p.phone || '—'}</div>
                </div>
                <div className="card" style={{ padding: '.85rem 1rem' }}>
                  <div className="text-xs text-muted">Assurance</div>
                  <div className="fw-600">{p.insurance_provider || 'Aucune'}</div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: '.75rem' }}>
                <div className="card-title">Historique consultations ({consultations.length})</div>
                {consultations.length === 0 ? (
                  <div className="text-sm text-muted">Aucune consultation enregistrée.</div>
                ) : (
                  consultations.slice(0, 5).map(v => (
                    <div key={v.id} style={{ padding: '.65rem 0', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div className="fw-600 text-sm">{formatDateFR(v.created_at?.slice(0, 10))} — {v.chief_complaint || 'Consultation'}</div>
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: '.2rem' }}>{v.diagnosis || ''}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="card" style={{ marginBottom: '.75rem' }}>
                <div className="card-title">Ordonnances ({prescriptions.length})</div>
                {prescriptions.length === 0 ? (
                  <div className="text-sm text-muted">Aucune ordonnance.</div>
                ) : (
                  prescriptions.slice(0, 4).map(r => (
                    <div key={r.id} style={{ padding: '.65rem 0', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="text-sm">
                        <span className="fw-600">{formatDateFR(r.created_at?.slice(0, 10))}</span>
                        <span className="badge green">Émise</span>
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: '.2rem' }}>
                        {Array.isArray(r.medications)
                          ? r.medications.map(m => m.name || m.medication || m).join(' · ')
                          : (typeof r.medications === 'string' ? r.medications : '')}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="card">
                <div className="card-title">Rendez-vous ({appts.length})</div>
                {appts.slice(0, 5).map(a => (
                  <div key={a.id} style={{ padding: '.55rem 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="text-sm">
                      <span className="fw-600">{formatDateFR(a.scheduled_at?.slice(0, 10))} {a.scheduled_at ? new Date(a.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      <span className="text-muted"> · {a.reason || 'RDV'}</span>
                    </div>
                    <ApptStatusBadge status={a.status} />
                  </div>
                ))}
                {appts.length === 0 && <div className="text-sm text-muted">Aucun rendez-vous.</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main DoctorHomePage ───────────────────────────────────────────────────────

export default function DoctorHomePage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openPatientId, setOpenPatientId] = useState(null);

  const now    = new Date();
  const today  = now.toISOString().slice(0, 10);
  const hour   = now.getHours();
  const greet  = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const isOpen = hour >= 7 && hour < 18;
  const dateLong = formatDateLong(today);

  // ── Queries ──
  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['appointments-today', today],
    queryFn: () => api.get(`/appointments?date=${today}`),
  });

  const { data: invoiceStats, isLoading: loadingStats } = useQuery({
    queryKey: ['invoices-my-stats'],
    queryFn: () => api.get('/invoices/my-stats'),
  });

  // ── Status mutation ──
  const patchStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments-today'] }),
  });

  // ── Derived counts ──
  const waiting  = appointments.filter(a => a.status === 'waiting' || a.status === 'in-room');
  const upcoming = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending');
  const done     = appointments.filter(a => a.status === 'done' || a.status === 'completed');

  const todayRevenue = Number(invoiceStats?.today_revenue ?? 0);
  const unpaidCount  = Number(invoiceStats?.unpaid_count ?? 0);

  const nextList = [...waiting, ...upcoming].slice(0, 6);

  // Prochain patient
  const nextPatient = [...waiting, ...upcoming]
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))[0];

  function apptTime(a) {
    if (!a.scheduled_at) return '—';
    return new Date(a.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="page-content">

      {/* ── Bannière hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #22a05e 0%, #156b3d 55%, #1a8a4e 100%)',
        borderRadius: 20, padding: '1.5rem 1.75rem',
        marginBottom: '1.75rem', position: 'relative', overflow: 'hidden',
        color: '#fff',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 80, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: 13, opacity: .75, marginBottom: '.3rem' }}>
              Clinique du Plateau · Médecin
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
              {greet}, Dr. {user?.first_name} 👋
            </div>
            <div style={{ fontSize: 13, opacity: .75, marginTop: '.4rem', textTransform: 'capitalize' }}>
              {dateLong}
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
              onClick={() => navigate('/appointments')}
            >
              <Icon name="calendar" size={14} /> Voir l'agenda
            </button>
          </div>
        </div>

        {/* Chiffres rapides */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
          {[
            { n: appointments.length, label: 'Patients ce jour' },
            { n: waiting.length,      label: 'En attente'       },
            { n: done.length,         label: 'Terminés'         },
            { n: unpaidCount,         label: 'À encaisser'      },
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
        <StatCard
          icon="calendar" label="Patients aujourd'hui" value={appointments.length}
          loading={loadingAppts} bg="var(--green-pale)" color="var(--green)"
          delta={!loadingAppts && appointments.length > 0 ? `${done.length} terminé${done.length > 1 ? 's' : ''}` : null}
        />
        <StatCard
          icon="clock" label="En salle d'attente" value={waiting.length}
          loading={loadingAppts} bg="var(--gold-soft)" color="var(--gold)"
          delta={waiting.length > 0 ? 'à voir maintenant' : null} deltaDir="down"
        />
        <StatCard
          icon="check" label="Consultations terminées" value={done.length}
          loading={loadingAppts} bg="#e2f8ec" color="#22a05e"
        />
        <StatCard
          icon="invoice" label="Recettes du jour" value={`${formatFcfa(todayRevenue)} F`}
          loading={loadingStats} bg="var(--green-pale)" color="var(--green)"
          delta={unpaidCount > 0 ? `${unpaidCount} à encaisser` : null} deltaDir="down"
        />
      </div>

      {/* ── Corps principal ── */}
      <div className="grid-main-side">

        {/* Colonne gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Prochain patient */}
          {nextPatient && (
            <div style={{
              background: 'linear-gradient(135deg, #22a05e 0%, #156b3d 100%)',
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
                  Prochain patient
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {nextPatient.patient_first_name} {nextPatient.patient_last_name}
                </div>
                <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>
                  {nextPatient.reason || 'Consultation générale'} · {apptTime(nextPatient)}
                </div>
              </div>
              <ApptStatusBadge status={nextPatient.status} />
            </div>
          )}

          {/* Liste des patients */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Prochains patients</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {appointments.length > 0
                    ? `${appointments.length} patient${appointments.length > 1 ? 's' : ''} attendu${appointments.length > 1 ? 's' : ''}`
                    : 'Aucune consultation planifiée'}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/appointments')}>
                Tout voir <Icon name="chevronRight" size={13} />
              </button>
            </div>

            {loadingAppts ? (
              <div style={{ padding: '1rem 0' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="placeholder" style={{ height: 52, borderRadius: 8, marginBottom: '.5rem' }} />
                ))}
              </div>
            ) : nextList.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🗓</div>
                <div className="empty-state-title">Aucun RDV à venir aujourd'hui</div>
                <div className="empty-state-desc">Profitez d'une pause méritée.</div>
              </div>
            ) : (
              <div className="data-list">
                {nextList.map(a => (
                  <div key={a.id} className="data-row" style={{ alignItems: 'center' }}>
                    <div className="mono fw-600" style={{ width: 52, fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>
                      {apptTime(a)}
                    </div>
                    <Avatar firstName={a.patient_first_name} lastName={a.patient_last_name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fw-600" style={{ fontSize: 14 }}>
                        {a.patient_first_name} {a.patient_last_name}
                      </div>
                      <div className="text-xs text-muted">{a.reason || 'Consultation générale'}</div>
                    </div>
                    <ApptStatusBadge status={a.status} />
                    <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                      {a.status === 'waiting' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => patchStatus.mutate({ id: a.id, status: 'in-room' })}
                          disabled={patchStatus.isPending}
                        >
                          Faire entrer
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setOpenPatientId(a.patient_id)}
                        title="Voir le dossier"
                      >
                        <Icon name="file" size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Accès direct */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: '1rem' }}>
              Accès direct
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
              <ActionTile icon="users"        label="Patients"       sub="Dossiers"      color="var(--green)" bg="var(--green-pale)" onClick={() => navigate('/patients')}      />
              <ActionTile icon="calendar"     label="Agenda"         sub="Planning"      color="#22a05e"      bg="#e2f8ec"           onClick={() => navigate('/appointments')}  />
              <ActionTile icon="stethoscope"  label="Consultations"  sub="Notes & RX"    color="var(--gold)"  bg="var(--gold-soft)"  onClick={() => navigate('/consultations')} />
              <ActionTile icon="chart"        label="Statistiques"   sub="Mes revenus"   color="#b8860b"      bg="#fef3d3"           onClick={() => navigate('/doctor-stats')}  />
            </div>
          </div>

          {/* Brief Awa */}
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
                <div style={{ fontSize: 11, color: 'var(--green)' }}>IA médicale · disponible</div>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.65, margin: 0 }}>
              {loadingAppts ? (
                'Chargement…'
              ) : waiting.length > 0 ? (
                <><strong>{waiting.length}</strong> patient{waiting.length > 1 ? 's' : ''} en salle d'attente. Le prochain est <strong>{waiting[0].patient_first_name} {waiting[0].patient_last_name}</strong> pour <em>{waiting[0].reason || 'consultation'}</em>.</>
              ) : upcoming.length > 0 ? (
                <>Tous vos patients sont à l'heure. Prochaine consultation à <strong>{apptTime(upcoming[0])}</strong> avec <strong>{upcoming[0].patient_first_name} {upcoming[0].patient_last_name}</strong>.</>
              ) : done.length > 0 ? (
                'Toutes les consultations du jour sont terminées. Bonne fin de journée !'
              ) : (
                'Aucun rendez-vous prévu aujourd\'hui. Bonne journée !'
              )}
            </p>
          </div>

          {/* Aperçu journée */}
          <div className="card" style={{ padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: '.65rem' }}>
              Aperçu de la journée
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              {[
                { label: 'Total',      value: appointments.length, color: 'var(--ink)' },
                { label: 'Terminés',   value: done.length,         color: 'var(--green)' },
                { label: 'En attente', value: waiting.length,      color: waiting.length > 0 ? 'var(--gold)' : 'var(--ink)' },
                { label: 'À venir',    value: upcoming.length,     color: 'var(--ink)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="text-sm">
                  <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Patient detail drawer */}
      <PatientDetailDrawer
        patientId={openPatientId}
        open={!!openPatientId}
        onClose={() => setOpenPatientId(null)}
      />
    </div>
  );
}

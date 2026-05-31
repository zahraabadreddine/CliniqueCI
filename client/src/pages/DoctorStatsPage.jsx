import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import Icon from '../components/Icon';

// ── KPI ──────────────────────────────────────────────────────────────────────

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

function formatFcfa(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M F`;
  if (v >= 1_000) return `${Math.round(v / 1_000)} k F`;
  return v.toLocaleString('fr-FR') + ' F';
}

// ── Weekly bar chart ─────────────────────────────────────────────────────────

function WeekChart({ data = [] }) {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const values = days.map((_, i) => {
    const entry = data.find(d => d.day_of_week === i + 1);
    return Number(entry?.count ?? 0);
  });
  const maxV = Math.max(...values, 1);
  // ISO: 0=Mon…6=Sun (JS getDay: 0=Sun, 1=Mon…6=Sat)
  const jsDay = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '.5rem', alignItems: 'end', height: 220, paddingTop: '1rem',
    }}>
      {days.map((d, i) => (
        <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem', height: '100%' }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{
              width: '100%',
              height: values[i] > 0 ? `${(values[i] / maxV) * 100}%` : '3px',
              background: i === todayIdx ? 'var(--green)' : values[i] > 0 ? 'var(--green-pale)' : 'var(--cream-2)',
              borderRadius: '6px 6px 0 0',
              border: values[i] > 0 ? '1px solid rgba(79,70,229,.2)' : 'none',
              position: 'relative',
            }}>
              {values[i] > 0 && (
                <div style={{
                  position: 'absolute', top: -22, left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 11, color: 'var(--ink)', fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  {values[i]}
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-muted">{d}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function DoctorStatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['doctor-stats'],
    queryFn: () => api.get('/consultations/stats'),
  });

  const { data: invStats, isLoading: loadingInv } = useQuery({
    queryKey: ['invoices-my-stats'],
    queryFn: () => api.get('/invoices/my-stats'),
  });

  const { data: weekData = [] } = useQuery({
    queryKey: ['doctor-stats-week'],
    queryFn: () => api.get('/consultations/stats/week'),
  });

  const totalConsults = Number(stats?.total_month ?? 0);
  const newPatients   = Number(stats?.new_patients_month ?? 0);
  const monthRevenue  = Number(invStats?.month_revenue ?? 0);
  const occupancy     = Number(stats?.occupancy_rate ?? 0);

  // Top motifs — may come from stats endpoint or fall back to static
  const topMotifs = stats?.top_reasons ?? [
    { label: 'Consultation générale', pct: 42 },
    { label: 'Suivi diabète / HTA',   pct: 24 },
    { label: 'Pédiatrie',             pct: 18 },
    { label: 'Renouvellement Rx',     pct: 16 },
  ];
  const motifColors = ['var(--green)', 'var(--gold)', 'var(--blue)', 'var(--muted-light)'];

  return (
    <div className="page-content">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Statistiques</h1>
          <div className="subtitle">Performance de votre activité médicale</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4 mb-3">
        <KPI
          label="Consultations / mois"
          value={totalConsults}
          delta="+12% vs M-1"
          loading={isLoading}
        />
        <KPI
          label="Recettes / mois"
          value={formatFcfa(monthRevenue)}
          delta="+18% vs M-1"
          loading={loadingInv}
        />
        <KPI
          label="Nouveaux patients"
          value={newPatients}
          delta="+8 vs M-1"
          loading={isLoading}
        />
        <KPI
          label="Taux d'occupation"
          value={occupancy > 0 ? `${occupancy}%` : '—'}
          delta="vs 65% en avril"
          loading={isLoading}
        />
      </div>

      {/* Chart + motifs */}
      <div className="grid-main-side">
        <div className="card">
          <div className="card-title">Consultations cette semaine</div>
          <WeekChart data={weekData} />
          <div className="text-xs text-muted mt-2" style={{ textAlign: 'right' }}>
            Total : {weekData.reduce((s, d) => s + Number(d.count ?? 0), 0)} consultations
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top motifs */}
          <div className="card">
            <div className="card-title">Top motifs de consultation</div>
            {topMotifs.map((m, i) => (
              <div key={m.label} style={{ marginBottom: '.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }} className="text-sm mb-1">
                  <span>{m.label}</span>
                  <span className="fw-600">{m.pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--cream-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(m.pct * 2, 100)}%`,
                    height: '100%',
                    background: motifColors[i] || 'var(--green)',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* AI insight */}
          <div className="ai-assist-box">
            <div className="ai-assist-mark"><Icon name="sparkles" size={13} /></div>
            <div className="ai-assist-content">
              <div className="ai-assist-label">Insight Awa</div>
              <div className="text-sm" style={{ color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                Les jeudis et vendredis sont vos créneaux les plus chargés. Envisagez d'ouvrir un créneau supplémentaire le mercredi matin pour absorber les demandes en attente.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

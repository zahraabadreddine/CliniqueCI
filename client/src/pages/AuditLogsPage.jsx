import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api';
import Icon from '../components/Icon';

// ── helpers ───────────────────────────────────────────────────────────────────
const ACTION_META = {
  USER_CREATED:     { label: 'Compte créé',       color: 'var(--green)',  bg: 'var(--green-pale)' },
  USER_UPDATED:     { label: 'Compte modifié',     color: 'var(--purple)', bg: 'var(--purple-soft)' },
  USER_SUSPENDED:   { label: 'Compte suspendu',    color: 'var(--red)',    bg: 'var(--red-soft)' },
  USER_REACTIVATED: { label: 'Compte réactivé',    color: 'var(--blue)',   bg: 'var(--blue-soft)' },
  LOGIN:            { label: 'Connexion',           color: 'var(--muted)', bg: 'var(--cream)' },
  LOGOUT:           { label: 'Déconnexion',         color: 'var(--muted)', bg: 'var(--cream)' },
};

function ActionBadge({ action }) {
  const meta = ACTION_META[action] ?? { label: action, color: 'var(--muted)', bg: 'var(--cream)' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.03em',
      color: meta.color, background: meta.bg,
      borderRadius: 6, padding: '2px 8px',
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function actorName(log) {
  if (log.actor_first_name || log.actor_last_name) {
    return `${log.actor_first_name ?? ''} ${log.actor_last_name ?? ''}`.trim();
  }
  return 'Système';
}

// ── ActionFilter ──────────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { value: '',               label: 'Toutes les actions' },
  { value: 'USER_CREATED',   label: 'Compte créé' },
  { value: 'USER_UPDATED',   label: 'Compte modifié' },
  { value: 'USER_SUSPENDED', label: 'Suspension' },
  { value: 'USER_REACTIVATED', label: 'Réactivation' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AuditLogsPage() {
  const [page,         setPage]         = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const limit = 25;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', page, actionFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit });
      if (actionFilter) params.set('action', actionFilter);
      return api.get(`/audit-logs?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const logs  = data?.logs  ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleFilterChange = (val) => {
    setActionFilter(val);
    setPage(1);
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <Icon name="shield" size={20} style={{ color: 'var(--green)' }} />
            Piste d'audit
          </h1>
          <div className="subtitle">Journal des actions administratives — lecture seule</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <Icon name="filter" size={14} style={{ color: 'var(--muted)' }} />
          <select
            className="input"
            style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }}
            value={actionFilter}
            onChange={e => handleFilterChange(e.target.value)}
          >
            {FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {total > 0 && (
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
            {total} entrée{total > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="placeholder" style={{ height: 52, borderRadius: 0, borderBottom: '1px solid var(--border)' }} />
            ))}
          </div>
        ) : isError ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--red)' }}>
            <Icon name="alert" size={28} style={{ opacity: .4, display: 'block', margin: '0 auto .5rem' }} />
            <div>Erreur lors du chargement de la piste d'audit.</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="shield" size={26} style={{ opacity: .55 }} />
            </div>
            <div className="empty-state-title">Aucune entrée d'audit</div>
            <div className="empty-state-desc">Aucun résultat pour ces critères de filtre.</div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 160px 120px',
              padding: '10px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--cream)',
            }}>
              {['Acteur', 'Action', 'Cible', 'Date'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {logs.map((log, idx) => (
              <div
                key={log.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 160px 120px',
                  padding: '12px 20px',
                  borderBottom: idx < logs.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center',
                  gap: '.75rem',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* Actor */}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                    {actorName(log)}
                  </div>
                  {log.actor_role && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                      {log.actor_role}
                      {log.ip_address && (
                        <span style={{ marginLeft: 8, opacity: .7 }}>· {log.ip_address}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action */}
                <ActionBadge action={log.action} />

                {/* Target */}
                <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.target_type ? (
                    <>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>{log.target_type}</span>
                      {log.details?.email && (
                        <span style={{ marginLeft: 4 }}>· {log.details.email}</span>
                      )}
                    </>
                  ) : (
                    <span style={{ opacity: .4 }}>—</span>
                  )}
                </div>

                {/* Date */}
                <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {formatDate(log.created_at)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '.5rem', marginTop: '1.25rem',
        }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
          >
            <Icon name="chevronLeft" size={14} />
            Précédent
          </button>

          <span style={{ fontSize: 13, color: 'var(--muted)', padding: '0 .5rem' }}>
            Page {page} / {totalPages}
          </span>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            Suivant
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

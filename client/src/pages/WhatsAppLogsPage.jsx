import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../lib/api';
import Icon from '../components/Icon';

// ── Helpers ───────────────────────────────────────────────────────────────────
const TEMPLATE_META = {
  rdv_confirmation: { label: 'Confirmation',  color: 'var(--green)',  bg: 'var(--green-pale)' },
  rdv_rappel_j1:    { label: 'Rappel J-1',    color: 'var(--blue)',   bg: 'var(--blue-soft)' },
  rdv_rappel_h2:    { label: 'Rappel H-2',    color: 'var(--purple)', bg: 'var(--purple-soft)' },
  rdv_annule:       { label: 'Annulation',    color: 'var(--red)',    bg: 'var(--red-soft)' },
};

const STATUS_META = {
  sent:      { label: 'Envoyé',     color: 'var(--green)',  bg: 'var(--green-pale)' },
  simulated: { label: 'Simulé',     color: 'var(--purple)', bg: 'var(--purple-soft)' },
  pending:   { label: 'En attente', color: 'var(--muted)',  bg: 'var(--cream)' },
  failed:    { label: 'Échec',      color: 'var(--red)',    bg: 'var(--red-soft)' },
  delivered: { label: 'Livré',      color: 'var(--green)',  bg: 'var(--green-pale)' },
  read:      { label: 'Lu',         color: 'var(--blue)',   bg: 'var(--blue-soft)' },
};

function Chip({ meta, value }) {
  const m = meta[value] ?? { label: value, color: 'var(--muted)', bg: 'var(--cream)' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.03em',
      color: m.color, background: m.bg, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const TEMPLATE_OPTS = [
  { value: '',                label: 'Tous les templates' },
  { value: 'rdv_confirmation', label: 'Confirmation' },
  { value: 'rdv_rappel_j1',   label: 'Rappel J-1' },
  { value: 'rdv_rappel_h2',   label: 'Rappel H-2' },
  { value: 'rdv_annule',      label: 'Annulation' },
];
const STATUS_OPTS = [
  { value: '',          label: 'Tous les statuts' },
  { value: 'sent',      label: 'Envoyé' },
  { value: 'simulated', label: 'Simulé' },
  { value: 'delivered', label: 'Livré' },
  { value: 'read',      label: 'Lu' },
  { value: 'failed',    label: 'Échec' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WhatsAppLogsPage() {
  const [page,       setPage]       = useState(1);
  const [template,   setTemplate]   = useState('');
  const [status,     setStatus]     = useState('');

  const limit = 25;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wa-logs', page, template, status],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit });
      if (template) p.set('template', template);
      if (status)   p.set('status', status);
      return api.get(`/notifications/whatsapp?${p}`);
    },
    placeholderData: keepPreviousData,
  });

  const { data: stats } = useQuery({
    queryKey: ['wa-stats'],
    queryFn: () => api.get('/notifications/whatsapp/stats'),
    staleTime: 30_000,
  });

  const logs       = data?.logs  ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const resetFilters = () => { setTemplate(''); setStatus(''); setPage(1); };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <span style={{ fontSize: 22 }}>💬</span>
            Notifications WhatsApp
          </h1>
          <div className="subtitle">Historique des messages envoyés aux patients</div>
        </div>
      </div>

      {/* Stats pills */}
      {stats && (
        <div style={{ display: 'flex', gap: '.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_META).map(([key, m]) =>
            stats[key] != null ? (
              <div key={key} style={{
                fontSize: 12, fontWeight: 600, padding: '4px 12px',
                borderRadius: 8, background: m.bg, color: m.color, cursor: 'pointer',
              }}
                onClick={() => { setStatus(s => s === key ? '' : key); setPage(1); }}
              >
                {m.label} · {stats[key]}
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <Icon name="filter" size={14} style={{ color: 'var(--muted)' }} />
          <select
            className="input"
            style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }}
            value={template}
            onChange={e => { setTemplate(e.target.value); setPage(1); }}
          >
            {TEMPLATE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="input"
            style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }}
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(template || status) && (
            <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
              <Icon name="x" size={12} /> Effacer
            </button>
          )}
        </div>
        {total > 0 && (
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
            {total} message{total > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Mode simulation banner */}
      {stats?.simulated > 0 && !stats?.sent && (
        <div style={{
          background: 'var(--purple-soft)', color: 'var(--purple)',
          borderRadius: 10, padding: '10px 16px', marginBottom: '1rem',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: '.6rem',
        }}>
          <span>⚙️</span>
          <span>
            Mode <strong>simulation</strong> actif — les messages sont loggés mais non envoyés.
            Pour passer en production, définissez <code>WHATSAPP_MODE=live</code> dans votre <code>.env</code>.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="placeholder" style={{ height: 52, borderRadius: 0, borderBottom: '1px solid var(--border)' }} />
            ))}
          </div>
        ) : isError ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--red)' }}>
            <Icon name="alert" size={28} style={{ opacity: .4, display: 'block', margin: '0 auto .5rem' }} />
            <div>Erreur lors du chargement des logs WhatsApp.</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>💬</div>
            <div className="empty-state-title">Aucun message WhatsApp</div>
            <div className="empty-state-desc">Les notifications envoyées aux patients apparaîtront ici.</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1.4fr 130px 100px 110px 1fr',
              padding: '10px 20px', borderBottom: '1px solid var(--border)',
              background: 'var(--cream)',
            }}>
              {['Patient', 'Template', 'Statut', 'Date', 'Numéro'].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {logs.map((log, idx) => (
              <div
                key={log.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1.4fr 130px 100px 110px 1fr',
                  padding: '11px 20px',
                  borderBottom: idx < logs.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center', gap: '.5rem', transition: 'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* Patient */}
                <div>
                  {log.patient_first_name ? (
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                      {log.patient_first_name} {log.patient_last_name}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--muted)', opacity: .6 }}>—</span>
                  )}
                  {log.scheduled_at && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                      RDV : {new Date(log.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                {/* Template */}
                <Chip meta={TEMPLATE_META} value={log.template} />
                {/* Statut */}
                <Chip meta={STATUS_META} value={log.status} />
                {/* Date */}
                <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {formatDate(log.created_at)}
                </div>
                {/* Numéro */}
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>
                  {log.to_phone ? `+${log.to_phone}` : '—'}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '.5rem', marginTop: '1.25rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}>
            <Icon name="chevronLeft" size={14} /> Précédent
          </button>
          <span style={{ fontSize: 13, color: 'var(--muted)', padding: '0 .5rem' }}>
            Page {page} / {totalPages}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>
            Suivant <Icon name="chevronRight" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

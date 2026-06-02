import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOMO_OPTIONS = [
  { id: 'orange_money', label: 'Orange Money', cls: 'momo-orange', abbr: 'OM',  badge: 'Orange MM' },
  { id: 'wave',         label: 'Wave',         cls: 'momo-wave',   abbr: 'WV',  badge: 'Wave' },
  { id: 'mtn_money',   label: 'MTN Money',    cls: 'momo-mtn',    abbr: 'MTN', badge: 'MTN Money' },
  { id: 'moov_money',  label: 'Moov Money',   cls: 'momo-moov',   abbr: 'MV',  badge: 'Moov Money' },
  { id: 'cash',        label: 'Espèces',      cls: null,           abbr: null,  badge: 'Espèces' },
];

const STATUS_MAP = {
  pending:   { cls: 'gold',  label: 'En attente' },
  collected: { cls: 'blue',  label: 'Encaissé' },
  paid:      { cls: 'green', label: 'Validé' },
  cancelled: { cls: 'red',   label: 'Annulée' },
};

function fmt(amount) {
  return new Intl.NumberFormat('fr-FR').format(Number(amount) || 0) + ' F';
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(first, last) {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
}

function Avatar({ firstName, lastName, size = 'sm' }) {
  const ini = initials(firstName, lastName);
  const colors = ['#22a05e', '#22a05e', '#d97706', '#156b3d', '#dc2626', '#156b3d'];
  const color = colors[(firstName?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div className={`avatar avatar-${size}`} style={{ background: color, flexShrink: 0 }}>{ini}</div>
  );
}

function methodBadge(payment_method) {
  if (!payment_method) return <span className="text-xs text-muted">—</span>;
  const opt = MOMO_OPTIONS.find(o => o.id === payment_method);
  return <span className="badge muted">{opt?.badge ?? payment_method}</span>;
}

// ── KPI ───────────────────────────────────────────────────────────────────────

function KPI({ label, value, delta, deltaDir = 'up', loading }) {
  return (
    <div className="kpi">
      <div className="kpi-accent" />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{loading ? '…' : value}</div>
      {delta && (
        <div className={`kpi-delta${deltaDir === 'down' ? ' down' : ''}`}>
          <span>{deltaDir === 'down' ? '↓' : '↑'}</span>
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function InvoiceModal({ onClose }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients'),
  });

  const mutation = useMutation({
    mutationFn: (data) => api.post('/invoices', { ...data, amount: Number(data.amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: (err) => setServerError(err?.error || 'Erreur lors de la création'),
  });

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2>Nouvelle facture</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-body">
          {serverError && (
            <div style={{ padding: '.75rem 1rem', marginBottom: '1rem', background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 10, fontSize: 13, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <Icon name="warning" size={14} />{serverError}
            </div>
          )}
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
            <div className="field">
              <label>Patient</label>
              <select className="select" {...register('patient_id', { required: 'Requis' })}>
                <option value="">Sélectionner un patient…</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.last_name} {p.first_name}</option>
                ))}
              </select>
              {errors.patient_id && <span className="form-error">{errors.patient_id.message}</span>}
            </div>
            <div className="field">
              <label>Montant (F)</label>
              <input
                type="number"
                min="0"
                step="100"
                className="input"
                placeholder="15000"
                {...register('amount', { required: 'Requis', min: { value: 0, message: 'Montant invalide' } })}
              />
              {errors.amount && <span className="form-error">{errors.amount.message}</span>}
            </div>
            <div className="field">
              <label>Notes / Détail (optionnel)</label>
              <input className="input" {...register('notes')} placeholder="Consultation + analyses…" />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: '.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                {mutation.isPending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                {mutation.isPending ? 'Création…' : 'Créer la facture'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PayModal({ invoice, onClose }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [serverError, setServerError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch(`/invoices/${invoice.id}/pay`, { payment_method: selected }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: (err) => setServerError(err?.error || 'Erreur lors du paiement'),
  });

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>Enregistrer l'encaissement</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>{fmt(invoice.amount)}</div>
            <div className="text-xs text-muted" style={{ marginTop: '.25rem' }}>
              {invoice.patient_first_name} {invoice.patient_last_name}
            </div>
          </div>

          {serverError && (
            <div style={{ padding: '.75rem 1rem', marginBottom: '1rem', background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 10, fontSize: 13, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <Icon name="warning" size={14} />{serverError}
            </div>
          )}

          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '.75rem' }}>
            Moyen de paiement
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1.25rem' }}>
            {MOMO_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`momo-option${selected === opt.id ? ' selected' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 1rem', cursor: 'pointer', background: 'none' }}
                onClick={() => setSelected(opt.id)}
              >
                {opt.cls ? (
                  <div className={`momo-logo ${opt.cls}`}>{opt.abbr}</div>
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--cream)', display: 'grid', placeItems: 'center', border: '1px solid var(--border)' }}>
                    <Icon name="wallet" size={20} color="var(--ink-soft)" />
                  </div>
                )}
                <span style={{ fontWeight: 500, fontSize: 14 }}>{opt.label}</span>
                {selected === opt.id && (
                  <div style={{ marginLeft: 'auto', color: 'var(--green)' }}>
                    <Icon name="check" size={16} />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="modal-footer" style={{ padding: 0 }}>
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button
              className="btn btn-primary"
              disabled={!selected || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
              {mutation.isPending ? 'Enregistrement…' : 'Confirmer l\'encaissement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Validate confirm modal ────────────────────────────────────────────────────

function ValidateModal({ invoice, onClose }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch(`/invoices/${invoice.id}/validate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
    onError: (err) => setServerError(err?.error || 'Erreur lors de la validation'),
  });

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>Valider l'encaissement</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--cream)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <div className="text-xs text-muted" style={{ marginBottom: '.2rem' }}>Patient</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {invoice.patient_first_name} {invoice.patient_last_name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="text-xs text-muted" style={{ marginBottom: '.2rem' }}>Montant</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--green)' }}>{fmt(invoice.amount)}</div>
              </div>
            </div>
            {(invoice.collected_by_first_name || invoice.collected_by_last_name) && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <Avatar firstName={invoice.collected_by_first_name} lastName={invoice.collected_by_last_name} />
                <div>
                  <div className="text-xs text-muted">Encaissé par</div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    {invoice.collected_by_first_name} {invoice.collected_by_last_name}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  {methodBadge(invoice.payment_method)}
                </div>
              </div>
            )}
          </div>

          {serverError && (
            <div style={{ padding: '.75rem 1rem', marginBottom: '1rem', background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 10, fontSize: 13, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <Icon name="warning" size={14} />{serverError}
            </div>
          )}

          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: '1.25rem' }}>
            En validant, vous confirmez que ce paiement a bien été reçu et clôturez la facture.
          </p>

          <div className="modal-footer" style={{ padding: 0 }}>
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button
              className="btn btn-primary"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
              {mutation.isPending ? 'Validation…' : 'Valider le paiement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── À valider section (admin only) ────────────────────────────────────────────

function ToValidateSection({ invoices, onValidate, validateMutation }) {
  if (invoices.length === 0) return null;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem', border: '2px solid var(--green)' }}>
      <div style={{ padding: '1rem 1.25rem', background: 'var(--green-pale)', borderBottom: '1px solid rgba(34,160,94,.2)', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
        <Icon name="check-circle" size={18} color="var(--green)" />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>
          À valider
        </span>
        <span style={{ marginLeft: '.25rem', background: 'var(--green)', color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 700, padding: '1px 8px' }}>
          {invoices.length}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
          Total : {new Intl.NumberFormat('fr-FR').format(invoices.reduce((s, i) => s + Number(i.amount), 0))} F
        </span>
      </div>
      <div className="table-wrapper">
      <table className="simple">
        <thead>
          <tr>
            <th>Date</th>
            <th>Patient</th>
            <th>Encaissé par</th>
            <th>Mode</th>
            <th>Montant</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id}>
              <td className="text-sm" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--ink-soft)' }}>
                {fmtDate(inv.collected_at || inv.created_at)}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <Avatar firstName={inv.patient_first_name} lastName={inv.patient_last_name} />
                  <span className="fw-600 text-sm">{inv.patient_first_name} {inv.patient_last_name}</span>
                </div>
              </td>
              <td>
                {inv.collected_by_first_name ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <Avatar firstName={inv.collected_by_first_name} lastName={inv.collected_by_last_name} size="xs" />
                    <span className="text-sm">{inv.collected_by_first_name} {inv.collected_by_last_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </td>
              <td>{methodBadge(inv.payment_method)}</td>
              <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {fmt(inv.amount)}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 12 }}
                  disabled={validateMutation.isPending}
                  onClick={() => onValidate(inv)}
                >
                  Valider
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Admin financial stats ─────────────────────────────────────────────────────

function AdminFinancialStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/invoices/admin-stats'),
  });

  if (isLoading) {
    return (
      <div style={{ marginBottom: '1.75rem' }}>
        <div className="placeholder" style={{ height: 110, borderRadius: 14, marginBottom: '1rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="placeholder" style={{ height: 180, borderRadius: 14 }} />
          <div className="placeholder" style={{ height: 180, borderRadius: 14 }} />
        </div>
        <div className="placeholder" style={{ height: 160, borderRadius: 14 }} />
      </div>
    );
  }

  if (!stats) return null;

  // ── Delta vs last month ──────────────────────────────────────────────────────
  const delta = stats.last_month.revenue > 0
    ? Math.round(((stats.this_month.revenue - stats.last_month.revenue) / stats.last_month.revenue) * 100)
    : null;
  const deltaDir = delta === null ? null : delta >= 0 ? 'up' : 'down';

  // ── Bar chart ────────────────────────────────────────────────────────────────
  const maxRev = Math.max(...stats.monthly.map(m => m.revenue), 1);
  const MONTH_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  // ── Payment method totals ────────────────────────────────────────────────────
  const methodTotal = stats.by_method.reduce((s, m) => s + m.total, 0) || 1;

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
        <Icon name="chart" size={16} color="var(--green)" />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Analyse financière</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: '.25rem' }}>— 6 derniers mois</span>
      </div>

      {/* KPI cards */}
      <div className="grid-4 mb-3">
        <div className="kpi">
          <div className="kpi-accent" />
          <div className="kpi-label">CA ce mois</div>
          <div className="kpi-value">{fmt(stats.this_month.revenue)}</div>
          {delta !== null && (
            <div className={`kpi-delta${deltaDir === 'down' ? ' down' : ''}`}>
              <span>{deltaDir === 'down' ? '↓' : '↑'}</span>
              <span>{Math.abs(delta)}% vs mois dernier</span>
            </div>
          )}
        </div>

        <div className="kpi">
          <div className="kpi-accent" />
          <div className="kpi-label">CA mois précédent</div>
          <div className="kpi-value">{fmt(stats.last_month.revenue)}</div>
        </div>

        <div className="kpi">
          <div className="kpi-accent" />
          <div className="kpi-label">CA aujourd'hui</div>
          <div className="kpi-value">{fmt(stats.today.revenue)}</div>
          <div className="kpi-delta">
            <span>{stats.this_month.count} fact. ce mois</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-accent" style={{ background: stats.pending.count > 0 ? 'var(--gold)' : undefined }} />
          <div className="kpi-label">En attente de validation</div>
          <div className="kpi-value">{fmt(stats.pending.amount)}</div>
          {stats.pending.count > 0 && (
            <div className="kpi-delta down">
              <span>↕</span>
              <span>{stats.pending.count} facture{stats.pending.count > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* Revenue bar chart */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Évolution du chiffre d'affaires</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>6 mois</span>
          </div>
          {stats.monthly.length === 0 ? (
            <div className="text-sm text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
              Aucune donnée sur la période
            </div>
          ) : (() => {
            const BAR_MAX_PX = 100; // hauteur max d'une barre en pixels
            const lastMonth = stats.monthly[stats.monthly.length - 1]?.month;
            return (
              <div>
                {/* Zone des barres */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: BAR_MAX_PX + 28 }}>
                  {stats.monthly.map(m => {
                    const barH = m.revenue > 0
                      ? Math.max(Math.round((m.revenue / maxRev) * BAR_MAX_PX), 6)
                      : 2;
                    const isCurrent = m.month === lastMonth;
                    const monthIdx = parseInt(m.month.split('-')[1], 10) - 1;
                    return (
                      <div
                        key={m.month}
                        title={`${MONTH_FR[monthIdx]} : ${fmt(m.revenue)} — ${m.count} fact.`}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 0 }}
                      >
                        {/* Valeur au-dessus */}
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: isCurrent ? 'var(--green)' : 'var(--ink-soft)',
                          fontVariantNumeric: 'tabular-nums',
                          marginBottom: 4,
                          lineHeight: 1,
                        }}>
                          {m.revenue >= 1000
                            ? (m.revenue / 1000).toFixed(0) + 'k'
                            : m.revenue > 0 ? m.revenue : ''}
                        </div>
                        {/* Barre */}
                        <div style={{
                          width: '100%',
                          height: barH,
                          borderRadius: '5px 5px 0 0',
                          background: isCurrent
                            ? 'var(--green)'
                            : 'rgba(13,122,95,.28)',
                          position: 'relative',
                          overflow: 'hidden',
                        }}>
                          {isCurrent && (
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: 'linear-gradient(180deg, rgba(255,255,255,.22) 0%, transparent 55%)',
                            }} />
                          )}
                        </div>
                        {/* Label mois */}
                        <div style={{
                          fontSize: 10,
                          marginTop: 5,
                          color: isCurrent ? 'var(--green)' : 'var(--muted)',
                          fontWeight: isCurrent ? 700 : 400,
                        }}>
                          {MONTH_FR[monthIdx]}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Ligne de base */}
                <div style={{ height: 2, borderRadius: 99, background: 'var(--border)', marginTop: 0 }} />
              </div>
            );
          })()}
        </div>

        {/* Payment method breakdown */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: '1rem' }}>
            Répartition par mode de paiement
          </div>
          {stats.by_method.length === 0 ? (
            <div className="text-sm text-muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
              Aucune donnée
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats.by_method.map(m => {
                const opt = MOMO_OPTIONS.find(o => o.id === m.method);
                const pct = Math.round((m.total / methodTotal) * 100);
                return (
                  <div key={m.method}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.35rem' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>
                        {opt?.label ?? m.method}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(m.total)}
                        <span style={{ marginLeft: '.4rem', fontWeight: 700, color: 'var(--ink)' }}>
                          {pct}%
                        </span>
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'var(--green)',
                          borderRadius: 99,
                          transition: 'width .4s ease',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: '.25rem' }}>
                      {m.count} transaction{m.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top 5 doctors */}
      {stats.by_doctor.length > 0 && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: '1rem' }}>
            Top médecins par chiffre d'affaires
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
            {stats.by_doctor.map((doc, idx) => {
              const maxTotal = stats.by_doctor[0]?.total || 1;
              const pct = Math.max(Math.round((doc.total / maxTotal) * 100), 2);
              const rankColor = idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7c3a' : 'var(--muted)';
              return (
                <div key={doc.doctor_id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <div style={{ width: 20, textAlign: 'center', fontSize: 12, fontWeight: 800, color: rankColor }}>
                    #{idx + 1}
                  </div>
                  <Avatar firstName={doc.first_name} lastName={doc.last_name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        Dr {doc.first_name} {doc.last_name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(doc.total)}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: idx === 0 ? 'var(--green)' : 'var(--green)',
                          opacity: 1 - idx * 0.15,
                          borderRadius: 99,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 55, textAlign: 'right' }}>
                    {doc.count} fact.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { user } = useContext(AuthContext);
  const [showModal, setShowModal]   = useState(false);
  const [paying, setPaying]         = useState(null);
  const [validating, setValidating] = useState(null);
  const [tab, setTab]               = useState('all'); // 'all' | 'pending' | 'collected' | 'paid'
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading, isError } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoices'),
  });

  const cancelMutation = useMutation({
    mutationFn: (invoice) => api.patch(`/invoices/${invoice.id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const validateMutation = useMutation({
    mutationFn: (invoice) => api.patch(`/invoices/${invoice.id}/validate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  // ── Data slices
  const paidList      = invoices.filter(i => i.status === 'paid');
  const pendingList   = invoices.filter(i => i.status === 'pending');
  const collectedList = invoices.filter(i => i.status === 'collected');

  const totalPaid      = paidList.reduce((s, i) => s + Number(i.amount), 0);
  const totalPending   = pendingList.reduce((s, i) => s + Number(i.amount), 0);
  const totalCollected = collectedList.reduce((s, i) => s + Number(i.amount), 0);

  const momoCount = paidList.filter(i => i.payment_method && i.payment_method !== 'cash').length;
  const momoPct   = paidList.length > 0 ? Math.round((momoCount / paidList.length) * 100) : 0;

  // ── Tab filtering
  const TAB_LABELS = {
    all:       'Toutes',
    pending:   'En attente',
    collected: 'À valider',
    paid:      'Validées',
  };

  const tabFilter = {
    all:       invoices,
    pending:   pendingList,
    collected: collectedList,
    paid:      paidList,
  };

  const visibleInvoices = tabFilter[tab] ?? invoices;

  // Admin tabs include 'collected'; others don't need it
  const tabs = user?.role === 'admin'
    ? ['all', 'pending', 'collected', 'paid']
    : ['all', 'pending', 'paid'];

  return (
    <div className="page-content">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1>Facturation</h1>
          <div className="subtitle">Encaissements &amp; suivi des paiements</div>
        </div>
        <div className="page-header-actions">
          {user?.role === 'secretary' && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Icon name="plus" size={16} />
              Nouvelle facture
            </button>
          )}
        </div>
      </div>

      {/* KPIs — admin gets full financial analytics, others get a lightweight summary */}
      {user?.role === 'admin' ? (
        <AdminFinancialStats />
      ) : (
        <div className="grid-4 mb-3">
          <KPI
            label="Validé (total)"
            value={fmt(totalPaid)}
            delta={`${paidList.length} facture${paidList.length !== 1 ? 's' : ''}`}
            loading={isLoading}
          />
          <KPI
            label="À encaisser"
            value={fmt(totalPending)}
            delta={`${pendingList.length} facture${pendingList.length !== 1 ? 's' : ''}`}
            deltaDir="down"
            loading={isLoading}
          />
          <KPI
            label="En attente de validation"
            value={fmt(totalCollected)}
            delta={collectedList.length > 0 ? `${collectedList.length} à valider` : 'Aucune'}
            deltaDir="down"
            loading={isLoading}
          />
          <KPI
            label="Mobile Money"
            value={paidList.length > 0 ? `${momoPct}%` : '—'}
            delta="des paiements validés"
            loading={isLoading}
          />
        </div>
      )}

      {/* Admin: À valider highlight section */}
      {user?.role === 'admin' && !isLoading && collectedList.length > 0 && (
        <ToValidateSection
          invoices={collectedList}
          onValidate={setValidating}
          validateMutation={validateMutation}
        />
      )}

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t}
            className={`tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
            {t === 'collected' && collectedList.length > 0 && (
              <span style={{ marginLeft: '.35rem', background: 'var(--green)', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                {collectedList.length}
              </span>
            )}
            {t === 'pending' && pendingList.length > 0 && (
              <span style={{ marginLeft: '.35rem', background: 'var(--gold)', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                {pendingList.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isError ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--red)' }}>
            <Icon name="warning" size={28} style={{ marginBottom: '.5rem', opacity: .6 }} />
            <div>Erreur lors du chargement</div>
          </div>
        ) : isLoading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="placeholder" style={{ height: 52, borderRadius: 10 }} />)}
          </div>
        ) : visibleInvoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="invoice" size={26} style={{ opacity: .55 }} />
            </div>
            <div className="empty-state-title">Aucune facture</div>
            <div className="empty-state-desc">
              {tab === 'collected'
                ? 'Toutes les factures encaissées ont été validées'
                : 'Les factures apparaissent ici automatiquement'}
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
          <table className="simple">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Détail</th>
                <th>Montant</th>
                <th>Mode</th>
                <th>Encaissé par</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleInvoices.map(inv => {
                const s = STATUS_MAP[inv.status] || { cls: 'muted', label: inv.status };
                return (
                  <tr key={inv.id}>
                    <td className="text-sm" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--ink-soft)' }}>
                      {fmtDate(inv.created_at)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                        <Avatar firstName={inv.patient_first_name} lastName={inv.patient_last_name} />
                        <span className="fw-600 text-sm">{inv.patient_first_name} {inv.patient_last_name}</span>
                      </div>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--ink-soft)', maxWidth: 180 }}>
                      {inv.notes || 'Consultation médicale'}
                    </td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {fmt(inv.amount)}
                    </td>
                    <td>{methodBadge(inv.payment_method)}</td>
                    <td>
                      {inv.collected_by_first_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          <Avatar firstName={inv.collected_by_first_name} lastName={inv.collected_by_last_name} size="xs" />
                          <span className="text-sm">{inv.collected_by_first_name} {inv.collected_by_last_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${s.cls}`}>
                        <span className="dot-mark" />{s.label}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '.4rem' }}>
                        {/* Secretary: encaisse les factures pending */}
                        {user?.role === 'secretary' && inv.status === 'pending' && (
                          <>
                            <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }} onClick={() => setPaying(inv)}>
                              Encaisser
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => cancelMutation.mutate(inv)}>
                              Annuler
                            </button>
                          </>
                        )}
                        {/* Admin: valide les factures collected */}
                        {user?.role === 'admin' && inv.status === 'collected' && (
                          <>
                            <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }} onClick={() => setValidating(inv)}>
                              Valider
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => cancelMutation.mutate(inv)}>
                              Annuler
                            </button>
                          </>
                        )}
                        {/* Admin: peut aussi annuler les pending */}
                        {user?.role === 'admin' && inv.status === 'pending' && (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => cancelMutation.mutate(inv)}>
                            Annuler
                          </button>
                        )}
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

      {showModal   && <InvoiceModal onClose={() => setShowModal(false)} />}
      {paying      && <PayModal invoice={paying} onClose={() => setPaying(null)} />}
      {validating  && <ValidateModal invoice={validating} onClose={() => setValidating(null)} />}
    </div>
  );
}

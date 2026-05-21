import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const MOMO_OPTIONS = [
  { id: 'orange_money', label: 'Orange Money', cls: 'momo-orange', abbr: 'OM' },
  { id: 'wave',         label: 'Wave',         cls: 'momo-wave',   abbr: 'WV' },
  { id: 'mtn_money',   label: 'MTN Money',    cls: 'momo-mtn',    abbr: 'MTN' },
  { id: 'moov_money',  label: 'Moov Money',   cls: 'momo-moov',   abbr: 'MV' },
  { id: 'cash',        label: 'Espèces',      cls: null,           abbr: null },
];

const STATUS_MAP = {
  pending:   { cls: 'gold',  label: 'En attente' },
  paid:      { cls: 'green', label: 'Payée' },
  cancelled: { cls: 'red',   label: 'Annulée' },
};

function fmt(amount) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' XOF';
}

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
              <label>Montant (XOF)</label>
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
              <label>Notes (optionnel)</label>
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
          <h2>Enregistrer le paiement</h2>
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
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 1rem', cursor: 'pointer', background: 'none', border: undefined }}
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
              {mutation.isPending ? 'Enregistrement…' : 'Confirmer le paiement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, onPay, onCancel }) {
  const s = STATUS_MAP[invoice.status] || { cls: 'muted', label: invoice.status };
  const date = new Date(invoice.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const momoOpt = invoice.payment_method ? MOMO_OPTIONS.find(o => o.id === invoice.payment_method) : null;

  return (
    <div className="data-row" style={{ alignItems: 'center' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: 'var(--green-paler, #e8f5f1)', display: 'grid', placeItems: 'center', color: 'var(--green)',
      }}>
        <Icon name="invoice" size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>
          {invoice.patient_first_name} {invoice.patient_last_name}
        </div>
        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
          {date}
          {momoOpt && ` · ${momoOpt.label}`}
          {invoice.notes && ` · ${invoice.notes}`}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{fmt(invoice.amount)}</div>
        <span className={`badge ${s.cls}`}><span className="dot-mark" />{s.label}</span>
        {invoice.status === 'pending' && (
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => onPay(invoice)} style={{ fontSize: 12 }}>
              Payer
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onCancel(invoice)} style={{ fontSize: 12 }}>
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [showModal, setShowModal] = useState(false);
  const [paying, setPaying] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading, isError } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () => api.get(`/invoices${statusFilter ? `?status=${statusFilter}` : ''}`),
  });

  const cancelMutation = useMutation({
    mutationFn: (invoice) => api.patch(`/invoices/${invoice.id}/cancel`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Facturation</h1>
          <div className="subtitle">
            {isLoading ? '…' : `${invoices.length} facture${invoices.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Icon name="plus" size={16} />
            Nouvelle facture
          </button>
        </div>
      </div>

      {!isLoading && !isError && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div className="text-xs text-muted" style={{ marginBottom: '.35rem' }}>En attente</div>
            <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--gold)' }}>{fmt(totalPending)}</div>
          </div>
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div className="text-xs text-muted" style={{ marginBottom: '.35rem' }}>Encaissé</div>
            <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--green)' }}>{fmt(totalPaid)}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {['', 'pending', 'paid', 'cancelled'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12 }}
              onClick={() => setStatusFilter(s)}
            >
              {s === '' ? 'Toutes' : STATUS_MAP[s]?.label ?? s}
            </button>
          ))}
        </div>

        {isError ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--red)' }}>
            <Icon name="warning" size={28} style={{ marginBottom: '.5rem', opacity: .6 }} />
            <div>Erreur lors du chargement</div>
          </div>
        ) : isLoading ? (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {[1, 2, 3].map(i => <div key={i} className="placeholder" style={{ height: 64, borderRadius: 10 }} />)}
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="invoice" size={36} style={{ opacity: .2, marginBottom: '.75rem' }} />
            <div style={{ fontWeight: 500, color: 'var(--ink)' }}>Aucune facture</div>
            <div className="text-xs" style={{ marginTop: '.35rem' }}>
              {statusFilter ? 'Aucune facture avec ce statut' : 'Créez votre première facture avec le bouton ci-dessus'}
            </div>
          </div>
        ) : (
          <div className="data-list">
            {invoices.map(inv => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                onPay={setPaying}
                onCancel={(i) => cancelMutation.mutate(i)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && <InvoiceModal onClose={() => setShowModal(false)} />}
      {paying && <PayModal invoice={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}

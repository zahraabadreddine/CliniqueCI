import { useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

/* ── helpers ── */
function fmtDate(iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', opts);
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function fmtAmount(val) {
  const n = Number(val);
  if (isNaN(n)) return '—';
  return n.toLocaleString('fr-FR') + ' FCFA';
}

/* ── sub-components ── */

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
      <Icon name={icon} size={38} style={{ opacity: .2, marginBottom: '.85rem', display: 'block', margin: '0 auto .85rem' }} />
      <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 15 }}>{title}</div>
      {sub && <div className="text-xs" style={{ marginTop: '.35rem' }}>{sub}</div>}
    </div>
  );
}

function ApptBadge({ status }) {
  const map = {
    confirmed: { cls: 'green', label: 'Confirmé' },
    pending:   { cls: 'gold',  label: 'En attente' },
    completed: { cls: 'muted', label: 'Terminé' },
    cancelled: { cls: 'red',   label: 'Annulé' },
  };
  const m = map[status] || { cls: 'muted', label: status };
  return <span className={`badge ${m.cls}`}><span className="dot-mark" />{m.label}</span>;
}

function InvoiceBadge({ status }) {
  const map = {
    pending:   { cls: 'gold', label: 'En attente' },
    paid:      { cls: 'green', label: 'Payée' },
    cancelled: { cls: 'red',  label: 'Annulée' },
  };
  const m = map[status] || { cls: 'muted', label: status };
  return <span className={`badge ${m.cls}`}><span className="dot-mark" />{m.label}</span>;
}

/* ── tabs ── */

function TabDossier({ patient }) {
  const initials = (patient.first_name?.[0] ?? '') + (patient.last_name?.[0] ?? '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* avatar + nom */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg,#2ec472,#22a05e)',
          display: 'grid', placeItems: 'center',
          color: '#fff', fontSize: 22, fontWeight: 700,
          flexShrink: 0, letterSpacing: 1,
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
            {patient.first_name} {patient.last_name}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 3 }}>
            Patient · dossier ouvert le {fmtDate(patient.created_at)}
          </div>
          {patient.blood_type && (
            <span className="badge blue" style={{ marginTop: 6 }}>
              <Icon name="heart" size={11} style={{ marginRight: 3 }} />
              {patient.blood_type}
            </span>
          )}
        </div>
      </div>

      {/* infos */}
      <div className="card">
        <h3 style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: '1rem' }}>
          Informations personnelles
        </h3>
        <div className="data-list">
          {[
            ['Date de naissance', fmtDate(patient.date_of_birth)],
            ['Téléphone',         patient.phone  || '—'],
            ['Email',             patient.email  || '—'],
            ['Groupe sanguin',    patient.blood_type || '—'],
          ].map(([label, value]) => (
            <div key={label} className="data-row" style={{ paddingBlock: '.6rem' }}>
              <div className="text-xs text-muted" style={{ width: 140, flexShrink: 0 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* allergies */}
      {patient.allergies && (
        <div style={{ padding: '1rem', background: 'var(--red-soft)', borderRadius: 12, border: '1px solid var(--red-border, #f5c6c3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
            <Icon name="warning" size={15} style={{ color: 'var(--red)' }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--red)' }}>Allergies connues</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink)' }}>{patient.allergies}</div>
        </div>
      )}
    </div>
  );
}

function TabConsultations({ consultations }) {
  if (!consultations?.length) {
    return <EmptyState icon="stethoscope" title="Aucune consultation" sub="Vos consultations apparaîtront ici après votre première visite" />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      {consultations.map(c => (
        <div key={c.id} className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: 'var(--green-pale)', display: 'grid', placeItems: 'center', color: 'var(--green)',
            }}>
              <Icon name="stethoscope" size={17} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                  {c.chief_complaint || 'Consultation générale'}
                </div>
                <div className="text-xs text-muted">{fmtDate(c.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
              {c.diagnosis && (
                <div style={{ marginTop: '.4rem', fontSize: 13, color: 'var(--ink-soft)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--muted)' }}>Diagnostic : </span>
                  {c.diagnosis}
                </div>
              )}
              {c.notes && (
                <div style={{ marginTop: '.35rem', fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>
                  {c.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabOrdonnances({ prescriptions }) {
  if (!prescriptions?.length) {
    return <EmptyState icon="pill" title="Aucune ordonnance" sub="Vos ordonnances s'afficheront ici après chaque prescription" />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {prescriptions.map(p => (
        <div key={p.id} className="rx-doc">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <Icon name="pill" size={15} style={{ color: 'var(--green)' }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--green)' }}>Ordonnance</span>
            </div>
            <div className="text-xs text-muted">
              {fmtDate(p.created_at, { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {(p.medications || []).map((med, i) => (
              <div key={i} className="rx-line">
                <span className="rx-pos">{i + 1}</span>
                <div className="rx-med">
                  <span style={{ fontWeight: 600 }}>{med.name}</span>
                  <span style={{ color: 'var(--muted)' }}> — {med.dosage}</span>
                  <div className="text-xs" style={{ color: 'var(--muted)', marginTop: 2 }}>
                    {med.instructions || med.frequency
                      ? `${med.instructions || med.frequency} · `
                      : ''}{med.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {p.notes && (
            <div style={{ marginTop: '.85rem', paddingTop: '.75rem', borderTop: '1px dashed var(--border)', fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>
              <Icon name="info" size={11} style={{ marginRight: 4 }} />
              {p.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TabFactures({ invoices }) {
  if (!invoices?.length) {
    return <EmptyState icon="invoice" title="Aucune facture" sub="Vos factures s'afficheront ici après chaque consultation" />;
  }

  const payMethodLabel = { cash: 'Espèces', wave: 'Wave', orange_money: 'Orange Money', mtn_money: 'MTN Money', moov_money: 'Moov Money' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      {invoices.map(inv => (
        <div key={inv.id} className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11, flexShrink: 0,
              background: inv.status === 'paid' ? 'var(--green-pale)' : inv.status === 'cancelled' ? 'var(--red-soft)' : 'var(--gold-soft)',
              display: 'grid', placeItems: 'center',
              color: inv.status === 'paid' ? 'var(--green)' : inv.status === 'cancelled' ? 'var(--red)' : 'var(--gold)',
            }}>
              <Icon name={inv.status === 'paid' ? 'check' : inv.status === 'cancelled' ? 'warning' : 'invoice'} size={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                  {fmtAmount(inv.amount)}
                </div>
                <InvoiceBadge status={inv.status} />
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 4, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>
                  <Icon name="calendar" size={11} style={{ marginRight: 3 }} />
                  {fmtDate(inv.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {inv.status === 'paid' && inv.payment_method && (
                  <span>
                    <Icon name="wallet" size={11} style={{ marginRight: 3 }} />
                    {payMethodLabel[inv.payment_method] || inv.payment_method}
                    {inv.paid_at && ` · ${fmtDate(inv.paid_at, { day: 'numeric', month: 'short' })}`}
                  </span>
                )}
                {inv.notes && <span style={{ fontStyle: 'italic' }}>{inv.notes}</span>}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* résumé total payé */}
      {invoices.some(i => i.status === 'paid') && (
        <div style={{
          marginTop: '.5rem', padding: '.9rem 1.25rem',
          background: 'var(--green-pale)', borderRadius: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>Total réglé</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--green)' }}>
            {fmtAmount(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0))}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── main page ── */

const TABS = [
  { id: 'dossier',       label: 'Dossier',       icon: 'file'        },
  { id: 'consultations', label: 'Consultations',  icon: 'stethoscope' },
  { id: 'ordonnances',   label: 'Ordonnances',    icon: 'pill'        },
  { id: 'factures',      label: 'Factures',       icon: 'invoice'     },
];

export default function MyRecordsPage() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const initialTab = location.state?.tab || 'dossier';
  const [activeTab, setActiveTab] = useState(initialTab);

  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['my-records'],
    queryFn: () => api.get('/patients/me/history'),
    retry: false,
  });

  const patient = history?.patient;

  function badge(tab) {
    if (!history) return null;
    const counts = {
      consultations: history.consultations?.length,
      ordonnances:   history.prescriptions?.length,
      factures:      history.invoices?.length,
    };
    const n = counts[tab.id];
    if (!n) return null;
    return (
      <span style={{
        marginLeft: 5, background: 'var(--green)', color: '#fff',
        borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 600,
      }}>{n}</span>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Mon dossier médical</h1>
          <div className="subtitle">Consultations, ordonnances, factures et informations</div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="placeholder" style={{ height: 100, borderRadius: 14 }} />
          ))}
        </div>
      ) : isError || !patient ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center' }}>
          <Icon name="file" size={44} style={{ opacity: .15, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
          <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 16 }}>Dossier non disponible</div>
          <div className="text-xs text-muted" style={{ marginTop: '.5rem' }}>
            Votre dossier sera visible après votre première consultation
          </div>
        </div>
      ) : (
        <>
          {/* tabs nav */}
          <div className="tabs" style={{ marginBottom: '1.5rem' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}
              >
                <Icon name={tab.icon} size={14} />
                {tab.label}
                {badge(tab)}
              </button>
            ))}
          </div>

          {/* tab content */}
          {activeTab === 'dossier'       && <TabDossier       patient={patient} />}
          {activeTab === 'consultations' && <TabConsultations consultations={history.consultations} />}
          {activeTab === 'ordonnances'   && <TabOrdonnances   prescriptions={history.prescriptions} />}
          {activeTab === 'factures'      && <TabFactures      invoices={history.invoices} />}
        </>
      )}
    </div>
  );
}

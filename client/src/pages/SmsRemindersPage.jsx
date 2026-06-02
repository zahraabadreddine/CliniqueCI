import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { AuthContext } from '../App';

/* ── méta ──────────────────────────────────────────────────────────────── */
const TYPE_META = {
  confirmation: { label: 'Confirmation', bg: '#ede9fe', color: '#6d28d9' },
  reminder_48h: { label: '48h avant',    bg: '#dbeafe', color: '#1d4ed8' },
  reminder_2h:  { label: '2h avant',     bg: '#fef3c7', color: '#b45309' },
};
const STATUS_META = {
  pending: { label: 'En attente', bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' },
  sent:    { label: 'Envoyé',     bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  failed:  { label: 'Échoué',    bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
};
const FILTERS = [
  { v: '',        label: 'Tous' },
  { v: 'pending', label: 'En attente' },
  { v: 'sent',    label: 'Envoyés' },
  { v: 'failed',  label: 'Échoués' },
];
const LIMIT = 25;

function fmt(date) {
  return new Date(date).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function SmsRemindersPage() {
  const { user } = useContext(AuthContext);
  return user?.role === 'admin' ? <AdminView /> : <SecretaryView />;
}

/* ══════════════════════════════════════════════════════════════
   VUE ADMIN — lecture seule, tableau de bord de supervision
══════════════════════════════════════════════════════════════ */
function AdminView() {
  const [filter, setFilter] = useState('');
  const [page,   setPage]   = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['sms-reminders-admin', filter, page],
    queryFn: () =>
      api.get(`/sms-reminders?${filter ? `status=${filter}&` : ''}limit=${LIMIT}&offset=${page * LIMIT}`),
    refetchInterval: 60_000,
  });
  const { data: stats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: () => api.get('/sms-reminders/stats'),
    refetchInterval: 60_000,
  });

  const reminders  = data?.reminders ?? [];
  const total      = data?.total     ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const pending      = stats?.pending ?? 0;
  const sent         = stats?.sent    ?? 0;
  const failed       = stats?.failed  ?? 0;
  const totalSms     = pending + sent + failed;
  const deliveryRate = totalSms > 0 ? Math.round((sent / totalSms) * 100) : 0;

  return (
    <div className="page-content">

      {/* en-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0d7a5f', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📊</span> Supervision des rappels SMS
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            Vue d'ensemble — les actions sont gérées par la secrétaire
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d1fae5', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#065f46', fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          Cron actif · toutes les 15 min
        </div>
      </div>

      {/* cartes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard value={totalSms} label="Total SMS"   sub="depuis le début"             bg="#f9fafb" color="#111827" icon="📨" />
        <StatCard value={pending}  label="En attente"  sub="à envoyer prochainement"      bg="#fefce8" color="#92400e" icon="⏳" highlight={pending > 0} />
        <StatCard value={sent}     label="Envoyés"     sub={`${deliveryRate}% livraison`} bg="#f0fdf4" color="#065f46" icon="✅" />
        <StatCard value={failed}   label="Échoués"     sub={failed > 0 ? 'retry auto ×3' : 'aucun problème'} bg={failed > 0 ? '#fef2f2' : '#f9fafb'} color={failed > 0 ? '#991b1b' : '#6b7280'} icon={failed > 0 ? '❌' : '—'} highlight={failed > 0} />
      </div>

      {/* barre livraison */}
      {totalSms > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>Taux de livraison global</span>
            <span style={{ fontWeight: 700, color: deliveryRate >= 90 ? '#065f46' : deliveryRate >= 70 ? '#b45309' : '#991b1b' }}>
              {deliveryRate} %
            </span>
          </div>
          <div style={{ height: 8, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${deliveryRate}%`, background: deliveryRate >= 90 ? '#10b981' : deliveryRate >= 70 ? '#f59e0b' : '#ef4444', transition: 'width .4s' }} />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, color: '#6b7280' }}>
            <span>📨 {totalSms} total</span>
            <span style={{ color: '#10b981' }}>✅ {sent} envoyés</span>
            <span style={{ color: '#f59e0b' }}>⏳ {pending} en attente</span>
            {failed > 0 && <span style={{ color: '#ef4444' }}>❌ {failed} échoués (retry auto)</span>}
          </div>
        </div>
      )}

      {/* tableau lecture seule */}
      <ReminderTable
        reminders={reminders} isLoading={isLoading}
        filter={filter} setFilter={(f) => { setFilter(f); setPage(0); }}
        total={total} page={page} setPage={setPage} totalPages={totalPages}
        pending={pending} failed={failed}
        showActions={false}
      />
    </div>
  );
}

/* ── templates SMS prédéfinis ──────────────────────────────────────────── */
const TEMPLATES = [
  {
    label: '✅ Confirmation RDV',
    text: 'Bonjour, votre rendez-vous est bien confirmé. Nous vous attendons à l\'heure prévue. Merci de votre confiance.',
  },
  {
    label: '⏰ Rappel RDV',
    text: 'Bonjour, nous vous rappelons votre rendez-vous demain. Merci de nous contacter si vous ne pouvez pas vous déplacer.',
  },
  {
    label: '❌ RDV annulé',
    text: 'Bonjour, nous sommes dans l\'impossibilité de maintenir votre rendez-vous. Merci de nous appeler pour reprogrammer.',
  },
  {
    label: '💊 Ordonnance prête',
    text: 'Bonjour, votre ordonnance est prête. Vous pouvez venir la récupérer à la clinique aux heures d\'ouverture.',
  },
  {
    label: '🔬 Résultats disponibles',
    text: 'Bonjour, vos résultats d\'analyse sont disponibles. Merci de vous présenter à l\'accueil ou de nous contacter.',
  },
];

/* ══════════════════════════════════════════════════════════════
   VUE SECRÉTAIRE — gestion complète (envoyer / relancer / annuler)
══════════════════════════════════════════════════════════════ */
const MAX_SMS_CHARS = 160;
const MAX_BODY_CHARS = 300; // 20 chars réservés pour la signature

function SecretaryView() {
  const qc = useQueryClient();
  const [filter,    setFilter]    = useState('');
  const [page,      setPage]      = useState(0);
  // compose state
  const [phone,     setPhone]     = useState('');
  const [message,   setMessage]   = useState('');
  const [feedback,  setFeedback]  = useState(null); // { ok, msg }
  const [orgName,   setOrgName]   = useState(null); // nom clinique (retourné après 1er envoi)

  const { data, isLoading } = useQuery({
    queryKey: ['sms-reminders-sec', filter, page],
    queryFn: () =>
      api.get(`/sms-reminders?${filter ? `status=${filter}&` : ''}limit=${LIMIT}&offset=${page * LIMIT}`),
    refetchInterval: 60_000,
  });
  const { data: stats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: () => api.get('/sms-reminders/stats'),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries(['sms-reminders-sec']);
    qc.invalidateQueries(['sms-stats']);
  };

  const retryMut = useMutation({
    mutationFn: (id) => api.post(`/sms-reminders/${id}/retry`, {}),
    onSuccess: invalidate,
  });
  const cancelMut = useMutation({
    mutationFn: (id) => api.del(`/sms-reminders/${id}`),
    onSuccess: invalidate,
  });
  const sendMut = useMutation({
    mutationFn: () => api.post('/sms-reminders/send', { phone: phone.trim(), message: message.trim() }),
    onSuccess: (r) => {
      if (r.orgName) setOrgName(r.orgName);
      setFeedback({ ok: true, msg: `SMS envoyé à ${phone}${r.mock ? ' — mode simulé' : ''}` });
      setPhone('');
      setMessage('');
    },
    onError: (e) => setFeedback({ ok: false, msg: e.message ?? 'Erreur lors de l\'envoi' }),
  });

  const reminders  = data?.reminders ?? [];
  const total      = data?.total     ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const pending    = stats?.pending  ?? 0;
  const sent       = stats?.sent     ?? 0;
  const failed     = stats?.failed   ?? 0;

  const bodyLen      = message.length;
  const charsLeft    = MAX_BODY_CHARS - bodyLen;
  const totalLen     = bodyLen + (orgName ? `\n— ${orgName}`.length : 22); // estimation signature
  const smsCount     = totalLen > 0 ? Math.ceil(totalLen / MAX_SMS_CHARS) : 1;
  const canSend      = phone.trim().length > 0 && message.trim().length > 0 && bodyLen <= MAX_BODY_CHARS && !sendMut.isPending;

  return (
    <div className="page-content">

      {/* en-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0d7a5f', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📱</span> Rappels SMS
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
            Confirmation immédiate · rappel automatique 48h et 2h avant le rendez-vous
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#d1fae5', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#065f46', fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          Cron actif · toutes les 15 min
        </div>
      </div>

      {/* cartes stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard value={pending} label="En attente"  sub="seront envoyés prochainement" bg="#fefce8" color="#92400e" icon="⏳" highlight={pending > 0} />
        <StatCard value={sent}    label="Envoyés"     sub="depuis le début"              bg="#f0fdf4" color="#065f46" icon="✅" />
        <StatCard value={failed}  label="Échoués"     sub={failed > 0 ? 'à relancer ci-dessous' : 'aucun problème'} bg={failed > 0 ? '#fef2f2' : '#f9fafb'} color={failed > 0 ? '#991b1b' : '#6b7280'} icon={failed > 0 ? '❌' : '—'} highlight={failed > 0} />
      </div>

      {/* alerte si des SMS ont échoué */}
      {failed > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <span style={{ fontSize: 18, marginTop: 1 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#991b1b' }}>{failed} SMS n'ont pas pu être envoyés</div>
            <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>
              Le système réessaie automatiquement 3 fois (toutes les 30 min). Vous pouvez aussi relancer manuellement depuis le tableau.
            </div>
          </div>
        </div>
      )}

      {/* ── Composer un SMS ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 2 }}>
          ✉️ Envoyer un SMS
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
          Contactez un patient directement — confirmation, changement d'horaire, information urgente…
        </div>

        {/* templates */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Modèles rapides
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {TEMPLATES.map(t => (
              <button
                key={t.label}
                onClick={() => { setMessage(t.text); setFeedback(null); }}
                style={{
                  border: message === t.text ? '1.5px solid #0d7a5f' : '1px solid #e5e7eb',
                  background: message === t.text ? '#f0fdf4' : '#fafafa',
                  color: message === t.text ? '#065f46' : '#374151',
                  borderRadius: 20, padding: '5px 13px', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, transition: 'all .15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* numéro */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
            Numéro de téléphone
          </label>
          <input
            value={phone}
            onChange={e => { setPhone(e.target.value); setFeedback(null); }}
            placeholder="+22507XXXXXXXX"
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* message */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
              Message
            </label>
            <span style={{ fontSize: 11, color: charsLeft < 0 ? '#ef4444' : charsLeft < 30 ? '#f59e0b' : '#9ca3af' }}>
              {charsLeft < 0
                ? `⚠️ ${Math.abs(charsLeft)} caractères de trop`
                : `${bodyLen} / ${MAX_BODY_CHARS} · ${smsCount} SMS`
              }
            </span>
          </div>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setFeedback(null); }}
            placeholder="Bonjour, votre rendez-vous de demain à 10h est confirmé. À bientôt !"
            rows={4}
            style={{
              width: '100%', border: `1px solid ${charsLeft < 0 ? '#fca5a5' : '#d1d5db'}`,
              borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none',
              resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />
          {/* aperçu signature */}
          <div style={{
            marginTop: 4, padding: '7px 12px',
            background: '#f9fafb', border: '1px solid #f3f4f6', borderTop: 'none',
            borderRadius: '0 0 8px 8px', fontSize: 12, color: '#9ca3af',
            fontStyle: 'italic',
          }}>
            {orgName ? `— ${orgName}` : '— [Nom de votre clinique]'}
            <span style={{ marginLeft: 8, fontStyle: 'normal', fontSize: 11, color: '#d1d5db' }}>
              (signature automatique)
            </span>
          </div>
        </div>

        {/* bouton envoi */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => sendMut.mutate()}
            disabled={!canSend}
            style={{
              background: canSend ? '#0d7a5f' : '#9ca3af',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 24px', fontWeight: 600, cursor: canSend ? 'pointer' : 'not-allowed',
              fontSize: 14, transition: 'background .15s',
            }}
          >
            {sendMut.isPending ? '⏳ Envoi en cours…' : '📤 Envoyer le SMS'}
          </button>
        </div>

        {/* feedback */}
        {feedback && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13, background: feedback.ok ? '#d1fae5' : '#fee2e2', color: feedback.ok ? '#065f46' : '#991b1b' }}>
            {feedback.ok ? '✅' : '❌'} {feedback.msg}
          </div>
        )}
      </div>

      {/* tableau avec actions */}
      <ReminderTable
        reminders={reminders} isLoading={isLoading}
        filter={filter} setFilter={(f) => { setFilter(f); setPage(0); }}
        total={total} page={page} setPage={setPage} totalPages={totalPages}
        pending={pending} failed={failed}
        showActions={true}
        onRetry={(id) => retryMut.mutate(id)}
        onCancel={(id) => cancelMut.mutate(id)}
        retryPending={retryMut.isPending}
        cancelPending={cancelMut.isPending}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TABLEAU PARTAGÉ
══════════════════════════════════════════════════════════════ */
function ReminderTable({
  reminders, isLoading, filter, setFilter,
  total, page, setPage, totalPages,
  pending, failed,
  showActions,
  onRetry, onCancel, retryPending, cancelPending,
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>

      {/* filtres */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginRight: 4 }}>Filtrer :</span>
        {FILTERS.map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} style={{
            border: `1px solid ${filter === f.v ? '#0d7a5f' : '#e5e7eb'}`,
            background: filter === f.v ? '#0d7a5f' : '#fafafa',
            color: filter === f.v ? '#fff' : '#6b7280',
            borderRadius: 20, padding: '4px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>
            {f.label}
            {f.v === 'failed'  && failed  > 0 && <span style={{ marginLeft: 5, background: '#ef4444', color: '#fff', borderRadius: 99, padding: '1px 5px', fontSize: 10 }}>{failed}</span>}
            {f.v === 'pending' && pending > 0 && <span style={{ marginLeft: 5, background: '#f59e0b', color: '#fff', borderRadius: 99, padding: '1px 5px', fontSize: 10 }}>{pending}</span>}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
          {total} résultat{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* corps */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>Chargement…</div>
      ) : reminders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 14 }}>Aucun SMS{filter ? ' avec ce statut' : ''}</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Patient', 'Téléphone', 'Type', 'RDV prévu', 'Envoi prévu', 'Statut', ...(showActions ? ['Actions'] : [])].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid #f3f4f6' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reminders.map((sms, i) => {
                const sm = STATUS_META[sms.status] ?? STATUS_META.pending;
                const tm = TYPE_META[sms.type]   ?? { label: sms.type, bg: '#f3f4f6', color: '#374151' };
                return (
                  <tr key={sms.id}
                    style={{ borderBottom: i < reminders.length - 1 ? '1px solid #f9fafb' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 14px', fontWeight: 600, color: '#111827' }}>{sms.patient_name}</td>
                    <td style={{ padding: '11px 14px', color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>
                      {sms.phone || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: tm.bg, color: tm.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{tm.label}</span>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151' }}>{fmt(sms.appointment_at)}</td>
                    <td style={{ padding: '11px 14px', color: '#374151' }}>{fmt(sms.scheduled_at)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: sm.bg, color: sm.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot }} />
                        {sm.label}
                      </span>
                    </td>
                    {showActions && (
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {sms.status === 'failed' && (
                            <button
                              onClick={() => onRetry(sms.id)}
                              disabled={retryPending}
                              title="Relancer l'envoi de ce SMS"
                              style={{ background: '#fff', color: '#d97706', border: '1px solid #fcd34d', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, opacity: retryPending ? .5 : 1 }}
                            >
                              ↩ Relancer
                            </button>
                          )}
                          {sms.status === 'pending' && (
                            <button
                              onClick={() => onCancel(sms.id)}
                              disabled={cancelPending}
                              title="Annuler ce rappel SMS"
                              style={{ background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, opacity: cancelPending ? .5 : 1 }}
                            >
                              ✕ Annuler
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, opacity: page === 0 ? .4 : 1 }}>
            ← Précédent
          </button>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Page {page + 1} / {totalPages}</span>
          <button disabled={(page + 1) * LIMIT >= total} onClick={() => setPage(p => p + 1)} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, opacity: (page + 1) * LIMIT >= total ? .4 : 1 }}>
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}

/* ── carte stat ─────────────────────────────────────────────────────────── */
function StatCard({ value, label, sub, bg, color, icon, highlight }) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${highlight ? color + '33' : '#e5e7eb'}`,
      borderRadius: 12, padding: '18px 20px',
      boxShadow: highlight ? `0 0 0 2px ${color}22` : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value ?? '…'}</div>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color, marginTop: 8 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{sub}</div>
    </div>
  );
}

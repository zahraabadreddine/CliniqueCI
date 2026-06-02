import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Icon from '../components/Icon';

const TYPE_META = {
  new_appointment:       { label: 'Nouveau RDV',         color: '#0d7a5f', bg: '#e6f4f1', icon: 'calendar' },
  appointment_confirmed: { label: 'RDV confirmé',        color: '#22a05e', bg: '#e2f8ec', icon: 'check'    },
  appointment_cancelled: { label: 'RDV annulé',          color: '#dc2626', bg: '#fef2f2', icon: 'close'    },
  patient_arrived:       { label: 'Patient arrivé',      color: '#d97706', bg: '#fffbeb', icon: 'bell'     },
  patient_in_room:       { label: 'En consultation',     color: '#156b3d', bg: '#e2f8ec', icon: 'stethoscope' },
  appointment_completed: { label: 'Consultation terminée', color: '#059669', bg: '#ecfdf5', icon: 'check'  },
  invoice_paid:          { label: 'Paiement reçu',       color: '#156b3d', bg: '#e2f8ec', icon: 'creditCard' },
  system:                { label: 'Système',             color: '#6b7280', bg: '#f9fafb', icon: 'info'     },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7)  return `Il y a ${days} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.get(`/notifications?page=${page}&limit=20`),
    keepPreviousData: true,
  });

  const markOne = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries(['notifications']);
      qc.invalidateQueries(['notif-unread-count']);
    },
  });

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries(['notifications']);
      qc.invalidateQueries(['notif-unread-count']);
    },
  });

  const handleClick = (notif) => {
    if (!notif.is_read) markOne.mutate(notif.id);
    if (notif.link) navigate(notif.link);
  };

  const notifications = data?.data ?? [];
  const total         = data?.total ?? 0;
  const totalPages    = Math.ceil(total / 20) || 1;
  const unreadCount   = notifications.filter(n => !n.is_read).length;

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Icon name="bell" size={22} color="var(--primary)" />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Notifications</h1>
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--primary)', color: '#fff',
              borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
              padding: '2px 8px', lineHeight: 1.4,
            }}>
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem', padding: '4px 12px' }}
            onClick={() => markAll.mutate()}
            disabled={markAll.isLoading}
          >
            Tout marquer lu
          </button>
        )}
      </div>

      {/* States */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <Icon name="refresh" size={28} />
          <p style={{ marginTop: '0.5rem' }}>Chargement…</p>
        </div>
      )}

      {isError && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#dc2626' }}>
          <Icon name="warning" size={28} />
          <p style={{ marginTop: '0.5rem' }}>Erreur lors du chargement.</p>
        </div>
      )}

      {!isLoading && !isError && notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--muted)' }}>
          <Icon name="bell" size={48} color="#d1d5db" />
          <p style={{ marginTop: '1rem', fontSize: '1rem' }}>Aucune notification pour le moment.</p>
          <p style={{ fontSize: '0.85rem' }}>Les alertes de rendez-vous apparaîtront ici.</p>
        </div>
      )}

      {/* List */}
      {notifications.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifications.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.system;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.9rem',
                  background: n.is_read ? 'var(--surface)' : '#fff',
                  border: `1.5px solid ${n.is_read ? 'var(--border)' : meta.color + '44'}`,
                  borderRadius: 12, padding: '0.85rem 1rem',
                  cursor: n.link ? 'pointer' : 'default',
                  transition: 'box-shadow .15s, border-color .15s',
                  boxShadow: n.is_read ? 'none' : '0 2px 8px 0 ' + meta.color + '18',
                }}
                onMouseEnter={e => { if (n.link) e.currentTarget.style.boxShadow = '0 4px 16px 0 ' + meta.color + '28'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = n.is_read ? 'none' : '0 2px 8px 0 ' + meta.color + '18'; }}
              >
                {/* Icon bubble */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon name={meta.icon} size={18} color={meta.color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{
                      fontWeight: n.is_read ? 500 : 700,
                      fontSize: '0.9rem',
                      color: 'var(--text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p style={{
                    margin: '2px 0 0',
                    fontSize: '0.82rem',
                    color: 'var(--muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.body}
                  </p>
                  {!n.is_read && (
                    <span style={{
                      display: 'inline-block', marginTop: 4,
                      background: meta.color, borderRadius: 99,
                      width: 7, height: 7,
                    }} />
                  )}
                </div>

                {/* Mark read button */}
                {!n.is_read && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.72rem', padding: '2px 8px', flexShrink: 0, alignSelf: 'center' }}
                    onClick={(e) => { e.stopPropagation(); markOne.mutate(n.id); }}
                    title="Marquer comme lu"
                  >
                    Lu
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setPage(p => p - 1)}
            disabled={page <= 1}
            style={{ padding: '6px 12px' }}
          >
            <Icon name="chevronLeft" size={16} />
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Page {page} / {totalPages}
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages}
            style={{ padding: '6px 12px' }}
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Icon from './Icon';

const TYPE_META = {
  new_appointment:       { color: '#0d7a5f', bg: '#e6f4f1', icon: 'calendar'     },
  appointment_confirmed: { color: '#22a05e', bg: '#e2f8ec', icon: 'check'         },
  appointment_cancelled: { color: '#dc2626', bg: '#fef2f2', icon: 'close'         },
  patient_arrived:       { color: '#d97706', bg: '#fffbeb', icon: 'bell'          },
  patient_in_room:       { color: '#156b3d', bg: '#e2f8ec', icon: 'stethoscope'   },
  appointment_completed: { color: '#059669', bg: '#ecfdf5', icon: 'check'         },
  invoice_paid:          { color: '#156b3d', bg: '#e2f8ec', icon: 'creditCard'    },
  system:                { color: '#6b7280', bg: '#f9fafb', icon: 'info'          },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "À l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7)  return `${days} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationsDropdown({ open, onClose }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const { data, isLoading } = useQuery({
    queryKey: ['notif-dropdown'],
    queryFn: () => api.get('/notifications?page=1&limit=10'),
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const markOne = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries(['notif-dropdown']);
      qc.invalidateQueries(['notif-unread-count']);
    },
  });

  const markAll = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries(['notif-dropdown']);
      qc.invalidateQueries(['notif-unread-count']);
    },
  });

  const handleClick = (notif) => {
    if (!notif.is_read) markOne.mutate(notif.id);
    if (notif.link) {
      navigate(notif.link);
      onClose();
    }
  };

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!open) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 56,
        right: 12,
        width: 360,
        maxWidth: 'calc(100vw - 24px)',
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.08)',
        border: '1px solid var(--border)',
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.85rem 1rem 0.7rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name="bell" size={17} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--primary)', color: '#fff',
              borderRadius: 99, fontSize: '0.68rem', fontWeight: 700,
              padding: '1px 7px', lineHeight: 1.5,
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', padding: '3px 10px' }}
            onClick={() => markAll.mutate()}
            disabled={markAll.isLoading}
          >
            Tout lire
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ overflowY: 'auto', maxHeight: 420 }}>
        {isLoading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
            <Icon name="refresh" size={20} />
            <p style={{ marginTop: 6 }}>Chargement…</p>
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="bell" size={36} color="#d1d5db" />
            <p style={{ marginTop: 8, fontSize: '0.85rem' }}>Aucune notification</p>
          </div>
        )}

        {notifications.map((n) => {
          const meta = TYPE_META[n.type] ?? TYPE_META.system;
          return (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.7rem 1rem',
                background: n.is_read ? 'transparent' : '#f8fffe',
                borderBottom: '1px solid var(--border)',
                cursor: n.link ? 'pointer' : 'default',
                transition: 'background .12s',
              }}
              onMouseEnter={e => { if (n.link) e.currentTarget.style.background = n.is_read ? 'var(--surface)' : '#f0faf7'; }}
              onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : '#f8fffe'; }}
            >
              {/* Icon bubble */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: meta.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                <Icon name={meta.icon} size={16} color={meta.color} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
                  <span style={{
                    fontSize: '0.82rem', fontWeight: n.is_read ? 500 : 700,
                    color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {n.title}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', flexShrink: 0 }}>
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                <p style={{
                  margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {n.body}
                </p>
              </div>

              {/* Unread dot */}
              {!n.is_read && (
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: meta.color, flexShrink: 0, marginTop: 6,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

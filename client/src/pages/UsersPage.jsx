import { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import Icon from '../components/Icon';

// ── helpers ──────────────────────────────────────────────────────────────────
const ROLE_LABELS = { admin: 'Admin', doctor: 'Médecin', secretary: 'Secrétaire', patient: 'Patient' };
const ROLE_BADGE  = { admin: 'blue', doctor: 'green', secretary: 'gold', patient: 'muted' };

const INVITE_ROLES = [
  { value: 'doctor',    label: 'Médecin' },
  { value: 'secretary', label: 'Secrétaire' },
];

function RoleBadge({ role }) {
  return (
    <span className={`badge ${ROLE_BADGE[role] ?? 'muted'}`}>
      <span className="dot-mark" />
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function initials(u) {
  return ((u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '')).toUpperCase();
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, danger = true, loading = false }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Icon name="warning" size={18} style={{ color: danger ? 'var(--red)' : 'var(--gold)' }} />
            {title}
          </h2>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Annuler</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'En cours…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── InviteModal ───────────────────────────────────────────────────────────────
function InviteModal({ onClose, onSuccess }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, reset } = useForm();
  const watchedRole = watch('role');

  const mutation = useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess: (user) => { reset(); onSuccess(user); },
  });

  const submit = handleSubmit(async (data) => {
    try { await mutation.mutateAsync(data); } catch {}
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>Inviter un membre du personnel</h2>
          <button className="btn btn-ghost btn-sm icon-btn" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-row">
            <div className="form-group">
              <label>Prénom *</label>
              <input
                className={`input ${errors.first_name ? 'input-error' : ''}`}
                placeholder="Aminata"
                {...register('first_name', { required: 'Champ requis' })}
              />
              {errors.first_name && <span className="field-error">{errors.first_name.message}</span>}
            </div>
            <div className="form-group">
              <label>Nom *</label>
              <input
                className={`input ${errors.last_name ? 'input-error' : ''}`}
                placeholder="Koné"
                {...register('last_name', { required: 'Champ requis' })}
              />
              {errors.last_name && <span className="field-error">{errors.last_name.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Adresse e-mail *</label>
            <input
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="aminata.kone@clinique.ci"
              {...register('email', {
                required: 'Champ requis',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email invalide' },
              })}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label>Rôle *</label>
            <select className={`input ${errors.role ? 'input-error' : ''}`} {...register('role', { required: 'Champ requis' })}>
              <option value="">— Sélectionner —</option>
              {INVITE_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.role && <span className="field-error">{errors.role.message}</span>}
          </div>

          {watchedRole === 'doctor' && (
            <div className="form-group">
              <label>Spécialité</label>
              <input
                className="input"
                placeholder="Ex : Cardiologie, Pédiatrie…"
                {...register('specialty')}
              />
            </div>
          )}

          <div className="form-group">
            <label>Mot de passe provisoire *</label>
            <input
              type="password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder="Minimum 8 caractères"
              {...register('password', {
                required: 'Champ requis',
                minLength: { value: 8, message: 'Minimum 8 caractères' },
              })}
            />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </div>

          {mutation.isError && (
            <div className="alert alert-error">
              {mutation.error?.message || 'Une erreur est survenue'}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Enregistrement…' : 'Inviter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── EditModal ─────────────────────────────────────────────────────────────────
function EditModal({ user: u, onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      first_name: u.first_name,
      last_name:  u.last_name,
      email:      u.email,
      specialty:  u.specialty ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => api.patch(`/users/${u.id}`, data),
    onSuccess: (updated) => onSuccess(updated),
  });

  const submit = handleSubmit(async (data) => {
    await mutation.mutateAsync(data);
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>Modifier le compte</h2>
          <button className="btn btn-ghost btn-sm icon-btn" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-row">
            <div className="form-group">
              <label>Prénom *</label>
              <input
                className={`input ${errors.first_name ? 'input-error' : ''}`}
                {...register('first_name', { required: 'Champ requis' })}
              />
              {errors.first_name && <span className="field-error">{errors.first_name.message}</span>}
            </div>
            <div className="form-group">
              <label>Nom *</label>
              <input
                className={`input ${errors.last_name ? 'input-error' : ''}`}
                {...register('last_name', { required: 'Champ requis' })}
              />
              {errors.last_name && <span className="field-error">{errors.last_name.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Adresse e-mail *</label>
            <input
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              {...register('email', {
                required: 'Champ requis',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email invalide' },
              })}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>

          {u.role === 'doctor' && (
            <div className="form-group">
              <label>Spécialité</label>
              <input
                className="input"
                placeholder="Ex : Cardiologie, Pédiatrie…"
                {...register('specialty')}
              />
            </div>
          )}

          <div className="form-group">
            <label>Rôle</label>
            <input
              className="input"
              value={ROLE_LABELS[u.role] ?? u.role}
              disabled
              style={{ opacity: .6, cursor: 'not-allowed' }}
            />
            <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
              Le rôle ne peut pas être modifié après création.
            </span>
          </div>

          {mutation.isError && (
            <div className="alert alert-error">
              {mutation.error?.message || 'Une erreur est survenue'}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── UserRow ───────────────────────────────────────────────────────────────────
function UserRow({ user: u, currentUserId, onEdit, onToggleStatus }) {
  const isCurrentUser = u.id === currentUserId;
  const isSuspended   = u.is_active === false;

  const joined = u.created_at
    ? new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="data-row" style={{ alignItems: 'center', gap: '1rem', opacity: isSuspended ? 0.55 : 1 }}>
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: isSuspended
          ? 'var(--border)'
          : (u.role === 'doctor' ? 'var(--green-pale)' : 'var(--cream)'),
        display: 'grid', placeItems: 'center',
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 700, fontSize: 14,
        color: isSuspended
          ? 'var(--muted)'
          : (u.role === 'doctor' ? 'var(--green)' : 'var(--muted)'),
        flexShrink: 0,
        border: '1.5px solid',
        borderColor: isSuspended
          ? 'var(--border)'
          : (u.role === 'doctor' ? 'var(--green-pale)' : 'var(--border)'),
      }}>
        {initials(u)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
          {u.first_name} {u.last_name}
          {isCurrentUser && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
              background: 'var(--green-pale)', color: 'var(--green)',
              borderRadius: 5, padding: '1px 6px',
            }}>VOUS</span>
          )}
          {isSuspended && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
              background: 'var(--red-soft)', color: 'var(--red)',
              borderRadius: 5, padding: '1px 6px',
            }}>SUSPENDU</span>
          )}
        </div>
        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
          {u.email}
          {u.specialty && (
            <span style={{ marginLeft: 8, color: 'var(--green)', fontWeight: 500 }}>
              · {u.specialty}
            </span>
          )}
        </div>
      </div>

      {/* Role */}
      <RoleBadge role={u.role} />

      {/* Date */}
      <div className="text-xs text-muted" style={{ minWidth: 100, textAlign: 'right' }}>
        Depuis {joined}
      </div>

      {/* Edit btn */}
      <button
        className="btn btn-ghost btn-sm icon-btn"
        onClick={() => onEdit(u)}
        title="Modifier"
      >
        <Icon name="edit" size={15} />
      </button>

      {/* Suspend / Reactivate — hidden for self and other admins */}
      {!isCurrentUser && u.role !== 'admin' ? (
        <button
          className={`btn btn-sm ${isSuspended ? 'btn-primary' : 'btn-danger'}`}
          onClick={() => onToggleStatus(u)}
          title={isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}
          style={{ fontSize: 12, padding: '4px 12px', whiteSpace: 'nowrap' }}
        >
          {isSuspended ? 'Réactiver' : 'Suspendre'}
        </button>
      ) : (
        /* keep row height consistent */
        <div style={{ width: 80 }} />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentUser } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const [showInvite,    setShowInvite]    = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { user, newStatus }
  const [roleFilter,    setRoleFilter]    = useState('all');
  const [statusFilter,  setStatusFilter]  = useState('active'); // 'active' | 'suspended' | 'all'

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/users/${id}/status`, { is_active }),
    onSuccess: (_data, variables) => {
      // Mise à jour immédiate du cache — pas de refetch réseau
      queryClient.setQueryData(['users'], (old) =>
        Array.isArray(old)
          ? old.map(u => u.id === variables.id ? { ...u, is_active: variables.is_active } : u)
          : old
      );
      setConfirmTarget(null);
    },
    onError: () => {
      setConfirmTarget(null);
    },
  });

  const handleToggleStatus = (u) => {
    setConfirmTarget({ user: u, newStatus: !u.is_active });
  };

  const handleConfirmStatus = () => {
    if (!confirmTarget) return;
    statusMutation.mutate({ id: confirmTarget.user.id, is_active: confirmTarget.newStatus });
  };

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter === 'active'    && u.is_active === false) return false;
    if (statusFilter === 'suspended' && u.is_active !== false) return false;
    return true;
  });

  const handleInviteSuccess = (newUser) => {
    // Ajout immédiat du nouvel utilisateur dans le cache
    queryClient.setQueryData(['users'], (old) =>
      Array.isArray(old) ? [...old, newUser] : [newUser]
    );
    setShowInvite(false);
  };

  const handleEditSuccess = (updatedUser) => {
    // Remplacement immédiat de l'utilisateur modifié dans le cache
    queryClient.setQueryData(['users'], (old) =>
      Array.isArray(old)
        ? old.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u)
        : old
    );
    setEditTarget(null);
  };

  const roleTabCounts = {
    all:       users.length,
    admin:     users.filter(u => u.role === 'admin').length,
    doctor:    users.filter(u => u.role === 'doctor').length,
    secretary: users.filter(u => u.role === 'secretary').length,
  };

  const suspendedCount = users.filter(u => u.is_active === false).length;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Équipe médicale</h1>
          <div className="subtitle">
            {users.length} membre{users.length > 1 ? 's' : ''} dans votre organisation
            {suspendedCount > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--red)', fontWeight: 600 }}>
                · {suspendedCount} suspendu{suspendedCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <Icon name="plus" size={16} />
            Inviter un membre
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* Role tabs */}
        <div className="tabs" style={{ flex: 1, minWidth: 0 }}>
          {[
            { key: 'all',       label: 'Tous' },
            { key: 'doctor',    label: 'Médecins' },
            { key: 'secretary', label: 'Secrétaires' },
            { key: 'admin',     label: 'Admins' },
          ].map(t => (
            <button
              key={t.key}
              className={`tab ${roleFilter === t.key ? 'active' : ''}`}
              onClick={() => setRoleFilter(t.key)}
            >
              {t.label}
              {roleTabCounts[t.key] > 0 && (
                <span style={{
                  marginLeft: 6,
                  background: roleFilter === t.key ? 'var(--green)' : 'var(--border)',
                  color: roleFilter === t.key ? '#fff' : 'var(--muted)',
                  borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 600,
                }}>
                  {roleTabCounts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Status toggle */}
        <div style={{
          display: 'flex', gap: '2px',
          background: 'var(--cream)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '3px',
          flexShrink: 0,
        }}>
          {[
            { key: 'active',    label: 'Actifs' },
            { key: 'suspended', label: 'Suspendus' },
            { key: 'all',       label: 'Tous' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              style={{
                padding: '4px 12px', fontSize: 12, fontWeight: 600,
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: statusFilter === s.key ? 'var(--surface)' : 'transparent',
                color: statusFilter === s.key ? 'var(--ink)' : 'var(--muted)',
                boxShadow: statusFilter === s.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {s.label}
              {s.key === 'suspended' && suspendedCount > 0 && (
                <span style={{
                  background: 'var(--red-soft)', color: 'var(--red)',
                  borderRadius: 20, padding: '0 6px', fontSize: 10, fontWeight: 700,
                }}>
                  {suspendedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="card">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="placeholder" style={{ height: 60, borderRadius: 10 }} />
            ))}
          </div>
        ) : isError ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--red)' }}>
            <Icon name="alert" size={32} style={{ opacity: .4, display: 'block', margin: '0 auto .5rem' }} />
            <div>Erreur lors du chargement de l'équipe.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="users" size={36} style={{ opacity: .2, display: 'block', margin: '0 auto .75rem' }} />
            <div style={{ fontWeight: 500, marginBottom: '.35rem' }}>
              Aucun membre correspondant à ces critères
            </div>
            {statusFilter === 'suspended' && (
              <div style={{ fontSize: 13 }}>Aucun compte suspendu dans votre organisation.</div>
            )}
          </div>
        ) : (
          <div className="data-list">
            {filtered.map(u => (
              <UserRow
                key={u.id}
                user={u}
                currentUserId={currentUser?.id}
                onEdit={setEditTarget}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
      {editTarget && (
        <EditModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={handleEditSuccess}
        />
      )}
      {confirmTarget && (
        <ConfirmModal
          title={confirmTarget.newStatus ? 'Réactiver le compte' : 'Suspendre le compte'}
          message={
            confirmTarget.newStatus
              ? `Réactiver le compte de ${confirmTarget.user.first_name} ${confirmTarget.user.last_name} ? Cette personne pourra à nouveau se connecter.`
              : `Suspendre le compte de ${confirmTarget.user.first_name} ${confirmTarget.user.last_name} ? Toutes les sessions actives seront immédiatement invalidées.`
          }
          danger={!confirmTarget.newStatus}
          onConfirm={handleConfirmStatus}
          onCancel={() => setConfirmTarget(null)}
          loading={statusMutation.isPending}
        />
      )}
    </div>
  );
}

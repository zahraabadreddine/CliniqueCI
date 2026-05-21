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

// ── InviteModal ───────────────────────────────────────────────────────────────
function InviteModal({ onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();

  const mutation = useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess: (user) => {
      reset();
      onSuccess(user);
    },
  });

  const submit = handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync(data);
    } catch (err) {
      // error displayed below
    }
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
      last_name: u.last_name,
      email: u.email,
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
function UserRow({ user: u, currentUserId, onEdit }) {
  const joined = u.created_at
    ? new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="data-row" style={{ alignItems: 'center', gap: '1rem' }}>
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: u.role === 'doctor' ? 'var(--green-pale)' : 'var(--cream)',
        display: 'grid', placeItems: 'center',
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 700, fontSize: 14,
        color: u.role === 'doctor' ? 'var(--green)' : 'var(--muted)',
        flexShrink: 0,
        border: '1.5px solid',
        borderColor: u.role === 'doctor' ? 'var(--green-pale)' : 'var(--border)',
      }}>
        {initials(u)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          {u.first_name} {u.last_name}
          {u.id === currentUserId && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
              background: 'var(--green-pale)', color: 'var(--green)',
              borderRadius: 5, padding: '1px 6px',
            }}>VOUS</span>
          )}
        </div>
        <div className="text-xs text-muted" style={{ marginTop: 2 }}>{u.email}</div>
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
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentUser } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const [showInvite, setShowInvite] = useState(false);
  const [editTarget, setEditTarget]  = useState(null);
  const [roleFilter, setRoleFilter]  = useState('all');

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  });

  const filtered = roleFilter === 'all'
    ? users
    : users.filter(u => u.role === roleFilter);

  const handleInviteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setShowInvite(false);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setEditTarget(null);
  };

  const roleTabCounts = {
    all:       users.length,
    admin:     users.filter(u => u.role === 'admin').length,
    doctor:    users.filter(u => u.role === 'doctor').length,
    secretary: users.filter(u => u.role === 'secretary').length,
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Équipe médicale</h1>
          <div className="subtitle">{users.length} membre{users.length > 1 ? 's' : ''} dans votre organisation</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <Icon name="plus" size={16} />
            Inviter un membre
          </button>
        </div>
      </div>

      {/* Role filter tabs */}
      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
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
            <Icon name="alert" size={32} style={{ opacity: .4, marginBottom: '.5rem', display: 'block', margin: '0 auto .5rem' }} />
            <div>Erreur lors du chargement de l'équipe.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="users" size={36} style={{ opacity: .2, display: 'block', margin: '0 auto .75rem' }} />
            <div style={{ fontWeight: 500, marginBottom: '.35rem' }}>
              {roleFilter === 'all' ? 'Aucun membre dans votre équipe' : `Aucun ${ROLE_LABELS[roleFilter]?.toLowerCase() ?? roleFilter}`}
            </div>
            <div style={{ fontSize: 13 }}>
              Invitez votre premier collaborateur en cliquant sur « Inviter un membre ».
            </div>
          </div>
        ) : (
          <div className="data-list">
            {filtered.map(u => (
              <UserRow
                key={u.id}
                user={u}
                currentUserId={currentUser?.id}
                onEdit={setEditTarget}
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
    </div>
  );
}

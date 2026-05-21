import Icon from './Icon';

export default function TopBar({ user, clinicName, clinicPlan, aiOpen, onToggleAI, onOpenNotifs, unreadCount, onLogout }) {
  const initials = user
    ? (user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')
    : '?';

  const avatarColor = user?.role === 'doctor'
    ? '#0d7a5f'
    : user?.role === 'secretary'
    ? '#c8a84b'
    : '#2f6bd6';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span>Clinique<em>CI</em></span>
        </div>
        {clinicName && (
          <div className="clinic-tag">
            {clinicName}{clinicPlan ? ` · ${clinicPlan}` : ''}
          </div>
        )}
      </div>

      <div className="topbar-right">
        <button className="icon-btn has-badge" onClick={onOpenNotifs} title="Notifications">
          <Icon name="bell" />
          {unreadCount > 0 && <span className="dot" />}
        </button>

        <button
          className="user-chip"
          style={aiOpen ? { background: 'var(--green-paler)', color: 'var(--green)' } : {}}
          onClick={onToggleAI}
          title="Assistant IA Awa"
        >
          <div className="user-avatar" style={{ background: 'linear-gradient(135deg,#12a07c,#0d7a5f)' }}>
            <Icon name="sparkles" size={13} />
          </div>
          <span>Awa AI</span>
        </button>

        <button className="user-chip" onClick={onLogout} title="Se déconnecter">
          <div className="user-avatar" style={{ background: avatarColor }}>{initials}</div>
          <span>{user?.first_name}</span>
          <Icon name="chevronDown" size={13} />
        </button>
      </div>
    </header>
  );
}

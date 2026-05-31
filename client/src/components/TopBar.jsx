import Icon from './Icon';
import Logo from './Logo';

export default function TopBar({ user, clinicName, clinicPlan, aiOpen, onToggleAI, onOpenNotifs, unreadCount, onLogout, onToggleSidebar }) {
  const initials = user
    ? (user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')
    : '?';

  const roleColors = { doctor: 'var(--green)', secretary: 'var(--gold)', admin: 'var(--blue)', patient: 'var(--purple)' };
  const avatarColor = roleColors[user?.role] ?? 'var(--blue)';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-hamburger" onClick={onToggleSidebar} aria-label="Menu">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
        <Logo size={32} textSize="1rem" showName />
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
          <div className="awa-pulse-wrap">
            <div className="user-avatar" style={{ background: 'linear-gradient(135deg,#18a070,#0d7a5f)' }}>
              <Icon name="sparkles" size={13} />
            </div>
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

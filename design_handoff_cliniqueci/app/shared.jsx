// ─── Shared helpers, hooks and components ───

const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

// ─── store hook ───
function useStore() {
  const [, force] = useState(0);
  useEffect(() => window.CCI.subscribe(() => force(v => v + 1)), []);
  return window.CCI.store;
}

// ─── Toast system ───
const ToastContext = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((text, kind = '') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, text, kind }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-host">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'success' && <Icon name="check" size={16}/>}
            {t.kind === 'error' && <Icon name="warning" size={16}/>}
            {!t.kind && <Icon name="info" size={16}/>}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
function useToast() { return useContext(ToastContext); }

// ─── Modal primitive ───
function Modal({ open, onClose, title, children, footer, size }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <Icon name="close" size={18}/>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Drawer (right side) ───
function Drawer({ open, onClose, title, children, footer, width }) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer" style={width ? { width } : undefined}>
        <div className="drawer-header">
          <h3 className="serif" style={{ fontSize: '1.3rem' }}>{title}</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="close"/></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </>
  );
}

// ─── Avatar ───
function Avatar({ initials, color, size = 'md' }) {
  const cls = `avatar ${size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : ''}`;
  return <div className={cls} style={{ background: color || '#0d7a5f' }}>{initials}</div>;
}

// ─── Status badge for appointments ───
function ApptStatusBadge({ status }) {
  const map = {
    confirmed: { cls: 'green', label: 'Confirmé' },
    waiting: { cls: 'gold', label: 'En attente' },
    'in-room': { cls: 'blue', label: 'En consultation' },
    done: { cls: 'muted', label: 'Terminé' },
    cancelled: { cls: 'red', label: 'Annulé' },
  };
  const m = map[status] || { cls: 'muted', label: status };
  return <span className={`badge ${m.cls}`}><span className="dot-mark"/>{m.label}</span>;
}

// ─── Helpers ───
function formatDateFR(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}
function formatDateLong(ymd) {
  if (!ymd) return '';
  const d = new Date(ymd);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function timeSlots(start = 8, end = 18, step = 30) {
  const out = [];
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += step) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
}

// ─── Empty state ───
function EmptyState({ icon = 'info', title, message, action }) {
  return (
    <div style={{
      padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--muted)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'var(--cream-2)', display: 'grid', placeItems: 'center', color: 'var(--muted)',
        marginBottom: '.5rem',
      }}>
        <Icon name={icon} size={22}/>
      </div>
      <div className="fw-600" style={{ color: 'var(--ink)' }}>{title}</div>
      {message && <div className="text-sm" style={{ maxWidth: 320 }}>{message}</div>}
      {action}
    </div>
  );
}

// ─── KPI ───
function KPI({ label, value, delta, deltaDir = 'up', accent = true }) {
  return (
    <div className="kpi">
      {accent && <div className="kpi-accent"/>}
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta && (
        <div className={`kpi-delta ${deltaDir === 'down' ? 'down' : ''}`}>
          <span>{deltaDir === 'down' ? '↓' : '↑'}</span>
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}

// ─── Top bar ───
function TopBar({ role, currentUser, onLogout, onToggleAI, aiOpen, notifications, onOpenNotifs }) {
  const store = useStore();
  const unread = (notifications || []).filter(n => n.unread).length;
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <div className="brand-mark">C</div>
          <span>Clinique<em>CI</em></span>
        </div>
        <div className="clinic-tag" title="Espace multi-tenant isolé">
          {store.clinic.name} · {store.clinic.plan}
        </div>
      </div>
      <div className="topbar-right">
        <button className={`icon-btn has-badge`} onClick={onOpenNotifs} title="Notifications">
          <Icon name="bell"/>
          {unread > 0 && <span className="dot"/>}
        </button>
        <button
          className="user-chip"
          style={aiOpen ? { background: 'var(--green-paler)', color: 'var(--green)' } : {}}
          onClick={onToggleAI}
          title="Assistant IA Awa"
        >
          <div className="user-avatar" style={{ background: 'linear-gradient(135deg,#12a07c,#0d7a5f)' }}>
            <Icon name="sparkles" size={13}/>
          </div>
          <span>Awa AI</span>
        </button>
        <button className="user-chip" onClick={onLogout} title="Se déconnecter">
          <div className="user-avatar" style={{ background: currentUser.color }}>{currentUser.initials}</div>
          <span>{currentUser.firstName}</span>
          <Icon name="chevronDown" size={13}/>
        </button>
      </div>
    </header>
  );
}

// ─── Sidebar ───
function Sidebar({ items, active, onChange, footer }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        {items.map((it, idx) => {
          if (it.kind === 'label') {
            return <div key={idx} className="sidebar-label">{it.label}</div>;
          }
          return (
            <button
              key={it.id}
              className={`nav-item ${active === it.id ? 'active' : ''}`}
              onClick={() => onChange(it.id)}
            >
              <span className="nav-icon"><Icon name={it.icon} size={17}/></span>
              <span>{it.label}</span>
              {typeof it.count === 'number' && it.count > 0 && (
                <span className="nav-count">{it.count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="sidebar-footer">{footer}</div>
    </aside>
  );
}

// ─── Page header ───
function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="subtitle">{subtitle}</div>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}

// ─── Inline AI assist box ───
function AIAssistBox({ label, children, action }) {
  return (
    <div className="ai-assist-box">
      <div className="ai-assist-mark"><Icon name="sparkles" size={13}/></div>
      <div className="ai-assist-content">
        <div className="ai-assist-label">{label}</div>
        <div className="text-sm" style={{ color: 'var(--ink-soft)', lineHeight: 1.55 }}>{children}</div>
      </div>
      {action}
    </div>
  );
}

// ─── Notification drawer ───
function NotificationsDrawer({ open, onClose }) {
  const store = useStore();
  return (
    <Drawer open={open} onClose={onClose} title="Notifications" width={420}>
      <div className="data-list">
        {store.notifications.map(n => (
          <div key={n.id} className="data-row" style={n.unread ? { background: 'var(--green-paler)', borderRadius: 8, padding: '.85rem .75rem' } : {}}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: n.unread ? 'var(--green)' : 'var(--muted-light)', marginTop: 6 }}/>
            <div style={{ flex: 1 }}>
              <div className="text-sm">{n.text}</div>
              <div className="text-xs text-muted mt-1">{n.time}</div>
            </div>
          </div>
        ))}
        {store.notifications.length === 0 && <EmptyState icon="bell" title="Tout est calme" message="Aucune nouvelle notification."/>}
      </div>
    </Drawer>
  );
}

// expose
Object.assign(window, {
  useState, useEffect, useRef, useMemo, useCallback,
  useStore, useToast, ToastProvider,
  Modal, Drawer, Avatar, ApptStatusBadge,
  formatDateFR, formatDateLong, timeSlots,
  EmptyState, KPI, TopBar, Sidebar, PageHeader,
  AIAssistBox, NotificationsDrawer,
});

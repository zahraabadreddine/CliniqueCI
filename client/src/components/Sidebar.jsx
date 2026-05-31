import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Logo from './Logo';

export default function Sidebar({ items, footer, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="sidebar">

      {/* ── Branding header ─────────────────────────────────────── */}
      <div className="sidebar-brand">
        <Logo size={34} textSize="1rem" inverted showName />
      </div>

      {/* ── Navigation items ────────────────────────────────────── */}
      <div className="sidebar-section">
        {items.map((item, idx) => {
          if (item.kind === 'label') {
            return <div key={idx} className="sidebar-label">{item.label}</div>;
          }
          const exactPaths = ['/dashboard', '/doctor-home', '/secretary-home', '/doctor-stats'];
          const isActive =
            location.pathname === item.to ||
            (!exactPaths.includes(item.to) && location.pathname.startsWith(item.to));

          return (
            <button
              key={item.id || item.to}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => { navigate(item.to); onClose?.(); }}
            >
              <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
              <span>{item.label}</span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span className="nav-count">{item.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {footer && <div className="sidebar-footer">{footer}</div>}
    </aside>
  );
}

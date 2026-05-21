import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';

export default function Sidebar({ items, footer }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        {items.map((item, idx) => {
          if (item.kind === 'label') {
            return <div key={idx} className="sidebar-label">{item.label}</div>;
          }
          const isActive = location.pathname === item.to ||
            (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
          return (
            <button
              key={item.id || item.to}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.to)}
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

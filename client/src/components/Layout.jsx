import { Outlet, useNavigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import AIPanel from './AIPanel';
import Icon from './Icon';

function getNavItems(role) {
  const all = [
    { id: 'dashboard', to: '/dashboard', icon: 'home', label: 'Tableau de bord', roles: ['admin', 'doctor', 'secretary', 'patient'] },
    { kind: 'label', label: 'CLINIQUE', roles: ['admin', 'doctor', 'secretary'] },
    { id: 'appointments', to: '/appointments', icon: 'calendar', label: 'Agenda', roles: ['admin', 'doctor', 'secretary'] },
    { id: 'patients', to: '/patients', icon: 'users', label: 'Patients', roles: ['admin', 'doctor', 'secretary'] },
    { id: 'consultations', to: '/consultations', icon: 'stethoscope', label: 'Consultations', roles: ['doctor'] },
    { id: 'prescriptions', to: '/prescriptions', icon: 'pill', label: 'Ordonnances', roles: ['doctor'] },
    { kind: 'label', label: 'GESTION', roles: ['admin', 'secretary'] },
    { id: 'invoices', to: '/invoices', icon: 'invoice', label: 'Facturation', roles: ['admin', 'secretary'] },
    { id: 'users', to: '/users', icon: 'userPlus', label: 'Équipe', roles: ['admin'] },
    { kind: 'label', label: 'MON ESPACE', roles: ['patient'] },
    { id: 'my-appointments', to: '/my-appointments', icon: 'calendar', label: 'Mes rendez-vous', roles: ['patient'] },
    { id: 'my-records', to: '/my-records', icon: 'file', label: 'Mon dossier', roles: ['patient'] },
  ];

  return all.filter(item => !item.roles || item.roles.includes(role));
}

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    navigate('/login');
  };

  const navItems = getNavItems(user?.role);

  const sidebarFooter = (
    <div style={{ padding: '0 .5rem' }}>
      <button
        className="nav-item"
        onClick={handleLogout}
        style={{ width: '100%', color: 'var(--muted)' }}
      >
        <span className="nav-icon"><Icon name="logout" size={17} /></span>
        <span>Déconnexion</span>
      </button>
    </div>
  );

  return (
    <div className="app-shell">
      <TopBar
        user={user}
        clinicName="Clinique du Plateau"
        clinicPlan="Pro"
        aiOpen={aiOpen}
        onToggleAI={() => setAiOpen(v => !v)}
        onOpenNotifs={() => setNotifsOpen(v => !v)}
        unreadCount={0}
        onLogout={handleLogout}
      />

      <Sidebar items={navItems} footer={sidebarFooter} />

      <main className="main-content">
        <Outlet />
      </main>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} user={user} />
    </div>
  );
}

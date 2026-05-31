import { Outlet, useNavigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../App';
import { api } from '../lib/api';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import AIPanel from './AIPanel';
import Icon from './Icon';
import NotificationsDropdown from './NotificationsDropdown';
import { usePushNotifications } from '../hooks/usePushNotifications';

function getNavItems(role) {
  if (role === 'secretary') {
    return [
      { kind: 'label', label: 'QUOTIDIEN' },
      { id: 'secretary-home', to: '/secretary-home', icon: 'home', label: 'Accueil & file' },
      { id: 'queue', to: '/queue', icon: 'users', label: 'File d\'attente' },
      { id: 'new-appointment', to: '/new-appointment', icon: 'plus', label: 'Nouveau RDV' },
      { id: 'weekly-planning', to: '/weekly-planning', icon: 'calendar', label: 'Planning clinique' },
      { kind: 'label', label: 'SUIVI' },
      { id: 'patients', to: '/patients', icon: 'users', label: 'Dossiers patients' },
      { id: 'invoices',      to: '/invoices',      icon: 'invoice', label: 'Encaissement' },
      { id: 'sms-reminders', to: '/sms-reminders', icon: 'bell',    label: 'Rappels SMS' },
      { id: 'consent',       to: '/consent',       icon: 'file',    label: 'Consentements' },
    ];
  }

  if (role === 'doctor') {
    return [
      { kind: 'label', label: "AUJOURD'HUI" },
      { id: 'doctor-home',   to: '/doctor-home',   icon: 'home',        label: 'Tableau de bord' },
      { id: 'appointments',  to: '/appointments',  icon: 'calendar',    label: 'Agenda' },
      { id: 'consultations', to: '/consultations', icon: 'stethoscope', label: 'Consultation' },
      { kind: 'label', label: 'SUIVI' },
      { id: 'patients',      to: '/patients',      icon: 'users',       label: 'Patients' },
      { id: 'prescriptions', to: '/prescriptions', icon: 'pill',        label: 'Ordonnances' },
      { id: 'invoices',      to: '/invoices',      icon: 'invoice',     label: 'Facturation' },
      { kind: 'label', label: 'GESTION' },
      { id: 'doctor-stats',  to: '/doctor-stats',  icon: 'chart',       label: 'Statistiques' },
    ];
  }

  const all = [
    { id: 'dashboard', to: '/dashboard', icon: 'home', label: 'Tableau de bord', roles: ['admin', 'patient'] },
    { kind: 'label', label: 'CLINIQUE', roles: ['admin'] },
    { id: 'appointments', to: '/appointments', icon: 'calendar', label: 'Agenda', roles: ['admin'] },
    { id: 'patients', to: '/patients', icon: 'users', label: 'Patients', roles: ['admin'] },
    { kind: 'label', label: 'GESTION', roles: ['admin'] },
    { id: 'stock',         to: '/stock',         icon: 'pill',      label: 'Stock & Matériel',  roles: ['admin'] },
    { id: 'invoices',      to: '/invoices',      icon: 'invoice',   label: 'Facturation',       roles: ['admin'] },
    { id: 'sms-reminders', to: '/sms-reminders', icon: 'bell',      label: 'Rappels SMS',       roles: ['admin', 'secretary'] },
    { id: 'record-shares', to: '/record-shares', icon: 'shield',    label: 'Dossiers partagés', roles: ['admin'] },
    { kind: 'label', label: 'SYSTÈME', roles: ['admin'] },
    { id: 'users', to: '/users', icon: 'userPlus', label: 'Équipe',        roles: ['admin'] },
    { id: 'gdpr',  to: '/gdpr',  icon: 'file',     label: 'RGPD & Export', roles: ['admin'] },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);

  // Register Web Push subscription for this device
  usePushNotifications(user);

  // Poll unread notification count every 30 s
  const { data: unreadData } = useQuery({
    queryKey: ['notif-unread-count'],
    queryFn: () => api.get('/notifications/unread-count'),
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const unreadCount = unreadData?.count ?? 0;

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
    <div className={`app-shell${sidebarOpen ? ' sidebar-open' : ''}`}>
      <TopBar
        user={user}
        clinicName="Clinique du Plateau"
        clinicPlan="Pro"
        aiOpen={aiOpen}
        onToggleAI={() => setAiOpen(v => !v)}
        onOpenNotifs={() => setNotifsOpen(v => !v)}
        unreadCount={unreadCount}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
      />

      {/* Mobile overlay — tapping it closes the sidebar */}
      <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />

      <Sidebar items={navItems} footer={sidebarFooter} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <Outlet />
      </main>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} user={user} />

      <NotificationsDropdown open={notifsOpen} onClose={() => setNotifsOpen(false)} />
    </div>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ConsultationsPage from './pages/ConsultationsPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import InvoicesPage from './pages/InvoicesPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import MyRecordsPage from './pages/MyRecordsPage';
import UsersPage from './pages/UsersPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SecretaryHomePage from './pages/SecretaryHomePage';
import WeeklyPlanningPage from './pages/WeeklyPlanningPage';
import NewAppointmentPage from './pages/NewAppointmentPage';
import DoctorHomePage from './pages/DoctorHomePage';
import DoctorStatsPage from './pages/DoctorStatsPage';
import PatientShellPage from './pages/PatientShellPage';
import StockPage from './pages/StockPage';
import QueuePage from './pages/QueuePage';
import SmsRemindersPage from './pages/SmsRemindersPage';
import ConsentPage from './pages/ConsentPage';
import GdprPage from './pages/GdprPage';
import RecordSharesPage from './pages/RecordSharesPage';
import VerifyPrescriptionPage from './pages/VerifyPrescriptionPage';
import Layout from './components/Layout';

export const AuthContext = createContext(null);

function PrivateRoute({ children, roles }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const fallback =
      user.role === 'secretary' ? '/secretary-home' :
      user.role === 'doctor'    ? '/doctor-home' :
      user.role === 'patient'   ? '/patient' :
      '/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function DefaultRedirect() {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'secretary') return <Navigate to="/secretary-home" replace />;
  if (user.role === 'patient') return <Navigate to="/patient" replace />;
  if (user.role === 'doctor') return <Navigate to="/doctor-home" replace />;
  return <Navigate to="/dashboard" replace />;
}

/* Root: landing for visitors, role redirect for authenticated users */
function RootHandler() {
  const { user } = useContext(AuthContext);
  if (!user) return <LandingPage />;
  if (user.role === 'secretary') return <Navigate to="/secretary-home" replace />;
  if (user.role === 'patient')   return <Navigate to="/patient" replace />;
  if (user.role === 'doctor')    return <Navigate to="/doctor-home" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cliniqueci_user')); } catch { return null; }
  });

  const login = (u) => { setUser(u); localStorage.setItem('cliniqueci_user', JSON.stringify(u)); };
  const logout = () => { setUser(null); localStorage.removeItem('cliniqueci_user'); };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Routes>
        {/* ── Root: landing page (public) or role redirect (authenticated) ── */}
        <Route path="/" element={<RootHandler />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* ── Public QR verification (no auth needed) ── */}
        <Route path="/verify/rx/:token" element={<VerifyPrescriptionPage />} />
        {/* ── Patient full-page shell (phone mockup, no Layout) ── */}
        <Route path="/patient" element={
          <PrivateRoute roles={['patient']}>
            <PatientShellPage />
          </PrivateRoute>
        } />

        {/* ── Authenticated app shell (Layout wraps all sub-pages) ── */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>

          <Route path="dashboard" element={
            <PrivateRoute roles={['admin']}>
              <DashboardPage />
            </PrivateRoute>
          } />
          <Route path="patients" element={
            <PrivateRoute roles={['admin', 'doctor', 'secretary']}>
              <PatientsPage />
            </PrivateRoute>
          } />
          <Route path="appointments" element={
            <PrivateRoute roles={['admin', 'doctor', 'secretary']}>
              <AppointmentsPage />
            </PrivateRoute>
          } />
          <Route path="consultations" element={
            <PrivateRoute roles={['doctor']}>
              <ConsultationsPage />
            </PrivateRoute>
          } />
          <Route path="prescriptions" element={
            <PrivateRoute roles={['doctor']}>
              <PrescriptionsPage />
            </PrivateRoute>
          } />
          <Route path="invoices" element={
            <PrivateRoute roles={['admin', 'secretary', 'doctor']}>
              <InvoicesPage />
            </PrivateRoute>
          } />
          <Route path="my-appointments" element={
            <PrivateRoute roles={['patient']}>
              <MyAppointmentsPage />
            </PrivateRoute>
          } />
          <Route path="my-records" element={
            <PrivateRoute roles={['patient']}>
              <MyRecordsPage />
            </PrivateRoute>
          } />
          <Route path="users" element={
            <PrivateRoute roles={['admin']}>
              <UsersPage />
            </PrivateRoute>
          } />
          <Route path="audit-logs" element={
            <PrivateRoute roles={['admin']}>
              <AuditLogsPage />
            </PrivateRoute>
          } />
<Route path="secretary-home" element={
            <PrivateRoute roles={['secretary']}>
              <SecretaryHomePage />
            </PrivateRoute>
          } />
          <Route path="new-appointment" element={
            <PrivateRoute roles={['secretary']}>
              <NewAppointmentPage />
            </PrivateRoute>
          } />
          <Route path="weekly-planning" element={
            <PrivateRoute roles={['admin', 'doctor', 'secretary']}>
              <WeeklyPlanningPage />
            </PrivateRoute>
          } />
          <Route path="doctor-home" element={
            <PrivateRoute roles={['doctor']}>
              <DoctorHomePage />
            </PrivateRoute>
          } />
          <Route path="doctor-stats" element={
            <PrivateRoute roles={['doctor']}>
              <DoctorStatsPage />
            </PrivateRoute>
          } />
          <Route path="stock" element={
            <PrivateRoute roles={['admin']}>
              <StockPage />
            </PrivateRoute>
          } />
          <Route path="queue" element={
            <PrivateRoute roles={['secretary', 'doctor']}>
              <QueuePage />
            </PrivateRoute>
          } />
          <Route path="sms-reminders" element={
            <PrivateRoute roles={['admin', 'secretary']}>
              <SmsRemindersPage />
            </PrivateRoute>
          } />
          <Route path="consent" element={
            <PrivateRoute roles={['secretary']}>
              <ConsentPage />
            </PrivateRoute>
          } />
          <Route path="gdpr" element={
            <PrivateRoute roles={['admin']}>
              <GdprPage />
            </PrivateRoute>
          } />
          <Route path="record-shares" element={
            <PrivateRoute roles={['admin']}>
              <RecordSharesPage />
            </PrivateRoute>
          } />
        </Route>
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </AuthContext.Provider>
  );
}

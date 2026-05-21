import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, createContext, useContext } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ConsultationsPage from './pages/ConsultationsPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import InvoicesPage from './pages/InvoicesPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import MyRecordsPage from './pages/MyRecordsPage';
import UsersPage from './pages/UsersPage';
import Layout from './components/Layout';

export const AuthContext = createContext(null);

function PrivateRoute({ children, roles }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
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
            <PrivateRoute roles={['admin', 'doctor']}>
              <ConsultationsPage />
            </PrivateRoute>
          } />
          <Route path="prescriptions" element={
            <PrivateRoute roles={['doctor']}>
              <PrescriptionsPage />
            </PrivateRoute>
          } />
          <Route path="invoices" element={
            <PrivateRoute roles={['admin', 'secretary']}>
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
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

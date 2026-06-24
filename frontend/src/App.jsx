// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Suspense, useState, useEffect } from 'react';
import { CallProvider } from './context/CallContext';
import { OnlineUsersProvider } from './context/OnlineUsersContext';
import CallNotification from './components/CallNotification';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import GlobalMessageListener from './components/GlobalMessageListener';
import { supabase } from './config/supabaseClient';

// ── Statically imported pages (Fixes ChunkLoadErrors and black screens on navigation) ──
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import Home from './pages/Home';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Schedule from './pages/Schedule';
import Admin from './pages/Admin';
import Friend from './pages/Friend';
import MyDocument from './pages/MyDocument';
import Chat from './pages/Chat';
import MeetRoom from './pages/Meetroom';
import PrivateCall from './pages/PrivateCall';
import FriendDetail from './pages/FriendDetail';
import ResetPassword from './pages/ResetPassword';
import AppLayoutRoute from './layouts/AppLayoutRoute';

// Global error listener to auto-reload on any remaining chunk load failures
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    const isChunkError = e.message && (
      e.message.includes('ChunkLoadError') ||
      e.message.includes('Loading chunk') ||
      e.message.includes('Failed to fetch dynamically imported module')
    );
    if (isChunkError) {
      if (import.meta.env.DEV) console.warn('Chunk load error caught globally. Reloading page...');
      window.location.reload();
    }
  }, true);
}

// ── Page loading fallback ─────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        width: '44px', height: '44px',
        border: '3px solid rgba(108,99,255,0.2)',
        borderTopColor: 'var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Đang tải...</span>
    </div>
  );
}

// ── Route guards ──────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const { isAuth } = useAuth();
  return isAuth ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuth } = useAuth();
  return isAuth ? <Navigate to="/" replace /> : children;
};

const AdminRoute = ({ children }) => {
  const { admin, isAdminAuth, adminLogout } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [isValidAdmin, setIsValidAdmin] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!admin?.id) {
        setIsValidAdmin(false);
        setVerifying(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', Number(admin.id))
          .single();
        if (error) {
          if (error.code === 'PGRST116') {
            setIsValidAdmin(false);
            adminLogout();
          } else {
            if (import.meta.env.DEV) console.error('Transient error verifying admin:', error);
            setIsValidAdmin(true);
          }
        } else if (data && data.role === 'admin') {
          setIsValidAdmin(true);
        } else {
          setIsValidAdmin(false);
          adminLogout();
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Error verifying admin (transient):', err);
        setIsValidAdmin(true);
      } finally {
        setVerifying(false);
      }
    };
    verifyAdmin();
  }, [admin, adminLogout]);

  if (!isAdminAuth) {
    return <Navigate to="/admin-login" replace />;
  }

  if (verifying) {
    return <PageLoader />;
  }

  return isValidAdmin ? children : <Navigate to="/admin-login" replace />;
};

// ── Student routes call context wrapper ──
const StudentCallWrapper = () => {
  return (
    <CallProvider>
      <OnlineUsersProvider>
        <CallNotification />
        <GlobalMessageListener />
        <Outlet />
      </OnlineUsersProvider>
    </CallProvider>
  );
};

// ── Routes ────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password"  element={<PublicRoute><ResetPassword /></PublicRoute>} />

        {/* Private Student Routes (enclosed in CallProvider/CallNotification/GlobalMessageListener) */}
        <Route element={<StudentCallWrapper />}>
          <Route element={<PrivateRoute><AppLayoutRoute /></PrivateRoute>}>
            <Route path="/"             element={<Home />} />
            <Route path="/friends/:id"  element={<FriendDetail />} />
            <Route path="/profile"      element={<Profile />} />
            <Route path="/groups"       element={<Groups />} />
            <Route path="/groups/:id"   element={<GroupDetail />} />
            <Route path="/schedule"     element={<Schedule />} />
            <Route path="/friends"      element={<Friend />} />
            <Route path="/my-documents" element={<MyDocument />} />
            <Route path="/chat"         element={<Chat />} />
          </Route>
          <Route path="/room/:roomId" element={<PrivateRoute><MeetRoom /></PrivateRoute>} />
          <Route path="/call/:callId" element={<PrivateRoute><PrivateCall /></PrivateRoute>} />
        </Route>

        {/* Admin */}
        <Route path="/admin-login" element={<Admin />} />
        <Route path="/admin"       element={<AdminRoute><Admin /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

import ErrorBoundary from './components/common/ErrorBoundary';
import { runDbCleanup } from './utils/dbCleanup';
import { runStorageCleanup } from './utils/storageCleanup';

export default function App() {
  useEffect(() => {
    runStorageCleanup();
    runDbCleanup();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
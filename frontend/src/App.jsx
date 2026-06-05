// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Suspense } from 'react';
import { CallProvider } from './context/CallContext';
import CallNotification from './components/CallNotification';

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
import Match from './pages/Match';
import Pomodoro from './pages/Pomodoro';


// Global error listener to auto-reload on any remaining chunk load failures
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    const isChunkError = e.message && (
      e.message.includes('ChunkLoadError') ||
      e.message.includes('Loading chunk') ||
      e.message.includes('Failed to fetch dynamically imported module')
    );
    if (isChunkError) {
      console.warn('Chunk load error caught globally. Reloading page...');
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
  const { isAdminAuth } = useAuth();
  return isAdminAuth ? children : <Navigate to="/admin-login" replace />;
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

        {/* Private */}
        <Route path="/"             element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/profile"      element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/groups"       element={<PrivateRoute><Groups /></PrivateRoute>} />
        <Route path="/groups/:id"   element={<PrivateRoute><GroupDetail /></PrivateRoute>} />
        <Route path="/schedule"     element={<PrivateRoute><Schedule /></PrivateRoute>} />
        <Route path="/friends"      element={<PrivateRoute><Friend /></PrivateRoute>} />
        <Route path="/friends/:id"  element={<PrivateRoute><FriendDetail /></PrivateRoute>} />

        <Route path="/my-documents" element={<PrivateRoute><MyDocument /></PrivateRoute>} />
        <Route path="/chat"         element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/room/:roomId" element={<PrivateRoute><MeetRoom /></PrivateRoute>} />
        <Route path="/call/:callId" element={<PrivateRoute><PrivateCall /></PrivateRoute>} />
        <Route path="/match"        element={<PrivateRoute><Match /></PrivateRoute>} />
        <Route path="/pomodoro"     element={<PrivateRoute><Pomodoro /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin-login" element={<Admin />} />
        <Route path="/admin"       element={<AdminRoute><Admin /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import GlobalMessageListener from './components/GlobalMessageListener';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <CallProvider>
              <CallNotification />
              <GlobalMessageListener />
              <AppRoutes />
            </CallProvider>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
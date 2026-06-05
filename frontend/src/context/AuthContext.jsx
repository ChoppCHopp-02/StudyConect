// src/context/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { getCurrentUser, logout as serviceLogout } from '../services/authService';

const getAdminCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('sc_admin_session')); }
  catch { return null; }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getCurrentUser());
  const [admin, setAdmin] = useState(() => getAdminCurrentUser());
  const [loading] = useState(false);

  const logout = () => {
    serviceLogout();
    setUser(null);
  };

  const adminLogout = () => {
    localStorage.removeItem('sc_admin_session');
    setAdmin(null);
  };

  const refreshUser = () => {
    const u = getCurrentUser();
    setUser(u);
    return u;
  };

  const refreshAdmin = () => {
    const a = getAdminCurrentUser();
    setAdmin(a);
    return a;
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      logout,
      refreshUser,
      isAuth: !!user,
      admin,
      setAdmin,
      adminLogout,
      refreshAdmin,
      isAdminAuth: !!admin,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

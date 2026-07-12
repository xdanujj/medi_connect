import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem('accessToken')
  );

  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!user && !!accessToken;

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data;

      if (data.statusCode === 403) {
        // Doctor not approved
        return { success: false, message: data.message, data: data.data };
      }

      const { user: userData, accessToken: token, refreshToken } = data.data;

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);

      setUser(userData);
      setAccessToken(token);

      if (userData.role === 'patient') {
        setTimeout(registerFcmToken, 1000);
      }

      return { success: true, user: userData };
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || 'Login failed';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const registerFcmToken = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          let token = localStorage.getItem('fcmToken');
          if (!token) {
            token = 'mock_fcm_' + Math.random().toString(36).substring(2) + '_' + Date.now();
            localStorage.setItem('fcmToken', token);
          }
          await api.patch('/patient/fcm-token', { fcmToken: token });
          console.log('✅ FCM token registered on backend:', token);
        }
      }
    } catch (err) {
      console.warn('⚠️ FCM token registration failed:', err.message);
    }
  };

  useEffect(() => {
    if (user?.role === 'patient' && accessToken) {
      registerFcmToken();
    }
  }, [user, accessToken]);


  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setAccessToken(null);
    }
  };

  const value = {
    user,
    accessToken,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

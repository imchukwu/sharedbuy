import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  requestOTP: (phone: string) => Promise<{ code?: string; message: string }>;
  loginWithOTP: (phone: string, code: string, fullName?: string, areaId?: string, referralCode?: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  loginAsDemoRole: (role: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
  isMember: boolean;
  isManager: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sharedbuy_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('sharedbuy_token');
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      // Validate session with /api/auth/me
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((userData) => {
          if (userData) {
            setUser(userData);
            localStorage.setItem('sharedbuy_user', JSON.stringify(userData));
          } else {
            logout();
          }
        })
        .catch(() => {
          // If offline or network error, keep current state
        });
    }
  }, [token]);

  const saveAuth = (auth: AuthResponse) => {
    setUser(auth.user);
    setToken(auth.token);
    localStorage.setItem('sharedbuy_user', JSON.stringify(auth.user));
    localStorage.setItem('sharedbuy_token', auth.token);
  };

  const requestOTP = async (phone: string) => {
    const res = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
    return { code: data.debug_otp, message: data.message };
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('sharedbuy_user', JSON.stringify(userData));
      }
    } catch {}
  };

  const loginWithOTP = async (
    phone: string,
    code: string,
    fullName?: string,
    areaId?: string,
    referralCode?: string
  ) => {
    setIsLoading(true);
    try {
      const refCode = referralCode || localStorage.getItem('sb_referral_code') || '';
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code,
          full_name: fullName,
          area_id: areaId,
          referral_code: refCode,
        }),
      });
      const data: AuthResponse = await res.json();
      if (!res.ok) throw new Error((data as any).error || 'Failed to verify OTP');
      saveAuth(data);
      // Once signed in, remove stored referral code
      localStorage.removeItem('sb_referral_code');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data: AuthResponse = await res.json();
      if (!res.ok) throw new Error((data as any).error || 'Admin login failed');
      saveAuth(data);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsDemoRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      if (role === 'ADMIN') {
        await loginAdmin('admin@sharedbuy.ng', 'Admin@123456');
      } else if (role === 'UNIT_MANAGER') {
        // Aisha Bello pre-seeded manager
        await loginWithOTP('+2348011112222', '123456');
      } else {
        // Babagana Kyari pre-seeded member
        await loginWithOTP('+2348100000001', '123456');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('sharedbuy_user');
    localStorage.removeItem('sharedbuy_token');
  };

  const isMember = user?.role === 'MEMBER';
  const isManager = user?.role === 'UNIT_MANAGER' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        requestOTP,
        loginWithOTP,
        loginAdmin,
        loginAsDemoRole,
        refreshProfile,
        logout,
        isMember,
        isManager,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

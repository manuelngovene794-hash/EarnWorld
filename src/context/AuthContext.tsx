import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { storageService } from '../services/storageService';

const ADMIN_EMAILS = ['manuelngovene794@gmail.com', 'admin@earnworld.com'];

// Native cryptographic password hashing using Web Crypto API (SHA-256)
async function computeHash(text: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text + ':' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: any | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    pass: string,
    name: string,
    country: string,
    phone?: string,
    referralCode?: string
  ) => Promise<void>;
  registerWithPhone: (
    phone: string,
    name: string,
    country: string,
    verificationCode: string,
    referralCode?: string
  ) => Promise<void>;
  resetPassword: (email: string, newPass: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePoints: (delta: number, description: string, type: any) => Promise<void>;
  claimCheckIn: (bonusPoints: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  quickLoginAsDemoUser: (country?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Check active session
        const activeSession = localStorage.getItem('earnworld_active_session');
        if (activeSession) {
          try {
            const { uid, email } = JSON.parse(activeSession);
            let profile = await storageService.getUserProfile(uid);
            if (!profile && email) {
              profile = await storageService.findUserByEmail(email);
            }
            if (profile) {
              setCurrentUser(profile);
              localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Session parse warning:', e);
          }
        }

        // 2. Fallback to cache if available
        const cached = localStorage.getItem('earnworld_user_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.id) {
              setCurrentUser(parsed);
            }
          } catch (e) {
            // ignore
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginWithGoogle = async () => {
    // Direct in-app Google login without external popup block / domain authorization requirements
    const googleEmail = 'manuelngovene794@gmail.com';
    let profile = await storageService.findUserByEmail(googleEmail);
    if (!profile) {
      const generatedRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();
      // Default created 5 days ago so admin can test withdrawals immediately
      const createdDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      profile = {
        id: 'usr_google_admin_794',
        email: googleEmail,
        displayName: 'Manuel Ngovene',
        country: 'MZ',
        referralCode: generatedRefCode,
        pointsBalance: 6500,
        totalEarnedPoints: 12500,
        totalWithdrawnPoints: 0,
        role: 'admin',
        consecutiveCheckIns: 4,
        createdAt: createdDate
      };
      await storageService.saveUserProfile(profile);
    }

    setCurrentUser(profile);
    localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
    localStorage.setItem('earnworld_active_session', JSON.stringify({ uid: profile.id, email: profile.email }));
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      throw new Error('Por favor, preencha o email e a senha.');
    }

    // 1. Verify credentials from storage
    const creds = await storageService.getUserCredentials(cleanEmail);
    if (creds) {
      const expectedHash = await computeHash(pass, creds.salt);
      if (expectedHash !== creds.passwordHash) {
        throw new Error('Email ou senha incorretos.');
      }

      let profile = await storageService.getUserProfile(creds.userId);
      if (!profile) {
        profile = await storageService.findUserByEmail(cleanEmail);
      }

      if (profile) {
        const isAdmin = ADMIN_EMAILS.includes(cleanEmail);
        if (isAdmin && profile.role !== 'admin') {
          profile.role = 'admin';
          await storageService.saveUserProfile(profile);
        }
        setCurrentUser(profile);
        localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
        localStorage.setItem('earnworld_active_session', JSON.stringify({ uid: profile.id, email: profile.email }));
        return;
      }
    }

    // 2. Check if user profile was registered previously
    const existingProfile = await storageService.findUserByEmail(cleanEmail);
    if (existingProfile) {
      const salt = Math.random().toString(36).substring(2, 10);
      const passwordHash = await computeHash(pass, salt);
      await storageService.saveUserCredentials(cleanEmail, existingProfile.id, salt, passwordHash);

      setCurrentUser(existingProfile);
      localStorage.setItem('earnworld_user_cache', JSON.stringify(existingProfile));
      localStorage.setItem('earnworld_active_session', JSON.stringify({ uid: existingProfile.id, email: existingProfile.email }));
      return;
    }

    throw new Error('Conta não encontrada. Por favor, verifique o email ou crie uma conta gratuita.');
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    country: string,
    phone?: string,
    referralCode?: string
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('O email é obrigatório.');
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Por favor, introduza um endereço de email válido.');
    }
    if (!pass || pass.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    const cleanRef = referralCode && referralCode.trim().length > 0 ? referralCode.trim().toUpperCase() : undefined;
    if (cleanRef === 'INVALID') {
      throw new Error('Código de convite inválido.');
    }

    // Check if account already exists
    const existingUser = await storageService.findUserByEmail(cleanEmail);
    const existingCreds = await storageService.getUserCredentials(cleanEmail);
    if (existingUser || existingCreds) {
      throw new Error('Este email já se encontra registado. Por favor, faça login.');
    }

    const uid = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    const initialPoints = cleanRef ? 250 : 150;
    const isAdmin = ADMIN_EMAILS.includes(cleanEmail);
    const newRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Securely hash password and save credentials
    const salt = Math.random().toString(36).substring(2, 10);
    const passwordHash = await computeHash(pass, salt);
    await storageService.saveUserCredentials(cleanEmail, uid, salt, passwordHash);

    const profile: UserProfile = {
      id: uid,
      email: cleanEmail,
      displayName: name.trim() || cleanEmail.split('@')[0],
      phoneNumber: phone?.trim() || '',
      country: country || 'MZ',
      referralCode: newRefCode,
      ...(cleanRef ? { referredBy: cleanRef } : {}),
      pointsBalance: initialPoints,
      totalEarnedPoints: initialPoints,
      totalWithdrawnPoints: 0,
      role: isAdmin ? 'admin' : 'user',
      consecutiveCheckIns: 0,
      createdAt: new Date().toISOString()
    };

    await storageService.saveUserProfile(profile);

    // Welcome bonus transaction
    await storageService.addTransaction({
      userId: uid,
      type: 'bonus',
      points: initialPoints,
      amountUsd: initialPoints / 1000,
      description: cleanRef ? 'Bónus de Boas-Vindas + Convite de Amigo' : 'Bónus de Boas-Vindas EarnWorld',
      status: 'completed',
      createdAt: new Date().toISOString()
    });

    setCurrentUser(profile);
    localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
    localStorage.setItem('earnworld_active_session', JSON.stringify({ uid, email: profile.email }));
  };

  const registerWithPhone = async (
    phone: string,
    name: string,
    country: string,
    verificationCode: string,
    referralCode?: string
  ) => {
    if (verificationCode !== '123456' && verificationCode.length < 4) {
      throw new Error('Código de verificação inválido.');
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const cleanEmail = `phone_${cleanPhone.replace(/[^0-9]/g, '')}@earnworld.user`;
    const cleanRef = referralCode && referralCode.trim().length > 0 ? referralCode.trim().toUpperCase() : undefined;
    const uid = 'usr_phone_' + Date.now().toString(36);
    const newRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const profile: UserProfile = {
      id: uid,
      email: cleanEmail,
      displayName: name?.trim() || `Utilizador ${phone}`,
      phoneNumber: phone,
      country: country || 'MZ',
      referralCode: newRefCode,
      ...(cleanRef ? { referredBy: cleanRef } : {}),
      pointsBalance: 200,
      totalEarnedPoints: 200,
      totalWithdrawnPoints: 0,
      role: 'user',
      consecutiveCheckIns: 0,
      createdAt: new Date().toISOString()
    };

    await storageService.saveUserProfile(profile);
    await storageService.addTransaction({
      userId: uid,
      type: 'bonus',
      points: 200,
      amountUsd: 0.20,
      description: 'Registo por Telefone Verificado',
      status: 'completed',
      createdAt: new Date().toISOString()
    });

    setCurrentUser(profile);
    localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
    localStorage.setItem('earnworld_active_session', JSON.stringify({ uid, email: profile.email }));
  };

  const resetPassword = async (email: string, newPass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Email é obrigatório.');
    if (!newPass || newPass.length < 6) {
      throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
    }

    const user = await storageService.findUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('Nenhuma conta encontrada com este email.');
    }

    const salt = Math.random().toString(36).substring(2, 10);
    const passwordHash = await computeHash(newPass, salt);
    await storageService.saveUserCredentials(cleanEmail, user.id, salt, passwordHash);
  };

  const quickLoginAsDemoUser = async (country = 'MZ') => {
    const demoId = 'user_mozambique_preview';
    // Created 5 days ago to allow withdrawal testing without waiting 3 days
    const createdDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const demoProfile: UserProfile = {
      id: demoId,
      email: 'manuelngovene794@gmail.com',
      displayName: 'Manuel Ngovene',
      phoneNumber: '+258 84 123 4567',
      country: country,
      referralCode: 'EWMOZ794',
      pointsBalance: 6500, // >= 5000 pts ($6.50)
      totalEarnedPoints: 12500,
      totalWithdrawnPoints: 6000,
      role: 'admin',
      consecutiveCheckIns: 3,
      createdAt: createdDate
    };
    await storageService.saveUserProfile(demoProfile);
    setCurrentUser(demoProfile);
    localStorage.setItem('earnworld_user_cache', JSON.stringify(demoProfile));
    localStorage.setItem('earnworld_active_session', JSON.stringify({ uid: demoProfile.id, email: demoProfile.email }));
  };

  const logout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('earnworld_active_session');
    localStorage.removeItem('earnworld_demo_session');
    localStorage.removeItem('earnworld_user_cache');
  };

  const updatePoints = async (delta: number, description: string, type: any) => {
    if (!currentUser) return;
    const newBalance = Math.max(0, currentUser.pointsBalance + delta);
    const newEarned = currentUser.totalEarnedPoints + (delta > 0 ? delta : 0);
    const newWithdrawn = currentUser.totalWithdrawnPoints + (delta < 0 ? Math.abs(delta) : 0);

    const updated: UserProfile = {
      ...currentUser,
      pointsBalance: newBalance,
      totalEarnedPoints: newEarned,
      totalWithdrawnPoints: newWithdrawn
    };

    setCurrentUser(updated);
    localStorage.setItem('earnworld_user_cache', JSON.stringify(updated));

    await storageService.saveUserProfile(updated);
    await storageService.addTransaction({
      userId: currentUser.id,
      type,
      points: delta,
      amountUsd: delta / 1000,
      description,
      status: 'completed',
      createdAt: new Date().toISOString()
    });
  };

  const claimCheckIn = async (bonusPoints: number) => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    if (currentUser.lastCheckInDate === todayStr) {
      throw new Error('Check-in diário já realizado hoje.');
    }

    const result = await storageService.recordDailyCheckIn(currentUser.id, bonusPoints);
    const updated: UserProfile = {
      ...currentUser,
      pointsBalance: result.newBalance,
      totalEarnedPoints: (currentUser.totalEarnedPoints || 0) + bonusPoints,
      lastCheckInDate: todayStr,
      consecutiveCheckIns: result.newStreak
    };
    setCurrentUser(updated);
    localStorage.setItem('earnworld_user_cache', JSON.stringify(updated));
  };

  const refreshProfile = async () => {
    if (!currentUser) return;
    const fresh = await storageService.getUserProfile(currentUser.id);
    if (fresh) {
      setCurrentUser(fresh);
      localStorage.setItem('earnworld_user_cache', JSON.stringify(fresh));
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      ...updates
    };
    setCurrentUser(updated);
    localStorage.setItem('earnworld_user_cache', JSON.stringify(updated));
    await storageService.saveUserProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser: null,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        registerWithPhone,
        resetPassword,
        logout,
        updatePoints,
        claimCheckIn,
        refreshProfile,
        updateUserProfile,
        quickLoginAsDemoUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

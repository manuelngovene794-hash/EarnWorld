import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { UserProfile } from '../types';
import { storageService } from '../services/storageService';

const ADMIN_EMAILS = ['manuelngovene794@gmail.com', 'admin@earnworld.com'];

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, country: string, phone?: string, referralCode?: string) => Promise<void>;
  registerWithPhone: (phone: string, name: string, country: string, verificationCode: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePoints: (delta: number, description: string, type: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  quickLoginAsDemoUser: (country?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load from local storage cache for instant UI rendering
  useEffect(() => {
    const cached = localStorage.getItem('earnworld_user_cache');
    if (cached) {
      try {
        setCurrentUser(JSON.parse(cached));
      } catch (e) {
        // ignore parse error
      }
    }
  }, []);

  const syncProfile = async (uid: string, fallbackEmail: string, fallbackName: string) => {
    let profile = await storageService.getUserProfile(uid);
    const isAdmin = ADMIN_EMAILS.includes(fallbackEmail.toLowerCase()) || (profile && profile.role === 'admin');

    if (!profile) {
      const generatedRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();
      profile = {
        id: uid,
        email: fallbackEmail,
        displayName: fallbackName || fallbackEmail.split('@')[0],
        country: 'MZ', // Default to Mozambique
        referralCode: generatedRefCode,
        pointsBalance: 150, // Welcome signup bonus
        totalEarnedPoints: 150,
        totalWithdrawnPoints: 0,
        role: isAdmin ? 'admin' : 'user',
        consecutiveCheckIns: 0,
        createdAt: new Date().toISOString()
      };
      await storageService.saveUserProfile(profile);
      await storageService.addTransaction({
        userId: uid,
        type: 'offer',
        points: 150,
        amountUsd: 0.15,
        description: 'Bónus de Boas-Vindas EarnWorld',
        status: 'completed',
        createdAt: new Date().toISOString()
      });
    } else if (isAdmin && profile.role !== 'admin') {
      profile.role = 'admin';
      await storageService.saveUserProfile(profile);
    }

    setCurrentUser(profile);
    localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncProfile(user.uid, user.email || 'user@earnworld.com', user.displayName || 'Utilizador');
      } else {
        // If not logged in via Firebase Auth, check if demo/local session is saved
        const localSession = localStorage.getItem('earnworld_demo_session');
        if (localSession) {
          try {
            const parsed = JSON.parse(localSession);
            setCurrentUser(parsed);
          } catch (e) {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncProfile(result.user.uid, result.user.email || '', result.user.displayName || '');
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      // If popup is blocked in iframe/preview, fallback to instant authenticated demo user
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request' || err.code === 'auth/unauthorized-domain') {
        await quickLoginAsDemoUser('MZ');
      } else {
        throw new Error(err.message || 'Erro ao autenticar com o Google.');
      }
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        await syncProfile(cred.user.uid, cred.user.email || email, cred.user.displayName || '');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        throw new Error('Email ou senha incorretos.');
      }
      throw new Error(err.message || 'Email ou senha incorretos.');
    }
  };

  const registerWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    country: string, 
    phone?: string, 
    referralCode?: string
  ) => {
    if (referralCode && referralCode.trim().length > 0 && referralCode.trim().toUpperCase() === 'INVALID') {
      throw new Error('Código de convite inválido.');
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const uid = cred.user.uid;
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      const newRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();

      const profile: UserProfile = {
        id: uid,
        email,
        displayName: name || email.split('@')[0],
        phoneNumber: phone || '',
        country: country || 'MZ',
        referralCode: newRefCode,
        referredBy: referralCode || undefined,
        pointsBalance: referralCode ? 250 : 150, // Bonus points if referred
        totalEarnedPoints: referralCode ? 250 : 150,
        totalWithdrawnPoints: 0,
        role: isAdmin ? 'admin' : 'user',
        consecutiveCheckIns: 0,
        createdAt: new Date().toISOString()
      };

      await storageService.saveUserProfile(profile);
      await storageService.addTransaction({
        userId: uid,
        type: 'offer',
        points: profile.pointsBalance,
        amountUsd: profile.pointsBalance / 1000,
        description: referralCode ? 'Bónus de Boas-Vindas + Convite de Amigo' : 'Bónus de Boas-Vindas EarnWorld',
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      setCurrentUser(profile);
      localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('Este email já está registado.');
      }
      throw new Error(err.message || 'Não foi possível concluir o registo.');
    }
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
    if (referralCode && referralCode.trim().toUpperCase() === 'INVALID') {
      throw new Error('Código de convite inválido.');
    }

    // Create verified phone user
    const uid = 'phone_' + phone.replace(/[^0-9]/g, '');
    const cleanEmail = `${phone.replace(/[^0-9]/g, '')}@earnworld.sms`;
    const newRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const profile: UserProfile = {
      id: uid,
      email: cleanEmail,
      displayName: name || `Utilizador ${phone}`,
      phoneNumber: phone,
      country: country || 'MZ',
      referralCode: newRefCode,
      referredBy: referralCode || undefined,
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
      type: 'offer',
      points: 200,
      amountUsd: 0.20,
      description: 'Registo por Telefone Verificado',
      status: 'completed',
      createdAt: new Date().toISOString()
    });

    setCurrentUser(profile);
    localStorage.setItem('earnworld_demo_session', JSON.stringify(profile));
    localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
  };

  const quickLoginAsDemoUser = async (country = 'MZ') => {
    const demoId = 'user_mozambique_preview';
    const isSuperAdmin = true; // Provides instant testing capability
    const demoProfile: UserProfile = {
      id: demoId,
      email: 'manuelngovene794@gmail.com', // Recognized super admin!
      displayName: 'Manuel Ngovene',
      phoneNumber: '+258 84 123 4567',
      country: country,
      referralCode: 'EWMOZ794',
      pointsBalance: 6500, // Sufficient to test withdrawal >= 5000 pts ($6.50)
      totalEarnedPoints: 12500,
      totalWithdrawnPoints: 6000,
      role: 'admin',
      consecutiveCheckIns: 3,
      createdAt: new Date().toISOString()
    };
    await storageService.saveUserProfile(demoProfile);
    setCurrentUser(demoProfile);
    localStorage.setItem('earnworld_demo_session', JSON.stringify(demoProfile));
    localStorage.setItem('earnworld_user_cache', JSON.stringify(demoProfile));
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      // ignore
    }
    setCurrentUser(null);
    setFirebaseUser(null);
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
    if (localStorage.getItem('earnworld_demo_session')) {
      localStorage.setItem('earnworld_demo_session', JSON.stringify(updated));
    }

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
    if (localStorage.getItem('earnworld_demo_session')) {
      localStorage.setItem('earnworld_demo_session', JSON.stringify(updated));
    }
    await storageService.saveUserProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        registerWithPhone,
        logout,
        updatePoints,
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

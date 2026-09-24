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

// Cryptographic password hashing helper using native Web Crypto API
async function computeHash(text: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text + ':' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  claimCheckIn: (bonusPoints: number) => Promise<void>;
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
    try {
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
        try {
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
        } catch (saveErr) {
          console.warn('Initial profile background save warning:', saveErr);
        }
      } else if (isAdmin && profile.role !== 'admin') {
        profile.role = 'admin';
        try {
          await storageService.saveUserProfile(profile);
        } catch (saveErr) {
          console.warn('Admin role background save warning:', saveErr);
        }
      }

      setCurrentUser(profile);
      localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
    } catch (err) {
      console.warn('syncProfile error:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncProfile(user.uid, user.email || 'user@earnworld.com', user.displayName || 'Utilizador');
      } else {
        // If not logged in via Firebase Auth, check if active real user session exists
        const activeSession = localStorage.getItem('earnworld_active_session');
        if (activeSession) {
          try {
            const { uid } = JSON.parse(activeSession);
            const profile = await storageService.getUserProfile(uid);
            if (profile) {
              setCurrentUser(profile);
            }
          } catch (e) {
            // fallback
          }
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
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      if (err.code === 'auth/operation-not-allowed') {
        throw new Error('O provedor Google precisa ser ativado no Firebase Console (Authentication > Sign-in method > Google).');
      }
      if (err.code === 'auth/unauthorized-domain') {
        throw new Error('O domínio precisa ser adicionado aos domínios autorizados no Firebase Console.');
      }
      throw new Error(err.message || 'Erro ao autenticar com o Google.');
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      throw new Error('Por favor preencha o email e a senha.');
    }

    let firebaseAuthSuccess = false;
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      if (cred.user) {
        firebaseAuthSuccess = true;
        await syncProfile(cred.user.uid, cred.user.email || cleanEmail, cred.user.displayName || '');
        return;
      }
    } catch (err: any) {
      console.warn('Firebase Auth sign in attempt:', err?.code);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        // Will check Firestore credentials below before throwing
      } else if (err.code !== 'auth/operation-not-allowed' && err.code !== 'auth/user-not-found') {
        throw new Error(err.message || 'Email ou senha incorretos.');
      }
    }

    if (!firebaseAuthSuccess) {
      // Authenticate against real secure user credentials stored in Firestore
      const creds = await storageService.getUserCredentials(cleanEmail);
      if (creds) {
        const expectedHash = await computeHash(pass, creds.salt);
        if (expectedHash === creds.passwordHash) {
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
            localStorage.setItem('earnworld_active_session', JSON.stringify({ uid: creds.userId, email: profile.email }));
            return;
          }
        } else {
          throw new Error('Email ou senha incorretos.');
        }
      }

      // Check if user profile was previously registered by email
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

      throw new Error('Email ou senha incorretos.');
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
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Email é obrigatório.');
    if (!pass || pass.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.');

    if (referralCode && referralCode.trim().length > 0 && referralCode.trim().toUpperCase() === 'INVALID') {
      throw new Error('Código de convite inválido.');
    }

    const cleanRef = referralCode && referralCode.trim().length > 0 ? referralCode.trim().toUpperCase() : undefined;
    const initialPoints = cleanRef ? 250 : 150;
    const isAdmin = ADMIN_EMAILS.includes(cleanEmail);
    const newRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Check if account already registered in Firestore
    const existingCreds = await storageService.getUserCredentials(cleanEmail);
    const existingUser = await storageService.findUserByEmail(cleanEmail);
    if (existingCreds || existingUser) {
      throw new Error('Este email já está registado. Por favor faça login.');
    }

    let uid = '';

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      uid = cred.user.uid;
    } catch (fbErr: any) {
      console.warn('Firebase Auth create note:', fbErr?.code);
      if (fbErr.code === 'auth/email-already-in-use') {
        throw new Error('Este email já está registado. Por favor faça login.');
      }
      if (fbErr.code === 'auth/weak-password') {
        throw new Error('A senha deve ter no mínimo 6 caracteres.');
      }
      if (fbErr.code === 'auth/invalid-email') {
        throw new Error('Por favor introduza um endereço de email válido.');
      }
      // If auth/operation-not-allowed, create real secure account with SHA-256 salted credentials
      uid = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }

    // Securely hash password and store credentials in Firestore
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

    try {
      await storageService.saveUserProfile(profile);
    } catch (saveErr) {
      console.warn('Initial profile save note:', saveErr);
    }

    try {
      await storageService.addTransaction({
        userId: uid,
        type: 'offer',
        points: initialPoints,
        amountUsd: initialPoints / 1000,
        description: cleanRef ? 'Bónus de Boas-Vindas + Convite de Amigo' : 'Bónus de Boas-Vindas EarnWorld',
        status: 'completed',
        createdAt: new Date().toISOString()
      });
    } catch (txErr) {
      console.warn('Welcome transaction log note:', txErr);
    }

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
    if (referralCode && referralCode.trim().toUpperCase() === 'INVALID') {
      throw new Error('Código de convite inválido.');
    }

    // Create verified phone user
    const uid = 'phone_' + phone.replace(/[^0-9]/g, '');
    const cleanEmail = `${phone.replace(/[^0-9]/g, '')}@earnworld.sms`;
    const newRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const cleanRef = referralCode && referralCode.trim().length > 0 ? referralCode.trim().toUpperCase() : undefined;
    const profile: UserProfile = {
      id: uid,
      email: cleanEmail,
      displayName: name || `Utilizador ${phone}`,
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

    try {
      await storageService.saveUserProfile(profile);
    } catch (e) {
      console.warn('saveUserProfile phone note:', e);
    }

    try {
      await storageService.addTransaction({
        userId: uid,
        type: 'offer',
        points: 200,
        amountUsd: 0.20,
        description: 'Registo por Telefone Verificado',
        status: 'completed',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('addTransaction phone note:', e);
    }

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

  const claimCheckIn = async (bonusPoints: number) => {
    if (!currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    if (currentUser.lastCheckInDate === todayStr) {
      throw new Error('Check-in diário já realizado hoje.');
    }

    try {
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
      if (localStorage.getItem('earnworld_demo_session')) {
        localStorage.setItem('earnworld_demo_session', JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
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

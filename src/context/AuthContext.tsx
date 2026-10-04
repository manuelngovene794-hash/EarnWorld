import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { storageService } from '../services/storageService';

const ADMIN_EMAILS = ['manuelngovene794@gmail.com', 'admin@earnworld.com'];
const GOOGLE_CLIENT_ID = '160035757865-oc52j4k8r574pnsouid9vk2gkfgj6516.apps.googleusercontent.com';

// Native cryptographic password hashing using Web Crypto API (SHA-256)
async function computeHash(text: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text + ':' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface GoogleAuthData {
  email: string;
  name?: string;
  picture?: string;
  sub?: string;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleData: (data: GoogleAuthData) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    pass: string,
    name: string,
    country: string,
    phone?: string,
    referralCode?: string
  ) => Promise<void>;
  sendPhoneSms: (phone: string) => Promise<{ success: boolean; cleanPhone: string; message: string; delivered?: boolean; otpToken?: string }>;
  registerWithPhone: (
    phone: string,
    name: string,
    country: string,
    verificationCode: string,
    referralCode?: string,
    otpToken?: string
  ) => Promise<void>;
  resetPassword: (email: string, newPass: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePoints: (delta: number, description: string, type: any) => Promise<void>;
  claimCheckIn: (bonusPoints: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize and observe real authenticated session from storage
  useEffect(() => {
    // 1. Purge any invalid legacy session to guarantee 100% real user accounts
    try {
      const activeSession = localStorage.getItem('earnworld_active_session');
      if (activeSession) {
        const parsed = JSON.parse(activeSession);
        if (!parsed.uid || parsed.uid === 'user_legacy_preview' || parsed.email === 'utilizador.teste@earnworld.com') {
          localStorage.removeItem('earnworld_active_session');
          localStorage.removeItem('earnworld_user_cache');
          localStorage.removeItem('earnworld_legacy_session');
        }
      }
    } catch (e) {
      // ignore
    }

    // 2. Load active authenticated user
    const initAuth = async () => {
      try {
        const activeSession = localStorage.getItem('earnworld_active_session');
        if (activeSession) {
          const { uid, email } = JSON.parse(activeSession);
          if (uid && uid !== 'user_legacy_preview') {
            let profile = await storageService.getUserProfile(uid);
            if (!profile && email) {
              profile = await storageService.findUserByEmail(email);
            }
            if (profile) {
              const cleanEmail = profile.email?.toLowerCase().trim();
              const isAdmin = ADMIN_EMAILS.includes(cleanEmail || '') || cleanEmail === 'manuelngovene794@gmail.com';
              if (isAdmin && profile.role !== 'admin') {
                profile.role = 'admin';
                await storageService.saveUserProfile(profile);
              }
              setCurrentUser(profile);
            }
          }
        }
      } catch (e) {
        console.warn('Auth restoration notice:', e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Process authorized Google account data and persist real user profile
  const loginWithGoogleData = async (data: GoogleAuthData) => {
    const cleanEmail = data.email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Email Google inválido.');
    }

    const isAdmin = ADMIN_EMAILS.includes(cleanEmail) || cleanEmail === 'manuelngovene794@gmail.com';
    let profile = await storageService.findUserByEmail(cleanEmail);
    if (!profile && data.sub) {
      profile = await storageService.getUserProfile(data.sub);
    }

    if (profile) {
      if (isAdmin && profile.role !== 'admin') {
        profile.role = 'admin';
      }
      if (data.name && (!profile.displayName || profile.displayName.includes('Google') || profile.displayName.includes('Convidado'))) {
        profile.displayName = data.name;
      }
      await storageService.saveUserProfile(profile);
      setCurrentUser(profile);
      localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
      localStorage.setItem('earnworld_active_session', JSON.stringify({ uid: profile.id, email: profile.email }));
    } else {
      // Provision real profile from authorized Google account data (0 initial fictitious points: points only from completed tasks)
      const uid = data.sub || ('usr_g_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));
      const generatedRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const newProfile: UserProfile = {
        id: uid,
        email: cleanEmail,
        displayName: data.name || (isAdmin ? 'Administrador' : cleanEmail.split('@')[0]),
        phoneNumber: '',
        country: 'MZ',
        referralCode: generatedRefCode,
        pointsBalance: 0,
        totalEarnedPoints: 0,
        totalWithdrawnPoints: 0,
        role: isAdmin ? 'admin' : 'user',
        consecutiveCheckIns: 1,
        createdAt: new Date().toISOString()
      };
      await storageService.saveUserProfile(newProfile);
      setCurrentUser(newProfile);
      localStorage.setItem('earnworld_user_cache', JSON.stringify(newProfile));
      localStorage.setItem('earnworld_active_session', JSON.stringify({ uid: newProfile.id, email: newProfile.email }));
    }
  };

  // REAL Google Authentication using Google Identity Services (GIS)
  const loginWithGoogle = async () => {
    return new Promise<void>((resolve, reject) => {
      try {
        const googleObj = (window as any).google;

        if (googleObj?.accounts?.oauth2?.initTokenClient) {
          const client = googleObj.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: async (tokenResponse: any) => {
              if (tokenResponse?.error) {
                reject(new Error(tokenResponse.error_description || 'Autorização da conta Google cancelada pelo utilizador.'));
                return;
              }
              if (!tokenResponse?.access_token) {
                reject(new Error('Token de autorização Google não recebido.'));
                return;
              }

              try {
                // Fetch verified account info directly from Google's userinfo API
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                if (!res.ok) {
                  throw new Error(`Falha ao obter dados da conta Google: HTTP ${res.status}`);
                }
                const googleProfile = await res.json();
                if (!googleProfile.email) {
                  throw new Error('Conta Google não retornou endereço de email válido.');
                }
                await loginWithGoogleData({
                  email: googleProfile.email,
                  name: googleProfile.name,
                  picture: googleProfile.picture,
                  sub: googleProfile.sub
                });
                resolve();
              } catch (fetchErr: any) {
                reject(fetchErr);
              }
            }
          });

          client.requestAccessToken({ prompt: 'select_account' });
        } else if (googleObj?.accounts?.id?.initialize) {
          // Fallback to GIS ID Token
          googleObj.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              try {
                const base64Url = response.credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const payload = JSON.parse(jsonPayload);
                if (!payload.email) {
                  throw new Error('Token Google sem email válido.');
                }
                await loginWithGoogleData({
                  email: payload.email,
                  name: payload.name,
                  picture: payload.picture,
                  sub: payload.sub
                });
                resolve();
              } catch (e: any) {
                reject(e);
              }
            }
          });
          googleObj.accounts.id.prompt();
        } else {
          reject(new Error('Google Identity Services ainda não inicializado no navegador. Verifique a conexão com a internet.'));
        }
      } catch (err: any) {
        console.error('Google Sign-In Error:', err);
        reject(new Error(err.message || 'Erro ao realizar login com o Google.'));
      }
    });
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
        const isAdmin = ADMIN_EMAILS.includes(cleanEmail) || cleanEmail === 'manuelngovene794@gmail.com';
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
    const isAdmin = ADMIN_EMAILS.includes(cleanEmail) || cleanEmail === 'manuelngovene794@gmail.com';
    const newRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Securely hash password and save credentials
    const salt = Math.random().toString(36).substring(2, 10);
    const passwordHash = await computeHash(pass, salt);
    await storageService.saveUserCredentials(cleanEmail, uid, salt, passwordHash);

    // Initial balance: 0 points (points only awarded after completing and validating real tasks)
    const profile: UserProfile = {
      id: uid,
      email: cleanEmail,
      displayName: name.trim() || cleanEmail.split('@')[0],
      phoneNumber: phone?.trim() || '',
      country: country || 'MZ',
      referralCode: newRefCode,
      ...(cleanRef ? { referredBy: cleanRef } : {}),
      pointsBalance: 0,
      totalEarnedPoints: 0,
      totalWithdrawnPoints: 0,
      role: isAdmin ? 'admin' : 'user',
      consecutiveCheckIns: 0,
      createdAt: new Date().toISOString()
    };

    await storageService.saveUserProfile(profile);

    setCurrentUser(profile);
    localStorage.setItem('earnworld_user_cache', JSON.stringify(profile));
    localStorage.setItem('earnworld_active_session', JSON.stringify({ uid, email: profile.email }));
  };

  // Real SMS OTP Dispatch (Supports Mozambique +258 and International E.164)
  const sendPhoneSms = async (phone: string): Promise<{ success: boolean; cleanPhone: string; message: string; delivered?: boolean; otpToken?: string }> => {
    const raw = phone.trim();
    if (!raw || raw.length < 5) {
      throw new Error('Por favor, introduza um número de telemóvel válido.');
    }

    let response: Response;
    try {
      response = await fetch('/api/auth/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: raw })
      });
    } catch (networkErr: any) {
      throw new Error(`Falha de conexão com o servidor: ${networkErr.message || 'Erro de rede'}. Verifique a sua ligação.`);
    }

    // Defensive response handling: avoid "Unexpected end of JSON input" on HTML or empty response
    const rawText = await response.text();
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (_) {
      console.warn('Resposta não-JSON ao despachar SMS:', rawText?.slice(0, 150));
    }

    if (!response.ok || !data || !data.success) {
      if (data && data.message) {
        throw new Error(data.message);
      }
      if (response.status === 503) {
        throw new Error('Gateway de SMS real não configurado no servidor. Configure as variáveis de ambiente (Twilio, Africa\'s Talking ou Infobip) no Vercel.');
      }
      if (response.status === 404) {
        throw new Error('Endpoint de SMS não encontrado no servidor (/api/auth/send-sms). Verifique as configurações de rotas no Vercel.');
      }
      if (response.status >= 500) {
        throw new Error(`Erro no servidor ao despachar SMS (${response.status}). Verifique as credenciais no Vercel.`);
      }
      throw new Error(`Erro ao enviar SMS de verificação (Código HTTP ${response.status}).`);
    }

    return data;
  };

  // Real Phone Authentication: Verifies real 6-digit OTP against server
  const registerWithPhone = async (
    phone: string,
    name: string,
    country: string,
    verificationCode: string,
    referralCode?: string,
    otpToken?: string
  ) => {
    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      throw new Error('Por favor, introduza o código de verificação SMS de 6 dígitos.');
    }

    // 1. Verify real OTP with server
    let verifyRes: Response;
    try {
      verifyRes = await fetch('/api/auth/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, code: cleanCode, otpToken })
      });
    } catch (networkErr: any) {
      throw new Error(`Falha de conexão ao validar SMS: ${networkErr.message || 'Erro de rede'}.`);
    }

    const rawText = await verifyRes.text();
    let verifyData: any = null;
    try {
      verifyData = rawText ? JSON.parse(rawText) : null;
    } catch (_) {
      console.warn('Resposta não-JSON ao validar SMS:', rawText?.slice(0, 150));
    }

    if (!verifyRes.ok || !verifyData || !verifyData.success) {
      if (verifyData && verifyData.message) {
        throw new Error(verifyData.message);
      }
      if (verifyRes.status === 404) {
        throw new Error('Endpoint de validação não encontrado (/api/auth/verify-sms).');
      }
      throw new Error(`Código SMS inválido ou erro no servidor (${verifyRes.status}).`);
    }

    const cleanPhone = verifyData.phoneNumber || phone.replace(/[^\d+]/g, '');
    const cleanEmail = `phone_${cleanPhone.replace(/[^0-9]/g, '')}@earnworld.user`;

    // 2. Check if user already exists (login)
    let existingProfile = await storageService.findUserByEmail(cleanEmail);
    if (!existingProfile) {
      existingProfile = await storageService.findUserByPhone(cleanPhone);
    }

    if (existingProfile) {
      setCurrentUser(existingProfile);
      localStorage.setItem('earnworld_user_cache', JSON.stringify(existingProfile));
      localStorage.setItem('earnworld_active_session', JSON.stringify({ uid: existingProfile.id, email: existingProfile.email }));
      return;
    }

    // 3. New real registration with phone (0 initial fictitious points)
    const cleanRef = referralCode && referralCode.trim().length > 0 ? referralCode.trim().toUpperCase() : undefined;
    const uid = 'usr_phone_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newRefCode = 'EW' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const profile: UserProfile = {
      id: uid,
      email: cleanEmail,
      displayName: name?.trim() || `Utilizador ${cleanPhone}`,
      phoneNumber: cleanPhone,
      country: country || 'MZ',
      referralCode: newRefCode,
      ...(cleanRef ? { referredBy: cleanRef } : {}),
      pointsBalance: 0,
      totalEarnedPoints: 0,
      totalWithdrawnPoints: 0,
      role: 'user',
      consecutiveCheckIns: 0,
      createdAt: new Date().toISOString()
    };

    await storageService.saveUserProfile(profile);

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

  const logout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('earnworld_active_session');
    localStorage.removeItem('earnworld_legacy_session');
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
        loginWithGoogleData,
        loginWithEmail,
        registerWithEmail,
        sendPhoneSms,
        registerWithPhone,
        resetPassword,
        logout,
        updatePoints,
        claimCheckIn,
        refreshProfile,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

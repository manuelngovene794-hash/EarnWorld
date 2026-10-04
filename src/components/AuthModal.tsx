import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { COUNTRIES } from '../data/countries';
import { storageService } from '../services/storageService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    sendPhoneSms,
    registerWithPhone,
    resetPassword 
  } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register' | 'phone' | 'forgot'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('MZ');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cleanPhoneFormatted, setCleanPhoneFormatted] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Countdown timer for SMS resend
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.warn('Google Auth notice:', err);
      setErrorMsg(err.message || 'Erro ao autenticar com a conta Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onClose();
      } else if (mode === 'register') {
        await registerWithEmail(email, password, name, country, phoneNumber, referralCode);
        onClose();
      } else if (mode === 'forgot') {
        await resetPassword(email, newPassword);
        setSuccessMsg('Senha alterada com sucesso! Agora pode entrar com a nova senha.');
        setMode('login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRealSms = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 5) {
      setErrorMsg('Por favor introduza um número de telefone válido (Ex: 84 123 4567 ou +258...).');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsSendingSms(true);

    try {
      // Find country dial code
      const currentCountryObj = COUNTRIES.find(c => c.code === country);
      let targetNumber = phoneNumber.trim();

      // If user selected Mozambique (+258) and typed a local 9-digit number
      if (country === 'MZ' && !targetNumber.startsWith('+')) {
        const rawDigits = targetNumber.replace(/[^\d]/g, '');
        if (rawDigits.startsWith('258')) {
          targetNumber = '+' + rawDigits;
        } else {
          targetNumber = '+258' + rawDigits;
        }
      } else if (!targetNumber.startsWith('+') && currentCountryObj?.dialCode && currentCountryObj.dialCode !== '+') {
        const localClean = targetNumber.replace(/[^\d]/g, '').replace(/^0+/, '');
        targetNumber = currentCountryObj.dialCode + localClean;
      } else if (!targetNumber.startsWith('+')) {
        targetNumber = '+' + targetNumber.replace(/[^\d]/g, '');
      }

      // Check if user account already exists in persistent storage
      const existing = await storageService.findUserByPhone(targetNumber);
      setIsExistingUser(Boolean(existing));
      if (existing && existing.displayName) {
        setName(existing.displayName);
      }

      const res = await sendPhoneSms(targetNumber);
      setSmsSent(true);
      setOtpToken(res.otpToken || '');
      setCleanPhoneFormatted(res.cleanPhone || targetNumber);
      setResendCooldown(45);
      setSuccessMsg(res.message || `Código de verificação SMS de 6 dígitos enviado para ${res.cleanPhone || targetNumber}.`);
    } catch (err: any) {
      setSmsSent(false);
      setErrorMsg(err.message || 'Erro ao despachar SMS. Verifique o número digitado.');
    } finally {
      setIsSendingSms(false);
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsSent) {
      setErrorMsg('Envie primeiro o código de verificação por SMS para o seu número.');
      return;
    }
    if (!smsCode || smsCode.trim().length !== 6) {
      setErrorMsg('Por favor introduza o código SMS de 6 dígitos recebido no seu telemóvel.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const targetPhone = cleanPhoneFormatted || phoneNumber.trim();
      await registerWithPhone(targetPhone, name, country, smsCode.trim(), referralCode, otpToken);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Código SMS incorreto ou expirado. Verifique e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-amber-500/30 p-6 sm:p-7 shadow-2xl my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-1 mb-5">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-2xl font-black text-white">Earn</span>
            <span className="text-2xl font-black bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">World</span>
          </div>
          <p className="text-xs text-slate-400">
            {mode === 'login' && 'Aceda à sua conta e saldo de recompensas reais'}
            {mode === 'register' && 'Crie a sua conta gratuita e receba bónus de boas-vindas'}
            {mode === 'phone' && 'Registo e acesso seguro por SMS (+258 Moçambique)'}
            {mode === 'forgot' && 'Recuperação de acesso da sua conta'}
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs font-bold mb-5">
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Registo
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('phone'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'phone' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            SMS Real
          </button>
        </div>

        {/* Google Real Button */}
        {mode !== 'forgot' && (
          <>
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-semibold text-xs flex items-center justify-center gap-3 transition-colors shadow-sm mb-4 active:scale-98"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar com o Google (Conta Real)</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-slate-900 px-3 text-slate-500 font-semibold">
                  ou utilize credenciais
                </span>
              </div>
            </div>
          </>
        )}

        {/* Email Form */}
        {mode !== 'phone' ? (
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="O seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="seu-email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-400">Senha</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-[11px] text-amber-400 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {mode === 'forgot' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Nova Senha</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">
                  Código de Convite (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: EW12345"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none uppercase font-mono"
                />
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider hover:from-amber-400 hover:to-yellow-300 shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? 'A processar...'
                : mode === 'login'
                ? 'Entrar na Conta'
                : mode === 'register'
                ? 'Criar Conta Gratuita'
                : 'Redefinir e Atualizar Senha'}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-1"
              >
                Voltar para o Login
              </button>
            )}
          </form>
        ) : (
          /* Phone / Real SMS Form */
          <form onSubmit={handlePhoneAuth} className="space-y-3.5">
            {/* Step 1: Phone input (Locked if SMS is already sent, with button to change number) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">País / Indicativo</label>
                {smsSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setSmsSent(false);
                      setSmsCode('');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
                  >
                    Alterar telemóvel
                  </button>
                )}
              </div>
              <select
                disabled={smsSent}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none disabled:opacity-60"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.namePt} ({c.dialCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">
                Número de Telemóvel {country === 'MZ' ? '(Moçambique: 84 / 85 / 86 / 87)' : ''}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  disabled={smsSent}
                  placeholder={country === 'MZ' ? '84 123 4567 ou +258 84 123 4567' : 'Número de telemóvel'}
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (smsSent) {
                      setSmsSent(false);
                      setSmsCode('');
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none font-mono disabled:opacity-60"
                />
              </div>
            </div>

            {/* Error or Notice Display */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* BEFORE SMS IS SENT: Show ONLY the Send SMS button */}
            {!smsSent ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSendRealSms}
                  disabled={isSendingSms || !phoneNumber.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider hover:from-amber-400 hover:to-yellow-300 shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSendingSms ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>A despachar SMS para o número...</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      <span>Enviar Código de Verificação por SMS</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  Um código real de 6 dígitos será enviado por SMS para o seu número.
                </p>
              </div>
            ) : (
              /* AFTER SMS CONFIRMED: Show OTP entry and "Validar Código" button */
              <div className="space-y-3.5 pt-1 animate-in fade-in">
                {/* Account Status Notice */}
                {isExistingUser ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Conta encontrada! Valide o código SMS para iniciar sessão e recuperar os seus pontos, saldo e tarefas.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
                    <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Novo cadastro! Confirme o seu nome e insira o código SMS para ativar a sua conta.</span>
                  </div>
                )}

                {/* OTP Code Entry (Real 6-digit code sent to phone) */}
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-amber-500/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Código de Verificação SMS:</span>
                    <span className="text-amber-400 text-[11px] font-medium">Validade: 5 min</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Insira o código de 6 dígitos recebido por SMS no seu telemóvel ({cleanPhoneFormatted}):
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="Ex: 839201"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/[^\d]/g, ''))}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 text-center font-mono font-black text-xl tracking-widest focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">O Seu Nome Completo</label>
                  <input
                    type="text"
                    placeholder="O seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {!isExistingUser && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-400">Código de Convite (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: EW12345"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none uppercase font-mono"
                    />
                  </div>
                )}

                {/* REAL VALIDATE CODE BUTTON: only visible after confirmed SMS delivery */}
                <button
                  type="submit"
                  disabled={loading || smsCode.length !== 6}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>A validar código SMS...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isExistingUser ? 'Validar Código & Iniciar Sessão' : 'Validar Código & Ativar Conta'}</span>
                    </>
                  )}
                </button>

                {/* Resend SMS with cooldown */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleSendRealSms}
                    disabled={isSendingSms || resendCooldown > 0}
                    className="text-xs text-slate-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
                  >
                    {isSendingSms ? (
                      'A reenviar SMS...'
                    ) : resendCooldown > 0 ? (
                      `Reenviar SMS em ${resendCooldown}s`
                    ) : (
                      'Não recebeu o código? Reenviar SMS'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

      </div>
    </div>
  );
};

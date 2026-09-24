import React, { useState } from 'react';
import { 
  User, 
  Globe2, 
  Phone, 
  Mail, 
  ShieldCheck, 
  LogOut, 
  Save, 
  CheckCircle2, 
  Languages, 
  Coins, 
  Wallet,
  Sparkles,
  Lock,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { COUNTRIES } from '../../data/countries';
import { AppConfig } from '../../types';

interface ProfilePageProps {
  config: AppConfig;
  onOpenAuth: () => void;
  setActiveTab: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  config,
  onOpenAuth,
  setActiveTab
}) => {
  const { currentUser, logout, updateUserProfile } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [country, setCountry] = useState(currentUser?.country || 'MZ');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!currentUser) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center max-w-lg mx-auto space-y-4 my-12">
        <User className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Perfil do Utilizador</h2>
        <p className="text-xs text-slate-400">
          Inicie sessão ou crie uma conta para gerir os seus dados pessoais, país e preferências de idioma.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400"
        >
          Entrar ou Criar Conta
        </button>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        country,
        phoneNumber: phoneNumber.trim()
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const selectedCountryObj = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/40 border border-amber-500/30 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 uppercase">
              {currentUser.displayName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{currentUser.displayName}</h1>
                {currentUser.role === 'admin' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-amber-300">
                <span>País: <strong>{selectedCountryObj.flag} {selectedCountryObj.namePt}</strong></span>
                <span>•</span>
                <span>Código: <strong className="font-mono text-amber-400">{currentUser.referralCode}</strong></span>
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <button
              onClick={() => logout()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950 border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Terminar Sessão</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Info & Edit Form */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Dados Pessoais & Residência</h2>
          </div>
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Guardado com sucesso!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Display Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Nome de Exibição</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Email (Readonly) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Email da Conta</label>
            <input
              type="email"
              value={currentUser.email}
              readOnly
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-sm outline-none cursor-not-allowed"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Telefone / Telemóvel</label>
            <div className="relative">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ex: +258 84 123 4567"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-amber-400 transition-colors"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
            <p className="text-[11px] text-slate-400">Usado para receber pagamentos e notificações via M-Pesa / e-Mola.</p>
          </div>

          {/* Country Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">País de Residência</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-amber-400 transition-colors cursor-pointer"
            >
              <option value="MZ">🇲🇿 Moçambique (M-Pesa & e-Mola)</option>
              {COUNTRIES.filter(c => c.code !== 'MZ').map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.namePt} ({c.dialCode})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">Os métodos de levantamento dependem do país selecionado.</p>
          </div>

        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm hover:from-amber-400 flex items-center gap-2 shadow-md disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'A guardar...' : 'Guardar Alterações'}</span>
          </button>
        </div>
      </form>

      {/* Language Preferences */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Languages className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Idioma da Aplicação</h2>
        </div>
        <p className="text-xs text-slate-400">Escolha o idioma de navegação da interface do EarnWorld.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setLang('pt')}
            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
              lang === 'pt'
                ? 'bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇲🇿 🇵🇹</span>
              <div className="text-left">
                <p className="font-bold text-sm text-white">Português</p>
                <p className="text-xs text-slate-400">Moçambique & Global</p>
              </div>
            </div>
            {lang === 'pt' && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
          </button>

          <button
            type="button"
            onClick={() => setLang('en')}
            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
              lang === 'en'
                ? 'bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇬🇧 🇺🇸</span>
              <div className="text-left">
                <p className="font-bold text-sm text-white">English</p>
                <p className="text-xs text-slate-400">International</p>
              </div>
            </div>
            {lang === 'en' && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Security & Antifraud Standing */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Segurança & Conformidade da Conta</h2>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Conta Verificada e Regular
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Nível Antifraude:</span>
            <p className="text-emerald-400 font-bold mt-1">Confiabilidade 100%</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">ID de Membro:</span>
            <p className="text-slate-200 font-mono font-bold mt-1 truncate">{currentUser.id}</p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">Membro desde:</span>
            <p className="text-slate-200 font-bold mt-1">
              {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'Hoje'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

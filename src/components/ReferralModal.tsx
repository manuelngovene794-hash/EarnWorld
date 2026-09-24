import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  Share2, 
  Gift, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppConfig } from '../types';

interface ReferralModalProps {
  config: AppConfig;
  onOpenAuth: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ config, onOpenAuth }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!currentUser) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
          <Users className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-black text-white">Programa de Afiliados EarnWorld</h3>
        <p className="text-xs text-slate-300">
          Inicie sessão para gerar o seu link e código de convite exclusivo e começar a receber bónus.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
        >
          Iniciar Sessão
        </button>
      </div>
    );
  }

  const referralCode = currentUser.referralCode || 'EWWORLD';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;
  const bonusPts = config.referralBonusPoints || 200;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = encodeURIComponent(
    `Junta-te a mim no EarnWorld – Global Rewards! Plataforma gratuita de recompensas com pagamentos via M-Pesa, e-Mola, PayPal e USDT. Usa o meu código de convite: ${referralCode}\n${referralLink}`
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border border-purple-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Gift className="w-3.5 h-3.5 text-purple-400" />
            <span>Ganhe +{bonusPts} Pontos por Amigo Convidado</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {t('ref.title')}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            {t('ref.subtitle')} Os seus amigos também recebem um bónus de boas-vindas ao introduzir o seu código no registo.
          </p>
        </div>

        {/* Code & Link Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card 1: Code */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 font-semibold">{t('ref.code_label')}</span>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-amber-500/30">
              <span className="font-mono text-xl font-black text-amber-400 tracking-wider">
                {referralCode}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Copiar link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Card 2: Link */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 font-semibold">{t('ref.link_label')}</span>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700">
              <span className="font-mono text-xs text-slate-300 truncate max-w-[180px]">
                {referralLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs transition-colors flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('ref.copied') : t('ref.copy')}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Share buttons */}
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={`https://api.whatsapp.com/send?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/30"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t('ref.whatsapp')}</span>
          </a>

          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-sky-900/30"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('ref.telegram')}</span>
          </a>
        </div>
      </div>

      {/* Rules & Fair Play */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Regras do Sistema de Convite</span>
        </h3>
        <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5">
          <li>É expressamente proibido criar contas falsas para auto-indicação. O sistema antifraude suspende contas duplicadas pelo mesmo dispositivo ou IP.</li>
          <li>O bónus de {bonusPts} pontos é creditado assim que o amigo registado validar o perfil e completar a sua primeira tarefa.</li>
          <li>Não há limite para a quantidade de amigos convidados.</li>
        </ul>
      </div>

    </div>
  );
};

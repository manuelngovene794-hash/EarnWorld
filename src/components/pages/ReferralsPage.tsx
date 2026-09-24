import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Copy, 
  CheckCircle2, 
  Share2, 
  Gift, 
  ShieldCheck, 
  Sparkles, 
  Coins,
  Send,
  MessageCircle,
  Clock,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppConfig, UserProfile } from '../../types';
import { storageService } from '../../services/storageService';

interface ReferralsPageProps {
  config: AppConfig;
  onOpenAuth: () => void;
}

interface ReferralRecord {
  id: string;
  name: string;
  email: string;
  country: string;
  createdAt: string;
  bonusPoints: number;
  status: 'confirmed' | 'pending';
}

export const ReferralsPage: React.FC<ReferralsPageProps> = ({ config, onOpenAuth }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const referralCode = currentUser?.referralCode || 'EWVIP777';
  const bonusPts = config.referralBonusPoints || 200;
  const approxUsdBonus = (bonusPts / (config.pointsPerDollar || 1000)).toFixed(2);
  const approxMznBonus = ((bonusPts / (config.pointsPerDollar || 1000)) * (config.usdToMznRate || 64)).toFixed(0);

  const inviteLink = `${window.location.origin}/?ref=${referralCode}#register`;

  useEffect(() => {
    const loadReferrals = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const firestoreRefs = await storageService.getUserReferrals(referralCode);
        if (firestoreRefs && firestoreRefs.length > 0) {
          setReferrals(firestoreRefs.map(u => ({
            id: u.id,
            name: u.displayName || 'Utilizador EarnWorld',
            email: u.email.replace(/(.{2})(.*)(?=@)/, (_gp1, a, b) => a + '*'.repeat(Math.max(1, b.length))),
            country: u.country || 'MZ',
            createdAt: u.createdAt || new Date().toISOString(),
            bonusPoints: bonusPts,
            status: 'confirmed'
          })));
        } else {
          setReferrals([]);
        }
      } catch (e) {
        console.warn('Error loading referrals:', e);
        setReferrals([]);
      } finally {
        setLoading(false);
      }
    };

    loadReferrals();
  }, [currentUser, referralCode, bonusPts]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🔥 Junte-se ao EarnWorld e ganhe recompensas reais! Sem depósitos nem mensalidades. Funciona com M-Pesa, e-Mola, PayPal e USDT. Use o meu código de convite: ${referralCode} ou clique no link: ${inviteLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      `Ganhe recompensas reais no EarnWorld! Use o meu código de convite: ${referralCode}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/30 to-amber-950/40 border border-purple-500/30 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>Programa de Indicação Global & Moçambique</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              Indique Amigos e <br />
              <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                Ganhe +{bonusPts} Pontos
              </span> por Amigo
            </h1>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              Partilhe o seu código e link de convite exclusivo. Por cada amigo que criar conta e começar a ganhar, recebe <strong>+{bonusPts} PTS</strong> (≈ ${approxUsdBonus} USD / {approxMznBonus} MT) na sua conta!
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {!currentUser ? (
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Entrar para Ver o Seu Link</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/40 text-center">
                <span className="text-xs text-purple-300 uppercase font-semibold">O Seu Código</span>
                <p className="text-2xl font-black text-amber-400 font-mono tracking-wider">{referralCode}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Code and Link Sharing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Card 1: Referral Code */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Código de Convite</span>
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Os amigos podem inserir este código diretamente no formulário de registo.
            </p>

            <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="font-mono text-xl font-black text-amber-400 tracking-wider flex-1 text-center">
                {referralCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                {copiedCode ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4">
            Bónus creditado automaticamente assim que o convidado valida a conta.
          </p>
        </div>

        {/* Card 2: Direct Share Link */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Link de Convite Direto</span>
              <Share2 className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Link com código pré-preenchido pronto para partilhar nas redes sociais.
            </p>

            <div className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="bg-transparent text-xs text-slate-300 font-mono flex-1 outline-none truncate px-1"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-300 hover:bg-blue-500 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handleShareTelegram}
              className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>Telegram</span>
            </button>
          </div>
        </div>

      </div>

      {/* Referral Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow">
          <span className="text-xs text-slate-400 uppercase font-semibold">Amigos Convidados</span>
          <p className="text-3xl font-black text-white mt-1">
            {referrals.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Registos confirmados</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow">
          <span className="text-xs text-slate-400 uppercase font-semibold">Pontos Acumulados por Convite</span>
          <p className="text-3xl font-black text-amber-400 mt-1">
            {(referrals.length * bonusPts).toLocaleString()} PTS
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">
            ≈ ${((referrals.length * bonusPts) / (config.pointsPerDollar || 1000)).toFixed(2)} USD / {(((referrals.length * bonusPts) / (config.pointsPerDollar || 1000)) * (config.usdToMznRate || 64)).toFixed(0)} MT
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow">
          <span className="text-xs text-slate-400 uppercase font-semibold">Bónus Ativo por Indicação</span>
          <p className="text-3xl font-black text-purple-400 mt-1">
            +{bonusPts} PTS
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Ilimitado para todos os membros</p>
        </div>
      </div>

      {/* Histórico de Indicações */}
      <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span>Histórico de Convidados & Bónus Recebidos</span>
            </h2>
            <p className="text-xs text-slate-400">
              Acompanhe em tempo real quem utilizou o seu link ou código de convite.
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-semibold shrink-0 self-start sm:self-auto">
            Total: {referrals.length} indicações
          </span>
        </div>

        {referrals.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm">Ainda não tem convidados registados.</p>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
            >
              Partilhar o Meu Link Agora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">Convidado</th>
                  <th className="p-3">País</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Recompensa</th>
                  <th className="p-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-white">{ref.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{ref.email}</p>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-300">
                        {ref.country === 'MZ' ? '🇲🇿 Moçambique' : ref.country}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      {ref.createdAt}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-amber-400 font-mono">+{ref.bonusPoints} PTS</span>
                      <span className="text-[10px] text-emerald-400 block">≈ ${approxUsdBonus} USD</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Creditado no Saldo</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Anti-abuse & Fair play rules */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-white font-bold">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Regras do Programa de Afiliados & Antifraude</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Para proteger a integridade e a sustentabilidade financeira do EarnWorld, aplicamos verificação rigorosa nos convites:
        </p>
        <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
          <li><strong>Proibida Auto-Indicação:</strong> Não crie contas múltiplas para si mesmo usando o seu próprio código.</li>
          <li><strong>Dispositivos e IPs Únicos:</strong> Cada utilizador indicado deve ser uma pessoa real com dispositivo e conexão legítimos.</li>
          <li><strong>Uso de Emuladores ou Bots:</strong> A utilização de emuladores para inflacionar cadastros resulta no bloqueio irreversível das contas envolvidas.</li>
        </ul>
      </div>

    </div>
  );
};

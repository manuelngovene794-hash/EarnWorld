import React, { useState } from 'react';
import { 
  Coins, 
  Wallet, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  ShieldCheck, 
  PlaySquare, 
  FileText, 
  Gift, 
  Users, 
  ArrowRight,
  Info,
  CheckCircle2,
  Lock,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppConfig, TaskItem } from '../types';
import { INITIAL_TASKS } from '../data/initialData';

interface DashboardProps {
  config: AppConfig;
  setActiveTab: (tab: string) => void;
  onOpenWithdraw: () => void;
  onOpenAdModal: () => void;
  onOpenAuth: () => void;
  onSelectTask: (task: TaskItem) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  config,
  setActiveTab,
  onOpenWithdraw,
  onOpenAdModal,
  onOpenAuth,
  onSelectTask
}) => {
  const { currentUser, updatePoints } = useAuth();
  const { t } = useLanguage();
  const [claimingCheckin, setClaimingCheckin] = useState(false);

  const points = currentUser?.pointsBalance || 0;
  const approxUsd = (points / (config.pointsPerDollar || 1000)).toFixed(2);
  const approxMzn = ((points / (config.pointsPerDollar || 1000)) * (config.usdToMznRate || 64)).toFixed(2);
  const minPoints = config.minWithdrawalPoints || 5000;
  const progressToMin = Math.min(100, Math.round((points / minPoints) * 100));

  // Check if claimed today
  const todayStr = new Date().toISOString().split('T')[0];
  const isClaimedToday = currentUser?.lastCheckInDate === todayStr;
  const currentStreak = currentUser?.consecutiveCheckIns || 0;

  const handleClaimDailyCheckIn = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (isClaimedToday || claimingCheckin) return;

    setClaimingCheckin(true);
    try {
      const bonus = config.dailyCheckInPoints + Math.min(50, currentStreak * 5);
      await updatePoints(bonus, `Check-in Diário (Dia ${currentStreak + 1})`, 'checkin');
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#EAB308', '#FCD34D', '#3B82F6']
      });
    } catch (e) {
      console.error(e);
    } finally {
      setClaimingCheckin(false);
    }
  };

  const streakDays = [
    { day: 1, pts: 20 },
    { day: 2, pts: 25 },
    { day: 3, pts: 35 },
    { day: 4, pts: 45 },
    { day: 5, pts: 60 },
    { day: 6, pts: 75 },
    { day: 7, pts: 100 },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Transparency Guarantee Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40 border border-amber-500/30 p-5 sm:p-7 shadow-2xl shadow-amber-500/5">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Plataforma 100% Gratuita • Sem Depósitos • Moçambique & Global</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ganhe Recompensas Reais <br className="hidden sm:inline" />
              com <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">Total Transparência</span>
            </h1>
            
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Complete pesquisas, ofertas, assista a anúncios voluntários e convide amigos.
              Levante através de <strong className="text-amber-300">M-Pesa</strong>, <strong className="text-amber-300">e-Mola</strong>, <strong className="text-amber-300">PayPal</strong>, <strong className="text-amber-300">USDT</strong> ou banco.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-amber-300/90 font-medium">
                <Info className="w-3.5 h-3.5" />
                1.000 pontos = US$1,00
              </span>
              <span>•</span>
              <span className="text-slate-300">Levantamento mínimo: 5.000 pts (US$5,00)</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">Câmbio: US$1 = {config.usdToMznRate || 64.0} MZN</span>
            </div>
          </div>

          {/* Quick CTA */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
            {currentUser ? (
              <button
                onClick={onOpenWithdraw}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                <Wallet className="w-4 h-4 text-slate-950" />
                <span>{t('nav.withdraw')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>{t('nav.register')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onOpenAdModal}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <PlaySquare className="w-4 h-4 text-amber-400" />
              <span>Assistir Anúncio (+25 pts)</span>
            </button>
          </div>
        </div>

        {/* Disclaimer Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-300">{t('points.disclaimer')}</span>
          </p>
          <div className="text-slate-400 text-[11px]">
            Plataforma 100% Gratuita • Recompensas Reais em MZN & USD
          </div>
        </div>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
          {/* Card 1: Balance PTS */}
          <div 
            onClick={() => setActiveTab('balance')}
            className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-5 shadow-lg relative overflow-hidden group cursor-pointer hover:border-amber-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('balance.title')}</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-400">{points.toLocaleString()}</span>
                <span className="text-xs font-bold text-amber-300 uppercase">PTS</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Clique para ver detalhes do saldo
              </p>
            </div>
            {/* Progress to minimum withdrawal */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-400">Progresso mín. (5.000 pts)</span>
                <span className="text-amber-400 font-bold">{progressToMin}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500" 
                  style={{ width: `${progressToMin}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Approx USD */}
          <div 
            onClick={() => setActiveTab('balance')}
            className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg relative cursor-pointer hover:border-slate-700 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('balance.approx_usd')}</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-400">US$</span>
                <span className="text-3xl font-black text-white">{approxUsd}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                1.000 pts = $1,00 USD
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Levantamento Mínimo:</span>
              <span className="text-white font-semibold">US$ 5,00</span>
            </div>
          </div>

          {/* Card 3: Approx MZN (Moçambique) */}
          <div 
            onClick={() => setActiveTab('withdraw')}
            className="rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/20 border border-emerald-500/30 p-5 shadow-lg relative cursor-pointer hover:border-emerald-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Moçambique (MZN)</span>
                <span className="text-sm">🇲🇿</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-400">{approxMzn}</span>
                <span className="text-xs font-bold text-emerald-300">MT</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                M-Pesa & e-Mola disponíveis
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Taxa do Administrador:</span>
              <span className="text-emerald-300 font-semibold">{config.usdToMznRate || 64.0} MZN</span>
            </div>
          </div>

          {/* Card 4: Referrals Bonus */}
          <div 
            onClick={() => setActiveTab('referrals')}
            className="rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950/20 border border-purple-500/30 p-5 shadow-lg relative cursor-pointer hover:border-purple-400 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Indicar Amigos</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-purple-300">+{config.referralBonusPoints || 200}</span>
                <span className="text-xs font-bold text-purple-200">PTS</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Bónus por cada amigo convidado
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Seu código de convite:</span>
              <span className="text-purple-300 font-semibold group-hover:text-purple-200 flex items-center gap-1">
                Ver Link <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

        </div>

      {/* Daily Check-In Widget */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">{t('checkin.title')}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                +{config.dailyCheckInPoints} a 100 PTS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Entre todos os dias consecutivamente para multiplicar a sua recompensa.
            </p>
          </div>

          <button
            onClick={handleClaimDailyCheckIn}
            disabled={isClaimedToday || claimingCheckin}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              isClaimedToday
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300 shadow-lg shadow-amber-500/20 active:scale-95'
            }`}
          >
            {isClaimedToday ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{t('checkin.claimed_today')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{t('checkin.claim')} (+{config.dailyCheckInPoints + currentStreak * 5} pts)</span>
              </>
            )}
          </button>
        </div>

        {/* 7-Day Streak Blocks */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3 pt-2">
          {streakDays.map((item, idx) => {
            const isCompleted = idx < currentStreak;
            const isCurrent = idx === currentStreak && !isClaimedToday;
            return (
              <div
                key={item.day}
                className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center transition-all ${
                  isCompleted
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : isCurrent
                    ? 'bg-slate-800 border-amber-400 text-white ring-2 ring-amber-400/30'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-[11px] font-semibold">Dia {item.day}</span>
                <span className="text-sm font-black mt-0.5 text-amber-400">+{item.pts}</span>
                <div className="mt-1">
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Coins className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured Earn Ways */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Formas Rápidas de Ganhar Pontos</span>
            </h2>
            <p className="text-xs text-slate-400">Escolha uma das atividades voluntárias abaixo para pontuar.</p>
          </div>
          <button 
            onClick={() => setActiveTab('earn')}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            <span>Ver Todas as Opções</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Action 1: Ads */}
          <div 
            onClick={() => setActiveTab('earn')}
            className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/50 p-5 cursor-pointer transition-all hover:scale-[1.02] group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <PlaySquare className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-400">+{config.adRewardPoints || 25} PTS / Vídeo</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Voluntário</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Anúncios Recompensados</h3>
            <p className="text-xs text-slate-400 line-clamp-2">
              Assista a vídeos de patrocinadores verificados de 15 a 30s e receba pontos internos.
            </p>
          </div>

          {/* Action 2: Surveys */}
          <div 
            onClick={() => setActiveTab('earn')}
            className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-blue-500/50 p-5 cursor-pointer transition-all hover:scale-[1.02] group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-blue-400">Até 1.200 PTS</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">Moçambique</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Pesquisas de Mercado</h3>
            <p className="text-xs text-slate-400 line-clamp-2">
              Opinião sobre serviços móveis, compras, tecnologia e produtos locais.
            </p>
          </div>

          {/* Action 3: Partner Offers */}
          <div 
            onClick={() => setActiveTab('earn')}
            className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 p-5 cursor-pointer transition-all hover:scale-[1.02] group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
              <Gift className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-400">Até 2.500 PTS</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Parceiros</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Ofertas Especiais</h3>
            <p className="text-xs text-slate-400 line-clamp-2">
              Testes de apps, jogos parceiros e subscrições gratuitas de serviços.
            </p>
          </div>

          {/* Action 4: Referrals */}
          <div 
            onClick={() => setActiveTab('referrals')}
            className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-purple-500/50 p-5 cursor-pointer transition-all hover:scale-[1.02] group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-purple-400">+{config.referralBonusPoints || 200} PTS</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Amigos</span>
            </div>
            <h3 className="text-base font-bold text-white mb-1">Indicar & Convidar</h3>
            <p className="text-xs text-slate-400 line-clamp-2">
              Partilhe o seu link exclusivo no WhatsApp ou redes e ganhe comissão.
            </p>
          </div>

        </div>
      </div>

      {/* Top Available Tasks Spotlight */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-white">Pesquisas e Ofertas em Destaque</h2>
          <button 
            onClick={() => setActiveTab('earn')}
            className="text-xs text-amber-400 hover:underline font-semibold"
          >
            Explorar todas
          </button>
        </div>

        <div className="space-y-3">
          {INITIAL_TASKS.slice(0, 3).map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 cursor-pointer transition-all gap-3 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                      {task.titlePt}
                    </h3>
                    {task.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                        {task.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Provedor: <strong className="text-slate-300">{task.partner}</strong> • Duração aprox.: {task.estimatedMinutes} min
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-sm sm:text-base font-black text-amber-400">+{task.rewardPoints} PTS</span>
                  <p className="text-[11px] text-slate-400">≈ ${(task.rewardPoints / 1000).toFixed(2)} USD</p>
                </div>
                <button className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition-colors">
                  Iniciar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

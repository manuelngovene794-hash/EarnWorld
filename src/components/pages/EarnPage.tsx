import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  PlaySquare, 
  Calendar, 
  FileText, 
  Gift, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppConfig, TaskItem } from '../../types';
import { storageService } from '../../services/storageService';
import { INITIAL_TASKS } from '../../data/initialData';

interface EarnPageProps {
  config: AppConfig;
  onOpenAdModal: () => void;
  onOpenAuth: () => void;
  setActiveTab: (tab: string) => void;
}

export const EarnPage: React.FC<EarnPageProps> = ({
  config,
  onOpenAdModal,
  onOpenAuth,
  setActiveTab
}) => {
  const { currentUser, updatePoints, claimCheckIn } = useAuth();
  const { t } = useLanguage();

  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [activeFilter, setActiveFilter] = useState<'all' | 'survey' | 'offer' | 'video'>('all');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(false);
  const [claimingCheckin, setClaimingCheckin] = useState(false);

  // Ad cooldown
  const [adCooldown, setAdCooldown] = useState(0);

  useEffect(() => {
    storageService.getTasks().then(setTasks);
  }, []);

  // Daily Checkin info
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
      await claimCheckIn(bonus);
      
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#EAB308', '#3B82F6', '#10B981']
      });
    } catch (e) {
      console.error(e);
    } finally {
      setClaimingCheckin(false);
    }
  };

  const handleOpenTaskModal = (task: TaskItem) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setSelectedTask(task);
    setCompletionSuccess(false);
  };

  const handleConfirmTaskCompletion = async () => {
    if (!selectedTask || !currentUser) return;
    setIsCompleting(true);

    try {
      await updatePoints(
        selectedTask.rewardPoints,
        `Conclusão: ${selectedTask.titlePt} (${selectedTask.partner})`,
        selectedTask.category === 'survey' ? 'survey' : 'offer'
      );

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#3B82F6']
      });

      setCompletionSuccess(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCompleting(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (!t.isActive) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'video') return t.category === 'video' || t.category === 'special';
    return t.category === activeFilter;
  });

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
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40 border border-amber-500/30 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>4 Formas de Pontuar • 100% Voluntário e Gratuito</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Ganhar <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Pontos de Recompensa</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Complete pesquisas remuneradas, ofertas especiais, realize o seu check-in diário e assista a anúncios de patrocinadores. Os pontos acumulam instantaneamente.
            </p>
          </div>

          {/* Quick CTA - Watch Ad */}
          <div className="shrink-0 w-full sm:w-auto">
            <button
              onClick={onOpenAdModal}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <PlaySquare className="w-5 h-5 text-slate-950" />
              <span>Assistir Anúncio (+{config.adRewardPoints || 25} PTS)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Daily Check-In Section */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">1. Check-in Diário Consecutivo</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                  +{config.dailyCheckInPoints} a 100 PTS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sequência atual: <strong className="text-amber-400">{currentStreak} dias</strong>. Entre diariamente para multiplicar o bónus.
              </p>
            </div>
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
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Check-in Feito Hoje</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Reclamar Bónus (+{config.dailyCheckInPoints + currentStreak * 5} pts)</span>
              </>
            )}
          </button>
        </div>

        {/* 7 Days Row */}
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

      {/* 2. Rewarded Ads Hub */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-amber-500/30 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <PlaySquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">2. Anúncios Recompensados Voluntários</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  +{config.adRewardPoints || 25} PTS / Anúncio
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  Sem Depósito
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Você escolhe quando assistir voluntariamente ao anúncio patrocinado (15 a 30s). Após a visualização completa e confirmação humana, os pontos são creditados na sua conta.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={onOpenAdModal}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-lg shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-2 transition-all"
            >
              <PlaySquare className="w-4 h-4 text-slate-950" />
              <span>Assistir Agora (+{config.adRewardPoints || 25} pts)</span>
            </button>
          </div>
        </div>

        {/* Ads Anti-abuse / Transparency notice */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>A receita dos anúncios financia a reserva real de liquidez para pagar os levantamentos.</span>
          </div>
          <span className="text-slate-400 text-[11px]">
            Limite antifraude: até {config.maxAdsPerHour || 8} anúncios por hora.
          </span>
        </div>
      </div>

      {/* 3. Surveys & Partner Offers */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>3. Pesquisas & Ofertas de Parceiros</span>
            </h2>
            <p className="text-xs text-slate-400">Responda a questionários e teste apps para ganhar grandes quantias de pontos.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setActiveFilter('survey')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeFilter === 'survey'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pesquisas
            </button>
            <button
              onClick={() => setActiveFilter('offer')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeFilter === 'offer'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ofertas
            </button>
            <button
              onClick={() => setActiveFilter('video')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeFilter === 'video'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Especiais
            </button>
          </div>
        </div>

        {/* Task Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const approxUsd = (task.rewardPoints / (config.pointsPerDollar || 1000)).toFixed(2);
            const approxMzn = (Number(approxUsd) * (config.usdToMznRate || 64)).toFixed(0);

            return (
              <div
                key={task.id}
                onClick={() => handleOpenTaskModal(task)}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {task.category === 'survey' ? 'Pesquisa' : task.category === 'offer' ? 'Oferta' : 'Especial'}
                      </span>
                      {task.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {task.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-amber-400">+{task.rewardPoints} PTS</span>
                      <p className="text-[10px] text-slate-400">≈ ${approxUsd} / {approxMzn} MT</p>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                    {task.titlePt}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {task.descriptionPt}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-300 font-medium">Provedor: {task.partner}</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {task.estimatedMinutes} min
                    </span>
                  </div>

                  <button className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 group-hover:bg-amber-500 group-hover:text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors">
                    <span>Iniciar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Task Completion Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/30 p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {!completionSuccess ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-bold uppercase">
                    {selectedTask.category === 'survey' ? 'Pesquisa de Opinião' : 'Oferta de Parceiro'}
                  </span>
                  <span className="text-xs text-slate-400">• {selectedTask.partner}</span>
                </div>

                <h3 className="text-xl font-bold text-white">{selectedTask.titlePt}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedTask.descriptionPt}</p>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Recompensa:</span>
                    <span className="text-amber-400 font-black text-sm">+{selectedTask.rewardPoints} PTS</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Valor em Dólares:</span>
                    <span className="text-white font-semibold">US$ {(selectedTask.rewardPoints / 1000).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Valor em Meticais:</span>
                    <span className="text-emerald-400 font-semibold">{((selectedTask.rewardPoints / 1000) * (config.usdToMznRate || 64)).toFixed(2)} MT</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tempo Estimado:</span>
                    <span className="text-slate-300">{selectedTask.estimatedMinutes} minutos</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Responda honestamente para garantir a validação pelo parceiro <strong>{selectedTask.partner}</strong>. Os pontos são atribuídos imediatamente.
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmTaskCompletion}
                    disabled={isCompleting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    {isCompleting ? (
                      <span>A validar tarefa...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Concluir e Receber</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Parabéns!</h3>
                  <p className="text-sm text-slate-300 mt-1">
                    Ganhou com sucesso <strong className="text-amber-400">+{selectedTask.rewardPoints} pontos</strong>!
                  </p>
                  <p className="text-xs text-emerald-400 mt-1">
                    Equivalente a US$ {(selectedTask.rewardPoints / 1000).toFixed(2)} ({((selectedTask.rewardPoints / 1000) * (config.usdToMznRate || 64)).toFixed(2)} MT)
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm hover:bg-slate-700"
                  >
                    Continuar a Ganhar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTask(null);
                      setActiveTab('balance');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-sm hover:bg-amber-400"
                  >
                    Ver no Saldo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

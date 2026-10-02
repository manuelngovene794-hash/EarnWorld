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
  X,
  Lock,
  Hourglass,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppConfig, TaskItem, UserTaskSession } from '../../types';
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
  const { currentUser, refreshProfile, claimCheckIn } = useAuth();
  const { t } = useLanguage();

  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [activeFilter, setActiveFilter] = useState<'all' | 'survey' | 'offer' | 'video'>('all');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(false);
  const [claimingCheckin, setClaimingCheckin] = useState(false);

  // Real task tracking & anti-duplicate state
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [userTaskSessions, setUserTaskSessions] = useState<Record<string, UserTaskSession>>({});
  const [activeSession, setActiveSession] = useState<UserTaskSession | null>(null);
  const [taskErrorMessage, setTaskErrorMessage] = useState<string>('');
  const [surveyResponse, setSurveyResponse] = useState<string>('');
  const [offerConfirmed, setOfferConfirmed] = useState<boolean>(false);
  const [isStartingTask, setIsStartingTask] = useState<boolean>(false);

  // Ad cooldown
  const [adCooldown, setAdCooldown] = useState(0);

  useEffect(() => {
    storageService.getTasks().then(setTasks);
  }, []);

  const loadUserTaskData = async () => {
    if (currentUser) {
      try {
        const [completed, sessions] = await Promise.all([
          storageService.getCompletedTaskIds(currentUser.id),
          storageService.getUserTaskSessions(currentUser.id)
        ]);
        setCompletedTaskIds(completed);
        setUserTaskSessions(sessions);
      } catch (e) {
        console.error('Erro ao carregar sessões de tarefas:', e);
      }
    } else {
      setCompletedTaskIds([]);
      setUserTaskSessions({});
    }
  };

  useEffect(() => {
    loadUserTaskData();
  }, [currentUser]);

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

  const handleOpenTaskModal = async (task: TaskItem) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setSelectedTask(task);
    setCompletionSuccess(false);
    setTaskErrorMessage('');
    setSurveyResponse('');
    setOfferConfirmed(false);

    // Check if task session already exists
    const session = await storageService.getTaskSession(currentUser.id, task.id);
    setActiveSession(session);
  };

  // 1. START TASK: Never awards points upon starting! Creates a real session.
  const handleStartTask = async () => {
    if (!selectedTask || !currentUser) return;
    setIsStartingTask(true);
    setTaskErrorMessage('');

    try {
      const session = await storageService.startTaskSession(currentUser.id, selectedTask.id);
      setActiveSession(session);
      setUserTaskSessions(prev => ({ ...prev, [selectedTask.id]: session }));
    } catch (e: any) {
      setTaskErrorMessage(e.message || 'Erro ao iniciar a tarefa.');
    } finally {
      setIsStartingTask(false);
    }
  };

  // 2. VALIDATE & COMPLETE TASK: Real validation without artificial wait timers!
  const handleConfirmTaskCompletion = async () => {
    if (!selectedTask || !currentUser) return;
    setIsCompleting(true);
    setTaskErrorMessage('');

    try {
      const userAnswers: Record<string, string> = {};
      if (selectedTask.category === 'survey') {
        if (!surveyResponse) {
          throw new Error('Por favor, selecione uma resposta para a pesquisa antes de submeter.');
        }
        userAnswers['opinion'] = surveyResponse;
      } else {
        if (!offerConfirmed) {
          throw new Error('Por favor, confirme a conclusão dos passos do parceiro.');
        }
        userAnswers['confirmed'] = 'true';
      }

      await storageService.validateAndCompleteTask(
        currentUser.id,
        selectedTask.id,
        userAnswers
      );

      // Refresh real profile balance
      await refreshProfile();
      await loadUserTaskData();

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#3B82F6']
      });

      setCompletionSuccess(true);
    } catch (e: any) {
      setTaskErrorMessage(e.message || 'Erro na validação da tarefa.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleAbandonTask = async () => {
    if (!selectedTask || !currentUser) return;
    try {
      await storageService.abandonTaskSession(currentUser.id, selectedTask.id);
      setActiveSession(null);
      setUserTaskSessions(prev => {
        const copy = { ...prev };
        delete copy[selectedTask.id];
        return copy;
      });
      setSelectedTask(null);
    } catch (e) {
      console.error(e);
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
        {/* Transparent Points Conversion & Rules Banner */}
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Conversão Clara • Sem Espera Artificial</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                Regras de Pontos & Saques Mínimos
              </h3>
              <p className="text-xs text-slate-300">
                Ganhe pontos honestamente completando pesquisas e ofertas. Cada <strong className="text-amber-400">1.000 Pontos = US$ 1,00</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-semibold">
                Mínimo: <strong className="text-white">5.000 PTS (US$ 5,00)</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                PayPal • Payoneer • USDT
              </span>
            </div>
          </div>

          {/* User Progress toward minimum withdrawal */}
          {currentUser && (
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">Progresso para o 1º Saque (5.000 PTS):</span>
                <span className="font-bold text-amber-400">
                  {(currentUser.pointsBalance || 0).toLocaleString()} / 5.000 PTS ({Math.min(100, Math.round(((currentUser.pointsBalance || 0) / 5000) * 100))}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, ((currentUser.pointsBalance || 0) / 5000) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>3. Pesquisas & Ofertas de Parceiros</span>
            </h2>
            <p className="text-xs text-slate-400">Responda a questionários e valide ações de parceiros para acumular pontos reais.</p>
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
            const isCompleted = completedTaskIds.includes(task.id);

            return (
              <div
                key={task.id}
                onClick={() => handleOpenTaskModal(task)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group shadow-lg ${
                  isCompleted
                    ? 'bg-slate-900/60 border-emerald-500/30 hover:border-emerald-500/50'
                    : 'bg-slate-900 border-slate-800 hover:border-amber-500/50 hover:scale-[1.01]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {task.category === 'survey' ? 'Pesquisa' : task.category === 'offer' ? 'Oferta' : 'Especial'}
                      </span>
                      {isCompleted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Concluída</span>
                        </span>
                      ) : task.badge ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {task.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-amber-400">+{task.rewardPoints} PTS</span>
                      <p className="text-[10px] text-slate-400">≈ ${approxUsd} USD</p>
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
                  </div>

                  {isCompleted ? (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center gap-1 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluída</span>
                    </span>
                  ) : (
                    <button className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 group-hover:bg-amber-500 group-hover:text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors">
                      <span>Realizar Tarefa</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Real Task Completion Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/30 p-6 shadow-2xl relative text-left my-8">
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {completedTaskIds.includes(selectedTask.id) ? (
              /* Already Completed State (Anti-Duplicate) */
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Tarefa Já Concluída!</h3>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                    Você já concluiu esta tarefa e recebeu <strong className="text-amber-400">+{selectedTask.rewardPoints} pontos</strong>.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Para garantir a conformidade e integridade da plataforma, créditos duplicados são proibidos.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : completionSuccess ? (
              /* Success State */
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Tarefa Validada com Sucesso!</h3>
                  <p className="text-sm text-slate-300 mt-1">
                    Critérios cumpridos com sucesso! Foram creditados <strong className="text-amber-400">+{selectedTask.rewardPoints} pontos</strong> ao seu saldo.
                  </p>
                  <p className="text-xs text-emerald-400 mt-1 font-semibold">
                    Equivalente a US$ {(selectedTask.rewardPoints / 1000).toFixed(2)} USD
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm hover:bg-slate-700 transition-colors"
                  >
                    Continuar a Ganhar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTask(null);
                      setActiveTab('balance');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-sm hover:bg-amber-400 transition-colors"
                  >
                    Ver no Saldo
                  </button>
                </div>
              </div>
            ) : (
              /* Real Task Interaction */
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-bold uppercase">
                    {selectedTask.category === 'survey' ? 'Pesquisa de Opinião' : 'Oferta de Parceiro'}
                  </span>
                  <span className="text-xs text-slate-400">• {selectedTask.partner}</span>
                </div>

                <h3 className="text-xl font-bold text-white">{selectedTask.titlePt}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedTask.descriptionPt}</p>

                {/* Task Details Summary */}
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
                    <span className="text-slate-400">Validação:</span>
                    <span className="text-emerald-400 font-semibold">Imediata após resposta válida (sem espera artificial)</span>
                  </div>
                </div>

                {/* Interactive Activity (Survey / Offer steps) */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    Etapa de Conclusão ({selectedTask.category === 'survey' ? 'Questionário de Opinião' : 'Instruções do Patrocinador'})
                  </span>

                  {selectedTask.category === 'survey' ? (
                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-200 font-medium">
                        Selecione a sua resposta sincera sobre hábitos digitais e serviços online:
                      </p>
                      {[
                        'Utilizo frequentemente serviços e pagamentos digitais no meu dia a dia.',
                        'Utilizo semanalmente e valorizo velocidade, transparência e segurança.',
                        'Utilizo ocasionalmente para compras, serviços e transferências internacionais.'
                      ].map((opt) => (
                        <label 
                          key={opt} 
                          className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                            surveyResponse === opt 
                              ? 'bg-amber-500/15 border-amber-500/60 text-amber-200' 
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="earn_survey_response" 
                            checked={surveyResponse === opt}
                            onChange={() => setSurveyResponse(opt)}
                            className="accent-amber-500 mt-0.5" 
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs text-slate-300">
                      <p className="text-slate-200 font-medium">Passos para validação da oferta ({selectedTask.partner}):</p>
                      <ol className="list-decimal pl-4 space-y-1.5 text-slate-400 text-[11px]">
                        <li>Aceda à plataforma oficial do patrocinador {selectedTask.partner}.</li>
                        <li>Realize a instrução indicada na descrição da oferta.</li>
                        <li>Confirme no campo abaixo para validar o crédito dos pontos.</li>
                      </ol>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-slate-200 mt-2">
                        <input 
                          type="checkbox" 
                          checked={offerConfirmed} 
                          onChange={(e) => setOfferConfirmed(e.target.checked)} 
                          className="w-4 h-4 rounded accent-amber-500"
                        />
                        <span className="text-xs font-semibold">Confirmo que acedi e completei os passos indicados pelo patrocinador.</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {taskErrorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{taskErrorMessage}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmTaskCompletion}
                    disabled={isCompleting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCompleting ? (
                      <span>A validar...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Validar & Receber (+{selectedTask.rewardPoints} PTS)</span>
                      </>
                    )}
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

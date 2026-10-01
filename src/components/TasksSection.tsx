import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Coins, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink, 
  Filter, 
  Gift, 
  PlaySquare, 
  AlertCircle,
  X,
  Lock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { TaskItem, TaskCategory, UserTaskSession } from '../types';
import { storageService } from '../services/storageService';
import { INITIAL_TASKS } from '../data/initialData';

interface TasksSectionProps {
  onOpenAuth: () => void;
  selectedTask: TaskItem | null;
  onClearSelectedTask: () => void;
}

export const TasksSection: React.FC<TasksSectionProps> = ({
  onOpenAuth,
  selectedTask,
  onClearSelectedTask
}) => {
  const { currentUser, refreshProfile } = useAuth();
  const { t, lang } = useLanguage();

  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeModalTask, setActiveModalTask] = useState<TaskItem | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(false);
  const [surveyResponse, setSurveyResponse] = useState('');

  // Real task tracking
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [userTaskSessions, setUserTaskSessions] = useState<Record<string, UserTaskSession>>({});
  const [activeSession, setActiveSession] = useState<UserTaskSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [taskErrorMessage, setTaskErrorMessage] = useState<string>('');
  const [isStartingTask, setIsStartingTask] = useState<boolean>(false);

  const loadUserTasks = async () => {
    if (currentUser) {
      try {
        const [completed, sessions] = await Promise.all([
          storageService.getCompletedTaskIds(currentUser.id),
          storageService.getUserTaskSessions(currentUser.id)
        ]);
        setCompletedTaskIds(completed);
        setUserTaskSessions(sessions);
      } catch (e) {
        console.error(e);
      }
    } else {
      setCompletedTaskIds([]);
      setUserTaskSessions({});
    }
  };

  useEffect(() => {
    storageService.getTasks().then(setTasks);
  }, []);

  useEffect(() => {
    loadUserTasks();
  }, [currentUser]);

  // Live timer for active session
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'in_progress') {
      return;
    }

    const tick = () => {
      const startMs = new Date(activeSession.startedAt).getTime();
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      const rem = Math.max(0, activeSession.requiredDurationSeconds - elapsed);
      setRemainingSeconds(rem);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    if (selectedTask) {
      handleOpenTask(selectedTask);
    }
  }, [selectedTask]);

  const filteredTasks = tasks.filter(task => {
    if (!task.isActive) return false;
    if (activeCategory === 'all') return true;
    return task.category === activeCategory;
  });

  const handleOpenTask = async (task: TaskItem) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setActiveModalTask(task);
    setSurveyResponse('');
    setCompletionSuccess(false);
    setTaskErrorMessage('');

    const session = await storageService.getTaskSession(currentUser.id, task.id);
    setActiveSession(session);
    if (session && session.status === 'in_progress') {
      const startMs = new Date(session.startedAt).getTime();
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      setRemainingSeconds(Math.max(0, session.requiredDurationSeconds - elapsed));
    } else {
      setRemainingSeconds((task.estimatedMinutes || 1) * 60);
    }
  };

  const handleStartTask = async () => {
    if (!activeModalTask || !currentUser) return;
    setIsStartingTask(true);
    setTaskErrorMessage('');

    try {
      const session = await storageService.startTaskSession(currentUser.id, activeModalTask.id);
      setActiveSession(session);
      setUserTaskSessions(prev => ({ ...prev, [activeModalTask.id]: session }));
      setRemainingSeconds(session.requiredDurationSeconds);
    } catch (e: any) {
      setTaskErrorMessage(e.message || 'Erro ao iniciar tarefa.');
    } finally {
      setIsStartingTask(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!activeModalTask || !currentUser) return;
    setIsCompleting(true);
    setTaskErrorMessage('');

    try {
      const answers: Record<string, string> = {};
      if (surveyResponse) {
        answers['response'] = surveyResponse;
      }

      await storageService.validateAndCompleteTask(
        currentUser.id,
        activeModalTask.id,
        answers
      );

      await refreshProfile();
      await loadUserTasks();

      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#3B82F6', '#10B981']
      });

      setCompletionSuccess(true);
    } catch (e: any) {
      setTaskErrorMessage(e.message || 'Erro ao validar tarefa.');
    } finally {
      setIsCompleting(false);
    }
  };

  const closeModal = () => {
    setActiveModalTask(null);
    onClearSelectedTask();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-400" />
            <span>Mural de Tarefas & Pesquisas de Mercado</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Partilhe as suas opiniões, teste novos produtos e ganhe pontos internos no EarnWorld.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'survey', label: 'Pesquisas' },
            { id: 'offer', label: 'Ofertas' },
            { id: 'special', label: 'Especiais' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((task) => {
          const approxUsd = (task.rewardPoints / 1000).toFixed(2);
          const isCompleted = completedTaskIds.includes(task.id);
          const session = userTaskSessions[task.id];
          const isInProgress = session && session.status === 'in_progress';

          return (
            <div
              key={task.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all group shadow-lg ${
                isCompleted 
                  ? 'bg-slate-900/60 border-emerald-500/30' 
                  : isInProgress 
                  ? 'bg-slate-900 border-amber-500/50' 
                  : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40 hover:scale-[1.01]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {task.partner}
                  </span>
                  {isCompleted ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Concluída</span>
                    </span>
                  ) : isInProgress ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                      <Clock className="w-3 h-3" />
                      <span>Em Progresso</span>
                    </span>
                  ) : task.badge ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {task.badge}
                    </span>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                    {lang === 'pt' ? task.titlePt : task.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {lang === 'pt' ? task.descriptionPt : task.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-850 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-amber-400">+{task.rewardPoints}</span>
                    <span className="text-xs font-bold text-amber-300 uppercase">PTS</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>~{task.estimatedMinutes} min • ≈ ${approxUsd}</span>
                  </div>
                </div>

                {isCompleted ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                    Concluída
                  </span>
                ) : isInProgress ? (
                  <button
                    onClick={() => handleOpenTask(task)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenTask(task)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-yellow-300 shadow-md shadow-amber-500/10 active:scale-95 transition-all"
                  >
                    Iniciar ({task.estimatedMinutes} min)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal Interaction */}
      {activeModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/30 p-6 sm:p-7 shadow-2xl my-8">
            
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {completedTaskIds.includes(activeModalTask.id) ? (
              <div className="space-y-4 text-center py-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white">Tarefa Já Concluída!</h4>
                  <p className="text-xs text-slate-300 mt-2">
                    Já recebeu os <strong className="text-amber-400">+{activeModalTask.rewardPoints} pontos</strong> desta tarefa. Créditos duplicados são proibidos.
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : completionSuccess ? (
              <div className="space-y-4 text-center py-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h4 className="text-xl font-black text-white">Tarefa Concluída com Sucesso!</h4>
                  <p className="text-xs text-slate-300 mt-2">
                    Condição de tempo cumprida! Foram adicionados <strong className="text-amber-400">+{activeModalTask.rewardPoints} pontos</strong> ao seu saldo.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {activeModalTask.partner}
                  </span>
                  <span className="text-xs text-slate-400">Tempo exigido: {activeModalTask.estimatedMinutes} min</span>
                </div>

                <h3 className="text-xl font-black text-white">
                  {lang === 'pt' ? activeModalTask.titlePt : activeModalTask.title}
                </h3>

                <p className="text-xs text-slate-300">
                  {lang === 'pt' ? activeModalTask.descriptionPt : activeModalTask.description}
                </p>

                {/* Condition Notice or Live Timer */}
                {!activeSession || activeSession.status !== 'in_progress' ? (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs text-slate-300 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Condição de Validação Real:</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Os pontos <strong>NÃO são adicionados ao iniciar</strong>. É necessário permanecer ativo durante os <strong>{activeModalTask.estimatedMinutes} minutos</strong> completos da tarefa para que o crédito seja liberado.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className={`w-5 h-5 ${remainingSeconds === 0 ? 'text-emerald-400' : 'text-amber-400 animate-spin'}`} />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {remainingSeconds === 0 ? 'Tempo Exigido Cumprido!' : 'Temporizador da Tarefa'}
                        </span>
                      </div>
                      <span className={`font-mono text-xl font-black ${remainingSeconds === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:
                        {String(remainingSeconds % 60).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          remainingSeconds === 0 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, ((activeSession.requiredDurationSeconds - remainingSeconds) / activeSession.requiredDurationSeconds) * 100))}%`
                        }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-400 leading-tight">
                      {remainingSeconds > 0
                        ? `Aguarde a conclusão dos ${activeModalTask.estimatedMinutes} minutos para liberar os pontos.`
                        : `Tempo cumprido! Clique no botão abaixo para validar e creditar os pontos.`}
                    </p>
                  </div>
                )}

                {/* Question / Step validation */}
                {activeSession && activeSession.status === 'in_progress' && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-amber-400 uppercase">
                      Etapa de Qualificação ({activeModalTask.category === 'survey' ? 'Pesquisa' : 'Oferta'})
                    </span>
                    
                    {activeModalTask.category === 'survey' ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-300">
                          Com que frequência utiliza carteiras móveis ou serviços digitais no seu país?
                        </p>
                        {['Diariamente para pagamentos e transferências', 'Semanalmente', 'Apenas algumas vezes por mês'].map((opt) => (
                          <label key={opt} className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-xs text-slate-200 transition-colors ${surveyResponse === opt ? 'bg-amber-500/15 border-amber-500/60' : 'bg-slate-900 border-slate-800'}`}>
                            <input 
                              type="radio" 
                              name="survey_opt" 
                              checked={surveyResponse === opt}
                              onChange={() => setSurveyResponse(opt)}
                              className="accent-amber-500" 
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs text-slate-300">
                        <p>Siga os passos do patrocinador para validar a recompensa:</p>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                          <li>Aceda à página ou instale a aplicação do patrocinador.</li>
                          <li>Mantenha-se engajado durante o tempo exigido.</li>
                          <li>Submeta para validação assim que o temporizador for concluído.</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {taskErrorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{taskErrorMessage}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200/90 flex items-center justify-between">
                  <span>Recompensa ao Concluir:</span>
                  <strong className="text-amber-400 font-black">+{activeModalTask.rewardPoints} PTS</strong>
                </div>

                {!activeSession || activeSession.status !== 'in_progress' ? (
                  <button
                    onClick={handleStartTask}
                    disabled={isStartingTask}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isStartingTask ? 'A iniciar...' : `Iniciar Tarefa (${activeModalTask.estimatedMinutes} min)`}
                  </button>
                ) : (
                  <button
                    onClick={handleCompleteTask}
                    disabled={isCompleting || remainingSeconds > 0 || (activeModalTask.category === 'survey' && !surveyResponse)}
                    className={`w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                      remainingSeconds > 0 || (activeModalTask.category === 'survey' && !surveyResponse)
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 shadow-xl shadow-emerald-500/20 active:scale-95'
                    }`}
                  >
                    {isCompleting ? (
                      'A validar com o parceiro...'
                    ) : remainingSeconds > 0 ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Aguarde {Math.floor(remainingSeconds / 60)}m {remainingSeconds % 60}s</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submeter & Reclamar Pontos (+{activeModalTask.rewardPoints} PTS)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

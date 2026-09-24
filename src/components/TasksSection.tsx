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
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { TaskItem, TaskCategory } from '../types';
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
  const { currentUser, updatePoints } = useAuth();
  const { t, lang } = useLanguage();

  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeModalTask, setActiveModalTask] = useState<TaskItem | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [surveyResponse, setSurveyResponse] = useState('');

  useEffect(() => {
    storageService.getTasks().then(setTasks);
  }, []);

  useEffect(() => {
    if (selectedTask) {
      setActiveModalTask(selectedTask);
      setStep(1);
      setSurveyResponse('');
      setCompletionSuccess(false);
    }
  }, [selectedTask]);

  const filteredTasks = tasks.filter(task => {
    if (!task.isActive) return false;
    if (activeCategory === 'all') return true;
    return task.category === activeCategory;
  });

  const handleOpenTask = (task: TaskItem) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setActiveModalTask(task);
    setStep(1);
    setSurveyResponse('');
    setCompletionSuccess(false);
  };

  const handleCompleteTask = async () => {
    if (!activeModalTask || !currentUser) return;
    setIsCompleting(true);

    try {
      await updatePoints(
        activeModalTask.rewardPoints,
        `Conclusão: ${activeModalTask.titlePt} (${activeModalTask.partner})`,
        activeModalTask.category === 'survey' ? 'survey' : 'offer'
      );

      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#3B82F6', '#10B981']
      });

      setCompletionSuccess(true);
    } catch (e) {
      console.error(e);
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
          return (
            <div
              key={task.id}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 p-5 flex flex-col justify-between transition-all hover:scale-[1.01] group shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {task.partner}
                  </span>
                  {task.badge && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {task.badge}
                    </span>
                  )}
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

                <button
                  onClick={() => handleOpenTask(task)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-yellow-300 shadow-md shadow-amber-500/10 active:scale-95 transition-all"
                >
                  Iniciar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal Interaction */}
      {activeModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/30 p-6 sm:p-7 shadow-2xl">
            
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!completionSuccess ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {activeModalTask.partner}
                  </span>
                  <span className="text-xs text-slate-400">Tempo estimado: {activeModalTask.estimatedMinutes} min</span>
                </div>

                <h3 className="text-xl font-black text-white">
                  {lang === 'pt' ? activeModalTask.titlePt : activeModalTask.title}
                </h3>

                <p className="text-xs text-slate-300">
                  {lang === 'pt' ? activeModalTask.descriptionPt : activeModalTask.description}
                </p>

                {/* Question / Step simulation */}
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
                        <label key={opt} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 cursor-pointer text-xs text-slate-200">
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
                      <ul className="list-disc pl-4 space-y-1 text-slate-400">
                        <li>Aceda à página ou instale a aplicação do patrocinador.</li>
                        <li>Complete o registo gratuito ou o primeiro nível.</li>
                        <li>Mantenha a aplicação aberta por pelo menos 1 minuto.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200/90 flex items-center justify-between">
                  <span>Recompensa ao Concluir:</span>
                  <strong className="text-amber-400 font-black">+{activeModalTask.rewardPoints} PTS</strong>
                </div>

                <button
                  onClick={handleCompleteTask}
                  disabled={isCompleting || (activeModalTask.category === 'survey' && !surveyResponse)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {isCompleting ? 'A validar dados com parceiro...' : 'Submeter & Reclamar Pontos'}
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center py-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h4 className="text-xl font-black text-white">Tarefa Concluída com Sucesso!</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Foram adicionados <strong className="text-amber-400">+{activeModalTask.rewardPoints} pontos</strong> ao seu saldo.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
                >
                  Concluir
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

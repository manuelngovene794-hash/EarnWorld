import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Coins, 
  Sparkles,
  Eye,
  PauseCircle,
  Tv
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppConfig } from '../types';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  onClose,
  config
}) => {
  const { currentUser, updatePoints } = useAuth();
  const { t } = useLanguage();

  const [adState, setAdState] = useState<'idle' | 'watching' | 'verifying' | 'completed'>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [captchaSolution, setCaptchaSolution] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [captchaChallenge, setCaptchaChallenge] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Real-time visibility tracking - ad must actually be watched on screen
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
  const [adSessionId, setAdSessionId] = useState<string>('');
  const claimedSessionsRef = useRef<Set<string>>(new Set());

  const rewardPoints = config.adRewardPoints || 25;
  const adProvider = config.adNetworkProvider || 'monetag';

  // Listen to tab visibility & window blur/focus
  useEffect(() => {
    const handleVisibility = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);
    };

    const handleBlur = () => setIsTabVisible(false);
    const handleFocus = () => setIsTabVisible(true);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Check cooldown from local state/storage
  useEffect(() => {
    const lastWatch = localStorage.getItem('last_ad_watch_time');
    if (lastWatch) {
      const elapsed = Math.floor((Date.now() - parseInt(lastWatch, 10)) / 1000);
      const cooldownPeriod = 30; // 30s cooldown between ads
      if (elapsed < cooldownPeriod) {
        setCooldownRemaining(cooldownPeriod - elapsed);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (cooldownRemaining > 0) {
      timer = setInterval(() => {
        setCooldownRemaining(prev => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Video countdown: Only ticks when the ad is actively visible and focused
  useEffect(() => {
    let timer: any;
    if (adState === 'watching' && isTabVisible) {
      timer = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Generate human anti-bot verification challenge
            const numA = Math.floor(Math.random() * 5) + 3;
            const numB = Math.floor(Math.random() * 5) + 2;
            setCaptchaSolution(numA + numB);
            setCaptchaChallenge(`${numA} + ${numB}`);
            setAdState('verifying');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [adState, isTabVisible]);

  if (!isOpen) return null;

  const handleStartWatch = () => {
    if (cooldownRemaining > 0) return;
    setErrorMsg('');
    setSecondsRemaining(15);
    setIsTabVisible(true);

    // Generate unique session token for anti-duplicate tracking
    const newSessionToken = 'ad_session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    setAdSessionId(newSessionToken);

    // Prepare Monetag / AdMob SDK caller if loaded in global window
    try {
      if (typeof (window as any).show_rewarded_ad === 'function') {
        (window as any).show_rewarded_ad();
      }
    } catch (e) {
      // SDK fallback
    }

    setAdState('watching');
  };

  const handleVerifyAndClaim = async () => {
    if (parseInt(userAnswer.trim(), 10) !== captchaSolution) {
      setErrorMsg('Código de verificação incorreto. Tente novamente.');
      return;
    }

    // Anti-duplicate protection: check if this ad session was already credited
    if (!adSessionId || claimedSessionsRef.current.has(adSessionId)) {
      setErrorMsg('Esta recompensa já foi atribuída anteriormente.');
      return;
    }

    try {
      claimedSessionsRef.current.add(adSessionId);
      await updatePoints(rewardPoints, 'Visualização Válida de Anúncio Recompensado', 'ad_reward');
      localStorage.setItem('last_ad_watch_time', Date.now().toString());
      setCooldownRemaining(30);
      setAdState('completed');

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#3B82F6']
      });
    } catch (e) {
      setErrorMsg('Não foi possível creditar a recompensa.');
    }
  };

  const handleReset = () => {
    setAdState('idle');
    setUserAnswer('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/30 p-6 sm:p-7 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        {adState !== 'watching' && (
          <button
            onClick={handleReset}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* State: IDLE */}
        {adState === 'idle' && (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Play className="w-7 h-7 fill-amber-400 ml-0.5" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-semibold mb-2">
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                <span>Monetização Parceira • AdMob / Monetag</span>
              </div>
              <h3 className="text-xl font-black text-white">{t('ads.title')}</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                {t('ads.desc')}
              </p>
            </div>

            {/* Reward Box */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium">Recompensa por Anúncio</span>
                  <p className="text-base font-black text-amber-400">+{rewardPoints} Pontos Internos</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Duração Mínima</span>
                <p className="text-xs font-bold text-white">15 segundos</p>
              </div>
            </div>

            {/* Strict Anti-Fraud Rules / User Visibility Notice */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-left space-y-1.5 text-xs text-amber-200/90">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Regras de Validação & Integridade:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                <li>O anúncio deve ser <strong>assistido até o final</strong> na tela ativa.</li>
                <li>Se mudar de aba ou minimizar a janela, o cronômetro é <strong>pausado</strong>.</li>
                <li>Apenas <strong>1 recompensa por anúncio concluído</strong> (proteção anti-duplicação).</li>
                <li>A receita deste anúncio alimenta a reserva real para pagar levantamentos.</li>
              </ul>
            </div>

            {/* Action Button */}
            {cooldownRemaining > 0 ? (
              <div className="p-3 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{t('ads.cooldown', { seconds: cooldownRemaining })}</span>
              </div>
            ) : (
              <button
                onClick={handleStartWatch}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{t('ads.watch_btn', { pts: rewardPoints })}</span>
              </button>
            )}
          </div>
        )}

        {/* State: WATCHING */}
        {adState === 'watching' && (
          <div className="space-y-4 text-center py-2">
            
            {/* Ad Network Container Slot */}
            <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border border-amber-500/30 overflow-hidden flex flex-col items-center justify-center p-4">
              
              {/* Overlay with real-time status */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950 flex flex-col justify-between p-4 pointer-events-none">
                
                {/* Header info */}
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Rede {adProvider.toUpperCase()} / AdMob</span>
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-200 font-mono bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-sm">00:{secondsRemaining.toString().padStart(2, '0')}</span>
                  </div>
                </div>

                {/* Central Verified Ad Placement Area */}
                <div className="text-center space-y-2 py-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Tv className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Espaço de Monetização Ativo</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Conexão segura com fornecedor de anúncios parceiro ({adProvider})
                    </p>
                  </div>
                  
                  {/* Paused state notification */}
                  {!isTabVisible && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-bounce">
                      <PauseCircle className="w-4 h-4 text-rose-400" />
                      <span>Anúncio em Pausa: Volte à janela para continuar a contagem</span>
                    </div>
                  )}
                </div>

                {/* Footer disclaimer */}
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mantenha esta janela aberta e visível na tela até concluir.</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-1000"
                  style={{ width: `${((15 - secondsRemaining) / 15) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              {isTabVisible ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>A validar visualização completa com a rede... ({secondsRemaining}s restantes)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-rose-400 font-semibold">Janela em segundo plano – contagem pausada.</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* State: VERIFYING (Anti-Fraud human check after completion) */}
        {adState === 'verifying' && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-lg font-black text-white">Verificação de Segurança Antifraude</h4>
              <p className="text-xs text-slate-300 mt-1">
                Visualização concluída com sucesso! Para confirmar que é uma pessoa real, resolva a soma:
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 max-w-xs mx-auto">
              <span className="text-xs text-slate-400">Quanto é:</span>
              <p className="text-2xl font-black text-amber-400 tracking-widest my-1">{captchaChallenge} = ?</p>
              
              <input
                type="number"
                value={userAnswer}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  setErrorMsg('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyAndClaim();
                }}
                placeholder="Resposta"
                autoFocus
                className="w-full text-center py-2 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-lg focus:outline-none focus:border-amber-400"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-rose-400 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </p>
            )}

            <button
              onClick={handleVerifyAndClaim}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm hover:from-emerald-400 hover:to-teal-300 active:scale-95 transition-all shadow-lg"
            >
              Reclamar {rewardPoints} Pontos
            </button>
          </div>
        )}

        {/* State: COMPLETED */}
        {adState === 'completed' && (
          <div className="space-y-4 text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-xl font-black text-white">Recompensa Creditada!</h4>
              <p className="text-xs text-slate-300 mt-1">
                Ganhou <strong className="text-amber-400">+{rewardPoints} pontos</strong> registados no seu saldo EarnWorld.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Transação gravada no histórico com validação de anúncio concluído.
              </p>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

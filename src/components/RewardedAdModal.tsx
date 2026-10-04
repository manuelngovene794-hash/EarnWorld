import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Coins, 
  Tv,
  Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
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

  const [isLoadingAd, setIsLoadingAd] = useState<boolean>(false);
  const [adCompleted, setAdCompleted] = useState<boolean>(false);
  const [networkStatusMessage, setNetworkStatusMessage] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(true);

  const rewardPoints = config.adRewardPoints || 25;
  const adProvider = config.adNetworkProvider || 'monetag';
  const zoneId = config.monetagZoneId || '286702';

  useEffect(() => {
    if (isOpen) {
      setAdCompleted(false);
      setNetworkStatusMessage('');
      // Check if real provider is loaded
      const hasRealAdSdk = typeof (window as any).show_rewarded_ad === 'function';
      setIsConfigured(hasRealAdSdk);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerRealAd = async () => {
    setIsLoadingAd(true);
    setNetworkStatusMessage('');

    try {
      // Check if the real partner ad function is defined on the window
      if (typeof (window as any).show_rewarded_ad === 'function') {
        // Invoke real partner ad with real callback
        (window as any).show_rewarded_ad({
          onComplete: async () => {
            await updatePoints(rewardPoints, `Visualização Confirmada de Anúncio (${adProvider.toUpperCase()})`, 'ad_reward');
            setAdCompleted(true);
            setIsLoadingAd(false);
            confetti({
              particleCount: 60,
              spread: 70,
              origin: { y: 0.6 }
            });
          },
          onError: (err: any) => {
            setIsLoadingAd(false);
            setNetworkStatusMessage(`O parceiro de anúncios (${adProvider}) reportou erro: ${err?.message || 'Nenhum anúncio disponível no inventário no momento.'}`);
          }
        });
      } else {
        // Honest transparency: SDK not loaded or ad blocked by client
        setIsLoadingAd(false);
        setIsConfigured(false);
        setNetworkStatusMessage(
          `A rede de anúncios ${adProvider.toUpperCase()} (Zona: ${zoneId}) ainda não disponibilizou um bloco de anúncio válido no seu navegador ou foi bloqueada por um ad-blocker. Conforme a regra de integridade do EarnWorld, contadores de tempo nunca geram pontos sozinhos. Os pontos só são atribuídos após visualização real validada pelo parceiro.`
        );
      }
    } catch (e: any) {
      setIsLoadingAd(false);
      setNetworkStatusMessage(`Erro ao comunicar com a rede parceira: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/30 p-6 sm:p-7 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {adCompleted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Anúncio Validado com Sucesso!</h3>
              <p className="text-sm text-slate-300 mt-2">
                Foram creditados <strong className="text-amber-400">+{rewardPoints} pontos</strong> ao seu saldo.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Tv className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-semibold mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Monetização Parceira • {adProvider.toUpperCase()}</span>
              </div>
              <h3 className="text-xl font-black text-white">Anúncio Remunerado de Parceiro</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                Exibição de anúncio direto fornecido pela rede de monetização oficial parceira.
              </p>
            </div>

            {/* Reward Box */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium">Recompensa</span>
                  <p className="text-base font-black text-amber-400">+{rewardPoints} Pontos Reais</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Zona Parceira</span>
                <p className="text-xs font-mono font-bold text-white">{zoneId}</p>
              </div>
            </div>

            {/* Strict Anti-Simulation Notice */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-left space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Regras de Integridade:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                <li>O contador de tempo <strong>nunca gera pontos sozinho</strong>.</li>
                <li>Pontos só são atribuídos após a confirmação real da exibição pelo fornecedor.</li>
                <li>Se o bloco de anúncio não for entregue pelo inventário parceiro, nenhum ponto é criado.</li>
              </ul>
            </div>

            {networkStatusMessage && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span className="leading-relaxed">{networkStatusMessage}</span>
              </div>
            )}

            <button
              onClick={handleTriggerRealAd}
              disabled={isLoadingAd}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoadingAd ? (
                <span>A solicitar anúncio ao parceiro...</span>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Exibir Anúncio Parceiro (+{rewardPoints} PTS)</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

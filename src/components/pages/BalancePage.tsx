import React, { useState } from 'react';
import { 
  Coins, 
  Wallet, 
  TrendingUp, 
  ArrowRight, 
  ShieldCheck, 
  Calculator, 
  Clock, 
  Lock,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppConfig } from '../../types';

interface BalancePageProps {
  config: AppConfig;
  setActiveTab: (tab: string) => void;
  onOpenWithdraw: () => void;
  onOpenAuth: () => void;
}

export const BalancePage: React.FC<BalancePageProps> = ({
  config,
  setActiveTab,
  onOpenWithdraw,
  onOpenAuth
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const points = currentUser?.pointsBalance || 0;
  const pointsPerDollar = config.pointsPerDollar || 1000;
  const minPoints = config.minWithdrawalPoints || 5000;

  const currentUsd = (points / pointsPerDollar).toFixed(2);
  const totalEarnedUsd = ((currentUser?.totalEarnedPoints || points) / pointsPerDollar).toFixed(2);
  const totalWithdrawnUsd = ((currentUser?.totalWithdrawnPoints || 0) / pointsPerDollar).toFixed(2);
  const progressPercent = Math.min(100, Math.round((points / minPoints) * 100));

  // 3-Day Rule Calculation
  const createdMs = currentUser?.createdAt ? new Date(currentUser.createdAt).getTime() : Date.now();
  const elapsedMs = Date.now() - createdMs;
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const isEligibleAfter3Days = elapsedMs >= THREE_DAYS_MS;
  const remainingMs = Math.max(0, THREE_DAYS_MS - elapsedMs);
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

  // Interactive Points Converter Calculator state
  const [calcPoints, setCalcPoints] = useState<string>('5000');
  const numericCalcPoints = parseFloat(calcPoints) || 0;
  const calcUsd = (numericCalcPoints / pointsPerDollar).toFixed(2);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/40 border border-amber-500/30 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Visão Detalhada de Saldo & Carteira</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              O Seu <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Saldo EarnWorld</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Consulte a equivalência exata dos seus pontos em Dólares americanos (USD). Sem taxas ocultas.
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {currentUser ? (
              <button
                onClick={() => setActiveTab('withdraw')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                <Wallet className="w-4 h-4 text-slate-950" />
                <span>Solicitar Levantamento</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Entrar na Conta</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Balance Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Available Points */}
        <div className="rounded-2xl bg-slate-900 border border-amber-500/40 p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pontos Disponíveis</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-amber-400">{points.toLocaleString()}</span>
              <span className="text-xs font-bold text-amber-300 uppercase">PTS</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Saldo pronto para resgate</p>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">Meta mín. ({minPoints.toLocaleString()} pts)</span>
              <span className="text-amber-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: USD Equivalent */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor em Dólares (USD)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-slate-400">US$</span>
              <span className="text-4xl font-black text-white">{currentUsd}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">1.000 pontos = US$ 1,00</p>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Levantamento Mínimo:</span>
            <span className="text-white font-bold">US$ 5,00 (5.000 pts)</span>
          </div>
        </div>

        {/* Card 3: Possibilidade de Levantamento */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/20 border border-emerald-500/30 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Possibilidade de Levantamento</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              {isEligibleAfter3Days && points >= minPoints && (config.paymentFundUsd ?? 1) > 0 ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <Lock className="w-5 h-5 text-amber-400" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="text-lg font-black text-white">
              {(config.paymentFundUsd ?? 1) <= 0 ? (
                <span className="text-amber-400">Aguardando Novos Fundos</span>
              ) : !isEligibleAfter3Days ? (
                <span className="text-amber-400">Carência de 3 Dias Ativa</span>
              ) : points < minPoints ? (
                <span className="text-slate-300">Necessário 5.000 Pontos</span>
              ) : (
                <span className="text-emerald-400">Liberado para Levantamento</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {(config.paymentFundUsd ?? 1) <= 0
                ? 'Levantamentos temporariamente indisponíveis — aguarde novos fundos.'
                : !isEligibleAfter3Days
                ? `Liberação em aproximadamente ${remainingDays > 1 ? `${remainingDays} dias` : `${remainingHours} horas`}.`
                : points < minPoints
                ? `Faltam ${(minPoints - points).toLocaleString()} pontos para poder levantar.`
                : 'Conta apta para solicitar resgate imediato.'}
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Total Ganho Histórico:</span>
            <span className="text-emerald-300 font-bold">${totalEarnedUsd} USD</span>
          </div>
        </div>

      </div>

      {/* Interactive Points Converter Calculator */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Calculadora de Conversão de Pontos</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Simule quantos pontos precisa para resgatar qualquer valor em Dólares americanos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          
          {/* Input Points */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Quantidade de Pontos:</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="500"
                value={calcPoints}
                onChange={(e) => setCalcPoints(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-bold text-lg outline-none focus:border-amber-400 transition-colors"
                placeholder="Ex: 5000"
              />
              <span className="absolute right-3 top-3.5 text-xs text-slate-400 font-bold">PTS</span>
            </div>
          </div>

          {/* Result USD */}
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-center">
            <span className="text-xs text-slate-400">Valor a Receber em Dólares</span>
            <p className="text-3xl font-black text-emerald-400 mt-0.5">US$ {calcUsd}</p>
            <span className="text-[11px] text-slate-400">Regra: 1.000 pts = $1,00 USD</span>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
          <span className="text-slate-400 py-1">Atalhos rápidos:</span>
          {[1000, 5000, 10000, 20000, 50000].map((preset) => (
            <button
              key={preset}
              onClick={() => setCalcPoints(String(preset))}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium transition-colors"
            >
              {preset.toLocaleString()} pts (${preset / 1000})
            </button>
          ))}
          {currentUser && (
            <button
              onClick={() => setCalcPoints(String(currentUser.pointsBalance))}
              className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30"
            >
              Meu Saldo ({currentUser.pointsBalance.toLocaleString()} pts)
            </button>
          )}
        </div>
      </div>

      {/* Rules & Transparency Notice */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-white font-bold">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <span>Regras de Transparência do Saldo</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Os pontos são recompensas internas atribuídas após a validação de tarefas, pesquisas e anúncios. O EarnWorld financia todos os levantamentos através de receitas reais líquidas obtidas de parceiros anunciantes. O usuário pode sacar após 3 dias do cadastro, sempre que tiver saldo suficiente e houver fundos disponíveis.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800">
          <span>Pagamentos via PayPal, Payoneer, USDT e Transferência Bancária sem taxas ocultas.</span>
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setActiveTab('history')}
              className="text-slate-400 hover:text-white font-bold flex items-center gap-1 transition-colors"
            >
              <span>Ver Histórico</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
            >
              <span>Ir para Levantamento</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

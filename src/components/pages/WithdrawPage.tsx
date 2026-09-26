import React, { useState } from 'react';
import { 
  Wallet, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck,
  ArrowRight, 
  Clock, 
  Info,
  Calendar,
  Lock,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppConfig, PaymentMethodId, WithdrawalRequest } from '../../types';
import { PAYMENT_METHODS } from '../../data/initialData';
import { storageService } from '../../services/storageService';

interface WithdrawPageProps {
  config: AppConfig;
  onOpenAuth: () => void;
  setActiveTab: (tab: string) => void;
}

export const WithdrawPage: React.FC<WithdrawPageProps> = ({
  config,
  onOpenAuth,
  setActiveTab
}) => {
  const { currentUser, refreshProfile } = useAuth();
  const { t } = useLanguage();

  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodId>('paypal');
  const [pointsToWithdraw, setPointsToWithdraw] = useState<number>(5000);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<WithdrawalRequest | null>(null);
  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRequest[]>([]);

  const loadUserWithdrawals = async () => {
    if (currentUser) {
      try {
        const wths = await storageService.getUserWithdrawals(currentUser.id);
        setUserWithdrawals(wths);
      } catch (e) {
        console.error(e);
      }
    }
  };

  React.useEffect(() => {
    loadUserWithdrawals();
  }, [currentUser]);

  const currentPoints = currentUser?.pointsBalance || 0;
  const userCountry = currentUser?.country || 'MZ';
  const pointsPerDollar = config.pointsPerDollar || 1000;
  const minPoints = 5000; // Strictly 5,000 points = US$5.00

  const amountUsd = pointsToWithdraw / pointsPerDollar;
  const currentFund = typeof config.paymentFundUsd === 'number' ? config.paymentFundUsd : (config.availableRealRevenueUsd ?? 0);
  const isFundZero = currentFund <= 0;
  const hasPlatformFunds = currentFund >= amountUsd && !isFundZero;
  const hasInsufficientBalance = currentPoints < minPoints || pointsToWithdraw > currentPoints;

  const existingPending = userWithdrawals.find(w => w.status === 'pending');
  const hasPendingRequest = Boolean(existingPending);

  // 3-Day Rule Calculation
  const createdMs = currentUser?.createdAt ? new Date(currentUser.createdAt).getTime() : Date.now();
  const elapsedMs = Date.now() - createdMs;
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const isEligibleAfter3Days = elapsedMs >= THREE_DAYS_MS;
  const remainingMs = Math.max(0, THREE_DAYS_MS - elapsedMs);
  const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const unlockDate = new Date(createdMs + THREE_DAYS_MS);

  const canWithdrawNow = Boolean(
    currentUser &&
    isEligibleAfter3Days &&
    !hasInsufficientBalance &&
    hasPlatformFunds &&
    !hasPendingRequest
  );

  // Selected method configuration
  const currentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethodId) || PAYMENT_METHODS[0];

  const handleFieldChange = (fieldId: string, val: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: val }));
    setErrorMessage('');
  };

  const handlePresetSelect = (pts: number) => {
    const validPts = Math.max(minPoints, pts);
    setPointsToWithdraw(validPts);
    if (currentPoints < minPoints || validPts > currentPoints) {
      setErrorMessage('Saldo insuficiente para levantamento.');
    } else {
      setErrorMessage('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    // Validation 1: 3-Day Rule
    if (!isEligibleAfter3Days) {
      setErrorMessage(
        `Regra de Segurança Anti-Fraude: O primeiro levantamento só é permitido após 3 dias da criação da conta. Restam aproximadamente ${remainingDays > 1 ? `${remainingDays} dias` : `${remainingHours} hora(s)`}. Os teus pontos continuam 100% seguros.`
      );
      return;
    }

    // Validation 1.5: Prevent duplicate requests
    if (hasPendingRequest) {
      setErrorMessage(
        `Já possui um pedido de levantamento pendente de análise (ID: ${existingPending?.id.slice(-6)} - US$ ${existingPending?.amountUsd.toFixed(2)}). Aguarde a conclusão do pedido anterior antes de solicitar um novo para evitar duplicidade.`
      );
      return;
    }

    // Validation 2: Minimum withdrawal
    if (pointsToWithdraw < minPoints) {
      setErrorMessage(`O levantamento mínimo é de ${minPoints.toLocaleString()} pontos (US$ 5,00).`);
      return;
    }

    // Validation 3: User Balance
    if (currentPoints < minPoints || pointsToWithdraw > currentPoints) {
      setErrorMessage('Saldo insuficiente para levantamento.');
      return;
    }

    // Validation 4: Platform Treasury Payment Fund Check
    if (!hasPlatformFunds) {
      setErrorMessage('Levantamentos temporariamente indisponíveis — aguarde novos fundos');
      return;
    }

    // Validation 5: Required fields
    for (const field of currentMethod.fields) {
      const val = fieldValues[field.id];
      if (!val || val.trim().length === 0) {
        setErrorMessage(`Por favor preencha: ${field.labelPt}`);
        return;
      }
    }

    // Open confirmation modal
    setShowConfirmModal(true);
  };

  const handleExecuteWithdrawal = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);

    if (!isEligibleAfter3Days) {
      setIsSubmitting(false);
      setErrorMessage(
        `Regra de Segurança: O levantamento só pode ser solicitado após 3 dias do registo. Restam aproximadamente ${remainingDays > 1 ? `${remainingDays} dias` : `${remainingHours} hora(s)`}.`
      );
      return;
    }

    if (hasPendingRequest) {
      setIsSubmitting(false);
      setErrorMessage(
        `Já possui um pedido de levantamento pendente. Aguarde a validação do administrador antes de enviar outro pedido.`
      );
      return;
    }

    if (!hasPlatformFunds) {
      setIsSubmitting(false);
      setErrorMessage('Levantamentos temporariamente indisponíveis — aguarde novos fundos');
      return;
    }

    try {
      const accountSummary = Object.entries(fieldValues)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');

      const newWithdrawal = await storageService.createWithdrawal({
        userId: currentUser!.id,
        userEmail: currentUser!.email,
        userName: currentUser!.displayName || currentUser!.email,
        country: userCountry,
        pointsDeducted: pointsToWithdraw,
        amountUsd: Number(amountUsd.toFixed(2)),
        amountMzn: 0,
        paymentMethod: selectedMethodId,
        accountDetails: accountSummary,
        accountName: fieldValues['name'] || fieldValues['holder'] || currentUser!.displayName || currentUser!.email,
        status: 'pending',
        statusMessage: 'Aguardando validação do administrador.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await refreshProfile();

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#3B82F6']
      });

      setSuccessInfo(newWithdrawal);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao processar levantamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccessInfo(null);
    setFieldValues({});
    setErrorMessage('');
    setShowConfirmModal(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/40 border border-amber-500/30 p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>Pagamentos Globais e Levantamentos Seguros</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Solicitar <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Levantamento</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Converta os seus pontos ganhos em pagamentos reais via PayPal, Payoneer, USDT ou Transferência Bancária. Mínimo de 5.000 pontos (US$ 5,00).
            </p>
          </div>

          {currentUser && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 text-right">
              <span className="text-xs text-slate-400">O Seu Saldo Disponível</span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-xl font-black text-amber-400">{currentPoints.toLocaleString()} PTS</span>
              </div>
              <span className="text-xs text-emerald-400 font-semibold">
                ≈ ${ (currentPoints / 1000).toFixed(2) } USD
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3-Day Rule Notification for New Users */}
      {currentUser && !isEligibleAfter3Days && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-left space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Regra de Segurança: Levantamento disponível 3 dias após o cadastro</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Por motivos de segurança e integridade das recompensas, novos utilizadores podem solicitar o primeiro levantamento após <strong>3 dias</strong> da criação da conta. A sua conta foi criada em <strong>{new Date(currentUser.createdAt).toLocaleDateString()}</strong>.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 pt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Liberado a partir de: {unlockDate.toLocaleDateString()} às {unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (restam aproximadamente {remainingDays > 1 ? `${remainingDays} dias` : `${remainingHours} horas`})</span>
          </div>
        </div>
      )}

      {/* Possibilidade de Levantamento Status Card */}
      {currentUser && (
        <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">Possibilidade de Levantamento</h2>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
              canWithdrawNow 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}>
              {canWithdrawNow 
                ? '✓ Apto para Levantamento' 
                : !hasPlatformFunds
                ? '⚠️ Aguardando Novos Fundos'
                : hasPendingRequest
                ? '⏳ Pedido Pendente em Análise'
                : !isEligibleAfter3Days
                ? '🔒 Carência de 3 Dias Ativa'
                : '⚠️ Saldo Insuficiente'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Condition 1: 3-Day Rule */}
            <div className={`p-3.5 rounded-xl border ${isEligibleAfter3Days ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {isEligibleAfter3Days ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                <span>1. Regra de 3 Dias</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                {isEligibleAfter3Days 
                  ? 'Aprovado: Mais de 3 dias desde o registo.' 
                  : `Carência ativa: Liberação em ~${remainingDays > 1 ? `${remainingDays} dias` : `${remainingHours}h`}.`}
              </p>
            </div>

            {/* Condition 2: Points Balance */}
            <div className={`p-3.5 rounded-xl border ${currentPoints >= minPoints ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-300' : 'bg-slate-950/80 border-slate-800 text-slate-400'}`}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {currentPoints >= minPoints ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Coins className="w-4 h-4 text-amber-400" />}
                <span>2. Saldo Mínimo</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                {currentPoints >= minPoints 
                  ? `Suficiente: ${currentPoints.toLocaleString()} PTS (mín. 5.000).` 
                  : `Faltam ${(minPoints - currentPoints).toLocaleString()} pts para o resgate de $5.`}
              </p>
            </div>

            {/* Condition 3: Fundo de Pagamentos */}
            <div className={`p-3.5 rounded-xl border ${hasPlatformFunds ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {hasPlatformFunds ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                <span>3. Fundo de Pagamentos</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                {hasPlatformFunds 
                  ? 'Disponível: Reserva em caixa garantida.' 
                  : 'Levantamentos temporariamente indisponíveis — aguarde novos fundos.'}
              </p>
            </div>

            {/* Condition 4: No Duplicate / Pending */}
            <div className={`p-3.5 rounded-xl border ${!hasPendingRequest ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {!hasPendingRequest ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                <span>4. Sem Duplicados</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                {!hasPendingRequest 
                  ? 'Livre: Nenhum pedido pendente ativo.' 
                  : `Em análise: Pedido de US$ ${existingPending?.amountUsd.toFixed(2)}.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Confirmation State */}
      {successInfo ? (
        <div className="rounded-2xl bg-slate-900 border border-emerald-500/40 p-6 sm:p-8 shadow-2xl text-center max-w-2xl mx-auto space-y-5 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">Pedido de Levantamento Registado!</h2>
            <p className="text-xs text-slate-400 mt-1">ID do Pedido: <span className="font-mono text-amber-400">{successInfo.id}</span></p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Método de Pagamento:</span>
              <span className="text-white font-bold">{currentMethod.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pontos Deduzidos:</span>
              <span className="text-amber-400 font-bold">{successInfo.pointsDeducted.toLocaleString()} PTS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Valor em Dólares:</span>
              <span className="text-emerald-400 font-black text-sm">US$ {successInfo.amountUsd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Estado Atual:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase border bg-amber-500/20 text-amber-400 border-amber-500/40">
                Pendente (Em Validação)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 text-left space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Transparência Financeira EarnWorld</span>
            </p>
            <p className="text-[11px] text-slate-300">
              O seu pedido foi recebido com sucesso e será validado pelo administrador utilizando os fundos disponíveis da plataforma.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('history')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm hover:from-amber-400"
            >
              Ver no Meu Histórico
            </button>
            <button
              onClick={resetForm}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
            >
              Novo Levantamento
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Step 1: Select Payment Method */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">1</span>
                <h2 className="text-base font-bold text-white">Escolha o Método de Pagamento</h2>
              </div>
              <span className="text-xs text-slate-400">Todos os países suportados</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedMethodId === method.id;

                return (
                  <div
                    key={method.id}
                    onClick={() => {
                      setSelectedMethodId(method.id);
                      setErrorMessage('');
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-sm">{method.name}</span>
                      {method.id === 'usdt' && <span className="text-xs text-emerald-400 font-mono">Crypto</span>}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {method.descriptionPt}
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Mínimo: US$ {method.minUsd}</span>
                      {isSelected ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selecionado
                        </span>
                      ) : (
                        <span className="text-slate-400">Disponível</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Amount to Convert */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">2</span>
                <h2 className="text-base font-bold text-white">Quantidade de Pontos a Resgatar</h2>
              </div>
              <span className="text-xs text-amber-400 font-bold">1.000 PTS = US$ 1,00</span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[5000, 10000, 20000, 50000].map((pts) => {
                const usd = pts / pointsPerDollar;
                const isSelected = pointsToWithdraw === pts;
                return (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => handlePresetSelect(pts)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm font-black text-amber-400">{pts.toLocaleString()} PTS</span>
                    <p className="text-xs text-slate-400 mt-0.5">US$ {usd.toFixed(2)}</p>
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Ou introduza o valor de pontos desejado:</span>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => handlePresetSelect(currentUser.pointsBalance)}
                    className="text-amber-400 hover:underline font-semibold"
                  >
                    Utilizar Saldo Total ({currentUser.pointsBalance.toLocaleString()} pts)
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={minPoints}
                  step="500"
                  value={pointsToWithdraw}
                  onChange={(e) => {
                    setPointsToWithdraw(Number(e.target.value));
                    setErrorMessage('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-bold text-lg outline-none focus:border-amber-400 transition-colors"
                />
                <span className="absolute right-4 top-3.5 text-xs text-slate-400 font-bold">PONTOS</span>
              </div>
            </div>

            {/* Calculated Conversion Summary Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/20">
              <span className="text-xs text-slate-400">Valor Líquido a Receber em Dólares (USD):</span>
              <p className="text-3xl font-black text-emerald-400 mt-0.5">US$ {amountUsd.toFixed(2)}</p>
              <p className="text-[11px] text-slate-400 mt-1">Mínimo para saque: 5.000 pontos (US$ 5,00) • 1.000 PTS = US$ 1,00</p>
            </div>
          </div>

          {/* Step 3: Account Details Form */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">3</span>
              <h2 className="text-base font-bold text-white">Dados da Conta para Recebimento ({currentMethod.name})</h2>
            </div>

            <div className="space-y-3 pt-1">
              {currentMethod.fields.map((field) => (
                <div key={field.id} className="space-y-1 text-left">
                  <label className="text-xs font-semibold text-slate-300">
                    {field.labelPt} <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type={field.type}
                    value={fieldValues[field.id] || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm outline-none focus:border-amber-400 transition-colors"
                  />
                  {field.helpTextPt && (
                    <p className="text-[11px] text-slate-400">{field.helpTextPt}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pending Funds Notification */}
          {!hasPlatformFunds && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-200 text-left space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Levantamentos temporariamente indisponíveis — aguarde novos fundos</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                O fundo reservado pelo administrador para pagamentos está temporariamente esgotado ou insuficiente para esta solicitação. O seu saldo de pontos permanece 100% seguro na sua conta. Novos levantamentos serão processados assim que o fundo for recarregado.
              </p>
            </div>
          )}

          {/* Insufficient balance notice */}
          {hasInsufficientBalance && (
            <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-bold text-amber-300">Saldo insuficiente para levantamento.</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  O valor mínimo obrigatório para levantar é de <strong>5.000 pontos (US$ 5,00)</strong>. O seu saldo atual é de <strong className="text-amber-400">{currentPoints.toLocaleString()} pontos</strong>.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in whitespace-pre-line">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Financial Policy */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Transparência e Regras Financeiras do EarnWorld</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              • <strong>Sem depósitos prévios:</strong> Nunca cobramos taxas para levantar. Todos os ganhos são fruto das tarefas e anúncios completados.
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              • <strong>Regra de 3 dias:</strong> Novos utilizadores podem solicitar o primeiro saque após 3 dias do cadastro por segurança anti-fraude. Depois dos 3 dias, não existe nova espera: pode sacar novamente sempre que tiver saldo suficiente e houver fundo disponível.
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              • <strong>Proteção do Saldo:</strong> Se não houver fundo disponível no momento, o seu saldo permanece intacto. Cada saque aprovado diminui o fundo disponível pelo valor pago.
            </p>
          </div>

          {/* Submit Action */}
          <div>
            {!currentUser ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-base hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/25 active:scale-95 transition-all"
              >
                Iniciar Sessão para Levantar Fundos
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || hasInsufficientBalance || !hasPlatformFunds || !isEligibleAfter3Days || hasPendingRequest}
                className={`w-full py-4 rounded-xl font-black text-base transition-all flex items-center justify-center gap-2 ${
                  hasInsufficientBalance || !hasPlatformFunds || !isEligibleAfter3Days || hasPendingRequest
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/25 active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <span>A processar o pedido...</span>
                ) : hasPendingRequest ? (
                  <>
                    <Clock className="w-5 h-5 text-amber-500" />
                    <span>Pedido pendente em análise — aguarde a aprovação (Ref: {existingPending?.id.slice(-6)})</span>
                  </>
                ) : !isEligibleAfter3Days ? (
                  <>
                    <Lock className="w-5 h-5 text-amber-500" />
                    <span>Levantamento liberado em {remainingDays > 1 ? `${remainingDays} dias` : `${remainingHours} horas`} (Regra de 3 Dias)</span>
                  </>
                ) : !hasPlatformFunds ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span>Levantamentos temporariamente indisponíveis — aguarde novos fundos</span>
                  </>
                ) : hasInsufficientBalance ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span>Saldo insuficiente para levantamento (Mínimo 5.000 pts)</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 text-slate-950" />
                    <span>Rever e Confirmar Levantamento (US$ {amountUsd.toFixed(2)})</span>
                  </>
                )}
              </button>
            )}
          </div>

        </form>
      )}

      {/* Confirmation Step Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/40 p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Confirmação de Levantamento</h3>
                  <p className="text-xs text-slate-400">Verifique os dados com atenção antes de enviar</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Método Escolhido:</span>
                <span className="text-white font-bold uppercase">{currentMethod.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pontos a Debitar:</span>
                <span className="text-amber-400 font-mono font-bold">{pointsToWithdraw.toLocaleString()} PTS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Valor em Dólares:</span>
                <span className="text-emerald-400 font-black text-base">US$ {amountUsd.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-slate-400 font-semibold block">Dados do Destinatário:</span>
                {currentMethod.fields.map(f => (
                  <div key={f.id} className="flex justify-between text-[11px]">
                    <span className="text-slate-400">{f.labelPt}:</span>
                    <span className="text-slate-200 font-mono font-medium">{fieldValues[f.id] || '-'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-full sm:w-1/2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Voltar e Corrigir
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteWithdrawal}
                className="w-full sm:w-1/2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-yellow-300 shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>A processar...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Confirmar e Enviar Pedido</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Withdrawal History Section */}
      {currentUser && (
        <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">Histórico dos Meus Levantamentos</h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
            >
              <span>Ver Extrato Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {userWithdrawals.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
              <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Nenhum pedido de levantamento registado ainda.</p>
              <p className="text-[11px] text-slate-500">Assim que tiver 5.000 pontos e conta com mais de 3 dias, pode resgatar aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userWithdrawals.map(w => (
                <div key={w.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white uppercase">{w.paymentMethod}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        w.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                        w.status === 'approved' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                        w.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                        'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}>
                        {w.status === 'paid' ? 'Pago' :
                         w.status === 'approved' ? 'Aprovado' :
                         w.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">ID: {w.id.slice(-8)}</span>
                    </div>
                    <p className="text-slate-400 font-mono text-[11px]">Conta: {w.accountDetails}</p>
                    {w.statusMessage && (
                      <p className="text-amber-300 text-[11px]">Nota: {w.statusMessage}</p>
                    )}
                    {w.txReference && (
                      <p className="text-emerald-400 font-mono text-[11px]">Comprovativo Ref: {w.txReference}</p>
                    )}
                    <p className="text-[10px] text-slate-500">
                      Solicitado em {new Date(w.createdAt).toLocaleDateString()} às {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <p className="font-black text-white text-base">US$ {w.amountUsd.toFixed(2)}</p>
                    <p className="font-mono text-amber-400 font-bold">-{w.pointsDeducted.toLocaleString()} PTS</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

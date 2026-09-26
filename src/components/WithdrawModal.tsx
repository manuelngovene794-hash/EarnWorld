import React, { useState } from 'react';
import { 
  X, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  Coins, 
  Lock,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AppConfig, PaymentMethodId, WithdrawalRequest } from '../types';
import { PAYMENT_METHODS } from '../data/initialData';
import { storageService } from '../services/storageService';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSuccessWithdrawal?: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  config,
  onSuccessWithdrawal
}) => {
  const { currentUser, refreshProfile } = useAuth();
  const { t } = useLanguage();

  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodId>('paypal');
  const [pointsToWithdraw, setPointsToWithdraw] = useState<number>(5000);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<WithdrawalRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [existingPending, setExistingPending] = useState<WithdrawalRequest | null>(null);

  // Load existing withdrawals for duplicate prevention check
  React.useEffect(() => {
    if (currentUser && isOpen) {
      storageService.getUserWithdrawals(currentUser.id).then(wths => {
        const pending = wths.find(w => w.status === 'pending');
        setExistingPending(pending || null);
      });
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const currentPoints = currentUser?.pointsBalance || 0;
  const userCountry = currentUser?.country || 'MZ';
  const pointsPerDollar = config.pointsPerDollar || 1000;
  const minPoints = 5000; // Strict minimum 5000 pts = $5

  const amountUsd = pointsToWithdraw / pointsPerDollar;
  const currentFund = typeof config.paymentFundUsd === 'number' ? config.paymentFundUsd : (config.availableRealRevenueUsd ?? 0);
  const isFundZero = currentFund <= 0;
  const hasPlatformFunds = currentFund >= amountUsd && !isFundZero;
  const hasInsufficientBalance = currentPoints < minPoints || pointsToWithdraw > currentPoints;
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

  // Selected method configuration
  const currentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethodId) || PAYMENT_METHODS[0];

  const handleFieldChange = (fieldId: string, val: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: val }));
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      setErrorMessage('Por favor, inicie sessão.');
      return;
    }

    // Validation 1: 3-Day Rule
    if (!isEligibleAfter3Days) {
      setErrorMessage(
        `Regra de Segurança: O primeiro levantamento só é permitido após 3 dias da criação da conta. Restam aproximadamente ${remainingDays > 1 ? `${remainingDays} dias` : `${remainingHours} hora(s)`}. Os teus pontos continuam seguros.`
      );
      return;
    }

    // Validation 1.5: Prevent duplicate requests
    if (hasPendingRequest) {
      setErrorMessage(
        `Já possui um pedido de levantamento pendente de análise (ID: ${existingPending?.id.slice(-6)}). Para evitar pedidos duplicados, aguarde a conclusão do pedido anterior antes de solicitar um novo.`
      );
      return;
    }

    // Validation 2: Minimum amount
    if (pointsToWithdraw < minPoints) {
      setErrorMessage('O levantamento mínimo é de 5.000 pontos (US$ 5,00).');
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

    setIsSubmitting(true);

    try {
      const accountSummary = Object.entries(fieldValues)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');

      const newWithdrawal = await storageService.createWithdrawal({
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email,
        country: userCountry,
        pointsDeducted: pointsToWithdraw,
        amountUsd: Number(amountUsd.toFixed(2)),
        amountMzn: 0,
        paymentMethod: selectedMethodId,
        accountDetails: accountSummary,
        accountName: fieldValues['name'] || fieldValues['holder'] || currentUser.displayName,
        status: 'pending',
        statusMessage: 'Aguardando validação do administrador.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await refreshProfile();

      setSuccessInfo(newWithdrawal);
      if (onSuccessWithdrawal) onSuccessWithdrawal();
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setErrorMessage(err.message || 'Erro ao efetuar levantamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccessInfo(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-amber-500/30 p-6 sm:p-7 shadow-2xl my-8">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Solicitar Levantamento</h2>
            <p className="text-xs text-slate-400">
              {currentUser ? `Saldo disponível: ${currentPoints.toLocaleString()} PTS (≈ $${(currentPoints / 1000).toFixed(2)} USD)` : 'Levantamento de pontos'}
            </p>
          </div>
        </div>

        {/* 3-Day Rule Notification for New Users */}
        {currentUser && !isEligibleAfter3Days && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-left space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Regra de 3 Dias: Levantamento disponível em breve</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Novos utilizadores podem solicitar levantamentos após <strong>3 dias</strong> da criação da conta. Liberado em: <strong>{unlockDate.toLocaleDateString()} às {unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> (restam aproximadamente {remainingDays > 1 ? `${remainingDays} dias` : `${remainingHours} horas`}).
            </p>
          </div>
        )}

        {/* Success confirmation */}
        {successInfo ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pedido Registado com Sucesso!</h3>
              <p className="text-xs text-slate-400 mt-1">ID: <span className="font-mono text-amber-400">{successInfo.id}</span></p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Método:</span>
                <span className="text-white font-bold">{currentMethod.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pontos Deduzidos:</span>
                <span className="text-amber-400 font-bold">{successInfo.pointsDeducted.toLocaleString()} PTS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor em Dólares:</span>
                <span className="text-emerald-400 font-bold">US$ {successInfo.amountUsd.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs uppercase hover:from-amber-400 shadow-md"
            >
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Method selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Método de Pagamento</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const isSel = selectedMethodId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setSelectedMethodId(m.id); setErrorMessage(''); }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSel
                          ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-white text-xs">{m.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1">Mín. US${m.minUsd}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Points preset */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <label className="font-semibold">Pontos a Resgatar (Mín. 5.000 pts = $5,00)</label>
                <span className="text-amber-400 font-mono font-bold">${amountUsd.toFixed(2)} USD</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[5000, 10000, 20000, 50000].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => { setPointsToWithdraw(pts); setErrorMessage(''); }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      pointsToWithdraw === pts
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {pts.toLocaleString()} pts
                  </button>
                ))}
              </div>
            </div>

            {/* Account fields */}
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              ))}
            </div>

            {/* Pending Funds Notification */}
            {!hasPlatformFunds && (
              <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Levantamentos temporariamente indisponíveis — aguarde novos fundos</span>
                </p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  O fundo de pagamentos está temporariamente sem saldo suficiente para novos saques. O teu saldo de pontos permanece seguro na conta.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 whitespace-pre-line">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || hasInsufficientBalance || !hasPlatformFunds || !isEligibleAfter3Days || hasPendingRequest}
              className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                hasInsufficientBalance || !hasPlatformFunds || !isEligibleAfter3Days || hasPendingRequest
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300 shadow-lg shadow-amber-500/20 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <span>A processar...</span>
              ) : hasPendingRequest ? (
                <>
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Pedido Pendente em Análise</span>
                </>
              ) : !isEligibleAfter3Days ? (
                <>
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Liberado em {remainingDays > 1 ? `${remainingDays} dias` : `${remainingHours} horas`} (Regra de 3 Dias)</span>
                </>
              ) : !hasPlatformFunds ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Levantamentos temporariamente indisponíveis — aguarde novos fundos</span>
                </>
              ) : hasInsufficientBalance ? (
                <span>Saldo insuficiente (Mín. 5.000 pts)</span>
              ) : (
                <span>Confirmar Levantamento (${amountUsd.toFixed(2)} USD)</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  X, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Coins, 
  ArrowRight,
  ShieldAlert,
  Info
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
  const { currentUser, updatePoints } = useAuth();
  const { t } = useLanguage();

  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodId>('mpesa');
  const [pointsToWithdraw, setPointsToWithdraw] = useState<number>(5000);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<WithdrawalRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentPoints = currentUser?.pointsBalance || 0;
  const userCountry = currentUser?.country || 'MZ';
  const usdRate = config.usdToMznRate || 64.0;
  const pointsPerDollar = config.pointsPerDollar || 1000;
  const minPoints = config.minWithdrawalPoints || 5000;

  const amountUsd = pointsToWithdraw / pointsPerDollar;
  const amountMzn = amountUsd * usdRate;

  // Selected method configuration
  const currentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethodId) || PAYMENT_METHODS[0];

  // Validate if method is available for this country
  const isMethodAvailableForCountry = (method: typeof currentMethod, country: string) => {
    if (method.supportedCountries.includes('*')) return true;
    return method.supportedCountries.includes(country);
  };

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

    // Validation 1: Minimum amount
    if (pointsToWithdraw < minPoints) {
      setErrorMessage('O levantamento mínimo é de US$5.');
      return;
    }

    // Validation 2: User Balance
    if (pointsToWithdraw > currentPoints) {
      setErrorMessage('Saldo insuficiente.');
      return;
    }

    // Validation 3: Country support check
    if (!isMethodAvailableForCountry(currentMethod, userCountry)) {
      setErrorMessage('Método de pagamento indisponível no seu país.');
      return;
    }

    // Validation 4: Required fields
    for (const field of currentMethod.fields) {
      const val = fieldValues[field.id];
      if (!val || val.trim().length === 0) {
        setErrorMessage(`Por favor preencha: ${field.labelPt}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Core financial transparency check:
      // Does EarnWorld have real available liquid revenue right now?
      const hasRealLiquidity = config.availableRealRevenueUsd >= amountUsd;
      const initialStatus = 'pending';
      const statusMessage = hasRealLiquidity
        ? 'Aguardando validação do administrador.'
        : 'Aguardando receita disponível para pagamento.';

      // Format account details for the transaction
      const accountSummary = Object.entries(fieldValues)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');

      const newWithdrawal = await storageService.createWithdrawal({
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.displayName || currentUser.email,
        country: userCountry,
        pointsDeducted: pointsToWithdraw,
        amountUsd,
        amountMzn,
        paymentMethod: selectedMethodId,
        accountDetails: accountSummary,
        accountName: fieldValues['name'] || fieldValues['holder'] || currentUser.displayName,
        status: initialStatus,
        statusMessage,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Deduct points from user's internal reward balance
      await updatePoints(
        -pointsToWithdraw,
        `Pedido de Levantamento via ${currentMethod.name} (${amountUsd.toFixed(2)} USD)`,
        'withdrawal'
      );

      setSuccessInfo(newWithdrawal);
      if (onSuccessWithdrawal) onSuccessWithdrawal();
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setErrorMessage(err.message || 'Erro ao processar levantamento.');
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

        {!successInfo ? (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{t('withdraw.title')}</h3>
                <p className="text-xs text-slate-400">{t('withdraw.subtitle')}</p>
              </div>
            </div>

            {/* User points pill */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-400 font-medium">O Seu Saldo Disponível:</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black text-amber-400">{currentPoints.toLocaleString()} PTS</span>
                <span className="text-xs text-slate-400">≈ ${(currentPoints / pointsPerDollar).toFixed(2)} USD</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              
              {/* Payment Method Selector Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  1. {t('withdraw.choose_method')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PAYMENT_METHODS.map((method) => {
                    const isSupported = isMethodAvailableForCountry(method, userCountry);
                    const isSelected = selectedMethodId === method.id;
                    return (
                      <button
                        type="button"
                        key={method.id}
                        onClick={() => {
                          setSelectedMethodId(method.id);
                          setErrorMessage('');
                        }}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/40'
                            : isSupported
                            ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                            : 'bg-slate-950/30 border-slate-800/50 text-slate-500 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold truncate">{method.name}</span>
                          {method.supportedCountries.includes('MZ') && (
                            <span className="text-xs">🇲🇿</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Mín. ${method.minUsd}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!isMethodAvailableForCountry(currentMethod, userCountry) && (
                  <p className="text-xs font-medium text-amber-400/90 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Método de pagamento indisponível no seu país ({userCountry}).</span>
                  </p>
                )}
              </div>

              {/* Points Converter Slider / Amount */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase">
                    2. Quantidade de Pontos (Mín. 5.000 PTS)
                  </label>
                  <span className="text-xs font-bold text-amber-400">
                    {pointsToWithdraw.toLocaleString()} PTS
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPointsToWithdraw(5000)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      pointsToWithdraw === 5000 ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    5.000 PTS ($5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsToWithdraw(10000)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      pointsToWithdraw === 10000 ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    10.000 PTS ($10)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsToWithdraw(Math.max(5000, currentPoints))}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                  >
                    Máximo ({currentPoints.toLocaleString()})
                  </button>
                </div>

                <input
                  type="range"
                  min="5000"
                  max={Math.max(5000, currentPoints || 50000)}
                  step="1000"
                  value={pointsToWithdraw}
                  onChange={(e) => setPointsToWithdraw(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                {/* Conversion Preview Card */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Valor a Receber (USD)</span>
                    <p className="text-lg font-black text-white">${amountUsd.toFixed(2)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left">
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold">Equivalente em Meticais</span>
                    <p className="text-lg font-black text-emerald-400">{amountMzn.toFixed(2)} MT</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Payment Fields */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  3. Dados de Envio ({currentMethod.name})
                </label>
                {currentMethod.fields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-xs font-medium text-slate-400">
                      {field.labelPt}
                    </label>
                    <input
                      type={field.type}
                      required
                      placeholder={field.placeholder}
                      value={fieldValues[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                    {field.helpTextPt && (
                      <p className="text-[11px] text-slate-400">{field.helpTextPt}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Real Treasury Liquidity Disclosure Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5 text-amber-300">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Transparência de Liquidez EarnWorld
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">100% Sem Dinheiro Fictício</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  O EarnWorld só efetua levantamentos suportados por receita real disponível.
                  {config.availableRealRevenueUsd < amountUsd ? (
                    <span className="text-amber-400 block mt-1 font-semibold">
                      Nota: O fundo atual está temporariamente reservado. O seu pedido ficará registado com o estado "Aguardando receita disponível para pagamento."
                    </span>
                  ) : (
                    <span className="text-emerald-400 block mt-1 font-semibold">
                      ✓ Reserva líquida suficiente para aprovação deste montante.
                    </span>
                  )}
                </p>
              </div>

              {/* Error Box */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>A processar...</span>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>{t('withdraw.submit_btn')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Confirmation Success Screen */
          <div className="space-y-4 text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Pedido de Levantamento Registado!</h3>
              <p className="text-xs text-slate-300 mt-1">
                O seu pedido foi registado no sistema de auditoria do EarnWorld.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">ID do Pedido:</span>
                <span className="text-white font-mono">{successInfo.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Método Selecionado:</span>
                <span className="text-amber-400 font-bold uppercase">{successInfo.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Montante Convertido:</span>
                <span className="text-white font-bold">${successInfo.amountUsd.toFixed(2)} USD ({successInfo.amountMzn.toFixed(2)} MT)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-400">Pontos Deduzidos:</span>
                <span className="text-amber-300 font-bold">-{successInfo.pointsDeducted.toLocaleString()} PTS</span>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-slate-400">Estado Atual:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {successInfo.statusMessage || t('admin.status_pending')}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Os administradores analisam e processam os levantamentos diretamente para a sua conta ou carteira. Pode acompanhar o estado no separador Histórico.
            </p>

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors"
            >
              Concluir
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

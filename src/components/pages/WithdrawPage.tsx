import React, { useState } from 'react';
import { 
  Wallet, 
  Coins, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck,
  ArrowRight, 
  Clock, 
  Info,
  HelpCircle,
  Building2,
  Send,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppConfig, PaymentMethodId, WithdrawalRequest } from '../../types';
import { PAYMENT_METHODS } from '../../data/initialData';
import { storageService } from '../../services/storageService';
import { exchangeRateService } from '../../services/exchangeRateService';

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

  const [selectedMethodId, setSelectedMethodId] = useState<PaymentMethodId>('mpesa');
  const [pointsToWithdraw, setPointsToWithdraw] = useState<number>(5000);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<WithdrawalRequest | null>(null);

  const currentPoints = currentUser?.pointsBalance || 0;
  const userCountry = currentUser?.country || 'MZ';
  const usdRate = config.usdToMznRate || 64.0;
  const pointsPerDollar = config.pointsPerDollar || 1000;
  const minPoints = 5000; // Strictly 5.000 points = US$5.00

  const amountUsd = pointsToWithdraw / pointsPerDollar;
  const amountMzn = amountUsd * usdRate;
  const hasInsufficientBalance = currentPoints < minPoints || pointsToWithdraw > currentPoints;
  const hasPlatformFunds = (config.availableRealRevenueUsd || 0) >= amountUsd;

  // Selected method configuration
  const currentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethodId) || PAYMENT_METHODS[0];

  const isMethodAvailableForCountry = (method: typeof currentMethod, country: string) => {
    if (method.supportedCountries.includes('*')) return true;
    return method.supportedCountries.includes(country);
  };

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

    // Validation 1: Minimum withdrawal (5.000 points = US$5)
    if (pointsToWithdraw < minPoints) {
      setErrorMessage(`O levantamento mínimo é de ${minPoints.toLocaleString()} pontos (US$ 5,00).`);
      return;
    }

    // Validation 2: User Balance
    if (currentPoints < minPoints || pointsToWithdraw > currentPoints) {
      setErrorMessage('Saldo insuficiente para levantamento.');
      return;
    }

    // Validation 3: Platform Treasury Liquidity
    if (!hasPlatformFunds) {
      setErrorMessage('💰 Saques em pausa\nNeste momento os fundos para pagamentos estão indisponíveis. Os teus pontos continuam seguros. Continua a ganhar e tenta novamente mais tarde.');
      return;
    }

    // Validation 4: Country support
    if (!isMethodAvailableForCountry(currentMethod, userCountry)) {
      setErrorMessage('Método de pagamento indisponível no seu país.');
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

    // Final security check: Do not deduct points if platform funds are insufficient
    if (!hasPlatformFunds) {
      setIsSubmitting(false);
      setErrorMessage('💰 Saques em pausa\nNeste momento os fundos para pagamentos estão indisponíveis. Os teus pontos continuam seguros. Continua a ganhar e tenta novamente mais tarde.');
      return;
    }

    try {
      // Format account details
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
        amountMzn: Number(amountMzn.toFixed(2)),
        exchangeRateUsed: usdRate,
        paymentMethod: selectedMethodId,
        accountDetails: accountSummary,
        accountName: fieldValues['name'] || fieldValues['holder'] || currentUser!.displayName || currentUser!.email,
        status: 'pending',
        statusMessage: 'Aguardando validação do administrador.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Refresh fresh profile from database transaction
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
      setErrorMessage(err.message || 'Saldo insuficiente para levantamento.');
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
              <span>Moçambique (M-Pesa / e-Mola) & Pagamentos Globais</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Solicitar <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Levantamento</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Converta os seus pontos ganhos em pagamentos reais. Mínimo de 5.000 pontos (US$5,00). Sem qualquer taxa ou depósito prévio.
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
                ≈ ${ (currentPoints / 1000).toFixed(2) } USD ({ ((currentPoints / 1000) * usdRate).toFixed(2) } MT)
              </span>
            </div>
          )}
        </div>
      </div>

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
              <span className="text-white font-bold">US$ {successInfo.amountUsd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Valor a Receber (MZN):</span>
              <span className="text-emerald-400 font-bold">{successInfo.amountMzn.toFixed(2)} MT</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Estado Atual:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase border ${
                successInfo.statusMessage?.includes('Aguardando receita')
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}>
                {successInfo.statusMessage?.includes('Aguardando receita')
                  ? 'Aguardando receita disponível para pagamento'
                  : 'Pendente (Em Validação)'}
              </span>
            </div>
            {successInfo.statusMessage && (
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <span className="text-slate-400">Nota:</span> {successInfo.statusMessage}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 text-left space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Regra de Transparência Financeira EarnWorld</span>
            </p>
            <p className="text-[11px] text-slate-300">
              O EarnWorld financia levantamentos exclusivamente com receita real líquida obtida de parceiros publicitários. Sem fundos fictícios. O seu pedido está registrado de forma segura.
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
              <span className="text-xs text-slate-400">País Atual: <strong>{userCountry === 'MZ' ? '🇲🇿 Moçambique' : userCountry}</strong></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedMethodId === method.id;
                const isAvailable = isMethodAvailableForCountry(method, userCountry);

                return (
                  <div
                    key={method.id}
                    onClick={() => {
                      if (isAvailable) {
                        setSelectedMethodId(method.id);
                        setErrorMessage('');
                      }
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/30'
                        : isAvailable
                        ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/30 border-slate-900 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-sm">{method.name}</span>
                      {method.id === 'mpesa' && <span className="text-xs">🇲🇿 Vodacom</span>}
                      {method.id === 'emola' && <span className="text-xs">🇲🇿 Movitel</span>}
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
                      ) : !isAvailable ? (
                        <span className="text-rose-400">Indisponível no país</span>
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
                <h2 className="text-base font-bold text-white">Quantidade de Pontos a Converter</h2>
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
                    <p className="text-xs text-slate-400 mt-0.5">US$ {usd.toFixed(2)} ({ (usd * usdRate).toFixed(0) } MT)</p>
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Ou digite o valor de pontos desejado:</span>
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => handlePresetSelect(currentUser.pointsBalance)}
                    className="text-amber-400 hover:underline font-semibold"
                  >
                    Utilizar Saldo Máximo ({currentUser.pointsBalance.toLocaleString()} pts)
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
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-400">Valor em Dólares (USD):</span>
                <p className="text-2xl font-black text-white">US$ {amountUsd.toFixed(2)}</p>
                <p className="text-[11px] text-slate-400">Mínimo obrigatório: US$ 5,00</p>
              </div>

              <div>
                <span className="text-xs text-emerald-400 font-semibold">Valor em Meticais (MZN) 🇲🇿:</span>
                <p className="text-2xl font-black text-emerald-400">{amountMzn.toFixed(2)} MT</p>
                <p className="text-[11px] text-slate-400">
                  Câmbio: US$1 = {usdRate.toFixed(2)} MZN • Atualizado: {exchangeRateService.formatLastUpdateDate(config.usdToMznLastUpdated)}
                </p>
              </div>
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

          {/* Saques em pausa Banner when platform funds are insufficient */}
          {!hasPlatformFunds && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-200 text-left space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                <span>💰 Saques em pausa</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                Neste momento os fundos para pagamentos estão indisponíveis. Os teus pontos continuam seguros. Continua a ganhar e tenta novamente mais tarde.
              </p>
            </div>
          )}

          {/* Real Liquidity Notice & Error display */}
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

          {/* Processing Notice & Financial Policy */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Transparência e Regras Financeiras do EarnWorld</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              • <strong>Sem pagamentos automáticos:</strong> Não prometemos transferências automáticas nem dinheiro não gerado pela plataforma. Todos os pedidos são verificados contra atividades legítimas.
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              • <strong>Receita real auditada:</strong> Os pagamentos são aprovados apenas com fundos líquidos reais gerados por anúncios e ofertas parceiras. Se o fundo estiver em liquidação, o levantamento entrará em pausa e os seus pontos permanecerão sempre seguros na sua conta.
            </p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              • <strong>Referência visual:</strong> A taxa de 1.000 pontos = US$ 1,00 e US$ 1,00 = 64,00 MZN é apenas uma referência de conversão e não significa que existe dinheiro imediatamente disponível para pagamento sem a auditoria da plataforma.
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
                disabled={isSubmitting || hasInsufficientBalance || !hasPlatformFunds}
                className={`w-full py-4 rounded-xl font-black text-base transition-all flex items-center justify-center gap-2 ${
                  hasInsufficientBalance || !hasPlatformFunds
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300 shadow-xl shadow-amber-500/25 active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <span>A processar o pedido...</span>
                ) : !hasPlatformFunds ? (
                  <span>💰 Saques em pausa</span>
                ) : hasInsufficientBalance ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span>Saldo insuficiente para levantamento (Mínimo 5.000 pts)</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5 text-slate-950" />
                    <span>Rever e Confirmar Levantamento ({amountUsd.toFixed(2)} USD / {amountMzn.toFixed(2)} MT)</span>
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
                <span className="text-white font-bold uppercase flex items-center gap-1.5">
                  <span>{currentMethod.name}</span>
                  {userCountry === 'MZ' && <span>🇲🇿</span>}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Pontos a Debitar:</span>
                <span className="text-amber-400 font-mono font-bold">{pointsToWithdraw.toLocaleString()} PTS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Equivalente em Dólares:</span>
                <span className="text-white font-bold">US$ {amountUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Valor a Receber em MZN:</span>
                <span className="text-emerald-400 font-black text-sm">{amountMzn.toFixed(2)} MT</span>
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

            {/* Financial Liquidity Status Preview */}
            <div className={`p-3 rounded-xl border text-xs ${
              config.availableRealRevenueUsd >= amountUsd
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              {config.availableRealRevenueUsd >= amountUsd ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Reserva de Liquidez Disponível:</strong> O EarnWorld possui receita real suficiente para processar este levantamento de imediato.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Regra Financeira Real:</strong> Nunca criamos dinheiro fictício. Este pedido entrará no estado <em>"Aguardando receita disponível para pagamento"</em> até à confirmação dos fundos dos anunciantes.
                  </p>
                </div>
              )}
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

    </div>
  );
};

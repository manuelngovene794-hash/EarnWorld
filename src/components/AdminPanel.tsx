import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  DollarSign, 
  Coins, 
  Users, 
  Wallet, 
  TrendingUp, 
  Settings, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Save, 
  Search, 
  RefreshCw,
  Ban,
  Check,
  AlertTriangle,
  ArrowRight,
  ListTodo,
  CreditCard,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { AppConfig, WithdrawalRequest, UserProfile, PaymentMethodConfig, TaskItem } from '../types';
import { storageService } from '../services/storageService';
import { PAYMENT_METHODS, INITIAL_TASKS } from '../data/initialData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AdminPanelProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ config, onUpdateConfig }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'withdrawals' | 'users' | 'tasks' | 'methods' | 'revenue' | 'settings' | 'fraud'>('withdrawals');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(PAYMENT_METHODS);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState<string>('');

  // Editable config fields
  const [usdMznRate, setUsdMznRate] = useState<number>(config.usdToMznRate || 64.0);
  const [availableRealRev, setAvailableRealRev] = useState<number>(config.availableRealRevenueUsd || 1450.0);
  const [estimatedAdRev, setEstimatedAdRev] = useState<number>(config.estimatedAdRevenueUsd || 3820.5);
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [minPts, setMinPts] = useState<number>(config.minWithdrawalPoints || 5000);
  const [adPts, setAdPts] = useState<number>(config.adRewardPoints || 25);
  const [refPts, setRefPts] = useState<number>(config.referralBonusPoints || 200);
  const [adProvider, setAdProvider] = useState<'monetag' | 'admob' | 'direct'>(config.adNetworkProvider || 'monetag');
  const [monetagZone, setMonetagZone] = useState<string>(config.monetagZoneId || 'monetag_rewarded_inpage');
  const [admobPub, setAdmobPub] = useState<string>(config.admobPublisherId || 'ca-pub-monetization-partner');

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'survey' | 'offer' | 'video'>('survey');
  const [newTaskReward, setNewTaskReward] = useState<number>(1000);
  const [newTaskMinutes, setNewTaskMinutes] = useState<number>(10);
  const [newTaskPartner, setNewTaskPartner] = useState('CPX Research');
  const [newTaskBadge, setNewTaskBadge] = useState('Novo em Moçambique');

  // User points adjustment state
  const [selectedUserForPoints, setSelectedUserForPoints] = useState<UserProfile | null>(null);
  const [pointsAdjustInput, setPointsAdjustInput] = useState<number>(500);

  const [txRefInput, setTxRefInput] = useState<Record<string, string>>({});
  const [successToast, setSuccessToast] = useState<string>('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [allWths, allUsers, firestoreTasks] = await Promise.all([
        storageService.getAllWithdrawals(),
        storageService.getAllUsers(),
        storageService.getTasks()
      ]);
      setWithdrawals(allWths);
      setUsers(allUsers);
      if (firestoreTasks && firestoreTasks.length > 0) {
        setTasks(firestoreTasks);
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Update rates & settings
  const handleSaveSettings = async () => {
    try {
      const updated: AppConfig = {
        ...config,
        usdToMznRate: Number(usdMznRate),
        availableRealRevenueUsd: Number(availableRealRev),
        estimatedAdRevenueUsd: Number(estimatedAdRev),
        minWithdrawalPoints: Number(minPts),
        adRewardPoints: Number(adPts),
        referralBonusPoints: Number(refPts),
        adNetworkProvider: adProvider,
        monetagZoneId: monetagZone,
        admobPublisherId: admobPub
      };
      await storageService.updateAppConfig(updated);
      onUpdateConfig(updated);
      showToast('Configurações e rede de monetização salvas com sucesso!');
    } catch (e) {
      console.error(e);
    }
  };

  // Inject Real Treasury Liquidity
  const handleDepositLiquidity = async () => {
    if (depositAmount <= 0) return;
    const newAvailable = availableRealRev + depositAmount;
    setAvailableRealRev(newAvailable);
    const updated: AppConfig = {
      ...config,
      availableRealRevenueUsd: newAvailable
    };
    await storageService.updateAppConfig(updated);
    onUpdateConfig(updated);
    showToast(`Adicionados US$ ${depositAmount} à reserva real de liquidez disponível!`);
    setDepositAmount(100);
  };

  // Process Withdrawal Actions
  const handleApproveWithdrawal = async (wth: WithdrawalRequest) => {
    if (config.availableRealRevenueUsd < wth.amountUsd) {
      alert('Aguardando receita disponível para pagamento: O fundo real de liquidez é menor que este levantamento. É proibido criar dinheiro fictício. Adicione fundos reais antes de aprovar.');
      return;
    }

    try {
      const updatedWth: WithdrawalRequest = {
        ...wth,
        status: 'approved',
        statusMessage: 'Aprovado pelo administrador. Pagamento em processamento.',
        updatedAt: new Date().toISOString()
      };
      await storageService.updateWithdrawal(updatedWth);

      const updatedList = withdrawals.map(w => w.id === wth.id ? updatedWth : w);
      setWithdrawals(updatedList);
      showToast(`Levantamento ${wth.id} aprovado com sucesso!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsPaid = async (wth: WithdrawalRequest) => {
    if (config.availableRealRevenueUsd < wth.amountUsd) {
      alert('Não é possível marcar como pago sem receita real suficiente no fundo disponível!');
      return;
    }

    const txRef = txRefInput[wth.id] || `EW-PAY-${Date.now().toString().slice(-6)}`;

    // Deduct real liquid revenue from treasury
    const newAvailableRev = Math.max(0, config.availableRealRevenueUsd - wth.amountUsd);
    setAvailableRealRev(newAvailableRev);
    const updatedCfg: AppConfig = {
      ...config,
      availableRealRevenueUsd: newAvailableRev
    };
    await storageService.updateAppConfig(updatedCfg);
    onUpdateConfig(updatedCfg);

    const updatedWth: WithdrawalRequest = {
      ...wth,
      status: 'paid',
      statusMessage: `Pago com sucesso via ${wth.paymentMethod}. Ref: ${txRef}`,
      txReference: txRef,
      updatedAt: new Date().toISOString()
    };
    await storageService.updateWithdrawal(updatedWth);

    const updatedList = withdrawals.map(w => w.id === wth.id ? updatedWth : w);
    setWithdrawals(updatedList);
    showToast(`Levantamento ${wth.id} liquidado com sucesso! Ref: ${txRef}`);
  };

  const handleRejectWithdrawal = async (wth: WithdrawalRequest, reason = 'Dados de conta ou número incorretos.') => {
    // Refund points to user
    await storageService.updateUserBalance(wth.userId, wth.pointsDeducted);
    await storageService.addTransaction({
      userId: wth.userId,
      type: 'refund',
      points: wth.pointsDeducted,
      amountUsd: wth.amountUsd,
      description: `Reembolso de Levantamento Rejeitado: ${reason}`,
      status: 'completed',
      createdAt: new Date().toISOString()
    });

    const updatedWth: WithdrawalRequest = {
      ...wth,
      status: 'rejected',
      statusMessage: `Rejeitado: ${reason}. Os seus pontos foram reembolsados na totalidade.`,
      updatedAt: new Date().toISOString()
    };
    await storageService.updateWithdrawal(updatedWth);

    const updatedList = withdrawals.map(w => w.id === wth.id ? updatedWth : w);
    setWithdrawals(updatedList);
    showToast(`Levantamento ${wth.id} rejeitado e pontos reembolsados.`);
  };

  const handleMarkWaitingLiquidity = async (wth: WithdrawalRequest) => {
    const updatedWth: WithdrawalRequest = {
      ...wth,
      status: 'pending',
      statusMessage: 'Aguardando receita disponível para pagamento.',
      updatedAt: new Date().toISOString()
    };
    await storageService.updateWithdrawal(updatedWth);
    setWithdrawals(prev => prev.map(w => w.id === wth.id ? updatedWth : w));
    showToast(`Pedido ${wth.id} marcado como "Aguardando receita disponível para pagamento"!`);
  };

  // Adjust User Points
  const handleApplyUserPoints = async (delta: number) => {
    if (!selectedUserForPoints) return;
    try {
      await storageService.updateUserBalance(selectedUserForPoints.id, delta);
      await storageService.addTransaction({
        userId: selectedUserForPoints.id,
        type: 'bonus',
        points: delta,
        amountUsd: delta / (config.pointsPerDollar || 1000),
        description: `Ajuste Administrativo de Pontos (${delta > 0 ? '+' : ''}${delta} PTS)`,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      setUsers(prev => prev.map(u => {
        if (u.id === selectedUserForPoints.id) {
          return {
            ...u,
            pointsBalance: Math.max(0, u.pointsBalance + delta),
            totalEarnedPoints: delta > 0 ? u.totalEarnedPoints + delta : u.totalEarnedPoints
          };
        }
        return u;
      }));

      showToast(`Pontos do utilizador ${selectedUserForPoints.displayName || selectedUserForPoints.email} atualizados!`);
      setSelectedUserForPoints(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: `task-${Date.now().toString().slice(-5)}`,
      title: newTaskTitle,
      titlePt: newTaskTitle,
      description: `Complete esta atividade de ${newTaskPartner} para ganhar pontos.`,
      descriptionPt: `Conclua esta atividade de ${newTaskPartner} para receber pontos.`,
      category: newTaskCategory,
      rewardPoints: Number(newTaskReward),
      estimatedMinutes: Number(newTaskMinutes),
      partner: newTaskPartner,
      isActive: true,
      badge: newTaskBadge
    };

    await storageService.saveTask(newTask);
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    showToast(`Nova tarefa "${newTask.titlePt}" criada com sucesso!`);
  };

  // Toggle Task Active
  const handleToggleTask = async (task: TaskItem) => {
    const updated: TaskItem = { ...task, isActive: !task.isActive };
    await storageService.saveTask(updated);
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    showToast(`Tarefa "${task.titlePt}" ${updated.isActive ? 'ativada' : 'desativada'}!`);
  };

  // Toggle Payment Method
  const handleToggleMethod = (methodId: string) => {
    setPaymentMethods(prev => prev.map(m => {
      if (m.id === methodId) {
        const nextSupported = m.supportedCountries.length === 0 ? ['MZ', '*'] : [];
        return { ...m, supportedCountries: nextSupported };
      }
      return m;
    }));
    showToast(`Método ${methodId} atualizado!`);
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    if (statusFilter === 'all') return true;
    return w.status === statusFilter;
  });

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.displayName?.toLowerCase().includes(q) ||
      u.referralCode?.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q)
    );
  });

  // Calculate circulating points & liability
  const totalCirculatingPoints = users.reduce((acc, u) => acc + (u.pointsBalance || 0), 0);
  const totalCirculatingUsd = totalCirculatingPoints / (config.pointsPerDollar || 1000);
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Admin Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Área Restrita do Administrador</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {t('admin.portal_title')}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Super Administrador: <strong className="text-amber-400">{currentUser?.email || 'manuelngovene794@gmail.com'}</strong>
          </p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Sincronizar Dados</span>
        </button>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Real Liquid Revenue Available */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold uppercase">
            <span>{t('admin.revenue_available')}</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">
            US$ {availableRealRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400/90 mt-1 font-medium">
            ✓ Saldo real para pagar levantamentos
          </p>
        </div>

        {/* KPI 2: Estimated Ad Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold uppercase">
            <span>{t('admin.revenue_estimated')}</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-300 mt-2">
            US$ {estimatedAdRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {t('admin.revenue_note')}
          </p>
        </div>

        {/* KPI 3: USD / MZN Exchange Rate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-lg">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold uppercase">
            <span>Taxa USD / MZN</span>
            <Coins className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
            {usdMznRate} MT / $1
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Cotação atual para M-Pesa & e-Mola
          </p>
        </div>

        {/* KPI 4: Pending Payouts & Liability */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Pedidos Pendentes</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
            {pendingWithdrawalsCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Passivo total: ${(totalCirculatingUsd).toFixed(2)} USD
          </p>
        </div>

      </div>

      {/* Admin Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2">
        {[
          { id: 'withdrawals', label: `${t('admin.withdrawals_tab')} (${withdrawals.length})`, icon: Wallet },
          { id: 'users', label: `${t('admin.users_tab')} (${users.length})`, icon: Users },
          { id: 'tasks', label: `Tarefas & Recompensas (${tasks.length})`, icon: ListTodo },
          { id: 'methods', label: `Métodos de Pagamento (${paymentMethods.length})`, icon: CreditCard },
          { id: 'revenue', label: 'Gestão de Liquidez', icon: DollarSign },
          { id: 'settings', label: t('admin.config_tab'), icon: Settings },
          { id: 'fraud', label: t('admin.fraud_tab'), icon: ShieldAlert },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: WITHDRAWALS */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          {/* Status Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Filtrar:</span>
            {['all', 'pending', 'approved', 'paid', 'rejected'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-colors ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {st === 'all' ? 'Todos' : st}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-4">Utilizador / País</th>
                    <th className="p-4">Método & Conta</th>
                    <th className="p-4">Valor (USD / MZN)</th>
                    <th className="p-4">Pontos</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Nenhum pedido de levantamento encontrado com o filtro atual.
                      </td>
                    </tr>
                  ) : (
                    filteredWithdrawals.map(w => {
                      const isWaitingLiquidity = config.availableRealRevenueUsd < w.amountUsd && w.status === 'pending';
                      return (
                        <tr key={w.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-white">{w.userName}</p>
                            <p className="text-[11px] text-slate-400">{w.userEmail}</p>
                            <span className="text-[10px] text-amber-400 font-bold uppercase mt-0.5 inline-block">
                              {w.country}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 font-bold text-white uppercase">
                              <span>{w.paymentMethod}</span>
                              {w.country === 'MZ' && <span>🇲🇿</span>}
                            </div>
                            <p className="text-[11px] font-mono text-slate-300 mt-0.5">{w.accountDetails}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-white">${w.amountUsd.toFixed(2)} USD</p>
                            <p className="text-[11px] font-bold text-emerald-400">{w.amountMzn.toFixed(2)} MT</p>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-amber-300 font-bold">-{w.pointsDeducted.toLocaleString()}</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              w.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                              w.status === 'approved' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                              w.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                              (isWaitingLiquidity || w.statusMessage?.includes('Aguardando receita')) ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                              'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            }`}>
                              {w.status === 'paid' ? 'Pago' :
                               w.status === 'approved' ? 'Aprovado' :
                               w.status === 'rejected' ? 'Rejeitado' :
                               (isWaitingLiquidity || w.statusMessage?.includes('Aguardando receita')) ? 'Aguardando Receita' : 'Pendente'}
                            </span>
                            {w.statusMessage && (
                              <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate" title={w.statusMessage}>{w.statusMessage}</p>
                            )}
                            {w.txReference && (
                              <p className="text-[10px] text-slate-400 font-mono mt-1">Ref: {w.txReference}</p>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-1 whitespace-nowrap">
                            {w.status === 'pending' && (
                              <>
                                {isWaitingLiquidity && w.statusMessage !== 'Aguardando receita disponível para pagamento.' && (
                                  <button
                                    onClick={() => handleMarkWaitingLiquidity(w)}
                                    className="px-2 py-1 rounded bg-orange-600/80 hover:bg-orange-600 text-white font-bold text-[10px]"
                                    title="Notificar que pedido aguarda liquidez real"
                                  >
                                    Aguardar Receita
                                  </button>
                                )}
                                <button
                                  onClick={() => handleApproveWithdrawal(w)}
                                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px]"
                                >
                                  {t('admin.approve')}
                                </button>
                                <button
                                  onClick={() => handleRejectWithdrawal(w)}
                                  className="px-2.5 py-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px]"
                                >
                                  {t('admin.reject')}
                                </button>
                              </>
                            )}

                            {(w.status === 'approved' || (w.status === 'pending' && !isWaitingLiquidity)) && (
                              <button
                                onClick={() => handleMarkAsPaid(w)}
                                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow"
                              >
                                {t('admin.mark_paid')}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Pesquisar por email, nome, código de convite ou país..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Utilizador</th>
                  <th className="p-4">País</th>
                  <th className="p-4">Saldo Pontos</th>
                  <th className="p-4">Total Ganho</th>
                  <th className="p-4">Convite</th>
                  <th className="p-4">Função</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Nenhum utilizador encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-850/50">
                      <td className="p-4">
                        <p className="font-bold text-white">{u.displayName}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-300">
                          {u.country === 'MZ' ? '🇲🇿 Moçambique' : u.country}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-amber-400 font-black">{u.pointsBalance.toLocaleString()} PTS</span>
                      </td>
                      <td className="p-4 text-slate-300">
                        {u.totalEarnedPoints.toLocaleString()} PTS
                      </td>
                      <td className="p-4 font-mono text-amber-300">
                        {u.referralCode}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedUserForPoints(u);
                            setPointsAdjustInput(500);
                          }}
                          className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold text-[11px] transition-colors border border-amber-500/20"
                        >
                          Ajustar Pontos
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Points Adjustment Modal */}
      {selectedUserForPoints && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Ajuste de Pontos Manual</h3>
              <button
                onClick={() => setSelectedUserForPoints(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="text-white font-bold">{selectedUserForPoints.displayName || selectedUserForPoints.email}</p>
              <p className="text-slate-400">Saldo Atual: <span className="text-amber-400 font-bold">{selectedUserForPoints.pointsBalance.toLocaleString()} PTS</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold">Quantidade de Pontos:</label>
              <input
                type="number"
                value={pointsAdjustInput}
                onChange={(e) => setPointsAdjustInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleApplyUserPoints(Math.abs(pointsAdjustInput))}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Creditar (+{Math.abs(pointsAdjustInput)})</span>
              </button>
              <button
                onClick={() => handleApplyUserPoints(-Math.abs(pointsAdjustInput))}
                className="py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Debitar (-{Math.abs(pointsAdjustInput)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TASKS & REWARDS MANAGEMENT */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Create Task Form */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>Adicionar Nova Tarefa ou Pesquisa Parceira</span>
            </h3>

            <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Título da Tarefa:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pesquisa Moçambique Telecom"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Categoria:</label>
                <select
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-400 outline-none"
                >
                  <option value="survey">Pesquisa de Opinião</option>
                  <option value="offer">Oferta de Parceiro / App</option>
                  <option value="video">Atividade Especial</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Recompensa (Pontos):</label>
                <input
                  type="number"
                  min="50"
                  value={newTaskReward}
                  onChange={(e) => setNewTaskReward(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-400 outline-none font-bold text-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Duração Estimada (minutos):</label>
                <input
                  type="number"
                  min="1"
                  value={newTaskMinutes}
                  onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Rede Parceira:</label>
                <input
                  type="text"
                  value={newTaskPartner}
                  onChange={(e) => setNewTaskPartner(e.target.value)}
                  placeholder="Ex: CPX Research, BitLabs, AdGate"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Badge de Destaque:</label>
                <input
                  type="text"
                  value={newTaskBadge}
                  onChange={(e) => setNewTaskBadge(e.target.value)}
                  placeholder="Ex: Popular em MZ"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs hover:from-amber-400 shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publicar Nova Tarefa</span>
                </button>
              </div>
            </form>
          </div>

          {/* Tasks List Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Tarefa & Categoria</th>
                  <th className="p-4">Parceiro</th>
                  <th className="p-4">Recompensa</th>
                  <th className="p-4">Duração</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tasks.map(t => (
                  <tr key={t.id} className="hover:bg-slate-850/50">
                    <td className="p-4">
                      <p className="font-bold text-white">{t.titlePt || t.title}</p>
                      <span className="text-[10px] text-amber-400 uppercase font-semibold">{t.category}</span>
                      {t.badge && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-300 font-medium">
                          {t.badge}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-slate-300">
                      {t.partner}
                    </td>
                    <td className="p-4 font-mono font-bold text-amber-400">
                      +{t.rewardPoints.toLocaleString()} PTS
                      <span className="text-[10px] text-emerald-400 block font-normal">
                        ≈ ${(t.rewardPoints / (config.pointsPerDollar || 1000)).toFixed(2)} USD
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">
                      {t.estimatedMinutes} min
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {t.isActive ? 'Ativa' : 'Pausada'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleTask(t)}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                          t.isActive
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {t.isActive ? 'Pausar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PAYMENT METHODS MANAGEMENT */}
      {activeTab === 'methods' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <span>Configuração dos Métodos de Levantamento</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Ative ou pause métodos de pagamento de acordo com a liquidez disponível e parcerias em Moçambique e no mundo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map(m => {
              const isAvailable = m.supportedCountries.length > 0;
              return (
                <div key={m.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{m.name}</span>
                      {m.supportedCountries.includes('MZ') && <span>🇲🇿</span>}
                    </div>
                    <button
                      onClick={() => handleToggleMethod(m.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-colors ${
                        isAvailable
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {isAvailable ? 'Ativo' : 'Desativado'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {m.descriptionPt}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Levantamento Mínimo:</span>
                    <span className="text-amber-400 font-bold font-mono">${m.minUsd}.00 USD</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Moeda de Liquidação:</span>
                    <span className="text-white font-bold">{m.currencyTarget} {m.currencyTarget === 'MZN' ? `(Taxa: ${usdMznRate} MT / $1)` : ''}</span>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Campos exigidos: {m.fields.map(f => f.labelPt).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: REVENUE & LIQUIDITY MANAGEMENT */}
      {activeTab === 'revenue' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Injeção de Liquidez Real (Depósito do Administrador)</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              O EarnWorld opera sob a regra de ouro: nenhum pagamento é autorizado sem fundos reais disponíveis.
              Quando a empresa recebe transferências das redes de anúncios (Google AdMob, Unity, parceiros) ou patrocinadores diretos, o saldo é creditado aqui para liberar os levantamentos de Moçambique e mundiais.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Montante em USD a Adicionar:</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-base focus:border-amber-400 focus:outline-none"
                />
                <button
                  onClick={handleDepositLiquidity}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('admin.treasury_deposit')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Revenue Separation Box */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-4">
            <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              <span>Regra Anti-Fictícia de Receita</span>
            </h3>
            <div className="space-y-3 text-xs text-slate-300">
              <p>
                <strong className="text-white">Receita Real Disponível:</strong> US$ {availableRealRev.toFixed(2)} <br />
                <span className="text-slate-400">Saldo bancário/cripto real e auditado apto a pagar pedidos imediatamente.</span>
              </p>
              <p>
                <strong className="text-white">Receita Estimada de Anúncios:</strong> US$ {estimatedAdRev.toFixed(2)} <br />
                <span className="text-slate-400">Projeção estatística de impressões pendentes de pagamento das redes de anúncios. NÃO pode ser usada para liquidar pedidos antes da liquidação real.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS & EXCHANGE RATE */}
      {activeTab === 'settings' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 max-w-2xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <span>Configurações Gerais & Cotação USD / MZN</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Taxa de Câmbio USD/MZN:</label>
              <input
                type="number"
                step="0.1"
                value={usdMznRate}
                onChange={(e) => setUsdMznRate(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm"
              />
              <p className="text-[11px] text-slate-400">1 USD = X Meticais em Moçambique</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Levantamento Mínimo (Pontos):</label>
              <input
                type="number"
                value={minPts}
                onChange={(e) => setMinPts(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm"
              />
              <p className="text-[11px] text-slate-400">Padrão: 5.000 pts = $5,00 USD</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Recompensa por Anúncio (Pontos):</label>
              <input
                type="number"
                value={adPts}
                onChange={(e) => setAdPts(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Bónus de Indicação (Pontos):</label>
              <input
                type="number"
                value={refPts}
                onChange={(e) => setRefPts(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm"
              />
            </div>
          </div>

          {/* Monetization Ready Setup (AdMob / Monetag) */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Configuração da Rede de Anúncios (Monetag / Google AdMob)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Provedor Ativo:</label>
                <select
                  value={adProvider}
                  onChange={(e) => setAdProvider(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs"
                >
                  <option value="monetag">Monetag Rewarded</option>
                  <option value="admob">Google AdMob / AdSense</option>
                  <option value="direct">Rede Direta Parceira</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Monetag Zone ID:</label>
                <input
                  type="text"
                  value={monetagZone}
                  onChange={(e) => setMonetagZone(e.target.value)}
                  placeholder="Ex: 8746321"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">AdMob Publisher / Unit ID:</label>
                <input
                  type="text"
                  value={admobPub}
                  onChange={(e) => setAdmobPub(e.target.value)}
                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider hover:from-amber-400 hover:to-yellow-300 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Todas as Configurações</span>
          </button>
        </div>
      )}

      {/* TAB 5: FRAUD DETECTION */}
      {activeTab === 'fraud' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Painel de Monitorização Antifraude</span>
            </h3>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
              Escudo Ativo: 100%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-xs">Cooldown de Anúncios</span>
              <p className="text-lg font-bold text-white mt-1">30 segundos</p>
              <span className="text-[11px] text-emerald-400">Impede spamming contínuo</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-xs">Captcha Interativo Humano</span>
              <p className="text-lg font-bold text-white mt-1">Ativo em todos os vídeos</p>
              <span className="text-[11px] text-emerald-400">Bloqueia emuladores e scripts</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-xs">Limite Horário por Utilizador</span>
              <p className="text-lg font-bold text-white mt-1">Máx. 10 anúncios / hora</p>
              <span className="text-[11px] text-emerald-400">Conformidade com redes de anúncios</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

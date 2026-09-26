import { AppConfig, TaskItem, WithdrawalRequest, Transaction, UserProfile } from '../types';
import { DEFAULT_CONFIG, INITIAL_TASKS } from '../data/initialData';

// Local storage helper functions for reliable, domain-independent browser persistence
function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Dispatch cross-component storage event
    window.dispatchEvent(new Event('earnworld_storage_sync'));
  } catch (e) {
    console.warn(`LocalStorage write warning for ${key}:`, e);
  }
}

export const storageService = {
  // Global configuration
  async getAppConfig(): Promise<AppConfig> {
    const local = getLocal<AppConfig>('earnworld_app_config', DEFAULT_CONFIG);
    if (local.paymentFundUsd === undefined) {
      local.paymentFundUsd = local.availableRealRevenueUsd ?? DEFAULT_CONFIG.paymentFundUsd ?? 100;
    }
    local.availableRealRevenueUsd = local.paymentFundUsd;
    return local;
  },

  async updateAppConfig(updates: Partial<AppConfig>): Promise<void> {
    const current = await this.getAppConfig();
    const updated = { ...current, ...updates };
    if (updates.paymentFundUsd !== undefined) {
      updated.availableRealRevenueUsd = updates.paymentFundUsd;
    } else if (updates.availableRealRevenueUsd !== undefined) {
      updated.paymentFundUsd = updates.availableRealRevenueUsd;
    }
    setLocal('earnworld_app_config', updated);
  },

  subscribeAppConfig(callback: (config: AppConfig) => void) {
    const emit = () => {
      const current = getLocal<AppConfig>('earnworld_app_config', DEFAULT_CONFIG);
      callback(current);
    };
    emit();

    const handleSync = () => emit();
    window.addEventListener('earnworld_storage_sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('earnworld_storage_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  },

  // Credentials storage for direct email/pass login
  async getUserCredentials(email: string): Promise<{ userId: string; email: string; salt: string; passwordHash: string } | null> {
    const clean = email.trim().toLowerCase();
    const credsMap = getLocal<Record<string, any>>('earnworld_creds_db', {});
    return credsMap[clean] || null;
  },

  async saveUserCredentials(email: string, userId: string, salt: string, passwordHash: string): Promise<void> {
    const clean = email.trim().toLowerCase();
    const credsMap = getLocal<Record<string, any>>('earnworld_creds_db', {});
    const record = {
      userId,
      email: clean,
      salt,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    credsMap[clean] = record;
    setLocal('earnworld_creds_db', credsMap);
  },

  async findUserByEmail(email: string): Promise<UserProfile | null> {
    const clean = email.trim().toLowerCase();
    const usersMap = getLocal<Record<string, UserProfile>>('earnworld_users_db', {});
    for (const u of Object.values(usersMap)) {
      if (u.email && u.email.toLowerCase() === clean) {
        return u;
      }
    }
    return null;
  },

  // User Profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const usersMap = getLocal<Record<string, UserProfile>>('earnworld_users_db', {});
    return usersMap[userId] || null;
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const usersMap = getLocal<Record<string, UserProfile>>('earnworld_users_db', {});
    usersMap[profile.id] = profile;
    setLocal('earnworld_users_db', usersMap);
  },

  async updateUserBalance(userId: string, pointsDelta: number, newTotalEarnedDelta = 0): Promise<void> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return;

    const newBalance = Math.max(0, (profile.pointsBalance || 0) + pointsDelta);
    const newEarned = (profile.totalEarnedPoints || 0) + (newTotalEarnedDelta > 0 ? newTotalEarnedDelta : (pointsDelta > 0 ? pointsDelta : 0));
    const newWithdrawn = (profile.totalWithdrawnPoints || 0) + (pointsDelta < 0 ? Math.abs(pointsDelta) : 0);

    const updated: UserProfile = {
      ...profile,
      pointsBalance: newBalance,
      totalEarnedPoints: newEarned,
      totalWithdrawnPoints: newWithdrawn
    };

    await this.saveUserProfile(updated);
  },

  async refundWithdrawalPoints(userId: string, pointsToRefund: number): Promise<void> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return;

    const updated: UserProfile = {
      ...profile,
      pointsBalance: Math.max(0, (profile.pointsBalance || 0) + pointsToRefund),
      totalWithdrawnPoints: Math.max(0, (profile.totalWithdrawnPoints || 0) - pointsToRefund)
    };
    await this.saveUserProfile(updated);
  },

  async recordDailyCheckIn(userId: string, bonusPoints: number): Promise<{ success: boolean; newStreak: number; newBalance: number }> {
    const todayStr = new Date().toISOString().split('T')[0];
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      throw new Error('Utilizador não encontrado.');
    }

    if (profile.lastCheckInDate === todayStr) {
      throw new Error('Check-in diário já realizado hoje.');
    }

    const prevCheckIn = profile.lastCheckInDate ? new Date(profile.lastCheckInDate) : null;
    const today = new Date(todayStr);
    let newStreak = 1;
    if (prevCheckIn) {
      const diffDays = Math.floor((today.getTime() - prevCheckIn.getTime()) / (1000 * 60 * 60 * 24));
      newStreak = diffDays === 1 ? (profile.consecutiveCheckIns || 0) + 1 : 1;
    }

    const newBalance = (profile.pointsBalance || 0) + bonusPoints;
    const newEarned = (profile.totalEarnedPoints || 0) + bonusPoints;

    const updated: UserProfile = {
      ...profile,
      pointsBalance: newBalance,
      totalEarnedPoints: newEarned,
      lastCheckInDate: todayStr,
      consecutiveCheckIns: newStreak
    };

    await this.saveUserProfile(updated);

    await this.addTransaction({
      userId,
      type: 'checkin',
      points: bonusPoints,
      amountUsd: bonusPoints / 1000,
      description: `Check-in Diário (Dia ${newStreak})`,
      status: 'completed',
      createdAt: new Date().toISOString()
    });

    return { success: true, newStreak, newBalance };
  },

  // Tasks
  async getTasks(): Promise<TaskItem[]> {
    const localTasks = getLocal<TaskItem[]>('earnworld_tasks_db', []);
    if (localTasks.length > 0) return localTasks;
    setLocal('earnworld_tasks_db', INITIAL_TASKS);
    return INITIAL_TASKS;
  },

  async saveTask(task: TaskItem): Promise<void> {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
      tasks[index] = task;
    } else {
      tasks.push(task);
    }
    setLocal('earnworld_tasks_db', tasks);
  },

  async deleteTask(taskId: string): Promise<void> {
    const tasks = await this.getTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    setLocal('earnworld_tasks_db', filtered);
  },

  // Withdrawals
  async createWithdrawal(req: Omit<WithdrawalRequest, 'id'>): Promise<WithdrawalRequest> {
    const minPoints = 5000;
    if (req.pointsDeducted < minPoints) {
      throw new Error(`O levantamento mínimo é de ${minPoints.toLocaleString()} pontos (US$ 5,00).`);
    }

    // 1. RULE: User can only withdraw after 3 days from registration
    const user = await this.getUserProfile(req.userId);
    if (!user) {
      throw new Error('Utilizador não encontrado no sistema.');
    }

    const userCreated = new Date(user.createdAt || Date.now()).getTime();
    const elapsedMs = Date.now() - userCreated;
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    if (elapsedMs < THREE_DAYS_MS) {
      const remainingMs = THREE_DAYS_MS - elapsedMs;
      const hoursRemaining = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));
      const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      throw new Error(
        `Segurança Anti-Fraude: O primeiro levantamento só é permitido após 3 dias da criação da conta. Restam aproximadamente ${daysRemaining > 1 ? `${daysRemaining} dias` : `${hoursRemaining} hora(s)`}. Os teus pontos estão seguros!`
      );
    }

    // 2. RULE: Balance Check
    const currentBalance = user.pointsBalance || 0;
    if (currentBalance < req.pointsDeducted) {
      throw new Error('Saldo insuficiente para levantamento.');
    }

    // 3. RULE: Fundo disponível para pagamentos Check
    // "Quando o fundo chegar a zero, bloquear novos saques e mostrar 'Levantamentos temporariamente indisponíveis — aguarde novos fundos'."
    const config = await this.getAppConfig();
    const currentFund = typeof config.paymentFundUsd === 'number' ? config.paymentFundUsd : (config.availableRealRevenueUsd ?? 0);

    const FUND_UNAVAILABLE_MESSAGE = 'Levantamentos temporariamente indisponíveis — aguarde novos fundos';

    if (currentFund <= 0 || currentFund < req.amountUsd) {
      // Do NOT deduct user points! Balance is kept intact.
      throw new Error(FUND_UNAVAILABLE_MESSAGE);
    }

    // 4. RULE: "Impedir pedidos duplicados"
    const withdrawals = getLocal<WithdrawalRequest[]>('earnworld_withdrawals_db', []);
    
    // Check if user already has an active pending withdrawal
    const existingPending = withdrawals.find(w => w.userId === req.userId && w.status === 'pending');
    if (existingPending) {
      throw new Error(
        `Já possui um pedido de levantamento pendente de validação (ID: ${existingPending.id.slice(-6)} - US$ ${existingPending.amountUsd.toFixed(2)}). Aguarde a conclusão do pedido antes de solicitar um novo para evitar duplicidade.`
      );
    }

    // Prevent rapid double submit (within 30 seconds)
    const recentDuplicate = withdrawals.find(w => 
      w.userId === req.userId && 
      w.pointsDeducted === req.pointsDeducted && 
      (Date.now() - new Date(w.createdAt).getTime()) < 30000
    );
    if (recentDuplicate) {
      throw new Error('Pedido duplicado detectado. Por favor aguarde alguns instantes antes de enviar uma nova solicitação.');
    }

    // 5. Register withdrawal as 'pending' (Pendente)
    const id = 'wth_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const withdrawal: WithdrawalRequest = {
      ...req,
      id,
      amountMzn: 0,
      status: 'pending',
      statusMessage: 'Aguardando validação do administrador.'
    };

    // Deduct user points
    const newBalance = Math.max(0, currentBalance - req.pointsDeducted);
    const newWithdrawn = (user.totalWithdrawnPoints || 0) + req.pointsDeducted;
    await this.saveUserProfile({
      ...user,
      pointsBalance: newBalance,
      totalWithdrawnPoints: newWithdrawn
    });

    // Store withdrawal record in local storage
    withdrawals.unshift(withdrawal);
    setLocal('earnworld_withdrawals_db', withdrawals);

    // Record ledger transaction
    await this.addTransaction({
      userId: req.userId,
      type: 'withdrawal',
      points: -req.pointsDeducted,
      amountUsd: -req.amountUsd,
      description: `Levantamento via ${req.paymentMethod.toUpperCase()} (US$ ${req.amountUsd.toFixed(2)})`,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    return withdrawal;
  },

  // "Cada saque aprovado deve diminuir o fundo disponível pelo valor pago."
  // "Nunca aprovar pagamentos acima do fundo disponível."
  // "Impedir pagamentos repetidos."
  async approveWithdrawal(withdrawalId: string, customMessage?: string): Promise<{ withdrawal: WithdrawalRequest; newFund: number }> {
    const withdrawals = getLocal<WithdrawalRequest[]>('earnworld_withdrawals_db', []);
    const idx = withdrawals.findIndex(w => w.id === withdrawalId);
    if (idx < 0) {
      throw new Error('Pedido de levantamento não encontrado.');
    }

    const wth = withdrawals[idx];

    // Impedir pagamentos repetidos / aprovações repetidas
    if (wth.status === 'paid') {
      throw new Error('Este pedido já foi pago e liquidado anteriormente. Pagamentos repetidos são bloqueados.');
    }
    if (wth.status === 'approved') {
      throw new Error('Este pedido já foi aprovado anteriormente.');
    }
    if (wth.status === 'rejected') {
      throw new Error('Este pedido foi rejeitado e não pode ser aprovado.');
    }

    const config = await this.getAppConfig();
    const currentFund = typeof config.paymentFundUsd === 'number' ? config.paymentFundUsd : (config.availableRealRevenueUsd ?? 0);

    // "Nunca aprovar pagamentos acima do fundo disponível."
    if (currentFund < wth.amountUsd) {
      throw new Error(
        `Fundo insuficiente para aprovar este levantamento! Fundo disponível: US$ ${currentFund.toFixed(2)}, valor solicitado: US$ ${wth.amountUsd.toFixed(2)}. Adicione mais fundos no painel antes de aprovar.`
      );
    }

    // Diminui o fundo disponível pelo valor pago
    const newFund = Math.max(0, Number((currentFund - wth.amountUsd).toFixed(2)));
    await this.updateAppConfig({
      paymentFundUsd: newFund,
      availableRealRevenueUsd: newFund
    });

    const updated: WithdrawalRequest = {
      ...wth,
      status: 'approved',
      statusMessage: customMessage || 'Aprovado pelo administrador. Pagamento em processamento.',
      updatedAt: new Date().toISOString()
    };

    withdrawals[idx] = updated;
    setLocal('earnworld_withdrawals_db', withdrawals);

    return { withdrawal: updated, newFund };
  },

  async markWithdrawalAsPaid(withdrawalId: string, txRef: string): Promise<{ withdrawal: WithdrawalRequest; newFund: number }> {
    const withdrawals = getLocal<WithdrawalRequest[]>('earnworld_withdrawals_db', []);
    const idx = withdrawals.findIndex(w => w.id === withdrawalId);
    if (idx < 0) {
      throw new Error('Pedido de levantamento não encontrado.');
    }

    const wth = withdrawals[idx];

    // Impedir pagamentos repetidos
    if (wth.status === 'paid') {
      throw new Error('Este pedido já foi pago anteriormente. Pagamentos repetidos são estritamente bloqueados.');
    }
    if (wth.status === 'rejected') {
      throw new Error('Este pedido foi rejeitado e não pode ser marcado como pago.');
    }

    const config = await this.getAppConfig();
    const currentFund = typeof config.paymentFundUsd === 'number' ? config.paymentFundUsd : (config.availableRealRevenueUsd ?? 0);

    let newFund = currentFund;
    // If not approved prior to marking as paid, verify fund and deduct now
    if (wth.status === 'pending') {
      if (currentFund < wth.amountUsd) {
        throw new Error(
          `Fundo insuficiente para pagar este levantamento! Fundo disponível: US$ ${currentFund.toFixed(2)}, valor necessário: US$ ${wth.amountUsd.toFixed(2)}.`
        );
      }
      newFund = Math.max(0, Number((currentFund - wth.amountUsd).toFixed(2)));
      await this.updateAppConfig({
        paymentFundUsd: newFund,
        availableRealRevenueUsd: newFund
      });
    }

    const updated: WithdrawalRequest = {
      ...wth,
      status: 'paid',
      statusMessage: `Pago com sucesso via ${wth.paymentMethod.toUpperCase()}. Ref: ${txRef}`,
      txReference: txRef,
      updatedAt: new Date().toISOString()
    };

    withdrawals[idx] = updated;
    setLocal('earnworld_withdrawals_db', withdrawals);

    return { withdrawal: updated, newFund };
  },

  async rejectWithdrawal(withdrawalId: string, reason = 'Dados incorretos'): Promise<{ withdrawal: WithdrawalRequest; restoredFund?: number }> {
    const withdrawals = getLocal<WithdrawalRequest[]>('earnworld_withdrawals_db', []);
    const idx = withdrawals.findIndex(w => w.id === withdrawalId);
    if (idx < 0) {
      throw new Error('Pedido de levantamento não encontrado.');
    }

    const wth = withdrawals[idx];
    if (wth.status === 'paid') {
      throw new Error('Pedidos que já foram pagos e liquidados não podem ser rejeitados.');
    }
    if (wth.status === 'rejected') {
      throw new Error('Este pedido já foi rejeitado anteriormente.');
    }

    const wasApproved = wth.status === 'approved';

    // Refund points to user
    await this.refundWithdrawalPoints(wth.userId, wth.pointsDeducted);
    await this.addTransaction({
      userId: wth.userId,
      type: 'refund',
      points: wth.pointsDeducted,
      amountUsd: wth.amountUsd,
      description: `Reembolso de Levantamento: ${reason}`,
      status: 'completed',
      createdAt: new Date().toISOString()
    });

    let restoredFund: number | undefined;
    if (wasApproved) {
      // Restore fund since it was deducted when approved
      const config = await this.getAppConfig();
      const currentFund = typeof config.paymentFundUsd === 'number' ? config.paymentFundUsd : (config.availableRealRevenueUsd ?? 0);
      restoredFund = Number((currentFund + wth.amountUsd).toFixed(2));
      await this.updateAppConfig({
        paymentFundUsd: restoredFund,
        availableRealRevenueUsd: restoredFund
      });
    }

    const updated: WithdrawalRequest = {
      ...wth,
      status: 'rejected',
      statusMessage: `Rejeitado: ${reason}. Pontos devolvidos ao saldo.`,
      updatedAt: new Date().toISOString()
    };

    withdrawals[idx] = updated;
    setLocal('earnworld_withdrawals_db', withdrawals);

    return { withdrawal: updated, restoredFund };
  },

  async updateWithdrawal(withdrawal: WithdrawalRequest): Promise<void> {
    const list = getLocal<WithdrawalRequest[]>('earnworld_withdrawals_db', []);
    const idx = list.findIndex(w => w.id === withdrawal.id);
    if (idx >= 0) {
      list[idx] = withdrawal;
      setLocal('earnworld_withdrawals_db', list);
    }
  },

  async getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    const list = getLocal<WithdrawalRequest[]>('earnworld_withdrawals_db', []);
    return list.filter(w => w.userId === userId);
  },

  async getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    const list = getLocal<WithdrawalRequest[]>('earnworld_withdrawals_db', []);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const usersMap = getLocal<Record<string, UserProfile>>('earnworld_users_db', {});
    return Object.values(usersMap);
  },

  // Transactions
  async addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newTx: Transaction = {
      ...tx,
      id
    };

    const list = getLocal<Transaction[]>('earnworld_transactions_db', []);
    list.unshift(newTx);
    setLocal('earnworld_transactions_db', list);

    return newTx;
  },

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    const list = getLocal<Transaction[]>('earnworld_transactions_db', []);
    return list.filter(t => t.userId === userId);
  },

  async getUserReferrals(referralCode: string): Promise<UserProfile[]> {
    const users = await this.getAllUsers();
    return users.filter(u => u.referredBy === referralCode);
  }
};


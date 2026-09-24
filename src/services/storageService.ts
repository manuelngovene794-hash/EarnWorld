import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc,
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { AppConfig, TaskItem, WithdrawalRequest, Transaction, UserProfile } from '../types';
import { DEFAULT_CONFIG, INITIAL_TASKS } from '../data/initialData';

const CONFIG_DOC = 'global';

export const storageService = {
  // Global configuration
  async getAppConfig(): Promise<AppConfig> {
    try {
      const configRef = doc(db, 'app_config', CONFIG_DOC);
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        return { ...DEFAULT_CONFIG, ...snap.data() } as AppConfig;
      } else {
        await setDoc(configRef, DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
      }
    } catch (e) {
      console.warn('Storage fallback for config:', e);
      return DEFAULT_CONFIG;
    }
  },

  async updateAppConfig(updates: Partial<AppConfig>): Promise<void> {
    try {
      const configRef = doc(db, 'app_config', CONFIG_DOC);
      await setDoc(configRef, updates, { merge: true });
    } catch (e) {
      console.error('Failed to update app config:', e);
      throw e;
    }
  },

  subscribeAppConfig(callback: (config: AppConfig) => void) {
    try {
      const configRef = doc(db, 'app_config', CONFIG_DOC);
      return onSnapshot(configRef, (snap) => {
        if (snap.exists()) {
          callback({ ...DEFAULT_CONFIG, ...snap.data() } as AppConfig);
        } else {
          callback(DEFAULT_CONFIG);
        }
      }, (error) => {
        console.warn('Config snapshot error:', error);
        callback(DEFAULT_CONFIG);
      });
    } catch (e) {
      callback(DEFAULT_CONFIG);
      return () => {};
    }
  },

  // User Profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (e) {
      console.warn('Error fetching user profile:', e);
      return null;
    }
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      // Remove any undefined keys to avoid Firestore serialization errors
      const cleanData: Record<string, any> = {};
      for (const [key, value] of Object.entries(profile)) {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      }
      const userRef = doc(db, 'users', profile.id);
      await setDoc(userRef, cleanData, { merge: true });
    } catch (e) {
      console.error('Failed to save user profile:', e);
      throw e;
    }
  },

  async updateUserBalance(userId: string, pointsDelta: number, newTotalEarnedDelta = 0): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        const newBalance = Math.max(0, (data.pointsBalance || 0) + pointsDelta);
        const newEarned = (data.totalEarnedPoints || 0) + (newTotalEarnedDelta > 0 ? newTotalEarnedDelta : (pointsDelta > 0 ? pointsDelta : 0));
        await updateDoc(userRef, {
          pointsBalance: newBalance,
          totalEarnedPoints: newEarned
        });
      }
    } catch (e) {
      console.error('Failed to update balance in firestore:', e);
    }
  },

  // Record daily checkin atomically and prevent duplicates on same date
  async recordDailyCheckIn(userId: string, bonusPoints: number): Promise<{ success: boolean; newStreak: number; newBalance: number }> {
    const todayStr = new Date().toISOString().split('T')[0];
    const userRef = doc(db, 'users', userId);
    const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const txRef = doc(db, 'transactions', txId);

    let newStreak = 1;
    let newBalance = bonusPoints;

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userRef);
        if (!snap.exists()) {
          throw new Error('Utilizador não encontrado.');
        }
        const data = snap.data() as UserProfile;
        if (data.lastCheckInDate === todayStr) {
          throw new Error('Check-in diário já realizado hoje.');
        }

        // Calculate consecutive streak
        const prevCheckIn = data.lastCheckInDate ? new Date(data.lastCheckInDate) : null;
        const today = new Date(todayStr);
        if (prevCheckIn) {
          const diffDays = Math.floor((today.getTime() - prevCheckIn.getTime()) / (1000 * 60 * 60 * 24));
          newStreak = diffDays === 1 ? (data.consecutiveCheckIns || 0) + 1 : 1;
        } else {
          newStreak = 1;
        }

        newBalance = (data.pointsBalance || 0) + bonusPoints;
        const newEarned = (data.totalEarnedPoints || 0) + bonusPoints;

        transaction.update(userRef, {
          pointsBalance: newBalance,
          totalEarnedPoints: newEarned,
          lastCheckInDate: todayStr,
          consecutiveCheckIns: newStreak
        });

        const txRecord: Transaction = {
          id: txId,
          userId,
          type: 'checkin',
          points: bonusPoints,
          amountUsd: bonusPoints / 1000,
          description: `Check-in Diário (Dia ${newStreak})`,
          status: 'completed',
          createdAt: new Date().toISOString()
        };
        transaction.set(txRef, txRecord);
      });

      return { success: true, newStreak, newBalance };
    } catch (e: any) {
      if (e.message?.includes('Check-in diário já realizado hoje')) {
        throw e;
      }
      console.warn('Fallback daily checkin locally:', e);
      return { success: true, newStreak: 1, newBalance: bonusPoints };
    }
  },

  // Tasks
  async getTasks(): Promise<TaskItem[]> {
    try {
      const tasksCol = collection(db, 'tasks');
      const snap = await getDocs(tasksCol);
      if (snap.empty) {
        // Seed initial tasks
        for (const t of INITIAL_TASKS) {
          await setDoc(doc(db, 'tasks', t.id), t);
        }
        return INITIAL_TASKS;
      }
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskItem));
    } catch (e) {
      console.warn('Tasks fallback to initial:', e);
      return INITIAL_TASKS;
    }
  },

  // Transactions
  async addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const newTx: Transaction = {
      ...tx,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    };
    try {
      await setDoc(doc(db, 'transactions', newTx.id), newTx);
    } catch (e) {
      console.warn('Error saving transaction to firestore:', e);
    }
    return newTx;
  },

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as Transaction);
    } catch (e) {
      console.warn('Transactions query fallback:', e);
      return [];
    }
  },

  // Withdrawals
  async createWithdrawal(req: Omit<WithdrawalRequest, 'id'>): Promise<WithdrawalRequest> {
    const minPoints = 5000;
    if (req.pointsDeducted < minPoints) {
      throw new Error(`O levantamento mínimo é de ${minPoints.toLocaleString()} pontos (US$ 5,00).`);
    }

    const id = 'wth_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const withdrawal: WithdrawalRequest = {
      ...req,
      id
    };

    try {
      const userRef = doc(db, 'users', req.userId);
      const wthRef = doc(db, 'withdrawals', id);
      const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const txRef = doc(db, 'transactions', txId);

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error('Utilizador não encontrado no sistema.');
        }
        const userData = userSnap.data() as UserProfile;
        const currentBalance = userData.pointsBalance || 0;

        if (currentBalance < req.pointsDeducted) {
          throw new Error('Saldo insuficiente para levantamento.');
        }

        const newBalance = Math.max(0, currentBalance - req.pointsDeducted);
        const newWithdrawn = (userData.totalWithdrawnPoints || 0) + req.pointsDeducted;

        transaction.update(userRef, {
          pointsBalance: newBalance,
          totalWithdrawnPoints: newWithdrawn
        });

        transaction.set(wthRef, withdrawal);

        const txRecord: Transaction = {
          id: txId,
          userId: req.userId,
          type: 'withdrawal',
          points: -req.pointsDeducted,
          amountUsd: -(req.amountUsd),
          description: `Levantamento via ${req.paymentMethod.toUpperCase()} (US$ ${req.amountUsd.toFixed(2)})`,
          status: 'completed',
          createdAt: new Date().toISOString()
        };
        transaction.set(txRef, txRecord);
      });
    } catch (e: any) {
      console.error('Error creating withdrawal in transaction:', e);
      if (e.message?.includes('Saldo insuficiente para levantamento.')) {
        throw new Error('Saldo insuficiente para levantamento.');
      }
      if (e.message?.includes('O levantamento mínimo')) {
        throw e;
      }
      
      // Fallback for offline/preview simulated user cache
      const cached = localStorage.getItem('earnworld_user_cache');
      if (cached) {
        try {
          const user = JSON.parse(cached);
          if ((user.pointsBalance || 0) < req.pointsDeducted) {
            throw new Error('Saldo insuficiente para levantamento.');
          }
          user.pointsBalance = Math.max(0, (user.pointsBalance || 0) - req.pointsDeducted);
          user.totalWithdrawnPoints = (user.totalWithdrawnPoints || 0) + req.pointsDeducted;
          localStorage.setItem('earnworld_user_cache', JSON.stringify(user));
        } catch (err: any) {
          if (err.message === 'Saldo insuficiente para levantamento.') throw err;
        }
      }
      try {
        await setDoc(doc(db, 'withdrawals', id), withdrawal);
      } catch (err) {
        // ignore
      }
    }
    return withdrawal;
  },

  async updateWithdrawal(withdrawal: WithdrawalRequest): Promise<void> {
    try {
      const wthRef = doc(db, 'withdrawals', withdrawal.id);
      await setDoc(wthRef, withdrawal, { merge: true });
    } catch (e) {
      console.error('Failed to update withdrawal in firestore:', e);
    }
  },

  async getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    try {
      const q = query(
        collection(db, 'withdrawals'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as WithdrawalRequest);
    } catch (e) {
      console.warn('Withdrawals query fallback:', e);
      return [];
    }
  },

  async getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    try {
      const col = collection(db, 'withdrawals');
      const snap = await getDocs(col);
      const list = snap.docs.map(d => d.data() as WithdrawalRequest);
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.warn('Failed to fetch all withdrawals:', e);
      return [];
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const col = collection(db, 'users');
      const snap = await getDocs(col);
      return snap.docs.map(d => d.data() as UserProfile);
    } catch (e) {
      console.warn('Failed to fetch all users:', e);
      return [];
    }
  },

  // Save or update a task (admin)
  async saveTask(task: TaskItem): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      await setDoc(taskRef, task, { merge: true });
    } catch (e) {
      console.error('Failed to save task to firestore:', e);
    }
  },

  // Delete a task (admin)
  async deleteTask(taskId: string): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { isActive: false });
    } catch (e) {
      console.error('Failed to deactivate task:', e);
    }
  },

  // Get user's referred friends list
  async getUserReferrals(referralCode: string): Promise<UserProfile[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('referredBy', '==', referralCode)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as UserProfile);
    } catch (e) {
      console.warn('Failed to fetch referrals:', e);
      return [];
    }
  }
};

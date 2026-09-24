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
  onSnapshot 
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
      const userRef = doc(db, 'users', profile.id);
      await setDoc(userRef, profile, { merge: true });
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
    const id = 'wth_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const withdrawal: WithdrawalRequest = {
      ...req,
      id
    };
    try {
      await setDoc(doc(db, 'withdrawals', id), withdrawal);
    } catch (e) {
      console.error('Error recording withdrawal:', e);
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

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  country: string;
  referralCode: string;
  referredBy?: string;
  pointsBalance: number;
  totalEarnedPoints: number;
  totalWithdrawnPoints: number;
  role: UserRole;
  lastCheckInDate?: string;
  consecutiveCheckIns: number;
  isBanned?: boolean;
  fraudScore?: number;
  createdAt: string;
}

export interface AppConfig {
  usdToMznRate: number;
  availableRealRevenueUsd: number; // Real available liquid balance to pay withdrawals
  estimatedAdRevenueUsd: number;   // Estimated pending network ad earnings (NOT available for withdrawal)
  minWithdrawalPoints: number;     // 5000 points = $5.00
  pointsPerDollar: number;         // 1000 points = $1.00
  dailyCheckInPoints: number;
  adRewardPoints: number;
  referralBonusPoints: number;
  maxAdsPerHour: number;
  // Monetization fields (Monetag / Google AdMob)
  adNetworkProvider?: 'monetag' | 'admob' | 'direct';
  monetagZoneId?: string;
  admobPublisherId?: string;
  admobSlotId?: string;
  monetagApiKey?: string;
  monetagLastSync?: string;
  monetagLiveBalanceUsd?: number;
  monetagSyncStatus?: 'connected' | 'idle' | 'error';
}

export type TaskCategory = 'survey' | 'offer' | 'video' | 'daily' | 'special';

export interface TaskItem {
  id: string;
  title: string;
  titlePt: string;
  description: string;
  descriptionPt: string;
  category: TaskCategory;
  rewardPoints: number;
  estimatedMinutes: number;
  partner: string;
  actionUrl?: string;
  requiresApproval?: boolean;
  isActive: boolean;
  badge?: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export type PaymentMethodId = 'mpesa' | 'emola' | 'paypal' | 'payoneer' | 'usdt' | 'bank';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  country: string;
  pointsDeducted: number;
  amountUsd: number;
  amountMzn: number;
  paymentMethod: PaymentMethodId;
  accountDetails: string;
  accountName?: string;
  status: WithdrawalStatus;
  statusMessage?: string;
  txReference?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'checkin' | 'ad_reward' | 'survey' | 'offer' | 'referral' | 'withdrawal' | 'refund' | 'bonus';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  points: number;
  amountUsd: number;
  description: string;
  status: 'completed' | 'pending' | 'rejected';
  createdAt: string;
}

export interface CountryInfo {
  code: string;
  namePt: string;
  nameEn: string;
  flag: string;
  dialCode: string;
  currency: string;
  currencySymbol: string;
  isPopular?: boolean;
}

export interface PaymentMethodConfig {
  id: PaymentMethodId;
  name: string;
  descriptionPt: string;
  descriptionEn: string;
  minUsd: number;
  supportedCountries: string[]; // ['MZ'] or ['*'] for all
  currencyTarget: 'MZN' | 'USD' | 'USDT';
  fields: {
    id: string;
    labelPt: string;
    labelEn: string;
    placeholder: string;
    type: 'text' | 'tel' | 'email';
    pattern?: string;
    helpTextPt?: string;
    helpTextEn?: string;
  }[];
}

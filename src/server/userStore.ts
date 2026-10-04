import fs from 'fs';
import path from 'path';

export interface UserBackupRecord {
  profile: any;
  completedTasks?: any[];
  transactions?: any[];
  updatedAt: string;
}

// In-memory cache with fallback to disk persistence when writeable
const inMemoryUsers = new Map<string, UserBackupRecord>();

const STORAGE_FILE = path.resolve(process.cwd(), '.earnworld_data_users.json');

// Load initial records from disk if available
try {
  if (fs.existsSync(STORAGE_FILE)) {
    const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    for (const [key, val] of Object.entries(data)) {
      inMemoryUsers.set(key, val as UserBackupRecord);
    }
  }
} catch (e) {
  // Read failure tolerated (e.g. read-only serverless environment)
}

function persistToDisk() {
  try {
    const obj: Record<string, UserBackupRecord> = {};
    for (const [key, val] of inMemoryUsers.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    // Non-fatal if filesystem is read-only (e.g. AWS Lambda / Vercel read-only root)
  }
}

export function saveUserBackup(profile: any, completedTasks?: any[], transactions?: any[]): void {
  if (!profile || !profile.id) return;

  const record: UserBackupRecord = {
    profile,
    completedTasks: completedTasks || [],
    transactions: transactions || [],
    updatedAt: new Date().toISOString()
  };

  // Index by UID
  inMemoryUsers.set(profile.id, record);

  // Index by Email
  if (profile.email) {
    inMemoryUsers.set(`email_${profile.email.toLowerCase().trim()}`, record);
  }

  // Index by Phone
  if (profile.phoneNumber) {
    const digits = profile.phoneNumber.replace(/\D/g, '');
    if (digits) {
      inMemoryUsers.set(`phone_${digits}`, record);
    }
  }

  persistToDisk();
}

export function findUserBackup(query: { uid?: string; email?: string; phone?: string }): UserBackupRecord | null {
  if (query.uid && inMemoryUsers.has(query.uid)) {
    return inMemoryUsers.get(query.uid) || null;
  }

  if (query.email) {
    const emailKey = `email_${query.email.toLowerCase().trim()}`;
    if (inMemoryUsers.has(emailKey)) {
      return inMemoryUsers.get(emailKey) || null;
    }
  }

  if (query.phone) {
    const digits = query.phone.replace(/\D/g, '');
    if (digits) {
      const phoneKey = `phone_${digits}`;
      if (inMemoryUsers.has(phoneKey)) {
        return inMemoryUsers.get(phoneKey) || null;
      }

      // Fuzzy check by phone suffix (8 or more digits)
      for (const [k, rec] of inMemoryUsers.entries()) {
        if (k.startsWith('phone_')) {
          const storedDigits = k.slice(6);
          if (storedDigits === digits ||
              (digits.length >= 8 && storedDigits.endsWith(digits)) ||
              (storedDigits.length >= 8 && digits.endsWith(storedDigits))) {
            return rec;
          }
        }
      }
    }
  }

  return null;
}

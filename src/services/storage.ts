import {
  Entity,
  Medicine,
  SaleInvoice,
  FinancialTransaction,
  Expense,
  AppSettings,
  UserRole,
} from '../types';
import {
  defaultLicense,
  defaultSettings,
  initialEntities,
  initialMedicines,
  initialTransactions,
  initialSales,
  initialExpenses,
} from './seedData';
import { CryptoService } from './cryptoService';

// Re-export seed data for components that import them
export {
  defaultLicense,
  defaultSettings,
  initialEntities,
  initialMedicines,
  initialTransactions,
  initialSales,
  initialExpenses,
};

const STORAGE_KEYS = {
  ENTITIES: 'pharma_entities_v1',
  MEDICINES: 'pharma_medicines_v1',
  SALES: 'pharma_sales_v1',
  TRANSACTIONS: 'pharma_transactions_v1',
  EXPENSES: 'pharma_expenses_v1',
  SETTINGS: 'pharma_settings_v1',
  CURRENT_ROLE: 'pharma_current_role_v1',
  SESSION_USER: 'pharma_session_user_v1',
  SESSION_TIMESTAMP: 'pharma_session_ts_v1',
};

// Memory cache for synchronous UI performance
const inMemoryStorage: Record<string, string> = {};

// Simple synchronous obfuscator/deobfuscator for instant local storage read
// coupled with async WebCrypto AES-GCM encryption in background
function encodeStorageValue(plain: string): string {
  try {
    return 'ENC_v1:B64:' + btoa(unescape(encodeURIComponent(plain)));
  } catch {
    return plain;
  }
}

function decodeStorageValue(stored: string): string {
  if (!stored) return '';
  if (stored.startsWith('ENC_v1:B64:')) {
    try {
      return decodeURIComponent(escape(atob(stored.substring(11))));
    } catch {
      return stored;
    }
  }
  if (stored.startsWith('ENC_v1:')) {
    // Encrypted with WebCrypto AES-GCM - will be decrypted or loaded from inMemoryStorage
    return inMemoryStorage[stored] || '';
  }
  return stored; // Plaintext (legacy migration)
}

function safeGetItem(key: string): string | null {
  if (inMemoryStorage[key] !== undefined) {
    return inMemoryStorage[key];
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const decoded = decodeStorageValue(raw);
      if (decoded) {
        inMemoryStorage[key] = decoded;
        return decoded;
      }
      return raw;
    }
  } catch (e) {
    console.warn('localStorage getItem failed (private mode/restricted):', e);
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  inMemoryStorage[key] = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Encrypt before saving to localStorage
      const encoded = encodeStorageValue(value);
      window.localStorage.setItem(key, encoded);

      // Async upgrade to WebCrypto AES-GCM encryption
      CryptoService.encryptData(value).then(strongEncrypted => {
        try {
          if (strongEncrypted && window.localStorage) {
            inMemoryStorage[strongEncrypted] = value;
            window.localStorage.setItem(key, strongEncrypted);
          }
        } catch {}
      }).catch(() => {});
    }
  } catch (e) {
    console.warn('localStorage setItem failed (storage quota/restricted):', e);
  }
}

function getInstanceKey(baseKey: string, specificInstanceId?: string): string {
  const instanceId = specificInstanceId || safeGetItem('pharma_active_instance_id_v1') || 'default';
  if (instanceId === 'default') {
    return baseKey;
  }
  return `${baseKey}_inst_${instanceId}`;
}

export class AppStorage {
  /**
   * إدارة أدوار المستخدمين والجلسات
   */
  static getCurrentRole(): UserRole {
    const saved = safeGetItem(STORAGE_KEYS.CURRENT_ROLE);
    if (saved === 'pharmacist' || saved === 'admin' || saved === 'super_admin' || saved === 'accountant') {
      return saved as UserRole;
    }
    return 'pharmacist'; // Default least-privilege role
  }

  static setCurrentRole(role: UserRole): void {
    safeSetItem(STORAGE_KEYS.CURRENT_ROLE, role);
    this.updateLastActivity();
  }

  static getSessionUser(): string | null {
    return safeGetItem(STORAGE_KEYS.SESSION_USER);
  }

  static setSessionUser(username: string): void {
    safeSetItem(STORAGE_KEYS.SESSION_USER, username);
    this.updateLastActivity();
  }

  static updateLastActivity(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, Date.now().toString());
      }
    } catch {}
  }

  static isSessionExpired(timeoutMinutes: number = 20): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const lastTs = window.localStorage.getItem(STORAGE_KEYS.SESSION_TIMESTAMP);
        if (!lastTs) return false;
        const diffMinutes = (Date.now() - parseInt(lastTs, 10)) / (1000 * 60);
        return diffMinutes > timeoutMinutes;
      }
    } catch {}
    return false;
  }

  static invalidateSession(): void {
    safeSetItem(STORAGE_KEYS.CURRENT_ROLE, 'pharmacist');
    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage) {
          window.localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
          window.localStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
        }
        if (window.sessionStorage) {
          window.sessionStorage.clear();
        }
      }
    } catch {}
  }

  static getActiveInstanceId(): string {
    return safeGetItem('pharma_active_instance_id_v1') || 'default';
  }

  static setActiveInstanceId(id: string): void {
    safeSetItem('pharma_active_instance_id_v1', id);
  }

  /**
   * الكيانات والحسابات (مشفرة في التخزين)
   */
  static getEntities(instanceId?: string): Entity[] {
    const key = getInstanceKey(STORAGE_KEYS.ENTITIES, instanceId);
    const data = safeGetItem(key);
    const active = instanceId || this.getActiveInstanceId();
    if (!data) {
      if (active === 'default') {
        this.saveEntities(initialEntities, 'default');
        return initialEntities;
      }
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (active === 'default' ? initialEntities : []);
    } catch {
      return active === 'default' ? initialEntities : [];
    }
  }

  static saveEntities(entities: Entity[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.ENTITIES, instanceId);
    safeSetItem(key, JSON.stringify(entities));
  }

  /**
   * الأدوية والمخزون (مشفرة في التخزين)
   */
  static getMedicines(instanceId?: string): Medicine[] {
    const key = getInstanceKey(STORAGE_KEYS.MEDICINES, instanceId);
    const data = safeGetItem(key);
    const active = instanceId || this.getActiveInstanceId();
    if (!data) {
      if (active === 'default') {
        this.saveMedicines(initialMedicines, 'default');
        return initialMedicines;
      }
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (active === 'default' ? initialMedicines : []);
    } catch {
      return active === 'default' ? initialMedicines : [];
    }
  }

  static saveMedicines(medicines: Medicine[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.MEDICINES, instanceId);
    safeSetItem(key, JSON.stringify(medicines));
  }

  /**
   * فواتير المبيعات (مشفرة في التخزين)
   */
  static getSales(instanceId?: string): SaleInvoice[] {
    const key = getInstanceKey(STORAGE_KEYS.SALES, instanceId);
    const data = safeGetItem(key);
    const active = instanceId || this.getActiveInstanceId();
    if (!data) {
      if (active === 'default') {
        this.saveSales(initialSales, 'default');
        return initialSales;
      }
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (active === 'default' ? initialSales : []);
    } catch {
      return active === 'default' ? initialSales : [];
    }
  }

  static saveSales(sales: SaleInvoice[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.SALES, instanceId);
    safeSetItem(key, JSON.stringify(sales));
  }

  /**
   * الحركات المالية وكشوف الحسابات (مشفرة في التخزين)
   */
  static getTransactions(instanceId?: string): FinancialTransaction[] {
    const key = getInstanceKey(STORAGE_KEYS.TRANSACTIONS, instanceId);
    const data = safeGetItem(key);
    const active = instanceId || this.getActiveInstanceId();
    if (!data) {
      if (active === 'default') {
        this.saveTransactions(initialTransactions, 'default');
        return initialTransactions;
      }
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (active === 'default' ? initialTransactions : []);
    } catch {
      return active === 'default' ? initialTransactions : [];
    }
  }

  static saveTransactions(transactions: FinancialTransaction[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.TRANSACTIONS, instanceId);
    safeSetItem(key, JSON.stringify(transactions));
  }

  /**
   * المصاريف وسندات الصرف (مشفرة في التخزين)
   */
  static getExpenses(instanceId?: string): Expense[] {
    const key = getInstanceKey(STORAGE_KEYS.EXPENSES, instanceId);
    const data = safeGetItem(key);
    const active = instanceId || this.getActiveInstanceId();
    if (!data) {
      if (active === 'default') {
        this.saveExpenses(initialExpenses, 'default');
        return initialExpenses;
      }
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (active === 'default' ? initialExpenses : []);
    } catch {
      return active === 'default' ? initialExpenses : [];
    }
  }

  static saveExpenses(expenses: Expense[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.EXPENSES, instanceId);
    safeSetItem(key, JSON.stringify(expenses));
  }

  /**
   * إعدادات الصيدلية والحماية
   */
  static getSettings(instanceId?: string): AppSettings {
    const key = getInstanceKey(STORAGE_KEYS.SETTINGS, instanceId);
    const data = safeGetItem(key);
    if (!data) {
      this.saveSettings(defaultSettings, instanceId);
      return defaultSettings;
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return {
          ...defaultSettings,
          ...parsed,
          license: { ...defaultLicense, ...(parsed.license || {}) },
        };
      }
      return defaultSettings;
    } catch {
      return defaultSettings;
    }
  }

  static saveSettings(settings: AppSettings, instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.SETTINGS, instanceId);
    safeSetItem(key, JSON.stringify(settings));
  }

  static initInstanceData(
    instanceId: string,
    customSettings: AppSettings,
    seedMedicines: boolean = false
  ): void {
    this.saveSettings(customSettings, instanceId);
    this.saveEntities([], instanceId);
    this.saveSales([], instanceId);
    this.saveTransactions([], instanceId);
    this.saveExpenses([], instanceId);
    if (seedMedicines) {
      this.saveMedicines(initialMedicines, instanceId);
    } else {
      this.saveMedicines([], instanceId);
    }
  }

  static getInstanceStats(instanceId: string): {
    medicinesCount: number;
    salesCount: number;
    entitiesCount: number;
    transactionsCount: number;
  } {
    const med = this.getMedicines(instanceId);
    const sal = this.getSales(instanceId);
    const ent = this.getEntities(instanceId);
    const trx = this.getTransactions(instanceId);
    return {
      medicinesCount: med.length,
      salesCount: sal.length,
      entitiesCount: ent.length,
      transactionsCount: trx.length,
    };
  }

  // Backup & Restore
  static exportFullBackup(instanceId?: string): string {
    const active = instanceId || this.getActiveInstanceId();
    const backup = {
      instanceId: active,
      entities: this.getEntities(active),
      medicines: this.getMedicines(active),
      sales: this.getSales(active),
      transactions: this.getTransactions(active),
      expenses: this.getExpenses(active),
      settings: this.getSettings(active),
      exportedAt: new Date().toISOString(),
      version: '3.0-secure',
    };
    return JSON.stringify(backup, null, 2);
  }

  static async exportEncryptedBackup(password?: string, instanceId?: string): Promise<string> {
    const raw = this.exportFullBackup(instanceId);
    return await CryptoService.exportEncryptedBackup(raw, password);
  }

  static importFullBackup(jsonString: string, targetInstanceId?: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      const target = targetInstanceId || this.getActiveInstanceId();
      if (data.entities) this.saveEntities(data.entities, target);
      if (data.medicines) this.saveMedicines(data.medicines, target);
      if (data.sales) this.saveSales(data.sales, target);
      if (data.transactions) this.saveTransactions(data.transactions, target);
      if (data.expenses) this.saveExpenses(data.expenses, target);
      if (data.settings) this.saveSettings(data.settings, target);
      return true;
    } catch (e) {
      console.error('Backup restore error:', e);
      return false;
    }
  }

  static async importEncryptedBackup(content: string, password?: string, targetInstanceId?: string): Promise<boolean> {
    try {
      const decrypted = await CryptoService.importEncryptedBackup(content, password);
      if (!decrypted) return false;
      return this.importFullBackup(decrypted, targetInstanceId);
    } catch (err) {
      console.error('Import encrypted backup failed:', err);
      throw err;
    }
  }

  static resetToDefault(instanceId?: string): void {
    const target = instanceId || this.getActiveInstanceId();
    if (target === 'default') {
      this.saveEntities(initialEntities, 'default');
      this.saveMedicines(initialMedicines, 'default');
      this.saveSales(initialSales, 'default');
      this.saveTransactions(initialTransactions, 'default');
      this.saveExpenses(initialExpenses, 'default');
      this.saveSettings(defaultSettings, 'default');
    } else {
      this.saveEntities([], target);
      this.saveMedicines([], target);
      this.saveSales([], target);
      this.saveTransactions([], target);
      this.saveExpenses([], target);
    }
  }
}

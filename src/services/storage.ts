import {
  Entity,
  Medicine,
  SaleInvoice,
  FinancialTransaction,
  Expense,
  AppSettings,
  UserRole,
  PurchaseInvoice,
  StockMovement,
  Shift,
  AuditEntry,
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
import { idbGetAll, idbQueueSet, idbFlush, idbHealthy, idbSupported, requestPersistentStorage, storageEstimate } from './idbStore';
import { normalizeMedicines } from './inventoryService';

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
  PURCHASES: 'pharma_purchases_v1',
  MOVEMENTS: 'pharma_movements_v1',
  SHIFTS: 'pharma_shifts_v1',
  AUDIT: 'pharma_audit_v1',
  SCHEMA: 'pharma_schema_v1',
  LAST_BACKUP: 'pharma_last_backup_v1',
};

/** إصدار بنية البيانات. ارفعه عند أي تغيير في شكل البيانات وأضف خطوة ترحيل في migrateData */
export const CURRENT_SCHEMA_VERSION = 2;

/** مفاتيح بيانات الصيدلية: تُحفظ في IndexedDB. بقية المفاتيح الصغيرة تبقى في localStorage. */
const DATA_KEY_RE = /^pharma_(entities|medicines|sales|transactions|expenses|settings|purchases|movements|shifts|audit|schema)_v\d+(_inst_.+)?$/;
let usingIdb = false;

// Memory cache for synchronous UI performance
const inMemoryStorage: Record<string, string> = {};

/**
 * ملاحظة أمنية: بيانات الصيدلية تُحفظ في localStorage كنص JSON عادي.
 * التشفير داخل المتصفح بمفتاح موجود في الكود لا يحمي شيئاً، لذلك أُزيل (وكان سبب فقدان البيانات).
 * الحماية الحقيقية: قفل الجهاز، النسخ الاحتياطي المشفّر بكلمة مرور، والمزامنة مع Supabase المحمي بـ RLS.
 */
const LEGACY_B64_PREFIX = 'ENC_v1:B64:';
const LEGACY_PREFIX = 'ENC_v1:';

function decodeStorageValue(stored: string): string {
  if (!stored) return '';
  if (stored.startsWith(LEGACY_B64_PREFIX)) {
    try {
      return decodeURIComponent(escape(atob(stored.substring(LEGACY_B64_PREFIX.length))));
    } catch {
      return '';
    }
  }
  if (stored.startsWith(LEGACY_PREFIX)) {
    // صيغة AES القديمة: تُحوَّل مرة واحدة عند بدء التشغيل عبر migrateLegacyStorage()
    return '';
  }
  return stored;
}

function reportStorageError(e: unknown): void {
  console.warn('localStorage write failed:', e);
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pharma:storage-error'));
    }
  } catch {}
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
      return null; // قيمة غير قابلة للقراءة: لا نُرجع نصاً مشفّراً كأنه بيانات
    }
  } catch (e) {
    console.warn('localStorage getItem failed (private mode/restricted):', e);
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  inMemoryStorage[key] = value;
  if (usingIdb && DATA_KEY_RE.test(key)) {
    idbQueueSet(key, value);
    return;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    reportStorageError(e);
  }
}

/**
 * ترحيل البيانات المحفوظة بالصيغ القديمة (Base64 و AES) إلى الصيغة الحالية.
 * يُستدعى مرة واحدة قبل تشغيل الواجهة. يحافظ على بيانات المستخدمين الحاليين.
 */
/**
 * تهيئة التخزين عند التشغيل:
 * 1) ترحيل الصيغ القديمة (Base64/AES) 2) فتح IndexedDB وتحميل البيانات للذاكرة
 * 3) نقل بيانات localStorage القديمة إلى IndexedDB (مع التحقق قبل الحذف)
 * 4) ترحيل بنية البيانات (التشغيلات...)
 */
export async function initStorage(): Promise<{ engine: 'indexeddb' | 'localstorage'; migrated: number }> {
  const legacy = await migrateLegacyStorage();
  let moved = 0;
  if (typeof window !== 'undefined' && idbSupported()) {
    const all = await idbGetAll();
    if (all) {
      usingIdb = true;
      for (const [k, v] of Object.entries(all)) inMemoryStorage[k] = v;

      // نقل المفاتيح الموجودة في localStorage ولم تُنقل بعد
      try {
        const lsKeys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && DATA_KEY_RE.test(k)) lsKeys.push(k);
        }
        const toRemove: string[] = [];
        const isEmptyValue = (v: string | undefined) => v === undefined || v === '' || v === '[]' || v === 'null';
        for (const k of lsKeys) {
          const raw = window.localStorage.getItem(k);
          if (raw === null) continue;
          const decoded = decodeStorageValue(raw);
          if (!decoded) continue;
          const inIdb = all[k];
          if (inIdb === decoded) {
            toRemove.push(k); // نفس البيانات في المكانين: نحذف نسخة localStorage بعد التحقق
          } else if (isEmptyValue(inIdb) && !isEmptyValue(decoded)) {
            // IndexedDB فارغ وlocalStorage فيه بيانات حقيقية: ننقلها
            inMemoryStorage[k] = decoded;
            idbQueueSet(k, decoded);
            moved++;
            toRemove.push(k);
          } else if (isEmptyValue(decoded)) {
            toRemove.push(k);
          }
          // خلاف ذلك (بيانات مختلفة في المكانين): نُبقي نسخة localStorage كما هي كنسخة احتياطية ولا نحذفها
        }
        await idbFlush();
        if (idbHealthy()) {
          const verify = (await idbGetAll()) || {};
          for (const k of toRemove) {
            if (verify[k] !== undefined) window.localStorage.removeItem(k);
          }
        }
      } catch (e) {
        console.warn('Move to IndexedDB failed (data stays in localStorage):', e);
      }
      void requestPersistentStorage();
    }
  }
  const migrated = await migrateData();
  return { engine: usingIdb ? 'indexeddb' : 'localstorage', migrated: legacy + moved + migrated };
}

/** ترحيل بنية البيانات بين الإصدارات (يحدث مرة واحدة لكل صيدلية) */
async function migrateData(): Promise<number> {
  let changed = 0;
  const keys = new Set<string>();
  for (const k of Object.keys(inMemoryStorage)) {
    if (/^pharma_(medicines|schema)_v1(_inst_.+)?$/.test(k)) keys.add(k.replace(/^pharma_(medicines|schema)_v1/, ''));
  }
  try {
    if (typeof window !== 'undefined') {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && /^pharma_medicines_v1(_inst_.+)?$/.test(k)) keys.add(k.replace('pharma_medicines_v1', ''));
      }
    }
  } catch {}
  for (const suffix of keys) {
    const schemaKey = `pharma_schema_v1${suffix}`;
    const current = parseInt(safeGetItem(schemaKey) || '1', 10) || 1;
    if (current >= CURRENT_SCHEMA_VERSION) continue;
    const medKey = `pharma_medicines_v1${suffix}`;
    const raw = safeGetItem(medKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          safeSetItem(medKey, JSON.stringify(normalizeMedicines(parsed)));
          changed += parsed.length;
        }
      } catch {}
    }
    safeSetItem(schemaKey, String(CURRENT_SCHEMA_VERSION));
  }
  await idbFlush();
  return changed;
}

/** ينتظر انتهاء كل عمليات الحفظ المعلّقة (استدعِه قبل إعادة تحميل الصفحة) */
export async function flushStorage(): Promise<void> {
  await idbFlush();
}

export async function getStorageInfo(): Promise<{
  engine: 'indexeddb' | 'localstorage';
  usageBytes: number;
  quotaBytes: number;
}> {
  const est = await storageEstimate();
  return { engine: usingIdb ? 'indexeddb' : 'localstorage', usageBytes: est?.usage || 0, quotaBytes: est?.quota || 0 };
}

/** لقطة خام لكل بيانات البرنامج (للنسخة الاحتياطية الطارئة) */
export function exportRawDump(): Record<string, string> {
  const dump: Record<string, string> = {};
  for (const [k, v] of Object.entries(inMemoryStorage)) if (k.startsWith('pharma_')) dump[k] = v;
  try {
    if (typeof window !== 'undefined') {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith('pharma_') && dump[k] === undefined) dump[k] = window.localStorage.getItem(k) || '';
      }
    }
  } catch {}
  return dump;
}

export async function migrateLegacyStorage(): Promise<number> {
  let migrated = 0;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('pharma_')) keys.push(k);
    }
    for (const k of keys) {
      const raw = window.localStorage.getItem(k);
      if (!raw || !raw.startsWith(LEGACY_PREFIX)) continue;
      let plain = '';
      if (raw.startsWith(LEGACY_B64_PREFIX)) {
        plain = decodeStorageValue(raw);
      } else {
        plain = await CryptoService.decryptLegacyData(raw);
      }
      if (plain && !plain.startsWith(LEGACY_PREFIX)) {
        window.localStorage.setItem(k, plain);
        migrated++;
      }
    }
  } catch (e) {
    console.warn('Legacy storage migration failed:', e);
  }
  return migrated;
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
  // الدور يُحفظ في الذاكرة فقط (وليس في localStorage) حتى لا يمكن رفع الصلاحية بتعديل المتصفح.
  // عند إعادة فتح البرنامج يبدأ بأقل صلاحية (صيدلي) ويتطلب الـ PIN للارتقاء.
  private static currentRole: UserRole = 'pharmacist';

  static getCurrentRole(): UserRole {
    return this.currentRole;
  }

  static setCurrentRole(role: UserRole): void {
    this.currentRole = role;
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
    this.currentRole = 'pharmacist';
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
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
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
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? normalizeMedicines(parsed) : [];
    } catch {
      return [];
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
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
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
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
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
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveExpenses(expenses: Expense[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.EXPENSES, instanceId);
    safeSetItem(key, JSON.stringify(expenses));
  }

  /**
   * إعدادات الصيدلية والحماية
   */
  /* ---------- المجموعات الجديدة: مشتريات، حركات مخزون، ورديات، تدقيق ---------- */
  private static readList<T>(base: string, instanceId?: string): T[] {
    const data = safeGetItem(getInstanceKey(base, instanceId));
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  static getPurchases(instanceId?: string): PurchaseInvoice[] {
    return this.readList<PurchaseInvoice>(STORAGE_KEYS.PURCHASES, instanceId);
  }
  static savePurchases(list: PurchaseInvoice[], instanceId?: string): void {
    safeSetItem(getInstanceKey(STORAGE_KEYS.PURCHASES, instanceId), JSON.stringify(list));
  }

  static getMovements(instanceId?: string): StockMovement[] {
    return this.readList<StockMovement>(STORAGE_KEYS.MOVEMENTS, instanceId);
  }
  static saveMovements(list: StockMovement[], instanceId?: string): void {
    // نحتفظ بآخر 30,000 حركة فقط حتى لا يتضخم التخزين
    const capped = list.length > 30000 ? list.slice(list.length - 30000) : list;
    safeSetItem(getInstanceKey(STORAGE_KEYS.MOVEMENTS, instanceId), JSON.stringify(capped));
  }

  static getShifts(instanceId?: string): Shift[] {
    return this.readList<Shift>(STORAGE_KEYS.SHIFTS, instanceId);
  }
  static saveShifts(list: Shift[], instanceId?: string): void {
    safeSetItem(getInstanceKey(STORAGE_KEYS.SHIFTS, instanceId), JSON.stringify(list));
  }

  static getAudit(instanceId?: string): AuditEntry[] {
    return this.readList<AuditEntry>(STORAGE_KEYS.AUDIT, instanceId);
  }
  static saveAudit(list: AuditEntry[], instanceId?: string): void {
    const capped = list.length > 3000 ? list.slice(list.length - 3000) : list;
    safeSetItem(getInstanceKey(STORAGE_KEYS.AUDIT, instanceId), JSON.stringify(capped));
  }

  /** تاريخ آخر نسخة احتياطية (لتذكير المستخدم) */
  static getLastBackupAt(): string | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.LAST_BACKUP) : null;
    } catch {
      return null;
    }
  }
  static markBackupDone(): void {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
    } catch {}
  }

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
      purchases: this.getPurchases(active),
      movements: this.getMovements(active),
      shifts: this.getShifts(active),
      audit: this.getAudit(active),
      settings: this.getSettings(active),
      exportedAt: new Date().toISOString(),
      version: '4.0',
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
      if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
      const target = targetInstanceId || this.getActiveInstanceId();
      const arr = (v: unknown): any[] | null => (Array.isArray(v) ? v : null);

      // تحقق من أن كل مجموعة مصفوفة قبل حفظ أي شيء، حتى لا يُفسد ملف تالف البيانات الحالية
      const entities = arr(data.entities);
      const medicines = arr(data.medicines);
      const sales = arr(data.sales);
      const transactions = arr(data.transactions);
      const expenses = arr(data.expenses);
      const purchases = arr(data.purchases);
      const movements = arr(data.movements);
      const shifts = arr(data.shifts);
      const audit = arr(data.audit);
      if (!entities && !medicines && !sales && !transactions && !expenses) return false;
      if (medicines && medicines.some(m => !m || typeof m.id !== 'string' || typeof m.tradeName !== 'string')) return false;
      if (sales && sales.some(x => !x || typeof x.invoiceNumber !== 'string' || !Array.isArray(x.items))) return false;

      if (entities) this.saveEntities(entities, target);
      if (medicines) this.saveMedicines(normalizeMedicines(medicines), target);
      if (sales) this.saveSales(sales, target);
      if (transactions) this.saveTransactions(transactions, target);
      if (expenses) this.saveExpenses(expenses, target);
      if (purchases) this.savePurchases(purchases, target);
      if (movements) this.saveMovements(movements, target);
      if (shifts) this.saveShifts(shifts, target);
      if (audit) this.saveAudit(audit, target);
      if (data.settings && typeof data.settings === 'object') this.saveSettings(data.settings, target);
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

  /** مسح بيانات الصيدلية (فارغة تماماً). لا يُعاد تحميل أي بيانات تجريبية. */
  static resetToDefault(instanceId?: string): void {
    const target = instanceId || this.getActiveInstanceId();
    this.saveEntities([], target);
    this.saveMedicines([], target);
    this.saveSales([], target);
    this.saveTransactions([], target);
    this.saveExpenses([], target);
    this.savePurchases([], target);
    this.saveMovements([], target);
    this.saveShifts([], target);
    this.saveAudit([], target);
    if (target === 'default') this.saveSettings(defaultSettings, 'default');
  }

  /** تحميل بيانات تجريبية للتعلم والتجربة (يستبدل البيانات الحالية، فاستخدمه بعد أخذ نسخة احتياطية) */
  static loadDemoData(instanceId?: string): void {
    const target = instanceId || this.getActiveInstanceId();
    this.saveEntities(initialEntities, target);
    this.saveMedicines(normalizeMedicines(initialMedicines), target);
    this.saveSales(initialSales, target);
    this.saveTransactions(initialTransactions, target);
    this.saveExpenses(initialExpenses, target);
    this.savePurchases([], target);
    this.saveMovements([], target);
    this.saveShifts([], target);
    this.saveAudit([], target);
  }
}

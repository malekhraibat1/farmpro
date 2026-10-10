import { AppSettings } from '../types';
import { defaultLicense, defaultSettings } from './storage';

export interface PharmacyInstance {
  id: string; // Unique slug identifier, e.g. "default", "pharma-alamal", "hebron-main"
  code: string; // Clean short code, e.g. "NOOR-01", "AMAL-02"
  pharmacyName: string;
  branchName?: string;
  ownerName: string;
  phone: string;
  address?: string;
  currency?: string;
  notes?: string;
  createdAt: string;
  lastActiveAt?: string;
  pin?: string; // Optional pin to lock switching
  // Username & Password credentials per instance
  username?: string; // e.g. "admin", "dr_ahmad"
  password?: string; // e.g. "123456"
  isProtected?: boolean; // Requires username & password to enter instance
  supabaseConfig?: {
    url: string;
    anonKey: string;
  };
}

const INSTANCES_LIST_KEY = 'pharma_registered_instances_v1';
const ACTIVE_INSTANCE_KEY = 'pharma_active_instance_id_v1';
const SESSION_AUTH_PREFIX = 'pharma_auth_session_';
// In-memory session tracking for instant check and testing environments
const inMemorySessionMap: Record<string, boolean> = {};

export const DEFAULT_INSTANCE: PharmacyInstance = {
  id: 'default',
  code: 'MAIN-01',
  pharmacyName: 'صيدلية النور النموذجية',
  branchName: 'المقر الرئيسي',
  ownerName: 'د. مالك حريبات',
  phone: '0594345464',
  address: 'الشارع الرئيسي - وسط المدينة',
  currency: '₪',
  notes: 'النسخة الأصلية المعتمدة - المقر الرئيسي',
  createdAt: '2026-10-01T00:00:00.000Z',
  lastActiveAt: new Date().toISOString(),
  username: '', // إزالة admin الافتراضي
  password: '', // إزالة 123 الافتراضي
  isProtected: false,
};

const inMemoryInstanceStorage: Record<string, string> = {};

function safeGet(key: string): string | null {
  if (inMemoryInstanceStorage[key] !== undefined) {
    return inMemoryInstanceStorage[key];
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) inMemoryInstanceStorage[key] = val;
      return val;
    }
  } catch (e) {
    console.warn('localStorage read error:', e);
  }
  return null;
}

function safeSet(key: string, val: string): void {
  inMemoryInstanceStorage[key] = val;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
    }
  } catch (e) {
    console.warn('localStorage write error:', e);
  }
}

export class InstanceService {
  /**
   * Returns list of all registered pharmacy instances
   */
  static getInstances(): PharmacyInstance[] {
    const data = safeGet(INSTANCES_LIST_KEY);
    if (!data) {
      const initial = [DEFAULT_INSTANCE];
      this.saveInstances(initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure default instance is always present
        if (!parsed.some(i => i.id === 'default')) {
          parsed.unshift(DEFAULT_INSTANCE);
        }
        return parsed;
      }
      return [DEFAULT_INSTANCE];
    } catch {
      return [DEFAULT_INSTANCE];
    }
  }

  static saveInstances(instances: PharmacyInstance[]): void {
    safeSet(INSTANCES_LIST_KEY, JSON.stringify(instances));
  }

  /**
   * Get ID of current active pharmacy instance
   */
  static getActiveInstanceId(): string {
    const id = safeGet(ACTIVE_INSTANCE_KEY);
    return id || 'default';
  }

  /**
   * Get full details of current active instance
   */
  static getActiveInstance(): PharmacyInstance {
    const id = this.getActiveInstanceId();
    const instances = this.getInstances();
    const found = instances.find(i => i.id === id);
    return found || DEFAULT_INSTANCE;
  }

  /**
   * Get instance by specific ID
   */
  static getInstanceById(id: string): PharmacyInstance | undefined {
    return this.getInstances().find(i => i.id === id);
  }

  /**
   * Update details of an existing pharmacy instance (including credentials)
   */
  static updateInstance(instanceId: string, updates: Partial<PharmacyInstance>): PharmacyInstance | null {
    const instances = this.getInstances();
    const idx = instances.findIndex(i => i.id === instanceId);
    if (idx === -1) return null;
    instances[idx] = { ...instances[idx], ...updates, lastActiveAt: new Date().toISOString() };
    this.saveInstances(instances);
    return instances[idx];
  }

  /**
   * Checks if the given pharmacy instance is currently unlocked / authenticated in this session
   */
  static isInstanceAuthenticated(instanceId: string): boolean {
    const inst = this.getInstanceById(instanceId) || (instanceId === 'default' ? DEFAULT_INSTANCE : undefined);
    if (!inst || !inst.isProtected || !inst.password) {
      return true; // No password protection enabled
    }
    if (inMemorySessionMap[instanceId]) {
      return true;
    }
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(SESSION_AUTH_PREFIX + instanceId) === 'true';
      }
    } catch (e) {}
    return false;
  }

  /**
   * Verifies username & password and authenticates instance session
   */
  static verifyAndAuthenticate(instanceId: string, usernameInput: string, passwordInput: string): boolean {
    const inst = this.getInstanceById(instanceId) || (instanceId === 'default' ? DEFAULT_INSTANCE : undefined);
    if (!inst) return false;

    // لا توجد كلمات مرور افتراضية مثل 123 أو تجاوزات سرية
    const expectedUser = (inst.username || '').trim().toLowerCase();
    const expectedPass = (inst.password || '').trim();
    const inputUser = usernameInput.trim().toLowerCase();
    const inputPass = passwordInput.trim();

    if (!expectedPass) {
      // إذا كانت الصيدلية غير محمية بكلمة مرور
      return true;
    }

    const isMatch = (expectedUser ? inputUser === expectedUser : true) && inputPass === expectedPass;

    if (isMatch) {
      inMemorySessionMap[instanceId] = true;
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(SESSION_AUTH_PREFIX + instanceId, 'true');
        }
      } catch (e) {}
      return true;
    }
    return false;
  }

  /**
   * Logs out the instance session
   */
  static logoutInstance(instanceId: string): void {
    inMemorySessionMap[instanceId] = false;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(SESSION_AUTH_PREFIX + instanceId);
      }
    } catch (e) {}
  }

  /**
   * Switch active instance
   */
  static setActiveInstanceId(id: string): void {
    safeSet(ACTIVE_INSTANCE_KEY, id);
    // Update lastActiveAt
    const instances = this.getInstances();
    const updated = instances.map(inst => {
      if (inst.id === id) {
        return { ...inst, lastActiveAt: new Date().toISOString() };
      }
      return inst;
    });
    this.saveInstances(updated);
  }

  /**
   * Create a new isolated pharmacy instance
   */
  static createInstance(params: {
    pharmacyName: string;
    branchName?: string;
    ownerName: string;
    phone: string;
    address?: string;
    currency?: string;
    customCode?: string;
    pin?: string;
    username?: string;
    password?: string;
    isProtected?: boolean;
    initEmpty?: boolean; // if true, don't seed with default items
    supabaseConfig?: { url: string; anonKey: string };
  }): PharmacyInstance {
    const slug = (params.customCode || params.pharmacyName)
      .toLowerCase()
      .replace(/[^\w\u0621-\u064A0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'pharmacy-' + Date.now().toString().slice(-4);

    const uniqueId = `pharma_${slug}_${Math.random().toString(36).substring(2, 6)}`;
    const code = params.customCode?.trim().toUpperCase() || `PH-${Math.floor(100 + Math.random() * 900)}`;

    const newInstance: PharmacyInstance = {
      id: uniqueId,
      code,
      pharmacyName: params.pharmacyName.trim(),
      branchName: params.branchName?.trim() || 'فرع مستقل',
      ownerName: params.ownerName.trim(),
      phone: params.phone.trim(),
      address: params.address?.trim() || '',
      currency: params.currency?.trim() || '₪',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      pin: params.pin?.trim() || '',
      username: params.username?.trim() || '',
      password: params.password?.trim() || '',
      isProtected: params.isProtected !== undefined ? params.isProtected : false,
      supabaseConfig: params.supabaseConfig,
    };

    const instances = this.getInstances();
    instances.push(newInstance);
    this.saveInstances(instances);

    if (params.supabaseConfig?.url && params.supabaseConfig?.anonKey) {
      const key = `pharma_supabase_config_v1_inst_${uniqueId}`;
      safeSet(key, JSON.stringify({
        url: params.supabaseConfig.url.trim(),
        anonKey: params.supabaseConfig.anonKey.trim(),
        isConnected: true,
      }));
    }

    return newInstance;
  }

  /**
   * Update Supabase configuration for a specific pharmacy instance
   */
  static updateInstanceSupabase(
    instanceId: string,
    config: { url: string; anonKey: string } | undefined
  ): void {
    const instances = this.getInstances();
    const idx = instances.findIndex(i => i.id === instanceId);
    if (idx !== -1) {
      instances[idx] = {
        ...instances[idx],
        supabaseConfig: config,
        lastActiveAt: new Date().toISOString(),
      };
      this.saveInstances(instances);
    }

    const storageKey =
      instanceId === 'default'
        ? 'pharma_supabase_config_v1'
        : `pharma_supabase_config_v1_inst_${instanceId}`;

    if (config?.url && config?.anonKey) {
      safeSet(
        storageKey,
        JSON.stringify({
          url: config.url.trim(),
          anonKey: config.anonKey.trim(),
          isConnected: true,
        })
      );
    } else {
      safeSet(
        storageKey,
        JSON.stringify({
          url: '',
          anonKey: '',
          isConnected: false,
        })
      );
    }
  }

  /**
   * Delete an instance and clean up its stored data
   */
  static deleteInstance(instanceId: string): boolean {
    if (instanceId === 'default') {
      return false; // Cannot delete default root instance
    }
    const instances = this.getInstances().filter(i => i.id !== instanceId);
    this.saveInstances(instances);

    // If active instance was deleted, fallback to default
    if (this.getActiveInstanceId() === instanceId) {
      this.setActiveInstanceId('default');
    }

    // Clean localStorage keys
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove = [
          `pharma_entities_v1_inst_${instanceId}`,
          `pharma_medicines_v1_inst_${instanceId}`,
          `pharma_sales_v1_inst_${instanceId}`,
          `pharma_transactions_v1_inst_${instanceId}`,
          `pharma_expenses_v1_inst_${instanceId}`,
          `pharma_settings_v1_inst_${instanceId}`,
          `pharma_supabase_config_v1_inst_${instanceId}`,
        ];
        keysToRemove.forEach(k => window.localStorage.removeItem(k));
      }
    } catch (e) {
      console.warn('Error deleting instance keys:', e);
    }

    return true;
  }

  /**
   * Build a direct launch URL for a specific pharmacy instance
   */
  static buildInstanceUrl(instanceId: string): string {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}?instance=${encodeURIComponent(instanceId)}`;
  }

  /**
   * Build a direct launch URL for a specific pharmacy instance including cloud sync keys
   */
  static buildInstanceUrlWithSync(instanceId: string): string {
    const base = this.buildInstanceUrl(instanceId);
    if (!base) return '';
    const inst = this.getInstanceById(instanceId) || (instanceId === 'default' ? DEFAULT_INSTANCE : undefined);
    if (inst?.supabaseConfig?.url && inst?.supabaseConfig?.anonKey) {
      return `${base}&sync_url=${encodeURIComponent(inst.supabaseConfig.url)}&sync_key=${encodeURIComponent(inst.supabaseConfig.anonKey)}`;
    }
    return base;
  }

  /**
   * Generates a portable JSON bundle for an instance
   */
  static exportInstanceBundle(
    instance: PharmacyInstance,
    data: {
      entities: any[];
      medicines: any[];
      sales: any[];
      transactions: any[];
      expenses: any[];
      settings: AppSettings;
    }
  ): string {
    const bundle = {
      type: 'PHARMA_PRO_ISOLATED_INSTANCE_BUNDLE',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      instance,
      data,
    };
    return JSON.stringify(bundle, null, 2);
  }
}

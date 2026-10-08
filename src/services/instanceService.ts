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
  supabaseConfig?: {
    url: string;
    anonKey: string;
  };
}

const INSTANCES_LIST_KEY = 'pharma_registered_instances_v1';
const ACTIVE_INSTANCE_KEY = 'pharma_active_instance_id_v1';

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
};

function safeGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn('localStorage read error:', e);
  }
  return null;
}

function safeSet(key: string, val: string): void {
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
      pin: params.pin?.trim(),
      supabaseConfig: params.supabaseConfig,
    };

    const instances = this.getInstances();
    instances.push(newInstance);
    this.saveInstances(instances);

    return newInstance;
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

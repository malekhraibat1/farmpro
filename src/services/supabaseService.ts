import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Entity, Medicine, SaleInvoice, FinancialTransaction, Expense, AppSettings } from '../types';
import { InstanceService } from './instanceService';

const SUPABASE_CONFIG_KEY = 'pharma_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSyncedAt?: string;
}

/**
 * Intelligent helper to detect and fix common URL mistakes when copying from Supabase
 */
export function cleanAndValidateSupabaseUrl(rawUrl: string): {
  cleanedUrl: string;
  isFixed: boolean;
  fixReason?: string;
} {
  if (!rawUrl) return { cleanedUrl: '', isFixed: false };
  let url = rawUrl.trim();

  // Strip wrapping quotes if any
  url = url.replace(/^['"]+|['"]+$/g, '');

  // 1. Detect if user pasted the dashboard project URL from the browser bar:
  // e.g. https://supabase.com/dashboard/project/cgzrmyr26bldlid6iftzcx
  // or https://supabase.com/dashboard/project/cgzrmyr26bldlid6iftzcx/settings/api
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    const projectRef = dashboardMatch[1];
    return {
      cleanedUrl: `https://${projectRef}.supabase.co`,
      isFixed: true,
      fixReason: `تم استخراج رمز المشروع (${projectRef}) من رابط لوحة التحكم وتحويله لرابط الـ API الصحيح تلقائياً.`,
    };
  }

  // 2. Detect if user pasted a postgres connection URL: postgresql://postgres:...@db.xxx.supabase.co:5432/postgres
  const dbMatch = url.match(/db\.([a-zA-Z0-9_-]+)\.supabase\.co/i);
  if (dbMatch && dbMatch[1]) {
    const projectRef = dbMatch[1];
    return {
      cleanedUrl: `https://${projectRef}.supabase.co`,
      isFixed: true,
      fixReason: `تم استخراج رمز المشروع (${projectRef}) من رابط قاعدة البيانات وتحويله لرابط الـ API الصحيح.`,
    };
  }

  // 3. Detect if user entered just the 20-character project ref (e.g. cgzrmyr26bldlid6iftzcx)
  if (/^[a-zA-Z0-9_-]{15,30}$/.test(url)) {
    return {
      cleanedUrl: `https://${url}.supabase.co`,
      isFixed: true,
      fixReason: `تم تحويل رمز المشروع المدخل إلى رابط كامل: https://${url}.supabase.co`,
    };
  }

  let wasFixed = false;
  let fixReason = '';

  // 4. Ensure https:// prefix
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
    wasFixed = true;
    fixReason = 'تمت إضافة https:// للرابط.';
  }

  // 5. Clean extra trailing paths: e.g. /rest/v1, /auth/v1, /settings/api, /editor, etc.
  if (url.includes('.supabase.co')) {
    const domainMatch = url.match(/(https:\/\/[a-zA-Z0-9_-]+\.supabase\.co)/i);
    if (domainMatch && domainMatch[1]) {
      if (domainMatch[1] !== url) {
        url = domainMatch[1];
        wasFixed = true;
        fixReason = 'تمت إزالة المسارات والزوائد وحفظ الرابط الأساسي فقط.';
      }
    }
  }

  // Clean trailing slashes
  url = url.replace(/\/+$/, '');

  return {
    cleanedUrl: url,
    isFixed: wasFixed,
    fixReason: wasFixed ? fixReason : undefined,
  };
}

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- فارما برو - مخطط قاعدة البيانات الآمن (الإصدار 2)
-- كل صيدلية = حساب Supabase خاص بها، ولا ترى بيانات غيرها (Row Level Security)
-- شغّل هذا السكربت كاملاً مرة واحدة في SQL Editor
-- ========================================================

-- 1. الكيانات والحسابات
CREATE TABLE IF NOT EXISTS entities (
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  current_balance NUMERIC(12, 2) DEFAULT 0.00,
  credit_limit NUMERIC(12, 2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (owner_id, id)
);

-- 2. الأدوية والمخزون
CREATE TABLE IF NOT EXISTS medicines (
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  barcode TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  unit TEXT,
  stock_quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 5,
  purchase_price NUMERIC(12, 2) NOT NULL,
  sell_price NUMERIC(12, 2) NOT NULL,
  batch_number TEXT,
  expiry_date DATE NOT NULL,
  manufacturer TEXT,
  batches JSONB NOT NULL DEFAULT '[]'::jsonb,
  dosage_form TEXT,
  strength TEXT,
  requires_prescription BOOLEAN DEFAULT FALSE,
  is_controlled BOOLEAN DEFAULT FALSE,
  units_per_pack INTEGER DEFAULT 1,
  sub_unit_name TEXT,
  sub_unit_price NUMERIC(12, 2),
  loose_units INTEGER DEFAULT 0,
  min_sell_price NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (owner_id, id),
  UNIQUE (owner_id, barcode)
);

-- 3. فواتير المبيعات
CREATE TABLE IF NOT EXISTS sales (
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  date TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12, 2) NOT NULL,
  discount NUMERIC(12, 2) DEFAULT 0.00,
  tax NUMERIC(12, 2) DEFAULT 0.00,
  final_amount NUMERIC(12, 2) NOT NULL,
  paid_amount NUMERIC(12, 2) DEFAULT 0.00,
  remaining_amount NUMERIC(12, 2) DEFAULT 0.00,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  cashier_name TEXT,
  notes TEXT,
  prescription JSONB,
  shift_id TEXT,
  change_given NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (owner_id, id),
  UNIQUE (owner_id, invoice_number)
);

-- 4. الحركات المالية ودفتر القيود
CREATE TABLE IF NOT EXISTS financial_transactions (
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  date TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  reference_number TEXT,
  note TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (owner_id, id)
);

-- 5. المصاريف التشغيلية
CREATE TABLE IF NOT EXISTS expenses (
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (owner_id, id)
);

-- 6. إعدادات الصيدلية
CREATE TABLE IF NOT EXISTS pharmacy_settings (
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  id TEXT NOT NULL DEFAULT 'main_config',
  pharmacy_name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  address TEXT,
  currency TEXT DEFAULT '₪',
  tax_rate NUMERIC(5, 2) DEFAULT 0.00,
  settings_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (owner_id, id)
);

-- 7. الأمان: تفعيل RLS ومنع المستخدم المجهول (anon) تماماً
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE entities, medicines, sales, financial_transactions, expenses, pharmacy_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE entities, medicines, sales, financial_transactions, expenses, pharmacy_settings TO authenticated;

-- 8. سياسات: كل مستخدم يرى ويعدّل صفوفه فقط
DROP POLICY IF EXISTS "owner_all" ON entities;
DROP POLICY IF EXISTS "owner_all" ON medicines;
DROP POLICY IF EXISTS "owner_all" ON sales;
DROP POLICY IF EXISTS "owner_all" ON financial_transactions;
DROP POLICY IF EXISTS "owner_all" ON expenses;
DROP POLICY IF EXISTS "owner_all" ON pharmacy_settings;

CREATE POLICY "owner_all" ON entities FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner_all" ON medicines FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner_all" ON sales FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner_all" ON financial_transactions FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner_all" ON expenses FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner_all" ON pharmacy_settings FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- 9. فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_sales_owner_created ON sales (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medicines_owner_expiry ON medicines (owner_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_tx_owner_entity ON financial_transactions (owner_id, entity_id);
`;

/**
 * ترحيل من المخطط القديم (الجداول بدون owner_id وبسياسات مفتوحة).
 * مهم: خذ نسخة احتياطية أولاً. استبدل YOUR-USER-UUID بمعرّف حسابك من Authentication > Users.
 * يُشغَّل مرة واحدة، ثم شغّل سكربت المخطط الآمن (الإصدار 2) لتفعيل RLS والسياسات.
 */
export const SUPABASE_MIGRATION_SQL = `-- ترحيل المخطط القديم إلى النموذج الآمن
-- 1) أضف عمود المالك واملأه بمعرّف حسابك
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['entities','medicines','sales','financial_transactions','expenses','pharmacy_settings'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS owner_id UUID', t);
    EXECUTE format('UPDATE %I SET owner_id = %L WHERE owner_id IS NULL', t, 'YOUR-USER-UUID');
    EXECUTE format('ALTER TABLE %I ALTER COLUMN owner_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN owner_id SET DEFAULT auth.uid()', t);
  END LOOP;
END $$;

-- 1.5) أعمدة الميزات الجديدة (تشغيلات، وحدات صغرى، وصفات...)
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS batches JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS dosage_form TEXT;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS strength TEXT;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT FALSE;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN DEFAULT FALSE;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS units_per_pack INTEGER DEFAULT 1;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS sub_unit_name TEXT;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS sub_unit_price NUMERIC(12, 2);
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS loose_units INTEGER DEFAULT 0;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS min_sell_price NUMERIC(12, 2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS prescription JSONB;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS shift_id TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_given NUMERIC(12, 2) DEFAULT 0.00;

-- 2) استبدل المفاتيح الأساسية والفريدة بمفاتيح تشمل المالك
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_entity_id_fkey;
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_entity_id_fkey;
ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_pkey;
ALTER TABLE medicines DROP CONSTRAINT IF EXISTS medicines_pkey;
ALTER TABLE medicines DROP CONSTRAINT IF EXISTS medicines_barcode_key;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_pkey;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_invoice_number_key;
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_pkey;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_pkey;
ALTER TABLE pharmacy_settings DROP CONSTRAINT IF EXISTS pharmacy_settings_pkey;

ALTER TABLE entities ADD PRIMARY KEY (owner_id, id);
ALTER TABLE medicines ADD PRIMARY KEY (owner_id, id);
ALTER TABLE medicines ADD UNIQUE (owner_id, barcode);
ALTER TABLE sales ADD PRIMARY KEY (owner_id, id);
ALTER TABLE sales ADD UNIQUE (owner_id, invoice_number);
ALTER TABLE financial_transactions ADD PRIMARY KEY (owner_id, id);
ALTER TABLE expenses ADD PRIMARY KEY (owner_id, id);
ALTER TABLE pharmacy_settings ADD PRIMARY KEY (owner_id, id);

-- 3) احذف السياسات المفتوحة القديمة
DROP POLICY IF EXISTS "Allow anon all on entities" ON entities;
DROP POLICY IF EXISTS "Allow anon all on medicines" ON medicines;
DROP POLICY IF EXISTS "Allow anon all on sales" ON sales;
DROP POLICY IF EXISTS "Allow anon all on financial_transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Allow anon all on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow anon all on pharmacy_settings" ON pharmacy_settings;
-- ثم شغّل سكربت المخطط الآمن (الإصدار 2) لتفعيل RLS والسياسات الجديدة.
`;

/** سكربت إصلاح خطأ RLS (آمن): يعيد ضبط السياسات الصحيحة، ولا يفتح الجداول للعامة */
export const SUPABASE_RLS_FIX_SQL = `-- إصلاح خطأ "new row violates row-level security policy"
-- السبب الشائع: لم تسجّل الدخول بحساب Supabase داخل البرنامج، أو الجداول بالمخطط القديم.
-- 1) سجّل الدخول من نافذة الربط السحابي أولاً.
-- 2) إن استمر الخطأ: شغّل سكربت المخطط الآمن (الإصدار 2)، وإن كانت لديك جداول قديمة فشغّل الترحيل قبله.
-- لا تعطّل RLS ولا تمنح anon صلاحيات: هذا يكشف بيانات صيدليتك لأي شخص على الإنترنت.

SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('entities','medicines','sales','financial_transactions','expenses','pharmacy_settings');
`;

const inMemorySupabaseConfig: Record<string, string> = {};

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn('localStorage read failed (Safari private mode):', e);
  }
  return inMemorySupabaseConfig[key] || null;
}

function safeSetStorage(key: string, value: string): void {
  inMemorySupabaseConfig[key] = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn('localStorage write failed (Safari private mode):', e);
  }
}

function getSupabaseKey(instanceId?: string): string {
  const active = instanceId || safeGetStorage('pharma_active_instance_id_v1') || 'default';
  if (active === 'default') return SUPABASE_CONFIG_KEY;
  return `${SUPABASE_CONFIG_KEY}_inst_${active}`;
}

export class SupabaseService {
  private static client: SupabaseClient | null = null;
  private static clientInstanceId: string | null = null;

  static getConfig(instanceId?: string): SupabaseConfig {
    const targetId = instanceId || safeGetStorage('pharma_active_instance_id_v1') || 'default';
    const key = getSupabaseKey(targetId);
    const raw = safeGetStorage(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.url) return parsed;
      } catch {}
    }

    // Fallback: check if the pharmacy instance already has supabaseConfig
    try {
      const inst = InstanceService.getInstanceById(targetId);
      if (inst?.supabaseConfig?.url && inst?.supabaseConfig?.anonKey) {
        return {
          url: inst.supabaseConfig.url,
          anonKey: inst.supabaseConfig.anonKey,
          isConnected: true,
        };
      }
    } catch {}

    // Fallback 2: check if environment variables are provided (e.g. Standalone Vercel deployment per pharmacy)
    try {
      const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
      if (envUrl && envKey) {
        return {
          url: String(envUrl).trim(),
          anonKey: String(envKey).trim(),
          isConnected: true,
        };
      }
    } catch {}

    return { url: '', anonKey: '', isConnected: false };
  }

  static saveConfig(config: SupabaseConfig, instanceId?: string): void {
    const targetId = instanceId || safeGetStorage('pharma_active_instance_id_v1') || 'default';
    const key = getSupabaseKey(targetId);
    const { cleanedUrl } = cleanAndValidateSupabaseUrl(config.url);
    const sanitized = {
      ...config,
      url: cleanedUrl || config.url.trim(),
      anonKey: config.anonKey.trim(),
    };
    safeSetStorage(key, JSON.stringify(sanitized));

    // Keep instance record updated as well
    try {
      InstanceService.updateInstanceSupabase(
        targetId,
        sanitized.url && sanitized.anonKey
          ? { url: sanitized.url, anonKey: sanitized.anonKey }
          : undefined
      );
    } catch (e) {
      console.warn('Could not sync instance supabase config:', e);
    }

    this.client = null; // reset client to re-init
    this.clientInstanceId = null;
  }

  static getClient(): SupabaseClient | null {
    const active = safeGetStorage('pharma_active_instance_id_v1') || 'default';
    if (this.client && this.clientInstanceId === active) return this.client;
    const cfg = this.getConfig(active);
    if (cfg.url && cfg.anonKey) {
      try {
        const { cleanedUrl } = cleanAndValidateSupabaseUrl(cfg.url);
        this.client = createClient(cleanedUrl || cfg.url.trim(), cfg.anonKey.trim());
        return this.client;
      } catch (e) {
        console.error('Failed to create Supabase client:', e);
        return null;
      }
    }
    return null;
  }

  // Test connection to Supabase with comprehensive error diagnosis
  static async testConnection(
    rawUrl: string,
    rawAnonKey: string
  ): Promise<{ success: boolean; message: string; correctedUrl?: string; fixReason?: string }> {
    try {
      const urlToTest = rawUrl?.trim() || '';
      const keyToTest = rawAnonKey?.trim() || '';

      if (!urlToTest) {
        return { success: false, message: 'يرجى إدخال رابط المشروع (Project URL).' };
      }
      if (!keyToTest) {
        return { success: false, message: 'يرجى إدخال المفتاح العام (anon public key).' };
      }

      // Sanitize URL
      const { cleanedUrl, isFixed, fixReason } = cleanAndValidateSupabaseUrl(urlToTest);

      if (!cleanedUrl.includes('.supabase.co')) {
        return {
          success: false,
          message:
            'تنبيه: الرابط المدخل ليس رابط مشروع Supabase صحيح. يجب أن يكون بالشكل: https://[رمز-المشروع].supabase.co وليس رابط لوحة التحكم.',
        };
      }

      const testClient = createClient(cleanedUrl, keyToTest);
      // Try querying entities table to verify connection & table readiness
      const { error } = await testClient.from('entities').select('id').limit(1);

      if (error) {
        const errorMsgLower = (error.message || '').toLowerCase();

        // 1. Tables do not exist yet (Code 42P01 or PostgREST relation not found)
        if (
          errorMsgLower.includes('relation') ||
          errorMsgLower.includes('does not exist') ||
          error.code === '42P01' ||
          error.code === 'PGRST204'
        ) {
          return {
            success: true,
            correctedUrl: isFixed ? cleanedUrl : undefined,
            fixReason: isFixed ? fixReason : undefined,
            message:
              '✅ الاتصال بسيرفر Supabase نجح 100%! ولكن لم يتم إنشاء الجداول بعد. يرجى التوجه لتبويب (كود إنشاء الجداول) ونسخه وتشغيله في الـ SQL Editor بـ Supabase.',
          };
        }

        // 2. Invalid path error (the specific error user reported)
        if (errorMsgLower.includes('invalid path')) {
          return {
            success: false,
            message:
              '❌ خطأ في مسار الرابط (Invalid path): يبدو أنك نسخت رابط لوحة التحكم (dashboard) أو أضفت مساراً إضافياً. الرابط المطلوب تجده في: Project Settings ⚙️ -> API -> Project URL (شكله: https://xxxx.supabase.co).',
          };
        }

        // 3. Invalid API key / JWT / Unauthorized
        if (
          error.code === 'PGRST301' ||
          errorMsgLower.includes('jwt') ||
          errorMsgLower.includes('apikey') ||
          errorMsgLower.includes('unauthorized') ||
          errorMsgLower.includes('invalid api key')
        ) {
          return {
            success: false,
            message:
              '❌ مفتاح Anon Key غير صالح أو منتهي. تأكد من نسخ المفتاح المسمى "anon public" بالكامل من Project Settings -> API.',
          };
        }

        return {
          success: false,
          message: `تنبيه: ${error.message}`,
        };
      }

      return {
        success: true,
        correctedUrl: isFixed ? cleanedUrl : undefined,
        fixReason: isFixed ? fixReason : undefined,
        message: '🎉 تم الاتصال بسيرفر Supabase بنجاح! الجداول موجودة وجاهزة للمزامنة.',
      };
    } catch (e: any) {
      return {
        success: false,
        message: `فشل الاتصال: ${e.message || 'تأكد من صحة الرابط والمفتاح والاتصال بالإنترنت'}`,
      };
    }
  }

  // Push local data to Supabase
  /** معرّف المستخدم المسجَّل دخوله في Supabase (null إن لم يسجّل الدخول) */
  static async getOwnerId(): Promise<string | null> {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data } = await client.auth.getSession();
      return data.session?.user?.id || null;
    } catch {
      return null;
    }
  }

  static async getSessionEmail(): Promise<string | null> {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data } = await client.auth.getSession();
      return data.session?.user?.email || null;
    } catch {
      return null;
    }
  }

  static async pushAllDataToSupabase(
    entities: Entity[],
    medicines: Medicine[],
    sales: SaleInvoice[],
    transactions: FinancialTransaction[],
    expenses: Expense[],
    settings: AppSettings
  ): Promise<{ success: boolean; message: string; isRlsError?: boolean }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'يرجى إدخال رابط ومفتاح Supabase أولاً.' };
    }
    const ownerId = await this.getOwnerId();
    if (!ownerId) {
      return { success: false, message: 'سجّل الدخول بحساب Supabase أولاً (من نافذة الربط السحابي) ثم أعد المحاولة.' };
    }

    try {
      // 1. Entities
      if (entities.length > 0) {
        const payloadEntities = entities.map(e => ({
          owner_id: ownerId,
          id: e.id,
          name: e.name,
          type: e.type,
          phone: e.phone,
          email: e.email || null,
          address: e.address || null,
          current_balance: e.currentBalance,
          credit_limit: e.creditLimit,
          notes: e.notes || null,
        }));
        const { error: errEnt } = await client.from('entities').upsert(payloadEntities, { onConflict: 'owner_id,id' });
        if (errEnt) throw new Error(`خطأ في رفع الكيانات: ${errEnt.message}`);
      }

      // 2. Medicines
      if (medicines.length > 0) {
        const payloadMeds = medicines.map(m => ({
          owner_id: ownerId,
          id: m.id,
          barcode: m.barcode,
          trade_name: m.tradeName,
          generic_name: m.genericName || null,
          category: m.category,
          unit: m.unit,
          stock_quantity: m.stockQuantity,
          min_quantity: m.minQuantity,
          purchase_price: m.purchasePrice,
          sell_price: m.sellPrice,
          batch_number: m.batchNumber,
          expiry_date: m.expiryDate,
          manufacturer: m.manufacturer || null,
          batches: m.batches || [],
          dosage_form: m.dosageForm || null,
          strength: m.strength || null,
          requires_prescription: !!m.requiresPrescription,
          is_controlled: !!m.isControlled,
          units_per_pack: m.unitsPerPack || 1,
          sub_unit_name: m.subUnitName || null,
          sub_unit_price: m.subUnitPrice || null,
          loose_units: m.looseUnits || 0,
          min_sell_price: m.minSellPrice || null,
        }));
        const { error: errMed } = await client.from('medicines').upsert(payloadMeds, { onConflict: 'owner_id,id' });
        if (errMed) throw new Error(`خطأ في رفع الأدوية: ${errMed.message}`);
      }

      // 3. Sales
      if (sales.length > 0) {
        const payloadSales = sales.map(s => ({
          owner_id: ownerId,
          id: s.id,
          invoice_number: s.invoiceNumber,
          date: s.date,
          entity_id: s.entityId || null,
          entity_name: s.entityName || null,
          items: s.items,
          total_amount: s.totalAmount,
          discount: s.discount,
          tax: s.tax,
          final_amount: s.finalAmount,
          paid_amount: s.paidAmount,
          remaining_amount: s.remainingAmount,
          payment_method: s.paymentMethod,
          payment_status: s.paymentStatus,
          cashier_name: s.cashierName,
          notes: s.notes || null,
          prescription: s.prescription || null,
          shift_id: s.shiftId || null,
          change_given: s.changeGiven || 0,
        }));
        const { error: errSales } = await client.from('sales').upsert(payloadSales, { onConflict: 'owner_id,id' });
        if (errSales) throw new Error(`خطأ في رفع الفواتير: ${errSales.message}`);
      }

      // 4. Transactions
      if (transactions.length > 0) {
        const payloadTx = transactions.map(t => ({
          owner_id: ownerId,
          id: t.id,
          entity_id: t.entityId,
          entity_name: t.entityName,
          date: t.date,
          amount: t.amount,
          type: t.type,
          direction: t.direction,
          balance_after: t.balanceAfter,
          reference_number: t.referenceNumber,
          note: t.note || null,
          recorded_by: t.recordedBy,
        }));
        const { error: errTx } = await client.from('financial_transactions').upsert(payloadTx, { onConflict: 'owner_id,id' });
        if (errTx) throw new Error(`خطأ في رفع الحركات المالية: ${errTx.message}`);
      }

      // 5. Expenses
      if (expenses.length > 0) {
        const payloadExp = expenses.map(ex => ({
          owner_id: ownerId,
          id: ex.id,
          title: ex.title,
          category: ex.category,
          amount: ex.amount,
          date: ex.date,
          notes: ex.notes || null,
          recorded_by: ex.recordedBy,
        }));
        const { error: errExp } = await client.from('expenses').upsert(payloadExp, { onConflict: 'owner_id,id' });
        if (errExp) throw new Error(`خطأ في رفع المصاريف: ${errExp.message}`);
      }

      // Update config last synced time
      const cfg = this.getConfig();
      cfg.isConnected = true;
      cfg.lastSyncedAt = new Date().toLocaleString('ar-EG');
      this.saveConfig(cfg);

      return {
        success: true,
        message: 'تم رفع ومزامنة كافة بيانات الصيدلية إلى سيرفر Supabase بنجاح!',
      };
    } catch (e: any) {
      const errorMsg = e.message || 'حدث خطأ أثناء الرفع.';
      const isRls = errorMsg.toLowerCase().includes('row-level security') || errorMsg.toLowerCase().includes('policy');
      return {
        success: false,
        isRlsError: isRls,
        message: isRls
          ? '⚠️ سبب الخطأ: سياسات الأمان (Row-Level Security) في Supabase تمنع حفظ البيانات. اضغط على زر (نسخ كود حل RLS) بالأسفل وشغله في الـ SQL Editor بـ Supabase لحل المشكلة فوراً في ثوانٍ!'
          : errorMsg,
      };
    }
  }

  // Pull all data from Supabase
  static async pullAllDataFromSupabase(): Promise<{
    success: boolean;
    data?: {
      entities: Entity[];
      medicines: Medicine[];
      sales: SaleInvoice[];
      transactions: FinancialTransaction[];
      expenses: Expense[];
    };
    message: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, message: 'يرجى إدخال رابط ومفتاح Supabase أولاً.' };
    }
    const ownerId = await this.getOwnerId();
    if (!ownerId) {
      return { success: false, message: 'سجّل الدخول بحساب Supabase أولاً (من نافذة الربط السحابي) ثم أعد المحاولة.' };
    }

    try {
      const { data: entData, error: entErr } = await client.from('entities').select('*').eq('owner_id', ownerId);
      if (entErr) throw new Error(entErr.message);

      const { data: medData, error: medErr } = await client.from('medicines').select('*').eq('owner_id', ownerId);
      if (medErr) throw new Error(medErr.message);

      const { data: salesData, error: salesErr } = await client.from('sales').select('*').eq('owner_id', ownerId);
      if (salesErr) throw new Error(salesErr.message);

      const { data: txData, error: txErr } = await client.from('financial_transactions').select('*').eq('owner_id', ownerId);
      if (txErr) throw new Error(txErr.message);

      const { data: expData, error: expErr } = await client.from('expenses').select('*').eq('owner_id', ownerId);
      if (expErr) throw new Error(expErr.message);

      const mappedEntities: Entity[] = (entData || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        phone: e.phone || '',
        email: e.email || '',
        address: e.address || '',
        currentBalance: parseFloat(e.current_balance) || 0,
        creditLimit: parseFloat(e.credit_limit) || 0,
        notes: e.notes || '',
        createdAt: e.created_at ? e.created_at.split('T')[0] : '2026-10-01',
      }));

      const mappedMedicines: Medicine[] = (medData || []).map((m: any) => ({
        id: m.id,
        barcode: m.barcode,
        tradeName: m.trade_name,
        genericName: m.generic_name || '',
        category: m.category,
        unit: m.unit,
        stockQuantity: m.stock_quantity || 0,
        minQuantity: m.min_quantity || 0,
        purchasePrice: parseFloat(m.purchase_price) || 0,
        sellPrice: parseFloat(m.sell_price) || 0,
        batchNumber: m.batch_number || '',
        expiryDate: m.expiry_date || '2028-12-31',
        manufacturer: m.manufacturer || '',
        batches: Array.isArray(m.batches) && m.batches.length ? m.batches : undefined,
        dosageForm: m.dosage_form || undefined,
        strength: m.strength || undefined,
        requiresPrescription: !!m.requires_prescription,
        isControlled: !!m.is_controlled,
        unitsPerPack: m.units_per_pack || 1,
        subUnitName: m.sub_unit_name || undefined,
        subUnitPrice: m.sub_unit_price ? parseFloat(m.sub_unit_price) : undefined,
        looseUnits: m.loose_units || 0,
        minSellPrice: m.min_sell_price ? parseFloat(m.min_sell_price) : undefined,
      }));

      const mappedSales: SaleInvoice[] = (salesData || []).map((s: any) => ({
        id: s.id,
        invoiceNumber: s.invoice_number,
        date: s.date,
        entityId: s.entity_id || undefined,
        entityName: s.entity_name || 'زبون نقدي',
        items: s.items || [],
        totalAmount: parseFloat(s.total_amount) || 0,
        discount: parseFloat(s.discount) || 0,
        tax: parseFloat(s.tax) || 0,
        finalAmount: parseFloat(s.final_amount) || 0,
        paidAmount: parseFloat(s.paid_amount) || 0,
        remainingAmount: parseFloat(s.remaining_amount) || 0,
        paymentMethod: s.payment_method || 'cash',
        paymentStatus: s.payment_status || 'paid',
        cashierName: s.cashier_name || 'الكاشير',
        notes: s.notes || '',
        prescription: s.prescription || undefined,
        shiftId: s.shift_id || undefined,
        changeGiven: parseFloat(s.change_given) || 0,
      }));

      const mappedTransactions: FinancialTransaction[] = (txData || []).map((t: any) => ({
        id: t.id,
        entityId: t.entity_id,
        entityName: t.entity_name || '',
        date: t.date,
        amount: parseFloat(t.amount) || 0,
        type: t.type,
        direction: t.direction,
        balanceAfter: parseFloat(t.balance_after) || 0,
        referenceNumber: t.reference_number || '',
        note: t.note || '',
        recordedBy: t.recorded_by || '',
      }));

      const mappedExpenses: Expense[] = (expData || []).map((ex: any) => ({
        id: ex.id,
        title: ex.title,
        category: ex.category,
        amount: parseFloat(ex.amount) || 0,
        date: ex.date,
        notes: ex.notes || '',
        recordedBy: ex.recorded_by || '',
      }));

      return {
        success: true,
        data: {
          entities: mappedEntities,
          medicines: mappedMedicines,
          sales: mappedSales,
          transactions: mappedTransactions,
          expenses: mappedExpenses,
        },
        message: 'تم استيراد كافة البيانات بنجاح من سيرفر Supabase!',
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'فشل جلب البيانات من Supabase.' };
    }
  }

  // ========================================================
  // SUPABASE REAL AUTHENTICATION & JWT ROLE ENFORCEMENT
  // ========================================================

  /**
   * تسجيل الدخول الحقيقي عبر Supabase Auth
   */
  static async signIn(email: string, pass: string): Promise<{
    success: boolean;
    user?: any;
    role?: 'pharmacist' | 'admin' | 'super_admin';
    error?: string;
  }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'لم يتم ربط قاعدة بيانات Supabase بعد.' };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // الدور لا يُؤخذ من user_metadata لأنه قابل للتعديل من المستخدم نفسه. الصلاحيات المحلية تتحكم بها كلمات المرور/الـ PIN.
      return {
        success: true,
        user: data.user,
        role: 'pharmacist',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء تسجيل الدخول عبر Supabase' };
    }
  }

  /**
   * إنشاء مستخدم جديد وتعيين دوره (pharmacist / admin / super_admin) في بيانات Supabase
   */
  static async signUp(
    email: string,
    pass: string,
    role: 'pharmacist' | 'admin' | 'super_admin',
    fullName: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'قاعدة بيانات Supabase غير متصلة.' };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err?.message || 'خطأ أثناء إنشاء الحساب في Supabase' };
    }
  }

  /**
   * التحقق من دور المستخدم الحالي من الـ JWT جلسة Supabase
   */
  static async getCurrentUserRole(): Promise<'pharmacist' | 'admin' | 'super_admin' | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session || !session.user) return null;
      return 'pharmacist';
    } catch {
      return null;
    }
  }

  /**
   * تسجيل الخروج وإبطال جلسة الـ JWT
   */
  static async signOut(): Promise<boolean> {
    const client = this.getClient();
    if (!client) return true;
    try {
      await client.auth.signOut();
      return true;
    } catch {
      return false;
    }
  }
}

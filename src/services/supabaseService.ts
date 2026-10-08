import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Entity, Medicine, SaleInvoice, FinancialTransaction, Expense, AppSettings } from '../types';

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
-- كود إنشاء جداول نظام فارما برو على Supabase
-- تصميم المهندس مالك حريبات | 0594345464
-- ========================================================

-- 1. جدول الكيانات والحسابات (صيدليات أخرى، شركات أدوية، عملاء)
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  current_balance NUMERIC(12, 2) DEFAULT 0.00,
  credit_limit NUMERIC(12, 2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول الأدوية والمخزون
CREATE TABLE IF NOT EXISTS medicines (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول فواتير المبيعات
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول الحركات المالية ودفتر القيود
CREATE TABLE IF NOT EXISTS financial_transactions (
  id TEXT PRIMARY KEY,
  entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
  entity_name TEXT,
  date TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  reference_number TEXT,
  note TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول المصاريف التشغيلية
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. جدول إعدادات الصيدلية والترخيص
CREATE TABLE IF NOT EXISTS pharmacy_settings (
  id TEXT PRIMARY KEY DEFAULT 'main_config',
  pharmacy_name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  address TEXT,
  currency TEXT DEFAULT '₪',
  tax_rate NUMERIC(5, 2) DEFAULT 0.00,
  settings_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. حل مشكلة الصلاحيات: تعطيل قيود RLS ومنح الصلاحيات للمزامنة الحرة
ALTER TABLE IF EXISTS entities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS medicines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pharmacy_settings DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE entities TO anon, authenticated, service_role;
GRANT ALL ON TABLE medicines TO anon, authenticated, service_role;
GRANT ALL ON TABLE sales TO anon, authenticated, service_role;
GRANT ALL ON TABLE financial_transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE expenses TO anon, authenticated, service_role;
GRANT ALL ON TABLE pharmacy_settings TO anon, authenticated, service_role;

-- سياسات وصول مفتوحة للمفتاح العام anon والتوثيق
DO $$ 
BEGIN
  BEGIN
    CREATE POLICY "Allow anon all on entities" ON entities FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Allow anon all on medicines" ON medicines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Allow anon all on sales" ON sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Allow anon all on financial_transactions" ON financial_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Allow anon all on expenses" ON expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Allow anon all on pharmacy_settings" ON pharmacy_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- تفعيل ميزة التزامن المباشر (Realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE entities, medicines, sales, financial_transactions, expenses;
`;

export const SUPABASE_RLS_FIX_SQL = `-- ========================================================
-- كود حل مشكلة الصلاحيات (Row-Level Security RLS) في Supabase
-- تشغيله يحل فوراً خطأ: new row violates row-level security policy
-- ========================================================

-- 1. تعطيل قيود RLS على جميع جداول الصيدلية
ALTER TABLE IF EXISTS entities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS medicines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pharmacy_settings DISABLE ROW LEVEL SECURITY;

-- 2. منح الصلاحيات للمفتاح العام anon والمصرح لهم
GRANT ALL ON TABLE entities TO anon, authenticated, service_role;
GRANT ALL ON TABLE medicines TO anon, authenticated, service_role;
GRANT ALL ON TABLE sales TO anon, authenticated, service_role;
GRANT ALL ON TABLE financial_transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE expenses TO anon, authenticated, service_role;
GRANT ALL ON TABLE pharmacy_settings TO anon, authenticated, service_role;

-- 3. سياسات وصول مفتوحة إضافية
DO $$ 
BEGIN
  BEGIN
    CREATE POLICY "Allow anon all on entities" ON entities FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Allow anon all on medicines" ON medicines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Allow anon all on sales" ON sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Allow anon all on financial_transactions" ON financial_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Allow anon all on expenses" ON expenses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Allow anon all on pharmacy_settings" ON pharmacy_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
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
    const key = getSupabaseKey(instanceId);
    const raw = safeGetStorage(key);
    if (!raw) {
      return { url: '', anonKey: '', isConnected: false };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { url: '', anonKey: '', isConnected: false };
    }
  }

  static saveConfig(config: SupabaseConfig, instanceId?: string): void {
    const key = getSupabaseKey(instanceId);
    const { cleanedUrl } = cleanAndValidateSupabaseUrl(config.url);
    const sanitized = {
      ...config,
      url: cleanedUrl || config.url.trim(),
      anonKey: config.anonKey.trim(),
    };
    safeSetStorage(key, JSON.stringify(sanitized));
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

    try {
      // 1. Entities
      if (entities.length > 0) {
        const payloadEntities = entities.map(e => ({
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
        const { error: errEnt } = await client.from('entities').upsert(payloadEntities, { onConflict: 'id' });
        if (errEnt) throw new Error(`خطأ في رفع الكيانات: ${errEnt.message}`);
      }

      // 2. Medicines
      if (medicines.length > 0) {
        const payloadMeds = medicines.map(m => ({
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
        }));
        const { error: errMed } = await client.from('medicines').upsert(payloadMeds, { onConflict: 'id' });
        if (errMed) throw new Error(`خطأ في رفع الأدوية: ${errMed.message}`);
      }

      // 3. Sales
      if (sales.length > 0) {
        const payloadSales = sales.map(s => ({
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
        }));
        const { error: errSales } = await client.from('sales').upsert(payloadSales, { onConflict: 'id' });
        if (errSales) throw new Error(`خطأ في رفع الفواتير: ${errSales.message}`);
      }

      // 4. Transactions
      if (transactions.length > 0) {
        const payloadTx = transactions.map(t => ({
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
        const { error: errTx } = await client.from('financial_transactions').upsert(payloadTx, { onConflict: 'id' });
        if (errTx) throw new Error(`خطأ في رفع الحركات المالية: ${errTx.message}`);
      }

      // 5. Expenses
      if (expenses.length > 0) {
        const payloadExp = expenses.map(ex => ({
          id: ex.id,
          title: ex.title,
          category: ex.category,
          amount: ex.amount,
          date: ex.date,
          notes: ex.notes || null,
          recorded_by: ex.recordedBy,
        }));
        const { error: errExp } = await client.from('expenses').upsert(payloadExp, { onConflict: 'id' });
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

    try {
      const { data: entData, error: entErr } = await client.from('entities').select('*');
      if (entErr) throw new Error(entErr.message);

      const { data: medData, error: medErr } = await client.from('medicines').select('*');
      if (medErr) throw new Error(medErr.message);

      const { data: salesData, error: salesErr } = await client.from('sales').select('*');
      if (salesErr) throw new Error(salesErr.message);

      const { data: txData, error: txErr } = await client.from('financial_transactions').select('*');
      if (txErr) throw new Error(txErr.message);

      const { data: expData, error: expErr } = await client.from('expenses').select('*');
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
}

import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  UploadCloud,
  DownloadCloud,
  ExternalLink,
  Code2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Server,
  Wand2,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  SupabaseService,
  SupabaseConfig,
  SUPABASE_SQL_SCHEMA,
  SUPABASE_RLS_FIX_SQL,
  cleanAndValidateSupabaseUrl,
} from '../services/supabaseService';
import { InstanceService } from '../services/instanceService';
import { Entity, Medicine, SaleInvoice, FinancialTransaction, Expense, AppSettings } from '../types';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  medicines: Medicine[];
  sales: SaleInvoice[];
  transactions: FinancialTransaction[];
  expenses: Expense[];
  settings: AppSettings;
  onApplyImportedData: (data: {
    entities: Entity[];
    medicines: Medicine[];
    sales: SaleInvoice[];
    transactions: FinancialTransaction[];
    expenses: Expense[];
  }) => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  entities,
  medicines,
  sales,
  transactions,
  expenses,
  settings,
  onApplyImportedData,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [config, setConfig] = useState<SupabaseConfig>(() => SupabaseService.getConfig());
  const [activeInstance, setActiveInstance] = useState(() => InstanceService.getActiveInstance());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    correctedUrl?: string;
    fixReason?: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRlsSql, setCopiedRlsSql] = useState(false);
  const [isRlsError, setIsRlsError] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<'instructions' | 'connection' | 'sql'>('connection');
  const [urlSuggestion, setUrlSuggestion] = useState<{ cleanedUrl: string; reason: string } | null>(null);

  useEffect(() => {
    const cfg = SupabaseService.getConfig();
    setConfig(cfg);
    setUrl(cfg.url);
    setAnonKey(cfg.anonKey);
    setActiveInstance(InstanceService.getActiveInstance());
  }, [isOpen]);

  // Check URL on change for common paste errors
  const handleUrlChange = (value: string) => {
    setUrl(value);
    const check = cleanAndValidateSupabaseUrl(value);
    if (check.isFixed && check.cleanedUrl && check.cleanedUrl !== value.trim()) {
      setUrlSuggestion({
        cleanedUrl: check.cleanedUrl,
        reason: check.fixReason || 'تم اكتشاف رابط لوحة التحكم ويمكن تحويله للرابط الصحيح.',
      });
    } else {
      setUrlSuggestion(null);
    }
  };

  const handleApplyCleanUrl = () => {
    if (urlSuggestion) {
      setUrl(urlSuggestion.cleanedUrl);
      setUrlSuggestion(null);
    }
  };

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyRlsSql = () => {
    navigator.clipboard.writeText(SUPABASE_RLS_FIX_SQL);
    setCopiedRlsSql(true);
    setTimeout(() => setCopiedRlsSql(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!url || !anonKey) {
      setTestResult({ success: false, message: 'يرجى إدخال الرابط والمفتاح أولاً.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const res = await SupabaseService.testConnection(url, anonKey);
    setIsTesting(false);
    setTestResult(res);

    if (res.correctedUrl && res.correctedUrl !== url) {
      setUrl(res.correctedUrl);
      setUrlSuggestion(null);
    }

    if (res.success) {
      const finalUrl = res.correctedUrl || url.trim();
      const updatedConfig: SupabaseConfig = {
        url: finalUrl,
        anonKey: anonKey.trim(),
        isConnected: true,
      };
      SupabaseService.saveConfig(updatedConfig);
      setConfig(updatedConfig);
    }
  };

  const handlePushData = async () => {
    setIsSyncing(true);
    setIsRlsError(false);
    setSyncStatus('جاري رفع وتحديث البيانات في Supabase...');
    const res = await SupabaseService.pushAllDataToSupabase(
      entities,
      medicines,
      sales,
      transactions,
      expenses,
      settings
    );
    setIsSyncing(false);
    setSyncStatus(res.message);
    if (res.isRlsError) {
      setIsRlsError(true);
    } else if (res.success) {
      setConfig(SupabaseService.getConfig());
    }
  };

  const handlePullData = async () => {
    if (!confirm('هل أنت متأكد من استيراد البيانات من Supabase واستبدال البيانات المحلية الحالية؟')) {
      return;
    }
    setIsSyncing(true);
    setSyncStatus('جاري جلب البيانات من Supabase...');
    const res = await SupabaseService.pullAllDataFromSupabase();
    setIsSyncing(false);
    setSyncStatus(res.message);

    if (res.success && res.data) {
      onApplyImportedData(res.data);
      alert('تم استيراد البيانات بنجاح من سيرفر Supabase!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-l from-emerald-800 via-teal-900 to-slate-900 p-5 sm:p-6 text-white flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-bold text-emerald-200 mb-1">
                <Cloud className="w-3.5 h-3.5" />
                <span>الربط والتزامن السحابي • Supabase PostgreSQL</span>
              </div>
              <h3 className="text-xl font-black">ربط الصيدلية بسيرفر Supabase السحابي</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                تخزين ومزامنة البيانات سحابياً مجاناً للعمل المشترك بين الآيفون والكمبيوتر
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs: Connection vs SQL vs Instructions */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveStepTab('connection')}
            className={`py-2 px-4 rounded-t-xl transition-all border-b-2 ${
              activeStepTab === 'connection'
                ? 'border-emerald-600 bg-white text-emerald-800 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            إعدادات الربط والرفع
          </button>
          <button
            onClick={() => setActiveStepTab('instructions')}
            className={`py-2 px-4 rounded-t-xl transition-all border-b-2 ${
              activeStepTab === 'instructions'
                ? 'border-emerald-600 bg-white text-emerald-800 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            دليل الخطوات وحل أخطاء الخطوة 3 💡
          </button>
          <button
            onClick={() => setActiveStepTab('sql')}
            className={`py-2 px-4 rounded-t-xl transition-all border-b-2 ${
              activeStepTab === 'sql'
                ? 'border-emerald-600 bg-white text-emerald-800 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            كود إنشاء الجداول (SQL Script)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-800">
          {/* TAB 1: CONNECTION & SYNC */}
          {activeStepTab === 'connection' && (
            <div className="space-y-5">
              {/* Active Instance Identity Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
                    <Database className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        الصيدلية الحالية: {activeInstance.pharmacyName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                        {activeInstance.code}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      بيانات وسيرفر Supabase هنا معزولة ومخصصة لهذه الصيدلية حصراً ولا تتداخل مع أي صيدلية أخرى
                    </span>
                  </div>
                </div>

                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                  نسخة معزولة
                </span>
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  config.isConnected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      config.isConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <span className="font-black text-sm block">
                      {config.isConnected
                        ? 'متصل بسيرفر Supabase وجاهز للمزامنة'
                        : 'غير متصل بسيرفر Supabase (يعمل حالياً بالوضع المحلي فقط)'}
                    </span>
                    {config.lastSyncedAt && (
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        آخر مزامنة ناجحة: {config.lastSyncedAt}
                      </span>
                    )}
                  </div>
                </div>

                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 shadow-sm"
                >
                  <span>فتح Supabase</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Notice for common 'Invalid path' error */}
              <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200 text-cyan-950 flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-cyan-900 block font-black">
                    ملاحظة هامة للخطوة 3 (لتجنب تنبيه Invalid path specified in request URL):
                  </strong>
                  رابط المشروع (Project URL) المطلوب ليس رابط شريط المتصفح (dashboard)، بل الرابط الذي تجده في{' '}
                  <strong>Project Settings ⚙️ -&gt; API</strong> وشكله مثل:{' '}
                  <code className="px-1.5 py-0.5 rounded bg-cyan-100 font-mono text-cyan-800 font-bold" dir="ltr">
                    https://xxxxxxxxxxxx.supabase.co
                  </code>
                  . (وإذا قمت بنسخ رابط المتصفح، سيقوم النظام بتصحيحه لك تلقائياً بنقرة واحدة!).
                </div>
              </div>

              {/* Credentials input form */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-black text-slate-800 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  <span>بيانات مشروع Supabase الخاص بك:</span>
                </h4>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-bold">
                      1. رابط المشروع (Project URL)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono" dir="ltr">
                      https://[your-project-ref].supabase.co
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="https://xxxxxxxxxxxx.supabase.co"
                    value={url}
                    onChange={e => handleUrlChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-slate-900 text-xs shadow-inner"
                    dir="ltr"
                  />

                  {/* Auto-fix Suggestion Banner */}
                  {urlSuggestion && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <p className="font-bold text-[11px]">{urlSuggestion.reason}</p>
                          <code className="text-[10px] text-amber-800 font-mono font-bold" dir="ltr">
                            {urlSuggestion.cleanedUrl}
                          </code>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCleanUrl}
                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all shrink-0"
                      >
                        إصلاح الرابط تلقائياً ✨
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 mt-1 block">
                    تأخذه من: Supabase Project Settings (أيقونة الترس) -&gt; API -&gt; Project URL
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    2. مفتاح الوصول المجهول (anon public key)
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={e => setAnonKey(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-slate-900 text-xs shadow-inner"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    تأخذه من: Supabase Project Settings -&gt; API -&gt; Project API keys -&gt; مفتاح anon (public)
                  </span>
                </div>

                {/* Test Connection Button */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>فحص الاتصال وحفظ الإعدادات</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    {copiedSql ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>نسخ كود SQL لإنشاء الجداول</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStepTab('instructions')}
                    className="px-3.5 py-2 rounded-xl text-cyan-700 hover:bg-cyan-50 font-bold text-xs transition-all flex items-center gap-1"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>كيف أجد الرابط والمفتاح؟</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-bold space-y-1.5 ${
                      testResult.success
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                        : 'bg-rose-100/70 border-rose-300 text-rose-950'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="leading-relaxed">{testResult.message}</p>
                        {testResult.fixReason && (
                          <p className="text-[11px] text-emerald-700 font-normal mt-1">
                            ℹ️ {testResult.fixReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sync Actions (Push / Pull) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Push to Supabase */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <h5 className="font-black text-slate-900 flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-emerald-600" />
                      <span>رفع ومزامنة البيانات الحالية (Push)</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      يرفع جميع الأدوية، الفواتير، الحسابات، والمصاريف المسجلة حالياً على هذا الجهاز إلى سيرفر Supabase السحابي.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePushData}
                    disabled={isSyncing || !config.url}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                      config.url
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>رفع البيانات إلى Supabase الآن</span>
                  </button>
                </div>

                {/* Pull from Supabase */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <h5 className="font-black text-slate-900 flex items-center gap-1.5">
                      <DownloadCloud className="w-4 h-4 text-indigo-600" />
                      <span>استيراد البيانات من السحابة (Pull)</span>
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      يجلب أحدث بيانات الصيدلية المخزنة على Supabase إلى جهازك (مثالي لمزامنة الآيفون مع الكمبيوتر).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePullData}
                    disabled={isSyncing || !config.url}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                      config.url
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>سحب وتحديث البيانات من Supabase</span>
                  </button>
                </div>
              </div>

              {syncStatus && (
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 text-center animate-pulse">
                  {syncStatus}
                </div>
              )}

              {/* RLS Policy Error Resolution Card */}
              {isRlsError && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    <h5 className="font-black text-sm text-rose-900">
                      حل خطأ الصلاحيات: new row violates row-level security policy for table "entities"
                    </h5>
                  </div>
                  <div className="text-xs text-rose-900 leading-relaxed space-y-1.5">
                    <p>
                      هذا التنبيه يحدث لأن سيرفر Supabase يفعّل تلقائياً جدار حماية (Row-Level Security RLS) على الجداول ويمنع أي كتابة بدون سياسة صريحة.
                    </p>
                    <p className="font-bold text-slate-900">
                      ⚡ الحل في خطوتين بسيطتين جداً (10 ثوانٍ):
                    </p>
                    <ol className="list-decimal list-inside pr-1 space-y-1 text-[11px] text-slate-800">
                      <li>اضغط على زر <strong>"نسخ كود حل RLS السريع"</strong> بالأسفل.</li>
                      <li>افتح الـ <strong>SQL Editor</strong> في Supabase، الصق الكود واضغط على زر <strong>Run</strong> الأخضر.</li>
                    </ol>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyRlsSql}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      {copiedRlsSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedRlsSql ? 'تم نسخ كود حل RLS بنجاح!' : 'نسخ كود حل RLS السريع (SQL)'}</span>
                    </button>

                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2.5 rounded-xl bg-white border border-rose-300 text-rose-800 font-bold text-xs flex items-center gap-1.5 hover:bg-rose-50 shadow-sm"
                    >
                      <span>فتح SQL Editor في Supabase</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STEP-BY-STEP INSTRUCTIONS WITH SPECIFIC STEP 3 SOLUTION */}
          {activeStepTab === 'instructions' && (
            <div className="space-y-4">
              {/* Highlight Box for Step 3 Error */}
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4 className="font-black text-sm">
                    ⚠️ حل مشكلة الخطوة 3: تنبيه (Invalid path specified in request URL)
                  </h4>
                </div>
                <div className="text-xs text-amber-900 space-y-2 leading-relaxed">
                  <p>
                    هذا التنبيه يظهر لسبب واحد شائع جداً: <strong>أنك قمت بنسخ الرابط من شريط عنوان المتصفح في الأعلى!</strong>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2.5 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-900">
                      <strong className="block mb-1 text-rose-950">❌ الرابط الخاطئ (رابط المتصفح):</strong>
                      <code className="text-[10px] break-all block" dir="ltr">
                        https://supabase.com/dashboard/project/abcdefgh...
                      </code>
                      <span className="text-[10px] text-rose-800 mt-1 block">
                        (هذا رابط صفحة لوحة التحكم ولا يعمل كـ API)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-950">
                      <strong className="block mb-1 text-emerald-950">✅ الرابط الصحيح (Project URL):</strong>
                      <code className="text-[10px] break-all block font-bold" dir="ltr">
                        https://abcdefghijklmnopqrst.supabase.co
                      </code>
                      <span className="text-[10px] text-emerald-800 mt-1 block">
                        (تأخذه من Project Settings -&gt; API)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <span className="font-black text-xs text-emerald-700 block">1. إنشاء حساب ومشروع جديد:</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    ادخل إلى <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-cyan-600 underline font-bold">Supabase.com</a> وسجل دخولك، ثم اضغط على زر <strong>"New Project"</strong>. اكتب اسم المشروع (مثلاً: <code>pharma-pro</code>) واختر كلمة سر، ثم اضغط <strong>Create project</strong> وانتظر دقيقة حتى يكتمل تجهيز القاعدة.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <span className="font-black text-xs text-emerald-700 block">2. إنشاء الجداول بنقرة واحدة (SQL Editor):</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    من القائمة اليسرى في Supabase، اضغط على أيقونة <strong>SQL Editor</strong> (تشبه <code>&gt;_</code>)، ثم اضغط <strong>New query</strong>.
                    انسخ كود SQL من التبويب الثالث هنا بالكامل، والصقه هناك واضغط على زر <strong>Run</strong> الأخضر. سيتم إنشاء جداول الأدوية والمبيعات والحسابات في ثوانٍ!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 space-y-2">
                  <span className="font-black text-xs text-emerald-900 block flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>3. نسخ الرابط والمفتاح بالشكل الصحيح الدقيق (API Keys):</span>
                  </span>
                  <ol className="list-decimal list-inside text-[11px] text-slate-800 space-y-1.5 leading-relaxed pr-1 font-medium">
                    <li>
                      في موقع Supabase، انظر إلى أقصى يسار الشاشة في الأسفل واضغط على <strong>أيقونة الترس ⚙️ (Project Settings)</strong>.
                    </li>
                    <li>
                      من القائمة الجانبية التي تفتح، اضغط على <strong>API</strong> (أو <strong>Data API</strong>).
                    </li>
                    <li>
                      ستجد مستطيلاً مكتوباً فوقه <strong>Project URL</strong> وبداخله رابط مثل:
                      <code className="mx-1 px-1.5 py-0.5 rounded bg-white border border-emerald-300 text-emerald-800 font-mono font-bold" dir="ltr">
                        https://[your-project-id].supabase.co
                      </code>
                      - اضغط على زر <strong>Copy</strong> بجانبه.
                    </li>
                    <li>
                      تحته مباشرة ستجد جدولاً بعنوان <strong>Project API Keys</strong>: ابحث عن المفتاح الذي مكتوب بجانبه <strong>anon</strong> و <strong>public</strong>، واضغط على زر <strong>Copy</strong> لنسخه بالكامل (يبدأ بـ eyJ...).
                    </li>
                  </ol>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <span className="font-black text-xs text-emerald-700 block">4. لصق البيانات في التطبيق والمزامنة:</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    ارجع لتبويب "إعدادات الربط والرفع" في هذا التطبيق، والصق الرابط في الحقل الأول، والمفتاح في الحقل الثاني، ثم اضغط <strong>"فحص الاتصال وحفظ الإعدادات"</strong> ثم <strong>"رفع البيانات إلى Supabase الآن"</strong>. مبروك! أصبحت بياناتك في السحابة ومتزامنة في الوقت الفعلي بين الآيفون والكمبيوتر!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SQL SCHEMA CODE & RLS FIX */}
          {activeStepTab === 'sql' && (
            <div className="space-y-6">
              {/* Quick RLS Fix Script Box */}
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-rose-950 text-sm flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>كود حل مشكلة الصلاحيات RLS السريع (إذا ظهر لك خطأ new row violates RLS):</span>
                    </h4>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      انسخ هذا الكود فقط والصقه في الـ SQL Editor واضغط Run لتعطيل قيود الأمان فوراً
                    </p>
                  </div>

                  <button
                    onClick={handleCopyRlsSql}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {copiedRlsSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedRlsSql ? 'تم نسخ كود RLS!' : 'نسخ كود حل RLS فقط'}</span>
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-rose-200 bg-slate-950 text-emerald-400 font-mono text-[10px] p-3 max-h-[140px] overflow-y-auto dir-ltr text-left">
                  <pre>{SUPABASE_RLS_FIX_SQL}</pre>
                </div>
              </div>

              {/* Complete SQL Schema */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-slate-800">كود SQL الشامل لإنشاء وتجهيز الجداول:</h4>
                    <p className="text-[11px] text-slate-500">يتضمن إنشاء كافة جداول الأدوية والمبيعات والحسابات مع تعطيل RLS</p>
                  </div>

                  <button
                    onClick={handleCopySql}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'تم النسخ بنجاح!' : 'نسخ الكود بالكامل'}</span>
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-100 font-mono text-[11px] p-4 max-h-[300px] overflow-y-auto dir-ltr text-left">
                  <pre>{SUPABASE_SQL_SCHEMA}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            سيرفر Supabase السحابي • إشراف وبرمجة المهندس مالك حريبات 0594345464
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

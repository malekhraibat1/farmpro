import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  Wifi,
  Cloud,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Share2,
  Server,
  Zap,
} from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { SupabaseService, SupabaseConfig } from '../services/supabaseService';
import { Entity, Medicine, SaleInvoice, FinancialTransaction, Expense, AppSettings } from '../types';

interface DeviceSyncModalProps {
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
  onOpenSupabaseConfig: () => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  entities,
  medicines,
  sales,
  transactions,
  expenses,
  settings,
  onApplyImportedData,
  onOpenSupabaseConfig,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qr_pair' | 'how_it_works' | 'wifi_lan'>('qr_pair');
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() =>
    SupabaseService.getConfig()
  );

  useEffect(() => {
    if (isOpen) {
      setSupabaseConfig(SupabaseService.getConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate pairing URL
  // If Supabase is connected, include connection parameters in query string for automatic 1-tap phone setup
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  let shareableUrl = `${currentOrigin}${currentPath}`;

  if (supabaseConfig.isConnected && supabaseConfig.url && supabaseConfig.anonKey) {
    try {
      const encodedUrl = encodeURIComponent(supabaseConfig.url);
      const encodedKey = encodeURIComponent(supabaseConfig.anonKey);
      shareableUrl = `${currentOrigin}${currentPath}?sync_url=${encodedUrl}&sync_key=${encodedKey}`;
    } catch {
      shareableUrl = `${currentOrigin}${currentPath}`;
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleTriggerSync = async () => {
    if (!supabaseConfig.isConnected) {
      setSyncFeedback('⚠️ السيرفر السحابي غير متصل بعد. يرجى إعداد سيرفر Supabase أولاً لتفعيل المزامنة المباشرة.');
      return;
    }

    setIsSyncingNow(true);
    setSyncFeedback(null);

    try {
      // 1. Pull latest data from cloud
      const pullResult = await SupabaseService.pullAllDataFromSupabase();
      if (pullResult.success && pullResult.data) {
        onApplyImportedData(pullResult.data);
        setSyncFeedback('🎉 تم التزامن بنجاح! تم تحديث كافة الفواتير والأدوية من السيرفر السحابي.');
      } else {
        // If pull empty or initial, push local data
        const pushResult = await SupabaseService.pushAllDataToSupabase(
          entities,
          medicines,
          sales,
          transactions,
          expenses,
          settings
        );
        if (pushResult.success) {
          setSyncFeedback('✅ تم رفع وتحديث بيانات الصيدلية إلى السيرفر السحابي بنجاح!');
        } else {
          setSyncFeedback(`خطأ في المزامنة: ${pushResult.message}`);
        }
      }
    } catch (e: any) {
      setSyncFeedback(`خطأ: ${e.message || 'فشلت المزامنة'}`);
    } finally {
      setIsSyncingNow(false);
      setSupabaseConfig(SupabaseService.getConfig());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <ArrowRightLeft className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  نظام التزامن المباشر الحقيقي
                </span>
                {supabaseConfig.isConnected ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>سحابي متصل</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    🟡 يحتاج ربط سحابي
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-0.5">
                ربط جهاز الكمبيوتر والهاتف على نفس الصيدلية ونفس البيانات
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 bg-slate-50/50 shrink-0 text-xs font-bold">
          <button
            onClick={() => setActiveTab('qr_pair')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all ${
              activeTab === 'qr_pair'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>مسح الـ QR والربط الفوري</span>
          </button>

          <button
            onClick={() => setActiveTab('how_it_works')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all ${
              activeTab === 'how_it_works'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>شرح الربط السحابي (Supabase)</span>
          </button>

          <button
            onClick={() => setActiveTab('wifi_lan')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-all ${
              activeTab === 'wifi_lan'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>الربط عبر شبكة Wi-Fi المحلية</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Quick sync action bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-slate-50 to-cyan-50 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 space-x-reverse">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Laptop className="w-5 h-5" />
                </div>
                <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">حالة التزامن بين الأجهزة</h4>
                <p className="text-slate-500 text-[11px]">
                  {supabaseConfig.isConnected
                    ? `متصل بقاعدة البيانات السحابية (آخر مزامنة: ${supabaseConfig.lastSyncedAt || 'الآن'})`
                    : 'النظام يعمل حالياً محلياً على هذا الجهاز فقط'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleTriggerSync}
                disabled={isSyncingNow}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingNow ? 'animate-spin' : ''}`} />
                <span>{isSyncingNow ? 'جاري المزامنة...' : 'مزامنة فورية الآن ⚡'}</span>
              </button>

              {!supabaseConfig.isConnected && (
                <button
                  onClick={onOpenSupabaseConfig}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm"
                >
                  ربط Supabase
                </button>
              )}
            </div>
          </div>

          {syncFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold animate-in fade-in ${
                syncFeedback.includes('نجاح') || syncFeedback.includes('✅')
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {syncFeedback}
            </div>
          )}

          {/* TAB 1: QR PAIRING */}
          {activeTab === 'qr_pair' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* QR Display */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-3xl border border-slate-200 text-center">
                <div className="mb-3">
                  <span className="text-[11px] font-black text-indigo-700 bg-indigo-100/70 px-3 py-1 rounded-full uppercase">
                    امسح الرمز بكاميرا الهاتف
                  </span>
                </div>

                <QRCodeDisplay value={shareableUrl} size={190} />

                <p className="text-[11px] text-slate-500 mt-3 max-w-xs leading-relaxed">
                  افتح كاميرا الآيفون أو الأندرويد ووجّهها نحو الرمز أعلاه، سيظهر لك إشعار بفتح الموقع مع كافة إعدادات التزامن فورياً!
                </p>

                <div className="mt-4 w-full flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="flex-1 p-2 rounded-xl border border-slate-200 bg-white font-mono text-[10px] text-slate-600 dir-ltr truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'تم النسخ' : 'نسخ الرابط'}</span>
                  </button>
                </div>
              </div>

              {/* Instructions steps */}
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span>خطوات الربط في دقيقة واحدة:</span>
                </h3>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-start gap-3 shadow-xs">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center shrink-0 text-xs">
                      1
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-xs">امسح رمز الـ QR بهاتفك</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        سيفتح الرابط في متصفح سفاري (Safari) على الآيفون أو كروم (Chrome) على الأندرويد.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-start gap-3 shadow-xs">
                    <div className="w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 font-black flex items-center justify-center shrink-0 text-xs">
                      2
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-xs">التثبيت كتطبيق مستقل على الشاشة</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        في الآيفون: اضغط زر المشاركة (Share) ثم <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong> ليتحول لأيقونة تطبيق سريع.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-start gap-3 shadow-xs">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center shrink-0 text-xs">
                      3
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-xs">العمل على نفس قاعدة البيانات</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        أي فاتورة يسجلها الكاشير على الكمبيوتر أو يضيفها الصيدلي بهاتفه ستُحفظ وتُزامن على الفور بين الجهازين!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                  💡 <strong>ملاحظة هامة:</strong> لضمان تحديث التغييرات في الوقت الفعلي بين الكمبيوتر والهاتف فور كتابتها، تأكد من إعداد سيرفر <strong>Supabase المجاني</strong> عبر الزر بالأعلى.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLOUD SYNC EXPLAINED */}
          {activeTab === 'how_it_works' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Cloud className="w-5 h-5" />
                  <span className="text-sm">كيف يعمل نظام الربط السحابي المركزى؟</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  برنامج فارما برو يدعم الربط السحابي مع <strong>Supabase</strong> (أقوى خدمة قواعد بيانات سحابية مفتوحة المصدر مبنية على PostgreSQL). عند ربط هذا السيرفر، يتم إنشاء قاعدة بيانات سحابية خاصة بصيدليتك وحدك، ويقوم كل من جهاز الحاسوب وهاتف الآيفون بالاتصال بنفس هذا السيرفر عبر الـ API.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    💻
                  </div>
                  <h4 className="font-bold text-slate-900">جهاز الكمبيوتر (الكاشير)</h4>
                  <p className="text-slate-500 text-[11px]">
                    المحاسب يبيع بالباركود، يصدر فواتير، ويسجل المصاريف. البيانات تُرسل فوراً للسيرفر السحابي.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    ☁️
                  </div>
                  <h4 className="font-bold text-slate-900">سيرفر Supabase السحابي</h4>
                  <p className="text-slate-500 text-[11px]">
                    يستقبل الفواتير ويحفظها بقاعدة بيانات مشفرة، ويبث التحديثات لجميع الأجهزة المرتبطة.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    📱
                  </div>
                  <h4 className="font-bold text-slate-900">هاتف الصيدلي (الآيفون)</h4>
                  <p className="text-slate-500 text-[11px]">
                    يراقب المبيعات حياً، يجرد الأدوية بكاميرا الهاتف، ويتابع الأرباح حتى وهو خارج الصيدلية!
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onOpenSupabaseConfig}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2"
                >
                  <Server className="w-4 h-4" />
                  <span>فتح نافذة إعداد وربط سيرفر Supabase السحابي</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LOCAL WI-FI / LAN */}
          {activeTab === 'wifi_lan' && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-blue-50/70 border border-blue-200 text-blue-950 space-y-3">
                <div className="flex items-center gap-2 font-black text-sm text-blue-900">
                  <Wifi className="w-5 h-5 text-blue-600" />
                  <span>طريقة الربط عبر شبكة الراوتر الداخلية (Wi-Fi Local Network)</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  إذا كان جهاز الحاسوب وهاتف الآيفون متصلين بنفس شبكة الواي فاي داخل الصيدلية، يمكنك فتح الموقع على الهاتف مباشرة باستخدام عنوان الـ IP الداخلي للحاسوب دون الحاجة لاستهلاك باقة الإنترنت.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <h4 className="font-black text-slate-900 text-xs">الخطوة 1: معرفة عنوان IP جهاز الكمبيوتر</h4>
                  <p className="text-slate-500 text-[11px]">
                    على الكمبيوتر، اضغط على زر ويندوز واكتب <strong>cmd</strong> ثم اضغط Enter واكتب الأمر:
                  </p>
                  <div className="bg-slate-900 text-emerald-400 font-mono p-2 rounded-xl text-xs dir-ltr select-all">
                    ipconfig
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    ابحث عن السطر المسمى <strong>IPv4 Address</strong> (مثال: <code className="font-mono text-indigo-600 font-bold">192.168.1.55</code>).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <h4 className="font-black text-slate-900 text-xs">الخطوة 2: تشغيل المنفذ وفتح الرابط على الهاتف</h4>
                  <p className="text-slate-500 text-[11px]">
                    افتح متصفح سفاري على هاتف الآيفون واكتب عنوان الـ IP مع رقم المنفذ:
                  </p>
                  <div className="bg-slate-100 border border-slate-200 text-slate-800 font-mono p-2 rounded-xl text-xs dir-ltr text-center font-bold">
                    http://192.168.1.55:3000
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                  <h4 className="font-black text-slate-900 text-xs">الخطوة 3: التثبيت كموقع مفضل أو تطبيق</h4>
                  <p className="text-slate-500 text-[11px]">
                    سيفتح النظام على الفور في هاتفك بسرعة الشبكة المحلية الفائقة!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            تطوير وإشراف: <strong>المهندس مالك حريبات</strong> | 0594345464
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};

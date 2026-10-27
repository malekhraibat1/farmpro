import React, { useState } from 'react';
import {
  Monitor,
  X,
  Download,
  CheckCircle2,
  Sparkles,
  Laptop,
  ArrowRight,
  ShieldCheck,
  Zap,
  Printer,
  WifiOff,
  Copy,
  ExternalLink,
  ChevronDown,
  Layers,
  HelpCircle,
  FolderDown
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacyName?: string;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({
  isOpen,
  onClose,
  pharmacyName = 'فارما برو',
}) => {
  const {
    isInstallable,
    isInstalled,
    isWindows,
    isMac,
    install,
    downloadWindowsLauncher,
    downloadDesktopShortcut,
  } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<'chrome' | 'edge' | 'mac' | 'launcher'>('chrome');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleDownloadLauncher = () => {
    downloadWindowsLauncher(pharmacyName);
    setDownloadSuccess('تم تحميل ملف المشغل (.bat) بنجاح! ضعه على سطح المكتب وافتحه بنقرة واحدة.');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  const handleDownloadShortcut = () => {
    downloadDesktopShortcut(pharmacyName);
    setDownloadSuccess('تم تحميل اختصار سطح المكتب (.url) بنجاح!');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        dir="rtl"
      >
        {/* Header with modern gradient banner */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-white/20">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  تحويل فارما برو إلى برنامج سطح مكتب
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-black">
                  Desktop App
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                يعمل كنافذة مستقلة بدون متصفح مع أيقونة ديسكتوب ودعم العمل أوفلاين
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-100 text-sm">
          {/* Standalone Status Banner */}
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-emerald-900 dark:text-emerald-200 text-sm">
                  البرنامج مثبت ويعمل كبرنامج سطح مكتب مستقل حالياً!
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                  أنت الآن داخل وضع النافذة المستقلة (Standalone Mode) بأقصى سرعة أداء، بدون أشرطة متصفح، مع إمكانية تثبيت الأيقونة على شريط المهام (Taskbar).
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/50 border border-blue-200 dark:border-indigo-900/60 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-sm">
                  <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>تثبيت البرنامج على الكمبيوتر بنقرة واحدة</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  احصل على أيقونة مباشرة على سطح المكتب وشريط المهام لتشغيل الصيدلية فوراً كأي برنامج ويندوز أو ماك.
                </p>
              </div>

              {isInstallable ? (
                <button
                  onClick={install}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white font-black text-xs shadow-md shadow-cyan-600/25 flex items-center gap-2 shrink-0 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>تثبيت الآن 💻</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold shrink-0">
                  اتبع الخطوات أدناه 👇
                </span>
              )}
            </div>
          )}

          {/* Download Success Notice */}
          {downloadSuccess && (
            <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-cyan-600" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* Quick Action Grid: Launcher & Shortcut Downloads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Windows Desktop Launcher (.bat) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs">
                  <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>مُشغّل سطح المكتب المستقل لويندوز (.bat)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  ملف تنفيذي يفتح البرنامج تلقائياً في نافذة برنامج مستقلة (App Mode) بدون شريط روابط أو تبويبات، متوافق مع كافة إصدارات ويندوز.
                </p>
              </div>
              <button
                onClick={handleDownloadLauncher}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <FolderDown className="w-4 h-4" />
                <span>تحميل المشغل المباشر (.bat)</span>
              </button>
            </div>

            {/* Desktop URL Shortcut (.url) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-cyan-400 dark:hover:border-cyan-500 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs">
                  <Download className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>اختصار سطح المكتب المباشر (.url)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  اختصار سريع تضعه مباشرة على سطح مكتب الكمبيوتر لتشغيل برنامج فارما برو بنقرة مزدوجة في أي وقت.
                </p>
              </div>
              <button
                onClick={handleDownloadShortcut}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>تحميل اختصار الديسكتوب (.url)</span>
              </button>
            </div>
          </div>

          {/* Browser Installation Guide Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs text-slate-800 dark:text-slate-200">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>طريقة التثبيت الرسمية عبر المتصفح (بدون برامج إضافية)</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('chrome')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    activeTab === 'chrome'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Chrome
                </button>
                <button
                  onClick={() => setActiveTab('edge')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    activeTab === 'edge'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Edge
                </button>
                <button
                  onClick={() => setActiveTab('mac')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                    activeTab === 'mac'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Mac (Safari)
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {activeTab === 'chrome' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-xs font-black shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        انظر إلى شريط العنوان بأعلى متصفح Chrome:
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        ستجد أيقونة شاشة كمبيوتر صغيرة <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">💻 Install App</span> في أقصى يمين أو يسار شريط الروابط.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-xs font-black shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        أو اضغط على قائمة المتصفح (الثلاث نقاط ⋮ بأعلى اليمين):
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        اختر <strong>"حفظ ومشاركة" (Save and Share)</strong> ثم اضغط على <strong>"تثبيت فارما برو" (Install Pharma Pro)</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-xs font-black shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        تثبيت على سطح المكتب وشريط المهام:
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        سيفتح البرنامج في نافذة مستقلة وتظهر أيقونة دائمة على سطح المكتب، ويمكنك الضغط بالزر الأيمن على الأيقونة في شريط المهام واختيار "تثبيت في شريط المهام" (Pin to taskbar).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'edge' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center text-xs font-black shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        في متصفح Microsoft Edge على ويندوز:
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        اضغط على أيقونة التطبيقات المربعة في شريط العنوان أو من القائمة (...) اختر <strong>التطبيقات (Apps)</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center text-xs font-black shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        اختر "تثبيت هذا الموقع كتطبيق" (Install this site as an app):
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        اضغط "تثبيت" وفعّل خيارات: <strong>إنشاء اختصار على سطح المكتب</strong> + <strong>تثبيت على شريط المهام</strong> + <strong>بدء التشغيل التلقائي مع فتح الجهاز</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'mac' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex items-center justify-center text-xs font-black shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        على أجهزة Mac بنظام macOS Sonoma والإصدارات الحديثة:
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        افتح الرابط في متصفح Safari، ثم اضغط من شريط القوائم العلوي على <strong>ملف (File)</strong> ثم اختر <strong>"إضافة إلى شريط التطبيقات" (Add to Dock)</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex items-center justify-center text-xs font-black shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        تشغيل مباشر مثل تطبيقات Mac الأصلية:
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        سيصبح فارما برو تطبيقاً مستقلاً في مجلد التطبيقات وDock مع نافذة خاصة به وإشعارات مخصصة.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Key Desktop App Advantages */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
              <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">استجابة فائقة</div>
              <div className="text-[10px] text-slate-400 mt-0.5">كاش سريع وسلس</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
              <WifiOff className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">يعمل بدون نت</div>
              <div className="text-[10px] text-slate-400 mt-0.5">حفظ محلي فوري</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
              <Printer className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">طباعة فورية</div>
              <div className="text-[10px] text-slate-400 mt-0.5">فواتير حرارية و A4</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
              <ShieldCheck className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">أمان وتشفير</div>
              <div className="text-[10px] text-slate-400 mt-0.5">بياناتك معزولة</div>
            </div>
          </div>

          {/* Copy Direct Link */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl flex items-center justify-between gap-2">
            <div className="truncate text-left text-xs font-mono text-slate-600 dark:text-slate-300 dir-ltr" dir="ltr">
              {currentUrl}
            </div>
            <button
              onClick={handleCopyUrl}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-xs"
            >
              {copiedUrl ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-300">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الرابط</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            تصميم وبرمجة: المهندس مالك حريبات • <span dir="ltr">0594345464</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all shadow-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

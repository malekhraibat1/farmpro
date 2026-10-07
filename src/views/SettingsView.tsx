import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Download,
  Upload,
  RefreshCw,
  Smartphone,
  Laptop,
  Award,
  Phone,
  Mail,
  CheckCircle2,
  KeyRound,
  FileJson,
} from 'lucide-react';
import { AppSettings, UserRole } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  currentRole: UserRole;
  onUpdateSettings: (settings: AppSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => boolean;
  onResetData: () => void;
  onOpenAbout: () => void;
  onNavigateToSuperAdmin?: () => void;
  onOpenSupabaseSync?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  currentRole,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onResetData,
  onOpenAbout,
  onNavigateToSuperAdmin,
  onOpenSupabaseSync,
}) => {
  const [pharmacyName, setPharmacyName] = useState(settings.pharmacyName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurrency] = useState(settings.currency);
  const [pincode, setPincode] = useState(settings.pincode);
  const [isPinRequired, setIsPinRequired] = useState(settings.isPinRequired);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      pharmacyName: pharmacyName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      currency: currency.trim(),
      pincode: pincode.trim(),
      isPinRequired,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        const success = onImportBackup(content);
        if (success) {
          alert('تم استعادة النسخة الاحتياطية بنجاح!');
          window.location.reload();
        } else {
          alert('حدث خطأ في قراءة ملف النسخة الاحتياطية.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700" />
          <span>إعدادات النظام والنسخ الاحتياطي والتثبيت</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          بيانات الصيدلية، حماية النظام، النسخ الاحتياطي، وطريقة التثبيت على الآيفون والكمبيوتر
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Pharmacy Info & PIN (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5"
          >
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">بيانات الصيدلية العامة</h3>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ الإعدادات بنجاح</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الصيدلية *</label>
                <input
                  type="text"
                  required
                  value={pharmacyName}
                  onChange={e => setPharmacyName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">رمز العملة المعتمدة *</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                >
                  <option value="₪">شيكل (₪)</option>
                  <option value="$">دولار ($)</option>
                  <option value="ر.س">ريال سعودي (ر.س)</option>
                  <option value="د.أ">دينار أردني (د.أ)</option>
                  <option value="ج.م">جنيه مصري (ج.م)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم هاتف الصيدلية</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">عنوان ومقر الصيدلية</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>
            </div>

            {/* Security PIN code */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-cyan-600" />
                <span>نظام الحماية وقفل الشاشة (PIN Code)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    رمز القفل السري (4 أرقام)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pincode}
                    onChange={e => setPincode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-center tracking-widest text-lg font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    الرمز الافتراضي: 1234
                  </span>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer mt-4">
                    <input
                      type="checkbox"
                      checked={isPinRequired}
                      onChange={e => setIsPinRequired(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-slate-700 font-bold">
                      طلب الرمز السري عند فتح البرنامج
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 active:scale-95 transition-all"
              >
                حفظ الإعدادات
              </button>
            </div>
          </form>

          {/* Backup & Restore Panel */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <FileJson className="w-5 h-5 text-indigo-600" />
                <span>النسخ الاحتياطي واستعادة البيانات</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تصدير كافة الحسابات، الأدوية، الفواتير، والسجلات في ملف واحد آمن، أو استعادتها
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Export */}
              <button
                type="button"
                onClick={onExportBackup}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold transition-all flex flex-col items-center gap-2 text-center"
              >
                <Download className="w-6 h-6 text-cyan-600" />
                <span>تنزيل نسخة احتياطية (JSON)</span>
              </button>

              {/* Import */}
              <label className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold transition-all flex flex-col items-center gap-2 text-center cursor-pointer">
                <Upload className="w-6 h-6 text-indigo-600" />
                <span>استعادة نسخة احتياطية</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>

              {/* Reset */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('هل أنت متأكد من إعادة ضبط البيانات إلى النماذج الافتراضية؟')) {
                    onResetData();
                  }
                }}
                className="p-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold transition-all flex flex-col items-center gap-2 text-center"
              >
                <RefreshCw className="w-6 h-6 text-rose-600" />
                <span>إعادة ضبط البيانات الأولية</span>
              </button>
            </div>
          </div>

          {/* Supabase Cloud Sync Card */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 rounded-3xl p-6 text-white shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block text-emerald-200 mb-1">
                  قاعدة البيانات السحابية والتزامن المجاني
                </span>
                <h4 className="text-lg font-black text-white">سيرفر Supabase السحابي (PostgreSQL Cloud)</h4>
                <p className="text-xs text-emerald-100 mt-0.5">
                  ربط الصيدلية بقاعدة بيانات سحابية مركزية ومزامنة فواتير الآيفون والكمبيوتر مجاناً
                </p>
              </div>

              {onOpenSupabaseSync && (
                <button
                  type="button"
                  onClick={onOpenSupabaseSync}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all shrink-0"
                >
                  إعدادات ورفع البيانات إلى Supabase
                </button>
              )}
            </div>
          </div>

          {/* Super Admin Access Card */}
          <div className="bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-600 rounded-3xl p-6 text-white shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider bg-black/20 px-2.5 py-0.5 rounded-full inline-block text-amber-100 mb-1">
                  صلاحيات السوبر أدمن والمهندس المطور
                </span>
                <h4 className="text-lg font-black text-white">بوابة التراخيص وتنشيط النسخ (م. مالك حريبات)</h4>
                <p className="text-xs text-amber-100 mt-0.5">
                  تعديل اسم الصيدلية، تنشيط وضبط مدة الاشتراك، توليد نسخ جديدة، والتحكم الشامل
                </p>
              </div>

              {onNavigateToSuperAdmin && (
                <button
                  type="button"
                  onClick={onNavigateToSuperAdmin}
                  className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs shadow-md transition-all shrink-0"
                >
                  فتح بوابة السوبر أدمن
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Installation Guides & Designer Card (1 col) */}
        <div className="space-y-6">
          {/* How to run on iPhone */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-slate-800">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black">طريقة التثبيت على الآيفون (iOS)</h4>
                <span className="text-[11px] text-slate-400">يعمل كتطبيق كامل ومستقل</span>
              </div>
            </div>

            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside pr-1">
              <li>
                افتح رابط البرنامج من متصفح <strong>سفاري (Safari)</strong> على الآيفون.
              </li>
              <li>
                اضغط على زر المشاركة <strong>(Share Icon)</strong> في أسفل الشاشة (المربع مع سهم لأعلى).
              </li>
              <li>
                اختر من القائمة <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.
              </li>
              <li>
                اضغط على <strong>"إضافة" (Add)</strong> في الزاوية العلوية.
              </li>
            </ol>
            <div className="p-2.5 rounded-xl bg-cyan-50 text-[11px] text-cyan-800 font-semibold">
              سيظهر لوغو الصيدلية فوراً على شاشة الآيفون ويفتح دون شريط المتصفح كتطبيق أصلي سريع!
            </div>
          </div>

          {/* How to run on Computer */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-slate-800">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black">طريقة التثبيت على الكمبيوتر (Windows/Mac)</h4>
                <span className="text-[11px] text-slate-400">برنامج سطح مكتب سريع</span>
              </div>
            </div>

            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside pr-1">
              <li>
                افتح الرابط في متصفح <strong>Google Chrome</strong> أو <strong>Microsoft Edge</strong>.
              </li>
              <li>
                ستجد في شريط العنوان بالأعلى أيقونة <strong>"تثبيت التطبيق" (Install App)</strong> أو من قائمة الخيارات اختر "تثبيت فارما برو".
              </li>
              <li>
                سيتم إنشاء أيقونة واختصار على سطح المكتب تفتحه بنقرة واحدة كبرنامج مستقل.
              </li>
            </ol>
          </div>

          {/* Designer Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-cyan-300 font-bold block uppercase">
                  المطور والمهندس المعتمد
                </span>
                <h4 className="text-base font-black">{settings.designerName}</h4>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/70">
              <div className="flex items-center justify-between">
                <span>هاتف / واتساب:</span>
                <a
                  href={`tel:${settings.designerPhone}`}
                  className="font-mono font-bold text-cyan-300 dir-ltr hover:underline"
                >
                  {settings.designerPhone}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span>البريد الإلكتروني:</span>
                <span className="font-mono text-slate-300 text-[11px]">{settings.designerEmail}</span>
              </div>
            </div>

            <button
              onClick={onOpenAbout}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all text-center"
            >
              عرض بطاقة التعريف والتواصل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

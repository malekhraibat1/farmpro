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
  Palette,
  ArrowRightLeft,
  QrCode,
  Sparkles,
  Sun,
  Moon,
  Check,
  Building2,
  FileSpreadsheet,
  Eye,
  Zap,
} from 'lucide-react';
import { AppSettings, UserRole } from '../types';
import { ThemeId, AVAILABLE_THEMES, ThemeService } from '../services/themeService';

interface SettingsViewProps {
  settings: AppSettings;
  currentRole: UserRole;
  currentThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => boolean;
  onResetData: () => void;
  onOpenAbout: () => void;
  onNavigateToSuperAdmin?: () => void;
  onOpenSupabaseSync?: () => void;
  onOpenDeviceSync?: () => void;
  onOpenInstanceManager?: () => void;
  onNavigateToInventory?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  currentRole,
  currentThemeId,
  onSelectTheme,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onResetData,
  onOpenAbout,
  onNavigateToSuperAdmin,
  onOpenSupabaseSync,
  onOpenDeviceSync,
  onOpenInstanceManager,
  onNavigateToInventory,
}) => {
  const [pharmacyName, setPharmacyName] = useState(settings.pharmacyName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurrency] = useState(settings.currency);
  const [pincode, setPincode] = useState(settings.pincode);
  const [isPinRequired, setIsPinRequired] = useState(settings.isPinRequired);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isContrastBoost, setIsContrastBoost] = useState<boolean>(() => ThemeService.isContrastBoost());

  const handleToggleContrastBoost = () => {
    const next = !isContrastBoost;
    setIsContrastBoost(next);
    ThemeService.setContrastBoost(next);
  };

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
          <span>إعدادات النظام، المظهر، وربط الأجهزة</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          تخصيص ثيمات البرنامج، ربط الكمبيوتر والهاتف على نفس البيانات، والنسخ الاحتياطي
        </p>
      </div>

      {/* NEW SECTION 1: THEMES AND APPEARANCE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              <span>مظهر وثيمات البرنامج ووضوح الخطوط (Themes & Legibility)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              اختر المظهر واللون المريح لعينك مع خيارات التباين العالي لشاشات الصيدليات
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-900 text-white">
              {AVAILABLE_THEMES.length} ثيمات مدمجة
            </span>
          </div>
        </div>

        {/* High Contrast Toggle Banner in Settings */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span>تعزيز سواد وسماكة الخطوط (Font Contrast Boost)</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.2 rounded-full font-bold">
                  حل فوري لعدم وضوح النصوص
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                يقوم بتحويل كافة النصوص الباهتة والأرقام إلى لون داكن جداً وحاد لتسهيل القراءة السريعة للأسعار والوصفات
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleContrastBoost}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-2 shadow-xs ${
              isContrastBoost
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isContrastBoost ? '✓ التعزيز مفعّل (الخطوط واضحة جداً)' : 'تفعيل تعزيز الخطوط'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AVAILABLE_THEMES.map((theme) => {
            const isSelected = currentThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelectTheme(theme.id)}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2.5 relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98] ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/20 shadow-md'
                    : theme.isHighContrast
                    ? 'border-slate-300 bg-white hover:border-slate-900'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-black text-slate-950 text-xs truncate">
                    {theme.name}
                  </span>
                  {theme.isDark ? (
                    <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                </div>

                {theme.isHighContrast && (
                  <span className="text-[9px] bg-slate-900 text-white font-black px-1.5 py-0.2 rounded w-fit">
                    🔍 وضوح فائق
                  </span>
                )}

                {/* Swatch dots */}
                <div className="flex items-center gap-1.5">
                  {theme.previewColors.map((col, idx) => (
                    <span
                      key={idx}
                      className="w-4 h-4 rounded-full border border-black/15 shadow-xs"
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 w-full text-[10px]">
                  <span className={isSelected ? 'font-black text-slate-950' : 'text-slate-500'}>
                    {isSelected ? '✓ نشط حالياً' : 'تفعيل'}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-slate-950 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION: MULTI-PHARMACY WORKSPACES & DATA ISOLATION */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-950 rounded-3xl p-6 text-white shadow-xl space-y-4 border border-teal-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-teal-800/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                عزل تام للبيانات 100%
              </span>
              <span className="text-xs font-bold text-teal-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                <span>نظام المقرات والنسخ المعزولة</span>
              </span>
            </div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-400" />
              <span>تخصيص نسخة خاصة لكل صيدلية مع بياناتها المعزولة</span>
            </h3>
            <p className="text-xs text-slate-300">
              تتيح لك تشغيل نسخ متعددة للصيدليات المختلفة دون أي تداخل في الأدوية أو الفواتير أو الحسابات
            </p>
          </div>

          {onOpenInstanceManager && (
            <button
              type="button"
              onClick={onOpenInstanceManager}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-teal-50 text-teal-950 font-black text-xs shadow-lg active:scale-95 transition-all shrink-0 flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>إدارة وتخصيص نسخ الصيدليات 🏢</span>
            </button>
          )}
        </div>

        {/* 3 Isolation Solutions Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
            <div className="font-bold text-teal-300 flex items-center gap-1.5">
              <span>1️⃣ روابط مخصصة (Instance URL)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              توليد رابط مباشر لكل صيدلية (كود فريد)، بحيث تفتح الصيدلية صفحتها ببياناتها الخاصة فقط على أي جهاز.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <span>2️⃣ عزل سحابي كامل (Supabase)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              ربط كل صيدلية بمشروع سحابي خاص بها مجاناً لعزل فيزيائي وتزامن أجهزة تلك الصيدلية فقط.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>3️⃣ حزم تصدير مستقلة (JSON)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              تصدير ملف النسخة الاحتياطية المهيأ للصيدلية واستيراده بنقرة واحدة على أجهزتهم بكل أمان.
            </p>
          </div>
        </div>
      </div>

      {/* NEW SECTION 2: CROSS-DEVICE SYNC & QR PAIRING */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                ميزة مطلوبة ومدمجة بالكامل
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>تزامن مباشر حقيقي</span>
              </span>
            </div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Laptop className="w-5 h-5 text-indigo-400" />
              <span>+</span>
              <Smartphone className="w-5 h-5 text-cyan-400" />
              <span>ربط جهاز الحاسوب والهاتف على نفس الموقع ونفس البيانات</span>
            </h3>
            <p className="text-xs text-slate-300">
              كيف تجعل الكاشير على الكمبيوتر وهاتف الصيدلي يفتحان نفس الصيدلية والفواتير حياً
            </p>
          </div>

          {onOpenDeviceSync && (
            <button
              type="button"
              onClick={onOpenDeviceSync}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all shrink-0 flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-cyan-200" />
              <span>فتح مركز ربط الأجهزة ومسح الـ QR ⚡</span>
            </button>
          )}
        </div>

        {/* 3 Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <span>1. الربط السحابي (Supabase)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              ربط مجاني مع سيرفر سحابي يجعل أي فاتورة تسجل على الكمبيوتر تظهر فوراً على هاتف الآيفون حتى لو كان الصيدلي في المنزل.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <span>2. الربط عبر شبكة الراوتر (Wi-Fi)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              فتح رابط الـ IP الداخلي للكمبيوتر (مثل: <code>192.168.1.50:3000</code>) على هاتف الصيدلي المتصل بنفس شبكة الواي فاي.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1.5">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span>3. مسح الـ QR السريع</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              توليد رمز QR يحتوي على كافة إعدادات التزامن ومسحه بكاميرا الهاتف لفتح النظام كتطبيق فوري دون كتابة بيانات.
            </p>
          </div>
        </div>
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

          {/* Excel Batch Import Card */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-900 rounded-3xl p-6 text-white shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block text-emerald-200 mb-1">
                  إدخال سريع ومجمّع للأصناف والأسعار
                </span>
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                  <span>استيراد وتحديث قائمة الأصناف والأسعار عبر إكسل (Excel / CSV)</span>
                </h4>
                <p className="text-xs text-emerald-100 mt-0.5">
                  إضافة قوائم الأدوية والمستحضرات مع أسعار البيع والشراء والكميات بضغطة زر واحدة من ملف الإكسل
                </p>
              </div>

              {onNavigateToInventory && (
                <button
                  type="button"
                  onClick={onNavigateToInventory}
                  className="px-5 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs shadow-md transition-all shrink-0 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>الانتقال لاستيراد الإكسل</span>
                </button>
              )}
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
                  className="px-5 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs shadow-md active:scale-95 transition-all shrink-0"
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

import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Calendar,
  Clock,
  Sparkles,
  Building,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  RefreshCw,
  Edit3,
  Sliders,
  DollarSign,
  UserCheck,
  Lock,
  Layers,
  FileCheck,
  Check,
  FileCode,
  Store,
  Phone,
  Zap,
  Share2,
  Send,
  Smartphone,
  Laptop,
  MessageSquare,
} from 'lucide-react';
import {
  AppSettings,
  LicenseInfo,
  LicensePlan,
  Entity,
  Medicine,
  SaleInvoice,
  FinancialTransaction,
} from '../types';

interface SuperAdminViewProps {
  settings: AppSettings;
  entities: Entity[];
  medicines: Medicine[];
  sales: SaleInvoice[];
  transactions: FinancialTransaction[];
  onUpdateSettings: (newSettings: AppSettings) => void;
  onUpdateEntities: (entities: Entity[]) => void;
  onUpdateMedicines: (medicines: Medicine[]) => void;
  onClearSalesAndLedgers: () => void;
  onExitSuperAdmin: () => void;
  onOpenSupabaseSync?: () => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  settings,
  entities,
  medicines,
  sales,
  transactions,
  onUpdateSettings,
  onUpdateEntities,
  onUpdateMedicines,
  onClearSalesAndLedgers,
  onExitSuperAdmin,
  onOpenSupabaseSync,
}) => {
  // Tabs inside Super Admin
  const [activeSuperTab, setActiveSuperTab] = useState<'activation' | 'pharmacy_info' | 'new_copy' | 'master_override'>('activation');

  // License state form
  const [isActivated, setIsActivated] = useState<boolean>(settings.license?.isActivated ?? true);
  const [planType, setPlanType] = useState<LicensePlan>(settings.license?.planType ?? 'annual');
  const [licenseKey, setLicenseKey] = useState<string>(
    settings.license?.licenseKey || `PHARMA-PRO-MALIK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [expiryDate, setExpiryDate] = useState<string>(settings.license?.expiryDate || '2027-10-01');
  const [clientName, setClientName] = useState<string>(settings.license?.clientName || settings.ownerName);
  const [clientPhone, setClientPhone] = useState<string>(settings.license?.clientPhone || settings.phone);
  const [licenseNotes, setLicenseNotes] = useState<string>(settings.license?.notes || '');
  const [copiedKey, setCopiedKey] = useState(false);
  const [activationSaved, setActivationSaved] = useState(false);

  // Pharmacy Details Form
  const [pharmacyName, setPharmacyName] = useState(settings.pharmacyName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurrency] = useState(settings.currency);
  const [taxRate, setTaxRate] = useState(settings.taxRate.toString());
  const [pincode, setPincode] = useState(settings.pincode);
  const [superAdminPin, setSuperAdminPin] = useState(settings.superAdminPin || '7777');
  const [infoSaved, setInfoSaved] = useState(false);

  // Provision New Pharmacy Copy Form
  const [newPharmName, setNewPharmName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPlanDuration, setNewPlanDuration] = useState<'1_month' | '3_months' | '6_months' | '1_year' | 'lifetime'>('1_year');
  const [createdCopyJson, setCreatedCopyJson] = useState<string | null>(null);

  // Quick Duration Setter helper
  const applyDuration = (days: number, plan: LicensePlan) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpiryDate(d.toISOString().split('T')[0]);
    setPlanType(plan);
    setIsActivated(true);
  };

  const applyLifetime = () => {
    setExpiryDate('2099-12-31');
    setPlanType('lifetime');
    setIsActivated(true);
  };

  // Generate random master license key
  const handleGenerateKey = () => {
    const rand1 = Math.floor(1000 + Math.random() * 9000);
    const rand2 = Math.floor(1000 + Math.random() * 9000);
    const newKey = `PHARMA-PRO-MALIK-${rand1}-${rand2}`;
    setLicenseKey(newKey);
  };

  // Save Activation Settings
  const handleSaveActivation = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedLicense: LicenseInfo = {
      isActivated,
      licenseKey,
      planType,
      startDate: settings.license?.startDate || new Date().toISOString().split('T')[0],
      expiryDate,
      pharmacyName,
      clientName,
      clientPhone,
      notes: licenseNotes,
      activatedBy: 'المهندس مالك حريبات',
    };

    onUpdateSettings({
      ...settings,
      license: updatedLicense,
    });

    setActivationSaved(true);
    setTimeout(() => setActivationSaved(false), 2500);
  };

  // Save Pharmacy Info
  const handleSavePharmacyInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      pharmacyName: pharmacyName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      currency: currency.trim(),
      taxRate: parseFloat(taxRate) || 0,
      pincode: pincode.trim(),
      superAdminPin: superAdminPin.trim(),
    });

    setInfoSaved(true);
    setTimeout(() => setInfoSaved(false), 2500);
  };

  // Create & Export New Pharmacy Instance
  const handleCreateNewCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPharmName.trim()) return;

    let daysToAdd = 365;
    let planName: LicensePlan = 'annual';
    if (newPlanDuration === '1_month') {
      daysToAdd = 30;
      planName = 'monthly';
    } else if (newPlanDuration === '3_months') {
      daysToAdd = 90;
      planName = 'quarterly';
    } else if (newPlanDuration === '6_months') {
      daysToAdd = 180;
      planName = 'biannual';
    } else if (newPlanDuration === 'lifetime') {
      daysToAdd = 36500;
      planName = 'lifetime';
    }

    const exp = new Date();
    exp.setDate(exp.getDate() + daysToAdd);
    const expDateStr = newPlanDuration === 'lifetime' ? '2099-12-31' : exp.toISOString().split('T')[0];

    const copyLicenseKey = `PHARMA-PRO-MALIK-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCopyPackage = {
      entities: [],
      medicines: medicines.slice(0, 10), // keep common medicines templates
      sales: [],
      transactions: [],
      expenses: [],
      settings: {
        ...settings,
        pharmacyName: newPharmName.trim(),
        ownerName: newOwnerName.trim() || newPharmName.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim(),
        license: {
          isActivated: true,
          licenseKey: copyLicenseKey,
          planType: planName,
          startDate: new Date().toISOString().split('T')[0],
          expiryDate: expDateStr,
          pharmacyName: newPharmName.trim(),
          clientName: newOwnerName.trim() || newPharmName.trim(),
          clientPhone: newPhone.trim(),
          notes: `نسخة مرخصة خاصة بـ ${newPharmName.trim()} صادرة من المهندس مالك حريبات`,
          activatedBy: 'المهندس مالك حريبات (0594345464)',
        },
      },
      exportedAt: new Date().toISOString(),
      generator: 'Engineer Malik Hraibat Super Admin Suite',
    };

    const jsonStr = JSON.stringify(newCopyPackage, null, 2);
    setCreatedCopyJson(jsonStr);

    // Auto download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `نسخة_صيدلية_${newPharmName.trim().replace(/\s+/g, '_')}_مرخصة.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy Key to clipboard
  const handleCopyKey = () => {
    navigator.clipboard.writeText(licenseKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const [copiedDeliveryMsg, setCopiedDeliveryMsg] = useState(false);
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);

  const buildDeliveryText = (pharm: string, owner: string, key: string, plan: string, exp: string) => {
    const origin = window.location.origin;
    const planLabel =
      plan === 'lifetime'
        ? 'دائم مدى الحياة'
        : plan === 'annual' || plan === '1_year'
        ? 'سنوي (365 يوم)'
        : plan === 'monthly' || plan === '1_month'
        ? 'شهري تجريبي (30 يوم)'
        : plan;

    return `السلام عليكم ورحمة الله د. ${owner || 'المحترم'}،
تم تجهيز وتفعيل نسختكم المرخصة من نظام فارما برو لإدارة ومحاسبة الصيدلية 🏥✨

📋 بيانات النسخة والترخيص:
- اسم الصيدلية: ${pharm}
- نوع الاشتراك: ${planLabel}
- تاريخ الصلاحية: ${exp}
- كود الترخيص: ${key}
- إشراف وتطوير: المهندس مالك حريبات (0594345464)

🔗 رابط تشغيل البرنامج المباشر (للآيفون والكمبيوتر):
${origin}

📱 خطوات التثبيت على الآيفون (iOS):
1. افتح الرابط أعلاه من متصفح سفاري (Safari).
2. اضغط على زر المشاركة أسفل الشاشة (المربع مع سهم لأعلى ⬆️).
3. اختر من القائمة "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).
(سيظهر تطبيق الصيدلية فوراً على شاشتك الرئيسية ويعمل بسرعة فائقة).

💻 خطوات التثبيت على الكمبيوتر (Windows / Mac):
1. افتح الرابط في متصفح Google Chrome أو Edge.
2. ستجد أيقونة تثبيت صغيرة 💻 بجانب شريط العنوان بالأعلى، اضغط عليها واختر "تثبيت".
(سيصبح برنامجاً مستقلاً على سطح المكتب بضغطة زر).

بالتوفيق ونتشرف دائماً بخدمتكم!`;
  };

  const handleCopyDelivery = (pharm: string, owner: string, key: string, plan: string, exp: string) => {
    const text = buildDeliveryText(pharm, owner, key, plan, exp);
    navigator.clipboard.writeText(text);
    setCopiedDeliveryMsg(true);
    setTimeout(() => setCopiedDeliveryMsg(false), 2500);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedAppUrl(true);
    setTimeout(() => setCopiedAppUrl(false), 2000);
  };

  const handleOpenWhatsApp = (targetPhone: string, pharm: string, owner: string, key: string, plan: string, exp: string) => {
    const text = buildDeliveryText(pharm, owner, key, plan, exp);
    let cleaned = targetPhone ? targetPhone.replace(/\D/g, '') : '';
    if (cleaned.startsWith('05')) {
      cleaned = '970' + cleaned.substring(1);
    }
    const waUrl = cleaned
      ? `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Calculate days left in license
  const today = new Date();
  const expD = new Date(expiryDate);
  const diffTime = expD.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6 pb-14 animate-in fade-in duration-300">
      {/* Super Admin Master Header Banner */}
      <div className="rounded-3xl bg-gradient-to-l from-amber-600 via-yellow-600 to-amber-700 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <ShieldCheck className="w-9 h-9 text-white drop-shadow" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/20 text-xs font-black tracking-wider text-amber-100 mb-1 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>لوحة تحكم السوبر أدمن • المهندس مالك حريبات</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                بوابة التراخيص والتحكم الشامل
              </h2>
              <p className="text-xs sm:text-sm text-amber-100 font-medium">
                تفعيل وتنشيط النسخ، ضبط المدة، تغيير اسم الصيدلية، وإصدار نسخ للعملاء
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSupabaseSync && (
              <button
                type="button"
                onClick={onOpenSupabaseSync}
                className="px-4 py-2.5 rounded-2xl bg-emerald-900/90 hover:bg-emerald-950 text-white font-bold text-xs backdrop-blur-md border border-emerald-400/40 shadow-md transition-all flex items-center gap-1.5"
              >
                <Zap className="w-4 h-4 text-emerald-300" />
                <span>سيرفر Supabase السحابي</span>
              </button>
            )}

            <button
              onClick={onExitSuperAdmin}
              className="px-4 py-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 text-white font-bold text-xs backdrop-blur-md border border-white/20 shadow-md transition-all flex items-center gap-2"
            >
              <span>الخروج من السوبر أدمن</span>
            </button>
          </div>
        </div>
      </div>

      {/* Super Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSuperTab('activation')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSuperTab === 'activation'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/25'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>خيار التنشيط والمدة (Licensing)</span>
        </button>

        <button
          onClick={() => setActiveSuperTab('pharmacy_info')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSuperTab === 'pharmacy_info'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/25'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>تغيير اسم وبيانات الصيدلية</span>
        </button>

        <button
          onClick={() => setActiveSuperTab('new_copy')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSuperTab === 'new_copy'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/25'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>إعطاء وتجهيز نسخة لصيدلية جديدة</span>
        </button>

        <button
          onClick={() => setActiveSuperTab('master_override')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSuperTab === 'master_override'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/25'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>التعديل الشامل وإعادة الضبط</span>
        </button>
      </div>

      {/* TAB 1: ACTIVATION & DURATION (REQUESTED SPECIFICALLY) */}
      {activeSuperTab === 'activation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Activation Controls (2 cols) */}
          <form
            onSubmit={handleSaveActivation}
            className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6"
          >
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span>تنشيط رخصة البرنامج وتحديد المدة</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحكم مباشر في حالة تشغيل البرنامج، تاريخ الانتهاء، ومفتاح الترخيص
                </p>
              </div>

              {activationSaved && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ وتطبيق التنشيط!</span>
                </span>
              )}
            </div>

            {/* Activation Switch & Status */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-amber-900 block">حالة التنشيط والترخيص</span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  عند إلغاء التنشيط، يظهر للمستخدم تنبيه لطلب التجديد من المهندس مالك حريبات
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsActivated(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActivated
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>مفعل ونشط (Active)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsActivated(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    !isActivated
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>معطل / منتهي (Inactive)</span>
                </button>
              </div>
            </div>

            {/* Quick Duration Buttons (شهر، 3 أشهر، 6 أشهر، سنة، دائم) */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">
                المدة وخيارات التنشيط السريعة:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => applyDuration(30, 'monthly')}
                  className={`p-3 rounded-2xl border font-bold text-xs text-center transition-all ${
                    planType === 'monthly'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                  <span>شهر واحد (30 يوم)</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyDuration(90, 'quarterly')}
                  className={`p-3 rounded-2xl border font-bold text-xs text-center transition-all ${
                    planType === 'quarterly'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                  <span>3 أشهر (90 يوم)</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyDuration(180, 'biannual')}
                  className={`p-3 rounded-2xl border font-bold text-xs text-center transition-all ${
                    planType === 'biannual'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                  <span>6 أشهر (نصف سنوي)</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyDuration(365, 'annual')}
                  className={`p-3 rounded-2xl border font-bold text-xs text-center transition-all ${
                    planType === 'annual'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Calendar className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                  <span>سنة كاملة (365 يوم)</span>
                </button>

                <button
                  type="button"
                  onClick={applyLifetime}
                  className={`p-3 rounded-2xl border font-bold text-xs text-center transition-all ${
                    planType === 'lifetime'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span>دائم (مدى الحياة)</span>
                </button>
              </div>
            </div>

            {/* Custom Expiry Date and License Key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  تاريخ انتهاء الترخيص المحدد (Expiry Date) *
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">
                    مفتاح الترخيص (License Key) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    className="text-[11px] text-amber-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>توليد كود جديد</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    required
                    value={licenseKey}
                    onChange={e => setLicenseKey(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-800 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="نسخ المفتاح"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  اسم العميل / الصيدلي المرخص له
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  هاتف العميل المسجل
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                ملاحظات الترخيص والشروط
              </label>
              <input
                type="text"
                placeholder="مثال: دفعة سنوية مسددة، مشمول الدعم الفني والتحديثات..."
                value={licenseNotes}
                onChange={e => setLicenseNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-black text-xs shadow-lg shadow-amber-600/25 active:scale-95 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ وتطبيق التنشيط على هذه النسخة</span>
              </button>
            </div>
          </form>

          {/* License Status Overview Card (1 col) */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs text-amber-300 font-bold">بطاقة رخصة النسخة</span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                    isActivated ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {isActivated ? 'مرخص ونشط' : 'غير مفعل'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">الصيدلية الحالية</span>
                <h4 className="text-lg font-black text-white mt-0.5">{settings.pharmacyName}</h4>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">الخطة:</span>
                  <span className="text-amber-300 font-bold uppercase">{planType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">تاريخ الانتهاء:</span>
                  <span className="text-white font-bold">{expiryDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">الأيام المتبقية:</span>
                  <span
                    className={`font-black ${
                      planType === 'lifetime'
                        ? 'text-emerald-400'
                        : daysLeft > 30
                        ? 'text-emerald-400'
                        : daysLeft > 0
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {planType === 'lifetime' ? 'دائم مدى الحياة' : `${daysLeft} يوماً`}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 pt-2 border-t border-white/10">
                <span className="text-slate-400 block mb-1">كود الترخيص:</span>
                <span className="font-mono text-xs text-amber-200 bg-white/10 px-2 py-1 rounded-lg block truncate">
                  {licenseKey}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 pt-1">
                صادر ومعتمد حصرياً بواسطة {settings.designerName} ({settings.designerPhone})
              </div>
            </div>

            {/* Quick Tips */}
            <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <h5 className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>ملاحظة للمهندس مالك:</span>
              </h5>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                أي تعديل على المدة أو التنشيط يتم حفظه فوراً في النظام. يمكنك إعطاء الصيدلية شهراً تجريبياً أو سنة أو ترخيصاً دائماً مدى الحياة بنقرة واحدة.
              </p>
            </div>

            {/* Quick Share / Delivery to Client Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h5 className="font-black text-slate-800 text-xs flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>تسليم ومشاركة النسخة للزبون 📲</span>
                </h5>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  جاهز للإرسال
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                أرسل رابط البرنامج المباشر مع بيانات التفعيل الكاملة وخطوات التثبيت للآيفون والكمبيوتر لعميلك بنقرة واحدة عبر واتساب:
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    handleOpenWhatsApp(clientPhone, pharmacyName, clientName, licenseKey, planType, expiryDate)
                  }
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال بيانات النسخة عبر واتساب 📲</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyDelivery(pharmacyName, clientName, licenseKey, planType, expiryDate)
                    }
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copiedDeliveryMsg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDeliveryMsg ? 'تم نسخ الرسالة!' : 'نسخ الرسالة الكاملة'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copiedAppUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAppUrl ? 'تم نسخ الرابط!' : 'نسخ الرابط فقط'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PHARMACY INFO & MASTER CLIENT SETTINGS */}
      {activeSuperTab === 'pharmacy_info' && (
        <form
          onSubmit={handleSavePharmacyInfo}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 max-w-3xl"
        >
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-600" />
                <span>تعديل اسم وبيانات الصيدلية (صلاحية السوبر أدمن)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تغيير الاسم الذي يظهر في الفواتير والتقارير والشاشات بالكامل
              </p>
            </div>

            {infoSaved && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم تعديل وحفظ بيانات الصيدلية</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم الصيدلية الرسمي *</label>
              <input
                type="text"
                required
                value={pharmacyName}
                onChange={e => setPharmacyName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم المالك / الصيدلي المسؤول</label>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">هاتف الصيدلية</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">العنوان والمقر</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">العملة الأساسية</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800"
              >
                <option value="₪">شيكل (₪)</option>
                <option value="$">دولار ($)</option>
                <option value="ر.س">ريال سعودي (ر.س)</option>
                <option value="د.أ">دينار أردني (د.أ)</option>
                <option value="ج.م">جنيه مصري (ج.م)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">نسبة الضريبة المضافة (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800"
              />
            </div>
          </div>

          {/* Master PINs */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                رمز PIN العادي للموظفين (4 أرقام)
              </label>
              <input
                type="password"
                maxLength={4}
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-center tracking-widest text-base font-bold"
              />
            </div>

            <div>
              <label className="block text-amber-800 font-bold mb-1">
                رمز PIN السوبر أدمن السري (Master Key)
              </label>
              <input
                type="password"
                maxLength={6}
                value={superAdminPin}
                onChange={e => setSuperAdminPin(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50/50 font-mono text-center tracking-widest text-base font-black text-amber-900"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PROVISION NEW PHARMACY INSTANCE / COPY */}
      {activeSuperTab === 'new_copy' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 max-w-3xl">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-600" />
              <span>إعطاء وتجهيز نسخة مرخصة لصيدلية جديدة</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              أنشئ حزمة مرخصة وجاهزة لأي صيدلية عميل، تشتمل على الاسم، الترخيص، المدة، وقوالب الأدوية، وحمل ملفها بنقرة واحدة
            </p>
          </div>

          <form onSubmit={handleCreateNewCopy} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  اسم الصيدلية الجديدة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: صيدلية الشفاء الحديثة"
                  value={newPharmName}
                  onChange={e => setNewPharmName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  اسم الصيدلي المسؤول / المشتري
                </label>
                <input
                  type="text"
                  placeholder="مثال: د. خليل عيسى"
                  value={newOwnerName}
                  onChange={e => setNewOwnerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم هاتف الصيدلية</label>
                <input
                  type="tel"
                  placeholder="059xxxxxxx"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">المدينة والمقر</label>
                <input
                  type="text"
                  placeholder="الخليل - الشارع العام"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                المدة والترخيص الممنوح لهذه النسخة:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: '1_month', label: 'شهر واحد (تجريبي)' },
                  { id: '3_months', label: '3 أشهر' },
                  { id: '6_months', label: '6 أشهر' },
                  { id: '1_year', label: 'سنة كاملة (365 يوم)' },
                  { id: 'lifetime', label: 'مدى الحياة (دائم)' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNewPlanDuration(item.id as any)}
                    className={`p-2.5 rounded-xl border font-bold text-xs text-center transition-all ${
                      newPlanDuration === item.id
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>توليد وتنزيل ملف النسخة الجديدة فوراً</span>
              </button>
            </div>
          </form>

          {createdCopyJson && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-sm">تم إنشاء وتنزيل ملف النسخة المرخصة بنجاح!</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                الملف تم تحميله تلقائياً لجهازك. يمكنك إرساله للعميل بالواتساب مع رابط البرنامج المباشر، وكل ما عليه فعله هو فتح البرنامج على هاتفه أو كمبيوتره والذهاب لـ <strong>الإعدادات -&gt; استعادة نسخة احتياطية</strong> واختيار الملف!
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-emerald-200/70">
                <button
                  type="button"
                  onClick={() =>
                    handleOpenWhatsApp(newPhone, newPharmName, newOwnerName, 'مرفق مع الملف', newPlanDuration, 'محدد بالملف')
                  }
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال رسالة التثبيت للعميل عبر واتساب 📲</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyDelivery(newPharmName, newOwnerName, 'مرفق مع ملف النسخة', newPlanDuration, 'محدد بالملف')
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-100/50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ رسالة التسليم</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-100/50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ رابط البرنامج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MASTER OVERRIDE & RESET */}
      {activeSuperTab === 'master_override' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 max-w-3xl">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-600" />
              <span>أدوات التعديل الشامل وتصفير البيانات</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              صلاحيات السوبر أدمن لتعديل الأرصدة، تفريغ الفواتير، وتجهيز قاعدة البيانات
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Reset All Entities Balances */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-slate-800">تصفير كافة أرصدة الحسابات والشركات</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  جعل رصيد جميع الصيدليات والشركات والزبائن صفراً (0.00) دون حذف أسمائهم
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('هل أنت متأكد من تصفير أرصدة جميع الحسابات؟')) {
                    const updated = entities.map(e => ({ ...e, currentBalance: 0 }));
                    onUpdateEntities(updated);
                    alert('تم تصفير الأرصدة بنجاح.');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition-colors"
              >
                تصفير الأرصدة
              </button>
            </div>

            {/* Clear Sales & Vouchers (Clean Slate for New Pharmacy) */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-black text-rose-900">حذف كافة فواتير المبيعات وسجل القيود</h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  مسح كافة فواتير الكاشير والحركات المالية القديمة لبدء سجل محاسبي نظيف مع الحفاظ على الأدوية
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('تحذير: هل أنت متأكد من حذف كافة فواتير المبيعات وسجلات القيود؟')) {
                    onClearSalesAndLedgers();
                    alert('تم تنظيف سجل الفواتير والقيود.');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 transition-colors"
              >
                تفريغ الفواتير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

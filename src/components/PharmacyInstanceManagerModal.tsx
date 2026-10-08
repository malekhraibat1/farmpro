import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Plus,
  Check,
  Copy,
  ExternalLink,
  Trash2,
  Layers,
  ShieldCheck,
  Database,
  QrCode,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Smartphone,
  Laptop,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { InstanceService, PharmacyInstance } from '../services/instanceService';
import { AppStorage } from '../services/storage';
import { AppSettings, UserRole } from '../types';
import { QRCodeDisplay } from './QRCodeDisplay';

interface PharmacyInstanceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstanceSwitched: (newInstanceId: string) => void;
  currentSettings: AppSettings;
  currentRole?: UserRole;
}

export function PharmacyInstanceManagerModal({
  isOpen,
  onClose,
  onInstanceSwitched,
  currentSettings,
  currentRole,
}: PharmacyInstanceManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'create' | 'list' | 'guide'>('current');
  const [instances, setInstances] = useState<PharmacyInstance[]>([]);
  const [activeInstanceId, setActiveInstanceId] = useState<string>('default');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQRForInstance, setShowQRForInstance] = useState<PharmacyInstance | null>(null);

  // New instance form state
  const [formPharmacyName, setFormPharmacyName] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formBranchName, setFormBranchName] = useState('الفرع الرئيسي');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formInitEmpty, setFormInitEmpty] = useState(true);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadInstances = () => {
    const list = InstanceService.getInstances();
    const currentId = InstanceService.getActiveInstanceId();
    setInstances(list);
    setActiveInstanceId(currentId);
  };

  useEffect(() => {
    if (isOpen) {
      loadInstances();
      setFormError('');
      setFormSuccess('');
      // Suggest random code for new form
      setFormCode(`PH-${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentInstance =
    instances.find(i => i.id === activeInstanceId) || InstanceService.getActiveInstance();
  const currentStats = AppStorage.getInstanceStats(activeInstanceId);
  const currentDirectUrl = InstanceService.buildInstanceUrl(activeInstanceId);

  const handleCopyDirectLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCreateInstance = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formPharmacyName.trim()) {
      setFormError('يرجى كتابة اسم الصيدلية');
      return;
    }
    if (!formOwnerName.trim()) {
      setFormError('يرجى كتابة اسم الصيدلي أو المالك');
      return;
    }

    try {
      const newInst = InstanceService.createInstance({
        pharmacyName: formPharmacyName.trim(),
        branchName: formBranchName.trim(),
        ownerName: formOwnerName.trim(),
        phone: formPhone.trim() || '0590000000',
        address: formAddress.trim(),
        customCode: formCode.trim().toUpperCase(),
        initEmpty: formInitEmpty,
      });

      // Prepare custom settings for this instance
      const customSettings: AppSettings = {
        ...currentSettings,
        pharmacyName: newInst.pharmacyName,
        ownerName: newInst.ownerName,
        phone: newInst.phone,
        address: newInst.address || currentSettings.address,
        license: {
          ...currentSettings.license,
          pharmacyName: newInst.pharmacyName,
          clientName: newInst.ownerName,
          clientPhone: newInst.phone,
          licenseKey: `LIC-${newInst.code}-${Date.now().toString().slice(-4)}`,
        },
      };

      // Initialize storage partition for this instance
      AppStorage.initInstanceData(newInst.id, customSettings, !formInitEmpty);

      // Auto-switch to newly created instance
      InstanceService.setActiveInstanceId(newInst.id);
      loadInstances();

      setFormSuccess(`تم إنشاء نسخة "${newInst.pharmacyName}" بنجاح وتفعيلها!`);
      setTimeout(() => {
        onInstanceSwitched(newInst.id);
        setActiveTab('current');
      }, 1000);
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء إنشاء النسخة');
    }
  };

  const handleSwitchInstance = (instanceId: string) => {
    if (instanceId === activeInstanceId) return;
    InstanceService.setActiveInstanceId(instanceId);
    loadInstances();
    onInstanceSwitched(instanceId);
  };

  const handleDeleteInstance = (instanceId: string) => {
    if (instanceId === 'default') {
      alert('لا يمكن حذف النسخة الرئيسية الافتراضية.');
      return;
    }
    const success = InstanceService.deleteInstance(instanceId);
    if (success) {
      loadInstances();
      setConfirmDeleteId(null);
      if (activeInstanceId === instanceId) {
        onInstanceSwitched('default');
      }
    }
  };

  const handleExportBundle = (instance: PharmacyInstance) => {
    const backupJson = AppStorage.exportFullBackup(instance.id);
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `نسخة_صيدلية_${instance.pharmacyName}_${instance.code}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-teal-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-md shadow-teal-600/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  تخصيص وعزل النسخ لكل صيدلية
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  Data Isolation System
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تخصيص نسخة مستقلة تماماً لكل صيدلية مع بياناتها الخاصة، بدون تداخل السجلات أو الحسابات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/60 dark:bg-slate-900/50 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('current')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'current'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            النسخة النشطة حالياً
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'create'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            إنشاء نسخة لصيدلية جديدة
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'list'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            قائمة النسخ المحفوظة ({instances.length})
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Info className="w-4 h-4" />
            طرق واستراتيجيات العزل التام
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: CURRENT ACTIVE INSTANCE */}
          {activeTab === 'current' && (
            <div className="space-y-6">
              {/* Active Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-transparent border border-teal-200 dark:border-teal-800/70 relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                        النسخة المفعلة الآن على هذا الجهاز
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold">
                        كود: {currentInstance.code}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                      {currentSettings.pharmacyName || currentInstance.pharmacyName}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-3">
                      <span>المالك / المدير: <strong>{currentSettings.ownerName || currentInstance.ownerName}</strong></span>
                      <span>•</span>
                      <span>الهاتف: <strong dir="ltr">{currentSettings.phone || currentInstance.phone}</strong></span>
                      {currentInstance.branchName && (
                        <>
                          <span>•</span>
                          <span>الفرع: <strong>{currentInstance.branchName}</strong></span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleExportBundle(currentInstance)}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-600" />
                      تصدير حزمة الصيدلية
                    </button>
                    <button
                      onClick={() => setShowQRForInstance(currentInstance)}
                      className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-teal-600/30 transition"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      عرض الباركود السريع QR
                    </button>
                  </div>
                </div>

                {/* Statistics of Current Instance */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-teal-100 dark:border-teal-900/40">
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="text-xs text-slate-500 dark:text-slate-400">الأدوية المسجلة بالنسخة</div>
                    <div className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                      {currentStats.medicinesCount} دواء
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="text-xs text-slate-500 dark:text-slate-400">فواتير المبيعات</div>
                    <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                      {currentStats.salesCount} فاتورة
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="text-xs text-slate-500 dark:text-slate-400">الشركات والعملاء</div>
                    <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      {currentStats.entitiesCount} جهة
                    </div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="text-xs text-slate-500 dark:text-slate-400">الحركات المالية المسجلة</div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                      {currentStats.transactionsCount} حركة
                    </div>
                  </div>
                </div>
              </div>

              {/* Dedicated Launch Link */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      الرابط المباشر الخاص بهذه الصيدلية
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      يمكنك إرسال هذا الرابط إلى الصيدلية أو فتحه على هاتفهم ليقوم النظام بتحميل بياناتهم المعزولة فوراً
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentDirectUrl}
                    dir="ltr"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none"
                  />
                  <button
                    onClick={() => handleCopyDirectLink(currentDirectUrl)}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition whitespace-nowrap"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'تم النسخ!' : 'نسخ الرابط'}
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setActiveTab('create')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-teal-500 cursor-pointer transition flex items-center gap-4 group"
                >
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-xl group-hover:scale-105 transition">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                      تخصيص نسخة جديدة لصيدلية أخرى
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      إنشاء قاعدة بيانات فارغة ومستقلة تماماً لصيدلية جديدة
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('list')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-cyan-500 cursor-pointer transition flex items-center gap-4 group"
                >
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 rounded-xl group-hover:scale-105 transition">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                      إدارة والتبديل بين الصيدليات المحفوظة
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      الانتقال بنقرة واحدة إلى أي صيدلية مسجلة على هذا النظام
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE NEW PHARMACY INSTANCE */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateInstance} className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <p className="font-bold">كيف تعمل النسخة المستقلة للصيدلية؟</p>
                  <p>
                    سيتم إنشاء حاوية بيانات معزولة تماماً (Isolated Storage Container) خاصة بهذه الصيدلية. كل الأدوية والفواتير والعملاء وحسابات الديون ستكون معزولة 100% ولن تظهر في أي صيدلية أخرى.
                  </p>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الصيدلية الجديدة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPharmacyName}
                    onChange={e => setFormPharmacyName(e.target.value)}
                    placeholder="مثال: صيدلية الأمل المركزية"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الصيدلي المسؤول أو المالك <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formOwnerName}
                    onChange={e => setFormOwnerName(e.target.value)}
                    placeholder="مثال: د. أحمد التميمي"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    كود النسخة الفريد (Instance Code)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formCode}
                      onChange={e => setFormCode(e.target.value.toUpperCase())}
                      placeholder="مثال: AMAL-01"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono focus:border-teal-500 outline-none uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => setFormCode(`PH-${Math.floor(100 + Math.random() * 900)}`)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs hover:bg-slate-200 transition"
                      title="توليد كود تلقائي"
                    >
                      توليد
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الفرع أو المنطقة
                  </label>
                  <input
                    type="text"
                    value={formBranchName}
                    onChange={e => setFormBranchName(e.target.value)}
                    placeholder="مثال: فرع دورا / وسط البلد"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهاتف للتواصل
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="مثال: 0599123456"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    العنوان والموقع
                  </label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={e => setFormAddress(e.target.value)}
                    placeholder="مثال: الخليل - شارع السلام"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Data Initialization Choice */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  خيار بدء بيانات النسخة:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormInitEmpty(true)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      formInitEmpty
                        ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="initData"
                      checked={formInitEmpty}
                      onChange={() => setFormInitEmpty(true)}
                      className="mt-1 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>🟢 قاعدة بيانات فارغة تماماً</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                          موصى به
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        تبدأ الصيدلية من الصفر بـ 0 أدوية، 0 فواتير، و0 حسابات، لتسجيل بياناتها الخاصة حصراً.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormInitEmpty(false)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      !formInitEmpty
                        ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="initData"
                      checked={!formInitEmpty}
                      onChange={() => setFormInitEmpty(false)}
                      className="mt-1 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        📦 تضمين دليل الأدوية الأساسي الشائع
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        يبدأ النظام بقائمة الأدوية الشائعة لتسهيل العمل فوراً، مع تصفير جميع المبيعات والديون والحسابات.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  إنشاء وتفعيل نسخة الصيدلية فوراً
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LIST OF ALL SAVED INSTANCES */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  جميع نسخ الصيدليات المسجلة على هذا المتصفح ({instances.length})
                </h4>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة صيدلية جديدة
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {instances.map(inst => {
                  const isActive = inst.id === activeInstanceId;
                  const stats = AppStorage.getInstanceStats(inst.id);
                  const instUrl = InstanceService.buildInstanceUrl(inst.id);

                  return (
                    <div
                      key={inst.id}
                      className={`p-4 rounded-xl border transition ${
                        isActive
                          ? 'border-teal-500 bg-teal-50/30 dark:bg-teal-950/20 shadow-md ring-1 ring-teal-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900 dark:text-white text-base">
                              {inst.pharmacyName}
                            </h5>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {inst.code}
                            </span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                نشطة الآن
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                            <span>المالك: <strong>{inst.ownerName}</strong></span>
                            <span>•</span>
                            <span>الهاتف: <strong dir="ltr">{inst.phone}</strong></span>
                            {inst.branchName && (
                              <>
                                <span>•</span>
                                <span>{inst.branchName}</span>
                              </>
                            )}
                          </div>

                          {/* Quick Stats Badges */}
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              💊 {stats.medicinesCount} دواء
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              🧾 {stats.salesCount} فاتورة
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              🤝 {stats.entitiesCount} جهة
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                          {!isActive ? (
                            <button
                              onClick={() => handleSwitchInstance(inst.id)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              التبديل لهذه الصيدلية
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                              قيد الاستخدام
                            </span>
                          )}

                          <button
                            onClick={() => handleCopyDirectLink(instUrl)}
                            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            title="نسخ الرابط المباشر لهذه الصيدلية"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setShowQRForInstance(inst)}
                            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            title="عرض باركود QR للفتح على الهاتف"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleExportBundle(inst)}
                            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            title="تصدير ملف النسخة الاحتياطية"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {inst.id !== 'default' && (
                            confirmDeleteId === inst.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDeleteInstance(inst.id)}
                                  className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-bold"
                                >
                                  تأكيد الحذف
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px]"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(inst.id)}
                                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                title="حذف هذه النسخة وبياناتها"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DATA ISOLATION GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-6 text-sm">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 border border-teal-200 dark:border-teal-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  3 طرق معتمدة لجعل كل نسخة خاصة مع بياناتها التامة
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  سواء كنت توزع النظام على عدة صيدليات مختلفة أو تدير عدة فروع لنفس الصيدلية، إليك أفضل الخيارات:
                </p>
              </div>

              {/* Method 1 */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    الطريقة الفورية: الروابط المعزولة (Dedicated Instance URLs)
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pr-10">
                  النظام يدعم الآن فتح كل صيدلية عبر رابط مباشر بمعرفها الخاص:
                  <br />
                  <code className="text-teal-600 font-mono text-xs" dir="ltr">
                    https://ais-dev-...app/?instance=كود_الصيدلية
                  </code>
                  <br />
                  بمجرد فتح هذا الرابط على هاتف أو كمبيوتر الصيدلية، تُعزل بياناتها تلقائياً بالكامل في حاوية تخزين محلية منفصلة ولا تتأثر بأي صيدلية أخرى.
                </p>
              </div>

              {/* Method 2 */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-cyan-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    طريقة العزل السحابي الفيزيائي 100% (Independent Supabase Project)
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pr-10">
                  Supabase يقدم حسابات مجانية غير محدودة. يمكنك إنشاء مشروع سحابي مجاني خاص لكل صيدلية وإدخال الرابط والمفتاح في تبويب <strong>"ربط ومزامنة الأجهزة"</strong>.
                  <br />
                  بهذه الطريقة، تملك كل صيدلية قاعدة بيانات فيزيائية سحابية خاصة بها بنسبة 100%، وتستطيع أجهزة الصيدلية (الكمبيوتر + هواتف الصيادلة) المزامنة اللحظية فيما بينها فقط.
                </p>
              </div>

              {/* Method 3 */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    طريقة حزم التصدير والاستيراد (Standalone Portable Backup)
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pr-10">
                  يمكنك تجهيز أدوية وإعدادات صيدلية معينة على جهازك، ثم الضغط على <strong>"تصدير حزمة الصيدلية"</strong> وإرسال ملف JSON للصيدلية لتقوم باستيراده بنقرة واحدة عبر صفحة الإعدادات، فيعمل النظام معزولاً ومستقلاً تماماً على أجهزتهم.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>نظام عزل البيانات الصيدلانية - معتمد ومطور بواسطة المهندس مالك حريبات</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>

      {/* QR Code Popup for a specific pharmacy instance */}
      {showQRForInstance && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                باركود تشغيل {showQRForInstance.pharmacyName}
              </span>
              <button
                onClick={() => setShowQRForInstance(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              امسح الباركود بكاميرا الهاتف لفتح هذه النسخة الخاصة مباشرة مع بياناتها المعزولة:
            </p>

            <div className="flex justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-inner">
              <QRCodeDisplay
                value={InstanceService.buildInstanceUrl(showQRForInstance.id)}
                size={220}
              />
            </div>

            <div className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg break-all" dir="ltr">
              {InstanceService.buildInstanceUrl(showQRForInstance.id)}
            </div>

            <button
              onClick={() => {
                handleCopyDirectLink(InstanceService.buildInstanceUrl(showQRForInstance.id));
              }}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <Copy className="w-4 h-4" />
              نسخ الرابط المباشر
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

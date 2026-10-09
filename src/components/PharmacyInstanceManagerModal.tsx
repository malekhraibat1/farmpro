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
  User,
  KeyRound,
  Eye,
  EyeOff,
  Cloud,
  Server,
  HardDrive,
  Code2,
} from 'lucide-react';
import { InstanceService, PharmacyInstance } from '../services/instanceService';
import { AppStorage } from '../services/storage';
import { AppSettings, UserRole } from '../types';
import { QRCodeDisplay } from './QRCodeDisplay';
import {
  SupabaseService,
  SUPABASE_SQL_SCHEMA,
  SUPABASE_RLS_FIX_SQL,
  cleanAndValidateSupabaseUrl,
} from '../services/supabaseService';

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
  const [activeTab, setActiveTab] = useState<'current' | 'create' | 'list' | 'guide' | 'supabase'>('current');
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
  const [formUsername, setFormUsername] = useState('admin');
  const [formPassword, setFormPassword] = useState('123456');
  const [formIsProtected, setFormIsProtected] = useState(true);
  const [formInitEmpty, setFormInitEmpty] = useState(true);
  const [formSupabaseUrl, setFormSupabaseUrl] = useState('');
  const [formSupabaseAnonKey, setFormSupabaseAnonKey] = useState('');
  const [showFormSupabase, setShowFormSupabase] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Edit Supabase config modal state for any instance
  const [editingSupabaseInstance, setEditingSupabaseInstance] = useState<PharmacyInstance | null>(null);
  const [editSupabaseUrl, setEditSupabaseUrl] = useState('');
  const [editSupabaseAnonKey, setEditSupabaseAnonKey] = useState('');
  const [editSupabaseTesting, setEditSupabaseTesting] = useState(false);
  const [editSupabaseTestResult, setEditSupabaseTestResult] = useState<{
    success: boolean;
    message: string;
    correctedUrl?: string;
  } | null>(null);
  const [editSupabaseSuccess, setEditSupabaseSuccess] = useState('');

  // SQL code copy states
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRlsSql, setCopiedRlsSql] = useState(false);

  // Edit credentials state for active instance
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsProtected, setEditIsProtected] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

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
      // Suggest random code and credentials for new form
      setFormCode(`PH-${Math.floor(100 + Math.random() * 900)}`);
      setFormUsername('admin');
      setFormPassword(`${Math.floor(100000 + Math.random() * 900000)}`);
      setFormIsProtected(true);
      setIsEditingCredentials(false);
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
        username: formUsername.trim() || 'admin',
        password: formPassword.trim() || '123456',
        isProtected: formIsProtected,
        initEmpty: formInitEmpty,
        supabaseConfig:
          showFormSupabase && formSupabaseUrl.trim() && formSupabaseAnonKey.trim()
            ? {
                url: formSupabaseUrl.trim(),
                anonKey: formSupabaseAnonKey.trim(),
              }
            : undefined,
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

  const handleOpenConfigureSupabase = (inst: PharmacyInstance) => {
    setEditingSupabaseInstance(inst);
    setEditSupabaseUrl(inst.supabaseConfig?.url || '');
    setEditSupabaseAnonKey(inst.supabaseConfig?.anonKey || '');
    setEditSupabaseTestResult(null);
    setEditSupabaseSuccess('');
  };

  const handleTestSupabaseForInstance = async () => {
    if (!editSupabaseUrl.trim() || !editSupabaseAnonKey.trim()) {
      setEditSupabaseTestResult({
        success: false,
        message: 'يرجى إدخال رابط المشروع والمفتاح العام أولاً.',
      });
      return;
    }
    setEditSupabaseTesting(true);
    setEditSupabaseTestResult(null);
    const res = await SupabaseService.testConnection(editSupabaseUrl, editSupabaseAnonKey);
    setEditSupabaseTesting(false);
    setEditSupabaseTestResult(res);
    if (res.correctedUrl && res.correctedUrl !== editSupabaseUrl) {
      setEditSupabaseUrl(res.correctedUrl);
    }
  };

  const handleSaveSupabaseForInstance = () => {
    if (!editingSupabaseInstance) return;
    const url = editSupabaseUrl.trim();
    const key = editSupabaseAnonKey.trim();

    if (url && !key) {
      alert('يرجى إدخال المفتاح العام (anon key) أو مسح الرابط.');
      return;
    }

    const { cleanedUrl } = cleanAndValidateSupabaseUrl(url);
    const finalConfig = url && key ? { url: cleanedUrl || url, anonKey: key } : undefined;

    InstanceService.updateInstanceSupabase(editingSupabaseInstance.id, finalConfig);
    loadInstances();
    setEditSupabaseSuccess('تم حفظ إعدادات السيرفر السحابي لهذه الصيدلية بنجاح!');
    setTimeout(() => {
      setEditingSupabaseInstance(null);
      setEditSupabaseSuccess('');
    }, 1200);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyRlsFixSql = () => {
    navigator.clipboard.writeText(SUPABASE_RLS_FIX_SQL);
    setCopiedRlsSql(true);
    setTimeout(() => setCopiedRlsSql(false), 2500);
  };

  const handleOpenEditCredentials = () => {
    if (currentInstance) {
      setEditUsername(currentInstance.username || 'admin');
      setEditPassword(currentInstance.password || '123456');
      setEditIsProtected(currentInstance.isProtected !== false);
      setIsEditingCredentials(true);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    InstanceService.updateInstance(activeInstanceId, {
      username: editUsername.trim() || 'admin',
      password: editPassword.trim() || '123456',
      isProtected: editIsProtected,
    });
    loadInstances();
    setIsEditingCredentials(false);
  };

  const handleCopyLinkWithCredentials = (inst: PharmacyInstance) => {
    const url =
      inst.supabaseConfig?.url && inst.supabaseConfig?.anonKey
        ? InstanceService.buildInstanceUrlWithSync(inst.id)
        : InstanceService.buildInstanceUrl(inst.id);
    const cloudInfo = inst.supabaseConfig?.url
      ? `\n☁️ السيرفر السحابي الخاص: متصل ومستقل (${inst.supabaseConfig.url})\n⚡ ميزة: يتصل تلقائياً بالسيرفر السحابي فور فتح الرابط!`
      : `\n💻 وضع التشغيل: محلي معزول`;
    const text = `🏢 بيانات الدخول والتشغيل لصيدلية: ${inst.pharmacyName}\n🔗 الرابط المباشر:\n${url}\n\n👤 اسم المستخدم: ${inst.username || 'admin'}\n🔑 كلمة المرور: ${inst.password || '123456'}\n🛡️ كود النسخة: ${inst.code}${cloudInfo}`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
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
            طرق واستراتيجيات العزل
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'supabase'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-transparent text-emerald-700 dark:text-emerald-400 hover:text-emerald-800'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-500" />
            <span>سيرفر Supabase لكل صيدلية ⚡</span>
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

              {/* Security & Credentials Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      <span>حماية النسخة (اسم المستخدم وكلمة السر)</span>
                      {currentInstance.isProtected !== false ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          ✓ محمية بكلمة مرور
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          مفتوحة بدون قفل
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      بيانات الدخول المعتمدة لصيدلي أو موظفي هذا الفرع عند فتح الرابط
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLinkWithCredentials(currentInstance)}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      title="نسخ الرابط مع اسم المستخدم وكلمة السر معاً"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ الرابط + بيانات الدخول</span>
                    </button>

                    <button
                      onClick={handleOpenEditCredentials}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                    >
                      تعديل
                    </button>
                  </div>
                </div>

                {!isEditingCredentials ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                        <User className="w-3.5 h-3.5" />
                        <span>اسم المستخدم:</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {currentInstance.username || 'admin'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>كلمة المرور:</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {showCurrentPassword ? currentInstance.password || '123' : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveCredentials} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          اسم المستخدم
                        </label>
                        <input
                          type="text"
                          required
                          value={editUsername}
                          onChange={e => setEditUsername(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          كلمة المرور الجديدة
                        </label>
                        <input
                          type="text"
                          required
                          value={editPassword}
                          onChange={e => setEditPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsProtected}
                          onChange={e => setEditIsProtected(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>تفعيل قفل الدخول بهذه البيانات عند فتح الرابط</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingCredentials(false)}
                          className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                        >
                          حفظ البيانات
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Dedicated Supabase Server for Current Instance */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>سيرفر Supabase السحابي المخصص لهذه الصيدلية</span>
                      {currentInstance.supabaseConfig?.url ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          ✓ متصل ومفعل
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          وضع محلي (أوفلاين)
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      يربط أجهزة وهواتف هذه الصيدلية بقاعدة بيانات PostgreSQL خاصة ومستقلة 100%
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenConfigureSupabase(currentInstance)}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-center"
                    >
                      <Database className="w-4 h-4 text-emerald-600" />
                      {currentInstance.supabaseConfig?.url
                        ? 'تعديل / فحص السيرفر'
                        : 'ربط سيرفر سحابي خاص'}
                    </button>

                    <button
                      onClick={() => setActiveTab('supabase')}
                      className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl transition"
                    >
                      دليل الإعداد 📖
                    </button>
                  </div>
                </div>

                {currentInstance.supabaseConfig?.url && (
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs flex items-center justify-between gap-2">
                    <div className="font-mono text-emerald-900 dark:text-emerald-200 truncate" dir="ltr">
                      {currentInstance.supabaseConfig.url}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 font-bold text-emerald-950 dark:text-emerald-100 shrink-0">
                      قاعدة بيانات معزولة
                    </span>
                  </div>
                )}
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

              {/* Username & Password Protection for New Instance */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      بيانات حماية الدخول (اسم مستخدم وكلمة مرور لهذه الصيدلية)
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsProtected}
                      onChange={e => setFormIsProtected(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>تفعيل القفل بكلمة مرور</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      اسم المستخدم (Username)
                    </label>
                    <input
                      type="text"
                      required={formIsProtected}
                      value={formUsername}
                      onChange={e => setFormUsername(e.target.value)}
                      placeholder="مثال: admin"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      كلمة المرور السرية (Password)
                    </label>
                    <input
                      type="text"
                      required={formIsProtected}
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      placeholder="مثال: 123456"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold font-mono text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80">
                  💡 سيُطلب من موظفي هذه الصيدلية إدخال اسم المستخدم وكلمة المرور هذه عند فتح الرابط المباشر الخاص بهم.
                </p>
              </div>

              {/* Optional Supabase Cloud Server for New Instance */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      سيرفر Supabase سحابي مخصص لهذه الصيدلية (اختياري)
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFormSupabase}
                      onChange={e => setShowFormSupabase(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span>تخصيص سيرفر سحابي خاص الآن</span>
                  </label>
                </div>

                <p className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80">
                  ⚡ يمكنك ترك هذا الخيار مغلقاً لتعمل الصيدلية محلياً، أو إدخال رابط ومفتاح مشروع Supabase الخاص بها لعزل بياناتها سحابياً 100%.
                </p>

                {showFormSupabase && (
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                        رابط مشروع Supabase الخاص بالصيدلية (Project URL)
                      </label>
                      <input
                        type="text"
                        value={formSupabaseUrl}
                        onChange={e => setFormSupabaseUrl(e.target.value)}
                        placeholder="https://abcdefghijkl.supabase.co"
                        dir="ltr"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 text-xs">
                        المفتاح العام (anon public API key)
                      </label>
                      <input
                        type="text"
                        value={formSupabaseAnonKey}
                        onChange={e => setFormSupabaseAnonKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        dir="ltr"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                )}
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
                          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-600 dark:text-slate-300 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              💊 {stats.medicinesCount} دواء
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              🧾 {stats.salesCount} فاتورة
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              🤝 {stats.entitiesCount} جهة
                            </span>
                            {inst.isProtected !== false && (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>{inst.username || 'admin'}</span>
                              </span>
                            )}
                            {/* Supabase status badge */}
                            {inst.supabaseConfig?.url ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                                <Database className="w-3 h-3 text-emerald-500" />
                                <span>سيرفر Supabase خاص</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <HardDrive className="w-3 h-3" />
                                <span>وضع محلي</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                          <button
                            onClick={() => handleOpenConfigureSupabase(inst)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            title="إعداد أو ربط سيرفر Supabase السحابي لهذه الصيدلية"
                          >
                            <Database className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">سيرفر Supabase</span>
                          </button>

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
                            onClick={() => handleCopyLinkWithCredentials(inst)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            title="نسخ الرابط مع اسم المستخدم وكلمة السر"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">نسخ الرابط والبيانات</span>
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

              {/* Method 4: Vercel Cloud Deployment & Custom Links */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-indigo-800 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    4
                  </span>
                  <div>
                    <h4 className="font-black text-white text-base flex items-center gap-2">
                      <span>🚀 خطوات رفع النسخ على موقع Vercel وتخصيص رابط لكل صيدلية</span>
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full">
                        دليل شامل
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      كيف ترفع المشروع على Vercel مجاناً وتمنح كل صيدلية رابطاً خاصاً محمياً باسم مستخدم وكلمة سر:
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pr-2 text-xs">
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 space-y-1">
                    <div className="font-bold text-cyan-300">خطوة 1: رفع المشروع إلى GitHub</div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      ارفع كود هذا البرنامج إلى حسابك في <b>GitHub</b> في مستودع جديد (Repository) مثل: <code>pharma-pro</code>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 space-y-1">
                    <div className="font-bold text-emerald-300">خطوة 2: ربط المستودع في Vercel (مجاناً)</div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      ادخل على <b className="text-white">vercel.com</b> وسجل دخولك بحساب GitHub. اضغط على <b>"Add New... &rarr; Project"</b> واختر المستودع. Vercel يتعرف تلقائياً على Vite، ثم اضغط زر <b>"Deploy"</b> ليتم النشر خلال 30 ثانية!
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 space-y-1">
                    <div className="font-bold text-amber-300">خطوة 3: رابط مخصص + حماية اسم مستخدم وكلمة مرور لكل صيدلية</div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      سيعطيك Vercel رابطاً أساسياً مثل: <code>https://pharma-pro.vercel.app</code>
                      <br />
                      من داخل هذا البرنامج، أنشئ صيدلية جديدة وحدد لها <b>اسم مستخدم وكلمة سر</b>، وانسخ رابطها المباشر:
                      <br />
                      • صيدلية الأمل: <code className="text-cyan-300">https://pharma-pro.vercel.app/?instance=amal</code>
                      <br />
                      • صيدلية النور: <code className="text-cyan-300">https://pharma-pro.vercel.app/?instance=noor</code>
                      <br />
                      عندما تفتح الصيدلية الرابط، ستطلب منهم المنظومة فوراً إدخال <b>اسم المستخدم وكلمة السر الخاصة بهم</b>، وتكون بياناتهم وفواتيرهم معزولة 100%!
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 space-y-1">
                    <div className="font-bold text-purple-300">خطوة 4: (اختياري) دومين فرعي لكل صيدلية (Subdomains)</div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      إذا كنت تملك دومين خاص (مثلاً <code>mypharma.ps</code>)، يمكنك ربط دومين فرعي لكل صيدلية من إعدادات Vercel:
                      <br />
                      <code>amal.mypharma.ps</code> و <code>noor.mypharma.ps</code> بكل سهولة.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DEDICATED SUPABASE SERVER PER PHARMACY GUIDE */}
          {activeTab === 'supabase' && (
            <div className="space-y-6 text-sm">
              {/* Hero Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white border border-emerald-700/60 shadow-xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5" />
                    العزل السحابي الكامل 100% • Physical Multi-Tenancy
                  </span>
                </div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <span>⚡ كيف تجعل لكل صيدلية سيرفر Supabase لوحدها؟</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  في نظام <strong>فارما برو</strong>، صممنا البنية التحتية لتدعم عزل قواعد البيانات السحابية بالكامل.
                  بدلاً من مشاركة قاعدة بيانات واحدة بين كل الصيدليات، يمكنك إنشاء <strong>مشروع سحابي مجاني ومستقل على Supabase لكل صيدلية تبيعها البرنامج</strong>.
                  بهذه الطريقة، تملك كل صيدلية سيرفر PostgreSQL خاصاً بها حصراً ولا تتداخل بياناتها أو فواتيرها مع أي صيدلية أخرى على الإطلاق.
                </p>

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح موقع Supabase وإنشاء مشروع</span>
                  </a>

                  <button
                    onClick={handleCopySql}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'تم نسخ كود الـ SQL!' : 'نسخ كود إنشاء الجداول (SQL)'}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-emerald-300 border border-white/10 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>الانتقال لربط الصيدليات المسجلة</span>
                  </button>
                </div>
              </div>

              {/* 4 Core Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                    🛡️
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white text-xs">أمان وخصوصية 100%</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    قاعدة بيانات منفصلة فيزيائياً تمنع منعاً باتاً وصول أي صيدلية لأرقام أو فواتير صيدلية أخرى.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white text-xs">مزامنة فورية Real-time</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    كمبيوتر الكاشير بالصيدلية وهواتف الصيادلة والمخزن يتزامنون في أجزاء من الثانية.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
                    💰
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white text-xs">مجاني بالكامل</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    يقدم Supabase خطة مجانية (Free Tier) سخية جداً تكفي آلاف الأدوية والفواتير لكل صيدلية.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                    🚀
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white text-xs">ربط تلقائي 1-Click</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    الصيدلية تفتح الرابط الخاص بها فيتصل هاتفهم وحاسوبهم بسيرفرهم تلقائياً دون إدخال أي مفاتيح.
                  </p>
                </div>
              </div>

              {/* 5-Step Practical Guide */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <span>📋 الخطوات العملية التفصيلية (خطوة بخطوة):</span>
                </h4>

                {/* Step 1 */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        1
                      </span>
                      <h5 className="font-bold text-slate-900 dark:text-white">
                        إنشاء مشروع جديد في موقع Supabase باسم الصيدلية
                      </h5>
                    </div>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <span>فتح Supabase</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 pr-10 leading-relaxed">
                    1. ادخل إلى <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-600 font-bold underline">supabase.com</a> وسجل دخولك (يمكنك استخدام نفس حساب GitHub أو الإيميل).
                    <br />
                    2. اضغط على زر <strong>"New Project"</strong>.
                    <br />
                    3. في حقل <strong>Name</strong>، اكتب اسم الصيدلية (مثلاً: <code>pharma-alamal</code> لصيدلية الأمل، أو <code>pharma-alnoor</code> لصيدلية النور).
                    <br />
                    4. اكتب كلمة سر لقاعدة البيانات (Database Password) واحفظها عندك، واختر أقرب منطقة (مثلاً <code>Frankfurt - eu-central-1</code>).
                    <br />
                    5. اضغط <strong>Create project</strong> وانتظر دقيقة واحدة حتى ينتهي تجهيز السيرفر.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        2
                      </span>
                      <h5 className="font-bold text-slate-900 dark:text-white">
                        بناء جداول نظام فارما برو بضغطة زر واحدة (SQL Script)
                      </h5>
                    </div>

                    <button
                      onClick={handleCopySql}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'تم النسخ بنجاح!' : 'نسخ كود الـ SQL'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 pr-10 leading-relaxed">
                    1. من القائمة اليسرى في مشروع Supabase الجديد، اضغط على أيقونة <strong>SQL Editor</strong> (أيقونة <code>&gt;_</code>).
                    <br />
                    2. اضغط على زر <strong>"New query"</strong>.
                    <br />
                    3. انسخ كود الـ SQL بالزر الأخضر أعلاه، ثم الصقه في الشاشة.
                    <br />
                    4. اضغط على زر <strong>Run</strong> الأخضر (أو اضغط <code>Ctrl + Enter</code>).
                    <br />
                    خلال ثانيتين ستظهر رسالة <code>Success. No rows returned</code> وتكون جميع جداول الصيدلية (الأدوية، الفواتير، الحسابات، الإعدادات) قد أُنشئت بنجاح!
                  </p>

                  <div className="pr-10">
                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        💡 إذا ظهر تنبيه متعلق بحماية Row-Level Security لاحقاً، يمكنك أيضاً نسخ كود الأمان وتطبيقه:
                      </span>
                      <button
                        onClick={handleCopyRlsFixSql}
                        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded text-xs font-bold shrink-0 transition"
                      >
                        {copiedRlsSql ? '✓ تم النسخ' : 'نسخ كود حماية RLS'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <h5 className="font-bold text-slate-900 dark:text-white">
                      استخراج رابط ومفتاح المشروع (Project URL & Anon Key)
                    </h5>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 pr-10 leading-relaxed">
                    1. في موقع Supabase، انظر إلى أسفل القائمة اليسرى واضغط على أيقونة الترس ⚙️ <strong>(Project Settings)</strong>.
                    <br />
                    2. اختر من القائمة تبويب <strong>"API"</strong>.
                    <br />
                    3. ستجد هناك قيمتين أساسيتين:
                    <br />
                    • <strong>Project URL</strong>: رابط يشبه <code>https://abcdefghijkl.supabase.co</code> (انسخه).
                    <br />
                    • <strong>Project API keys &rarr; anon (public)</strong>: المفتاح العام الطويل (انسخه).
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        4
                      </span>
                      <h5 className="font-bold text-slate-900 dark:text-white">
                        ربط الصيدلية في هذا البرنامج بنقرة واحدة
                      </h5>
                    </div>

                    <button
                      onClick={() => setActiveTab('list')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-100 transition"
                    >
                      الذهاب لقائمة الصيدليات ↗
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 pr-10 leading-relaxed">
                    1. انتقل إلى تبويب <strong>"قائمة النسخ المحفوظة"</strong> هنا.
                    <br />
                    2. اضغط على زر <strong>"سيرفر Supabase"</strong> بجانب الصيدلية التي تريد ربطها (أو أدخلها أثناء إنشاء صيدلية جديدة).
                    <br />
                    3. الصق الـ Project URL والـ anon key واضغط <strong>"فحص الاتصال"</strong> ثم <strong>"حفظ الإعدادات"</strong>.
                    <br />
                    مبروك! أصبحت هذه الصيدلية مربوطة حصراً بسيرفرها الخاص.
                  </p>
                </div>

                {/* Step 5 */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/70 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      5
                    </span>
                    <h5 className="font-bold text-slate-900 dark:text-white">
                      تسليم الرابط المباشر أو الـ QR للصيدلية
                    </h5>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 pr-10 leading-relaxed">
                    اضغط على <strong>"نسخ الرابط والبيانات"</strong> أو <strong>"عرض الباركود QR"</strong> بجانب الصيدلية وأرسله للمالك.
                    <br />
                    الرابط المنسوخ يحتوي تلقائياً على كود الصيدلية + مفاتيح السيرفر السحابي،
                    لذلك بمجرد أن يفتح الصيدلي الرابط على كمبيوتر الكاشير أو يمسح الباركود بهاتف الآيفون،
                    يتصل جهازه فوراً بسيرفر Supabase الخاص بصيدليته دون الحاجة لطلب أي مفاتيح منه!
                  </p>
                </div>
              </div>

              {/* Vercel Standalone option */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">
                  <span>🚀 خيار متقدم إضافي: رفع مشروع منفصل على Vercel لكل صيدلية</span>
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  إذا أردت أن تمتلك كل صيدلية رابط Vercel مستقلاً تماماً (مثلاً: <code>https://amal-pharmacy.vercel.app</code> و <code>https://noor-pharmacy.vercel.app</code>):
                  <br />
                  يمكنك في Vercel الضغط على <strong>"Add New Project"</strong> لنفس كود الـ GitHub، ووضع متغيرات البيئة الخاصة بـ Supabase لكل مشروع في قسم <strong>Settings &rarr; Environment Variables</strong>:
                  <br />
                  • <code>VITE_SUPABASE_URL</code>: رابط مشروع Supabase الخاص بتلك الصيدلية.
                  <br />
                  • <code>VITE_SUPABASE_ANON_KEY</code>: مفتاح anon الخاص بها.
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
                value={InstanceService.buildInstanceUrlWithSync(showQRForInstance.id)}
                size={220}
              />
            </div>

            <div className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg break-all" dir="ltr">
              {InstanceService.buildInstanceUrlWithSync(showQRForInstance.id)}
            </div>

            <button
              onClick={() => {
                handleCopyDirectLink(InstanceService.buildInstanceUrlWithSync(showQRForInstance.id));
              }}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <Copy className="w-4 h-4" />
              نسخ الرابط المباشر
            </button>
          </div>
        </div>
      )}

      {/* Supabase Configuration Modal for a specific pharmacy instance */}
      {editingSupabaseInstance && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    إعداد سيرفر Supabase لـ {editingSupabaseInstance.pharmacyName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    كود النسخة: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{editingSupabaseInstance.code}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingSupabaseInstance(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              أدخل رابط ومفتاح مشروع Supabase الخاص بهذه الصيدلية لعزل قاعدة بياناتها السحابية 100%.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  رابط المشروع السحابي (Project URL)
                </label>
                <input
                  type="text"
                  value={editSupabaseUrl}
                  onChange={e => {
                    setEditSupabaseUrl(e.target.value);
                    const check = cleanAndValidateSupabaseUrl(e.target.value);
                    if (check.isFixed && check.cleanedUrl) {
                      setEditSupabaseUrl(check.cleanedUrl);
                    }
                  }}
                  placeholder="https://abcdefghijkl.supabase.co"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:border-emerald-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  تأخذه من: Project Settings &rarr; API &rarr; Project URL
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  المفتاح العام (anon public key)
                </label>
                <input
                  type="text"
                  value={editSupabaseAnonKey}
                  onChange={e => setEditSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:border-emerald-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  تأخذه من: Project Settings &rarr; API &rarr; Project API keys &rarr; anon (public)
                </span>
              </div>
            </div>

            {/* Test result message */}
            {editSupabaseTestResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  editSupabaseTestResult.success
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                }`}
              >
                {editSupabaseTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{editSupabaseTestResult.message}</span>
              </div>
            )}

            {editSupabaseSuccess && (
              <div className="p-3 rounded-xl text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{editSupabaseSuccess}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <button
                type="button"
                onClick={handleTestSupabaseForInstance}
                disabled={editSupabaseTesting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${editSupabaseTesting ? 'animate-spin' : ''}`} />
                <span>{editSupabaseTesting ? 'جاري الفحص...' : 'فحص الاتصال'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSupabaseForInstance}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>حفظ وتفعيل السيرفر</span>
              </button>

              {editingSupabaseInstance.supabaseConfig?.url && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('هل تريد فصل سيرفر Supabase والعودة للوضع المحلي لهذه الصيدلية؟')) {
                      InstanceService.updateInstanceSupabase(editingSupabaseInstance.id, undefined);
                      loadInstances();
                      setEditingSupabaseInstance(null);
                    }
                  }}
                  className="p-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                  title="فصل السيرفر والعودة للوضع المحلي"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

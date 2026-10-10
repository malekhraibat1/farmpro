import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Building2,
  User,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { AppSettings } from '../types';
import { CryptoService } from '../services/cryptoService';
import { ValidationService } from '../services/validationService';

interface FirstTimeSetupModalProps {
  isOpen: boolean;
  currentSettings: AppSettings;
  onCompleteSetup: (updatedSettings: AppSettings) => void;
}

export const FirstTimeSetupModal: React.FC<FirstTimeSetupModalProps> = ({
  isOpen,
  currentSettings,
  onCompleteSetup,
}) => {
  const [pharmacyName, setPharmacyName] = useState(currentSettings.pharmacyName || '');
  const [ownerName, setOwnerName] = useState(currentSettings.ownerName || '');
  const [adminUsername, setAdminUsername] = useState(currentSettings.adminUsername || 'admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pincode, setPincode] = useState('');
  const [confirmPincode, setConfirmPincode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Zod validation check
    const validation = ValidationService.validateSetupSecurity({
      pharmacyName,
      ownerName,
      adminUsername,
      adminPassword,
      confirmPassword,
      pincode,
      confirmPincode,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setErrorMsg(firstIssue ? firstIssue.message : 'يرجى التأكد من صحة المدخلات.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Hash password with PBKDF2-HMAC-SHA256 & Salt
      const passwordHashResult = await CryptoService.hashSecret(adminPassword);

      // 2. Hash PIN with PBKDF2-HMAC-SHA256 & Salt
      const pincodeHashResult = await CryptoService.hashSecret(pincode);

      // 3. Update settings with cryptographic hashes only (no plaintext passwords)
      const updated: AppSettings = {
        ...currentSettings,
        pharmacyName: pharmacyName.trim(),
        ownerName: ownerName.trim(),
        adminUsername: adminUsername.trim(),
        adminPasswordHash: passwordHashResult.hash,
        adminPasswordSalt: passwordHashResult.salt,
        pincodeHash: pincodeHashResult.hash,
        pincodeSalt: pincodeHashResult.salt,
        // Deprecate legacy plaintext pins
        pincode: '',
        superAdminPin: '',
        isPinRequired: true,
        isSetupCompleted: true,
      };

      setIsSubmitting(false);
      onCompleteSetup(updated);
    } catch (err) {
      console.error('Setup encryption error:', err);
      setIsSubmitting(false);
      setErrorMsg('حدث خطأ أثناء تشفير وتثبيت الحماية، يرجى المحاولة ثانية.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white text-center relative">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>

          <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-0.5 rounded-full inline-block mb-1.5">
            إعداد الحماية لأول مرة (Security Setup Wizard)
          </span>

          <h2 className="text-xl font-black tracking-tight">تهيئة الأمان وكلمات المرور للصيدلية</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
            وفقاً لمعايير الأمان المتقدمة، تم إلغاء كافة كلمات المرور الافتراضية (مثل 1234 و 7777). يرجى تعيين بيانات الدخول الخاصة بمدير الصيدلية الآن.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4 text-right">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-bold animate-in shake">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pharmacy and Manager Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  اسم الصيدلية
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    required
                    value={pharmacyName}
                    onChange={e => setPharmacyName(e.target.value)}
                    placeholder="مثال: صيدلية النور"
                    className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  اسم الصيدلي المسؤول
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="مثال: د. مالك"
                    className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Admin Username */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                اسم مستخدم المدير العام (Admin Username)
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                placeholder="مثال: admin أو manager"
                dir="ltr"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-left"
              />
            </div>

            {/* Password Section */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                <Lock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>كلمة مرور المدير (مشفرة بـ PBKDF2 + Salt)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    كلمة المرور الجديدة (6 خانات على الأقل)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full pr-3 pl-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    تأكيد كلمة المرور
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* PIN Section */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 dark:text-amber-200">
                  <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>رمز PIN السريع لشاشة القفل والتبديل (4 إلى 8 أرقام)</span>
                </div>
                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">
                  يمنع 1234 و 7777
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    رمز PIN المخصص
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      value={pincode}
                      onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="أرقام سرية..."
                      maxLength={8}
                      dir="ltr"
                      className="w-full pr-3 pl-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    تأكيد رمز PIN
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    value={confirmPincode}
                    onChange={e => setConfirmPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="أعد إدخال الرمز..."
                    maxLength={8}
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-700 hover:from-emerald-500 hover:to-cyan-600 text-white font-black text-sm shadow-xl shadow-emerald-700/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'جاري تشفير وتثبيت الحماية...' : 'تثبيت الحماية وتفعيل الصيدلية فوراً 🔒'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

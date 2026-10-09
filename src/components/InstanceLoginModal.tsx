import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  AlertCircle,
  ArrowRightLeft,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { InstanceService, PharmacyInstance } from '../services/instanceService';

interface InstanceLoginModalProps {
  isOpen: boolean;
  activeInstance: PharmacyInstance;
  onSuccessLogin: () => void;
  onOpenPharmacySwitcher?: () => void;
}

export const InstanceLoginModal: React.FC<InstanceLoginModalProps> = ({
  isOpen,
  activeInstance,
  onSuccessLogin,
  onOpenPharmacySwitcher,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername(activeInstance.username || 'admin');
      setPassword('');
      setErrorMsg('');
    }
  }, [isOpen, activeInstance]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    setIsSubmitting(true);

    const ok = InstanceService.verifyAndAuthenticate(activeInstance.id, username, password);
    if (ok) {
      setIsSubmitting(false);
      onSuccessLogin();
    } else {
      setIsSubmitting(false);
      setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة لهذه الصيدلية.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white text-center relative">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-3 shadow-inner">
            <Building2 className="w-8 h-8 text-cyan-400" />
          </div>

          <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-0.5 rounded-full inline-block mb-1.5">
            نسخة صيدلية محمية ببياناتها الخاصة
          </span>

          <h2 className="text-xl font-black tracking-tight">{activeInstance.pharmacyName}</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {activeInstance.branchName || 'الفرع المستقل'} • المالك: {activeInstance.ownerName}
          </p>

          <div className="mt-2 text-[11px] font-mono text-cyan-300/80">
            كود النسخة: <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">{activeInstance.code}</span>
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تسجيل الدخول لقاعدة بيانات الصيدلية</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              أدخل اسم المستخدم وكلمة المرور الخاصة بهذه الصيدلية للمتابعة
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-bold animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                اسم المستخدم (Username)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="مثال: admin"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  كلمة المرور (Password)
                </label>
                <span className="text-[10px] text-slate-400">مشفرة ومحمية</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور..."
                  className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 hover:from-black hover:to-indigo-900 text-white font-black text-xs shadow-lg shadow-slate-900/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>دخول وتأكيد الصيدلية فوراً</span>
            </button>
          </form>

          {/* Switch Instance Button if user opened the wrong URL */}
          {onOpenPharmacySwitcher && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">هل تملك رابطاً أو صيدلية أخرى؟</span>
              <button
                type="button"
                onClick={onOpenPharmacySwitcher}
                className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>التبديل لصيدلية أخرى</span>
              </button>
            </div>
          )}

          {/* Master recovery info */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 text-center leading-relaxed">
            نسيت كلمة المرور؟ يرجى التواصل مع المهندس المطور <b>مالك حريبات 0594345464</b>
          </div>
        </div>
      </div>
    </div>
  );
};

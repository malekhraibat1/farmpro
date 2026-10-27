import React, { useState, useEffect } from 'react';
import { Lock, Unlock, KeyRound, ShieldAlert, UserCheck, Delete, Sparkles, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';
import { CryptoService } from '../services/cryptoService';
import { lockSecondsRemaining, recordFailure, resetThrottle, formatLock } from '../services/throttle';

const THROTTLE_KEY = 'app_pin';

interface SecurityLockModalProps {
  isOpen: boolean;
  onUnlock: () => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  correctPin?: string;
  pincodeHash?: string;
  pincodeSalt?: string;
  superAdminPin?: string;
  superAdminPinHash?: string;
  superAdminPinSalt?: string;
  onOpenSuperAdminDirectly?: () => void;
}

export const SecurityLockModal: React.FC<SecurityLockModalProps> = ({
  isOpen,
  onUnlock,
  currentRole,
  onRoleChange,
  correctPin = '',
  pincodeHash = '',
  pincodeSalt = '',
  superAdminPin = '',
  superAdminPinHash = '',
  superAdminPinSalt = '',
  onOpenSuperAdminDirectly,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [lockLeft, setLockLeft] = useState(() => lockSecondsRemaining(THROTTLE_KEY));
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole === 'pharmacist' ? 'admin' : currentRole);

  // عدّاد تنازلي لمدة القفل المؤقت
  useEffect(() => {
    if (lockLeft <= 0) return;
    const t = setInterval(() => setLockLeft(lockSecondsRemaining(THROTTLE_KEY)), 1000);
    return () => clearInterval(t);
  }, [lockLeft]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (lockLeft > 0) return;
    if (pin.length < 8) {
      setPin(pin + digit);
      setError(false);
    }
  };

  // كل ضغطة على "دخول" = محاولة واحدة. بعد 5 محاولات خاطئة يُقفل الإدخال مؤقتاً.
  const handleSubmit = async () => {
    if (lockLeft > 0 || pin.length < 4) return;
    const entered = pin;

    // 1. رمز السوبر أدمن
    let isSuperMatch = false;
    if (superAdminPinHash && superAdminPinSalt) {
      isSuperMatch = await CryptoService.verifySecret(entered, superAdminPinHash, superAdminPinSalt);
    } else if (superAdminPin && superAdminPin.trim()) {
      isSuperMatch = entered === superAdminPin.trim();
    }
    if (isSuperMatch) {
      resetThrottle(THROTTLE_KEY);
      onRoleChange('super_admin');
      onUnlock();
      if (onOpenSuperAdminDirectly) onOpenSuperAdminDirectly();
      setPin('');
      return;
    }

    // 2. رمز المدير
    let isPinMatch = false;
    if (pincodeHash && pincodeSalt) {
      isPinMatch = await CryptoService.verifySecret(entered, pincodeHash, pincodeSalt);
    } else if (correctPin && correctPin.trim()) {
      isPinMatch = entered === correctPin.trim();
    }
    if (isPinMatch) {
      resetThrottle(THROTTLE_KEY);
      onRoleChange(selectedRole === 'super_admin' ? 'admin' : selectedRole);
      onUnlock();
      setPin('');
      return;
    }

    setError(true);
    setLockLeft(recordFailure(THROTTLE_KEY));
    setTimeout(() => {
      setPin('');
      setError(false);
    }, 700);
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleQuickUnlockAsPharmacist = () => {
    onRoleChange('pharmacist');
    onUnlock();
    setPin('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 text-center space-y-5">
        {/* Lock Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-inner">
          {error ? (
            <ShieldAlert className="w-8 h-8 text-rose-500 animate-bounce" />
          ) : selectedRole === 'super_admin' ? (
            <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />
          ) : (
            <Lock className="w-8 h-8" />
          )}
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-800">قفل النظام والحماية</h2>
          <p className="text-xs text-slate-500 mt-1">
            {selectedRole === 'super_admin'
              ? 'أدخل رمز السوبر أدمن للتحقق والمتابعة'
              : 'أدخل الرمز السري للمتابعة'}
          </p>
        </div>

        {/* Role toggle */}
        <div className="flex bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setSelectedRole('pharmacist')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              selectedRole === 'pharmacist'
                ? 'bg-white text-slate-800 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            صيدلي
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('admin')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              selectedRole === 'admin'
                ? 'bg-white text-cyan-700 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            مدير
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('super_admin')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              selectedRole === 'super_admin'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-sm font-black'
                : 'text-amber-800 hover:text-amber-900'
            }`}
          >
            سوبر أدمن
          </button>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3 my-2">
          {Array.from({ length: Math.max(4, pin.length) }, (_, i) => i).map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > i
                  ? error
                    ? 'bg-rose-500 border-rose-500 scale-110'
                    : selectedRole === 'super_admin'
                    ? 'bg-amber-500 border-amber-500 scale-110'
                    : 'bg-cyan-600 border-cyan-600 scale-110'
                  : 'border-slate-300 bg-slate-50'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-xs text-rose-600 font-bold">الرمز السري غير صحيح، حاول ثانية</p>}
        {lockLeft > 0 && (
          <p role="alert" className="text-xs text-amber-700 font-bold">
            محاولات خاطئة كثيرة. انتظر {formatLock(lockLeft)} ثم أعد المحاولة.
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className="h-12 rounded-2xl bg-slate-100/90 hover:bg-slate-200 active:scale-95 text-slate-800 text-lg font-bold transition-all shadow-sm flex items-center justify-center font-mono"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="h-12 rounded-2xl bg-slate-100/60 hover:bg-slate-200 active:scale-95 text-slate-500 text-xs font-bold transition-all flex items-center justify-center"
          >
            مسح
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-slate-100/90 hover:bg-slate-200 active:scale-95 text-slate-800 text-lg font-bold transition-all shadow-sm flex items-center justify-center font-mono"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-100/60 hover:bg-slate-200 active:scale-95 text-slate-600 transition-all flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || lockLeft > 0}
          className="w-full max-w-[240px] mx-auto h-12 rounded-2xl bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-200 disabled:text-slate-500 text-white font-black text-sm transition-all block"
        >
          دخول
        </button>

        {/* Fast unlock as staff */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={handleQuickUnlockAsPharmacist}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold hover:underline"
          >
            دخول مباشر سريع كـ "صيدلي مناوب"
          </button>
        </div>

        {/* Designer watermark */}
        <div className="text-[11px] text-slate-400">
          برمجة المهندس مالك حريبات | 0594345464
        </div>
      </div>
    </div>
  );
};


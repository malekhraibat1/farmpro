import React, { useEffect, useRef, useState } from 'react';
import { Pill, Activity, ShieldCheck, ArrowLeft, Phone, Zap } from 'lucide-react';

interface SplashScreenProps {
  onDismiss: () => void;
  autoClose?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss, autoClose = true }) => {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const [progress, setProgress] = useState(0);

  // Auto-close timer with progress animation (1.2s total duration)
  useEffect(() => {
    if (!autoClose) return;

    const startTime = Date.now();
    const duration = 1200; // Fast and snappy 1.2s
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        onDismissRef.current();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [autoClose]);

  // Keyboard shortcut listener to bypass immediately on any key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onDismissRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleManualDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismissRef.current();
  };

  return (
    <div
      onClick={() => onDismissRef.current()}
      role="button"
      tabIndex={0}
      title="اضغط في أي مكان للدخول المباشر إلى البرنامج"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 pb-safe pt-safe min-h-screen min-h-[100dvh] overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white selection:bg-cyan-500 selection:text-white cursor-pointer select-none"
    >
      {/* Background ambient orbs */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="w-full max-w-lg flex justify-between items-center text-xs text-cyan-300/80 font-mono z-10 pt-1">
        <span className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          النظام جاهز ومتزامن
        </span>
        <button
          onClick={handleManualDismiss}
          className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer border border-white/10"
        >
          <span>تخطي الإقلاع</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center text-center space-y-5 max-w-md my-auto py-6 z-10">
        {/* Glow badge */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-cyan-600 to-blue-700 p-0.5 shadow-2xl flex items-center justify-center border border-white/20">
            <div className="w-full h-full rounded-[22px] bg-slate-950/40 backdrop-blur-md flex flex-col items-center justify-center gap-1">
              <Pill className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
              <span className="text-[10px] tracking-widest text-cyan-200 font-bold uppercase">PHARMA PRO</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5 px-2">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-l from-white via-cyan-100 to-cyan-300 leading-tight">
            نظام إدارة ومحاسبة الصيدلية
          </h1>
          <p className="text-xs sm:text-sm text-cyan-200/80 font-medium leading-relaxed">
            دفتر حسابات متكامل • كشوفات شركات وموردين • نقاط بيع POS
          </p>
        </div>

        {/* Progress bar indication */}
        <div className="w-full max-w-xs space-y-1.5 pt-1">
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-cyan-300/70 font-mono">
            <span>جاري فتح النظام...</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            حماية ونسخ احتياطي
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300">
            متوافق مع آيفون وكمبيوتر
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            تزامن فوري
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleManualDismiss}
          className="w-full max-w-xs py-3.5 px-6 rounded-2xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer border border-cyan-400/30"
        >
          <span>دخول البرنامج الآن</span>
          <ArrowLeft className="w-5 h-5" />
        </button>

        <p className="text-[11px] text-slate-400 font-medium">
          💡 اضغط في أي مكان على الشاشة لتخطي الإقلاع فوراً
        </p>
      </div>

      {/* Engineer Malik Hraibat signature */}
      <div className="w-full max-w-md pt-4 pb-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-right z-10">
        <div>
          <div className="text-[11px] text-slate-400">تصميم وتطوير المهندس</div>
          <div className="text-sm sm:text-base font-extrabold text-cyan-300 tracking-wide">مالك حريبات</div>
        </div>
        <a
          href="tel:0594345464"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-cyan-200 transition-all border border-white/10"
        >
          <Phone className="w-3.5 h-3.5 text-emerald-400" />
          <span className="dir-ltr">0594345464</span>
        </a>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { Pill, Activity, ShieldCheck, ArrowLeft, Phone } from 'lucide-react';

interface SplashScreenProps {
  onDismiss: () => void;
  autoClose?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss, autoClose = true }) => {
  useEffect(() => {
    if (!autoClose) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3200);
    return () => clearTimeout(timer);
  }, [autoClose, onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white overflow-hidden selection:bg-cyan-500 selection:text-white">
      {/* Background ambient orbs */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="w-full flex justify-between items-center text-xs text-cyan-300/80 font-mono">
        <span className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          النظام متزامن وجاهز للعمل
        </span>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1"
        >
          <span>تخطي</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-md my-auto">
        {/* Glow badge */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
          <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-cyan-600 to-blue-700 p-0.5 shadow-2xl flex items-center justify-center border border-white/20">
            <div className="w-full h-full rounded-[22px] bg-slate-950/40 backdrop-blur-md flex flex-col items-center justify-center gap-1">
              <Pill className="w-12 h-12 text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
              <span className="text-[10px] tracking-widest text-cyan-200 font-bold uppercase">PHARMA PRO</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-l from-white via-cyan-100 to-cyan-300">
            نظام إدارة ومحاسبة الصيدلية
          </h1>
          <p className="text-sm text-cyan-200/80 font-medium">
            دفتر حسابات متكامل • نقاط بيع POS • إدارة مخزون وأدوية • كشوفات شركات وصيدليات
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            حماية ونسخ احتياطي
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
            متوافق مع آيفون وكمبيوتر
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
            تزامن فوري
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={onDismiss}
          className="w-full max-w-xs py-3.5 px-6 rounded-2xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white font-bold text-base shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
        >
          <span>دخول البرنامج الآن</span>
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Engineer Malik Hraibat signature */}
      <div className="w-full max-w-md pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
        <div>
          <div className="text-xs text-slate-400">تم التصميم والتطوير بامتياز بواسطة</div>
          <div className="text-base font-extrabold text-cyan-300 tracking-wide">المهندس مالك حريبات</div>
        </div>
        <a
          href="tel:0594345464"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-cyan-200 transition-all border border-white/10"
        >
          <Phone className="w-3.5 h-3.5 text-emerald-400" />
          <span className="dir-ltr">0594345464</span>
        </a>
      </div>
    </div>
  );
};

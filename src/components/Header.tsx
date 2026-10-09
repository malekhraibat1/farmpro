import React, { useState, useEffect } from 'react';
import {
  Pill,
  Lock,
  Award,
  Wifi,
  Clock,
  Sparkles,
  Phone,
  User,
  Shield,
  Menu,
  Palette,
  ArrowRightLeft,
  Laptop,
  Smartphone,
  Building2,
} from 'lucide-react';
import { UserRole, AppSettings } from '../types';
import { ThemeId, AVAILABLE_THEMES } from '../services/themeService';

interface HeaderProps {
  settings: AppSettings;
  currentRole: UserRole;
  currentThemeId: ThemeId;
  onLock: () => void;
  onOpenAbout: () => void;
  onOpenThemeSelector: () => void;
  onOpenDeviceSync: () => void;
  onOpenInstanceManager?: () => void;
  onToggleMobileMenu?: () => void;
  onNewSaleShortcut: () => void;
  onOpenSuperAdmin?: () => void;
  onOpenSupabaseSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentRole,
  currentThemeId,
  onLock,
  onOpenAbout,
  onOpenThemeSelector,
  onOpenDeviceSync,
  onOpenInstanceManager,
  onToggleMobileMenu,
  onNewSaleShortcut,
  onOpenSuperAdmin,
  onOpenSupabaseSync,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  const currentTheme = AVAILABLE_THEMES.find(t => t.id === currentThemeId) || AVAILABLE_THEMES[0];

  useEffect(() => {
    const updateDateTime = () => {
      try {
        const now = new Date();
        setTimeStr(
          now.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        setDateStr(
          now.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        );
      } catch (e) {
        const now = new Date();
        setTimeStr(now.toLocaleTimeString());
        setDateStr(now.toLocaleDateString());
      }
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Left/Start side: mobile toggle + logo & pharmacy name */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr ${currentTheme.accentGradient} text-white flex items-center justify-center shadow-md`}
            >
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {settings.pharmacyName}
              </h1>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={onOpenDeviceSync}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/60 px-1.5 sm:px-2 py-0.5 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900/50 text-[10px] sm:text-xs"
                  title="ربط الكمبيوتر والهاتف وتزامن البيانات"
                >
                  <ArrowRightLeft className="w-3 h-3 text-indigo-500 animate-pulse" />
                  <span>ربط الأجهزة</span>
                </button>
                {onOpenInstanceManager && currentRole !== 'pharmacist' && (
                  <button
                    type="button"
                    onClick={onOpenInstanceManager}
                    className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-50 dark:hover:bg-teal-950/60 px-1.5 sm:px-2 py-0.5 rounded-lg transition-colors border border-teal-200 dark:border-teal-800/60 text-[10px] sm:text-xs"
                    title="تخصيص وعزل النسخ لكل صيدلية"
                  >
                    <Building2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    <span>تخصيص الصيدليات</span>
                  </button>
                )}
                <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                <span className="hidden sm:inline">{dateStr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Live clock (hidden on mobile) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-xs font-mono text-slate-700 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{timeStr}</span>
        </div>

        {/* Right/End side: Pharmacy Isolation + Theme picker + Device sync + Quick sale + Designer + Role + Lock */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Pharmacy Instances Button */}
          {onOpenInstanceManager && currentRole !== 'pharmacist' && (
            <button
              onClick={onOpenInstanceManager}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 border border-teal-200/80 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold transition-all shadow-xs"
              title="تخصيص النسخ وعزل بيانات الصيدليات"
            >
              <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline text-[11px]">نسخ الصيدليات</span>
            </button>
          )}

          {/* Theme Switcher Button */}
          <button
            onClick={onOpenThemeSelector}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs"
            title="تغيير ثيم ومظهر البرنامج"
          >
            <Palette className="w-3.5 h-3.5 text-indigo-500" />
            <span className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: currentTheme.primaryColor }} />
            <span className="hidden sm:inline text-[11px]">الثيم</span>
          </button>

          {/* Quick Sale button */}
          <button
            onClick={onNewSaleShortcut}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>فاتورة (F2)</span>
          </button>

          {/* Designer Branding button */}
          <button
            onClick={onOpenAbout}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 dark:from-slate-800 dark:to-indigo-950 dark:hover:from-slate-700 dark:hover:to-indigo-900 border border-cyan-200/60 dark:border-indigo-800 text-cyan-900 dark:text-cyan-300 text-xs font-semibold transition-all group"
            title="معلومات المهندس المصمم والتواصل"
          >
            <Award className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
            <div className="text-right hidden md:block">
              <div className="text-[9px] text-cyan-600 dark:text-cyan-400 font-bold leading-none">المطور</div>
              <div className="text-xs font-black text-slate-800 dark:text-white leading-tight">{settings.designerName}</div>
            </div>
            <span className="md:hidden text-[10px] font-bold">م. مالك</span>
          </button>

          {/* Role badge */}
          <button
            onClick={() => {
              if (currentRole === 'super_admin' && onOpenSuperAdmin) {
                onOpenSuperAdmin();
              } else {
                onLock();
              }
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              currentRole === 'super_admin'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-amber-300 shadow-sm shadow-amber-500/20'
                : currentRole === 'admin'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100'
            }`}
            title="تبديل الصلاحية / قفل الشاشة"
          >
            {currentRole === 'super_admin' ? (
              <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            ) : currentRole === 'admin' ? (
              <Shield className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <User className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span className="hidden sm:inline">
              {currentRole === 'super_admin'
                ? 'سوبر أدمن'
                : currentRole === 'admin'
                ? 'مدير عام'
                : 'صيدلي'}
            </span>
          </button>

          {/* Lock screen button */}
          <button
            onClick={onLock}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            title="قفل البرنامج"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};


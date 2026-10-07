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
} from 'lucide-react';
import { UserRole, AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  currentRole: UserRole;
  onLock: () => void;
  onOpenAbout: () => void;
  onToggleMobileMenu?: () => void;
  onNewSaleShortcut: () => void;
  onOpenSuperAdmin?: () => void;
  onOpenSupabaseSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentRole,
  onLock,
  onOpenAbout,
  onToggleMobileMenu,
  onNewSaleShortcut,
  onOpenSuperAdmin,
  onOpenSupabaseSync,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-3">
        {/* Left/Start side: mobile toggle + logo & pharmacy name */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-800 leading-tight">
                {settings.pharmacyName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={onOpenSupabaseSync}
                  className="inline-flex items-center gap-1 text-emerald-600 font-bold hover:bg-emerald-50 px-2 py-0.5 rounded-lg transition-colors border border-emerald-100"
                  title="إعدادات وربط سيرفر Supabase السحابي"
                >
                  <Wifi className="w-3 h-3 animate-pulse" />
                  <span>تزامن Supabase</span>
                </button>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="hidden sm:inline">{dateStr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Live clock (hidden on very small screens) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 text-xs font-mono text-slate-700">
          <Clock className="w-3.5 h-3.5 text-cyan-600" />
          <span>{timeStr}</span>
        </div>

        {/* Right/End side: Designer badge + role + lock */}
        <div className="flex items-center gap-2">
          {/* Quick Sale button */}
          <button
            onClick={onNewSaleShortcut}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>فاتورة جديدة (F2)</span>
          </button>

          {/* Designer Branding button */}
          <button
            onClick={onOpenAbout}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border border-cyan-200/60 text-cyan-800 text-xs font-semibold transition-all group"
            title="معلومات المصمم والتواصل"
          >
            <Award className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-cyan-600 font-bold leading-none">تصميم وتطوير</div>
              <div className="text-xs font-extrabold text-slate-800">{settings.designerName}</div>
            </div>
            <span className="sm:hidden text-[11px] font-bold">م. مالك</span>
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              currentRole === 'super_admin'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-amber-300 shadow-sm shadow-amber-500/20'
                : currentRole === 'admin'
                ? 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100'
                : 'bg-blue-50 text-blue-800 border-blue-200/80 hover:bg-blue-100'
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
            <span>
              {currentRole === 'super_admin'
                ? 'سوبر أدمن (م. مالك)'
                : currentRole === 'admin'
                ? 'مدير عام'
                : 'صيدلي'}
            </span>
          </button>

          {/* Lock screen button */}
          <button
            onClick={onLock}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="قفل البرنامج"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

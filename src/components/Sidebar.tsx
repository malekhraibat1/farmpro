import React from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Boxes,
  Receipt,
  BarChart3,
  Settings,
  Phone,
  MessageSquare,
  Award,
  AlertTriangle,
  X,
  ShieldCheck,
  Key,
  Sparkles,
} from 'lucide-react';
import { AppSettings, UserRole } from '../types';

export type NavTab =
  | 'dashboard'
  | 'entities'
  | 'pos'
  | 'inventory'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'super_admin';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  settings: AppSettings;
  onOpenAbout: () => void;
  onOpenThemeSelector?: () => void;
  onOpenDeviceSync?: () => void;
  currentRole?: UserRole;
  onOpenSuperAdmin?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  nearExpiryCount?: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  settings,
  onOpenAbout,
  onOpenThemeSelector,
  onOpenDeviceSync,
  currentRole = 'admin',
  onOpenSuperAdmin,
  isMobileOpen = false,
  onCloseMobile,
  nearExpiryCount = 0,
  lowStockCount = 0,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'entities' as NavTab,
      label: 'دفتر الحسابات والشركات',
      icon: Users,
      badge: 'الرئيسي',
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'pos' as NavTab,
      label: 'نقطة البيع (الكاشير)',
      icon: ShoppingCart,
      badge: 'سريع',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'inventory' as NavTab,
      label: 'المخزون والأدوية',
      icon: Boxes,
      badge: nearExpiryCount > 0 ? `${nearExpiryCount} صلاحية` : null,
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'expenses' as NavTab,
      label: 'المصاريف وسندات الصرف',
      icon: Receipt,
      badge: null,
    },
    {
      id: 'reports' as NavTab,
      label: 'التقارير المالية والأرباح',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'settings' as NavTab,
      label: 'الإعدادات والنسخ',
      icon: Settings,
      badge: null,
    },
    {
      id: 'super_admin' as NavTab,
      label: 'بوابة السوبر أدمن (التراخيص)',
      icon: Key,
      badge: currentRole === 'super_admin' ? 'نشط' : 'م. مالك',
      badgeColor: 'bg-amber-100 text-amber-900 font-bold',
      isSuper: true,
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 text-right select-none">
      {/* Mobile close button */}
      {isMobileOpen && (
        <div className="p-4 flex items-center justify-between border-b border-slate-100 md:hidden">
          <span className="font-bold text-slate-800 text-sm">القائمة الرئيسية</span>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Nav list */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
          الوحدات البرمجية
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                isActive
                  ? item.id === 'super_admin'
                    ? 'bg-gradient-to-l from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/25'
                    : 'bg-gradient-to-l from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20'
                  : item.id === 'super_admin'
                  ? 'bg-amber-50/60 text-amber-900 border border-amber-200/60 hover:bg-amber-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive
                      ? 'scale-110 text-white'
                      : item.id === 'super_admin'
                      ? 'text-amber-600'
                      : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Quick Tools: Themes & Device Sync */}
        <div className="pt-2 pb-1">
          <div className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
            المظهر والأجهزة
          </div>
          <div className="grid grid-cols-2 gap-1.5 px-1">
            {onOpenThemeSelector && (
              <button
                type="button"
                onClick={onOpenThemeSelector}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-slate-700 transition-all"
              >
                <span>🎨 الثيمات</span>
              </button>
            )}
            {onOpenDeviceSync && (
              <button
                type="button"
                onClick={onOpenDeviceSync}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/80 dark:border-indigo-800/60 transition-all"
              >
                <span>📱💻 الأجهزة</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Warnings quick box if low stock or expiry */}
      {(nearExpiryCount > 0 || lowStockCount > 0) && (
        <div className="p-3 mx-3 my-2 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>تنبيهات المخزون الهامة</span>
          </div>
          {nearExpiryCount > 0 && (
            <div className="text-amber-700">
              • {nearExpiryCount} أصناف قاربت على الانتهاء
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="text-amber-700">
              • {lowStockCount} أصناف تحت الحد الأدنى
            </div>
          )}
        </div>
      )}

      {/* Designer Signature Card */}
      <div className="p-3.5 m-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-cyan-300 font-bold">برمجة وتطوير</div>
            <div className="text-xs font-black">{settings.designerName}</div>
          </div>
        </div>

        <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-slate-700/60">
          <span className="font-mono dir-ltr font-bold text-cyan-200">{settings.designerPhone}</span>
          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${settings.designerPhone}`}
              className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              title="اتصال بالمهندس"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
            <a
              href={`https://wa.me/970${settings.designerPhone.replace(/^0/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors"
              title="واتساب المهندس"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <button
          onClick={onOpenAbout}
          className="w-full py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold text-cyan-100 transition-all text-center"
        >
          تفاصيل النظام والشهادة
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block w-64 lg:w-72 shrink-0 h-[calc(100vh-57px)] sticky top-[57px]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-y-0 right-0 w-72 bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

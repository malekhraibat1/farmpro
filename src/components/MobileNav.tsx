import React from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Boxes,
  Menu,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMenu,
}) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'entities' as NavTab, label: 'الحسابات', icon: Users },
    { id: 'pos' as NavTab, label: 'الكاشير', icon: ShoppingCart, highlight: true },
    { id: 'inventory' as NavTab, label: 'المخزون', icon: Boxes },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-2xl transition-all relative ${
                tab.highlight
                  ? isActive
                    ? 'text-cyan-600 font-extrabold'
                    : 'text-emerald-600 font-bold'
                  : isActive
                  ? 'text-cyan-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.highlight ? (
                <div
                  className={`w-11 h-11 -mt-4 rounded-2xl flex items-center justify-center shadow-md transition-transform ${
                    isActive
                      ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white scale-105'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              ) : (
                <div className={`p-1 rounded-xl ${isActive ? 'bg-cyan-50' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <span className="text-[11px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        {/* More button to toggle drawer */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <div className="p-1">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-0.5">المزيد</span>
        </button>
      </div>
    </nav>
  );
};

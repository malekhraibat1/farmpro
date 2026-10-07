import React from 'react';
import { X, Palette, Check, Sparkles, Moon, Sun } from 'lucide-react';
import { AVAILABLE_THEMES, ThemeDefinition, ThemeId } from '../services/themeService';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>تخصيص ثيمات ومظهر البرنامج</span>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </h3>
              <p className="text-xs text-slate-300">
                اختر الثيم واللون المفضل لصيدليتك مع التبديل الفوري بنقرة واحدة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Themes Grid */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {AVAILABLE_THEMES.map((theme) => {
              const isSelected = currentThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => onSelectTheme(theme.id)}
                  className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 relative overflow-hidden group hover:scale-[1.02] active:scale-[0.99] ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50/40 ring-2 ring-cyan-500/20 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Top: Name & Dark/Light badge */}
                  <div className="flex items-start justify-between w-full gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-slate-900 text-sm">{theme.name}</h4>
                        {theme.isDark ? (
                          <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        ) : (
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {theme.nameEn}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                    {theme.description}
                  </p>

                  {/* Color Swatches Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 w-full">
                    <div className="flex items-center gap-1.5">
                      {theme.previewColors.map((color, idx) => (
                        <span
                          key={idx}
                          className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        isSelected
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'المفعل حالياً' : 'تطبيق الثيم'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            يتم حفظ اختيار الثيم تلقائياً على هذا الجهاز
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
};

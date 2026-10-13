export type ThemeId = 
  | 'hyper_clarity'
  | 'pure_clarity'
  | 'ultra_contrast'
  | 'crisp_classic'
  | 'emerald' 
  | 'ocean' 
  | 'soft_paper'
  | 'violet' 
  | 'ruby' 
  | 'dark' 
  | 'forest' 
  | 'amber' 
  | 'cyber';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  nameEn: string;
  description: string;
  isDark: boolean;
  isHighContrast?: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentGradient: string;
  primaryBtnClass: string;
  headerBgClass: string;
  cardBorderClass: string;
  activeTabClass: string;
  badgeClass: string;
  previewColors: [string, string, string];
}

export const AVAILABLE_THEMES: ThemeDefinition[] = [
  {
    id: 'hyper_clarity',
    name: 'العصري فائق الوضوح (Modern High Clarity ✨)',
    nameEn: 'Modern High Clarity',
    description: 'ألوان عصرية عالية التباين والوضوح: خطوط داكنة نقية 100% وأزرار احترافية بارزة بدون أي ألوان مميعة أو بهتان',
    isDark: false,
    isHighContrast: true,
    primaryColor: '#0f172a',
    secondaryColor: '#059669',
    accentGradient: 'from-slate-900 to-slate-800',
    primaryBtnClass: 'bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm',
    headerBgClass: 'bg-white border-b border-slate-200 shadow-xs',
    cardBorderClass: 'border border-slate-200 shadow-xs',
    activeTabClass: 'bg-slate-900 text-white font-bold shadow-sm',
    badgeClass: 'bg-slate-100 text-slate-900 border border-slate-300 font-bold',
    previewColors: ['#0f172a', '#ffffff', '#059669'],
  },
  {
    id: 'pure_clarity',
    name: 'الزمردي الطبي العصري (Modern Emerald 🌿)',
    nameEn: 'Modern Emerald',
    description: 'أخضر زمردي طبي عصري مريح للعين مع أبيض ناصع وعناوين داكنة حادة لسهولة القراءة السريعة',
    isDark: false,
    isHighContrast: true,
    primaryColor: '#059669',
    secondaryColor: '#0f172a',
    accentGradient: 'from-emerald-700 to-teal-800',
    primaryBtnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm',
    headerBgClass: 'bg-white border-b border-slate-200 shadow-xs',
    cardBorderClass: 'border border-slate-200 shadow-xs',
    activeTabClass: 'bg-emerald-700 text-white font-bold shadow-sm',
    badgeClass: 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold',
    previewColors: ['#059669', '#ffffff', '#0f172a'],
  },
  {
    id: 'ultra_contrast',
    name: 'التباين العالي فائق الوضوح (Ultra Clear)',
    nameEn: 'Ultra High Contrast',
    description: 'كتابات سوداء داكنة جداً وحادة، بدون أي ألوان باهتة مع وضوح فائق للأرقام والأسعار وقراءة مريحة بدون إجهاد',
    isDark: false,
    isHighContrast: true,
    primaryColor: '#09090b',
    secondaryColor: '#1d4ed8',
    accentGradient: 'from-slate-950 via-slate-900 to-blue-950',
    primaryBtnClass: 'bg-black hover:bg-slate-900 text-white font-black shadow-md border-2 border-black',
    headerBgClass: 'bg-white border-b-2 border-slate-900',
    cardBorderClass: 'border-2 border-slate-400',
    activeTabClass: 'bg-black text-white font-black shadow-md border-2 border-black',
    badgeClass: 'bg-slate-100 text-black border-2 border-slate-900 font-black',
    previewColors: ['#000000', '#ffffff', '#1d4ed8'],
  },
  {
    id: 'crisp_classic',
    name: 'الكحلي الإداري العصري (Modern Executive Navy 👔)',
    nameEn: 'Modern Executive Navy',
    description: 'كحلي إداري داكن وواضح مخصص للأنظمة المحاسبية مع خطوط حادة بدون أي تشويش',
    isDark: false,
    isHighContrast: true,
    primaryColor: '#1e3a8a',
    secondaryColor: '#0f172a',
    accentGradient: 'from-blue-900 to-slate-900',
    primaryBtnClass: 'bg-blue-800 hover:bg-blue-900 text-white font-bold shadow-sm',
    headerBgClass: 'bg-white border-b border-slate-200',
    cardBorderClass: 'border border-slate-200',
    activeTabClass: 'bg-blue-800 text-white font-bold shadow-sm',
    badgeClass: 'bg-blue-50 text-blue-950 border border-blue-200 font-bold',
    previewColors: ['#1e3a8a', '#ffffff', '#0f172a'],
  },
  {
    id: 'soft_paper',
    name: 'الورق الطبي الهادئ (Warm Paper Ink)',
    nameEn: 'Warm Paper Ink',
    description: 'حبر أسود داكن على خلفية دافئة مريحة جداً لنظر الصيدلي في المناوبات الطويلة مع تناسق كامل للخطوط',
    isDark: false,
    primaryColor: '#292524',
    secondaryColor: '#047857',
    accentGradient: 'from-stone-900 via-stone-800 to-emerald-950',
    primaryBtnClass: 'bg-stone-900 hover:bg-black text-white font-black shadow-stone-900/20',
    headerBgClass: 'bg-stone-50 border-b border-stone-300',
    cardBorderClass: 'border border-stone-300',
    activeTabClass: 'bg-stone-900 text-white font-black shadow-stone-900/25',
    badgeClass: 'bg-stone-200 text-stone-900 border border-stone-400 font-bold',
    previewColors: ['#292524', '#f5f5f4', '#047857'],
  },
  {
    id: 'emerald',
    name: 'النعناع والزمرد الطبي',
    nameEn: 'Medical Emerald',
    description: 'الثيم الطبي الهادئ بلمسات الزمرد والنعناع المنعش',
    isDark: false,
    primaryColor: '#0d9488',
    secondaryColor: '#06b6d4',
    accentGradient: 'from-teal-600 via-emerald-600 to-cyan-600',
    primaryBtnClass: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20',
    headerBgClass: 'bg-white/95 border-slate-200/80',
    cardBorderClass: 'border-slate-200',
    activeTabClass: 'bg-teal-600 text-white shadow-teal-600/25',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    previewColors: ['#0d9488', '#06b6d4', '#10b981'],
  },
  {
    id: 'ocean',
    name: 'أزرق المحيط الملكي',
    nameEn: 'Ocean Sapphire',
    description: 'درجات الأزرق والنيلي الفاخر لإعطاء طابع مؤسسي واحترافي رفيع',
    isDark: false,
    primaryColor: '#2563eb',
    secondaryColor: '#0284c7',
    accentGradient: 'from-blue-600 via-indigo-600 to-cyan-600',
    primaryBtnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
    headerBgClass: 'bg-white/95 border-blue-100',
    cardBorderClass: 'border-slate-200',
    activeTabClass: 'bg-blue-600 text-white shadow-blue-600/25',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    previewColors: ['#2563eb', '#3b82f6', '#0284c7'],
  },
  {
    id: 'violet',
    name: 'بنفسجي ملكي وخزامى',
    nameEn: 'Royal Lavender',
    description: 'لمسات ملكية أنيقة باللون البنفسجي واللافندر الراقي',
    isDark: false,
    primaryColor: '#7c3aed',
    secondaryColor: '#9333ea',
    accentGradient: 'from-purple-600 via-violet-600 to-fuchsia-600',
    primaryBtnClass: 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20',
    headerBgClass: 'bg-white/95 border-purple-100',
    cardBorderClass: 'border-purple-100/80',
    activeTabClass: 'bg-violet-600 text-white shadow-violet-600/25',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    previewColors: ['#7c3aed', '#9333ea', '#c084fc'],
  },
  {
    id: 'ruby',
    name: 'ياقوتي ملكي ووردي دافئ',
    nameEn: 'Ruby Rose',
    description: 'درجات الياقوت والوردي المخملي الدافئ لإطلالة مميزة وجريئة',
    isDark: false,
    primaryColor: '#e11d48',
    secondaryColor: '#db2777',
    accentGradient: 'from-rose-600 via-pink-600 to-red-600',
    primaryBtnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
    headerBgClass: 'bg-white/95 border-rose-100',
    cardBorderClass: 'border-rose-100/80',
    activeTabClass: 'bg-rose-600 text-white shadow-rose-600/25',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    previewColors: ['#e11d48', '#db2777', '#f43f5e'],
  },
  {
    id: 'forest',
    name: 'أخضر الغابة الحيوي',
    nameEn: 'Forest Botanical',
    description: 'درجات خضار الطبيعة والأعشاب الطبية المهدئة والمنعشة',
    isDark: false,
    primaryColor: '#15803d',
    secondaryColor: '#059669',
    accentGradient: 'from-green-700 via-emerald-700 to-teal-700',
    primaryBtnClass: 'bg-green-700 hover:bg-green-800 text-white shadow-green-700/20',
    headerBgClass: 'bg-white/95 border-emerald-100',
    cardBorderClass: 'border-emerald-100/80',
    activeTabClass: 'bg-green-700 text-white shadow-green-700/25',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    previewColors: ['#15803d', '#059669', '#34d399'],
  },
  {
    id: 'amber',
    name: 'غروب كهرماني وذهبي',
    nameEn: 'Sunset Amber',
    description: 'دفء الكهرمان والنحاس والذهب لإشراقة دافئة وحيوية',
    isDark: false,
    primaryColor: '#d97706',
    secondaryColor: '#ea580c',
    accentGradient: 'from-amber-600 via-orange-600 to-yellow-600',
    primaryBtnClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
    headerBgClass: 'bg-white/95 border-amber-100',
    cardBorderClass: 'border-amber-100/80',
    activeTabClass: 'bg-amber-600 text-white shadow-amber-600/25',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    previewColors: ['#d97706', '#ea580c', '#fbbf24'],
  },
  {
    id: 'dark',
    name: 'الوضع الليلي الفاخر (Dark OLED)',
    nameEn: 'Midnight Dark OLED',
    description: 'خلفيات داكنة عميقة مريحة جداً للمناوبات الليلية وتوفر طاقة الشاشة',
    isDark: true,
    primaryColor: '#06b6d4',
    secondaryColor: '#3b82f6',
    accentGradient: 'from-slate-900 via-slate-800 to-cyan-950',
    primaryBtnClass: 'bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-cyan-600/30',
    headerBgClass: 'bg-slate-900/95 border-slate-800 text-slate-100',
    cardBorderClass: 'border-slate-800',
    activeTabClass: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-500/20',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
    previewColors: ['#0f172a', '#1e293b', '#06b6d4'],
  },
  {
    id: 'cyber',
    name: 'السيبراني المستقبلي (Neon High-Tech)',
    nameEn: 'Cyber Neon',
    description: 'تباين فائق بتقنيات نيون حديثة تجمع أزرق السايبر والأرجواني اللامع',
    isDark: true,
    primaryColor: '#38bdf8',
    secondaryColor: '#a855f7',
    accentGradient: 'from-cyan-950 via-slate-900 to-purple-950',
    primaryBtnClass: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-cyan-500/25',
    headerBgClass: 'bg-slate-950/95 border-cyan-900/50 text-white',
    cardBorderClass: 'border-cyan-900/40',
    activeTabClass: 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold shadow-cyan-500/30',
    badgeClass: 'bg-cyan-950 text-cyan-300 border-cyan-500/40',
    previewColors: ['#030712', '#0ea5e9', '#a855f7'],
  },
];

const THEME_STORAGE_KEY = 'pharma_pro_theme_id_v1';
const CONTRAST_BOOST_KEY = 'pharma_pro_contrast_boost_v1';

export class ThemeService {
  static getStoredTheme(): ThemeId {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
        if (saved && AVAILABLE_THEMES.some(t => t.id === saved)) {
          return saved;
        }
      }
    } catch (e) {
      console.warn('Could not read theme from localStorage:', e);
    }
    return 'hyper_clarity'; // Premier ultra-crisp readable theme by default
  }

  static isContrastBoost(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(CONTRAST_BOOST_KEY) === 'true';
      }
    } catch (e) {}
    return true; // Default to true for best legibility in Arabic
  }

  static setContrastBoost(enabled: boolean): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CONTRAST_BOOST_KEY, String(enabled));
        if (enabled) {
          document.documentElement.classList.add('contrast-boost');
        } else {
          document.documentElement.classList.remove('contrast-boost');
        }
      }
    } catch (e) {}
  }

  static applyTheme(themeId: ThemeId): ThemeDefinition {
    const theme = AVAILABLE_THEMES.find(t => t.id === themeId) || AVAILABLE_THEMES[0];
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme.id);
        const root = document.documentElement;
        
        // Set data-theme
        root.setAttribute('data-theme', theme.id);
        
        // Toggle dark mode class
        if (theme.isDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }

        // Apply contrast boost class
        const boostActive = theme.isHighContrast || ThemeService.isContrastBoost();
        if (boostActive) {
          root.classList.add('contrast-boost');
        } else {
          root.classList.remove('contrast-boost');
        }

        // Set CSS variables for dynamic styling
        root.style.setProperty('--theme-primary', theme.primaryColor);
        root.style.setProperty('--theme-secondary', theme.secondaryColor);
      }
    } catch (e) {
      console.warn('Could not save theme:', e);
    }
    return theme;
  }
}

import React from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  ShoppingCart,
  Boxes,
  PlusCircle,
  Receipt,
  Building2,
  Store,
  ChevronLeft,
  DollarSign,
  FileText,
} from 'lucide-react';
import {
  Entity,
  Medicine,
  SaleInvoice,
  FinancialTransaction,
  AppSettings,
  UserRole,
} from '../types';
import { NavTab } from '../components/Sidebar';

interface DashboardViewProps {
  entities: Entity[];
  medicines: Medicine[];
  sales: SaleInvoice[];
  transactions: FinancialTransaction[];
  settings: AppSettings;
  currentRole: UserRole;
  onNavigate: (tab: NavTab) => void;
  onSelectEntity: (entity: Entity) => void;
  onNewSale: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  entities,
  medicines,
  sales,
  transactions,
  settings,
  currentRole,
  onNavigate,
  onSelectEntity,
  onNewSale,
}) => {
  // Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = (sales || []).filter(s => s && typeof s.date === 'string' && s.date.startsWith(todayStr));
  const todaySalesTotal = todaySales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);

  // Total Receivables (ديون لنا عند الصيدليات والزبائن)
  const totalReceivables = (entities || [])
    .filter(e => e && e.currentBalance > 0)
    .reduce((sum, e) => sum + (e.currentBalance || 0), 0);

  // Total Payables (ديون علينا لشركات الأدوية والموردين)
  const totalPayables = (entities || [])
    .filter(e => e && e.currentBalance < 0)
    .reduce((sum, e) => sum + Math.abs(e.currentBalance || 0), 0);

  // Expiring soon (< 90 days)
  const now = new Date();
  const ninetyDaysLater = new Date();
  ninetyDaysLater.setDate(now.getDate() + 90);

  const nearExpiryMeds = (medicines || []).filter(m => {
    if (!m || !m.expiryDate) return false;
    const exp = new Date(m.expiryDate);
    return !isNaN(exp.getTime()) && exp <= ninetyDaysLater;
  });

  // Low stock
  const lowStockMeds = (medicines || []).filter(m => m && m.stockQuantity <= m.minQuantity);

  // Estimated gross profit today (Sales - Purchase cost)
  let todayProfit = 0;
  todaySales.forEach(s => {
    if (s && Array.isArray(s.items)) {
      s.items.forEach(item => {
        if (item) {
          const med = (medicines || []).find(m => m && m.id === item.medicineId);
          if (med) {
            todayProfit += ((item.unitPrice || 0) - (med.purchasePrice || 0)) * (item.quantity || 1);
          }
        }
      });
    }
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-l from-slate-900 via-indigo-950 to-cyan-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-cyan-200 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>النظام متزامن ومحمي • تصميم المهندس مالك حريبات</span>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                لوحة التحكم الرئيسية
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">
              أهلاً بك في {settings.pharmacyName}
            </h2>
            <p className="text-sm text-cyan-100 font-medium mt-1 max-w-xl">
              لوحة التحكم المحاسبية المباشرة لإدارة الصيدلية، كشوفات حسابات الشركات والصيدليات الزميلة، وحركات البيع.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onNewSale}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>نقطة بيع سريعة (POS)</span>
            </button>
            <button
              onClick={() => onNavigate('entities')}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur-md border border-white/15 transition-all flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">دفتر الحسابات</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold">مبيعات اليوم ({todaySales.length} فواتير)</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {todaySalesTotal.toLocaleString()} {settings.currency}
          </div>
          {currentRole !== 'pharmacist' ? (
            <div className="text-[11px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
              <span>أرباح تقديرية:</span>
              <span className="font-mono">+{todayProfit.toFixed(1)} {settings.currency}</span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
              <span>حالة الكاشير:</span>
              <span className="text-emerald-700">نشط وجاهز للبيع ✓</span>
            </div>
          )}
        </div>

        {/* Receivables: ديون لنا عند الصيدليات والزبائن */}
        <div
          onClick={() => onNavigate('entities')}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold">ديون مستحقة لنا (ذمم مدينة)</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600">
            {totalReceivables.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            عند الصيدليات الأخرى والزبائن (انقر للتفاصيل)
          </div>
        </div>

        {/* Payables: ديون علينا لشركات الأدوية والموردين */}
        <div
          onClick={() => onNavigate('entities')}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold">مستحقات علينا للشركات (ذمم دائنة)</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-600">
            {totalPayables.toLocaleString()} {settings.currency}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            لشركات ومستودعات الأدوية
          </div>
        </div>

        {/* Inventory alerts */}
        <div
          onClick={() => onNavigate('inventory')}
          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold">تنبيهات الأدوية</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 flex items-center gap-2">
            <span className="text-rose-600">{nearExpiryMeds.length}</span>
            <span className="text-xs font-normal text-slate-400">صلاحية</span>
            <span className="text-slate-300">|</span>
            <span className="text-amber-600">{lowStockMeds.length}</span>
            <span className="text-xs font-normal text-slate-400">نواقص</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            انقر لمراجعة تواريخ الانتهاء والجرد
          </div>
        </div>
      </div>

      {/* Main Content Grid: Top accounts with balances + Recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Accounts spotlight (صيدليات وشركات) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">
                حسابات الصيدليات والشركات النشطة
              </h3>
              <p className="text-xs text-slate-500">
                انقر على أي جهة لفتح كشف حسابها المعتمد وإصدار سند أو فاتورة
              </p>
            </div>
            <button
              onClick={() => onNavigate('entities')}
              className="text-xs text-cyan-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>عرض كافة الحسابات ({entities.length})</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entities.slice(0, 6).map(ent => (
              <div
                key={ent.id}
                onClick={() => onSelectEntity(ent)}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-cyan-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        ent.type === 'pharmacy'
                          ? 'bg-purple-100 text-purple-700'
                          : ent.type === 'company' || ent.type === 'supplier'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {ent.type === 'pharmacy'
                        ? 'صيدلية زميلة'
                        : ent.type === 'company'
                        ? 'شركة أدوية'
                        : ent.type === 'supplier'
                        ? 'مستودع'
                        : 'عميل دائم'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{ent.phone}</span>
                  </div>

                  <h4 className="text-sm font-black text-slate-800 mt-2 group-hover:text-cyan-700 transition-colors">
                    {ent.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {ent.notes || ent.address || 'حساب جاري'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">الرصيد الحالي:</span>
                  <div
                    className={`text-sm font-black font-mono ${
                      ent.currentBalance > 0
                        ? 'text-amber-600'
                        : ent.currentBalance < 0
                        ? 'text-blue-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {Math.abs(ent.currentBalance).toLocaleString()} {settings.currency}{' '}
                    <span className="text-[10px] font-semibold">
                      {ent.currentBalance > 0
                        ? '(لنا)'
                        : ent.currentBalance < 0
                        ? '(له)'
                        : '(مسدد)'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent activity feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">آخر الحركات المالية</h3>
            <span className="text-xs text-slate-400">سجل القيود</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm space-y-3">
            {transactions.slice(0, 5).map(tx => (
              <div
                key={tx.id}
                className="p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 transition-all border border-slate-100"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">{tx.entityName}</span>
                  <span
                    className={`text-xs font-black font-mono ${
                      tx.direction === 'debit' ? 'text-emerald-600' : 'text-blue-600'
                    }`}
                  >
                    {tx.direction === 'debit' ? '+' : '-'}
                    {tx.amount.toLocaleString()} {settings.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>{tx.note || tx.referenceNumber}</span>
                  <span className="font-mono text-[10px]">{tx.date.split(' ')[0]}</span>
                </div>
              </div>
            ))}

            <button
              onClick={() => onNavigate('entities')}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all text-center"
            >
              فتح دفتر الحسابات الكامل
            </button>
          </div>

          {/* Quick shortcuts widget */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100 text-xs space-y-2">
            <h4 className="font-bold text-cyan-900">اختصارات التشغيل السريع:</h4>
            <ul className="text-slate-600 space-y-1">
              <li>• مفتاح <strong>F2</strong>: فتح نقطة البيع فورا</li>
              <li>• انقر على أي صيدلية/شركة لعرض كشف الحساب</li>
              <li>• يدعم المسح الضوئي للباركود وطباعة الفواتير الحرارية 80mm</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

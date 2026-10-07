import React from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Printer,
  DollarSign,
  Download,
  Calendar,
  Layers,
  PieChart,
} from 'lucide-react';
import {
  SaleInvoice,
  Expense,
  Medicine,
  Entity,
  AppSettings,
  UserRole,
} from '../types';

interface ReportsViewProps {
  sales: SaleInvoice[];
  expenses: Expense[];
  medicines: Medicine[];
  entities: Entity[];
  settings: AppSettings;
  currentRole: UserRole;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  expenses,
  medicines,
  entities,
  settings,
  currentRole,
}) => {
  // Calculations
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);

  // Cost of Goods Sold (COGS)
  let totalCOGS = 0;
  sales.forEach(s => {
    s.items.forEach(item => {
      const med = medicines.find(m => m.id === item.medicineId);
      if (med) {
        totalCOGS += med.purchasePrice * item.quantity;
      }
    });
  });

  const grossProfit = totalSalesRevenue - totalCOGS;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalSalesRevenue > 0 ? ((netProfit / totalSalesRevenue) * 100).toFixed(1) : '0';

  // Receivables breakdown
  const pharmacyDebts = entities
    .filter(e => e.type === 'pharmacy' && e.currentBalance > 0)
    .reduce((sum, e) => sum + e.currentBalance, 0);

  const customerDebts = entities
    .filter(e => e.type === 'customer' && e.currentBalance > 0)
    .reduce((sum, e) => sum + e.currentBalance, 0);

  const companyPayables = entities
    .filter(e => (e.type === 'company' || e.type === 'supplier') && e.currentBalance < 0)
    .reduce((sum, e) => sum + Math.abs(e.currentBalance), 0);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-600" />
            <span>التقارير المالية والأرباح والخسائر</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            قائمة الدخل الشاملة، تكلفة البضاعة المباعة، والموقف المالي للديون
          </p>
        </div>

        <button
          onClick={handlePrintReport}
          className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة التقرير المالي</span>
        </button>
      </div>

      {/* Income Statement Card (قائمة الدخل) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider">
              {settings.pharmacyName}
            </span>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">
              قائمة الدخل والأرباح الصافية (Income Statement)
            </h3>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            الفترة: حتى تاريخ {new Date().toLocaleDateString('ar-EG')}
          </div>
        </div>

        {/* Financial Flow Breakdown */}
        <div className="space-y-3 font-mono text-xs">
          {/* 1. Total Revenue */}
          <div className="p-3.5 rounded-2xl bg-slate-50 flex items-center justify-between font-sans">
            <div>
              <span className="font-bold text-slate-800 block text-sm">
                1. إجمالي إيرادات المبيعات (Sales Revenue)
              </span>
              <span className="text-[11px] text-slate-500">
                مجموع كافة الفواتير النقدية والآجلة المسجلة
              </span>
            </div>
            <span className="text-base font-black font-mono text-emerald-700">
              +{totalSalesRevenue.toLocaleString()} {settings.currency}
            </span>
          </div>

          {/* 2. Cost of goods */}
          <div className="p-3.5 rounded-2xl bg-slate-50 flex items-center justify-between font-sans">
            <div>
              <span className="font-bold text-slate-800 block text-sm">
                2. تكلفة البضاعة المباعة (Cost of Goods Sold - COGS)
              </span>
              <span className="text-[11px] text-slate-500">
                سعر شراء الأدوية التي تم بيعها من الموردين
              </span>
            </div>
            <span className="text-base font-black font-mono text-rose-600">
              -{totalCOGS.toLocaleString()} {settings.currency}
            </span>
          </div>

          {/* 3. Gross Profit */}
          <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-100 flex items-center justify-between font-sans">
            <div>
              <span className="font-black text-cyan-950 block text-sm">
                3. مجمل الربح التجاري (Gross Profit)
              </span>
              <span className="text-[11px] text-cyan-700">
                (إجمالي المبيعات مطروحاً منه تكلفة الشراء)
              </span>
            </div>
            <span className="text-lg font-black font-mono text-cyan-900">
              +{grossProfit.toLocaleString()} {settings.currency}
            </span>
          </div>

          {/* 4. Operating Expenses */}
          <div className="p-3.5 rounded-2xl bg-slate-50 flex items-center justify-between font-sans">
            <div>
              <span className="font-bold text-slate-800 block text-sm">
                4. المصاريف التشغيلية والإدارية (Operating Expenses)
              </span>
              <span className="text-[11px] text-slate-500">
                الإيجار، الكهرباء، الرواتب، النثريات، والتجهيزات
              </span>
            </div>
            <span className="text-base font-black font-mono text-rose-600">
              -{totalExpenses.toLocaleString()} {settings.currency}
            </span>
          </div>

          {/* 5. Net Profit Result */}
          <div className="p-5 rounded-3xl bg-gradient-to-l from-slate-900 via-indigo-950 to-cyan-950 text-white flex items-center justify-between font-sans shadow-lg">
            <div>
              <span className="text-xs text-cyan-300 font-bold block">
                النتيجة المالية النهائية
              </span>
              <h4 className="text-lg sm:text-xl font-black mt-0.5">
                صافي الربح الفعلي المحقق (Net Profit)
              </h4>
              <span className="text-[11px] text-slate-300">
                هامش الربح الصافي: {profitMargin}%
              </span>
            </div>
            <div className="text-right">
              <div
                className={`text-2xl sm:text-3xl font-black font-mono ${
                  netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netProfit.toLocaleString()} {settings.currency}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debts Breakdown & Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pharmacy debts */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs text-slate-500 font-bold block">ديون الصيدليات الزميلة لنا</span>
          <div className="text-xl font-black font-mono text-purple-700">
            {pharmacyDebts.toLocaleString()} {settings.currency}
          </div>
          <p className="text-[11px] text-slate-400">
            مستحقات على صيدليات أخرى مقابل تبادل وتوريد أدوية
          </p>
        </div>

        {/* Customer debts */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs text-slate-500 font-bold block">ديون العملاء والزبائن لنا</span>
          <div className="text-xl font-black font-mono text-emerald-700">
            {customerDebts.toLocaleString()} {settings.currency}
          </div>
          <p className="text-[11px] text-slate-400">حسابات أدوية شهرية وعائلية آجلة</p>
        </div>

        {/* Company debts */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs text-slate-500 font-bold block">مستحقات شركات الأدوية علينا</span>
          <div className="text-xl font-black font-mono text-blue-700">
            {companyPayables.toLocaleString()} {settings.currency}
          </div>
          <p className="text-[11px] text-slate-400">فواتير شراء وتوريد لم يتم سدادها بعد</p>
        </div>
      </div>

      {/* Footer watermark */}
      <div className="text-center text-xs text-slate-400 pt-4">
        نظام التقارير المالية الذكي • تصميم وتطوير المهندس مالك حريبات 0594345464
      </div>
    </div>
  );
};

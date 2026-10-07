import React from 'react';
import { Printer, X, Download, Share2 } from 'lucide-react';
import { Entity, FinancialTransaction, AppSettings } from '../types';

interface PrintStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: Entity;
  transactions: FinancialTransaction[];
  settings: AppSettings;
}

export const PrintStatementModal: React.FC<PrintStatementModalProps> = ({
  isOpen,
  onClose,
  entity,
  transactions,
  settings,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalDebit = transactions
    .filter(t => t.direction === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredit = transactions
    .filter(t => t.direction === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = entity.currentBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm no-print">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top bar controls */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحساب / حفظ PDF</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900" id="printable-statement">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-cyan-900">{settings.pharmacyName}</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {settings.address} • هاتف: {settings.phone}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                نظام إدارة ومحاسبة معتمد | تصميم: {settings.designerName} ({settings.designerPhone})
              </p>
            </div>
            <div className="text-left sm:text-right border-r-2 sm:border-r-0 sm:border-l-2 border-slate-300 pr-3 sm:pr-0 sm:pl-3">
              <span className="inline-block px-3 py-1 rounded bg-slate-800 text-white text-xs font-bold uppercase tracking-wider">
                كشف حساب رسمي
              </span>
              <div className="text-xs text-slate-500 mt-1">
                تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
              </div>
            </div>
          </div>

          {/* Entity Profile info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">اسم الحساب:</span>
              <strong className="text-sm font-black text-slate-800">{entity.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">نوع الحساب:</span>
              <strong className="text-slate-800">
                {entity.type === 'pharmacy'
                  ? 'صيدلية زميلة'
                  : entity.type === 'company'
                  ? 'شركة أدوية'
                  : entity.type === 'supplier'
                  ? 'مستودع أدوية'
                  : 'عميل دائم'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">رقم الهاتف:</span>
              <strong className="font-mono text-slate-800">{entity.phone || 'غير مسجل'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">العنوان:</span>
              <strong className="text-slate-800">{entity.address || 'غير محدد'}</strong>
            </div>
          </div>

          {/* Statement Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">نوع الحركة</th>
                  <th className="py-2.5 px-3">رقم المرجع</th>
                  <th className="py-2.5 px-3">البيان والملاحظات</th>
                  <th className="py-2.5 px-3 text-emerald-700">مدين (+)</th>
                  <th className="py-2.5 px-3 text-blue-700">دائن (-)</th>
                  <th className="py-2.5 px-3 text-slate-900">الرصيد بعد الحركة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      لا توجد حركات مسجلة لهذا الحساب حتى الآن
                    </td>
                  </tr>
                ) : (
                  transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{t.date}</td>
                      <td className="py-2.5 px-3 font-medium">
                        {t.type === 'invoice'
                          ? 'فاتورة بيع آجل'
                          : t.type === 'purchase'
                          ? 'فاتورة شراء'
                          : t.type === 'payment_in'
                          ? 'سند قبض نقدي'
                          : t.type === 'payment_out'
                          ? 'سند صرف نقدي'
                          : 'مرتجع'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{t.referenceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-xs">{t.note || '-'}</td>
                      <td className="py-2.5 px-3 font-bold font-mono text-emerald-700">
                        {t.direction === 'debit' ? `${t.amount.toLocaleString()} ${settings.currency}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold font-mono text-blue-700">
                        {t.direction === 'credit' ? `${t.amount.toLocaleString()} ${settings.currency}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-bold font-mono text-slate-800">
                        {t.balanceAfter.toLocaleString()} {settings.currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900 text-white text-xs">
            <div>
              <span className="text-slate-400 block">إجمالي المدين (+):</span>
              <strong className="text-base font-black font-mono text-emerald-400">
                {totalDebit.toLocaleString()} {settings.currency}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block">إجمالي الدائن (-):</span>
              <strong className="text-base font-black font-mono text-cyan-400">
                {totalCredit.toLocaleString()} {settings.currency}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block">الرصيد الصافي الحالي:</span>
              <strong
                className={`text-base font-black font-mono ${
                  netBalance > 0 ? 'text-amber-400' : netBalance < 0 ? 'text-blue-400' : 'text-slate-300'
                }`}
              >
                {Math.abs(netBalance).toLocaleString()} {settings.currency}{' '}
                <span className="text-xs">
                  {netBalance > 0 ? '(مستحق لنا)' : netBalance < 0 ? '(مستحق له)' : '(خالص)'}
                </span>
              </strong>
            </div>
          </div>

          {/* Signatures & Footer */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <div className="border-b border-dashed border-slate-400 pb-10 mb-2">توقيع وختم الصيدلية</div>
              <span>{settings.pharmacyName}</span>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-400 pb-10 mb-2">توقيع المستلم / العميل</div>
              <span>{entity.name}</span>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-4">
            تم إصدار هذا الكشف عبر نظام فارما برو المحاسبي • تصميم المهندس مالك حريبات 0594345464
          </div>
        </div>
      </div>
    </div>
  );
};

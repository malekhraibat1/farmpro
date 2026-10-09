import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Printer,
  Download,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Search,
  AlertCircle,
  FileText,
  BadgeCheck,
  Building2,
  Store,
  User,
  CreditCard,
} from 'lucide-react';
import { Entity, FinancialTransaction, AppSettings, TransactionType, UserRole } from '../types';
import { PrintStatementModal } from './PrintStatementModal';

interface EntityLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: Entity;
  transactions: FinancialTransaction[];
  settings: AppSettings;
  currentRole?: UserRole;
  onAddTransaction: (
    entityId: string,
    amount: number,
    type: TransactionType,
    direction: 'debit' | 'credit',
    note: string,
    referenceNumber: string
  ) => void;
  onUpdateCreditLimit?: (entityId: string, newLimit: number) => void;
}

export const EntityLedgerModal: React.FC<EntityLedgerModalProps> = ({
  isOpen,
  onClose,
  entity,
  transactions,
  settings,
  currentRole = 'admin',
  onAddTransaction,
  onUpdateCreditLimit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Form states for new transaction
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<TransactionType>('payment_in');
  const [formRef, setFormRef] = useState(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
  const [formNote, setFormNote] = useState('');

  if (!isOpen) return null;

  // Filter transactions for this entity
  const entityTxs = transactions
    .filter(t => t.entityId === entity.id)
    .filter(t => {
      if (filterType === 'debit') return t.direction === 'debit';
      if (filterType === 'credit') return t.direction === 'credit';
      if (filterType !== 'all') return t.type === filterType;
      return true;
    })
    .filter(t => {
      if (!searchTerm) return true;
      return (
        t.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalDebit = transactions
    .filter(t => t.entityId === entity.id && t.direction === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredit = transactions
    .filter(t => t.entityId === entity.id && t.direction === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const creditUsagePercent =
    entity.creditLimit > 0
      ? Math.min(100, Math.round((Math.max(0, entity.currentBalance) / entity.creditLimit) * 100))
      : 0;

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    let direction: 'debit' | 'credit' = 'credit';
    if (formType === 'invoice' || formType === 'payment_out') {
      direction = 'debit';
    } else {
      direction = 'credit';
    }

    onAddTransaction(entity.id, amountNum, formType, direction, formNote, formRef);
    setFormAmount('');
    setFormNote('');
    setFormRef(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
    setShowAddForm(false);
  };

  const handleExportCSV = () => {
    const headers = ['التاريخ', 'النوع', 'رقم المرجع', 'البيان', 'المبلغ', 'الاتجاه', 'الرصيد بعد الحركة'];
    const rows = entityTxs.map(t => [
      t.date,
      t.type,
      t.referenceNumber,
      `"${t.note.replace(/"/g, '""')}"`,
      t.amount,
      t.direction === 'debit' ? 'مدين (+)' : 'دائن (-)',
      t.balanceAfter,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `كشف_حساب_${entity.name}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cleanPhone = entity.phone ? entity.phone.replace(/[^0-9]/g, '') : '';
  const waPhone = cleanPhone.startsWith('0') ? `970${cleanPhone.slice(1)}` : cleanPhone;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
          {/* Header Card */}
          <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-cyan-950 p-5 sm:p-6 text-white relative shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pr-1">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  {entity.type === 'pharmacy' ? (
                    <Store className="w-7 h-7 text-cyan-300" />
                  ) : entity.type === 'company' || entity.type === 'supplier' ? (
                    <Building2 className="w-7 h-7 text-indigo-300" />
                  ) : (
                    <User className="w-7 h-7 text-emerald-300" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-cyan-200">
                      {entity.type === 'pharmacy'
                        ? 'صيدلية زميلة'
                        : entity.type === 'company'
                        ? 'شركة أدوية ومورد'
                        : entity.type === 'supplier'
                        ? 'مستودع أدوية'
                        : 'عميل دائم'}
                    </span>
                    <span className="text-xs text-slate-400">كود: {entity.id}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{entity.name}</h2>
                  <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                    <span>{entity.address || 'العنوان غير محدد'}</span>
                    <span>•</span>
                    <span>تاريخ البدء: {entity.createdAt}</span>
                  </p>
                </div>
              </div>

              {/* Contact and Direct Action Buttons */}
              <div className="flex items-center gap-2">
                {entity.phone && (
                  <>
                    <a
                      href={`tel:${entity.phone}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
                      title="اتصال هاتفي"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span className="dir-ltr">{entity.phone}</span>
                    </a>
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-sm"
                      title="مراسلة واتساب"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>
                  </>
                )}

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">طباعة كشف</span>
                </button>
              </div>
            </div>

            {/* Financial Status Summary Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                <span className="text-slate-300 block text-[11px]">الرصيد الصافي الحالي</span>
                <div
                  className={`text-lg sm:text-xl font-black font-mono mt-0.5 ${
                    entity.currentBalance > 0
                      ? 'text-amber-300'
                      : entity.currentBalance < 0
                      ? 'text-cyan-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {Math.abs(entity.currentBalance).toLocaleString()} {settings.currency}{' '}
                  <span className="text-[10px] font-normal">
                    {entity.currentBalance > 0
                      ? '(مستحق لنا / مدين)'
                      : entity.currentBalance < 0
                      ? '(مستحق له / دائن)'
                      : '(حساب مسدد)'}
                  </span>
                </div>
              </div>

              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                <span className="text-slate-300 block text-[11px]">إجمالي المسحوبات (مدين)</span>
                <div className="text-base sm:text-lg font-bold font-mono text-white mt-0.5">
                  {totalDebit.toLocaleString()} {settings.currency}
                </div>
              </div>

              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                <span className="text-slate-300 block text-[11px]">إجمالي المسدد (دائن)</span>
                <div className="text-base sm:text-lg font-bold font-mono text-emerald-300 mt-0.5">
                  {totalCredit.toLocaleString()} {settings.currency}
                </div>
              </div>

              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                <div className="flex justify-between items-center text-[11px] text-slate-300">
                  <span>سقف الائتمان</span>
                  <span className="font-mono text-cyan-200">
                    {entity.creditLimit.toLocaleString()} {settings.currency}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      creditUsagePercent >= 90
                        ? 'bg-rose-400'
                        : creditUsagePercent >= 60
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${creditUsagePercent}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 text-left">
                  مستهلك: {creditUsagePercent}%
                </div>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFormType('payment_in');
                  setShowAddForm(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>سند قبض نقدي (تحصيل)</span>
              </button>

              <button
                onClick={() => {
                  setFormType('payment_out');
                  setShowAddForm(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>سند صرف نقدي (سداد)</span>
              </button>

              {currentRole !== 'pharmacist' && (
                <button
                  onClick={() => {
                    setFormType('invoice');
                    setShowAddForm(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  title="خاص بالمدير لتعديل الرصيد يدوياً"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>قيد فاتورة / تعديل رصيد</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث في الحركات..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Export CSV */}
              <button
                onClick={handleExportCSV}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1"
                title="تصدير كشف حساب Excel/CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">تصدير CSV</span>
              </button>
            </div>
          </div>

          {/* Quick Add Form Drawer */}
          {showAddForm && (
            <form
              onSubmit={handleCreateTransaction}
              className="p-4 bg-cyan-50/70 border-b border-cyan-200/80 animate-in slide-in-from-top-4 duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-cyan-700" />
                  <span>تسجيل حركة مالية جديدة للحساب</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">نوع الحركة</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as TransactionType)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="payment_in">سند قبض نقدي (دفعة مسددة)</option>
                    <option value="payment_out">سند صرف نقدي (سداد للشركة)</option>
                    <option value="invoice">فاتورة بيع على الحساب</option>
                    <option value="purchase">فاتورة شراء بضاعة</option>
                    <option value="return">مرتجع مالي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">المبلغ ({settings.currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">رقم المرجع / الإيصال</label>
                  <input
                    type="text"
                    value={formRef}
                    onChange={e => setFormRef(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">البيان والملاحظات</label>
                  <input
                    type="text"
                    placeholder="مثلاً: دفعة شيك، تسديد نقدي..."
                    value={formNote}
                    onChange={e => setFormNote(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-1.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-sm"
                >
                  حفظ وتحديث الرصيد
                </button>
              </div>
            </form>
          )}

          {/* Ledger Table */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="py-3 px-3.5">التاريخ والوقت</th>
                    <th className="py-3 px-3.5">نوع الحركة</th>
                    <th className="py-3 px-3.5">رقم المرجع</th>
                    <th className="py-3 px-3.5">البيان / الملاحظات</th>
                    <th className="py-3 px-3.5 text-emerald-700">مدين (+)</th>
                    <th className="py-3 px-3.5 text-blue-700">دائن (-)</th>
                    <th className="py-3 px-3.5 text-slate-900">الرصيد بعد الحركة</th>
                    <th className="py-3 px-3.5">المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entityTxs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p>لا توجد حركات مالية مطابقة للبحث</p>
                      </td>
                    </tr>
                  ) : (
                    entityTxs.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-3 px-3.5 font-bold whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              tx.type === 'invoice'
                                ? 'bg-amber-100 text-amber-800'
                                : tx.type === 'purchase'
                                ? 'bg-indigo-100 text-indigo-800'
                                : tx.type === 'payment_in'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.type === 'payment_out'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tx.type === 'invoice'
                              ? 'فاتورة بيع آجل'
                              : tx.type === 'purchase'
                              ? 'فاتورة شراء'
                              : tx.type === 'payment_in'
                              ? 'سند قبض نقدي'
                              : tx.type === 'payment_out'
                              ? 'سند صرف نقدي'
                              : 'مرتجع'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-slate-600 font-semibold">{tx.referenceNumber}</td>
                        <td className="py-3 px-3.5 text-slate-700 max-w-sm">{tx.note || '-'}</td>
                        <td className="py-3 px-3.5 font-bold font-mono text-emerald-700 text-sm whitespace-nowrap">
                          {tx.direction === 'debit' ? `+${tx.amount.toLocaleString()} ${settings.currency}` : '-'}
                        </td>
                        <td className="py-3 px-3.5 font-bold font-mono text-blue-700 text-sm whitespace-nowrap">
                          {tx.direction === 'credit' ? `-${tx.amount.toLocaleString()} ${settings.currency}` : '-'}
                        </td>
                        <td className="py-3 px-3.5 font-black font-mono text-slate-800 text-sm whitespace-nowrap">
                          {tx.balanceAfter.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-3 px-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                          {tx.recordedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer watermark & close button */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span>
              نظام إدارة كشوفات الحسابات • تصميم: {settings.designerName} ({settings.designerPhone})
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-all"
            >
              إغلاق الصفحة
            </button>
          </div>
        </div>
      </div>

      {/* Print Statement Modal */}
      {showPrintModal && (
        <PrintStatementModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          entity={entity}
          transactions={entityTxs}
          settings={settings}
        />
      )}
    </>
  );
};

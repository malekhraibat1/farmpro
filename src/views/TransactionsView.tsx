import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  PlusCircle,
  FileText,
  Printer,
  Download,
  Trash2,
  Edit3,
  Calendar,
  Building2,
  Store,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  FinancialTransaction,
  Entity,
  AppSettings,
  TransactionType,
  TransactionDirection,
  UserRole,
} from '../types';

interface TransactionsViewProps {
  transactions: FinancialTransaction[];
  entities: Entity[];
  settings: AppSettings;
  currentRole?: UserRole;
  onAddTransaction: (
    entityId: string,
    amount: number,
    type: TransactionType,
    direction: TransactionDirection,
    note: string,
    referenceNumber: string,
    customDate?: string
  ) => void;
  onUpdateTransaction: (transaction: FinancialTransaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onSelectEntity?: (entity: Entity) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  entities,
  settings,
  currentRole = 'admin',
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onSelectEntity,
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<'all' | 'debit' | 'credit'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<FinancialTransaction | null>(null);

  // Add Form state
  const [newEntityId, setNewEntityId] = useState(entities[0]?.id || '');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<TransactionType>('payment_in');
  const [newRef, setNewRef] = useState(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newNote, setNewNote] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 16));

  // Edit Form state
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<TransactionType>('payment_in');
  const [editRef, setEditRef] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(tx => {
        // Entity filter
        if (selectedEntityId !== 'all' && tx.entityId !== selectedEntityId) {
          return false;
        }

        // Type filter
        if (selectedType !== 'all' && tx.type !== selectedType) {
          return false;
        }

        // Direction filter
        if (selectedDirection !== 'all' && tx.direction !== selectedDirection) {
          return false;
        }

        // Date filter
        if (dateRange !== 'all') {
          const txDate = new Date(tx.date);
          const now = new Date();
          if (dateRange === 'today') {
            const todayStr = now.toISOString().slice(0, 10);
            if (!tx.date.startsWith(todayStr)) return false;
          } else if (dateRange === 'week') {
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (txDate < oneWeekAgo) return false;
          } else if (dateRange === 'month') {
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (txDate < oneMonthAgo) return false;
          }
        }

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNote = tx.note?.toLowerCase().includes(q);
          const matchRef = tx.referenceNumber?.toLowerCase().includes(q);
          const matchEntity = tx.entityName?.toLowerCase().includes(q);
          const matchAmount = tx.amount.toString().includes(q);
          return matchNote || matchRef || matchEntity || matchAmount;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedEntityId, selectedType, selectedDirection, dateRange, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const totalTransactions = filteredTransactions.length;
    const totalPaymentsIn = filteredTransactions
      .filter(t => t.type === 'payment_in')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalInvoices = filteredTransactions
      .filter(t => t.type === 'invoice')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalPaymentsOut = filteredTransactions
      .filter(t => t.type === 'payment_out')
      .reduce((sum, t) => sum + t.amount, 0);

    return { totalTransactions, totalPaymentsIn, totalInvoices, totalPaymentsOut };
  }, [filteredTransactions]);

  // Handle Add Submit
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newAmount);
    if (!newEntityId || isNaN(amountNum) || amountNum <= 0) return;

    let direction: TransactionDirection = 'credit';
    if (newType === 'invoice' || newType === 'payment_out') {
      direction = 'debit';
    } else {
      direction = 'credit';
    }

    onAddTransaction(
      newEntityId,
      amountNum,
      newType,
      direction,
      newNote.trim() || 'حركة مسجلة يدوياً',
      newRef.trim(),
      newDate
    );

    // Reset & close
    setNewAmount('');
    setNewNote('');
    setNewRef(`REF-${Math.floor(1000 + Math.random() * 9000)}`);
    setShowAddModal(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (tx: FinancialTransaction) => {
    setEditingTransaction(tx);
    setEditAmount(tx.amount.toString());
    setEditType(tx.type);
    setEditRef(tx.referenceNumber);
    setEditNote(tx.note);
    setEditDate(tx.date);
  };

  // Handle Edit Submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    let direction: TransactionDirection = 'credit';
    if (editType === 'invoice' || editType === 'payment_out') {
      direction = 'debit';
    } else {
      direction = 'credit';
    }

    const updatedTx: FinancialTransaction = {
      ...editingTransaction,
      amount: amountNum,
      type: editType,
      direction,
      referenceNumber: editRef.trim(),
      note: editNote.trim(),
      date: editDate,
    };

    onUpdateTransaction(updatedTx);
    setEditingTransaction(null);
  };

  // Handle Delete Confirm
  const handleConfirmDelete = () => {
    if (!deletingTransaction) return;
    onDeleteTransaction(deletingTransaction.id);
    setDeletingTransaction(null);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'التاريخ والوقت',
      'اسم الحساب / الكيان',
      'نوع الحركة',
      'رقم المرجع',
      'البيان والملاحظات',
      'المبلغ',
      'الاتجاه',
      'الرصيد بعد الحركة',
      'المسؤول',
    ];

    const rows = filteredTransactions.map(tx => [
      tx.date,
      `"${tx.entityName || ''}"`,
      tx.type,
      `"${tx.referenceNumber || ''}"`,
      `"${tx.note || ''}"`,
      tx.amount,
      tx.direction === 'debit' ? 'مدين (+)' : 'دائن (-)',
      tx.balanceAfter,
      `"${tx.recordedBy || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>سجل الحركات والمعاملات المالية والمخزنية</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            سجل شامل لكافة الفواتير، سندات القبض والصرف، الدفعات النقدية، والمردودات مع إمكانية التعديل والحذف
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
            title="تصدير كشف الحركات إلى ملف Excel/CSV"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline">تصدير CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-600 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
            title="طباعة كشف الحركات المفلترة"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline">طباعة</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs shadow-md shadow-cyan-600/25 transition-all flex items-center gap-1.5 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تسجيل حركة جديدة</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Transactions */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">
              إجمالي الحركات المعروضة
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {stats.totalTransactions.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">حركة مسجلة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
        </div>

        {/* Total Payments Received (Cash in) */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">
              إجمالي سندات القبض (مقبوضات)
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.totalPaymentsIn.toLocaleString()} {settings.currency}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">تحصيلات نقدية</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Invoices (Debts Issued) */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">
              فواتير البيع الآجل (ديون لنا)
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {stats.totalInvoices.toLocaleString()} {settings.currency}
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">مبيعات على الحساب</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Total Payments Out (Supplier payments) */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">
              إجمالي سندات الصرف (مدفوعات)
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
              {stats.totalPaymentsOut.toLocaleString()} {settings.currency}
            </div>
            <span className="text-[11px] text-blue-600 dark:text-blue-400">سداد للشركات والموردين</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search box (5 cols) */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="ابحث برقم المرجع، البيان، اسم الزبون، المبلغ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold"
            />
          </div>

          {/* Entity filter (3 cols) */}
          <div className="lg:col-span-3">
            <select
              value={selectedEntityId}
              onChange={e => setSelectedEntityId(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">كافة الحسابات والزبائن ({entities.length})</option>
              <optgroup label="الصيدليات">
                {entities
                  .filter(e => e.type === 'pharmacy')
                  .map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="الشركات والموردون">
                {entities
                  .filter(e => e.type === 'company' || e.type === 'supplier')
                  .map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="الزبائن والعملاء">
                {entities
                  .filter(e => e.type === 'customer')
                  .map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Transaction Type filter (2 cols) */}
          <div className="lg:col-span-3">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">كافة أنواع الحركات</option>
              <option value="payment_in">سند قبض نقدي (تحصيل)</option>
              <option value="payment_out">سند صرف نقدي (سداد)</option>
              <option value="invoice">فاتورة بيع آجل</option>
              <option value="purchase">فاتورة شراء بضاعة</option>
              <option value="return">مرتجع مالي</option>
            </select>
          </div>

          {/* Date Range filter (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
              className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">كل الفترات</option>
              <option value="today">اليوم فقط</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">آخر 30 يوماً</option>
            </select>
          </div>
        </div>

        {/* Direction pills & Active filters count */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold">الاتجاه المالي:</span>
            <button
              type="button"
              onClick={() => setSelectedDirection('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedDirection === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setSelectedDirection('debit')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedDirection === 'debit'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              مدين (+) مستحق لنا
            </button>
            <button
              type="button"
              onClick={() => setSelectedDirection('credit')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedDirection === 'credit'
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100'
              }`}
            >
              دائن (-) سداد أو دفعة
            </button>
          </div>

          <div className="text-slate-500 font-medium text-[11px]">
            عرض {filteredTransactions.length} حركة من أصل {transactions.length}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 font-black border-b-2 border-slate-200 dark:border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-3.5 px-3">التاريخ والوقت</th>
                <th className="py-3.5 px-3">الزبون / الحساب</th>
                <th className="py-3.5 px-3">نوع الحركة</th>
                <th className="py-3.5 px-3">رقم المرجع</th>
                <th className="py-3.5 px-3">البيان / الملاحظات</th>
                <th className="py-3.5 px-3 text-emerald-700 dark:text-emerald-400">مدين (+)</th>
                <th className="py-3.5 px-3 text-blue-700 dark:text-blue-400">دائن (-)</th>
                <th className="py-3.5 px-3 text-slate-900 dark:text-slate-100">الرصيد بعدها</th>
                <th className="py-3.5 px-3">المسؤول</th>
                <th className="py-3.5 px-3 text-center">الإجراءات (تعديل / حذف)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-bold text-sm">لا توجد حركات مطابقة لشروط البحث</p>
                    <p className="text-xs text-slate-400 mt-1">
                      جرب تغيير الفلاتر أو تسجيل حركة مالية جديدة
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const ent = entities.find(e => e.id === tx.entityId);
                  const isPharmacy = ent?.type === 'pharmacy';
                  const isCompany = ent?.type === 'company' || ent?.type === 'supplier';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-750/90 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {tx.date}
                      </td>

                      {/* Customer / Entity */}
                      <td className="py-3 px-3 font-bold whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => ent && onSelectEntity && onSelectEntity(ent)}
                          className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors font-black text-right"
                          title="فتح كشف حساب هذا الكيان"
                        >
                          {isPharmacy ? (
                            <Store className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          ) : isCompany ? (
                            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                          <span className="truncate max-w-[140px]">{tx.entityName || 'حساب غير محدد'}</span>
                        </button>
                      </td>

                      {/* Transaction Type Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            tx.type === 'invoice'
                              ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200'
                              : tx.type === 'purchase'
                              ? 'bg-indigo-50 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200'
                              : tx.type === 'payment_in'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200'
                              : tx.type === 'payment_out'
                              ? 'bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200'
                              : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-200'
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
                            : 'مرتجع مالي'}
                        </span>
                      </td>

                      {/* Ref */}
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap text-[11px]">
                        {tx.referenceNumber || '-'}
                      </td>

                      {/* Note */}
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={tx.note}>
                        {tx.note || '-'}
                      </td>

                      {/* Debit (+) */}
                      <td className="py-3 px-3 font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm whitespace-nowrap">
                        {tx.direction === 'debit'
                          ? `+${tx.amount.toLocaleString()} ${settings.currency}`
                          : '-'}
                      </td>

                      {/* Credit (-) */}
                      <td className="py-3 px-3 font-mono font-black text-blue-700 dark:text-blue-400 text-sm whitespace-nowrap">
                        {tx.direction === 'credit'
                          ? `-${tx.amount.toLocaleString()} ${settings.currency}`
                          : '-'}
                      </td>

                      {/* Balance After */}
                      <td className="py-3 px-3 font-mono font-black text-slate-900 dark:text-white text-xs whitespace-nowrap">
                        {tx.balanceAfter !== undefined
                          ? `${tx.balanceAfter.toLocaleString()} ${settings.currency}`
                          : '-'}
                      </td>

                      {/* Recorded By */}
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {tx.recordedBy || 'المسؤول'}
                      </td>

                      {/* ACTIONS: EDIT & DELETE */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 transition-all font-bold flex items-center gap-1 text-[11px]"
                            title="تعديل بيانات هذه الحركة"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">تعديل</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeletingTransaction(tx)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-all font-bold flex items-center gap-1 text-[11px]"
                            title="حذف هذه الحركة نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          ADD NEW TRANSACTION MODAL
          ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="p-5 bg-gradient-to-l from-cyan-900 via-slate-900 to-indigo-950 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-cyan-400" />
                  <span>تسجيل حركة مالية جديدة في السجلات</span>
                </h3>
                <p className="text-xs text-slate-300">
                  إضافة سند قبض أو صرف أو فاتورة لحساب صيدلية أو شركة أو زبون
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAdd} className="p-6 space-y-4 text-xs">
              {/* Target Entity */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  الزبون / الحساب المستهدف *
                </label>
                <select
                  required
                  value={newEntityId}
                  onChange={e => setNewEntityId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="" disabled>
                    اختر الحساب...
                  </option>
                  <optgroup label="الصيدليات الزميلة">
                    {entities
                      .filter(e => e.type === 'pharmacy')
                      .map(ent => (
                        <option key={ent.id} value={ent.id}>
                          {ent.name} (رصيده: {ent.currentBalance} {settings.currency})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="شركات ومستودعات الأدوية">
                    {entities
                      .filter(e => e.type === 'company' || e.type === 'supplier')
                      .map(ent => (
                        <option key={ent.id} value={ent.id}>
                          {ent.name} (رصيده: {ent.currentBalance} {settings.currency})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="الزبائن والعملاء">
                    {entities
                      .filter(e => e.type === 'customer')
                      .map(ent => (
                        <option key={ent.id} value={ent.id}>
                          {ent.name} (رصيده: {ent.currentBalance} {settings.currency})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">نوع الحركة *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('payment_in')}
                    className={`py-2 px-2.5 rounded-xl border font-bold text-center transition-all ${
                      newType === 'payment_in'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    سند قبض (دفعة+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('payment_out')}
                    className={`py-2 px-2.5 rounded-xl border font-bold text-center transition-all ${
                      newType === 'payment_out'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    سند صرف (سداد-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('invoice')}
                    className={`py-2 px-2.5 rounded-xl border font-bold text-center transition-all ${
                      newType === 'invoice'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    فاتورة بيع آجل
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('purchase')}
                    className={`py-2 px-2.5 rounded-xl border font-bold text-center transition-all ${
                      newType === 'purchase'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    فاتورة شراء بضاعة
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('return')}
                    className={`py-2 px-2.5 rounded-xl border font-bold text-center transition-all ${
                      newType === 'return'
                        ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    مرتجع مالي
                  </button>
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    المبلغ ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">التاريخ والوقت</label>
                  <input
                    type="datetime-local"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Reference & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">رقم المرجع / الإيصال</label>
                  <input
                    type="text"
                    value={newRef}
                    onChange={e => setNewRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">البيان والملاحظات</label>
                  <input
                    type="text"
                    placeholder="مثلاً: دفعة شيك، تسديد نقدي..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black shadow-md shadow-cyan-600/20"
                >
                  حفظ وتسجيل الحركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          EDIT TRANSACTION MODAL
          ======================================================== */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="p-5 bg-gradient-to-l from-slate-900 to-cyan-950 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" />
                  <span>تعديل حركة مالية مسجلة</span>
                </h3>
                <p className="text-xs text-slate-300">
                  الحساب: {editingTransaction.entityName} • المرجع: {editingTransaction.referenceNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTransaction(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              {/* Type */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">نوع الحركة *</label>
                <select
                  value={editType}
                  onChange={e => setEditType(e.target.value as TransactionType)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="payment_in">سند قبض نقدي (تحصيل دفعة +)</option>
                  <option value="payment_out">سند صرف نقدي (سداد للشركة -)</option>
                  <option value="invoice">فاتورة بيع آجل (دين مستحق لنا +)</option>
                  <option value="purchase">فاتورة شراء بضاعة (مستحق للشركة -)</option>
                  <option value="return">مرتجع مالي</option>
                </select>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    المبلغ الجديد ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">التاريخ والوقت</label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Ref & Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">رقم المرجع</label>
                  <input
                    type="text"
                    value={editRef}
                    onChange={e => setEditRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">البيان والملاحظات</label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/60 rounded-xl text-[11px] text-cyan-900 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-600 shrink-0" />
                <span>
                  ملاحظة: سيتم تحديث رصيد الحساب المالي تلقائياً ومطابقة الفروقات فور حفظ التعديل.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black shadow-md shadow-cyan-600/20"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          DELETE CONFIRMATION MODAL
          ======================================================== */}
      {deletingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden text-slate-800 dark:text-slate-100">
            <div className="p-5 bg-gradient-to-l from-rose-700 to-rose-900 text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <h3 className="text-base font-black">تأكيد حذف الحركة المالية</h3>
                <p className="text-xs text-rose-100">إجراء حساس لا يمكن التراجع عنه</p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذه الحركة بشكل نهائي من السجلات؟
              </p>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">الحساب:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-sans">
                    {deletingTransaction.entityName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المبلغ:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {deletingTransaction.amount.toLocaleString()} {settings.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">نوع الحركة:</span>
                  <span className="font-bold font-sans">
                    {deletingTransaction.type === 'invoice'
                      ? 'فاتورة بيع'
                      : deletingTransaction.type === 'payment_in'
                      ? 'سند قبض'
                      : deletingTransaction.type === 'payment_out'
                      ? 'سند صرف'
                      : deletingTransaction.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">رقم المرجع:</span>
                  <span className="font-bold">{deletingTransaction.referenceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">التاريخ:</span>
                  <span>{deletingTransaction.date}</span>
                </div>
              </div>

              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                ⚠️ تنبيه: حذف الحركة سيؤدي إلى إعادة تسوية وتعديل رصيد الحساب المالي الحالي المقابل تلقائياً.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingTransaction(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md shadow-rose-600/25 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تأكيد الحذف النهائي</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

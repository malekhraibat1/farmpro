import React, { useState } from 'react';
import { Receipt, Plus, Search, Calendar, DollarSign, Tag, Trash2 } from 'lucide-react';
import { Expense, AppSettings, UserRole } from '../types';

interface ExpensesViewProps {
  expenses: Expense[];
  settings: AppSettings;
  currentRole: UserRole;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  settings,
  currentRole,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('rent');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter(exp => {
    if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;
    if (searchTerm && !exp.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (!title.trim() || isNaN(amountNum) || amountNum <= 0) return;

    onAddExpense({
      title: title.trim(),
      category,
      amount: amountNum,
      date,
      notes: notes.trim(),
      recordedBy: currentRole === 'admin' ? 'م. مالك حريبات' : 'صيدلي مناوب',
    });

    setTitle('');
    setAmount('');
    setNotes('');
    setShowAddModal(false);
  };

  const getCategoryLabel = (cat: Expense['category']) => {
    switch (cat) {
      case 'rent':
        return 'إيجار مقر';
      case 'electricity':
        return 'كهرباء ومياه وتكييف';
      case 'salaries':
        return 'رواتب وأجور';
      case 'supplies':
        return 'مستلزمات وأكياس ومطبوعات';
      case 'cleaning':
        return 'نظافة ومطهرات';
      case 'maintenance':
        return 'صيانة وتجهيزات';
      default:
        return 'نثريات ومصاريف عامة';
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-indigo-600" />
            <span>سندات ومصاريف الصيدلية التشغيلية</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            تسجيل الإيجارات، الرواتب، فواتير الكهرباء وتكاليف تشغيل الصيدلية لحساب الأرباح الصافية
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة سند صرف / مصروف جديد</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 block">إجمالي المصاريف المسجلة</span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-300 mt-1">
            {totalExpenses.toLocaleString()} {settings.currency}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            يتم خصم هذا المبلغ تلقائياً من الأرباح الإجمالية لحساب صافي الربح
          </span>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-cyan-300">
          <DollarSign className="w-8 h-8" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="بحث في المصاريف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-xs rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
          />
        </div>

        <div className="w-full sm:w-60">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full p-2 text-xs rounded-2xl border border-slate-200 bg-white shadow-sm font-semibold"
          >
            <option value="all">كافة أنواع المصاريف</option>
            <option value="rent">إيجار مقر</option>
            <option value="electricity">كهرباء ومياه وتكييف</option>
            <option value="salaries">رواتب وأجور</option>
            <option value="supplies">مستلزمات وأكياس ومطبوعات</option>
            <option value="maintenance">صيانة وتجهيزات</option>
            <option value="other">نثريات ومصاريف عامة</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">التاريخ</th>
              <th className="py-3 px-4">البيان / عنوان المصروف</th>
              <th className="py-3 px-4">التصنيف</th>
              <th className="py-3 px-4">المبلغ</th>
              <th className="py-3 px-4">المسؤول</th>
              <th className="py-3 px-4">ملاحظات</th>
              {currentRole === 'admin' && <th className="py-3 px-4 text-center">حذف</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  لا توجد مصاريف مسجلة
                </td>
              </tr>
            ) : (
              filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {exp.date}
                  </td>
                  <td className="py-3 px-4 font-black text-slate-900">{exp.title}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                      {getCategoryLabel(exp.category)}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-black font-mono text-rose-600 text-sm">
                    {exp.amount.toFixed(2)} {settings.currency}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">{exp.recordedBy}</td>
                  <td className="py-3 px-4 text-slate-500">{exp.notes || '-'}</td>
                  {currentRole === 'admin' && (
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف ${exp.title}؟`)) {
                            onDeleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-l from-indigo-800 to-slate-900 text-white flex justify-between items-center">
              <h3 className="text-base font-black">تسجيل سند صرف / مصروف جديد</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">البيان / عنوان المصروف *</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: فاتورة كهرباء، صيانة مكيف، إيجار..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    المبلغ ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">التاريخ</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع المصروف</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as Expense['category'])}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                >
                  <option value="rent">إيجار مقر</option>
                  <option value="electricity">كهرباء ومياه وتكييف</option>
                  <option value="salaries">رواتب وأجور</option>
                  <option value="supplies">مستلزمات وأكياس ومطبوعات</option>
                  <option value="maintenance">صيانة وتجهيزات</option>
                  <option value="other">نثريات ومصاريف عامة</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات حول طريقة الدفع، اسم المستلم..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
                >
                  حفظ السند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

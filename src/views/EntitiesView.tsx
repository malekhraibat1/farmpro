import React, { useState } from 'react';
import {
  Users,
  Building2,
  Store,
  User,
  Plus,
  Search,
  Filter,
  Phone,
  MessageSquare,
  FileText,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  AlertCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Entity, EntityType, FinancialTransaction, AppSettings, TransactionType } from '../types';
import { EntityLedgerModal } from '../components/EntityLedgerModal';

interface EntitiesViewProps {
  entities: Entity[];
  transactions: FinancialTransaction[];
  settings: AppSettings;
  onAddEntity: (newEntity: Omit<Entity, 'id' | 'createdAt'>) => void;
  onAddTransaction: (
    entityId: string,
    amount: number,
    type: TransactionType,
    direction: 'debit' | 'credit',
    note: string,
    referenceNumber: string
  ) => void;
  selectedEntityForLedger?: Entity | null;
  onCloseLedgerModal?: () => void;
  onOpenLedgerModal?: (entity: Entity) => void;
}

export const EntitiesView: React.FC<EntitiesViewProps> = ({
  entities,
  transactions,
  settings,
  onAddEntity,
  onAddTransaction,
  selectedEntityForLedger,
  onCloseLedgerModal,
  onOpenLedgerModal,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | EntityType>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debtors' | 'creditors' | 'settled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeLedgerEntity, setActiveLedgerEntity] = useState<Entity | null>(null);

  // New Entity Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<EntityType>('pharmacy');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('5000');
  const [initialBalance, setInitialBalance] = useState('0');
  const [notes, setNotes] = useState('');

  // Handle entity selected
  const handleOpenLedger = (entity: Entity) => {
    if (onOpenLedgerModal) {
      onOpenLedgerModal(entity);
    } else {
      setActiveLedgerEntity(entity);
    }
  };

  const handleCloseLedger = () => {
    if (onCloseLedgerModal) {
      onCloseLedgerModal();
    }
    setActiveLedgerEntity(null);
  };

  const currentLedger = selectedEntityForLedger || activeLedgerEntity;

  // Filter entities
  const filteredEntities = entities.filter(ent => {
    // Type tab
    if (activeTab !== 'all' && ent.type !== activeTab) return false;

    // Balance filter
    if (balanceFilter === 'debtors' && ent.currentBalance <= 0) return false;
    if (balanceFilter === 'creditors' && ent.currentBalance >= 0) return false;
    if (balanceFilter === 'settled' && ent.currentBalance !== 0) return false;

    // Search term
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = ent.name.toLowerCase().includes(q);
      const matchPhone = ent.phone?.toLowerCase().includes(q);
      const matchAddress = ent.address?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchAddress) return false;
    }

    return true;
  });

  // Totals calculations
  const totalReceivables = entities
    .filter(e => e.currentBalance > 0)
    .reduce((sum, e) => sum + e.currentBalance, 0);

  const totalPayables = entities
    .filter(e => e.currentBalance < 0)
    .reduce((sum, e) => sum + Math.abs(e.currentBalance), 0);

  const pharmaciesCount = entities.filter(e => e.type === 'pharmacy').length;
  const companiesCount = entities.filter(e => e.type === 'company' || e.type === 'supplier').length;
  const customersCount = entities.filter(e => e.type === 'customer').length;

  const handleSaveEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddEntity({
      name: name.trim(),
      type,
      phone: phone.trim(),
      address: address.trim(),
      creditLimit: parseFloat(creditLimit) || 0,
      currentBalance: parseFloat(initialBalance) || 0,
      notes: notes.trim(),
    });

    // Reset
    setName('');
    setPhone('');
    setAddress('');
    setCreditLimit('5000');
    setInitialBalance('0');
    setNotes('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            دفتر حسابات الصيدليات والشركات
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            صفحات حسابات وكشوفات خاصة بكل صيدلية زميلة، شركة أدوية، مورد، وزبون دائم
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة حساب / كيان جديد</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Debts to Us */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">
              إجمالي الديون لنا (ذمم مدينة)
            </span>
            <div className="text-xl font-black font-mono text-amber-600 mt-1">
              {totalReceivables.toLocaleString()} {settings.currency}
            </div>
            <span className="text-[11px] text-slate-400">على الصيدليات والزبائن</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Debts We Owe to Companies */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">
              إجمالي المستحقات علينا (ذمم دائنة)
            </span>
            <div className="text-xl font-black font-mono text-blue-600 mt-1">
              {totalPayables.toLocaleString()} {settings.currency}
            </div>
            <span className="text-[11px] text-slate-400">لشركات ومستودعات الأدوية</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Total Entities Counts */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">
              عدد الكيانات المسجلة ({entities.length})
            </span>
            <div className="text-sm font-bold text-slate-800 mt-1 space-x-2 space-x-reverse">
              <span className="text-purple-600">{pharmaciesCount} صيدليات</span> •{' '}
              <span className="text-blue-600">{companiesCount} شركات</span> •{' '}
              <span className="text-emerald-600">{customersCount} زبائن</span>
            </div>
            <span className="text-[11px] text-slate-400">حسابات نشطة في النظام</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            كافة الحسابات ({entities.length})
          </button>
          <button
            onClick={() => setActiveTab('pharmacy')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'pharmacy'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>صيدليات أخرى ({pharmaciesCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'company'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>شركات أدوية وموردين ({companiesCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'customer'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>عملاء وزبائن دائمون ({customersCount})</span>
          </button>
        </div>

        {/* Sub-bar: Search & Balance status pills */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="بحث بالاسم، الهاتف، العنوان..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 text-xs rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
            <span className="text-slate-400 text-[11px] shrink-0 font-medium">حالة الرصيد:</span>
            <button
              onClick={() => setBalanceFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                balanceFilter === 'all'
                  ? 'bg-slate-200 text-slate-800 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setBalanceFilter('debtors')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                balanceFilter === 'debtors'
                  ? 'bg-amber-100 text-amber-800 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              مدين (عليه دين لنا)
            </button>
            <button
              onClick={() => setBalanceFilter('creditors')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                balanceFilter === 'creditors'
                  ? 'bg-blue-100 text-blue-800 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              دائن (له دين علينا)
            </button>
            <button
              onClick={() => setBalanceFilter('settled')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                balanceFilter === 'settled'
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              مسدد (خالص)
            </button>
          </div>
        </div>
      </div>

      {/* Entities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntities.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">لا توجد حسابات مطابقة لمعايير البحث</h3>
            <p className="text-xs text-slate-400 mt-1">
              جرب تغيير التبويب أو إزالة البحث لعرض كافة الكيانات المسجلة.
            </p>
          </div>
        ) : (
          filteredEntities.map(entity => {
            const cleanPhone = entity.phone ? entity.phone.replace(/[^0-9]/g, '') : '';
            const waPhone = cleanPhone.startsWith('0') ? `970${cleanPhone.slice(1)}` : cleanPhone;

            return (
              <div
                key={entity.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Card Top */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                        entity.type === 'pharmacy'
                          ? 'bg-purple-100 text-purple-800'
                          : entity.type === 'company' || entity.type === 'supplier'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {entity.type === 'pharmacy'
                        ? 'صيدلية زميلة'
                        : entity.type === 'company'
                        ? 'شركة أدوية'
                        : entity.type === 'supplier'
                        ? 'مستودع أدوية'
                        : 'عميل دائم'}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">#{entity.id}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-snug">
                      {entity.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>{entity.address || 'العنوان غير محدد'}</span>
                    </p>
                  </div>

                  {/* Phone & Contacts */}
                  {entity.phone && (
                    <div className="flex items-center justify-between py-2 px-3 rounded-2xl bg-slate-50 text-xs">
                      <span className="font-mono font-bold text-slate-700 dir-ltr text-right">
                        {entity.phone}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${entity.phone}`}
                          className="p-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors"
                          title="اتصال مباشر"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-teal-100 hover:bg-teal-200 text-teal-800 transition-colors"
                          title="محادثة واتساب"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Balance Display */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>الرصيد المالي الحالي:</span>
                      <span className="text-[10px]">
                        سقف الائتمان: {entity.creditLimit.toLocaleString()} {settings.currency}
                      </span>
                    </div>
                    <div
                      className={`text-lg font-black font-mono ${
                        entity.currentBalance > 0
                          ? 'text-amber-600'
                          : entity.currentBalance < 0
                          ? 'text-blue-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {Math.abs(entity.currentBalance).toLocaleString()} {settings.currency}{' '}
                      <span className="text-xs font-semibold">
                        {entity.currentBalance > 0
                          ? '(مستحق لنا / مدين)'
                          : entity.currentBalance < 0
                          ? '(مستحق له / دائن)'
                          : '(الحساب خالص)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button -> Opens dedicated account page */}
                <div className="p-3 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenLedger(entity)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-l from-slate-900 to-slate-800 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 group"
                  >
                    <FileText className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                    <span>فتح صفحة وكشف الحساب التفصيلي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Entity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-l from-slate-900 to-indigo-950 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">إضافة حساب جديد في دفتر الحسابات</h3>
                <p className="text-xs text-slate-300">
                  تسجيل صيدلية زميلة، شركة أدوية ومورد، أو عميل دائم
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEntity} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع الكيان / الحساب *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('pharmacy')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      type === 'pharmacy'
                        ? 'border-purple-600 bg-purple-50 text-purple-800 shadow-sm'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    صيدلية أخرى
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('company')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      type === 'company'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    شركة أدوية / مورد
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('customer')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      type === 'customer'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    عميل / زبون دائم
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  الاسم التجاري أو الشخصي *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: صيدلية الأمل، مستودع القدس، شركة بيرزيت..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الهاتف للتواصل</label>
                  <input
                    type="tel"
                    placeholder="0594345464"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">العنوان أو المنطقة</label>
                  <input
                    type="text"
                    placeholder="المدينة - الشارع"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    سقف الائتمان المسموح ({settings.currency})
                  </label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={e => setCreditLimit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    الرصيد الافتتاحي (+ لنا / - له)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={initialBalance}
                    onChange={e => setInitialBalance(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات وشروط التعامل</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات حول طريقة السداد، فترة الديون..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-md shadow-cyan-600/20"
                >
                  حفظ وفتح الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Ledger Modal */}
      {currentLedger && (
        <EntityLedgerModal
          isOpen={!!currentLedger}
          onClose={handleCloseLedger}
          entity={currentLedger}
          transactions={transactions}
          settings={settings}
          onAddTransaction={onAddTransaction}
        />
      )}
    </div>
  );
};

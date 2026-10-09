import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  Edit,
  Trash2,
  Barcode,
  Layers,
  Sparkles,
  ArrowUpDown,
  Filter,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { Medicine, AppSettings, UserRole } from '../types';
import { ExcelImportModal } from '../components/ExcelImportModal';

interface InventoryViewProps {
  medicines: Medicine[];
  settings: AppSettings;
  currentRole: UserRole;
  onAddMedicine: (med: Omit<Medicine, 'id'>) => void;
  onUpdateMedicine: (med: Medicine) => void;
  onDeleteMedicine: (id: string) => void;
  onBulkImportMedicines?: (newMeds: Medicine[], updatedMeds: Medicine[]) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  medicines,
  settings,
  currentRole,
  onAddMedicine,
  onUpdateMedicine,
  onDeleteMedicine,
  onBulkImportMedicines,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'near_expiry' | 'expired' | 'low_stock'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [importNotification, setImportNotification] = useState<{ newCount: number; updatedCount: number } | null>(null);

  // Form states
  const [barcode, setBarcode] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState('أدوية عامة');
  const [unit, setUnit] = useState('علبة');
  const [stockQuantity, setStockQuantity] = useState('20');
  const [minQuantity, setMinQuantity] = useState('5');
  const [purchasePrice, setPurchasePrice] = useState('10');
  const [sellPrice, setSellPrice] = useState('15');
  const [batchNumber, setBatchNumber] = useState(`BATCH-${Math.floor(100 + Math.random() * 900)}`);
  const [expiryDate, setExpiryDate] = useState('2028-12-31');
  const [manufacturer, setManufacturer] = useState('');

  // Categories list
  const categories = Array.from(new Set(medicines.map(m => m.category))).filter(Boolean);

  // Dates for filtering
  const now = new Date();
  const ninetyDays = new Date();
  ninetyDays.setDate(now.getDate() + 90);

  const filteredMedicines = medicines.filter(med => {
    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = med.tradeName.toLowerCase().includes(q);
      const matchGeneric = med.genericName?.toLowerCase().includes(q);
      const matchBarcode = med.barcode.includes(q);
      const matchManuf = med.manufacturer?.toLowerCase().includes(q);
      if (!matchName && !matchGeneric && !matchBarcode && !matchManuf) return false;
    }

    // Category
    if (selectedCategory !== 'all' && med.category !== selectedCategory) return false;

    // Filter type
    const exp = med.expiryDate ? new Date(med.expiryDate) : null;
    const isValidExp = exp && !isNaN(exp.getTime());
    if (filterType === 'expired' && (!isValidExp || exp >= now)) return false;
    if (filterType === 'near_expiry' && (!isValidExp || exp < now || exp > ninetyDays)) return false;
    if (filterType === 'low_stock' && med.stockQuantity > med.minQuantity) return false;

    return true;
  });

  const handleOpenAdd = () => {
    setEditingMed(null);
    setBarcode(`6251${Math.floor(10000000 + Math.random() * 90000000)}`);
    setTradeName('');
    setGenericName('');
    setCategory('أدوية عامة');
    setUnit('علبة');
    setStockQuantity('20');
    setMinQuantity('5');
    setPurchasePrice('10');
    setSellPrice('15');
    setBatchNumber(`BATCH-${Math.floor(100 + Math.random() * 900)}`);
    setExpiryDate('2028-12-31');
    setManufacturer('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingMed(med);
    setBarcode(med.barcode);
    setTradeName(med.tradeName);
    setGenericName(med.genericName);
    setCategory(med.category);
    setUnit(med.unit);
    setStockQuantity(med.stockQuantity.toString());
    setMinQuantity(med.minQuantity.toString());
    setPurchasePrice(med.purchasePrice.toString());
    setSellPrice(med.sellPrice.toString());
    setBatchNumber(med.batchNumber);
    setExpiryDate(med.expiryDate);
    setManufacturer(med.manufacturer);
    setShowAddModal(true);
  };

  const handleSaveMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeName.trim()) return;

    const sQty = Math.max(0, parseInt(stockQuantity) || 0);
    const mQty = Math.max(0, parseInt(minQuantity) || 0);
    const pPrice = Math.max(0, parseFloat(purchasePrice) || 0);
    const sPrice = Math.max(0, parseFloat(sellPrice) || 0);

    if (editingMed) {
      onUpdateMedicine({
        ...editingMed,
        barcode: barcode.trim(),
        tradeName: tradeName.trim(),
        genericName: genericName.trim(),
        category,
        unit,
        stockQuantity: sQty,
        minQuantity: mQty,
        purchasePrice: pPrice,
        sellPrice: sPrice,
        batchNumber: batchNumber.trim(),
        expiryDate,
        manufacturer: manufacturer.trim(),
      });
    } else {
      onAddMedicine({
        barcode: barcode.trim(),
        tradeName: tradeName.trim(),
        genericName: genericName.trim(),
        category,
        unit,
        stockQuantity: sQty,
        minQuantity: mQty,
        purchasePrice: pPrice,
        sellPrice: sPrice,
        batchNumber: batchNumber.trim(),
        expiryDate,
        manufacturer: manufacturer.trim(),
      });
    }

    setShowAddModal(false);
  };

  const handleImportSuccess = (newlyAdded: Medicine[], updatedMeds: Medicine[]) => {
    if (onBulkImportMedicines) {
      onBulkImportMedicines(newlyAdded, updatedMeds);
    } else {
      newlyAdded.forEach(m => onAddMedicine(m));
      updatedMeds.forEach(m => onUpdateMedicine(m));
    }
    setImportNotification({
      newCount: newlyAdded.length,
      updatedCount: updatedMeds.length,
    });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-cyan-600" />
            <span>إدارة المخزون والأدوية وتواريخ الصلاحية</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            تتبع الدفعات، تواريخ انتهاء الصلاحية، أسعار الشراء والبيع، والنواقص
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentRole !== 'pharmacist' && (
            <button
              onClick={() => setShowExcelModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
              title="استيراد أصناف وأسعار الأدوية من ملف إكسل أو CSV دفعة واحدة (خاص بالمدير)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>استيراد أصناف من إكسل (Excel)</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة دواء / صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner for Excel Import */}
      {importNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black">
                🎉 تم استيراد بيانات الإكسل بنجاح وحفظها في الصيدلية!
              </h4>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                تمت إضافة <b>{importNotification.newCount}</b> صنف جديد، وتحديث أسعار ومخزون <b>{importNotification.updatedCount}</b> صنف موجود مسبقاً.
              </p>
            </div>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 rounded-lg hover:bg-emerald-100"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            كافة الأصناف ({medicines.length})
          </button>
          <button
            onClick={() => setFilterType('near_expiry')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'near_expiry'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>قاربت على الانتهاء (&lt; 90 يوم)</span>
          </button>
          <button
            onClick={() => setFilterType('low_stock')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === 'low_stock'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>نواقص تحت الحد الأدنى</span>
          </button>
        </div>

        {/* Search & Category selector */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="ابحث بالاسم التجاري، العلمي، الباركود، أو الشركة المصنعة..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 text-xs rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-semibold"
            />
          </div>

          <div className="w-full sm:w-56 shrink-0">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full p-2 text-xs rounded-2xl border border-slate-200 bg-white shadow-sm font-semibold text-slate-700"
            >
              <option value="all">كافة التصنيفات الطبية</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">الباركود</th>
                <th className="py-3 px-4">الاسم التجاري والعلمي</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">الكمية المتوفرة</th>
                <th className="py-3 px-4">سعر الشراء</th>
                <th className="py-3 px-4 text-emerald-800">سعر البيع</th>
                <th className="py-3 px-4">تاريخ الانتهاء</th>
                <th className="py-3 px-4">رقم الدفعة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Boxes className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-bold text-slate-700 text-sm">
                      {medicines.length === 0 ? 'لا توجد أصناف مسجلة في هذه الصيدلية بعد' : 'لا توجد أدوية مطابقة للبحث أو التصفية'}
                    </p>
                    {medicines.length === 0 && (
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={() => setShowExcelModal(true)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>استيراد الأصناف والأسعار من إكسل الآن</span>
                        </button>
                        <button
                          onClick={handleOpenAdd}
                          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>إضافة أول صنف يدوياً</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredMedicines.map(med => {
                  const expDate = new Date(med.expiryDate);
                  const isExpired = expDate < now;
                  const isNearExpiry = !isExpired && expDate <= ninetyDays;
                  const isLowStock = med.stockQuantity <= med.minQuantity;

                  return (
                    <tr key={med.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {med.barcode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900 text-sm">{med.tradeName}</div>
                        <div className="text-[11px] text-slate-400">{med.genericName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {med.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-sm font-black ${
                              isLowStock ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {med.stockQuantity} {med.unit}
                          </span>
                          {isLowStock && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                              ناقص
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {currentRole === 'pharmacist' ? (
                          <span className="text-slate-400 font-sans text-[11px] bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200" title="محمي لصلاحية المدير">
                            •••• 🔒
                          </span>
                        ) : (
                          `${med.purchasePrice.toFixed(2)} ${settings.currency}`
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-700 text-sm">
                        {med.sellPrice.toFixed(2)} {settings.currency}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-xl font-mono text-[11px] font-bold inline-block ${
                            isExpired
                              ? 'bg-rose-100 text-rose-800'
                              : isNearExpiry
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {med.expiryDate}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {med.batchNumber}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(med)}
                            className="p-1.5 rounded-lg text-cyan-700 hover:bg-cyan-50 transition-colors"
                            title="تعديل بيانات الدواء"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {currentRole !== 'pharmacist' && (
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف ${med.tradeName}؟`)) {
                                  onDeleteMedicine(med.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="حذف الصنف (خاص بالمدير)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-5 bg-gradient-to-l from-cyan-700 to-blue-800 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-black">
                  {editingMed ? 'تعديل بيانات الدواء والمخزون' : 'إضافة دواء جديد للمخزون'}
                </h3>
                <p className="text-xs text-cyan-100">
                  إدخال الباركود، الأسعار، تاريخ انتهاء الصلاحية ورقم الدفعة
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الاسم التجاري *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: Augmentin 1g"
                    value={tradeName}
                    onChange={e => setTradeName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الاسم العلمي (تركيبة الدواء)</label>
                  <input
                    type="text"
                    placeholder="مثال: Amoxicillin + Clavulanic"
                    value={genericName}
                    onChange={e => setGenericName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الباركود الدولي</label>
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">التصنيف الطبي</label>
                  <input
                    type="text"
                    placeholder="مضاد حيوي، مسكن..."
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الوحدة</label>
                  <input
                    type="text"
                    placeholder="علبة، شريط، زجاجة..."
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">سعر الشراء</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-emerald-800 font-bold mb-1">سعر البيع للجمهور</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellPrice}
                    onChange={e => setSellPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-emerald-300 font-mono font-black text-emerald-900 bg-emerald-50/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الكمية المتوفرة</label>
                  <input
                    type="number"
                    required
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">حد التنبيه الأدنى</label>
                  <input
                    type="number"
                    required
                    value={minQuantity}
                    onChange={e => setMinQuantity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ انتهاء الصلاحية *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم التشغيلة / الدفعة (Batch)</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الشركة المصنعة / المورد</label>
                  <input
                    type="text"
                    placeholder="بيرزيت، دار الشفاء، GSK..."
                    value={manufacturer}
                    onChange={e => setManufacturer(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
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
                  className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black shadow-md shadow-cyan-600/20"
                >
                  {editingMed ? 'حفظ التعديلات' : 'إضافة الصنف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        existingMedicines={medicines}
        settings={settings}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
};

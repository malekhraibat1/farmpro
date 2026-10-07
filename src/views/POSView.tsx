import React, { useState } from 'react';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  User,
  CreditCard,
  DollarSign,
  Printer,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  Medicine,
  Entity,
  InvoiceItem,
  SaleInvoice,
  PaymentMethod,
  AppSettings,
  UserRole,
} from '../types';
import { PrintReceiptModal } from '../components/PrintReceiptModal';

interface POSViewProps {
  medicines: Medicine[];
  entities: Entity[];
  settings: AppSettings;
  currentRole: UserRole;
  onCompleteSale: (sale: SaleInvoice) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  medicines,
  entities,
  settings,
  currentRole,
  onCompleteSale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidInput, setPaidInput] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<SaleInvoice | null>(null);

  // Filter medicines for selection
  const filteredMeds = medicines.filter(m => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      m.tradeName.toLowerCase().includes(q) ||
      m.genericName?.toLowerCase().includes(q) ||
      m.barcode.includes(q)
    );
  });

  // Cart operations
  const addToCart = (med: Medicine) => {
    setCart(prev => {
      const existing = prev.find(item => item.medicineId === med.id);
      if (existing) {
        return prev.map(item =>
          item.medicineId === med.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            medicineId: med.id,
            medicineName: med.tradeName,
            quantity: 1,
            unitPrice: med.sellPrice,
            subtotal: med.sellPrice,
          },
        ];
      }
    });
  };

  const updateQuantity = (medId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.medicineId === medId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as InvoiceItem[]
    );
  };

  const removeItem = (medId: string) => {
    setCart(prev => prev.filter(item => item.medicineId !== medId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setNotes('');
    setSelectedEntityId('cash');
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = (subtotal * settings.taxRate) / 100;
  const finalAmount = Math.max(0, subtotal - discountAmount + taxAmount);

  // Selected buyer entity
  const selectedEntity =
    selectedEntityId !== 'cash' ? entities.find(e => e.id === selectedEntityId) : null;

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    if (selectedEntityId === 'cash') {
      setPaidInput(finalAmount.toString());
      setPaymentMethod('cash');
    } else {
      // Credit sale for pharmacy/customer
      setPaidInput('0');
      setPaymentMethod('credit');
    }
    setShowPaymentModal(true);
  };

  const handleFinishSale = (e: React.FormEvent) => {
    e.preventDefault();
    const paid = parseFloat(paidInput) || 0;
    const remaining = Math.max(0, finalAmount - paid);

    const now = new Date();
    const invoiceNumber = `INV-${Math.floor(10000 + Math.random() * 90000)}`;
    const dateFormatted = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const newInvoice: SaleInvoice = {
      id: `sale-${Date.now()}`,
      invoiceNumber,
      date: dateFormatted,
      entityId: selectedEntity?.id,
      entityName: selectedEntity ? selectedEntity.name : 'زبون نقدي',
      items: cart,
      totalAmount: subtotal,
      discount: discountAmount,
      tax: taxAmount,
      finalAmount,
      paidAmount: paid,
      remainingAmount: remaining,
      paymentMethod,
      paymentStatus: remaining === 0 ? 'paid' : paid === 0 ? 'unpaid' : 'partial',
      cashierName: currentRole === 'admin' ? 'م. مالك حريبات' : 'صيدلي مناوب',
      notes,
    };

    onCompleteSale(newInvoice);
    setCompletedInvoice(newInvoice);
    setShowPaymentModal(false);
    clearCart();
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            <span>نقطة البيع السريع (الكاشير POS)</span>
          </h2>
          <p className="text-xs text-slate-500">
            فواتير بيع نقدية، بيع آجل على حساب الصيدليات والشركات، وطباعة الفاتورة الحرارية
          </p>
        </div>

        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            <span>إلغاء السلة</span>
          </button>
        )}
      </div>

      {/* Grid: Left side Cart, Right side Medicine search & catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Medicine Catalog & Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Barcode & Search input */}
          <div className="p-3 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                autoFocus
                placeholder="ابحث بالاسم التجاري، العلمي، أو امسح الباركود..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-3 py-2 text-xs rounded-2xl border-none bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
            <button
              onClick={() => {
                if (medicines.length > 0) {
                  const randomMed = medicines[Math.floor(Math.random() * medicines.length)];
                  addToCart(randomMed);
                }
              }}
              className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              title="محاكاة مسح باركود دواء سريع"
            >
              <Barcode className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">مسح باركود</span>
            </button>
          </div>

          {/* Quick Medicine Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[580px] overflow-y-auto p-1">
            {filteredMeds.map(med => {
              const inCart = cart.find(c => c.medicineId === med.id);
              return (
                <div
                  key={med.id}
                  onClick={() => addToCart(med)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    inCart
                      ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-1 ring-emerald-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start text-[10px] text-slate-400 font-mono">
                      <span>{med.barcode}</span>
                      <span
                        className={`font-bold ${
                          med.stockQuantity <= med.minQuantity
                            ? 'text-rose-500'
                            : 'text-slate-500'
                        }`}
                      >
                        المتوفر: {med.stockQuantity}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-800 mt-1 leading-snug line-clamp-2">
                      {med.tradeName}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{med.genericName}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black font-mono text-emerald-700">
                      {med.sellPrice.toFixed(2)} {settings.currency}
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice Cart & Checkout Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between overflow-hidden">
          {/* Cart Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-sm">سلة الفاتورة الحالية</span>
            </div>
            <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
              {cart.length} أصناف
            </span>
          </div>

          {/* Customer / Entity Target Selector */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs space-y-1.5">
            <label className="block text-slate-600 font-bold">الحساب أو المشتري:</label>
            <select
              value={selectedEntityId}
              onChange={e => setSelectedEntityId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="cash">زبون نقدي فوري (مبيعات كاش)</option>
              <optgroup label="صيدليات أخرى (بيع آجل على الحساب)">
                {entities
                  .filter(e => e.type === 'pharmacy')
                  .map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} (رصيده الحالي: {ent.currentBalance} {settings.currency})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="شركات ومستودعات أدوية">
                {entities
                  .filter(e => e.type === 'company' || e.type === 'supplier')
                  .map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="عملاء وزبائن دائمون">
                {entities
                  .filter(e => e.type === 'customer')
                  .map(ent => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
              </optgroup>
            </select>

            {selectedEntity && (
              <div className="flex justify-between items-center text-[11px] px-1 text-slate-600">
                <span>
                  الرصيد السابق:{' '}
                  <strong className="font-mono">{selectedEntity.currentBalance} {settings.currency}</strong>
                </span>
                <span>
                  سقف الائتمان:{' '}
                  <strong className="font-mono">{selectedEntity.creditLimit} {settings.currency}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100 max-h-[320px]">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold">السلة فارغة</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  انقر على أي صنف من القائمة لإضافته للفاتورة
                </p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.medicineId} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 truncate">
                    <h5 className="text-xs font-bold text-slate-800 truncate">{item.medicineName}</h5>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {item.unitPrice.toFixed(2)} × {item.quantity} = {item.subtotal.toFixed(2)}{' '}
                      {settings.currency}
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.medicineId, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-black font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.medicineId, 1)}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.medicineId)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 mr-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Calculation & Checkout Area */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>المجموع الفرعي:</span>
              <span className="font-mono font-bold text-slate-800">
                {subtotal.toFixed(2)} {settings.currency}
              </span>
            </div>

            {/* Discount input */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">الخصم الإضافي:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-20 p-1 text-center font-mono rounded-lg border border-slate-200 bg-white"
                />
                <span className="text-slate-400">{settings.currency}</span>
              </div>
            </div>

            {/* Net Total */}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-black text-slate-900">المبلغ المطلوب:</span>
              <span className="text-xl font-black font-mono text-emerald-700">
                {finalAmount.toFixed(2)} {settings.currency}
              </span>
            </div>

            {/* Checkout Action */}
            <button
              onClick={handleOpenPayment}
              disabled={cart.length === 0}
              className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                cart.length > 0
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white shadow-emerald-600/25'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>إتمام البيع والدفع (Enter)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-l from-emerald-700 to-teal-800 text-white">
              <h3 className="text-lg font-black">تأكيد عملية البيع وطريقة الدفع</h3>
              <p className="text-xs text-emerald-100">
                {selectedEntity ? `حساب: ${selectedEntity.name}` : 'زبون نقدي فوري'}
              </p>
            </div>

            <form onSubmit={handleFinishSale} className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="text-xs text-emerald-700 font-medium">صافي إجمالي الفاتورة</span>
                <div className="text-3xl font-black font-mono text-emerald-900 mt-1">
                  {finalAmount.toFixed(2)} {settings.currency}
                </div>
              </div>

              {/* Payment Method selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">طريقة التحصيل / الدفع:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      setPaidInput(finalAmount.toString());
                    }}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    نقداً (كاش)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('credit');
                      setPaidInput('0');
                    }}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      paymentMethod === 'credit'
                        ? 'border-amber-600 bg-amber-50 text-amber-800 shadow-sm'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    آجل (على الحساب)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('card');
                      setPaidInput(finalAmount.toString());
                    }}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                      paymentMethod === 'card'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    بطاقة / شيك
                  </button>
                </div>
              </div>

              {/* Paid Amount */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  المبلغ المدفوع فعلياً الآن ({settings.currency}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paidInput}
                  onChange={e => setPaidInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 font-mono text-base font-black text-center"
                />
              </div>

              {/* Remaining debt info if any */}
              {finalAmount - (parseFloat(paidInput) || 0) > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  المتبقي كدين على الحساب:{' '}
                  <strong className="font-mono">
                    {(finalAmount - (parseFloat(paidInput) || 0)).toFixed(2)} {settings.currency}
                  </strong>
                  {selectedEntityId === 'cash' && (
                    <div className="text-[10px] text-amber-700 mt-1 font-bold">
                      تنبيه: لقد اخترت زبون نقدي، يُفضل اختيار صيدلية أو عميل محدد لتسجيل الدين على حسابه.
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات على الفاتورة:</label>
                <input
                  type="text"
                  placeholder="رقم مرجع خارجي، اسم المندوب..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/20"
                >
                  تأكيد وطباعة الفاتورة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Thermal Receipt Modal */}
      {completedInvoice && (
        <PrintReceiptModal
          isOpen={!!completedInvoice}
          onClose={() => setCompletedInvoice(null)}
          invoice={completedInvoice}
          settings={settings}
        />
      )}
    </div>
  );
};

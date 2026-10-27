import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PauseCircle,
  PlayCircle,
  Repeat,
  Wallet,
  Tag,
  X,
} from 'lucide-react';
import {
  Medicine,
  Entity,
  InvoiceItem,
  SaleInvoice,
  PaymentMethod,
  AppSettings,
  UserRole,
  Shift,
  PrescriptionInfo,
} from '../types';
import { PrintReceiptModal } from '../components/PrintReceiptModal';
import { nextInvoiceNumber, uid, round2, computeTotals } from '../services/saleService';
import {
  alternativesFor,
  availableQuantity,
  matchesQuery,
  packSizeOf,
  subUnitPriceOf,
  supportsRetail,
} from '../services/inventoryService';
import { checkStock, medicineState, planSale } from '../services/posService';

interface HeldBill {
  id: string;
  time: string;
  cart: InvoiceItem[];
  entityId: string;
  discount: number;
  notes: string;
}

interface POSViewProps {
  medicines: Medicine[];
  entities: Entity[];
  sales: SaleInvoice[];
  settings: AppSettings;
  currentRole: UserRole;
  currentShift: Shift | null;
  onOpenShift: (openingCash: number) => void;
  onCloseShift: (countedCash: number, notes: string) => void;
  onCompleteSale: (sale: SaleInvoice) => void;
}

const HELD_KEY = 'pharma_held_bills_v1';

function loadHeld(): HeldBill[] {
  try {
    const raw = window.localStorage.getItem(HELD_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const POSView: React.FC<POSViewProps> = ({
  medicines,
  entities,
  sales,
  settings,
  currentRole,
  currentShift,
  onOpenShift,
  onCloseShift,
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
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const [saleErrors, setSaleErrors] = useState<string[]>([]);
  const [rx, setRx] = useState<PrescriptionInfo>({ patientName: '', doctorName: '', prescriptionNumber: '', patientId: '' });
  const [altFor, setAltFor] = useState<Medicine | null>(null);
  const [held, setHeld] = useState<HeldBill[]>(loadHeld);
  const [directionsOpen, setDirectionsOpen] = useState<string | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [openingInput, setOpeningInput] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cashierName = currentRole === 'pharmacist' || currentRole === 'accountant' ? 'صيدلي مناوب' : settings.ownerName || 'المدير';

  useEffect(() => {
    try {
      window.localStorage.setItem(HELD_KEY, JSON.stringify(held));
    } catch {}
  }, [held]);

  const filteredMeds = useMemo(() => medicines.filter(m => matchesQuery(m, searchTerm)), [medicines, searchTerm]);

  const flashWarning = (msg: string) => {
    setStockWarning(msg);
    setTimeout(() => setStockWarning(null), 4500);
  };

  const lineUnitPrice = (med: Medicine, unit: 'pack' | 'sub') => (unit === 'sub' ? subUnitPriceOf(med) : med.sellPrice);

  /* ---------------- السلة ---------------- */
  const addToCart = (med: Medicine, unit: 'pack' | 'sub' = 'pack') => {
    const state = medicineState(med);
    if (state !== 'ok') {
      flashWarning(
        state === 'expired'
          ? `الصنف "${med.tradeName}" منتهي الصلاحية ولا يمكن بيعه.`
          : `الصنف "${med.tradeName}" غير متوفر في المخزون.`
      );
      if (alternativesFor(med, medicines).length > 0) setAltFor(med);
      return;
    }
    const existing = cart.find(i => i.medicineId === med.id && (i.saleUnit || 'pack') === unit);
    const nextCart: InvoiceItem[] = existing
      ? cart.map(i =>
          i === existing
            ? { ...i, quantity: i.quantity + 1, subtotal: round2((i.quantity + 1) * i.unitPrice) }
            : i
        )
      : [
          ...cart,
          {
            medicineId: med.id,
            medicineName: med.tradeName,
            quantity: 1,
            unitPrice: lineUnitPrice(med, unit),
            subtotal: round2(lineUnitPrice(med, unit)),
            saleUnit: unit,
          },
        ];
    const err = checkStock(nextCart, medicines);
    if (err) {
      flashWarning(err);
      return;
    }
    setSaleErrors([]);
    setCart(nextCart);
  };

  const updateQuantity = (index: number, delta: number) => {
    const item = cart[index];
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
      return;
    }
    const nextCart = cart.map((it, i) => (i === index ? { ...it, quantity: newQty, subtotal: round2(newQty * it.unitPrice) } : it));
    if (delta > 0) {
      const err = checkStock(nextCart, medicines);
      if (err) {
        flashWarning(err);
        return;
      }
    }
    setSaleErrors([]);
    setCart(nextCart);
  };

  const toggleUnit = (index: number) => {
    const item = cart[index];
    const med = medicines.find(m => m.id === item.medicineId);
    if (!med || !supportsRetail(med)) return;
    const unit: 'pack' | 'sub' = (item.saleUnit || 'pack') === 'pack' ? 'sub' : 'pack';
    const price = lineUnitPrice(med, unit);
    const nextCart = cart.map((it, i) =>
      i === index ? { ...it, saleUnit: unit, unitPrice: price, subtotal: round2(it.quantity * price) } : it
    );
    const err = checkStock(nextCart, medicines);
    if (err) {
      flashWarning(err);
      return;
    }
    setCart(nextCart);
  };

  const setDirections = (index: number, text: string) => {
    setCart(cart.map((it, i) => (i === index ? { ...it, directions: text } : it)));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setNotes('');
    setSelectedEntityId('cash');
    setSaleErrors([]);
    setRx({ patientName: '', doctorName: '', prescriptionNumber: '', patientId: '' });
  };

  /* ---------------- تعليق الفواتير ---------------- */
  const holdBill = () => {
    if (cart.length === 0) return;
    setHeld(prev => [
      { id: uid('hold'), time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), cart, entityId: selectedEntityId, discount: discountAmount, notes },
      ...prev,
    ]);
    clearCart();
    flashWarning('تم تعليق الفاتورة. يمكنك استئنافها من شريط «الفواتير المعلّقة».');
  };

  const resumeBill = (b: HeldBill) => {
    if (cart.length > 0) holdBill();
    // نتحقق من المخزون الحالي قبل الاستئناف
    const err = checkStock(b.cart, medicines);
    setCart(b.cart);
    setSelectedEntityId(entities.some(e => e.id === b.entityId) || b.entityId === 'cash' ? b.entityId : 'cash');
    setDiscountAmount(b.discount);
    setNotes(b.notes);
    setHeld(prev => prev.filter(x => x.id !== b.id));
    if (err) flashWarning(`تنبيه: تغيّر المخزون منذ التعليق. ${err}`);
  };

  /* ---------------- الحسابات والتخطيط ---------------- */
  const totals = computeTotals(cart, discountAmount, settings.taxRate);
  const subtotal = totals.subtotal;
  const taxAmount = totals.tax;
  const finalAmount = totals.finalAmount;
  const selectedEntity = selectedEntityId !== 'cash' ? entities.find(e => e.id === selectedEntityId) : null;
  const paidNumber = parseFloat(paidInput) || 0;

  const plan = useMemo(
    () =>
      planSale({
        items: cart,
        medicines,
        discountInput: discountAmount,
        taxRate: settings.taxRate,
        paid: paidNumber,
        entity: selectedEntity,
        role: currentRole,
        maxDiscountPercent: settings.maxDiscountPercent ?? 10,
        prescription: rx,
      }),
    [cart, medicines, discountAmount, settings.taxRate, paidNumber, selectedEntity, currentRole, settings.maxDiscountPercent, rx]
  );
  const settle = plan.payment;

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setSaleErrors([]);
    if (selectedEntityId === 'cash') {
      setPaidInput(finalAmount.toString());
      setPaymentMethod('cash');
    } else {
      setPaidInput('0');
      setPaymentMethod('credit');
    }
    setShowPaymentModal(true);
  };

  const handleFinishSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan.ok) {
      setSaleErrors(plan.errors);
      return;
    }
    const now = new Date();
    const invoiceNumber = nextInvoiceNumber(sales);
    const dateFormatted = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;

    const newInvoice: SaleInvoice = {
      id: uid('sale'),
      invoiceNumber,
      date: dateFormatted,
      entityId: selectedEntity?.id,
      entityName: selectedEntity ? selectedEntity.name : 'زبون نقدي',
      items: plan.items,
      totalAmount: plan.totals.subtotal,
      discount: plan.totals.discount,
      tax: plan.totals.tax,
      finalAmount: plan.totals.finalAmount,
      paidAmount: plan.payment.paidAmount,
      remainingAmount: plan.payment.remainingAmount,
      changeGiven: plan.payment.change,
      paymentMethod,
      paymentStatus: plan.payment.remainingAmount === 0 ? 'paid' : plan.payment.paidAmount === 0 ? 'unpaid' : 'partial',
      cashierName,
      notes,
      prescription: plan.needsPrescription ? { ...rx } : undefined,
    };

    onCompleteSale(newInvoice);
    setCompletedInvoice(newInvoice);
    setShowPaymentModal(false);
    clearCart();
  };

  /* ---------------- اختصارات لوحة المفاتيح ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        holdBill();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (!showPaymentModal && cart.length > 0) handleOpenPayment();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, showPaymentModal, selectedEntityId, discountAmount, notes]);

  const shiftSales = currentShift ? sales.filter(s => s.shiftId === currentShift.id) : [];
  const shiftCash = round2(shiftSales.reduce((sum, s) => sum + (s.paymentMethod === 'cash' ? s.paidAmount : 0), 0));
  const expectedCash = currentShift ? round2(currentShift.openingCash + shiftCash) : 0;
  const [countedInput, setCountedInput] = useState('');

  const altList = altFor ? alternativesFor(altFor, medicines) : [];

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            <span>نقطة البيع (الكاشير)</span>
          </h2>
          <p className="text-xs text-slate-600">بيع نقدي وآجل، بالعبوة أو بالشريط، مع الأقدم صلاحية أولاً</p>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <>
              <button onClick={holdBill} className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5" title="تعليق الفاتورة (F8)">
                <PauseCircle className="w-4 h-4" />
                <span>تعليق</span>
                <kbd className="hidden lg:inline text-[11px] px-1 rounded bg-slate-100 font-mono">F8</kbd>
              </button>
              <button onClick={clearCart} className="text-xs text-rose-700 font-bold hover:underline flex items-center gap-1">
                <Trash2 className="w-4 h-4" />
                <span>إلغاء السلة</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Shift bar */}
      <div className={`p-3 rounded-2xl border text-xs font-bold flex flex-wrap items-center justify-between gap-2 ${currentShift ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          {currentShift ? (
            <span>
              وردية مفتوحة منذ {new Date(currentShift.openedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} · النقد المتوقع في الدرج: {expectedCash.toFixed(2)} {settings.currency}
            </span>
          ) : (
            <span>لا توجد وردية مفتوحة. افتح وردية ليُسجَّل النقد المتوقع في الدرج.</span>
          )}
        </div>
        <button
          onClick={() => {
            setOpeningInput('');
            setCountedInput('');
            setShiftNotes('');
            setShowShiftModal(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-white border border-current text-xs font-black hover:bg-slate-50"
        >
          {currentShift ? 'إغلاق الوردية' : 'فتح وردية'}
        </button>
      </div>

      {/* Held bills */}
      {held.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-sky-50 border border-sky-200">
          <span className="text-xs font-black text-sky-900">الفواتير المعلّقة ({held.length}):</span>
          {held.map(b => (
            <button key={b.id} onClick={() => resumeBill(b)} className="px-2.5 py-1 rounded-xl bg-white border border-sky-300 text-xs font-bold text-sky-900 hover:bg-sky-100 flex items-center gap-1">
              <PlayCircle className="w-3.5 h-3.5" />
              <span>{b.time} · {b.cart.length} صنف</span>
            </button>
          ))}
        </div>
      )}

      {stockWarning && (
        <div role="alert" className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{stockWarning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Catalog */}
        <div className="lg:col-span-7 space-y-3">
          <div className="p-3 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              <input
                ref={searchInputRef}
                type="text"
                autoFocus
                placeholder="ابحث بالاسم التجاري أو العلمي، أو امسح الباركود... (F4)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => {
                  if (e.key !== 'Enter') return;
                  const code = searchTerm.trim();
                  if (!code) {
                    if (cart.length > 0) handleOpenPayment();
                    return;
                  }
                  const exact = medicines.find(m => m.barcode === code);
                  const single = filteredMeds.length === 1 ? filteredMeds[0] : null;
                  const target = exact || single;
                  if (target) {
                    e.preventDefault();
                    e.stopPropagation();
                    addToCart(target);
                    setSearchTerm('');
                  } else {
                    flashWarning(`لا يوجد صنف بهذا الباركود أو الاسم: ${code}`);
                  }
                }}
                className="w-full pr-10 pl-3 py-2 text-xs rounded-2xl border-none bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>
            <button
              onClick={() => searchInputRef.current?.focus()}
              className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              title="ضع المؤشر في حقل البحث ثم امسح الباركود بالقارئ"
            >
              <Barcode className="w-4 h-4" />
              <span className="hidden sm:inline">مسح باركود</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[580px] overflow-y-auto p-1">
            {filteredMeds.map(med => {
              const inCart = cart.some(c => c.medicineId === med.id);
              const state = medicineState(med);
              const hasAlt = state !== 'ok' && alternativesFor(med, medicines).length > 0;
              return (
                <div
                  key={med.id}
                  onClick={() => addToCart(med)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    inCart ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-1 ring-emerald-400' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  } ${state !== 'ok' ? 'opacity-70' : ''}`}
                >
                  <div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {state === 'expired' && <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-800 text-xs font-black">منتهي الصلاحية</span>}
                      {state === 'out' && <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-black">نفد من المخزون</span>}
                      {med.requiresPrescription && <span className="px-2 py-0.5 rounded-lg bg-violet-100 text-violet-900 text-xs font-black">بوصفة</span>}
                      {med.isControlled && <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 text-xs font-black">خاضع للرقابة</span>}
                    </div>
                    <div className="flex justify-between items-start text-xs text-slate-600 font-mono">
                      <span>{med.barcode}</span>
                      <span>المتوفر: {availableQuantity(med, 'pack')}{(med.looseUnits || 0) > 0 ? ` + ${med.looseUnits} ${med.subUnitName || 'وحدة'}` : ''}</span>
                    </div>
                    <h4 className="font-black text-slate-900 text-sm mt-1 leading-snug">{med.tradeName}</h4>
                    <p className="text-xs text-slate-600 truncate mt-0.5">{[med.genericName, med.strength, med.dosageForm].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                    <div className="text-sm font-black text-emerald-800 font-mono">
                      {med.sellPrice.toFixed(2)} {settings.currency}
                      {supportsRetail(med) && (
                        <div className="text-xs text-slate-600 font-bold">{med.subUnitName || 'وحدة'}: {subUnitPriceOf(med).toFixed(2)}</div>
                      )}
                    </div>
                    {hasAlt ? (
                      <button
                        onClick={ev => {
                          ev.stopPropagation();
                          setAltFor(med);
                        }}
                        className="px-2 py-1 rounded-lg bg-sky-100 text-sky-900 text-xs font-black flex items-center gap-1"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        بدائل
                      </button>
                    ) : (
                      <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredMeds.length === 0 && (
              <div className="col-span-full p-8 text-center text-sm text-slate-600 font-bold">لا توجد أصناف مطابقة. {medicines.length === 0 ? 'أضف أصنافاً من شاشة المخزون أولاً.' : ''}</div>
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-black text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-cyan-300" />
                سلة الفاتورة الحالية
              </h3>
              <span className="text-xs bg-white/15 px-2 py-0.5 rounded-lg font-bold">{cart.length} أصناف</span>
            </div>

            <div className="p-4 border-b border-slate-100">
              <label className="block text-xs font-black text-slate-800 mb-1.5">الحساب أو المشتري:</label>
              <select
                value={selectedEntityId}
                onChange={e => setSelectedEntityId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
              >
                <option value="cash">زبون نقدي فوري (مبيعات كاش)</option>
                {entities.map(en => (
                  <option key={en.id} value={en.id}>
                    {en.name} ({en.type === 'pharmacy' ? 'صيدلية' : en.type === 'company' ? 'شركة' : en.type === 'supplier' ? 'مورد' : 'زبون'})
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-600 font-bold">السلة فارغة. امسح الباركود أو اختر صنفاً.</div>
              ) : (
                cart.map((item, idx) => {
                  const med = medicines.find(m => m.id === item.medicineId);
                  const unit = item.saleUnit || 'pack';
                  const unitLabel = unit === 'sub' ? med?.subUnitName || 'وحدة' : 'عبوة';
                  return (
                    <div key={`${item.medicineId}-${unit}`} className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 text-sm truncate">{item.medicineName}</div>
                          <div className="text-xs text-slate-700 font-mono">
                            {item.unitPrice.toFixed(2)} × {item.quantity} {unitLabel} = <b>{item.subtotal.toFixed(2)}</b>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => updateQuantity(idx, -1)} aria-label="إنقاص" className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-black">{item.quantity}</span>
                          <button onClick={() => updateQuantity(idx, 1)} aria-label="زيادة" className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-100">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} aria-label="حذف" className="w-7 h-7 rounded-lg text-rose-700 flex items-center justify-center hover:bg-rose-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {med && supportsRetail(med) && (
                          <button onClick={() => toggleUnit(idx)} className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-black flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            {unit === 'pack' ? `بيع بالـ${med.subUnitName || 'وحدة'} (العبوة ${packSizeOf(med)})` : 'بيع بالعبوة'}
                          </button>
                        )}
                        <button onClick={() => setDirectionsOpen(directionsOpen === item.medicineId ? null : item.medicineId)} className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {item.directions ? 'تعديل الملصق' : 'ملصق الاستعمال'}
                        </button>
                      </div>
                      {directionsOpen === item.medicineId && (
                        <input
                          value={item.directions || ''}
                          onChange={e => setDirections(idx, e.target.value)}
                          placeholder="مثال: حبة كل 8 ساعات بعد الأكل لمدة 7 أيام"
                          className="w-full p-2 text-xs rounded-lg border border-slate-300"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-slate-50 space-y-2 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">المجموع الفرعي:</span>
                <span className="font-mono font-bold">{subtotal.toFixed(2)} {settings.currency}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">الخصم الإضافي:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={discountAmount || ''}
                    placeholder="0"
                    onChange={e => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 p-1.5 rounded-lg border border-slate-300 text-center font-mono text-xs"
                  />
                  <span className="text-slate-700 font-bold">{settings.currency}</span>
                </div>
              </div>
              {taxAmount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">الضريبة ({settings.taxRate}%):</span>
                  <span className="font-mono font-bold">{taxAmount.toFixed(2)} {settings.currency}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-300 flex items-center justify-between">
                <span className="font-black text-slate-900">المبلغ المطلوب:</span>
                <span className="text-2xl font-black text-emerald-800 font-mono">{finalAmount.toFixed(2)} {settings.currency}</span>
              </div>
              {plan.warnings.map((w, i) => (
                <div key={i} className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg p-2">⚠ {w}</div>
              ))}
              <button
                onClick={handleOpenPayment}
                disabled={cart.length === 0}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-black text-sm shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span>إتمام البيع والدفع</span>
                <kbd className="hidden lg:inline text-[11px] px-1.5 rounded bg-white/20 font-mono">F9</kbd>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alternatives panel */}
      {altFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-sky-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm">بدائل متوفرة لـ «{altFor.tradeName}»</h3>
                <p className="text-xs text-sky-100">نفس المادة الفعالة: {altFor.genericName}</p>
              </div>
              <button onClick={() => setAltFor(null)} aria-label="إغلاق" className="p-1 rounded-lg hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {altList.map(a => (
                <div key={a.id} className="p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 text-sm">{a.tradeName}</div>
                    <div className="text-xs text-slate-600">{[a.strength, a.dosageForm, a.manufacturer].filter(Boolean).join(' · ')}</div>
                    <div className="text-xs font-bold text-slate-800">المتوفر: {availableQuantity(a, 'pack')} · السعر: {a.sellPrice.toFixed(2)} {settings.currency}</div>
                  </div>
                  <button
                    onClick={() => {
                      addToCart(a);
                      setAltFor(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-black shrink-0"
                  >
                    إضافة للسلة
                  </button>
                </div>
              ))}
              {altList.length === 0 && <div className="p-6 text-center text-xs font-bold text-slate-600">لا يوجد بديل متوفر بنفس المادة الفعالة.</div>}
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <form onSubmit={handleFinishSale} className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-700 text-white">
              <h3 className="font-black text-base">تأكيد عملية البيع وطريقة الدفع</h3>
              <p className="text-xs text-emerald-100">{selectedEntity ? selectedEntity.name : 'زبون نقدي فوري'}</p>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50 text-center">
                <div className="text-xs text-emerald-900 font-bold">صافي إجمالي الفاتورة</div>
                <div className="text-3xl font-black text-emerald-900 font-mono">{finalAmount.toFixed(2)} {settings.currency}</div>
              </div>

              <div>
                <div className="text-xs font-black text-slate-800 mb-1.5">طريقة التحصيل / الدفع:</div>
                <div className="grid grid-cols-3 gap-2">
                  {([['cash', 'نقداً (كاش)'], ['credit', 'آجل (على الحساب)'], ['card', 'بطاقة / شيك']] as [PaymentMethod, string][]).map(([k, label]) => (
                    <button
                      type="button"
                      key={k}
                      onClick={() => {
                        setPaymentMethod(k);
                        setPaidInput(k === 'credit' ? '0' : finalAmount.toString());
                      }}
                      className={`py-2 rounded-xl border text-xs font-black ${paymentMethod === k ? 'bg-emerald-700 border-emerald-800 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">المبلغ المدفوع فعلياً الآن ({settings.currency}):</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  autoFocus
                  value={paidInput}
                  onChange={e => setPaidInput(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-slate-400 text-center text-lg font-black font-mono"
                />
              </div>

              {settle.remainingAmount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold">
                  المتبقي كدين على الحساب: <strong className="font-mono">{settle.remainingAmount.toFixed(2)} {settings.currency}</strong>
                  {selectedEntityId === 'cash' && <div className="text-red-700 mt-1">لا يمكن تسجيل دين على زبون نقدي. اختر صيدلية أو عميلاً من السلة، أو ادفع المبلغ كاملاً.</div>}
                </div>
              )}
              {settle.change > 0 && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-300 text-sky-900 text-sm font-black">
                  الباقي للزبون: <strong className="font-mono">{settle.change.toFixed(2)} {settings.currency}</strong>
                </div>
              )}

              {plan.needsPrescription && (
                <div className="p-3 rounded-2xl border border-violet-300 bg-violet-50 space-y-2">
                  <div className="text-xs font-black text-violet-900">بيانات الوصفة (مطلوبة لأدوية الوصفة/الخاضعة للرقابة)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="اسم المريض *" value={rx.patientName} onChange={e => setRx({ ...rx, patientName: e.target.value })} className="p-2 text-xs rounded-lg border border-violet-300 bg-white" />
                    <input placeholder="اسم الطبيب *" value={rx.doctorName} onChange={e => setRx({ ...rx, doctorName: e.target.value })} className="p-2 text-xs rounded-lg border border-violet-300 bg-white" />
                    <input placeholder="رقم الوصفة" value={rx.prescriptionNumber || ''} onChange={e => setRx({ ...rx, prescriptionNumber: e.target.value })} className="p-2 text-xs rounded-lg border border-violet-300 bg-white" />
                    <input placeholder="هوية المريض" value={rx.patientId || ''} onChange={e => setRx({ ...rx, patientId: e.target.value })} className="p-2 text-xs rounded-lg border border-violet-300 bg-white" />
                  </div>
                </div>
              )}

              {(saleErrors.length > 0 || (!plan.ok && saleErrors.length === 0 && false)) && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs space-y-1 font-bold">
                  {saleErrors.map((er, i) => (
                    <div key={i}>• {er}</div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">ملاحظات على الفاتورة:</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="رقم مرجع خارجي، اسم المندوب..." className="w-full p-2.5 text-xs rounded-xl border border-slate-300" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex items-center gap-3">
              <button type="submit" className="flex-1 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                تأكيد وطباعة الفاتورة
              </button>
              <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-3 rounded-2xl text-slate-800 font-bold text-sm hover:bg-slate-100">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Shift modal */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white font-black text-sm">{currentShift ? 'إغلاق الوردية' : 'فتح وردية جديدة'}</div>
            <div className="p-5 space-y-3">
              {currentShift ? (
                <>
                  <div className="text-xs font-bold text-slate-800 space-y-1">
                    <div>رصيد الافتتاح: <b className="font-mono">{currentShift.openingCash.toFixed(2)}</b></div>
                    <div>مبيعات نقدية خلال الوردية: <b className="font-mono">{shiftCash.toFixed(2)}</b> ({shiftSales.length} فاتورة)</div>
                    <div className="text-sm">النقد المتوقع في الدرج: <b className="font-mono text-emerald-800">{expectedCash.toFixed(2)} {settings.currency}</b></div>
                  </div>
                  <label className="block text-xs font-black text-slate-800">النقد المعدود فعلياً في الدرج:</label>
                  <input type="number" step="0.01" min={0} autoFocus value={countedInput} onChange={e => setCountedInput(e.target.value)} className="w-full p-3 rounded-xl border-2 border-slate-400 text-center text-lg font-black font-mono" />
                  {countedInput !== '' && (
                    <div className={`text-sm font-black ${round2((parseFloat(countedInput) || 0) - expectedCash) === 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                      الفرق: {round2((parseFloat(countedInput) || 0) - expectedCash).toFixed(2)} {settings.currency}
                    </div>
                  )}
                  <input value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} placeholder="ملاحظات (اختياري)" className="w-full p-2.5 text-xs rounded-xl border border-slate-300" />
                </>
              ) : (
                <>
                  <label className="block text-xs font-black text-slate-800">النقد الموجود في الدرج عند الافتتاح ({settings.currency}):</label>
                  <input type="number" step="0.01" min={0} autoFocus value={openingInput} onChange={e => setOpeningInput(e.target.value)} className="w-full p-3 rounded-xl border-2 border-slate-400 text-center text-lg font-black font-mono" />
                </>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  if (currentShift) {
                    if (countedInput === '') return;
                    onCloseShift(parseFloat(countedInput) || 0, shiftNotes);
                  } else {
                    onOpenShift(parseFloat(openingInput) || 0);
                  }
                  setShowShiftModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm"
              >
                {currentShift ? 'إغلاق الوردية' : 'فتح الوردية'}
              </button>
              <button onClick={() => setShowShiftModal(false)} className="px-4 py-2.5 rounded-xl text-slate-800 font-bold text-sm hover:bg-slate-100">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {completedInvoice && (
        <PrintReceiptModal isOpen={true} onClose={() => setCompletedInvoice(null)} invoice={completedInvoice} settings={settings} />
      )}
    </div>
  );
};

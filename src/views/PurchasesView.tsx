import React, { useMemo, useState } from 'react';
import { PackagePlus, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, X } from 'lucide-react';
import { AppSettings, Entity, Medicine, PurchaseInvoice, PurchaseLine, UserRole } from '../types';
import { matchesQuery } from '../services/inventoryService';
import { round2, uid } from '../services/saleService';

interface PurchasesViewProps {
  medicines: Medicine[];
  entities: Entity[];
  purchases: PurchaseInvoice[];
  settings: AppSettings;
  currentRole: UserRole;
  onAddPurchase: (inv: PurchaseInvoice) => void;
}

interface DraftLine {
  key: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  bonusQuantity: string;
  unitCost: string;
}

const emptyLine = (): DraftLine => ({ key: uid('l'), medicineId: '', batchNumber: '', expiryDate: '', quantity: '1', bonusQuantity: '0', unitCost: '' });

function nextPurchaseNumber(list: PurchaseInvoice[]): string {
  let max = 0;
  for (const p of list) {
    const m = /^PUR-(\d+)$/.exec(p.number || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `PUR-${String(max + 1).padStart(6, '0')}`;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ medicines, entities, purchases, settings, currentRole, onAddPurchase }) => {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoice, setSupplierInvoice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [discountPercent, setDiscountPercent] = useState('0');
  const [paid, setPaid] = useState('0');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const suppliers = entities.filter(e => e.type !== 'customer');
  const today = new Date().toISOString().split('T')[0];

  const parsed = lines.map(l => {
    const qty = parseInt(l.quantity) || 0;
    const bonus = parseInt(l.bonusQuantity) || 0;
    const cost = parseFloat(l.unitCost) || 0;
    return { l, qty, bonus, cost, total: round2(qty * cost) };
  });
  const subtotal = round2(parsed.reduce((s, x) => s + x.total, 0));
  const discPct = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
  const discountAmount = round2((subtotal * discPct) / 100);
  const total = round2(subtotal - discountAmount);
  const paidNum = Math.max(0, parseFloat(paid) || 0);
  const remaining = round2(Math.max(0, total - paidNum));

  const medMatches = useMemo(() => medicines.filter(m => matchesQuery(m, pickerQuery)).slice(0, 30), [medicines, pickerQuery]);

  const reset = () => {
    setSupplierId('');
    setSupplierInvoice('');
    setDate(today);
    setDueDate('');
    setLines([emptyLine()]);
    setDiscountPercent('0');
    setPaid('0');
    setNotes('');
    setErrors([]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    const supplier = entities.find(x => x.id === supplierId);
    if (!supplier) errs.push('اختر الشركة / المورد.');
    const active = parsed.filter(x => x.l.medicineId || x.qty || x.cost);
    if (active.length === 0) errs.push('أضف صنفاً واحداً على الأقل.');
    const outLines: PurchaseLine[] = [];
    active.forEach((x, i) => {
      const med = medicines.find(m => m.id === x.l.medicineId);
      const label = `السطر ${i + 1}`;
      if (!med) return errs.push(`${label}: اختر الصنف.`);
      if (x.qty <= 0 && x.bonus <= 0) return errs.push(`${label}: الكمية يجب أن تكون أكبر من صفر.`);
      if (x.qty < 0 || x.bonus < 0) return errs.push(`${label}: كمية سالبة.`);
      if (x.cost < 0 || (x.qty > 0 && x.cost === 0)) errs.push(`${label}: أدخل سعر شراء العبوة.`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(x.l.expiryDate)) return errs.push(`${label}: أدخل تاريخ الانتهاء.`);
      if (x.l.expiryDate < today) errs.push(`${label}: تاريخ الانتهاء في الماضي (${x.l.expiryDate}).`);
      outLines.push({
        medicineId: med.id,
        medicineName: med.tradeName,
        batchNumber: x.l.batchNumber.trim() || 'B-' + date.replace(/-/g, ''),
        expiryDate: x.l.expiryDate,
        quantity: x.qty,
        bonusQuantity: x.bonus,
        unitCost: x.cost,
        lineTotal: x.total,
      });
    });
    if (paidNum > total + 0.0001) errs.push('المبلغ المدفوع أكبر من إجمالي الفاتورة.');
    if (errs.length) {
      setErrors(errs);
      return;
    }
    const inv: PurchaseInvoice = {
      id: uid('pur'),
      number: nextPurchaseNumber(purchases),
      supplierId,
      supplierName: supplier!.name,
      supplierInvoiceNumber: supplierInvoice.trim() || undefined,
      date,
      dueDate: dueDate || undefined,
      lines: outLines,
      subtotal,
      discountPercent: discPct,
      discountAmount,
      total,
      paidAmount: round2(Math.min(paidNum, total)),
      remainingAmount: remaining,
      recordedBy: settings.ownerName || 'المدير',
      notes: notes.trim() || undefined,
    };
    onAddPurchase(inv);
    reset();
    setShowForm(false);
  };

  if (currentRole === 'pharmacist') {
    return <div className="p-10 text-center font-bold text-slate-700">هذه الشاشة متاحة للمدير فقط.</div>;
  }

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <PackagePlus className="w-6 h-6 text-indigo-700" />
            <span>فواتير الشراء من الشركات</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">إدخال البضاعة كتشغيلات بتاريخ انتهاء وتكلفة، مع البونص والخصم وتسجيل المبلغ المستحق للشركة</p>
        </div>
        <button onClick={() => { reset(); setShowForm(true); }} className="px-4 py-2.5 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs flex items-center gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          فاتورة شراء جديدة
        </button>
      </div>

      {purchases.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 bg-white">
          <PackagePlus className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <p className="font-black text-slate-800">لا توجد فواتير شراء بعد</p>
          <p className="text-xs text-slate-600 mt-1">أضف أصناف الأدوية من شاشة المخزون أولاً، ثم سجّل مشترياتك هنا.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-800 font-black">
              <tr>
                <th className="p-3">الرقم</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">الشركة</th>
                <th className="p-3">الإجمالي</th>
                <th className="p-3">المدفوع</th>
                <th className="p-3">المتبقي</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map(p => (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-black">{p.number}</td>
                    <td className="p-3 font-mono">{p.date}</td>
                    <td className="p-3 font-black">{p.supplierName}{p.supplierInvoiceNumber ? <span className="block text-xs font-normal text-slate-600">فاتورة المورد: {p.supplierInvoiceNumber}</span> : null}</td>
                    <td className="p-3 font-mono font-bold">{p.total.toFixed(2)} {settings.currency}</td>
                    <td className="p-3 font-mono">{p.paidAmount.toFixed(2)}</td>
                    <td className={`p-3 font-mono font-black ${p.remainingAmount > 0 ? 'text-rose-800' : 'text-emerald-800'}`}>{p.remainingAmount.toFixed(2)}{p.dueDate && p.remainingAmount > 0 ? <span className="block text-xs font-bold text-slate-700">يستحق {p.dueDate}</span> : null}</td>
                    <td className="p-3">
                      <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} aria-label="تفاصيل" className="p-1.5 rounded-lg hover:bg-slate-100">
                        {expanded === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr>
                      <td colSpan={7} className="p-3 bg-slate-50">
                        <table className="w-full text-right">
                          <thead className="text-slate-700 font-black">
                            <tr><th className="p-1.5">الصنف</th><th className="p-1.5">التشغيلة</th><th className="p-1.5">الانتهاء</th><th className="p-1.5">الكمية</th><th className="p-1.5">بونص</th><th className="p-1.5">سعر العبوة</th><th className="p-1.5">الإجمالي</th></tr>
                          </thead>
                          <tbody>
                            {p.lines.map((l, i) => (
                              <tr key={i} className="border-t border-slate-200">
                                <td className="p-1.5 font-bold">{l.medicineName}</td>
                                <td className="p-1.5 font-mono">{l.batchNumber}</td>
                                <td className="p-1.5 font-mono">{l.expiryDate}</td>
                                <td className="p-1.5 font-mono">{l.quantity}</td>
                                <td className="p-1.5 font-mono">{l.bonusQuantity}</td>
                                <td className="p-1.5 font-mono">{l.unitCost.toFixed(2)}</td>
                                <td className="p-1.5 font-mono font-bold">{l.lineTotal.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-2 text-xs font-bold text-slate-800">الخصم: {p.discountPercent}% ({p.discountAmount.toFixed(2)}) · {p.notes || ''}</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="فاتورة شراء جديدة">
          <form onSubmit={submit} className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
            <div className="p-4 bg-indigo-800 text-white flex items-center justify-between shrink-0">
              <h3 className="font-black text-base">فاتورة شراء جديدة</h3>
              <button type="button" onClick={() => setShowForm(false)} aria-label="إغلاق" className="p-1.5 rounded-lg hover:bg-white/20"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block font-black mb-1">الشركة / المورد *</label>
                  <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 font-bold">
                    <option value="">— اختر —</option>
                    {suppliers.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block font-black mb-1">رقم فاتورة المورد</label>
                  <input value={supplierInvoice} onChange={e => setSupplierInvoice(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 font-mono" />
                </div>
                <div>
                  <label className="block font-black mb-1">التاريخ</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 font-mono" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-black">الأصناف</div>
                  <button type="button" onClick={() => setLines([...lines, emptyLine()])} className="px-3 py-1 rounded-lg bg-indigo-700 text-white font-black">+ سطر</button>
                </div>
                {lines.map((l, i) => {
                  const med = medicines.find(m => m.id === l.medicineId);
                  return (
                    <div key={l.key} className="p-3 rounded-2xl border border-slate-200 bg-slate-50 grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 sm:col-span-4 relative">
                        <label className="block font-bold mb-0.5">الصنف</label>
                        <button type="button" onClick={() => { setPickerFor(pickerFor === l.key ? null : l.key); setPickerQuery(''); }} className="w-full p-2 rounded-lg border border-slate-300 bg-white text-right font-bold truncate">
                          {med ? med.tradeName : 'اضغط لاختيار الصنف...'}
                        </button>
                        {pickerFor === l.key && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-xl shadow-lg p-2 space-y-1">
                            <input autoFocus value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} placeholder="ابحث بالاسم أو الباركود" className="w-full p-2 rounded-lg border border-slate-300" />
                            <div className="max-h-48 overflow-y-auto">
                              {medMatches.map(m => (
                                <button
                                  type="button"
                                  key={m.id}
                                  onClick={() => {
                                    setLines(lines.map((x, j) => (j === i ? { ...x, medicineId: m.id, unitCost: x.unitCost || String(m.purchasePrice || '') } : x)));
                                    setPickerFor(null);
                                  }}
                                  className="w-full text-right p-2 rounded-lg hover:bg-indigo-50 font-bold"
                                >
                                  {m.tradeName} <span className="text-slate-600 font-normal">{m.strength || ''}</span>
                                </button>
                              ))}
                              {medMatches.length === 0 && <div className="p-2 text-slate-600 font-bold">لا نتائج. أضف الصنف من شاشة المخزون أولاً.</div>}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="col-span-4 sm:col-span-2"><label className="block font-bold mb-0.5">رقم التشغيلة</label><input value={l.batchNumber} onChange={e => setLines(lines.map((x, j) => (j === i ? { ...x, batchNumber: e.target.value } : x)))} className="w-full p-2 rounded-lg border border-slate-300 font-mono" /></div>
                      <div className="col-span-4 sm:col-span-2"><label className="block font-bold mb-0.5">الانتهاء *</label><input type="date" value={l.expiryDate} onChange={e => setLines(lines.map((x, j) => (j === i ? { ...x, expiryDate: e.target.value } : x)))} className="w-full p-2 rounded-lg border border-slate-300 font-mono" /></div>
                      <div className="col-span-2 sm:col-span-1"><label className="block font-bold mb-0.5">الكمية</label><input type="number" min={0} value={l.quantity} onChange={e => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} className="w-full p-2 rounded-lg border border-slate-300 font-mono font-bold" /></div>
                      <div className="col-span-2 sm:col-span-1"><label className="block font-bold mb-0.5">بونص</label><input type="number" min={0} value={l.bonusQuantity} onChange={e => setLines(lines.map((x, j) => (j === i ? { ...x, bonusQuantity: e.target.value } : x)))} className="w-full p-2 rounded-lg border border-slate-300 font-mono" /></div>
                      <div className="col-span-4 sm:col-span-1"><label className="block font-bold mb-0.5">سعر العبوة</label><input type="number" min={0} step="0.01" value={l.unitCost} onChange={e => setLines(lines.map((x, j) => (j === i ? { ...x, unitCost: e.target.value } : x)))} className="w-full p-2 rounded-lg border border-slate-300 font-mono" /></div>
                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        <button type="button" aria-label="حذف السطر" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : [emptyLine()])} className="p-2 rounded-lg text-rose-800 hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                <div><label className="block font-black mb-1">خصم الفاتورة %</label><input type="number" min={0} max={100} step="0.01" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 font-mono" /></div>
                <div><label className="block font-black mb-1">المدفوع الآن</label><input type="number" min={0} step="0.01" value={paid} onChange={e => setPaid(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 font-mono" /></div>
                <div><label className="block font-black mb-1">تاريخ الاستحقاق</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 font-mono" /></div>
                <div className="font-bold space-y-0.5">
                  <div>المجموع: <span className="font-mono">{subtotal.toFixed(2)}</span></div>
                  <div>الخصم: <span className="font-mono">-{discountAmount.toFixed(2)}</span></div>
                  <div className="text-sm font-black">الإجمالي: <span className="font-mono">{total.toFixed(2)} {settings.currency}</span></div>
                  <div className="text-rose-800 font-black">المتبقي للشركة: <span className="font-mono">{remaining.toFixed(2)}</span></div>
                </div>
              </div>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات (اختياري)" className="w-full p-2.5 rounded-xl border border-slate-300" />

              {errors.length > 0 && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 font-bold space-y-1">
                  <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> يرجى التصحيح:</div>
                  {errors.map((er, i) => (<div key={i}>• {er}</div>))}
                </div>
              )}
              <p className="text-slate-700">البونص يُضاف للمخزون مجاناً ويخفّض متوسط تكلفة العبوة تلقائياً (التكلفة الفعلية = قيمة السطر بعد الخصم ÷ الكمية والبونص).</p>
            </div>
            <div className="p-3 border-t border-slate-200 flex gap-3 bg-slate-50">
              <button type="submit" className="flex-1 py-3 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white font-black">حفظ وإدخال المخزون</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-3 rounded-2xl text-slate-800 font-bold hover:bg-slate-200">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

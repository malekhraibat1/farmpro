import React, { useMemo, useState } from 'react';
import { X, ClipboardCheck, Undo2, ShoppingBasket, History, Copy, Printer } from 'lucide-react';
import { Entity, Medicine, SaleInvoice, StockMovement, MovementType } from '../types';
import {
  expiringBatches,
  groupByManufacturer,
  matchesQuery,
  normalizeMedicine,
  normalizeSearch,
  reorderSuggestions,
} from '../services/inventoryService';
import { round2 } from '../services/saleService';

const Shell: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode; onClose: () => void; wide?: boolean; children: React.ReactNode; footer?: React.ReactNode }> = ({
  title,
  subtitle,
  icon,
  onClose,
  wide,
  children,
  footer,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
    <div className={`w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col`}>
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">{icon}</span>
          <div>
            <h3 className="font-black text-base">{title}</h3>
            {subtitle && <p className="text-xs text-slate-300">{subtitle}</p>}
          </div>
        </div>
        <button onClick={onClose} aria-label="إغلاق" className="p-1.5 rounded-lg hover:bg-white/20">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 overflow-y-auto flex-1 text-xs text-slate-900">{children}</div>
      {footer && <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">{footer}</div>}
    </div>
  </div>
);

const MOVE_LABELS: Record<MovementType, { label: string; cls: string }> = {
  sale: { label: 'بيع', cls: 'bg-rose-100 text-rose-900' },
  purchase: { label: 'شراء', cls: 'bg-emerald-100 text-emerald-900' },
  bonus: { label: 'بونص', cls: 'bg-emerald-100 text-emerald-900' },
  supplier_return: { label: 'مرتجع لشركة', cls: 'bg-amber-100 text-amber-900' },
  adjustment: { label: 'تعديل يدوي', cls: 'bg-sky-100 text-sky-900' },
  stocktake: { label: 'تسوية جرد', cls: 'bg-indigo-100 text-indigo-900' },
  write_off: { label: 'إتلاف', cls: 'bg-slate-200 text-slate-900' },
  initial: { label: 'رصيد افتتاحي', cls: 'bg-teal-100 text-teal-900' },
};

/* ------------------------------------------------------------------ */
/* سجل حركة صنف                                                         */
/* ------------------------------------------------------------------ */
export const MovementsModal: React.FC<{ medicine: Medicine; movements: StockMovement[]; onClose: () => void }> = ({ medicine, movements, onClose }) => {
  const list = useMemo(
    () => movements.filter(m => m.medicineId === medicine.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 300),
    [movements, medicine.id]
  );
  const med = normalizeMedicine(medicine);
  return (
    <Shell title={`سجل حركة: ${medicine.tradeName}`} subtitle="كل دخول وخروج للمخزون مع المرجع والمسؤول" icon={<History className="w-5 h-5" />} onClose={onClose} wide>
      <div className="mb-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
        <div className="font-black mb-1.5">التشغيلات الحالية</div>
        <div className="flex flex-wrap gap-2">
          {(med.batches || []).map(b => (
            <span key={b.id} className="px-2.5 py-1 rounded-xl bg-white border border-slate-300 font-mono font-bold">
              {b.batchNumber || '-'} · {b.expiryDate} · {b.quantity} عبوة
            </span>
          ))}
          {(med.looseUnits || 0) > 0 && <span className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-300 font-bold">سائب: {med.looseUnits} {med.subUnitName || 'وحدة'}</span>}
        </div>
      </div>
      {list.length === 0 ? (
        <div className="p-8 text-center font-bold text-slate-600">لا توجد حركات مسجّلة لهذا الصنف بعد.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-100 text-slate-800 font-black">
              <tr>
                <th className="p-2">التاريخ</th>
                <th className="p-2">النوع</th>
                <th className="p-2">التغيّر (عبوات)</th>
                <th className="p-2">التشغيلة</th>
                <th className="p-2">المرجع</th>
                <th className="p-2">المسؤول</th>
                <th className="p-2">ملاحظة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map(m => (
                <tr key={m.id}>
                  <td className="p-2 font-mono whitespace-nowrap">{m.date.slice(0, 16).replace('T', ' ')}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-lg font-black ${MOVE_LABELS[m.type]?.cls || ''}`}>{MOVE_LABELS[m.type]?.label || m.type}</span>
                  </td>
                  <td className={`p-2 font-mono font-black ${m.packsDelta < 0 ? 'text-rose-800' : 'text-emerald-800'}`}>
                    {m.packsDelta > 0 ? '+' : ''}
                    {m.packsDelta}
                    {m.unitsDelta ? ` (${m.unitsDelta > 0 ? '+' : ''}${m.unitsDelta} سائب)` : ''}
                  </td>
                  <td className="p-2 font-mono">{m.batchNumber || '-'}</td>
                  <td className="p-2 font-mono">{m.reference || '-'}</td>
                  <td className="p-2">{m.recordedBy}</td>
                  <td className="p-2">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
};

/* ------------------------------------------------------------------ */
/* الجرد                                                                */
/* ------------------------------------------------------------------ */
export const StocktakeModal: React.FC<{
  medicines: Medicine[];
  onApply: (counts: { medicineId: string; batchId: string; counted: number }[]) => number;
  onClose: () => void;
}> = ({ medicines, onApply, onClose }) => {
  const [query, setQuery] = useState('');
  const [listed, setListed] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [done, setDone] = useState<number | null>(null);

  const norm = useMemo(() => medicines.map(normalizeMedicine), [medicines]);
  const listedMeds = listed.map(id => norm.find(m => m.id === id)).filter(Boolean) as Medicine[];

  const addByQuery = () => {
    const q = query.trim();
    if (!q) return;
    const exact = norm.find(m => m.barcode === q);
    const found = exact ? [exact] : norm.filter(m => matchesQuery(m, q)).slice(0, 1);
    if (found.length) {
      setListed(prev => (prev.includes(found[0].id) ? prev : [found[0].id, ...prev]));
      setQuery('');
    }
  };

  const rows = listedMeds.flatMap(m => (m.batches || []).map(b => ({ m, b })));
  const changed = rows.filter(r => counts[r.b.id] !== undefined && counts[r.b.id] !== '' && parseInt(counts[r.b.id], 10) !== r.b.quantity);

  return (
    <Shell
      title="جرد المخزون"
      subtitle="امسح الباركود أو ابحث، ثم أدخل الكمية المعدودة لكل تشغيلة"
      icon={<ClipboardCheck className="w-5 h-5" />}
      onClose={onClose}
      wide
      footer={
        done !== null ? (
          <div className="flex items-center justify-between">
            <span className="font-black text-emerald-800">تمت التسوية: عُدِّلت {done} تشغيلة وسُجّلت في حركة المخزون.</span>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black">إغلاق</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-800">{changed.length} تشغيلة فيها فرق عن النظام</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-slate-800 font-bold hover:bg-slate-100">إلغاء</button>
              <button
                disabled={changed.length === 0}
                onClick={() => {
                  if (!confirm(`سيتم تعديل ${changed.length} تشغيلة لتطابق الكميات المعدودة. هل تريد المتابعة؟`)) return;
                  const n = onApply(changed.map(r => ({ medicineId: r.m.id, batchId: r.b.id, counted: parseInt(counts[r.b.id], 10) || 0 })));
                  setDone(n);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-300 disabled:text-slate-600 text-white font-black"
              >
                تطبيق التسوية
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="flex gap-2 mb-3">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addByQuery();
            }
          }}
          placeholder="امسح الباركود أو اكتب الاسم ثم Enter"
          className="flex-1 p-2.5 rounded-xl border border-slate-300 font-bold"
        />
        <button onClick={addByQuery} className="px-4 rounded-xl bg-slate-900 text-white font-black">إضافة</button>
        <button
          onClick={() => setListed(norm.slice(0, 200).map(m => m.id))}
          className="px-3 rounded-xl border border-slate-300 font-bold hover:bg-slate-100"
          title="إضافة أول 200 صنف لجرد شامل"
        >
          إضافة الكل
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="p-8 text-center font-bold text-slate-600">لم تُضف أصناف للجرد بعد.</div>
      ) : (
        <table className="w-full text-right">
          <thead className="bg-slate-100 font-black">
            <tr>
              <th className="p-2">الصنف</th>
              <th className="p-2">التشغيلة</th>
              <th className="p-2">الانتهاء</th>
              <th className="p-2">النظام</th>
              <th className="p-2">المعدود</th>
              <th className="p-2">الفرق</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ m, b }) => {
              const raw = counts[b.id];
              const diff = raw === undefined || raw === '' ? null : (parseInt(raw, 10) || 0) - b.quantity;
              return (
                <tr key={b.id}>
                  <td className="p-2 font-black">{m.tradeName}</td>
                  <td className="p-2 font-mono">{b.batchNumber || '-'}</td>
                  <td className="p-2 font-mono">{b.expiryDate}</td>
                  <td className="p-2 font-mono font-black">{b.quantity}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      value={raw ?? ''}
                      onChange={e => setCounts({ ...counts, [b.id]: e.target.value })}
                      className="w-20 p-1.5 rounded-lg border border-slate-400 text-center font-mono font-black"
                      aria-label={`الكمية المعدودة ${m.tradeName}`}
                    />
                  </td>
                  <td className={`p-2 font-mono font-black ${diff === null ? '' : diff === 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{diff === null ? '-' : diff > 0 ? `+${diff}` : diff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Shell>
  );
};

/* ------------------------------------------------------------------ */
/* مرتجعات الشركات والإتلاف                                             */
/* ------------------------------------------------------------------ */
export const SupplierReturnModal: React.FC<{
  medicines: Medicine[];
  entities: Entity[];
  nearDays: number;
  currency: string;
  onSubmit: (
    items: { medicineId: string; batchId: string; packs: number }[],
    kind: 'supplier_return' | 'write_off',
    opts: { entityId?: string; note?: string }
  ) => { ok: boolean; error?: string; value: number };
  onClose: () => void;
}> = ({ medicines, entities, nearDays, currency, onSubmit, onClose }) => {
  const [days, setDays] = useState(nearDays);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [entityId, setEntityId] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<string>('');

  const list = useMemo(() => expiringBatches(medicines, days, new Date(), true), [medicines, days]);
  const groups = useMemo(() => groupByManufacturer(list), [list]);
  const companies = entities.filter(e => e.type === 'company' || e.type === 'supplier');

  const selected = list.filter(x => (picked[x.batch.id] || 0) > 0);
  const totalValue = round2(selected.reduce((s, x) => s + (picked[x.batch.id] || 0) * x.batch.purchasePrice, 0));

  const submit = (kind: 'supplier_return' | 'write_off') => {
    const items = selected.map(x => ({ medicineId: x.medicine.id, batchId: x.batch.id, packs: picked[x.batch.id] }));
    if (!items.length) return;
    if (kind === 'supplier_return' && !entityId) {
      if (!confirm('لم تختر شركة لتسجيل المرتجع على حسابها. هل تريد المتابعة بدون تسجيل رصيد؟')) return;
    }
    const r = onSubmit(items, kind, { entityId: kind === 'supplier_return' ? entityId || undefined : undefined, note });
    if (r.ok) {
      setResult(`تم ${kind === 'supplier_return' ? 'تسجيل المرتجع' : 'تسجيل الإتلاف'} بقيمة تكلفة ${r.value.toFixed(2)} ${currency}`);
      setPicked({});
    } else {
      setResult(`تعذّر التنفيذ: ${r.error}`);
    }
  };

  const copyText = () => {
    const lines: string[] = ['قائمة أدوية قريبة الانتهاء للإرجاع:'];
    for (const [mf, arr] of Object.entries(groups)) {
      lines.push(`\n*${mf}*`);
      arr.forEach(x => lines.push(`- ${x.medicine.tradeName} | تشغيلة ${x.batch.batchNumber || '-'} | ينتهي ${x.batch.expiryDate} | ${x.batch.quantity} عبوة`));
    }
    navigator.clipboard?.writeText(lines.join('\n'));
    setResult('تم نسخ القائمة، يمكنك لصقها في واتساب.');
  };

  return (
    <Shell
      title="مرتجعات الشركات والإتلاف"
      subtitle="الأدوية المنتهية أو قريبة الانتهاء مجمّعة حسب الشركة"
      icon={<Undo2 className="w-5 h-5" />}
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="font-black">المحدد: {selected.length} تشغيلة · قيمة التكلفة: <span className="font-mono">{totalValue.toFixed(2)} {currency}</span></div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copyText} className="px-3 py-2 rounded-xl border border-slate-300 font-bold hover:bg-slate-100 flex items-center gap-1.5">
              <Copy className="w-4 h-4" /> نسخ القائمة
            </button>
            <button onClick={() => window.print()} className="px-3 py-2 rounded-xl border border-slate-300 font-bold hover:bg-slate-100 flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> طباعة
            </button>
            <button disabled={!selected.length} onClick={() => submit('write_off')} className="px-4 py-2 rounded-xl bg-slate-800 disabled:bg-slate-300 disabled:text-slate-600 text-white font-black">
              إتلاف المحدد
            </button>
            <button disabled={!selected.length} onClick={() => submit('supplier_return')} className="px-4 py-2 rounded-xl bg-amber-700 disabled:bg-slate-300 disabled:text-slate-600 text-white font-black">
              إرجاع للشركة
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <label className="block font-black mb-1">يشمل ما ينتهي خلال (يوم):</label>
          <input type="number" min={0} value={days} onChange={e => setDays(Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-24 p-2 rounded-xl border border-slate-300 font-mono font-black text-center" />
        </div>
        <div>
          <label className="block font-black mb-1">الشركة (لتسجيل الرصيد):</label>
          <select value={entityId} onChange={e => setEntityId(e.target.value)} className="p-2 rounded-xl border border-slate-300 font-bold min-w-48">
            <option value="">— بدون تسجيل رصيد —</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block font-black mb-1">ملاحظة:</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="رقم إشعار الإرجاع..." className="w-full p-2 rounded-xl border border-slate-300" />
        </div>
      </div>
      {result && <div role="status" className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-black">{result}</div>}
      {list.length === 0 ? (
        <div className="p-8 text-center font-bold text-slate-600">لا توجد تشغيلات تنتهي خلال {days} يوماً.</div>
      ) : (
        Object.entries(groups).map(([mf, arr]) => (
          <div key={mf} className="mb-4">
            <div className="px-3 py-1.5 bg-slate-100 rounded-xl font-black mb-1.5 flex items-center justify-between">
              <span>{mf}</span>
              <button
                className="text-xs font-bold text-amber-900 underline"
                onClick={() => setPicked(prev => ({ ...prev, ...Object.fromEntries(arr.map(x => [x.batch.id, x.batch.quantity])) }))}
              >
                تحديد الكل
              </button>
            </div>
            <table className="w-full text-right">
              <tbody className="divide-y divide-slate-100">
                {arr.map(x => (
                  <tr key={x.batch.id}>
                    <td className="p-2 font-black">{x.medicine.tradeName}</td>
                    <td className="p-2 font-mono">{x.batch.batchNumber || '-'}</td>
                    <td className="p-2 font-mono">
                      <span className={`px-2 py-0.5 rounded-lg font-black ${x.daysLeft < 0 ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900'}`}>
                        {x.batch.expiryDate} ({x.daysLeft < 0 ? `منتهي منذ ${-x.daysLeft} يوم` : `بعد ${x.daysLeft} يوم`})
                      </span>
                    </td>
                    <td className="p-2 font-mono">{x.batch.quantity} عبوة</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        max={x.batch.quantity}
                        value={picked[x.batch.id] ?? ''}
                        placeholder="0"
                        onChange={e => setPicked({ ...picked, [x.batch.id]: Math.min(x.batch.quantity, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                        className="w-20 p-1.5 rounded-lg border border-slate-400 text-center font-mono font-black"
                        aria-label={`كمية الإرجاع ${x.medicine.tradeName}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </Shell>
  );
};

/* ------------------------------------------------------------------ */
/* قائمة النواقص واقتراح الطلب                                          */
/* ------------------------------------------------------------------ */
export const ReorderModal: React.FC<{ medicines: Medicine[]; sales: SaleInvoice[]; currency: string; onClose: () => void }> = ({ medicines, sales, currency, onClose }) => {
  const [period, setPeriod] = useState(30);
  const [cover, setCover] = useState(30);
  const base = useMemo(() => reorderSuggestions(medicines, sales, { periodDays: period, coverDays: cover }), [medicines, sales, period, cover]);
  const [qtyOverride, setQtyOverride] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');

  const qtyOf = (id: string, def: number) => (qtyOverride[id] !== undefined ? qtyOverride[id] : def);
  const groups = useMemo(() => {
    const g: Record<string, typeof base> = {};
    for (const s of base) (g[s.medicine.manufacturer?.trim() || 'غير محدد'] = g[s.medicine.manufacturer?.trim() || 'غير محدد'] || []).push(s);
    return g;
  }, [base]);
  const total = round2(base.reduce((s, x) => s + qtyOf(x.medicine.id, x.suggestedQty) * x.medicine.purchasePrice, 0));

  const copyText = () => {
    const lines: string[] = [`طلبية أدوية - ${new Date().toISOString().split('T')[0]}`];
    for (const [mf, arr] of Object.entries(groups)) {
      lines.push(`\n*${mf}*`);
      arr.forEach(x => {
        const q = qtyOf(x.medicine.id, x.suggestedQty);
        if (q > 0) lines.push(`- ${x.medicine.tradeName}${x.medicine.strength ? ' ' + x.medicine.strength : ''}: ${q}`);
      });
    }
    navigator.clipboard?.writeText(lines.join('\n'));
    setMsg('تم نسخ الطلبية، يمكنك لصقها في واتساب.');
  };

  return (
    <Shell
      title="قائمة النواقص واقتراح الطلب"
      subtitle="تُحسب من مبيعاتك الفعلية والحد الأدنى لكل صنف"
      icon={<ShoppingBasket className="w-5 h-5" />}
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-black">التكلفة التقديرية للطلبية: <span className="font-mono">{total.toFixed(2)} {currency}</span></div>
          <div className="flex gap-2">
            <button onClick={copyText} className="px-3 py-2 rounded-xl border border-slate-300 font-bold hover:bg-slate-100 flex items-center gap-1.5"><Copy className="w-4 h-4" /> نسخ للواتساب</button>
            <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-slate-900 text-white font-black flex items-center gap-1.5"><Printer className="w-4 h-4" /> طباعة</button>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap gap-3 mb-3 items-end">
        <div>
          <label className="block font-black mb-1">احسب المبيعات لآخر (يوم):</label>
          <input type="number" min={7} value={period} onChange={e => setPeriod(Math.max(7, parseInt(e.target.value, 10) || 30))} className="w-24 p-2 rounded-xl border border-slate-300 font-mono font-black text-center" />
        </div>
        <div>
          <label className="block font-black mb-1">غطِّ احتياج (يوم):</label>
          <input type="number" min={7} value={cover} onChange={e => setCover(Math.max(7, parseInt(e.target.value, 10) || 30))} className="w-24 p-2 rounded-xl border border-slate-300 font-mono font-black text-center" />
        </div>
        {msg && <span role="status" className="font-black text-emerald-800">{msg}</span>}
      </div>
      {base.length === 0 ? (
        <div className="p-8 text-center font-bold text-slate-600">لا توجد نواقص حالياً. كل الأصناف فوق حدها الأدنى وتغطي مبيعاتك.</div>
      ) : (
        Object.entries(groups).map(([mf, arr]) => (
          <div key={mf} className="mb-4">
            <div className="px-3 py-1.5 bg-slate-100 rounded-xl font-black mb-1.5">{mf}</div>
            <table className="w-full text-right">
              <thead className="text-slate-700 font-black">
                <tr>
                  <th className="p-1.5">الصنف</th>
                  <th className="p-1.5">المخزون</th>
                  <th className="p-1.5">مبيع/{period}ي</th>
                  <th className="p-1.5">المعدل اليومي</th>
                  <th className="p-1.5">الكمية المقترحة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {arr.map(x => (
                  <tr key={x.medicine.id}>
                    <td className="p-1.5 font-black">{x.medicine.tradeName}</td>
                    <td className="p-1.5 font-mono">{x.stock}</td>
                    <td className="p-1.5 font-mono">{x.soldInPeriod}</td>
                    <td className="p-1.5 font-mono">{x.dailyRate}</td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        min={0}
                        value={qtyOf(x.medicine.id, x.suggestedQty)}
                        onChange={e => setQtyOverride({ ...qtyOverride, [x.medicine.id]: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="w-20 p-1.5 rounded-lg border border-slate-400 text-center font-mono font-black"
                        aria-label={`الكمية المطلوبة ${x.medicine.tradeName}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </Shell>
  );
};

// تصدير لتجنّب تحذير الاستيراد غير المستخدم
export const _normalizeSearch = normalizeSearch;

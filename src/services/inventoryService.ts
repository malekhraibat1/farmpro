/**
 * منطق المخزون (دوال نقية قابلة للاختبار)
 * - التشغيلات (Batches) والصرف بنظام الأقدم انتهاءً أولاً (FEFO)
 * - البيع بالوحدة الصغرى (شريط/حبة) من عبوة مفتوحة
 * - البدائل بنفس المادة الفعالة، والبحث العربي المُطبَّع
 * - اقتراح النواقص، والمرتجعات للشركات، وسجل حركة المخزون
 */
import {
  BatchAllocation,
  InvoiceItem,
  Medicine,
  MedicineBatch,
  MovementType,
  SaleInvoice,
  StockMovement,
} from '../types';
import { isExpired, round2, uid } from './saleService';

const MS_DAY = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* التطبيع والتجميع                                                    */
/* ------------------------------------------------------------------ */

export function packSizeOf(m: Pick<Medicine, 'unitsPerPack'>): number {
  const u = Math.floor(Number(m.unitsPerPack) || 1);
  return u >= 1 ? u : 1;
}

export function supportsRetail(m: Pick<Medicine, 'unitsPerPack'>): boolean {
  return packSizeOf(m) > 1;
}

export function subUnitPriceOf(m: Pick<Medicine, 'sellPrice' | 'unitsPerPack' | 'subUnitPrice'>): number {
  if (m.subUnitPrice && m.subUnitPrice > 0) return round2(m.subUnitPrice);
  return round2(m.sellPrice / packSizeOf(m));
}

/** يحسب الحقول المجمَّعة من التشغيلات */
export function recomputeAggregates(m: Medicine): Medicine {
  const batches = (m.batches || []).map(b => ({ ...b, quantity: Math.max(0, Math.floor(b.quantity || 0)) }));
  const withStock = batches.filter(b => b.quantity > 0);
  const stock = withStock.reduce((s, b) => s + b.quantity, 0);

  let expiry = m.expiryDate;
  let batchNumber = m.batchNumber;
  let cost = m.purchasePrice;

  if (withStock.length > 0) {
    const sorted = [...withStock].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    expiry = sorted[0].expiryDate;
    batchNumber = sorted[0].batchNumber;
    const totalCost = withStock.reduce((s, b) => s + b.quantity * b.purchasePrice, 0);
    cost = round2(totalCost / stock);
  } else if (batches.length > 0) {
    // لا كمية: نُبقي بيانات أحدث تشغيلة حتى لا يُعتبر الصنف الفارغ «منتهياً»
    const sorted = [...batches].sort((a, b) => b.expiryDate.localeCompare(a.expiryDate));
    expiry = sorted[0].expiryDate;
    batchNumber = sorted[0].batchNumber;
    cost = sorted[0].purchasePrice;
  }

  return { ...m, batches, stockQuantity: stock, expiryDate: expiry, batchNumber, purchasePrice: cost };
}

/** يضمن وجود التشغيلات (ترحيل البيانات القديمة) وقيماً سليمة للوحدات */
export function normalizeMedicine(m: Medicine): Medicine {
  let next: Medicine = { ...m };
  if (!next.batches || next.batches.length === 0) {
    next.batches = [
      {
        id: `${next.id}-b1`, // معرّف ثابت حتى لا يتغير بين القراءات
        batchNumber: next.batchNumber || 'B-1',
        expiryDate: next.expiryDate || '2099-12-31',
        quantity: Math.max(0, Math.floor(Number(next.stockQuantity) || 0)),
        purchasePrice: Number(next.purchasePrice) || 0,
      },
    ];
  }
  next.unitsPerPack = packSizeOf(next);
  next.looseUnits = Math.max(0, Math.floor(Number(next.looseUnits) || 0));
  return recomputeAggregates(next);
}

export function normalizeMedicines(list: Medicine[]): Medicine[] {
  return list.map(normalizeMedicine);
}

/* ------------------------------------------------------------------ */
/* الإتاحة والصرف                                                      */
/* ------------------------------------------------------------------ */

export function sellablePacks(m: Medicine, today: Date = new Date()): number {
  return (m.batches || [])
    .filter(b => !isExpired(b.expiryDate, today))
    .reduce((s, b) => s + Math.max(0, Math.floor(b.quantity)), 0);
}

/** المتاح للبيع بوحدة معيّنة (عبوات أو وحدات صغرى) */
export function availableQuantity(m: Medicine, unit: 'pack' | 'sub', today: Date = new Date()): number {
  const packs = sellablePacks(m, today);
  if (unit === 'pack') return packs;
  return packs * packSizeOf(m) + Math.max(0, Math.floor(m.looseUnits || 0));
}

export interface SellResult {
  ok: boolean;
  error?: string;
  medicine?: Medicine;
  allocations: BatchAllocation[];
  lineCost: number;
  packsDelta: number; // تغيّر العبوات السليمة (سالب)
  unitsDelta: number; // تغيّر الوحدات السائبة
}

const FAIL = (error: string): SellResult => ({
  ok: false,
  error,
  allocations: [],
  lineCost: 0,
  packsDelta: 0,
  unitsDelta: 0,
});

function fefoOrder(m: Medicine, today: Date): MedicineBatch[] {
  return (m.batches || [])
    .filter(b => b.quantity > 0 && !isExpired(b.expiryDate, today))
    .sort(
      (a, b) =>
        a.expiryDate.localeCompare(b.expiryDate) ||
        (a.receivedAt || '').localeCompare(b.receivedAt || '')
    );
}

/**
 * يصرف كمية من الدواء بنظام FEFO ويعيد الدواء المحدَّث والتخصيصات والتكلفة.
 * لا يعدّل المدخلات.
 */
export function sellFromMedicine(
  med: Medicine,
  quantity: number,
  unit: 'pack' | 'sub' = 'pack',
  today: Date = new Date()
): SellResult {
  const m = normalizeMedicine(med);
  if (!Number.isInteger(quantity) || quantity <= 0) return FAIL(`كمية "${m.tradeName}" غير صالحة.`);
  const u = packSizeOf(m);
  if (unit === 'sub' && u <= 1) return FAIL(`الصنف "${m.tradeName}" لا يُباع بالوحدة الصغرى.`);

  const batches = (m.batches || []).map(b => ({ ...b }));
  const order = fefoOrder({ ...m, batches }, today);
  const allocMap = new Map<string, BatchAllocation>();
  const touch = (b: MedicineBatch): BatchAllocation => {
    let a = allocMap.get(b.id);
    if (!a) {
      a = {
        batchId: b.id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        packs: 0,
        units: 0,
        unitCost: b.purchasePrice,
      };
      allocMap.set(b.id, a);
    }
    return a;
  };

  let lineCost = 0;
  let packsToTake = 0;
  let looseBefore = Math.max(0, Math.floor(m.looseUnits || 0));
  let looseAfter = looseBefore;
  let unitsFromOpened = 0;
  let unitsFromLoose = 0;

  if (unit === 'pack') {
    packsToTake = quantity;
  } else {
    unitsFromLoose = Math.min(looseBefore, quantity);
    const remaining = quantity - unitsFromLoose;
    packsToTake = remaining > 0 ? Math.ceil(remaining / u) : 0;
    unitsFromOpened = remaining;
    looseAfter = looseBefore - unitsFromLoose + packsToTake * u - remaining;
  }

  const totalAvailable = order.reduce((s, b) => s + b.quantity, 0);
  if (packsToTake > totalAvailable) {
    const have = unit === 'pack' ? totalAvailable : totalAvailable * u + looseBefore;
    return FAIL(
      `الكمية المطلوبة من "${m.tradeName}" (${quantity}) أكبر من المتاح للبيع (${have}) بعد استبعاد المنتهي.`
    );
  }

  // الصرف من التشغيلات بالترتيب
  let left = packsToTake;
  let unitsLeftToCost = unitsFromOpened;
  for (const b of order) {
    if (left <= 0) break;
    const take = Math.min(b.quantity, left);
    const target = batches.find(x => x.id === b.id)!;
    target.quantity -= take;
    const a = touch(b);
    a.packs += take;
    if (unit === 'pack') {
      lineCost += take * b.purchasePrice;
    } else {
      const unitsHere = Math.min(take * u, unitsLeftToCost);
      a.units += unitsHere;
      lineCost += unitsHere * (b.purchasePrice / u);
      unitsLeftToCost -= unitsHere;
    }
    left -= take;
  }
  // تكلفة الوحدات السائبة (من عبوة فُتحت سابقاً): بمتوسط تكلفة الصنف
  if (unit === 'sub' && unitsFromLoose > 0) {
    lineCost += unitsFromLoose * (m.purchasePrice / u);
  }

  const updated = recomputeAggregates({ ...m, batches, looseUnits: looseAfter });
  return {
    ok: true,
    medicine: updated,
    allocations: [...allocMap.values()],
    lineCost: round2(lineCost),
    packsDelta: -packsToTake,
    unitsDelta: looseAfter - looseBefore,
  };
}

/* ------------------------------------------------------------------ */
/* الشراء والمرتجعات والتسويات                                         */
/* ------------------------------------------------------------------ */

export interface ReceiveParams {
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  receivedAt?: string;
  supplierId?: string;
}

/** إضافة كمية كتشغيلة (أو دمجها في تشغيلة بنفس الرقم والتاريخ) */
export function receiveBatch(med: Medicine, p: ReceiveParams): Medicine {
  const m = normalizeMedicine(med);
  const qty = Math.max(0, Math.floor(p.quantity));
  const batches = (m.batches || []).map(b => ({ ...b }));
  const existing = batches.find(
    b => b.batchNumber === p.batchNumber && b.expiryDate === p.expiryDate
  );
  if (existing) {
    const totalQty = existing.quantity + qty;
    existing.purchasePrice =
      totalQty > 0
        ? round2((existing.quantity * existing.purchasePrice + qty * p.unitCost) / totalQty)
        : p.unitCost;
    existing.quantity = totalQty;
  } else {
    batches.push({
      id: uid('bat'),
      batchNumber: p.batchNumber || 'B-1',
      expiryDate: p.expiryDate,
      quantity: qty,
      purchasePrice: p.unitCost,
      receivedAt: p.receivedAt || new Date().toISOString().split('T')[0],
      supplierId: p.supplierId,
    });
  }
  return recomputeAggregates({ ...m, batches });
}

/** إنقاص كمية تشغيلة (مرتجع لشركة، إتلاف، تسوية جرد) */
export function removeFromBatch(
  med: Medicine,
  batchId: string,
  packs: number
): { ok: boolean; error?: string; medicine?: Medicine } {
  const m = normalizeMedicine(med);
  const q = Math.floor(packs);
  if (!(q > 0)) return { ok: false, error: 'الكمية غير صالحة.' };
  const batches = (m.batches || []).map(b => ({ ...b }));
  const b = batches.find(x => x.id === batchId);
  if (!b) return { ok: false, error: 'التشغيلة غير موجودة.' };
  if (b.quantity < q) return { ok: false, error: `الكمية المتاحة في التشغيلة ${b.quantity} فقط.` };
  b.quantity -= q;
  return { ok: true, medicine: recomputeAggregates({ ...m, batches }) };
}

/** ضبط كمية تشغيلة على رقم محدد (نتيجة جرد) ويعيد الفرق */
export function setBatchQuantity(
  med: Medicine,
  batchId: string,
  newQty: number
): { medicine: Medicine; delta: number } | null {
  const m = normalizeMedicine(med);
  const batches = (m.batches || []).map(b => ({ ...b }));
  const b = batches.find(x => x.id === batchId);
  if (!b) return null;
  const target = Math.max(0, Math.floor(newQty));
  const delta = target - b.quantity;
  b.quantity = target;
  return { medicine: recomputeAggregates({ ...m, batches }), delta };
}

export function makeMovement(p: {
  med: Pick<Medicine, 'id' | 'tradeName'>;
  type: MovementType;
  packsDelta: number;
  unitsDelta?: number;
  batchNumber?: string;
  reference?: string;
  note?: string;
  actor: string;
  date?: string;
}): StockMovement {
  return {
    id: uid('mov'),
    date: p.date || new Date().toISOString(),
    medicineId: p.med.id,
    medicineName: p.med.tradeName,
    type: p.type,
    packsDelta: p.packsDelta,
    unitsDelta: p.unitsDelta || 0,
    batchNumber: p.batchNumber,
    reference: p.reference,
    note: p.note,
    recordedBy: p.actor,
  };
}

/* ------------------------------------------------------------------ */
/* البحث والبدائل                                                       */
/* ------------------------------------------------------------------ */

/** توحيد النص العربي/الإنجليزي للبحث: يتجاهل التشكيل وأشكال الألف والتاء المربوطة... */
export function normalizeSearch(input: string): string {
  return (input || '')
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // التشكيل والتطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesQuery(m: Medicine, query: string): boolean {
  const q = normalizeSearch(query);
  if (!q) return true;
  const hay = normalizeSearch(
    [m.tradeName, m.genericName, m.barcode, m.manufacturer, m.strength, m.category].filter(Boolean).join(' ')
  );
  return q.split(' ').every(tok => hay.includes(tok));
}

/** بدائل بنفس المادة الفعالة وبمخزون متاح للبيع، الأرخص أولاً */
export function alternativesFor(med: Medicine, all: Medicine[], today: Date = new Date()): Medicine[] {
  const g = normalizeSearch(med.genericName);
  if (!g) return [];
  return all
    .filter(o => o.id !== med.id && normalizeSearch(o.genericName) === g && sellablePacks(o, today) > 0)
    .sort((a, b) => a.sellPrice - b.sellPrice);
}

/* ------------------------------------------------------------------ */
/* الصلاحية والمرتجعات للشركات                                          */
/* ------------------------------------------------------------------ */

export interface ExpiringBatch {
  medicine: Medicine;
  batch: MedicineBatch;
  daysLeft: number; // سالب = منتهية
  value: number; // قيمة التكلفة
}

export function daysUntil(expiry: string, today: Date = new Date()): number {
  const end = new Date(`${expiry.slice(0, 10)}T23:59:59`).getTime();
  return Math.ceil((end - today.getTime()) / MS_DAY);
}

/** التشغيلات ذات الكمية والتي ستنتهي خلال days يوماً (أو انتهت) */
export function expiringBatches(
  meds: Medicine[],
  days: number,
  today: Date = new Date(),
  includeExpired = true
): ExpiringBatch[] {
  const out: ExpiringBatch[] = [];
  for (const raw of meds) {
    const m = normalizeMedicine(raw);
    for (const b of m.batches || []) {
      if (b.quantity <= 0) continue;
      const d = daysUntil(b.expiryDate, today);
      if (d <= days && (includeExpired || d >= 0)) {
        out.push({ medicine: m, batch: b, daysLeft: d, value: round2(b.quantity * b.purchasePrice) });
      }
    }
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function groupByManufacturer(list: ExpiringBatch[]): Record<string, ExpiringBatch[]> {
  const g: Record<string, ExpiringBatch[]> = {};
  for (const x of list) {
    const k = x.medicine.manufacturer?.trim() || 'غير محدد';
    (g[k] = g[k] || []).push(x);
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* النواقص واقتراح الطلب                                                */
/* ------------------------------------------------------------------ */

export interface ReorderSuggestion {
  medicine: Medicine;
  soldInPeriod: number; // بالعبوات
  dailyRate: number;
  stock: number;
  suggestedQty: number;
  estimatedCost: number;
}

/** عبوات مباعة في الفاتورة (مع تحويل الوحدات الصغرى إلى عبوات) */
function packsSoldInItem(item: InvoiceItem, med?: Medicine): number {
  if (item.saleUnit === 'sub') {
    const u = med ? packSizeOf(med) : 1;
    return item.quantity / u;
  }
  return item.quantity;
}

export function reorderSuggestions(
  meds: Medicine[],
  sales: SaleInvoice[],
  opts: { periodDays?: number; coverDays?: number; today?: Date } = {}
): ReorderSuggestion[] {
  const periodDays = opts.periodDays ?? 30;
  const coverDays = opts.coverDays ?? 30;
  const today = opts.today ?? new Date();
  const since = new Date(today.getTime() - periodDays * MS_DAY).toISOString().split('T')[0];
  const medById = new Map(meds.map(m => [m.id, m]));
  const sold = new Map<string, number>();
  for (const s of sales) {
    if ((s.date || '').slice(0, 10) < since) continue;
    for (const it of s.items) {
      sold.set(it.medicineId, (sold.get(it.medicineId) || 0) + packsSoldInItem(it, medById.get(it.medicineId)));
    }
  }
  const out: ReorderSuggestion[] = [];
  for (const raw of meds) {
    const m = normalizeMedicine(raw);
    const soldPacks = sold.get(m.id) || 0;
    const daily = soldPacks / periodDays;
    const stock = sellablePacks(m, today);
    const target = Math.max(Math.ceil(daily * coverDays), m.minQuantity > 0 ? m.minQuantity : 0);
    const needsOrder = stock <= m.minQuantity || stock < Math.ceil(daily * 7);
    const qty = Math.max(0, target - stock);
    if (needsOrder && qty > 0) {
      out.push({
        medicine: m,
        soldInPeriod: round2(soldPacks),
        dailyRate: round2(daily),
        stock,
        suggestedQty: qty,
        estimatedCost: round2(qty * m.purchasePrice),
      });
    }
  }
  return out.sort(
    (a, b) =>
      (a.medicine.manufacturer || '').localeCompare(b.medicine.manufacturer || '', 'ar') ||
      a.medicine.tradeName.localeCompare(b.medicine.tradeName, 'ar')
  );
}

/* ------------------------------------------------------------------ */
/* القيمة والربح                                                        */
/* ------------------------------------------------------------------ */

export function inventoryValue(meds: Medicine[]): { cost: number; retail: number } {
  let cost = 0;
  let retail = 0;
  for (const raw of meds) {
    const m = normalizeMedicine(raw);
    for (const b of m.batches || []) {
      cost += b.quantity * b.purchasePrice;
      retail += b.quantity * m.sellPrice;
    }
  }
  return { cost: round2(cost), retail: round2(retail) };
}

/**
 * تكلفة سطر فاتورة: من اللقطة المسجَّلة وقت البيع إن وُجدت،
 * وإلا (فواتير قديمة) من سعر الشراء الحالي للدواء.
 */
export function lineCostOf(item: InvoiceItem, med?: Medicine): number {
  if (typeof item.lineCost === 'number') return item.lineCost;
  if (!med) return 0;
  if (item.saleUnit === 'sub') return round2((med.purchasePrice / packSizeOf(med)) * item.quantity);
  return round2(med.purchasePrice * item.quantity);
}

/* ------------------------------------------------------------------ */
/* تطبيق فاتورة بيع على المخزون                                         */
/* ------------------------------------------------------------------ */

/**
 * يخصم أصناف الفاتورة من المخزون (FEFO) ويولّد حركات المخزون.
 * يعيد الأدوية المحدَّثة فقط، وأي فشل (لا ينبغي حدوثه بعد التحقق).
 */
export function applySaleToMedicines(
  medicines: Medicine[],
  items: InvoiceItem[],
  ctx: { invoiceNumber: string; actor: string; date?: string; today?: Date }
): { medicines: Medicine[]; movements: StockMovement[]; failures: string[] } {
  const byId = new Map(medicines.map(m => [m.id, m]));
  const movements: StockMovement[] = [];
  const failures: string[] = [];
  for (const it of items) {
    const cur = byId.get(it.medicineId);
    if (!cur) {
      failures.push(`الصنف ${it.medicineName} غير موجود`);
      continue;
    }
    const r = sellFromMedicine(cur, it.quantity, it.saleUnit || 'pack', ctx.today);
    if (!r.ok || !r.medicine) {
      failures.push(r.error || `تعذّر خصم ${it.medicineName}`);
      continue;
    }
    byId.set(cur.id, r.medicine);
    movements.push(
      makeMovement({
        med: cur,
        type: 'sale',
        packsDelta: r.packsDelta,
        unitsDelta: r.unitsDelta,
        batchNumber: r.allocations.map(a => a.batchNumber).join('، '),
        reference: ctx.invoiceNumber,
        note: `بيع ${it.quantity} ${it.saleUnit === 'sub' ? cur.subUnitName || 'وحدة' : 'عبوة'}`,
        actor: ctx.actor,
        date: ctx.date,
      })
    );
  }
  return { medicines: medicines.map(m => byId.get(m.id) || m), movements, failures };
}

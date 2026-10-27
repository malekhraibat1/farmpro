/**
 * تخطيط وتحقق عملية البيع الكاملة (نقطة البيع):
 * يجمع التشغيلات FEFO، تكلفة الأصناف، سياسات الخصم، الوصفات، والدفع.
 */
import {
  Entity,
  InvoiceItem,
  Medicine,
  PrescriptionInfo,
  UserRole,
} from '../types';
import { computeTotals, isExpired, round2, settlePayment, SaleTotals } from './saleService';
import { sellFromMedicine, supportsRetail } from './inventoryService';

export interface PlanSaleParams {
  items: InvoiceItem[];
  medicines: Medicine[];
  discountInput: number;
  taxRate: number;
  paid: number;
  entity?: Entity | null;
  role: UserRole;
  maxDiscountPercent?: number;
  prescription?: PrescriptionInfo;
  today?: Date;
}

export interface SalePlan {
  ok: boolean;
  errors: string[];
  warnings: string[];
  items: InvoiceItem[];
  totals: SaleTotals;
  totalCost: number;
  payment: ReturnType<typeof settlePayment>;
  needsPrescription: boolean;
}

export function requiresPrescription(items: InvoiceItem[], medicines: Medicine[]): boolean {
  return items.some(it => {
    const m = medicines.find(x => x.id === it.medicineId);
    return !!m && (m.requiresPrescription || m.isControlled);
  });
}

export function planSale(p: PlanSaleParams): SalePlan {
  const errors: string[] = [];
  const warnings: string[] = [];
  const today = p.today || new Date();
  const privileged = p.role === 'admin' || p.role === 'super_admin';

  if (!p.items.length) errors.push('السلة فارغة.');

  // نخصم على نسخة عمل حتى لو تكرر الصنف في أكثر من سطر
  const work = new Map(p.medicines.map(m => [m.id, m]));
  const outItems: InvoiceItem[] = [];
  let totalCost = 0;

  for (const it of p.items) {
    const med = work.get(it.medicineId);
    if (!med) {
      errors.push(`الصنف "${it.medicineName}" غير موجود في المخزون.`);
      continue;
    }
    const unit = it.saleUnit === 'sub' ? 'sub' : 'pack';
    if (unit === 'sub' && !supportsRetail(med)) {
      errors.push(`الصنف "${med.tradeName}" لا يُباع بالوحدة الصغرى.`);
      continue;
    }
    if (!(it.unitPrice >= 0)) {
      errors.push(`سعر "${med.tradeName}" غير صالح.`);
      continue;
    }
    if (unit === 'pack' && med.minSellPrice && it.unitPrice < med.minSellPrice) {
      errors.push(`سعر "${med.tradeName}" أقل من الحد الأدنى المسموح (${med.minSellPrice}).`);
    }
    const r = sellFromMedicine(med, it.quantity, unit, today);
    if (!r.ok || !r.medicine) {
      errors.push(r.error || `تعذّر صرف "${med.tradeName}".`);
      continue;
    }
    work.set(med.id, r.medicine);
    totalCost += r.lineCost;
    outItems.push({
      ...it,
      saleUnit: unit,
      subtotal: round2(it.quantity * it.unitPrice),
      lineCost: r.lineCost,
      allocations: r.allocations,
    });
  }

  const totals = computeTotals(outItems, p.discountInput, p.taxRate);
  totalCost = round2(totalCost);

  if (p.discountInput < 0) errors.push('الخصم لا يمكن أن يكون سالباً.');
  if (p.discountInput > totals.subtotal + 0.0001) errors.push('الخصم أكبر من مجموع الفاتورة.');

  if (!privileged && p.maxDiscountPercent !== undefined && totals.subtotal > 0) {
    const pct = (totals.discount / totals.subtotal) * 100;
    if (pct > p.maxDiscountPercent + 0.0001) {
      errors.push(`الخصم (${round2(pct)}%) يتجاوز الحد المسموح لك (${p.maxDiscountPercent}%). اطلب موافقة المدير.`);
    }
  }

  const netBeforeTax = round2(totals.subtotal - totals.discount);
  if (totalCost > 0 && netBeforeTax < totalCost) {
    const msg = `سعر البيع بعد الخصم (${netBeforeTax}) أقل من تكلفة الأصناف (${totalCost}): بيع بخسارة.`;
    if (privileged) warnings.push(msg);
    else errors.push(msg);
  }

  const needsPrescription = requiresPrescription(p.items, p.medicines);
  if (needsPrescription) {
    const rx = p.prescription;
    if (!rx || !rx.patientName?.trim() || !rx.doctorName?.trim()) {
      errors.push('يحتوي البيع على دواء بوصفة/خاضع للرقابة: أدخل اسم المريض واسم الطبيب.');
    }
    const controlled = p.items.some(it => p.medicines.find(m => m.id === it.medicineId)?.isControlled);
    if (controlled && !rx?.prescriptionNumber?.trim()) {
      errors.push('الدواء الخاضع للرقابة يتطلب رقم الوصفة.');
    }
  }

  const payment = settlePayment(totals.finalAmount, p.paid);
  if (!(p.paid >= 0)) errors.push('المبلغ المدفوع غير صالح.');
  if (payment.remainingAmount > 0) {
    if (!p.entity) {
      errors.push('يوجد مبلغ متبقٍ (دين): اختر صيدلية أو عميلاً محدداً لتسجيله على حسابه، أو ادفع المبلغ كاملاً.');
    } else if (
      p.entity.creditLimit > 0 &&
      round2(p.entity.currentBalance + payment.remainingAmount) > p.entity.creditLimit
    ) {
      errors.push(`البيع الآجل يتجاوز الحد الائتماني لـ "${p.entity.name}" (${p.entity.creditLimit}).`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, items: outItems, totals, totalCost, payment, needsPrescription };
}

/** هل الدواء قابل للبيع الآن (للتلوين في الواجهة) */
export function medicineState(m: Medicine, today: Date = new Date()): 'ok' | 'expired' | 'out' {
  const hasAny = (m.batches && m.batches.length ? m.batches.some(b => b.quantity > 0) : m.stockQuantity > 0);
  if (!hasAny) return 'out';
  const anySellable = m.batches && m.batches.length
    ? m.batches.some(b => b.quantity > 0 && !isExpired(b.expiryDate, today))
    : !isExpired(m.expiryDate, today);
  return anySellable ? 'ok' : 'expired';
}

/** فحص سريع لتوفر المخزون لسلة كاملة (يراعي تكرار الصنف في أكثر من سطر وبالوحدتين) */
export function checkStock(items: InvoiceItem[], medicines: Medicine[], today: Date = new Date()): string | null {
  const work = new Map(medicines.map(m => [m.id, m]));
  for (const it of items) {
    const med = work.get(it.medicineId);
    if (!med) return `الصنف "${it.medicineName}" غير موجود في المخزون.`;
    const r = sellFromMedicine(med, it.quantity, it.saleUnit === 'sub' ? 'sub' : 'pack', today);
    if (!r.ok || !r.medicine) return r.error || 'تعذّر صرف الصنف.';
    work.set(med.id, r.medicine);
  }
  return null;
}

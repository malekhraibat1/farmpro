/**
 * منطق البيع الأساسي (دوال نقية قابلة للاختبار)
 * - تقريب مالي دقيق لخانتين عشريتين
 * - حساب الإجماليات والضريبة والخصم
 * - التحقق من صحة عملية البيع قبل حفظها
 * - ترقيم فواتير تسلسلي
 */
import { Entity, InvoiceItem, Medicine, SaleInvoice } from '../types';

/** تقريب إلى خانتين عشريتين بدون أخطاء الفاصلة العائمة (1.005 -> 1.01) */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(n) + Number.EPSILON) * 100)) / 100;
}

export interface SaleTotals {
  subtotal: number;
  discount: number;
  tax: number;
  finalAmount: number;
}

/**
 * subtotal: مجموع الأصناف
 * discount: يُقيَّد بين 0 وقيمة المجموع الفرعي
 * tax: تُحسب بعد الخصم
 */
export function computeTotals(
  items: Pick<InvoiceItem, 'quantity' | 'unitPrice'>[],
  discountInput: number,
  taxRate: number
): SaleTotals {
  const subtotal = round2(items.reduce((s, i) => s + round2(i.quantity * i.unitPrice), 0));
  const discount = Math.min(subtotal, Math.max(0, round2(discountInput || 0)));
  const taxable = round2(subtotal - discount);
  const tax = round2((taxable * (taxRate || 0)) / 100);
  const finalAmount = round2(taxable + tax);
  return { subtotal, discount, tax, finalAmount };
}

/** هل انتهت صلاحية الدواء في تاريخ معيّن؟ (يُعتبر صالحاً حتى نهاية يوم الانتهاء) */
export function isExpired(expiryDate: string | undefined, today: Date = new Date()): boolean {
  if (!expiryDate) return false;
  const exp = new Date(`${expiryDate.slice(0, 10)}T23:59:59`);
  if (isNaN(exp.getTime())) return false;
  return exp < today;
}

/** أقصى كمية يمكن بيعها من دواء في هذه اللحظة */
export function sellableQuantity(med: Medicine, today: Date = new Date()): number {
  if (isExpired(med.expiryDate, today)) return 0;
  return Math.max(0, Math.floor(med.stockQuantity || 0));
}

export interface ValidateSaleParams {
  items: InvoiceItem[];
  medicines: Medicine[];
  totals: SaleTotals;
  discountInput: number;
  paid: number;
  entity?: Entity | null;
  today?: Date;
}

/** يعيد قائمة بالأخطاء (فارغة = العملية سليمة) */
export function validateSale(p: ValidateSaleParams): string[] {
  const errors: string[] = [];
  const today = p.today || new Date();

  if (!p.items.length) errors.push('السلة فارغة.');

  for (const item of p.items) {
    const med = p.medicines.find(m => m.id === item.medicineId);
    if (!med) {
      errors.push(`الصنف "${item.medicineName}" غير موجود في المخزون.`);
      continue;
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`كمية "${med.tradeName}" غير صالحة.`);
      continue;
    }
    if (isExpired(med.expiryDate, today)) {
      errors.push(`الصنف "${med.tradeName}" منتهي الصلاحية (${med.expiryDate}) ولا يمكن بيعه.`);
      continue;
    }
    if (item.quantity > Math.max(0, med.stockQuantity)) {
      errors.push(
        `الكمية المطلوبة من "${med.tradeName}" (${item.quantity}) أكبر من المتوفر (${Math.max(0, med.stockQuantity)}).`
      );
    }
    if (!(item.unitPrice >= 0)) errors.push(`سعر "${med.tradeName}" غير صالح.`);
  }

  if (p.discountInput < 0) errors.push('الخصم لا يمكن أن يكون سالباً.');
  if (p.discountInput > p.totals.subtotal + 0.0001) {
    errors.push('الخصم أكبر من مجموع الفاتورة.');
  }
  if (!(p.paid >= 0)) errors.push('المبلغ المدفوع غير صالح.');

  const applied = Math.min(Math.max(0, p.paid), p.totals.finalAmount);
  const remaining = round2(p.totals.finalAmount - applied);

  if (remaining > 0) {
    if (!p.entity) {
      errors.push('يوجد مبلغ متبقٍ (دين): اختر صيدلية أو عميلاً محدداً لتسجيله على حسابه، أو ادفع المبلغ كاملاً.');
    } else if (p.entity.creditLimit > 0 && round2(p.entity.currentBalance + remaining) > p.entity.creditLimit) {
      errors.push(
        `البيع الآجل يتجاوز الحد الائتماني لـ "${p.entity.name}" (${p.entity.creditLimit}).`
      );
    }
  }

  return errors;
}

/** المبلغ المطبَّق على الفاتورة، والمتبقي، والباقي المُرجَع للزبون */
export function settlePayment(finalAmount: number, paid: number) {
  const safePaid = Math.max(0, round2(paid || 0));
  const applied = Math.min(safePaid, finalAmount);
  return {
    paidAmount: round2(applied),
    remainingAmount: round2(finalAmount - applied),
    change: round2(Math.max(0, safePaid - finalAmount)),
  };
}

/** رقم الفاتورة التالي: INV-000001، يستمر بعد أعلى رقم موجود */
export function nextInvoiceNumber(sales: Pick<SaleInvoice, 'invoiceNumber'>[]): string {
  let max = 0;
  for (const s of sales) {
    const m = /^INV-(\d+)$/.exec(s.invoiceNumber || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `INV-${String(max + 1).padStart(6, '0')}`;
}

/** معرّف فريد لا يتكرر حتى لو أُنشئ أكثر من سجل في نفس الميلي ثانية */
export function uid(prefix: string): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}-${Date.now().toString(36)}-${rnd}`;
}

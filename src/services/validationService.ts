/**
 * ========================================================
 * FarmPro Input Validation & Sanitization Service (Zod)
 * تصميم وتطوير المهندس مالك حريبات | 0594345464
 *
 * التحقق الصارم من صحة المدخلات ومنع القيم السالبة والفراغات والبيانات غير الصالحة
 * ========================================================
 */
import { z } from 'zod';

/**
 * 1. مخطط التحقق من الأدوية (Medicines)
 * يمنع الأسعار والكميات السالبة أو الفراغات
 */
export const MedicineSchema = z.object({
  id: z.string().optional(),
  barcode: z.string().min(1, 'الباركود مطلوب').trim(),
  tradeName: z.string().min(2, 'الاسم التجاري للدواء يجب أن يكون حرفين على الأقل').trim(),
  genericName: z.string().default('').transform(s => s.trim()),
  category: z.string().default('أدوية عامة').transform(s => s.trim()),
  unit: z.string().default('علبة').transform(s => s.trim()),
  stockQuantity: z.number().int('الكمية يجب أن تكون عدداً صحيحاً').min(0, 'كمية المخزون لا يمكن أن تكون سالبة'),
  minQuantity: z.number().int().min(0, 'الحد الأدنى لا يمكن أن يكون سالباً').default(5),
  purchasePrice: z.number().min(0, 'سعر التكلفة لا يمكن أن يكون سالباً'),
  sellPrice: z.number().min(0, 'سعر البيع لا يمكن أن يكون سالباً'),
  batchNumber: z.string().default('').transform(s => s.trim()),
  expiryDate: z.string().min(1, 'تاريخ انتهاء الصلاحية مطلوب').regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ غير صالحة (YYYY-MM-DD)'),
  manufacturer: z.string().default('').transform(s => s.trim()),
}).refine(data => data.sellPrice >= 0, {
  message: 'سعر البيع يجب أن يكون موجباً',
  path: ['sellPrice'],
});

/**
 * 2. مخطط التحقق من الكيانات والحسابات (Entities)
 */
export const EntitySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'اسم الحساب أو الشركة يجب أن يكون حرفين على الأقل').trim(),
  type: z.enum(['pharmacy', 'company', 'customer', 'supplier'], {
    message: 'نوع الكيان غير صالح',
  }),
  phone: z.string().default('').transform(s => s.trim()),
  address: z.string().default('').transform(s => s.trim()),
  email: z.string().email('البريد الإلكتروني غير صالح').optional().or(z.literal('')),
  currentBalance: z.number().default(0),
  creditLimit: z.number().min(0, 'سقف الرصيد لا يمكن أن يكون سالباً').default(5000),
  notes: z.string().default('').transform(s => s.trim()),
  createdAt: z.string().optional(),
});

/**
 * 3. مخطط التحقق من المصروفات وسندات الصرف (Expenses)
 */
export const ExpenseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, 'عنوان المصروف مطلوب').trim(),
  category: z.enum(['rent', 'electricity', 'salaries', 'supplies', 'cleaning', 'maintenance', 'other']),
  amount: z.number().positive('مبلغ المصروف يجب أن يكون أكبر من صفر'),
  date: z.string().min(1, 'التاريخ مطلوب'),
  notes: z.string().default('').transform(s => s.trim()),
  recordedBy: z.string().default('المسؤول').transform(s => s.trim()),
});

/**
 * 4. مخطط التحقق من الحركات المالية (Transactions)
 */
export const TransactionSchema = z.object({
  id: z.string().optional(),
  entityId: z.string().min(1, 'الحساب المالي مطلوب'),
  entityName: z.string().min(1, 'اسم الحساب مطلوب'),
  date: z.string().min(1, 'التاريخ مطلوب'),
  amount: z.number().positive('مبلغ الحركة يجب أن يكون أكبر من صفر'),
  type: z.enum(['invoice', 'purchase', 'payment_in', 'payment_out', 'return']),
  direction: z.enum(['debit', 'credit']),
  balanceAfter: z.number(),
  referenceNumber: z.string().default('').transform(s => s.trim()),
  note: z.string().default('').transform(s => s.trim()),
  recordedBy: z.string().default('المسؤول').transform(s => s.trim()),
});

/**
 * 5. مخطط التحقق من مبيعات الكاشير (SaleInvoice)
 */
export const SaleItemSchema = z.object({
  medicineId: z.string().min(1),
  medicineName: z.string().min(1),
  quantity: z.number().int().positive('الكمية يجب أن تكون 1 على الأقل'),
  unitPrice: z.number().min(0, 'سعر الوحدة غير صالح'),
  subtotal: z.number().min(0),
});

export const SaleInvoiceSchema = z.object({
  id: z.string().optional(),
  invoiceNumber: z.string().min(1),
  date: z.string().min(1),
  entityId: z.string().optional(),
  entityName: z.string().default('زبون نقدي'),
  items: z.array(SaleItemSchema).min(1, 'يجب إضافة صنف واحد على الأقل في الفاتورة'),
  totalAmount: z.number().min(0),
  discount: z.number().min(0, 'الخصم لا يمكن أن يكون سالباً').default(0),
  tax: z.number().min(0).default(0),
  finalAmount: z.number().min(0),
  paidAmount: z.number().min(0, 'المبلغ المدفوع لا يمكن أن يكون سالباً'),
  remainingAmount: z.number().min(0),
  paymentMethod: z.enum(['cash', 'credit', 'card']),
  paymentStatus: z.enum(['paid', 'partial', 'unpaid']),
  cashierName: z.string().default('الكاشير'),
  notes: z.string().default(''),
});

/**
 * 6. مخطط التحقق من قوة كلمة المرور والـ PIN
 * يمنع الرموز الضعيفة والافتراضية تماماً
 */
const FORBIDDEN_PINS = ['1234', '0000', '1111', '7777', '9999', '12345', '123456', '8888'];

export const SetupSecuritySchema = z.object({
  pharmacyName: z.string().min(2, 'اسم الصيدلية مطلوب ويجب أن يكون حرفين على الأقل').trim(),
  ownerName: z.string().min(2, 'اسم الصيدلي أو المدير مطلوب').trim(),
  adminUsername: z.string()
    .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
    .regex(/^[a-zA-Z0-9_]+$/, 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط دون مسافات')
    .trim(),
  adminPassword: z.string()
    .min(6, 'كلمة المرور يجب أن تتكون من 6 خانات على الأقل')
    .refine(val => !['123456', 'password', 'admin123'].includes(val.toLowerCase()), {
      message: 'كلمة المرور هذه شائعة جداً وضعيفة، يرجى اختيار كلمة مرور أكثر أماناً',
    }),
  confirmPassword: z.string(),
  pincode: z.string()
    .min(4, 'رمز PIN يجب أن يتكون من 4 إلى 8 أرقام')
    .max(8, 'رمز PIN لا يتجاوز 8 أرقام')
    .regex(/^\d+$/, 'رمز PIN يجب أن يحتوي على أرقام فقط')
    .refine(pin => !FORBIDDEN_PINS.includes(pin), {
      message: 'رمز PIN هذا ضعيف أو افتراضي شائع، يرجى اختيار رمز غير متوقع',
    }),
  confirmPincode: z.string(),
}).refine(data => data.adminPassword === data.confirmPassword, {
  message: 'كلمة المرور وتأكيدها غير متطابقين',
  path: ['confirmPassword'],
}).refine(data => data.pincode === data.confirmPincode, {
  message: 'رمز PIN وتأكيده غير متطابقين',
  path: ['confirmPincode'],
});

export class ValidationService {
  static validateMedicine(input: unknown) {
    return MedicineSchema.safeParse(input);
  }

  static validateEntity(input: unknown) {
    return EntitySchema.safeParse(input);
  }

  static validateExpense(input: unknown) {
    return ExpenseSchema.safeParse(input);
  }

  static validateTransaction(input: unknown) {
    return TransactionSchema.safeParse(input);
  }

  static validateSale(input: unknown) {
    return SaleInvoiceSchema.safeParse(input);
  }

  static validateSetupSecurity(input: unknown) {
    return SetupSecuritySchema.safeParse(input);
  }
}

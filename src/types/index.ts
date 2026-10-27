export type EntityType = 'pharmacy' | 'company' | 'customer' | 'supplier';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  phone: string;
  email?: string;
  address?: string;
  currentBalance: number; // positive = owes us (debit / مدين لنا), negative = we owe them (credit / دائن علينا)
  creditLimit: number;
  notes?: string;
  createdAt: string;
}

/** تشغيلة (دفعة) من دواء: كمية بتاريخ انتهاء وتكلفة خاصة بها */
export interface MedicineBatch {
  id: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number; // بعدد العبوات السليمة (غير المفتوحة)
  purchasePrice: number; // تكلفة العبوة الواحدة لهذه التشغيلة
  receivedAt?: string; // YYYY-MM-DD
  supplierId?: string;
}

export interface Medicine {
  id: string;
  barcode: string;
  tradeName: string;
  genericName: string;
  category: string;
  unit: string;
  /**
   * حقول مجمَّعة تُحسب تلقائياً من التشغيلات (recomputeAggregates):
   * stockQuantity = مجموع العبوات السليمة، expiryDate = أقرب انتهاء لتشغيلة فيها كمية،
   * batchNumber = رقم تلك التشغيلة، purchasePrice = متوسط التكلفة المرجّح.
   */
  stockQuantity: number;
  minQuantity: number;
  purchasePrice: number;
  sellPrice: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  manufacturer: string;
  /** التشغيلات. إن غابت (بيانات قديمة) تُنشأ تلقائياً من الحقول أعلاه. */
  batches?: MedicineBatch[];
  dosageForm?: string; // أقراص، شراب، حقن، كريم...
  strength?: string; // 500mg
  requiresPrescription?: boolean;
  isControlled?: boolean; // دواء خاضع للرقابة
  /** وحدات البيع: عدد الوحدات الصغرى في العبوة (مثلاً 3 أشرطة أو 30 حبة). 1 = لا بيع بالتجزئة */
  unitsPerPack?: number;
  subUnitName?: string; // شريط / حبة / أمبولة
  subUnitPrice?: number; // سعر الوحدة الصغرى (إن غاب يُحسب sellPrice ÷ unitsPerPack)
  /** وحدات صغرى متبقية من عبوة مفتوحة */
  looseUnits?: number;
  /** حد أدنى لسعر البيع (اختياري) */
  minSellPrice?: number;
}

/** كيف جاء الصرف من التشغيلات (FEFO) */
export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  packs: number; // عبوات سليمة مصروفة من هذه التشغيلة
  units: number; // وحدات صغرى مصروفة (من عبوات فُتحت أو متبقّية)
  unitCost: number; // تكلفة العبوة الواحدة
}

export interface InvoiceItem {
  medicineId: string;
  medicineName: string;
  quantity: number; // بعدد الوحدات المحددة في saleUnit
  unitPrice: number;
  subtotal: number;
  /** 'pack' (افتراضي) أو 'sub' (وحدة صغرى: شريط/حبة) */
  saleUnit?: 'pack' | 'sub';
  /** تكلفة الصنف وقت البيع (لحساب أرباح دقيقة لا تتغير بتغيّر سعر الشراء لاحقاً) */
  lineCost?: number;
  allocations?: BatchAllocation[];
  /** طريقة الاستعمال (تُطبع على ملصق الصرف) */
  directions?: string;
}

/** بيانات الوصفة لأدوية الوصفة/الخاضعة للرقابة */
export interface PrescriptionInfo {
  patientName: string;
  doctorName: string;
  prescriptionNumber?: string;
  patientId?: string;
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type PaymentMethod = 'cash' | 'credit' | 'card';

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  entityId?: string; // if sold on credit or to specific pharmacy/customer
  entityName?: string;
  items: InvoiceItem[];
  totalAmount: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashierName: string;
  notes?: string;
  prescription?: PrescriptionInfo;
  shiftId?: string;
  /** المبلغ المُرجَع للزبون (الباقي) */
  changeGiven?: number;
}

export type TransactionType = 'invoice' | 'purchase' | 'payment_in' | 'payment_out' | 'return';
export type TransactionDirection = 'debit' | 'credit';

export interface FinancialTransaction {
  id: string;
  entityId: string;
  entityName: string;
  date: string;
  amount: number;
  type: TransactionType;
  direction: TransactionDirection; // 'debit' increases debt to us, 'credit' decreases or represents payment
  balanceAfter: number;
  referenceNumber: string;
  note: string;
  recordedBy: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'rent' | 'electricity' | 'salaries' | 'supplies' | 'cleaning' | 'maintenance' | 'other';
  amount: number;
  date: string;
  notes?: string;
  recordedBy: string;
}

export type UserRole = 'admin' | 'pharmacist' | 'accountant' | 'super_admin';

export type LicensePlan = 'trial' | 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'lifetime';

export interface LicenseInfo {
  isActivated: boolean;
  licenseKey: string;
  planType: LicensePlan;
  startDate: string;
  expiryDate: string; // YYYY-MM-DD or 'lifetime'
  pharmacyName: string;
  clientName: string;
  clientPhone: string;
  notes?: string;
  activatedBy: string;
}

export interface AppSettings {
  pharmacyName: string;
  ownerName: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number;
  pincode?: string;
  superAdminPin?: string;
  pincodeHash?: string;
  pincodeSalt?: string;
  adminUsername?: string;
  adminPasswordHash?: string;
  adminPasswordSalt?: string;
  superAdminPinHash?: string;
  superAdminPinSalt?: string;
  isPinRequired: boolean;
  isSetupCompleted?: boolean;
  sessionTimeoutMinutes?: number;
  designerName: string;
  designerPhone: string;
  designerEmail: string;
  license: LicenseInfo;
  /** رقم ترخيص الصيدلية ورقمها الضريبي (يظهران على الإيصال) */
  pharmacyLicenseNumber?: string;
  taxNumber?: string;
  /** أقصى خصم (٪) يستطيعه الصيدلي/الكاشير. المدير بلا حد. */
  maxDiscountPercent?: number;
  /** عدد الأيام لاعتبار الدواء «قريب الانتهاء» */
  nearExpiryDays?: number;
  /** سطر ختامي يظهر أسفل الإيصال */
  receiptFooter?: string;
}

/** فاتورة شراء من شركة/مورّد: تُدخل المخزون كتشغيلات وتسجّل الدين */
export interface PurchaseLine {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number; // عبوات مشتراة
  bonusQuantity: number; // عبوات مجانية (بونص)
  unitCost: number; // سعر العبوة قبل الخصم
  lineTotal: number;
}

export interface PurchaseInvoice {
  id: string;
  number: string; // PUR-000001
  supplierId: string;
  supplierName: string;
  supplierInvoiceNumber?: string;
  date: string; // YYYY-MM-DD
  dueDate?: string;
  lines: PurchaseLine[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  recordedBy: string;
  notes?: string;
}

export type MovementType =
  | 'sale'
  | 'purchase'
  | 'bonus'
  | 'supplier_return'
  | 'adjustment'
  | 'stocktake'
  | 'write_off'
  | 'initial';

/** سجل حركة المخزون: كل تغيير في الكمية يُسجَّل هنا للتدقيق */
export interface StockMovement {
  id: string;
  date: string; // ISO
  medicineId: string;
  medicineName: string;
  type: MovementType;
  /** تغيّر العبوات (سالب = خروج) */
  packsDelta: number;
  /** تغيّر الوحدات الصغرى السائبة */
  unitsDelta?: number;
  batchNumber?: string;
  reference?: string; // رقم فاتورة بيع/شراء...
  note?: string;
  recordedBy: string;
}

export interface Shift {
  id: string;
  cashierName: string;
  openedAt: string; // ISO
  openingCash: number;
  closedAt?: string;
  countedCash?: number;
  expectedCash?: number;
  difference?: number;
  notes?: string;
}

export interface AuditEntry {
  id: string;
  date: string;
  actor: string;
  action: string;
  detail: string;
}


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

export interface Medicine {
  id: string;
  barcode: string;
  tradeName: string;
  genericName: string;
  category: string;
  unit: string;
  stockQuantity: number;
  minQuantity: number;
  purchasePrice: number;
  sellPrice: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  manufacturer: string;
}

export interface InvoiceItem {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
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
  pincode: string;
  superAdminPin: string;
  isPinRequired: boolean;
  designerName: string;
  designerPhone: string;
  designerEmail: string;
  license: LicenseInfo;
}


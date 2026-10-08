import {
  Entity,
  Medicine,
  SaleInvoice,
  FinancialTransaction,
  Expense,
  AppSettings,
  LicenseInfo,
} from '../types';

const STORAGE_KEYS = {
  ENTITIES: 'pharma_entities_v1',
  MEDICINES: 'pharma_medicines_v1',
  SALES: 'pharma_sales_v1',
  TRANSACTIONS: 'pharma_transactions_v1',
  EXPENSES: 'pharma_expenses_v1',
  SETTINGS: 'pharma_settings_v1',
  CURRENT_ROLE: 'pharma_current_role_v1',
};

export const defaultLicense: LicenseInfo = {
  isActivated: true,
  licenseKey: 'PHARMA-PRO-MALIK-2026-9981',
  planType: 'annual',
  startDate: '2026-10-01',
  expiryDate: '2027-10-01',
  pharmacyName: 'صيدلية النور النموذجية',
  clientName: 'د. مالك حريبات',
  clientPhone: '0594345464',
  notes: 'نسخة مرخصة ومعتمدة للصيدلية بواسطة المهندس مالك حريبات',
  activatedBy: 'المهندس مالك حريبات',
};

export const defaultSettings: AppSettings = {
  pharmacyName: 'صيدلية النور النموذجية',
  ownerName: 'د. مالك حريبات',
  phone: '0594345464',
  address: 'الشارع الرئيسي - وسط المدينة',
  currency: '₪',
  taxRate: 0,
  pincode: '1234',
  superAdminPin: '7777', // Master Super Admin PIN (also accepts 9999)
  isPinRequired: false,
  designerName: 'المهندس مالك حريبات',
  designerPhone: '0594345464',
  designerEmail: 'hraibat.malek@gmail.com',
  license: defaultLicense,
};

const initialEntities: Entity[] = [
  {
    id: 'ent-1',
    name: 'صيدلية الأمل المركزية',
    type: 'pharmacy',
    phone: '0599112233',
    address: 'دورا - الشارع العام',
    currentBalance: 1450.0, // owes us
    creditLimit: 5000.0,
    notes: 'تعامل دوري - طلبات تبادل أدوية شهرية',
    createdAt: '2026-08-10',
  },
  {
    id: 'ent-2',
    name: 'صيدلية الشفاء الحديثة',
    type: 'pharmacy',
    phone: '0598774411',
    address: 'الخليل - عين سارة',
    currentBalance: 820.0, // owes us
    creditLimit: 3000.0,
    notes: 'صيدلية زميلة لتوفير النواقص',
    createdAt: '2026-08-15',
  },
  {
    id: 'ent-3',
    name: 'شركة بيرزيت للصناعات الدوائية',
    type: 'company',
    phone: '022987654',
    address: 'رام الله - المنطقة الصناعية',
    currentBalance: -4300.0, // we owe them
    creditLimit: 15000.0,
    notes: 'مورد رئيسي للأدوية العامة والمضادات',
    createdAt: '2026-07-01',
  },
  {
    id: 'ent-4',
    name: 'مستودع أدوية القدس المركزي',
    type: 'supplier',
    phone: '0592334455',
    address: 'بيت لحم - شارع المهد',
    currentBalance: -2150.0, // we owe them
    creditLimit: 10000.0,
    notes: 'توريد أدوية مستوردة وحليب أطفال ومستلزمات',
    createdAt: '2026-07-20',
  },
  {
    id: 'ent-5',
    name: 'شركة دار الشفاء لصناعة الأدوية',
    type: 'company',
    phone: '0595667788',
    address: 'نابلس - رفيديا',
    currentBalance: -1200.0, // we owe them
    creditLimit: 8000.0,
    notes: 'وكيل أدوية الضغط والسكري',
    createdAt: '2026-08-01',
  },
  {
    id: 'ent-6',
    name: 'أحمد محمود العواودة (زبون دائم)',
    type: 'customer',
    phone: '0599332211',
    address: 'دورا - حي الصرفة',
    currentBalance: 320.0, // owes us
    creditLimit: 1000.0,
    notes: 'حساب علاج شهري للوالد (أدوية مزمنة)',
    createdAt: '2026-09-01',
  },
  {
    id: 'ent-7',
    name: 'د. سامي عمرو (عيادة الأطفال)',
    type: 'customer',
    phone: '0597114422',
    address: 'مجمع الأطباء التخصصي',
    currentBalance: 650.0, // owes us
    creditLimit: 2500.0,
    notes: 'مستلزمات طبية ولقاحات للعيادة',
    createdAt: '2026-08-28',
  },
];

const initialMedicines: Medicine[] = [
  {
    id: 'med-1',
    barcode: '625100100201',
    tradeName: 'أوجمنتين 1 غرام (Augmentin 1g)',
    genericName: 'Amoxicillin + Clavulanic acid',
    category: 'مضاد حيوي',
    unit: 'علبة (14 قرص)',
    stockQuantity: 42,
    minQuantity: 10,
    purchasePrice: 28.0,
    sellPrice: 38.0,
    batchNumber: 'AUG-2026-08',
    expiryDate: '2027-11-30',
    manufacturer: 'GSK',
  },
  {
    id: 'med-2',
    barcode: '625100100202',
    tradeName: 'بانادول اكسترا (Panadol Extra)',
    genericName: 'Paracetamol + Caffeine',
    category: 'مسكنات وخافض حرارة',
    unit: 'علبة (24 قرص)',
    stockQuantity: 85,
    minQuantity: 20,
    purchasePrice: 9.5,
    sellPrice: 14.0,
    batchNumber: 'PAN-9941',
    expiryDate: '2028-04-15',
    manufacturer: 'Haleon',
  },
  {
    id: 'med-3',
    barcode: '625100100203',
    tradeName: 'بروفين 400 ملغ (Brufen 400mg)',
    genericName: 'Ibuprofen',
    category: 'مضاد التهاب ومسكن',
    unit: 'علبة (30 قرص)',
    stockQuantity: 18,
    minQuantity: 15,
    purchasePrice: 12.0,
    sellPrice: 18.0,
    batchNumber: 'BRF-2024-C',
    expiryDate: '2026-11-20', // near expiry!
    manufacturer: 'Abbott',
  },
  {
    id: 'med-4',
    barcode: '625100100204',
    tradeName: 'أوميبرازول 20 ملغ (Omeprazole)',
    genericName: 'Omeprazole',
    category: 'أدوية المعدة والحموضة',
    unit: 'علبة (28 كبسولة)',
    stockQuantity: 34,
    minQuantity: 8,
    purchasePrice: 15.0,
    sellPrice: 24.0,
    batchNumber: 'OME-552',
    expiryDate: '2027-08-31',
    manufacturer: 'دار الشفاء',
  },
  {
    id: 'med-5',
    barcode: '625100100205',
    tradeName: 'كونكور 5 ملغ (Concor 5mg)',
    genericName: 'Bisoprolol Fumarate',
    category: 'أمراض القلب والضغط',
    unit: 'علبة (30 قرص)',
    stockQuantity: 29,
    minQuantity: 10,
    purchasePrice: 22.0,
    sellPrice: 31.0,
    batchNumber: 'CNC-881',
    expiryDate: '2027-06-15',
    manufacturer: 'Merck',
  },
  {
    id: 'med-6',
    barcode: '625100100206',
    tradeName: 'فنتولين بخاخ (Ventolin Inhaler)',
    genericName: 'Salbutamol',
    category: 'الجهاز التنفسي والربو',
    unit: 'عبوة بخاخ',
    stockQuantity: 6, // low stock!
    minQuantity: 12,
    purchasePrice: 18.0,
    sellPrice: 26.0,
    batchNumber: 'VEN-302',
    expiryDate: '2027-03-10',
    manufacturer: 'GSK',
  },
  {
    id: 'med-7',
    barcode: '625100100207',
    tradeName: 'فيتامين د3 (Vitamin D3 50,000 IU)',
    genericName: 'Cholecalciferol',
    category: 'فيتامينات ومكملات',
    unit: 'علبة (12 كبسولة)',
    stockQuantity: 50,
    minQuantity: 15,
    purchasePrice: 25.0,
    sellPrice: 38.0,
    batchNumber: 'VTD-104',
    expiryDate: '2028-01-20',
    manufacturer: 'بيرزيت',
  },
  {
    id: 'med-8',
    barcode: '625100100208',
    tradeName: 'كتافلام 50 ملغ (Cataflam 50mg)',
    genericName: 'Diclofenac Potassium',
    category: 'مسكن ومضاد التهاب',
    unit: 'علبة (20 قرص)',
    stockQuantity: 4, // low stock!
    minQuantity: 10,
    purchasePrice: 16.0,
    sellPrice: 23.5,
    batchNumber: 'CAT-922',
    expiryDate: '2026-12-15', // near expiry!
    manufacturer: 'Novartis',
  },
  {
    id: 'med-9',
    barcode: '625100100209',
    tradeName: 'سيتريزين 10 ملغ (Cetirizine)',
    genericName: 'Cetirizine Dihydrochloride',
    category: 'حساسية ومضاد هيستامين',
    unit: 'علبة (20 قرص)',
    stockQuantity: 38,
    minQuantity: 10,
    purchasePrice: 8.0,
    sellPrice: 13.0,
    batchNumber: 'CET-401',
    expiryDate: '2027-10-10',
    manufacturer: 'بيت جالا',
  },
  {
    id: 'med-10',
    barcode: '625100100210',
    tradeName: 'أتورفاستاتين 20 ملغ (Atorvastatin)',
    genericName: 'Atorvastatin Calcium',
    category: 'أدوية الكوليسترول',
    unit: 'علبة (30 قرص)',
    stockQuantity: 22,
    minQuantity: 8,
    purchasePrice: 26.0,
    sellPrice: 39.0,
    batchNumber: 'ATR-711',
    expiryDate: '2027-09-01',
    manufacturer: 'القدس',
  },
];

const initialTransactions: FinancialTransaction[] = [
  {
    id: 'tx-1',
    entityId: 'ent-1',
    entityName: 'صيدلية الأمل المركزية',
    date: '2026-09-15 11:30',
    amount: 1450.0,
    type: 'invoice',
    direction: 'debit',
    balanceAfter: 1450.0,
    referenceNumber: 'INV-10021',
    note: 'فاتورة بيع أدوية بالجملة (أوجمنتين وبروفين وبانادول)',
    recordedBy: 'م. مالك حريبات',
  },
  {
    id: 'tx-2',
    entityId: 'ent-2',
    entityName: 'صيدلية الشفاء الحديثة',
    date: '2026-09-18 14:15',
    amount: 1320.0,
    type: 'invoice',
    direction: 'debit',
    balanceAfter: 1320.0,
    referenceNumber: 'INV-10034',
    note: 'طلب تبادل أدوية ونواقص مستعجلة',
    recordedBy: 'م. مالك حريبات',
  },
  {
    id: 'tx-3',
    entityId: 'ent-2',
    entityName: 'صيدلية الشفاء الحديثة',
    date: '2026-09-25 16:00',
    amount: 500.0,
    type: 'payment_in',
    direction: 'credit',
    balanceAfter: 820.0,
    referenceNumber: 'REC-502',
    note: 'سند قبض نقدي دفعة من الحساب نقداً',
    recordedBy: 'م. مالك حريبات',
  },
  {
    id: 'tx-4',
    entityId: 'ent-3',
    entityName: 'شركة بيرزيت للصناعات الدوائية',
    date: '2026-09-05 09:30',
    amount: 7300.0,
    type: 'purchase',
    direction: 'credit',
    balanceAfter: -7300.0,
    referenceNumber: 'PUR-8821',
    note: 'فاتورة شراء وتوريد طلبيّة أدوية شهرية',
    recordedBy: 'م. مالك حريبات',
  },
  {
    id: 'tx-5',
    entityId: 'ent-3',
    entityName: 'شركة بيرزيت للصناعات الدوائية',
    date: '2026-09-28 10:20',
    amount: 3000.0,
    type: 'payment_out',
    direction: 'debit',
    balanceAfter: -4300.0,
    referenceNumber: 'PAY-401',
    note: 'سند صرف - تسديد دفعة شيك بنكي من حساب الشركة',
    recordedBy: 'م. مالك حريبات',
  },
  {
    id: 'tx-6',
    entityId: 'ent-6',
    entityName: 'أحمد محمود العواودة (زبون دائم)',
    date: '2026-10-01 18:40',
    amount: 320.0,
    type: 'invoice',
    direction: 'debit',
    balanceAfter: 320.0,
    referenceNumber: 'INV-10088',
    note: 'صرف وصفة علاج الضغط والسكري الشهرية على الحساب',
    recordedBy: 'د. سارة - صيدلانية',
  },
];

const initialSales: SaleInvoice[] = [
  {
    id: 'sale-1',
    invoiceNumber: 'INV-10088',
    date: '2026-10-01 18:40',
    entityId: 'ent-6',
    entityName: 'أحمد محمود العواودة (زبون دائم)',
    items: [
      {
        medicineId: 'med-5',
        medicineName: 'كونكور 5 ملغ (Concor 5mg)',
        quantity: 2,
        unitPrice: 31.0,
        subtotal: 62.0,
      },
      {
        medicineId: 'med-10',
        medicineName: 'أتورفاستاتين 20 ملغ (Atorvastatin)',
        quantity: 2,
        unitPrice: 39.0,
        subtotal: 78.0,
      },
      {
        medicineId: 'med-4',
        medicineName: 'أوميبرازول 20 ملغ (Omeprazole)',
        quantity: 2,
        unitPrice: 24.0,
        subtotal: 48.0,
      },
      {
        medicineId: 'med-7',
        medicineName: 'فيتامين د3 (Vitamin D3 50,000 IU)',
        quantity: 3,
        unitPrice: 38.0,
        subtotal: 114.0,
      },
      {
        medicineId: 'med-2',
        medicineName: 'بانادول اكسترا (Panadol Extra)',
        quantity: 1,
        unitPrice: 14.0,
        subtotal: 14.0,
      },
    ],
    totalAmount: 316.0,
    discount: 0,
    tax: 0,
    finalAmount: 316.0,
    paidAmount: 0,
    remainingAmount: 316.0,
    paymentMethod: 'credit',
    paymentStatus: 'unpaid',
    cashierName: 'د. سارة - صيدلانية',
    notes: 'تسجيل على حساب العميل الشهري',
  },
  {
    id: 'sale-2',
    invoiceNumber: 'INV-10089',
    date: '2026-10-05 10:15',
    entityName: 'زبون نقدي',
    items: [
      {
        medicineId: 'med-1',
        medicineName: 'أوجمنتين 1 غرام (Augmentin 1g)',
        quantity: 1,
        unitPrice: 38.0,
        subtotal: 38.0,
      },
      {
        medicineId: 'med-2',
        medicineName: 'بانادول اكسترا (Panadol Extra)',
        quantity: 2,
        unitPrice: 14.0,
        subtotal: 28.0,
      },
    ],
    totalAmount: 66.0,
    discount: 0,
    tax: 0,
    finalAmount: 66.0,
    paidAmount: 66.0,
    remainingAmount: 0,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    cashierName: 'م. مالك حريبات',
  },
  {
    id: 'sale-3',
    invoiceNumber: 'INV-10090',
    date: '2026-10-06 09:00',
    entityName: 'زبون نقدي',
    items: [
      {
        medicineId: 'med-3',
        medicineName: 'بروفين 400 ملغ (Brufen 400mg)',
        quantity: 1,
        unitPrice: 18.0,
        subtotal: 18.0,
      },
      {
        medicineId: 'med-9',
        medicineName: 'سيتريزين 10 ملغ (Cetirizine)',
        quantity: 1,
        unitPrice: 13.0,
        subtotal: 13.0,
      },
    ],
    totalAmount: 31.0,
    discount: 1.0,
    tax: 0,
    finalAmount: 30.0,
    paidAmount: 30.0,
    remainingAmount: 0,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    cashierName: 'م. مالك حريبات',
  },
];

const initialExpenses: Expense[] = [
  {
    id: 'exp-1',
    title: 'إيجار مقر الصيدلية لشهر أكتوبر',
    category: 'rent',
    amount: 1500.0,
    date: '2026-10-01',
    notes: 'إيجار نصف سنوي مقسط',
    recordedBy: 'م. مالك حريبات',
  },
  {
    id: 'exp-2',
    title: 'فاتورة الكهرباء وتكييف الصيدلية',
    category: 'electricity',
    amount: 380.0,
    date: '2026-10-02',
    notes: 'تشغيل تبريد ثلاجات الأدوية والمكيف',
    recordedBy: 'م. مالك حريبات',
  },
  {
    id: 'exp-3',
    title: 'أكياس ومطبوعات وفواتير حرارية',
    category: 'supplies',
    amount: 120.0,
    date: '2026-10-04',
    notes: 'رولات ورق حراري وأكياس مطبوعة',
    recordedBy: 'م. مالك حريبات',
  },
];

const inMemoryStorage: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn('localStorage getItem failed (Safari private mode/restricted):', e);
  }
  return inMemoryStorage[key] || null;
}

function safeSetItem(key: string, value: string): void {
  inMemoryStorage[key] = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn('localStorage setItem failed (Safari private mode/restricted):', e);
  }
}

function getInstanceKey(baseKey: string, specificInstanceId?: string): string {
  const instanceId = specificInstanceId || safeGetItem('pharma_active_instance_id_v1') || 'default';
  if (instanceId === 'default') {
    return baseKey;
  }
  return `${baseKey}_inst_${instanceId}`;
}

export class AppStorage {
  static getActiveInstanceId(): string {
    return safeGetItem('pharma_active_instance_id_v1') || 'default';
  }

  static setActiveInstanceId(id: string): void {
    safeSetItem('pharma_active_instance_id_v1', id);
  }

  static getEntities(instanceId?: string): Entity[] {
    const key = getInstanceKey(STORAGE_KEYS.ENTITIES, instanceId);
    const data = safeGetItem(key);
    const active = instanceId || this.getActiveInstanceId();
    if (!data) {
      if (active === 'default') {
        this.saveEntities(initialEntities, 'default');
        return initialEntities;
      }
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (active === 'default' ? initialEntities : []);
    } catch {
      return active === 'default' ? initialEntities : [];
    }
  }

  static saveEntities(entities: Entity[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.ENTITIES, instanceId);
    safeSetItem(key, JSON.stringify(entities));
  }

  static getMedicines(instanceId?: string): Medicine[] {
    const key = getInstanceKey(STORAGE_KEYS.MEDICINES, instanceId);
    const data = safeGetItem(key);
    const active = instanceId || this.getActiveInstanceId();
    if (!data) {
      if (active === 'default') {
        this.saveMedicines(initialMedicines, 'default');
        return initialMedicines;
      }
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (active === 'default' ? initialMedicines : []);
    } catch {
      return active === 'default' ? initialMedicines : [];
    }
  }

  static saveMedicines(medicines: Medicine[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.MEDICINES, instanceId);
    safeSetItem(key, JSON.stringify(medicines));
  }

  static getSales(instanceId?: string): SaleInvoice[] {
    const key = getInstanceKey(STORAGE_KEYS.SALES, instanceId);
    const data = safeGetItem(key);
    const active = instanceId || this.getActiveInstanceId();
    if (!data) {
      if (active === 'default') {
        this.saveSales(initialSales, 'default');
        return initialSales;
      }
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (active === 'default' ? initialSales : []);
    } catch {
      return active === 'default' ? initialSales : [];
    }
  }

  static saveSales(sales: SaleInvoice[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.SALES, instanceId);
    safeSetItem(key, JSON.stringify(sales));
  }

  static getTransactions(instanceId?: string): FinancialTransaction[] {
    const key = getInstanceKey(STORAGE_KEYS.TRANSACTIONS, instanceId);
    const data = safeGetItem(key);
    const active = instanceId || this.getActiveInstanceId();
    if (!data) {
      if (active === 'default') {
        this.saveTransactions(initialTransactions, 'default');
        return initialTransactions;
      }
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (active === 'default' ? initialTransactions : []);
    } catch {
      return active === 'default' ? initialTransactions : [];
    }
  }

  static saveTransactions(transactions: FinancialTransaction[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.TRANSACTIONS, instanceId);
    safeSetItem(key, JSON.stringify(transactions));
  }

  static getExpenses(instanceId?: string): Expense[] {
    const key = getInstanceKey(STORAGE_KEYS.EXPENSES, instanceId);
    const data = safeGetItem(key);
    const active = instanceId || this.getActiveInstanceId();
    if (!data) {
      if (active === 'default') {
        this.saveExpenses(initialExpenses, 'default');
        return initialExpenses;
      }
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : (active === 'default' ? initialExpenses : []);
    } catch {
      return active === 'default' ? initialExpenses : [];
    }
  }

  static saveExpenses(expenses: Expense[], instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.EXPENSES, instanceId);
    safeSetItem(key, JSON.stringify(expenses));
  }

  static getSettings(instanceId?: string): AppSettings {
    const key = getInstanceKey(STORAGE_KEYS.SETTINGS, instanceId);
    const data = safeGetItem(key);
    if (!data) {
      this.saveSettings(defaultSettings, instanceId);
      return defaultSettings;
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return {
          ...defaultSettings,
          ...parsed,
          license: { ...defaultLicense, ...(parsed.license || {}) },
        };
      }
      return defaultSettings;
    } catch {
      return defaultSettings;
    }
  }

  static saveSettings(settings: AppSettings, instanceId?: string): void {
    const key = getInstanceKey(STORAGE_KEYS.SETTINGS, instanceId);
    safeSetItem(key, JSON.stringify(settings));
  }

  static initInstanceData(
    instanceId: string,
    customSettings: AppSettings,
    seedMedicines: boolean = false
  ): void {
    this.saveSettings(customSettings, instanceId);
    this.saveEntities([], instanceId);
    this.saveSales([], instanceId);
    this.saveTransactions([], instanceId);
    this.saveExpenses([], instanceId);
    if (seedMedicines) {
      this.saveMedicines(initialMedicines, instanceId);
    } else {
      this.saveMedicines([], instanceId);
    }
  }

  static getInstanceStats(instanceId: string): {
    medicinesCount: number;
    salesCount: number;
    entitiesCount: number;
    transactionsCount: number;
  } {
    const med = this.getMedicines(instanceId);
    const sal = this.getSales(instanceId);
    const ent = this.getEntities(instanceId);
    const trx = this.getTransactions(instanceId);
    return {
      medicinesCount: med.length,
      salesCount: sal.length,
      entitiesCount: ent.length,
      transactionsCount: trx.length,
    };
  }

  // Backup & Restore
  static exportFullBackup(instanceId?: string): string {
    const active = instanceId || this.getActiveInstanceId();
    const backup = {
      instanceId: active,
      entities: this.getEntities(active),
      medicines: this.getMedicines(active),
      sales: this.getSales(active),
      transactions: this.getTransactions(active),
      expenses: this.getExpenses(active),
      settings: this.getSettings(active),
      exportedAt: new Date().toISOString(),
      version: '2.0',
    };
    return JSON.stringify(backup, null, 2);
  }

  static importFullBackup(jsonString: string, targetInstanceId?: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      const target = targetInstanceId || this.getActiveInstanceId();
      if (data.entities) this.saveEntities(data.entities, target);
      if (data.medicines) this.saveMedicines(data.medicines, target);
      if (data.sales) this.saveSales(data.sales, target);
      if (data.transactions) this.saveTransactions(data.transactions, target);
      if (data.expenses) this.saveExpenses(data.expenses, target);
      if (data.settings) this.saveSettings(data.settings, target);
      return true;
    } catch (e) {
      console.error('Backup restore error:', e);
      return false;
    }
  }

  static resetToDefault(instanceId?: string): void {
    const target = instanceId || this.getActiveInstanceId();
    if (target === 'default') {
      this.saveEntities(initialEntities, 'default');
      this.saveMedicines(initialMedicines, 'default');
      this.saveSales(initialSales, 'default');
      this.saveTransactions(initialTransactions, 'default');
      this.saveExpenses(initialExpenses, 'default');
      this.saveSettings(defaultSettings, 'default');
    } else {
      this.saveEntities([], target);
      this.saveMedicines([], target);
      this.saveSales([], target);
      this.saveTransactions([], target);
      this.saveExpenses([], target);
    }
  }
}

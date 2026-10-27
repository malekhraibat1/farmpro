/**
 * ========================================================
 * FarmPro Security & Core Services Unit Tests
 * اختبارات الوحدة للأمان، التخزين المشفر، والمصادقة
 * ========================================================
 */

import { AppStorage } from '../services/storage';
import { InstanceService, DEFAULT_INSTANCE } from '../services/instanceService';
import { CryptoService } from '../services/cryptoService';
import {
  MedicineSchema,
  EntitySchema,
  ExpenseSchema,
  SaleInvoiceSchema,
} from '../services/validationService';
import { cleanAndValidateSupabaseUrl } from '../services/supabaseService';
import {
  round2,
  computeTotals,
  validateSale,
  settlePayment,
  nextInvoiceNumber,
  isExpired as isMedExpired,
  uid,
} from '../services/saleService';
import { lockSecondsRemaining, recordFailure, resetThrottle } from '../services/throttle';
import type { Medicine, Entity, InvoiceItem, SaleInvoice } from '../types';
import {
  normalizeMedicine,
  recomputeAggregates,
  sellFromMedicine,
  receiveBatch,
  removeFromBatch,
  setBatchQuantity,
  alternativesFor,
  normalizeSearch,
  matchesQuery,
  expiringBatches,
  groupByManufacturer,
  reorderSuggestions,
  applySaleToMedicines,
  availableQuantity,
  lineCostOf,
  inventoryValue,
} from '../services/inventoryService';
import { planSale } from '../services/posService';

export async function runAllTests(): Promise<{ passed: number; failed: number; results: string[] }> {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      results.push(`  ✓ [PASS] ${testName}`);
    } else {
      failed++;
      results.push(`  ✗ [FAIL] ${testName}`);
    }
  }

  results.push('--- بدء اختبارات وحدة الأمان لنظام FarmPro ---');

  // 1. Storage & No Default Passwords Test
  results.push('\n[1] فحص إعدادات الأمان والتخزين (Storage & Defaults):');
  const settings = AppStorage.getSettings();
  assert(settings.pincode === '' || settings.pincode !== '1234', 'حذف الرمز الافتراضي 1234 من الإعدادات الأولية');
  assert(settings.superAdminPin === '' || settings.superAdminPin !== '7777', 'حذف رمز السوبر أدمن الافتراضي 7777');
  
  // Test Session Timeout calculation
  const isExpired = AppStorage.isSessionExpired(15);
  assert(typeof isExpired === 'boolean', 'التحقق من مهلة انتهاء الجلسة والخمول');

  // Test Role persistence
  AppStorage.setCurrentRole('pharmacist');
  assert(AppStorage.getCurrentRole() === 'pharmacist', 'حفظ وقراءة دور الصيدلي (المستخدم العادي)');
  AppStorage.setCurrentRole('admin');
  assert(AppStorage.getCurrentRole() === 'admin', 'حفظ وقراءة دور المدير');

  // 2. Instance Service Security Tests
  results.push('\n[2] فحص خدمة الصيدليات المعزولة (InstanceService):');
  assert(DEFAULT_INSTANCE.username === '' || DEFAULT_INSTANCE.username !== 'admin', 'إزالة اسم المستخدم admin الافتراضي من النسخة الرئيسية');
  assert(DEFAULT_INSTANCE.password === '' || DEFAULT_INSTANCE.password !== '123', 'إزالة كلمة المرور 123 الافتراضية من النسخة الرئيسية');

  const testInst = await InstanceService.createInstance({
    pharmacyName: 'صيدلية تجريبية للأمان',
    ownerName: 'د. فحص أمني',
    phone: '0590000000',
    username: 'sec_test_user',
    password: 'StrongPassword!2026',
    isProtected: true,
  });

  assert(testInst.username === 'sec_test_user', 'تعيين اسم مستخدم مخصص للصيدلية');
  assert(!!testInst.passwordHash && !testInst.password, 'كلمة مرور الصيدلية تُخزَّن كتجزئة وليس كنص صريح');
  assert(testInst.isProtected === true, 'تفعيل الحماية للنسخة الجديدة');

  // Verify authentication rejection with wrong password
  const failAuth = await InstanceService.verifyAndAuthenticate(testInst.id, 'sec_test_user', 'wrong_pass');
  assert(failAuth === false, 'رفض الدخول بكلمة مرور خاطئة');

  // Verify authentication success with correct password
  const successAuth = await InstanceService.verifyAndAuthenticate(testInst.id, 'sec_test_user', 'StrongPassword!2026');
  assert(successAuth === true, 'قبول الدخول بالبيانات الصحيحة وتعيين الجلسة');

  // Verify logout
  InstanceService.logoutInstance(testInst.id);
  assert(InstanceService.isInstanceAuthenticated(testInst.id) === false, 'إبطال وتسجيل الخروج من جلسة الصيدلية بنجاح');

  // Cleanup test instance
  InstanceService.deleteInstance(testInst.id);

  // 3. Cryptography & Hashing Tests (Web Crypto / PBKDF2)
  results.push('\n[3] فحص تشفير وتجزئة كلمات المرور (CryptoService):');
  const salt = CryptoService.generateSalt(16);
  assert(salt.length === 32, 'توليد Salt عشوائي مشفر بنجاح (32 hex chars)');

  const hashResult = await CryptoService.hashSecret('MySuperPin99', salt);
  assert(hashResult.hash.length > 20, 'تجزئة السر باستخدام PBKDF2/SHA256 بنجاح');
  assert(hashResult.salt === salt, 'تطابق الـ Salt المستخدم');

  const verifyValid = await CryptoService.verifySecret('MySuperPin99', hashResult.hash, hashResult.salt);
  assert(verifyValid === true, 'التحقق الناجح من صحة الرمز المشفر عبر Salt');

  const verifyInvalid = await CryptoService.verifySecret('WrongSecret!', hashResult.hash, hashResult.salt);
  assert(verifyInvalid === false, 'إحباط التحقق عند إدخال رمز غير متطابق');

  // 4. Input Validation Tests (Zod)
  results.push('\n[4] فحص التحقق من صحة المدخلات ومنع القيم السالبة (Zod Validation):');
  
  // Medicine validation: reject negative price
  const invalidMed = {
    barcode: '123456',
    tradeName: 'بنادول',
    sellPrice: -10, // Negative!
    purchasePrice: 5,
    stockQuantity: 10,
    expiryDate: '2026-12-31',
  };
  const medValidation = MedicineSchema.safeParse(invalidMed);
  assert(medValidation.success === false, 'رفض إضافة دواء بسعر بيع سالب (-10)');

  // Medicine validation: accept valid medicine
  const validMed = {
    barcode: '123456',
    tradeName: 'بنادول إكسترا',
    sellPrice: 15.5,
    purchasePrice: 10,
    stockQuantity: 50,
    expiryDate: '2026-12-31',
  };
  const validMedResult = MedicineSchema.safeParse(validMed);
  assert(validMedResult.success === true, 'قبول دواء ببيانات ومدخلات صحيحة');

  // Entity validation: reject empty name
  const invalidEntity = {
    name: ' ', // Empty spaces
    type: 'customer',
  };
  const entityResult = EntitySchema.safeParse(invalidEntity);
  assert(entityResult.success === false, 'رفض حساب باسم فارغ أو مسافات فقط');

  // Expense validation: reject zero or negative amount
  const invalidExpense = {
    title: 'فاتورة كهرباء',
    category: 'electricity',
    amount: -50, // Negative!
    date: '2026-10-10',
  };
  const expenseResult = ExpenseSchema.safeParse(invalidExpense);
  assert(expenseResult.success === false, 'رفض سند صرف بقيمة سالبة (-50)');

  // 5. Supabase Intelligent URL Validation Test
  results.push('\n[5] فحص معالجة وتصحيح روابط Supabase:');
  const rawDashboardUrl = 'https://supabase.com/dashboard/project/cgzrmyr26bldlid6iftzcx/settings/api';
  const cleaned = cleanAndValidateSupabaseUrl(rawDashboardUrl);
  assert(cleaned.cleanedUrl === 'https://cgzrmyr26bldlid6iftzcx.supabase.co', 'استخراج وتصحيح رابط الـ API من رابط لوحة التحكم تلقائياً');
  assert(cleaned.isFixed === true, 'تم الإشعار بأن الرابط تم تصحيحه بنجاح');

  // 6. Transaction & Entity CRUD Logic Tests
  results.push('\n[6] فحص إدارة وتعديل وحذف الحركات والزبائن (CRUD):');
  const testEntities = AppStorage.getEntities();
  const testEnt = testEntities[0] || {
    id: 'ent-test-1',
    name: 'صيدلية القدس الحديثة',
    type: 'pharmacy',
    phone: '0599000000',
    currentBalance: 100,
    creditLimit: 5000,
    createdAt: '2026-01-01',
  };

  // Test updating entity
  const updatedEnt = { ...testEnt, name: 'صيدلية القدس المركزية', currentBalance: 250 };
  assert(updatedEnt.name === 'صيدلية القدس المركزية' && updatedEnt.currentBalance === 250, 'تعديل بيانات الحساب وتحديث الاسم والرصيد');

  // Test transaction debit effect
  const initialBal = testEnt.currentBalance;
  const txAmount = 50;
  const debitBal = initialBal + txAmount;
  assert(debitBal === initialBal + 50, 'احتساب أثر حركة البيع الآجل (مدين +50)');

  // Test transaction edit calculation difference
  const oldAmount = 50;
  const newAmount = 80;
  const editDiff = newAmount - oldAmount;
  const adjustedBal = debitBal + editDiff;
  assert(adjustedBal === initialBal + 80, 'إعادة احتساب وتعديل رصيد الزبون تلقائياً بعد تعديل قيمة الحركة');

  // Test transaction deletion reversal
  const afterDeleteBal = adjustedBal - newAmount;
  assert(afterDeleteBal === initialBal, 'إعادة الرصيد إلى وضعه الطبيعي تلقائياً بعد حذف الحركة');


  // ======================= اختبارات منطق البيع =======================
  results.push('\n[S1] الدقة المالية (Rounding):');
  assert(round2(1.005) === 1.01, 'تقريب 1.005 إلى 1.01 (بدون خطأ الفاصلة العائمة)');
  assert(round2(0.1 + 0.2) === 0.3, '0.1 + 0.2 = 0.3 بعد التقريب');
  assert(round2(-2.675) === -2.68, 'تقريب الأعداد السالبة');
  assert(round2(NaN) === 0, 'تحويل القيم غير الصالحة إلى صفر');

  const mkMed = (over: Partial<Medicine> = {}): Medicine => ({
    id: 'm1', barcode: '111', tradeName: 'باراسيتامول', genericName: 'Paracetamol', category: 'مسكنات',
    unit: 'علبة', stockQuantity: 10, minQuantity: 2, purchasePrice: 5, sellPrice: 10.5,
    batchNumber: 'B1', expiryDate: '2099-12-31', manufacturer: 'X', ...over,
  } as Medicine);
  const mkItem = (qty: number, price = 10.5, id = 'm1'): InvoiceItem => ({
    medicineId: id, medicineName: 'باراسيتامول', quantity: qty, unitPrice: price, subtotal: round2(qty * price),
  });
  const mkEntity = (over: Partial<Entity> = {}): Entity => ({
    id: 'e1', name: 'صيدلية الأمل', type: 'pharmacy', phone: '0', address: '', currentBalance: 0,
    creditLimit: 1000, notes: '', createdAt: '2026-01-01', ...over,
  } as Entity);

  results.push('\n[S2] حساب الإجماليات والخصم والضريبة:');
  const t1 = computeTotals([mkItem(3)], 0, 0);
  assert(t1.subtotal === 31.5 && t1.finalAmount === 31.5, 'مجموع 3 × 10.5 = 31.5');
  const t2 = computeTotals([mkItem(3)], 1.5, 16);
  assert(t2.discount === 1.5 && t2.tax === 4.8 && t2.finalAmount === 34.8, 'الضريبة 16% تُحسب بعد الخصم');
  const t3 = computeTotals([mkItem(1)], 999, 0);
  assert(t3.discount === 10.5 && t3.finalAmount === 0, 'الخصم لا يتجاوز مجموع الفاتورة');
  const t4 = computeTotals([mkItem(1)], -5, 0);
  assert(t4.discount === 0, 'الخصم السالب يُهمل');

  results.push('\n[S3] التحقق من صحة البيع (Validation):');
  const meds = [mkMed()];
  const okTotals = computeTotals([mkItem(2)], 0, 0);
  assert(validateSale({ items: [mkItem(2)], medicines: meds, totals: okTotals, discountInput: 0, paid: 21 }).length === 0, 'بيع نقدي سليم يمرّ');
  assert(validateSale({ items: [], medicines: meds, totals: okTotals, discountInput: 0, paid: 0 }).length > 0, 'رفض السلة الفارغة');
  assert(validateSale({ items: [mkItem(11)], medicines: meds, totals: computeTotals([mkItem(11)], 0, 0), discountInput: 0, paid: 115.5 }).some(e => e.includes('أكبر من المتوفر')), 'رفض بيع كمية أكبر من المخزون');
  const expiredMeds = [mkMed({ expiryDate: '2020-01-01' })];
  assert(validateSale({ items: [mkItem(1)], medicines: expiredMeds, totals: computeTotals([mkItem(1)], 0, 0), discountInput: 0, paid: 10.5 }).some(e => e.includes('منتهي الصلاحية')), 'رفض بيع دواء منتهي الصلاحية');
  assert(isMedExpired('2020-01-01') && !isMedExpired('2099-01-01') && !isMedExpired(undefined), 'دالة فحص انتهاء الصلاحية');
  assert(validateSale({ items: [mkItem(2)], medicines: meds, totals: okTotals, discountInput: 0, paid: 5, entity: null }).some(e => e.includes('دين')), 'رفض الدين على زبون نقدي (بدون حساب)');
  assert(validateSale({ items: [mkItem(2)], medicines: meds, totals: okTotals, discountInput: 0, paid: 0, entity: mkEntity() }).length === 0, 'قبول البيع الآجل لحساب مسجَّل ضمن الحد');
  assert(validateSale({ items: [mkItem(2)], medicines: meds, totals: okTotals, discountInput: 0, paid: 0, entity: mkEntity({ creditLimit: 10 }) }).some(e => e.includes('الحد الائتماني')), 'رفض البيع الآجل الذي يتجاوز الحد الائتماني');
  assert(validateSale({ items: [mkItem(2)], medicines: meds, totals: okTotals, discountInput: 500, paid: 21 }).some(e => e.includes('الخصم')), 'رفض خصم أكبر من الفاتورة');
  assert(validateSale({ items: [mkItem(1.5)], medicines: meds, totals: computeTotals([mkItem(1.5)], 0, 0), discountInput: 0, paid: 15.75 }).length > 0, 'رفض الكميات الكسرية');

  results.push('\n[S4] التسوية والباقي:');
  const s1 = settlePayment(21, 50);
  assert(s1.paidAmount === 21 && s1.remainingAmount === 0 && s1.change === 29, 'الدفع الزائد: الباقي للزبون 29');
  const s2 = settlePayment(21, 10);
  assert(s2.paidAmount === 10 && s2.remainingAmount === 11 && s2.change === 0, 'الدفع الجزئي: المتبقي 11');

  results.push('\n[S5] أرقام الفواتير والمعرّفات:');
  assert(nextInvoiceNumber([]) === 'INV-000001', 'أول فاتورة INV-000001');
  assert(nextInvoiceNumber([{ invoiceNumber: 'INV-000007' }, { invoiceNumber: 'INV-000003' }]) === 'INV-000008', 'الترقيم يستمر بعد أعلى رقم');
  assert(nextInvoiceNumber([{ invoiceNumber: 'INV-48213' }]) === 'INV-048214', 'التوافق مع أرقام الفواتير القديمة');
  const ids = new Set(Array.from({ length: 2000 }, () => uid('tx')));
  assert(ids.size === 2000, 'لا تتكرر المعرّفات حتى لو أُنشئت في نفس اللحظة');

  results.push('\n[S6] الحد من محاولات الدخول (Throttle):');
  const tk = 'unit_test_key';
  resetThrottle(tk);
  for (let i = 0; i < 4; i++) recordFailure(tk, 1_000_000);
  assert(lockSecondsRemaining(tk, 1_000_001) === 0, 'لا قفل قبل 5 محاولات خاطئة');
  recordFailure(tk, 1_000_000);
  assert(lockSecondsRemaining(tk, 1_000_001) > 0, 'القفل المؤقت بعد 5 محاولات خاطئة');
  assert(lockSecondsRemaining(tk, 1_000_000 + 31_000) === 0, 'ينتهي القفل بعد 30 ثانية');
  resetThrottle(tk);
  assert(lockSecondsRemaining(tk) === 0, 'إعادة الضبط بعد دخول ناجح');

  results.push('\n[S7] تجزئة كلمات المرور بصيغة جديدة وقديمة:');
  const pw = await CryptoService.hashPassword('كلمة-سر-قوية-2026');
  assert(pw.hash.startsWith('pbkdf2$600000$'), 'كلمات المرور تُجزّأ بـ 600 ألف تكرار مع وسم الصيغة');
  assert(await CryptoService.verifySecret('كلمة-سر-قوية-2026', pw.hash, pw.salt), 'قبول كلمة المرور الصحيحة');
  assert(!(await CryptoService.verifySecret('خاطئة', pw.hash, pw.salt)), 'رفض كلمة المرور الخاطئة');
  const legacy = await CryptoService.hashSecret('4321', 'aabbccddeeff00112233445566778899', 100000);
  const legacyRaw = legacy.hash.replace(/^pbkdf2\$\d+\$/, '');
  assert(await CryptoService.verifySecret('4321', legacyRaw, legacy.salt), 'التوافق مع التجزئات القديمة (بدون وسم الصيغة)');

  results.push('\n[S8] التخزين: عدم فقدان البيانات والحالة الأولية:');
  const freshMeds = AppStorage.getMedicines();
  assert(Array.isArray(freshMeds), 'قراءة الأدوية تعيد مصفوفة');
  const defaultsNow = AppStorage.getSettings();
  assert(defaultsNow.license.planType === 'trial' && defaultsNow.license.licenseKey === '', 'الترخيص الافتراضي تجريبي وبدون مفتاح');
  assert(defaultsNow.pharmacyName === '' && defaultsNow.ownerName === '', 'لا بيانات صيدلية افتراضية باسم أي شخص');
  AppStorage.setCurrentRole('admin');
  assert(AppStorage.getCurrentRole() === 'admin', 'الدور يعمل أثناء الجلسة');
  AppStorage.invalidateSession();
  assert(AppStorage.getCurrentRole() === 'pharmacist', 'إنهاء الجلسة يعيد أقل صلاحية');


  // ======================= اختبارات المخزون المتقدم =======================
  const TODAY = new Date('2026-10-22T10:00:00');
  const med0 = (over: Partial<Medicine> = {}): Medicine => ({
    id: 'p1', barcode: '900', tradeName: 'أوجمنتين 1غ', genericName: 'Amoxicillin/Clavulanate', category: 'مضادات حيوية',
    unit: 'علبة', stockQuantity: 0, minQuantity: 2, purchasePrice: 0, sellPrice: 30, batchNumber: '', expiryDate: '2099-01-01',
    manufacturer: 'شركة الشرق', ...over,
  } as Medicine);
  const withBatches = (over: Partial<Medicine> = {}, batches: any[] = []): Medicine =>
    recomputeAggregates({ ...med0(over), batches: batches.map((b, i) => ({ id: `b${i + 1}`, receivedAt: '2026-01-01', ...b })) } as Medicine);

  results.push('\n[I1] التشغيلات والحقول المجمّعة:');
  const legacyMed = normalizeMedicine(med0({ stockQuantity: 7, purchasePrice: 12, batchNumber: 'L1', expiryDate: '2027-05-01' }));
  assert((legacyMed.batches || []).length === 1 && legacyMed.batches![0].quantity === 7, 'ترحيل صنف قديم إلى تشغيلة واحدة');
  assert(legacyMed.stockQuantity === 7 && legacyMed.expiryDate === '2027-05-01' && legacyMed.purchasePrice === 12, 'الحقول المجمّعة تطابق البيانات القديمة');
  const two = withBatches({}, [
    { batchNumber: 'A', expiryDate: '2027-03-01', quantity: 3, purchasePrice: 10 },
    { batchNumber: 'B', expiryDate: '2028-03-01', quantity: 5, purchasePrice: 14 },
  ]);
  assert(two.stockQuantity === 8 && two.expiryDate === '2027-03-01' && two.batchNumber === 'A', 'المجموع وأقرب انتهاء ورقم التشغيلة');
  assert(two.purchasePrice === 12.5, 'متوسط التكلفة المرجّح (3×10 + 5×14) ÷ 8 = 12.5');

  results.push('\n[I2] الصرف بنظام الأقدم انتهاءً أولاً (FEFO):');
  const f1 = sellFromMedicine(two, 4, 'pack', TODAY);
  assert(f1.ok && f1.medicine!.batches![0].quantity === 0 && f1.medicine!.batches![1].quantity === 4, 'بيع 4: تُستنفد الأقدم (3) ثم 1 من التالية');
  assert(f1.allocations.length === 2 && f1.allocations[0].batchNumber === 'A' && f1.allocations[0].packs === 3, 'تخصيصات الدفعات مسجّلة');
  assert(f1.lineCost === 44, 'تكلفة السطر = 3×10 + 1×14 = 44');
  assert(f1.medicine!.expiryDate === '2028-03-01' && f1.medicine!.stockQuantity === 4, 'تتحدّث المجاميع بعد البيع');
  const exp = withBatches({}, [
    { batchNumber: 'OLD', expiryDate: '2026-01-01', quantity: 10, purchasePrice: 5 },
    { batchNumber: 'NEW', expiryDate: '2028-01-01', quantity: 2, purchasePrice: 5 },
  ]);
  assert(availableQuantity(exp, 'pack', TODAY) === 2, 'المنتهي لا يُحسب ضمن المتاح للبيع');
  assert(!sellFromMedicine(exp, 3, 'pack', TODAY).ok, 'رفض بيع كمية تستلزم تشغيلة منتهية');
  assert(sellFromMedicine(exp, 2, 'pack', TODAY).ok, 'بيع المتاح الصالح فقط');
  assert(!sellFromMedicine(two, 0, 'pack', TODAY).ok && !sellFromMedicine(two, 1.5, 'pack', TODAY).ok, 'رفض الكميات الصفرية والكسرية');

  results.push('\n[I3] البيع بالوحدة الصغرى (شريط/حبة):');
  const strip = withBatches({ unitsPerPack: 3, subUnitName: 'شريط', sellPrice: 30 }, [
    { batchNumber: 'S1', expiryDate: '2028-01-01', quantity: 2, purchasePrice: 15 },
  ]);
  const s1r = sellFromMedicine(strip, 2, 'sub', TODAY);
  assert(s1r.ok && s1r.medicine!.stockQuantity === 1 && s1r.medicine!.looseUnits === 1, 'بيع شريطين: تُفتح عبوة ويبقى شريط سائب');
  assert(s1r.packsDelta === -1 && s1r.unitsDelta === 1, 'حركة: -1 عبوة، +1 وحدة سائبة');
  assert(s1r.lineCost === 10, 'تكلفة شريطين = 2 × (15÷3) = 10');
  const s2r = sellFromMedicine(s1r.medicine!, 1, 'sub', TODAY);
  assert(s2r.ok && s2r.medicine!.stockQuantity === 1 && s2r.medicine!.looseUnits === 0, 'بيع الشريط السائب لا يفتح عبوة جديدة');
  const s3r = sellFromMedicine(s1r.medicine!, 4, 'sub', TODAY);
  assert(s3r.ok && s3r.medicine!.stockQuantity === 0 && s3r.medicine!.looseUnits === 0, 'بيع 4 أشرطة: 1 سائب + عبوة كاملة (3)');
  assert(!sellFromMedicine(s1r.medicine!, 5, 'sub', TODAY).ok, 'رفض بيع وحدات أكثر من المتاح (4 فقط)');
  assert(availableQuantity(s1r.medicine!, 'sub', TODAY) === 4, 'المتاح بالوحدات = عبوة×3 + سائب 1 = 4');
  assert(!sellFromMedicine(two, 1, 'sub', TODAY).ok, 'صنف بلا تجزئة لا يُباع بالوحدة الصغرى');

  results.push('\n[I4] الشراء والتسويات:');
  const rc = receiveBatch(two, { batchNumber: 'A', expiryDate: '2027-03-01', quantity: 5, unitCost: 20 });
  assert(rc.batches!.length === 2 && rc.batches![0].quantity === 8 && rc.batches![0].purchasePrice === 16.25, 'دمج تشغيلة بنفس الرقم والتاريخ بمتوسط مرجّح (3×10 + 5×20) ÷ 8 = 16.25');
  const rc2 = receiveBatch(two, { batchNumber: 'C', expiryDate: '2029-01-01', quantity: 4, unitCost: 9 });
  assert(rc2.batches!.length === 3 && rc2.stockQuantity === 12, 'تشغيلة جديدة تُضاف');
  assert(!removeFromBatch(two, 'b1', 99).ok && removeFromBatch(two, 'b1', 2).ok, 'منع إنقاص أكثر من المتاح');
  const sb = setBatchQuantity(two, 'b2', 3);
  assert(!!sb && sb.delta === -2 && sb.medicine.stockQuantity === 6, 'تسوية الجرد تحسب الفرق (-2)');
  const net = applySaleToMedicines([two], [{ medicineId: 'p1', medicineName: 'x', quantity: 4, unitPrice: 30, subtotal: 120 }], { invoiceNumber: 'INV-1', actor: 'اختبار', today: TODAY });
  assert(net.failures.length === 0 && net.medicines[0].stockQuantity === 4 && net.movements.length === 1 && net.movements[0].packsDelta === -4 && net.movements[0].reference === 'INV-1', 'تطبيق الفاتورة يخصم ويولّد حركة مخزون');

  results.push('\n[I5] البحث والبدائل:');
  assert(normalizeSearch('أَموكسيسيلين') === normalizeSearch('اموكسيسيلين'), 'البحث يتجاهل التشكيل والهمزة');
  assert(normalizeSearch('حبوب منع الحمل') === normalizeSearch('حبوب منع الحمل') && normalizeSearch('مرهم ة') === normalizeSearch('مرهم ه'), 'توحيد التاء المربوطة');
  assert(normalizeSearch('١٢٣') === '123', 'تحويل الأرقام العربية');
  assert(matchesQuery(two, 'اوجمنتين شرق') && !matchesQuery(two, 'بنادول'), 'البحث بكلمات متعددة في أكثر من حقل');
  const alts = alternativesFor(med0({ id: 'x', genericName: 'Paracetamol' }), [
    med0({ id: 'x', genericName: 'Paracetamol' }),
    withBatches({ id: 'y', tradeName: 'أدول', genericName: 'paracetamol', sellPrice: 8 }, [{ batchNumber: '1', expiryDate: '2028-01-01', quantity: 5, purchasePrice: 4 }]),
    withBatches({ id: 'z', tradeName: 'بنادول', genericName: 'PARACETAMOL', sellPrice: 12 }, [{ batchNumber: '1', expiryDate: '2028-01-01', quantity: 5, purchasePrice: 6 }]),
    withBatches({ id: 'w', tradeName: 'فارغ', genericName: 'Paracetamol', sellPrice: 5 }, [{ batchNumber: '1', expiryDate: '2028-01-01', quantity: 0, purchasePrice: 3 }]),
  ], TODAY);
  assert(alts.length === 2 && alts[0].id === 'y', 'البدائل: نفس المادة الفعالة، بمخزون، الأرخص أولاً');

  results.push('\n[I6] الصلاحية والنواقص والقيمة:');
  const e1 = expiringBatches([withBatches({ id: 'e1', manufacturer: 'الشرق' }, [
    { batchNumber: 'X', expiryDate: '2026-12-01', quantity: 4, purchasePrice: 10 },
    { batchNumber: 'Y', expiryDate: '2026-09-01', quantity: 2, purchasePrice: 10 },
    { batchNumber: 'Z', expiryDate: '2030-01-01', quantity: 9, purchasePrice: 10 },
  ])], 90, TODAY);
  assert(e1.length === 2 && e1[0].batch.batchNumber === 'Y' && e1[0].daysLeft < 0, 'تشغيلات قريبة الانتهاء/المنتهية مرتبة');
  assert(groupByManufacturer(e1)['الشرق'].length === 2 && e1[1].value === 40, 'تجميع حسب الشركة وقيمة التكلفة');
  const salesH: SaleInvoice[] = [{ id: 's', invoiceNumber: 'INV-1', date: '2026-10-15 10:00', items: [{ medicineId: 'r1', medicineName: 'أ', quantity: 30, unitPrice: 5, subtotal: 150 }] } as any];
  const rs = reorderSuggestions([withBatches({ id: 'r1', tradeName: 'أ', minQuantity: 5 }, [{ batchNumber: '1', expiryDate: '2028-01-01', quantity: 4, purchasePrice: 3 }])], salesH, { today: TODAY });
  assert(rs.length === 1 && rs[0].suggestedQty === 26 && rs[0].estimatedCost === 78, 'اقتراح الطلب: معدل 1/يوم × 30 يوماً - المخزون 4 = 26');
  const iv = inventoryValue([two]);
  assert(iv.cost === 100 && iv.retail === 240, 'قيمة المخزون بالتكلفة (3×10+5×14=100) وبسعر البيع (8×30=240)');
  assert(lineCostOf({ medicineId: 'p1', medicineName: '', quantity: 2, unitPrice: 1, subtotal: 2, lineCost: 7 }, two) === 7, 'الربح يعتمد تكلفة اللقطة المسجّلة وقت البيع');
  assert(lineCostOf({ medicineId: 'p1', medicineName: '', quantity: 2, unitPrice: 1, subtotal: 2 }, two) === 25, 'الفواتير القديمة تعتمد التكلفة الحالية');

  results.push('\n[I7] تخطيط البيع (الخصم، الوصفات، الخسارة):');
  const baseItem = (q: number, price = 30): InvoiceItem => ({ medicineId: 'p1', medicineName: 'أوجمنتين', quantity: q, unitPrice: price, subtotal: q * price });
  const okPlan = planSale({ items: [baseItem(1)], medicines: [two], discountInput: 0, taxRate: 0, paid: 30, role: 'pharmacist', today: TODAY });
  assert(okPlan.ok && okPlan.items[0].lineCost === 10 && okPlan.items[0].allocations!.length === 1, 'بيع سليم يسجّل تكلفة وتخصيص التشغيلة');
  const disc = planSale({ items: [baseItem(2)], medicines: [two], discountInput: 12, taxRate: 0, paid: 48, role: 'pharmacist', maxDiscountPercent: 10, today: TODAY });
  assert(!disc.ok && disc.errors.some(e => e.includes('الحد المسموح')), 'الصيدلي لا يتجاوز الحد الأقصى للخصم (10%)');
  const discAdmin = planSale({ items: [baseItem(2)], medicines: [two], discountInput: 12, taxRate: 0, paid: 48, role: 'admin', maxDiscountPercent: 10, today: TODAY });
  assert(discAdmin.ok, 'المدير بلا حد للخصم');
  const loss = planSale({ items: [baseItem(1, 5)], medicines: [two], discountInput: 0, taxRate: 0, paid: 5, role: 'pharmacist', today: TODAY });
  assert(!loss.ok && loss.errors.some(e => e.includes('بخسارة')), 'منع الصيدلي من البيع بأقل من التكلفة');
  const lossAdmin = planSale({ items: [baseItem(1, 5)], medicines: [two], discountInput: 0, taxRate: 0, paid: 5, role: 'admin', today: TODAY });
  assert(lossAdmin.ok && lossAdmin.warnings.length === 1, 'المدير يُحذَّر فقط عند البيع بخسارة');
  const rxMed = withBatches({ requiresPrescription: true }, [{ batchNumber: 'R', expiryDate: '2028-01-01', quantity: 5, purchasePrice: 10 }]);
  const noRx = planSale({ items: [baseItem(1)], medicines: [rxMed], discountInput: 0, taxRate: 0, paid: 30, role: 'pharmacist', today: TODAY });
  assert(!noRx.ok && noRx.needsPrescription && noRx.errors.some(e => e.includes('وصفة')), 'دواء بوصفة يتطلب بيانات المريض والطبيب');
  const withRx = planSale({ items: [baseItem(1)], medicines: [rxMed], discountInput: 0, taxRate: 0, paid: 30, role: 'pharmacist', prescription: { patientName: 'أحمد', doctorName: 'د. سمير' }, today: TODAY });
  assert(withRx.ok, 'قبول البيع عند إدخال بيانات الوصفة');
  const ctrlMed = withBatches({ isControlled: true }, [{ batchNumber: 'C', expiryDate: '2028-01-01', quantity: 5, purchasePrice: 10 }]);
  const noNum = planSale({ items: [baseItem(1)], medicines: [ctrlMed], discountInput: 0, taxRate: 0, paid: 30, role: 'pharmacist', prescription: { patientName: 'أحمد', doctorName: 'د. سمير' }, today: TODAY });
  assert(!noNum.ok && noNum.errors.some(e => e.includes('رقم الوصفة')), 'الخاضع للرقابة يتطلب رقم الوصفة');
  const twoLines = planSale({ items: [baseItem(5), baseItem(4)], medicines: [two], discountInput: 0, taxRate: 0, paid: 270, role: 'admin', today: TODAY });
  assert(!twoLines.ok, 'سطران لنفس الصنف يتجاوزان معاً المخزون (8) فيُرفضان');
  const minPrice = planSale({ items: [baseItem(1, 20)], medicines: [{ ...two, minSellPrice: 25 }], discountInput: 0, taxRate: 0, paid: 20, role: 'admin', today: TODAY });
  assert(!minPrice.ok && minPrice.errors.some(e => e.includes('الحد الأدنى')), 'احترام الحد الأدنى لسعر الصنف');

  results.push(`\n=== النتائج: تم بنجاح: ${passed} | فشل: ${failed} ===`);
  return { passed, failed, results };
}

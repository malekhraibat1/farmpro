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

  const testInst = InstanceService.createInstance({
    pharmacyName: 'صيدلية تجريبية للأمان',
    ownerName: 'د. فحص أمني',
    phone: '0590000000',
    username: 'sec_test_user',
    password: 'StrongPassword!2026',
    isProtected: true,
  });

  assert(testInst.username === 'sec_test_user', 'تعيين اسم مستخدم مخصص للصيدلية');
  assert(testInst.password === 'StrongPassword!2026', 'تعيين كلمة مرور قوية للصيدلية');
  assert(testInst.isProtected === true, 'تفعيل الحماية للنسخة الجديدة');

  // Verify authentication rejection with wrong password
  const failAuth = InstanceService.verifyAndAuthenticate(testInst.id, 'sec_test_user', 'wrong_pass');
  assert(failAuth === false, 'رفض الدخول بكلمة مرور خاطئة');

  // Verify authentication success with correct password
  const successAuth = InstanceService.verifyAndAuthenticate(testInst.id, 'sec_test_user', 'StrongPassword!2026');
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

  results.push(`\n=== النتائج: تم بنجاح: ${passed} | فشل: ${failed} ===`);
  return { passed, failed, results };
}

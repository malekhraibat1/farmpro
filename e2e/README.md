# اختبارات المتصفح (End-to-End)

تشغّل البرنامج الحقيقي في Chromium وتتحقق من: الحفظ في IndexedDB، الصرف FEFO، البيع بالشريط، البدائل، الوصفات،
تعليق الفواتير، المشتريات والبونص، الورديات، مرتجعات الشركات، الجرد، وترحيل البيانات القديمة.

```bash
pip install playwright && playwright install chromium
npm run build && npx vite preview --port 4173 &
python3 e2e/pos_inventory_purchases.py      # 29 فحصاً
python3 e2e/shift_returns_stocktake.py      # 11 فحصاً
python3 e2e/legacy_migration.py             # ترحيل البيانات القديمة
```

ملاحظة: رمز المدير في الاختبارات هو 246810 (يُولَّد داخل الاختبار فقط).

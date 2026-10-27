import json, asyncio, sys
from playwright.async_api import async_playwright
URL='http://localhost:4173/'
SET={"pharmacyName":"صيدلية الاختبار","ownerName":"د. سامي","phone":"05","address":"x","currency":"₪","taxRate":0,"isPinRequired":True,"isSetupCompleted":True,"pincodeHash":"","pincodeSalt":"","adminPasswordHash":"x","adminPasswordSalt":"y","sessionTimeoutMinutes":60,"maxDiscountPercent":10}
def med(**k):
    d={"id":"m1","barcode":"111","tradeName":"أموكسيسيلين","genericName":"Amoxicillin","category":"مضادات حيوية","unit":"علبة","stockQuantity":0,"minQuantity":2,"purchasePrice":0,"sellPrice":20,"batchNumber":"","expiryDate":"2099-01-01","manufacturer":"الشرق"}
    d.update(k); return d
MEDS=[
 med(id="m1",batches=[{"id":"b1","batchNumber":"A","expiryDate":"2027-06-01","quantity":2,"purchasePrice":10},{"id":"b2","batchNumber":"B","expiryDate":"2028-06-01","quantity":5,"purchasePrice":14}]),
 med(id="m2",barcode="222",tradeName="بنادول 500",genericName="Paracetamol",sellPrice=12,unitsPerPack=3,subUnitName="شريط",batches=[{"id":"b3","batchNumber":"P1","expiryDate":"2028-01-01","quantity":4,"purchasePrice":6}]),
 med(id="m3",barcode="333",tradeName="أدول القديم",genericName="Paracetamol",sellPrice=9,batches=[{"id":"b4","batchNumber":"X","expiryDate":"2020-01-01","quantity":9,"purchasePrice":3}]),
 med(id="m4",barcode="444",tradeName="مورفين",genericName="Morphine",sellPrice=50,isControlled=True,requiresPrescription=True,batches=[{"id":"b5","batchNumber":"M1","expiryDate":"2028-01-01","quantity":3,"purchasePrice":20}]),
 med(id="m5",barcode="555",tradeName="باراسيتامول بديل",genericName="paracetamol",sellPrice=7,batches=[{"id":"b6","batchNumber":"Q1","expiryDate":"2028-01-01","quantity":6,"purchasePrice":3}]),
]
ENT=[{"id":"e1","name":"شركة الشرق","type":"company","phone":"0","address":"","currentBalance":0,"creditLimit":0,"notes":"","createdAt":"2026-01-01"}]
IDB_DUMP="""()=>new Promise(res=>{const r=indexedDB.open('pharma_pro_db',1);r.onsuccess=()=>{const db=r.result;const out={};const tx=db.transaction('kv','readonly');const c=tx.objectStore('kv').openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){out[cur.key]=cur.value;cur.continue();}};tx.oncomplete=()=>res(out);};r.onerror=()=>res(null);})"""
ok=0; bad=0
def check(name,cond):
    global ok,bad
    print(('PASS' if cond else 'FAIL'),'-',name)
    if cond: ok+=1
    else: bad+=1
async def idb(pg): return await pg.evaluate(IDB_DUMP)
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch()
        ctx=await br.new_context(viewport={'width':1280,'height':900}); pg=await ctx.new_page()
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.route("**/cdn.tailwindcss.com/**", lambda r: r.abort())
        await pg.goto(URL+'manifest.webmanifest')
        # PIN hash computed in-browser (pbkdf2 format used by app)
        ph=await pg.evaluate("""async()=>{const enc=new TextEncoder();const salt='00112233445566778899aabbccddeeff';const h=s=>new Uint8Array(s.match(/../g).map(x=>parseInt(x,16)));
          const k=await crypto.subtle.importKey('raw',enc.encode('246810'),{name:'PBKDF2'},false,['deriveBits']);
          const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt:h(salt),iterations:100000,hash:'SHA-256'},k,256);
          return {hash:'pbkdf2$100000$'+[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''),salt}}""")
        S=dict(SET); S['pincodeHash']=ph['hash']; S['pincodeSalt']=ph['salt']
        await pg.evaluate("(d)=>{localStorage.setItem('pharma_settings_v1',JSON.stringify(d.s));localStorage.setItem('pharma_medicines_v1',JSON.stringify(d.m));localStorage.setItem('pharma_entities_v1',JSON.stringify(d.e));}",{'s':S,'m':MEDS,'e':ENT})
        await pg.goto(URL); await pg.wait_for_timeout(2500)
        d=await idb(pg)
        check('1) البيانات انتقلت إلى IndexedDB', d and 'pharma_medicines_v1' in d)
        ls=await pg.evaluate("localStorage.getItem('pharma_medicines_v1')")
        check('1b) حُذفت من localStorage بعد التحقق', ls is None)
        meds=json.loads(d['pharma_medicines_v1'])
        check('2) كل الأصناف لها تشغيلات والحقول المجمّعة صحيحة', all(m.get('batches') for m in meds) and meds[0]['stockQuantity']==7 and meds[0]['expiryDate']=='2027-06-01')
        check('2b) schemaVersion=2', d.get('pharma_schema_v1')=='2')
        for i in range(3): 
            await pg.reload(); await pg.wait_for_timeout(1200)
        d=await idb(pg); check('3) البيانات باقية بعد 3 إعادات تحميل', d and len(json.loads(d['pharma_medicines_v1']))==5)

        # ---- POS as pharmacist
        await pg.get_by_text('نقطة البيع', exact=True).first.click(); await pg.wait_for_timeout(600)
        card=lambda name: pg.locator('div.cursor-pointer', has_text=name).first
        # FEFO: add m1 x3
        for _ in range(3): await card('أموكسيسيلين').click(); await pg.wait_for_timeout(120)
        await pg.get_by_text('إتمام البيع والدفع').first.click(); await pg.wait_for_timeout(400)
        await pg.get_by_text('تأكيد وطباعة الفاتورة').click(); await pg.wait_for_timeout(1500)
        d=await idb(pg); sales=json.loads(d.get('pharma_sales_v1','[]')); meds=json.loads(d['pharma_medicines_v1'])
        m1=[m for m in meds if m['id']=='m1'][0]
        check('4) FEFO: الأقدم (2) ثم 1 من التالية', [b['quantity'] for b in m1['batches']]==[0,4] and m1['stockQuantity']==4)
        it=sales[0]['items'][0]
        check('4b) الفاتورة سجّلت تكلفة اللقطة (2×10+1×14=34) وتخصيص دفعتين', it.get('lineCost')==34 and len(it.get('allocations',[]))==2)
        mv=json.loads(d.get('pharma_movements_v1','[]'))
        check('4c) حركة مخزون مسجّلة للبيع', len(mv)==1 and mv[0]['type']=='sale' and mv[0]['packsDelta']==-3 and mv[0]['reference']=='INV-000001')
        await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.get_by_text('نقطة البيع', exact=True).first.click(); await pg.wait_for_timeout(500)

        # retail units
        await card('بنادول 500').click(); await pg.wait_for_timeout(200)
        await pg.get_by_text('بيع بالـشريط').first.click(); await pg.wait_for_timeout(200)
        await pg.get_by_role('button',name='زيادة').first.click(); await pg.wait_for_timeout(200)  # qty 2 strips
        await pg.get_by_text('إتمام البيع والدفع').first.click(); await pg.wait_for_timeout(400)
        await pg.get_by_text('تأكيد وطباعة الفاتورة').click(); await pg.wait_for_timeout(1500)
        d=await idb(pg); meds=json.loads(d['pharma_medicines_v1']); m2=[m for m in meds if m['id']=='m2'][0]
        check('5) البيع بالشريط: عبوة مفتوحة وشريط سائب', m2['stockQuantity']==3 and m2['looseUnits']==1)
        sales=json.loads(d['pharma_sales_v1']); check('5b) سعر الشريط 4 والإجمالي 8', sales[0]['finalAmount']==8 and sales[0]['items'][0]['saleUnit']=='sub')
        await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.get_by_text('نقطة البيع', exact=True).first.click(); await pg.wait_for_timeout(500)

        # alternatives for expired
        await card('أدول القديم').click(); await pg.wait_for_timeout(500)
        body=await pg.inner_text('body')
        check('6) منتهي الصلاحية يفتح لوحة البدائل', 'بدائل متوفرة' in body and 'باراسيتامول بديل' in body)
        await pg.get_by_text('إضافة للسلة').first.click(); await pg.wait_for_timeout(300)
        body=await pg.inner_text('body'); check('6b) إضافة البديل للسلة', 'باراسيتامول بديل' in body)
        await pg.get_by_role('button',name='حذف').first.click(); await pg.wait_for_timeout(200)

        # prescription requirement
        await card('مورفين').click(); await pg.wait_for_timeout(200)
        await pg.get_by_text('إتمام البيع والدفع').first.click(); await pg.wait_for_timeout(400)
        await pg.get_by_text('تأكيد وطباعة الفاتورة').click(); await pg.wait_for_timeout(400)
        body=await pg.inner_text('body'); check('7) الخاضع للرقابة يتطلب بيانات الوصفة', 'اسم المريض' in body and ('رقم الوصفة' in body))
        await pg.get_by_placeholder('اسم المريض *').fill('أحمد'); await pg.get_by_placeholder('اسم الطبيب *').fill('د. سمير'); await pg.get_by_placeholder('رقم الوصفة').fill('RX-1')
        await pg.get_by_text('تأكيد وطباعة الفاتورة').click(); await pg.wait_for_timeout(1500)
        d=await idb(pg); sales=json.loads(d['pharma_sales_v1']); check('7b) الفاتورة تحفظ بيانات الوصفة', sales[0].get('prescription',{}).get('prescriptionNumber')=='RX-1')
        await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.get_by_text('نقطة البيع', exact=True).first.click(); await pg.wait_for_timeout(500)

        # hold & resume
        await card('بنادول 500').click(); await pg.wait_for_timeout(200)
        await pg.get_by_text('تعليق', exact=False).first.click(); await pg.wait_for_timeout(300)
        body=await pg.inner_text('body'); check('8) تعليق الفاتورة', 'الفواتير المعلّقة (1)' in body)
        await pg.get_by_text('صنف', exact=False).filter(has_text='·').first.click(); await pg.wait_for_timeout(300)
        body=await pg.inner_text('body'); check('8b) استئناف الفاتورة المعلّقة', 'بنادول 500' in body and 'الفواتير المعلّقة (' not in body)

        # discount guard for pharmacist
        await pg.get_by_placeholder('0').first.fill('9') ; await pg.wait_for_timeout(200)
        await pg.get_by_text('إتمام البيع والدفع').first.click(); await pg.wait_for_timeout(300)
        await pg.get_by_text('تأكيد وطباعة الفاتورة').click(); await pg.wait_for_timeout(500)
        body=await pg.inner_text('body'); check('9) خصم الصيدلي فوق 10% مرفوض', 'يتجاوز الحد المسموح' in body or 'بخسارة' in body)
        await pg.get_by_text('إلغاء', exact=True).first.click(); await pg.wait_for_timeout(200)
        print('errors:',errs[:3])
        await pg.screenshot(path='/home/claude/e2e5_pos.png')

        # ---- admin login via PIN
        await pg.get_by_text('دخول كمدير').first.click(); await pg.wait_for_timeout(600)
        for ch in '246810': await pg.get_by_role('button',name=ch,exact=True).click()
        await pg.get_by_role('button',name='دخول',exact=True).click(); await pg.wait_for_timeout(2500)
        body=await pg.inner_text('body'); check('10) دخول المدير بالـ PIN (الرمز مُجزَّأ)', 'المشتريات' in body)
        # ---- purchase invoice
        await pg.get_by_text('المشتريات', exact=True).first.click(); await pg.wait_for_timeout(600)
        await pg.get_by_text('فاتورة شراء جديدة').first.click(); await pg.wait_for_timeout(500)
        dlg=pg.get_by_role('dialog',name='فاتورة شراء جديدة')
        await dlg.locator('select').first.select_option(label='شركة الشرق')
        await dlg.get_by_text('اضغط لاختيار الصنف').click(); await pg.wait_for_timeout(200)
        await dlg.get_by_placeholder('ابحث بالاسم أو الباركود').fill('بنادول'); await pg.wait_for_timeout(200)
        await dlg.get_by_role('button',name='بنادول 500').click(); await pg.wait_for_timeout(200)
        dates=dlg.locator('input[type=date]'); await dates.nth(1).fill('2029-05-01')
        nums=dlg.locator('input[type=number]')
        await nums.nth(0).fill('10'); await nums.nth(1).fill('2'); await nums.nth(2).fill('7')  # qty 10, bonus 2, cost 7
        await nums.nth(3).fill('10')   # discount 10%
        await nums.nth(4).fill('20')   # paid 20
        await dlg.get_by_text('حفظ وإدخال المخزون').click(); await pg.wait_for_timeout(1800)
        d=await idb(pg); meds=json.loads(d['pharma_medicines_v1']); m2=[m for m in meds if m['id']=='m2'][0]
        pur=json.loads(d.get('pharma_purchases_v1','[]'))
        check('11) فاتورة الشراء حُفظت PUR-000001', len(pur)==1 and pur[0]['number']=='PUR-000001' and pur[0]['total']==63 and pur[0]['remainingAmount']==43)
        newb=[b for b in m2['batches'] if b['expiryDate']=='2029-05-01']
        check('11b) تشغيلة جديدة بكمية 12 (10+2 بونص)', len(newb)==1 and newb[0]['quantity']==12)
        check('11c) التكلفة الفعلية = 63÷12 = 5.25', newb and newb[0]['purchasePrice']==5.25)
        ents=json.loads(d['pharma_entities_v1']); sup=[e for e in ents if e['id']=='e1'][0]
        check('11d) دين الشركة مسجّل (-43)', sup['currentBalance']==-43)
        mv=json.loads(d['pharma_movements_v1']); check('11e) حركتا شراء وبونص', any(m['type']=='purchase' and m['packsDelta']==10 for m in mv) and any(m['type']=='bonus' and m['packsDelta']==2 for m in mv))
        # ---- inventory tools open without errors
        await pg.get_by_text('المخزون والأدوية', exact=True).first.click(); await pg.wait_for_timeout(600)
        for name,marker in [('قائمة النواقص واقتراح الطلب','اقتراح الطلب'),('مرتجعات الشركات والإتلاف','يشمل ما ينتهي'),('جرد المخزون','امسح الباركود')]:
            await pg.get_by_role('button',name=name).first.click(); await pg.wait_for_timeout(500)
            body=await pg.inner_text('body'); check('12) فتح '+name, marker in body)
            await pg.get_by_role('button',name='إغلاق').first.click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button',name='سجل حركة أموكسيسيلين').click(); await pg.wait_for_timeout(500)
        body=await pg.inner_text('body'); check('12b) سجل حركة الصنف', 'INV-000001' in body)
        await pg.screenshot(path='/home/claude/e2e5_movements.png')
        await pg.get_by_role('button',name='إغلاق').first.click()
        # ---- settings + reports
        await pg.get_by_text('الإعدادات والنسخ', exact=True).first.click(); await pg.wait_for_timeout(800)
        body=await pg.inner_text('body'); check('13) الإعدادات: حالة النظام والبيانات التجريبية', 'حالة النظام والأمان' in body and 'IndexedDB' in body and 'تجربة ببيانات تجريبية' in body)
        await pg.get_by_text('التقارير والأرباح', exact=True).first.click(); await pg.wait_for_timeout(800)
        body=await pg.inner_text('body'); check('14) التقارير: سجل الوصفات والورديات', 'سجل الوصفات' in body and 'RX-1' in body)
        await pg.screenshot(path='/home/claude/e2e5_reports.png')
        print('errors:',errs[:3])
        await br.close()
    print('RESULT ok=%d bad=%d'%(ok,bad))
asyncio.run(main())

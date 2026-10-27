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
        card=lambda name: pg.locator('div.cursor-pointer', has_text=name).first
        # login admin first
        await pg.get_by_text('دخول كمدير').first.click(); await pg.wait_for_timeout(600)
        for ch in '246810': await pg.get_by_role('button',name=ch,exact=True).click()
        await pg.get_by_role('button',name='دخول',exact=True).click(); await pg.wait_for_timeout(2000)
        # ---- shift: open, sell cash, close
        await pg.get_by_text('نقطة البيع', exact=True).first.click(); await pg.wait_for_timeout(500)
        await pg.get_by_role('button',name='فتح وردية').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('dialog').locator('input[type=number]').fill('100')
        await pg.get_by_role('dialog').get_by_role('button',name='فتح الوردية').click(); await pg.wait_for_timeout(400)
        await card('باراسيتامول بديل').click(); await pg.wait_for_timeout(200)
        await pg.get_by_text('إتمام البيع والدفع').first.click(); await pg.wait_for_timeout(300)
        await pg.get_by_text('تأكيد وطباعة الفاتورة').click(); await pg.wait_for_timeout(1500)
        await pg.reload(); await pg.wait_for_timeout(1500)
        await pg.get_by_text('دخول كمدير').first.click(); await pg.wait_for_timeout(500)
        for ch in '246810': await pg.get_by_role('button',name=ch,exact=True).click()
        await pg.get_by_role('button',name='دخول',exact=True).click(); await pg.wait_for_timeout(1800)
        await pg.get_by_text('نقطة البيع', exact=True).first.click(); await pg.wait_for_timeout(500)
        body=await pg.inner_text('body'); check('S1) الوردية تبقى مفتوحة بعد إعادة التحميل ويُحسب النقد المتوقع 107', 'وردية مفتوحة' in body and '107.00' in body)
        await pg.get_by_role('button',name='إغلاق الوردية').first.click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('dialog').locator('input[type=number]').fill('105')
        await pg.wait_for_timeout(200)
        body=await pg.inner_text('body'); check('S2) الفرق يُعرض (-2)', '-2.00' in body)
        await pg.get_by_role('dialog').get_by_role('button',name='إغلاق الوردية').click(); await pg.wait_for_timeout(800)
        d=await idb(pg); sh=json.loads(d['pharma_shifts_v1'])
        check('S3) الوردية أُغلقت بالفرق -2', sh[0].get('closedAt') and sh[0]['expectedCash']==107 and sh[0]['difference']==-2)
        sales=json.loads(d['pharma_sales_v1']); check('S4) الفاتورة مربوطة بالوردية', sales[0].get('shiftId')==sh[0]['id'])
        # ---- supplier return of expired batch
        await pg.get_by_text('المخزون والأدوية', exact=True).first.click(); await pg.wait_for_timeout(600)
        await pg.get_by_role('button',name='مرتجعات الشركات والإتلاف').click(); await pg.wait_for_timeout(500)
        dlg=pg.get_by_role('dialog',name='مرتجعات الشركات والإتلاف')
        await dlg.locator('select').select_option(label='شركة الشرق')
        await dlg.get_by_text('تحديد الكل').first.click(); await pg.wait_for_timeout(200)
        await dlg.get_by_role('button',name='إرجاع للشركة').click(); await pg.wait_for_timeout(1000)
        body=await pg.inner_text('body'); check('R1) رسالة تأكيد المرتجع', 'تم تسجيل المرتجع' in body)
        d=await idb(pg); meds=json.loads(d['pharma_medicines_v1']); m3=[m for m in meds if m['id']=='m3'][0]
        check('R2) كمية الصنف المنتهي صارت 0', m3['stockQuantity']==0)
        ents=json.loads(d['pharma_entities_v1']); sup=[e for e in ents if e['id']=='e1'][0]
        check('R3) رصيد الشركة تحسّن بقيمة التكلفة (9×3=27)', sup['currentBalance']==27)
        mv=json.loads(d['pharma_movements_v1']); check('R4) حركة مرتجع مسجّلة', any(m['type']=='supplier_return' and m['packsDelta']==-9 for m in mv))
        await dlg.get_by_role('button',name='إغلاق').first.click(); await pg.wait_for_timeout(300)
        # ---- stocktake
        await pg.get_by_role('button',name='جرد المخزون').click(); await pg.wait_for_timeout(400)
        dlg=pg.get_by_role('dialog',name='جرد المخزون')
        await dlg.get_by_placeholder('امسح الباركود أو اكتب الاسم ثم Enter').fill('444'); await dlg.get_by_placeholder('امسح الباركود أو اكتب الاسم ثم Enter').press('Enter'); await pg.wait_for_timeout(300)
        await dlg.get_by_label('الكمية المعدودة مورفين').fill('2'); await pg.wait_for_timeout(200)
        pg.once('dialog', lambda dd: asyncio.ensure_future(dd.accept()))
        await dlg.get_by_role('button',name='تطبيق التسوية').click(); await pg.wait_for_timeout(1000)
        d=await idb(pg); meds=json.loads(d['pharma_medicines_v1']); m4=[m for m in meds if m['id']=='m4'][0]
        check('T1) الجرد عدّل الكمية إلى 2', m4['stockQuantity']==2)
        mv=json.loads(d['pharma_movements_v1']); check('T2) حركة جرد -1', any(m['type']=='stocktake' and m['packsDelta']==-1 for m in mv))
        au=json.loads(d['pharma_audit_v1']); check('T3) سجل التدقيق يحوي العمليات', any('جرد' in a['action'] for a in au) and any('مرتجع' in a['action'] for a in au))
        print('errors:',errs[:3])
        await br.close()
    print('RESULT ok=%d bad=%d'%(ok,bad))
asyncio.run(main())

import json, asyncio
from playwright.async_api import async_playwright
URL='http://localhost:4173/'
IDB_DUMP="""()=>new Promise(res=>{const r=indexedDB.open('pharma_pro_db',1);r.onsuccess=()=>{const db=r.result;const out={};const tx=db.transaction('kv','readonly');const c=tx.objectStore('kv').openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){out[cur.key]=cur.value;cur.continue();}};tx.oncomplete=()=>res(out);};r.onerror=()=>res(null);})"""
async def main():
    async with async_playwright() as p:
        br=await p.chromium.launch(); ctx=await br.new_context(); pg=await ctx.new_page()
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(URL+'manifest.webmanifest')
        # بيانات "نسخة قديمة": صنف بدون تشغيلات + مصاريف مشفّرة AES القديمة + مبيعات بدون لقطة تكلفة
        await pg.evaluate("""async()=>{
          const enc=new TextEncoder();const h=a=>[...new Uint8Array(a)].map(b=>b.toString(16).padStart(2,'0')).join('');
          const k=await crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode('FarmPro_SecureStorage_MalikHraibat_2026')),{name:'AES-GCM'},false,['encrypt']);
          const iv=crypto.getRandomValues(new Uint8Array(12));
          const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,enc.encode(JSON.stringify([{id:'old-m1',barcode:'900',tradeName:'دواء قديم',genericName:'X',category:'c',unit:'علبة',stockQuantity:7,minQuantity:2,purchasePrice:12,sellPrice:20,batchNumber:'L1',expiryDate:'2027-05-01',manufacturer:'ش'}])));
          localStorage.setItem('pharma_medicines_v1','ENC_v1:'+h(iv)+':'+h(ct));
          localStorage.setItem('pharma_sales_v1',JSON.stringify([{id:'s1',invoiceNumber:'INV-48213',date:'2026-09-01 10:00',items:[{medicineId:'old-m1',medicineName:'دواء قديم',quantity:2,unitPrice:20,subtotal:40}],totalAmount:40,discount:0,tax:0,finalAmount:40,paidAmount:40,remainingAmount:0,paymentMethod:'cash',paymentStatus:'paid',cashierName:'x'}]));
          localStorage.setItem('pharma_settings_v1',JSON.stringify({pharmacyName:'قديمة',ownerName:'د',phone:'0',address:'',currency:'₪',taxRate:0,isPinRequired:false,isSetupCompleted:true,pincodeHash:'',pincodeSalt:'',adminPasswordHash:'x',adminPasswordSalt:'y'}));
        }""")
        await pg.goto(URL); await pg.wait_for_timeout(2500)
        d=await pg.evaluate(IDB_DUMP)
        meds=json.loads(d['pharma_medicines_v1']); m=meds[0]
        print('AES legacy -> IndexedDB:', m['tradeName']=='دواء قديم')
        print('batches created, id stable, qty kept:', m['batches'][0]['id']=='old-m1-b1' and m['batches'][0]['quantity']==7 and m['stockQuantity']==7 and m['batches'][0]['purchasePrice']==12)
        sales=json.loads(d['pharma_sales_v1']); print('old sales kept:', sales[0]['invoiceNumber']=='INV-48213')
        print('schema version:', d.get('pharma_schema_v1'))
        print('localStorage cleaned:', await pg.evaluate("localStorage.getItem('pharma_medicines_v1')") is None)
        # next invoice number after legacy random number
        await pg.reload(); await pg.wait_for_timeout(1500)
        print('after reload still there:', json.loads((await pg.evaluate(IDB_DUMP))['pharma_medicines_v1'])[0]['batches'][0]['id']=='old-m1-b1')
        print('errors:',errs[:3])
        await br.close()
asyncio.run(main())

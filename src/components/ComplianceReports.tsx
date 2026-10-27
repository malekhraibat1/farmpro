import React, { useState } from 'react';
import { FileText, Wallet, Printer } from 'lucide-react';
import { AppSettings, Medicine, SaleInvoice, Shift } from '../types';

export const ComplianceReports: React.FC<{ sales: SaleInvoice[]; medicines: Medicine[]; shifts: Shift[]; settings: AppSettings }> = ({ sales, medicines, shifts, settings }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const rxSales = sales
    .filter(s => s.prescription)
    .filter(s => (!from || s.date.slice(0, 10) >= from) && (!to || s.date.slice(0, 10) <= to));

  const controlledNames = new Set(medicines.filter(m => m.isControlled).map(m => m.id));
  const closedShifts = shifts.filter(s => s.closedAt).slice(0, 15);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-700" />
            سجل الوصفات والأدوية الخاضعة للرقابة
          </h3>
          <div className="flex flex-wrap items-end gap-2 text-xs">
            <label className="font-bold">من <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="p-1.5 rounded-lg border border-slate-300 font-mono" /></label>
            <label className="font-bold">إلى <input type="date" value={to} onChange={e => setTo(e.target.value)} className="p-1.5 rounded-lg border border-slate-300 font-mono" /></label>
            <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-slate-900 text-white font-black flex items-center gap-1.5"><Printer className="w-4 h-4" /> طباعة</button>
          </div>
        </div>
        {rxSales.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-slate-600">لا توجد مبيعات بوصفة في هذه الفترة.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 font-black">
                <tr><th className="p-2">التاريخ</th><th className="p-2">الفاتورة</th><th className="p-2">الأصناف</th><th className="p-2">المريض</th><th className="p-2">الطبيب</th><th className="p-2">رقم الوصفة</th><th className="p-2">المسؤول</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rxSales.map(s => (
                  <tr key={s.id}>
                    <td className="p-2 font-mono whitespace-nowrap">{s.date}</td>
                    <td className="p-2 font-mono">{s.invoiceNumber}</td>
                    <td className="p-2">
                      {s.items.map((it, i) => (
                        <div key={i}>
                          {it.medicineName} × {it.quantity}
                          {controlledNames.has(it.medicineId) && <span className="ms-1 px-1.5 rounded bg-rose-100 text-rose-900 font-black">رقابة</span>}
                        </div>
                      ))}
                    </td>
                    <td className="p-2 font-bold">{s.prescription?.patientName}{s.prescription?.patientId ? <span className="block font-mono font-normal">{s.prescription.patientId}</span> : null}</td>
                    <td className="p-2">{s.prescription?.doctorName}</td>
                    <td className="p-2 font-mono">{s.prescription?.prescriptionNumber || '-'}</td>
                    <td className="p-2">{s.cashierName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-black text-slate-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-700" />
          آخر الورديات المغلقة
        </h3>
        {closedShifts.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-slate-600">لا توجد ورديات مغلقة بعد. افتح وردية من شاشة الكاشير.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 font-black">
                <tr><th className="p-2">الكاشير</th><th className="p-2">الفتح</th><th className="p-2">الإغلاق</th><th className="p-2">الافتتاح</th><th className="p-2">المتوقع</th><th className="p-2">المعدود</th><th className="p-2">الفرق</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closedShifts.map(sh => (
                  <tr key={sh.id}>
                    <td className="p-2 font-bold">{sh.cashierName}</td>
                    <td className="p-2 font-mono">{sh.openedAt.slice(0, 16).replace('T', ' ')}</td>
                    <td className="p-2 font-mono">{sh.closedAt?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="p-2 font-mono">{sh.openingCash.toFixed(2)}</td>
                    <td className="p-2 font-mono">{sh.expectedCash?.toFixed(2)}</td>
                    <td className="p-2 font-mono">{sh.countedCash?.toFixed(2)}</td>
                    <td className={`p-2 font-mono font-black ${sh.difference === 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{sh.difference?.toFixed(2)} {settings.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

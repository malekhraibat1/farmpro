import React from 'react';
import { Printer, X, Tag } from 'lucide-react';
import { SaleInvoice, AppSettings } from '../types';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SaleInvoice;
  settings: AppSettings;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const esc = (t: string) =>
    String(t || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

  // طباعة ملصقات الصرف (ملصق لكل صنف) في نافذة مستقلة
  const handlePrintLabels = () => {
    const w = window.open('', '_blank', 'width=420,height=600');
    if (!w) {
      alert('المتصفح منع النافذة المنبثقة. اسمح بالنوافذ المنبثقة لطباعة الملصقات.');
      return;
    }
    const patient = invoice.prescription?.patientName ? `المريض: ${esc(invoice.prescription.patientName)}` : '';
    const labels = invoice.items
      .map(
        it => `<div class="label">
          <div class="ph">${esc(settings.pharmacyName)} ${settings.phone ? '· ' + esc(settings.phone) : ''}</div>
          ${patient ? `<div class="pt">${patient}</div>` : ''}
          <div class="dn">${esc(it.medicineName)}</div>
          <div class="dr">${it.directions ? esc(it.directions) : 'حسب إرشاد الطبيب أو الصيدلي'}</div>
          <div class="ft">${esc(invoice.date.slice(0, 10))} · ${esc(invoice.invoiceNumber)} · يُحفظ بعيداً عن متناول الأطفال</div>
        </div>`
      )
      .join('');
    w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>ملصقات الصرف</title>
      <style>
        @page { size: 60mm 40mm; margin: 2mm; }
        body { font-family: Arial, Tahoma, sans-serif; margin: 0; }
        .label { width: 56mm; height: 36mm; padding: 1.5mm; box-sizing: border-box; page-break-after: always; border: 1px dashed #999; overflow: hidden; }
        .ph { font-size: 8pt; font-weight: bold; text-align: center; border-bottom: 1px solid #000; padding-bottom: 1mm; }
        .pt { font-size: 8pt; margin-top: 1mm; }
        .dn { font-size: 10pt; font-weight: bold; margin-top: 1mm; }
        .dr { font-size: 9pt; margin-top: 1mm; }
        .ft { font-size: 6.5pt; position: absolute; bottom: 2mm; }
        @media print { .label { border: none; } }
      </style></head><body>${labels}<script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Controls */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between no-print">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الفاتورة</span>
          </button>
          <button
            onClick={handlePrintLabels}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            title="طباعة ملصق صرف لكل صنف (طريقة الاستعمال)"
          >
            <Tag className="w-4 h-4" />
            <span>ملصقات الصرف</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm Thermal Receipt simulation */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-slate-900 space-y-4 text-center receipt-print">
          {/* Pharmacy Header */}
          <div className="border-b-2 border-dashed border-slate-400 pb-3">
            <h3 className="text-base font-black text-slate-900 font-sans">{settings.pharmacyName}</h3>
            <p className="text-[11px] text-slate-600">{settings.address}</p>
            <p className="text-[11px] text-slate-600">هاتف: {settings.phone}</p>
            {settings.pharmacyLicenseNumber && (
              <p className="text-[11px] text-slate-600">رقم الترخيص: {settings.pharmacyLicenseNumber}</p>
            )}
            {settings.taxNumber && <p className="text-[11px] text-slate-600">الرقم الضريبي: {settings.taxNumber}</p>}
            <div className="mt-1 text-xs text-slate-600">
              رقم الفاتورة: <span className="font-bold text-slate-800">{invoice.invoiceNumber}</span>
            </div>
            <div className="text-xs text-slate-600">التاريخ: {invoice.date}</div>
            <div className="text-xs text-slate-600 font-sans">الكاشير: {invoice.cashierName}</div>
            {invoice.entityName && (
              <div className="mt-1 font-bold text-slate-800 font-sans bg-slate-100 py-0.5 rounded">
                العميل / الحساب: {invoice.entityName}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="text-right">
            <div className="flex justify-between border-b border-slate-300 pb-1 font-bold text-[11px]">
              <span className="w-1/2">الصنف</span>
              <span className="w-1/6 text-center">الكمية</span>
              <span className="w-1/6 text-center">السعر</span>
              <span className="w-1/6 text-left">الإجمالي</span>
            </div>
            <div className="divide-y divide-dashed divide-slate-200 py-1 space-y-1">
              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] pt-1">
                  <span className="w-1/2 truncate font-sans text-slate-800" title={item.medicineName}>
                    {item.medicineName}
                  </span>
                  <span className="w-1/6 text-center font-bold">{item.quantity}{item.saleUnit === 'sub' ? ' وحدة' : ''}</span>
                  <span className="w-1/6 text-center">{item.unitPrice}</span>
                  <span className="w-1/6 text-left font-bold">{item.subtotal}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t-2 border-dashed border-slate-400 pt-3 space-y-1 text-right text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">المجموع الفرعي:</span>
              <span className="font-bold">{invoice.totalAmount.toFixed(2)} {settings.currency}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>الخصم:</span>
                <span>-{invoice.discount.toFixed(2)} {settings.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black border-t border-slate-300 pt-1 text-slate-900">
              <span>صافي الفاتورة:</span>
              <span>{invoice.finalAmount.toFixed(2)} {settings.currency}</span>
            </div>
            <div className="flex justify-between text-slate-700 pt-1 border-t border-dashed border-slate-200">
              <span>المبلغ المدفوع:</span>
              <span>{invoice.paidAmount.toFixed(2)} {settings.currency}</span>
            </div>
            {!!invoice.changeGiven && invoice.changeGiven > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>الباقي للزبون:</span>
                <span>{invoice.changeGiven.toFixed(2)} {settings.currency}</span>
              </div>
            )}
            {invoice.remainingAmount > 0 ? (
              <div className="flex justify-between text-rose-700 font-bold">
                <span>المتبقي (آجل على الحساب):</span>
                <span>{invoice.remainingAmount.toFixed(2)} {settings.currency}</span>
              </div>
            ) : (
              <div className="text-center py-1 text-emerald-700 font-bold text-[11px]">
                تم السداد بالكامل
              </div>
            )}
          </div>

          {invoice.prescription && (
            <div className="text-right text-[11px] border-t border-dashed border-slate-400 pt-2 font-sans text-slate-800">
              <div>المريض: {invoice.prescription.patientName} · الطبيب: {invoice.prescription.doctorName}</div>
              {invoice.prescription.prescriptionNumber && <div>رقم الوصفة: {invoice.prescription.prescriptionNumber}</div>}
            </div>
          )}

          {/* Thank you & credits */}
          <div className="text-xs text-slate-700 font-sans space-y-0.5">
            <p className="font-bold text-slate-700">نتمنى لكم دوام الصحة والعافية</p>
            {settings.receiptFooter && <p>{settings.receiptFooter}</p>}
            <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-200">
              تصميم وتطوير المهندس مالك حريبات 0594345464
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

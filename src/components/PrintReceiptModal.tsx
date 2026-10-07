import React from 'react';
import { Printer, X, CheckCircle, Share2 } from 'lucide-react';
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
            <div className="mt-1 text-[10px] text-slate-400">
              رقم الفاتورة: <span className="font-bold text-slate-800">{invoice.invoiceNumber}</span>
            </div>
            <div className="text-[10px] text-slate-400">التاريخ: {invoice.date}</div>
            <div className="text-[10px] text-slate-500 font-sans">الكاشير: {invoice.cashierName}</div>
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
                  <span className="w-1/6 text-center font-bold">{item.quantity}</span>
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
            {invoice.remainingAmount > 0 ? (
              <div className="flex justify-between text-rose-700 font-bold">
                <span>المتبقي (آجل على الحساب):</span>
                <span>{invoice.remainingAmount.toFixed(2)} {settings.currency}</span>
              </div>
            ) : (
              <div className="text-center py-1 text-emerald-700 font-bold text-[11px]">
                تم السداد بالكامل نقداً
              </div>
            )}
          </div>

          {/* Thermal Barcode simulation */}
          <div className="pt-3 border-t-2 border-dashed border-slate-400 flex flex-col items-center">
            <div className="h-8 w-44 bg-slate-900 flex items-center justify-around px-1 py-0.5 text-white text-[8px] tracking-widest">
              ||| | |||| | ||||| || | ||
            </div>
            <span className="text-[9px] text-slate-400 mt-1">{invoice.invoiceNumber}</span>
          </div>

          {/* Thank you & credits */}
          <div className="text-[10px] text-slate-500 font-sans space-y-0.5">
            <p className="font-bold text-slate-700">نتمنى لكم دوام الصحة والعافية</p>
            <p>البضاعة المباعة تستبدل بموجب هذه الفاتورة خلال 3 أيام</p>
            <p className="text-[9px] text-slate-400 pt-2 border-t border-slate-200">
              تصميم وتطوير المهندس مالك حريبات 0594345464
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

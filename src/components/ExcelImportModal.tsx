import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Database,
  RefreshCw,
  Search,
  Sparkles,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Medicine, AppSettings } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingMedicines: Medicine[];
  settings: AppSettings;
  onImportSuccess: (importedMedicines: Medicine[], updatedMedicines: Medicine[]) => void;
}

interface ColumnMapping {
  tradeName: string;
  sellPrice: string;
  purchasePrice: string;
  stockQuantity: string;
  barcode: string;
  genericName: string;
  category: string;
  unit: string;
  expiryDate: string;
  batchNumber: string;
  manufacturer: string;
  minQuantity: string;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingMedicines,
  settings,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawDataRows, setRawDataRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Column Mapping
  const [mapping, setMapping] = useState<ColumnMapping>({
    tradeName: '',
    sellPrice: '',
    purchasePrice: '',
    stockQuantity: '',
    barcode: '',
    genericName: '',
    category: '',
    unit: '',
    expiryDate: '',
    batchNumber: '',
    manufacturer: '',
    minQuantity: '',
  });

  // Duplicate policy
  const [duplicatePolicy, setDuplicatePolicy] = useState<'update' | 'skip' | 'add_always'>('update');
  const [defaultCategory, setDefaultCategory] = useState<string>('أدوية عامة');
  const [defaultUnit, setDefaultUnit] = useState<string>('علبة');

  // Preview Search
  const [previewSearch, setPreviewSearch] = useState('');

  if (!isOpen) return null;

  // Reset modal state
  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setRawHeaders([]);
    setRawDataRows([]);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 1. Download ready-made Excel template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'اسم الصنف': 'بانادول اكسترا 500 ملغ',
        'سعر البيع': 12.5,
        'سعر الشراء': 8.5,
        'الكمية': 50,
        'الباركود': '6251000123456',
        'الاسم العلمي': 'Paracetamol + Caffeine',
        'التصنيف': 'مسكنات وخافضات حرارة',
        'الوحدة': 'علبة',
        'تاريخ الصلاحية': '2027-10-30',
        'رقم التشغيلة': 'B-9982',
        'الشركة المصنعة': 'GSK',
        'الحد الادنى': 10,
      },
      {
        'اسم الصنف': 'أموكلان 1 غرام أقراص',
        'سعر البيع': 28.0,
        'سعر الشراء': 20.0,
        'الكمية': 30,
        'الباركود': '6251000123457',
        'الاسم العلمي': 'Amoxicillin + Clavulanic Acid',
        'التصنيف': 'مضادات حيوية',
        'الوحدة': 'علبة',
        'تاريخ الصلاحية': '2026-08-15',
        'رقم التشغيلة': 'B-4412',
        'الشركة المصنعة': 'Hikma',
        'الحد الادنى': 5,
      },
      {
        'اسم الصنف': 'فيتامين سي 1000 فوار',
        'سعر البيع': 15.0,
        'سعر الشراء': 10.0,
        'الكمية': 45,
        'الباركود': '6251000123458',
        'الاسم العلمي': 'Ascorbic Acid 1000mg',
        'التصنيف': 'فيتامينات ومكملات',
        'الوحدة': 'أنبوب',
        'تاريخ الصلاحية': '2028-01-01',
        'رقم التشغيلة': 'B-7723',
        'الشركة المصنعة': 'Bayer',
        'الحد الادنى': 10,
      },
      {
        'اسم الصنف': 'قطرة اوتريفين للبالغين',
        'سعر البيع': 9.0,
        'سعر الشراء': 6.0,
        'الكمية': 25,
        'الباركود': '6251000123459',
        'الاسم العلمي': 'Xylometazoline',
        'التصنيف': 'أنف وأذن وحنجرة',
        'الوحدة': 'زجاجة',
        'تاريخ الصلاحية': '2027-05-20',
        'رقم التشغيلة': 'B-5531',
        'الشركة المصنعة': 'Novartis',
        'الحد الادنى': 5,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 26 }, // اسم الصنف
      { wch: 12 }, // سعر البيع
      { wch: 12 }, // سعر الشراء
      { wch: 10 }, // الكمية
      { wch: 18 }, // الباركود
      { wch: 28 }, // الاسم العلمي
      { wch: 22 }, // التصنيف
      { wch: 10 }, // الوحدة
      { wch: 14 }, // تاريخ الصلاحية
      { wch: 14 }, // رقم التشغيلة
      { wch: 16 }, // الشركة المصنعة
      { wch: 12 }, // الحد الادنى
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الأصناف');
    XLSX.writeFile(workbook, 'نموذج_استيراد_اصناف_الصيدلية.xlsx');
  };

  // 2. Handle File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = evt => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('الملف لا يحتوي على أي أوراق عمل (Sheets).');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (!jsonRows || jsonRows.length === 0) {
          throw new Error('ملف الإكسل فارغ ولا يحتوي على بيانات.');
        }

        // Find header row (the first row with string items)
        let headerRowIndex = 0;
        while (
          headerRowIndex < jsonRows.length &&
          (!jsonRows[headerRowIndex] || jsonRows[headerRowIndex].filter(Boolean).length === 0)
        ) {
          headerRowIndex++;
        }

        if (headerRowIndex >= jsonRows.length) {
          throw new Error('لم يتم العثور على صف العناوين أو الأعمدة في الملف.');
        }

        const headers = (jsonRows[headerRowIndex] || []).map((h: any) =>
          String(h || '').trim()
        );

        // Convert the remaining rows to object format
        const rows: any[] = [];
        for (let i = headerRowIndex + 1; i < jsonRows.length; i++) {
          const rowValues = jsonRows[i];
          if (!rowValues || rowValues.every((val: any) => val === undefined || val === null || val === '')) {
            continue; // Skip empty rows
          }

          const rowObj: Record<string, any> = {};
          headers.forEach((header, idx) => {
            if (header) {
              rowObj[header] = rowValues[idx];
            }
          });
          rows.push(rowObj);
        }

        if (rows.length === 0) {
          throw new Error('لا توجد صفوف بيانات تحت صف العناوين.');
        }

        setRawHeaders(headers);
        setRawDataRows(rows);

        // Auto-detect columns
        const detectedMapping = autoDetectColumns(headers);
        setMapping(detectedMapping);

        setStep('mapping');
      } catch (err: any) {
        console.error('Failed to parse Excel:', err);
        setParseError(err.message || 'حدث خطأ أثناء قراءة ملف الإكسل. يرجى التأكد من سلامة الملف.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      setParseError('فشلت قراءة الملف من الجهاز.');
    };

    reader.readAsBinaryString(file);
  };

  // Helper to auto detect column names from headers
  const autoDetectColumns = (headers: string[]): ColumnMapping => {
    const findHeader = (patterns: string[]): string => {
      for (const pattern of patterns) {
        const found = headers.find(h => {
          const clean = h.toLowerCase().replace(/[\s_-]/g, '');
          const patClean = pattern.toLowerCase().replace(/[\s_-]/g, '');
          return clean.includes(patClean) || patClean.includes(clean);
        });
        if (found) return found;
      }
      return '';
    };

    return {
      tradeName: findHeader([
        'اسم الصنف',
        'الاسم التجاري',
        'اسم الدواء',
        'الصنف',
        'الاسم',
        'tradename',
        'itemname',
        'name',
        'item',
        'product',
      ]),
      sellPrice: findHeader([
        'سعر البيع',
        'سعر الجمهور',
        'البيع',
        'السعر',
        'سعر التجزئة',
        'sellprice',
        'retailprice',
        'price',
        'sell',
      ]),
      purchasePrice: findHeader([
        'سعر الشراء',
        'سعر التكلفة',
        'التكلفة',
        'الشراء',
        'سعر الصيدلي',
        'purchaseprice',
        'costprice',
        'cost',
        'purchase',
      ]),
      stockQuantity: findHeader([
        'الكمية',
        'الرصيد',
        'المخزون',
        'عدد العلب',
        'stock',
        'quantity',
        'qty',
        'balance',
      ]),
      barcode: findHeader([
        'الباركود',
        'باركود',
        'الكود',
        'رمز الصنف',
        'barcode',
        'code',
        'upc',
        'ean',
      ]),
      genericName: findHeader([
        'الاسم العلمي',
        'المادة الفعالة',
        'genericname',
        'generic',
        'activeingredient',
        'scientific',
      ]),
      category: findHeader([
        'التصنيف',
        'القسم',
        'المجموعة',
        'category',
        'department',
        'group',
      ]),
      unit: findHeader([
        'الوحدة',
        'نوع العبوة',
        'الشكل',
        'unit',
        'type',
        'package',
      ]),
      expiryDate: findHeader([
        'تاريخ الصلاحية',
        'تاريخ الانتهاء',
        'الصلاحية',
        'الانتهاء',
        'expirydate',
        'expdate',
        'expiry',
        'exp',
      ]),
      batchNumber: findHeader([
        'رقم التشغيلة',
        'التشغيلة',
        'رقم الدفعة',
        'الدفعة',
        'batchnumber',
        'batch',
        'lot',
        'lotnumber',
      ]),
      manufacturer: findHeader([
        'الشركة المصنعة',
        'الشركة',
        'المصنع',
        'الوكيل',
        'manufacturer',
        'company',
        'vendor',
      ]),
      minQuantity: findHeader([
        'الحد الادنى',
        'حد الطلب',
        'نواقص',
        'minquantity',
        'minqty',
        'min',
      ]),
    };
  };

  // Convert raw row to parsed item
  const parseRowToMedicine = (row: any, index: number) => {
    const rawTrade = mapping.tradeName ? row[mapping.tradeName] : '';
    const tradeName = String(rawTrade || '').trim();

    // Parse sell price
    let sellPrice = 0;
    if (mapping.sellPrice && row[mapping.sellPrice] !== undefined) {
      const val = parseFloat(String(row[mapping.sellPrice]).replace(/[^\d.-]/g, ''));
      if (!isNaN(val)) sellPrice = val;
    }

    // Parse purchase price
    let purchasePrice = 0;
    if (mapping.purchasePrice && row[mapping.purchasePrice] !== undefined) {
      const val = parseFloat(String(row[mapping.purchasePrice]).replace(/[^\d.-]/g, ''));
      if (!isNaN(val)) purchasePrice = val;
    } else if (sellPrice > 0) {
      // Default to 75% of sell price if missing
      purchasePrice = Math.round(sellPrice * 0.75 * 100) / 100;
    }

    // Parse quantity
    let stockQuantity = 0;
    if (mapping.stockQuantity && row[mapping.stockQuantity] !== undefined) {
      const val = parseInt(String(row[mapping.stockQuantity]).replace(/[^\d-]/g, ''), 10);
      if (!isNaN(val)) stockQuantity = val;
    }

    // Min quantity
    let minQuantity = 5;
    if (mapping.minQuantity && row[mapping.minQuantity] !== undefined) {
      const val = parseInt(String(row[mapping.minQuantity]).replace(/[^\d-]/g, ''), 10);
      if (!isNaN(val) && val > 0) minQuantity = val;
    }

    // Barcode
    let barcode = '';
    if (mapping.barcode && row[mapping.barcode]) {
      barcode = String(row[mapping.barcode]).trim();
    }
    if (!barcode) {
      // Generate clean barcode
      barcode = `6251${String(index + 1).padStart(4, '0')}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Expiry date format normalization
    let expiryDate = '2028-12-31';
    if (mapping.expiryDate && row[mapping.expiryDate]) {
      const rawExp = row[mapping.expiryDate];
      if (rawExp instanceof Date && !isNaN(rawExp.getTime())) {
        expiryDate = rawExp.toISOString().split('T')[0];
      } else {
        const str = String(rawExp).trim();
        // Check if YYYY-MM-DD or DD/MM/YYYY
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          expiryDate = str;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
          const parts = str.split('/');
          expiryDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    const genericName = mapping.genericName && row[mapping.genericName] ? String(row[mapping.genericName]).trim() : '';
    const category = mapping.category && row[mapping.category] ? String(row[mapping.category]).trim() : defaultCategory;
    const unit = mapping.unit && row[mapping.unit] ? String(row[mapping.unit]).trim() : defaultUnit;
    const batchNumber = mapping.batchNumber && row[mapping.batchNumber]
      ? String(row[mapping.batchNumber]).trim()
      : `BATCH-${Math.floor(100 + Math.random() * 900)}`;
    const manufacturer = mapping.manufacturer && row[mapping.manufacturer] ? String(row[mapping.manufacturer]).trim() : '';

    return {
      tradeName,
      sellPrice,
      purchasePrice,
      stockQuantity,
      minQuantity,
      barcode,
      genericName,
      category: category || defaultCategory,
      unit: unit || defaultUnit,
      expiryDate,
      batchNumber,
      manufacturer,
      isValid: Boolean(tradeName),
    };
  };

  // Preview items
  const parsedItems = rawDataRows.map((row, idx) => parseRowToMedicine(row, idx));
  const validItems = parsedItems.filter(item => item.isValid);
  const invalidCount = parsedItems.length - validItems.length;

  // Final confirmation & commit
  const handleExecuteImport = () => {
    if (validItems.length === 0) {
      alert('لا توجد أصناف صالحة للاستيراد!');
      return;
    }

    const newlyAdded: Medicine[] = [];
    const updatedMeds: Medicine[] = [];

    // Map existing medicines by barcode and name (lowercased)
    const existingByBarcode = new Map<string, Medicine>();
    const existingByName = new Map<string, Medicine>();

    existingMedicines.forEach(med => {
      if (med.barcode) existingByBarcode.set(med.barcode.trim(), med);
      if (med.tradeName) existingByName.set(med.tradeName.trim().toLowerCase(), med);
    });

    validItems.forEach((item, idx) => {
      const matchByBarcode = item.barcode ? existingByBarcode.get(item.barcode.trim()) : undefined;
      const matchByName = item.tradeName ? existingByName.get(item.tradeName.trim().toLowerCase()) : undefined;
      const matchedMed = matchByBarcode || matchByName;

      if (matchedMed && duplicatePolicy === 'skip') {
        // Skip existing
        return;
      }

      if (matchedMed && duplicatePolicy === 'update') {
        // Update existing item's price, and add or replace stock
        const updated: Medicine = {
          ...matchedMed,
          tradeName: item.tradeName || matchedMed.tradeName,
          sellPrice: item.sellPrice > 0 ? item.sellPrice : matchedMed.sellPrice,
          purchasePrice: item.purchasePrice > 0 ? item.purchasePrice : matchedMed.purchasePrice,
          stockQuantity: matchedMed.stockQuantity + item.stockQuantity, // Add to current stock
          barcode: item.barcode || matchedMed.barcode,
          genericName: item.genericName || matchedMed.genericName,
          category: item.category || matchedMed.category,
          unit: item.unit || matchedMed.unit,
          expiryDate: item.expiryDate || matchedMed.expiryDate,
          batchNumber: item.batchNumber || matchedMed.batchNumber,
          manufacturer: item.manufacturer || matchedMed.manufacturer,
        };
        updatedMeds.push(updated);
        return;
      }

      // Add as brand new medicine
      const newMed: Medicine = {
        id: `med-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        barcode: item.barcode,
        tradeName: item.tradeName,
        genericName: item.genericName,
        category: item.category,
        unit: item.unit,
        stockQuantity: item.stockQuantity,
        minQuantity: item.minQuantity,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        manufacturer: item.manufacturer,
      };
      newlyAdded.push(newMed);
    });

    onImportSuccess(newlyAdded, updatedMeds);
    onClose();
  };

  const filteredPreview = parsedItems.filter(item => {
    if (!previewSearch) return true;
    const q = previewSearch.toLowerCase();
    return (
      item.tradeName.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q) ||
      item.genericName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>استيراد الأصناف والأسعار عبر ملف إكسل</span>
                <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Excel / CSV (.xlsx)
                </span>
              </h3>
              <p className="text-xs text-white/90 font-medium">
                إضافة مئات أو آلاف الأصناف مع أسعار البيع والشراء والكميات بضغطة زر واحدة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Breadcrumbs */}
        <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-1.5 font-bold ${
                step === 'upload' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>رفع الملف أو القالب</span>
            </div>

            <span className="text-slate-300">←</span>

            <div
              className={`flex items-center gap-1.5 font-bold ${
                step === 'mapping' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-[10px]">
                2
              </span>
              <span>تطابق الأعمدة (الاسم، السعر، المخزون)</span>
            </div>

            <span className="text-slate-300">←</span>

            <div
              className={`flex items-center gap-1.5 font-bold ${
                step === 'preview' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-[10px]">
                3
              </span>
              <span>المعاينة والتأكيد</span>
            </div>
          </div>

          {step !== 'upload' && (
            <button
              onClick={handleReset}
              className="text-[11px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>إلغاء واختيار ملف آخر</span>
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: UPLOAD & TEMPLATE */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Template Download Hero Card */}
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-cyan-950/30 border border-teal-200 dark:border-teal-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white font-black text-[10px]">
                      موصى به
                    </span>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm">
                      تحميل نموذج إكسل جاهز ومعبأ بأمثلة
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    يمكنك تحميل ملف إكسل منسق وجاهز يحتوي على كافة الأعمدة (الاسم، سعر البيع والشراء، الكمية، الباركود...) وتعبئته مباشرة ببيانات أدويتك.
                  </p>
                </div>

                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل نموذج الإكسل (.xlsx)</span>
                </button>
              </div>

              {/* Upload Drag & Drop Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-300 dark:border-teal-700/60 hover:border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50/80 rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-3xl bg-teal-600/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>

                <h4 className="text-base font-black text-slate-900 dark:text-white mb-1">
                  انقر هنا لاختيار ملف إكسل أو اسحبه وأفلته
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  يدعم الملفات بصيغ Excel (.xlsx, .xls) وكذلك CSV. يمكنك استيراد أي ملف لديك من شركات الأدوية أو المستودعات أو برنامجك القديم.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-teal-700 dark:text-teal-300 font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-teal-100 dark:border-teal-900">
                    ✓ التعرف التلقائي على الأعمدة
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-teal-100 dark:border-teal-900">
                    ✓ توليد باركود تلقائي للأصناف الناقصة
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-teal-100 dark:border-teal-900">
                    ✓ خيارات لتحديث الأسعار أو دمج الكميات
                  </span>
                </div>
              </div>

              {/* Parsing status / error */}
              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-teal-600 font-bold text-xs py-4">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري تحليل وقراءة بيانات ملف الإكسل...</span>
                </div>
              )}

              {parseError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="font-semibold">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING & SETTINGS */}
          {step === 'mapping' && (
            <div className="space-y-6">
              {/* File summary */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">الملف المرفوع: </span>
                  <span className="font-black text-teal-700 dark:text-teal-300">{fileName}</span>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="text-slate-500 dark:text-slate-400">عدد الصفوف المكتشفة: </span>
                  <span className="font-black text-slate-800 dark:text-white">{rawDataRows.length} صنف</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800">
                    ✨ تم كشف الأعمدة ذاتياً
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>تحديد أعمدة ملف الإكسل المناسبة</span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-full font-bold">
                    قم بمطابقة أسماء الأعمدة في ملفك
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  يرجى التأكد من اختيار العمود الذي يحتوي على <b>اسم الصنف</b> و<b>سعر البيع</b> كحد أدنى. باقي الأعمدة اختيارية وسيتم ملؤها بقيم ذكية تلقائياً.
                </p>
              </div>

              {/* Mapping Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Trade Name (Required) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-teal-300 dark:border-teal-700 shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>اسم الصنف / الدواء</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">إلزامي</span>
                  </div>
                  <select
                    value={mapping.tradeName}
                    onChange={e => setMapping({ ...mapping, tradeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- اختر العمود المقابل لاسم الصنف --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Sell Price (Required) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-teal-300 dark:border-teal-700 shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>سعر البيع للجمهور ({settings.currency})</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">إلزامي</span>
                  </div>
                  <select
                    value={mapping.sellPrice}
                    onChange={e => setMapping({ ...mapping, sellPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- اختر عمود سعر البيع --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Purchase Price (Optional) */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    سعر الشراء / التكلفة ({settings.currency})
                  </label>
                  <select
                    value={mapping.purchasePrice}
                    onChange={e => setMapping({ ...mapping, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- اختياري (إن وجد) --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Stock Quantity (Optional) */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    الكمية / رصيد المخزون الحالي
                  </label>
                  <select
                    value={mapping.stockQuantity}
                    onChange={e => setMapping({ ...mapping, stockQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- اختياري (إن وجد) --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Barcode (Optional) */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    الباركود (Barcode)
                  </label>
                  <select
                    value={mapping.barcode}
                    onChange={e => setMapping({ ...mapping, barcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- اختياري (يولد تلقائياً إن ترك فارغاً) --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Generic Name (Optional) */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    الاسم العلمي / المادة الفعالة
                  </label>
                  <select
                    value={mapping.genericName}
                    onChange={e => setMapping({ ...mapping, genericName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- اختياري --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 7. Category (Optional) */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    التصنيف / القسم
                  </label>
                  <select
                    value={mapping.category}
                    onChange={e => setMapping({ ...mapping, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- اختياري --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 8. Expiry Date (Optional) */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    تاريخ انتهاء الصلاحية
                  </label>
                  <select
                    value={mapping.expiryDate}
                    onChange={e => setMapping({ ...mapping, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- اختياري --</option>
                    {rawHeaders.map((h, i) => (
                      <option key={i} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Policy for Duplicate Items */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-600" />
                  <span>طريقة التعامل مع الأصناف الموجودة مسبقاً في الصيدلية</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                      duplicatePolicy === 'update'
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 font-bold shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dupPolicy"
                      checked={duplicatePolicy === 'update'}
                      onChange={() => setDuplicatePolicy('update')}
                      className="mt-0.5 text-teal-600"
                    />
                    <div>
                      <div className="font-bold">تحديث الأسعار وإضافة الكمية</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        يعدّل السعر ويضيف الكمية الجديدة للرصيد الحالي (موصى به).
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                      duplicatePolicy === 'skip'
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 font-bold shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dupPolicy"
                      checked={duplicatePolicy === 'skip'}
                      onChange={() => setDuplicatePolicy('skip')}
                      className="mt-0.5 text-teal-600"
                    />
                    <div>
                      <div className="font-bold">تخطي الأصناف المكررة</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        إضافة الأصناف الجديدة فقط دون لمس الأصناف القديمة.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                      duplicatePolicy === 'add_always'
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 font-bold shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dupPolicy"
                      checked={duplicatePolicy === 'add_always'}
                      onChange={() => setDuplicatePolicy('add_always')}
                      className="mt-0.5 text-teal-600"
                    />
                    <div>
                      <div className="font-bold">إضافة كأصناف جديدة دائماً</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        تكرار الصنف كدفعة منفصلة برقم كود جديد.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Navigation button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  الرجوع لاختيار ملف
                </button>

                <button
                  disabled={!mapping.tradeName}
                  onClick={() => setStep('preview')}
                  className="px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <span>متابعة لمعاينة البيانات المجهزة ({rawDataRows.length} صنف)</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & CONFIRM */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                  <div className="text-[11px] text-teal-600 dark:text-teal-400 font-bold">إجمالي الأصناف بالملف</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {rawDataRows.length}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">أصناف صالحة للاستيراد</div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {validItems.length}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800">
                  <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-bold">إجمالي كميات المخزون</div>
                  <div className="text-xl font-black text-cyan-700 dark:text-cyan-300 mt-0.5">
                    {validItems.reduce((acc, it) => acc + it.stockQuantity, 0).toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">سياسة التكرار المختارة</div>
                  <div className="text-xs font-black text-indigo-700 dark:text-indigo-300 mt-1.5 truncate">
                    {duplicatePolicy === 'update' ? 'تحديث الأسعار وإضافة الكمية' : duplicatePolicy === 'skip' ? 'تخطي المكرر' : 'إضافة كجديد'}
                  </div>
                </div>
              </div>

              {invalidCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    هناك {invalidCount} صنف تم تجاهلهم لأن اسم الصنف فارغ في ملف الإكسل.
                  </span>
                </div>
              )}

              {/* Table search & preview header */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={e => setPreviewSearch(e.target.value)}
                    placeholder="بحث سريع في جدول المعاينة..."
                    className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="text-xs text-slate-500 font-semibold self-center">
                  عرض {Math.min(filteredPreview.length, 50)} من أصل {filteredPreview.length} صنف
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black sticky top-0 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">اسم الصنف</th>
                      <th className="py-2 px-3">سعر البيع ({settings.currency})</th>
                      <th className="py-2 px-3">سعر الشراء</th>
                      <th className="py-2 px-3">الكمية</th>
                      <th className="py-2 px-3">الباركود</th>
                      <th className="py-2 px-3">التصنيف</th>
                      <th className="py-2 px-3">الصلاحية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPreview.slice(0, 50).map((item, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          !item.isValid ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-100">
                          {item.tradeName || <span className="text-rose-500 italic">بدون اسم (مرفوض)</span>}
                        </td>
                        <td className="py-2 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {item.sellPrice.toLocaleString()} {settings.currency}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {item.purchasePrice > 0 ? `${item.purchasePrice.toLocaleString()} ${settings.currency}` : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold">
                          {item.stockQuantity} {item.unit}
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-400">
                          {item.barcode}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{item.category}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px] font-mono">{item.expiryDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirmation Action Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  الرجوع لتعديل الأعمدة
                </button>

                <button
                  onClick={handleExecuteImport}
                  className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>تأكيد واستيراد {validItems.length} صنف إلى المخزون فوراً</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Entity,
  Medicine,
  SaleInvoice,
  FinancialTransaction,
  Expense,
  AppSettings,
  UserRole,
  TransactionType,
  PurchaseInvoice,
  StockMovement,
  Shift,
} from './types';
import { AppStorage, defaultSettings } from './services/storage';
import { ThemeService, ThemeId } from './services/themeService';
import { SupabaseService } from './services/supabaseService';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { SplashScreen } from './components/SplashScreen';
import { SecurityLockModal } from './components/SecurityLockModal';
import { DashboardView } from './views/DashboardView';
import { EntitiesView } from './views/EntitiesView';
import { POSView } from './views/POSView';
import { InventoryView } from './views/InventoryView';
import { ExpensesView } from './views/ExpensesView';
import { InstanceLoginModal } from './components/InstanceLoginModal';
import { FirstTimeSetupModal } from './components/FirstTimeSetupModal';
import { InstanceService } from './services/instanceService';
import { uid, round2 } from './services/saleService';
import {
  applySaleToMedicines,
  makeMovement,
  normalizeMedicine,
  normalizeMedicines,
  receiveBatch,
  removeFromBatch,
  setBatchQuantity,
  packSizeOf,
  expiringBatches,
} from './services/inventoryService';
import { AuditService } from './services/auditService';
import { AlertCircle, Key, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

// تحميل كسول: هذه الشاشات والنوافذ لا تُحمَّل إلا عند فتحها (يقلل حجم التحميل الأول)
const AboutModal = lazy(() => import('./components/AboutModal').then(m => ({ default: m.AboutModal })));
const ThemeSelectorModal = lazy(() => import('./components/ThemeSelectorModal').then(m => ({ default: m.ThemeSelectorModal })));
const DeviceSyncModal = lazy(() => import('./components/DeviceSyncModal').then(m => ({ default: m.DeviceSyncModal })));
const SupabaseSyncModal = lazy(() => import('./components/SupabaseSyncModal').then(m => ({ default: m.SupabaseSyncModal })));
const PharmacyInstanceManagerModal = lazy(() => import('./components/PharmacyInstanceManagerModal').then(m => ({ default: m.PharmacyInstanceManagerModal })));
const ReportsView = lazy(() => import('./views/ReportsView').then(m => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));
const SuperAdminView = lazy(() => import('./views/SuperAdminView').then(m => ({ default: m.SuperAdminView })));
const PurchasesView = lazy(() => import('./views/PurchasesView').then(m => ({ default: m.PurchasesView })));
const TransactionsView = lazy(() => import('./views/TransactionsView').then(m => ({ default: m.TransactionsView })));

export default function App() {
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // State from LocalStorage
  const [entities, setEntities] = useState<Entity[]>(() => AppStorage.getEntities());
  const [medicines, setMedicines] = useState<Medicine[]>(() => AppStorage.getMedicines());
  const [sales, setSales] = useState<SaleInvoice[]>(() => AppStorage.getSales());
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() =>
    AppStorage.getTransactions()
  );
  const [expenses, setExpenses] = useState<Expense[]>(() => AppStorage.getExpenses());
  const [settings, setSettings] = useState<AppSettings>(() => AppStorage.getSettings());
  const [purchases, setPurchases] = useState<PurchaseInvoice[]>(() => AppStorage.getPurchases());
  const [movements, setMovements] = useState<StockMovement[]>(() => AppStorage.getMovements());
  const [shifts, setShifts] = useState<Shift[]>(() => AppStorage.getShifts());

  // Theme State
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(() => ThemeService.getStoredTheme());

  // UI Navigation & Modals
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>(() => AppStorage.getCurrentRole());
  const [isLocked, setIsLocked] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showDeviceSyncModal, setShowDeviceSyncModal] = useState(false);
  const [showInstanceManagerModal, setShowInstanceManagerModal] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [selectedEntityForLedger, setSelectedEntityForLedger] = useState<Entity | null>(null);
  const [isInstanceUnlocked, setIsInstanceUnlocked] = useState<boolean>(() =>
    InstanceService.isInstanceAuthenticated(InstanceService.getActiveInstanceId())
  );

  // Switch active pharmacy workspace instance
  const handleSwitchInstance = useCallback((newInstanceId: string) => {
    InstanceService.setActiveInstanceId(newInstanceId);
    setEntities(AppStorage.getEntities(newInstanceId));
    setMedicines(AppStorage.getMedicines(newInstanceId));
    setSales(AppStorage.getSales(newInstanceId));
    setTransactions(AppStorage.getTransactions(newInstanceId));
    setExpenses(AppStorage.getExpenses(newInstanceId));
    setSettings(AppStorage.getSettings(newInstanceId));
    setPurchases(AppStorage.getPurchases(newInstanceId));
    setMovements(AppStorage.getMovements(newInstanceId));
    setShifts(AppStorage.getShifts(newInstanceId));
    setIsInstanceUnlocked(InstanceService.isInstanceAuthenticated(newInstanceId));
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    ThemeService.applyTheme(currentThemeId);
  }, [currentThemeId]);

  // Persist current role
  useEffect(() => {
    AppStorage.setCurrentRole(currentRole);
  }, [currentRole]);

  // Handle switching role between regular pharmacist and admin/super_admin
  const handleToggleRole = () => {
    if (currentRole === 'pharmacist') {
      setIsLocked(true); // Prompts for Admin PIN
    } else {
      // One-click drop permissions back to regular user (pharmacist) for security
      setCurrentRole('pharmacist');
      if (currentTab === 'reports' || currentTab === 'settings' || currentTab === 'super_admin' || currentTab === 'purchases') {
        setCurrentTab('dashboard');
      }
      showToast('تم تفعيل وضع المستخدم العادي (الصيدلي / الكاشير) وحجب الصلاحيات الإدارية 👤', 'info');
    }
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    setCurrentThemeId(themeId);
    ThemeService.applyTheme(themeId);
  };

  // Check URL parameters for instance/pharmacy or 1-click QR Pairing from other devices
  useEffect(() => {
    (async () => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);

        // 1. Check for isolated pharmacy instance code in URL (?instance=... or ?pharmacy=...)
        const instanceParam = params.get('instance') || params.get('pharmacy');
        let targetInstanceId = InstanceService.getActiveInstanceId();

        if (instanceParam) {
          const targetCode = decodeURIComponent(instanceParam).trim();
          const allInstances = InstanceService.getInstances();
          const found = allInstances.find(
            i => i.id === targetCode || i.code.toLowerCase() === targetCode.toLowerCase()
          );
          if (found) {
            targetInstanceId = found.id;
            handleSwitchInstance(found.id);
          } else {
            // Auto-register instance if opened via link
            const newInst = await InstanceService.createInstance({
              pharmacyName: targetCode.startsWith('PH-') ? `صيدلية (${targetCode})` : targetCode,
              ownerName: 'الصيدلي المسؤول',
              phone: '0590000000',
              customCode: targetCode.toUpperCase(),
              initEmpty: true,
            });
            targetInstanceId = newInst.id;
            handleSwitchInstance(newInst.id);
          }
        }

        // 2. Check for Supabase sync parameters
        const syncUrl = params.get('sync_url');
        const syncKey = params.get('sync_key');
        if (syncUrl && syncKey) {
          const currentConfig = SupabaseService.getConfig(targetInstanceId);
          const decodedUrl = decodeURIComponent(syncUrl);
          // أمان: لا نربط الجهاز بخادم من رابط إلا إذا كان https وبموافقة صريحة من المستخدم
          let urlOk = false;
          try {
            urlOk = new URL(decodedUrl).protocol === 'https:';
          } catch {}
          const approved =
            urlOk &&
            (currentConfig.url === decodedUrl ||
              window.confirm(
                `يطلب هذا الرابط ربط الجهاز بقاعدة البيانات التالية:\n${decodedUrl}\n\nقد تُستبدل بياناتك المحلية ببيانات هذا الخادم. هل تثق بمصدر الرابط وتريد المتابعة؟`
              ));
          if (!approved) {
            window.history.replaceState({}, document.title, window.location.pathname);
          } else if (currentConfig.url !== decodedUrl || currentConfig.anonKey !== syncKey) {
            SupabaseService.saveConfig(
              {
                url: decodeURIComponent(syncUrl),
                anonKey: decodeURIComponent(syncKey),
                isConnected: true,
                lastSyncedAt: new Date().toLocaleTimeString('ar-EG'),
              },
              targetInstanceId
            );
            showToast('🎉 تم ربط هذا الجهاز تلقائياً بقاعدة بيانات الصيدلية السحابية (Supabase) بنجاح!', 'success');
            // Clean URL query to keep it clean
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    } catch (e) {
      console.warn('URL query param parse failed:', e);
    }
    })();
  }, [handleSwitchInstance]);

  // Sync to localStorage whenever states change
  useEffect(() => {
    AppStorage.saveEntities(entities);
  }, [entities]);

  useEffect(() => {
    AppStorage.saveMedicines(medicines);
  }, [medicines]);

  useEffect(() => {
    AppStorage.saveSales(sales);
  }, [sales]);

  useEffect(() => {
    AppStorage.saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    AppStorage.saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    AppStorage.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    AppStorage.savePurchases(purchases);
  }, [purchases]);

  useEffect(() => {
    AppStorage.saveMovements(movements);
  }, [movements]);

  useEffect(() => {
    AppStorage.saveShifts(shifts);
  }, [shifts]);

  // تنبيه المستخدم إذا فشل الحفظ (مثلاً امتلاء مساحة المتصفح) بدل الفشل الصامت
  useEffect(() => {
    const onStorageError = () =>
      showToast('تعذّر حفظ البيانات على هذا الجهاز (المساحة ممتلئة أو التخزين محظور). صدّر نسخة احتياطية الآن.', 'error');
    window.addEventListener('pharma:storage-error', onStorageError);
    return () => window.removeEventListener('pharma:storage-error', onStorageError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global Keyboard shortcuts (e.g. F2 for POS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setCurrentTab('pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // إدارة الجلسات: تسجيل خروج تلقائي بعد فترة خمول (15–30 دقيقة)
  useEffect(() => {
    const timeoutMinutes = settings.sessionTimeoutMinutes || 20;

    const resetActivity = () => {
      AppStorage.updateLastActivity();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(evt => window.addEventListener(evt, resetActivity, { passive: true }));

    // فحص انتهاء مدة الجلسة كل 30 ثانية
    const interval = setInterval(() => {
      if (currentRole !== 'pharmacist' && AppStorage.isSessionExpired(timeoutMinutes)) {
        AppStorage.invalidateSession();
        setCurrentRole('pharmacist');
        setIsLocked(true);
        showToast(
          `🔒 تم قفل النظام تلقائياً بسبب الخمول لأكثر من ${timeoutMinutes} دقيقة لحماية بيانات الصيدلية.`,
          'info'
        );
      }
    }, 30000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, resetActivity));
      clearInterval(interval);
    };
  }, [currentRole, settings.sessionTimeoutMinutes, showToast]);

  // المزامنة الدورية إلى Supabase كل 10 دقائق إذا كان متصلاً
  useEffect(() => {
    const activeInstId = InstanceService.getActiveInstanceId();
    const config = SupabaseService.getConfig(activeInstId);
    if (!config.isConnected) return;

    const syncInterval = setInterval(async () => {
      try {
        await SupabaseService.pushAllDataToSupabase(
          entities,
          medicines,
          sales,
          transactions,
          expenses,
          settings
        );
      } catch (err) {
        console.warn('Periodic background Supabase sync failed:', err);
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(syncInterval);
  }, [entities, medicines, sales, transactions, expenses]);

  // Notifications calculation
  const now = new Date();

  const nearExpiryCount = new Set(
    expiringBatches(medicines || [], settings.nearExpiryDays ?? 90).map(x => x.medicine.id)
  ).size;

  const lowStockCount = (medicines || []).filter(m => m && m.stockQuantity <= m.minQuantity).length;

  // اسم المسؤول الحالي لتسجيله في الحركات وسجل التدقيق
  const actorName = (): string =>
    currentRole === 'pharmacist' || currentRole === 'accountant'
      ? 'صيدلي مناوب'
      : settings.ownerName || 'المدير';

  // Add Transaction & Update Entity Balance
  const handleAddTransaction = (
    entityId: string,
    amount: number,
    type: TransactionType,
    direction: 'debit' | 'credit',
    note: string,
    referenceNumber: string
  ) => {
    const entity = entities.find(e => e.id === entityId);
    if (!entity) return;

    if (!(amount > 0) || !Number.isFinite(amount)) {
      showToast('المبلغ يجب أن يكون رقماً أكبر من صفر.', 'error');
      return;
    }
    amount = round2(amount);
    const newBalance = round2(
      direction === 'debit' ? entity.currentBalance + amount : entity.currentBalance - amount
    );

    const nowStr = new Date();
    const dateFormatted = `${nowStr.toISOString().split('T')[0]} ${nowStr.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const newTx: FinancialTransaction = {
      id: uid('tx'),
      entityId,
      entityName: entity.name,
      date: dateFormatted,
      amount,
      type,
      direction,
      balanceAfter: newBalance,
      referenceNumber: referenceNumber || uid('REF').toUpperCase().slice(0, 14),
      note,
      recordedBy: (currentRole === 'pharmacist' || currentRole === 'accountant' ? 'صيدلي مناوب' : (settings.ownerName || 'المدير')),
    };

    setTransactions(prev => [newTx, ...prev]);

    // Update entity
    setEntities(prev =>
      prev.map(e => (e.id === entityId ? { ...e, currentBalance: newBalance } : e))
    );

    // If currently selected entity for modal, update its state as well
    if (selectedEntityForLedger && selectedEntityForLedger.id === entityId) {
      setSelectedEntityForLedger(prev => (prev ? { ...prev, currentBalance: newBalance } : null));
    }
  };

  // Add Entity
  const handleAddEntity = (newEntityData: Omit<Entity, 'id' | 'createdAt'>) => {
    const newEnt: Entity = {
      ...newEntityData,
      id: uid('ent'),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setEntities(prev => [newEnt, ...prev]);
    showToast(`تمت إضافة ${newEnt.name} بنجاح`, 'success');
  };

  // Update Entity
  const handleUpdateEntity = (updated: Entity) => {
    setEntities(prev => prev.map(e => (e.id === updated.id ? updated : e)));
    // Sync entityName on transactions
    setTransactions(prev =>
      prev.map(t => (t.entityId === updated.id ? { ...t, entityName: updated.name } : t))
    );
    if (selectedEntityForLedger && selectedEntityForLedger.id === updated.id) {
      setSelectedEntityForLedger(updated);
    }
    showToast(`تم تحديث بيانات ${updated.name} بنجاح`, 'success');
  };

  // Delete Entity
  const handleDeleteEntity = (entityId: string) => {
    const target = entities.find(e => e.id === entityId);
    AuditService.log('حذف حساب', `${target ? target.name : entityId} (الرصيد ${target ? target.currentBalance : '-'})`, actorName());
    setEntities(prev => prev.filter(e => e.id !== entityId));
    if (selectedEntityForLedger && selectedEntityForLedger.id === entityId) {
      setSelectedEntityForLedger(null);
    }
    showToast(`تم حذف حساب ${target ? target.name : ''} بنجاح`, 'info');
  };

  // Update Transaction
  const handleUpdateTransaction = (updatedTx: FinancialTransaction) => {
    const oldTx = transactions.find(t => t.id === updatedTx.id);
    if (!oldTx) return;

    // Calculate balance difference on entity
    const oldEffect = oldTx.direction === 'debit' ? oldTx.amount : -oldTx.amount;
    const newEffect = updatedTx.direction === 'debit' ? updatedTx.amount : -updatedTx.amount;
    const diff = newEffect - oldEffect;

    setTransactions(prev => prev.map(t => (t.id === updatedTx.id ? updatedTx : t)));

    if (diff !== 0) {
      setEntities(prev =>
        prev.map(e => {
          if (e.id === updatedTx.entityId) {
            const nextBal = round2(e.currentBalance + diff);
            return { ...e, currentBalance: nextBal };
          }
          return e;
        })
      );
    }

    AuditService.log('تعديل حركة مالية', `${oldTx.referenceNumber}: ${oldTx.amount} → ${updatedTx.amount} (${oldTx.entityName})`, actorName());
    showToast('تم تحديث الحركة المالية بنجاح', 'success');
  };

  // Delete Transaction
  const handleDeleteTransaction = (transactionId: string) => {
    const targetTx = transactions.find(t => t.id === transactionId);
    if (!targetTx) return;

    // Reverse financial effect on entity
    const reversal = targetTx.direction === 'debit' ? -targetTx.amount : targetTx.amount;

    setTransactions(prev => prev.filter(t => t.id !== transactionId));

    setEntities(prev =>
      prev.map(e => {
        if (e.id === targetTx.entityId) {
          const nextBal = round2(e.currentBalance + reversal);
          return { ...e, currentBalance: nextBal };
        }
        return e;
      })
    );

    AuditService.log('حذف حركة مالية', `${targetTx.referenceNumber}: ${targetTx.amount} (${targetTx.entityName})`, actorName());
    showToast(`تم حذف الحركة ${targetTx.referenceNumber} بنجاح`, 'info');
  };

  // الوردية المفتوحة حالياً (إن وُجدت)
  const currentShift = shifts.find(sh => !sh.closedAt) || null;

  // Complete a Sale Invoice from POS
  const handleCompleteSale = (sale: SaleInvoice) => {
    if (sales.some(s => s.invoiceNumber === sale.invoiceNumber)) return; // منع التسجيل المزدوج
    const saleWithShift: SaleInvoice = currentShift ? { ...sale, shiftId: currentShift.id } : sale;

    // 1. خصم المخزون (الأقدم انتهاءً أولاً) وتوليد حركات المخزون
    const applied = applySaleToMedicines(medicines, saleWithShift.items, {
      invoiceNumber: saleWithShift.invoiceNumber,
      actor: saleWithShift.cashierName,
    });
    if (applied.failures.length > 0) {
      console.warn('Sale stock failures:', applied.failures);
    }
    setMedicines(applied.medicines);
    setMovements(prev => [...prev, ...applied.movements]);

    // 2. حفظ الفاتورة
    setSales(prev => [saleWithShift, ...prev]);

    // 3. إذا كان البيع آجلاً: تسجيل الحركة المالية وتحديث رصيد الحساب
    if (saleWithShift.entityId && saleWithShift.remainingAmount > 0) {
      handleAddTransaction(
        saleWithShift.entityId,
        saleWithShift.remainingAmount,
        'invoice',
        'debit',
        `فاتورة مبيعات آجل رقم ${saleWithShift.invoiceNumber}`,
        saleWithShift.invoiceNumber
      );
    }
  };

  // Inventory handlers
  const handleAddMedicine = (newMed: Omit<Medicine, 'id'>) => {
    const id = uid('med');
    const med: Medicine = normalizeMedicine({ ...newMed, id } as Medicine);
    setMedicines(prev => [med, ...prev]);
    if (med.stockQuantity > 0) {
      setMovements(prev => [
        ...prev,
        makeMovement({ med, type: 'initial', packsDelta: med.stockQuantity, batchNumber: med.batchNumber, note: 'رصيد افتتاحي عند إضافة الصنف', actor: actorName() }),
      ]);
    }
  };

  const handleUpdateMedicine = (updatedMed: Medicine) => {
    const old = medicines.find(m => m.id === updatedMed.id);
    const next = normalizeMedicine(updatedMed);
    setMedicines(prev => prev.map(m => (m.id === next.id ? next : m)));
    if (old) {
      const delta = next.stockQuantity - old.stockQuantity;
      if (delta !== 0) {
        setMovements(prev => [
          ...prev,
          makeMovement({ med: next, type: 'adjustment', packsDelta: delta, note: 'تعديل يدوي من شاشة الصنف', actor: actorName() }),
        ]);
        AuditService.log('تعديل كمية', `${next.tradeName}: ${old.stockQuantity} → ${next.stockQuantity}`, actorName());
      }
      if (old.sellPrice !== next.sellPrice || old.purchasePrice !== next.purchasePrice) {
        AuditService.log(
          'تعديل سعر',
          `${next.tradeName}: بيع ${old.sellPrice}→${next.sellPrice}، تكلفة ${old.purchasePrice}→${next.purchasePrice}`,
          actorName()
        );
      }
    }
  };

  const handleDeleteMedicine = (id: string) => {
    const med = medicines.find(m => m.id === id);
    if (med) {
      AuditService.log('حذف صنف', `${med.tradeName} (الكمية ${med.stockQuantity})`, actorName());
      if (med.stockQuantity > 0) {
        setMovements(prev => [
          ...prev,
          makeMovement({ med, type: 'write_off', packsDelta: -med.stockQuantity, note: 'حذف الصنف من النظام', actor: actorName() }),
        ]);
      }
    }
    setMedicines(prev => prev.filter(m => m.id !== id));
  };

  const handleBulkImportMedicines = (newMeds: Medicine[], updatedMeds: Medicine[]) => {
    const normalizedNew = normalizeMedicines(newMeds);
    const normalizedUpd = normalizeMedicines(updatedMeds);
    const oldById = new Map(medicines.map(m => [m.id, m]));
    const moves: StockMovement[] = [];
    for (const m of normalizedNew) {
      if (m.stockQuantity > 0)
        moves.push(makeMovement({ med: m, type: 'initial', packsDelta: m.stockQuantity, note: 'استيراد من Excel', actor: actorName() }));
    }
    for (const m of normalizedUpd) {
      const o = oldById.get(m.id);
      const d = o ? m.stockQuantity - o.stockQuantity : 0;
      if (d !== 0) moves.push(makeMovement({ med: m, type: 'adjustment', packsDelta: d, note: 'تحديث من استيراد Excel', actor: actorName() }));
    }
    setMedicines(prev => {
      const updatedMap = new Map(normalizedUpd.map(m => [m.id, m]));
      const updatedList = prev.map(m => updatedMap.get(m.id) || m);
      return [...normalizedNew, ...updatedList];
    });
    if (moves.length) setMovements(prev => [...prev, ...moves]);
    AuditService.log('استيراد Excel', `جديد ${normalizedNew.length}، محدَّث ${normalizedUpd.length}`, actorName());
  };

  // إخراج مخزون: مرتجع لشركة أو إتلاف أو تسوية جرد
  const handleRemoveStock = (
    items: { medicineId: string; batchId: string; packs: number }[],
    kind: 'supplier_return' | 'write_off',
    opts: { entityId?: string; note?: string } = {}
  ): { ok: boolean; error?: string; value: number } => {
    let working = [...medicines];
    const moves: StockMovement[] = [];
    let value = 0;
    for (const it of items) {
      const idx = working.findIndex(m => m.id === it.medicineId);
      if (idx < 0) return { ok: false, error: 'صنف غير موجود', value: 0 };
      const med = normalizeMedicine(working[idx]);
      const batch = med.batches?.find(b => b.id === it.batchId);
      const r = removeFromBatch(med, it.batchId, it.packs);
      if (!r.ok || !r.medicine) return { ok: false, error: r.error, value: 0 };
      working[idx] = r.medicine;
      value += round2(it.packs * (batch?.purchasePrice || 0));
      moves.push(
        makeMovement({
          med,
          type: kind,
          packsDelta: -it.packs,
          batchNumber: batch?.batchNumber,
          note: opts.note || (kind === 'supplier_return' ? 'مرتجع لشركة' : 'إتلاف'),
          actor: actorName(),
        })
      );
    }
    value = round2(value);
    setMedicines(working);
    setMovements(prev => [...prev, ...moves]);
    AuditService.log(
      kind === 'supplier_return' ? 'مرتجع لشركة' : 'إتلاف أصناف',
      `${items.length} تشغيلة بقيمة تكلفة ${value}${opts.note ? ' - ' + opts.note : ''}`,
      actorName()
    );
    // مرتجع لشركة: يُسجَّل لنا رصيد (ينقص ما علينا لها)
    if (kind === 'supplier_return' && opts.entityId && value > 0) {
      handleAddTransaction(opts.entityId, value, 'return', 'debit', `مرتجع أدوية للشركة${opts.note ? ' - ' + opts.note : ''}`, uid('RET').toUpperCase().slice(0, 14));
    }
    return { ok: true, value };
  };

  // تسوية جرد: ضبط كميات التشغيلات على ما عُدَّ فعلياً
  const handleStocktake = (counts: { medicineId: string; batchId: string; counted: number }[]): number => {
    let working = [...medicines];
    const moves: StockMovement[] = [];
    for (const c of counts) {
      const idx = working.findIndex(m => m.id === c.medicineId);
      if (idx < 0) continue;
      const before = normalizeMedicine(working[idx]);
      const batch = before.batches?.find(b => b.id === c.batchId);
      const r = setBatchQuantity(before, c.batchId, c.counted);
      if (!r || r.delta === 0) continue;
      working[idx] = r.medicine;
      moves.push(
        makeMovement({
          med: before,
          type: 'stocktake',
          packsDelta: r.delta,
          batchNumber: batch?.batchNumber,
          note: `جرد: النظام ${batch?.quantity} ← المعدود ${c.counted}`,
          actor: actorName(),
        })
      );
    }
    if (moves.length) {
      setMedicines(working);
      setMovements(prev => [...prev, ...moves]);
      AuditService.log('تسوية جرد', `${moves.length} تشغيلة عُدِّلت كمياتها`, actorName());
    }
    return moves.length;
  };

  // فاتورة شراء من شركة: تُدخل المخزون كتشغيلات (مع البونص) وتسجّل الدين
  const handleAddPurchase = (inv: PurchaseInvoice) => {
    let working = [...medicines];
    const moves: StockMovement[] = [];
    const net = inv.subtotal > 0 ? inv.total / inv.subtotal : 1; // نسبة الخصم على سعر الوحدة
    for (const line of inv.lines) {
      const idx = working.findIndex(m => m.id === line.medicineId);
      if (idx < 0) continue;
      const totalPacks = line.quantity + (line.bonusQuantity || 0);
      if (totalPacks <= 0) continue;
      // التكلفة الفعلية للعبوة = قيمة السطر بعد الخصم ÷ (المشتري + البونص)
      const effectiveCost = round2((line.lineTotal * net) / totalPacks);
      const before = working[idx];
      working[idx] = receiveBatch(before, {
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate,
        quantity: totalPacks,
        unitCost: effectiveCost,
        receivedAt: inv.date,
        supplierId: inv.supplierId,
      });
      moves.push(
        makeMovement({ med: before, type: 'purchase', packsDelta: line.quantity, batchNumber: line.batchNumber, reference: inv.number, note: `شراء من ${inv.supplierName}`, actor: inv.recordedBy })
      );
      if (line.bonusQuantity > 0) {
        moves.push(
          makeMovement({ med: before, type: 'bonus', packsDelta: line.bonusQuantity, batchNumber: line.batchNumber, reference: inv.number, note: 'بونص', actor: inv.recordedBy })
        );
      }
    }
    setMedicines(working);
    setMovements(prev => [...prev, ...moves]);
    setPurchases(prev => [inv, ...prev]);
    if (inv.remainingAmount > 0) {
      handleAddTransaction(inv.supplierId, inv.remainingAmount, 'purchase', 'credit', `فاتورة شراء ${inv.number}${inv.supplierInvoiceNumber ? ' (فاتورة المورد ' + inv.supplierInvoiceNumber + ')' : ''}`, inv.number);
    }
    showToast(`تم تسجيل فاتورة الشراء ${inv.number} وإدخال الأصناف إلى المخزون`, 'success');
  };

  // الورديات
  const handleOpenShift = (openingCash: number) => {
    if (currentShift) return;
    const sh: Shift = { id: uid('shift'), cashierName: actorName(), openedAt: new Date().toISOString(), openingCash: round2(openingCash) };
    setShifts(prev => [sh, ...prev]);
    showToast('تم فتح الوردية', 'success');
  };

  const shiftCashSales = (shiftId: string): number =>
    round2(sales.filter(s => s.shiftId === shiftId).reduce((sum, s) => sum + (s.paymentMethod === 'cash' ? s.paidAmount : 0), 0));

  const handleCloseShift = (counted: number, notes: string) => {
    if (!currentShift) return;
    const expected = round2(currentShift.openingCash + shiftCashSales(currentShift.id));
    const closed: Shift = {
      ...currentShift,
      closedAt: new Date().toISOString(),
      countedCash: round2(counted),
      expectedCash: expected,
      difference: round2(counted - expected),
      notes,
    };
    setShifts(prev => prev.map(sh => (sh.id === closed.id ? closed : sh)));
    AuditService.log('إغلاق وردية', `المتوقع ${expected}، المعدود ${closed.countedCash}، الفرق ${closed.difference}`, actorName());
    showToast(`تم إغلاق الوردية. الفرق: ${closed.difference}`, closed.difference === 0 ? 'success' : 'info');
  };

  // Expenses handlers
  const handleAddExpense = (newExp: Omit<Expense, 'id'>) => {
    const exp: Expense = {
      ...newExp,
      id: uid('exp'),
    };
    setExpenses(prev => [exp, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Backup & Restore
  const handleExportBackup = () => {
    const json = AppStorage.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `نسخة_فارما_برو_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    AppStorage.markBackupDone();
  };

  const handleImportBackup = (jsonString: string): boolean => {
    const ok = AppStorage.importFullBackup(jsonString);
    if (ok) {
      setEntities(AppStorage.getEntities());
      setMedicines(AppStorage.getMedicines());
      setSales(AppStorage.getSales());
      setTransactions(AppStorage.getTransactions());
      setExpenses(AppStorage.getExpenses());
      setSettings(AppStorage.getSettings());
      setPurchases(AppStorage.getPurchases());
      setMovements(AppStorage.getMovements());
      setShifts(AppStorage.getShifts());
      AuditService.log('استعادة نسخة احتياطية', 'استُبدلت البيانات الحالية بنسخة احتياطية', actorName());
    }
    return ok;
  };

  const handleResetData = () => {
    AppStorage.resetToDefault();
    setEntities(AppStorage.getEntities());
    setMedicines(AppStorage.getMedicines());
    setSales(AppStorage.getSales());
    setTransactions(AppStorage.getTransactions());
    setExpenses(AppStorage.getExpenses());
    setSettings(AppStorage.getSettings());
    setPurchases(AppStorage.getPurchases());
    setMovements(AppStorage.getMovements());
    setShifts(AppStorage.getShifts());
    AuditService.log('مسح بيانات الصيدلية', 'تم مسح كل البيانات', actorName());
  };

  const handleLoadDemo = () => {
    AppStorage.loadDemoData();
    setEntities(AppStorage.getEntities());
    setMedicines(AppStorage.getMedicines());
    setSales(AppStorage.getSales());
    setTransactions(AppStorage.getTransactions());
    setExpenses(AppStorage.getExpenses());
    setPurchases([]);
    setMovements([]);
    setShifts([]);
    AuditService.log('تحميل بيانات تجريبية', 'استُبدلت البيانات الحالية ببيانات تجريبية', actorName());
  };

  // Open entity ledger from anywhere
  const handleOpenEntityLedger = (entity: Entity) => {
    setSelectedEntityForLedger(entity);
  };

  // Super Admin Handlers
  const handleOpenSuperAdmin = () => {
    setCurrentRole('super_admin');
    setCurrentTab('super_admin');
  };

  const handleClearSalesAndLedgers = () => {
    setSales([]);
    setTransactions([]);
    AppStorage.saveSales([]);
    AppStorage.saveTransactions([]);
  };

  const handleApplyImportedData = (data: {
    entities: Entity[];
    medicines: Medicine[];
    sales: SaleInvoice[];
    transactions: FinancialTransaction[];
    expenses: Expense[];
  }) => {
    const normalized = normalizeMedicines(data.medicines);
    setEntities(data.entities);
    setMedicines(normalized);
    setSales(data.sales);
    setTransactions(data.transactions);
    setExpenses(data.expenses);
    AppStorage.saveEntities(data.entities);
    AppStorage.saveMedicines(normalized);
    AppStorage.saveSales(data.sales);
    AppStorage.saveTransactions(data.transactions);
    AppStorage.saveExpenses(data.expenses);
  };

  // Check license expiry
  const todayDate = new Date();
  const licenseExpiry = new Date(settings.license?.expiryDate || '2099-12-31');
  const isLicenseExpired =
    !settings.license?.isActivated ||
    (settings.license?.planType !== 'lifetime' && licenseExpiry < todayDate);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-300">
      {/* Splash Screen intro on load */}
      {showSplash && (
        <SplashScreen onDismiss={() => setShowSplash(false)} autoClose={true} />
      )}

      {/* First-Time Security Setup Wizard (شاشة أول تشغيل لتعيين كلمة مرور و PIN قويين) */}
      {!settings.isSetupCompleted && !settings.pincodeHash && !settings.adminPasswordHash && (
        <FirstTimeSetupModal
          isOpen={!settings.isSetupCompleted && !settings.pincodeHash && !settings.adminPasswordHash}
          currentSettings={settings}
          onCompleteSetup={updated => {
            setSettings(updated);
            AppStorage.saveSettings(updated);
            showToast('🎉 تم إعداد أمان الصيدلية بنجاح وتشفير بيانات الدخول!', 'success');
          }}
        />
      )}

      {/* Lock Screen Modal - بدون أي رموز افتراضية */}
      <SecurityLockModal
        isOpen={isLocked}
        onUnlock={() => {
          setIsLocked(false);
          AppStorage.updateLastActivity();
        }}
        currentRole={currentRole}
        onRoleChange={role => {
          setCurrentRole(role);
          AppStorage.updateLastActivity();
          if (role === 'super_admin') setCurrentTab('super_admin');
        }}
        correctPin={settings.pincode}
        pincodeHash={settings.pincodeHash}
        pincodeSalt={settings.pincodeSalt}
        superAdminPin={settings.superAdminPin}
        superAdminPinHash={settings.superAdminPinHash}
        superAdminPinSalt={settings.superAdminPinSalt}
        onOpenSuperAdminDirectly={handleOpenSuperAdmin}
      />

      <Suspense fallback={null}>
      {/* About Engineer Malik Hraibat Modal */}
      {showAboutModal && <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />}

      {/* Theme Selector Modal */}
      {showThemeModal && (
      <ThemeSelectorModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentThemeId={currentThemeId}
        onSelectTheme={handleSelectTheme}
      />
      )}

      {/* Cross-Device Real-Time Sync & QR Pairing Modal */}
      {showDeviceSyncModal && (
      <DeviceSyncModal
        isOpen={showDeviceSyncModal}
        onClose={() => setShowDeviceSyncModal(false)}
        entities={entities}
        medicines={medicines}
        sales={sales}
        transactions={transactions}
        expenses={expenses}
        settings={settings}
        onApplyImportedData={handleApplyImportedData}
        onOpenSupabaseConfig={() => {
          setShowDeviceSyncModal(false);
          setShowSupabaseModal(true);
        }}
      />
      )}

      {/* Supabase Cloud Connection Modal */}
      {showSupabaseModal && (
      <SupabaseSyncModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        entities={entities}
        medicines={medicines}
        sales={sales}
        transactions={transactions}
        expenses={expenses}
        settings={settings}
        onApplyImportedData={handleApplyImportedData}
      />
      )}

      {/* Pharmacy Workspaces & Data Isolation Manager Modal */}
      {showInstanceManagerModal && (
      <PharmacyInstanceManagerModal
        isOpen={showInstanceManagerModal}
        onClose={() => setShowInstanceManagerModal(false)}
        onInstanceSwitched={handleSwitchInstance}
        currentSettings={settings}
        currentRole={currentRole}
      />
      )}

      </Suspense>

      {/* Instance Login Modal for protected pharmacy copies */}
      {!isInstanceUnlocked && (
        <InstanceLoginModal
          isOpen={!isInstanceUnlocked}
          activeInstance={InstanceService.getActiveInstance()}
          onSuccessLogin={() => setIsInstanceUnlocked(true)}
          onOpenPharmacySwitcher={() => setShowInstanceManagerModal(true)}
        />
      )}

      {/* Top Application Header */}
      <Header
        settings={settings}
        currentRole={currentRole}
        currentThemeId={currentThemeId}
        onLock={() => {
          InstanceService.logoutInstance(InstanceService.getActiveInstanceId());
          setIsInstanceUnlocked(false);
          setIsLocked(true);
        }}
        onOpenAbout={() => setShowAboutModal(true)}
        onOpenThemeSelector={() => setShowThemeModal(true)}
        onOpenDeviceSync={() => setShowDeviceSyncModal(true)}
        onOpenInstanceManager={() => setShowInstanceManagerModal(true)}
        onToggleMobileMenu={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
        onNewSaleShortcut={() => setCurrentTab('pos')}
        onOpenSuperAdmin={handleOpenSuperAdmin}
        onOpenSupabaseSync={() => setShowSupabaseModal(true)}
      />

      {/* License Expiration Banner if expired and not in Super Admin view */}
      {isLicenseExpired && currentTab !== 'super_admin' && (
        <div className="bg-rose-700 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs border-b border-rose-800 z-20">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              تنبيه الترخيص: فترة اشتراك البرنامج منتهية أو بحاجة لتنشيط. يرجى التواصل مع المهندس مالك حريبات للتجديد.
            </span>
          </div>
          <button
            onClick={handleOpenSuperAdmin}
            className="px-3 py-1 rounded-xl bg-white text-rose-900 font-bold text-xs hover:bg-rose-50 transition-colors shrink-0 flex items-center gap-1 shadow-xs"
          >
            <Key className="w-3.5 h-3.5" />
            <span>تنشيط النسخة (سوبر أدمن)</span>
          </button>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar + Mobile Drawer */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={tab => {
            if (tab === 'super_admin') {
              handleOpenSuperAdmin();
            } else if (currentRole === 'pharmacist' && (tab === 'reports' || tab === 'settings')) {
              setIsLocked(true);
              showToast('🔒 هذا القسم يتطلب صلاحية المدير العام - أدخل الرمز السري', 'info');
            } else {
              setCurrentTab(tab);
            }
            setSelectedEntityForLedger(null);
          }}
          settings={settings}
          onOpenAbout={() => setShowAboutModal(true)}
          onOpenThemeSelector={() => setShowThemeModal(true)}
          onOpenDeviceSync={() => setShowDeviceSyncModal(true)}
          onOpenInstanceManager={() => setShowInstanceManagerModal(true)}
          currentRole={currentRole}
          onOpenSuperAdmin={handleOpenSuperAdmin}
          onSwitchRole={handleToggleRole}
          isMobileOpen={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
          nearExpiryCount={nearExpiryCount}
          lowStockCount={lowStockCount}
        />

        {/* Dynamic View Panel */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-20 md:pb-8">
          <Suspense fallback={<div role="status" className="p-10 text-center text-sm font-bold text-slate-600">جاري التحميل...</div>}>
          {currentTab === 'dashboard' && (
            <DashboardView
              entities={entities}
              medicines={medicines}
              sales={sales}
              transactions={transactions}
              settings={settings}
              currentRole={currentRole}
              onNavigate={tab => setCurrentTab(tab)}
              onSelectEntity={handleOpenEntityLedger}
              onNewSale={() => setCurrentTab('pos')}
            />
          )}

          {currentTab === 'entities' && (
            <EntitiesView
              entities={entities}
              transactions={transactions}
              settings={settings}
              currentRole={currentRole}
              onAddEntity={handleAddEntity}
              onUpdateEntity={handleUpdateEntity}
              onDeleteEntity={handleDeleteEntity}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              selectedEntityForLedger={selectedEntityForLedger}
              onOpenLedgerModal={handleOpenEntityLedger}
              onCloseLedgerModal={() => setSelectedEntityForLedger(null)}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              entities={entities}
              settings={settings}
              currentRole={currentRole}
              onAddTransaction={(entId, amt, type, dir, note, ref, customDate) => {
                const entity = entities.find(e => e.id === entId);
                if (!entity) return;
                const newBalance = dir === 'debit' ? entity.currentBalance + amt : entity.currentBalance - amt;
                const dateFormatted = customDate || new Date().toISOString().replace('T', ' ').slice(0, 16);
                const newTx: FinancialTransaction = {
                  id: uid('tx'),
                  entityId: entId,
                  entityName: entity.name,
                  date: dateFormatted,
                  amount: amt,
                  type,
                  direction: dir,
                  balanceAfter: newBalance,
                  referenceNumber: ref || uid('REF').toUpperCase().slice(0, 14),
                  note,
                  recordedBy: (currentRole === 'pharmacist' || currentRole === 'accountant' ? 'صيدلي مناوب' : (settings.ownerName || 'المدير')),
                };
                setTransactions(prev => [newTx, ...prev]);
                setEntities(prev => prev.map(e => (e.id === entId ? { ...e, currentBalance: newBalance } : e)));
                showToast('تم تسجيل الحركة بنجاح', 'success');
              }}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onSelectEntity={handleOpenEntityLedger}
            />
          )}

          {currentTab === 'pos' && (
            <POSView
              medicines={medicines}
              entities={entities}
              settings={settings}
              currentRole={currentRole}
              onCompleteSale={handleCompleteSale}
              sales={sales}
              currentShift={currentShift}
              onOpenShift={handleOpenShift}
              onCloseShift={handleCloseShift}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              medicines={medicines}
              settings={settings}
              currentRole={currentRole}
              onAddMedicine={handleAddMedicine}
              onUpdateMedicine={handleUpdateMedicine}
              onDeleteMedicine={handleDeleteMedicine}
              onBulkImportMedicines={handleBulkImportMedicines}
              movements={movements}
              entities={entities}
              sales={sales}
              onRemoveStock={handleRemoveStock}
              onStocktake={handleStocktake}
            />
          )}

          {currentTab === 'purchases' && (
            <PurchasesView
              medicines={medicines}
              entities={entities}
              purchases={purchases}
              settings={settings}
              currentRole={currentRole}
              onAddPurchase={handleAddPurchase}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              settings={settings}
              currentRole={currentRole}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              sales={sales}
              expenses={expenses}
              medicines={medicines}
              entities={entities}
              settings={settings}
              currentRole={currentRole}
              shifts={shifts}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              currentRole={currentRole}
              currentThemeId={currentThemeId}
              onSelectTheme={handleSelectTheme}
              onUpdateSettings={setSettings}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetData={handleResetData}
              onLoadDemo={handleLoadDemo}
              onOpenAbout={() => setShowAboutModal(true)}
              onNavigateToSuperAdmin={handleOpenSuperAdmin}
              onOpenSupabaseSync={() => setShowSupabaseModal(true)}
              onOpenDeviceSync={() => setShowDeviceSyncModal(true)}
              onOpenInstanceManager={() => setShowInstanceManagerModal(true)}
              onNavigateToInventory={() => setCurrentTab('inventory')}
            />
          )}

          {currentTab === 'super_admin' && (
            <SuperAdminView
              settings={settings}
              entities={entities}
              medicines={medicines}
              sales={sales}
              transactions={transactions}
              onUpdateSettings={setSettings}
              onUpdateEntities={setEntities}
              onUpdateMedicines={setMedicines}
              onClearSalesAndLedgers={handleClearSalesAndLedgers}
              onExitSuperAdmin={() => {
                setCurrentRole('admin');
                setCurrentTab('dashboard');
              }}
              onOpenSupabaseSync={() => setShowSupabaseModal(true)}
            />
          )}
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Dock for iPhone / Mobile Viewport */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={tab => {
          if (currentRole === 'pharmacist' && (tab === 'reports' || tab === 'settings' || tab === 'super_admin')) {
            setIsLocked(true);
            showToast('🔒 هذا القسم يتطلب صلاحية المدير العام - أدخل الرمز السري', 'info');
            return;
          }
          setCurrentTab(tab);
          setSelectedEntityForLedger(null);
        }}
        onOpenMenu={() => setIsMobileDrawerOpen(true)}
      />

      {/* In-app Toast Banner */}
      {toast && (
        <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-sm">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-rose-900/95 text-white border-rose-700'
                : 'bg-emerald-900/95 text-white border-emerald-700'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            )}
            <span className="leading-snug">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

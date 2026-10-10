import React, { useState, useEffect, useCallback } from 'react';
import {
  Entity,
  Medicine,
  SaleInvoice,
  FinancialTransaction,
  Expense,
  AppSettings,
  UserRole,
  TransactionType,
} from './types';
import { AppStorage, defaultSettings } from './services/storage';
import { ThemeService, ThemeId } from './services/themeService';
import { SupabaseService } from './services/supabaseService';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { AboutModal } from './components/AboutModal';
import { SplashScreen } from './components/SplashScreen';
import { SecurityLockModal } from './components/SecurityLockModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { DeviceSyncModal } from './components/DeviceSyncModal';
import { DashboardView } from './views/DashboardView';
import { EntitiesView } from './views/EntitiesView';
import { POSView } from './views/POSView';
import { InventoryView } from './views/InventoryView';
import { ExpensesView } from './views/ExpensesView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { SuperAdminView } from './views/SuperAdminView';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { PharmacyInstanceManagerModal } from './components/PharmacyInstanceManagerModal';
import { InstanceLoginModal } from './components/InstanceLoginModal';
import { FirstTimeSetupModal } from './components/FirstTimeSetupModal';
import { InstanceService } from './services/instanceService';
import { AlertCircle, Key, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

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
      if (currentTab === 'reports' || currentTab === 'settings' || currentTab === 'super_admin') {
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
            const newInst = InstanceService.createInstance({
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
          if (currentConfig.url !== syncUrl || currentConfig.anonKey !== syncKey) {
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
  const ninetyDaysLater = new Date();
  ninetyDaysLater.setDate(now.getDate() + 90);

  const nearExpiryCount = (medicines || []).filter(m => {
    if (!m || !m.expiryDate) return false;
    const exp = new Date(m.expiryDate);
    return !isNaN(exp.getTime()) && exp <= ninetyDaysLater;
  }).length;

  const lowStockCount = (medicines || []).filter(m => m && m.stockQuantity <= m.minQuantity).length;

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

    const newBalance =
      direction === 'debit' ? entity.currentBalance + amount : entity.currentBalance - amount;

    const nowStr = new Date();
    const dateFormatted = `${nowStr.toISOString().split('T')[0]} ${nowStr.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const newTx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      entityId,
      entityName: entity.name,
      date: dateFormatted,
      amount,
      type,
      direction,
      balanceAfter: newBalance,
      referenceNumber: referenceNumber || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      note,
      recordedBy: currentRole === 'admin' ? 'م. مالك حريبات' : 'صيدلي مناوب',
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
      id: `ent-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setEntities(prev => [newEnt, ...prev]);
  };

  // Complete a Sale Invoice from POS
  const handleCompleteSale = (sale: SaleInvoice) => {
    // 1. Save invoice
    setSales(prev => [sale, ...prev]);

    // 2. Decrement medicine stock quantities
    setMedicines(prev =>
      prev.map(med => {
        const itemSold = sale.items.find(item => item.medicineId === med.id);
        if (itemSold) {
          return {
            ...med,
            stockQuantity: Math.max(0, med.stockQuantity - itemSold.quantity),
          };
        }
        return med;
      })
    );

    // 3. If sold on credit for an entity, register financial transaction and update balance
    if (sale.entityId && sale.remainingAmount > 0) {
      handleAddTransaction(
        sale.entityId,
        sale.remainingAmount,
        'invoice',
        'debit',
        `فاتورة مبيعات آجل رقم ${sale.invoiceNumber}`,
        sale.invoiceNumber
      );
    }
  };

  // Inventory handlers
  const handleAddMedicine = (newMed: Omit<Medicine, 'id'>) => {
    const med: Medicine = {
      ...newMed,
      id: `med-${Date.now()}`,
    };
    setMedicines(prev => [med, ...prev]);
  };

  const handleUpdateMedicine = (updatedMed: Medicine) => {
    setMedicines(prev => prev.map(m => (m.id === updatedMed.id ? updatedMed : m)));
  };

  const handleDeleteMedicine = (id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
  };

  const handleBulkImportMedicines = (newMeds: Medicine[], updatedMeds: Medicine[]) => {
    setMedicines(prev => {
      const updatedMap = new Map(updatedMeds.map(m => [m.id, m]));
      const updatedList = prev.map(m => updatedMap.get(m.id) || m);
      return [...newMeds, ...updatedList];
    });
  };

  // Expenses handlers
  const handleAddExpense = (newExp: Omit<Expense, 'id'>) => {
    const exp: Expense = {
      ...newExp,
      id: `exp-${Date.now()}`,
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
    setEntities(data.entities);
    setMedicines(data.medicines);
    setSales(data.sales);
    setTransactions(data.transactions);
    setExpenses(data.expenses);
    AppStorage.saveEntities(data.entities);
    AppStorage.saveMedicines(data.medicines);
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

      {/* About Engineer Malik Hraibat Modal */}
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentThemeId={currentThemeId}
        onSelectTheme={handleSelectTheme}
      />

      {/* Cross-Device Real-Time Sync & QR Pairing Modal */}
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

      {/* Supabase Cloud Connection Modal */}
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

      {/* Pharmacy Workspaces & Data Isolation Manager Modal */}
      <PharmacyInstanceManagerModal
        isOpen={showInstanceManagerModal}
        onClose={() => setShowInstanceManagerModal(false)}
        onInstanceSwitched={handleSwitchInstance}
        currentSettings={settings}
        currentRole={currentRole}
      />

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
        <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-md z-20">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 animate-bounce" />
            <span>
              تنبيه الترخيص: فترة اشتراك البرنامج منتهية أو بحاجة لتنشيط. يرجى التواصل مع المهندس مالك حريبات للتجديد.
            </span>
          </div>
          <button
            onClick={handleOpenSuperAdmin}
            className="px-3 py-1 rounded-xl bg-white text-rose-900 font-black text-xs hover:bg-rose-50 transition-colors shrink-0 flex items-center gap-1"
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
              onAddTransaction={handleAddTransaction}
              selectedEntityForLedger={selectedEntityForLedger}
              onOpenLedgerModal={handleOpenEntityLedger}
              onCloseLedgerModal={() => setSelectedEntityForLedger(null)}
            />
          )}

          {currentTab === 'pos' && (
            <POSView
              medicines={medicines}
              entities={entities}
              settings={settings}
              currentRole={currentRole}
              onCompleteSale={handleCompleteSale}
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

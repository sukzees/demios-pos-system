import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, checkSupabaseConnection, Item, Category, Order, Expense, Station, StationMapping, Employee } from '@/lib/supabase';
import { addItemRaw, updateStockRaw, addInventoryTransactionRaw, testConnection } from '@/lib/supabase-raw';
import { addItemDirect, updateStockDirect, addTransactionDirect } from '@/lib/supabase-direct';
import { addItemWithStockWorkaround, addItemViaRPC } from '@/lib/supabase-workaround';

export type { Employee };

const ENV_LICENSE_KEY = (process.env.NEXT_PUBLIC_POS_LICENSE_KEY || '').trim();
const LICENSE_SYNC_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_LICENSE_SYNC_INTERVAL_MS || 60 * 60 * 1000);
const INACTIVE_LICENSE_STATUSES = ['inactive', 'expired', 'revoked', 'suspended', 'blocked', 'disabled'];
const MAX_PERSISTED_QR_CODE_LENGTH = 250_000;

const isMissingColumnInSchemaCache = (error: any, table: string, column: string): boolean => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('schema cache') && message.includes(table.toLowerCase()) && message.includes(column.toLowerCase());
};

// Helper function to trigger portion refresh
const triggerPortionRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refreshPortions'));
  }
};

type CartLine = {
  item: Item;
  quantity: number;
  notes?: string;
  clientLineId?: string;
  orderItemId?: string;
  sourceItemId?: string;
  portionName?: string;
  portionId?: string;
  sentToKitchen?: boolean;
  sentToKitchenTime?: string;
  completedInKitchen?: boolean;
  cancelled?: boolean;
  cancelledAt?: string;
};

const createCartLineId = () => `cart-line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const stripBankQrCode = <T extends { qrCodeImage?: string } | null | undefined>(bank: T) => {
  if (!bank) return bank;
  const { qrCodeImage, ...bankWithoutQr } = bank;
  return bankWithoutQr;
};

const stripOrderMetaQrCodes = (orderMetaById: PosState['orderMetaById'] = {}) => (
  Object.fromEntries(
    Object.entries(orderMetaById).map(([orderId, meta]) => [
      orderId,
      {
        ...meta,
        selectedBank: stripBankQrCode(meta?.selectedBank)
      }
    ])
  ) as PosState['orderMetaById']
);

const stripPendingActionQrCodes = (pendingActions: PendingAction[] = []) => (
  pendingActions.map((action) => (
    action.type === 'CHECKOUT'
      ? {
          ...action,
          payload: {
            ...action.payload,
            selectedBank: stripBankQrCode(action.payload.selectedBank)
          }
        }
      : action
  ))
);

const sanitizeBankConfigsForPersist = (bankConfigs: PosState['bankConfigs'] = []) => (
  bankConfigs.map((bank) => ({
    ...bank,
    qrCodeImage: bank.qrCodeImage && bank.qrCodeImage.length <= MAX_PERSISTED_QR_CODE_LENGTH
      ? bank.qrCodeImage
      : undefined
  }))
);

type PendingAction =
  | { type: 'ADD_ITEM'; payload: Omit<Item, 'id' | 'created_at'> & { tempId: string } }
  | { type: 'ADD_CATEGORY'; payload: Omit<Category, 'id' | 'created_at'> & { tempId: string } }
  | { type: 'ADD_EXPENSE'; payload: Omit<Expense, 'id' | 'created_at'> & { tempId: string } }
  | { type: 'ADD_EMPLOYEE'; payload: Omit<Employee, 'id' | 'created_at'> & { tempId: string } }
  | { type: 'UPDATE_STOCK'; payload: { itemId: string; stock: number } }
  | { type: 'CHECKOUT'; payload: { cart: CartLine[]; paymentMethod: 'cash' | 'card' | 'online' | 'transfer'; totalAmount: number; date: string; notes?: string; cashTendered?: number; selectedBank?: { id: string; bankName: string; accountName: string; accountNumber: string; qrCodeImage?: string } | null } };

interface PosState {
  user: Employee | null;
  items: Item[];
  categories: Category[];
  cart: CartLine[];
  savedCarts: Record<string, CartLine[]>; // เก็บ cart แยกตามโต๊ะ/orderType
  isSupabaseConfigured: boolean;
  isCheckingConfig: boolean;
  isOnline: boolean;
  pendingActions: PendingAction[];
  checkoutError: string | null;
  isCheckingOut: boolean;
  orderMetaById: Record<string, {
    note?: string;
    cashTendered?: number | null;
    selectedBank?: { id: string; bankName: string; accountName: string; accountNumber: string; qrCodeImage?: string } | null;
  }>;
  heldOrders: { id: string; cart: CartLine[]; date: string; note?: string; table?: any; orderType?: 'dine-in' | 'takeout' | 'delivery' | null }[];
  receiptSettings: {
    headerText: string;
    footerText: string;
    storeAddress: string;
    phoneNumber: string;
    showBankDetail: boolean;
    receiptSize?: '58mm' | '80mm';
    enableVoidBill?: boolean;
    autoPrintVoidBill?: boolean;
    receiptPrinter?: string;
    voidBillPrinter?: string;
    kitchenBillSize?: '58mm' | '80mm';
    voidBillSize?: '58mm' | '80mm';
    showTableNumber?: boolean;
  };
  currencySettings: {
    defaultCurrency: string;
    currencySymbol: string;
    currencyFormat: string;
    currencyRate: number;
    currencySymbolPosition: 'left' | 'right';
    thbRate?: number;
  };
  generalSettings: {
    storeName: string;
    taxRate: number;
    timezone: string;
    language?: 'en' | 'lo' | 'th';
  };
  bankConfigs: {
    id: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    enabledForTransfer: boolean;
    qrCodeImage?: string;
  }[];
  unitConfigs: {
    id: string;
    name: string;
    value: string;
  }[];
  printerConfigs: {
    id: string;
    name: string;
    ipAddress: string;
    location: string;
    isDefault: boolean;
    enabled: boolean;
    autoPrint?: boolean;
  }[];
  stationMappings: {
    id: string;
    categoryId: string;
    stationName: string;
    printerId: string;
    selectedItemId: string;
  }[];
  licenseInfo: {
    key: string;
    machineId: string;
    active: boolean;
    expiresAt: string;
    renewDate?: string;
    activationData?: any;
  };
  licenseApiData: any;
  licenseSyncAt: string;
  autoPrint: boolean;
  silentPrint: boolean;
  isShiftOpen: boolean;
  shiftStartTime: string | null;
  shiftCashAmount: number;
  shiftTransferAmount: number;
  currentTable: any | null;
  currentOrderType: 'dine-in' | 'takeout' | 'delivery' | null;

  login: (user: Employee) => void;
  logout: () => void;
  updateReceiptSettings: (settings: { headerText: string; footerText: string; storeAddress: string; phoneNumber: string; showBankDetail: boolean; receiptSize?: '58mm' | '80mm'; enableVoidBill?: boolean; autoPrintVoidBill?: boolean; receiptPrinter?: string; voidBillPrinter?: string; kitchenBillSize?: '58mm' | '80mm'; voidBillSize?: '58mm' | '80mm'; showTableNumber?: boolean }) => void;
  updateCurrencySettings: (settings: { defaultCurrency: string; currencySymbol: string; currencyFormat: string; currencyRate: number; currencySymbolPosition: 'left' | 'right'; thbRate?: number }) => void;
  updateGeneralSettings: (settings: { storeName: string; taxRate: number; timezone: string; language?: 'en' | 'lo' | 'th' }) => void;
  updateBankConfigs: (banks: { id: string; bankName: string; accountName: string; accountNumber: string; enabledForTransfer: boolean; qrCodeImage?: string }[]) => void;
  updateUnitConfigs: (units: { id: string; name: string; value: string }[]) => void;
  updatePrinterConfigs: (printers: { id: string; name: string; ipAddress: string; location: string; isDefault: boolean; enabled: boolean; autoPrint?: boolean }[]) => void;
  updateStationMappings: (mappings: { id: string; categoryId: string; stationName: string; printerId: string; selectedItemId: string }[]) => void;
  updateAutoPrint: (enabled: boolean) => void;
  updateSilentPrint: (enabled: boolean) => void;
  checkOpenShift: () => Promise<void>;
  openShift: () => void;
  closeShift: () => void;
  setCurrentTable: (table: any | null, orderType: 'dine-in' | 'takeout' | 'delivery') => void;
  clearCurrentTable: () => void;
  markTableAsOccupied: (tableId: string, orderId?: string) => Promise<void>;
  updateLicenseInfo: (info: { key: string; machineId: string; active: boolean; expiresAt: string; renewDate?: string; activationData?: any }) => void;
  syncLicenseDaily: (force?: boolean, keyOverride?: string) => Promise<void>;
  syncLicenseNow: (keyOverride?: string) => Promise<void>;
  fetchItemsAndCategories: () => Promise<void>;
  addToCart: (item: Item, options?: { sourceItemId?: string; portionName?: string; portionId?: string; quantity?: number }) => void;
  removeFromCart: (itemId: string) => void;
  removeFromCartByIndex: (index: number) => void;
  cancelCartItem: (itemId: string, portionId?: string) => void;
  cancelCartItemByIndex: (index: number) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  updateCartQuantityByIndex: (index: number, quantity: number) => void;
  clearCart: () => Promise<void>;
  clearUnsentItems: () => void;
  markCartItemsAsSent: () => void;
  holdOrder: (note?: string) => Promise<void>;
  resumeOrder: (orderId: string) => void;
  removeHeldOrder: (orderId: string) => void;
  setHeldOrders: (orders: { id: string; cart: CartLine[]; date: string; note?: string; table?: any; orderType?: 'dine-in' | 'takeout' | 'delivery' | null }[]) => void;
  checkout: (
    paymentMethod: 'cash' | 'card' | 'online' | 'transfer',
    notes?: string,
    cashTendered?: number,
    selectedBank?: { id: string; bankName: string; accountName: string; accountNumber: string; qrCodeImage?: string } | null,
    totalOverride?: number
  ) => Promise<boolean>;
  updateItemStock: (itemId: string, stock: number, notes?: string) => Promise<void>;
  addItem: (item: Omit<Item, 'id' | 'created_at'>) => Promise<void>;
  editItem: (itemId: string, item: Partial<Omit<Item, 'id' | 'created_at'>>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => Promise<void>;
  editCategory: (categoryId: string, category: Partial<Omit<Category, 'id' | 'created_at'>>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;

  addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => Promise<void>;
  addEmployee: (employee: Omit<Employee, 'id' | 'created_at'>) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;

  checkSupabaseConfig: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
  syncPendingActions: () => Promise<void>;
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      user: null,
      items: [],
      categories: [],
      cart: [],
      savedCarts: {}, // เริ่มต้นเป็น object ว่าง
      isSupabaseConfigured: false,
      isCheckingConfig: true,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isCheckingOut: false,
      pendingActions: [],
      checkoutError: null,
      orderMetaById: {},
      heldOrders: [],
      receiptSettings: {
        headerText: "Welcome to My Awesome Store!",
        footerText: "Thank you for your business!",
        storeAddress: "123 Main St, City, State",
        phoneNumber: "(555) 123-4567",
        showBankDetail: true,
        receiptSize: '80mm',
        enableVoidBill: false,
        autoPrintVoidBill: false,
        receiptPrinter: '',
        voidBillPrinter: '',
        kitchenBillSize: '80mm',
        voidBillSize: '80mm',
        showTableNumber: true
      },
      currencySettings: {
        defaultCurrency: "USD",
        currencySymbol: "$",
        currencyFormat: "###,###.00",
        currencyRate: 1.0,
        currencySymbolPosition: "left",
        thbRate: 36.5
      },
      generalSettings: {
        storeName: "My Awesome Store",
        taxRate: 8,
        timezone: "America/Los_Angeles",
        language: 'en'
      },
      bankConfigs: [
        {
          id: 'bank-default-1',
          bankName: 'Example Bank',
          accountName: 'Store Owner',
          accountNumber: '123-456-7890',
          enabledForTransfer: true
        }
      ],
      unitConfigs: [
        { id: 'unit-pcs', name: 'Pcs', value: 'pcs' },
        { id: 'unit-kg', name: 'Kg', value: 'kg' },
        { id: 'unit-g', name: 'Gram', value: 'g' },
        { id: 'unit-l', name: 'Liter', value: 'l' },
        { id: 'unit-ml', name: 'Ml', value: 'ml' },
        { id: 'unit-box', name: 'Box', value: 'box' },
        { id: 'unit-bottle', name: 'Bottle', value: 'bottle' }
      ],
      printerConfigs: [
        {
          id: 'printer-main',
          name: 'Main Cashier Printer',
          ipAddress: '192.168.1.100',
          location: 'Cashier',
          isDefault: true,
          enabled: true,
          autoPrint: true
        },
        {
          id: 'printer-kitchen',
          name: 'Kitchen Printer',
          ipAddress: '192.168.1.101',
          location: 'Kitchen',
          isDefault: false,
          enabled: true,
          autoPrint: true
        }
      ],
      stationMappings: [],
      licenseInfo: {
        key: ENV_LICENSE_KEY,
        machineId: typeof window !== 'undefined' ? (localStorage.getItem('machine_id') || `mach-${Math.random().toString(36).substring(2, 10)}`) : '',
        active: false,
        expiresAt: '',
        renewDate: '',
        activationData: null
      },
      licenseApiData: null,
      licenseSyncAt: '',
      autoPrint: false,
      silentPrint: false,
      isShiftOpen: false,
      shiftStartTime: null,
      shiftCashAmount: 0,
      shiftTransferAmount: 0,
      currentTable: null,
      currentOrderType: null,

      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      updateReceiptSettings: (settings) => set((state) => ({ receiptSettings: { ...state.receiptSettings, ...settings } })),
      updateCurrencySettings: (settings) => set({ currencySettings: settings }),
      updateGeneralSettings: (settings) => set({ generalSettings: settings }),
      updateBankConfigs: (banks) => set({ bankConfigs: banks }),
      updateUnitConfigs: (units) => set({ unitConfigs: units }),
      updatePrinterConfigs: (printers) => set({ printerConfigs: printers }),
      updateStationMappings: (mappings) => set({ stationMappings: mappings }),
      updateAutoPrint: (enabled) => set({ autoPrint: enabled }),
      updateSilentPrint: (enabled) => set({ silentPrint: enabled }),
      checkOpenShift: async () => {
        const { isSupabaseConfigured, isOnline } = get();
        
        if (!isSupabaseConfigured || !isOnline) return;

        try {
          // Check if there's an open shift in database
          const { data: openShift, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('status', 'open')
            .order('start_time', { ascending: false })
            .limit(1)
            .single();

          if (openShift && !error) {
            // Load the open shift
            set({
              isShiftOpen: true,
              shiftStartTime: openShift.start_time,
              shiftCashAmount: openShift.cash_amount || 0,
              shiftTransferAmount: openShift.transfer_amount || 0
            });
          } else {
            // No open shift found
            set({
              isShiftOpen: false,
              shiftStartTime: null,
              shiftCashAmount: 0,
              shiftTransferAmount: 0
            });
          }
        } catch (error) {
          console.warn('Failed to check open shift:', error);
        }
      },
      openShift: async () => {
        const { isSupabaseConfigured, isOnline, user } = get();
        
        set({ isShiftOpen: true, shiftStartTime: new Date().toISOString(), shiftCashAmount: 0, shiftTransferAmount: 0 });

        if (isSupabaseConfigured && isOnline) {
          try {
            // Create new shift record
            await supabase
              .from('shifts')
              .insert({
                start_time: new Date().toISOString(),
                cash_amount: 0,
                transfer_amount: 0,
                status: 'open',
                started_by: user?.name || null
              });
          } catch (error) {
            console.warn('Failed to create shift in database:', error);
          }
        }
      },
      closeShift: async () => {
        const { isSupabaseConfigured, isOnline, shiftStartTime, shiftCashAmount, shiftTransferAmount, user } = get();
        
        set({ isShiftOpen: false, shiftStartTime: null, shiftCashAmount: 0, shiftTransferAmount: 0 });

        if (isSupabaseConfigured && isOnline && shiftStartTime) {
          try {
            // Close the open shift in database
            const { data: existingShift, error: fetchError } = await supabase
              .from('shifts')
              .select('id')
              .eq('status', 'open')
              .order('start_time', { ascending: false })
              .limit(1)
              .single();

            if (existingShift) {
              await supabase
                .from('shifts')
                .update({
                  end_time: new Date().toISOString(),
                  cash_amount: shiftCashAmount,
                  transfer_amount: shiftTransferAmount,
                  status: 'closed',
                  closed_by: user?.name || null
                })
                .eq('id', existingShift.id);
            }
          } catch (error) {
            console.warn('Failed to close shift in database:', error);
          }
        }
      },
      setCurrentTable: (table, orderType) => {
        const { cart, currentTable, currentOrderType, savedCarts } = get();
        
        // บันทึก cart ปัจจุบันก่อนเปลี่ยน
        if (currentTable || currentOrderType) {
          const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
          savedCarts[currentKey] = [...cart];
        }
        
        // โหลด cart ของโต๊ะ/orderType ใหม่
        const newKey = table ? `table-${table.id}` : `takeout`;
        const newCart = savedCarts[newKey] || [];
        
        set({ 
          currentTable: table, 
          currentOrderType: orderType,
          cart: newCart,
          savedCarts: { ...savedCarts }
        });
      },
      clearCurrentTable: () => {
        const { cart, currentTable, currentOrderType, savedCarts } = get();
        
        // บันทึก cart ปัจจุบันก่อนล้าง
        if (currentTable || currentOrderType) {
          const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
          savedCarts[currentKey] = [...cart];
        }
        
        set({ 
          cart: [],  // ล้าง cart ออกจากหน้าจอ
          currentTable: null, 
          currentOrderType: null,
          savedCarts: { ...savedCarts }
        });
      },
      markTableAsOccupied: async (tableId, orderId) => {
        const { isSupabaseConfigured, isOnline } = get();
        
        if (isSupabaseConfigured && isOnline) {
          try {
            await supabase
              .from('tables')
              .update({ 
                status: 'occupied',
                current_order_id: orderId || null
              })
              .eq('id', tableId);
          } catch (error) {
            console.error('Failed to mark table as occupied:', error);
          }
        }
      },
      updateLicenseInfo: (info) => {
        if (typeof window !== 'undefined' && info.machineId) {
          localStorage.setItem('machine_id', info.machineId);
        }
        set({
          licenseInfo: {
            ...info,
            key: info.key || ENV_LICENSE_KEY
          }
        });
      },
      syncLicenseDaily: async (force = false, keyOverride) => {
        const { licenseInfo, licenseSyncAt, isOnline } = get();
        const keyToUse = (keyOverride || licenseInfo?.key || ENV_LICENSE_KEY || '').trim();
        if (!keyToUse) return;
        if (!force && !isOnline) return;

        const lastSync = licenseSyncAt ? new Date(licenseSyncAt).getTime() : 0;
        const now = Date.now();
        if (!force && now - lastSync < LICENSE_SYNC_INTERVAL_MS) return;

        try {
          const toUtcDateTime = (value: number) => {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '';
            const pad = (v: number) => String(v).padStart(2, '0');
            return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
          };

          const normalizeExpiresAt = (payload: Record<string, any>) => {
            const raw =
              payload?.expires_at ??
              payload?.expiresAt ??
              payload?.expiry_date ??
              payload?.expiryDate ??
              payload?.expiration_date ??
              payload?.expirationDate ??
              payload?.expires ??
              payload?.expiry ??
              payload?.expire_date ??
              '';

            if (raw === null || raw === undefined) return '';
            if (typeof raw === 'number') {
              const ms = raw > 1e12 ? raw : raw * 1000;
              return toUtcDateTime(ms);
            }
            const rawStr = String(raw).trim();
            if (/^\d+$/.test(rawStr)) {
              const num = Number(rawStr);
              const ms = num > 1e12 ? num : num * 1000;
              return toUtcDateTime(ms);
            }
            return rawStr;
          };
          const normalizeRenewDate = (payload: Record<string, any>) =>
            payload?.renew_date ?? payload?.renewDate ?? payload?.last_verified ?? payload?.lastVerified ?? '';

          const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              license_key: keyToUse,
              machine_id: licenseInfo.machineId
            })
          });
          const data = await response.json().catch(() => ({}));
          const freshData = typeof data === 'object' && data !== null ? JSON.parse(JSON.stringify(data)) : data;
          const payload = (data as any)?.data ?? (data as any)?.result ?? data;
          const licensePayload = (payload as any)?.license ?? (payload as any)?.license_info ?? (payload as any)?.licenseInfo ?? payload;
          const expiresAt = normalizeExpiresAt(licensePayload as Record<string, any>);
          const renewDate = normalizeRenewDate(licensePayload as Record<string, any>);

          if (expiresAt) {
            set({
              licenseInfo: {
                ...licenseInfo,
                key: keyToUse,
                active: data.valid === true,
                expiresAt: expiresAt,
                renewDate: renewDate || licenseInfo.renewDate,
                activationData: licensePayload
              },
              licenseApiData: freshData,
              licenseSyncAt: new Date().toISOString()
            });
            return;
          }

          if (data.valid === false) {
            set({
              licenseInfo: { ...licenseInfo, key: keyToUse, active: false },
              licenseApiData: freshData,
              licenseSyncAt: new Date().toISOString()
            });
          }
        } catch {
          // Ignore sync errors; try again later.
        }
      },
      syncLicenseNow: async (keyOverride) => {
        const { licenseInfo } = get();
        const keyToUse = (keyOverride || licenseInfo?.key || ENV_LICENSE_KEY || '').trim();
        if (!keyToUse) return;

        try {
          const response = await fetch('/api/license/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              license_key: keyToUse,
              machine_id: licenseInfo.machineId
            })
          });
          const result = await response.json();
          
          if (result.success && result.data) {
            const data = result.data;
            const toUtcDateTime = (value: number) => {
              const date = new Date(value);
              if (Number.isNaN(date.getTime())) return '';
              const pad = (v: number) => String(v).padStart(2, '0');
              return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
            };

            const normalizeExpiresAt = (payload: Record<string, any>) => {
              const raw =
                payload?.expires_at ??
                payload?.expiresAt ??
                payload?.expiry_date ??
                payload?.expiryDate ??
                payload?.expiration_date ??
                payload?.expirationDate ??
                payload?.expires ??
                payload?.expiry ??
                payload?.expire_date ??
                '';

              if (raw === null || raw === undefined) return '';
              if (typeof raw === 'number') {
                const ms = raw > 1e12 ? raw : raw * 1000;
                return toUtcDateTime(ms);
              }
              const rawStr = String(raw).trim();
              if (/^\d+$/.test(rawStr)) {
                const num = Number(rawStr);
                const ms = num > 1e12 ? num : num * 1000;
                return toUtcDateTime(ms);
              }
              return rawStr;
            };
            const normalizeRenewDate = (payload: Record<string, any>) =>
              payload?.renew_date ?? payload?.renewDate ?? payload?.last_verified ?? payload?.lastVerified ?? '';
            const getLicenseStatus = (payload: Record<string, any>) =>
              String(
                payload?.status ??
                payload?.license_status ??
                payload?.activation_data?.status ??
                payload?.activationData?.status ??
                ''
              ).trim().toLowerCase();

            const payload = data?.data ?? data?.result ?? data;
            const licensePayload = payload?.license ?? payload?.license_info ?? payload?.licenseInfo ?? payload;
            const expiresAt = normalizeExpiresAt(licensePayload as Record<string, any>);
            const renewDate = normalizeRenewDate(licensePayload as Record<string, any>);
            const licenseStatus = getLicenseStatus(licensePayload as Record<string, any>);
            const parsedExpiryDate = expiresAt ? new Date(expiresAt.includes('T') ? expiresAt : expiresAt.replace(' ', 'T')) : null;
            if (parsedExpiryDate && !Number.isNaN(parsedExpiryDate.getTime())) {
              parsedExpiryDate.setHours(23, 59, 59, 999);
            }
            const isExpired = !!(parsedExpiryDate && !Number.isNaN(parsedExpiryDate.getTime()) && parsedExpiryDate < new Date());
            const isStatusInactive = INACTIVE_LICENSE_STATUSES.includes(licenseStatus);
            const isActive = !isExpired && !isStatusInactive && (data.valid !== false);

            if (expiresAt) {
              set({
                licenseInfo: {
                  ...licenseInfo,
                  key: keyToUse,
                  active: isActive,
                  expiresAt: expiresAt,
                  renewDate: renewDate || licenseInfo.renewDate,
                  activationData: licensePayload
                },
                licenseApiData: data,
                licenseSyncAt: new Date().toISOString()
              });
            } else if (data.valid === false) {
              set({
                licenseInfo: { ...licenseInfo, key: keyToUse, active: false },
                licenseApiData: data,
                licenseSyncAt: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error('License sync error:', error);
          throw error;
        }
      },

      setOnlineStatus: (isOnline) => {
        set({ isOnline });
        if (isOnline) {
          get().syncPendingActions();
        }
      },

      checkSupabaseConfig: async () => {
        set({ isCheckingConfig: true });
        const isConfigured = await checkSupabaseConnection();
        set({ isSupabaseConfigured: isConfigured, isCheckingConfig: false });

        // Setup online/offline listeners
        if (typeof window !== 'undefined') {
          window.addEventListener('online', () => get().setOnlineStatus(true));
          window.addEventListener('offline', () => get().setOnlineStatus(false));
        }
      },

      fetchItemsAndCategories: async () => {
        if (!get().isSupabaseConfigured || !get().isOnline) return;

        try {
          const [itemsRes, inventoryItemsRes, categoriesRes] = await Promise.all([
            supabase.from('items').select('*'),  // Menu items
            supabase.from('inventory_items').select('*'),  // Inventory items
            supabase.from('categories').select('*')
          ]);

          // Combine items and inventory_items for Items & Categories page
          const allItems = [
            ...(itemsRes.data || []),
            ...(inventoryItemsRes.data || [])
          ];

          if (allItems.length > 0) set({ items: allItems });
          if (categoriesRes.data) set({ categories: categoriesRes.data });
        } catch (error) {
          // Error fetching data
        }
      },

      syncPendingActions: async () => {
        const { pendingActions, isSupabaseConfigured } = get();
        console.log('[SYNC] syncPendingActions called', {
          pendingActionsCount: pendingActions.length,
          isSupabaseConfigured
        });
        
        if (!isSupabaseConfigured || pendingActions.length === 0) return;

        const remainingActions = [...pendingActions];
        const processedActions: PendingAction[] = [];

        for (const action of pendingActions) {
          console.log('[SYNC] Processing action:', action.type);
          try {
            if (action.type === 'ADD_ITEM') {
              const { tempId, ...itemData } = action.payload;
              const { data, error } = await supabase.from('items').insert(itemData).select().single();
              if (error) {
                console.error('Sync ADD_ITEM error:', error);
                throw error;
              }

              if (data) {
                // Replace temp ID with real ID in local state
                set(state => ({
                  items: state.items.map(i => i.id === tempId ? data : i)
                }));

                if ((itemData.stock || 0) > 0) {
                  await supabase.from('inventory_transactions').insert({
                    item_id: data.id,
                    quantity_change: itemData.stock || 0,
                    transaction_type: 'restock',
                    notes: 'Initial stock (synced)'
                  });
                }
              }
            } else if (action.type === 'ADD_CATEGORY') {
              const { tempId, ...categoryData } = action.payload;
              const { data, error } = await supabase.from('categories').insert(categoryData).select().single();
              if (error) throw error;

              if (data) {
                // Replace temp ID with real ID in local state
                set(state => ({
                  categories: state.categories.map(c => c.id === tempId ? data : c)
                }));
              }
            } else if (action.type === 'ADD_EXPENSE') {
              const { tempId, ...expenseData } = action.payload;
              const { error } = await supabase.from('expenses').insert(expenseData);
              if (error) throw error;
            } else if (action.type === 'ADD_EMPLOYEE') {
              const { tempId, ...employeeData } = action.payload;
              const { error } = await supabase.from('employees').insert(employeeData);
              if (error) throw error;
            } else if (action.type === 'UPDATE_STOCK') {
              const { itemId, stock } = action.payload;
              // We need to fetch the current item to calculate diff for transaction log
              // But for simplicity in sync, we just set the stock value
              const { error } = await supabase.from('items').update({ stock }).eq('id', itemId);
              if (error) throw error;

              // We could add a transaction log here, but calculating the diff might be tricky if multiple updates happened
              // For now, let's just ensure the stock value is correct
            } else if (action.type === 'CHECKOUT') {
              console.log('[SYNC] Processing CHECKOUT action from pendingActions');
              const { cart, paymentMethod, totalAmount, date, notes, cashTendered, selectedBank } = action.payload;
              const selectedBankForMeta = stripBankQrCode(selectedBank);

              const orderInsertPayload: Record<string, any> = {
                total_amount: totalAmount,
                status: 'completed',
                payment_method: paymentMethod,
                created_at: date, // Preserve original date
              };
              if (notes) orderInsertPayload.notes = notes;

              let orderInsertResult = await supabase
                .from('orders')
                .insert(orderInsertPayload)
                .select()
                .single();

              if (orderInsertResult.error && orderInsertPayload.notes !== undefined && isMissingColumnInSchemaCache(orderInsertResult.error, 'orders', 'notes')) {
                delete orderInsertPayload.notes;
                orderInsertResult = await supabase
                  .from('orders')
                  .insert(orderInsertPayload)
                  .select()
                  .single();
              }

              const { data: order, error: orderError } = orderInsertResult;

              if (orderError) throw new Error(orderError.message || 'Failed to create order during sync');
              if (!order) throw new Error('Order insert returned no data during sync');
              if (notes || Number.isFinite(cashTendered)) {
                set((state) => ({
                  orderMetaById: {
                    ...state.orderMetaById,
                    [order.id]: {
                      note: notes || '',
                      cashTendered: paymentMethod === 'cash' && Number.isFinite(cashTendered) ? cashTendered : null
                    }
                  }
                }));
              }
              if (selectedBankForMeta) {
                set((state) => ({
                  orderMetaById: {
                    ...state.orderMetaById,
                    [order.id]: {
                      ...(state.orderMetaById[order.id] || {}),
                      selectedBank: selectedBankForMeta
                    }
                  }
                }));
              }

              const cartIds = cart.map(c => c.sourceItemId || c.item.id);
              const { data: existingItems } = await supabase
                .from('items')
                .select('id')
                .in('id', cartIds);
              const inventoryItemIds = new Set((existingItems || []).map(i => i.id));

              const orderItems = cart.map((c, index) => {
                const sourceId = c.sourceItemId || c.item.id;
                const isInventoryItem = inventoryItemIds.has(sourceId);
                const orderMeta = index === 0
                  ? `Order Meta >>>${encodeURIComponent(JSON.stringify({
                    orderNote: notes || '',
                    cashTendered: paymentMethod === 'cash' && Number.isFinite(cashTendered) ? cashTendered : null,
                    selectedBank: selectedBankForMeta || null,
                  }))}<<<`
                  : undefined;
                return {
                  order_id: order.id,
                  item_id: isInventoryItem ? sourceId : null,
                  quantity: c.quantity,
                  price_at_time: c.item.price,
                  notes: isInventoryItem
                    ? [`Item: ${c.item.name}`, c.notes, c.portionName ? `Portion: ${c.portionName}` : undefined, orderMeta].filter(Boolean).join(' | ') || undefined
                    : [`Item: ${c.item.name}`, `Recipe: ${c.item.name}`, c.notes, c.portionName ? `Portion: ${c.portionName}` : undefined, orderMeta].filter(Boolean).join(' | ') || undefined
                };
              });

              let itemsToInsert: any[] = orderItems;
              let { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
              if (itemsError && isMissingColumnInSchemaCache(itemsError, 'order_items', 'notes')) {
                itemsToInsert = orderItems.map(({ notes: _notes, ...rest }) => rest);
                const retryResult = await supabase.from('order_items').insert(itemsToInsert);
                itemsError = retryResult.error;
              }
              if (itemsError) throw itemsError;

              // Update stock and log transactions
              const transactions = [];
              for (const cartItem of cart) {
                const sourceId = cartItem.sourceItemId || cartItem.item.id;
                if (cartItem.portionId) {
                  const { data: portion } = await supabase
                    .from('item_portions')
                    .select('portion_stock')
                    .eq('id', cartItem.portionId)
                    .single();

                  if (portion) {
                    const newPortionStock = Math.max(0, (portion.portion_stock || 0) - cartItem.quantity);
                    await supabase
                      .from('item_portions')
                      .update({ portion_stock: newPortionStock })
                      .eq('id', cartItem.portionId);
                  }
                }

                if (inventoryItemIds.has(sourceId)) {
                  const { data: currentItem } = await supabase
                    .from('items')
                    .select('stock')
                    .eq('id', sourceId)
                    .single();

                  if (currentItem) {
                    const newStock = Math.max(0, (currentItem.stock || 0) - cartItem.quantity);
                    await supabase.from('items').update({ stock: newStock }).eq('id', sourceId);

                    transactions.push({
                      item_id: sourceId,
                      quantity_change: -cartItem.quantity,
                      transaction_type: 'sale',
                      notes: `Order #${order.id.slice(0, 8)} (synced)`
                    });
                  }
                } else {
                  const { data: ingredients } = await supabase
                    .from('recipe_ingredients')
                    .select('ingredient_id, quantity_needed')
                    .eq('recipe_id', sourceId);

                  for (const ingredient of ingredients || []) {
                    const deduction = Math.max(0, Math.ceil(Number(ingredient.quantity_needed || 0) * cartItem.quantity));
                    const { data: ingredientItem } = await supabase
                      .from('items')
                      .select('stock')
                      .eq('id', ingredient.ingredient_id)
                      .single();

                    if (ingredientItem) {
                      const newStock = Math.max(0, (ingredientItem.stock || 0) - deduction);
                      await supabase.from('items').update({ stock: newStock }).eq('id', ingredient.ingredient_id);

                      transactions.push({
                        item_id: ingredient.ingredient_id,
                        quantity_change: -deduction,
                        transaction_type: 'sale',
                        notes: `Recipe sale: ${cartItem.item.name} (Order #${order.id.slice(0, 8)})`
                      });
                    }
                  }
                }
              }

              if (transactions.length > 0) {
                try {
                  await supabase.from('inventory_transactions').insert(transactions);
                } catch (txError) {
                  console.warn('Checkout sync: failed to write inventory transactions', txError);
                }
              }
            }

            // Successfully processed action
            processedActions.push(action);

          } catch (error: any) {
            // Error syncing action
            console.error('Error syncing action:', action.type, error);
            // If an action fails, we stop syncing to preserve order and retry later
            // or we could skip it. For now, stop.
            break;
          }
        }

        // Remove processed actions
        set(state => ({
          pendingActions: state.pendingActions.filter(a => !processedActions.includes(a))
        }));

        // Refresh data after sync
        get().fetchItemsAndCategories();
      },

      addItem: async (newItem) => {
        const { isSupabaseConfigured, items, isOnline } = get();

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const itemWithId = {
          ...newItem,
          id: tempId,
          created_at: new Date().toISOString()
        };
        set({ items: [...items, itemWithId] });

        if (isSupabaseConfigured) {
          if (isOnline) {
            try {
              // Test connection first
              const isConnected = await testConnection();
              if (!isConnected) {
                throw new Error('Supabase connection failed');
              }

              // Try workaround approach: insert without stock, then update stock
              const data = await addItemWithStockWorkaround(newItem);

              if (data) {
                // Replace temp item with real item
                set(state => ({
                  items: state.items.map(i => i.id === tempId ? data : i)
                }));

                if ((newItem.stock || 0) > 0) {
                  await addTransactionDirect({
                    item_id: data.id,
                    quantity_change: newItem.stock || 0,
                    transaction_type: 'restock',
                    notes: 'Initial stock'
                  });
                }
              }
            } catch (error: any) {
              // Error adding item
              console.error('Error in addItem:', error);
              console.error('Error message:', error?.message);
              console.error('Error details:', error?.details);

              // Show user-friendly error
              alert(`Error adding item: ${error?.message || 'Unknown error'}`);

              // If it failed while online (e.g. network glitch), queue it as a pending action
              set(state => ({
                pendingActions: [...state.pendingActions, {
                  type: 'ADD_ITEM',
                  payload: { ...newItem, tempId }
                }]
              }));
            }
          } else {
            // Offline: Queue action
            set(state => ({
              pendingActions: [...state.pendingActions, {
                type: 'ADD_ITEM',
                payload: { ...newItem, tempId }
              }]
            }));
          }
        }
      },

      editItem: async (itemId, updatedItem) => {
        const { isSupabaseConfigured, items } = get();

        // Optimistic update
        set({ items: items.map(i => i.id === itemId ? { ...i, ...updatedItem } : i) });

        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase
              .from('items')
              .update(updatedItem)
              .eq('id', itemId);

            if (error) throw error;
          } catch (error) {
            // Error editing item
            // Revert on failure
            set({ items });
          }
        }
      },

      deleteItem: async (itemId) => {
        const { isSupabaseConfigured, items } = get();

        // Optimistic update
        set({ items: items.filter(i => i.id !== itemId) });

        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase
              .from('items')
              .delete()
              .eq('id', itemId);

            if (error) throw error;
          } catch (error) {
            // Error deleting item
            // Revert on failure
            set({ items });
          }
        }
      },

      addCategory: async (newCategory) => {
        const { isSupabaseConfigured, categories, isOnline } = get();

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const categoryWithId = {
          ...newCategory,
          id: tempId,
          created_at: new Date().toISOString()
        };
        set({ categories: [...categories, categoryWithId] });

        if (isSupabaseConfigured) {
          if (isOnline) {
            try {
              const { data, error } = await supabase
                .from('categories')
                .insert(newCategory)
                .select()
                .single();

              if (error) throw error;

              if (data) {
                // Replace temp category with real category
                set(state => ({
                  categories: state.categories.map(c => c.id === tempId ? data : c)
                }));
              }
            } catch (error) {
              // Error adding category
              // If it failed while online (e.g. network glitch), queue it as a pending action
              set(state => ({
                pendingActions: [...state.pendingActions, {
                  type: 'ADD_CATEGORY',
                  payload: { ...newCategory, tempId }
                }]
              }));
            }
          } else {
            // Offline: Queue action
            set(state => ({
              pendingActions: [...state.pendingActions, {
                type: 'ADD_CATEGORY',
                payload: { ...newCategory, tempId }
              }]
            }));
          }
        }
      },

      editCategory: async (categoryId, updatedCategory) => {
        const { isSupabaseConfigured, categories } = get();

        // Optimistic update
        set({ categories: categories.map(c => c.id === categoryId ? { ...c, ...updatedCategory } : c) });

        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase
              .from('categories')
              .update(updatedCategory)
              .eq('id', categoryId);

            if (error) throw error;
          } catch (error) {
            // Error editing category
            // Revert on failure
            set({ categories });
          }
        }
      },

      deleteCategory: async (categoryId) => {
        const { isSupabaseConfigured, categories } = get();

        // Optimistic update
        set({ categories: categories.filter(c => c.id !== categoryId) });

        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase
              .from('categories')
              .delete()
              .eq('id', categoryId);

            if (error) throw error;
          } catch (error) {
            // Error deleting category
            // Revert on failure
            set({ categories });
          }
        }
      },

      addExpense: async (newExpense) => {
        const { isSupabaseConfigured, isOnline } = get();

        if (isSupabaseConfigured) {
          if (isOnline) {
            try {
              const { error } = await supabase
                .from('expenses')
                .insert(newExpense);

              if (error) throw error;
            } catch (error) {
              // Error adding expense
              const tempId = `temp-${Date.now()}`;
              set(state => ({
                pendingActions: [...state.pendingActions, {
                  type: 'ADD_EXPENSE',
                  payload: { ...newExpense, tempId }
                }]
              }));
            }
          } else {
            const tempId = `temp-${Date.now()}`;
            set(state => ({
              pendingActions: [...state.pendingActions, {
                type: 'ADD_EXPENSE',
                payload: { ...newExpense, tempId }
              }]
            }));
          }
        }
      },

      addEmployee: async (newEmployee) => {
        const { isSupabaseConfigured, isOnline } = get();

        if (isSupabaseConfigured) {
          if (isOnline) {
            try {
              const { error } = await supabase
                .from('employees')
                .insert(newEmployee);

              if (error) throw error;
            } catch (error) {
              // Error adding employee
              const tempId = `temp-${Date.now()}`;
              set(state => ({
                pendingActions: [...state.pendingActions, {
                  type: 'ADD_EMPLOYEE',
                  payload: { ...newEmployee, tempId }
                }]
              }));
            }
          } else {
            const tempId = `temp-${Date.now()}`;
            set(state => ({
              pendingActions: [...state.pendingActions, {
                type: 'ADD_EMPLOYEE',
                payload: { ...newEmployee, tempId }
              }]
            }));
          }
        }
      },

      deleteEmployee: async (employeeId) => {
        const { isSupabaseConfigured } = get();
        if (isSupabaseConfigured) {
          try {
            const { error } = await supabase
              .from('employees')
              .delete()
              .eq('id', employeeId);
            if (error) throw error;
          } catch (error) {
            // Error deleting employee
          }
        }
      },

      updateItemStock: async (itemId, stock, notes) => {
        const { isSupabaseConfigured, items, isOnline } = get();
        const item = items.find(i => i.id === itemId);
        const oldStock = item?.stock || 0;
        const diff = stock - oldStock;

        if (diff === 0) return;

        // Optimistic update
        set({ items: items.map(i => i.id === itemId ? { ...i, stock } : i) });

        if (isSupabaseConfigured) {
          if (isOnline) {
            try {
              await updateStockDirect(itemId, stock);

              await addTransactionDirect({
                item_id: itemId,
                quantity_change: diff,
                transaction_type: diff > 0 ? 'restock' : 'adjustment',
                notes: notes || (diff > 0 ? 'Stock addition' : 'Manual adjustment')
              });

            } catch (error) {
              // Error updating stock
              // If it failed while online, queue it as a pending action
              set(state => ({
                pendingActions: [...state.pendingActions, {
                  type: 'UPDATE_STOCK',
                  payload: { itemId, stock }
                }]
              }));
            }
          } else {
            // Offline: Queue action
            set(state => ({
              pendingActions: [...state.pendingActions, {
                type: 'UPDATE_STOCK',
                payload: { itemId, stock }
              }]
            }));
          }
        }
      },

      addToCart: (item, options) => {
        const { cart, currentTable, currentOrderType, items, isSupabaseConfigured, isOnline } = get();
        const sourceId = options?.sourceItemId || item.id;
        const portionId = options?.portionId;
        const addQty = options?.quantity ?? 1;

        // Check if item with same portion already exists
        // Don't combine with items that have been sent to kitchen or completed in kitchen
        const existing = portionId
          ? cart.find(c => (c.sourceItemId || c.item.id) === sourceId && c.portionId === portionId && !c.sentToKitchen && !c.completedInKitchen)
          : cart.find(c => (c.sourceItemId || c.item.id) === sourceId && !c.portionId && !c.sentToKitchen && !c.completedInKitchen);

        // Get current stock for validation only (don't deduct yet)
        const sourceItem = items.find(i => i.id === sourceId);
        const isRecipe = item.is_recipe === false;
        
        // For portions, use item.stock (portion stock)
        // For recipes, use the stock passed in (calculated from recipeStocks)
        // For regular items, use stock from items array
        const currentStock = portionId ? (item.stock ?? 0) : (isRecipe ? (item.stock ?? 0) : (sourceItem?.stock ?? 0));
        const currentQty = existing ? existing.quantity : 0;

        // Check if enough stock (validation only)
        if (currentQty + addQty > currentStock) {
          alert(`Not enough stock for ${item.name}. Available: ${currentStock}`);
          return;
        }

        // Add to cart WITHOUT deducting stock
        // Stock will be deducted only when checkout is confirmed
        if (existing) {
          set({ cart: cart.map(c => c === existing ? { ...c, quantity: c.quantity + addQty } : c) });
        } else {
          set({
            cart: [...cart, {
              item,
              quantity: addQty,
              clientLineId: createCartLineId(),
              sourceItemId: sourceId,
              portionName: options?.portionName,
              portionId: portionId,
              sentToKitchen: false,
              completedInKitchen: false
            }]
          });
        }

        // Mark table as occupied when adding first item (dine-in only)
        if (cart.length === 0 && currentTable && currentOrderType === 'dine-in') {
          get().markTableAsOccupied(currentTable.id);
        }
      },

      removeFromCart: (itemId) => {
        const { cart, currentTable, currentOrderType, isSupabaseConfigured, isOnline } = get();
        const newCart = cart.filter(c => c.item.id !== itemId);
        set({ cart: newCart });
        
        // Auto release table if cart becomes empty
        if (newCart.length === 0 && currentTable && currentOrderType === 'dine-in' && isSupabaseConfigured && isOnline) {
          setTimeout(async () => {
            try {
              await supabase
                .from('tables')
                .update({ status: 'available', current_order_id: null })
                .eq('id', currentTable.id);
              get().clearCurrentTable();
            } catch (err) {
              console.error('Failed to auto-release table:', err);
            }
          }, 100);
        }
      },

      removeFromCartByIndex: (index) => {
        const { cart, currentTable, currentOrderType, isSupabaseConfigured, isOnline } = get();
        const itemToRemove = cart[index];
        
        if (!itemToRemove) return;
        
        // Don't return stock here - stock will be managed only during checkout
        // Just remove from cart
        const newCart = cart.filter((_, i) => i !== index);
        set({ cart: newCart });
        
        // Auto release table if cart becomes empty
        if (newCart.length === 0 && currentTable && currentOrderType === 'dine-in' && isSupabaseConfigured && isOnline) {
          setTimeout(async () => {
            try {
              await supabase
                .from('tables')
                .update({ status: 'available', current_order_id: null })
                .eq('id', currentTable.id);
              get().clearCurrentTable();
            } catch (err) {
              console.error('Failed to auto-release table:', err);
            }
          }, 100);
        }
      },

      cancelCartItem: (itemId, portionId) => {
        const { cart } = get();
        const cancelledAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedCart = cart.map(item => {
          const matchesItem = (item.sourceItemId || item.item.id) === itemId;
          const matchesPortion = portionId ? item.portionId === portionId : !item.portionId;
          
          if (matchesItem && matchesPortion && item.sentToKitchen) {
            return { ...item, cancelled: true, cancelledAt };
          }
          return item;
        });
        set({ cart: updatedCart });
      },

      cancelCartItemByIndex: (index) => {
        const { cart } = get();
        const itemToCancel = cart[index];
        
        if (!itemToCancel || !itemToCancel.sentToKitchen) {
          return;
        }
        
        // Don't return stock here - stock will be managed only during checkout
        // Just mark as cancelled
        const cancelledAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedCart = cart.map((item, i) => {
          if (i === index && item.sentToKitchen) {
            return { ...item, cancelled: true, cancelledAt };
          }
          return item;
        });
        set({ cart: updatedCart });
      },

      updateCartQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(itemId);
          return;
        }

        const { cart, items } = get();
        const cartItem = cart.find(c => c.item.id === itemId);
        if (!cartItem) return;
        const sourceId = cartItem.sourceItemId || cartItem.item.id;
        const item = items.find(i => i.id === sourceId);

        const currentStock = Number(cartItem.item.stock ?? 0);
        const exceeded = (() => {
          if (cartItem.portionId) {
            return quantity > currentStock;
          }
          const otherLinesQty = cart
            .filter(c => c.item.id !== itemId && (c.sourceItemId || c.item.id) === sourceId)
            .reduce((sum, c) => sum + c.quantity, 0);
          return otherLinesQty + quantity > currentStock;
        })();

        if (exceeded) {
          alert(`Not enough stock for ${(item?.name || cartItem.item.name)}. Available: ${currentStock}`);
          return;
        }

        set({ cart: cart.map(c => c.item.id === itemId ? { ...c, quantity } : c) });
      },

      updateCartQuantityByIndex: (index, quantity) => {
        if (quantity <= 0) {
          get().removeFromCartByIndex(index);
          return;
        }

        const { cart, items, isSupabaseConfigured, isOnline } = get();
        const cartItem = cart[index];
        if (!cartItem) return;
        
        const sourceId = cartItem.sourceItemId || cartItem.item.id;
        const item = items.find(i => i.id === sourceId);
        
        // Calculate the difference in quantity
        const oldQuantity = cartItem.quantity;
        const quantityDiff = quantity - oldQuantity;
        
        // No change
        if (quantityDiff === 0) {
          return;
        }
        
        // For portions, validate stock but don't deduct/return
        if (cartItem.portionId) {
          const portionStock = cartItem.item.stock ?? 0;
          
          if (quantity > portionStock) {
            alert(`Not enough stock for ${cartItem.portionName || cartItem.item.name}. Available: ${portionStock}`);
            return;
          }
          
          // Just update quantity, don't touch stock
          set({ 
            cart: cart.map((c, i) => i === index ? { ...c, quantity } : c) 
          });
          
          return;
        }
        
        // For recipes, just update quantity (stock managed by ingredients)
        const isRecipe = cartItem.item.is_recipe === false;
        if (isRecipe) {
          set({ cart: cart.map((c, i) => i === index ? { ...c, quantity } : c) });
          return;
        }
        
        // For regular items, validate stock but don't deduct/return
        const currentStock = item?.stock ?? 0;
        
        if (quantity > currentStock) {
          alert(`Not enough stock for ${item?.name || cartItem.item.name}. Available: ${currentStock}`);
          return;
        }
        
        // Just update quantity, don't touch stock
        set({ 
          cart: cart.map((c, i) => i === index ? { ...c, quantity } : c) 
        });
      },

      clearCart: async () => {
        const { currentTable, currentOrderType, isSupabaseConfigured, isOnline, savedCarts } = get();
        
        // Release table if dine-in and cart is being cleared
        if (currentTable && currentOrderType === 'dine-in' && isSupabaseConfigured && isOnline) {
          try {
            await supabase
              .from('tables')
              .update({ status: 'available', current_order_id: null })
              .eq('id', currentTable.id);
          } catch (err) {
            console.error('Failed to release table:', err);
          }
        }
        
        // ล้าง savedCart ของโต๊ะ/orderType ปัจจุบัน
        if (currentTable || currentOrderType) {
          const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
          delete savedCarts[currentKey];
        }
        
        set({ 
          cart: [], 
          currentTable: null, 
          currentOrderType: null,
          savedCarts: { ...savedCarts }
        });
      },

      clearUnsentItems: () => {
        const { cart, currentTable, currentOrderType, isSupabaseConfigured, isOnline } = get();
        // Keep only items that have been sent to kitchen
        const sentItems = cart.filter(item => item.sentToKitchen);
        set({ cart: sentItems });
        
        // Auto release table if cart becomes empty
        if (sentItems.length === 0 && currentTable && currentOrderType === 'dine-in' && isSupabaseConfigured && isOnline) {
          setTimeout(async () => {
            try {
              await supabase
                .from('tables')
                .update({ status: 'available', current_order_id: null })
                .eq('id', currentTable.id);
              get().clearCurrentTable();
            } catch (err) {
              console.error('Failed to auto-release table:', err);
            }
          }, 100);
        }
      },

      markCartItemsAsSent: () => {
        const cart = get().cart;
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedCart = cart.map(item => {
          if (!item.sentToKitchen && !item.cancelled) {
            return { 
              ...item, 
              clientLineId: item.clientLineId || createCartLineId(),
              sentToKitchen: true,
              sentToKitchenTime: currentTime
            };
          }
          return item;
        });
        set({ cart: updatedCart });
      },

      holdOrder: async (note) => {
        const { cart, heldOrders, currentTable, currentOrderType, savedCarts } = get();
        if (cart.length === 0) return;

        const newHeldOrder = {
          id: `hold-${Date.now()}`,
          cart: [...cart],
          date: new Date().toISOString(),
          note,
          table: currentTable,
          orderType: currentOrderType
        };

        // Release table if dine-in
        if (currentTable && currentOrderType === 'dine-in') {
          try {
            await supabase
              .from('tables')
              .update({ status: 'available', current_order_id: null })
              .eq('id', currentTable.id);
          } catch (err) {
            console.error('Failed to release table:', err);
          }
        }

        // ลบ savedCart ของโต๊ะ/orderType ปัจจุบัน
        if (currentTable || currentOrderType) {
          const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
          delete savedCarts[currentKey];
        }

        set({
          heldOrders: [...heldOrders, newHeldOrder],
          cart: [],
          currentTable: null,
          currentOrderType: null,
          savedCarts: { ...savedCarts }
        });
      },

      resumeOrder: async (orderId) => {
        const { heldOrders, cart } = get();
        const orderToResume = heldOrders.find(o => o.id === orderId);

        if (!orderToResume) return;

        if (cart.length > 0) {
          const confirm = window.confirm("Current cart is not empty. Replace it with held order?");
          if (!confirm) return;
        }

        // Check if table is still available (for dine-in orders)
        if (orderToResume.table && orderToResume.orderType === 'dine-in') {
          try {
            const { data: tableData } = await supabase
              .from('tables')
              .select('status')
              .eq('id', orderToResume.table.id)
              .single();

            if (tableData && tableData.status !== 'available') {
              alert('Table is no longer available. Please select a new table.');
              return;
            }
          } catch (error) {
            console.error('Failed to check table availability:', error);
          }
        }

        // Mark items that were sent to kitchen as completedInKitchen
        // This prevents them from combining with new items
        const resumedCart = orderToResume.cart.map(item => ({
          ...item,
          sentToKitchen: false,
          completedInKitchen: item.sentToKitchen === true
        }));

        set({
          cart: resumedCart,
          currentTable: orderToResume.table || null,
          currentOrderType: orderToResume.orderType || null,
          heldOrders: heldOrders.filter(o => o.id !== orderId)
        });

        // Mark table as occupied if dine-in
        if (orderToResume.table && orderToResume.orderType === 'dine-in') {
          get().markTableAsOccupied(orderToResume.table.id);
        }
      },

      removeHeldOrder: (orderId) => {
        set({ heldOrders: get().heldOrders.filter(o => o.id !== orderId) });
      },
      setHeldOrders: (orders) => set({ heldOrders: orders }),

      checkout: async (paymentMethod, notes, cashTendered, selectedBank, totalOverride) => {
        const { cart, isSupabaseConfigured, items, isOnline, generalSettings, currentTable, currentOrderType, isCheckingOut } = get();
        
        console.log('[CHECKOUT] Starting checkout...', {
          cartLength: cart.length,
          isSupabaseConfigured,
          isOnline,
          isCheckingOut
        });
        
        if (cart.length === 0) return false;
        
        // Prevent duplicate checkout calls
        if (isCheckingOut) {
          console.log('[CHECKOUT] Already processing checkout, ignoring duplicate call');
          return false;
        }
        
        // Filter out cancelled items
        const activeCart = cart.filter(c => !c.cancelled);
        console.log('[CHECKOUT] Active cart items:', activeCart.length);
        
        if (activeCart.length === 0) return false;
        
        // Set checkout flag to prevent duplicate calls
        set({ checkoutError: null, isCheckingOut: true });
        
        const previousCart = [...cart];
        const previousItems = [...items];
        const subtotal = activeCart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
        const taxRate = Math.max(0, Number(generalSettings.taxRate || 0));
        const calculatedTotalAmount = subtotal + (subtotal * taxRate / 100);
        const totalAmount = Number.isFinite(totalOverride) && typeof totalOverride === 'number'
          ? Math.max(0, totalOverride)
          : calculatedTotalAmount;
        const selectedBankForMeta = stripBankQrCode(selectedBank);

        console.log('[CHECKOUT] Clearing cart from UI...');
        // Clear cart immediately (don't update stock in local state yet)
        set({ cart: [] });

        if (!isSupabaseConfigured) {
          // For offline mode, update stock locally
          const deductedBySourceId = activeCart.reduce<Record<string, number>>((acc, cartLine) => {
            const sourceId = cartLine.sourceItemId || cartLine.item.id;
            acc[sourceId] = (acc[sourceId] || 0) + cartLine.quantity;
            return acc;
          }, {});

          const newItems = items.map(item => {
            const deductedQty = deductedBySourceId[item.id] || 0;
            if (deductedQty > 0) {
              return { ...item, stock: Math.max(0, (item.stock || 0) - deductedQty) };
            }
            return item;
          });

          set({ items: newItems });
          
          // Clear table info on successful checkout
          set({ currentTable: null, currentOrderType: null, isCheckingOut: false });
          return true;
        }

        if (isOnline) {
          let createdOrderId: string | null = null;
          try {
            const orderInsertPayload: Record<string, any> = {
              total_amount: totalAmount,
              status: 'completed',
              payment_method: paymentMethod,
              table_id: currentTable?.id || null,
              zone_id: currentTable?.zone_id || null,
              order_type: currentOrderType || 'takeout'
            };
            if (notes) orderInsertPayload.notes = notes;

            let orderInsertResult = await supabase
              .from('orders')
              .insert(orderInsertPayload)
              .select()
              .single();

            if (orderInsertResult.error && orderInsertPayload.notes !== undefined && isMissingColumnInSchemaCache(orderInsertResult.error, 'orders', 'notes')) {
              delete orderInsertPayload.notes;
              orderInsertResult = await supabase
                .from('orders')
                .insert(orderInsertPayload)
                .select()
                .single();
            }

            const { data: order, error: orderError } = orderInsertResult;

            if (orderError) throw new Error(orderError.message || 'Failed to create order');
            if (!order) throw new Error('Order insert returned no data');
            createdOrderId = order.id;
            if (notes || Number.isFinite(cashTendered)) {
              set((state) => ({
                orderMetaById: {
                  ...state.orderMetaById,
                  [order.id]: {
                    note: notes || '',
                    cashTendered: paymentMethod === 'cash' && Number.isFinite(cashTendered) ? cashTendered : null
                  }
                }
              }));
            }
            if (selectedBankForMeta) {
              set((state) => ({
                orderMetaById: {
                  ...state.orderMetaById,
                  [order.id]: {
                    ...(state.orderMetaById[order.id] || {}),
                    selectedBank: selectedBankForMeta
                  }
                }
              }));
            }

            const inventoryItemIds = new Set(items.map(i => i.id));
            // Use activeCart instead of cart for order items
            const orderItems = activeCart.map((c, index) => {
              const sourceId = c.sourceItemId || c.item.id;
              const isInventoryItem = inventoryItemIds.has(sourceId);
              const orderMeta = index === 0
                ? `Order Meta >>>${encodeURIComponent(JSON.stringify({
                  orderNote: notes || '',
                  cashTendered: paymentMethod === 'cash' && Number.isFinite(cashTendered) ? cashTendered : null,
                  selectedBank: selectedBankForMeta || null,
                }))}<<<`
                : undefined;
              return {
                order_id: order.id,
                item_id: isInventoryItem ? sourceId : null,
                quantity: c.quantity,
                price_at_time: c.item.price,
                notes: isInventoryItem
                  ? [`Item: ${c.item.name}`, c.notes, c.portionName ? `Portion: ${c.portionName}` : undefined, orderMeta].filter(Boolean).join(' | ') || undefined
                  : [`Item: ${c.item.name}`, `Recipe: ${c.item.name}`, c.notes, c.portionName ? `Portion: ${c.portionName}` : undefined, orderMeta].filter(Boolean).join(' | ') || undefined
              };
            });

            let orderItemsToInsert: any[] = orderItems;
            let { error: itemsError } = await supabase
              .from('order_items')
              .insert(orderItemsToInsert);
            if (itemsError && isMissingColumnInSchemaCache(itemsError, 'order_items', 'notes')) {
              orderItemsToInsert = orderItems.map(({ notes: _notes, ...rest }) => rest);
              const retryResult = await supabase
                .from('order_items')
                .insert(orderItemsToInsert);
              itemsError = retryResult.error;
            }

            if (itemsError) {
              const errorMessage = String((itemsError as any)?.message || '').toLowerCase();
              const itemIdConstraintError =
                errorMessage.includes('item_id') &&
                (errorMessage.includes('not-null') || errorMessage.includes('null value'));

              if (itemIdConstraintError) {
                const inventoryOnlyOrderItems = orderItemsToInsert.filter((line: any) => line.item_id);
                if (inventoryOnlyOrderItems.length > 0) {
                  const { error: fallbackItemsError } = await supabase
                    .from('order_items')
                    .insert(inventoryOnlyOrderItems);
                  if (fallbackItemsError) throw new Error(fallbackItemsError.message || 'Failed to insert order items (fallback)');
                }
              } else {
                throw new Error(itemsError.message || 'Failed to insert order items');
              }
            }

            const transactions = [];
            const portionDeductions: Record<string, number> = {};
            const inventoryDeductions: Record<string, number> = {};
            const recipeOrderQty: Record<string, number> = {};

            // Use activeCart instead of cart to avoid double deduction
            for (const cartItem of activeCart) {
              const sourceId = cartItem.sourceItemId || cartItem.item.id;
              if (cartItem.portionId) {
                portionDeductions[cartItem.portionId] = (portionDeductions[cartItem.portionId] || 0) + cartItem.quantity;
              }
              const isInventoryItem = items.some(i => i.id === sourceId);
              if (isInventoryItem) {
                inventoryDeductions[sourceId] = (inventoryDeductions[sourceId] || 0) + cartItem.quantity;
              } else {
                recipeOrderQty[sourceId] = (recipeOrderQty[sourceId] || 0) + cartItem.quantity;
              }
            }

            for (const [portionId, qty] of Object.entries(portionDeductions)) {
              const { data: portion, error: portionFetchError } = await supabase
                .from('item_portions')
                .select('portion_stock')
                .eq('id', portionId)
                .single();
              if (portionFetchError) throw new Error(portionFetchError.message || 'Failed to fetch portion stock');
              const newPortionStock = Math.max(0, (portion?.portion_stock || 0) - qty);
              const { error: portionUpdateError } = await supabase
                .from('item_portions')
                .update({ portion_stock: newPortionStock })
                .eq('id', portionId);
              if (portionUpdateError) throw new Error(portionUpdateError.message || 'Failed to update portion stock');
            }

            for (const [itemId, qty] of Object.entries(inventoryDeductions)) {
              console.log(`[CHECKOUT] Deducting ${qty} from item ${itemId}`);
              const { data: currentItem, error: itemFetchError } = await supabase
                .from('items')
                .select('stock')
                .eq('id', itemId)
                .single();
              if (itemFetchError) throw new Error(itemFetchError.message || 'Failed to fetch item stock');
              
              const oldStock = currentItem?.stock || 0;
              const newStock = Math.max(0, oldStock - qty);
              console.log(`[CHECKOUT] Item ${itemId}: ${oldStock} -> ${newStock}`);
              
              const { error: itemUpdateError } = await supabase
                .from('items')
                .update({ stock: newStock })
                .eq('id', itemId);
              if (itemUpdateError) throw new Error(itemUpdateError.message || 'Failed to update item stock');

              transactions.push({
                item_id: itemId,
                quantity_change: -qty,
                transaction_type: 'sale',
                notes: `Order #${order.id.slice(0, 8)}`
              });
            }

            const ingredientDeductions: Record<string, number> = {};
            for (const [recipeId, orderedQty] of Object.entries(recipeOrderQty)) {
              const { data: ingredients, error: ingredientsError } = await supabase
                .from('recipe_ingredients')
                .select('ingredient_id, quantity_needed')
                .eq('recipe_id', recipeId);
              if (ingredientsError) throw new Error(ingredientsError.message || 'Failed to fetch recipe ingredients');
              for (const ingredient of ingredients || []) {
                const deduction = Math.max(0, Math.ceil(Number(ingredient.quantity_needed || 0) * orderedQty));
                ingredientDeductions[ingredient.ingredient_id] = (ingredientDeductions[ingredient.ingredient_id] || 0) + deduction;
              }
            }

            for (const [ingredientId, qty] of Object.entries(ingredientDeductions)) {
              const { data: ingredientItem, error: ingredientFetchError } = await supabase
                .from('items')
                .select('stock')
                .eq('id', ingredientId)
                .single();
              if (ingredientFetchError) throw new Error(ingredientFetchError.message || 'Failed to fetch ingredient stock');
              const newStock = Math.max(0, (ingredientItem?.stock || 0) - qty);
              const { error: ingredientUpdateError } = await supabase
                .from('items')
                .update({ stock: newStock })
                .eq('id', ingredientId);
              if (ingredientUpdateError) throw new Error(ingredientUpdateError.message || 'Failed to update ingredient stock');

              transactions.push({
                item_id: ingredientId,
                quantity_change: -qty,
                transaction_type: 'sale',
                notes: `Recipe sale (Order #${order.id.slice(0, 8)})`
              });
            }

            if (transactions.length > 0) {
              try {
                await supabase.from('inventory_transactions').insert(transactions);
              } catch (txError) {
                console.warn('Checkout: failed to write inventory transactions', txError);
              }
            }

            await get().fetchItemsAndCategories();
            set({ checkoutError: null });

            // Release table after successful checkout
            if (currentTable && currentOrderType === 'dine-in') {
              try {
                await supabase
                  .from('tables')
                  .update({ 
                    status: 'available',
                    current_order_id: null
                  })
                  .eq('id', currentTable.id);
              } catch (tableError) {
                console.error('Failed to release table:', tableError);
              }
            }

            // ล้าง savedCart ของโต๊ะ/orderType ปัจจุบัน
            const { savedCarts } = get();
            if (currentTable || currentOrderType) {
              const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
              delete savedCarts[currentKey];
            }

            // Clear current table and order type
            set({ 
              currentTable: null, 
              currentOrderType: null,
              savedCarts: { ...savedCarts }
            });

            // Track shift amounts if shift is open
            if (get().isShiftOpen) {
              const { shiftCashAmount, shiftTransferAmount } = get();
              const { user } = get();
              
              // Update shift amounts
              set(state => ({
                shiftCashAmount: state.shiftCashAmount + (paymentMethod === 'cash' && Number.isFinite(cashTendered) ? (cashTendered || 0) : 0),
                shiftTransferAmount: state.shiftTransferAmount + (paymentMethod === 'transfer' || paymentMethod === 'card' || paymentMethod === 'online' ? totalAmount : 0)
              }));

              // Sync shift to database
              const { isOnline } = get();
              if (isOnline) {
                try {
                  const shiftData = {
                    cash_amount: shiftCashAmount + (paymentMethod === 'cash' && Number.isFinite(cashTendered) ? (cashTendered || 0) : 0),
                    transfer_amount: shiftTransferAmount + (paymentMethod === 'transfer' || paymentMethod === 'card' || paymentMethod === 'online' ? totalAmount : 0)
                  };
                  
                  // Update existing open shift
                  const { data: existingShift, error: fetchError } = await supabase
                    .from('shifts')
                    .select('id')
                    .eq('status', 'open')
                    .order('start_time', { ascending: false })
                    .limit(1)
                    .single();

                  if (existingShift) {
                    await supabase
                      .from('shifts')
                      .update(shiftData)
                      .eq('id', existingShift.id);
                  } else {
                    // Create new shift record
                    await supabase
                      .from('shifts')
                      .insert({
                        start_time: get().shiftStartTime,
                        cash_amount: shiftCashAmount + (paymentMethod === 'cash' && Number.isFinite(cashTendered) ? (cashTendered || 0) : 0),
                        transfer_amount: shiftTransferAmount + (paymentMethod === 'transfer' || paymentMethod === 'card' || paymentMethod === 'online' ? totalAmount : 0),
                        status: 'open',
                        started_by: user?.name || null
                      });
                  }
                } catch (shiftError) {
                  console.warn('Failed to sync shift to database:', shiftError);
                }
              }
            }

            // Refresh items from database to get updated stock
            console.log('[CHECKOUT] Fetching updated items from database...');
            await get().fetchItemsAndCategories();
            console.log('[CHECKOUT] Items refreshed successfully');

            // Reset checkout flag
            set({ isCheckingOut: false });

            return true;
          } catch (error) {
            const checkoutErrorMessage =
              error instanceof Error
                ? error.message
                : typeof error === 'string'
                  ? error
                  : (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string')
                    ? (error as any).message
                    : `Unknown checkout error (${JSON.stringify(error)})`;
            console.warn('Checkout failed:', checkoutErrorMessage);
            if (createdOrderId) {
              const failedOrderId = createdOrderId;
              try {
                await supabase.from('orders').delete().eq('id', failedOrderId);
              } catch (rollbackError) {
                console.warn('Failed to rollback failed checkout order:', rollbackError);
              }
              set((state) => {
                const next = { ...state.orderMetaById };
                delete next[failedOrderId];
                return { orderMetaById: next };
              });
            }
            // Revert optimistic update so UI matches persisted data.
            set({ cart: previousCart, items: previousItems, checkoutError: checkoutErrorMessage, isCheckingOut: false });
            return false;
          }
        } else {
          // Offline: Queue action
          set(state => ({
            pendingActions: [...state.pendingActions, {
              type: 'CHECKOUT',
              payload: {
                cart,
                paymentMethod,
                totalAmount,
                date: new Date().toISOString(),
                notes,
                cashTendered,
                selectedBank: selectedBankForMeta
              }
            }]
          }));
          set({ checkoutError: null, isCheckingOut: false });
          return true;
        }
      }
    }),
    {
      name: 'pos-storage',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<PosState>) || {};
        const current = currentState as PosState;

        return {
          ...current,
          ...persisted,
          pendingActions: stripPendingActionQrCodes(persisted.pendingActions || current.pendingActions),
          orderMetaById: stripOrderMetaQrCodes(persisted.orderMetaById || current.orderMetaById),
          bankConfigs: sanitizeBankConfigsForPersist(persisted.bankConfigs || current.bankConfigs),
          licenseInfo: {
            ...current.licenseInfo,
            ...(persisted.licenseInfo || {}),
            key: current.licenseInfo.key || ''
          }
        };
      },
      partialize: (state) => ({
        items: state.items,
        categories: state.categories,
        pendingActions: stripPendingActionQrCodes(state.pendingActions),
        orderMetaById: stripOrderMetaQrCodes(state.orderMetaById),
        heldOrders: state.heldOrders,
        savedCarts: state.savedCarts,
        currentTable: state.currentTable,
        currentOrderType: state.currentOrderType,
        cart: state.cart,
        receiptSettings: state.receiptSettings,
        currencySettings: state.currencySettings,
        generalSettings: state.generalSettings,
        bankConfigs: sanitizeBankConfigsForPersist(state.bankConfigs),
        unitConfigs: state.unitConfigs,
        printerConfigs: state.printerConfigs,
        stationMappings: state.stationMappings,
        licenseInfo: state.licenseInfo,
        licenseApiData: state.licenseApiData,
        licenseSyncAt: state.licenseSyncAt
      }),
    }
  )
);

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
const MAX_PERSISTED_QR_CODE_LENGTH = 1_000_000;
let pushSettingsTimer: ReturnType<typeof setTimeout> | null = null;

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

export type SplitBillAllocation = {
  lineKey: string;
  quantity: number;
  /** @deprecated migrated to lineKey */
  cartIndex?: number;
};

export type SplitBillTab = {
  id: string;
  name: string;
  allocations: SplitBillAllocation[];
  /** @deprecated migrated to allocations */
  itemIndices?: number[];
};

export function getCartLineKey(line: CartLine, _index?: number) {
  if (line.clientLineId) return `c:${line.clientLineId}`;
  if (line.orderItemId) return `o:${line.orderItemId}`;
  return `f:${line.sourceItemId || line.item.id}:${line.portionId || 'base'}:${line.notes || ''}:${line.sentToKitchen ? 's' : 'u'}`;
}

export function resolveCartIndexFromLineKey(cart: CartLine[], lineKey: string): number {
  return cart.findIndex((line, index) => getCartLineKey(line, index) === lineKey);
}

export function resolveAllocationLineKey(
  allocation: SplitBillAllocation,
  cart: CartLine[]
): string | null {
  if (allocation.lineKey) return allocation.lineKey;
  if (
    allocation.cartIndex !== undefined &&
    allocation.cartIndex >= 0 &&
    allocation.cartIndex < cart.length
  ) {
    return getCartLineKey(cart[allocation.cartIndex], allocation.cartIndex);
  }
  return null;
}

export function normalizeSplitBillAllocation(
  allocation: SplitBillAllocation,
  cart: CartLine[]
): SplitBillAllocation | null {
  const lineKey = resolveAllocationLineKey(allocation, cart);
  if (!lineKey) return null;
  const cartIndex = resolveCartIndexFromLineKey(cart, lineKey);
  if (cartIndex < 0) return null;
  const line = cart[cartIndex];
  if (!line || line.cancelled) return null;
  const quantity = Math.min(allocation.quantity, line.quantity);
  if (quantity <= 0) return null;
  return { lineKey, quantity };
}

export function normalizeSplitBillTab(tab: SplitBillTab, cart: CartLine[]): SplitBillTab {
  const raw = tab.allocations?.length
    ? tab.allocations
    : (tab.itemIndices || []).map((idx) => ({
        cartIndex: idx,
        lineKey: idx >= 0 && idx < cart.length ? getCartLineKey(cart[idx], idx) : '',
        quantity: cart[idx]?.quantity ?? 1,
      }));

  const allocations = raw
    .map((a) => normalizeSplitBillAllocation(a as SplitBillAllocation, cart))
    .filter((a): a is SplitBillAllocation => a !== null);

  return { ...tab, allocations, itemIndices: undefined };
}

export function sanitizeSplitBillTabs(tabs: SplitBillTab[], cart: CartLine[]): SplitBillTab[] {
  return tabs.map((tab) => normalizeSplitBillTab(tab, cart));
}

export function getTotalAllocatedQtyForLineKey(tabs: SplitBillTab[], lineKey: string): number {
  return tabs.reduce(
    (sum, tab) => sum + (tab.allocations.find((a) => a.lineKey === lineKey)?.quantity ?? 0),
    0
  );
}

export function getTotalAllocatedQtyForLine(
  tabs: SplitBillTab[],
  cartIndex: number,
  cart: CartLine[]
): number {
  const line = cart[cartIndex];
  if (!line) return 0;
  return getTotalAllocatedQtyForLineKey(tabs, getCartLineKey(line, cartIndex));
}

export function fillUnassignedSplitBillItemsToFirstTab(
  tabs: SplitBillTab[],
  cart: CartLine[]
): SplitBillTab[] {
  if (!tabs.length) return tabs;
  let nextTabs = sanitizeSplitBillTabs(tabs, cart);
  cart.forEach((line, cartIndex) => {
    if (line.cancelled) return;
    const lineKey = getCartLineKey(line, cartIndex);
    const total = getTotalAllocatedQtyForLineKey(nextTabs, lineKey);
    const unassigned = line.quantity - total;
    if (unassigned > 0) {
      nextTabs = addSplitBillQtyToFirstTabByKey(nextTabs, lineKey, unassigned, cart);
    }
  });
  return nextTabs;
}

export function createFirstSplitBillTab(cart: CartLine[]): SplitBillTab[] {
  const allocations: SplitBillAllocation[] = [];
  cart.forEach((line, cartIndex) => {
    if (!line.cancelled && line.quantity > 0) {
      allocations.push({
        lineKey: getCartLineKey(line, cartIndex),
        quantity: line.quantity,
      });
    }
  });
  return [{ id: `sb-${Date.now()}`, name: 'Bill 1', allocations }];
}

export function setFirstTabLineAllocationByKey(
  tabs: SplitBillTab[],
  lineKey: string,
  quantity: number,
  cart: CartLine[]
): SplitBillTab[] {
  if (!tabs.length || quantity <= 0) return tabs;
  const cartIndex = resolveCartIndexFromLineKey(cart, lineKey);
  if (cartIndex < 0) return tabs;
  const line = cart[cartIndex];
  if (!line || line.cancelled) return tabs;

  const sanitized = sanitizeSplitBillTabs(tabs, cart);
  const otherQty = sanitized.slice(1).reduce(
    (sum, tab) => sum + (tab.allocations.find((a) => a.lineKey === lineKey)?.quantity ?? 0),
    0
  );
  const qty = Math.min(quantity, Math.max(0, line.quantity - otherQty));

  return sanitized.map((tab, tabIdx) => {
    if (tabIdx !== 0) return tab;
    const allocs = [...tab.allocations];
    const existingIdx = allocs.findIndex((a) => a.lineKey === lineKey);
    if (qty <= 0) {
      if (existingIdx >= 0) allocs.splice(existingIdx, 1);
    } else if (existingIdx >= 0) {
      allocs[existingIdx] = { lineKey, quantity: qty };
    } else {
      allocs.push({ lineKey, quantity: qty });
    }
    return { ...tab, allocations: allocs };
  });
}

export function setFirstTabLineAllocation(
  tabs: SplitBillTab[],
  cartIndex: number,
  quantity: number,
  cart: CartLine[]
): SplitBillTab[] {
  const line = cart[cartIndex];
  if (!line) return tabs;
  return setFirstTabLineAllocationByKey(tabs, getCartLineKey(line, cartIndex), quantity, cart);
}

export function addSplitBillQtyToFirstTabByKey(
  tabs: SplitBillTab[],
  lineKey: string,
  qtyToAdd: number,
  cart: CartLine[]
): SplitBillTab[] {
  if (!tabs.length || qtyToAdd <= 0) return tabs;
  const cartIndex = resolveCartIndexFromLineKey(cart, lineKey);
  if (cartIndex < 0) return tabs;
  const line = cart[cartIndex];
  if (!line || line.cancelled) return tabs;

  const sanitized = sanitizeSplitBillTabs(tabs, cart);
  const otherQty = sanitized.slice(1).reduce(
    (sum, tab) => sum + (tab.allocations.find((a) => a.lineKey === lineKey)?.quantity ?? 0),
    0
  );
  const maxFirst = Math.max(0, line.quantity - otherQty);

  return sanitized.map((tab, tabIdx) => {
    if (tabIdx !== 0) return tab;
    const allocs = [...tab.allocations];
    const existingIdx = allocs.findIndex((a) => a.lineKey === lineKey);
    const current = existingIdx >= 0 ? allocs[existingIdx].quantity : 0;
    const next = Math.min(maxFirst, current + qtyToAdd);
    if (next <= 0) {
      if (existingIdx >= 0) allocs.splice(existingIdx, 1);
    } else if (existingIdx >= 0) {
      allocs[existingIdx] = { lineKey, quantity: next };
    } else {
      allocs.push({ lineKey, quantity: next });
    }
    return { ...tab, allocations: allocs };
  });
}

export function addSplitBillQtyToFirstTab(
  tabs: SplitBillTab[],
  cartIndex: number,
  qtyToAdd: number,
  cart: CartLine[]
): SplitBillTab[] {
  const line = cart[cartIndex];
  if (!line) return tabs;
  return addSplitBillQtyToFirstTabByKey(tabs, getCartLineKey(line, cartIndex), qtyToAdd, cart);
}

export function assignSplitBillNewItemsToFirstTab(
  tabs: SplitBillTab[],
  oldCart: CartLine[],
  newCart: CartLine[]
): SplitBillTab[] {
  if (!newCart.some((line) => !line.cancelled)) return tabs;

  if (!tabs.length) {
    return createFirstSplitBillTab(newCart);
  }

  let nextTabs = sanitizeSplitBillTabs(tabs, newCart);

  if (!oldCart.length) {
    return fillUnassignedSplitBillItemsToFirstTab(nextTabs, newCart);
  }

  const oldQtyByKey = new Map<string, number>();
  oldCart.forEach((line, index) => {
    if (line.cancelled) return;
    oldQtyByKey.set(getCartLineKey(line, index), line.quantity);
  });

  newCart.forEach((line, cartIndex) => {
    if (line.cancelled) return;
    const key = getCartLineKey(line, cartIndex);
    const prevQty = oldQtyByKey.get(key);
    if (prevQty === undefined) {
      nextTabs = setFirstTabLineAllocationByKey(nextTabs, key, line.quantity, newCart);
    } else if (line.quantity > prevQty) {
      nextTabs = addSplitBillQtyToFirstTabByKey(nextTabs, key, line.quantity - prevQty, newCart);
    }
  });

  return nextTabs;
}

export function applyPartialPaymentToCart(
  cart: CartLine[],
  paidAllocations: SplitBillAllocation[]
): CartLine[] {
  const paidByKey = new Map<string, number>();
  for (const allocation of paidAllocations) {
    const key = resolveAllocationLineKey(allocation, cart);
    if (!key) continue;
    paidByKey.set(key, (paidByKey.get(key) || 0) + allocation.quantity);
  }

  const nextCart: CartLine[] = [];
  for (let i = 0; i < cart.length; i++) {
    const line = cart[i];
    const paidQty = paidByKey.get(getCartLineKey(line, i)) || 0;
    if (paidQty <= 0) {
      nextCart.push(line);
      continue;
    }
    const remaining = line.quantity - paidQty;
    if (remaining > 0) {
      nextCart.push({ ...line, quantity: remaining });
    }
  }
  return normalizeCart(nextCart);
}

export function reconcileSplitBillTabsAfterPartialPay(
  tabs: SplitBillTab[],
  paidAllocations: SplitBillAllocation[],
  paidTabId: string | undefined,
  cartBefore: CartLine[]
): SplitBillTab[] {
  const normalizedPaid = paidAllocations
    .map((a) => normalizeSplitBillAllocation(a, cartBefore))
    .filter((a): a is SplitBillAllocation => a !== null);
  const newCart = applyPartialPaymentToCart(cartBefore, normalizedPaid);

  return tabs.map((tab) => {
    if (paidTabId && tab.id === paidTabId) {
      return { ...tab, allocations: [] };
    }

    const newAllocations: SplitBillAllocation[] = [];
    for (const alloc of tab.allocations) {
      const lineKey = resolveAllocationLineKey(alloc, cartBefore);
      if (!lineKey) continue;
      const newIdx = resolveCartIndexFromLineKey(newCart, lineKey);
      if (newIdx < 0) continue;
      const qty = Math.min(alloc.quantity, newCart[newIdx]?.quantity ?? alloc.quantity);
      if (qty <= 0) continue;
      const existing = newAllocations.find((a) => a.lineKey === lineKey);
      if (existing) existing.quantity = Math.max(existing.quantity, qty);
      else newAllocations.push({ lineKey, quantity: qty });
    }
    return { ...tab, allocations: newAllocations };
  });
}

/** @deprecated use reconcileSplitBillTabsAfterPartialPay */
export function reconcileSplitBillTabsAfterPayment(
  tabs: SplitBillTab[],
  paidIndices: number[],
  cartLengthBefore: number
): SplitBillTab[] {
  const paidSet = new Set(paidIndices);
  const remainingOldIndices: number[] = [];
  for (let i = 0; i < cartLengthBefore; i++) {
    if (!paidSet.has(i)) remainingOldIndices.push(i);
  }
  const oldToNew = new Map<number, number>();
  remainingOldIndices.forEach((oldIdx, newIdx) => oldToNew.set(oldIdx, newIdx));

  return tabs.map((tab): SplitBillTab => {
    const allocations: SplitBillAllocation[] = tab.allocations
      .filter((a) => a.cartIndex !== undefined && !paidSet.has(a.cartIndex))
      .flatMap((a) => {
        const newIdx = oldToNew.get(a.cartIndex!);
        if (newIdx === undefined) return [];
        return [{ lineKey: a.lineKey, quantity: a.quantity, cartIndex: newIdx }];
      });
    return { ...tab, allocations };
  });
}

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

/** Kitchen / cancelled lines must never merge with new menu adds */
export const isCombinableCartLine = (line: CartLine) =>
  !line.orderItemId &&
  !line.sentToKitchen &&
  !line.completedInKitchen &&
  !line.cancelled &&
  !line.cancelledAt;

const createCartLineId = () => `cart-line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeCartLine = (line: CartLine): CartLine => {
  if (line.cancelled || line.cancelledAt) {
    return { ...line, cancelled: true, sentToKitchen: true };
  }
  if (!line.clientLineId && !line.orderItemId) {
    return { ...line, clientLineId: createCartLineId() };
  }
  return line;
};

export const normalizeCart = (lines: CartLine[]) => lines.map(normalizeCartLine);

export const formatItemNoteForDb = (note?: string) => {
  const trimmed = note?.trim();
  return trimmed ? `Note: ${trimmed}` : undefined;
};

export const parseItemNoteFromDb = (raw?: string | null) => {
  const text = String(raw || '');
  const prefixed = text.match(/(?:^|\s\|\s)Note:\s*([^|]+)/)?.[1]?.trim();
  if (prefixed) return prefixed;
  const known = /^(Line:|Item:|Recipe:|Portion:|Kitchen:|CancelledAt:|Order Meta)/;
  const legacy = text
    .split(/\s\|\s/)
    .map((part) => part.trim())
    .filter((part) => part && !known.test(part))
    .join(' | ');
  return legacy || undefined;
};

export type CheckoutOptions = {
  /** Pay only selected items; table stays open with remaining items */
  partial?: boolean;
  itemsOverride?: CartLine[];
  /** Cart indices being paid (legacy — full line removal) */
  paidIndices?: number[];
  /** Partial quantities paid per cart line */
  paidAllocations?: SplitBillAllocation[];
  /** Split-bill tab that was paid (cleared after checkout) */
  paidTabId?: string;
};

export type HeldOrder = {
  id: string;
  cart: CartLine[];
  date: string;
  note?: string;
  table?: any;
  orderType?: 'dine-in' | 'takeout' | 'delivery' | null;
  /** Sequential display number for held takeout orders */
  orderNumber?: number;
};

export type KitchenQueueJob = {
  id: string;
  label: string;
  tableNumber?: string;
  tableId?: string;
  itemCount: number;
  status: 'pending' | 'printing' | 'failed' | 'done';
  createdAt: string;
  lastError?: string;
  retryCount: number;
  cartSnapshot: string;
  /** Timestamp (ms) until retry spinner is shown; cleared after 2s */
  retryAnimatingUntil?: number;
};

const KITCHEN_RETRY_ANIMATION_MS = 2000;

const markKitchenJobsRetryAnimating = (
  jobs: KitchenQueueJob[],
  ids: string[],
): KitchenQueueJob[] => {
  if (ids.length === 0) return jobs;
  const idSet = new Set(ids);
  const until = Date.now() + KITCHEN_RETRY_ANIMATION_MS;
  return jobs.map((job) => (
    idSet.has(job.id) ? { ...job, retryAnimatingUntil: until } : job
  ));
};

const scheduleKitchenRetryAnimationClear = (get: () => PosState, set: (partial: Partial<PosState>) => void, ids: string[]) => {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  window.setTimeout(() => {
    set({
      kitchenPrintQueue: get().kitchenPrintQueue.map((job) => (
        idSet.has(job.id) && job.retryAnimatingUntil
          ? { ...job, retryAnimatingUntil: undefined }
          : job
      )),
    });
  }, KITCHEN_RETRY_ANIMATION_MS);
};

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
  | { type: 'CHECKOUT'; payload: { cart: CartLine[]; paymentMethod: 'cash' | 'card' | 'online' | 'transfer'; totalAmount: number; date: string; notes?: string; cashTendered?: number; selectedBank?: { id: string; bankName: string; accountName: string; accountNumber: string; qrCodeImage?: string } | null; tableId?: string | null; orderType?: 'dine-in' | 'takeout' | 'delivery' | null } };

interface PosState {
  user: Employee | null;
  items: Item[];
  categories: Category[];
  cart: CartLine[];
  savedCarts: Record<string, CartLine[]>; // เก็บ cart แยกตามโต๊ะ/orderType
  /** Per-table flag: bill was printed at least once this session */
  tableBillPrinted: Record<string, boolean>;
  /** Per-table: new items were sent to kitchen after bill print (shows yellow status) */
  tablePostPrintKitchenSent: Record<string, boolean>;
  /** Kitchen print queue — order saved to DB first, print processed async */
  kitchenPrintQueue: KitchenQueueJob[];
  /** Split-bill tabs per table (key: table-{id}) */
  tableSplitBills: Record<string, SplitBillTab[]>;
  tableSplitBillActiveTab: Record<string, string>;
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
  heldOrders: HeldOrder[];
  heldTakeoutNumberSeq: number;
  receiptSettings: {
    headerText: string;
    footerText: string;
    storeAddress: string;
    phoneNumber: string;
    showBankDetail: boolean;
    showQrCode: boolean;
    receiptSize?: '58mm' | '80mm';
    enableVoidBill?: boolean;
    autoPrintVoidBill?: boolean;
    receiptPrinter?: string;
    voidBillPrinter?: string;
    kitchenBillSize?: '58mm' | '80mm';
    voidBillSize?: '58mm' | '80mm';
    showTableNumber?: boolean;
    titleFontSize?: number;
    bodyFontSize?: number;
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
    storeLogo?: string;
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
  settingsUpdatedAt: string | null;

  login: (user: Employee) => void;
  logout: () => void;
  updateReceiptSettings: (settings: Partial<{ headerText: string; footerText: string; storeAddress: string; phoneNumber: string; showBankDetail: boolean; showQrCode: boolean; receiptSize: '58mm' | '80mm'; enableVoidBill: boolean; autoPrintVoidBill: boolean; receiptPrinter: string; voidBillPrinter: string; kitchenBillSize: '58mm' | '80mm'; voidBillSize: '58mm' | '80mm'; showTableNumber: boolean; titleFontSize?: number; bodyFontSize?: number }>) => void;
  updateCurrencySettings: (settings: { defaultCurrency: string; currencySymbol: string; currencyFormat: string; currencyRate: number; currencySymbolPosition: 'left' | 'right'; thbRate?: number }) => void;
  updateGeneralSettings: (settings: { storeName: string; storeLogo?: string; taxRate: number; timezone: string; language?: 'en' | 'lo' | 'th' }) => void;
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
  updateCartItemNotesByIndex: (index: number, notes: string) => void;
  clearCart: () => Promise<void>;
  clearUnsentItems: () => void;
  markCartItemsAsSent: () => void;
  markTableBillPrinted: () => void;
  clearTableBillPrinted: (tableId: string) => void;
  enqueueKitchenPrint: (job: Omit<KitchenQueueJob, 'status' | 'retryCount' | 'createdAt'>) => void;
  setKitchenJobStatus: (id: string, status: KitchenQueueJob['status'], lastError?: string) => void;
  retryKitchenJob: (id: string) => void;
  retryAllFailedKitchenJobs: () => void;
  dismissKitchenJob: (id: string) => void;
  clearCompletedKitchenJobs: () => void;
  setTableSplitBills: (tableKey: string, tabs: SplitBillTab[], activeTabId?: string) => void;
  reconcileTableSplitBillsAfterPartialPay: (
    tableKey: string,
    paidAllocations: SplitBillAllocation[],
    paidTabId: string | undefined,
    cartBefore: CartLine[]
  ) => void;
  clearTableSplitBills: (tableKey: string) => void;
  syncSplitBillNewItemsToFirstTab: (tableKey: string, oldCart: CartLine[], newCart: CartLine[]) => void;
  holdOrder: (note?: string) => Promise<void>;
  resumeOrder: (orderId: string) => void;
  removeHeldOrder: (orderId: string) => void;
  setHeldOrders: (orders: HeldOrder[]) => void;
  checkout: (
    paymentMethod: 'cash' | 'card' | 'online' | 'transfer',
    notes?: string,
    cashTendered?: number,
    selectedBank?: { id: string; bankName: string; accountName: string; accountNumber: string; qrCodeImage?: string } | null,
    totalOverride?: number,
    options?: CheckoutOptions
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
  fetchAppSettings: () => Promise<void>;
  pushAppSettings: () => Promise<void>;
  schedulePushSettings: () => void;
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      user: null,
      items: [],
      categories: [],
      cart: [],
      savedCarts: {}, // เริ่มต้นเป็น object ว่าง
      tableBillPrinted: {},
      tablePostPrintKitchenSent: {},
      kitchenPrintQueue: [],
      tableSplitBills: {},
      tableSplitBillActiveTab: {},
      isSupabaseConfigured: false,
      isCheckingConfig: true,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isCheckingOut: false,
      pendingActions: [],
      checkoutError: null,
      orderMetaById: {},
      heldOrders: [],
      heldTakeoutNumberSeq: 0,
      receiptSettings: {
        headerText: "Welcome to My Awesome Store!",
        footerText: "Thank you for your business!",
        storeAddress: "123 Main St, City, State",
        phoneNumber: "(555) 123-4567",
        showBankDetail: true,
        showQrCode: true,
        receiptSize: '80mm',
        enableVoidBill: false,
        autoPrintVoidBill: false,
        receiptPrinter: '',
        voidBillPrinter: '',
        kitchenBillSize: '80mm',
        voidBillSize: '80mm',
        showTableNumber: true,
        titleFontSize: 18,
        bodyFontSize: 12
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
        storeLogo: '',
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
      settingsUpdatedAt: null,
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

      // Debounced push: coalesce multiple rapid settings updates into one push
      schedulePushSettings: () => {
        if (pushSettingsTimer) clearTimeout(pushSettingsTimer);
        pushSettingsTimer = setTimeout(() => {
          pushSettingsTimer = null;
          get().pushAppSettings();
        }, 500);
      },

      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      updateReceiptSettings: (settings) => { set((state) => ({ receiptSettings: { ...state.receiptSettings, ...settings } })); get().schedulePushSettings(); },
      updateCurrencySettings: (settings) => { set({ currencySettings: settings }); get().schedulePushSettings(); },
      updateGeneralSettings: (settings) => { set({ generalSettings: settings }); get().schedulePushSettings(); },
      updateBankConfigs: (banks) => { set({ bankConfigs: banks }); get().schedulePushSettings(); },
      updateUnitConfigs: (units) => { set({ unitConfigs: units }); get().schedulePushSettings(); },
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
          savedCarts[currentKey] = normalizeCart([...cart]);
        }
        
        // โหลด cart ของโต๊ะ/orderType ใหม่
        const newKey = table ? `table-${table.id}` : `takeout`;
        // If DB says table is free, ignore stale local cart left after checkout
        const isFreshTable = table && table.status === 'available' && !table.current_order_id;
        const updatedSavedCarts = { ...savedCarts };
        if (isFreshTable && updatedSavedCarts[newKey]?.length) {
          delete updatedSavedCarts[newKey];
        }
        const newCart = normalizeCart(isFreshTable ? [] : (updatedSavedCarts[newKey] || []));
        const updatedBillPrinted = { ...get().tableBillPrinted };
        const updatedPostPrint = { ...get().tablePostPrintKitchenSent };
        const updatedSplitBills = { ...get().tableSplitBills };
        const updatedSplitBillActive = { ...get().tableSplitBillActiveTab };
        if (isFreshTable) {
          delete updatedBillPrinted[newKey];
          delete updatedPostPrint[newKey];
          delete updatedSplitBills[newKey];
          delete updatedSplitBillActive[newKey];
        }

        set({ 
          currentTable: table, 
          currentOrderType: orderType,
          cart: newCart,
          savedCarts: updatedSavedCarts,
          tableBillPrinted: updatedBillPrinted,
          tablePostPrintKitchenSent: updatedPostPrint,
          tableSplitBills: updatedSplitBills,
          tableSplitBillActiveTab: updatedSplitBillActive,
        });
      },
      clearCurrentTable: () => {
        const { cart, currentTable, currentOrderType, savedCarts } = get();
        
        // บันทึก cart ปัจจุบันก่อนล้าง
        if (currentTable || currentOrderType) {
          const currentKey = currentTable ? `table-${currentTable.id}` : `takeout`;
          savedCarts[currentKey] = normalizeCart([...cart]);
        }

        set({
          cart: [],
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
          const [itemsRes, inventoryItemsRes, recipesRes, categoriesRes] = await Promise.all([
            supabase.from('items').select('*'),  // Menu items (with inventory_item_id for standalone items)
            supabase.from('inventory_items').select('*'),  // Inventory items
            supabase.from('recipes').select('*'),  // Recipes
            supabase.from('categories').select('*')
          ]);

          console.log('[FETCH] Items from items table:', itemsRes.data?.length || 0);
          console.log('[FETCH] Items from inventory_items table:', inventoryItemsRes.data?.length || 0);
          console.log('[FETCH] Items from recipes table:', recipesRes.data?.length || 0);
          
          // Sample log for debugging
          if (itemsRes.data && itemsRes.data.length > 0) {
            console.log('[FETCH] Sample item from items table:', itemsRes.data[0]);
          }
          if (inventoryItemsRes.data && inventoryItemsRes.data.length > 0) {
            console.log('[FETCH] Sample item from inventory_items table:', inventoryItemsRes.data[0]);
          }
          if (recipesRes.data && recipesRes.data.length > 0) {
            console.log('[FETCH] Sample item from recipes table:', recipesRes.data[0]);
          }

          // Combine items, inventory_items, and recipes for Items & Categories page
          // Add is_recipe flag to items (since items table no longer has is_recipe column)
          const allItems = [
            ...(itemsRes.data || []).map(item => ({ ...item, is_recipe: false, itemSource: 'item' })),
            ...(inventoryItemsRes.data || []).map(item => ({ ...item, is_recipe: false, itemSource: 'inventory' })),
            ...(recipesRes.data || []).map(recipe => ({ ...recipe, is_recipe: true, itemSource: 'recipe' }))
          ];

          console.log('[FETCH] Total combined items:', allItems.length);

          if (allItems.length > 0) set({ items: allItems });
          if (categoriesRes.data) set({ categories: categoriesRes.data });
        } catch (error) {
          console.error('[FETCH] Error fetching data:', error);
          // Error fetching data
        }
      },

      fetchAppSettings: async () => {
        if (!get().isSupabaseConfigured) return;
        try {
          const { data, error } = await supabase
            .from('app_settings')
            .select('settings, updated_at')
            .eq('id', 'singleton')
            .single();
          if (error) {
            console.error('[SETTINGS] Fetch error:', error.message);
            return;
          }
          if (!data) return;
          const serverUpdatedAt = data.updated_at;
          const localUpdatedAt = get().settingsUpdatedAt;
          if (!localUpdatedAt || serverUpdatedAt > localUpdatedAt) {
            const s = data.settings || {};
            console.log('[SETTINGS] Pulling from server, keys:', Object.keys(s), 'updated_at:', serverUpdatedAt);
            if (s.receiptSettings) set({ receiptSettings: s.receiptSettings });
            if (s.currencySettings) set({ currencySettings: s.currencySettings });
            if (s.generalSettings) set({ generalSettings: s.generalSettings });
            if (s.bankConfigs) set({ bankConfigs: s.bankConfigs });
            if (s.unitConfigs) set({ unitConfigs: s.unitConfigs });
            set({ settingsUpdatedAt: serverUpdatedAt });
            console.log('[SETTINGS] Pulled from server, updated_at:', serverUpdatedAt);
          }
        } catch (error) {
          console.error('[SETTINGS] Error fetching app settings:', error);
        }
      },

      pushAppSettings: async () => {
        if (!get().isSupabaseConfigured) return;
        try {
          const payload = {
            receiptSettings: get().receiptSettings,
            currencySettings: get().currencySettings,
            generalSettings: get().generalSettings,
            bankConfigs: get().bankConfigs,
            unitConfigs: get().unitConfigs
          };
          console.log('[SETTINGS] Pushing to server, payload keys:', Object.keys(payload));
          console.log('[SETTINGS] Payload sizes:', Object.fromEntries(
            Object.entries(payload).map(([k, v]) => [k, JSON.stringify(v).length])
          ));
          const { data, error } = await supabase
            .from('app_settings')
            .upsert({ id: 'singleton', settings: payload, updated_at: new Date().toISOString() })
            .select('updated_at')
            .single();
          if (error) {
            console.error('[SETTINGS] Push error:', error.message, error.code);
            return;
          }
          if (data) {
            set({ settingsUpdatedAt: data.updated_at });
            console.log('[SETTINGS] Pushed to server, updated_at:', data.updated_at);
          }
        } catch (error) {
          console.error('[SETTINGS] Error pushing app settings:', error);
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

                // Note: stock is managed in inventory_items table, not in items table
                // Initial stock transactions should be created when adding to inventory_items
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
              // Stock is now managed in inventory_items table, not in items table
              // Find the item to determine if it has a linked inventory_item_id
              const { data: itemData } = await supabase
                .from('items')
                .select('inventory_item_id, type')
                .eq('id', itemId)
                .single();
              
              const linkedInventoryItemId = itemData?.inventory_item_id;
              const itemType = itemData?.type;
              
              let targetId = itemId;
              if (itemType === 'standalone' && linkedInventoryItemId) {
                targetId = linkedInventoryItemId;
              }
              
              const { error } = await supabase.from('inventory_items').update({ stock }).eq('id', targetId);
              if (error) throw error;

              // We could add a transaction log here, but calculating the diff might be tricky if multiple updates happened
              // For now, let's just ensure the stock value is correct
            } else if (action.type === 'CHECKOUT') {
              console.log('[SYNC] Processing CHECKOUT action from pendingActions');
              const { cart, paymentMethod, totalAmount, date, notes, cashTendered, selectedBank, tableId, orderType } = action.payload;
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
                    ? [`Item: ${c.item.name}`, formatItemNoteForDb(c.notes), c.portionName ? `Portion: ${c.portionName}` : undefined, orderMeta].filter(Boolean).join(' | ') || undefined
                    : [`Item: ${c.item.name}`, `Recipe: ${c.item.name}`, formatItemNoteForDb(c.notes), c.portionName ? `Portion: ${c.portionName}` : undefined, orderMeta].filter(Boolean).join(' | ') || undefined
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
                  // Fetch portion info first
                  const { data: portion } = await supabase
                    .from('item_portions')
                    .select('portion_stock, item_id')
                    .eq('id', cartItem.portionId)
                    .single();

                  if (portion) {
                    // Deduct from item_portions
                    const newPortionStock = Math.max(0, (portion.portion_stock || 0) - cartItem.quantity);
                    await supabase
                      .from('item_portions')
                      .update({ portion_stock: newPortionStock })
                      .eq('id', cartItem.portionId);
                    
                    console.log(`[CHECKOUT-PORTION-OLD] Portion ${cartItem.portionId}: ${portion.portion_stock} -> ${newPortionStock}`);
                    
                    // Get inventory_item_id from the item
                    if (portion.item_id) {
                      const { data: item } = await supabase
                        .from('items')
                        .select('inventory_item_id, type')
                        .eq('id', portion.item_id)
                        .single();
                      
                      const inventoryItemId = item?.inventory_item_id;
                      const itemType = item?.type;
                      
                      // Also deduct from inventory_items if linked
                      if (inventoryItemId && itemType === 'standalone') {
                        const { data: inventoryItem } = await supabase
                          .from('inventory_items')
                          .select('stock')
                          .eq('id', inventoryItemId)
                          .single();
                        
                        if (inventoryItem) {
                          const newInventoryStock = Math.max(0, (inventoryItem.stock || 0) - cartItem.quantity);
                          await supabase
                            .from('inventory_items')
                            .update({ stock: newInventoryStock })
                            .eq('id', inventoryItemId);
                          
                          console.log(`[CHECKOUT-PORTION-OLD] Inventory ${inventoryItemId}: ${inventoryItem.stock} -> ${newInventoryStock}`);
                          
                          // Add transaction record
                          transactions.push({
                            inventory_item_id: inventoryItemId,
                            quantity_change: -cartItem.quantity,
                            transaction_type: 'sale',
                            notes: `Portion sale (Order #${order.id.slice(0, 8)})`
                          });
                        }
                      }
                    }
                  }
                }

                if (inventoryItemIds.has(sourceId)) {
                  // This is a menu item (not a recipe)
                  const { data: currentItem } = await supabase
                    .from('items')
                    .select('type, inventory_item_id')
                    .eq('id', sourceId)
                    .single();

                  if (currentItem) {
                    const itemType = (currentItem as any).type;
                    const inventoryItemId = (currentItem as any).inventory_item_id;
                    
                    // For standalone items, update stock ONLY in inventory_items table
                    if (itemType === 'standalone' && inventoryItemId) {
                      const { data: inventoryItem } = await supabase
                        .from('inventory_items')
                        .select('stock')
                        .eq('id', inventoryItemId)
                        .single();
                      
                      if (inventoryItem) {
                        const newStock = Math.max(0, (inventoryItem.stock || 0) - cartItem.quantity);
                        await supabase.from('inventory_items').update({ stock: newStock }).eq('id', inventoryItemId);
                        
                        // No longer sync to items table - items table doesn't have stock column
                        
                        transactions.push({
                          inventory_item_id: inventoryItemId,
                          quantity_change: -cartItem.quantity,
                          transaction_type: 'sale',
                          notes: `Order #${order.id.slice(0, 8)} - ${cartItem.item.name} (synced)`
                        });
                      }
                    }
                    // Sale Only items don't track stock, so do nothing
                  }
                } else {
                  const { data: ingredients } = await supabase
                    .from('recipe_ingredients')
                    .select('ingredient_id, quantity_needed')
                    .eq('recipe_id', sourceId);

                  for (const ingredient of ingredients || []) {
                    const deduction = Math.max(0, Math.ceil(Number(ingredient.quantity_needed || 0) * cartItem.quantity));
                    
                    // Get ingredient item to check its type
                    const { data: ingredientItem } = await supabase
                      .from('items')
                      .select('id, type, inventory_item_id')
                      .eq('id', ingredient.ingredient_id)
                      .single();

                    const inventoryItemId = (ingredientItem as any)?.inventory_item_id || ingredient.ingredient_id;
                    const { data: invItem } = await supabase
                      .from('inventory_items')
                      .select('stock')
                      .eq('id', inventoryItemId)
                      .single();
                    
                    if (invItem) {
                      const newStock = Math.max(0, ((invItem as any).stock || 0) - deduction);
                      await supabase.from('inventory_items').update({ stock: newStock }).eq('id', inventoryItemId);
                    }
                    
                    transactions.push({
                      inventory_item_id: inventoryItemId,
                      quantity_change: -deduction,
                      transaction_type: 'sale',
                      notes: `Recipe sale: ${cartItem.item.name} (Order #${order.id.slice(0, 8)})`
                    });
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

              // Release table when syncing an offline checkout
              if (tableId && orderType === 'dine-in') {
                await supabase
                  .from('orders')
                  .update({ status: 'cancelled' })
                  .eq('table_id', tableId)
                  .eq('status', 'pending');
                await supabase
                  .from('tables')
                  .update({
                    status: 'available',
                    current_order_id: null,
                    is_merged: false,
                    merged_tables: null
                  })
                  .eq('id', tableId);
                await supabase
                  .from('tables')
                  .update({ merged_into: null })
                  .eq('merged_into', tableId);
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

                // Note: stock is managed in inventory_items table, not in items table
                // Initial stock transactions should be created when adding to inventory_items
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
            throw error;
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
        const oldStock = (item as any)?.stock || 0;
        const diff = stock - oldStock;

        if (diff === 0) return;

        // Optimistic update - update stock in local items array
        set({ items: items.map(i => i.id === itemId ? { ...i, stock } as any : i) });

        if (isSupabaseConfigured) {
          if (isOnline) {
            try {
              // Update stock in inventory_items table (where stock is actually stored)
              await supabase
                .from('inventory_items')
                .update({ stock })
                .eq('id', itemId);

              // Add inventory transaction
              await supabase
                .from('inventory_transactions')
                .insert({
                  item_id: itemId,
                  inventory_item_id: itemId,
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

        // Only combine with fresh unsent lines (never kitchen / cancelled / persisted rows)
        const existing = portionId
          ? cart.find(c => (c.sourceItemId || c.item.id) === sourceId && c.portionId === portionId && isCombinableCartLine(c))
          : cart.find(c => (c.sourceItemId || c.item.id) === sourceId && !c.portionId && isCombinableCartLine(c));

        // Get current stock for validation only (don't deduct yet)
        const sourceItem = items.find(i => i.id === sourceId);
        const isRecipe = item.is_recipe === false;
        
        // Stock is passed via item object from POS page (already calculated correctly)
        // For portions, use the stock from the item (portion stock passed in)
        // For recipes and other items, use stock from the item (calculated and passed in)
        const currentStock = (item as any).stock ?? 0;
        const currentQty = existing ? existing.quantity : 0;

        // Check if enough stock (validation only)
        if (currentQty + addQty > currentStock) {
          alert(`Not enough stock for ${item.name}. Available: ${currentStock}`);
          return;
        }

        // Add to cart WITHOUT deducting stock
        // Stock will be deducted only when checkout is confirmed
        let newCart: CartLine[];
        if (existing) {
          const updated = { ...existing, quantity: existing.quantity + addQty };
          newCart = [updated, ...cart.filter((c) => c !== existing)];
        } else {
          newCart = [{
            item,
            quantity: addQty,
            clientLineId: createCartLineId(),
            sourceItemId: sourceId,
            portionName: options?.portionName,
            portionId: portionId,
            sentToKitchen: false,
            completedInKitchen: false
          }, ...cart];
        }

        const patch: Partial<PosState> = { cart: newCart };
        if (currentTable && currentOrderType === 'dine-in') {
          const key = `table-${currentTable.id}`;
          patch.savedCarts = { ...get().savedCarts, [key]: normalizeCart(newCart) };
          patch.tablePostPrintKitchenSent = { ...get().tablePostPrintKitchenSent, [key]: false };
        }
        set(patch);

        if (currentTable && currentOrderType === 'dine-in') {
          const key = `table-${currentTable.id}`;
          get().syncSplitBillNewItemsToFirstTab(key, cart, newCart);
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
                .update({ status: 'available', current_order_id: null, is_merged: false, merged_tables: null })
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
                .update({ status: 'available', current_order_id: null, is_merged: false, merged_tables: null })
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
        const { currentTable, currentOrderType, savedCarts, tablePostPrintKitchenSent } = get();
        const patch: Partial<PosState> = { cart: updatedCart };
        if (currentTable && currentOrderType === 'dine-in') {
          const key = `table-${currentTable.id}`;
          patch.savedCarts = { ...savedCarts, [key]: normalizeCart(updatedCart) };
          patch.tablePostPrintKitchenSent = { ...tablePostPrintKitchenSent, [key]: false };
        }
        set(patch);
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
        const { currentTable, currentOrderType, savedCarts, tablePostPrintKitchenSent } = get();
        const patch: Partial<PosState> = { cart: updatedCart };
        if (currentTable && currentOrderType === 'dine-in') {
          const key = `table-${currentTable.id}`;
          patch.savedCarts = { ...savedCarts, [key]: normalizeCart(updatedCart) };
          patch.tablePostPrintKitchenSent = { ...tablePostPrintKitchenSent, [key]: false };
        }
        set(patch);
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

        // Stock is stored in cart item (passed when adding to cart)
        const currentStock = Number((cartItem.item as any).stock ?? 0);
        const exceeded = (() => {
          if (cartItem.portionId) {
            return quantity > currentStock;
          }
          const otherLinesQty = cart
            .filter(c => c.item.id !== itemId && (c.sourceItemId || c.item.id) === sourceId && !c.cancelled)
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
          // Stock is stored in cart item (passed when adding to cart)
          const portionStock = (cartItem.item as any).stock ?? 0;
          
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
        // Stock is stored in cart item (passed when adding to cart)
        const currentStock = (item as any)?.stock ?? 0;
        
        if (quantity > currentStock) {
          alert(`Not enough stock for ${item?.name || cartItem.item.name}. Available: ${currentStock}`);
          return;
        }
        
        // Just update quantity, don't touch stock
        set({ 
          cart: cart.map((c, i) => i === index ? { ...c, quantity } : c) 
        });
      },

      updateCartItemNotesByIndex: (index, notes) => {
        const { cart } = get();
        const cartItem = cart[index];
        if (!cartItem || cartItem.sentToKitchen || cartItem.cancelled) return;
        const trimmed = notes.trim();
        set({
          cart: cart.map((c, i) =>
            i === index ? { ...c, notes: trimmed || undefined } : c
          ),
        });
      },

      clearCart: async () => {
        const { currentTable, currentOrderType, isSupabaseConfigured, isOnline, savedCarts } = get();
        
        // Release table if dine-in and cart is being cleared
        if (currentTable && currentOrderType === 'dine-in' && isSupabaseConfigured && isOnline) {
          try {
            await supabase
              .from('tables')
              .update({ status: 'available', current_order_id: null, is_merged: false, merged_tables: null })
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
                .update({ status: 'available', current_order_id: null, is_merged: false, merged_tables: null })
                .eq('id', currentTable.id);
              get().clearCurrentTable();
            } catch (err) {
              console.error('Failed to auto-release table:', err);
            }
          }, 100);
        }
      },

      markCartItemsAsSent: () => {
        const { cart, currentTable, currentOrderType, savedCarts, tableBillPrinted, tablePostPrintKitchenSent } = get();
        const baseMs = Date.now();
        let sendIndex = 0;
        const updatedCart = cart.map(item => {
          if (!item.sentToKitchen && !item.cancelled) {
            const sentToKitchenTime = new Date(baseMs + sendIndex * 1000).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            });
            sendIndex += 1;
            return { 
              ...item, 
              clientLineId: item.clientLineId || createCartLineId(),
              sentToKitchen: true,
              sentToKitchenTime
            };
          }
          return item;
        });
        const patch: Partial<PosState> = { cart: updatedCart };
        if (currentTable && currentOrderType === 'dine-in') {
          const key = `table-${currentTable.id}`;
          patch.savedCarts = { ...savedCarts, [key]: normalizeCart(updatedCart) };
          if (tableBillPrinted[key]) {
            patch.tablePostPrintKitchenSent = { ...tablePostPrintKitchenSent, [key]: true };
          }
        }
        set(patch);
      },

      markTableBillPrinted: () => {
        const { currentTable, currentOrderType, cart, savedCarts, tableBillPrinted } = get();
        if (!currentTable || currentOrderType !== 'dine-in') return;
        const key = `table-${currentTable.id}`;
        set({
          tableBillPrinted: { ...tableBillPrinted, [key]: true },
          savedCarts: { ...savedCarts, [key]: normalizeCart([...cart]) },
        });
      },

      clearTableBillPrinted: (tableId: string) => {
        const key = `table-${tableId}`;
        const updated = { ...get().tableBillPrinted };
        const updatedPost = { ...get().tablePostPrintKitchenSent };
        delete updated[key];
        delete updatedPost[key];
        set({ tableBillPrinted: updated, tablePostPrintKitchenSent: updatedPost });
      },

      enqueueKitchenPrint: (job) => {
        const entry: KitchenQueueJob = {
          ...job,
          status: 'pending',
          retryCount: 0,
          createdAt: new Date().toISOString(),
        };
        set({ kitchenPrintQueue: [...get().kitchenPrintQueue, entry] });
      },

      setKitchenJobStatus: (id, status, lastError) => {
        set({
          kitchenPrintQueue: get().kitchenPrintQueue.map((job) =>
            job.id === id ? { ...job, status, lastError: lastError ?? job.lastError } : job
          ),
        });
      },

      retryKitchenJob: (id) => {
        const nextQueue = get().kitchenPrintQueue.map((job) =>
          job.id === id
            ? { ...job, status: 'pending' as const, retryCount: job.retryCount + 1, lastError: undefined }
            : job
        );
        set({ kitchenPrintQueue: markKitchenJobsRetryAnimating(nextQueue, [id]) });
        scheduleKitchenRetryAnimationClear(get, set, [id]);
      },

      retryAllFailedKitchenJobs: () => {
        const failedIds = get().kitchenPrintQueue
          .filter((job) => job.status === 'failed')
          .map((job) => job.id);
        const nextQueue = get().kitchenPrintQueue.map((job) =>
          job.status === 'failed'
            ? { ...job, status: 'pending' as const, retryCount: job.retryCount + 1, lastError: undefined }
            : job
        );
        set({ kitchenPrintQueue: markKitchenJobsRetryAnimating(nextQueue, failedIds) });
        scheduleKitchenRetryAnimationClear(get, set, failedIds);
      },

      dismissKitchenJob: (id) => {
        set({ kitchenPrintQueue: get().kitchenPrintQueue.filter((job) => job.id !== id) });
      },

      clearCompletedKitchenJobs: () => {
        set({ kitchenPrintQueue: get().kitchenPrintQueue.filter((job) => job.status !== 'done') });
      },

      setTableSplitBills: (tableKey, tabs, activeTabId) => {
        const nextActive = activeTabId && tabs.some((t) => t.id === activeTabId)
          ? activeTabId
          : tabs[0]?.id || '';
        set({
          tableSplitBills: { ...get().tableSplitBills, [tableKey]: tabs },
          tableSplitBillActiveTab: { ...get().tableSplitBillActiveTab, [tableKey]: nextActive },
        });
      },

      reconcileTableSplitBillsAfterPartialPay: (tableKey, paidAllocations, paidTabId, cartBefore) => {
        const tabs = get().tableSplitBills[tableKey];
        if (!tabs?.length || !paidAllocations.length) return;
        const reconciled = reconcileSplitBillTabsAfterPartialPay(tabs, paidAllocations, paidTabId, cartBefore);
        const activeId = get().tableSplitBillActiveTab[tableKey];
        get().setTableSplitBills(tableKey, reconciled, activeId);
      },

      clearTableSplitBills: (tableKey) => {
        const splitBills = { ...get().tableSplitBills };
        const splitActive = { ...get().tableSplitBillActiveTab };
        delete splitBills[tableKey];
        delete splitActive[tableKey];
        set({ tableSplitBills: splitBills, tableSplitBillActiveTab: splitActive });
      },

      syncSplitBillNewItemsToFirstTab: (tableKey, oldCart, newCart) => {
        if (oldCart === newCart) return;
        const { tableSplitBills, tableSplitBillActiveTab } = get();
        const existing = tableSplitBills[tableKey] || [];
        const updated = assignSplitBillNewItemsToFirstTab(existing, oldCart, newCart);
        const normalizedExisting = existing.length
          ? sanitizeSplitBillTabs(existing, newCart)
          : existing;
        const changed = JSON.stringify(updated) !== JSON.stringify(normalizedExisting);
        if (!changed) return;

        const patch: Partial<PosState> = {
          tableSplitBills: { ...tableSplitBills, [tableKey]: updated },
        };
        if (!tableSplitBillActiveTab[tableKey] && updated[0]?.id) {
          patch.tableSplitBillActiveTab = { ...tableSplitBillActiveTab, [tableKey]: updated[0].id };
        }
        set(patch);
      },

      holdOrder: async (note) => {
        const { cart, heldOrders, currentTable, currentOrderType, savedCarts, heldTakeoutNumberSeq } = get();
        if (cart.length === 0) return;

        const isTakeout = currentOrderType === 'takeout';
        const maxExistingTakeoutNo = heldOrders
          .filter((o) => o.orderType === 'takeout' && o.orderNumber != null)
          .reduce((max, o) => Math.max(max, o.orderNumber!), 0);
        const nextTakeoutNo = Math.max(heldTakeoutNumberSeq, maxExistingTakeoutNo) + 1;
        const orderNumber = isTakeout ? nextTakeoutNo : undefined;

        const newHeldOrder: HeldOrder = {
          id: `hold-${Date.now()}`,
          cart: [...cart],
          date: new Date().toISOString(),
          note,
          table: currentTable,
          orderType: currentOrderType,
          orderNumber,
        };

        // Release table if dine-in
        if (currentTable && currentOrderType === 'dine-in') {
          try {
            await supabase
              .from('tables')
              .update({ status: 'available', current_order_id: null, is_merged: false, merged_tables: null })
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

        const updatedBillPrinted = { ...get().tableBillPrinted };
        if (currentTable && currentOrderType === 'dine-in') {
          delete updatedBillPrinted[`table-${currentTable.id}`];
        }

        set({
          heldOrders: [...heldOrders, newHeldOrder],
          heldTakeoutNumberSeq: isTakeout && orderNumber ? orderNumber : heldTakeoutNumberSeq,
          cart: [],
          currentTable: null,
          currentOrderType: null,
          savedCarts: { ...savedCarts },
          tableBillPrinted: updatedBillPrinted,
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

      checkout: async (paymentMethod, notes, cashTendered, selectedBank, totalOverride, options) => {
        const { cart, isSupabaseConfigured, items, isOnline, generalSettings, currentTable, currentOrderType, isCheckingOut } = get();
        const isPartial = !!options?.partial;
        
        console.log('[CHECKOUT] Starting checkout...', {
          cartLength: cart.length,
          isPartial,
          isSupabaseConfigured,
          isOnline,
          isCheckingOut
        });
        
        const activeCart = (isPartial && options?.itemsOverride?.length ? options.itemsOverride : cart)
          .filter(c => !c.cancelled);
        
        if (activeCart.length === 0) return false;
        
        // Prevent duplicate checkout calls
        if (isCheckingOut) {
          console.log('[CHECKOUT] Already processing checkout, ignoring duplicate call');
          return false;
        }
        
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
        if (!isPartial) {
          // Full checkout: clear cart and local saved cart immediately
          const checkoutTableKey = currentTable
            ? `table-${currentTable.id}`
            : currentOrderType === 'takeout'
              ? 'takeout'
              : null;
          const clearedSavedCarts = { ...get().savedCarts };
          const clearedBillPrinted = { ...get().tableBillPrinted };
          const clearedPostPrint = { ...get().tablePostPrintKitchenSent };
          const clearedSplitBills = { ...get().tableSplitBills };
          const clearedSplitActive = { ...get().tableSplitBillActiveTab };
          if (checkoutTableKey) {
            delete clearedSavedCarts[checkoutTableKey];
            if (currentTable && currentOrderType === 'dine-in') {
              delete clearedBillPrinted[checkoutTableKey];
              delete clearedPostPrint[checkoutTableKey];
              delete clearedSplitBills[checkoutTableKey];
              delete clearedSplitActive[checkoutTableKey];
            }
          }
          set({
            cart: [],
            savedCarts: clearedSavedCarts,
            tableBillPrinted: clearedBillPrinted,
            tablePostPrintKitchenSent: clearedPostPrint,
            tableSplitBills: clearedSplitBills,
            tableSplitBillActiveTab: clearedSplitActive,
          });
        }

        if (!isSupabaseConfigured) {
          if (isPartial && options?.paidAllocations?.length) {
            const newCart = applyPartialPaymentToCart(previousCart, options.paidAllocations);
            const sc = { ...get().savedCarts };
            const bp = { ...get().tableBillPrinted };
            if (currentTable) {
              const key = `table-${currentTable.id}`;
              sc[key] = newCart;
              bp[key] = false;
              get().reconcileTableSplitBillsAfterPartialPay(
                key,
                options.paidAllocations,
                options.paidTabId,
                previousCart
              );
            }
            set({ cart: newCart, savedCarts: sc, tableBillPrinted: bp, isCheckingOut: false });
            return true;
          }
          if (isPartial && options?.paidIndices?.length) {
            const paidSet = new Set(options.paidIndices);
            const remainingCart = previousCart.filter((_, i) => !paidSet.has(i));
            const sc = { ...get().savedCarts };
            const bp = { ...get().tableBillPrinted };
            if (currentTable) {
              const key = `table-${currentTable.id}`;
              sc[key] = remainingCart;
              bp[key] = false;
              const paidAllocations = options.paidIndices.map((idx) => ({
                lineKey: getCartLineKey(previousCart[idx], idx),
                quantity: previousCart[idx]?.quantity ?? 1,
              }));
              get().reconcileTableSplitBillsAfterPartialPay(
                key,
                paidAllocations,
                options.paidTabId,
                previousCart
              );
            }
            set({ cart: remainingCart, savedCarts: sc, tableBillPrinted: bp, isCheckingOut: false });
            return true;
          }
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

            const menuItemIds = new Set(
              items
                .filter(i => {
                  const source = (i as any).itemSource;
                  return source === 'item' || (!source && i.category_id !== undefined && i.category_id !== null);
                })
                .map(i => i.id)
            );
            // Use activeCart instead of cart for order items
            const orderItems = activeCart.map((c, index) => {
              const sourceId = c.sourceItemId || c.item.id;
              const isMenuItem = menuItemIds.has(sourceId);
              const orderMeta = index === 0
                ? `Order Meta >>>${encodeURIComponent(JSON.stringify({
                  orderNote: notes || '',
                  cashTendered: paymentMethod === 'cash' && Number.isFinite(cashTendered) ? cashTendered : null,
                  selectedBank: selectedBankForMeta || null,
                }))}<<<`
                : undefined;
              return {
                order_id: order.id,
                item_id: isMenuItem ? sourceId : null,
                quantity: c.quantity,
                price_at_time: c.item.price,
                notes: isMenuItem
                  ? [`Item: ${c.item.name}`, formatItemNoteForDb(c.notes), c.portionName ? `Portion: ${c.portionName}` : undefined, orderMeta].filter(Boolean).join(' | ') || undefined
                  : [`Item: ${c.item.name}`, `Recipe: ${c.item.name}`, formatItemNoteForDb(c.notes), c.portionName ? `Portion: ${c.portionName}` : undefined, orderMeta].filter(Boolean).join(' | ') || undefined
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
              const isMenuItem = menuItemIds.has(sourceId);
              if (isMenuItem) {
                inventoryDeductions[sourceId] = (inventoryDeductions[sourceId] || 0) + cartItem.quantity;
              } else {
                recipeOrderQty[sourceId] = (recipeOrderQty[sourceId] || 0) + cartItem.quantity;
              }
            }

            for (const [portionId, qty] of Object.entries(portionDeductions)) {
              // Fetch portion info first
              const { data: portion, error: portionFetchError } = await supabase
                .from('item_portions')
                .select('portion_stock, item_id')
                .eq('id', portionId)
                .single();
              if (portionFetchError) throw new Error(portionFetchError.message || 'Failed to fetch portion stock');
              
              // Deduct from item_portions
              const newPortionStock = Math.max(0, (portion?.portion_stock || 0) - qty);
              const { error: portionUpdateError } = await supabase
                .from('item_portions')
                .update({ portion_stock: newPortionStock })
                .eq('id', portionId);
              if (portionUpdateError) throw new Error(portionUpdateError.message || 'Failed to update portion stock');
              
              console.log(`[CHECKOUT-PORTION] Portion ${portionId}: ${portion?.portion_stock} -> ${newPortionStock}`);
              
              // Get inventory_item_id from the item
              if (portion?.item_id) {
                const { data: item } = await supabase
                  .from('items')
                  .select('inventory_item_id, type')
                  .eq('id', portion.item_id)
                  .single();
                
                const inventoryItemId = item?.inventory_item_id;
                const itemType = item?.type;
                
                // Also deduct from inventory_items if linked
                if (inventoryItemId && itemType === 'standalone') {
                  const { data: inventoryItem, error: invFetchError } = await supabase
                    .from('inventory_items')
                    .select('stock')
                    .eq('id', inventoryItemId)
                    .single();
                  
                  if (!invFetchError && inventoryItem) {
                    const newInventoryStock = Math.max(0, (inventoryItem.stock || 0) - qty);
                    const { error: invUpdateError } = await supabase
                      .from('inventory_items')
                      .update({ stock: newInventoryStock })
                      .eq('id', inventoryItemId);
                    
                    if (invUpdateError) {
                      console.warn(`Failed to update inventory for portion ${portionId}:`, invUpdateError);
                    } else {
                      console.log(`[CHECKOUT-PORTION] Inventory ${inventoryItemId}: ${inventoryItem.stock} -> ${newInventoryStock}`);
                      
                      // Add transaction record
                      transactions.push({
                        inventory_item_id: inventoryItemId,
                        quantity_change: -qty,
                        transaction_type: 'sale',
                        notes: `Portion sale (Order #${order.id.slice(0, 8)})`
                      });
                    }
                  }
                }
              }
            }

            for (const [itemId, qty] of Object.entries(inventoryDeductions)) {
              // Find the item in local state to determine where to deduct stock
              const itemInStore = items.find(i => i.id === itemId);
              const itemType = (itemInStore as any)?.type;
              const linkedInventoryItemId = (itemInStore as any)?.inventory_item_id;
              
              console.log(`[CHECKOUT] Deducting ${qty} from item ${itemId}`, { itemType, linkedInventoryItemId });
              
              // Sale Only items don't track stock
              if (itemType === 'saleonly') {
                console.log(`[CHECKOUT] Sale Only item ${itemId}: skipping stock deduction`);
                continue;
              }
              
              let targetInventoryId: string | null = null;
              let oldStock = 0;
              
              if (linkedInventoryItemId) {
                // Standalone item: deduct from linked inventory item
                targetInventoryId = linkedInventoryItemId;
                const { data: inventoryItem } = await supabase
                  .from('inventory_items')
                  .select('stock')
                  .eq('id', linkedInventoryItemId)
                  .single();
                oldStock = inventoryItem?.stock || 0;
              } else {
                // Direct inventory item: deduct from inventory_items directly
                targetInventoryId = itemId;
                const { data: inventoryItem } = await supabase
                  .from('inventory_items')
                  .select('stock')
                  .eq('id', itemId)
                  .single();
                oldStock = inventoryItem?.stock || 0;
              }
              
              if (targetInventoryId) {
                const newStock = Math.max(0, oldStock - qty);
                console.log(`[CHECKOUT] Item ${itemId} -> inventory ${targetInventoryId}: ${oldStock} -> ${newStock}`);
                
                const { error: itemUpdateError } = await supabase
                  .from('inventory_items')
                  .update({ stock: newStock })
                  .eq('id', targetInventoryId);
                if (itemUpdateError) throw new Error(itemUpdateError.message || 'Failed to update inventory stock');

                transactions.push({
                  inventory_item_id: targetInventoryId,
                  quantity_change: -qty,
                  transaction_type: 'sale',
                  notes: `Order #${order.id.slice(0, 8)}`
                });
              }
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
              // Find ingredient in local state to determine where to deduct stock
              const ingredientInStore = items.find(i => i.id === ingredientId);
              const ingredientType = (ingredientInStore as any)?.type;
              const linkedInventoryItemId = (ingredientInStore as any)?.inventory_item_id;
              
              console.log(`[CHECKOUT] Deducting ingredient ${ingredientId} qty=${qty}`, { ingredientType, linkedInventoryItemId });
              
              let targetInventoryId: string | null = null;
              let oldStock = 0;
              
              if (linkedInventoryItemId) {
                // Standalone ingredient: deduct from linked inventory item
                targetInventoryId = linkedInventoryItemId;
                const { data: inventoryItem } = await supabase
                  .from('inventory_items')
                  .select('stock')
                  .eq('id', linkedInventoryItemId)
                  .single();
                oldStock = inventoryItem?.stock || 0;
              } else {
                // Direct inventory ingredient: deduct from inventory_items
                targetInventoryId = ingredientId;
                const { data: inventoryItem } = await supabase
                  .from('inventory_items')
                  .select('stock')
                  .eq('id', ingredientId)
                  .single();
                oldStock = inventoryItem?.stock || 0;
              }
              
              if (targetInventoryId) {
                const newStock = Math.max(0, oldStock - qty);
                console.log(`[CHECKOUT] Ingredient ${ingredientId} -> inventory ${targetInventoryId}: ${oldStock} -> ${newStock}`);
                
                const { error: ingredientUpdateError } = await supabase
                  .from('inventory_items')
                  .update({ stock: newStock })
                  .eq('id', targetInventoryId);
                if (ingredientUpdateError) throw new Error(ingredientUpdateError.message || 'Failed to update ingredient stock');

                transactions.push({
                  inventory_item_id: targetInventoryId,
                  quantity_change: -qty,
                  transaction_type: 'sale',
                  notes: `Recipe sale (Order #${order.id.slice(0, 8)})`
                });
              }
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

            if (isPartial && options?.paidAllocations?.length) {
              const newCart = applyPartialPaymentToCart(previousCart, options.paidAllocations);
              const updatedSavedCarts = { ...get().savedCarts };
              const updatedPostPrint = { ...get().tablePostPrintKitchenSent };
              if (currentTable && currentOrderType === 'dine-in') {
                const key = `table-${currentTable.id}`;
                updatedSavedCarts[key] = newCart;
                updatedPostPrint[key] = false;
                get().reconcileTableSplitBillsAfterPartialPay(
                  key,
                  options.paidAllocations,
                  options.paidTabId,
                  previousCart
                );
              }
              set({
                cart: newCart,
                savedCarts: updatedSavedCarts,
                tablePostPrintKitchenSent: updatedPostPrint,
                isCheckingOut: false,
              });
            } else if (isPartial && options?.paidIndices?.length) {
              const paidSet = new Set(options.paidIndices);
              const remainingCart = previousCart.filter((_, i) => !paidSet.has(i));
              const updatedSavedCarts = { ...get().savedCarts };
              const updatedPostPrint = { ...get().tablePostPrintKitchenSent };
              if (currentTable && currentOrderType === 'dine-in') {
                const key = `table-${currentTable.id}`;
                updatedSavedCarts[key] = remainingCart;
                updatedPostPrint[key] = false;
                const paidAllocations = options.paidIndices.map((idx) => ({
                  lineKey: getCartLineKey(previousCart[idx], idx),
                  quantity: previousCart[idx]?.quantity ?? 1,
                }));
                get().reconcileTableSplitBillsAfterPartialPay(
                  key,
                  paidAllocations,
                  options.paidTabId,
                  previousCart
                );
              }
              set({
                cart: remainingCart,
                savedCarts: updatedSavedCarts,
                tablePostPrintKitchenSent: updatedPostPrint,
                isCheckingOut: false,
              });
            } else {
            // Cancel any leftover pending orders for this table (kitchen orders from before checkout)
            if (currentTable?.id && currentOrderType === 'dine-in') {
              try {
                await supabase
                  .from('orders')
                  .update({ status: 'cancelled' })
                  .eq('table_id', currentTable.id)
                  .eq('status', 'pending');
              } catch (pendingErr) {
                console.error('Failed to cancel pending table orders:', pendingErr);
              }
            }

            // Release table after successful checkout
            if (currentTable && currentOrderType === 'dine-in') {
              try {
                const { error: tableError } = await supabase
                  .from('tables')
                  .update({ 
                    status: 'available',
                    current_order_id: null,
                    is_merged: false,
                    merged_tables: null
                  })
                  .eq('id', currentTable.id);
                if (tableError) throw tableError;

                // Bring back any source tables that were hidden under this merged table
                await supabase
                  .from('tables')
                  .update({ merged_into: null })
                  .eq('merged_into', currentTable.id);
              } catch (tableError) {
                console.error('Failed to release table:', tableError);
              }
            }

            // Ensure local table selection is cleared (savedCarts already cleared at start)
            set({ 
              currentTable: null, 
              currentOrderType: null
            });
            }

            // Track shift amounts if shift is open (full and split bill)
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
          // Offline: Queue action and clear local table state so UI doesn't stay stuck
          set(state => ({
            pendingActions: [...state.pendingActions, {
              type: 'CHECKOUT',
              payload: {
                cart: activeCart,
                paymentMethod,
                totalAmount,
                date: new Date().toISOString(),
                notes,
                cashTendered,
                selectedBank: selectedBankForMeta,
                tableId: currentTable?.id || null,
                orderType: currentOrderType || 'takeout'
              }
            }],
            currentTable: null,
            currentOrderType: null,
            checkoutError: null,
            isCheckingOut: false
          }));
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
        heldTakeoutNumberSeq: state.heldTakeoutNumberSeq,
        savedCarts: state.savedCarts,
        tableBillPrinted: state.tableBillPrinted,
        tablePostPrintKitchenSent: state.tablePostPrintKitchenSent,
        kitchenPrintQueue: state.kitchenPrintQueue,
        tableSplitBills: state.tableSplitBills,
        tableSplitBillActiveTab: state.tableSplitBillActiveTab,
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
        licenseSyncAt: state.licenseSyncAt,
        settingsUpdatedAt: state.settingsUpdatedAt
      }),
    }
  )
);

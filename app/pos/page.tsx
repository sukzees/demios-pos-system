'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePosStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Search, Trash2, CreditCard, ArrowRight, Clock, PauseCircle, PlayCircle, Printer, List, LayoutGrid, AlertTriangle, CheckSquare, ShoppingBag, Grid3x3, X } from 'lucide-react';
import { Item, Recipe, supabase, Table } from '@/lib/supabase';
import { TableSelection } from '@/components/table-selection';
import html2canvas from 'html2canvas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { formatCurrency as formatCurrencyBySettings } from '@/lib/currency';

const isMissingColumnInSchemaCache = (error: any, table: string, column: string): boolean => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('schema cache') && message.includes(table.toLowerCase()) && message.includes(column.toLowerCase());
};

const TRANSLATIONS = {
  en: {
    pos: 'POS',
    searchItems: 'Search items...',
    allCategories: 'ALL CATEGORIES',
    cart: 'Cart',
    emptyCart: 'Your cart is empty',
    hold: 'Hold',
    checkout: 'Checkout',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    fixedAmount: 'Amount',
    percentage: 'Percentage',
    paymentMethod: 'Select Payment Method',
    cash: 'Cash',
    transfer: 'Transfer',
    confirm: 'Confirm',
    cancel: 'Cancel',
    processing: 'Processing...',
    orderSuccessful: 'Order Successful',
    orderPlaced: 'Your order has been placed.',
    outOfStock: 'Out of Stock',
    available: 'Available',
    selectPortion: 'Select Portion',
    addToCart: 'Add to Cart',
    deleteHeldOrder: 'Delete Held Order?',
    deleteAction: 'Delete Order',
    confirmPayment: 'Confirm Payment',
    confirmTransfer: 'Confirm Transfer',
    verifyTransfer: 'Please verify the transfer receipt before confirming.',
    note: 'Note',
    notes: 'Notes',
    heldOrders: 'Held Orders',
    allCarts: 'All Carts',
    noSavedCarts: 'No saved carts',
    savedCartsDescription: 'Saved carts from tables and takeout will appear here.',
    addToCurrentCart: 'Add to Cart',
    resume: 'Resume',
    low: 'Low',
    ready: 'Ready',
    stock: 'Stock',
    portionsAvailable: 'Portions Available',
    noHeldOrders: 'No held orders',
    heldOrdersDescription: 'Orders you hold will appear here.',
    delete: 'Delete',
    currentOrder: 'Current Order',
    holdOrder: 'Hold Order',
    clearCart: 'Clear Cart',
    addOrderNotes: 'Add order notes...',
    tipAmount: 'Tip Amount',
    tax: 'Tax',
    tip: 'Tip',
    printBill: 'Print Bill',
    completeOrder: 'Complete Order',
    sendToKitchen: 'Send to Kitchen',
    totalAmount: 'Total Amount:',
    cashTendered: 'Cash Tendered',
    totalDue: 'Total Due:',
    tendered: 'Tendered:',
    change: 'Change:',
    due: 'Due:',
    exact: 'Exact',
    backspace: 'Backspace',
    listView: 'List view',
    gridView: 'Grid view',
    noBankConfigured: 'No bank enabled for transfer. Please configure it in Settings → Bank Config.',
    bank: 'Bank',
    accountName: 'Account Name',
    printingKitchen: 'Printing kitchen tickets...',
    printingTo: 'Printing to',
    printing: 'Printing...',
    accountNumber: 'Account Number',
    selected: ' (Selected)',
    cannotBeUndone: 'This action cannot be undone.',
    confirmDeleteHeldOrder: 'You are about to delete this held order:',
    items: 'Items:',
    time: 'Time:',
    cannotBeUndoneWarning: '⚠️ This action cannot be undone.',
    choosePortionFor: 'Choose a portion for',
    item: 'Item',
    itemsPlural: 'Items',
    takeout: 'Takeout',
    dineIn: 'Dine In',
    table: 'Table',
    forPickup: 'For pickup',
    seats: 'seats',
    clearToTransferTable: 'Clear current order to transfer table?',
    menu: 'Menu',
    addMoreItems: 'Add More Items',
    orderCompletedTableReleased: 'Order completed! Table has been released.',
    selectTable: 'Select Table',
    backToSelection: 'Back to Selection',
    selectOrderType: 'Select Order Type',
    selectTableOrTakeout: 'Please select a table or takeout to start ordering',
    mergeTables: 'Merge Tables',
    splitTable: 'Split Table',
    transferTable: 'Transfer Table',
    selectTableToMerge: 'Select table to merge with',
    selectTableToTransfer: 'Select table to transfer to',
    mergeSuccess: 'Tables merged successfully!',
    splitSuccess: 'Table split successfully!',
    transferSuccess: 'Table transferred successfully!',
    cannotMergeSameTable: 'Cannot merge table with itself',
    cannotTransferSameTable: 'Cannot transfer to the same table',
    selectItemsToSplit: 'Select items to move to new table',
    moveToNewTable: 'Move to New Table',
    noItemsSelected: 'No items selected',
    setAvailable: 'Set Available',
    allItemsCancelled: 'All items cancelled',
    sentToKitchenStatus: 'Sent to Kitchen',
    cancelledStatus: 'Cancelled',
    date: 'Date',
    unit: 'Unit',
    price: 'Price',
    bankTransferDetails: 'Bank Transfer Details',
    scanToPay: 'Scan to Pay',
  },
  lo: {
    pos: 'ຂາຍສິນຄ້າ',
    searchItems: 'ຄົ້ນຫາສິນຄ້າ...',
    allCategories: 'ໝວດໝູ່ທັງໝົດ',
    cart: 'ກະຕ່າ',
    emptyCart: 'ກະຕ່າຂອງທ່ານວ່າງເປົ່າ',
    hold: 'ພັກລາຍການ',
    checkout: 'ຊຳລະເງິນ',
    total: 'ລວມທັງໝົດ',
    subtotal: 'ລາຄາລວມ',
    discount: 'ສ່ວນຫຼຸດ',
    fixedAmount: 'ຈຳນວນເງິນ',
    percentage: 'ເປີເຊັນ',
    paymentMethod: 'ເລືອກວິທີຊຳລະ',
    cash: 'ເງິນສົດ',
    transfer: 'ໂອນເງິນ',
    confirm: 'ຢືນຢັນ',
    cancel: 'ຍົກເລີກ',
    processing: 'ກຳລັງປະມວນຜົນ...',
    orderSuccessful: 'ສັ່ງສຳເລັດແລ້ວ',
    orderPlaced: 'ລາຍການສັ່ງຂອງທ່ານຖືກບັນທຶກແລ້ວ.',
    outOfStock: 'ສິນຄ້າໝົດ',
    available: 'ຍັງເຫຼືອໃນສາງ',
    selectPortion: 'ເລືອກຂະໜາດ',
    addToCart: 'ເພີ່ມໃສ່ກະຕ່າ',
    deleteHeldOrder: 'ລຶບລາຍການທີ່ພັກໄວ້?',
    deleteAction: 'ລຶບລາຍການ',
    confirmPayment: 'ຢືນຢັນການຊຳລະ',
    confirmTransfer: 'ຢືນຢັນການໂອນ',
    verifyTransfer: 'ກະລຸນາກວດສອບໃບບິນໂອນກ່ອນຢືນຢັນ.',
    note: 'ໝາຍເຫດ',
    heldOrders: 'ລາຍການທີ່ພັກໄວ້',
    allCarts: 'ກະຕ່າທັງໝົດ',
    noSavedCarts: 'ບໍ່ມີກະຕ່າທີ່ບັນທຶກໄວ້',
    savedCartsDescription: 'ກະຕ່າທີ່ບັນທຶກຈາກໂຕະແລະກັບບ້ານຈະສະແດງຢູ່ນີ້.',
    addToCurrentCart: 'ເພີ່ມໃສ່ກະຕ່າ',
    resume: 'ສືບຕໍ່',
    low: 'ໃກ້ໝົດ',
    ready: 'ພ້ອມ',
    stock: 'ສິນຄ້າ',
    portionsAvailable: 'ຂະໜາດທີ່ມີ',
    noHeldOrders: 'ບໍ່ມີລາຍການພັກໄວ້',
    heldOrdersDescription: 'ລາຍການທີ່ພັກໄວ້ຈະສະແດງຢູ່ນີ້.',
    delete: 'ລຶບ',
    currentOrder: 'ລາຍການປັດຈຸບັນ',
    holdOrder: 'ພັກລາຍການ',
    clearCart: 'ລ້າງກະຕ່າ',
    addOrderNotes: 'ເພີ່ມໝາຍເຫດ...',
    tipAmount: 'ຈຳນວນທິບ',
    tax: 'ອາກອນ',
    tip: 'ທິບ',
    printBill: 'ພິມບິນ',
    completeOrder: 'ສຳເລັດລາຍການ',
    sendToKitchen: 'ສົ່ງໄປຫ້ອງຄົວ',
    totalAmount: 'ຈຳນວນເງິນລວມ:',
    cashTendered: 'ເງິນທີ່ຮັບ',
    totalDue: 'ຍອດທີ່ຕ້ອງຊຳລະ:',
    tendered: 'ຮັບ:',
    change: 'ທອນ:',
    due: 'ຄ້າງ:',
    exact: 'ຖ້ວນ',
    backspace: 'ລຶບ',
    listView: 'ເບີ່ງແບບລາຍການ',
    gridView: 'ເບີ່ງແບບຕາຕະລາງ',
    noBankConfigured: 'ບໍ່ມີທະນາຄານເປີດໃຊ້ງານ. ກະລຸນາຕັ້ງຄ່າໃນ ການຕັ້ງຄ່າ → ທະນາຄານ.',
    bank: 'ທະນາຄານ',
    accountName: 'ຊື່ບັນຊີ',
    accountNumber: 'ເລກບັນຊີ',
    selected: ' (ເລືອກ)',
    cannotBeUndone: 'ບໍ່ສາມາດຍົກເລີກໄດ້.',
    confirmDeleteHeldOrder: 'ທ່ານກຳລັງລຶບລາຍການນີ້:',
    items: 'ລາຍການ:',
    time: 'ເວລາ:',
    cannotBeUndoneWarning: '⚠️ ບໍ່ສາມາດຍົກເລີກໄດ້.',
    choosePortionFor: 'ເລືອກຂະໜາດສຳລັບ',
    item: 'ລາຍການ',
    itemsPlural: 'ລາຍການ',
    takeout: 'ກັບບ້ານ',
    dineIn: 'ນັ່ງໃນຮ້ານ',
    table: 'ໂຕະ',
    forPickup: 'ສຳລັບເອົາກັບບ້ານ',
    seats: 'ທີ່ນັ່ງ',
    clearToTransferTable: 'ລ້າງລາຍການປັດຈຸບັນເພື່ອໂອນໂຕະ?',
    menu: 'ເມນູ',
    addMoreItems: 'ເພີ່ມເມນູ',
    orderCompletedTableReleased: 'ສຳເລັດລາຍການ! ໂຕະຖືກປ່ອຍແລ້ວ.',
    selectTable: 'ເລືອກໂຕະ',
    backToSelection: 'ກັບຄືນໄປເລືອກ',
    selectOrderType: 'ເລືອກປະເພດການສັ່ງ',
    selectTableOrTakeout: 'ກະລຸນາເລືອກໂຕະຫຼືກັບບ້ານເພື່ອເລີ່ມສັ່ງ',
    mergeTables: 'ລວມໂຕະ',
    splitTable: 'ແຍກໂຕະ',
    transferTable: 'ໂອນໂຕະ',
    selectTableToMerge: 'ເລືອກໂຕະທີ່ຈະລວມ',
    selectTableToTransfer: 'ເລືອກໂຕະທີ່ຈະໂອນໄປ',
    mergeSuccess: 'ລວມໂຕະສຳເລັດ!',
    splitSuccess: 'ແຍກໂຕະສຳເລັດ!',
    transferSuccess: 'ໂອນໂຕະສຳເລັດ!',
    cannotMergeSameTable: 'ບໍ່ສາມາດລວມໂຕະດຽວກັນໄດ້',
    cannotTransferSameTable: 'ບໍ່ສາມາດໂອນໄປໂຕະດຽວກັນໄດ້',
    selectItemsToSplit: 'ເລືອກລາຍການທີ່ຈະຍ້າຍໄປໂຕະໃໝ່',
    moveToNewTable: 'ຍ້າຍໄປໂຕະໃໝ່',
    noItemsSelected: 'ບໍ່ໄດ້ເລືອກລາຍການ',
    setAvailable: 'ປ່ອຍໂຕະ',
    allItemsCancelled: 'ຍົກເລີກທຸກລາຍການແລ້ວ',
    printingKitchen: 'ກຳລັງພິມໃບຄົວ...',
    printingTo: 'ກຳລັງພິມໄປທີ່',
    printing: 'ກຳລັງພິມ...',
    sentToKitchenStatus: 'ສົ່ງຄົວແລ້ວ',
    cancelledStatus: 'ຍົກເລີກ',
    date: 'ວັນທີ',
    unit: 'ຈຳນວນ',
    price: 'ລາຄາ',
    notes: 'ໝາຍເຫດ',
    bankTransferDetails: 'ລາຍລະອຽດໂອນເງິນ',
    scanToPay: 'ສະແກນເພື່ອຈ່າຍ',
  },
  th: {
    pos: 'ขายหน้าร้าน',
    searchItems: 'ค้นหาสินค้า...',
    allCategories: 'ทุกหมวดหมู่',
    cart: 'ตะกร้า',
    emptyCart: 'ตะกร้าของคุณว่างเปล่า',
    hold: 'พักรายการ',
    checkout: 'ชำระเงิน',
    total: 'รวมทั้งสิ้น',
    subtotal: 'ราคารวม',
    discount: 'ส่วนลด',
    fixedAmount: 'จำนวนเงิน',
    percentage: 'เปอร์เซ็นต์',
    paymentMethod: 'เลือกวิธีชำระเงิน',
    cash: 'เงินสด',
    transfer: 'โอนเงิน',
    confirm: 'ยืนยัน',
    cancel: 'ยกเลิก',
    processing: 'กำลังประมวลผล...',
    orderSuccessful: 'สั่งซื้อสำเร็จ',
    orderPlaced: 'รายการสั่งซื้อของคุณถูกบันทึกแล้ว',
    outOfStock: 'สินค้าหมด',
    available: 'มีจำหน่าย',
    selectPortion: 'เลือกขนาด',
    addToCart: 'เพิ่มลงตะกร้า',
    deleteHeldOrder: 'ลบรายการที่พักไว้?',
    deleteAction: 'ลบรายการ',
    confirmPayment: 'ยืนยันการชำระเงิน',
    confirmTransfer: 'ยืนยันการโอนเงิน',
    verifyTransfer: 'กรุณาตรวจสอบหลักฐานการโอนก่อนยืนยัน',
    note: 'หมายเหตุ',
    heldOrders: 'รายการที่พักไว้',
    allCarts: 'ตะกร้าทั้งหมด',
    noSavedCarts: 'ไม่มีตะกร้าที่บันทึกไว้',
    savedCartsDescription: 'ตะกร้าที่บันทึกจากโต๊ะและกลับบ้านจะแสดงที่นี่',
    addToCurrentCart: 'เพิ่มลงตะกร้า',
    resume: 'ดำเนินการต่อ',
    low: 'ใกล้หมด',
    ready: 'พร้อม',
    stock: 'สินค้า',
    portionsAvailable: 'ขนาดที่มี',
    noHeldOrders: 'ไม่มีรายการพักไว้',
    heldOrdersDescription: 'รายการที่คุณพักไว้จะแสดงที่นี่',
    delete: 'ลบ',
    currentOrder: 'รายการปัจจุบัน',
    holdOrder: 'พักรายการ',
    clearCart: 'ล้างตะกร้า',
    addOrderNotes: 'เพิ่มหมายเหตุ...',
    tipAmount: 'จำนวนทิป',
    tax: 'ภาษี',
    tip: 'ทิป',
    printBill: 'พิมพ์บิล',
    completeOrder: 'เสร็จสิ้นรายการ',
    sendToKitchen: 'ส่งไปครัว',
    totalAmount: 'จำนวนเงินรวม:',
    cashTendered: 'เงินที่รับ',
    totalDue: 'ยอดที่ต้องชำระ:',
    tendered: 'รับ:',
    change: 'ทอน:',
    due: 'ค้าง:',
    exact: 'พอดี',
    backspace: 'ลบ',
    listView: 'มุมมองรายการ',
    gridView: 'มุมมองตาราง',
    noBankConfigured: 'ไม่มีธนาคารที่เปิดใช้งาน กรุณาตั้งค่าใน การตั้งค่า → ธนาคาร',
    bank: 'ธนาคาร',
    accountName: 'ชื่อบัญชี',
    accountNumber: 'เลขที่บัญชี',
    selected: ' (เลือก)',
    cannotBeUndone: 'ไม่สามารถยกเลิกได้',
    confirmDeleteHeldOrder: 'คุณกำลังลบรายการนี้:',
    items: 'รายการ:',
    time: 'เวลา:',
    cannotBeUndoneWarning: '⚠️ ไม่สามารถยกเลิกได้',
    choosePortionFor: 'เลือกขนาดสำหรับ',
    item: 'รายการ',
    itemsPlural: 'รายการ',
    takeout: 'กลับบ้าน',
    dineIn: 'นั่งทาน',
    table: 'โต๊ะ',
    forPickup: 'สำหรับเอากลับบ้าน',
    seats: 'ที่นั่ง',
    clearToTransferTable: 'ล้างรายการปัจจุบันเพื่อโอนโต๊ะ?',
    menu: 'เมนู',
    addMoreItems: 'เพิ่มเมนู',
    orderCompletedTableReleased: 'สำเร็จรายการ! โต๊ะถูกปล่อยแล้ว',
    selectTable: 'เลือกโต๊ะ',
    backToSelection: 'กลับไปเลือก',
    selectOrderType: 'เลือกประเภทการสั่ง',
    selectTableOrTakeout: 'กรุณาเลือกโต๊ะหรือกลับบ้านเพื่อเริ่มสั่ง',
    mergeTables: 'รวมโต๊ะ',
    splitTable: 'แยกโต๊ะ',
    transferTable: 'โอนโต๊ะ',
    selectTableToMerge: 'เลือกโต๊ะที่จะรวม',
    selectTableToTransfer: 'เลือกโต๊ะที่จะโอนไป',
    mergeSuccess: 'รวมโต๊ะสำเร็จ!',
    splitSuccess: 'แยกโต๊ะสำเร็จ!',
    transferSuccess: 'โอนโต๊ะสำเร็จ!',
    cannotMergeSameTable: 'ไม่สามารถรวมโต๊ะเดียวกันได้',
    cannotTransferSameTable: 'ไม่สามารถโอนไปโต๊ะเดียวกันได้',
    selectItemsToSplit: 'เลือกรายการที่จะย้ายไปโต๊ะใหม่',
    moveToNewTable: 'ย้ายไปโต๊ะใหม่',
    noItemsSelected: 'ไม่ได้เลือกรายการ',
    setAvailable: 'ปล่อยโต๊ะ',
    allItemsCancelled: 'ยกเลิกทุกรายการแล้ว',
    printingKitchen: 'กำลังพิมพ์ใบครัว...',
    printingTo: 'กำลังพิมพ์ไปที่',
    printing: 'กำลังพิมพ์...',
    sentToKitchenStatus: 'ส่งครัวแล้ว',
    cancelledStatus: 'ยกเลิก',
    date: 'วันที่',
    unit: 'จำนวน',
    price: 'ราคา',
    notes: 'หมายเหตุ',
    bankTransferDetails: 'รายละเอียดโอนเงิน',
    scanToPay: 'สแกนเพื่อจ่าย',
  }
};

type ItemPortion = {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
};

// Mock data for when Supabase is not configured
const MOCK_CATEGORIES = [
  { id: 'c1', name: 'Burgers', created_at: '' },
  { id: 'c2', name: 'Drinks', created_at: '' },
  { id: 'c3', name: 'Sides', created_at: '' },
];

const MOCK_ITEMS: Item[] = [
  { id: 'i1', name: 'Classic Burger', price: 8.99, category_id: 'c1', created_at: '', is_recipe: true },
  { id: 'i2', name: 'Cheese Burger', price: 9.99, category_id: 'c1', created_at: '', is_recipe: true },
  { id: 'i3', name: 'Double Burger', price: 12.99, category_id: 'c1', created_at: '', is_recipe: true },
  { id: 'i4', name: 'Cola', price: 2.50, category_id: 'c2', created_at: '', is_recipe: true },
  { id: 'i5', name: 'Lemonade', price: 3.00, category_id: 'c2', created_at: '', is_recipe: true },
  { id: 'i6', name: 'Fries', price: 3.99, category_id: 'c3', created_at: '', is_recipe: true },
  { id: 'i7', name: 'Onion Rings', price: 4.99, category_id: 'c3', created_at: '', is_recipe: true },
];

export default function PosPage() {
  const createClientLineId = () => `cart-line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const {
    items, categories, cart, isSupabaseConfigured, heldOrders, receiptSettings, savedCarts,
    checkSupabaseConfig, fetchItemsAndCategories,
    addToCart, removeFromCart: storeRemoveFromCart, removeFromCartByIndex, cancelCartItem, cancelCartItemByIndex, updateCartQuantity, updateCartQuantityByIndex, clearCart, clearUnsentItems, markCartItemsAsSent, checkout,
    holdOrder, resumeOrder, removeHeldOrder, setHeldOrders, currencySettings, generalSettings, checkoutError, bankConfigs, autoPrint, silentPrint,
    isShiftOpen, shiftStartTime, shiftCashAmount, shiftTransferAmount, openShift, closeShift,
    currentTable, currentOrderType, setCurrentTable, clearCurrentTable,
    stationMappings, printerConfigs
  } = usePosStore();

  // Table selection state
  const [showTableSelection, setShowTableSelection] = useState(false);
  const [mobilePosView, setMobilePosView] = useState<'menu' | 'order'>('menu');
  const [zones, setZones] = useState<any[]>([]);

  // Custom removeFromCart with void bill support
  const removeFromCart = (itemId: string) => {
    const cartItem = cart.find(c => c.item.id === itemId);
    if (!cartItem) return;

    // Check if void bill is enabled
    if (receiptSettings.enableVoidBill) {
      handleVoidBill(cartItem);
    }

    // Call the original removeFromCart
    storeRemoveFromCart(itemId);
  };

  // Handle void bill creation
  const handleVoidBill = (cartItem: any) => {
    const { enableVoidBill, autoPrintVoidBill } = receiptSettings;
    if (!enableVoidBill) return;

    const voidBillHtml = createVoidBillHtml(cartItem);

    if (autoPrintVoidBill) {
      // Auto print void bill
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(voidBillHtml);
        printWindow.document.close();
        // Trigger print after a short delay
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      }
    }
  };

  // Create void bill HTML
  const createVoidBillHtml = (cartItem: any) => {
    const receiptHtml = `
      <html>
        <head>
          <title>VOID BILL - ${cartItem.item.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;700&display=swap');
            body { font-family: 'Noto Sans Lao', sans-serif; padding: 20px; max-width: 360px; margin: 0 auto; color: #000; }
            .text-center { text-align: center; }
            .mb-4 { margin-bottom: 1rem; }
            .text-xs { font-size: 12px; }
            .text-sm { font-size: 14px; }
            .font-bold { font-weight: bold; }
            .flex { display: flex; justify-content: space-between; }
            .border-y { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
            .text-red-600 { color: #dc2626; }
            .bg-red-50 { background-color: #fef2f2; }
            .border-red-200 { border-color: #fecaca; }
            table { width: 100%; border-collapse: collapse; }
            th, td { font-size: 12px; padding: 4px 0; }
          </style>
        </head>
        <body>
          <div class="text-center mb-4">
            <div class="inline-block px-4 py-1 bg-red-50 border border-red-200 rounded text-red-600 font-bold text-lg">
              VOID BILL
            </div>
          </div>
          <div class="text-xs mb-4">
            Date: ${new Date().toLocaleDateString()}<br>
            Time: ${new Date().toLocaleTimeString()}
          </div>
          <div class="border-y text-xs">
            <table>
              <thead>
                <tr>
                  <th style="text-align:left; padding-bottom: 4px;">Item</th>
                  <th style="text-align:center; padding-bottom: 4px;">Qty</th>
                  <th style="text-align:right; padding-bottom: 4px;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 2px 0; text-align:left;">${cartItem.item.name}</td>
                  <td style="padding: 2px 0; text-align:center;">${cartItem.quantity}</td>
                  <td style="padding: 2px 0; text-align:right; color: #dc2626; font-weight: bold;">VOIDED</td>
                </tr>
              </tbody>
            </table>
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }
          </script>
        </body>
      </html>
    `;

    return receiptHtml;
  };

  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeStocks, setRecipeStocks] = useState<{ [key: string]: number }>({});
  const [recipeHasIngredients, setRecipeHasIngredients] = useState<{ [key: string]: boolean }>({});
  const [portionsByProduct, setPortionsByProduct] = useState<Record<string, ItemPortion[]>>({});

  // Fetch recipes from database
  const fetchRecipes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false});

      if (data) {
        setRecipes(data);
        
        // Check which recipes have ingredients
        const { data: allIngredients } = await supabase
          .from('recipe_ingredients')
          .select('recipe_id');
        
        const hasIngredientsMap: { [key: string]: boolean } = {};
        data.forEach(recipe => {
          hasIngredientsMap[recipe.id] = allIngredients?.some(ing => ing.recipe_id === recipe.id) || false;
        });
        
        setRecipeHasIngredients(hasIngredientsMap);
      }
      if (error) console.error('Error fetching recipes:', error);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  }, []);

  const fetchItemPortions = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPortionsByProduct({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('item_portions')
        .select('id, item_id, recipe_id, inventory_item_id, portion_name, portion_price, portion_stock')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const grouped: Record<string, ItemPortion[]> = {};
      for (const row of data || []) {
        const productId = row.item_id || row.recipe_id || row.inventory_item_id;
        if (!productId) continue;
        if (!grouped[productId]) grouped[productId] = [];
        grouped[productId].push({
          id: String(row.id),
          productId,
          name: String(row.portion_name || ''),
          price: Number(row.portion_price || 0),
          stock: Number(row.portion_stock || 0),
        });
      }
      setPortionsByProduct(grouped);
    } catch (error) {
      // Log error details for debugging
      if (error instanceof Error) {
        console.warn('Error fetching item portions:', error.message);
      } else {
        console.warn('Error fetching item portions:', String(error));
      }
      setPortionsByProduct({});
    }
  }, [isSupabaseConfigured]);

  // Calculate recipe stock based on ingredients
  const calculateRecipeStock = useCallback(async (recipeId: string) => {
    try {
      // Get recipe ingredients
      const { data: ingredients, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipeId);

      if (error || !ingredients || ingredients.length === 0) {
        return 0;
      }

      // Calculate how many recipes can be made based on each ingredient
      const recipeStocks = ingredients.map(ingredient => {
        const ingredientItem = items.find(item => item.id === ingredient.ingredient_id);
        if (!ingredientItem) return 0;

        // Get stock from inventory_items for standalone ingredients
        const itemType = (ingredientItem as any).type;
        let availableStock = 0;
        
        if (itemType === 'standalone' && (ingredientItem as any).inventory_item_id) {
          const linkedInvItem = items.find(invItem => invItem.id === (ingredientItem as any).inventory_item_id);
          availableStock = (linkedInvItem as any)?.stock ?? 0;
        } else {
          // For non-standalone items in inventory_items table
          availableStock = (ingredientItem as any)?.stock ?? 0;
        }
        
        const neededPerRecipe = ingredient.quantity_needed || 1;

        return Math.floor(availableStock / neededPerRecipe);
      });

      // Return the minimum (limiting ingredient)
      return Math.min(...recipeStocks);
    } catch (error) {
      console.error('Error calculating recipe stock:', error);
      return 0;
    }
  }, [items]);

  // Calculate all recipe stocks
  const calculateAllRecipeStocks = useCallback(async () => {
    const newRecipeStocks: { [key: string]: number } = {};

    for (const recipe of recipes) {
      const stock = await calculateRecipeStock(recipe.id);
      newRecipeStocks[recipe.id] = stock;
    }

    setRecipeStocks(newRecipeStocks);
  }, [calculateRecipeStock, recipes]);

  const formatCurrency = (price: number) => formatCurrencyBySettings(price, currencySettings);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printingMessage, setPrintingMessage] = useState('');
  const [note, setNote] = useState('');
  const [tip, setTip] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [pendingKitchenOrders, setPendingKitchenOrders] = useState<{ id: string; items: number; total: number; time: string; cart: any[] }[]>([]);
  const [activeTab, setActiveTab] = useState('cash');
  const [transferViewMode, setTransferViewMode] = useState<'list' | 'grid'>('list');
  const [cashTendered, setCashTendered] = useState('');
  const [isCashInputFocused, setIsCashInputFocused] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [portionSelectionItem, setPortionSelectionItem] = useState<any | null>(null);
  const [portionQuantities, setPortionQuantities] = useState<Record<string, number>>({});
  
  // Price input for zero-price items
  const [priceInputItem, setPriceInputItem] = useState<{ item: any; stock: number; hasPortions?: boolean } | null>(null);
  const [customPrice, setCustomPrice] = useState('');
  
  // Merge/Split/Transfer table states
  const [showMergeTableModal, setShowMergeTableModal] = useState(false);
  const [showSplitTableModal, setShowSplitTableModal] = useState(false);
  const [showTransferTableModal, setShowTransferTableModal] = useState(false);
  const [selectedItemsToSplit, setSelectedItemsToSplit] = useState<Set<string>>(new Set());
  const [availableTables, setAvailableTables] = useState<Table[]>([]);


  // Don't auto-show table selection when cart is empty
  // User can manually open it by clicking "Transfer Table" or when starting new order
  // useEffect(() => {
  //   if (cart.length === 0 && !currentTable && !currentOrderType) {
  //     setShowTableSelection(true);
  //   }
  // }, [cart.length, currentTable, currentOrderType]);

  const fetchZones = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.from('zones').select('*');
    if (data) setZones(data);
  }, [isSupabaseConfigured]);

  // Fetch zones for table info display
  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  useEffect(() => {
    if (portionSelectionItem) {
      const initial: Record<string, number> = {};
      // Initialize from item's own portions
      (portionsByProduct[portionSelectionItem.id] || []).forEach(p => {
        initial[p.id] = 0;
      });
      // Also initialize from linked inventory item's portions
      const linkedInventoryItemId = (portionSelectionItem as any).inventory_item_id;
      if (linkedInventoryItemId) {
        (portionsByProduct[linkedInventoryItemId] || []).forEach(p => {
          initial[p.id] = 0;
        });
      }
      setPortionQuantities(initial);
    }
  }, [portionSelectionItem, portionsByProduct]);

  useEffect(() => {
    checkSupabaseConfig();
    fetchItemsAndCategories();
    fetchRecipes();
  }, [checkSupabaseConfig, fetchItemsAndCategories, fetchRecipes]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchItemPortions();
    } else {
      setPortionsByProduct({});
    }
  }, [fetchItemPortions, isSupabaseConfigured, items.length, recipes.length]);

  // Listen for portion refresh events
  useEffect(() => {
    const handleRefreshPortions = () => {
      fetchItemPortions();
    };
    
    window.addEventListener('refreshPortions', handleRefreshPortions);
    
    return () => {
      window.removeEventListener('refreshPortions', handleRefreshPortions);
    };
  }, [fetchItemPortions]);

  useEffect(() => {
    if (recipes.length > 0 && items.length > 0) {
      calculateAllRecipeStocks();
    }
  }, [calculateAllRecipeStocks, recipes.length, items.length]);

  const extractOrderItemMeta = useCallback((notes?: string | null) => {
    const raw = String(notes || '');
    const clientLineId = raw.match(/(?:^|\s\|\s)Line:\s*([^|]+)/)?.[1]?.trim();
    const itemName = raw.match(/(?:^|\s\|\s)Item:\s*([^|]+)/)?.[1]?.trim();
    const portionName = raw.match(/(?:^|\s\|\s)Portion:\s*([^|]+)/)?.[1]?.trim();
    const cancelledAt = raw.match(/(?:^|\s\|\s)CancelledAt:\s*([^|]+)/)?.[1]?.trim();
    const cancelled = /(?:^|\s\|\s)Kitchen:\s*cancelled/i.test(raw);
    return { clientLineId, itemName, portionName, cancelledAt, cancelled };
  }, []);

  const resolveCurrentOrderId = useCallback(async (
    table: Table | null = currentTable,
    options: { allowTableFallback?: boolean; maxFallbackAgeMs?: number } = {}
  ) => {
    if (!isSupabaseConfigured || !table?.id) return null;
    if (table.current_order_id) {
      return table.status === 'occupied' ? table.current_order_id : null;
    }

    const {
      allowTableFallback = false,
      maxFallbackAgeMs = 12 * 60 * 60 * 1000
    } = options;

    if (!allowTableFallback || table.status !== 'occupied') return null;

    const fallbackCutoff = new Date(Date.now() - maxFallbackAgeMs).toISOString();
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', table.id)
      .eq('status', 'pending')
      .gte('created_at', fallbackCutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to resolve current order:', error);
      return null;
    }

    return data?.id || null;
  }, [currentTable, isSupabaseConfigured]);

  const loadCurrentOrderFromSupabase = useCallback(async (table: Table | null = currentTable) => {
    if (!isSupabaseConfigured || !table?.id) return false;

    const orderId = await resolveCurrentOrderId(table);
    if (!orderId) {
      return false;
    }

    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select('*, item:items(*)')
      .eq('order_id', orderId);

    if (error) {
      console.error('Failed to load current order:', error);
      return false;
    }

    const syncedCart = (orderItems || []).map((line: any) => {
      const meta = extractOrderItemMeta(line.notes);
      const itemFromDb = line.item;
      const fallbackId = line.item_id || `order-line-${line.id}`;
      const item = itemFromDb || {
        id: fallbackId,
        name: meta.itemName || 'Kitchen item',
        price: Number(line.price_at_time || 0),
        category_id: '',
        stock: 9999,
        created_at: '',
        is_recipe: false
      };
      const isCancelled = meta.cancelled;

      return {
        item: {
          ...item,
          price: Number(line.price_at_time || item.price || 0)
        },
        quantity: Number(line.quantity || 1),
        sourceItemId: line.item_id || item.id,
        orderItemId: line.id,
        clientLineId: meta.clientLineId,
        portionName: meta.portionName,
        sentToKitchen: !isCancelled,
        sentToKitchenTime: isCancelled ? undefined : new Date(line.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        completedInKitchen: false,
        cancelled: isCancelled,
        cancelledAt: isCancelled ? meta.cancelledAt : undefined
      };
    });

    const localCart = usePosStore.getState().cart;
    const syncedKeys = new Set(
      syncedCart.map((cartItem: any) => cartItem.clientLineId || cartItem.orderItemId)
    );
    const unsyncedLocalCart = localCart.filter((cartItem: any) => {
      if (cartItem.sentToKitchen || cartItem.cancelled) return false;
      const localKey = cartItem.clientLineId || cartItem.orderItemId;
      return !localKey || !syncedKeys.has(localKey);
    });

    usePosStore.setState({ cart: [...syncedCart, ...unsyncedLocalCart] });
    return true;
  }, [currentTable, extractOrderItemMeta, isSupabaseConfigured, resolveCurrentOrderId]);

  const refreshRealtimePosData = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    await Promise.all([
      fetchItemsAndCategories(),
      fetchRecipes(),
      fetchItemPortions(),
      fetchZones()
    ]);

    if (currentTable?.id) {
      const { data } = await supabase
        .from('tables')
        .select('*')
        .eq('id', currentTable.id)
        .single();

      if (data) {
        usePosStore.setState({ currentTable: data });
        await loadCurrentOrderFromSupabase(data as Table);
      }
    }
  }, [currentTable?.id, fetchItemPortions, fetchItemsAndCategories, fetchRecipes, fetchZones, isSupabaseConfigured, loadCurrentOrderFromSupabase]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshRealtimePosData();
      }, 250);
    };

    const channel = supabase
      .channel('pos-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_portions' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [isSupabaseConfigured, refreshRealtimePosData]);

  const displayCategories = categories.length > 0 ? categories : (isSupabaseConfigured ? [] : MOCK_CATEGORIES);

  // Combine items and recipes for display (same logic as Items & Categories)
  // Filter items: only show items from 'items' table (has category_id)
  const menuItems = items.length > 0 
    ? items
        .filter(item => 
          item.category_id !== undefined && 
          item.category_id !== null
        )
        .map(item => ({ ...item, uniqueKey: `item-${item.id}` }))
    : (isSupabaseConfigured ? [] : MOCK_ITEMS.map(item => ({ ...item, uniqueKey: `mock-${item.id}` })));
  
  const recipeItems = recipes.length > 0 ? recipes.map(recipe => ({
    ...recipe,
    is_recipe: true, // Mark recipes as is_recipe = true for display logic
    uniqueKey: `recipe-${recipe.id}`
  })) : [];

  const displayItems = [...menuItems, ...recipeItems];

  // Remove duplicates by uniqueKey to prevent React key warnings
  const uniqueDisplayItems = displayItems.reduce((acc, current) => {
    const key = (current as any).uniqueKey;
    const exists = acc.find(item => (item as any).uniqueKey === key);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, [] as typeof displayItems);

  // Debug: Check for duplicate uniqueKeys
  if (process.env.NODE_ENV === 'development') {
    const uniqueKeys = displayItems.map(item => (item as any).uniqueKey);
    const duplicates = uniqueKeys.filter((key, index) => uniqueKeys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      console.warn('[POS] Duplicate uniqueKeys found:', duplicates);
      console.warn('[POS] menuItems count:', menuItems.length);
      console.warn('[POS] recipeItems count:', recipeItems.length);
      console.warn('[POS] After deduplication:', uniqueDisplayItems.length);
    }
  }

  const filteredItems = uniqueDisplayItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category_id === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart
    .filter(item => !item.cancelled)
    .reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
  const rawDiscountValue = Math.max(0, parseFloat(discount) || 0);
  const discountAmount = Math.min(
    cartTotal,
    discountType === 'percent'
      ? cartTotal * (Math.min(rawDiscountValue, 100) / 100)
      : rawDiscountValue
  );
  const discountedSubtotal = Math.max(0, cartTotal - discountAmount);
  const taxRateDecimal = (generalSettings.taxRate || 0) / 100;
  const tax = discountedSubtotal * taxRateDecimal;
  const tipAmount = parseFloat(tip) || 0;
  const total = discountedSubtotal + tax + tipAmount;
  const transferBanks = (bankConfigs || []).filter((b) => b.enabledForTransfer);
  const [selectedTransferBankId, setSelectedTransferBankId] = useState<string>('');

  useEffect(() => {
    if (transferBanks.length === 0) {
      setSelectedTransferBankId('');
      return;
    }
    if (!transferBanks.some((b) => b.id === selectedTransferBankId)) {
      setSelectedTransferBankId(transferBanks[0].id);
    }
  }, [transferBanks, selectedTransferBankId]);

  const handleNumpadClick = (value: string) => {
    if (value === 'C') {
      setCashTendered('');
    } else if (value === 'backspace') {
      setCashTendered(prev => prev.slice(0, -1));
    } else if (value === '.') {
      if (!cashTendered.includes('.')) {
        setCashTendered(prev => prev + value);
      }
    } else {
      // Prevent multiple leading zeros
      if (cashTendered === '0' && value === '0') return;
      // Limit decimal places to 2
      if (cashTendered.includes('.') && cashTendered.split('.')[1].length >= 2) return;

      setCashTendered(prev => prev + value);
    }
  };

  const handleCashTenderedInput = (value: string) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    const integerPart = parts[0] || '';
    const decimalPart = parts[1] ?? '';
    const next = decimalPart.length > 0
      ? `${integerPart}.${decimalPart.slice(0, 2)}`
      : integerPart;
    setCashTendered(next);
  };

  const formattedCashTenderedInput = (() => {
    if (isCashInputFocused) return cashTendered;
    const num = parseFloat(cashTendered || '0');
    if (!Number.isFinite(num) || num <= 0) return '';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  })();

  const handleQuickAmount = (amount: number | 'exact') => {
    if (amount === 'exact') {
      setCashTendered(total.toFixed(2));
    } else {
      setCashTendered(amount.toString());
    }
  };

  // Helper function to print with iframe (fallback)
  const printWithIframe = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();
      
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  // Function to print text directly to ESC/POS printer
  const printTextToPrinter = async (content: any, printerIp: string, paperWidth: string) => {
    try {
      const response = await fetch('/api/print-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerIp: printerIp,
          content: content,
          paperWidth: paperWidth
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        console.error('Print failed:', result.error);
        throw new Error(result.error);
      }

      return true;
    } catch (error) {
      console.error('Error printing text:', error);
      throw error;
    }
  };

  // Function to convert HTML to image and send to printer
  const printHTMLAsImage = async (html: string, printerIp: string, paperWidth: string, beep: boolean = false) => {
    try {
      const { canUseOfflineNetworkPrint } = getPrintRuntime();
      const isLocalIP = printerIp.startsWith('192.168.') || printerIp.startsWith('10.') || printerIp.startsWith('172.');
      
      if (!canUseOfflineNetworkPrint && isLocalIP) {
        console.warn('[PRINT] Online runtime detected. Using browser print fallback instead of LAN API printing.');
        printWithIframe(html);
        return true;
      }
      
      console.log('[PRINT] Offline/local runtime detected. Printing via local API route to:', printerIp);
      
      // Create a temporary container for the HTML
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.backgroundColor = '#ffffff';
      container.style.color = '#000000';
      container.innerHTML = html;
      document.body.appendChild(container);

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the actual rendered size
      const width = paperWidth === '80mm' ? 576 : 384;

      // Convert HTML to canvas with optimized settings
      const canvas = await html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 1, // Keep at 1 to avoid duplicate characters
        logging: false,
        width: width,
        height: container.offsetHeight,
        windowWidth: width,
        windowHeight: container.offsetHeight,
        useCORS: false,
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 0,
        removeContainer: true,
      });

      // Remove temporary container
      document.body.removeChild(container);

      // Convert canvas to base64 image
      const imageData = canvas.toDataURL('image/png', 1.0);

      console.log('[PRINT] Sending print request to API...');

      // Send image to printer via API
      const response = await fetch('/api/print-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerIp: printerIp,
          imageData: imageData,
          paperWidth: paperWidth,
          beep: beep
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        console.error('Print failed:', result.error);
        throw new Error(result.error);
      }

      return true;
    } catch (error) {
      console.error('Error printing HTML as image:', error);
      throw error;
    }
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    
    // Track items sent to kitchen with their times (only for items not already sent)
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Filter only active items that have not been sent yet.
    const itemsToSend = cart.filter(item => !item.sentToKitchen && !item.cancelled);
    
    if (itemsToSend.length === 0) {
      alert('All items have already been sent to kitchen');
      return;
    }
    
    // Add to pending kitchen orders with items that were just sent
    const newOrder = {
      id: `kitchen-${Date.now()}`,
      items: itemsToSend.length,
      total: itemsToSend.reduce((sum, item) => sum + (item.item.price * item.quantity), 0),
      time: currentTime,
      cart: itemsToSend.map(item => ({ ...item, sentToKitchen: true }))
    };
    
    const sentCart = cart.map(item => {
      const clientLineId = item.clientLineId || createClientLineId();
      if (item.cancelled || item.sentToKitchen) return { ...item, clientLineId };
      return { ...item, clientLineId, sentToKitchen: true, sentToKitchenTime: currentTime };
    });
    
    try {
      await saveCurrentOrderToSupabase(sentCart);
      usePosStore.setState({ cart: sentCart });
      setPendingKitchenOrders(prev => [...prev, newOrder]);

      // Mark items as sent to kitchen (keep them in cart, don't clear)
      markCartItemsAsSent();

      // Show printing modal
      setIsPrinting(true);
      setPrintingMessage(t.printingKitchen || 'Printing kitchen tickets...');

      // Auto-print kitchen tickets based on station mapping
      await printKitchenTickets(itemsToSend);
      
      // Show success message
      alert(`Order sent to kitchen!\n\nItems: ${itemsToSend.length}\nTotal: ${formatCurrency(newOrder.total)}\n\nNote: ${note || 'None'}`);
    } catch (error: any) {
      console.error('[PRINT] Error printing kitchen tickets:', error);
      alert(`Failed to print kitchen tickets: ${error.message}`);
    } finally {
      setIsPrinting(false);
      setPrintingMessage('');
    }
  };

  // Function to print kitchen tickets based on station mapping
  const printKitchenTickets = async (itemsToSend: any[]) => {
    console.log('[PRINT] printKitchenTickets called with items:', itemsToSend.length);
    console.log('[PRINT] stationMappings:', stationMappings);
    console.log('[PRINT] printerConfigs:', printerConfigs);
    
    if (!stationMappings || stationMappings.length === 0) {
      console.error('[PRINT] No station mappings configured');
      throw new Error('No station mappings configured. Please configure in Settings → Station Mapping');
    }

    if (!printerConfigs || printerConfigs.length === 0) {
      console.error('[PRINT] No printers configured');
      throw new Error('No printers configured. Please configure in Settings → Config Printing');
    }

    // Group items by printer based on station mapping
    const itemsByPrinter: Record<string, any[]> = {};
    const unmappedItems: any[] = [];

    itemsToSend.forEach(cartItem => {
      const item = cartItem.item;
      console.log('[PRINT] Processing item:', item.name, 'category:', item.category_id);
      
      // Find matching station mapping
      const mapping = stationMappings.find(m => {
        if (m.categoryId !== item.category_id) return false;
        if (m.selectedItemId === '*' || m.selectedItemId === item.id) {
          return true;
        }
        return false;
      });

      if (mapping) {
        console.log('[PRINT] Found mapping for item:', item.name, 'printer:', mapping.printerId);
        const printerId = mapping.printerId;
        if (!itemsByPrinter[printerId]) {
          itemsByPrinter[printerId] = [];
        }
        itemsByPrinter[printerId].push(cartItem);
      } else {
        // Track unmapped items (but don't show alert)
        unmappedItems.push(cartItem);
        console.log(`[PRINT] Item "${item.name}" has no station mapping - not sent to kitchen`);
      }
    });

    console.log('[PRINT] Items grouped by printer:', itemsByPrinter);
    console.log('[PRINT] Unmapped items:', unmappedItems.length);

    // Print ticket for each printer (sequentially with await)
    const printerIds = Object.keys(itemsByPrinter);
    
    for (const printerId of printerIds) {
      const items = itemsByPrinter[printerId];
      console.log('[PRINT] Processing printer:', printerId, 'with items:', items.length);
      
      const printer = printerConfigs.find(p => p.id === printerId);
      if (!printer) {
        console.error('[PRINT] Printer not found:', printerId);
        continue;
      }
      
      if (!printer.enabled) {
        console.warn('[PRINT] Printer disabled:', printer.name);
        continue;
      }

      console.log('[PRINT] Printing to:', printer.name, 'IP:', printer.ipAddress);
      
      // Update printing message
      setPrintingMessage(`${t.printingTo || 'Printing to'} ${printer.name}...`);

      // Create kitchen ticket HTML for printing
      const ticketHTML = createKitchenTicketHTML(items, printer);
      
      try {
        if (printer.ipAddress !== 'System-Driver') {
          // Print HTML as image via network printer
          await printHTMLAsImage(
            ticketHTML, 
            printer.ipAddress, 
            receiptSettings.kitchenBillSize || '80mm',
            true // Trigger beep
          );
          console.log('[PRINT] Successfully printed to network printer:', printer.name);
        } else {
          // System-Driver: Silent print without opening new window
          console.log('[PRINT] Using System-Driver (Silent Print)');
          
          // Create hidden iframe for silent printing
          const iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.right = '0';
          iframe.style.bottom = '0';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = '0';
          iframe.style.visibility = 'hidden';
          document.body.appendChild(iframe);
          
          const doc = iframe.contentWindow?.document;
          if (doc) {
            doc.open();
            doc.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  @media print {
                    @page {
                      size: ${receiptSettings.kitchenBillSize || '80mm'} auto;
                      margin: 0;
                    }
                    body {
                      margin: 0;
                      padding: 0;
                    }
                  }
                  body {
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    padding: 0;
                  }
                </style>
              </head>
              <body>
                ${ticketHTML}
              </body>
              </html>
            `);
            doc.close();
            
            // Trigger print silently
            setTimeout(() => {
              try {
                iframe.contentWindow?.print();
              } catch (err) {
                console.error('[PRINT] Silent print failed:', err);
              }
              // Remove iframe after printing
              setTimeout(() => {
                document.body.removeChild(iframe);
              }, 1000);
            }, 500);
            
            console.log('[PRINT] Silent print triggered for:', printer.name);
          }
        }
      } catch (err: any) {
        console.error('[PRINT] Failed to print:', err);
        throw new Error(`Failed to print to ${printer.name}: ${err.message}`);
      }
    }
  };

  // Function to create kitchen ticket content for text printing
  const createKitchenTicketContent = (items: any[], printer: any) => {
    const currentTime = new Date().toLocaleString();
    const tableInfo = currentTable 
      ? `Table ${currentTable.table_number}` 
      : t.takeout;

    const paperSize = receiptSettings.kitchenBillSize || '80mm';
    const separator = paperSize === '80mm' 
      ? '================================================' 
      : '================================';

    return {
      title: '*** Kitchen ***',
      separator: separator,
      tableInfo: tableInfo,
      time: currentTime,
      items: items.map(cartItem => ({
        name: `${cartItem.quantity}x  ${cartItem.item.name}`,
        portion: cartItem.portionName || null,
        notes: cartItem.notes || null
      })),
      note: note ? `Note: ${note}` : null,
      message: null,
      sectionHeader: null
    };
  };

  // Function to create kitchen ticket HTML for network printing
  const createKitchenTicketHTML = (items: any[], printer: any) => {
    const currentTime = new Date().toLocaleString();
    const tableInfo = currentTable 
      ? `${t.table} ${currentTable.table_number}` 
      : t.takeout;

    const paperSize = receiptSettings.kitchenBillSize || '80mm';
    const paperWidth = paperSize === '80mm' ? '80mm' : '58mm';
    
    // Simple template matching Settings preview
    const separator = paperSize === '80mm' 
      ? '================================================' 
      : '================================';

    // Get kitchen title based on language
    const kitchenTitle = currentLanguage === 'th' ? 'ครัว' : 
                        currentLanguage === 'lo' ? 'ຫ້ອງຄົວ' : 
                        'KITCHEN';

    const html = `<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  font-family: 'Noto Sans Lao', 'Courier New', monospace; 
  padding: 10px; 
  width: ${paperWidth}; 
  background: white; 
  color: black;
  font-size: 14px;
  line-height: 1.4;
}
.title { 
  font-size: 16px; 
  font-weight: bold;
  text-align: center; 
  margin: 5px 0;
}
.separator { 
  border-top: 1px dashed #000;
  margin: 5px 0;
}
.info { 
  font-size: 14px; 
  font-weight: 600;
  margin: 3px 0;
}
.item { 
  font-size: 14px; 
  margin: 3px 0;
  word-wrap: break-word;
}
.portion { 
  font-size: 12px; 
  margin: 2px 0 2px 20px;
  word-wrap: break-word;
}
.item-note { 
  font-size: 12px; 
  margin: 2px 0 2px 20px;
  word-wrap: break-word;
  font-style: italic;
  color: #555;
}
.order-note { 
  font-size: 14px; 
  margin: 5px 0;
  word-wrap: break-word;
}
</style>
</head>
<body>
<div class="title">*** ${kitchenTitle} ***</div>
<div class="separator"></div>
<div class="info">${tableInfo}</div>
<div class="info">${currentTime}</div>
<div class="separator"></div>
${items.map(cartItem => `<div class="item">${cartItem.quantity}x  ${cartItem.item.name}</div>${cartItem.portionName ? `<div class="portion">${cartItem.portionName}</div>` : ''}${cartItem.notes ? `<div class="item-note">${cartItem.notes}</div>` : ''}`).join('')}
<div class="separator"></div>
${note ? `<div class="order-note">${t.note}: ${note}</div><div class="separator"></div>` : ''}
</body>
</html>`;

    return html;
  };


  // Function to create kitchen ticket HTML (kept for reference/fallback)
  const createKitchenTicketHtml = (items: any[], printer: any) => {
    const currentTime = new Date().toLocaleString();
    const tableInfo = currentTable 
      ? `${t.table} ${currentTable.table_number}` 
      : t.takeout;

    const ticketHtml = `
      <html>
        <head>
          <title>Kitchen Order - ${printer.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;700&display=swap');
            body { 
              font-family: 'Noto Sans Lao', sans-serif; 
              padding: 20px; 
              max-width: 360px; 
              margin: 0 auto; 
              color: #000; 
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #000; 
              padding-bottom: 10px; 
              margin-bottom: 15px; 
            }
            .station { 
              font-size: 24px; 
              font-weight: bold; 
              text-transform: uppercase; 
            }
            .table-info { 
              font-size: 20px; 
              font-weight: bold; 
              margin: 10px 0; 
            }
            .time { 
              font-size: 14px; 
              color: #666; 
            }
            .items { 
              margin: 20px 0; 
            }
            .item { 
              border-bottom: 1px dashed #ccc; 
              padding: 10px 0; 
            }
            .item-name { 
              font-size: 18px; 
              font-weight: bold; 
            }
            .item-qty { 
              font-size: 24px; 
              font-weight: bold; 
              float: right; 
            }
            .item-notes { 
              font-size: 14px; 
              color: #666; 
              font-style: italic; 
              margin-top: 5px; 
            }
            .footer { 
              text-align: center; 
              border-top: 2px solid #000; 
              padding-top: 10px; 
              margin-top: 20px; 
              font-size: 12px; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="station">${printer.location || printer.name}</div>
            <div class="table-info">${tableInfo}</div>
            <div class="time">${currentTime}</div>
          </div>
          
          <div class="items">
            ${items.map(cartItem => `
              <div class="item">
                <div>
                  <span class="item-qty">${cartItem.quantity}x</span>
                  <span class="item-name">${cartItem.item.name}</span>
                </div>
                ${cartItem.portionName ? `<div class="item-notes">Size: ${cartItem.portionName}</div>` : ''}
                ${cartItem.notes ? `<div class="item-notes">Note: ${cartItem.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>
          
          ${note ? `
            <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0;">
              <strong>Order Note:</strong> ${note}
            </div>
          ` : ''}
          
          <div class="footer">
            ${generalSettings.storeName || 'Restaurant'}
          </div>
          
          <script>
            window.onload = function() { 
              ${silentPrint ? 'window.print(); setTimeout(function() { window.close(); }, 500);' : 'window.print();'}
            }
          </script>
        </body>
      </html>
    `;

    return ticketHtml;
  };

  // Function to create cancel ticket HTML for network printing
  const createCancelTicketHTML = (cancelledItem: any, printer: any) => {
    const currentTime = new Date().toLocaleString();
    const tableInfo = currentTable 
      ? `${t.table} ${currentTable.table_number}` 
      : t.takeout;

    const paperSize = receiptSettings.voidBillSize || '80mm';
    const paperWidth = paperSize === '80mm' ? '80mm' : '58mm';

    // Get cancel order text based on language
    const cancelTitle = currentLanguage === 'th' ? 'ยกเลิกรายการ' : 
                       currentLanguage === 'lo' ? 'ຍົກເລີກລາຍການ' : 
                       'CANCEL ORDER';
    
    const cancelledItemText = currentLanguage === 'th' ? 'รายการที่ยกเลิก:' : 
                             currentLanguage === 'lo' ? 'ລາຍການທີ່ຖືກຍົກເລີກ:' : 
                             'CANCELLED ITEM:';
    
    const discardMessage = currentLanguage === 'th' ? 'กรุณาทิ้งรายการนี้' : 
                          currentLanguage === 'lo' ? 'ກະລຸນາທິ້ງລາຍການນີ້' : 
                          'Please discard this item';

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  font-family: 'Noto Sans Lao', 'Courier New', monospace; 
  padding: 10px; 
  width: ${paperWidth}; 
  background: white; 
  color: black;
  font-size: 14px;
  line-height: 1.4;
}
.title { 
  font-size: 16px; 
  font-weight: bold;
  text-align: center; 
  margin: 5px 0;
}
.separator { 
  border-top: 1px dashed #000;
  margin: 5px 0;
}
.info { 
  font-size: 14px; 
  font-weight: 600;
  margin: 3px 0;
}
.header { 
  font-size: 14px; 
  font-weight: 600;
  margin: 5px 0;
}
.item { 
  font-size: 14px; 
  margin: 3px 0;
}
.portion { 
  font-size: 12px; 
  margin: 2px 0 2px 20px;
}
.item-note { 
  font-size: 12px; 
  margin: 2px 0 2px 20px;
  font-style: italic;
  color: #555;
}
.msg { 
  font-size: 14px; 
  margin: 5px 0;
}
</style>
</head>
<body>
<div class="title">*** ${cancelTitle} ***</div>
<div class="separator"></div>
<div class="info">${tableInfo}</div>
<div class="info">${currentTime}</div>
<div class="separator"></div>
<div class="header">${cancelledItemText}</div>
<div style="height: 5px;"></div>
<div class="item">${cancelledItem.quantity}x  ${cancelledItem.item.name}</div>
${cancelledItem.portionName ? `<div class="portion">${cancelledItem.portionName}</div>` : ''}
${cancelledItem.notes ? `<div class="item-note">${cancelledItem.notes}</div>` : ''}
<div class="separator"></div>
<div class="msg">${discardMessage}</div>
<div class="separator"></div>
</body>
</html>`;

    return html;
  };


  // Function to create cancel ticket HTML (kept for reference/fallback)
  const createCancelTicketHtml = (cancelledItem: any, printer: any) => {
    const currentTime = new Date().toLocaleString();
    const tableInfo = currentTable 
      ? `${t.table} ${currentTable.table_number}` 
      : t.takeout;

    const ticketHtml = `
      <html>
        <head>
          <title>CANCEL ORDER - ${printer.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;700&display=swap');
            body { 
              font-family: 'Noto Sans Lao', sans-serif; 
              padding: 20px; 
              max-width: 360px; 
              margin: 0 auto; 
              color: #000; 
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #dc2626; 
              padding-bottom: 10px; 
              margin-bottom: 15px; 
              background: #fef2f2;
              padding: 15px;
              border-radius: 5px;
            }
            .cancel-badge {
              font-size: 28px; 
              font-weight: bold; 
              text-transform: uppercase; 
              color: #dc2626;
              margin-bottom: 10px;
            }
            .station { 
              font-size: 20px; 
              font-weight: bold; 
              text-transform: uppercase; 
            }
            .table-info { 
              font-size: 18px; 
              font-weight: bold; 
              margin: 10px 0; 
            }
            .time { 
              font-size: 14px; 
              color: #666; 
            }
            .items { 
              margin: 20px 0; 
              background: #fef2f2;
              padding: 15px;
              border: 2px solid #dc2626;
              border-radius: 5px;
            }
            .item { 
              padding: 10px 0; 
            }
            .item-name { 
              font-size: 20px; 
              font-weight: bold; 
              color: #dc2626;
              text-decoration: line-through;
            }
            .item-qty { 
              font-size: 28px; 
              font-weight: bold; 
              float: right; 
              color: #dc2626;
            }
            .item-notes { 
              font-size: 14px; 
              color: #991b1b; 
              font-style: italic; 
              margin-top: 5px; 
            }
            .footer { 
              text-align: center; 
              border-top: 2px solid #dc2626; 
              padding-top: 10px; 
              margin-top: 20px; 
              font-size: 12px; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="cancel-badge">❌ CANCEL ORDER ❌</div>
            <div class="station">${printer.location || printer.name}</div>
            <div class="table-info">${tableInfo}</div>
            <div class="time">${currentTime}</div>
          </div>
          
          <div class="items">
            <div class="item">
              <div>
                <span class="item-qty">${cancelledItem.quantity}x</span>
                <span class="item-name">${cancelledItem.item.name}</span>
              </div>
              ${cancelledItem.portionName ? `<div class="item-notes">Size: ${cancelledItem.portionName}</div>` : ''}
              ${cancelledItem.notes ? `<div class="item-notes">Note: ${cancelledItem.notes}</div>` : ''}
            </div>
          </div>
          
          <div style="background: #fee2e2; padding: 15px; border-radius: 5px; margin: 10px 0; border: 2px solid #dc2626; text-align: center;">
            <strong style="color: #dc2626; font-size: 18px;">⚠️ CANCELLED - DO NOT PREPARE ⚠️</strong>
          </div>
          
          <div class="footer">
            ${generalSettings.storeName || 'Restaurant'}
          </div>
          
          <script>
            window.onload = function() { 
              ${silentPrint ? 'window.print(); setTimeout(function() { window.close(); }, 500);' : 'window.print();'}
            }
          </script>
        </body>
      </html>
    `;

    return ticketHtml;
  };

  // Function to print cancel ticket
  const printCancelTicket = (cancelledItem: any) => {
    if (!stationMappings || stationMappings.length === 0) {
      console.log('No station mappings configured - cancel ticket not printed');
      return;
    }

    if (!printerConfigs || printerConfigs.length === 0) {
      console.log('No printers configured - cancel ticket not printed');
      return;
    }

    const item = cancelledItem.item;
    
    // Find matching station mapping
    const mapping = stationMappings.find(m => {
      if (m.categoryId !== item.category_id) return false;
      if (m.selectedItemId === '*' || m.selectedItemId === item.id) {
        return true;
      }
      return false;
    });

    // If no mapping found, don't print cancel ticket
    if (!mapping) {
      console.log(`No mapping found for item "${item.name}" - cancel ticket not printed`);
      return;
    }

    const printer = printerConfigs.find(p => p.id === mapping.printerId);

    if (!printer || !printer.enabled) {
      console.log(`Printer not found or disabled - cancel ticket not printed`);
      return;
    }

    // Create cancel ticket HTML for printing
    const ticketHTML = createCancelTicketHTML(cancelledItem, printer);
    
    if (printer.ipAddress !== 'System-Driver') {
      // Print HTML as image via network printer
      printHTMLAsImage(
        ticketHTML, 
        printer.ipAddress, 
        receiptSettings.voidBillSize || '80mm',
        true // Trigger beep
      ).catch(err => {
        console.error('Failed to print cancel ticket:', err);
        alert(`Failed to print cancel ticket to ${printer.name}: ${err.message}`);
      });
    } else {
      // System-Driver: Silent print without opening new window
      console.log('[PRINT] Using System-Driver for cancel ticket (Silent Print)');
      
      // Create hidden iframe for silent printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @media print {
                @page {
                  size: ${receiptSettings.voidBillSize || '80mm'} auto;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
              body {
                font-family: 'Courier New', monospace;
                margin: 0;
                padding: 0;
              }
            </style>
          </head>
          <body>
            ${ticketHTML}
          </body>
          </html>
        `);
        doc.close();
        
        // Trigger print silently
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch (err) {
            console.error('[PRINT] Silent print failed for cancel ticket:', err);
          }
          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
        
        console.log('[PRINT] Silent print triggered for cancel ticket:', printer.name);
      }
    }
  };

  // Function to create cancel ticket content for text printing
  const createCancelTicketContent = (cancelledItem: any, printer: any) => {
    const currentTime = new Date().toLocaleString();
    const tableInfo = currentTable 
      ? `Table ${currentTable.table_number}` 
      : t.takeout;

    const paperSize = receiptSettings.voidBillSize || '80mm';
    const separator = paperSize === '80mm' 
      ? '================================================' 
      : '================================';

    return {
      title: '*** CANCEL ORDER ***',
      separator: separator,
      tableInfo: tableInfo,
      time: currentTime,
      sectionHeader: 'CANCELLED ITEM:',
      items: [{
        name: `${cancelledItem.quantity}x  ${cancelledItem.item.name}`,
        portion: cancelledItem.portionName || null,
        notes: cancelledItem.notes || null
      }],
      message: 'Please discard this item',
      note: null
    };
  };

  // Wrapper function for cancel with auto-print
  const handleCancelCartItem = (index: number) => {
    const itemToCancel = cart[index];
    const cancelledAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Only print cancel ticket if item was already sent to kitchen
    if (itemToCancel && itemToCancel.sentToKitchen) {
      printCancelTicket(itemToCancel);
    }
    
    // Call the original cancel function
    cancelCartItemByIndex(index);
    if (itemToCancel) {
      void syncCancelledCartItemToSupabase({ ...itemToCancel, cancelledAt });
    }
  };

  const getPrintRuntime = () => {
    if (typeof window === 'undefined') {
      return { isElectron: false, isLocalRuntime: false, canUseOfflineNetworkPrint: false };
    }

    const hostname = window.location.hostname;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isElectron = userAgent.includes('electron');
    const isLocalRuntime =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.');

    return {
      isElectron,
      isLocalRuntime,
      canUseOfflineNetworkPrint: isElectron || isLocalRuntime
    };
  };

  const syncCancelledCartItemToSupabase = async (cartItem: any) => {
    if (!isSupabaseConfigured || !currentTable) return;

    const orderId = await resolveCurrentOrderId(currentTable);
    if (!orderId) return;

    const cancelNotes = [
      cartItem.clientLineId ? `Line: ${cartItem.clientLineId}` : undefined,
      `Item: ${cartItem.item.name}`,
      cartItem.notes,
      cartItem.portionName ? `Portion: ${cartItem.portionName}` : undefined,
      cartItem.cancelledAt ? `CancelledAt: ${cartItem.cancelledAt}` : undefined,
      'Kitchen: cancelled'
    ].filter(Boolean).join(' | ');

    const baseUpdate = supabase
      .from('order_items')
      .update({ notes: cancelNotes })
      .eq('order_id', orderId);

    let updateResult;
    if (cartItem.orderItemId) {
      updateResult = await baseUpdate.eq('id', cartItem.orderItemId);
    } else if (cartItem.clientLineId) {
      updateResult = await baseUpdate.ilike('notes', `%Line: ${cartItem.clientLineId}%`);
    } else {
      console.warn('Skipped remote cancel sync because this duplicate cart line has no unique id.');
      return;
    }

    if (updateResult.error && !isMissingColumnInSchemaCache(updateResult.error, 'order_items', 'notes')) {
      console.error('Failed to sync cancelled cart item:', updateResult.error);
    }
  };

  const handleMarkKitchenOrderComplete = (orderId: string) => {
    const orderToComplete = pendingKitchenOrders.find(order => order.id === orderId);
    if (orderToComplete) {
      // Check if there's already a held order (from previous orders)
      const existingHeldOrder = heldOrders.length > 0 ? heldOrders[heldOrders.length - 1] : null;
      
      if (existingHeldOrder) {
        // Merge with existing held order
        const mergedCart = [...existingHeldOrder.cart];
        
        // For each item in the completed order
        orderToComplete.cart.forEach(newItem => {
          // Find if the same item exists in held order
          const existingItemIndex = mergedCart.findIndex(
            item => (item.sourceItemId || item.item.id) === (newItem.sourceItemId || newItem.item.id) &&
                    item.portionId === newItem.portionId
          );
          
          if (existingItemIndex >= 0) {
            // Same item exists - increase quantity
            mergedCart[existingItemIndex] = {
              ...mergedCart[existingItemIndex],
              quantity: mergedCart[existingItemIndex].quantity + newItem.quantity,
              sentToKitchen: true // Mark as sent to kitchen
            };
          } else {
            // New item - add to cart with sentToKitchen flag
            mergedCart.push({
              ...newItem,
              sentToKitchen: true
            });
          }
        });
        
        // Update the existing held order
        const updatedHeldOrders = heldOrders.map((order, index) => 
          index === heldOrders.length - 1 
            ? { ...order, cart: mergedCart, date: new Date().toISOString() }
            : order
        );
        setHeldOrders(updatedHeldOrders);
      } else {
        // No existing held order - create new one
        const newHeldOrder = {
          id: `held-${Date.now()}`,
          cart: orderToComplete.cart.map(item => ({
            ...item,
            sentToKitchen: true // Mark as sent to kitchen
          })),
          date: new Date().toISOString(),
          note: note // Use current note if any
        };
        setHeldOrders([...heldOrders, newHeldOrder]);
      }
      
      // Remove from pending kitchen orders
      setPendingKitchenOrders(prev => prev.filter(order => order.id !== orderId));
      
      alert('Order completed and merged with held order!');
    }
  };

  // Table selection handlers
  const handleTableSelect = (table: Table | null, orderType: 'dine-in' | 'takeout') => {
    setCurrentTable(table, orderType);
    setMobilePosView('menu');
    setShowTableSelection(false);
    if (table?.current_order_id) {
      setTimeout(() => {
        loadCurrentOrderFromSupabase(table);
      }, 0);
    }
  };

  const handleBackToTableSelection = () => {
    clearCurrentTable();
    setMobilePosView('menu');
    setShowTableSelection(true);
  };

  const closeCurrentPendingOrder = useCallback(async (table: Table | null = currentTable) => {
    if (!isSupabaseConfigured || !table?.id) return;

    const orderId = await resolveCurrentOrderId(table, { allowTableFallback: true });
    if (!orderId) return;

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .eq('status', 'pending');

    if (error) {
      console.error('Failed to close pending table order:', error);
    }
  }, [currentTable, isSupabaseConfigured, resolveCurrentOrderId]);

  const cartItemCount = cart.reduce((sum, cartItem) => sum + cartItem.quantity, 0);

  const saveCurrentOrderToSupabase = async (sentCart: any[]) => {
    if (!isSupabaseConfigured || !currentTable || currentOrderType !== 'dine-in' || sentCart.length === 0) return;

    let orderId = currentTable.current_order_id || await resolveCurrentOrderId(currentTable, { allowTableFallback: true });
    const totalAmount = sentCart
      .filter(item => !item.cancelled)
      .reduce((sum, item) => sum + (item.item.price * item.quantity), 0);

    if (!orderId) {
      const orderInsertPayload: Record<string, any> = {
        total_amount: totalAmount,
        status: 'pending',
        payment_method: 'cash',
        table_id: currentTable.id,
        zone_id: currentTable.zone_id || null,
        order_type: 'dine-in'
      };
      if (note) orderInsertPayload.notes = note;

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

      const { data: order, error } = orderInsertResult;
      if (error) throw new Error(error.message || 'Failed to create kitchen order');
      orderId = order?.id || null;

      if (orderId) {
        await supabase
          .from('tables')
          .update({ status: 'occupied', current_order_id: orderId })
          .eq('id', currentTable.id);

        usePosStore.setState({
          currentTable: {
            ...currentTable,
            status: 'occupied',
            current_order_id: orderId
          }
        });
      }
    } else {
      const orderUpdatePayload: Record<string, any> = {
        total_amount: totalAmount,
        status: 'pending'
      };
      if (note) orderUpdatePayload.notes = note;

      let orderUpdateResult = await supabase
        .from('orders')
        .update(orderUpdatePayload)
        .eq('id', orderId);

      if (orderUpdateResult.error && orderUpdatePayload.notes !== undefined && isMissingColumnInSchemaCache(orderUpdateResult.error, 'orders', 'notes')) {
        delete orderUpdatePayload.notes;
        orderUpdateResult = await supabase
          .from('orders')
          .update(orderUpdatePayload)
          .eq('id', orderId);
      }

      if (orderUpdateResult.error) throw new Error(orderUpdateResult.error.message || 'Failed to update kitchen order');

      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
    }

    if (!orderId) return;

    const rows: Record<string, any>[] = sentCart.map((cartItem: any) => {
      const sourceId = cartItem.sourceItemId || cartItem.item.id;
      const sourceExistsInItems = items.some(item => item.id === sourceId);
      return {
        order_id: orderId,
        item_id: sourceExistsInItems ? sourceId : null,
        quantity: cartItem.quantity,
        price_at_time: cartItem.item.price,
        notes: [
          cartItem.clientLineId ? `Line: ${cartItem.clientLineId}` : undefined,
          `Item: ${cartItem.item.name}`,
          cartItem.notes,
          cartItem.portionName ? `Portion: ${cartItem.portionName}` : undefined,
          cartItem.cancelledAt ? `CancelledAt: ${cartItem.cancelledAt}` : undefined,
          cartItem.cancelled ? 'Kitchen: cancelled' : 'Kitchen: sent'
        ].filter(Boolean).join(' | ')
      };
    });

    let rowsToInsert = rows;
    let { error: insertError } = await supabase
      .from('order_items')
      .insert(rowsToInsert);

    if (insertError && isMissingColumnInSchemaCache(insertError, 'order_items', 'notes')) {
      rowsToInsert = rows.map(({ notes: _notes, ...rest }) => rest);
      const retryResult = await supabase
        .from('order_items')
        .insert(rowsToInsert);
      insertError = retryResult.error;
    }

    if (insertError) throw new Error(insertError.message || 'Failed to save kitchen order items');
  };

  const handleClearCart = () => {
    if (cart.length > 0) {
      if (confirm('Clear current cart?')) {
        clearCart();
        // Don't auto-show table selection, let user click "Select Table" button
      }
    } else {
      clearCart();
    }
  };

  const handleTransferTable = () => {
    // Show transfer table modal
    setShowTransferTableModal(true);
    fetchAvailableTables();
  };

  const getZoneName = (zoneId?: string) => {
    if (!zoneId) return '';
    const zone = zones.find(z => z.id === zoneId);
    return zone?.name || '';
  };

  // Fetch available tables for merge
  const fetchAvailableTables = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from('tables')
        .select('*')
        .neq('status', 'inactive')
        .order('table_number');
      if (data) setAvailableTables(data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  // Handle merge tables
  const handleMergeTables = async (targetTable: Table) => {
    if (!currentTable || !targetTable) return;
    
    if (currentTable.id === targetTable.id) {
      alert(t.cannotMergeSameTable);
      return;
    }

    try {
      // Get items from target table if it has any
      const { data: targetOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('table_id', targetTable.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      // Merge current cart with target table's items
      // For now, just move current cart to target table
      setCurrentTable(targetTable, 'dine-in');
      
      // Update table status and mark as merged
      await supabase
        .from('tables')
        .update({ 
          status: 'occupied',
          is_merged: true  // ทำเครื่องหมายว่าโต๊ะนี้ถูกรวมแล้ว
        })
        .eq('id', targetTable.id);

      // Release current table
      await supabase
        .from('tables')
        .update({ status: 'available', current_order_id: null })
        .eq('id', currentTable.id);

      setShowMergeTableModal(false);
      alert(t.mergeSuccess);
    } catch (error) {
      console.error('Error merging tables:', error);
      alert('Failed to merge tables');
    }
  };

  // Handle transfer table - move all items to another table
  const handleTransferToTable = async (targetTable: Table) => {
    if (!currentTable || !targetTable) return;
    
    if (currentTable.id === targetTable.id) {
      alert(t.cannotTransferSameTable || 'Cannot transfer to the same table');
      return;
    }

    if (cart.length === 0) {
      alert('No items to transfer');
      return;
    }

    try {
      // Save current cart items before switching
      const itemsToTransfer = [...cart];
      const oldTableId = currentTable.id;
      
      // Release current table first
      await supabase
        .from('tables')
        .update({ status: 'available', current_order_id: null })
        .eq('id', oldTableId);
      
      // Clear saved cart for old table (so it won't be restored)
      const oldTableKey = `table-${oldTableId}`;
      const { savedCarts } = usePosStore.getState();
      const newSavedCarts = { ...savedCarts };
      delete newSavedCarts[oldTableKey];
      
      // Set the new saved cart for target table with transferred items
      const targetTableKey = `table-${targetTable.id}`;
      newSavedCarts[targetTableKey] = itemsToTransfer;
      
      // Update savedCarts in store
      usePosStore.setState({ savedCarts: newSavedCarts });
      
      // Move to target table (this will load the cart we just saved)
      setCurrentTable(targetTable, 'dine-in');
      
      // Update target table status to occupied
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', targetTable.id);

      setShowTransferTableModal(false);
      alert(t.transferSuccess || 'Table transferred successfully!');
    } catch (error) {
      console.error('Error transferring table:', error);
      alert('Failed to transfer table');
    }
  };

  // Handle split table
  const handleSplitTable = async (targetTable: Table) => {
    if (!currentTable || selectedItemsToSplit.size === 0) {
      alert(t.noItemsSelected);
      return;
    }

    try {
      // Get items to move
      const itemsToMove = cart.filter(item => {
        const itemKey = `${item.item.id}-${item.portionId || 'no-portion'}`;
        return selectedItemsToSplit.has(itemKey);
      });

      // Keep remaining items in current table
      const remainingItems = cart.filter(item => {
        const itemKey = `${item.item.id}-${item.portionId || 'no-portion'}`;
        return !selectedItemsToSplit.has(itemKey);
      });

      // Clear cart and add back remaining items
      await clearCart();
      remainingItems.forEach(item => {
        addToCart(item.item, {
          sourceItemId: item.sourceItemId,
          portionName: item.portionName,
          portionId: item.portionId,
          quantity: item.quantity
        });
      });

      // Update target table status
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', targetTable.id);

      // If current table has no items left, release it and reset is_merged
      if (remainingItems.length === 0) {
        await supabase
          .from('tables')
          .update({ 
            status: 'available', 
            current_order_id: null,
            is_merged: false  // รีเซ็ตสถานะรวมโต๊ะ
          })
          .eq('id', currentTable.id);
        clearCurrentTable();
      } else {
        // ถ้ายังมีเมนูเหลืออยู่ ให้รีเซ็ตสถานะรวมโต๊ะ
        await supabase
          .from('tables')
          .update({ is_merged: false })
          .eq('id', currentTable.id);
      }

      setShowSplitTableModal(false);
      setSelectedItemsToSplit(new Set());
      alert(t.splitSuccess);
    } catch (error) {
      console.error('Error splitting table:', error);
      alert('Failed to split table');
    }
  };

  const handleCheckout = async () => {
    if (activeTab === 'cash') {
      const tendered = parseFloat(cashTendered || '0');
      if (!Number.isFinite(tendered) || tendered < total) {
        alert('Cash tendered is less than total amount');
        return;
      }
    }

    setIsCheckingOut(true);
    const method = activeTab === 'transfer' ? 'transfer' : 'cash';
    const tenderedAmount = activeTab === 'cash' ? parseFloat(cashTendered || '0') : undefined;
    const selectedBank = activeTab === 'transfer'
      ? transferBanks.find((b) => b.id === selectedTransferBankId) || null
      : null;
    const tableBeingCheckedOut = currentTable;
    const success = await checkout(method, note, tenderedAmount, selectedBank, total);
    setIsCheckingOut(false);
    if (success) {
      await closeCurrentPendingOrder(tableBeingCheckedOut);
      // Table release is handled in the checkout function in store.ts
      // No need to duplicate it here
      
      // Clear table selection
      clearCurrentTable();
      
      const printerId = receiptSettings.receiptPrinter;
      let targetPrinter;
      if (printerId) {
        targetPrinter = printerConfigs.find((p: any) => p.id === printerId && p.enabled);
      } else {
        targetPrinter = printerConfigs.find((p: any) => p.isDefault && p.enabled);
      }
      
      const shouldAutoPrint = targetPrinter ? (targetPrinter.autoPrint ?? autoPrint) : autoPrint;

      if (shouldAutoPrint) {
        handlePrintBill();
      }
      setIsCheckoutModalOpen(false);
      setNote('');
      setTip('');
      setDiscount('');
      setDiscountType('fixed');
      setCashTendered('');
      
      // Don't auto-show table selection, let user click "Select Table" button when ready
      
      const successMessage = currentTable && currentOrderType === 'dine-in' 
        ? t.orderCompletedTableReleased 
        : 'Order completed successfully!';
      alert(successMessage);
    } else {
      alert(`Checkout failed. Order was not saved.${checkoutError ? `\nReason: ${checkoutError}` : ''}`);
    }
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    holdOrder(note);
    setNote('');
    setTip('');
    setDiscount('');
    setDiscountType('fixed');
    // alert('Order held successfully');
  };

  const handleResumeOrder = (orderId: string) => {
    const heldOrder = heldOrders.find(o => o.id === orderId);
    resumeOrder(orderId);
    if (heldOrder?.note) {
      setNote(heldOrder.note);
    }
    // No need to switch tabs anymore
  };

  const handlePrintBill = async () => {
    if (cart.length === 0) return;
    const paymentMethodLabel = activeTab === 'transfer' ? t.transfer : t.cash;
    const tendered = parseFloat(cashTendered || '0');
    const change = Math.max(0, tendered - total);
    const selectedTransferBank = transferBanks.find((b) => b.id === selectedTransferBankId);

    const cartItemsHtml = cart.map((cartItem: any) =>
      '<tr>' +
      '<td style="padding: 2px 0; text-align: left;">' + cartItem.item.name + '</td>' +
      '<td style="padding: 2px 0; text-align: right;">' + cartItem.quantity + '</td>' +
      '<td style="padding: 2px 0; text-align: right;">' + formatCurrency(cartItem.item.price) + '</td>' +
      '<td style="padding: 2px 0; text-align: right;">' + formatCurrency(cartItem.item.price * cartItem.quantity) + '</td>' +
      '</tr>'
    ).join('');

    const noteHtml = note ?
      '<div style="margin-top: 10px; border-top: 1px dotted #000; padding-top: 5px;">' +
      '<span class="font-bold">' + t.notes + ':</span><br>' +
      '<span>' + note + '</span>' +
      '</div>' : '';

    const tipHtml =
      '<div class="flex justify-between">' +
      '<span>' + t.tip + '</span>' +
      '<span>' + formatCurrency(tipAmount) + '</span>' +
      '</div>';
    const discountHtml = discountAmount > 0
      ? '<div class="flex justify-between" style="color:#dc2626;">' +
      '<span>' + t.discount + (discountType === 'percent' ? ' (' + Math.min(rawDiscountValue, 100) + '%)' : '') + '</span>' +
      '<span>-' + formatCurrency(discountAmount) + '</span>' +
      '</div>'
      : '';

    const paymentMethodHtml =
      '<div class="flex justify-between">' +
      '<span>' + t.paymentMethod + '</span>' +
      '<span>' + paymentMethodLabel + '</span>' +
      '</div>';
    const cashDetailsHtml = activeTab === 'cash'
      ? '<div class="flex justify-between">' +
      '<span>' + t.cashTendered + '</span>' +
      '<span>' + formatCurrency(Number.isFinite(tendered) ? tendered : 0) + '</span>' +
      '</div>' +
      '<div class="flex justify-between">' +
      '<span>' + t.change + '</span>' +
      '<span>' + formatCurrency(change) + '</span>' +
      '</div>'
      : '';
    
    // Get first enabled bank for QR code display (regardless of payment method)
    const bankForDisplay = selectedTransferBank || transferBanks.find(b => b.enabledForTransfer);
    
    const transferDetailsHtml = (receiptSettings.showBankDetail && bankForDisplay)
      ? '<div style="margin-top: 8px; border-top: 1px dotted #000; padding-top: 6px;">' +
      '<div class="font-bold" style="margin-bottom: 4px;">' + t.bankTransferDetails + '</div>' +
      '<div>' + t.bank + ': ' + (bankForDisplay?.bankName || '-') + '</div>' +
      '<div>' + t.accountName + ': ' + (bankForDisplay?.accountName || '-') + '</div>' +
      '<div>' + t.accountNumber + ': ' + (bankForDisplay?.accountNumber || '-') + '</div>' +
      '</div>'
      : '';
    const transferQrHtml = (receiptSettings.showBankDetail && bankForDisplay?.qrCodeImage)
      ? '<div style="text-align:center; margin-top: 12px; padding-top: 10px; border-top: 1px dotted #000;">' +
      '<div class="font-bold" style="font-size: 14px; margin-bottom: 8px;">' + t.scanToPay + '</div>' +
      '<div style="background: white; padding: 10px; display: inline-block; border: 2px solid #000;">' +
      '<img src="' + bankForDisplay.qrCodeImage + '" alt="Bank QR Code" style="width: 220px; height: 220px; object-fit: contain; display: block; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; image-rendering: pixelated;" />' +
      '</div>' +
      '</div>'
      : '';

    const receiptHtml =
      '<html>' +
      '<head>' +
      '<title>Bill Preview</title>' +
      '<meta charset="UTF-8">' +
      '<style>' +
      "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;700&display=swap');" +
      "* { font-family: 'Noto Sans Lao', sans-serif; }" +
      "body { font-family: 'Noto Sans Lao', sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; color: #000; }" +
      '.text-center { text-align: center; }' +
      '.mb-4 { margin-bottom: 1rem; }' +
      '.mt-6 { margin-top: 1.5rem; }' +
      '.text-xs { font-size: 12px; }' +
      '.text-sm { font-size: 14px; }' +
      '.font-bold { font-weight: bold; }' +
      '.flex { display: flex; justify-content: space-between; }' +
      '.border-y { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }' +
      '.space-y-1 > div { margin-bottom: 4px; }' +
      'table { width: 100%; border-collapse: collapse; font-family: \'Noto Sans Lao\', sans-serif; }' +
      'th, td { font-size: 12px; font-family: \'Noto Sans Lao\', sans-serif; }' +
      'h1, h2, h3, h4, h5, h6, p, div, span { font-family: \'Noto Sans Lao\', sans-serif; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<div class="text-center mb-4">' +
      '<h3 class="font-bold text-lg" style="margin:0 0 2px 0;">' + (generalSettings.storeName || '') + '</h3>' +
      (receiptSettings.storeAddress ? '<div class="text-xs" style="margin-bottom:2px;">' + receiptSettings.storeAddress + '</div>' : '') +
      (receiptSettings.phoneNumber ? '<div class="text-xs" style="margin-bottom:2px;">' + receiptSettings.phoneNumber + '</div>' : '') +
      (receiptSettings.headerText ? '<div class="text-xs mt-2">' + receiptSettings.headerText + '</div>' : '') +
      '</div>' +
      '<div class="text-xs mb-4">' +
      t.date + ': ' + new Date().toLocaleString() +
      (receiptSettings.showTableNumber !== false && currentTable ? '<br/>' + t.table + ': ' + currentTable.table_number : '') +
      '</div>' +
      '<div class="border-y text-xs">' +
      '<table>' +
      '<thead>' +
      '<tr>' +
      '<th style="text-align:left; padding-bottom: 4px;">' + t.item + '</th>' +
      '<th style="text-align:right; padding-bottom: 4px;">' + t.unit + '</th>' +
      '<th style="text-align:right; padding-bottom: 4px;">' + t.price + '</th>' +
      '<th style="text-align:right; padding-bottom: 4px;">' + t.total + '</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      cartItemsHtml +
      '</tbody>' +
      '</table>' +
      '</div>' +
      '<div class="space-y-1 text-xs mb-4">' +
      '<div class="flex justify-between">' +
      '<span>' + t.subtotal + '</span>' +
      '<span>' + formatCurrency(cartTotal) + '</span>' +
      '</div>' +
      discountHtml +
      '<div class="flex justify-between">' +
      `<span>${t.tax} (${generalSettings.taxRate}%)</span>` +
      '<span>' + formatCurrency(tax) + '</span>' +
      '</div>' +
      tipHtml +
      paymentMethodHtml +
      cashDetailsHtml +
      transferDetailsHtml +
      noteHtml +
      '</div>' +
      '<div style="text-align: center; margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;">' +
      '<div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 12px;">' +
      '<div style="font-weight: bold; font-size: 14px;">' + t.total.toUpperCase() + '</div>' +
      '<div style="font-weight: bold; font-size: 18px;">' + formatCurrency(total) + '</div>' +
      '</div>' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: center;">' +
      '<div>' +
      '<div style="font-size: 11px; color: #666;">THB</div>' +
      '<div style="font-weight: bold; font-size: 16px;">฿' + (total / (currencySettings.thbRate || 36.5)).toFixed(2) + '</div>' +
      '</div>' +
      '<div>' +
      '<div style="font-size: 11px; color: #666;">USD</div>' +
      '<div style="font-weight: bold; font-size: 16px;">$' + (total / currencySettings.currencyRate).toFixed(2) + '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      transferQrHtml +
      '<div class="text-center mt-6 text-xs">' +
      receiptSettings.footerText +
      '</div>' +
      '</body>' +
      '</html>';

    const printerId = receiptSettings.receiptPrinter;
    let targetPrinter = null;
    
    if (printerId) {
      targetPrinter = printerConfigs.find((p: any) => p.id === printerId && p.enabled);
    } else {
      targetPrinter = printerConfigs.find((p: any) => p.isDefault && p.enabled);
    }

    // Network printer
    if (targetPrinter && targetPrinter.ipAddress !== 'System-Driver') {
      setIsPrinting(true);
      setPrintingMessage(`Printing bill to ${targetPrinter.name}...`);
      printHTMLAsImage(receiptHtml, targetPrinter.ipAddress, receiptSettings.receiptSize || '80mm')
        .catch(err => {
          console.error('Failed to print bill via network:', err);
          alert(`Failed to print bill: ${err.message}`);
        })
        .finally(() => {
          setIsPrinting(false);
          setPrintingMessage('');
        });
      return;
    }

    // Check if running in Electron and silentPrint is enabled
    if (typeof window !== 'undefined' && (window as any).electronAPI && silentPrint) {
      try {
        const result = await (window as any).electronAPI.printSilent(receiptHtml, targetPrinter?.name || '');
        if (result.success) {
          console.log('Silent print successful');
          return;
        } else {
          console.error('Silent print failed:', result.error);
          // Fall back to browser print
        }
      } catch (error) {
        console.error('Electron print error:', error);
        // Fall back to browser print
      }
    }

    // System-Driver or no printer configured or Electron print failed - use browser print
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      
      // Wait for content to load before printing
      printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
        
        // Only close if silentPrint is enabled
        if (silentPrint) {
          setTimeout(() => {
            printWindow.close();
          }, 500);
        }
      };
    } else {
      console.error('Could not open print window. Check popup blocker.');
      alert('Could not open print window. Please allow popups for this site.');
    }
  };

  // ถ้ายังไม่ได้เลือกโต๊ะ/orderType ให้แสดงหน้าเลือกเต็มหน้าจอ
  if (!currentTable && !currentOrderType) {
    return (
      <TableSelection
        onSelectTable={handleTableSelect}
        onClose={() => {}} // ไม่ต้องใช้ onClose เพราะเป็นหน้าเต็ม
        canClose={false}
        onResumeOrder={handleResumeOrder}
      />
    );
  }

  return (
    <>
      {/* Table Selection as Full Page (when changing table) */}
      {showTableSelection && (
        <TableSelection
          onSelectTable={handleTableSelect}
          onClose={() => setShowTableSelection(false)}
          canClose={true}
          onResumeOrder={handleResumeOrder}
        />
      )}

      <div className="flex h-full">
        {/* Main POS Area */}
        <div className={`${mobilePosView === 'order' ? 'hidden lg:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
          {/* Table Info Bar */}
          {(currentTable || currentOrderType) && !showTableSelection && (
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-200 px-4 py-3">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                  {currentOrderType === 'takeout' ? (
                    <>
                      <div className="bg-blue-600 rounded-full p-2">
                        <ShoppingBag className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-blue-900 text-lg">{t.takeout}</div>
                        <div className="text-sm text-blue-600">{t.forPickup}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-blue-600 rounded-full p-2">
                        <Grid3x3 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-blue-900 text-lg">
                          {t.table} {currentTable?.table_number}
                        </div>
                        <div className="text-sm text-blue-600">
                          {currentTable?.capacity} {t.seats}
                          {getZoneName(currentTable?.zone_id) && ` • ${getZoneName(currentTable?.zone_id)}`}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* Back to Selection button - leftmost */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToTableSelection}
                    className="border-zinc-300 text-zinc-700 hover:bg-zinc-50 font-bold"
                  >
                    <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                    {t.backToSelection}
                  </Button>
                  {/* Desktop only - Merge and Transfer buttons */}
                  {currentOrderType === 'dine-in' && currentTable && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          fetchAvailableTables();
                          setShowMergeTableModal(true);
                        }}
                        className="hidden lg:flex border-green-300 text-green-700 hover:bg-green-50 font-medium"
                      >
                        {t.mergeTables}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTransferTable}
                        className="hidden lg:flex border-blue-300 text-blue-700 hover:bg-blue-50 font-medium"
                      >
                        {t.transferTable}
                      </Button>
                      {currentTable?.is_merged && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            fetchAvailableTables();
                            setShowSplitTableModal(true);
                          }}
                          className="hidden lg:flex border-orange-300 text-orange-700 hover:bg-orange-50 font-medium"
                        >
                          {t.splitTable}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Remove Tabs - just show menu directly */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    placeholder={t.searchItems}
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Button
                  variant={activeCategory === 'all' ? 'default' : 'outline'}
                  onClick={() => setActiveCategory('all')}
                  className="rounded-full"
                >
                  {t.allCategories}
                </Button>
                {displayCategories.map(category => (
                  <Button
                    key={category.id}
                    variant={activeCategory === category.id ? 'default' : 'outline'}
                    onClick={() => setActiveCategory(category.id)}
                    className="rounded-full whitespace-nowrap"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {filteredItems.map(item => {
                  // Classify item type based on 'type' field
                  const itemType = (item as any).type;
                  const isStandalone = itemType === 'standalone';
                  const isSaleOnly = itemType === 'saleonly'; // Sale Only items from items table with type='saleonly'
                  const isRecipe = item.is_recipe === true; // Recipes from items table with is_recipe=true
                  
                  // Calculate stock based on item type
                  let stock;
                  let linkedInventoryItem = null;
                  
                  if (isSaleOnly) {
                    // Sale Only items: if linked to inventory, use real stock; otherwise unlimited
                    const itemWithLink = item as any;
                    if (itemWithLink.inventory_item_id) {
                      const linkedInvItem = items.find(invItem => invItem.id === itemWithLink.inventory_item_id);
                      stock = (linkedInvItem as any)?.stock ?? 0;
                    } else {
                      stock = 999999; // Unlimited
                    }
                  } else if (isRecipe) {
                    // Recipe items: calculate from recipe stocks
                    const hasIngredients = recipeHasIngredients[item.id];
                    if (!hasIngredients) {
                      // Recipe without ingredients: if linked to inventory, use real stock; otherwise unlimited
                      const itemWithLink = item as any;
                      if (itemWithLink.inventory_item_id) {
                        const linkedInvItem = items.find(invItem => invItem.id === itemWithLink.inventory_item_id);
                        stock = (linkedInvItem as any)?.stock ?? 0;
                      } else {
                        stock = 999999; // Unlimited
                      }
                    } else {
                      stock = recipeStocks[item.id] || 0;
                    }
                  } else if (isStandalone) {
                    // Standalone items: Get stock from linked inventory item
                    const itemWithLink = item as any;
                    if (itemWithLink.inventory_item_id) {
                      const linkedInvItem = items.find(invItem => invItem.id === itemWithLink.inventory_item_id);
                      stock = (linkedInvItem as any)?.stock ?? 0;
                    } else {
                      stock = 0; // No link = no stock
                    }
                  } else {
                    // Items from inventory_items table have stock directly
                    stock = (item as any)?.stock ?? 0;
                  }

                  const itemPortions = portionsByProduct[item.id] || [];
                  const linkedInventoryItemId = (item as any).inventory_item_id;
                  const linkedInventoryPortions = linkedInventoryItemId ? (portionsByProduct[linkedInventoryItemId] || []) : [];
                  
                  // Merge portions: item's own portions take precedence, fallback to inventory item's portions
                  const mergedPortionsMap = new Map<string, ItemPortion>();
                  for (const p of linkedInventoryPortions) {
                    const key = (p.name || '').trim().toLowerCase();
                    if (key) mergedPortionsMap.set(key, p);
                  }
                  for (const p of itemPortions) {
                    const key = (p.name || '').trim().toLowerCase();
                    if (key) mergedPortionsMap.set(key, p);
                  }
                  const allPortions = Array.from(mergedPortionsMap.values());
                  const hasPortions = allPortions.length > 0;
                  
                  // Don't deduct cart quantity from stock display because stock is already deducted when adding to cart
                  const adjustedPortions = allPortions.map((portion) => {
                    const itemWithLink = item as any;
                    if (isSaleOnly && !itemWithLink.inventory_item_id) {
                      // Sale Only items without inventory link always show as available
                      return { ...portion, available: 999999 };
                    }
                    const maxByRecipe = isRecipe ? stock : Number.MAX_SAFE_INTEGER;
                    const available = Math.max(0, Math.min(portion.stock, maxByRecipe));
                    return { ...portion, available };
                  });
                  
                  const adjustedItemStock = hasPortions
                    ? adjustedPortions.reduce((sum, p) => sum + p.available, 0)
                    : Math.max(0, stock);
                  const isOutOfStock = adjustedItemStock <= 0;
                  const isLowStock = !isSaleOnly && adjustedItemStock > 0 && adjustedItemStock < 10;

                  return (
                    <Card
                      key={(item as any).uniqueKey}
                      className={`transition-all relative overflow-hidden group ${isOutOfStock ? 'opacity-70 grayscale cursor-not-allowed border-red-200' : 'cursor-pointer hover:border-blue-400 hover:shadow-lg hover:bg-blue-50/10'}`}
                      onClick={() => {
                        if (isOutOfStock) return;
                        
                        // If item has portions, show portion selection modal first
                        if (hasPortions) {
                          setPortionSelectionItem(item);
                          return;
                        }
                        
                        // Check if price is 0, show price input dialog
                        if (item.price === 0) {
                          setPriceInputItem({ item: { ...item, stock }, stock, hasPortions: false });
                          setCustomPrice('');
                          return;
                        }
                        
                        // Otherwise, add to cart directly
                        addToCart({ ...item, stock } as any);
                      }}
                    >
                      {/* Accent Stripe */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${isOutOfStock ? 'bg-red-400' : 'bg-blue-500 group-hover:h-1.5 transition-all'}`} />

                      {isOutOfStock && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/20 font-bold text-red-700 backdrop-blur-[2px]">
                          <AlertTriangle className="h-8 w-8 mb-1 text-red-600" />
                          <span className="text-sm uppercase tracking-wider">{t.outOfStock}</span>
                        </div>
                      )}
                      {isLowStock && (
                        <div className="absolute right-2 top-3 z-10 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-800 border border-yellow-200">
                          {t.low}: {adjustedItemStock}
                        </div>
                      )}
                      {!isOutOfStock && !isLowStock && !isSaleOnly && (
                        <div className="absolute right-2 top-3 z-10 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200 shadow-sm">
                          {isRecipe ? `${t.ready}: ${adjustedItemStock}` : `${t.stock}: ${adjustedItemStock}`}
                        </div>
                      )}

                      <CardContent className="flex h-40 flex-col items-center justify-center p-4 text-center pt-6">
                        <div className="font-bold text-zinc-800">{item.name}</div>
                        <div className="mt-2 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{formatCurrency(item.price)}</div>
                        {hasPortions && (
                          <div className="mt-2 text-[10px] text-zinc-500 font-medium bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                            {allPortions.length} {t.portionsAvailable}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          {/* End of menu content */}
        </div>

        {cart.length > 0 && mobilePosView === 'menu' && !showTableSelection && (
          <Button
            type="button"
            onClick={() => setMobilePosView('order')}
            className="fixed bottom-24 right-4 z-40 flex h-14 items-center gap-3 rounded-full bg-blue-600 px-5 text-white shadow-xl shadow-blue-900/20 hover:bg-blue-700 lg:hidden"
          >
            <span className="font-bold">{cartItemCount}</span>
            <span className="text-sm font-semibold">{t.currentOrder}</span>
          </Button>
        )}

      {/* Cart Sidebar */}
      <div className={`${mobilePosView === 'order' ? 'flex' : 'hidden'} w-full flex-col border-l border-zinc-200 bg-white lg:flex lg:w-[30rem]`}>
        <div className="flex items-center justify-between border-b border-zinc-200 p-4">
          <div className="flex items-center gap-2">
            {/* Back button - only show in PWA mode */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setMobilePosView('menu')}
              className="lg:hidden text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              title={t.menu}
            >
              <ArrowRight className="h-5 w-5 rotate-180" />
            </Button>
            <h2 className="text-lg font-semibold">{t.currentOrder}</h2>
          </div>
          <div className="flex gap-2">
            {/* Hold Order button - only show for takeout */}
            {currentOrderType === 'takeout' && (
              <Button variant="ghost" size="sm" onClick={handleHoldOrder} disabled={cart.length === 0} title={t.holdOrder} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                <PauseCircle className="h-5 w-5" />
              </Button>
            )}
            {heldOrders.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  // Toggle held orders view
                  const modal = document.getElementById('held-orders-modal');
                  if (modal) {
                    modal.classList.toggle('hidden');
                  }
                }} 
                title={t.heldOrders}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 relative"
              >
                <PlayCircle className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {heldOrders.length}
                </span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearUnsentItems} disabled={cart.length === 0} title={t.clearCart} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Held Orders Modal */}
        <div id="held-orders-modal" className="hidden absolute inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-200 p-4 bg-purple-50">
            <h2 className="text-lg font-semibold text-purple-900">{t.heldOrders}</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                const modal = document.getElementById('held-orders-modal');
                if (modal) {
                  modal.classList.add('hidden');
                }
              }}
              className="text-purple-600 hover:text-purple-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {heldOrders.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-zinc-500">
                <PauseCircle className="mb-4 h-12 w-12 opacity-20" />
                <p>{t.noHeldOrders}</p>
                <p className="text-sm mt-2">{t.heldOrdersDescription}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {heldOrders.map((order) => (
                  <Card key={order.id} className="border-purple-200 hover:border-purple-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {order.orderType === 'takeout' ? (
                              <ShoppingBag className="h-4 w-4 text-green-600" />
                            ) : (
                              <Grid3x3 className="h-4 w-4 text-blue-600" />
                            )}
                            <span className="font-semibold text-sm">
                              {order.orderType === 'takeout' 
                                ? t.takeout 
                                : `${t.table} ${order.table?.table_number || ''}`
                              }
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {new Date(order.date).toLocaleString()}
                          </div>
                          {order.note && (
                            <div className="text-xs text-zinc-600 mt-1 italic">
                              {order.note}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 mb-3">
                        {order.cart.slice(0, 3).map((item, idx) => (
                          <div key={`held-${order.id}-item-${idx}`} className="text-xs text-zinc-600 flex justify-between">
                            <span>{item.quantity}x {item.item.name}</span>
                            <span>{formatCurrency(item.item.price * item.quantity)}</span>
                          </div>
                        ))}
                        {order.cart.length > 3 && (
                          <div className="text-xs text-zinc-400">
                            +{order.cart.length - 3} {t.items}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            handleResumeOrder(order.id);
                            const modal = document.getElementById('held-orders-modal');
                            if (modal) {
                              modal.classList.add('hidden');
                            }
                          }}
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          {t.resume}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(t.confirmDeleteHeldOrder)) {
                              removeHeldOrder(order.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500">
              <ShoppingBag className="mb-4 h-12 w-12 opacity-20" />
              <p>{t.emptyCart}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((cartItem, index) => {
                // Use cartItem.sentToKitchen directly, don't use sentToKitchenItems
                const isSentToKitchen = cartItem.sentToKitchen || false;
                const isCompleted = cartItem.completedInKitchen || false;
                const showSentBadge = isSentToKitchen || isCompleted;
                const itemKey = `cart-${cartItem.clientLineId || cartItem.orderItemId || `${cartItem.item.id}-${cartItem.portionId || 'no-portion'}-${index}`}`;
                
                return (
                  <div key={itemKey} className={`flex items-center justify-between gap-2 ${showSentBadge ? 'opacity-60 bg-zinc-50' : ''} p-2 rounded-lg border ${showSentBadge ? 'border-zinc-200' : 'border-transparent'}`}>
                    <div className="flex-1">
                      <div className={`font-medium ${showSentBadge ? 'text-zinc-500' : ''}`}>
                        {cartItem.cancelled ? (
                          <del className="text-red-500">{cartItem.item.name}</del>
                        ) : (
                          cartItem.item.name
                        )}
                        {showSentBadge && !cartItem.cancelled && <span className="ml-2 text-xs text-green-600">✓ {t.sentToKitchenStatus}</span>}
                        {cartItem.cancelled && <span className="ml-2 text-xs text-red-600">✗ {t.cancelledStatus}</span>}
                      </div>
                      <div className="text-sm text-zinc-500">{formatCurrency(cartItem.item.price)}</div>
                      {cartItem.portionName && (
                        <div className="text-xs text-zinc-400 mt-0.5">{cartItem.portionName}</div>
                      )}
                      {cartItem.sentToKitchenTime && !cartItem.cancelled && (
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                          <Clock className="h-3 w-3" />
                          <span>{cartItem.sentToKitchenTime}</span>
                        </div>
                      )}
                      {cartItem.cancelled && cartItem.cancelledAt && (
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-medium">
                          <Clock className="h-3 w-3" />
                          <span>{cartItem.cancelledAt}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${isSentToKitchen && !cartItem.cancelled ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-zinc-300 cursor-not-allowed'} mr-1`}
                        onClick={() => {
                          if (isSentToKitchen) {
                            handleCancelCartItem(index);
                          } else {
                            removeFromCartByIndex(index);
                          }
                        }}
                        disabled={!isSentToKitchen || cartItem.cancelled}
                        title={isSentToKitchen ? (cartItem.cancelled ? 'Already cancelled' : 'Cancel item') : 'Cannot delete unsent items'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantityByIndex(index, cartItem.quantity - 1)}
                        disabled={isSentToKitchen || cartItem.cancelled}
                        title={isSentToKitchen ? 'Cannot modify items sent to kitchen' : 'Decrease quantity'}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className={`w-8 text-center text-sm font-bold ${isSentToKitchen || cartItem.cancelled ? 'text-zinc-400' : ''}`}>{cartItem.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateCartQuantityByIndex(index, cartItem.quantity + 1)}
                        disabled={isSentToKitchen || cartItem.cancelled}
                        title={isSentToKitchen ? 'Cannot modify items sent to kitchen' : 'Increase quantity'}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="min-w-[80px] text-right font-medium whitespace-nowrap">
                      {formatCurrency(cartItem.item.price * cartItem.quantity)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Table Management Buttons - Show in mobile/PWA only when cart is not empty and in dine-in mode */}
        {cart.length > 0 && currentOrderType === 'dine-in' && currentTable && (
          <div className="lg:hidden border-t border-zinc-200 bg-white p-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchAvailableTables();
                  setShowMergeTableModal(true);
                }}
                className="flex-1 border-green-300 text-green-700 hover:bg-green-50 font-medium"
              >
                {t.mergeTables}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTransferTable}
                className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 font-medium"
              >
                {t.transferTable}
              </Button>
              {/* แสดงปุ่ม Split Table เฉพาะเมื่อโต๊ะถูกรวมมาแล้ว */}
              {currentTable?.is_merged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchAvailableTables();
                    setShowSplitTableModal(true);
                  }}
                  className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50 font-medium"
                >
                  {t.splitTable}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={t.addOrderNotes}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="mb-4 grid gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-blue-900 mb-2 block">{t.tipAmount}</label>
              <div className="flex items-center gap-2">
                <span className="text-blue-700 font-medium">{currencySettings.currencySymbol}</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  className="flex-1 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-blue-900 mb-2 block">{t.discount}</label>
              <div className="flex items-center gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percent')}
                  className="h-10 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 shadow-sm"
                >
                  <option value="fixed">{t.fixedAmount}</option>
                  <option value="percent">%</option>
                </select>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={discountType === 'percent' ? 100 : undefined}
                  placeholder={discountType === 'percent' ? '0%' : '0.00'}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="flex-1 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">{t.subtotal}</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>{t.discount} {discountType === 'percent' ? `(${Math.min(rawDiscountValue, 100)}%)` : ''}</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">{t.tax} ({generalSettings.taxRate}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-500">{t.tip}</span>
                <span>{formatCurrency(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-lg font-bold">
              <span>{t.total}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              variant="outline"
              className="h-12 px-4"
              onClick={handlePrintBill}
              disabled={cart.length === 0}
              title={t.printBill}
            >
              <Printer className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              className="h-12 px-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
              onClick={handleSendToKitchen}
              disabled={cart.length === 0}
              title={t.sendToKitchen}
            >
              <List className="h-5 w-5" />
              <span>{t.sendToKitchen}</span>
            </Button>
            {/* Show Set Available button if all items are cancelled */}
            {cart.length > 0 && cart.every(item => item.cancelled) ? (
              <Button
                className="flex-1 h-12 text-lg bg-orange-600 hover:bg-orange-700"
                onClick={async () => {
                  await closeCurrentPendingOrder(currentTable);
                  clearCart();
                  setTip('');
                  setDiscount('');
                  setDiscountType('fixed');
                  if (currentTable) {
                    clearCurrentTable();
                  }
                  alert(t.allItemsCancelled);
                }}
              >
                {t.setAvailable}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="flex-1 h-12 text-lg"
                    disabled={cart.length === 0 || isCheckingOut}
                  >
                    {t.checkout}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>{t.completeOrder}</DialogTitle>
                  <DialogDescription>
                    {t.totalAmount} <span className="font-bold text-lg text-zinc-900">{formatCurrency(total)}</span>
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="cash" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cash">{t.cash}</TabsTrigger>
                    <TabsTrigger value="transfer">{t.transfer}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="cash" className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Left Column: Input and Details */}
                      <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                          <Label htmlFor="cash-tendered">{t.cashTendered}</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{currencySettings.currencySymbol}</span>
                            <Input
                              id="cash-tendered"
                              className="pl-7 text-lg font-bold"
                              value={formattedCashTenderedInput}
                              onChange={(e) => handleCashTenderedInput(e.target.value)}
                              onFocus={() => setIsCashInputFocused(true)}
                              onBlur={() => {
                                setIsCashInputFocused(false);
                                const parsed = parseFloat(cashTendered || '0');
                                if (Number.isFinite(parsed) && parsed > 0) {
                                  setCashTendered(parsed.toFixed(2));
                                } else {
                                  setCashTendered('');
                                }
                              }}
                              inputMode="decimal"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="rounded-lg bg-zinc-50 p-4 space-y-2 border border-zinc-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">{t.totalDue}</span>
                            <span className="font-bold">{formatCurrency(total)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">{t.tendered}</span>
                            <span className="font-medium">{formatCurrency(parseFloat(cashTendered || '0'))}</span>
                          </div>
                          <div className="border-t border-zinc-200 pt-2 flex justify-between font-bold text-lg">
                            <span className={parseFloat(cashTendered || '0') >= total ? "text-green-600" : "text-red-600"}>
                              {parseFloat(cashTendered || '0') >= total ? t.change : t.due}
                            </span>
                            <span className={parseFloat(cashTendered || '0') >= total ? "text-green-600" : "text-red-600"}>
                              {formatCurrency(Math.abs((parseFloat(cashTendered || '0') - total)))}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {(() => {
                            const exact = total;
                            // Round to next 1k, 10k, 50k, 100k
                            const nextRoundAmounts = [
                              Math.ceil(total / 1000) * 1000,
                              Math.ceil(total / 5000) * 5000,
                              Math.ceil(total / 10000) * 10000,
                              Math.ceil(total / 20000) * 20000,
                              Math.ceil(total / 50000) * 50000,
                              Math.ceil(total / 100000) * 100000,
                              200000,
                              500000,
                              1000000
                            ];

                            // Unique suggestions > exact (except for the buttons we handle separately)
                            const uniqueSuggests = Array.from(new Set(nextRoundAmounts))
                              .filter(a => a > exact)
                              .sort((a, b) => a - b)
                              .slice(0, 5); // Take up to 5 suggestions

                            return (
                              <>
                                <Button variant="outline" onClick={() => handleQuickAmount('exact')} className="text-sm font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50">{t.exact}</Button>
                                {uniqueSuggests.map(amount => (
                                  <Button
                                    key={amount}
                                    variant="outline"
                                    onClick={() => handleQuickAmount(amount)}
                                    className="text-sm font-medium border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50"
                                  >
                                    {formatCurrency(amount)}
                                  </Button>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      {/* Right Column: Numpad */}
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <Button
                            key={num}
                            variant="outline"
                            className="h-12 text-lg font-medium"
                            onClick={() => handleNumpadClick(num.toString())}
                          >
                            {num}
                          </Button>
                        ))}
                        <Button variant="outline" className="h-12 text-lg font-medium" onClick={() => handleNumpadClick('.')}>.</Button>
                        <Button variant="outline" className="h-12 text-lg font-medium" onClick={() => handleNumpadClick('0')}>0</Button>
                        <Button variant="destructive" className="h-12" onClick={() => handleNumpadClick('C')}>C</Button>
                        <Button variant="secondary" className="col-span-3 h-12" onClick={() => handleNumpadClick('backspace')}>
                          {t.backspace}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="transfer" className="space-y-4 py-4">
                    {transferBanks.length > 0 && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant={transferViewMode === 'list' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTransferViewMode('list')}
                          title={t.listView}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={transferViewMode === 'grid' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTransferViewMode('grid')}
                          title={t.gridView}
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {transferBanks.length === 0 ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        {t.noBankConfigured}
                      </div>
                    ) : (
                      <div className={transferViewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                        {transferBanks.map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => setSelectedTransferBankId(bank.id)}
                            className={`w-full rounded-lg border p-4 space-y-3 text-left ${selectedTransferBankId === bank.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-zinc-200'
                              }`}
                          >
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                              <span className="text-sm text-zinc-500">{t.bank}</span>
                              <span className="font-medium">
                                {bank.bankName}
                                {selectedTransferBankId === bank.id ? t.selected : ''}
                              </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                              <span className="text-sm text-zinc-500">{t.accountName}</span>
                              <span className="font-medium">{bank.accountName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-zinc-500">Account Number</span>
                              <span className="font-mono font-medium">{bank.accountNumber}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                      {t.verifyTransfer}
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <div className="flex w-full gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrintBill}
                      disabled={cart.length === 0}
                      className="w-28"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleCheckout}
                      disabled={isCheckingOut || (activeTab === 'transfer' && (transferBanks.length === 0 || !selectedTransferBankId))}
                      className="flex-1"
                    >
                      {isCheckingOut ? t.processing : `${t.confirm} ${activeTab === 'cash' ? t.cash : t.transfer}`}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
          <AlertDialogContent className="sm:max-w-md border-red-200 shadow-2xl bg-white">
            <AlertDialogHeader className="space-y-3">
              <AlertDialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                {t.deleteHeldOrder}
              </AlertDialogTitle>
              <AlertDialogDescription className="sr-only">
                {t.cannotBeUndoneWarning}
              </AlertDialogDescription>
              {(() => {
                  const order = heldOrders.find(o => o.id === orderToDelete);
                  if (!order) return null;
                  const itemCount = order.cart.length;
                  const orderTotal = order.cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
                  return (
                    <div className="space-y-3 mt-4 text-base text-zinc-700">
                      <p className="font-medium text-zinc-900">{t.confirmDeleteHeldOrder}</p>
                      <div className="bg-white border-2 border-red-200 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-red-900">{t.items}</span>
                          <span className="text-sm font-bold text-red-700 bg-red-50 px-3 py-1 rounded">{itemCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-red-900">Total:</span>
                          <span className="text-lg font-bold text-red-700">{formatCurrency(orderTotal)}</span>
                        </div>
                        {order.note && (
                          <div className="pt-2 border-t border-red-200">
                            <span className="text-sm font-semibold text-red-900">{t.note}:</span>
                            <p className="text-sm text-red-800 mt-1 italic">{order.note}</p>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-red-200">
                          <span className="text-sm font-semibold text-red-900">{t.time}</span>
                          <span className="text-sm text-red-700">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="bg-red-50 border border-red-300 rounded-md p-3">
                        <p className="text-sm font-bold text-red-700">{t.cannotBeUndoneWarning}</p>
                      </div>
                    </div>
                  );
                })()}
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 pt-4">
              <AlertDialogCancel className="border-zinc-300 hover:bg-zinc-100">
                {t.cancel}
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (orderToDelete) {
                  removeHeldOrder(orderToDelete);
                  setOrderToDelete(null);
                }
              }} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
                {t.deleteAction}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!portionSelectionItem} onOpenChange={(open) => !open && setPortionSelectionItem(null)}>
          <DialogContent className="sm:max-w-[600px] border-indigo-100 p-0 overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500" />
            <DialogHeader className="p-6 pb-4 bg-indigo-50/50 border-b border-indigo-100">
              <DialogTitle className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-indigo-600" />
                Select Portion
              </DialogTitle>
              <DialogDescription className="text-indigo-700/70">
                Choose a portion for <span className="font-bold text-indigo-900">{portionSelectionItem?.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto bg-white/50 backdrop-blur-sm">
              {(() => {
                // Merge portions from item.id and linked inventory_item_id
                const itemPortions = portionSelectionItem ? (portionsByProduct[portionSelectionItem.id] || []) : [];
                const linkedInventoryItemId = portionSelectionItem ? (portionSelectionItem as any).inventory_item_id : null;
                const linkedInventoryPortions = linkedInventoryItemId ? (portionsByProduct[linkedInventoryItemId] || []) : [];
                
                const mergedMap = new Map<string, ItemPortion>();
                for (const p of linkedInventoryPortions) {
                  const key = (p.name || '').trim().toLowerCase();
                  if (key) mergedMap.set(key, p);
                }
                for (const p of itemPortions) {
                  const key = (p.name || '').trim().toLowerCase();
                  if (key) mergedMap.set(key, p);
                }
                const allPortions = Array.from(mergedMap.values());
                
                return allPortions.map((portion) => {
                // Determine item type
                const itemType = (portionSelectionItem as any).type;
                const isStandalone = itemType === 'standalone';
                const isSaleOnly = itemType === 'saleonly';
                const isRecipe = portionSelectionItem.is_recipe === true;
                
                // Calculate stock based on item type (same logic as main display)
                let stock;
                if (isSaleOnly) {
                  // Sale Only items: if linked to inventory, use real stock; otherwise unlimited
                  const itemWithLink = portionSelectionItem as any;
                  if (itemWithLink.inventory_item_id) {
                    const linkedInvItem = items.find(invItem => invItem.id === itemWithLink.inventory_item_id);
                    stock = (linkedInvItem as any)?.stock ?? 0;
                  } else {
                    stock = 999999; // Unlimited
                  }
                } else if (isRecipe) {
                  const hasIngredients = recipeHasIngredients[portionSelectionItem.id];
                  if (!hasIngredients) {
                    // Recipe without ingredients: if linked to inventory, use real stock; otherwise unlimited
                    const itemWithLink = portionSelectionItem as any;
                    if (itemWithLink.inventory_item_id) {
                      const linkedInvItem = items.find(invItem => invItem.id === itemWithLink.inventory_item_id);
                      stock = (linkedInvItem as any)?.stock ?? 0;
                    } else {
                      stock = 999999; // Unlimited
                    }
                  } else {
                    stock = recipeStocks[portionSelectionItem.id] || 0;
                  }
                } else if (isStandalone) {
                  // Standalone items: Get stock from linked inventory item
                  const itemWithLink = portionSelectionItem as any;
                  if (itemWithLink.inventory_item_id) {
                    const linkedInvItem = items.find(invItem => invItem.id === itemWithLink.inventory_item_id);
                    stock = (linkedInvItem as any)?.stock ?? 0;
                  } else {
                    stock = 0;
                  }
                } else {
                  // Items from inventory_items table have stock directly
                  stock = (portionSelectionItem as any)?.stock || 0;
                }
                
                // Calculate available stock for this portion
                let available;
                const itemWithLink = portionSelectionItem as any;
                if (isSaleOnly && itemWithLink.inventory_item_id) {
                  // Sale Only with inventory link: use real stock from inventory
                  available = Math.max(0, stock);
                } else if (isSaleOnly && !itemWithLink.inventory_item_id) {
                  // Sale Only without inventory link: unlimited
                  available = 999999;
                } else {
                  const maxByRecipe = isRecipe ? stock : Number.MAX_SAFE_INTEGER;
                  available = Math.max(0, Math.min(portion.stock, maxByRecipe));
                }
                const isOutOfStock = available <= 0;
                const currentQty = portionQuantities[portion.id] || 0;

                return (
                  <div
                    key={portion.id}
                    className={`w-full group flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${isOutOfStock
                      ? 'border-red-100 bg-red-50/50 opacity-70'
                      : 'border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex flex-col items-start gap-1 flex-1">
                      <span className={`font-bold text-lg ${isOutOfStock ? 'text-red-600' : 'text-zinc-800'}`}>
                        {portion.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {isOutOfStock ? 'Out of Stock' : `Available: ${available}`}
                        </span>
                        {!isOutOfStock && (
                          <span className="text-sm font-black text-indigo-600">
                            {formatCurrency(portion.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isOutOfStock && (
                      <div className="flex items-center gap-2 ml-4 bg-white p-1 rounded-lg border border-indigo-100 shadow-sm">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => setPortionQuantities(prev => ({ ...prev, [portion.id]: Math.max(0, (prev[portion.id] || 0) - 1) }))}
                          disabled={currentQty <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={currentQty === 0 ? '' : currentQty}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                            if (!isNaN(val)) {
                              setPortionQuantities(prev => ({ ...prev, [portion.id]: Math.max(0, Math.min(available, val)) }));
                            }
                          }}
                          className="w-12 h-8 text-center font-bold text-indigo-900 border-none bg-transparent p-0 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => setPortionQuantities(prev => ({ ...prev, [portion.id]: Math.min(available, (prev[portion.id] || 0) + 1) }))}
                          disabled={currentQty >= available}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
                });
              })()}
            </div>

            <DialogFooter className="p-4 bg-zinc-50 border-t border-zinc-100 flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setPortionSelectionItem(null)}
                className="px-6 border-zinc-300 text-zinc-600 hover:bg-zinc-100 rounded-lg h-11"
              >
                {t.cancel}
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg text-base font-bold shadow-lg shadow-indigo-200"
                onClick={async () => {
                  // Get merged portions (same as display)
                  const itemPortions = portionsByProduct[portionSelectionItem.id] || [];
                  const linkedInventoryItemId = (portionSelectionItem as any).inventory_item_id;
                  const linkedInventoryPortions = linkedInventoryItemId ? (portionsByProduct[linkedInventoryItemId] || []) : [];
                  
                  const mergedMap = new Map<string, ItemPortion>();
                  for (const p of linkedInventoryPortions) {
                    const key = (p.name || '').trim().toLowerCase();
                    if (key) mergedMap.set(key, p);
                  }
                  for (const p of itemPortions) {
                    const key = (p.name || '').trim().toLowerCase();
                    if (key) mergedMap.set(key, p);
                  }
                  const portions = Array.from(mergedMap.values());
                  
                  // Determine item type (same logic as display)
                  const itemType = (portionSelectionItem as any).type;
                  const isStandalone = itemType === 'standalone';
                  const isSaleOnly = itemType === 'saleonly';
                  const isRecipe = portionSelectionItem.is_recipe === true;
                  
                  // Calculate stock based on item type
                  let itemStock;
                  if (isSaleOnly) {
                    // Sale Only items: if linked to inventory, use real stock; otherwise unlimited
                    const itemWithLink = portionSelectionItem as any;
                    if (itemWithLink.inventory_item_id) {
                      const linkedInvItem = items.find(invItem => invItem.id === itemWithLink.inventory_item_id);
                      itemStock = (linkedInvItem as any)?.stock ?? 0;
                    } else {
                      itemStock = 999999; // Unlimited
                    }
                  } else if (isRecipe) {
                    const hasIngredients = recipeHasIngredients[portionSelectionItem.id];
                    if (!hasIngredients) {
                      // Recipe without ingredients: if linked to inventory, use real stock; otherwise unlimited
                      const itemWithLink = portionSelectionItem as any;
                      if (itemWithLink.inventory_item_id) {
                        const linkedInvItem = items.find(invItem => invItem.id === itemWithLink.inventory_item_id);
                        itemStock = (linkedInvItem as any)?.stock ?? 0;
                      } else {
                        itemStock = 999999; // Unlimited
                      }
                    } else {
                      itemStock = recipeStocks[portionSelectionItem.id] || 0;
                    }
                  } else if (isStandalone) {
                    // Standalone items: Get stock from linked inventory item
                    const itemWithLink = portionSelectionItem as any;
                    if (itemWithLink.inventory_item_id) {
                      const linkedInvItem = items.find(invItem => invItem.id === itemWithLink.inventory_item_id);
                      itemStock = (linkedInvItem as any)?.stock ?? 0;
                    } else {
                      itemStock = 0;
                    }
                  } else {
                    itemStock = (portionSelectionItem as any)?.stock || 0;
                  }
                  
                  portions.forEach(portion => {
                    const qty = portionQuantities[portion.id] || 0;
                    if (qty > 0) {
                      const maxByRecipe = isRecipe ? itemStock : Number.MAX_SAFE_INTEGER;
                      const totalCapacity = Math.min(portion.stock, maxByRecipe);
                      addToCart(
                        {
                          ...portionSelectionItem,
                          id: `${portionSelectionItem.id}::${portion.id}`,
                          name: `${portionSelectionItem.name} (${portion.name})`,
                          price: portion.price,
                          stock: totalCapacity,
                        },
                        {
                          sourceItemId: portionSelectionItem.id,
                          portionName: portion.name,
                          portionId: portion.id,
                          quantity: qty,
                        }
                      );
                    }
                  });
                  
                  // Refresh portions to update stock display
                  await fetchItemPortions();
                  
                  setPortionSelectionItem(null);
                }}
                disabled={!Object.values(portionQuantities).some(q => q > 0)}
              >
                {t.addToCart}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Price Input Dialog for Zero-Price Items */}
        <Dialog open={!!priceInputItem} onOpenChange={(open) => !open && setPriceInputItem(null)}>
          <DialogContent className="sm:max-w-[400px] border-blue-100 p-0 overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500" />
            <DialogHeader className="p-6 pb-4 bg-blue-50/50 border-b border-blue-100">
              <DialogTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                {currentLanguage === 'th' ? 'ป้อนราคา' : currentLanguage === 'lo' ? 'ປ້ອນລາຄາ' : 'Enter Price'}
              </DialogTitle>
              <DialogDescription className="text-blue-700/70">
                {currentLanguage === 'th' 
                  ? `กรุณาป้อนราคาสำหรับ `
                  : currentLanguage === 'lo'
                  ? `ກະລຸນາປ້ອນລາຄາສຳລັບ `
                  : 'Please enter price for '}
                <span className="font-bold text-blue-900">{priceInputItem?.item?.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-4 bg-white">
              {/* Price Display */}
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="text-sm text-blue-600 mb-1">
                  {currentLanguage === 'th' ? 'ราคา' : currentLanguage === 'lo' ? 'ລາຄາ' : 'Price'}
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {formatCurrency(parseFloat(customPrice) || 0)}
                </div>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'C'].map((key) => (
                  <Button
                    key={key}
                    variant={key === 'C' ? 'destructive' : 'outline'}
                    className={`h-14 text-xl font-bold ${
                      key === 'C' 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'hover:bg-blue-50 hover:border-blue-300'
                    }`}
                    onClick={() => {
                      if (key === 'C') {
                        setCustomPrice('');
                      } else if (key === '.') {
                        if (!customPrice.includes('.')) {
                          setCustomPrice(prev => prev + key);
                        }
                      } else {
                        // Prevent multiple leading zeros
                        if (customPrice === '0' && key === '0') return;
                        // Limit decimal places to 2
                        if (customPrice.includes('.') && customPrice.split('.')[1].length >= 2) return;
                        setCustomPrice(prev => prev + key);
                      }
                    }}
                  >
                    {key}
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter className="p-4 bg-zinc-50 border-t border-zinc-100 flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPriceInputItem(null);
                  setCustomPrice('');
                }}
                className="px-6 border-zinc-300 text-zinc-600 hover:bg-zinc-100 rounded-lg h-11"
              >
                {t.cancel}
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 rounded-lg text-base font-bold shadow-lg shadow-blue-200"
                onClick={() => {
                  if (!priceInputItem) return;
                  
                  const price = parseFloat(customPrice);
                  if (!price || price <= 0) {
                    alert(currentLanguage === 'th' 
                      ? 'กรุณาป้อนราคาที่ถูกต้อง' 
                      : currentLanguage === 'lo'
                      ? 'ກະລຸນາປ້ອນລາຄາທີ່ຖືກຕ້ອງ'
                      : 'Please enter a valid price');
                    return;
                  }

                  const itemWithPrice = {
                    ...priceInputItem.item,
                    price,
                    stock: priceInputItem.stock
                  };

                  if (priceInputItem.hasPortions) {
                    setPortionSelectionItem(itemWithPrice);
                  } else {
                    addToCart(itemWithPrice);
                  }

                  setPriceInputItem(null);
                  setCustomPrice('');
                }}
                disabled={!customPrice || parseFloat(customPrice) <= 0}
              >
                {t.addToCart}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Merge Tables Modal */}
      <Dialog open={showMergeTableModal} onOpenChange={setShowMergeTableModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.mergeTables}</DialogTitle>
            <DialogDescription>{t.selectTableToMerge}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {availableTables
              .filter(table => table.id !== currentTable?.id && table.status !== 'inactive')
              .map(table => (
                <Card
                  key={table.id}
                  className="cursor-pointer hover:shadow-lg transition-all border-2"
                  onClick={() => handleMergeTables(table)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold mb-2">{table.table_number}</div>
                    <div className="text-sm text-zinc-600">
                      {table.capacity} {t.seats}
                    </div>
                    <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
                      table.status === 'available' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {table.status === 'available' ? 'Available' : 'Occupied'}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Table Modal */}
      <Dialog open={showTransferTableModal} onOpenChange={setShowTransferTableModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.transferTable}</DialogTitle>
            <DialogDescription>{t.selectTableToTransfer}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {availableTables
              .filter(table => table.id !== currentTable?.id && table.status !== 'inactive')
              .map(table => (
                <Card
                  key={table.id}
                  className="cursor-pointer hover:shadow-lg transition-all border-2"
                  onClick={() => handleTransferToTable(table)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold mb-2">{table.table_number}</div>
                    <div className="text-sm text-zinc-600">
                      {table.capacity} {t.seats}
                    </div>
                    <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
                      table.status === 'available' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {table.status === 'available' ? 'Available' : 'Occupied'}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Split Table Modal */}
      <Dialog open={showSplitTableModal} onOpenChange={setShowSplitTableModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.splitTable}</DialogTitle>
            <DialogDescription>{t.selectItemsToSplit}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Items Selection */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-3">Select Items to Move:</h3>
              <div className="space-y-2">
                {cart.map((cartItem, index) => {
                  const itemKey = `${cartItem.item.id}-${cartItem.portionId || 'no-portion'}`;
                  const isSelected = selectedItemsToSplit.has(itemKey);
                  
                  return (
                    <div
                      key={`${itemKey}-${index}`}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedItemsToSplit);
                        if (isSelected) {
                          newSelected.delete(itemKey);
                        } else {
                          newSelected.add(itemKey);
                        }
                        setSelectedItemsToSplit(newSelected);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-zinc-300'
                        }`}>
                          {isSelected && <CheckSquare className="h-4 w-4 text-white" />}
                        </div>
                        <div>
                          <div className="font-medium">{cartItem.item.name}</div>
                          {cartItem.portionName && (
                            <div className="text-sm text-zinc-500">{cartItem.portionName}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-zinc-600">x{cartItem.quantity}</div>
                        <div className="font-bold">{formatCurrency(cartItem.item.price * cartItem.quantity)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Table Selection */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-3">{t.moveToNewTable}</h3>
              <div className="grid grid-cols-4 gap-3">
                {availableTables
                  .filter(table => table.id !== currentTable?.id && table.status === 'available')
                  .map(table => (
                    <Card
                      key={table.id}
                      className="cursor-pointer hover:shadow-lg transition-all border-2"
                      onClick={() => handleSplitTable(table)}
                    >
                      <CardContent className="p-3 text-center">
                        <div className="text-xl font-bold">{table.table_number}</div>
                        <div className="text-xs text-zinc-600">{table.capacity} {t.seats}</div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Printing Loading Modal */}
      <Dialog open={isPrinting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">{t.printing}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            {/* Animated Printer Icon */}
            <div className="relative">
              <Printer className="h-20 w-20 text-black animate-pulse" />
              <div className="absolute -top-2 -right-2">
                <div className="h-6 w-6 bg-black rounded-full animate-ping" />
              </div>
            </div>
            
            {/* Loading Spinner */}
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-3 w-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-3 w-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            
            {/* Status Message */}
            <p className="text-center text-lg font-medium text-gray-700">
              {printingMessage}
            </p>
            
            {/* Progress Indicator */}
            <div className="w-full max-w-xs">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-black animate-pulse" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePosStore, formatItemNoteForDb, parseItemNoteFromDb, normalizeCart, sanitizeSplitBillTabs, createFirstSplitBillTab, fillUnassignedSplitBillItemsToFirstTab, getCartLineKey, resolveCartIndexFromLineKey, type SplitBillTab, type SplitBillAllocation } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Search, Trash2, CreditCard, ArrowRight, Clock, PauseCircle, PlayCircle, Printer, List, LayoutGrid, AlertTriangle, CheckSquare, ShoppingBag, Grid3x3, X, Users, Pencil } from 'lucide-react';
import { Item, Recipe, supabase, Table } from '@/lib/supabase';
import { TableSelection } from '@/components/table-selection';
import html2canvas from 'html2canvas';
import { getLogoTargetWidth, resizeImageForPrint, buildLogoHtml, injectLogoIntoReceiptHtml } from '@/lib/receipt-image';
import { nextStaggeredKitchenTime } from '@/lib/kitchen-utils';
import { KitchenQueueButton } from '@/components/kitchen-queue-panel';
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
    itemNotePlaceholder: 'How to prepare (e.g. no spice, extra crispy)',
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
    orderNumber: 'Order #',
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
    mergedBadge: 'Merged',
    mergedWith: 'Merged with',
    splitTable: 'Split Table',
    transferTable: 'Transfer Table',
    selectTableToMerge: 'Select table to merge with',
    selectTableToTransfer: 'Select table to transfer to',
    mergeSuccess: 'Tables merged successfully!',
    cancelMergeOrder: 'Cancel Merge',
    cancelMergeDescription: 'Select which merged table to split out, then choose where to move its orders',
    selectMergedTable: 'Orders from merged table',
    selectDestinationForOrders: 'Move all orders from table {table} to:',
    unmergeSuccess: 'Merge cancelled! Orders moved successfully.',
    restoreOriginalTable: 'Restore original table',
    tableOccupied: 'Occupied',
    tableOccupiedRestoreBlocked: 'Cannot restore — this table is already occupied. Please choose another table.',
    noDestinationTables: 'No available tables to move orders to',
    noMergedTablesFound: 'No merged tables found',
    splitSuccess: 'Table split successfully!',
    transferSuccess: 'Table transferred successfully!',
    cannotMergeSameTable: 'Cannot merge table with itself',
    cannotUnmergeToSameTable: 'Please choose a different table than the current one',
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
    splitBill: 'Split Bill',
    selectItemsToPay: 'Select items to pay now',
    paySelected: 'Pay Selected',
    splitBillSuccess: 'Split bill paid! Remaining items stay on this table.',
    selectAtLeastOneItem: 'Please select at least one item',
    billTab: 'Bill',
    addBillTab: 'Add Bill',
    inBillTab: 'In',
    renameBillTab: 'Rename bill',
    qtyForThisBill: 'Qty for this bill',
    unassigned: 'Unassigned',
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
    itemNotePlaceholder: 'ວິທີເຮັດ (ເຊັ່ນ ໜ່ວย, ຈິລະໃສ)',
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
    orderNumber: 'ເລກທີ່ #',
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
    mergedBadge: 'ລວມໂຕະ',
    mergedWith: 'ລວມກັບໂຕະ',
    splitTable: 'ແຍກໂຕະ',
    transferTable: 'ໂອນໂຕະ',
    selectTableToMerge: 'ເລືອກໂຕະທີ່ຈະລວມ',
    selectTableToTransfer: 'ເລືອກໂຕະທີ່ຈະໂອນໄປ',
    mergeSuccess: 'ລວມໂຕະສຳເລັດ!',
    cancelMergeOrder: 'ຍົກເລີກລວມອໍເດີ',
    cancelMergeDescription: 'ເລືອກໂຕະທີ່ລວມແລ້ວ ແລະເລືອກໂຕະປາຍທາງສຳລັບຍ້າຍອໍເດີ',
    selectMergedTable: 'ອໍເດີຈາກໂຕະທີ່ລວມ',
    selectDestinationForOrders: 'ຍ້າຍອໍເດີທັງໝົດຈາກໂຕະ {table} ໄປທີ່:',
    unmergeSuccess: 'ຍົກເລີກລວມສຳເລັດ! ຍ້າຍອໍເດີແລ້ວ.',
    restoreOriginalTable: 'ຄືນໂຕະເດີມ',
    tableOccupied: 'ມີຄົນນັ່ງ',
    tableOccupiedRestoreBlocked: 'ບໍ່ສາມາດຄືນໂຕະເດີມໄດ້ — ໂຕະນີ້ມີຄົນນັ່ງແລ້ວ. ກະລຸນາເລືອກໂຕະອື່ນ.',
    noDestinationTables: 'ບໍ່ມີໂຕະວ່າງສຳລັບຍ້າຍອໍເດີ',
    noMergedTablesFound: 'ບໍ່ພົບໂຕະທີ່ຖືກລວມ',
    splitSuccess: 'ແຍກໂຕະສຳເລັດ!',
    transferSuccess: 'ໂອນໂຕະສຳເລັດ!',
    cannotMergeSameTable: 'ບໍ່ສາມາດລວມໂຕະດຽວກັນໄດ້',
    cannotUnmergeToSameTable: 'ກະລຸນາເລືອກໂຕະອື່ນທີ່ບໍ່ແມ່ນໂຕະປັດຈຸບັນ',
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
    splitBill: 'ແຍກບິນ',
    selectItemsToPay: 'ເລືອກລາຍການທີ່ຈະຊຳລະ',
    paySelected: 'ຊຳລະທີ່ເລືອກ',
    splitBillSuccess: 'ແຍກບິນສຳເລັດ! ລາຍການທີ່ເຫຼືອຍັງຢູ່ໂຕະນີ້',
    selectAtLeastOneItem: 'ກະລຸນາເລືອກຢ່າງໜ້ອຍ 1 ລາຍການ',
    billTab: 'ບິນ',
    addBillTab: 'ເພີ່ມໃບບິນ',
    inBillTab: 'ຢູ່ໃນ',
    renameBillTab: 'ປ່ຽນຊື່ບິນ',
    qtyForThisBill: 'ຈຳນວນໃບບິນນີ້',
    unassigned: 'ຍັງບໍ່ໄດ້ແບ່ງ',
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
    itemNotePlaceholder: 'วิธีทำ (เช่น ไม่เผ็ด, กรอบนอกนุ่มใน)',
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
    orderNumber: 'เลขที่ #',
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
    mergedBadge: 'รวมโต๊ะ',
    mergedWith: 'รวมโต๊ะกับ',
    splitTable: 'แยกโต๊ะ',
    transferTable: 'โอนโต๊ะ',
    selectTableToMerge: 'เลือกโต๊ะที่จะรวม',
    selectTableToTransfer: 'เลือกโต๊ะที่จะโอนไป',
    mergeSuccess: 'รวมโต๊ะสำเร็จ!',
    cancelMergeOrder: 'ยกเลิกรวมออเดอร์',
    cancelMergeDescription: 'เลือกโต๊ะที่ถูกรวม แล้วเลือกโต๊ะปลายทางที่จะย้ายออเดอร์ไป',
    selectMergedTable: 'ออเดอร์จากโต๊ะที่รวม',
    selectDestinationForOrders: 'ย้ายออเดอร์ทั้งหมดจากโต๊ะ {table} ไปที่:',
    unmergeSuccess: 'ยกเลิกรวมสำเร็จ! ย้ายออเดอร์แล้ว',
    restoreOriginalTable: 'คืนโต๊ะเดิม',
    tableOccupied: 'มีคนนั่ง',
    tableOccupiedRestoreBlocked: 'ไม่สามารถคืนโต๊ะเดิมได้ — โต๊ะนี้มีคนนั่งแล้ว กรุณาเลือกโต๊ะอื่น',
    noDestinationTables: 'ไม่มีโต๊ะว่างสำหรับย้ายออเดอร์',
    noMergedTablesFound: 'ไม่พบโต๊ะที่ถูกรวม',
    splitSuccess: 'แยกโต๊ะสำเร็จ!',
    transferSuccess: 'โอนโต๊ะสำเร็จ!',
    cannotMergeSameTable: 'ไม่สามารถรวมโต๊ะเดียวกันได้',
    cannotUnmergeToSameTable: 'กรุณาเลือกโต๊ะอื่นที่ไม่ใช่โต๊ะปัจจุบัน',
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
    splitBill: 'แยกบิล',
    selectItemsToPay: 'เลือกรายการที่จะชำระ',
    paySelected: 'ชำระรายการที่เลือก',
    splitBillSuccess: 'แยกบิลสำเร็จ! รายการที่เหลือยังอยู่ที่โต๊ะนี้',
    selectAtLeastOneItem: 'กรุณาเลือกอย่างน้อย 1 รายการ',
    billTab: 'บิล',
    addBillTab: 'เพิ่มใบบิล',
    inBillTab: 'อยู่ใน',
    renameBillTab: 'เปลี่ยนชื่อบิล',
    qtyForThisBill: 'จำนวนในใบบิลนี้',
    unassigned: 'ยังไม่ได้แบ่ง',
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
    tableSplitBills, tableSplitBillActiveTab, setTableSplitBills, syncSplitBillNewItemsToFirstTab,
    checkSupabaseConfig, fetchItemsAndCategories, fetchAppSettings,
    addToCart, removeFromCart: storeRemoveFromCart, removeFromCartByIndex, cancelCartItem, cancelCartItemByIndex, updateCartQuantity, updateCartQuantityByIndex, updateCartItemNotesByIndex, clearCart, clearUnsentItems, markCartItemsAsSent, markTableBillPrinted, checkout,
    holdOrder, resumeOrder, removeHeldOrder, setHeldOrders, currencySettings, generalSettings, checkoutError, bankConfigs, autoPrint, silentPrint,
    isShiftOpen, shiftStartTime, shiftCashAmount, shiftTransferAmount, openShift, closeShift,
    currentTable, currentOrderType, setCurrentTable, clearCurrentTable,
    stationMappings, printerConfigs,
    enqueueKitchenPrint,
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
    const voidPaperSize = receiptSettings.voidBillSize || '80mm';
    const voidPageWidth = voidPaperSize === '80mm' ? '80mm' : '58mm';
    const voidBodyWidth = voidPaperSize === '80mm' ? 576 : 384;
    const voidFs = voidPaperSize === '80mm' ? 1.7 : 1.2;
    const voidFz = (n: number) => Math.round(n * voidFs) + 2; // font-size helper: scale + 2px
    const receiptHtml = `
      <html>
        <head>
          <title>VOID BILL - ${cartItem.item.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Sans+Lao:wght@400;500;700&display=swap');
            @page { size: ${voidPageWidth} auto; margin: 0; }
            body { font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif; padding: ${Math.round(8*voidFs)}px; width: ${voidBodyWidth}px; margin: 0 auto; color: #000; box-sizing: border-box; }
            .text-center { text-align: center; }
            .mb-4 { margin-bottom: 1rem; }
            .text-xs { font-size: ${voidFz(12)}px; }
            .text-sm { font-size: ${voidFz(14)}px; }
            .font-bold { font-weight: bold; }
            .flex { display: flex; justify-content: space-between; }
            .border-y { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: ${Math.round(10*voidFs)}px 0; margin: ${Math.round(10*voidFs)}px 0; }
            .text-red-600 { color: #dc2626; }
            .bg-red-50 { background-color: #fef2f2; }
            .border-red-200 { border-color: #fecaca; }
            table { width: 100%; border-collapse: collapse; }
            th, td { font-size: ${voidFz(12)}px; padding: ${Math.round(4*voidFs)}px 0; }
          </style>
        </head>
        <body>
          <div class="text-center mb-4">
            <div class="inline-block px-4 py-1 bg-red-50 border border-red-200 rounded text-red-600 font-bold" style="font-size: ${voidFz(18)}px;">
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
                  <th style="text-align:left; padding-bottom: ${Math.round(4*voidFs)}px;">Item</th>
                  <th style="text-align:center; padding-bottom: ${Math.round(4*voidFs)}px;">Qty</th>
                  <th style="text-align:right; padding-bottom: ${Math.round(4*voidFs)}px;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: ${Math.round(2*voidFs)}px 0; text-align:left;">${cartItem.item.name}</td>
                  <td style="padding: ${Math.round(2*voidFs)}px 0; text-align:center;">${cartItem.quantity}</td>
                  <td style="padding: ${Math.round(2*voidFs)}px 0; text-align:right; color: #dc2626; font-weight: bold;">VOIDED</td>
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

  const resolveKitchenTableLabel = useCallback(() => {
    if (currentTable?.table_number) return `${t.table} ${currentTable.table_number}`;
    return t.takeout;
  }, [currentTable, t]);

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
  const [note, setNote] = useState('');
  const [tip, setTip] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
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
  const [showCancelMergeModal, setShowCancelMergeModal] = useState(false);
  const [unmergeSourceTableId, setUnmergeSourceTableId] = useState<string | null>(null);
  const [showTransferTableModal, setShowTransferTableModal] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [splitBillCheckoutOpen, setSplitBillCheckoutOpen] = useState(false);
  const [splitBillCheckoutTabId, setSplitBillCheckoutTabId] = useState<string | null>(null);
  const [editingSplitBillTabId, setEditingSplitBillTabId] = useState<string | null>(null);
  const [editingSplitBillTabName, setEditingSplitBillTabName] = useState('');
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
    fetchAppSettings();
    fetchRecipes();
  }, [checkSupabaseConfig, fetchItemsAndCategories, fetchAppSettings, fetchRecipes]);

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
    const kitchenTime = raw.match(/(?:^|\s\|\s)KitchenTime:\s*([^|]+)/)?.[1]?.trim();
    const cancelled = /(?:^|\s\|\s)Kitchen:\s*cancelled/i.test(raw);
    return { clientLineId, itemName, portionName, cancelledAt, kitchenTime, cancelled };
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

    let orderId = await resolveCurrentOrderId(table, { allowTableFallback: true });
    if (!orderId) {
      const fallbackCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: pendingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', table.id)
        .eq('status', 'pending')
        .gte('created_at', fallbackCutoff)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      orderId = pendingOrder?.id || null;
    }
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

    const localCart = usePosStore.getState().cart;
    const localByOrderItemId = new Map(
      localCart
        .filter((cartItem: any) => cartItem.orderItemId)
        .map((cartItem: any) => [cartItem.orderItemId, cartItem])
    );

    const syncedCart = (orderItems || []).map((line: any) => {
      const meta = extractOrderItemMeta(line.notes);
      const localMatch = localByOrderItemId.get(line.id);
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
      const isCancelled = meta.cancelled || !!localMatch?.cancelled;

      return {
        item: {
          ...item,
          price: Number(line.price_at_time || item.price || 0)
        },
        quantity: Number(line.quantity || 1),
        sourceItemId: line.item_id || item.id,
        orderItemId: line.id,
        clientLineId: meta.clientLineId || localMatch?.clientLineId,
        portionName: meta.portionName || localMatch?.portionName,
        sentToKitchen: true,
        sentToKitchenTime: isCancelled
          ? undefined
          : (meta.kitchenTime || new Date(line.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        completedInKitchen: false,
        cancelled: isCancelled,
        cancelledAt: isCancelled ? (meta.cancelledAt || localMatch?.cancelledAt) : undefined,
        notes: parseItemNoteFromDb(line.notes) || localMatch?.notes,
      };
    });

    const syncedKeys = new Set(
      syncedCart.flatMap((cartItem: any) =>
        [cartItem.clientLineId, cartItem.orderItemId].filter(Boolean)
      )
    );
    const syncedOrderItemIds = new Set(
      syncedCart.map((cartItem: any) => cartItem.orderItemId).filter(Boolean)
    );
    const unsyncedLocalCart = localCart.filter((cartItem: any) => {
      if (cartItem.orderItemId && syncedOrderItemIds.has(cartItem.orderItemId)) return false;
      if (cartItem.sentToKitchen || cartItem.cancelled || cartItem.cancelledAt) return false;
      const localKey = cartItem.clientLineId || cartItem.orderItemId;
      return !localKey || !syncedKeys.has(localKey);
    });

    const mergedCart = normalizeCart([...syncedCart, ...unsyncedLocalCart]);
    const tableKey = `table-${table.id}`;

    usePosStore.setState((state) => ({
      cart: mergedCart,
      savedCarts: { ...state.savedCarts, [tableKey]: mergedCart },
    }));
    return true;
  }, [extractOrderItemMeta, isSupabaseConfigured, resolveCurrentOrderId]);

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
          item.category_id !== null &&
          (item as any).itemSource !== 'recipe'
        )
        .map(item => ({ ...item, uniqueKey: `item-${item.id}` }))
    : (isSupabaseConfigured ? [] : MOCK_ITEMS.map(item => ({ ...item, uniqueKey: `mock-${item.id}` })));
  
  const recipeItems = recipes.length > 0 ? recipes.map(recipe => ({
    ...recipe,
    is_recipe: true, // Mark recipes as is_recipe = true for display logic
    uniqueKey: `recipe-${recipe.id}`
  })) : [];

  const displayItems = [...menuItems, ...recipeItems];

  // Remove duplicates by product identity, not only React key.
  // The store may already include recipes, while this page also fetches recipes separately.
  const uniqueDisplayItems = displayItems.reduce((acc, current) => {
    const source = (current as any).itemSource || (current.is_recipe ? 'recipe' : 'item');
    const key = source === 'recipe' ? `recipe-${current.id}` : `item-${current.id}`;
    const exists = acc.find(item => {
      const existingSource = (item as any).itemSource || (item.is_recipe ? 'recipe' : 'item');
      const existingKey = existingSource === 'recipe' ? `recipe-${item.id}` : `item-${item.id}`;
      return existingKey === key;
    });
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, [] as typeof displayItems);

  // Debug: Check for duplicate uniqueKeys
  if (process.env.NODE_ENV === 'development') {
    const productKeys = displayItems.map(item => {
      const source = (item as any).itemSource || (item.is_recipe ? 'recipe' : 'item');
      return source === 'recipe' ? `recipe-${item.id}` : `item-${item.id}`;
    });
    const duplicates = productKeys.filter((key, index) => productKeys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      console.warn('[POS] Duplicate product keys found:', duplicates);
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

  const calcTotalForCartLines = (lines: typeof cart) => {
    const sub = lines
      .filter(item => !item.cancelled)
      .reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
    if (sub <= 0) return 0;
    const ratio = cartTotal > 0 ? sub / cartTotal : 1;
    const partialDiscount = discountAmount * ratio;
    const afterDiscount = Math.max(0, sub - partialDiscount);
    const partialTax = afterDiscount * taxRateDecimal;
    const partialTip = tipAmount * ratio;
    return afterDiscount + partialTax + partialTip;
  };

  const calcBreakdownForCartLines = (lines: typeof cart) => {
    const sub = lines
      .filter((item) => !item.cancelled)
      .reduce((sum, item) => sum + item.item.price * item.quantity, 0);
    const ratio = cartTotal > 0 ? sub / cartTotal : 1;
    const partialDiscount = discountAmount * ratio;
    const afterDiscount = Math.max(0, sub - partialDiscount);
    const partialTax = afterDiscount * taxRateDecimal;
    const partialTip = tipAmount * ratio;
    return {
      subtotal: sub,
      discount: partialDiscount,
      tax: partialTax,
      tip: partialTip,
      total: afterDiscount + partialTax + partialTip,
    };
  };

  const splitBillTableKey = currentTable && currentOrderType === 'dine-in'
    ? `table-${currentTable.id}`
    : null;
  const splitBillTabs: SplitBillTab[] = splitBillTableKey
    ? sanitizeSplitBillTabs(tableSplitBills[splitBillTableKey] || [], cart)
    : [];
  const activeSplitBillTabId = splitBillTableKey
    ? (tableSplitBillActiveTab[splitBillTableKey] || splitBillTabs[0]?.id || '')
    : '';
  const activeSplitBillTab = splitBillTabs.find((tab) => tab.id === activeSplitBillTabId) || splitBillTabs[0];
  const checkoutSplitBillTab = splitBillCheckoutTabId
    ? splitBillTabs.find((tab) => tab.id === splitBillCheckoutTabId) || activeSplitBillTab
    : activeSplitBillTab;

  const getTabAllocationQty = (tab: SplitBillTab | undefined, cartIndex: number) => {
    const line = cart[cartIndex];
    if (!line) return 0;
    return tab?.allocations?.find((a) => a.lineKey === getCartLineKey(line, cartIndex))?.quantity ?? 0;
  };

  const getOtherTabsAllocationQty = (cartIndex: number, excludeTabId?: string) => {
    const line = cart[cartIndex];
    if (!line) return 0;
    const lineKey = getCartLineKey(line, cartIndex);
    return splitBillTabs.reduce((sum, tab) => {
      if (excludeTabId && tab.id === excludeTabId) return sum;
      return sum + (tab.allocations.find((a) => a.lineKey === lineKey)?.quantity ?? 0);
    }, 0);
  };

  const getMaxAllocatableForActiveTab = (cartIndex: number) => {
    const line = cart[cartIndex];
    if (!line) return 0;
    return line.quantity - getOtherTabsAllocationQty(cartIndex, activeSplitBillTab?.id);
  };

  const buildSplitBillLines = (tab: SplitBillTab | undefined) =>
    (tab?.allocations ?? [])
      .map((a) => {
        const cartIndex = resolveCartIndexFromLineKey(cart, a.lineKey);
        if (cartIndex < 0) return null;
        const line = cart[cartIndex];
        if (!line || line.cancelled) return null;
        return { ...line, quantity: a.quantity };
      })
      .filter((line): line is NonNullable<typeof line> => line !== null);

  const tabAllocationTotal = (tab: SplitBillTab | undefined) =>
    (tab?.allocations ?? []).reduce((sum, a) => sum + a.quantity, 0);

  const ensureSplitBillTabs = (): SplitBillTab[] => {
    if (!splitBillTableKey) return [];
    let tabs = tableSplitBills[splitBillTableKey] || [];
    if (tabs.length === 0) {
      const created = createFirstSplitBillTab(cart);
      if (created[0]) created[0].name = `${t.billTab} 1`;
      setTableSplitBills(splitBillTableKey, created, created[0]?.id);
      return created;
    }
    let sanitized = sanitizeSplitBillTabs(tabs, cart);
    sanitized = fillUnassignedSplitBillItemsToFirstTab(sanitized, cart);
    const currentActive = tableSplitBillActiveTab[splitBillTableKey];
    const activeStillValid = currentActive && sanitized.some((tab) => tab.id === currentActive);
    const activeId = activeStillValid ? currentActive : sanitized[0]?.id;
    if (JSON.stringify(sanitized) !== JSON.stringify(tabs) || !activeStillValid) {
      setTableSplitBills(splitBillTableKey, sanitized, activeId);
    }
    return sanitized;
  };

  const setActiveSplitBillTab = (tabId: string) => {
    if (!splitBillTableKey) return;
    setTableSplitBills(splitBillTableKey, splitBillTabs, tabId);
  };

  const addSplitBillTab = () => {
    if (!splitBillTableKey) return;
    const newTab: SplitBillTab = {
      id: `sb-${Date.now()}`,
      name: `${t.billTab} ${splitBillTabs.length + 1}`,
      allocations: [],
    };
    setTableSplitBills(splitBillTableKey, [...splitBillTabs, newTab], newTab.id);
  };

  const removeSplitBillTab = (tabId: string) => {
    if (!splitBillTableKey || splitBillTabs.length <= 1) return;
    const updated = splitBillTabs.filter((tab) => tab.id !== tabId);
    const nextActive = activeSplitBillTabId === tabId ? updated[0]?.id : activeSplitBillTabId;
    setTableSplitBills(splitBillTableKey, updated, nextActive);
  };

  const renameSplitBillTab = (tabId: string, name: string) => {
    if (!splitBillTableKey) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = splitBillTabs.map((tab) =>
      tab.id === tabId ? { ...tab, name: trimmed } : tab
    );
    setTableSplitBills(splitBillTableKey, updated, activeSplitBillTabId);
  };

  const setActiveTabAllocation = (cartIndex: number, quantity: number) => {
    if (!splitBillTableKey || !activeSplitBillTab) return;
    const line = cart[cartIndex];
    if (!line) return;
    const lineKey = getCartLineKey(line, cartIndex);
    const max = getMaxAllocatableForActiveTab(cartIndex);
    const qty = Math.max(0, Math.min(quantity, max));
    const updated = splitBillTabs.map((tab) => {
      if (tab.id !== activeSplitBillTab.id) return tab;
      const without = (tab.allocations ?? []).filter((a) => a.lineKey !== lineKey);
      if (qty <= 0) return { ...tab, allocations: without };
      return { ...tab, allocations: [...without, { lineKey, quantity: qty }] };
    });
    setTableSplitBills(splitBillTableKey, updated, activeSplitBillTab.id);
  };

  const toggleSplitBillItem = (index: number) => {
    if (!activeSplitBillTab) return;
    const line = cart[index];
    if (!line || line.quantity !== 1) return;
    const currentQty = getTabAllocationQty(activeSplitBillTab, index);
    setActiveTabAllocation(index, currentQty > 0 ? 0 : 1);
  };

  const getOtherTabAllocationsForItem = (cartIndex: number) =>
    splitBillTabs
      .filter((tab) => tab.id !== activeSplitBillTab?.id)
      .map((tab) => ({ tab, qty: getTabAllocationQty(tab, cartIndex) }))
      .filter((entry) => entry.qty > 0);

  const splitBillItems = buildSplitBillLines(checkoutSplitBillTab);
  const splitBillPaidAllocations: SplitBillAllocation[] = checkoutSplitBillTab?.allocations ?? [];
  const splitBillTotal = calcTotalForCartLines(splitBillItems);
  const activeSplitBillTotal = calcTotalForCartLines(buildSplitBillLines(activeSplitBillTab));
  const checkoutDisplayTotal = splitBillCheckoutOpen ? splitBillTotal : total;

  const prevCartForSplitBillRef = useRef<typeof cart>([]);

  useEffect(() => {
    prevCartForSplitBillRef.current = [];
  }, [splitBillTableKey]);

  useEffect(() => {
    if (!splitBillTableKey) return;
    const oldCart = prevCartForSplitBillRef.current;
    syncSplitBillNewItemsToFirstTab(splitBillTableKey, oldCart, cart);
    prevCartForSplitBillRef.current = cart;
  }, [cart, splitBillTableKey, syncSplitBillNewItemsToFirstTab]);

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
      setCashTendered(checkoutDisplayTotal.toFixed(2));
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
      
      // Wait for all images (including QR base64 data URLs) to fully load before printing
      const triggerPrint = async () => {
        const imgs = iframeDoc.querySelectorAll('img');
        if (imgs.length > 0) {
          await Promise.allSettled(Array.from(imgs).map(async (img) => {
            try {
              if (typeof (img as HTMLImageElement).decode === 'function') {
                await (img as HTMLImageElement).decode();
              } else {
                await new Promise<void>((resolve) => {
                  if (img.complete && (img as HTMLImageElement).naturalWidth > 0) { resolve(); return; }
                  const onLoad = () => resolve();
                  const onError = () => resolve();
                  img.addEventListener('load', onLoad, { once: true });
                  img.addEventListener('error', onError, { once: true });
                });
              }
            } catch (e) {}
          }));
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      };
      setTimeout(() => { triggerPrint(); }, 500);
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
  const printHTMLAsImage = async (html: string, printerIp: string, paperWidth: string, beep: boolean = false, qrImageData: string = '', footerText: string = '', logoImageData: string = '', logoHtml: string = '') => {
    try {
      const { canUseOfflineNetworkPrint } = getPrintRuntime();
      const isLocalIP = printerIp.startsWith('192.168.') || printerIp.startsWith('10.') || printerIp.startsWith('172.');

      if (!canUseOfflineNetworkPrint && isLocalIP) {
        console.warn('[PRINT] Online runtime detected. Using browser print fallback instead of LAN API printing.');
        printWithIframe(logoHtml ? injectLogoIntoReceiptHtml(html, logoHtml) : html);
        return true;
      }

      console.log('[PRINT] Offline/local runtime detected. Printing via local API route to:', printerIp);

      // Pixel width matching the ESC/POS printer resolution
      const width = paperWidth === '80mm' ? 576 : 384;

      // Create a temporary iframe to render the HTML in isolation.
      // Using an iframe (instead of a div) guarantees the body width is honored
      // exactly, independent of the parent app's layout/viewport.
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = width + 'px';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Could not access iframe document');
      }
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      // Wait for fonts & layout to settle before measuring
      await new Promise(resolve => setTimeout(resolve, 800));
      try { await (iframe.contentWindow as any).document.fonts?.ready; } catch (e) {}

      const renderRoot = iframeDoc.body;

      // Wait for all images (including QR base64 data URLs) to fully decode
      const images = renderRoot.querySelectorAll('img');
      if (images.length > 0) {
        await Promise.allSettled(Array.from(images).map(async (img) => {
          try {
            // Use decode() for reliable image load detection (works for data URLs in iframes)
            if (typeof (img as HTMLImageElement).decode === 'function') {
              await (img as HTMLImageElement).decode();
            } else {
              // Fallback for browsers without decode()
              await new Promise<void>((resolve) => {
                if (img.complete && (img as HTMLImageElement).naturalWidth > 0) { resolve(); return; }
                const onLoad = () => resolve();
                const onError = () => resolve();
                img.addEventListener('load', onLoad, { once: true });
                img.addEventListener('error', onError, { once: true });
              });
            }
          } catch (e) {
            // Image decode failed, continue anyway
          }
        }));
        // Extra settle time after images load
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // QR/Logo images: ensure they are fully loaded and are base64 data URLs.
      // html2canvas clones the DOM and images in the clone may not have loaded yet.
      // Pre-convert all images to base64 data URLs so they are inlined in the HTML.
      const allImgs = renderRoot.querySelectorAll('img');
      if (allImgs.length > 0) {
        console.log('[PRINT] Found', allImgs.length, 'img elements in receipt');
        for (const img of Array.from(allImgs)) {
          const htmlImg = img as HTMLImageElement;
          const src = htmlImg.src || '';
          console.log('[PRINT] img src length:', src.length, 'naturalWidth:', htmlImg.naturalWidth, 'isDataUrl:', src.startsWith('data:'));
          if (!src.startsWith('data:') && htmlImg.naturalWidth > 0) {
            try {
              const tmpCvs = iframeDoc.createElement('canvas');
              tmpCvs.width = htmlImg.naturalWidth;
              tmpCvs.height = htmlImg.naturalHeight;
              tmpCvs.getContext('2d')?.drawImage(htmlImg, 0, 0);
              htmlImg.src = tmpCvs.toDataURL('image/png');
              console.log('[PRINT] Converted img to base64 data URL');
            } catch (e) {
              console.warn('[PRINT] Failed to convert img to data URL:', e);
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Convert HTML to canvas — scale 1 to match printer pixel width exactly
      const canvas = await html2canvas(renderRoot, {
        backgroundColor: '#ffffff',
        scale: 1, // Keep at 1 to match printer pixel width exactly (576/384px)
        logging: false,
        width: width,
        height: renderRoot.scrollHeight,
        windowWidth: width,
        windowHeight: renderRoot.scrollHeight,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        imageTimeout: 15000,
      });

      // Remove temporary iframe
      document.body.removeChild(iframe);

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
          beep: beep,
          qrImageData: qrImageData,
          footerText: footerText,
          logoImageData: logoImageData
        })
      });

      const result = await response.json().catch(() => ({} as { success?: boolean; error?: string }));

      if (!response.ok || !result.success) {
        const message = result.error || `Print request failed (${response.status})`;
        console.error('Print failed:', message);
        throw new Error(message);
      }

      return true;
    } catch (error) {
      console.error('Error printing HTML as image:', error);
      throw error;
    }
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;

    const itemsToSend = cart.filter(item => !item.sentToKitchen && !item.cancelled);

    if (itemsToSend.length === 0) {
      alert('All items have already been sent to kitchen');
      return;
    }

    const baseMs = Date.now();
    let sendIndex = 0;
    const sentCart = cart.map(item => {
      const clientLineId = item.clientLineId || createClientLineId();
      if (item.cancelled || item.sentToKitchen) return { ...item, clientLineId };
      const sentToKitchenTime = nextStaggeredKitchenTime(baseMs, sendIndex);
      sendIndex += 1;
      return { ...item, clientLineId, sentToKitchen: true, sentToKitchenTime };
    });

    try {
      await saveCurrentOrderToSupabase(sentCart);

      const store = usePosStore.getState();
      const tableKey = currentTable ? `table-${currentTable.id}` : null;
      const hadBillPrinted = tableKey ? store.tableBillPrinted[tableKey] === true : false;
      const patch: Record<string, unknown> = { cart: sentCart };
      if (tableKey && currentOrderType === 'dine-in') {
        patch.savedCarts = { ...store.savedCarts, [tableKey]: sentCart };
        if (hadBillPrinted) {
          patch.tablePostPrintKitchenSent = { ...store.tablePostPrintKitchenSent, [tableKey]: true };
        }
      }
      usePosStore.setState(patch);

      const tableLabel = currentTable?.table_number
        ? `${t.table} ${currentTable.table_number}`
        : t.takeout;
      enqueueKitchenPrint({
        id: `kitchen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: `${tableLabel} · ${itemsToSend.length} ${t.items || 'items'}`,
        tableNumber: currentTable?.table_number,
        tableId: currentTable?.id,
        itemCount: itemsToSend.length,
        cartSnapshot: JSON.stringify(itemsToSend),
      });

      clearCurrentTable();
      setMobilePosView('menu');
      setShowTableSelection(true);
    } catch (error: any) {
      console.error('[PRINT] Error sending to kitchen:', error);
      alert(`Failed to send to kitchen: ${error.message}`);
    }
  };

  const createKitchenTicketContent = (items: any[], printer: any) => {
    const currentTime = new Date().toLocaleString();
    const tableInfo = resolveKitchenTableLabel();

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
    const paperWidthMm = paperSize === '80mm' ? '80mm' : '58mm';
    const paperWidthPx = paperSize === '80mm' ? 576 : 384;
    const kitchenFs = paperSize === '80mm' ? 1.7 : 1.2;
    // Use custom font sizes from settings, with fallback to defaults
    const headerFontSizeSetting = receiptSettings.headerFontSize || 18;
    const bodyFontSizeSetting = receiptSettings.bodyFontSize || 12;
    const kfz = (n: number, type: 'header' | 'body' = 'body') => {
      if (type === 'header') {
        return Math.round(headerFontSizeSetting * kitchenFs / 18) + 2;
      }
      return Math.round(bodyFontSizeSetting * kitchenFs / 12) + 2;
    }; // font-size helper: scale + 2px
    
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
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Sans+Lao:wght@400;500;700&display=swap');
@page { size: ${paperWidthMm} auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Noto Sans Thai', 'Noto Sans Lao', 'Courier New', monospace;
  padding: ${Math.round(10*kitchenFs)}px;
  width: ${paperWidthPx}px;
  background: white;
  color: black;
  font-size: ${kfz(14)}px;
  line-height: 1.4;
}
.title {
  font-size: ${kfz(16, 'header')}px;
  font-weight: bold;
  text-align: center;
  margin: ${Math.round(5*kitchenFs)}px 0;
}
.separator {
  border-top: 1px dashed #000;
  margin: ${Math.round(5*kitchenFs)}px 0;
}
.info {
  font-size: ${kfz(14)}px;
  font-weight: 600;
  margin: ${Math.round(3*kitchenFs)}px 0;
}
.item {
  font-size: ${kfz(14)}px;
  margin: ${Math.round(3*kitchenFs)}px 0;
  word-wrap: break-word;
}
.portion {
  font-size: ${kfz(12)}px;
  margin: ${Math.round(2*kitchenFs)}px 0 ${Math.round(2*kitchenFs)}px ${Math.round(20*kitchenFs)}px;
  word-wrap: break-word;
}
.item-note {
  font-size: ${kfz(12)}px;
  margin: ${Math.round(2*kitchenFs)}px 0 ${Math.round(2*kitchenFs)}px ${Math.round(20*kitchenFs)}px;
  word-wrap: break-word;
  font-style: italic;
  color: #555;
}
.order-note {
  font-size: ${kfz(14)}px;
  margin: ${Math.round(5*kitchenFs)}px 0;
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
    const tableInfo = resolveKitchenTableLabel();
    const kitchenPaperSize = receiptSettings.kitchenBillSize || '80mm';
    const kitchenPageWidth = kitchenPaperSize === '80mm' ? '80mm' : '58mm';
    const kitchenBodyWidth = kitchenPaperSize === '80mm' ? 576 : 384;
    const kFs = kitchenPaperSize === '80mm' ? 1.7 : 1.2;
    const kFz = (n: number) => Math.round(n * kFs) + 2; // font-size helper: scale + 2px

    const ticketHtml = `
      <html>
        <head>
          <title>Kitchen Order - ${printer.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Sans+Lao:wght@400;500;700&display=swap');
            @page { size: ${kitchenPageWidth} auto; margin: 0; }
            body {
              font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif;
              padding: ${Math.round(8*kFs)}px;
              width: ${kitchenBodyWidth}px;
              margin: 0 auto;
              color: #000;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: ${Math.round(10*kFs)}px;
              margin-bottom: ${Math.round(15*kFs)}px;
            }
            .station {
              font-size: ${kFz(24)}px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .table-info {
              font-size: ${kFz(20)}px;
              font-weight: bold;
              margin: ${Math.round(10*kFs)}px 0;
            }
            .time {
              font-size: ${kFz(14)}px;
              color: #666;
            }
            .items {
              margin: ${Math.round(20*kFs)}px 0;
            }
            .item {
              border-bottom: 1px dashed #ccc;
              padding: ${Math.round(10*kFs)}px 0;
            }
            .item-name {
              font-size: ${kFz(18)}px;
              font-weight: bold;
            }
            .item-qty {
              font-size: ${kFz(24)}px;
              font-weight: bold;
              float: right;
            }
            .item-notes {
              font-size: ${kFz(14)}px;
              color: #666;
              font-style: italic;
              margin-top: ${Math.round(5*kFs)}px;
            }
            .footer {
              text-align: center;
              border-top: 2px solid #000;
              padding-top: ${Math.round(10*kFs)}px;
              margin-top: ${Math.round(20*kFs)}px;
              font-size: ${kFz(12)}px;
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
    const paperWidthMm = paperSize === '80mm' ? '80mm' : '58mm';
    const paperWidthPx = paperSize === '80mm' ? 576 : 384;
    const cancelFs = paperSize === '80mm' ? 1.7 : 1.2;
    // Use custom font sizes from settings, with fallback to defaults
    const headerFontSizeSetting = receiptSettings.headerFontSize || 18;
    const bodyFontSizeSetting = receiptSettings.bodyFontSize || 12;
    const cfz = (n: number, type: 'header' | 'body' = 'body') => {
      if (type === 'header') {
        return Math.round(headerFontSizeSetting * cancelFs / 18) + 2;
      }
      return Math.round(bodyFontSizeSetting * cancelFs / 12) + 2;
    }; // font-size helper: scale + 2px

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
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Sans+Lao:wght@400;500;700&display=swap');
@page { size: ${paperWidthMm} auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Noto Sans Thai', 'Noto Sans Lao', 'Courier New', monospace;
  padding: ${Math.round(10*cancelFs)}px;
  width: ${paperWidthPx}px;
  background: white;
  color: black;
  font-size: ${cfz(14)}px;
  line-height: 1.4;
}
.title {
  font-size: ${cfz(16, 'header')}px;
  font-weight: bold;
  text-align: center;
  margin: ${Math.round(5*cancelFs)}px 0;
}
.separator {
  border-top: 1px dashed #000;
  margin: ${Math.round(5*cancelFs)}px 0;
}
.info {
  font-size: ${cfz(14)}px;
  font-weight: 600;
  margin: ${Math.round(3*cancelFs)}px 0;
}
.header {
  font-size: ${cfz(14)}px;
  font-weight: 600;
  margin: ${Math.round(5*cancelFs)}px 0;
}
.item {
  font-size: ${cfz(14)}px;
  margin: ${Math.round(3*cancelFs)}px 0;
}
.portion {
  font-size: ${cfz(12)}px;
  margin: ${Math.round(2*cancelFs)}px 0 ${Math.round(2*cancelFs)}px ${Math.round(20*cancelFs)}px;
}
.item-note {
  font-size: ${cfz(12)}px;
  margin: ${Math.round(2*cancelFs)}px 0 ${Math.round(2*cancelFs)}px ${Math.round(20*cancelFs)}px;
  font-style: italic;
  color: #555;
}
.msg {
  font-size: ${cfz(14)}px;
  margin: ${Math.round(5*cancelFs)}px 0;
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
    const tableInfo = resolveKitchenTableLabel();
    const cancelPaperSize = receiptSettings.voidBillSize || '80mm';
    const cancelPageWidth = cancelPaperSize === '80mm' ? '80mm' : '58mm';
    const cancelBodyWidth = cancelPaperSize === '80mm' ? 576 : 384;
    const cFs = cancelPaperSize === '80mm' ? 1.7 : 1.2;
    const cFz = (n: number) => Math.round(n * cFs) + 2; // font-size helper: scale + 2px

    const ticketHtml = `
      <html>
        <head>
          <title>CANCEL ORDER - ${printer.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Sans+Lao:wght@400;500;700&display=swap');
            @page { size: ${cancelPageWidth} auto; margin: 0; }
            body {
              font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif;
              padding: ${Math.round(8*cFs)}px;
              width: ${cancelBodyWidth}px;
              margin: 0 auto;
              color: #000;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #dc2626;
              padding-bottom: ${Math.round(10*cFs)}px;
              margin-bottom: ${Math.round(15*cFs)}px;
              background: #fef2f2;
              padding: ${Math.round(15*cFs)}px;
              border-radius: 5px;
            }
            .cancel-badge {
              font-size: ${cFz(28)}px;
              font-weight: bold;
              text-transform: uppercase;
              color: #dc2626;
              margin-bottom: ${Math.round(10*cFs)}px;
            }
            .station {
              font-size: ${cFz(20)}px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .table-info {
              font-size: ${cFz(18)}px;
              font-weight: bold;
              margin: ${Math.round(10*cFs)}px 0;
            }
            .time {
              font-size: ${cFz(14)}px;
              color: #666;
            }
            .items {
              margin: ${Math.round(20*cFs)}px 0;
              background: #fef2f2;
              padding: ${Math.round(15*cFs)}px;
              border: 2px solid #dc2626;
              border-radius: 5px;
            }
            .item {
              padding: ${Math.round(10*cFs)}px 0;
            }
            .item-name {
              font-size: ${cFz(20)}px;
              font-weight: bold;
              color: #dc2626;
              text-decoration: line-through;
            }
            .item-qty {
              font-size: ${cFz(28)}px;
              font-weight: bold;
              float: right;
              color: #dc2626;
            }
            .item-notes {
              font-size: ${cFz(14)}px;
              color: #991b1b;
              font-style: italic;
              margin-top: ${Math.round(5*cFs)}px;
            }
            .footer {
              text-align: center;
              border-top: 2px solid #dc2626;
              padding-top: ${Math.round(10*cFs)}px;
              margin-top: ${Math.round(20*cFs)}px;
              font-size: ${cFz(12)}px;
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
            <strong style="color: #dc2626; font-size: ${cFz(18)}px;">⚠️ CANCELLED - DO NOT PREPARE ⚠️</strong>
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
    const tableInfo = resolveKitchenTableLabel();

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
      formatItemNoteForDb(cartItem.notes),
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

  // Table selection handlers
  const handleTableSelect = (table: Table | null, orderType: 'dine-in' | 'takeout') => {
    setCurrentTable(table, orderType);
    setMobilePosView('menu');
    setShowTableSelection(false);
    if (table && orderType === 'dine-in') {
      setTimeout(() => {
        void loadCurrentOrderFromSupabase(table);
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

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('table_id', table.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Failed to close pending table order:', error);
    }
  }, [currentTable, isSupabaseConfigured]);

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
      const sourceExistsInItems = items.some(item => {
        const source = (item as any).itemSource;
        return item.id === sourceId && (source === 'item' || (!source && item.category_id !== undefined && item.category_id !== null));
      });
      return {
        order_id: orderId,
        item_id: sourceExistsInItems ? sourceId : null,
        quantity: cartItem.quantity,
        price_at_time: cartItem.item.price,
        notes: [
          cartItem.clientLineId ? `Line: ${cartItem.clientLineId}` : undefined,
          `Item: ${cartItem.item.name}`,
          formatItemNoteForDb(cartItem.notes),
          cartItem.portionName ? `Portion: ${cartItem.portionName}` : undefined,
          cartItem.cancelledAt ? `CancelledAt: ${cartItem.cancelledAt}` : undefined,
          cartItem.sentToKitchen && cartItem.sentToKitchenTime ? `KitchenTime: ${cartItem.sentToKitchenTime}` : undefined,
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
  const fetchAvailableTables = async (): Promise<Table[]> => {
    if (!isSupabaseConfigured) return [];
    try {
      const { data } = await supabase
        .from('tables')
        .select('*')
        .neq('status', 'inactive')
        .order('display_order', { ascending: true });
      if (data) {
        setAvailableTables(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
    return [];
  };

  const resolveMergedSourceTables = (table: Table | null, tables: Table[]) => {
    if (!table?.merged_tables) return [];
    const numbers = table.merged_tables.split(',').map((n: string) => n.trim()).filter(Boolean);
    return tables.filter((tbl) => numbers.includes(tbl.table_number));
  };

  const openCancelMergeModal = async () => {
    if (!currentTable?.is_merged || !currentTable.merged_tables) return;
    const tables = await fetchAvailableTables();
    const sources = resolveMergedSourceTables(currentTable, tables);
    if (sources.length === 0) {
      alert(t.noMergedTablesFound);
      return;
    }
    setUnmergeSourceTableId(sources[0].id);
    setShowCancelMergeModal(true);
  };

  // Legacy: tables hidden via merged_into (old merges). New merges keep source visible as available.
  const isTableMergedAway = (_table: Table) => false;

  // Handle merge tables
  const handleMergeTables = async (targetTable: Table) => {
    if (!currentTable || !targetTable) return;

    if (currentTable.id === targetTable.id) {
      alert(t.cannotMergeSameTable);
      return;
    }

    try {
      const sourceTableId = currentTable.id;

      // Resolve pending order IDs for both tables
      const sourceOrderId = await resolveCurrentOrderId(currentTable, { allowTableFallback: true });
      const targetOrderId = await resolveCurrentOrderId(targetTable, { allowTableFallback: true });
      console.log('[MERGE] source:', sourceTableId, 'order:', sourceOrderId, '| target:', targetTable.id, 'order:', targetOrderId);

      // Determine the order to keep (target). Create one if target has none.
      let keepOrderId = targetOrderId;

      // Load cart items currently on source table (from Supabase order_items)
      let sourceOrderItems: any[] = [];
      if (sourceOrderId) {
        const { data: sItems, error: sErr } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', sourceOrderId);
        if (sErr) console.warn('[MERGE] source items load error:', sErr.message);
        sourceOrderItems = sItems || [];
        console.log('[MERGE] source items:', sourceOrderItems.length);
      }

      // If target has no order, create one so merged items have a place to live
      if (!keepOrderId) {
        console.log('[MERGE] target has no order, creating new...');
        const { data: newOrder, error: newOrderError } = await supabase
          .from('orders')
          .insert({
            table_id: targetTable.id,
            status: 'pending',
            total_amount: 0,
            payment_method: 'cash'
          })
          .select()
          .single();
        if (newOrderError) throw newOrderError;
        keepOrderId = newOrder.id;
        console.log('[MERGE] created order:', keepOrderId);

        // Move source items into the new target order
        if (sourceOrderItems.length > 0) {
          // Tag origin so the items can be returned to the source table on split
          const untaggedIds = sourceOrderItems
            .filter((it: any) => !it.origin_table_id)
            .map((it: any) => it.id);
          if (untaggedIds.length > 0) {
            const { error: tagError } = await supabase
              .from('order_items')
              .update({ origin_table_id: sourceTableId })
              .in('id', untaggedIds);
            if (tagError) throw tagError;
          }
          const { error: moveError } = await supabase
            .from('order_items')
            .update({ order_id: keepOrderId })
            .in('id', sourceOrderItems.map((it: any) => it.id));
          if (moveError) throw moveError;
          console.log('[MERGE] moved', sourceOrderItems.length, 'items to new target order');
        }
      } else {
        console.log('[MERGE] target has order, merging items...');
        // Load target's existing items
        const { data: tItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', keepOrderId);
        const targetItems = tItems || [];

        // Tag the target's own items so they stay on the target table when split
        const targetUntaggedIds = targetItems
          .filter((it: any) => !it.origin_table_id)
          .map((it: any) => it.id);
        if (targetUntaggedIds.length > 0) {
          const { error: targetTagError } = await supabase
            .from('order_items')
            .update({ origin_table_id: targetTable.id })
            .in('id', targetUntaggedIds);
          if (targetTagError) throw targetTagError;
        }

        // Move source items into the target order (re-assign order_id)
        if (sourceOrderItems.length > 0) {
          // Tag origin so the items can be returned to the source table on split
          const untaggedIds = sourceOrderItems
            .filter((it: any) => !it.origin_table_id)
            .map((it: any) => it.id);
          if (untaggedIds.length > 0) {
            const { error: tagError } = await supabase
              .from('order_items')
              .update({ origin_table_id: sourceTableId })
              .in('id', untaggedIds);
            if (tagError) throw tagError;
          }
          const { error: moveError } = await supabase
            .from('order_items')
            .update({ order_id: keepOrderId })
            .in('id', sourceOrderItems.map((it: any) => it.id));
          if (moveError) throw moveError;
          console.log('[MERGE] moved', sourceOrderItems.length, 'items to existing target order');
        }

        // Build merged cart preview: target items + source items
        sourceOrderItems = [...targetItems, ...sourceOrderItems];
      }

      // The source order is now empty (its items were moved to the target). Cancel it so
      // it doesn't linger as a stale pending order and confuse the next merge cycle.
      if (sourceOrderId && sourceOrderId !== keepOrderId) {
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', sourceOrderId);
      }

      // If source had no order to attach items, but cart has unsent items, copy them in
      if (sourceOrderItems.length === 0 && cart.length > 0) {
        const rows = cart.map((c: any) => ({
          order_id: keepOrderId,
          item_id: c.sourceItemId || c.item?.id || null,
          quantity: c.quantity,
          price_at_time: c.item?.price ?? 0,
          notes: c.notes || null
        }));
        const { error: insErr } = await supabase.from('order_items').insert(rows);
        if (insErr) throw insErr;
      }

      // Build the list of table numbers merged into the target (keep unique order).
      // Accumulates across chained merges: existing target list + source number + source's own list.
      const mergedNumbers: string[] = [];
      const pushNumbers = (value?: string | null) => {
        (value || '')
          .split(',')
          .map((n: string) => n.trim())
          .filter(Boolean)
          .forEach((n: string) => {
            if (!mergedNumbers.includes(n)) mergedNumbers.push(n);
          });
      };
      pushNumbers(targetTable.merged_tables);
      if (currentTable.table_number && !mergedNumbers.includes(currentTable.table_number)) {
        mergedNumbers.push(currentTable.table_number);
      }
      pushNumbers(currentTable.merged_tables);
      const mergedTablesValue = mergedNumbers.join(',');

      // Update target table: occupied + merged + current_order_id (target itself is never hidden)
      const { error: targetUpdateError } = await supabase
        .from('tables')
        .update({
          status: 'occupied',
          is_merged: true,
          merged_tables: mergedTablesValue,
          merged_into: null,
          current_order_id: keepOrderId
        })
        .eq('id', targetTable.id);
      if (targetUpdateError) throw targetUpdateError;

      // Release source table — show as available (visible in grid), orders live on target only
      const { error: sourceUpdateError } = await supabase
        .from('tables')
        .update({
          status: 'available',
          current_order_id: null,
          is_merged: false,
          merged_tables: null,
          merged_into: null,
        })
        .eq('id', sourceTableId);
      if (sourceUpdateError) throw sourceUpdateError;

      // Build an up-to-date target table object so the order can be resolved/loaded.
      // (targetTable from the picker may be stale: no current_order_id / wrong status.)
      const updatedTargetTable: Table = {
        ...targetTable,
        status: 'occupied',
        is_merged: true,
        merged_tables: mergedTablesValue,
        current_order_id: keepOrderId,
      };

      // Switch to target table (this also saves the current/source cart locally)
      setCurrentTable(updatedTargetTable, 'dine-in');

      // Clear both source and target saved carts so the merged order loads fresh from DB
      const sourceTableKey = `table-${sourceTableId}`;
      const targetTableKey = `table-${updatedTargetTable.id}`;
      const { savedCarts, tableBillPrinted } = usePosStore.getState();
      const newSavedCarts = { ...savedCarts };
      const newBillPrinted = { ...tableBillPrinted };
      delete newSavedCarts[sourceTableKey];
      delete newSavedCarts[targetTableKey];
      delete newBillPrinted[sourceTableKey];
      delete newBillPrinted[targetTableKey];
      usePosStore.setState({ savedCarts: newSavedCarts, tableBillPrinted: newBillPrinted, cart: [] });

      // Wait a tick then reload merged cart from target order
      setTimeout(async () => {
        await loadCurrentOrderFromSupabase(updatedTargetTable);
      }, 200);

      // Refresh the cached table list so the next merge/split cycle uses fresh data
      fetchAvailableTables();

      setShowMergeTableModal(false);
      alert(t.mergeSuccess);
    } catch (error: any) {
      console.error('Error merging tables:', error);
      const reason = error?.message || error?.details || String(error);
      alert(`Failed to merge tables: ${reason}`);
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
      // Save current cart items before switching (includes unsent local items)
      const itemsToTransfer = [...cart];
      const oldTableId = currentTable.id;

      // Resolve pending orders for both tables (so we can move them in the DB, not just locally)
      const sourceOrderId = await resolveCurrentOrderId(currentTable, { allowTableFallback: true });
      const targetOrderId = await resolveCurrentOrderId(targetTable, { allowTableFallback: true });

      let keepOrderId = targetOrderId;

      // Load source order items currently persisted in Supabase (sent-to-kitchen items)
      let sourceOrderItems: any[] = [];
      if (sourceOrderId) {
        const { data: sItems } = await supabase
          .from('order_items')
          .select('id')
          .eq('order_id', sourceOrderId);
        sourceOrderItems = sItems || [];
      }

      if (!keepOrderId) {
        if (sourceOrderId) {
          // Target has no order: move the whole source order over to the target table.
          // This relocates all its order_items at once, so nothing stays on the old table.
          const { error: moveOrderError } = await supabase
            .from('orders')
            .update({ table_id: targetTable.id })
            .eq('id', sourceOrderId);
          if (moveOrderError) throw moveOrderError;
          keepOrderId = sourceOrderId;
        }
        // If there is no source order either, only unsent local items exist; they are
        // carried over via savedCarts below and will be persisted when sent to kitchen.
      } else {
        // Target already has an order: move source items into it
        if (sourceOrderItems.length > 0) {
          const { error: moveItemsError } = await supabase
            .from('order_items')
            .update({ order_id: keepOrderId })
            .in('id', sourceOrderItems.map((it: any) => it.id));
          if (moveItemsError) throw moveItemsError;
        }
        // Source order is now empty; release it so it can't be resolved again
        if (sourceOrderId) {
          await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', sourceOrderId);
        }
      }

      // Occupy target table and point it at the kept order
      await supabase
        .from('tables')
        .update({ status: 'occupied', ...(keepOrderId ? { current_order_id: keepOrderId } : {}) })
        .eq('id', targetTable.id);

      // Release source table
      await supabase
        .from('tables')
        .update({ status: 'available', current_order_id: null, is_merged: false, merged_tables: null })
        .eq('id', oldTableId);

      // Build an up-to-date target table object (the picker copy may be stale)
      const updatedTargetTable: Table = {
        ...targetTable,
        status: 'occupied',
        current_order_id: keepOrderId || targetTable.current_order_id,
      };

      // Switch to target table (this saves the current/source cart locally first)
      setCurrentTable(updatedTargetTable, 'dine-in');

      // Clear old table's saved cart and carry transferred (incl. unsent) items to the target
      const { savedCarts, tableBillPrinted } = usePosStore.getState();
      const newSavedCarts = { ...savedCarts };
      const newBillPrinted = { ...tableBillPrinted };
      delete newSavedCarts[`table-${oldTableId}`];
      delete newBillPrinted[`table-${oldTableId}`];
      newSavedCarts[`table-${updatedTargetTable.id}`] = itemsToTransfer;
      newBillPrinted[`table-${updatedTargetTable.id}`] = false;
      usePosStore.setState({ savedCarts: newSavedCarts, tableBillPrinted: newBillPrinted, cart: itemsToTransfer });

      // Reload the merged order from Supabase so DB and local cart stay in sync
      setTimeout(async () => {
        await loadCurrentOrderFromSupabase(updatedTargetTable);
      }, 200);

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

      // Bring back any source tables that were hidden under this merged table
      await supabase
        .from('tables')
        .update({ merged_into: null })
        .eq('merged_into', currentTable.id);

      // If current table has no items left, release it and reset is_merged
      if (remainingItems.length === 0) {
        await supabase
          .from('tables')
          .update({
            status: 'available',
            current_order_id: null,
            is_merged: false,  // รีเซ็ตสถานะรวมโต๊ะ
            merged_tables: null
          })
          .eq('id', currentTable.id);
        clearCurrentTable();
      } else {
        // ถ้ายังมีเมนูเหลืออยู่ ให้รีเซ็ตสถานะรวมโต๊ะ
        await supabase
          .from('tables')
          .update({ is_merged: false, merged_tables: null })
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

  // Cancel merge: move all orders from a merged source table to a destination of user's choice
  const handleUnmergeToTable = async (destTable: Table) => {
    if (!currentTable || !unmergeSourceTableId) return;

    const sourceTableId = unmergeSourceTableId;
    const sourceTable = availableTables.find((tbl) => tbl.id === sourceTableId);
    if (destTable.id === sourceTableId && sourceTable && sourceTable.status !== 'available') {
      alert(t.tableOccupiedRestoreBlocked);
      return;
    }

    if (destTable.id === currentTable.id) {
      alert(t.cannotUnmergeToSameTable || 'Cannot move orders to the current merged table');
      return;
    }

    try {
      const targetTableId = currentTable.id;
      const orderId = await resolveCurrentOrderId(currentTable, { allowTableFallback: true });
      if (!orderId) throw new Error('No order found on merged table');

      const { data: allItems, error: itemsErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      if (itemsErr) throw itemsErr;

      const sourceTable = availableTables.find((tbl) => tbl.id === sourceTableId);
      const sourceNumber = sourceTable?.table_number || '';
      let sourceItems = (allItems || []).filter((it) => it.origin_table_id === sourceTableId);

      // Fallback for items merged before origin_table_id existed: none tagged to other origins
      if (sourceItems.length === 0 && sourceNumber && (allItems || []).length > 0) {
        const otherOrigins = new Set(
          (allItems || [])
            .map((it) => it.origin_table_id)
            .filter((id) => id && id !== targetTableId && id !== sourceTableId)
        );
        if (otherOrigins.size === 0) {
          sourceItems = allItems || [];
        }
      }

      if (sourceItems.length > 0) {
        let destOrderId = destTable.current_order_id || null;
        if (destTable.status === 'available' || !destOrderId) {
          const { data: newOrder, error: newOrderErr } = await supabase
            .from('orders')
            .insert({
              table_id: destTable.id,
              status: 'pending',
              total_amount: 0,
              payment_method: 'cash',
            })
            .select()
            .single();
          if (newOrderErr) throw newOrderErr;
          destOrderId = newOrder.id;
        } else {
          destOrderId = (await resolveCurrentOrderId(destTable, { allowTableFallback: true })) || destOrderId;
        }

        const { error: moveErr } = await supabase
          .from('order_items')
          .update({ order_id: destOrderId, origin_table_id: destTable.id })
          .in('id', sourceItems.map((it) => it.id));
        if (moveErr) throw moveErr;

        await supabase
          .from('tables')
          .update({
            status: 'occupied',
            current_order_id: destOrderId,
            is_merged: false,
            merged_tables: null,
            merged_into: null,
          })
          .eq('id', destTable.id);
      }

      const remainingNumbers = (currentTable.merged_tables || '')
        .split(',')
        .map((n: string) => n.trim())
        .filter((n: string) => n && n !== sourceNumber);
      const newMergedValue = remainingNumbers.length > 0 ? remainingNumbers.join(',') : null;
      const stillMerged = remainingNumbers.length > 0;

      await supabase
        .from('tables')
        .update({
          is_merged: stillMerged,
          merged_tables: newMergedValue,
        })
        .eq('id', targetTableId);

      const remainingOnTarget = (allItems || []).filter(
        (it) => !sourceItems.some((si) => si.id === it.id)
      );

      if (remainingOnTarget.length === 0) {
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
        await supabase
          .from('tables')
          .update({
            status: 'available',
            current_order_id: null,
            is_merged: false,
            merged_tables: null,
            merged_into: null,
          })
          .eq('id', targetTableId);

        const sc = usePosStore.getState().savedCarts;
        const ns = { ...sc };
        delete ns[`table-${targetTableId}`];
        usePosStore.setState({ savedCarts: ns });
        clearCurrentTable();
      } else {
        const updatedCurrent: Table = {
          ...currentTable,
          is_merged: stillMerged,
          merged_tables: newMergedValue,
        };
        setCurrentTable(updatedCurrent, 'dine-in');

        const sc = usePosStore.getState().savedCarts;
        const bp = usePosStore.getState().tableBillPrinted;
        const ns = { ...sc };
        const nb = { ...bp };
        delete ns[`table-${targetTableId}`];
        delete ns[`table-${destTable.id}`];
        delete nb[`table-${targetTableId}`];
        delete nb[`table-${destTable.id}`];
        usePosStore.setState({ savedCarts: ns, tableBillPrinted: nb, cart: [] });

        setTimeout(async () => {
          await loadCurrentOrderFromSupabase(updatedCurrent);
        }, 200);
      }

      await fetchAvailableTables();
      setShowCancelMergeModal(false);
      alert(t.unmergeSuccess);
    } catch (error: any) {
      console.error('Error cancelling merge:', error);
      const reason = error?.message || error?.details || String(error);
      alert(`Failed to cancel merge: ${reason}`);
    }
  };

  const handleCheckout = async () => {
    if (activeTab === 'cash') {
      const tendered = parseFloat(cashTendered || '0');
      const amountDue = checkoutDisplayTotal;
      if (!Number.isFinite(tendered) || tendered < amountDue) {
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
    const isSplitBill = splitBillCheckoutOpen && splitBillItems.length > 0;
    const cartBeforeSplitCheckout = [...cart];

    const success = await checkout(
      method,
      note,
      tenderedAmount,
      selectedBank,
      isSplitBill ? splitBillTotal : total,
      isSplitBill
        ? {
            partial: true,
            itemsOverride: splitBillItems,
            paidAllocations: splitBillPaidAllocations,
            paidTabId: checkoutSplitBillTab?.id,
          }
        : undefined
    );
    setIsCheckingOut(false);
    if (success) {
      if (isSplitBill) {
        if (isSupabaseConfigured) {
          for (const alloc of splitBillPaidAllocations) {
            const cartIndex = resolveCartIndexFromLineKey(cartBeforeSplitCheckout, alloc.lineKey);
            if (cartIndex < 0) continue;
            const line = cartBeforeSplitCheckout[cartIndex];
            if (!line?.orderItemId) continue;
            if (alloc.quantity >= line.quantity) {
              await supabase.from('order_items').delete().eq('id', line.orderItemId);
            } else {
              await supabase
                .from('order_items')
                .update({ quantity: line.quantity - alloc.quantity })
                .eq('id', line.orderItemId);
            }
          }
        }
        setShowSplitBillModal(false);
        setSplitBillCheckoutOpen(false);
        setSplitBillCheckoutTabId(null);
        alert(t.splitBillSuccess);
      } else {
        await closeCurrentPendingOrder(tableBeingCheckedOut);
        clearCurrentTable();
      }

      setIsCheckoutModalOpen(false);
      setNote('');
      setTip('');
      setDiscount('');
      setDiscountType('fixed');
      setCashTendered('');
    } else {
      alert(`Checkout failed. Order was not saved.${checkoutError ? `\nReason: ${checkoutError}` : ''}`);
    }
  };

  const handlePrintSplitBill = () => {
    if (!activeSplitBillTab || tabAllocationTotal(activeSplitBillTab) === 0) {
      alert(t.selectAtLeastOneItem);
      return;
    }
    void handlePrintBill({
      itemsOverride: buildSplitBillLines(activeSplitBillTab),
      markBillPrinted: false,
      billLabel: activeSplitBillTab.name,
    });
  };

  const openSplitBillCheckout = () => {
    if (!activeSplitBillTab || tabAllocationTotal(activeSplitBillTab) === 0) {
      alert(t.selectAtLeastOneItem);
      return;
    }
    setSplitBillCheckoutTabId(activeSplitBillTab.id);
    setSplitBillCheckoutOpen(true);
    setCashTendered('');
    setIsCheckoutModalOpen(true);
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

  // Resize QR image to fit thermal paper width.
  // Thermal printer at 203 DPI: 1px ≈ 0.125mm, so 200px ≈ 25mm (good QR size).
  // 80mm: 240px QR (~30mm) | 58mm: 180px QR (~22mm)
  const resizeQrForPrint = (qrDataUrl: string, paperWidth: string): Promise<string> => {
    return new Promise((resolve) => {
      const targetSize = paperWidth === '80mm' ? 240 : 180;
      const img = new Image();
      img.onload = () => {
        try {
          const cvs = document.createElement('canvas');
          cvs.width = targetSize;
          cvs.height = targetSize;
          const ctx = cvs.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetSize, targetSize);
            // Use crisp-edges rendering for QR to preserve sharp pixel edges
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, targetSize, targetSize);
            resolve(cvs.toDataURL('image/png'));
            return;
          }
        } catch (e) {
          console.warn('[PRINT] QR resize failed, using original:', e);
        }
        resolve(qrDataUrl);
      };
      img.onerror = () => resolve(qrDataUrl);
      img.src = qrDataUrl;
    });
  };

  // Combine duplicate menu lines (same item + portion + price + notes) by summing their
  // quantities. After merging tables the same menu item can appear as separate lines, and
  // the printed bill should show one line with the total quantity.
  const combineCartLines = (lines: any[]) => {
    const map = new Map<string, any>();
    const order: string[] = [];
    for (const line of lines) {
      const key = [
        line.sourceItemId || line.item?.id || line.item?.name || '',
        line.portionName || '',
        line.item?.price ?? 0,
        line.notes || ''
      ].join('|');
      const existing = map.get(key);
      if (existing) {
        existing.quantity += line.quantity;
      } else {
        map.set(key, { ...line, quantity: line.quantity });
        order.push(key);
      }
    }
    return order.map(k => map.get(k));
  };

  const handlePrintBill = async (options?: { itemsOverride?: typeof cart; markBillPrinted?: boolean; billLabel?: string }) => {
    const printLines = options?.itemsOverride ?? cart;
    const activeLines = printLines.filter((cartItem) => !cartItem.cancelled);
    if (activeLines.length === 0) return;

    const isPartialBill = !!options?.itemsOverride;
    const shouldMarkPrinted = options?.markBillPrinted ?? !isPartialBill;
    const breakdown = isPartialBill
      ? calcBreakdownForCartLines(activeLines)
      : { subtotal: cartTotal, discount: discountAmount, tax, tip: tipAmount, total };
    const printSubtotal = breakdown.subtotal;
    const printDiscount = breakdown.discount;
    const printTax = breakdown.tax;
    const printTip = breakdown.tip;
    const printTotal = breakdown.total;

    const paymentMethodLabel = activeTab === 'transfer' ? t.transfer : t.cash;
    const tendered = parseFloat(cashTendered || '0');
    const change = Math.max(0, tendered - printTotal);
    const selectedTransferBank = transferBanks.find((b) => b.id === selectedTransferBankId);

    const cartItemsHtml = combineCartLines(activeLines).map((cartItem: any) =>
      '<tr>' +
      '<td style="padding: 2px 0; text-align: left;">' + cartItem.item.name + '</td>' +
      '<td style="padding: 2px 0; text-align: center;">' + cartItem.quantity + '</td>' +
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
      '<span>' + formatCurrency(printTip) + '</span>' +
      '</div>';
    const discountHtml = printDiscount > 0
      ? '<div class="flex justify-between" style="color:#dc2626;">' +
      '<span>' + t.discount + (discountType === 'percent' ? ' (' + Math.min(rawDiscountValue, 100) + '%)' : '') + '</span>' +
      '<span>-' + formatCurrency(printDiscount) + '</span>' +
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
    const receiptPaperSize = receiptSettings.receiptSize || '80mm';
    const receiptPageWidth = receiptPaperSize === '80mm' ? '80mm' : '58mm';
    const receiptBodyWidth = receiptPaperSize === '80mm' ? 576 : 384;
    const fs = receiptPaperSize === '80mm' ? 1.7 : 1.2;
    const headerFontSizeSetting = receiptSettings.headerFontSize || 18;
    const totalFontSizeSetting = receiptSettings.totalFontSize || 18;
    const bodyFontSizeSetting = receiptSettings.bodyFontSize || 12;
    const fzHeader = (n: number) => Math.round((n || headerFontSizeSetting) * fs); // use custom header font size
    const fzTotal = (n: number) => Math.round((n || totalFontSizeSetting) * fs); // use custom total font size
    const fzBody = (n: number) => Math.round((n || bodyFontSizeSetting) * fs); // use custom body font size

    const transferQrHtml = (receiptSettings.showQrCode !== false && bankForDisplay?.qrCodeImage)
      ? '<div style="text-align:center; margin-top: ' + Math.round(12*fs) + 'px; padding-top: ' + Math.round(10*fs) + 'px; border-top: 1px dotted #000;">' +
      '<div class="font-bold" style="font-size: ' + fzBody(14) + 'px; margin-bottom: ' + Math.round(4*fs) + 'px;">' + t.scanToPay + '</div>' +
      '</div>'
      : '';

    // QR image data sent separately to thermal printer (avoids dithering destroying QR pattern)
    // Resize QR to fit paper width so it prints at appropriate size
    const receiptSize = receiptSettings.receiptSize || '80mm';
    const rawQrData = (receiptSettings.showQrCode !== false && bankForDisplay?.qrCodeImage)
      ? bankForDisplay.qrCodeImage
      : '';
    const qrImageData = rawQrData ? await resizeQrForPrint(rawQrData, receiptSize) : '';

    const logoTargetWidth = getLogoTargetWidth(receiptSize as '58mm' | '80mm');
    const rawLogoData = generalSettings.storeLogo || '';
    const logoImageData = rawLogoData
      ? await resizeImageForPrint(rawLogoData, logoTargetWidth)
      : '';
    const logoHtml = logoImageData ? buildLogoHtml(logoImageData, logoTargetWidth) : '';

    const receiptHtml =
      '<html>' +
      '<head>' +
      '<title>Bill Preview</title>' +
      '<meta charset="UTF-8">' +
      '<style>' +
      "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Sans+Lao:wght@400;500;700&display=swap');" +
      `@page { size: ${receiptPageWidth} auto; margin: 3mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }` +
      "* { font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif; box-sizing: border-box; }" +
      "body { font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif; padding: 0; width: 100%; max-width: 100%; margin: 0 auto; color: #000; box-sizing: border-box; overflow-x: hidden; word-wrap: break-word; }" +
      '.text-center { text-align: center; }' +
      '.mb-4 { margin-bottom: ' + Math.round(16*fs) + 'px; }' +
      '.mt-6 { margin-top: ' + Math.round(24*fs) + 'px; }' +
      '.text-xs { font-size: ' + fzBody(10) + 'px; }' +
      '.text-sm { font-size: ' + fzBody(12) + 'px; }' +
      '.font-bold { font-weight: bold; }' +
      '.flex { display: flex; justify-content: space-between; }' +
      '.border-y { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: ' + Math.round(10*fs) + 'px 0; margin: ' + Math.round(10*fs) + 'px 0; }' +
      '.space-y-1 > div { margin-bottom: ' + Math.round(4*fs) + 'px; }' +
      "table { width: 100%; border-collapse: collapse; font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif; table-layout: fixed; max-width: 100%; }" +
      "th, td { font-size: " + fzBody(bodyFontSizeSetting) + "px; font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; white-space: normal; padding: 3px 2px; line-height: 1.3; vertical-align: top; }" +
      (receiptPaperSize === '80mm' 
        ? "th:nth-child(1), td:nth-child(1) { width: 40%; text-align: left; }" +
          "th:nth-child(2), td:nth-child(2) { width: 12%; text-align: center; }" +
          "th:nth-child(3), td:nth-child(3) { width: 24%; text-align: right; }" +
          "th:nth-child(4), td:nth-child(4) { width: 24%; text-align: right; }"
        : "th:nth-child(1), td:nth-child(1) { width: 40%; text-align: left; }" +
          "th:nth-child(2), td:nth-child(2) { width: 12%; text-align: center; }" +
          "th:nth-child(3), td:nth-child(3) { width: 24%; text-align: right; }" +
          "th:nth-child(4), td:nth-child(4) { width: 24%; text-align: right; }"
      ) +
      "h1, h2, h3, h4, h5, h6, p, div, span { font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif; max-width: 100%; }" +
      '@media print { @page { size: ' + receiptPageWidth + ' auto; margin: 3mm; } body { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; overflow-x: hidden; } table { width: 100% !important; max-width: 100% !important; } img { max-width: 100% !important; height: auto !important; } }' +
      '</style>' +
      '</head>' +
      '<body style="width: ' + receiptBodyWidth + 'px; max-width: ' + receiptBodyWidth + 'px;">' +
      '<div class="text-center mb-4" style="max-width: 100%; overflow-x: hidden; width: 100%;">' +
      '<h3 class="font-bold" style="margin:0 0 ' + Math.round(2*fs) + 'px 0; font-size: ' + fzHeader(headerFontSizeSetting) + 'px; word-wrap: break-word;">' + (generalSettings.storeName || '') + '</h3>' +
      (receiptSettings.storeAddress ? '<div class="text-xs" style="margin-bottom:' + Math.round(2*fs) + 'px; word-wrap: break-word;">' + receiptSettings.storeAddress + '</div>' : '') +
      (receiptSettings.phoneNumber ? '<div class="text-xs" style="margin-bottom:' + Math.round(2*fs) + 'px; word-wrap: break-word;">' + receiptSettings.phoneNumber + '</div>' : '') +
      (receiptSettings.headerText ? '<div class="text-xs mt-2" style="word-wrap: break-word;">' + receiptSettings.headerText + '</div>' : '') +
      (isPartialBill ? '<div class="text-xs mt-2 font-bold" style="margin-top:' + Math.round(6*fs) + 'px; word-wrap: break-word;">' + (options?.billLabel || t.splitBill) + '</div>' : '') +
      '</div>' +
      '<div class="text-xs mb-4">' +
      t.date + ': ' + new Date().toLocaleString() +
      (receiptSettings.showTableNumber !== false && currentTable ? '<br/>' + t.table + ': ' + currentTable.table_number : '') +
      '</div>' +
      '<div class="border-y text-xs">' +
      '<table>' +
      '<thead>' +
      '<tr>' +
      '<th style="text-align:left; padding-bottom: ' + Math.round(4*fs) + 'px;">' + t.item + '</th>' +
      '<th style="text-align:right; padding-bottom: ' + Math.round(4*fs) + 'px;">' + t.unit + '</th>' +
      '<th style="text-align:right; padding-bottom: ' + Math.round(4*fs) + 'px;">' + t.price + '</th>' +
      '<th style="text-align:right; padding-bottom: ' + Math.round(4*fs) + 'px;">' + t.total + '</th>' +
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
      '<span>' + formatCurrency(printSubtotal) + '</span>' +
      '</div>' +
      discountHtml +
      '<div class="flex justify-between">' +
      `<span>${t.tax} (${generalSettings.taxRate}%)</span>` +
      '<span>' + formatCurrency(printTax) + '</span>' +
      '</div>' +
      tipHtml +
      paymentMethodHtml +
      cashDetailsHtml +
      transferDetailsHtml +
      noteHtml +
      '</div>' +
      '<div style="text-align: center; margin-top: ' + Math.round(10*fs) + 'px; border-top: 1px dashed #000; padding-top: ' + Math.round(10*fs) + 'px;">' +
      '<div style="display: flex; justify-content: center; align-items: center; gap: ' + Math.round(10*fs) + 'px; margin-bottom: ' + Math.round(12*fs) + 'px;">' +
      '<div style="font-weight: bold; font-size: ' + fzTotal(totalFontSizeSetting) + 'px;">' + t.total.toUpperCase() + '</div>' +
      '<div style="font-weight: bold; font-size: ' + fzTotal(totalFontSizeSetting) + 'px;">' + formatCurrency(printTotal) + '</div>' +
      '</div>' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: ' + Math.round(10*fs) + 'px; text-align: center;">' +
      '<div>' +
      '<div style="font-size: ' + fzTotal(totalFontSizeSetting * 0.7) + 'px; color: #666;">THB</div>' +
      '<div style="font-weight: bold; font-size: ' + fzTotal(totalFontSizeSetting) + 'px;">฿' + Math.round(printTotal / (currencySettings.thbRate || 36.5)).toLocaleString('en-US') + '</div>' +
      '</div>' +
      '<div>' +
      '<div style="font-size: ' + fzTotal(totalFontSizeSetting * 0.7) + 'px; color: #666;">USD</div>' +
      '<div style="font-weight: bold; font-size: ' + fzTotal(totalFontSizeSetting) + 'px;">$' + (printTotal / currencySettings.currencyRate).toFixed(2) + '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      transferQrHtml +
      '</body>' +
      '</html>';

    const printerId = receiptSettings.receiptPrinter;
    let targetPrinter = null;
    
    if (printerId) {
      targetPrinter = printerConfigs.find((p: any) => p.id === printerId && p.enabled);
    } else {
      targetPrinter = printerConfigs.find((p: any) => p.isDefault && p.enabled);
    }

    const markPrintedIfNeeded = () => {
      if (shouldMarkPrinted) markTableBillPrinted();
    };

    const receiptHtmlWithLogo = injectLogoIntoReceiptHtml(receiptHtml, logoHtml);

    // Network printer — fire-and-forget in background
    if (targetPrinter && targetPrinter.ipAddress !== 'System-Driver') {
      printHTMLAsImage(receiptHtml, targetPrinter.ipAddress, receiptSize, false, qrImageData, receiptSettings.footerText || '', logoImageData, logoHtml)
        .then(() => markPrintedIfNeeded())
        .catch(err => {
          console.error('Failed to print bill via network:', err);
          alert(`Failed to print bill: ${err.message}`);
        });
      return;
    }

    // Check if running in Electron and silentPrint is enabled
    if (typeof window !== 'undefined' && (window as any).electronAPI && silentPrint) {
      try {
        const result = await (window as any).electronAPI.printSilent(receiptHtmlWithLogo, targetPrinter?.name || '');
        if (result.success) {
          console.log('Silent print successful');
          markPrintedIfNeeded();
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
      printWindow.document.write(receiptHtmlWithLogo);
      printWindow.document.close();
      
      // Wait for content AND all images (especially QR base64 data URLs) to fully load before printing
      const triggerPrint = async () => {
        // Wait for all images to decode
        const imgs = printWindow.document.querySelectorAll('img');
        if (imgs.length > 0) {
          await Promise.allSettled(Array.from(imgs).map(async (img) => {
            try {
              if (typeof (img as HTMLImageElement).decode === 'function') {
                await (img as HTMLImageElement).decode();
              } else {
                await new Promise<void>((resolve) => {
                  if (img.complete && (img as HTMLImageElement).naturalWidth > 0) { resolve(); return; }
                  const onLoad = () => resolve();
                  const onError = () => resolve();
                  img.addEventListener('load', onLoad, { once: true });
                  img.addEventListener('error', onError, { once: true });
                });
              }
            } catch (e) {}
          }));
          // Extra settle time
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        printWindow.focus();
        printWindow.print();
        markPrintedIfNeeded();
        
        // Only close if silentPrint is enabled
        if (silentPrint) {
          setTimeout(() => {
            printWindow.close();
          }, 500);
        }
      };
      printWindow.onload = () => { triggerPrint(); };
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
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-blue-900 text-lg">
                            {t.table} {currentTable?.table_number}
                          </div>
                          {currentTable?.is_merged && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 border border-orange-300">
                              <Users className="h-3 w-3" />
                              {currentTable?.merged_tables
                                ? `${t.mergedWith} ${currentTable.merged_tables.split(',').join(', ')}`
                                : t.mergedBadge}
                            </span>
                          )}
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
                  <KitchenQueueButton />
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
                          onClick={() => void openCancelMergeModal()}
                          className="hidden lg:flex border-orange-300 text-orange-700 hover:bg-orange-50 font-medium"
                        >
                          {t.cancelMergeOrder}
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
      <div className={`${mobilePosView === 'order' ? 'flex' : 'hidden'} w-full flex-col border-l border-zinc-200 bg-white lg:flex lg:w-[30rem] h-full overflow-y-auto lg:overflow-visible`}>
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 sticky top-0 bg-white z-10">
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
                                ? (
                                  <>
                                    {t.takeout}
                                    {order.orderNumber != null && (
                                      <span className="ml-1 text-green-700">{t.orderNumber}{order.orderNumber}</span>
                                    )}
                                  </>
                                )
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

        <div className="flex-none lg:flex-1 overflow-visible lg:overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-1 lg:h-full flex-col items-center justify-center text-zinc-500 py-12">
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
                  <div key={itemKey} className={`${showSentBadge ? 'opacity-60 bg-zinc-50' : ''} p-2 rounded-lg border ${showSentBadge ? 'border-zinc-200' : 'border-zinc-100'} space-y-2`}>
                    <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
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
                    <div className="flex items-center gap-2 shrink-0">
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
                    <div className="min-w-[80px] text-right font-medium whitespace-nowrap shrink-0">
                      {formatCurrency(cartItem.item.price * cartItem.quantity)}
                    </div>
                    </div>
                    {!cartItem.cancelled && (
                      isSentToKitchen ? (
                        cartItem.notes ? (
                          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5 italic">
                            <span className="font-medium not-italic">{t.note}: </span>
                            {cartItem.notes}
                          </div>
                        ) : null
                      ) : (
                        <Input
                          key={`cart-note-${itemKey}`}
                          className="h-8 text-xs bg-zinc-50 border-zinc-200 placeholder:text-zinc-400"
                          placeholder={t.itemNotePlaceholder}
                          value={cartItem.notes || ''}
                          onChange={(e) => updateCartItemNotesByIndex(index, e.target.value)}
                        />
                      )
                    )}
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
                  onClick={() => void openCancelMergeModal()}
                  className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50 font-medium"
                >
                  {t.cancelMergeOrder}
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
              onClick={() => void handlePrintBill()}
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
              <>
              {currentOrderType === 'dine-in' && currentTable && cart.filter(i => !i.cancelled).length >= 2 && (
                <Button
                  variant="outline"
                  className="h-12 px-4 border-violet-300 text-violet-700 hover:bg-violet-50 font-medium"
                  onClick={() => {
                    const tabs = ensureSplitBillTabs();
                    setEditingSplitBillTabId(null);
                    if (splitBillTableKey && tabs[0]?.id) {
                      setTableSplitBills(splitBillTableKey, tabs, tabs[0].id);
                    }
                    setShowSplitBillModal(true);
                  }}
                  disabled={isCheckingOut}
                >
                  {t.splitBill}
                </Button>
              )}
              <Dialog
                open={isCheckoutModalOpen}
                onOpenChange={(open) => {
                  setIsCheckoutModalOpen(open);
                  if (!open) {
                    setSplitBillCheckoutOpen(false);
                    setSplitBillCheckoutTabId(null);
                    setIsCashInputFocused(false);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="flex-1 h-12 text-lg"
                    disabled={cart.length === 0 || isCheckingOut}
                    onClick={() => setSplitBillCheckoutOpen(false)}
                  >
                    {t.checkout}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>
                    {splitBillCheckoutOpen
                      ? `${t.splitBill}${checkoutSplitBillTab ? ` — ${checkoutSplitBillTab.name}` : ''}`
                      : t.completeOrder}
                  </DialogTitle>
                  <DialogDescription>
                    {t.totalAmount} <span className="font-bold text-lg text-zinc-900">{formatCurrency(checkoutDisplayTotal)}</span>
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
                            <span className="font-bold">{formatCurrency(checkoutDisplayTotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">{t.tendered}</span>
                            <span className="font-medium">{formatCurrency(parseFloat(cashTendered || '0'))}</span>
                          </div>
                          <div className="border-t border-zinc-200 pt-2 flex justify-between font-bold text-lg">
                            <span className={parseFloat(cashTendered || '0') >= checkoutDisplayTotal ? "text-green-600" : "text-red-600"}>
                              {parseFloat(cashTendered || '0') >= checkoutDisplayTotal ? t.change : t.due}
                            </span>
                            <span className={parseFloat(cashTendered || '0') >= checkoutDisplayTotal ? "text-green-600" : "text-red-600"}>
                              {formatCurrency(Math.abs((parseFloat(cashTendered || '0') - checkoutDisplayTotal)))}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {(() => {
                            const exact = checkoutDisplayTotal;
                            // Round to next 1k, 10k, 50k, 100k
                            const nextRoundAmounts = [
                              Math.ceil(checkoutDisplayTotal / 1000) * 1000,
                              Math.ceil(checkoutDisplayTotal / 5000) * 5000,
                              Math.ceil(checkoutDisplayTotal / 10000) * 10000,
                              Math.ceil(checkoutDisplayTotal / 20000) * 20000,
                              Math.ceil(checkoutDisplayTotal / 50000) * 50000,
                              Math.ceil(checkoutDisplayTotal / 100000) * 100000,
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
                      onClick={() => void handlePrintBill()}
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
            </>
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
              .filter(table => table.id !== currentTable?.id && table.status !== 'inactive' && !isTableMergedAway(table))
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
              .filter(table => table.id !== currentTable?.id && table.status !== 'inactive' && !isTableMergedAway(table))
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

      {/* Cancel Merge Order Modal */}
      <Dialog open={showCancelMergeModal} onOpenChange={setShowCancelMergeModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.cancelMergeOrder}</DialogTitle>
            <DialogDescription>{t.cancelMergeDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {(() => {
              const mergedSources = resolveMergedSourceTables(currentTable, availableTables);
              const selectedSource = mergedSources.find((tbl) => tbl.id === unmergeSourceTableId);
              const destTables = availableTables.filter(
                (table) =>
                  table.id !== currentTable?.id &&
                  (table.status === 'available' || table.id === unmergeSourceTableId)
              );

              return (
                <>
                  {mergedSources.length > 1 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-zinc-700">{t.selectMergedTable}</h3>
                      <div className="flex flex-wrap gap-2">
                        {mergedSources.map((table) => (
                          <Button
                            key={table.id}
                            type="button"
                            variant={unmergeSourceTableId === table.id ? 'default' : 'outline'}
                            className={unmergeSourceTableId === table.id ? 'bg-orange-600 hover:bg-orange-700' : ''}
                            onClick={() => setUnmergeSourceTableId(table.id)}
                          >
                            {t.table} {table.table_number}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-zinc-700">
                      {t.selectDestinationForOrders.replace(
                        '{table}',
                        selectedSource?.table_number || '—'
                      )}
                    </h3>
                    {destTables.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-4 text-center">{t.noDestinationTables}</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {destTables.map((table) => {
                          const isSourceTable = table.id === unmergeSourceTableId;
                          const isSourceOccupied = isSourceTable && table.status !== 'available';

                          return (
                          <Card
                            key={table.id}
                            className={`transition-all border-2 ${
                              isSourceOccupied
                                ? 'border-red-300 bg-red-50/50 opacity-90 cursor-not-allowed'
                                : 'cursor-pointer hover:shadow-lg hover:border-orange-300'
                            }`}
                            onClick={() => {
                              if (isSourceOccupied) return;
                              void handleUnmergeToTable(table);
                            }}
                          >
                            <CardContent className="p-4 text-center">
                              <div className="text-2xl font-bold mb-1">{table.table_number}</div>
                              <div className="text-xs text-zinc-600">{table.capacity} {t.seats}</div>
                              {isSourceTable ? (
                                isSourceOccupied ? (
                                  <div className="text-xs mt-2 px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                                    {t.tableOccupied}
                                  </div>
                                ) : (
                                  <div className="text-xs mt-2 px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                                    {t.restoreOriginalTable}
                                  </div>
                                )
                              ) : (
                                <div className="text-xs mt-2 px-2 py-1 rounded-full bg-green-100 text-green-700">
                                  {t.available}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Split Bill Modal */}
      <Dialog open={showSplitBillModal} onOpenChange={(open) => {
        setShowSplitBillModal(open);
        if (!open) setEditingSplitBillTabId(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.splitBill}</DialogTitle>
            <DialogDescription>{t.selectItemsToPay}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-wrap items-center gap-2 border-b pb-3">
              {splitBillTabs.map((tab) => {
                const isActive = tab.id === activeSplitBillTabId;
                const isEditing = editingSplitBillTabId === tab.id;
                const tabItemCount = tabAllocationTotal(tab);

                return (
                  <div key={tab.id} className="flex items-center gap-1">
                    {isEditing ? (
                      <Input
                        className="h-8 w-32 text-sm"
                        value={editingSplitBillTabName}
                        autoFocus
                        onChange={(e) => setEditingSplitBillTabName(e.target.value)}
                        onBlur={() => {
                          renameSplitBillTab(tab.id, editingSplitBillTabName);
                          setEditingSplitBillTabId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            renameSplitBillTab(tab.id, editingSplitBillTabName);
                            setEditingSplitBillTabId(null);
                          }
                          if (e.key === 'Escape') {
                            setEditingSplitBillTabId(null);
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'border-violet-500 bg-violet-600 text-white'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                        }`}
                        onClick={() => setActiveSplitBillTab(tab.id)}
                        onDoubleClick={() => {
                          setEditingSplitBillTabId(tab.id);
                          setEditingSplitBillTabName(tab.name);
                        }}
                      >
                        <span>{tab.name}</span>
                        {tabItemCount > 0 && (
                          <span className={`rounded-full px-1.5 text-xs ${
                            isActive ? 'bg-violet-500 text-white' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            {tabItemCount}
                          </span>
                        )}
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        type="button"
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                        title={t.renameBillTab}
                        onClick={() => {
                          setEditingSplitBillTabId(tab.id);
                          setEditingSplitBillTabName(tab.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {splitBillTabs.length > 1 && !isEditing && (
                      <button
                        type="button"
                        className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                        onClick={() => removeSplitBillTab(tab.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-dashed border-violet-300 text-violet-700 hover:bg-violet-50"
                onClick={addSplitBillTab}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t.addBillTab}
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <div className="space-y-2">
                {cart.map((cartItem, index) => {
                  if (cartItem.cancelled) return null;
                  const activeQty = getTabAllocationQty(activeSplitBillTab, index);
                  const otherAllocations = getOtherTabAllocationsForItem(index);
                  const unassignedQty = cartItem.quantity - getOtherTabsAllocationQty(index);
                  const maxForTab = getMaxAllocatableForActiveTab(index);
                  const isMultiQty = cartItem.quantity > 1;
                  const isSelected = activeQty > 0;

                  return (
                    <div
                      key={`split-bill-${index}-${cartItem.item.id}-${cartItem.portionId || 'no-portion'}`}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50'
                          : otherAllocations.length > 0
                            ? 'border-amber-200 bg-amber-50/50'
                            : 'border-zinc-200'
                      } ${!isMultiQty ? 'cursor-pointer hover:border-zinc-300' : 'cursor-pointer hover:border-zinc-300'}`}
                      onClick={() => {
                        if (isMultiQty) {
                          setActiveTabAllocation(index, activeQty > 0 ? 0 : maxForTab);
                        } else {
                          toggleSplitBillItem(index);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-violet-500 border-violet-500' : 'border-zinc-300'
                        }`}>
                          {isSelected && <CheckSquare className="h-4 w-4 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium">{cartItem.item.name}</div>
                          {cartItem.portionName && (
                            <div className="text-sm text-zinc-500">{cartItem.portionName}</div>
                          )}
                          {otherAllocations.map(({ tab, qty }) => (
                            <div key={tab.id} className="text-xs text-amber-700 mt-0.5">
                              {t.inBillTab} {tab.name}: x{qty}
                            </div>
                          ))}
                          {isMultiQty && unassignedQty > 0 && (
                            <div className="text-xs text-zinc-500 mt-0.5">
                              {t.unassigned}: x{unassignedQty}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {isMultiQty ? (
                          <div
                            className="flex flex-col items-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs text-zinc-500">{t.qtyForThisBill}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={activeQty <= 0}
                                onClick={() => setActiveTabAllocation(index, activeQty - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                className="h-8 w-14 text-center px-1"
                                inputMode="numeric"
                                value={activeQty}
                                onChange={(e) => {
                                  const parsed = parseInt(e.target.value, 10);
                                  setActiveTabAllocation(index, Number.isFinite(parsed) ? parsed : 0);
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={activeQty >= maxForTab}
                                onClick={() => setActiveTabAllocation(index, activeQty + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <span className="text-xs text-zinc-400">/ {cartItem.quantity}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-zinc-600">x{cartItem.quantity}</div>
                        )}
                        <div className="font-bold min-w-[4.5rem] text-right">
                          {formatCurrency(
                            cartItem.item.price * (isMultiQty ? activeQty : cartItem.quantity)
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {tabAllocationTotal(activeSplitBillTab ?? { id: '', name: '', allocations: [] }) > 0 && (
              <div className="flex justify-between items-center rounded-lg bg-violet-50 border border-violet-200 p-4">
                <span className="font-medium text-violet-900">
                  {activeSplitBillTab?.name} — {t.total}
                </span>
                <span className="text-xl font-bold text-violet-900">{formatCurrency(activeSplitBillTotal)}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setShowSplitBillModal(false)}>
              {t.cancel}
            </Button>
            <Button
              variant="outline"
              className="border-violet-300 text-violet-700 hover:bg-violet-50"
              disabled={tabAllocationTotal(activeSplitBillTab ?? { id: '', name: '', allocations: [] }) === 0}
              onClick={() => void handlePrintSplitBill()}
            >
              <Printer className="mr-2 h-4 w-4" />
              {t.printBill}
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700"
              disabled={tabAllocationTotal(activeSplitBillTab ?? { id: '', name: '', allocations: [] }) === 0}
              onClick={() => {
                setShowSplitBillModal(false);
                openSplitBillCheckout();
              }}
            >
              {t.paySelected}
            </Button>
          </DialogFooter>
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
                  .filter(table => table.id !== currentTable?.id && table.status === 'available' && !isTableMergedAway(table))
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

    </div>
    </>
  );
}

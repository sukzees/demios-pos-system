'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Eye, Printer, Trash2, CheckSquare, Square, Download } from 'lucide-react';
import { supabase, Order } from '@/lib/supabase';
import { usePosStore } from '@/lib/store';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import html2canvas from 'html2canvas';
import { getLogoTargetWidth, resizeImageForPrint, buildLogoHtml, injectLogoIntoReceiptHtml } from '@/lib/receipt-image';

const MOCK_ORDERS: Order[] = [
  { id: 'ORD-001', total_amount: 45.50, status: 'completed', payment_method: 'card', created_at: new Date().toISOString() },
  { id: 'ORD-002', total_amount: 12.00, status: 'completed', payment_method: 'cash', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'ORD-003', total_amount: 89.99, status: 'pending', payment_method: 'online', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'ORD-004', total_amount: 24.50, status: 'cancelled', payment_method: 'cash', created_at: new Date(Date.now() - 86400000).toISOString() },
];

const getLegacyLineName = (line: any) =>
  String(line?.name || line?.item?.name || line?.item_name || line?.title || 'Legacy order total');

const getLegacyLineQuantity = (line: any) => {
  const quantity = Number(line?.quantity ?? line?.qty ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const getLegacyLinePrice = (line: any) => {
  const quantity = getLegacyLineQuantity(line);
  const directPrice = Number(line?.price_at_time ?? line?.price ?? line?.unit_price);
  if (Number.isFinite(directPrice)) return directPrice;

  const total = Number(line?.total ?? line?.total_amount ?? line?.amount);
  return Number.isFinite(total) ? total / quantity : 0;
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getNoteField = (notes: unknown, label: string) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(notes || '').match(new RegExp(`(?:^|\\s*\\|\\s*)${escapedLabel}:\\s*([^|]+)`, 'i'));
  return match?.[1]?.trim() || '';
};

const appendPortionToName = (name: string, portionName: string) => {
  const trimmedName = name.trim();
  const trimmedPortion = portionName.trim();
  if (!trimmedName || !trimmedPortion) return trimmedName || trimmedPortion;

  const normalizedName = trimmedName.toLowerCase();
  const normalizedPortion = trimmedPortion.toLowerCase();
  if (
    normalizedName.endsWith(`(${normalizedPortion})`) ||
    normalizedName.endsWith(`- ${normalizedPortion}`) ||
    normalizedName.endsWith(` ${normalizedPortion}`)
  ) {
    return trimmedName;
  }

  return `${trimmedName} (${trimmedPortion})`;
};

const getOrderLineDisplayName = (line: any) => {
  const notesText = String(line?.notes || '');
  const portionName = getNoteField(notesText, 'Portion');
  const noteItemName = getNoteField(notesText, 'Item');
  const noteRecipeName = getNoteField(notesText, 'Recipe');
  const baseName = String(line?.item?.name || noteItemName || noteRecipeName || 'Unknown Item');

  return appendPortionToName(baseName, portionName);
};

/** Merge duplicate lines for receipt print (same item + portion + price + note → sum qty) */
const combineOrderItemsForPrint = (items: any[]) => {
  const map = new Map<string, any>();
  const order: string[] = [];
  for (const item of items) {
    const notesText = String(item?.notes || '');
    const key = [
      item.item_id || item.item?.id || getOrderLineDisplayName(item),
      getNoteField(notesText, 'Portion'),
      Number(item.price_at_time || 0),
      getNoteField(notesText, 'Note'),
    ].join('|');
    const qty = Number(item.quantity || 0);
    const existing = map.get(key);
    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + qty;
    } else {
      map.set(key, { ...item, quantity: qty });
      order.push(key);
    }
  }
  return order.map((k) => map.get(k));
};

const isCancelledKitchenItem = (line: any) =>
  /(?:^|\s\|\s)Kitchen:\s*cancelled/i.test(String(line?.notes || '')) ||
  !!line?.isKitchenCancelled;

const isDisplayableOrderItem = (line: any) => {
  const notes = String(line?.notes || '');
  if (/Order Meta >>>/.test(notes) && !/(?:^|\s\|\s)(Item|Recipe):/i.test(notes)) {
    return false;
  }
  return true;
};

const tagOrderItemRows = (rows: any[]) =>
  (rows || []).map((line) => ({
    ...line,
    isKitchenCancelled: isCancelledKitchenItem(line),
  }));

const parseLegacyOrderItems = (order: Order) => {
  const notes = String((order as any).notes || '').trim();
  const candidates: any[] = [];

  if (notes) {
    try {
      const parsed = JSON.parse(notes);
      if (Array.isArray(parsed)) {
        candidates.push(...parsed);
      } else if (Array.isArray(parsed?.items)) {
        candidates.push(...parsed.items);
      } else if (Array.isArray(parsed?.cart)) {
        candidates.push(...parsed.cart);
      } else if (Array.isArray(parsed?.order_items)) {
        candidates.push(...parsed.order_items);
      }
    } catch {
      const legacyLines = notes
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /(?:^|\s)(?:item|recipe)\s*:/i.test(line));

      for (const line of legacyLines) {
        const itemMatch = line.match(/(?:item|recipe)\s*:\s*([^|]+)/i);
        const quantityMatch = line.match(/(?:qty|quantity)\s*:\s*([^|]+)/i);
        const priceMatch = line.match(/(?:price|unit)\s*:\s*([^|]+)/i);
        if (itemMatch?.[1]) {
          candidates.push({
            name: itemMatch[1].trim(),
            quantity: quantityMatch?.[1] ? Number(quantityMatch[1]) : 1,
            price: priceMatch?.[1] ? Number(priceMatch[1]) : 0,
          });
        }
      }
    }
  }

  const parsedItems = candidates
    .map((line) => {
      const quantity = getLegacyLineQuantity(line);
      const price = getLegacyLinePrice(line);
      return {
        quantity,
        price_at_time: price,
        notes: `Item: ${getLegacyLineName(line)}`,
        item: { name: getLegacyLineName(line) },
        created_at: order.created_at,
        isLegacyFallback: true,
      };
    })
    .filter((line) => line.item.name && Number.isFinite(line.price_at_time));

  if (parsedItems.length > 0) return parsedItems;

  return [{
    quantity: 1,
    price_at_time: Number(order.total_amount || 0),
    notes: 'Item: Legacy order total',
    item: { name: 'Legacy order total' },
    created_at: order.created_at,
    isLegacyFallback: true,
  }];
};

const TRANSLATIONS = {
  en: {
    orderHistory: 'Order History',
    searchOrder: 'Search order ID...',
    filter: 'Filter',
    noOrders: 'No orders found.',
    orderId: 'Order ID',
    dateTime: 'Date & Time',
    total: 'Total',
    payment: 'Payment',
    status: 'Status',
    actions: 'Actions',
    show: 'Show',
    itemsPerPage: 'items per page',
    page: 'Page',
    of: 'of',
    prev: 'Prev',
    next: 'Next',
    delete: 'Delete',
    selectedOrder: 'selected order',
    selectedOrders: 'selected orders',
    smartFilter: 'Smart Filter',
    filterDescription: 'Filter by payment, status, and custom date range.',
    all: 'All',
    cash: 'Cash',
    transfer: 'Transfer',
    completed: 'Completed',
    pending: 'Pending',
    cancelled: 'Cancelled',
    dateFrom: 'Date From',
    dateTo: 'Date To',
    clear: 'Clear',
    apply: 'Apply',
    orderDetails: 'Order Details',
    date: 'Date',
    paymentMethod: 'Payment Method',
    bank: 'Bank',
    accountName: 'Account Name',
    accountNumber: 'Account Number',
    bankTransferDetails: 'Bank Transfer Details',
    item: 'Item',
    qty: 'Qty',
    price: 'Price',
    loadingItems: 'Loading items...',
    noItems: 'No items found for this order.',
    orderNote: 'Order Note',
    subtotal: 'Subtotal',
    tax: 'Tax',
    cashTendered: 'Cash Tendered',
    change: 'Change',
    deleteOrders: 'Delete Orders',
    deleteConfirm: 'Are you sure you want to delete',
    deleteConfirmEnd: 'This action cannot be undone.',
    more: 'more',
    cancel: 'Cancel',
    printReceipt: 'Print Receipt',
    viewDetails: 'View Details',
    selectForDeletion: 'Select for deletion',
    itemCancelled: 'Cancelled',
    exportCsv: 'Export CSV',
    table: 'Table',
    orderType: 'Order Type',
  },
  lo: {
    orderHistory: 'ປະຫວັດການສັ່ງຊື້',
    searchOrder: 'ຄົ້ນຫາລະຫັດການສັ່ງຊື້...',
    filter: 'ກອງ',
    noOrders: 'ບໍ່ພົບການສັ່ງຊື້.',
    orderId: 'ລະຫັດການສັ່ງຊື້',
    dateTime: 'ວັນທີ ແລະ ເວລາ',
    total: 'ລວມທັງໝົດ',
    payment: 'ການຊຳລະເງິນ',
    status: 'ສະຖານະ',
    actions: 'ການກະທຳ',
    show: 'ສະແດງ',
    itemsPerPage: 'ລາຍການຕໍ່ໜ້າ',
    page: 'ໜ້າ',
    of: 'ຂອງ',
    prev: 'ກ່ອນໜ້າ',
    next: 'ຕໍ່ໄປ',
    delete: 'ລົບ',
    selectedOrder: 'ການສັ່ງຊື້ທີ່ເລືອກ',
    selectedOrders: 'ການສັ່ງຊື້ທີ່ເລືອກ',
    smartFilter: 'ກອງອັດສະລິຍະ',
    filterDescription: 'ກອງຕາມການຊຳລະເງິນ, ສະຖານະ, ແລະຊ່ວງວັນທີ.',
    all: 'ທັງໝົດ',
    cash: 'ເງິນສົດ',
    transfer: 'ໂອນເງິນ',
    completed: 'ສຳເລັດ',
    pending: 'ລໍຖ້າ',
    cancelled: 'ຍົກເລີກ',
    dateFrom: 'ວັນທີເລີ່ມຕົ້ນ',
    dateTo: 'ວັນທີສິ້ນສຸດ',
    clear: 'ລ້າງ',
    apply: 'ນຳໃຊ້',
    orderDetails: 'ລາຍລະອຽດການສັ່ງຊື້',
    date: 'ວັນທີ',
    paymentMethod: 'ວິທີການຊຳລະເງິນ',
    bank: 'ທະນາຄານ',
    accountName: 'ຊື່ບັນຊີ',
    accountNumber: 'ເລກບັນຊີ',
    bankTransferDetails: 'ລາຍລະອຽດການໂອນເງິນ',
    item: 'ລາຍການ',
    qty: 'ຈຳນວນ',
    price: 'ລາຄາ',
    loadingItems: 'ກຳລັງໂຫລດລາຍການ...',
    noItems: 'ບໍ່ພົບລາຍການສຳລັບການສັ່ງຊື້ນີ້.',
    orderNote: 'ໝາຍເຫດການສັ່ງຊື້',
    subtotal: 'ລວມຍ່ອຍ',
    tax: 'ພາສີ',
    cashTendered: 'ເງິນທີ່ຮັບ',
    change: 'ເງິນທອນ',
    deleteOrders: 'ລົບການສັ່ງຊື້',
    deleteConfirm: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບ',
    deleteConfirmEnd: 'ການກະທຳນີ້ບໍ່ສາມາດຍົກເລີກໄດ້.',
    more: 'ເພີ່ມເຕີມ',
    cancel: 'ຍົກເລີກ',
    printReceipt: 'ພິມໃບເສັດ',
    viewDetails: 'ເບິ່ງລາຍລະອຽດ',
    selectForDeletion: 'ເລືອກເພື່ອລົບ',
    itemCancelled: 'ຍົກເລີກ',
    exportCsv: 'ສົ່ງອອກ CSV',
    table: 'ໂຕະ',
    orderType: 'ປະເພດ',
  },
  th: {
    orderHistory: 'ประวัติการสั่งซื้อ',
    searchOrder: 'ค้นหารหัสการสั่งซื้อ...',
    filter: 'กรอง',
    noOrders: 'ไม่พบการสั่งซื้อ.',
    orderId: 'รหัสการสั่งซื้อ',
    dateTime: 'วันที่ และ เวลา',
    total: 'ยอดรวม',
    payment: 'การชำระเงิน',
    status: 'สถานะ',
    actions: 'การกระทำ',
    show: 'แสดง',
    itemsPerPage: 'รายการต่อหน้า',
    page: 'หน้า',
    of: 'ของ',
    prev: 'ก่อนหน้า',
    next: 'ถัดไป',
    delete: 'ลบ',
    selectedOrder: 'การสั่งซื้อที่เลือก',
    selectedOrders: 'การสั่งซื้อที่เลือก',
    smartFilter: 'ตัวกรองอัจฉริยะ',
    filterDescription: 'กรองตามการชำระเงิน, สถานะ, และช่วงวันที่.',
    all: 'ทั้งหมด',
    cash: 'เงินสด',
    transfer: 'โอนเงิน',
    completed: 'สำเร็จ',
    pending: 'รอดำเนินการ',
    cancelled: 'ยกเลิก',
    dateFrom: 'วันที่เริ่มต้น',
    dateTo: 'วันที่สิ้นสุด',
    clear: 'ล้าง',
    apply: 'ใช้งาน',
    orderDetails: 'รายละเอียดการสั่งซื้อ',
    date: 'วันที่',
    paymentMethod: 'วิธีการชำระเงิน',
    bank: 'ธนาคาร',
    accountName: 'ชื่อบัญชี',
    accountNumber: 'เลขบัญชี',
    bankTransferDetails: 'รายละเอียดการโอนเงิน',
    item: 'รายการ',
    qty: 'จำนวน',
    price: 'ราคา',
    loadingItems: 'กำลังโหลดรายการ...',
    noItems: 'ไม่พบรายการสำหรับการสั่งซื้อนี้.',
    orderNote: 'หมายเหตุการสั่งซื้อ',
    subtotal: 'ยอดรวมย่อย',
    tax: 'ภาษี',
    cashTendered: 'เงินที่รับ',
    change: 'เงินทอน',
    deleteOrders: 'ลบการสั่งซื้อ',
    deleteConfirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบ',
    deleteConfirmEnd: 'การกระทำนี้ไม่สามารถยกเลิกได้.',
    more: 'เพิ่มเติม',
    cancel: 'ยกเลิก',
    printReceipt: 'พิมพ์ใบเสร็จ',
    viewDetails: 'ดูรายละเอียด',
    selectForDeletion: 'เลือกเพื่อลบ',
    itemCancelled: 'ยกเลิก',
    exportCsv: 'ส่งออก CSV',
    table: 'โต๊ะ',
    orderType: 'ประเภท',
  }
};

export default function OrderHistoryPage() {
  const { isSupabaseConfigured, receiptSettings, currencySettings, generalSettings, orderMetaById, silentPrint, user, printerConfigs, bankConfigs } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'online'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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

  // Function to convert HTML to image and send to printer
  const printHTMLAsImage = async (html: string, printerIp: string, paperWidth: string, qrImageData: string = '', footerText: string = '', logoImageData: string = '', logoHtml: string = '') => {
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
          qrImageData: qrImageData,
          footerText: footerText,
          logoImageData: logoImageData
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

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async () => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*, table:tables(table_number)')
            .order('created_at', { ascending: false });

          if (data && mounted) setOrders(data);
        } catch (error) {
          console.error('Error fetching orders:', error);
        }
      } else {
        if (mounted) setOrders(MOCK_ORDERS);
      }
    };
    fetchOrders();
    const handleFocus = () => fetchOrders();
    window.addEventListener('focus', handleFocus);
    return () => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSupabaseConfigured]);

  const fetchOrderDetails = async (order: Order) => {
    if (!isSupabaseConfigured) return;

    setIsLoadingDetails(true);
    try {
      let { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          item:items(*)
        `)
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (error) {
        const fallback = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)
          .order('created_at', { ascending: true });

        if (fallback.error) throw fallback.error;
        data = fallback.data;
      }

      let items = tagOrderItemRows(data && data.length > 0 ? data : parseLegacyOrderItems(order));

      // Completed bills only store paid lines — pull cancelled kitchen items from sibling table orders
      if (order.table_id && order.status === 'completed') {
        const orderTime = new Date(order.created_at || Date.now());
        const from = new Date(orderTime.getTime() - 6 * 60 * 60 * 1000).toISOString();
        const to = new Date(orderTime.getTime() + 60 * 60 * 1000).toISOString();
        const existingIds = new Set(items.map((line) => line.id).filter(Boolean));

        const { data: relatedOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('table_id', order.table_id)
          .neq('id', order.id)
          .gte('created_at', from)
          .lte('created_at', to);

        const relatedOrderIds = (relatedOrders || []).map((row) => row.id);
        if (relatedOrderIds.length > 0) {
          const { data: cancelledRows } = await supabase
            .from('order_items')
            .select('*, item:items(*)')
            .in('order_id', relatedOrderIds)
            .ilike('notes', '%Kitchen: cancelled%')
            .order('created_at', { ascending: true });

          for (const row of cancelledRows || []) {
            if (row.id && existingIds.has(row.id)) continue;
            items.push({ ...row, isKitchenCancelled: true, isReferenceOnly: true });
            if (row.id) existingIds.add(row.id);
          }
        }
      }

      setOrderItems(items.filter(isDisplayableOrderItem));
    } catch (error) {
      console.error('Error fetching order details:', error);
      setOrderItems(tagOrderItemRows(parseLegacyOrderItems(order)).filter(isDisplayableOrderItem));
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setOrderItems([]);
    setIsDetailsOpen(true);
    fetchOrderDetails(order);
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrderIds(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedOrderIds.size === paginatedOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(paginatedOrders.map(o => o.id)));
    }
  };

  const handleDeleteOrders = async () => {
    if (!isSupabaseConfigured) {
      alert('Supabase is not configured. Orders cannot be deleted.');
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', Array.from(selectedOrderIds));

      if (error) throw error;

      // Remove deleted orders from local state
      setOrders(prev => prev.filter(o => !selectedOrderIds.has(o.id)));
      setSelectedOrderIds(new Set());
      setIsDeleteModalOpen(false);
      alert('Selected orders deleted successfully.');
    } catch (error) {
      console.error('Error deleting orders:', error);
      alert('Failed to delete orders. Please try again.');
    }
  };

  const handlePrintReceipt = async (order: Order) => {
    let itemsToPrint: any[] = [];

    if (isSupabaseConfigured) {
      try {
        let { data, error } = await supabase
          .from('order_items')
          .select('*, item:items(*)')
          .eq('order_id', order.id)
          .order('created_at', { ascending: true });
        if (error) {
          const fallback = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)
            .order('created_at', { ascending: true });

          if (fallback.error) throw fallback.error;
          data = fallback.data;
        }
        itemsToPrint = data && data.length > 0 ? data : parseLegacyOrderItems(order);
        itemsToPrint = itemsToPrint.filter(
          (item: any) => isDisplayableOrderItem(item) && !isCancelledKitchenItem(item)
        );
        itemsToPrint = combineOrderItemsForPrint(itemsToPrint);
      } catch (error) {
        console.error('Error fetching items for print:', error);
        itemsToPrint = combineOrderItemsForPrint(parseLegacyOrderItems(order));
      }
    } else {
      // Mock items for demo
      itemsToPrint = combineOrderItemsForPrint([
        { quantity: 1, price_at_time: 10.00, item: { name: 'Mock Item A' } },
        { quantity: 2, price_at_time: 15.00, item: { name: 'Mock Item B' } }
      ]);
    }

    const subtotal = itemsToPrint.reduce((sum, item: any) => sum + (Number(item.price_at_time || 0) * Number(item.quantity || 0)), 0);
    const totalAmount = Number(order.total_amount || 0);
    const tax = Math.max(0, totalAmount - subtotal);
    const paymentMethodLabel = formatPaymentMethodLabel(order.payment_method);
    const meta = orderMetaById[order.id];
    let bank = meta?.selectedBank;
    let cashTendered = Number.isFinite(meta?.cashTendered) ? Number(meta?.cashTendered) : null;

    for (const line of itemsToPrint) {
      const text = String(line?.notes || '');
      const match = text.match(/Order Meta >>>([^<]+)<{3}/);
      if (!match?.[1]) continue;
      try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        bank = bank || parsed.selectedBank;
        cashTendered = cashTendered ?? (Number.isFinite(parsed.cashTendered) ? Number(parsed.cashTendered) : null);
      } catch { }
    }

    const bankForDisplay = bank || bankConfigs.find((configuredBank: any) => configuredBank.enabledForTransfer);
    const bankQrCodeImage = bankForDisplay
      ? (bankConfigs.find((configuredBank: any) => configuredBank.id === bankForDisplay?.id)?.qrCodeImage || bankForDisplay.qrCodeImage || '')
      : '';
    const showTransferInfo = receiptSettings.showBankDetail && bankForDisplay;
    const isCash = order.payment_method === 'cash';
    const change = cashTendered !== null ? Math.max(0, cashTendered - totalAmount) : 0;

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

    const cartItemsHtml = itemsToPrint.map((item: any) =>
      '<tr>' +
      '<td style="padding: ' + Math.round(4*fs) + 'px ' + Math.round(2*fs) + 'px; text-align: left; vertical-align: top;">' + escapeHtml(getOrderLineDisplayName(item)) + '</td>' +
      '<td style="padding: ' + Math.round(4*fs) + 'px ' + Math.round(2*fs) + 'px; text-align: center; vertical-align: top;">' + escapeHtml(item.quantity || 0) + '</td>' +
      '<td style="padding: ' + Math.round(4*fs) + 'px ' + Math.round(2*fs) + 'px; text-align: right; vertical-align: top;">' + formatCurrency(Number(item.price_at_time || 0), currencySettings) + '</td>' +
      '<td style="padding: ' + Math.round(4*fs) + 'px ' + Math.round(2*fs) + 'px; text-align: right; vertical-align: top;">' + formatCurrency(Number(item.price_at_time || 0) * Number(item.quantity || 0), currencySettings) + '</td>' +
      '</tr>'
    ).join('');
    const noteHtml = order.notes
      ? '<div style="margin-top: 10px; border-top: 1px dotted #000; padding-top: 5px;">' +
      '<span class="font-bold">' + t.orderNote + ':</span><br>' +
      '<span>' + escapeHtml(order.notes) + '</span>' +
      '</div>'
      : '';
    const paymentMethodHtml =
      '<div class="flex justify-between">' +
      '<span>' + t.paymentMethod + '</span>' +
      '<span>' + escapeHtml(paymentMethodLabel) + '</span>' +
      '</div>';
    const cashDetailsHtml = isCash
      ? '<div class="flex justify-between">' +
      '<span>' + t.cashTendered + '</span>' +
      '<span>' + formatCurrency(cashTendered ?? totalAmount, currencySettings) + '</span>' +
      '</div>' +
      '<div class="flex justify-between">' +
      '<span>' + t.change + '</span>' +
      '<span>' + formatCurrency(change, currencySettings) + '</span>' +
      '</div>'
      : '';
    const transferDetailsHtml = showTransferInfo
      ? '<div style="margin-top: 8px; border-top: 1px dotted #000; padding-top: 6px;">' +
      '<div class="font-bold" style="margin-bottom: 4px;">' + t.bankTransferDetails + '</div>' +
      '<div>' + t.bank + ': ' + escapeHtml(bankForDisplay?.bankName || '-') + '</div>' +
      '<div>' + t.accountName + ': ' + escapeHtml(bankForDisplay?.accountName || '-') + '</div>' +
      '<div>' + t.accountNumber + ': ' + escapeHtml(bankForDisplay?.accountNumber || '-') + '</div>' +
      '</div>'
      : '';

    const transferQrHtml = (receiptSettings.showQrCode !== false) && bankQrCodeImage
      ? '<div style="text-align:center; margin-top: ' + Math.round(12*fs) + 'px; padding-top: ' + Math.round(10*fs) + 'px; border-top: 1px dotted #000;">' +
      '<div class="font-bold" style="font-size: ' + fzBody(14) + 'px; margin-bottom: ' + Math.round(4*fs) + 'px;">Scan to Pay</div>' +
      '</div>'
      : '';

    // QR image data sent separately to thermal printer (avoids dithering destroying QR pattern)
    // Resize QR to fit paper width so it prints at appropriate size
    const receiptSize = receiptSettings.receiptSize || '80mm';
    const rawQrData = (receiptSettings.showQrCode !== false) && bankQrCodeImage
      ? bankQrCodeImage
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
      "body { font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif; padding: " + Math.round(12*fs) + "px; width: 100%; max-width: 100%; margin: 0 auto; color: #000; box-sizing: border-box; overflow-x: hidden; word-wrap: break-word; }" +
      '.text-center { text-align: center; }' +
      '.mb-4 { margin-bottom: ' + Math.round(16*fs) + 'px; }' +
      '.mt-6 { margin-top: ' + Math.round(24*fs) + 'px; }' +
      '.text-xs { font-size: ' + fzBody(10) + 'px; }' +
      '.text-sm { font-size: ' + fzBody(12) + 'px; }' +
      '.font-bold { font-weight: bold; }' +
      '.flex { display: flex; justify-content: space-between; }' +
      '.border-y { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: ' + Math.round(12*fs) + 'px 0; margin: ' + Math.round(12*fs) + 'px 0; }' +
      '.space-y-1 > div { margin-bottom: ' + Math.round(6*fs) + 'px; }' +
      "table { width: 100%; border-collapse: collapse; font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif; table-layout: fixed; max-width: 100%; }" +
      "th, td { font-size: " + fzBody(bodyFontSizeSetting) + "px; font-family: 'Noto Sans Thai', 'Noto Sans Lao', sans-serif; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; white-space: normal; padding: " + Math.round(4*fs) + "px " + Math.round(3*fs) + "px; line-height: 1.4; vertical-align: top; }" +
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
      '<h3 class="font-bold" style="margin:0 0 ' + Math.round(2*fs) + 'px 0; font-size: ' + fzHeader(headerFontSizeSetting) + 'px; word-wrap: break-word;">' + escapeHtml(generalSettings.storeName || '') + '</h3>' +
      (receiptSettings.storeAddress ? '<div class="text-xs" style="margin-bottom:' + Math.round(2*fs) + 'px; word-wrap: break-word;">' + escapeHtml(receiptSettings.storeAddress) + '</div>' : '') +
      (receiptSettings.phoneNumber ? '<div class="text-xs" style="margin-bottom:' + Math.round(2*fs) + 'px; word-wrap: break-word;">' + escapeHtml(receiptSettings.phoneNumber) + '</div>' : '') +
      (receiptSettings.headerText ? '<div class="text-xs mt-2" style="word-wrap: break-word;">' + escapeHtml(receiptSettings.headerText) + '</div>' : '') +
      '</div>' +
      '<div class="text-xs mb-4">' +
      t.date + ': ' + escapeHtml(format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')) +
      (receiptSettings.showTableNumber !== false && (order as any).table ? '<br/>' + t.table + ': ' + escapeHtml((order as any).table.table_number) : '') +
      '</div>' +
      '<div class="border-y text-xs">' +
      '<table>' +
      '<thead>' +
      '<tr>' +
      '<th style="text-align:left; padding-bottom: ' + Math.round(6*fs) + 'px;">' + t.item + '</th>' +
      '<th style="text-align:center; padding-bottom: ' + Math.round(6*fs) + 'px;">' + t.qty + '</th>' +
      '<th style="text-align:right; padding-bottom: ' + Math.round(6*fs) + 'px;">' + t.price + '</th>' +
      '<th style="text-align:right; padding-bottom: ' + Math.round(6*fs) + 'px;">' + t.total + '</th>' +
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
      '<span>' + formatCurrency(subtotal, currencySettings) + '</span>' +
      '</div>' +
      '<div class="flex justify-between">' +
      '<span>' + t.tax + '</span>' +
      '<span>' + formatCurrency(tax, currencySettings) + '</span>' +
      '</div>' +
      paymentMethodHtml +
      cashDetailsHtml +
      transferDetailsHtml +
      noteHtml +
      '</div>' +
      '<div style="text-align: center; margin-top: ' + Math.round(10*fs) + 'px; border-top: 1px dashed #000; padding-top: ' + Math.round(10*fs) + 'px;">' +
      '<div style="display: flex; justify-content: center; align-items: center; gap: ' + Math.round(10*fs) + 'px; margin-bottom: ' + Math.round(12*fs) + 'px;">' +
      '<div style="font-weight: bold; font-size: ' + fzTotal(totalFontSizeSetting) + 'px;">' + t.total.toUpperCase() + '</div>' +
      '<div style="font-weight: bold; font-size: ' + fzTotal(totalFontSizeSetting) + 'px;">' + formatCurrency(totalAmount, currencySettings) + '</div>' +
      '</div>' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: ' + Math.round(10*fs) + 'px; text-align: center;">' +
      '<div>' +
      '<div style="font-size: ' + fzTotal(totalFontSizeSetting * 0.7) + 'px; color: #666;">THB</div>' +
      '<div style="font-weight: bold; font-size: ' + fzTotal(totalFontSizeSetting) + 'px;">฿' + Math.round(totalAmount / ((currencySettings as any).thbRate || 36.5)).toLocaleString('en-US') + '</div>' +
      '</div>' +
      '<div>' +
      '<div style="font-size: ' + fzTotal(totalFontSizeSetting * 0.7) + 'px; color: #666;">USD</div>' +
      '<div style="font-weight: bold; font-size: ' + fzTotal(totalFontSizeSetting) + 'px;">$' + (totalAmount / ((currencySettings as any).currencyRate || 1)).toFixed(2) + '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      transferQrHtml +
      '</body>' +
      '</html>';

    const receiptHtmlWithLogo = injectLogoIntoReceiptHtml(receiptHtml, logoHtml);

    const printerId = receiptSettings.receiptPrinter;
    let targetPrinter = null;
    
    if (printerId) {
      targetPrinter = printerConfigs.find((p: any) => p.id === printerId && p.enabled);
    } else {
      targetPrinter = printerConfigs.find((p: any) => p.isDefault && p.enabled);
    }

    if (targetPrinter && targetPrinter.ipAddress !== 'System-Driver') {
      printHTMLAsImage(receiptHtml, targetPrinter.ipAddress, receiptSize, qrImageData, receiptSettings.footerText || '', logoImageData, logoHtml)
        .catch(err => {
          console.error('Failed to print receipt via network:', err);
          alert(`Failed to print receipt: ${err.message}`);
        });
      return;
    }

    if (silentPrint) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(receiptHtmlWithLogo);
        doc.close();
        // Wait for images (QR base64) to decode before printing
        const triggerPrint = async () => {
          const imgs = doc.querySelectorAll('img');
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
          try { iframe.contentWindow?.print(); } catch (e) {}
          document.body.removeChild(iframe);
        };
        setTimeout(() => { triggerPrint(); }, 500);
      }
    } else {
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(receiptHtmlWithLogo);
        printWindow.document.close();
        // Wait for images (QR base64) to decode before printing
        printWindow.onload = async () => {
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
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          printWindow.focus();
          printWindow.print();
        };
      }
    }
  };

  const activeFilterCount =
    (paymentFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPayment = paymentFilter === 'all' || order.payment_method === paymentFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    const orderDate = new Date(order.created_at);
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    const matchesFrom = !fromDate || orderDate >= fromDate;
    const matchesTo = !toDate || orderDate <= toDate;

    return matchesSearch && matchesPayment && matchesStatus && matchesFrom && matchesTo;
  });
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, paymentFilter, statusFilter, dateFrom, dateTo, pageSize]);
  const billableOrderItems = orderItems.filter(
    (line) => isDisplayableOrderItem(line) && !isCancelledKitchenItem(line)
  );
  const detailsSubtotal = billableOrderItems.reduce(
    (sum, line) => sum + ((line.price_at_time || 0) * (line.quantity || 0)),
    0
  );
  const detailsTax = Math.max(0, (selectedOrder?.total_amount || 0) - detailsSubtotal);
  const selectedOrderMeta = selectedOrder ? orderMetaById[selectedOrder.id] : undefined;
  const parsedOrderMeta = (() => {
    for (const line of orderItems) {
      const text = String(line?.notes || '');
      const metaMatch = text.match(/Order Meta >>>([^<]+)<{3}/);
      if (!metaMatch?.[1]) continue;
      try {
        const decoded = decodeURIComponent(metaMatch[1]);
        return JSON.parse(decoded) as {
          orderNote?: string;
          cashTendered?: number | null;
          selectedBank?: { id: string; bankName: string; accountName: string; accountNumber: string; qrCodeImage?: string } | null;
        };
      } catch {
        return null;
      }
    }
    return null;
  })();
  const orderLevelNote = (() => {
    if (selectedOrder?.notes && String(selectedOrder.notes).trim().length > 0) {
      return String(selectedOrder.notes);
    }
    if (selectedOrderMeta?.note && String(selectedOrderMeta.note).trim().length > 0) {
      return String(selectedOrderMeta.note);
    }
    if (parsedOrderMeta?.orderNote && String(parsedOrderMeta.orderNote).trim().length > 0) {
      return String(parsedOrderMeta.orderNote);
    }
    for (const line of orderItems) {
      const text = String(line?.notes || '');
      const match = text.match(/Order Note >>>([\s\S]*?)<<</);
      if (match?.[1]) return match[1].trim();
    }
    return '';
  })();
  const detailsCashTendered = selectedOrder?.payment_method === 'cash'
    ? (Number.isFinite(selectedOrderMeta?.cashTendered)
      ? Number(selectedOrderMeta?.cashTendered)
      : (Number.isFinite(parsedOrderMeta?.cashTendered) ? Number(parsedOrderMeta?.cashTendered) : null))
    : null;
  const detailsChange = detailsCashTendered !== null
    ? Math.max(0, detailsCashTendered - Number(selectedOrder?.total_amount || 0))
    : null;
  const detailsSelectedBank = selectedOrderMeta?.selectedBank || parsedOrderMeta?.selectedBank || null;
  const formatPaymentMethodLabel = (method?: string) => {
    if (!method) return '-';
    return method === 'online' ? 'Transfer' : method.charAt(0).toUpperCase() + method.slice(1);
  };
  const getOrderItemName = getOrderLineDisplayName;

  const escapeCsvCell = (value: unknown) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const handleExportCsv = async () => {
    // Use selected orders if any, otherwise use all filtered orders
    const ordersToExport = selectedOrderIds.size > 0 
      ? filteredOrders.filter(order => selectedOrderIds.has(order.id))
      : filteredOrders;
    
    if (ordersToExport.length === 0) {
      return; // No orders to export
    }
    
    const hasNotes = ordersToExport.some((order) => {
      const notes = (order as any).notes || '';
      return typeof notes === 'string' && notes.trim() !== '';
    });

    const rows: string[] = [];
    const headerRow = [
      t.orderId,
      t.dateTime,
      t.status,
      t.paymentMethod,
      t.orderType,
      t.table,
      t.item,
      t.qty,
      t.price,
      t.total,
    ];
    
    if (hasNotes) {
      headerRow.push('Note');
    }
    
    rows.push(headerRow.map(escapeCsvCell).join(','));

    // Fetch order items for all orders
    for (const order of ordersToExport) {
      const tableNumber = (order as any).table?.table_number || '-';
      const orderNotes = (order as any).notes || '';
      
      let orderItems: any[] = [];
      
      if (isSupabaseConfigured) {
        try {
          // Try to fetch order items with item details
          let { data, error } = await supabase
            .from('order_items')
            .select('*, item:items(*)')
            .eq('order_id', order.id)
            .order('created_at', { ascending: true });
          
          if (error) {
            // Fallback: fetch without item relation
            const fallback = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', order.id)
              .order('created_at', { ascending: true });
            
            if (!fallback.error) {
              data = fallback.data;
            }
          }
          
          if (data && data.length > 0) {
            orderItems = data.filter((item: any) => 
              isDisplayableOrderItem(item) && !isCancelledKitchenItem(item)
            );
          }
        } catch (error) {
          console.error('Error fetching items for export:', error);
        }
      }
      
      // If order has items, create one row per item
      if (orderItems.length > 0) {
        // Calculate subtotal (before discount)
        const subtotal = orderItems.reduce((sum, item) => {
          return sum + (Number(item.price_at_time || 0) * Number(item.quantity || 0));
        }, 0);
        
        // Calculate discount amount
        const totalAmount = Number(order.total_amount || 0);
        const discountAmount = Math.max(0, subtotal - totalAmount);
        const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
        
        for (const item of orderItems) {
          const itemName = getOrderLineDisplayName(item);
          const quantity = item.quantity || 0;
          const priceBeforeDiscount = Number(item.price_at_time || 0);
          const itemSubtotal = priceBeforeDiscount * quantity;
          
          // Apply proportional discount to this item
          const itemDiscount = itemSubtotal * discountRatio;
          const itemTotal = itemSubtotal - itemDiscount;
          const priceAfterDiscount = quantity > 0 ? itemTotal / quantity : priceBeforeDiscount;
          
          const dataRow: string[] = [
            order.id,
            format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss'),
            order.status,
            formatPaymentMethodLabel(order.payment_method),
            (order as any).order_type || 'dine-in',
            tableNumber,
            itemName,
            String(quantity),
            priceAfterDiscount.toFixed(2),
            itemTotal.toFixed(2),
          ];
          
          if (hasNotes) {
            dataRow.push(typeof orderNotes === 'string' ? orderNotes : '');
          }
          
          rows.push(dataRow.map(escapeCsvCell).join(','));
        }
      } else {
        // If no items found, create one row with order totals
        const dataRow: string[] = [
          order.id,
          format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss'),
          order.status,
          formatPaymentMethodLabel(order.payment_method),
          (order as any).order_type || 'dine-in',
          tableNumber,
          '-',
          '-',
          '-',
          Number(order.total_amount || 0).toFixed(2),
        ];
        
        if (hasNotes) {
          dataRow.push(typeof orderNotes === 'string' ? orderNotes : '');
        }
        
        rows.push(dataRow.map(escapeCsvCell).join(','));
      }
    }

    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `order-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 sm:pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.orderHistory}</h2>
        <Button
          variant="outline"
          className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 w-full sm:w-auto"
          onClick={handleExportCsv}
          disabled={filteredOrders.length === 0}
        >
          <Download className="h-4 w-4" />
          {t.exportCsv}
          {selectedOrderIds.size > 0 && ` (${selectedOrderIds.size})`}
        </Button>
      </div>

      <Card className="border-blue-100 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 bg-blue-50/30 border-b border-blue-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
              <Input
                placeholder={t.searchOrder}
                className="pl-9 border-blue-100 focus:border-blue-300 focus:ring-blue-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 w-full sm:w-auto" onClick={() => setIsFilterOpen(true)}>
              <Filter className="h-4 w-4" />
              {t.filter} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile card layout */}
          <div className="block sm:hidden divide-y divide-zinc-100">
            {paginatedOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">{t.noOrders}</div>
            ) : (
              paginatedOrders.map((order) => (
                <div key={order.id} className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm font-mono">{order.id.substring(0, 8).toUpperCase()}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'}`}>
                        {order.status === 'completed' ? t.completed : order.status === 'pending' ? t.pending : t.cancelled}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}</span>
                      <span className="font-semibold text-zinc-900">{formatCurrency(order.total_amount, currencySettings)}</span>
                    </div>
                    <div className="text-xs text-zinc-400">{formatPaymentMethodLabel(order.payment_method)}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {user?.role === 'admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleOrderSelection(order.id)}
                      >
                        {selectedOrderIds.has(order.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600 fill-current" />
                        ) : (
                          <Square className="h-4 w-4 text-zinc-400" />
                        )}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintReceipt(order)}>
                      <Printer className="h-4 w-4 text-zinc-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetails(order)}>
                      <Eye className="h-4 w-4 text-zinc-500" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Desktop table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-50 bg-blue-50/20 text-left text-blue-600">
                  {user?.role === 'admin' && (
                    <th className="p-4 w-10">
                      <button
                        type="button"
                        onClick={toggleAllSelection}
                        className="flex items-center justify-center h-5 w-5 rounded border border-zinc-300 bg-white"
                      >
                        {selectedOrderIds.size === paginatedOrders.length && paginatedOrders.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-blue-600 fill-current" />
                        ) : (
                          <Square className="h-4 w-4 text-zinc-400" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="p-4 font-semibold">{t.orderId}</th>
                  <th className="p-4 font-semibold">{t.dateTime}</th>
                  <th className="p-4 font-semibold">{t.total}</th>
                  <th className="p-4 font-semibold">{t.payment}</th>
                  <th className="p-4 font-semibold">{t.status}</th>
                  <th className="p-4 font-semibold text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'admin' ? 7 : 6} className="p-8 text-center text-zinc-500">
                      {t.noOrders}
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <tr key={order.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                      {user?.role === 'admin' && (
                        <td className="p-4 w-10">
                          <button
                            type="button"
                            onClick={() => toggleOrderSelection(order.id)}
                            className="flex items-center justify-center h-5 w-5 rounded border border-zinc-300 bg-white"
                          >
                            {selectedOrderIds.has(order.id) ? (
                              <CheckSquare className="h-4 w-4 text-blue-600 fill-current" />
                            ) : (
                              <Square className="h-4 w-4 text-zinc-400" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="p-4 font-medium">{order.id.substring(0, 8).toUpperCase()}</td>
                      <td className="p-4 text-zinc-500">
                        {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(order.total_amount, currencySettings)}</td>
                      <td className="p-4">{formatPaymentMethodLabel(order.payment_method)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {order.status === 'completed' ? t.completed : order.status === 'pending' ? t.pending : t.cancelled}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(order)} title={t.printReceipt}>
                            <Printer className="h-4 w-4 text-zinc-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(order)} title={t.viewDetails}>
                            <Eye className="h-4 w-4 text-zinc-500" />
                          </Button>
                          {user?.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => toggleOrderSelection(order.id)}
                              title={t.selectForDeletion}
                            >
                              {selectedOrderIds.has(order.id) ? (
                                <CheckSquare className="h-4 w-4 fill-current" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span>{t.show}</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>{t.itemsPerPage}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
              >
                {t.prev}
              </Button>
              <span className="text-sm text-zinc-600">
                {t.page} {safeCurrentPage} {t.of} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
              >
                {t.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating Delete Button for Admin */}
      {user?.role === 'admin' && selectedOrderIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <Button
            variant="destructive"
            className="h-12 px-8 rounded-full shadow-lg hover:shadow-xl hover:bg-red-700 transition-all animate-in slide-in-from-bottom-4"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 className="mr-2 h-5 w-5" />
            {t.delete} {selectedOrderIds.size} {selectedOrderIds.size === 1 ? t.selectedOrder : t.selectedOrders}
          </Button>
        </div>
      )}

      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t.smartFilter}</DialogTitle>
            <DialogDescription>
              {t.filterDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t.payment}</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'cash' | 'online')}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">{t.all}</option>
                <option value="cash">{t.cash}</option>
                <option value="online">{t.transfer}</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">{t.status}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'completed' | 'cancelled')}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">{t.all}</option>
                <option value="completed">{t.completed}</option>
                <option value="pending">{t.pending}</option>
                <option value="cancelled">{t.cancelled}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t.dateFrom}</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t.dateTo}</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentFilter('all');
                setStatusFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
            >
              {t.clear}
            </Button>
            <Button onClick={() => setIsFilterOpen(false)}>
              {t.apply}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t.orderDetails}</DialogTitle>
            <DialogDescription>
              {t.orderId}: <span className="font-mono font-medium text-zinc-900">{selectedOrder?.id?.substring(0, 8).toUpperCase()}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-zinc-500">{t.date}</div>
                  <div className="font-medium">{format(new Date(selectedOrder.created_at), 'MMM dd, yyyy HH:mm')}</div>
                </div>
                <div>
                  <div className="text-zinc-500">{t.status}</div>
                  <div className="capitalize font-medium">
                    {selectedOrder.status === 'completed' ? t.completed : selectedOrder.status === 'pending' ? t.pending : t.cancelled}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">{t.paymentMethod}</div>
                  <div className="font-medium">{formatPaymentMethodLabel(selectedOrder.payment_method)}</div>
                </div>
                {detailsSelectedBank && (
                  <>
                    <div>
                      <div className="text-zinc-500">{t.bank}</div>
                      <div className="font-medium">{detailsSelectedBank.bankName}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">{t.accountName}</div>
                      <div className="font-medium">{detailsSelectedBank.accountName}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-zinc-500">{t.accountNumber}</div>
                      <div className="font-mono font-medium">{detailsSelectedBank.accountNumber}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="border rounded-md">
                <div className="bg-zinc-50 p-3 border-b text-xs font-medium text-zinc-500 uppercase tracking-wider grid grid-cols-12 gap-4">
                  <div className="col-span-6">{t.item}</div>
                  <div className="col-span-2 text-center">{t.qty}</div>
                  <div className="col-span-2 text-right">{t.price}</div>
                  <div className="col-span-2 text-right">{t.total}</div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {isLoadingDetails ? (
                    <div className="p-8 flex justify-center items-center text-zinc-500">
                      {t.loadingItems}
                    </div>
                  ) : orderItems.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">{t.noItems}</div>
                  ) : (
                    orderItems.filter(isDisplayableOrderItem).map((item, idx) => {
                      const cancelled = isCancelledKitchenItem(item);
                      return (
                      <div
                        key={item.id || idx}
                        className={`p-3 border-b last:border-0 grid grid-cols-12 gap-4 text-sm items-center ${
                          cancelled ? 'bg-red-50/60' : ''
                        }`}
                      >
                        <div className="col-span-6">
                          <div className={`font-medium ${cancelled ? 'line-through text-red-600' : ''}`}>
                            {getOrderItemName(item)}
                          </div>
                          {cancelled && (
                            <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                              {t.itemCancelled}
                            </span>
                          )}
                        </div>
                        <div className={`col-span-2 text-center ${cancelled ? 'text-red-500 line-through' : ''}`}>
                          {item.quantity}
                        </div>
                        <div className={`col-span-2 text-right ${cancelled ? 'text-red-400 line-through' : ''}`}>
                          {formatCurrency(item.price_at_time, currencySettings)}
                        </div>
                        <div className={`col-span-2 text-right font-medium ${cancelled ? 'text-red-400 line-through' : ''}`}>
                          {formatCurrency((item.price_at_time * item.quantity), currencySettings)}
                        </div>
                      </div>
                    );
                    })
                  )}
                </div>
              </div>

              {orderLevelNote && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <div className="text-xs font-medium text-yellow-800 uppercase tracking-wider">{t.orderNote}</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-yellow-900">
                    {orderLevelNote}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-y-1 text-sm">
                <div className="w-48 space-y-2">
                  <div className="flex justify-between text-zinc-500">
                    <span>{t.subtotal}</span>
                    <span>{formatCurrency(detailsSubtotal, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>{t.tax}</span>
                    <span>{formatCurrency(detailsTax, currencySettings)}</span>
                  </div>
                  {detailsCashTendered !== null && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t.cashTendered}</span>
                      <span>{formatCurrency(detailsCashTendered, currencySettings)}</span>
                    </div>
                  )}
                  {detailsChange !== null && (
                    <div className="flex justify-between text-zinc-500">
                      <span>{t.change}</span>
                      <span>{formatCurrency(detailsChange, currencySettings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-bold text-lg">
                    <span>{t.total}</span>
                    <span>{formatCurrency(selectedOrder.total_amount, currencySettings)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">{t.deleteOrders}</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {t.deleteConfirm} {selectedOrderIds.size} {selectedOrderIds.size === 1 ? t.selectedOrder : t.selectedOrders}? {t.deleteConfirmEnd}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {Array.from(selectedOrderIds).slice(0, 5).map((orderId) => (
                <div key={orderId} className="flex items-center justify-between text-sm p-2 bg-zinc-50 rounded">
                  <span className="font-mono text-zinc-700">{orderId.substring(0, 8).toUpperCase()}</span>
                </div>
              ))}
              {selectedOrderIds.size > 5 && (
                <div className="text-center text-zinc-500 text-sm py-2">
                  +{selectedOrderIds.size - 5} {t.more} {selectedOrderIds.size - 5 === 1 ? t.selectedOrder : t.selectedOrders}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrders}
            >
              {t.delete} {selectedOrderIds.size} {selectedOrderIds.size === 1 ? t.selectedOrder : t.selectedOrders}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

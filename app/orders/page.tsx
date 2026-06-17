'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Eye, Printer, Trash2, CheckSquare, Square } from 'lucide-react';
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

const MOCK_ORDERS: Order[] = [
  { id: 'ORD-001', total_amount: 45.50, status: 'completed', payment_method: 'card', created_at: new Date().toISOString() },
  { id: 'ORD-002', total_amount: 12.00, status: 'completed', payment_method: 'cash', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'ORD-003', total_amount: 89.99, status: 'pending', payment_method: 'online', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'ORD-004', total_amount: 24.50, status: 'cancelled', payment_method: 'cash', created_at: new Date(Date.now() - 86400000).toISOString() },
];

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
  const [isPrinting, setIsPrinting] = useState(false);

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

  // Function to convert HTML to image and send to printer
  const printHTMLAsImage = async (html: string, printerIp: string, paperWidth: string) => {
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

  const fetchOrderDetails = async (orderId: string) => {
    if (!isSupabaseConfigured) return;

    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          item:items(*)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setOrderItems(data);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setOrderItems([]);
    setIsDetailsOpen(true);
    fetchOrderDetails(order.id);
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
        const { data } = await supabase
          .from('order_items')
          .select('*, item:items(*)')
          .eq('order_id', order.id)
          .order('created_at', { ascending: true });
        itemsToPrint = data || [];
      } catch (error) {
        console.error('Error fetching items for print:', error);
        alert('Failed to load items for printing.');
        return;
      }
    } else {
      // Mock items for demo
      itemsToPrint = [
        { quantity: 1, price_at_time: 10.00, item: { name: 'Mock Item A' } },
        { quantity: 2, price_at_time: 15.00, item: { name: 'Mock Item B' } }
      ];
    }

    const getItemName = (line: any) => {
      if (line.item?.name) return line.item.name;
      const notesText = String(line.notes || '');
      const itemMatch = notesText.match(/Item:\s*([^|]+)/i);
      if (itemMatch?.[1]) return itemMatch[1].trim();
      const recipeMatch = notesText.match(/Recipe:\s*([^|]+)/i);
      if (recipeMatch?.[1]) return recipeMatch[1].trim();
      return 'Unknown Item';
    };

    const receiptHtml = `
      <html>
        <head>
          <title>Receipt - ${order.id}</title>
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
            .item-row { margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="text-center mb-4">
            <h3 class="font-bold text-sm" style="margin:0 0 2px 0;">My Awesome Store</h3>
            <div class="text-xs" style="margin-bottom:2px;">${receiptSettings.storeAddress}</div>
            <div class="text-xs" style="margin-bottom:2px;">${receiptSettings.phoneNumber}</div>
            <div class="text-xs mt-2">${receiptSettings.headerText}</div>
          </div>
          <div class="text-xs mb-4">
            Order: ${order.id.substring(0, 8).toUpperCase()}<br>
            Date: ${format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
            ${receiptSettings.showTableNumber !== false && (order as any).table ? '<br>Table: ' + (order as any).table.table_number : ''}
          </div>
          <div class="border-y text-xs">
            <table>
              <thead>
                <tr>
                  <th style="text-align:left; padding-bottom: 4px;">Item</th>
                  <th style="text-align:right; padding-bottom: 4px;">Unit</th>
                  <th style="text-align:right; padding-bottom: 4px;">Price</th>
                  <th style="text-align:right; padding-bottom: 4px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsToPrint.map((item: any) => `
                  <tr>
                    <td style="padding: 2px 0; text-align:left;">${getItemName(item)}</td>
                    <td style="padding: 2px 0; text-align:right;">${item.quantity}</td>
                    <td style="padding: 2px 0; text-align:right;">${formatCurrency(item.price_at_time, currencySettings)}</td>
                    <td style="padding: 2px 0; text-align:right;">${formatCurrency((item.price_at_time * item.quantity), currencySettings)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="flex font-bold text-sm">
            <span>TOTAL</span>
            <span>${formatCurrency(order.total_amount, currencySettings)}</span>
          </div>
          ${(order.payment_method === 'online' && receiptSettings.showBankDetail) ? (() => {
        const meta = orderMetaById[order.id];
        let bank = meta?.selectedBank;
        if (!bank) {
          for (const line of itemsToPrint) {
            const text = String(line?.notes || '');
            const match = text.match(/Order Meta >>>([^<]+)<{3}/);
            if (match?.[1]) {
              try {
                const parsed = JSON.parse(decodeURIComponent(match[1]));
                bank = parsed.selectedBank;
                if (bank) break;
              } catch { }
            }
          }
        }
        if (!bank) return '';
        const bankQrCodeImage = bankConfigs.find((configuredBank: any) => configuredBank.id === bank?.id)?.qrCodeImage || bank.qrCodeImage || '';
        return `
              <div style="margin-top: 8px; border-top: 1px dotted #000; padding-top: 6px;">
                <div class="font-bold" style="margin-bottom: 4px; font-size: 12px;">Bank</div>
                <div class="text-xs">Bank: ${bank.bankName || '-'}</div>
                <div class="text-xs">Account Name: ${bank.accountName || '-'}</div>
                <div class="text-xs">Account No: ${bank.accountNumber || '-'}</div>
                ${bankQrCodeImage ? `
                  <div style="text-align:center; margin-top: 10px; padding-top: 8px; border-top: 1px dotted #000;">
                    <div class="font-bold" style="font-size: 12px; margin-bottom: 6px;">Bank QR Code</div>
                    <img src="${bankQrCodeImage}" alt="Bank QR Code" style="width: 130px; height: 130px; object-fit: contain; display: block; margin: 0 auto;" />
                  </div>
                ` : ''}
              </div>
            `;
      })() : ''}
          ${order.notes ? `
          <div class="text-xs" style="margin-top: 10px; border-top: 1px dotted #000; padding-top: 5px;">
            <span class="font-bold">Notes:</span><br>
            <span>${order.notes}</span>
          </div>
          ` : ''}
          <div class="text-center mt-6 text-xs">
            ${receiptSettings.footerText}
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }
          </script>
        </body>
      </html>
    `;

    const printerId = receiptSettings.receiptPrinter;
    let targetPrinter = null;
    
    if (printerId) {
      targetPrinter = printerConfigs.find((p: any) => p.id === printerId && p.enabled);
    } else {
      targetPrinter = printerConfigs.find((p: any) => p.isDefault && p.enabled);
    }

    if (targetPrinter && targetPrinter.ipAddress !== 'System-Driver') {
      setIsPrinting(true);
      printHTMLAsImage(receiptHtml, targetPrinter.ipAddress, receiptSettings.receiptSize || '80mm')
        .catch(err => {
          console.error('Failed to print receipt via network:', err);
          alert(`Failed to print receipt: ${err.message}`);
        })
        .finally(() => {
          setIsPrinting(false);
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
        doc.write(receiptHtml);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
        }, 500);
      }
    } else {
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
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
  const detailsSubtotal = orderItems.reduce((sum, line) => sum + ((line.price_at_time || 0) * (line.quantity || 0)), 0);
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
  const getOrderItemName = (line: any) => {
    if (line.item?.name) return line.item.name;
    const notesText = String(line.notes || '');
    const itemMatch = notesText.match(/Item:\s*([^|]+)/i);
    if (itemMatch?.[1]) return itemMatch[1].trim();
    const recipeMatch = notesText.match(/Recipe:\s*([^|]+)/i);
    if (recipeMatch?.[1]) return recipeMatch[1].trim();
    return 'Unknown Item';
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.orderHistory}</h2>
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
                    orderItems.map((item, idx) => (
                      <div key={idx} className="p-3 border-b last:border-0 grid grid-cols-12 gap-4 text-sm items-center">
                        <div className="col-span-6">
                          <div className="font-medium">{getOrderItemName(item)}</div>
                        </div>
                        <div className="col-span-2 text-center">{item.quantity}</div>
                        <div className="col-span-2 text-right">{formatCurrency(item.price_at_time, currencySettings)}</div>
                        <div className="col-span-2 text-right font-medium">
                          {formatCurrency((item.price_at_time * item.quantity), currencySettings)}
                        </div>
                      </div>
                    ))
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

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Eye, Printer } from 'lucide-react';
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
} from "@/components/ui/dialog";

const MOCK_ORDERS: Order[] = [
  { id: 'ORD-001', total_amount: 45.50, status: 'completed', payment_method: 'card', created_at: new Date().toISOString() },
  { id: 'ORD-002', total_amount: 12.00, status: 'completed', payment_method: 'cash', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'ORD-003', total_amount: 89.99, status: 'pending', payment_method: 'online', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'ORD-004', total_amount: 24.50, status: 'cancelled', payment_method: 'cash', created_at: new Date(Date.now() - 86400000).toISOString() },
];

export default function OrderHistoryPage() {
  const { isSupabaseConfigured, receiptSettings, currencySettings, orderMetaById, silentPrint } = usePosStore();
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

  useEffect(() => {
    let mounted = true;
    const fetchOrders = async () => {
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
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
    const intervalId = setInterval(fetchOrders, 10000);
    const handleFocus = () => fetchOrders();
    window.addEventListener('focus', handleFocus);
    return () => {
      mounted = false;
      clearInterval(intervalId);
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
            <h3 class="font-bold text-sm">My Awesome Store</h3>
            <p class="text-xs">${receiptSettings.storeAddress}</p>
            <p class="text-xs">${receiptSettings.phoneNumber}</p>
          </div>
          <div class="text-center mb-4 text-xs">
            ${receiptSettings.headerText}
          </div>
          <div class="text-xs mb-4">
            Order: ${order.id.substring(0, 8).toUpperCase()}<br>
            Date: ${format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
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
        return `
              <div style="margin-top: 8px; border-top: 1px dotted #000; padding-top: 6px;">
                <div class="font-bold" style="margin-bottom: 4px; font-size: 12px;">Bank</div>
                <div class="text-xs">Bank: ${bank.bankName || '-'}</div>
                <div class="text-xs">Account Name: ${bank.accountName || '-'}</div>
                <div class="text-xs">Account No: ${bank.accountNumber || '-'}</div>
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
          selectedBank?: { id: string; bankName: string; accountName: string; accountNumber: string } | null;
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
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Order History</h2>
      </div>

      <Card className="border-blue-100 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 bg-blue-50/30 border-b border-blue-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
              <Input
                placeholder="Search order ID..."
                className="pl-9 border-blue-100 focus:border-blue-300 focus:ring-blue-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 w-full sm:w-auto" onClick={() => setIsFilterOpen(true)}>
              <Filter className="h-4 w-4" />
              Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile card layout */}
          <div className="block sm:hidden divide-y divide-zinc-100">
            {paginatedOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">No orders found.</div>
            ) : (
              paginatedOrders.map((order) => (
                <div key={order.id} className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm font-mono">{order.id.substring(0, 8).toUpperCase()}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}</span>
                      <span className="font-semibold text-zinc-900">{formatCurrency(order.total_amount, currencySettings)}</span>
                    </div>
                    <div className="text-xs text-zinc-400">{formatPaymentMethodLabel(order.payment_method)}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
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
                  <th className="p-4 font-semibold">Order ID</th>
                  <th className="p-4 font-semibold">Date & Time</th>
                  <th className="p-4 font-semibold">Total</th>
                  <th className="p-4 font-semibold">Payment</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <tr key={order.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
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
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(order)} title="Print Receipt">
                            <Printer className="h-4 w-4 text-zinc-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleViewDetails(order)} title="View Details">
                            <Eye className="h-4 w-4 text-zinc-500" />
                          </Button>
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
              <span>Show</span>
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
              <span>items per page</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
              >
                Prev
              </Button>
              <span className="text-sm text-zinc-600">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Smart Filter</DialogTitle>
            <DialogDescription>
              Filter by payment, status, and custom date range.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Payment</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'cash' | 'online')}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="cash">Cash</option>
                <option value="online">Transfer</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'completed' | 'cancelled')}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Date From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Date To</label>
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
              Clear
            </Button>
            <Button onClick={() => setIsFilterOpen(false)}>
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order ID: <span className="font-mono font-medium text-zinc-900">{selectedOrder?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-zinc-500">Date</div>
                  <div className="font-medium">{format(new Date(selectedOrder.created_at), 'MMM dd, yyyy HH:mm')}</div>
                </div>
                <div>
                  <div className="text-zinc-500">Status</div>
                  <div className="capitalize font-medium">{selectedOrder.status}</div>
                </div>
                <div>
                  <div className="text-zinc-500">Payment Method</div>
                  <div className="font-medium">{formatPaymentMethodLabel(selectedOrder.payment_method)}</div>
                </div>
                {detailsSelectedBank && (
                  <>
                    <div>
                      <div className="text-zinc-500">Bank</div>
                      <div className="font-medium">{detailsSelectedBank.bankName}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Account Name</div>
                      <div className="font-medium">{detailsSelectedBank.accountName}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-zinc-500">Account Number</div>
                      <div className="font-mono font-medium">{detailsSelectedBank.accountNumber}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="border rounded-md">
                <div className="bg-zinc-50 p-3 border-b text-xs font-medium text-zinc-500 uppercase tracking-wider grid grid-cols-12 gap-4">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {isLoadingDetails ? (
                    <div className="p-8 flex justify-center items-center text-zinc-500">
                      Loading items...
                    </div>
                  ) : orderItems.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">No items found for this order.</div>
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
                  <div className="text-xs font-medium text-yellow-800 uppercase tracking-wider">Order Note</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-yellow-900">
                    {orderLevelNote}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-y-1 text-sm">
                <div className="w-48 space-y-2">
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(detailsSubtotal, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Tax</span>
                    <span>{formatCurrency(detailsTax, currencySettings)}</span>
                  </div>
                  {detailsCashTendered !== null && (
                    <div className="flex justify-between text-zinc-500">
                      <span>Cash Tendered</span>
                      <span>{formatCurrency(detailsCashTendered, currencySettings)}</span>
                    </div>
                  )}
                  {detailsChange !== null && (
                    <div className="flex justify-between text-zinc-500">
                      <span>Change</span>
                      <span>{formatCurrency(detailsChange, currencySettings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(selectedOrder.total_amount, currencySettings)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

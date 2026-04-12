'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import { usePosStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatCurrency, formatCurrencyTick } from '@/lib/currency';

const TRANSLATIONS = {
  en: {
    salesReport: 'Sales Report',
    dateRange: 'Date Range',
    generated: 'Generated',
    summary: 'SUMMARY',
    metric: 'Metric',
    value: 'Value',
    grossSales: 'Gross Sales',
    netSales: 'Net Sales',
    totalOrders: 'Total Orders',
    averageOrder: 'Average Order',
    totalProfit: 'Total Profit',
    profitMargin: 'Profit Margin (%)',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    netProfitMargin: 'Net Profit Margin (%)',
    salesTrend: 'SALES TREND',
    date: 'Date',
    sales: 'Sales',
    orders: 'Orders',
    salesByCategory: 'SALES BY CATEGORY',
    category: 'Category',
    salesByItem: 'SALES BY ITEM',
    item: 'Item',
    quantitySold: 'Quantity Sold',
    totalBeforeDeductions: 'Total before deductions',
    estimatedAfterTax: 'Estimated after tax',
    completedTransactions: 'Completed transactions',
    averageTicketSize: 'Average ticket size',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    custom: 'Custom',
    exportCsv: 'Export CSV',
    startDate: 'Start Date',
    endDate: 'End Date',
    loadingChart: 'Loading chart...',
    noItemSales: 'No item sales for this period.',
  },
  lo: {
    salesReport: 'ລາຍງານການຂາຍ',
    dateRange: 'ໄລຍະວັນທີ',
    generated: 'ສ້າງຂື້ນ',
    summary: 'ສະຫຼຸບ',
    metric: 'ຕົວຊີ້ວັດ',
    value: 'ມູນຄ່າ',
    grossSales: 'ຍອດຂາຍລວມ',
    netSales: 'ຍອດຂາຍສຸດທິ',
    totalOrders: 'ລວມຄໍາສັ່ງ',
    averageOrder: 'ຄໍາສັ່ງສະເລ່ຍ',
    totalProfit: 'ກໍາໄລລວມ',
    profitMargin: 'ອັດຕາກໍາໄລ (%)',
    totalExpenses: 'ລວມຄ່າໃຊ້ສອຍ',
    netProfit: 'ກໍາໄລສຸດທິ',
    netProfitMargin: 'ອັດຕາກໍາໄລສຸດທິ (%)',
    salesTrend: 'ແນວໂນ້ມການຂາຍ',
    date: 'ວັນທີ',
    sales: 'ການຂາຍ',
    orders: 'ຄໍາສັ່ງ',
    salesByCategory: 'ການຂາຍຕາມປະເພດ',
    category: 'ປະເພດ',
    salesByItem: 'ການຂາຍຕາມລາຍການ',
    item: 'ລາຍການ',
    quantitySold: 'ປະລິມານທີ່ຂາຍ',
    totalBeforeDeductions: 'ລວມກ່ອນຫັກລົບ',
    estimatedAfterTax: 'ຄາດຄະເນຫຼັງຫັກອາກອນ',
    completedTransactions: 'ທຸລະກຳທີ່ສຳເລັດ',
    averageTicketSize: 'ຂະໜາດບັດໂດຍສະເລ່ຍ',
    daily: 'ປະຈຳວັນ',
    weekly: 'ປະຈຳອາທິດ',
    monthly: 'ປະຈຳເດືອນ',
    custom: 'ກຳນົດເອງ',
    exportCsv: 'ສົ່ງອອກ CSV',
    startDate: 'ວັນທີເລີ່ມຕົ້ນ',
    endDate: 'ວັນທີສິ້ນສຸດ',
    loadingChart: 'ກຳລັງໂຫລດຕາຕະລາງ...',
    noItemSales: 'ບໍ່ມີຍອດຂາຍສິນຄ້າໃນໄລຍະນີ້.',
  },
  th: {
    salesReport: 'รายงานการขาย',
    dateRange: 'ช่วงวันที่',
    generated: 'สร้างเมื่อ',
    summary: 'สรุปผล',
    metric: 'ตัวชี้วัด',
    value: 'มูลค่า',
    grossSales: 'ยอดขายรวม',
    netSales: 'ยอดขายสุทธิ',
    totalOrders: 'จำนวนออเดอร์ทั้งหมด',
    averageOrder: 'ยอดขายเฉลี่ยต่อออเดอร์',
    totalProfit: 'กำไรทั้งหมด',
    profitMargin: 'อัตรากำไร (%)',
    totalExpenses: 'ค่าใช้จ่ายทั้งหมด',
    netProfit: 'กำไรสุทธิ',
    netProfitMargin: 'อัตรากำไรสุทธิ (%)',
    salesTrend: 'แนวโน้มการขาย',
    date: 'วันที่',
    sales: 'ยอดขาย',
    orders: 'ออเดอร์',
    salesByCategory: 'ยอดขายตามหมวดหมู่',
    category: 'หมวดหมู่',
    salesByItem: 'ยอดขายตามรายการขาย',
    item: 'รายการ',
    quantitySold: 'จำนวนที่ขายได้',
    totalBeforeDeductions: 'ยอดรวมก่อนหักลบ',
    estimatedAfterTax: 'ประมาณการหลังหักภาษี',
    completedTransactions: 'รายการที่เสร็จสมบูรณ์',
    averageTicketSize: 'ยอดขายเฉลี่ยต่อใบเสร็จ',
    daily: 'รายวัน',
    weekly: 'รายสัปดาห์',
    monthly: 'รายเดือน',
    custom: 'กำหนดเอง',
    exportCsv: 'ส่งออก CSV',
    startDate: 'วันที่เริ่มต้น',
    endDate: 'วันที่สิ้นสุด',
    loadingChart: 'กำลังโหลดกราฟ...',
    noItemSales: 'ไม่มีรายการขายในท่วงเวลานี้',
  }
};

const MOCK_SALES_DATA = [
  { date: 'Mon', sales: 1200, orders: 45 },
  { date: 'Tue', sales: 1400, orders: 52 },
  { date: 'Wed', sales: 1100, orders: 38 },
  { date: 'Thu', sales: 1500, orders: 60 },
  { date: 'Fri', sales: 2000, orders: 85 },
  { date: 'Sat', sales: 2400, orders: 110 },
  { date: 'Sun', sales: 1800, orders: 75 },
];

const MOCK_CATEGORY_DATA = [
  { name: 'Burgers', value: 4500 },
  { name: 'Drinks', value: 1200 },
  { name: 'Sides', value: 800 },
];

export default function ReportsPage() {
  const { isSupabaseConfigured, currencySettings, generalSettings } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];

  const [salesData, setSalesData] = useState(MOCK_SALES_DATA);
  const [categoryData, setCategoryData] = useState(MOCK_CATEGORY_DATA);
  const [itemSalesData, setItemSalesData] = useState<{ name: string; quantity: number; sales: number }[]>([]);
  const [mounted, setMounted] = useState(false);
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [reportSummary, setReportSummary] = useState({
    grossSales: 11400,
    netSales: 10488,
    totalOrders: 465,
    averageOrder: 24.51,
    totalProfit: 0,
    profitMargin: 0,
    totalExpenses: 0,
    netProfit: 0,
    netProfitMargin: 0
  });

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  const handleExportCSV = () => {
    // Get current language at export time
    const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
    const translations = TRANSLATIONS[currentLanguage];

    const getRangeBounds = () => {
      const now = new Date();
      const start = new Date();
      const end = new Date();

      if (dateRange === 'daily') {
        start.setHours(0, 0, 0, 0);
      } else if (dateRange === 'weekly') {
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 6);
      } else if (dateRange === 'monthly') {
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 29);
      } else {
        if (customDateFrom) {
          const from = new Date(`${customDateFrom}T00:00:00`);
          if (!Number.isNaN(from.getTime())) {
            start.setTime(from.getTime());
          }
        } else {
          start.setHours(0, 0, 0, 0);
          start.setDate(start.getDate() - 6);
        }

        if (customDateTo) {
          const to = new Date(`${customDateTo}T23:59:59`);
          if (!Number.isNaN(to.getTime())) {
            end.setTime(to.getTime());
          }
        }
      }

      return { start, end };
    };

    const { start, end } = getRangeBounds();
    const dateRangeStr = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;

    let csv = `${translations.salesReport}\n`;
    csv += `${translations.dateRange}: ${dateRangeStr}\n`;
    csv += `${translations.generated}: ${new Date().toLocaleString()}\n\n`;

    // Summary section
    csv += `${translations.summary}\n`;
    csv += `${translations.metric},${translations.value}\n`;
    csv += `${translations.grossSales},"${formatCurrency(reportSummary.grossSales, currencySettings)}"\n`;
    csv += `${translations.netSales},"${formatCurrency(reportSummary.netSales, currencySettings)}"\n`;
    csv += `${translations.totalOrders},${reportSummary.totalOrders}\n`;
    csv += `${translations.averageOrder},"${formatCurrency(reportSummary.averageOrder, currencySettings)}"\n`;
    csv += `${translations.totalProfit},"${formatCurrency(reportSummary.totalProfit, currencySettings)}"\n`;
    csv += `${translations.profitMargin},${reportSummary.profitMargin.toFixed(2)}%\n`;
    csv += `${translations.totalExpenses},"${formatCurrency(reportSummary.totalExpenses, currencySettings)}"\n`;
    csv += `${translations.netProfit},"${formatCurrency(reportSummary.netProfit, currencySettings)}"\n`;
    csv += `${translations.netProfitMargin},${reportSummary.netProfitMargin.toFixed(2)}%\n\n`;

    // Sales trend section
    csv += `${translations.salesTrend}\n`;
    csv += `${translations.date},${translations.sales},${translations.orders}\n`;
    salesData.forEach((row) => {
      csv += `${row.date},"${formatCurrency(row.sales, currencySettings)}",${row.orders}\n`;
    });
    csv += '\n';

    // Category sales section
    csv += `${translations.salesByCategory}\n`;
    csv += `${translations.category},${translations.sales}\n`;
    categoryData.forEach((row) => {
      csv += `${row.name},"${formatCurrency(row.value, currencySettings)}"\n`;
    });
    csv += '\n';

    // Item sales section
    csv += `${translations.salesByItem}\n`;
    csv += `${translations.item},${translations.quantitySold},${translations.sales}\n`;
    itemSalesData.forEach((row) => {
      csv += `${row.name},${row.quantity},"${formatCurrency(row.sales, currencySettings)}"\n`;
    });

    // Trigger download
    const element = document.createElement('a');
    // Add UTF-8 BOM for better Lao character support
    const bom = '\uFEFF';
    const file = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    element.href = URL.createObjectURL(file);
    const filename = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  useEffect(() => {
    const getRangeBounds = () => {
      const now = new Date();
      const start = new Date();
      const end = new Date();

      if (dateRange === 'daily') {
        start.setHours(0, 0, 0, 0);
      } else if (dateRange === 'weekly') {
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 6);
      } else if (dateRange === 'monthly') {
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 29);
      } else {
        if (customDateFrom) {
          const from = new Date(`${customDateFrom}T00:00:00`);
          if (!Number.isNaN(from.getTime())) {
            start.setTime(from.getTime());
          }
        } else {
          start.setHours(0, 0, 0, 0);
          start.setDate(start.getDate() - 6);
        }

        if (customDateTo) {
          const to = new Date(`${customDateTo}T23:59:59`);
          if (!Number.isNaN(to.getTime())) {
            end.setTime(to.getTime());
          }
        }
      }

      return { start, end };
    };

    const makeSalesTrendData = (orders: any[], start: Date, end: Date) => {
      if (dateRange === 'daily') {
        const hourBuckets: Record<string, { sales: number; orders: number }> = {};
        for (let i = 0; i < 24; i += 1) {
          const key = String(i).padStart(2, '0');
          hourBuckets[key] = { sales: 0, orders: 0 };
        }
        for (const order of orders) {
          const d = new Date(order.created_at);
          if (d < start || d > end) continue;
          const hourKey = String(d.getHours()).padStart(2, '0');
          hourBuckets[hourKey].sales += Number(order.total_amount || 0);
          hourBuckets[hourKey].orders += 1;
        }
        return Object.entries(hourBuckets).map(([hour, values]) => ({
          date: `${hour}:00`,
          sales: values.sales,
          orders: values.orders,
        }));
      }

      const dayBuckets: Record<string, { sales: number; orders: number }> = {};
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(0, 0, 0, 0);

      while (cursor <= endDay) {
        const key = cursor.toISOString().slice(0, 10);
        dayBuckets[key] = { sales: 0, orders: 0 };
        cursor.setDate(cursor.getDate() + 1);
      }

      for (const order of orders) {
        const d = new Date(order.created_at);
        if (d < start || d > end) continue;
        const key = d.toISOString().slice(0, 10);
        if (key in dayBuckets) {
          dayBuckets[key].sales += Number(order.total_amount || 0);
          dayBuckets[key].orders += 1;
        }
      }

      return Object.entries(dayBuckets).map(([key, values]) => {
        const d = new Date(`${key}T00:00:00`);
        return {
          date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          sales: values.sales,
          orders: values.orders,
        };
      });
    };

    const load = async () => {
      const { start, end } = getRangeBounds();

      if (isSupabaseConfigured) {
        try {
          const [{ data: orders }, { data: orderItems }, { data: categories }, { data: items }, { data: expenses }] = await Promise.all([
            supabase.from('orders').select('id, total_amount, created_at, status'),
            supabase.from('order_items').select('order_id, quantity, price_at_time, item:items(name, category_id)'),
            supabase.from('categories').select('id, name'),
            supabase.from('items').select('id, cost_price'),
            supabase.from('expenses').select('amount, created_at'),
          ]);

          const completedOrders = (orders || []).filter((order: any) => {
            if (order.status !== 'completed') return false;
            const createdAt = new Date(order.created_at);
            return createdAt >= start && createdAt <= end;
          });

          const grossSales = completedOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0);
          const totalOrders = completedOrders.length;
          const averageOrder = totalOrders > 0 ? grossSales / totalOrders : 0;
          const netSales = grossSales * 0.92;

          // Calculate profit
          let totalCost = 0;
          if (orderItems && items) {
            const itemCostMap: Record<string, number> = {};
            items.forEach((item: any) => {
              itemCostMap[item.id] = Number(item.cost_price || 0);
            });

            const completedOrderIds = new Set(completedOrders.map((o: any) => String(o.id)));
            orderItems.forEach((orderItem: any) => {
              if (completedOrderIds.has(String(orderItem.order_id))) {
                const cost = itemCostMap[orderItem.item_id] || 0;
                totalCost += cost * Number(orderItem.quantity || 0);
              }
            });
          }

          // Calculate expenses
          let totalExpenses = 0;
          if (expenses) {
            totalExpenses = expenses.reduce((sum: number, expense: any) => {
              const expenseDate = new Date(expense.created_at);
              if (expenseDate >= start && expenseDate <= end) {
                return sum + Number(expense.amount || 0);
              }
              return sum;
            }, 0);
          }

          const totalProfit = grossSales - totalCost;
          const profitMargin = grossSales > 0 ? (totalProfit / grossSales) * 100 : 0;
          const netProfit = totalProfit - totalExpenses;
          const netProfitMargin = grossSales > 0 ? (netProfit / grossSales) * 100 : 0;

          setReportSummary({
            grossSales,
            netSales,
            totalOrders,
            averageOrder,
            totalProfit,
            profitMargin,
            totalExpenses,
            netProfit,
            netProfitMargin,
          });

          setSalesData(makeSalesTrendData(completedOrders, start, end));

          const completedOrderIds = new Set(completedOrders.map((o: any) => String(o.id)));
          const categoryNameById = (categories || []).reduce((acc: Record<string, string>, c: any) => {
            acc[String(c.id)] = String(c.name);
            return acc;
          }, {});
          const categoryTotals: Record<string, number> = {};
          const itemTotals: Record<string, { quantity: number; sales: number }> = {};

          for (const line of orderItems || []) {
            if (!completedOrderIds.has(String(line.order_id))) continue;
            const categoryId = (line as any).item?.category_id;
            const itemName = String((line as any).item?.name || 'Unknown Item');
            const quantity = Number(line.quantity || 0);
            const lineSales = Number((line.price_at_time || 0) * quantity);
            const categoryName = categoryId ? (categoryNameById[String(categoryId)] || 'Other') : 'Other';
            categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + lineSales;
            if (!itemTotals[itemName]) {
              itemTotals[itemName] = { quantity: 0, sales: 0 };
            }
            itemTotals[itemName].quantity += quantity;
            itemTotals[itemName].sales += lineSales;
          }

          const categoryChart = Object.entries(categoryTotals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
          const itemChart = Object.entries(itemTotals)
            .map(([name, values]) => ({ name, quantity: values.quantity, sales: values.sales }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 20);

          setCategoryData(categoryChart.length > 0 ? categoryChart : [{ name: 'No Data', value: 0 }]);
          setItemSalesData(itemChart);
        } catch (error) {
          console.error('Error fetching reports data:', error);
        }
      } else {
        const grossSales = MOCK_SALES_DATA.reduce((sum, row) => sum + row.sales, 0);
        const totalOrders = MOCK_SALES_DATA.reduce((sum, row) => sum + row.orders, 0);
        const averageOrder = totalOrders > 0 ? grossSales / totalOrders : 0;
        const netSales = grossSales * 0.92;
        const totalCost = grossSales * 0.35; // Mock: assume 35% cost
        const totalProfit = grossSales - totalCost;
        const profitMargin = grossSales > 0 ? (totalProfit / grossSales) * 100 : 0;
        const totalExpenses = grossSales * 0.08; // Mock: assume 8% expenses
        const netProfit = totalProfit - totalExpenses;
        const netProfitMargin = grossSales > 0 ? (netProfit / grossSales) * 100 : 0;

        setReportSummary({
          grossSales,
          netSales,
          totalOrders,
          averageOrder,
          totalProfit,
          profitMargin,
          totalExpenses,
          netProfit,
          netProfitMargin,
        });
        setSalesData(MOCK_SALES_DATA);
        setCategoryData(MOCK_CATEGORY_DATA);
        setItemSalesData([
          { name: 'Classic Burger', quantity: 120, sales: 1078.8 },
          { name: 'Cheese Burger', quantity: 98, sales: 979.02 },
          { name: 'Fries', quantity: 150, sales: 598.5 },
          { name: 'Cola', quantity: 180, sales: 450 },
        ]);
      }
    };

    load();
  }, [isSupabaseConfigured, dateRange, customDateFrom, customDateTo]);

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-8 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.salesReport}</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-1.5 w-full sm:w-auto shadow-sm">
            <Button
              variant={dateRange === 'daily' ? 'default' : 'ghost'}
              size="sm"
              className={`h-9 rounded-xl text-xs font-bold transition-all ${dateRange === 'daily' ? 'bg-white text-zinc-900 shadow-sm hover:bg-white' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              onClick={() => setDateRange('daily')}
            >
              {t.daily}
            </Button>
            <Button
              variant={dateRange === 'weekly' ? 'default' : 'ghost'}
              size="sm"
              className={`h-9 rounded-xl text-xs font-bold transition-all ${dateRange === 'weekly' ? 'bg-white text-zinc-900 shadow-sm hover:bg-white' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              onClick={() => setDateRange('weekly')}
            >
              {t.weekly}
            </Button>
            <Button
              variant={dateRange === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              className={`h-9 rounded-xl text-xs font-bold transition-all ${dateRange === 'monthly' ? 'bg-white text-zinc-900 shadow-sm hover:bg-white' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              onClick={() => setDateRange('monthly')}
            >
              {t.monthly}
            </Button>
            <Button
              variant={dateRange === 'custom' ? 'default' : 'ghost'}
              size="sm"
              className={`h-9 rounded-xl text-xs font-bold transition-all ${dateRange === 'custom' ? 'bg-white text-zinc-900 shadow-sm hover:bg-white' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              onClick={() => setDateRange('custom')}
            >
              {t.custom}
            </Button>
          </div>

          <Button
            className="w-full sm:w-auto h-12 rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 font-bold transition-all active:scale-95"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4" />
            <span>{t.exportCsv}</span>
          </Button>
        </div>
      </div>

      {dateRange === 'custom' && (
        <Card className="border-blue-100 bg-blue-50/30 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-blue-900/60 uppercase ml-1">{t.startDate}</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="h-11 pl-9 rounded-xl border-blue-200 bg-white shadow-sm focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-blue-900/60 uppercase ml-1">{t.endDate}</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="h-11 pl-9 rounded-xl border-blue-200 bg-white shadow-sm focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm overflow-hidden text-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-blue-100">
            <CardTitle className="text-sm font-semibold">{t.grossSales}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatCurrency(reportSummary.grossSales, currencySettings)}</div>
            <p className="text-xs italic opacity-70">{t.totalBeforeDeductions}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm overflow-hidden text-emerald-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-emerald-100">
            <CardTitle className="text-sm font-semibold">{t.netSales}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatCurrency(reportSummary.netSales, currencySettings)}</div>
            <p className="text-xs italic opacity-70">{t.estimatedAfterTax}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/50 shadow-sm overflow-hidden text-violet-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-violet-100">
            <CardTitle className="text-sm font-semibold">{t.totalOrders}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{reportSummary.totalOrders}</div>
            <p className="text-xs italic opacity-70">{t.completedTransactions}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm overflow-hidden text-amber-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-amber-100">
            <CardTitle className="text-sm font-semibold">{t.averageOrder}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatCurrency(reportSummary.averageOrder, currencySettings)}</div>
            <p className="text-xs italic opacity-70">{t.averageTicketSize}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-green-200 bg-green-50/50 shadow-sm overflow-hidden text-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-green-100">
            <CardTitle className="text-sm font-semibold">{t.totalProfit}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatCurrency(reportSummary.totalProfit, currencySettings)}</div>
            <p className="text-xs italic opacity-70">{t.profitMargin}: {reportSummary.profitMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50/50 shadow-sm overflow-hidden text-teal-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-teal-100">
            <CardTitle className="text-sm font-semibold">{t.netProfit}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{formatCurrency(reportSummary.netProfit, currencySettings)}</div>
            <p className="text-xs italic opacity-70">{t.netProfitMargin}: {reportSummary.netProfitMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-zinc-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
            <CardTitle className="text-zinc-800">{t.salesTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrencyTick(value, currencySettings)} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="sales" stroke="#18181b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">{t.loadingChart || 'Loading chart...'}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
            <CardTitle className="text-zinc-800">{t.salesByCategory}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" />
                    <XAxis type="number" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrencyTick(value, currencySettings)} />
                    <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} width={80} />
                    <Tooltip
                      cursor={{ fill: '#f4f4f5' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#18181b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">{t.loadingChart || 'Loading chart...'}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
          <CardTitle className="text-zinc-800">{t.salesByItem}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-50 bg-blue-50/20 text-left text-blue-600">
                  <th className="p-4 font-semibold">{t.item}</th>
                  <th className="p-4 font-semibold text-right">{t.quantitySold}</th>
                  <th className="p-4 font-semibold text-right">{t.sales}</th>
                </tr>
              </thead>
              <tbody>
                {itemSalesData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-zinc-500">
                      {t.noItemSales || 'No item sales for this period.'}
                    </td>
                  </tr>
                ) : (
                  itemSalesData.map((row) => (
                    <tr key={row.name} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                      <td className="p-4 font-medium">{row.name}</td>
                      <td className="p-4 text-right">{row.quantity}</td>
                      <td className="p-4 text-right font-medium">{formatCurrency(row.sales, currencySettings)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

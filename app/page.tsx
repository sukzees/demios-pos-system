'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, ShoppingBag, TrendingUp, Users, AlertTriangle, Package } from 'lucide-react';
import { usePosStore } from '@/lib/store';
import { supabase, Item } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatCurrencyTick } from '@/lib/currency';

const TRANSLATIONS = {
  en: {
    dashboard: 'Dashboard',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    custom: 'Custom',
    connected: 'Connected',
    mockMode: 'Mock Mode',
    checking: 'Checking...',
    supabaseNotConfigured: 'Supabase is not configured. Showing mock data. Please configure your Supabase URL and Anon Key in the environment variables.',
    totalRevenue: 'Total Revenue',
    orders: 'Orders',
    averageOrderValue: 'Average Order Value',
    activeItems: 'Active Items',
    totalProfit: 'Total Profit',
    netProfit: 'Net Profit',
    salesOverview: 'Sales Overview',
    lowStockAlert: 'Low Stock Alert',
    recentSales: 'Recent Sales',
    allStockHealthy: 'All stock levels are healthy.',
    outOfStock: 'Out of Stock',
    inStock: 'in stock',
    justNow: 'Just now',
    minsAgo: 'mins ago',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
    profitMargin: 'Profit Margin',
    netMargin: 'Net Margin',
    acrossAllCategories: 'Across all categories',
    fromLastMonth: 'from last month',
  },
  lo: {
    dashboard: 'ໜ້າຫຼັກ',
    daily: 'ລາຍວັນ',
    weekly: 'ລາຍອາທິດ',
    monthly: 'ລາຍເດືອນ',
    custom: 'ກຳນົດເອງ',
    connected: 'ເຊື່ອມຕໍ່ແລ້ວ',
    mockMode: 'ໂໝດທົດລອງ',
    checking: 'ກຳລັງກວດສອບ...',
    supabaseNotConfigured: 'Supabase ບໍ່ໄດ້ຖືກຕັ້ງຄ່າ. ກຳລັງສະແດງຂໍ້ມູນທົດລອງ. ກະລຸນາຕັ້ງຄ່າ Supabase URL ແລະ Anon Key ໃນ environment variables.',
    totalRevenue: 'ລາຍຮັບທັງໝົດ',
    orders: 'ລາຍການສັ່ງ',
    averageOrderValue: 'ມູນຄ່າສະເລ່ຍຕໍ່ບິນ',
    activeItems: 'ສິນຄ້າທີ່ມີຢູ່',
    totalProfit: 'ກຳໄລລວມ',
    netProfit: 'ກຳໄລສຸດທິ',
    salesOverview: 'ພາບລວມການຂາຍ',
    lowStockAlert: 'ແຈ້ງເຕືອນສິນຄ້າໃກ້ໝົດ',
    recentSales: 'ການຂາຍຫຼ້າສຸດ',
    allStockHealthy: 'ລະດັບສິນຄ້າທັງໝົດປົກກະຕິ.',
    outOfStock: 'ສິນຄ້າໝົດ',
    inStock: 'ມີໃນສາງ',
    justNow: 'ເມື່ອກີ້ນີ້',
    minsAgo: 'ນາທີກ່ອນ',
    hoursAgo: 'ຊົ່ວໂມງກ່ອນ',
    daysAgo: 'ມື້ກ່ອນ',
    profitMargin: 'ອັດຕາກຳໄລ',
    netMargin: 'ອັດຕາກຳໄລສຸດທິ',
    acrossAllCategories: 'ໃນທຸກໝວດໝູ່',
    fromLastMonth: 'ຈາກເດືອນຜ່ານມາ',
  },
  th: {
    dashboard: 'แดชบอร์ด',
    daily: 'รายวัน',
    weekly: 'รายสัปดาห์',
    monthly: 'รายเดือน',
    custom: 'กำหนดเอง',
    connected: 'เชื่อมต่อแล้ว',
    mockMode: 'โหมดทดลอง',
    checking: 'กำลังตรวจสอบ...',
    supabaseNotConfigured: 'ไม่ได้กำหนดค่า Supabase กำลังแสดงข้อมูลจำลอง กรุณากำหนดค่า Supabase URL และ Anon Key ใน environment variables',
    totalRevenue: 'รายได้รวม',
    orders: 'รายการสั่งซื้อ',
    averageOrderValue: 'ยอดขายเฉลี่ยต่อบิล',
    activeItems: 'สินค้าที่มีอยู่',
    totalProfit: 'กำไรทั้งหมด',
    netProfit: 'กำไรสุทธิ',
    salesOverview: 'ภาพรวมยอดขาย',
    lowStockAlert: 'แจ้งเตือนสินค้าใกล้หมด',
    recentSales: 'รายการขายล่าสุด',
    allStockHealthy: 'ระดับสต็อกสินค้าทั้งหมดปกติ',
    outOfStock: 'สินค้าหมด',
    inStock: 'มีในสต็อก',
    justNow: 'เมื่อครู่นี้',
    minsAgo: 'นาทีที่แล้ว',
    hoursAgo: 'ชั่วโมงที่แล้ว',
    daysAgo: 'วันที่แล้ว',
    profitMargin: 'อัตรากำไร',
    netMargin: 'อัตรากำไรสุทธิ',
    acrossAllCategories: 'ในทุกหมวดหมู่',
    fromLastMonth: 'จากเดือนที่แล้ว',
  }
};

export default function DashboardPage() {
  const { isSupabaseConfigured, checkSupabaseConfig, isCheckingConfig, currencySettings, generalSettings } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    activeItems: 0,
    totalProfit: 0,
    profitMargin: 0,
    totalExpenses: 0,
    netProfit: 0,
    netProfitMargin: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [recentSales, setRecentSales] = useState<{ id: string; total_amount: number; created_at: string }[]>([]);

  useEffect(() => {
    checkSupabaseConfig();
  }, [checkSupabaseConfig]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    let isMounted = true;
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
        } else {
          end.setTime(now.getTime());
        }
      }

      return { start, end };
    };

    const makeChartData = (completedOrders: any[], start: Date, end: Date) => {
      if (dateRange === 'daily') {
        const hourBuckets: Record<string, number> = {};
        for (let i = 0; i < 24; i += 1) {
          const key = String(i).padStart(2, '0');
          hourBuckets[key] = 0;
        }
        for (const order of completedOrders) {
          const d = new Date(order.created_at);
          if (d < start || d > end) continue;
          const hourKey = String(d.getHours()).padStart(2, '0');
          hourBuckets[hourKey] += Number(order.total_amount || 0);
        }
        return Object.entries(hourBuckets).map(([hour, total]) => ({
          name: `${hour}:00`,
          total,
        }));
      }

      const dayBuckets: Record<string, number> = {};
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(0, 0, 0, 0);

      while (cursor <= endDay) {
        const key = cursor.toISOString().slice(0, 10);
        dayBuckets[key] = 0;
        cursor.setDate(cursor.getDate() + 1);
      }

      for (const order of completedOrders) {
        const d = new Date(order.created_at);
        if (d < start || d > end) continue;
        const key = d.toISOString().slice(0, 10);
        if (key in dayBuckets) {
          dayBuckets[key] += Number(order.total_amount || 0);
        }
      }

      return Object.entries(dayBuckets).map(([key, total]) => {
        const d = new Date(`${key}T00:00:00`);
        return {
          name: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          total,
        };
      });
    };

    const fetchDashboardData = async () => {
      if (isCheckingConfig) return;
      const { start, end } = getRangeBounds();

      if (isSupabaseConfigured) {
        try {
          const { data: orders } = await supabase
            .from('orders')
            .select('total_amount, created_at, status');
          const { data: recentOrders } = await supabase
            .from('orders')
            .select('id, total_amount, created_at, status')
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(5);
          const { count: itemsCount } = await supabase.from('items').select('*', { count: 'exact', head: true });
          const { data: items } = await supabase.from('items').select('*');
          const { data: portions } = await supabase.from('item_portions').select('item_id, portion_stock');
          const { data: orderItems } = await supabase.from('order_items').select('item_id, quantity, price_at_time');
          const { data: expenses } = await supabase.from('expenses').select('amount, created_at');

          if (isMounted) {
            if (orders) {
              const completedOrders = orders.filter((order: any) => {
                if (order.status !== 'completed') return false;
                const createdAt = new Date(order.created_at);
                return createdAt >= start && createdAt <= end;
              });
              const totalRev = completedOrders.reduce((sum, order: any) => sum + Number(order.total_amount || 0), 0);
              
              // Calculate profit
              let totalCost = 0;
              if (orderItems && items) {
                const itemCostMap: Record<string, number> = {};
                items.forEach((item: any) => {
                  itemCostMap[item.id] = Number(item.cost_price || 0);
                });
                
                orderItems.forEach((orderItem: any) => {
                  const cost = itemCostMap[orderItem.item_id] || 0;
                  totalCost += cost * Number(orderItem.quantity || 0);
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
              
              const totalProfit = totalRev - totalCost;
              const profitMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
              const netProfit = totalRev - totalExpenses;
              const netProfitMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;
              
              setStats({
                totalRevenue: totalRev,
                totalOrders: completedOrders.length,
                averageOrderValue: completedOrders.length > 0 ? totalRev / completedOrders.length : 0,
                activeItems: itemsCount || 0,
                totalProfit,
                profitMargin,
                totalExpenses,
                netProfit,
                netProfitMargin
              });

              setChartData(makeChartData(completedOrders, start, end));
            }
            const filteredRecent = (recentOrders || []).filter((o: any) => {
              const createdAt = new Date(o.created_at);
              return createdAt >= start && createdAt <= end;
            }).slice(0, 5);
            setRecentSales(filteredRecent.map((o: any) => ({
              id: String(o.id),
              total_amount: Number(o.total_amount || 0),
              created_at: String(o.created_at || new Date().toISOString())
            })));
            if (items) {
              const portionStockByItemId: Record<string, number> = {};
              for (const portion of portions || []) {
                if (!portion.item_id) continue;
                portionStockByItemId[portion.item_id] = (portionStockByItemId[portion.item_id] || 0) + Number(portion.portion_stock || 0);
              }

              const lowStockLikeInventory = items
                .map((item: any) => {
                  const hasPortionStock = Object.prototype.hasOwnProperty.call(portionStockByItemId, item.id);
                  const effectiveStock = hasPortionStock ? portionStockByItemId[item.id] : Number(item.stock || 0);
                  return { ...item, stock: effectiveStock };
                })
                .filter((item: any) => {
                  const stock = Number(item.stock || 0);
                  return stock > 0 && stock < 10;
                })
                .sort((a: any, b: any) => Number(a.stock || 0) - Number(b.stock || 0))
                .slice(0, 5);

              setLowStockItems(lowStockLikeInventory as Item[]);
            }
          }
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        }
      } else {
        if (isMounted) {
          const mockOrders = [
            { id: 'ORD-001', total_amount: 45.50, created_at: new Date().toISOString(), status: 'completed' },
            { id: 'ORD-002', total_amount: 12.00, created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), status: 'completed' },
            { id: 'ORD-003', total_amount: 89.99, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), status: 'completed' },
            { id: 'ORD-004', total_amount: 24.50, created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), status: 'completed' },
            { id: 'ORD-005', total_amount: 35.20, created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), status: 'completed' },
          ];
          const completedInRange = mockOrders.filter((o) => {
            const createdAt = new Date(o.created_at);
            return createdAt >= start && createdAt <= end;
          });
          const totalRev = completedInRange.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
          const totalCost = totalRev * 0.35; // Mock: assume 35% cost
          const totalProfit = totalRev - totalCost;
          const profitMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
          const totalExpenses = totalRev * 0.08; // Mock: assume 8% expenses
          const netProfit = totalRev - totalExpenses;
          const netProfitMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;
          
          setStats({
            totalRevenue: totalRev,
            totalOrders: completedInRange.length,
            averageOrderValue: completedInRange.length > 0 ? totalRev / completedInRange.length : 0,
            activeItems: 124,
            totalProfit,
            profitMargin,
            totalExpenses,
            netProfit,
            netProfitMargin
          });
          setChartData(makeChartData(mockOrders, start, end));
          setLowStockItems([
            { id: 'i7', name: 'Onion Rings', price: 4.99, category_id: 'c3', stock: 5, created_at: '' },
            { id: 'i3', name: 'Double Burger', price: 12.99, category_id: 'c1', stock: 8, created_at: '' },
          ]);
          setRecentSales(completedInRange.slice(0, 5).map((o) => ({
            id: String(o.id),
            total_amount: Number(o.total_amount || 0),
            created_at: String(o.created_at || new Date().toISOString()),
          })));
        }
      }
    };
    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 10000);
    const handleFocus = () => fetchDashboardData();
    window.addEventListener('focus', handleFocus);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSupabaseConfigured, isCheckingConfig, dateRange, customDateFrom, customDateTo]);

  const formatTimeAgo = (isoDate: string) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return t.justNow;
    if (diffMinutes < 60) return `${diffMinutes} ${t.minsAgo}`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ${t.hoursAgo}`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ${t.daysAgo}`;
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.dashboard}</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex w-full items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm sm:w-auto overflow-x-auto no-scrollbar">
            <Button
              variant={dateRange === 'daily' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 sm:flex-none h-10 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all"
              onClick={() => setDateRange('daily')}
            >
              {t.daily}
            </Button>
            <Button
              variant={dateRange === 'weekly' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 sm:flex-none h-10 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all"
              onClick={() => setDateRange('weekly')}
            >
              {t.weekly}
            </Button>
            <Button
              variant={dateRange === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 sm:flex-none h-10 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all"
              onClick={() => setDateRange('monthly')}
            >
              {t.monthly}
            </Button>
            <Button
              variant={dateRange === 'custom' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 sm:flex-none h-10 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all"
              onClick={() => setDateRange('custom')}
            >
              {t.custom}
            </Button>
          </div>
          {dateRange === 'custom' && (
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="h-10 w-full sm:w-[150px] rounded-xl border-zinc-200 shadow-sm"
              />
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="h-10 w-full sm:w-[150px] rounded-xl border-zinc-200 shadow-sm"
              />
            </div>
          )}
          <div className="hidden sm:flex shrink-0">
            {isCheckingConfig ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
                <span className="sr-only sm:not-sr-only">{t.checking}</span>
              </div>
            ) : isSupabaseConfigured ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                {t.connected}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {t.mockMode}
              </div>
            )}
          </div>
        </div>
      </div>

      {!isSupabaseConfigured && !isCheckingConfig && (
        <div className="rounded-md bg-amber-50 p-4 text-amber-800 border border-amber-200">
          <p className="text-sm font-medium">{t.supabaseNotConfigured}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">{t.totalRevenue}</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalRevenue, currencySettings)}</div>
            <p className="text-xs text-blue-600/70 italic">+20.1% {t.fromLastMonth}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-900">{t.orders}</CardTitle>
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">+{stats.totalOrders}</div>
            <p className="text-xs text-emerald-600/70 italic">+15% {t.fromLastMonth}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-violet-900">{t.averageOrderValue}</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700">{formatCurrency(stats.averageOrderValue, currencySettings)}</div>
            <p className="text-xs text-violet-600/70 italic">+5% {t.fromLastMonth}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900">{t.activeItems}</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.activeItems}</div>
            <p className="text-xs text-amber-600/70 italic">{t.acrossAllCategories}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-green-200 bg-green-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-green-900">{t.totalProfit}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalProfit, currencySettings)}</div>
            <p className="text-xs text-green-600/70 italic">{t.profitMargin}: {stats.profitMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-teal-900">{t.netProfit}</CardTitle>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">{formatCurrency(stats.netProfit, currencySettings)}</div>
            <p className="text-xs text-teal-600/70 italic">{t.netMargin}: {stats.netProfitMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-zinc-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
            <CardTitle className="text-zinc-800">{t.salesOverview}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis
                      dataKey="name"
                      stroke="#71717a"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCurrencyTick(value, currencySettings)}
                    />
                    <Tooltip
                      cursor={{ fill: '#f4f4f5' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="total" fill="#18181b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">Loading chart...</div>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="col-span-3 space-y-4">
          <Card className="border-rose-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-rose-50/50 border-b border-rose-100 py-4">
              <CardTitle className="flex items-center gap-2 text-rose-900 text-base font-bold">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                {t.lowStockAlert}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="divide-y divide-rose-50">
                {lowStockItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">{t.allStockHealthy}</p>
                  </div>
                ) : (
                  lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 hover:bg-rose-50/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
                          <Package className="h-5 w-5 text-rose-500" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-zinc-800">{item.name}</p>
                          <p className="text-xs text-zinc-500 font-medium">#{item.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                      <div className={`rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm ${
                        (item.stock || 0) === 0
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                        {(item.stock || 0) === 0 ? t.outOfStock : `${item.stock} ${t.inStock}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="border-zinc-200 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-200 py-4">
              <CardTitle className="text-zinc-800 text-base font-bold flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-zinc-500" />
                {t.recentSales}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="divide-y divide-zinc-50">
                {recentSales.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 italic">No recent sales.</div>
                ) : recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 hover:bg-zinc-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                        <ShoppingBag className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-zinc-800">Order #{sale.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-zinc-500 font-medium">
                          {formatTimeAgo(sale.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="font-bold text-emerald-600 text-sm">+{formatCurrency(sale.total_amount, currencySettings)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

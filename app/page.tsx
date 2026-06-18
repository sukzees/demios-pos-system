'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, ShoppingBag, TrendingUp, Users, AlertTriangle, Package, Receipt, Info } from 'lucide-react';
import { usePosStore } from '@/lib/store';
import { supabase, Item } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatCurrencyTick } from '@/lib/currency';
import { calculateOrderItemsCost } from '@/lib/sales-profit';

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
    cashRevenue: 'Cash Revenue',
    transferRevenue: 'Transfer Revenue',
    orders: 'Orders',
    averageOrderValue: 'Average Order Value',
    activeItems: 'Active Items',
    totalProfit: 'Total Profit',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    salesOverview: 'Sales Overview',
    lowStockAlert: 'Low Stock Alert',
    outOfStockAlert: 'Out of Stock Alert',
    recentSales: 'Recent Sales',
    allStockHealthy: 'All stock levels are healthy.',
    noItemsOutOfStock: 'No items out of stock.',
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
    cashRevenue: 'ລາຍຮັບເງິນສົດ',
    transferRevenue: 'ລາຍຮັບໂອນເງິນ',
    orders: 'ລາຍການສັ່ງ',
    averageOrderValue: 'ມູນຄ່າສະເລ່ຍຕໍ່ບິນ',
    activeItems: 'ສິນຄ້າທີ່ມີຢູ່',
    totalProfit: 'ກຳໄລລວມ',
    totalExpenses: 'ລວມຄ່າໃຊ້ຈ່າຍ',
    netProfit: 'ກຳໄລສຸດທິ',
    salesOverview: 'ພາບລວມການຂາຍ',
    lowStockAlert: 'ແຈ້ງເຕືອນສິນຄ້າໃກ້ໝົດ',
    outOfStockAlert: 'ແຈ້ງເຕືອນສິນຄ້າໝົດ',
    recentSales: 'ການຂາຍຫຼ້າສຸດ',
    allStockHealthy: 'ລະດັບສິນຄ້າທັງໝົດປົກກະຕິ.',
    noItemsOutOfStock: 'ບໍ່ມີສິນຄ້າໝົດໃນສາງ.',
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
    cashRevenue: 'รายได้เงินสด',
    transferRevenue: 'รายได้เงินโอน',
    orders: 'รายการสั่งซื้อ',
    averageOrderValue: 'ยอดขายเฉลี่ยต่อบิล',
    activeItems: 'สินค้าที่มีอยู่',
    totalProfit: 'กำไรทั้งหมด',
    totalExpenses: 'ค่าใช้จ่ายทั้งหมด',
    netProfit: 'กำไรสุทธิ',
    salesOverview: 'ภาพรวมยอดขาย',
    lowStockAlert: 'แจ้งเตือนสินค้าใกล้หมด',
    outOfStockAlert: 'แจ้งเตือนสินค้าหมด',
    recentSales: 'รายการขายล่าสุด',
    allStockHealthy: 'ระดับสต็อกสินค้าทั้งหมดปกติ',
    noItemsOutOfStock: 'ไม่มีสินค้าหมดในสต็อก',
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

function FormulaInfo({ formula }: { formula: string }) {
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-label={formula}>
      <Info className="h-4 w-4 cursor-help opacity-70 transition-opacity group-hover:opacity-100" />
      <span className="pointer-events-none absolute right-0 top-6 z-20 hidden w-72 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium leading-relaxed text-zinc-700 shadow-lg group-hover:block group-focus:block">
        {formula}
      </span>
    </span>
  );
}

const finiteNumber = (value: number) => (Number.isFinite(value) ? value : 0);

const DASHBOARD_FORMULAS = {
  en: {
    totalCost: 'Total Cost',
    totalRevenue: 'Total Revenue = Sum of total_amount from completed orders in the selected date range.',
    transferRevenue: 'Transfer Revenue = Sum of total_amount from completed transfer orders in the selected date range.',
    cashRevenue: 'Cash Revenue = Sum of total_amount from completed cash orders in the selected date range. Old orders without payment_method count as cash.',
    netProfit: 'Dashboard Net Profit = Total Revenue - Total Expenses.',
    totalCostFormula: 'Total Cost = Sum of cost_price x quantity for all items sold in completed orders. Portion items use portion_cost_price when available.',
    orders: 'Orders = Count of completed orders in the selected date range.',
    averageOrderValue: 'Average Order Value = Total Revenue / completed order count.',
    activeItems: 'Active Items = Count of rows in the items table.',
    totalExpenses: 'Total Expenses = Sum of expense amount values in the selected date range.',
    totalProfit: 'Total Profit = Total Revenue - Total Cost.',
  },
  lo: {
    totalCost: 'ຕົ້ນທຶນລວມ',
    totalRevenue: 'ລາຍຮັບລວມ = ຜົນລວມ total_amount ຈາກອໍເດີທີ່ສໍາເລັດໃນຊ່ວງວັນທີທີ່ເລືອກ.',
    transferRevenue: 'ລາຍຮັບໂອນ = ຜົນລວມ total_amount ຈາກອໍເດີໂອນເງິນທີ່ສໍາເລັດໃນຊ່ວງວັນທີທີ່ເລືອກ.',
    cashRevenue: 'ລາຍຮັບເງິນສົດ = ຜົນລວມ total_amount ຈາກອໍເດີເງິນສົດທີ່ສໍາເລັດໃນຊ່ວງວັນທີທີ່ເລືອກ. ອໍເດີເກົ່າທີ່ບໍ່ມີ payment_method ຈະນັບເປັນເງິນສົດ.',
    netProfit: 'ກໍາໄລສຸດທິໃນແດຊບອດ = ລາຍຮັບລວມ - ຄ່າໃຊ້ຈ່າຍລວມ.',
    totalCostFormula: 'ຕົ້ນທຶນລວມ = ຜົນລວມ cost_price x ຈໍານວນ ຂອງສິນຄ້າທີ່ຂາຍໃນອໍເດີທີ່ສໍາເລັດ. ສິນຄ້າແບບ portion ຈະໃຊ້ portion_cost_price ຖ້າມີ.',
    orders: 'ອໍເດີ = ຈໍານວນອໍເດີທີ່ສໍາເລັດໃນຊ່ວງວັນທີທີ່ເລືອກ.',
    averageOrderValue: 'ມູນຄ່າອໍເດີສະເລ່ຍ = ລາຍຮັບລວມ / ຈໍານວນອໍເດີທີ່ສໍາເລັດ.',
    activeItems: 'ສິນຄ້າທີ່ໃຊ້ງານ = ຈໍານວນລາຍການໃນຕາຕະລາງ items.',
    totalExpenses: 'ຄ່າໃຊ້ຈ່າຍລວມ = ຜົນລວມ amount ຂອງຄ່າໃຊ້ຈ່າຍໃນຊ່ວງວັນທີທີ່ເລືອກ.',
    totalProfit: 'ກໍາໄລລວມ = ລາຍຮັບລວມ - ຕົ້ນທຶນລວມ.',
  },
  th: {
    totalCost: 'ต้นทุนรวม',
    totalRevenue: 'รายรับรวม = ผลรวม total_amount จากออเดอร์ที่เสร็จสมบูรณ์ในช่วงวันที่ที่เลือก',
    transferRevenue: 'รายรับเงินโอน = ผลรวม total_amount จากออเดอร์เงินโอนที่เสร็จสมบูรณ์ในช่วงวันที่ที่เลือก',
    cashRevenue: 'รายรับเงินสด = ผลรวม total_amount จากออเดอร์เงินสดที่เสร็จสมบูรณ์ในช่วงวันที่ที่เลือก ออเดอร์เก่าที่ไม่มี payment_method จะนับเป็นเงินสด',
    netProfit: 'กำไรสุทธิบนแดชบอร์ด = รายรับรวม - ค่าใช้จ่ายรวม',
    totalCostFormula: 'ต้นทุนรวม = ผลรวม cost_price x จำนวน ของสินค้าทั้งหมดที่ขายในออเดอร์ที่เสร็จสมบูรณ์ สินค้าแบบ portion จะใช้ portion_cost_price หากมี',
    orders: 'ออเดอร์ = จำนวนออเดอร์ที่เสร็จสมบูรณ์ในช่วงวันที่ที่เลือก',
    averageOrderValue: 'มูลค่าออเดอร์เฉลี่ย = รายรับรวม / จำนวนออเดอร์ที่เสร็จสมบูรณ์',
    activeItems: 'สินค้าที่ใช้งานอยู่ = จำนวนรายการในตาราง items',
    totalExpenses: 'ค่าใช้จ่ายรวม = ผลรวม amount ของค่าใช้จ่ายในช่วงวันที่ที่เลือก',
    totalProfit: 'กำไรรวม = รายรับรวม - ต้นทุนรวม',
  },
};

export default function DashboardPage() {
  const { isSupabaseConfigured, checkSupabaseConfig, isCheckingConfig, currencySettings, generalSettings } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];
  const formulas = DASHBOARD_FORMULAS[currentLanguage] || DASHBOARD_FORMULAS.en;
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCost: 0,
    averageOrderValue: 0,
    activeItems: 0,
    totalProfit: 0,
    profitMargin: 0,
    totalExpenses: 0,
    netProfit: 0,
    netProfitMargin: 0,
    cashRevenue: 0,
    transferRevenue: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<{ id: string; total_amount: number; created_at: string }[]>([]);
  const [nowMs, setNowMs] = useState(0);

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
      setNowMs(Date.now());
      const { start, end } = getRangeBounds();

      if (isSupabaseConfigured) {
        try {
          const { data: orders } = await supabase
            .from('orders')
            .select('id, total_amount, created_at, status, payment_method');
          const { data: recentOrders } = await supabase
            .from('orders')
            .select('id, total_amount, created_at, status')
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(5);
          const { count: itemsCount } = await supabase.from('items').select('*', { count: 'exact', head: true });
          const { data: items } = await supabase.from('items').select('*');
          const { data: recipes } = await supabase.from('recipes').select('id, name');
          const { data: costPortions } = await supabase.from('item_portions').select('item_id, recipe_id, inventory_item_id, portion_name, portion_cost_price');
          const { data: inventoryItems } = await supabase.from('inventory_items').select('*');
          const { data: inventoryPortions } = await supabase.from('item_portions').select('inventory_item_id, portion_stock');
          const { data: recipeIngredients } = await supabase.from('recipe_ingredients').select('recipe_id, ingredient_id, quantity_needed');
          const { data: orderItems } = await supabase.from('order_items').select('order_id, item_id, quantity, price_at_time, notes');
          const { data: expenses } = await supabase.from('expenses').select('amount, created_at');

          if (isMounted) {
            if (orders) {
              const completedOrders = orders.filter((order: any) => {
                if (order.status !== 'completed') return false;
                const createdAt = new Date(order.created_at);
                return createdAt >= start && createdAt <= end;
              });
              const totalRev = completedOrders.reduce((sum, order: any) => sum + Number(order.total_amount || 0), 0);
              
              // Calculate revenue by payment method
              // Default to 'cash' for old orders without payment_method
              const cashRev = completedOrders
                .filter((order: any) => !order.payment_method || order.payment_method === 'cash')
                .reduce((sum, order: any) => sum + Number(order.total_amount || 0), 0);
              const transferRev = completedOrders
                .filter((order: any) => order.payment_method === 'transfer')
                .reduce((sum, order: any) => sum + Number(order.total_amount || 0), 0);
              
              const completedOrderIds = new Set(completedOrders.map((order: any) => String(order.id)));
              const totalCost = finiteNumber(calculateOrderItemsCost({
                orderItems: orderItems || [],
                items: items || [],
                inventoryItems: inventoryItems || [],
                recipes: recipes || [],
                recipeIngredients: recipeIngredients || [],
                portions: costPortions || [],
                completedOrderIds,
              }));
              
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
                totalCost,
                averageOrderValue: completedOrders.length > 0 ? totalRev / completedOrders.length : 0,
                activeItems: itemsCount || 0,
                totalProfit,
                profitMargin,
                totalExpenses,
                netProfit,
                netProfitMargin,
                cashRevenue: cashRev,
                transferRevenue: transferRev
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
            if (inventoryItems) {
              const portionStockByItemId: Record<string, number> = {};
              for (const portion of inventoryPortions || []) {
                if (!portion.inventory_item_id) continue;
                portionStockByItemId[portion.inventory_item_id] = (portionStockByItemId[portion.inventory_item_id] || 0) + Number(portion.portion_stock || 0);
              }

              const mappedInventoryItems = inventoryItems.map((item: any) => {
                const hasPortionStock = Object.prototype.hasOwnProperty.call(portionStockByItemId, item.id);
                const effectiveStock = hasPortionStock ? portionStockByItemId[item.id] : Number((item as any).stock || 0);
                const minStockAlert = Math.max(0, Number(item.min_stock ?? 10));
                return { ...item, stock: effectiveStock, minStockAlert };
              });

              const lowStock = mappedInventoryItems
                .filter((item: any) => item.stock > 0 && item.stock <= item.minStockAlert)
                .sort((a: any, b: any) => a.stock - b.stock)
                .slice(0, 5);

              const outOfStock = mappedInventoryItems
                .filter((item: any) => item.stock === 0)
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
                .slice(0, 5);

              setLowStockItems(lowStock as any[]);
              setOutOfStockItems(outOfStock);
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
          const cashRev = totalRev * 0.6; // Mock: assume 60% cash
          const transferRev = totalRev * 0.4; // Mock: assume 40% transfer
          const totalCost = finiteNumber(totalRev * 0.35); // Mock: assume 35% cost
          const totalExpenses = totalRev * 0.08; // Mock: assume 8% expenses
          const totalProfit = totalRev - totalCost;
          const profitMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
          const netProfit = totalRev - totalExpenses;
          const netProfitMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;
          
          setStats({
            totalRevenue: totalRev,
            totalOrders: completedInRange.length,
            totalCost,
            averageOrderValue: completedInRange.length > 0 ? totalRev / completedInRange.length : 0,
            activeItems: 124,
            totalProfit,
            profitMargin,
            totalExpenses,
            netProfit,
            netProfitMargin,
            cashRevenue: cashRev,
            transferRevenue: transferRev
          });
          setChartData(makeChartData(mockOrders, start, end));
          setLowStockItems([
            { id: 'i7', name: 'Onion Rings', price: 4.99, category_id: 'c3', stock: 5, created_at: '' },
            { id: 'i3', name: 'Double Burger', price: 12.99, category_id: 'c1', stock: 3, created_at: '' },
          ]);
          setOutOfStockItems([
            { id: 'mock-out-1', name: 'Brioche Buns', price: 1.50, category_id: 'c1', stock: 0, created_at: '' },
            { id: 'mock-out-2', name: 'Fresh Lettuce', price: 0.50, category_id: 'c1', stock: 0, created_at: '' },
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
    const handleFocus = () => fetchDashboardData();
    window.addEventListener('focus', handleFocus);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSupabaseConfigured, isCheckingConfig, dateRange, customDateFrom, customDateTo]);

  const formatTimeAgo = (isoDate: string) => {
    if (!nowMs) return t.justNow;
    const diffMs = nowMs - new Date(isoDate).getTime();
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

      {/* Row 1: Total Revenue, Transfer Revenue, Cash Revenue, Net Profit */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">{t.totalRevenue}</CardTitle>
            <div className="flex items-center gap-2 text-blue-600">
              <FormulaInfo formula={formulas.totalRevenue} />
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalRevenue, currencySettings)}</div>
            <p className="text-xs text-blue-600/70 italic">+20.1% {t.fromLastMonth}</p>
          </CardContent>
        </Card>
        
        {/* Transfer Revenue */}
        <Card className="border-indigo-200 bg-indigo-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-indigo-900">{t.transferRevenue}</CardTitle>
            <div className="flex items-center gap-2 text-indigo-600">
              <FormulaInfo formula={formulas.transferRevenue} />
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{formatCurrency(stats.transferRevenue, currencySettings)}</div>
            <p className="text-xs text-indigo-600/70 italic">{stats.totalRevenue > 0 ? ((stats.transferRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}%</p>
          </CardContent>
        </Card>
        
        {/* Cash Revenue */}
        <Card className="border-cyan-200 bg-cyan-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-cyan-900">{t.cashRevenue}</CardTitle>
            <div className="flex items-center gap-2 text-cyan-600">
              <FormulaInfo formula={formulas.cashRevenue} />
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-700">{formatCurrency(stats.cashRevenue, currencySettings)}</div>
            <p className="text-xs text-cyan-600/70 italic">{stats.totalRevenue > 0 ? ((stats.cashRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}%</p>
          </CardContent>
        </Card>
        
        {/* Net Profit */}
        <Card className="border-teal-200 bg-teal-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-teal-900">{t.netProfit}</CardTitle>
            <div className="flex items-center gap-2 text-teal-600">
              <FormulaInfo formula={formulas.netProfit} />
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">{formatCurrency(stats.netProfit, currencySettings)}</div>
            <p className="text-xs text-teal-600/70 italic">{t.netMargin}: {stats.netProfitMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Total Cost, Orders, Average Order Value, Active Items */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Cost */}
        <Card className="border-orange-200 bg-orange-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-orange-900">{formulas.totalCost}</CardTitle>
            <div className="flex items-center gap-2 text-orange-600">
              <FormulaInfo formula={formulas.totalCostFormula} />
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{formatCurrency(finiteNumber(stats.totalCost), currencySettings)}</div>
            <p className="text-xs text-orange-600/70 italic">&nbsp;</p>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-900">{t.orders}</CardTitle>
            <div className="flex items-center gap-2 text-emerald-600">
              <FormulaInfo formula={formulas.orders} />
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">+{stats.totalOrders}</div>
            <p className="text-xs text-emerald-600/70 italic">+15% {t.fromLastMonth}</p>
          </CardContent>
        </Card>
        
        {/* Average Order Value */}
        <Card className="border-violet-200 bg-violet-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-violet-900">{t.averageOrderValue}</CardTitle>
            <div className="flex items-center gap-2 text-violet-600">
              <FormulaInfo formula={formulas.averageOrderValue} />
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700">{formatCurrency(stats.averageOrderValue, currencySettings)}</div>
            <p className="text-xs text-violet-600/70 italic">+5% {t.fromLastMonth}</p>
          </CardContent>
        </Card>
        
        {/* Active Items */}
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900">{t.activeItems}</CardTitle>
            <div className="flex items-center gap-2 text-amber-600">
              <FormulaInfo formula={formulas.activeItems} />
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.activeItems}</div>
            <p className="text-xs text-amber-600/70 italic">{t.acrossAllCategories}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Total Expenses, Total Profit */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Total Expenses */}
        <Card className="border-rose-200 bg-rose-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-rose-900">{t.totalExpenses}</CardTitle>
            <div className="flex items-center gap-2 text-rose-600">
              <FormulaInfo formula={formulas.totalExpenses} />
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700">{formatCurrency(stats.totalExpenses, currencySettings)}</div>
            <p className="text-xs text-rose-600/70 italic">&nbsp;</p>
          </CardContent>
        </Card>
        
        {/* Total Profit */}
        <Card className="border-green-200 bg-green-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-green-900">{t.totalProfit}</CardTitle>
            <div className="flex items-center gap-2 text-green-600">
              <FormulaInfo formula={formulas.totalProfit} />
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalProfit, currencySettings)}</div>
            <p className="text-xs text-green-600/70 italic">{t.profitMargin}: {stats.profitMargin.toFixed(1)}%</p>
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
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
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
                      width={90}
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
          <Card className="border-red-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-red-50/50 border-b border-red-100 py-4">
              <CardTitle className="flex items-center gap-2 text-red-900 text-base font-bold">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t.outOfStockAlert}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="divide-y divide-red-50">
                {outOfStockItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">{t.noItemsOutOfStock}</p>
                  </div>
                ) : (
                  outOfStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 hover:bg-red-50/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                          <Package className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-zinc-800">{item.name}</p>
                          <p className="text-xs text-zinc-500 font-medium">#{item.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm bg-red-50 text-red-600 border border-red-100">
                        {t.outOfStock}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
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
                        ((item as any).stock || 0) === 0
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                        {((item as any).stock || 0) === 0 ? t.outOfStock : `${(item as any).stock} ${t.inStock}`}
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

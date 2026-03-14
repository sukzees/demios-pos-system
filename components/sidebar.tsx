'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  History, 
  Package, 
  Receipt, 
  BarChart3, 
  Settings,
  Users,
  LogOut,
  ClipboardList,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

const navigation = [
  { id: 'dashboard', name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { id: 'pos', name: 'POS', href: '/pos', icon: ShoppingCart },
  { id: 'orderHistory', name: 'Order History', href: '/orders', icon: History },
  { id: 'items', name: 'Items & Categories', href: '/items', icon: Package },
  { id: 'inventory', name: 'Inventory', href: '/inventory', icon: ClipboardList },
  { id: 'employees', name: 'Employees', href: '/employees', icon: Users },
  { id: 'expenses', name: 'Expenses', href: '/expenses', icon: Receipt },
  { id: 'reports', name: 'Reports', href: '/reports', icon: BarChart3 },
  { id: 'settings', name: 'Settings', href: '/settings', icon: Settings },
];

const SIDEBAR_TRANSLATIONS: any = {
  en: {
    dashboard: 'Dashboard',
    pos: 'POS',
    orderHistory: 'Order History',
    items: 'Items & Categories',
    inventory: 'Inventory',
    employees: 'Employees',
    expenses: 'Expenses',
    reports: 'Reports',
    settings: 'Settings',
    logout: 'Log out',
    user: 'User',
    staff: 'Staff'
  },
  lo: {
    dashboard: 'ໜ້າຫຼັກ',
    pos: 'ຂາຍສິນຄ້າ',
    orderHistory: 'ປະຫວັດການສັ່ງ',
    items: 'ສິນຄ້າ ແລະ ປະເພດ',
    inventory: 'ສາງສິນຄ້າ',
    employees: 'ພະນັກງານ',
    expenses: 'ລາຍຈ່າຍ',
    reports: 'ລາຍງານ',
    settings: 'ຕັ້ງຄ່າ',
    logout: 'ອອກຈາກລະບົບ',
    user: 'ຜູ້ໃຊ້',
    staff: 'ພະນັກງານ'
  },
  th: {
    dashboard: 'แดชบอร์ด',
    pos: 'ขายหน้าร้าน (POS)',
    orderHistory: 'ประวัติการสั่งซื้อ',
    items: 'สินค้าและหมวดหมู่',
    inventory: 'สต็อกสินค้า',
    employees: 'พนักงาน',
    expenses: 'ค่าใช้จ่าย',
    reports: 'รายงาน',
    settings: 'ตั้งค่า',
    logout: 'ออกจากระบบ',
    user: 'ผู้ใช้งาน',
    staff: 'พนักงาน'
  }
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user, isOnline, pendingActions, generalSettings } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = SIDEBAR_TRANSLATIONS[currentLanguage];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="hidden lg:flex h-full w-64 flex-col border-r border-zinc-200 bg-zinc-50/50">
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4">
        <span className="text-lg font-bold tracking-tight text-zinc-900">Supabase POS</span>
        <div className="flex items-center gap-2" title={isOnline ? "Online" : "Offline"}>
          {isOnline ? (
            pendingActions.length > 0 ? (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            ) : (
              <Wifi className="h-4 w-4 text-green-500" />
            )
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-amber-600">{pendingActions.length}</span>
              <WifiOff className="h-4 w-4 text-amber-500" />
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const displayName = t[item.id] || item.name;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                  'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-zinc-900' : 'text-zinc-400 group-hover:text-zinc-500',
                    'mr-3 h-5 w-5 flex-shrink-0'
                  )}
                  aria-hidden="true"
                />
                {displayName}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-zinc-200 p-4">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-900">{user?.name || t.user}</span>
            <span className="text-xs text-zinc-500 capitalize">{user?.role || t.staff}</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-zinc-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t.logout}
        </Button>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Receipt, BarChart3, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosStore } from '@/lib/store';

import { SIDEBAR_TRANSLATIONS } from '@/components/sidebar';

const mobileNavigationLeft = [
  { id: 'dashboard', href: '/', icon: LayoutDashboard },
  { id: 'inventory', href: '/inventory', icon: ClipboardList },
];

const mobileNavigationRight = [
  { id: 'expenses', href: '/expenses', icon: Receipt },
  { id: 'reports', href: '/reports', icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user, generalSettings } = usePosStore();
  const currentLang = generalSettings?.language || 'en';
  const t = SIDEBAR_TRANSLATIONS[currentLang] || SIDEBAR_TRANSLATIONS['en'];

  // Only show for admin/manager roles if needed, but user specifically asked for these 4 for admin
  if (user?.role !== 'admin' && user?.role !== 'manager') return null;

  const isPosActive = pathname === '/pos';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 pb-safe">
      <nav className="flex items-center justify-around h-16 relative">
        {/* Left navigation items */}
        {mobileNavigationLeft.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-indigo-600" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              <span className="text-[10px] font-medium tracking-tight uppercase">{t[item.id] || item.id}</span>
              {isActive && (
                 <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full shadow-[0_1px_5px_rgba(79,70,229,0.3)]" />
              )}
            </Link>
          );
        })}

        {/* Floating POS button in center */}
        <div className="relative flex items-center justify-center w-full">
          <Link
            href="/pos"
            className={cn(
              "absolute -top-8 flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all",
              isPosActive 
                ? "bg-indigo-600 text-white shadow-indigo-500/50" 
                : "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700"
            )}
          >
            <ShoppingCart className="h-7 w-7 stroke-[2.5px]" />
          </Link>
        </div>

        {/* Right navigation items */}
        {mobileNavigationRight.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-indigo-600" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              <span className="text-[10px] font-medium tracking-tight uppercase">{t[item.id] || item.id}</span>
              {isActive && (
                 <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full shadow-[0_1px_5px_rgba(79,70,229,0.3)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

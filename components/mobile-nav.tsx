'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Receipt, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosStore } from '@/lib/store';

const mobileNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: ClipboardList },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = usePosStore();

  // Only show for admin/manager roles if needed, but user specifically asked for these 4 for admin
  if (user?.role !== 'admin' && user?.role !== 'manager') return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 pb-safe">
      <nav className="flex items-center justify-around h-16">
        {mobileNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-indigo-600" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              <span className="text-[10px] font-medium tracking-tight uppercase">{item.name}</span>
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

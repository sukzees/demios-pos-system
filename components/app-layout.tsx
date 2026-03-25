'use client';

import { Sidebar } from '@/components/sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePosStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { MobileNav } from '@/components/mobile-nav';
import { TopBar } from '@/components/top-bar';

const LICENSE_AUTO_SYNC_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_LICENSE_REALTIME_SYNC_INTERVAL_MS || 30000);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, generalSettings, licenseInfo, syncLicenseNow } = usePosStore();
  const [isMounted, setIsMounted] = useState(false);
  const currentLanguage = generalSettings?.language || 'en';

  useEffect(() => {
    setTimeout(() => setIsMounted(true), 0);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (!user && pathname !== '/login') {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }
  }, [user, pathname, router, isMounted]);

  useEffect(() => {
    if (!isMounted || !licenseInfo?.key) return;

    syncLicenseNow();

    const intervalId = window.setInterval(() => {
      syncLicenseNow();
    }, LICENSE_AUTO_SYNC_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncLicenseNow();
      }
    };

    const handleWindowFocus = () => {
      syncLicenseNow();
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMounted, licenseInfo?.key, syncLicenseNow]);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!isMounted) return null;

  const getStyle = () => {
    if (currentLanguage === 'lo') return { '--font-sans': 'var(--font-lao)' } as React.CSSProperties;
    if (currentLanguage === 'th') return { '--font-sans': 'var(--font-thai)' } as React.CSSProperties;
    return {};
  };

  if (pathname === '/login') {
    return (
      <div style={getStyle()} className="min-h-screen bg-zinc-100 font-sans">
        {children}
      </div>
    );
  }

  // If not logged in and not on login page, don't render app layout (will redirect)
  if (!user) return null;

  return (
    <div style={getStyle()} className="flex h-screen w-full overflow-hidden bg-white font-sans">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-zinc-50/30 pb-20 lg:pb-0">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

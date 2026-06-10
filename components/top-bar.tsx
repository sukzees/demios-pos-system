'use client';

import { usePosStore } from '@/lib/store';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages, PlayCircle, PauseCircle, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { navigation, SIDEBAR_TRANSLATIONS } from '@/components/sidebar';

export function TopBar() {
  const { generalSettings, updateGeneralSettings, isShiftOpen, shiftCashAmount, shiftTransferAmount, shiftStartTime, openShift, closeShift, checkOpenShift, currencySettings, user, logout } = usePosStore();
  const pathname = usePathname();
  const router = useRouter();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const [isShiftDetailsModalOpen, setIsShiftDetailsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Check for open shift on mount
  useEffect(() => {
    checkOpenShift();
  }, [checkOpenShift]);

  // Update current time every second when shift is open
  useEffect(() => {
    if (isShiftOpen) {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isShiftOpen]);

  const handleLanguageChange = (value: 'en' | 'lo' | 'th') => {
    updateGeneralSettings({
      ...generalSettings,
      language: value
    });
  };

  const hasMenuPermission = (menuId: string): boolean => {
    if (user?.role === 'admin') return true;
    if (!user?.permissions?.menus) return false;
    return user.permissions.menus[menuId as keyof typeof user.permissions.menus] || false;
  };

  const filteredNavigation = navigation.filter(item => hasMenuPermission(item.id));
  const sidebarText = SIDEBAR_TRANSLATIONS[currentLanguage] || SIDEBAR_TRANSLATIONS.en;

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    router.push('/login');
  };

  const TRANSLATIONS = {
    en: {
      startShift: 'Start Shift',
      closeShift: 'Close Shift',
      shiftDetails: 'Shift Details',
      shiftSummary: 'Summary of transactions during this shift',
      cashAmount: 'Cash Amount',
      transferAmount: 'Transfer Amount',
      total: 'Total',
      cancel: 'Cancel',
      confirm: 'Confirm',
      shiftStartTime: 'Shift Start Time',
      currentTime: 'Current Time',
      duration: 'Duration',
      hours: 'hours',
      minutes: 'minutes',
    },
    lo: {
      startShift: 'ເປີດຊີຟ',
      closeShift: 'ປິດຊີຟ',
      shiftDetails: 'ລາຍລະອຽດຊີຟ',
      shiftSummary: 'ສະຫຼຸບການເຮັດທຸລະກຳໃນຊີຟນີ້',
      cashAmount: 'ຈຳນວນເງິນສົດ',
      transferAmount: 'ຈຳນວນໂອນເງິນ',
      total: 'ລວມທັງໝົດ',
      cancel: 'ຍົກເລີກ',
      confirm: 'ຢືນຢັນ',
      shiftStartTime: 'ເວລາເປີດຊີຟ',
      currentTime: 'ເວລາປັດຈຸບັນ',
      duration: 'ໄລຍະເວລາ',
      hours: 'ຊົ່ວໂມງ',
      minutes: 'ນາທີ',
    },
    th: {
      startShift: 'เปิดกะ',
      closeShift: 'ปิดกะ',
      shiftDetails: 'รายละเอียดกะ',
      shiftSummary: 'สรุปธุรกรรมในกะนี้',
      cashAmount: 'จำนวนเงินสด',
      transferAmount: 'จำนวนเงินโอน',
      total: 'ยอดรวม',
      cancel: 'ยกเลิก',
      confirm: 'ยืนยัน',
      shiftStartTime: 'เวลาเปิดกะ',
      currentTime: 'เวลาปัจจุบัน',
      duration: 'ระยะเวลา',
      hours: 'ชั่วโมง',
      minutes: 'นาที',
    }
  };

  const t = TRANSLATIONS[currentLanguage];

  const formatCurrency = (amount: number) => {
    if (!currencySettings) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
    
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return currencySettings.currencySymbolPosition === 'left'
      ? `${currencySettings.currencySymbol}${formatted}`
      : `${formatted}${currencySettings.currencySymbol}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const calculateDuration = (startTime: string | null) => {
    if (!startTime) return { hours: 0, minutes: 0 };
    const start = new Date(startTime);
    const diff = currentTime.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return { hours, minutes };
  };

  return (
    <div className="h-16 border-b border-zinc-200/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden -ml-2 h-10 w-10 text-zinc-700 hover:bg-zinc-100"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="left-0 top-0 h-dvh max-h-dvh w-[86vw] max-w-sm translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0 data-[state=closed]:slide-out-to-left data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left data-[state=open]:slide-in-from-top-0">
            <div className="flex h-full flex-col bg-white">
              <div className="flex h-16 items-center border-b border-zinc-200 px-5">
                <div>
                  <DialogTitle className="text-lg font-bold text-zinc-900">Demios</DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500">
                    {generalSettings?.storeName || 'Supabase POS'}
                  </DialogDescription>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-1">
                  {filteredNavigation.map((item) => {
                    const displayName = sidebarText[item.id] || item.name;

                    if (item.subMenu) {
                      const isHistoryActive = item.subMenu.some(sub => pathname === sub.href);
                      return (
                        <div key={item.id} className="space-y-1">
                          <div
                            className={cn(
                              isHistoryActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600',
                              'flex items-center rounded-md px-3 py-2 text-sm font-semibold'
                            )}
                          >
                            <item.icon className="mr-3 h-5 w-5 text-zinc-500" />
                            {displayName}
                          </div>
                          <div className="ml-5 space-y-1 border-l border-zinc-200 pl-3">
                            {item.subMenu.map((sub) => {
                              const subIsActive = pathname === sub.href;
                              return (
                                <Link
                                  key={sub.id}
                                  href={sub.href}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className={cn(
                                    subIsActive
                                      ? 'bg-zinc-100 text-zinc-900'
                                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                                    'block rounded-md px-3 py-2 text-sm font-medium'
                                  )}
                                >
                                  {sidebarText[sub.id] || sub.name}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          isActive
                            ? 'bg-zinc-100 text-zinc-900'
                            : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                          'flex items-center rounded-md px-3 py-2 text-sm font-semibold'
                        )}
                      >
                        <item.icon className={cn('mr-3 h-5 w-5', isActive ? 'text-zinc-900' : 'text-zinc-500')} />
                        {displayName}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              <div className="border-t border-zinc-200 p-4">
                <div className="mb-3 flex items-center gap-3 px-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-900">{user?.name || sidebarText.user}</div>
                    <div className="text-xs capitalize text-zinc-500">{user?.role || sidebarText.staff}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {sidebarText.logout}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <div className="hidden lg:block">
          <h1 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
            {generalSettings?.storeName || 'Supabase POS'}
          </h1>
        </div>
        <div className="h-8 w-px bg-zinc-200 mx-2"></div>
        {!isShiftOpen ? (
          <Button
            variant="outline"
            className="h-8 text-xs font-bold bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            onClick={() => openShift()}
          >
            <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
            {t.startShift}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="h-8 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
            onClick={() => setIsShiftDetailsModalOpen(true)}
          >
            <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
            {t.closeShift}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-2 bg-zinc-50/80 px-3 py-1.5 rounded-xl border border-zinc-100">
          <Languages className="h-4 w-4 text-indigo-500" />
          <Select 
            value={generalSettings?.language || 'en'} 
            onValueChange={(v: any) => handleLanguageChange(v)}
          >
            <SelectTrigger className="h-8 w-[110px] border-0 bg-transparent p-0 text-xs font-bold focus:ring-0">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-zinc-200 shadow-2xl">
              <SelectItem value="en" className="text-xs font-bold py-2.5">
                <span className="flex items-center gap-2">🇺🇸 English</span>
              </SelectItem>
              <SelectItem value="lo" className="text-xs font-bold py-2.5">
                <span className="flex items-center gap-2">🇱🇦 ລາວ (Lao)</span>
              </SelectItem>
              <SelectItem value="th" className="text-xs font-bold py-2.5">
                <span className="flex items-center gap-2">🇹🇭 ไทย (Thai)</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Shift Details Modal */}
      <Dialog open={isShiftDetailsModalOpen} onOpenChange={setIsShiftDetailsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-900">{t.shiftDetails}</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {t.shiftSummary}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Time Information */}
            {shiftStartTime && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">{t.shiftStartTime}</span>
                  <span className="text-sm font-bold text-blue-700">{formatTime(new Date(shiftStartTime))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">{t.currentTime}</span>
                  <span className="text-sm font-bold text-blue-700">{formatTime(currentTime)}</span>
                </div>
                <div className="border-t border-blue-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-900">{t.duration}</span>
                    <span className="text-base font-bold text-blue-700">
                      {calculateDuration(shiftStartTime).hours} {t.hours} {calculateDuration(shiftStartTime).minutes} {t.minutes}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">💵</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-600">{t.cashAmount}</span>
                </div>
              </div>
              <span className="text-xl font-bold text-green-700">{formatCurrency(shiftCashAmount)}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📱</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-600">{t.transferAmount}</span>
                </div>
              </div>
              <span className="text-xl font-bold text-blue-700">{formatCurrency(shiftTransferAmount)}</span>
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-zinc-900">{t.total}</span>
                <span className="text-2xl font-bold text-zinc-900">{formatCurrency(shiftCashAmount + shiftTransferAmount)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsShiftDetailsModalOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                closeShift();
                setIsShiftDetailsModalOpen(false);
              }}
            >
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

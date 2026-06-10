'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { usePosStore } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { Clock, DollarSign, TrendingUp, Trash2, Search, Filter } from 'lucide-react';

const TRANSLATIONS = {
  en: {
    shiftHistory: 'Shift History',
    shiftId: 'Shift ID',
    startTime: 'Start Time',
    endTime: 'End Time',
    duration: 'Duration',
    cashAmount: 'Cash Amount',
    transferAmount: 'Transfer Amount',
    totalAmount: 'Total Amount',
    status: 'Status',
    open: 'Open',
    closed: 'Closed',
    noShifts: 'No shift history found',
    loading: 'Loading shift history...',
    shiftDetails: 'Shift Details',
    shiftSummary: 'Summary of this shift',
    cashTendered: 'Cash Tendered',
    transferReceived: 'Transfer Received',
    startedBy: 'Started By',
    closedBy: 'Closed By',
    deleteShift: 'Delete Shift',
    confirmDelete: 'Are you sure you want to delete this shift? This action cannot be undone.',
    shiftStartTime: 'Shift Start Time',
    currentTime: 'Current Time',
    hours: 'hours',
    minutes: 'minutes',
    searchShift: 'Search shift ID...',
    filter: 'Filter',
    smartFilter: 'Smart Filter',
    filterDescription: 'Filter by status and custom date range.',
    all: 'All',
    dateFrom: 'Date From',
    dateTo: 'Date To',
    clear: 'Clear',
    apply: 'Apply',
  },
  lo: {
    shiftHistory: 'ປະຫວັດຊີຟ',
    shiftId: 'ລະຫັດຊີຟ',
    startTime: 'ເວລາເປີດ',
    endTime: 'ເວລາປິດ',
    duration: 'ໄລຍະເວລາ',
    cashAmount: 'ຈຳນວນເງິນສົດ',
    transferAmount: 'ຈຳນວນໂອນເງິນ',
    totalAmount: 'ລວມທັງໝົດ',
    status: 'ສະຖານະ',
    open: 'ເປີດ',
    closed: 'ປິດ',
    noShifts: 'ບໍ່ພົບປະຫວັດຊີຟ',
    loading: 'ກຳລັງໂຫລດປະຫວັດຊີຟ...',
    shiftDetails: 'ລາຍລະອຽດຊີຟ',
    shiftSummary: 'ສະຫຼຸບຂອງຊີຟນີ້',
    cashTendered: 'ຈຳນວນເງິນທີ່ຮັບ',
    transferReceived: 'ຈຳນວນໂອນທີ່ຮັບ',
    startedBy: 'ເປີດໂດຍ',
    closedBy: 'ປິດໂດຍ',
    deleteShift: 'ລົບຊີຟ',
    confirmDelete: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບຊີຟນີ້? ການກະທຳນີ້ບໍ່ສາມາດຍົກເລີກໄດ້.',
    shiftStartTime: 'ເວລາເປີດຊີຟ',
    currentTime: 'ເວລາປັດຈຸບັນ',
    hours: 'ຊົ່ວໂມງ',
    minutes: 'ນາທີ',
    searchShift: 'ຄົ້ນຫາລະຫັດຊີຟ...',
    filter: 'ກອງ',
    smartFilter: 'ກອງອັດສະລິຍະ',
    filterDescription: 'ກອງຕາມສະຖານະແລະຊ່ວງວັນທີ.',
    all: 'ທັງໝົດ',
    dateFrom: 'ວັນທີເລີ່ມຕົ້ນ',
    dateTo: 'ວັນທີສິ້ນສຸດ',
    clear: 'ລ້າງ',
    apply: 'ນຳໃຊ້',
  },
  th: {
    shiftHistory: 'ประวัติกะ',
    shiftId: 'รหัสกะ',
    startTime: 'เวลาเริ่มต้น',
    endTime: 'เวลาสิ้นสุด',
    duration: 'ระยะเวลา',
    cashAmount: 'จำนวนเงินสด',
    transferAmount: 'จำนวนเงินโอน',
    totalAmount: 'ยอดรวม',
    status: 'สถานะ',
    open: 'เปิด',
    closed: 'ปิด',
    noShifts: 'ไม่พบประวัติกะ',
    loading: 'กำลังโหลดประวัติกะ...',
    shiftDetails: 'รายละเอียดกะ',
    shiftSummary: 'สรุปของกะนี้',
    cashTendered: 'จำนวนเงินที่รับ',
    transferReceived: 'จำนวนเงินโอนที่รับ',
    startedBy: 'เริ่มโดย',
    closedBy: 'ปิดโดย',
    deleteShift: 'ลบกะ',
    confirmDelete: 'คุณแน่ใจหรือไม่ว่าต้องการลบกะนี้? การกระทำนี้ไม่สามารถยกเลิกได้',
    shiftStartTime: 'เวลาเปิดกะ',
    currentTime: 'เวลาปัจจุบัน',
    hours: 'ชั่วโมง',
    minutes: 'นาที',
    searchShift: 'ค้นหารหัสกะ...',
    filter: 'กรอง',
    smartFilter: 'ตัวกรองอัจฉริยะ',
    filterDescription: 'กรองตามสถานะและช่วงวันที่.',
    all: 'ทั้งหมด',
    dateFrom: 'วันที่เริ่มต้น',
    dateTo: 'วันที่สิ้นสุด',
    clear: 'ล้าง',
    apply: 'ใช้งาน',
  }
};

export default function ShiftHistoryPage() {
  const { isSupabaseConfigured, currencySettings, generalSettings, user } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];

  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchShifts();
  }, [isSupabaseConfigured]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchShifts = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/shifts/list');
      const data = await response.json();
      
      if (data?.shifts) {
        setShifts(data.shifts);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
      // Fallback to mock data if API fails
      setShifts([
        {
          id: 'shift-001',
          start_time: new Date(Date.now() - 86400000).toISOString(),
          end_time: new Date(Date.now() - 7200000).toISOString(),
          cash_amount: 150000,
          transfer_amount: 50000,
          started_by: 'John Doe',
          closed_by: 'John Doe',
          status: 'closed'
        },
        {
          id: 'shift-002',
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: null,
          cash_amount: 25000,
          transfer_amount: 10000,
          started_by: 'Jane Smith',
          closed_by: null,
          status: 'open'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (shift: any) => {
    setSelectedShift(shift);
    setIsDetailsOpen(true);
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh shifts list
        fetchShifts();
        // Close modal if the deleted shift was selected
        if (selectedShift?.id === shiftId) {
          setIsDetailsOpen(false);
          setSelectedShift(null);
        }
      } else {
        alert('Failed to delete shift');
      }
    } catch (error) {
      console.error('Error deleting shift:', error);
      alert('Failed to delete shift');
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return '-';
    const start_date = new Date(start);
    const end_date = new Date(end);
    const diff = end_date.getTime() - start_date.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime);
    const diff = currentTime.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return { hours, minutes };
  };

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = shift.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shift.status === statusFilter;

    const shiftDate = new Date(shift.start_time);
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    const matchesFrom = !fromDate || shiftDate >= fromDate;
    const matchesTo = !toDate || shiftDate <= toDate;

    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  });

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 sm:pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.shiftHistory}</h2>
      </div>

      <Card className="border-blue-100 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 bg-blue-50/30 border-b border-blue-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
              <Input
                placeholder={t.searchShift}
                className="pl-9 border-blue-100 focus:border-blue-300 focus:ring-blue-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 w-full sm:w-auto" 
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter className="h-4 w-4" />
              {t.filter} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              {t.loading}
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              {t.noShifts}
            </div>
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredShifts.map((shift) => (
            <Card key={shift.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewDetails(shift)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-zinc-900">
                    {shift.id.substring(0, 8).toUpperCase()}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      shift.status === 'open' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-zinc-100 text-zinc-800'
                    }`}>
                      {shift.status === 'open' ? t.open : t.closed}
                    </span>
                    {user?.role === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShift(shift.id);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded-md transition-colors group"
                        title={t.deleteShift}
                      >
                        <Trash2 className="h-4 w-4 text-zinc-400 group-hover:text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(shift.start_time), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                {shift.end_time && (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(shift.end_time), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Clock className="h-4 w-4" />
                  <span>{t.duration}: {formatDuration(shift.start_time, shift.end_time)}</span>
                </div>
                <div className="border-t border-zinc-100 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">{t.cashAmount}</span>
                    <span className="font-medium text-green-700">{formatCurrency(shift.cash_amount, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">{t.transferAmount}</span>
                    <span className="font-medium text-blue-700">{formatCurrency(shift.transfer_amount, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-2 font-bold text-lg">
                    <span>{t.totalAmount}</span>
                    <span className="text-zinc-900">{formatCurrency(shift.cash_amount + shift.transfer_amount, currencySettings)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Filter Dialog */}
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
              <label className="text-sm font-medium">{t.status}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'closed')}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">{t.all}</option>
                <option value="open">{t.open}</option>
                <option value="closed">{t.closed}</option>
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

      {/* Shift Details Modal */}
      {selectedShift && isDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsDetailsOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-zinc-900 p-6 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{t.shiftDetails}</h3>
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Time Information for Open Shifts */}
              {selectedShift.status === 'open' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">{t.shiftStartTime}</span>
                    <span className="text-sm font-bold text-blue-700">{formatTime(new Date(selectedShift.start_time))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">{t.currentTime}</span>
                    <span className="text-sm font-bold text-blue-700">{formatTime(currentTime)}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-blue-900">{t.duration}</span>
                      <span className="text-base font-bold text-blue-700">
                        {calculateDuration(selectedShift.start_time).hours} {t.hours} {calculateDuration(selectedShift.start_time).minutes} {t.minutes}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-zinc-500 text-sm">{t.shiftId}</div>
                  <div className="font-mono font-medium text-zinc-900">{selectedShift.id.substring(0, 8).toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-sm">{t.status}</div>
                  <div className={`font-medium ${selectedShift.status === 'open' ? 'text-green-600' : 'text-zinc-900'}`}>
                    {selectedShift.status === 'open' ? t.open : t.closed}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500 text-sm">{t.startTime}</div>
                  <div className="font-medium text-zinc-900">{format(new Date(selectedShift.start_time), 'MMM dd, yyyy HH:mm')}</div>
                </div>
                {selectedShift.end_time && (
                  <div>
                    <div className="text-zinc-500 text-sm">{t.endTime}</div>
                    <div className="font-medium text-zinc-900">{format(new Date(selectedShift.end_time), 'MMM dd, yyyy HH:mm')}</div>
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-200 pt-4">
                <h4 className="text-sm font-semibold text-zinc-800 mb-3">{t.shiftSummary}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-600">{t.cashTendered}</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-green-700">{formatCurrency(selectedShift.cash_amount, currencySettings)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-600">{t.transferReceived}</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-blue-700">{formatCurrency(selectedShift.transfer_amount, currencySettings)}</span>
                  </div>

                  <div className="border-t border-zinc-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-zinc-900">Total</span>
                      <span className="text-2xl font-bold text-zinc-900">{formatCurrency(selectedShift.cash_amount + selectedShift.transfer_amount, currencySettings)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-zinc-500">{t.startedBy}</div>
                  <div className="font-medium text-zinc-900">{selectedShift.started_by || '-'}</div>
                </div>
                {selectedShift.closed_by && (
                  <div>
                    <div className="text-zinc-500">{t.closedBy}</div>
                    <div className="font-medium text-zinc-900">{selectedShift.closed_by}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-50 p-4 border-t border-zinc-200 flex justify-end">
              <Button onClick={() => setIsDetailsOpen(false)} className="px-6">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

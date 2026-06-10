'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Users, Grid3x3, X, Plus, PlayCircle, Clock } from 'lucide-react';
import { supabase, Zone, Table } from '@/lib/supabase';
import { usePosStore } from '@/lib/store';

interface TableSelectionProps {
  onSelectTable: (table: Table | null, orderType: 'dine-in' | 'takeout') => void;
  onClose: () => void;
  canClose?: boolean; // เพิ่ม prop เพื่อควบคุมว่าสามารถปิดได้หรือไม่
  onResumeOrder?: (orderId: string) => void; // เพิ่ม prop สำหรับ resume order
}

const TRANSLATIONS = {
  en: {
    selectOrderType: 'Select Order Type',
    takeout: 'Takeout',
    dineIn: 'Dine In',
    selectTable: 'Select a Table',
    available: 'Available',
    occupied: 'Occupied',
    reserved: 'Reserved',
    people: 'people',
    noTablesAvailable: 'No tables available',
    loadingTables: 'Loading tables...',
    forPickup: 'For pickup',
    forDineIn: 'For dine-in',
    addNew: 'Add New',
    heldTakeoutOrders: 'Held Takeout Orders',
    noHeldTakeout: 'No held takeout orders',
    resume: 'Resume',
    items: 'items',
    setAvailable: 'Set Available',
    confirmSetAvailable: 'Are you sure you want to set this table as available? Any unsaved data will be lost.',
    confirm: 'Confirm',
    cancel: 'Cancel',
    cannotSetAvailable: 'Cannot set table as available. There are items already sent to kitchen. Please complete checkout first.',
  },
  lo: {
    selectOrderType: 'ເລືອກປະເພດການສັ່ງ',
    takeout: 'ກັບບ້ານ',
    dineIn: 'ນັ່ງທານ',
    selectTable: 'ເລືອກໂຕະ',
    available: 'ວ່າງ',
    occupied: 'ມີຄົນນັ່ງ',
    reserved: 'ຈອງແລ້ວ',
    people: 'ຄົນ',
    noTablesAvailable: 'ບໍ່ມີໂຕະວ່າງ',
    loadingTables: 'ກຳລັງໂຫຼດໂຕະ...',
    forPickup: 'ສຳລັບເອົາກັບບ້ານ',
    forDineIn: 'ສຳລັບນັ່ງທານ',
    addNew: 'ເພີ່ມໃໝ່',
    heldTakeoutOrders: 'ລາຍການກັບບ້ານທີ່ພັກໄວ້',
    noHeldTakeout: 'ບໍ່ມີລາຍການກັບບ້ານທີ່ພັກໄວ້',
    resume: 'ສືບຕໍ່',
    items: 'ລາຍການ',
    setAvailable: 'ຕັ້ງເປັນໂຕະວ່າງ',
    confirmSetAvailable: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການຕັ້ງໂຕະນີ້ເປັນວ່າງ? ຂໍ້ມູນທີ່ບໍ່ໄດ້ບັນທຶກຈະສູນຫາຍ.',
    confirm: 'ຢືນຢັນ',
    cancel: 'ຍົກເລີກ',
    cannotSetAvailable: 'ບໍ່ສາມາດຕັ້ງໂຕະເປັນວ່າງໄດ້. ມີລາຍການທີ່ສົ່ງໄປຄົວແລ້ວ. ກະລຸນາຊຳລະເງິນກ່ອນ.',
  },
  th: {
    selectOrderType: 'เลือกประเภทการสั่ง',
    takeout: 'กลับบ้าน',
    dineIn: 'นั่งทาน',
    selectTable: 'เลือกโต๊ะ',
    available: 'ว่าง',
    occupied: 'มีคนนั่ง',
    reserved: 'จองแล้ว',
    people: 'คน',
    noTablesAvailable: 'ไม่มีโต๊ะว่าง',
    loadingTables: 'กำลังโหลดโต๊ะ...',
    forPickup: 'สำหรับเอากลับบ้าน',
    forDineIn: 'สำหรับนั่งทาน',
    addNew: 'เพิ่มใหม่',
    heldTakeoutOrders: 'รายการกลับบ้านที่พักไว้',
    noHeldTakeout: 'ไม่มีรายการกลับบ้านที่พักไว้',
    resume: 'ดำเนินการต่อ',
    items: 'รายการ',
    setAvailable: 'ตั้งเป็นโต๊ะว่าง',
    confirmSetAvailable: 'คุณแน่ใจหรือไม่ว่าต้องการตั้งโต๊ะนี้เป็นว่าง? ข้อมูลที่ไม่ได้บันทึกจะสูญหาย',
    confirm: 'ยืนยัน',
    cancel: 'ยกเลิก',
    cannotSetAvailable: 'ไม่สามารถตั้งโต๊ะเป็นว่างได้ มีรายการที่ส่งไปครัวแล้ว กรุณาชำระเงินก่อน',
  }
};

export function TableSelection({ onSelectTable, onClose, canClose = true, onResumeOrder }: TableSelectionProps) {
  const { generalSettings, heldOrders, resumeOrder, savedCarts } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];

  // Filter takeout held orders
  const takeoutHeldOrders = heldOrders.filter(order => order.orderType === 'takeout');

  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dine-in' | 'takeout'>('dine-in');
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; tableId: string | null }>({ show: false, tableId: null });

  const fetchZonesAndTables = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [zonesRes, tablesRes] = await Promise.all([
        supabase.from('zones').select('*').eq('status', 'active').order('display_order'),
        supabase.from('tables').select('*').order('display_order')
      ]);

      if (zonesRes.data) setZones(zonesRes.data);
      if (tablesRes.data) {
        // Check each table's cart to determine actual status
        const tablesWithActualStatus = tablesRes.data.map(table => {
          const cartKey = `table-${table.id}`;
          const tableCart = savedCarts[cartKey] || [];
          const hasSentItems = tableCart.some(item => item.sentToKitchen && !item.cancelled);
          
          // If table has sent items, force status to occupied
          if (hasSentItems && table.status === 'available') {
            return { ...table, status: 'occupied' as const };
          }
          
          return table;
        });
        
        setTables(tablesWithActualStatus);
      }
      
      // Auto-select first zone
      if (zonesRes.data && zonesRes.data.length > 0) {
        setSelectedZone(zonesRes.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching zones and tables:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [savedCarts]);

  useEffect(() => {
    fetchZonesAndTables();
  }, [fetchZonesAndTables]); // Re-fetch when savedCarts changes

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        fetchZonesAndTables(true);
      }, 250);
    };

    const channel = supabase
      .channel('table-selection-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, scheduleRefresh)
      .subscribe();

    const pollingId = window.setInterval(() => fetchZonesAndTables(true), 10000);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      window.clearInterval(pollingId);
      supabase.removeChannel(channel);
    };
  }, [fetchZonesAndTables]);

  const handleTakeout = () => {
    onSelectTable(null, 'takeout');
  };

  const handleTableSelect = (table: Table) => {
    // Allow selecting any table except reserved and inactive
    if (table.status !== 'reserved' && table.status !== 'inactive') {
      onSelectTable(table, 'dine-in');
    }
  };

  const handleSetTableAvailable = async (tableId: string) => {
    try {
      // Update table status to available and clear current_order_id
      await supabase
        .from('tables')
        .update({ 
          status: 'available',
          current_order_id: null
        })
        .eq('id', tableId);

      // Clear cart for this table from savedCarts
      const cartKey = `table-${tableId}`;
      const store = usePosStore.getState();
      const updatedSavedCarts = { ...store.savedCarts };
      delete updatedSavedCarts[cartKey];
      
      // Update store with cleared cart
      usePosStore.setState({ savedCarts: updatedSavedCarts });

      // Refresh tables list
      await fetchZonesAndTables();
      
      // Close confirmation dialog
      setConfirmDialog({ show: false, tableId: null });
    } catch (error) {
      console.error('Error setting table as available:', error);
      alert('Failed to set table as available. Please try again.');
    }
  };

  const showConfirmDialog = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent table selection
    
    // Check if table has items sent to kitchen
    const cartKey = `table-${tableId}`;
    const tableCart = savedCarts[cartKey] || [];
    const hasSentItems = tableCart.some(item => item.sentToKitchen && !item.cancelled);
    
    if (hasSentItems) {
      alert(t.cannotSetAvailable);
      return;
    }
    
    setConfirmDialog({ show: true, tableId });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return t.available;
      case 'occupied': return t.occupied;
      case 'reserved': return t.reserved;
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'occupied': return 'bg-red-50 border-red-200 text-red-700';
      case 'reserved': return 'bg-amber-50 border-amber-200 text-amber-700';
      default: return 'bg-zinc-50 border-zinc-200 text-zinc-700';
    }
  };

  const filteredTables = selectedZone
    ? tables.filter(t => t.zone_id === selectedZone && t.status !== 'inactive')
    : tables.filter(t => t.status !== 'inactive');

  return (
    <>
      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">{t.setAvailable}</h3>
            <p className="text-zinc-600 mb-6">{t.confirmSetAvailable}</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog({ show: false, tableId: null })}
              >
                {t.cancel}
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => confirmDialog.tableId && handleSetTableAvailable(confirmDialog.tableId)}
              >
                {t.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full bg-white">
        <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 bg-white">
          <h2 className="text-2xl font-bold text-zinc-900">{t.selectOrderType}</h2>
          {canClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-200 bg-zinc-50">
          <div className="flex gap-2 p-4">
            <Button
              onClick={() => setActiveTab('dine-in')}
              variant={activeTab === 'dine-in' ? 'default' : 'outline'}
              className={`flex-1 h-16 text-lg font-bold rounded-xl ${
                activeTab === 'dine-in'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-lg'
                  : 'bg-white hover:bg-zinc-50'
              }`}
            >
              <Users className="mr-3 h-6 w-6" />
              {t.dineIn}
            </Button>
            <Button
              onClick={() => setActiveTab('takeout')}
              variant={activeTab === 'takeout' ? 'default' : 'outline'}
              className={`flex-1 h-16 text-lg font-bold rounded-xl ${
                activeTab === 'takeout'
                  ? 'bg-green-600 hover:bg-green-700 shadow-lg'
                  : 'bg-white hover:bg-zinc-50'
              }`}
            >
              <ShoppingBag className="mr-3 h-6 w-6" />
              {t.takeout}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'takeout' ? (
            /* Takeout Content */
            <div className="flex flex-col h-full">
              {/* Add New Button at Top */}
              <div className="mb-6">
                <Button
                  onClick={handleTakeout}
                  className="w-full h-16 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg rounded-xl"
                >
                  <Plus className="mr-3 h-6 w-6" />
                  {t.addNew}
                </Button>
              </div>

              {/* Held Takeout Orders */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-zinc-700 mb-4">{t.heldTakeoutOrders}</h3>
                
                {takeoutHeldOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                    <ShoppingBag className="h-16 w-16 opacity-20 mb-4" />
                    <p className="text-lg">{t.noHeldTakeout}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {takeoutHeldOrders.map((order) => {
                      const totalAmount = order.cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
                      const formatCurrency = (amount: number) => {
                        return new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(amount);
                      };

                      return (
                        <Card 
                          key={order.id} 
                          className="border-green-200 hover:border-green-300 transition-all hover:shadow-lg cursor-pointer"
                          onClick={() => {
                            if (onResumeOrder) {
                              onResumeOrder(order.id);
                            } else {
                              resumeOrder(order.id);
                            }
                            onClose();
                          }}
                        >
                          <CardHeader className="pb-3 bg-green-50">
                            <CardTitle className="text-lg flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-green-600" />
                                <span className="text-green-900">{t.takeout}</span>
                              </div>
                              <PlayCircle className="h-5 w-5 text-green-600" />
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              {/* Date/Time */}
                              <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(order.date).toLocaleString()}</span>
                              </div>

                              {/* Note */}
                              {order.note && (
                                <div className="text-sm text-zinc-600 italic bg-zinc-50 p-2 rounded">
                                  &quot;{order.note}&quot;
                                </div>
                              )}

                              {/* Items Preview */}
                              <div className="space-y-1">
                                {order.cart.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="text-sm flex justify-between">
                                    <span className="text-zinc-700">
                                      {item.quantity}x {item.item.name}
                                    </span>
                                    <span className="text-zinc-500 font-medium">
                                      {formatCurrency(item.item.price * item.quantity)}
                                    </span>
                                  </div>
                                ))}
                                {order.cart.length > 3 && (
                                  <div className="text-xs text-zinc-400">
                                    +{order.cart.length - 3} {t.items}
                                  </div>
                                )}
                              </div>

                              {/* Total */}
                              <div className="pt-3 border-t border-zinc-200 flex justify-between items-center">
                                <span className="font-bold text-zinc-900">Total:</span>
                                <span className="font-bold text-lg text-green-600">
                                  {formatCurrency(totalAmount)}
                                </span>
                              </div>

                              {/* Resume Button */}
                              <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onResumeOrder) {
                                    onResumeOrder(order.id);
                                  } else {
                                    resumeOrder(order.id);
                                  }
                                  onClose();
                                }}
                              >
                                <PlayCircle className="mr-2 h-4 w-4" />
                                {t.resume}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Dine-In Content */
            <>
              <div className="mb-4">
                <h3 className="text-lg font-bold text-zinc-700 mb-4">{t.selectTable}</h3>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-zinc-500">{t.loadingTables}</div>
              ) : (
                <>
                  {/* Zone Tabs */}
                  {zones.length > 0 && (
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                      {zones.map((zone) => (
                        <Button
                          key={zone.id}
                          onClick={() => setSelectedZone(zone.id)}
                          variant={selectedZone === zone.id ? 'default' : 'outline'}
                          className={`rounded-xl font-bold whitespace-nowrap ${
                            selectedZone === zone.id
                              ? 'shadow-md'
                              : ''
                          }`}
                          style={
                            selectedZone === zone.id
                              ? { backgroundColor: zone.color, borderColor: zone.color }
                              : { borderColor: zone.color, color: zone.color }
                          }
                        >
                          <Grid3x3 className="mr-2 h-4 w-4" />
                          {zone.name}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Tables Grid */}
                  {filteredTables.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">{t.noTablesAvailable}</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {filteredTables.map((table) => {
                        const isSelectable = table.status !== 'reserved' && table.status !== 'inactive';
                        const isOccupied = table.status === 'occupied';
                        
                        // Check if table has items sent to kitchen
                        const cartKey = `table-${table.id}`;
                        const tableCart = savedCarts[cartKey] || [];
                        const hasSentItems = tableCart.some(item => item.sentToKitchen && !item.cancelled);
                        
                        // กำหนดสี border ตามสถานะโต๊ะ
                        const getBorderColor = (status: string) => {
                          switch (status) {
                            case 'available': return 'border-emerald-300';
                            case 'occupied': return 'border-red-300';
                            case 'reserved': return 'border-amber-300';
                            default: return 'border-zinc-200';
                          }
                        };
                        
                        return (
                          <Card
                            key={table.id}
                            className={`cursor-pointer transition-all duration-200 border-2 ${getBorderColor(table.status)} ${
                              isSelectable
                                ? 'hover:shadow-lg hover:scale-105'
                                : 'opacity-60 cursor-not-allowed'
                            }`}
                            onClick={() => handleTableSelect(table)}
                          >
                            <CardHeader className={`pb-3 ${getStatusColor(table.status)}`}>
                              <CardTitle className="text-2xl font-bold text-center">
                                {table.table_number}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-center gap-2 text-zinc-600">
                                  <Users className="h-4 w-4" />
                                  <span>{table.capacity} {t.people}</span>
                                </div>
                                <div className="text-center">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      table.status === 'available'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : table.status === 'occupied'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {getStatusLabel(table.status)}
                                  </span>
                                </div>
                                
                                {/* Set Available Button - Only show for occupied tables without sent items */}
                                {isOccupied && !hasSentItems && (
                                  <div className="pt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300"
                                      onClick={(e) => showConfirmDialog(table.id, e)}
                                    >
                                      {t.setAvailable}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

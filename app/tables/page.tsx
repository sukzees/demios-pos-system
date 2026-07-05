'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Grid3x3, Users, AlertTriangle, GripVertical } from 'lucide-react';
import { usePosStore } from '@/lib/store';
import { supabase, Zone, Table } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TRANSLATIONS = {
  en: {
    tablesZones: 'Tables & Zones',
    manageTablesZones: 'Manage restaurant tables and zones',
    zones: 'Zones',
    tables: 'Tables',
    addZone: 'Add Zone',
    addTable: 'Add Table',
    editZone: 'Edit Zone',
    editTable: 'Edit Table',
    zoneName: 'Zone Name',
    description: 'Description',
    color: 'Color',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    tableNumber: 'Table Number',
    zone: 'Zone',
    capacity: 'Capacity',
    available: 'Available',
    occupied: 'Occupied',
    reserved: 'Reserved',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    delete: 'Delete',
    deleting: 'Deleting...',
    deleteZone: 'Delete Zone?',
    deleteTable: 'Delete Table?',
    areYouSureDeleteZone: 'Are you sure you want to delete this zone?',
    areYouSureDeleteTable: 'Are you sure you want to delete this table?',
    noZonesFound: 'No zones found.',
    noTablesFound: 'No tables found.',
    people: 'people',
    dragHint: 'Drag cards to reorder. The order is reflected on the POS screen.',
  },
  lo: {
    tablesZones: 'ໂຕະ ແລະ ໂຊນ',
    manageTablesZones: 'ຈັດການໂຕະ ແລະ ໂຊນຂອງຮ້ານອາຫານ',
    zones: 'ໂຊນ',
    tables: 'ໂຕະ',
    addZone: 'ເພີ່ມໂຊນ',
    addTable: 'ເພີ່ມໂຕະ',
    editZone: 'ແກ້ໄຂໂຊນ',
    editTable: 'ແກ້ໄຂໂຕະ',
    zoneName: 'ຊື່ໂຊນ',
    description: 'ລາຍລະອຽດ',
    color: 'ສີ',
    status: 'ສະຖານະ',
    active: 'ໃຊ້ງານ',
    inactive: 'ປິດໃຊ້ງານ',
    tableNumber: 'ເລກໂຕະ',
    zone: 'ໂຊນ',
    capacity: 'ຈຳນວນທີ່ນັ່ງ',
    available: 'ວ່າງ',
    occupied: 'ມີຄົນນັ່ງ',
    reserved: 'ຈອງແລ້ວ',
    cancel: 'ຍົກເລີກ',
    save: 'ບັນທຶກ',
    saving: 'ກຳລັງບັນທຶກ...',
    delete: 'ລົບ',
    deleting: 'ກຳລັງລົບ...',
    deleteZone: 'ລົບໂຊນ?',
    deleteTable: 'ລົບໂຕະ?',
    areYouSureDeleteZone: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບໂຊນນີ້?',
    areYouSureDeleteTable: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບໂຕະນີ້?',
    noZonesFound: 'ບໍ່ພົບໂຊນ.',
    noTablesFound: 'ບໍ່ພົບໂຕະ.',
    people: 'ຄົນ',
    dragHint: 'ລາກບັດເພື່ອຈັດລຳດັບ ລຳດັບຈະສະແດງຢູ່ໜ້າ POS.',
  },
  th: {
    tablesZones: 'โต๊ะและโซน',
    manageTablesZones: 'จัดการโต๊ะและโซนของร้านอาหาร',
    zones: 'โซน',
    tables: 'โต๊ะ',
    addZone: 'เพิ่มโซน',
    addTable: 'เพิ่มโต๊ะ',
    editZone: 'แก้ไขโซน',
    editTable: 'แก้ไขโต๊ะ',
    zoneName: 'ชื่อโซน',
    description: 'รายละเอียด',
    color: 'สี',
    status: 'สถานะ',
    active: 'ใช้งาน',
    inactive: 'ปิดใช้งาน',
    tableNumber: 'เลขโต๊ะ',
    zone: 'โซน',
    capacity: 'จำนวนที่นั่ง',
    available: 'ว่าง',
    occupied: 'มีคนนั่ง',
    reserved: 'จองแล้ว',
    cancel: 'ยกเลิก',
    save: 'บันทึก',
    saving: 'กำลังบันทึก...',
    delete: 'ลบ',
    deleting: 'กำลังลบ...',
    deleteZone: 'ลบโซน?',
    deleteTable: 'ลบโต๊ะ?',
    areYouSureDeleteZone: 'คุณแน่ใจหรือไม่ว่าต้องการลบโซนนี้?',
    areYouSureDeleteTable: 'คุณแน่ใจหรือไม่ว่าต้องการลบโต๊ะนี้?',
    noZonesFound: 'ไม่พบโซน',
    noTablesFound: 'ไม่พบโต๊ะ',
    people: 'คน',
    dragHint: 'ลากการ์ดเพื่อจัดเรียงลำดับ ลำดับจะแสดงผลในหน้า POS',
  }
};

export default function TablesPage() {
  const { generalSettings } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];

  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null);
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dragTableId, setDragTableId] = useState<string | null>(null);
  const [dragZoneId, setDragZoneId] = useState<string | null>(null);

  const [newZone, setNewZone] = useState<{
    name: string;
    description: string;
    color: string;
    status: 'active' | 'inactive';
  }>({
    name: '',
    description: '',
    color: '#3B82F6',
    status: 'active'
  });

  const [newTable, setNewTable] = useState<{
    table_number: string;
    zone_id: string;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved' | 'inactive';
  }>({
    table_number: '',
    zone_id: '',
    capacity: 4,
    status: 'available'
  });

  const fetchZones = async () => {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('display_order', { ascending: true });
    if (data) setZones(data);
  };

  const fetchTables = async () => {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('display_order', { ascending: true });
    if (data) setTables(data);
  };

  useEffect(() => {
    fetchZones();
    fetchTables();
  }, []);

  const handleSaveZone = async () => {
    if (!newZone.name) return;
    setIsLoading(true);

    try {
      if (editingZoneId) {
        await supabase
          .from('zones')
          .update(newZone)
          .eq('id', editingZoneId);
      } else {
        await supabase
          .from('zones')
          .insert(newZone);
      }
      setIsZoneDialogOpen(false);
      resetZoneForm();
      fetchZones();
    } catch (error) {
      console.error('Error saving zone:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTable = async () => {
    if (!newTable.table_number) return;
    setIsLoading(true);

    try {
      if (editingTableId) {
        await supabase
          .from('tables')
          .update(newTable)
          .eq('id', editingTableId);
      } else {
        await supabase
          .from('tables')
          .insert(newTable);
      }
      setIsTableDialogOpen(false);
      resetTableForm();
      fetchTables();
    } catch (error) {
      console.error('Error saving table:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditZone = (zone: Zone) => {
    setNewZone({
      name: zone.name,
      description: zone.description || '',
      color: zone.color || '#3B82F6',
      status: zone.status
    });
    setEditingZoneId(zone.id);
    setIsZoneDialogOpen(true);
  };

  const handleEditTable = (table: Table) => {
    setNewTable({
      table_number: table.table_number,
      zone_id: table.zone_id || '',
      capacity: table.capacity,
      status: table.status
    });
    setEditingTableId(table.id);
    setIsTableDialogOpen(true);
  };

  const confirmDeleteZone = async () => {
    if (!deleteZoneId) return;
    setIsDeleting(true);

    try {
      await supabase.from('zones').delete().eq('id', deleteZoneId);
      fetchZones();
    } catch (error) {
      console.error('Error deleting zone:', error);
    } finally {
      setIsDeleting(false);
      setDeleteZoneId(null);
    }
  };

  const confirmDeleteTable = async () => {
    if (!deleteTableId) return;
    setIsDeleting(true);

    try {
      await supabase.from('tables').delete().eq('id', deleteTableId);
      fetchTables();
    } catch (error) {
      console.error('Error deleting table:', error);
    } finally {
      setIsDeleting(false);
      setDeleteTableId(null);
    }
  };

  const resetZoneForm = () => {
    setNewZone({ name: '', description: '', color: '#3B82F6', status: 'active' });
    setEditingZoneId(null);
  };

  const resetTableForm = () => {
    setNewTable({ table_number: '', zone_id: '', capacity: 4, status: 'available' });
    setEditingTableId(null);
  };

  // Persist new display_order for a reordered list
  const persistOrder = async (tableName: 'tables' | 'zones', list: { id: string }[]) => {
    try {
      await Promise.all(
        list.map((row, index) =>
          supabase.from(tableName).update({ display_order: index }).eq('id', row.id)
        )
      );
    } catch (error) {
      console.error(`Error saving ${tableName} order:`, error);
    }
  };

  const handleTableDrop = async (targetId: string) => {
    const sourceId = dragTableId;
    setDragTableId(null);
    if (!sourceId || sourceId === targetId) return;
    const current = [...tables];
    const from = current.findIndex(tb => tb.id === sourceId);
    const to = current.findIndex(tb => tb.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setTables(current);
    await persistOrder('tables', current);
  };

  const handleZoneDrop = async (targetId: string) => {
    const sourceId = dragZoneId;
    setDragZoneId(null);
    if (!sourceId || sourceId === targetId) return;
    const current = [...zones];
    const from = current.findIndex(z => z.id === sourceId);
    const to = current.findIndex(z => z.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setZones(current);
    await persistOrder('zones', current);
  };

  const getZoneName = (zoneId?: string) => {
    if (!zoneId) return '-';
    const zone = zones.find(z => z.id === zoneId);
    return zone?.name || '-';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t.active;
      case 'inactive': return t.inactive;
      case 'available': return t.available;
      case 'occupied': return t.occupied;
      case 'reserved': return t.reserved;
      default: return status;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-8 pt-6 bg-zinc-50/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">{t.tablesZones}</h2>
          <p className="text-zinc-500">{t.manageTablesZones}</p>
        </div>
      </div>

      <Tabs defaultValue="tables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tables">{t.tables}</TabsTrigger>
          <TabsTrigger value="zones">{t.zones}</TabsTrigger>
        </TabsList>

        {/* Tables Tab */}
        <TabsContent value="tables" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTableDialogOpen} onOpenChange={(open) => {
              setIsTableDialogOpen(open);
              if (!open) resetTableForm();
            }}>
              <DialogTrigger asChild>
                <Button className="h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" /> {t.addTable}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle>{editingTableId ? t.editTable : t.addTable}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t.tableNumber}</Label>
                    <Input value={newTable.table_number} onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })} placeholder="T1" />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.zone}</Label>
                    <Select value={newTable.zone_id} onValueChange={(v) => setNewTable({ ...newTable, zone_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {zones.map(zone => (
                          <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.capacity}</Label>
                    <Input type="number" value={newTable.capacity} onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 4 })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.status}</Label>
                    <Select value={newTable.status} onValueChange={(v: any) => setNewTable({ ...newTable, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">{t.available}</SelectItem>
                        <SelectItem value="occupied">{t.occupied}</SelectItem>
                        <SelectItem value="reserved">{t.reserved}</SelectItem>
                        <SelectItem value="inactive">{t.inactive}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTableDialogOpen(false)}>{t.cancel}</Button>
                  <Button onClick={handleSaveTable} disabled={isLoading}>{isLoading ? t.saving : t.save}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {tables.length > 0 && (
            <p className="text-sm text-zinc-500">{t.dragHint}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.length === 0 ? (
              <div className="col-span-full text-center py-12 text-zinc-500">{t.noTablesFound}</div>
            ) : (
              tables.map((table) => (
                <Card
                  key={table.id}
                  draggable
                  onDragStart={() => setDragTableId(table.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleTableDrop(table.id)}
                  onDragEnd={() => setDragTableId(null)}
                  className={`border-0 shadow-lg rounded-2xl overflow-hidden transition-opacity ${
                    dragTableId === table.id ? 'opacity-40' : ''
                  }`}
                >
                  <CardHeader className={`pb-3 ${
                    table.status === 'available' ? 'bg-emerald-50' :
                    table.status === 'occupied' ? 'bg-red-50' :
                    table.status === 'reserved' ? 'bg-amber-50' : 'bg-zinc-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-zinc-400 cursor-grab active:cursor-grabbing" />
                        <CardTitle className="text-2xl font-bold">{table.table_number}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditTable(table)} className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTableId(table.id)} className="h-8 w-8 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Grid3x3 className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-600">{getZoneName(table.zone_id)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-600">{table.capacity} {t.people}</span>
                      </div>
                      <div className="pt-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          table.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                          table.status === 'occupied' ? 'bg-red-100 text-red-700' :
                          table.status === 'reserved' ? 'bg-amber-100 text-amber-700' :
                          'bg-zinc-100 text-zinc-700'
                        }`}>
                          {getStatusLabel(table.status)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Zones Tab */}
        <TabsContent value="zones" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isZoneDialogOpen} onOpenChange={(open) => {
              setIsZoneDialogOpen(open);
              if (!open) resetZoneForm();
            }}>
              <DialogTrigger asChild>
                <Button className="h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" /> {t.addZone}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle>{editingZoneId ? t.editZone : t.addZone}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>{t.zoneName}</Label>
                    <Input value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.description}</Label>
                    <Input value={newZone.description} onChange={(e) => setNewZone({ ...newZone, description: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.color}</Label>
                    <Input type="color" value={newZone.color} onChange={(e) => setNewZone({ ...newZone, color: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.status}</Label>
                    <Select value={newZone.status} onValueChange={(v: any) => setNewZone({ ...newZone, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t.active}</SelectItem>
                        <SelectItem value="inactive">{t.inactive}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsZoneDialogOpen(false)}>{t.cancel}</Button>
                  <Button onClick={handleSaveZone} disabled={isLoading}>{isLoading ? t.saving : t.save}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {zones.length > 0 && (
            <p className="text-sm text-zinc-500">{t.dragHint}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.length === 0 ? (
              <div className="col-span-full text-center py-12 text-zinc-500">{t.noZonesFound}</div>
            ) : (
              zones.map((zone) => (
                <Card
                  key={zone.id}
                  draggable
                  onDragStart={() => setDragZoneId(zone.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleZoneDrop(zone.id)}
                  onDragEnd={() => setDragZoneId(null)}
                  className={`border-0 shadow-lg rounded-2xl overflow-hidden transition-opacity ${
                    dragZoneId === zone.id ? 'opacity-40' : ''
                  }`}
                >
                  <CardHeader style={{ backgroundColor: zone.color + '20' }} className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-zinc-400 cursor-grab active:cursor-grabbing" />
                        <CardTitle className="text-xl font-bold">{zone.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditZone(zone)} className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteZoneId(zone.id)} className="h-8 w-8 text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-zinc-600 mb-3">{zone.description || '-'}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: zone.color }}></div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        zone.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {getStatusLabel(zone.status)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Zone Dialog */}
      <AlertDialog open={!!deleteZoneId} onOpenChange={(open) => !open && setDeleteZoneId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-center">{t.deleteZone}</AlertDialogTitle>
            <AlertDialogDescription className="text-center">{t.areYouSureDeleteZone}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDeleteZone(); }} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting ? t.deleting : t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Table Dialog */}
      <AlertDialog open={!!deleteTableId} onOpenChange={(open) => !open && setDeleteTableId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <AlertDialogTitle className="text-center">{t.deleteTable}</AlertDialogTitle>
            <AlertDialogDescription className="text-center">{t.areYouSureDeleteTable}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDeleteTable(); }} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting ? t.deleting : t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

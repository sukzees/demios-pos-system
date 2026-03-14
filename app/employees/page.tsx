'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2, UserCog, AlertTriangle } from 'lucide-react';
import { usePosStore, Employee } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
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

const TRANSLATIONS = {
  en: {
    employees: 'Employees',
    manageStaff: 'Manage staff access and roles',
    searchEmployees: 'Search employees...',
    addEmployee: 'Add Employee',
    editEmployee: 'Edit Employee',
    addNewEmployee: 'Add New Employee',
    updateEmployeeDetails: 'Update employee details and access rights.',
    createNewProfile: 'Create a new employee profile.',
    name: 'Name',
    role: 'Role',
    pin: 'PIN Code (6 digits)',
    loginPin: 'Login PIN',
    cancel: 'Cancel',
    saveEmployee: 'Save Employee',
    saving: 'Saving...',
    staffList: 'Staff List',
    manageAllStaff: 'Manage all registered employees',
    staffName: 'Staff Name',
    status: 'Status',
    joinedDate: 'Joined Date',
    actions: 'Actions',
    noEmployeesFound: 'No employees found.',
    admin: 'Admin',
    manager: 'Manager',
    staff: 'Staff',
    active: 'Active',
    inactive: 'Inactive',
    deleteEmployee: 'Delete Employee?',
    areYouSureDelete: 'Are you sure you want to delete ',
    deleting: 'Deleting...',
    deleteAccount: 'Delete Account',
    cannotDeleteAdmin: 'Cannot delete admin users for security reasons.',
    failedToSave: 'Failed to save employee. Please try again.',
    failedToDelete: 'Failed to delete employee.',
    johnDoe: 'John Doe',
  },
  lo: {
    employees: 'ພະນັກງານ',
    manageStaff: 'ຈັດການການເຂົ້າເຖິງ ແລະ ບົດບາດຂອງພະນັກງານ',
    searchEmployees: 'ຄົ້ນຫາພະນັກງານ...',
    addEmployee: 'ເພີ່ມພະນັກງານ',
    editEmployee: 'ແກ້ໄຂພະນັກງານ',
    addNewEmployee: 'ເພີ່ມພະນັກງານໃໝ່',
    updateEmployeeDetails: 'ອັບເດດລາຍລະອຽດພະນັກງານ ແລະ ສິດການເຂົ້າເຖິງ.',
    createNewProfile: 'ສ້າງໂປຣໄຟລ໌ພະນັກງານໃໝ່.',
    name: 'ຊື່',
    role: 'ບົດບາດ',
    pin: 'ລະຫັດ PIN (6 ຕົວເລກ)',
    loginPin: 'PIN ເຂົ້າລະບົບ',
    cancel: 'ຍົກເລີກ',
    saveEmployee: 'ບັນທຶກພະນັກງານ',
    saving: 'ກຳລັງບັນທຶກ...',
    staffList: 'ລາຍຊື່ພະນັກງານ',
    manageAllStaff: 'ຈັດການພະນັກງານທັງໝົດທີ່ລົງທະບຽນ',
    staffName: 'ຊື່ພະນັກງານ',
    status: 'ສະຖານະ',
    joinedDate: 'ວັນທີເຂົ້າຮ່ວມ',
    actions: 'ຈັດການ',
    noEmployeesFound: 'ບໍ່ພົບພະນັກງານ.',
    admin: 'ຜູ້ດູແລ',
    manager: 'ຜູ້ຈັດການ',
    staff: 'ພະນັກງານ',
    active: 'ໃຊ້ງານຢູ່',
    inactive: 'ປິດໃຊ້ງານ',
    deleteEmployee: 'ລົບພະນັກງານ?',
    areYouSureDelete: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບ ',
    deleting: 'ກຳລັງລົບ...',
    deleteAccount: 'ລົບບັນຊີ',
    cannotDeleteAdmin: 'ບໍ່ສາມາດລົບຜູ້ດູແລໄດ້ເພື່ອເຫດຜົນດ້ານຄວາມປອດໄພ.',
    failedToSave: 'ບໍ່ສາມາດບັນທຶກພະນັກງານໄດ້. ກະລຸນາລອງໃໝ່.',
    failedToDelete: 'ບໍ່ສາມາດລົບພະນັກງານໄດ້.',
    johnDoe: 'ທ້າວ ສົມຊາຍ',
  },
  th: {
    employees: 'พนักงาน',
    manageStaff: 'จัดการการเข้าถึงและบทบาทของพนักงาน',
    searchEmployees: 'ค้นหาพนักงาน...',
    addEmployee: 'เพิ่มพนักงาน',
    editEmployee: 'แก้ไขพนักงาน',
    addNewEmployee: 'เพิ่มพนักงานใหม่',
    updateEmployeeDetails: 'อัปเดตรายละเอียดพนักงานและสิทธิ์การเข้าถึง',
    createNewProfile: 'สร้างโปรไฟล์พนักงานใหม่',
    name: 'ชื่อ',
    role: 'บทบาท',
    pin: 'รหัส PIN (6 หลัก)',
    loginPin: 'PIN เข้าสู่ระบบ',
    cancel: 'ยกเลิก',
    saveEmployee: 'บันทึกพนักงาน',
    saving: 'กำลังบันทึก...',
    staffList: 'รายชื่อพนักงาน',
    manageAllStaff: 'จัดการพนักงานทั้งหมดที่ลงทะเบียน',
    staffName: 'ชื่อพนักงาน',
    status: 'สถานะ',
    joinedDate: 'วันที่เข้าร่วม',
    actions: 'จัดการ',
    noEmployeesFound: 'ไม่พบพนักงาน',
    admin: 'ผู้ดูแลระบบ',
    manager: 'ผู้จัดการ',
    staff: 'พนักงาน',
    active: 'ใช้งานอยู่',
    inactive: 'ปิดใช้งาน',
    deleteEmployee: 'ลบพนักงาน?',
    areYouSureDelete: 'คุณแน่ใจหรือไม่ว่าต้องการลบ ',
    deleting: 'กำลังลบ...',
    deleteAccount: 'ลบบัญชี',
    cannotDeleteAdmin: 'ไม่สามารถลบผู้ดูแลระบบได้เพื่อเหตุผลด้านความปลอดภัย',
    failedToSave: 'ไม่สามารถบันทึกพนักงานได้ กรุณาลองใหม่',
    failedToDelete: 'ไม่สามารถลบพนักงานได้',
    johnDoe: 'สมชาย มั่นคง',
  }
};

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'admin-1', name: 'Administrator', role: 'admin', status: 'active', created_at: new Date().toISOString() },
  { id: 'mgr-1', name: 'John Manager', role: 'manager', status: 'active', created_at: new Date(Date.now() - 864000000).toISOString() },
  { id: 'staff-1', name: 'Sarah Server', role: 'staff', status: 'active', created_at: new Date(Date.now() - 432000000).toISOString() },
];

export default function EmployeesPage() {
  const { isSupabaseConfigured, addEmployee, deleteEmployee, generalSettings } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newEmployee, setNewEmployee] = useState<{
    name: string;
    role: 'admin' | 'manager' | 'staff';
    status: 'active' | 'inactive';
    pin: string;
  }>({
    name: '',
    role: 'staff',
    status: 'active',
    pin: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEmployees = async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('created_at', { ascending: false });

        if (data) setEmployees(data as Employee[]);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    } else {
      setEmployees(MOCK_EMPLOYEES);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [isSupabaseConfigured]);

  const handleSaveEmployee = async () => {
    if (!newEmployee.name) return;
    setIsLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('employees')
          .update({
            name: newEmployee.name,
            role: newEmployee.role,
            status: newEmployee.status,
            pin: newEmployee.pin || undefined
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        await addEmployee({
          name: newEmployee.name,
          role: newEmployee.role,
          status: newEmployee.status,
          pin: newEmployee.pin || undefined
        });
      }

      setIsDialogOpen(false);
      resetForm();
      setTimeout(fetchEmployees, 500);
    } catch (error) {
      alert(t.failedToSave);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (employee: Employee) => {
    setNewEmployee({
      name: employee.name,
      role: employee.role,
      status: employee.status,
      pin: employee.pin || ''
    });
    setEditingId(employee.id);
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const employeeToDelete = employees.find(emp => emp.id === deleteId);
    if (employeeToDelete?.role === 'admin') {
      alert(t.cannotDeleteAdmin);
      setDeleteId(null);
      return;
    }
    setIsDeleting(true);

    try {
      await deleteEmployee(deleteId);
      setEmployees(employees.filter(emp => emp.id !== deleteId));
    } catch (error) {
      alert(t.failedToDelete);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setNewEmployee({ name: '', role: 'staff', status: 'active', pin: '' });
    setEditingId(null);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return t.admin;
      case 'manager': return t.manager;
      case 'staff': return t.staff;
      default: return role;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t.active;
      case 'inactive': return t.inactive;
      default: return status;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-8 pt-6 bg-zinc-50/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">{t.employees}</h2>
          <p className="text-zinc-500">{t.manageStaff}</p>
        </div>
        <div className="flex flex-col sm:flex-row grow justify-end items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder={t.searchEmployees}
              className="h-11 pl-9 rounded-xl border-zinc-200 bg-white shadow-sm focus:ring-indigo-500 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-12 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-95">
                <Plus className="mr-2 h-4 w-4" /> {t.addEmployee}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{editingId ? t.editEmployee : t.addNewEmployee}</DialogTitle>
                <DialogDescription>
                  {editingId ? t.updateEmployeeDetails : t.createNewProfile}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t.name}</Label>
                  <Input id="name" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} className="h-11 rounded-xl" placeholder={t.johnDoe || 'John Doe'} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">{t.role}</Label>
                  <Select value={newEmployee.role} onValueChange={(v: any) => setNewEmployee({ ...newEmployee, role: v })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t.admin}</SelectItem>
                      <SelectItem value="manager">{t.manager}</SelectItem>
                      <SelectItem value="staff">{t.staff}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pin">{t.pin}</Label>
                  <Input id="pin" type="password" maxLength={6} value={newEmployee.pin} onChange={(e) => setNewEmployee({ ...newEmployee, pin: e.target.value })} className="h-11 rounded-xl" placeholder={t.loginPin} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">{t.cancel}</Button>
                <Button onClick={handleSaveEmployee} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl h-11" disabled={isLoading}>{isLoading ? t.saving : t.saveEmployee}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-0 shadow-xl shadow-zinc-200/50 rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/30">
          <CardTitle className="text-xl font-bold text-zinc-800">{t.staffList}</CardTitle>
          <CardDescription className="text-zinc-500 font-medium">{t.manageAllStaff}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left text-zinc-600 uppercase tracking-wider">
                  <th className="p-4 font-bold text-[10px]">{t.staffName}</th>
                  <th className="p-4 font-bold text-[10px]">{t.role}</th>
                  <th className="p-4 font-bold text-[10px]">{t.status}</th>
                  <th className="p-4 font-bold text-[10px]">{t.joinedDate}</th>
                  <th className="p-4 font-bold text-[10px] text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredEmployees.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-500">{t.noEmployeesFound}</td></tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4 font-bold text-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center"><UserCog className="h-4 w-4 text-zinc-500" /></div>
                          {employee.name}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                          ${employee.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                            employee.role === 'manager' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              'bg-zinc-50 text-zinc-700 border border-zinc-100'}`}>
                          {getRoleLabel(employee.role)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                          ${employee.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                          {getStatusLabel(employee.status)}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-500 font-medium">{format(new Date(employee.created_at), 'MMM dd, yyyy')}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(employee)} className="h-8 w-8 rounded-lg hover:bg-zinc-100"><Edit className="h-4 w-4 text-zinc-500" /></Button>
                          {employee.role !== 'admin' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-600" onClick={() => setDeleteId(employee.id)}><Trash2 className="h-4 w-4" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
          <div className="h-1.5 bg-red-500 w-full" />
          <div className="p-6">
            <AlertDialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4"><AlertTriangle className="h-6 w-6 text-red-500" /></div>
              <AlertDialogTitle className="text-center text-xl font-bold text-red-900">{t.deleteEmployee}</AlertDialogTitle>
              <AlertDialogDescription className="text-center text-zinc-600 pt-2">
                {t.areYouSureDelete} <span className="font-bold text-zinc-900">{employees.find(e => e.id === deleteId)?.name}</span>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex gap-3">
              <AlertDialogCancel disabled={isDeleting} className="flex-1 rounded-xl h-11 border-zinc-200">{t.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} className="flex-1 bg-red-600 hover:bg-red-700 rounded-xl h-11 shadow-lg shadow-red-200" disabled={isDeleting}>{isDeleting ? t.deleting : t.deleteAccount}</AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { supabase, Expense } from '@/lib/supabase';
import { usePosStore } from '@/lib/store';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

const TRANSLATIONS = {
  en: {
    expenses: 'Expenses',
    totalExpenses: 'Total Expenses',
    searchExpenses: 'Search expenses...',
    addExpense: 'Add Expense',
    filter: 'Filter',
    addCategory: 'Add Category',
    manage: 'Manage',
    date: 'Date',
    description: 'Description',
    category: 'Category',
    vendor: 'Vendor',
    method: 'Method',
    amount: 'Amount',
    actions: 'Actions',
    noExpensesFound: 'No expenses found.',
    view: 'View',
    recordsPerPage: 'records per page',
    prev: 'Prev',
    next: 'Next',
    page: 'Page',
    of: 'of',
    addNewExpense: 'Add New Expense',
    recordNewExpense: 'Record a new business expense.',
    descriptionPlaceholder: 'e.g. Monthly Rent',
    amountPlaceholder: '0.00',
    selectCategory: 'Select a category',
    paymentMethod: 'Payment Method',
    selectMethod: 'Select method',
    cash: 'Cash',
    bankTransfer: 'Bank Transfer',
    vendorPlaceholder: 'e.g. Fresh Farms',
    saveExpense: 'Save Expense',
    cancel: 'Cancel',
    editExpense: 'Edit Expense',
    updateExpenseDetails: 'Update expense details.',
    saveChanges: 'Save Changes',
    filterExpenses: 'Filter Expenses',
    filterByCategoryAndDate: 'Filter by category and custom date range.',
    all: 'All',
    fromDate: 'From Date',
    toDate: 'To Date',
    clear: 'Clear',
    apply: 'Apply',
    manageCategories: 'Manage Expense Categories',
    editOrDeleteCategories: 'Edit or delete categories.',
    noCategoriesFound: 'No categories found.',
    categoryName: 'Category Name',
    saveCategory: 'Save Category',
    editCategory: 'Edit Category',
    deleteCategory: 'Delete Category',
    fillAllFields: 'Please fill in all required fields',
    confirmDeleteExpense: 'Delete this expense?',
    enterCategoryName: 'Please enter category name',
    categoryExists: 'Category already exists',
    newCategoryNamePrompt: 'New category name',
    atLeastOneCategory: 'At least one category is required.',
    basedOnFilter: 'Based on current filter',
    totalCashPaid: 'Total paid via cash',
    totalTransferPaid: 'Total paid via transfer',
    createNewCategory: 'Create a new category for expenses.',
  },
  lo: {
    expenses: 'ລາຍຈ່າຍ',
    totalExpenses: 'ລວມລາຍຈ່າຍ',
    searchExpenses: 'ຄົ້ນຫາລາຍຈ່າຍ...',
    addExpense: 'ເພີ່ມລາຍຈ່າຍ',
    filter: 'ກັ່ນຕອງ',
    addCategory: 'ເພີ່ມໝວດໝູ່',
    manage: 'ຈັດການ',
    date: 'ວັນທີ',
    description: 'ລາຍອະທິບາຍ',
    category: 'ໝວດໝູ່',
    vendor: 'ຜູ້ສະໜອງ',
    method: 'ວິທີຊຳລະ',
    amount: 'ຈຳນວນເງິນ',
    actions: 'ຈັດການ',
    noExpensesFound: 'ບໍ່ພົບລາຍຈ່າຍ.',
    view: 'ສະແດງ',
    recordsPerPage: 'ລາຍການຕໍ່ໜ້າ',
    prev: 'ກ່ອນໜ້າ',
    next: 'ຖັດໄປ',
    page: 'ໜ້າ',
    of: 'ຈາກ',
    addNewExpense: 'ເພີ່ມລາຍຈ່າຍໃໝ່',
    recordNewExpense: 'ບັນທຶກລາຍຈ່າຍທຸລະກິດໃໝ່.',
    descriptionPlaceholder: 'ຕົວຢ່າງ: ຄ່າເຊົ່າເດືອນ',
    amountPlaceholder: '0.00',
    selectCategory: 'ເລືອກໝວດໝູ່',
    paymentMethod: 'ວິທີຊຳລະ',
    selectMethod: 'ເລືອກວິທີຊຳລະ',
    cash: 'ເງິນສົດ',
    bankTransfer: 'ໂອນເງິນ',
    vendorPlaceholder: 'ຕົວຢ່າງ: ບໍລິສັດ ສະໜອງ',
    saveExpense: 'ບັນທຶກລາຍຈ່າຍ',
    cancel: 'ຍົກເລີກ',
    editExpense: 'ແກ້ໄຂລາຍຈ່າຍ',
    updateExpenseDetails: 'ປັບປຸງຂໍ້ມູນລາຍຈ່າຍ.',
    saveChanges: 'ບັນທຶກການປ່ຽນແປງ',
    filterExpenses: 'ກັ່ນຕອງລາຍຈ່າຍ',
    filterByCategoryAndDate: 'ກັ່ນຕອງຕາມໝວດໝູ່ ແລະ ຊ່ວງວັນທີ.',
    all: 'ທັງໝົດ',
    fromDate: 'ຈາກວັນທີ',
    toDate: 'ເຖິງວັນທີ',
    clear: 'ລ້າງ',
    apply: 'ນຳໃຊ້',
    manageCategories: 'ຈັດການໝວດໝູ່ລາຍຈ່າຍ',
    editOrDeleteCategories: 'ແກ້ໄຂ ຫຼື ລຶບໝວດໝູ່.',
    noCategoriesFound: 'ບໍ່ພົບໝວດໝູ່.',
    categoryName: 'ຊື່ໝວດໝູ່',
    saveCategory: 'ບັນທຶກໝວດໝູ່',
    editCategory: 'ແກ້ໄຂໝວດໝູ່',
    deleteCategory: 'ລຶບໝວດໝູ່',
    fillAllFields: 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ',
    confirmDeleteExpense: 'ລຶບລາຍຈ່າຍນີ້ບໍ?',
    enterCategoryName: 'ກະລຸນາປ້ອນຊື່ໝວດໝູ່',
    categoryExists: 'ໝວດໝູ່ມີຢູ່ແລ້ວ',
    newCategoryNamePrompt: 'ຊື່ໝວດໝູ່ໃໝ່',
    atLeastOneCategory: 'ຕ້ອງມີຢ່າງໜ້ອຍໜຶ່ງໝວດໝູ່.',
    basedOnFilter: 'ອີງຕາມການກັ່ນຕອງປັດຈຸບັນ',
    totalCashPaid: 'ລວມຈ່າຍດ້ວຍເງິນສົດ',
    totalTransferPaid: 'ລວມຈ່າຍດ້ວຍການໂອນ',
    createNewCategory: 'ສ້າງໝວດໝູ່ໃໝ່ສຳລັບລາຍຈ່າຍ.',
  },
  th: {
    expenses: 'ค่าใช้จ่าย',
    totalExpenses: 'รวมค่าใช้จ่าย',
    searchExpenses: 'ค้นหาค่าใช้จ่าย...',
    addExpense: 'เพิ่มค่าใช้จ่าย',
    filter: 'กรอง',
    addCategory: 'เพิ่มหมวดหมู่',
    manage: 'จัดการ',
    date: 'วันที่',
    description: 'รายละเอียด',
    category: 'หมวดหมู่',
    vendor: 'ผู้จำหน่าย',
    method: 'วิธีชำระเงิน',
    amount: 'จำนวนเงิน',
    actions: 'จัดการ',
    noExpensesFound: 'ไม่พบค่าใช้จ่าย',
    view: 'แสดง',
    recordsPerPage: 'รายการต่อหน้า',
    prev: 'ก่อนหน้า',
    next: 'ถัดไป',
    page: 'หน้า',
    of: 'จาก',
    addNewExpense: 'เพิ่มค่าใช้จ่ายใหม่',
    recordNewExpense: 'บันทึกค่าใช้จ่ายทางธุรกิจใหม่',
    descriptionPlaceholder: 'เช่น ค่าเช่ารายเดือน',
    amountPlaceholder: '0.00',
    selectCategory: 'เลือกหมวดหมู่',
    paymentMethod: 'วิธีชำระเงิน',
    selectMethod: 'เลือกวิธีชำระเงิน',
    cash: 'เงินสด',
    bankTransfer: 'โอนเงิน',
    vendorPlaceholder: 'เช่น ร้านค้าซัพพลายเออร์',
    saveExpense: 'บันทึกค่าใช้จ่าย',
    cancel: 'ยกเลิก',
    editExpense: 'แก้ไขค่าใช้จ่าย',
    updateExpenseDetails: 'อัปเดตรายละเอียดค่าใช้จ่าย',
    saveChanges: 'บันทึกการเปลี่ยนแปลง',
    filterExpenses: 'กรองค่าใช้จ่าย',
    filterByCategoryAndDate: 'กรองตามหมวดหมู่และช่วงวันที่',
    all: 'ทั้งหมด',
    fromDate: 'จากวันที่',
    toDate: 'ถึงวันที่',
    clear: 'ล้างค่า',
    apply: 'นำไปใช้',
    manageCategories: 'จัดการหมวดหมู่ค่าใช้จ่าย',
    editOrDeleteCategories: 'แก้ไขหรือลบหมวดหมู่',
    noCategoriesFound: 'ไม่พบหมวดหมู่',
    categoryName: 'ชื่อหมวดหมู่',
    saveCategory: 'บันทึกหมวดหมู่',
    editCategory: 'แก้ไขหมวดหมู่',
    deleteCategory: 'ลบหมวดหมู่',
    fillAllFields: 'กรุณากรอกข้อมูลให้ครบถ้วน',
    confirmDeleteExpense: 'ลบค่าใช้จ่ายนี้หรือไม่?',
    enterCategoryName: 'กรุณากรอกชื่อหมวดหมู่',
    categoryExists: 'มีหมวดหมู่นี้อยู่แล้ว',
    newCategoryNamePrompt: 'ชื่อหมวดหมู่ใหม่',
    atLeastOneCategory: 'ต้องมีอย่างน้อยหนึ่งหมวดหมู่',
    basedOnFilter: 'อ้างอิงตามการกรองปัจจุบัน',
    totalCashPaid: 'รวมชำระด้วยเงินสด',
    totalTransferPaid: 'รวมชำระด้วยการโอนเงิน',
    createNewCategory: 'สร้างหมวดหมู่ใหม่สำหรับค่าใช้จ่าย',
  }
};
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', description: 'Restock ingredients', amount: 350.00, category: 'Inventory', date: new Date().toISOString(), payment_method: 'Bank Transfer', vendor: 'Fresh Farms', created_at: '' },
  { id: 'e2', description: 'Electricity Bill', amount: 120.50, category: 'Utilities', date: new Date(Date.now() - 86400000).toISOString(), payment_method: 'Card', vendor: 'City Power', created_at: '' },
  { id: 'e3', description: 'Cleaning Supplies', amount: 45.00, category: 'Maintenance', date: new Date(Date.now() - 172800000).toISOString(), payment_method: 'Cash', vendor: 'Clean Co', created_at: '' },
];

export default function ExpensesPage() {
  const { isSupabaseConfigured, addExpense, currencySettings, generalSettings } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];
  const defaultExpenseCategories = ['Inventory', 'Utilities', 'Maintenance', 'Marketing', 'Salary', 'Other'];
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isManageCategoryDialogOpen, setIsManageCategoryDialogOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expenseCategories, setExpenseCategories] = useState<string[]>(defaultExpenseCategories);
  const [expenseCategoryIdsByName, setExpenseCategoryIdsByName] = useState<Record<string, string>>({});
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'Inventory',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    vendor: ''
  });
  const [editExpense, setEditExpense] = useState({
    description: '',
    amount: '',
    category: 'Inventory',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    vendor: ''
  });

  const fetchExpenses = async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .order('date', { ascending: false });

        if (data) setExpenses(data);
      } catch (error) {
        // Error fetching expenses
      }
    } else {
      setExpenses(MOCK_EXPENSES);
    }
  };

  const fetchExpenseCategories = async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) throw error;

        const names = (data || []).map((row: any) => String(row.name || '').trim()).filter(Boolean);
        const byName = (data || []).reduce((acc: Record<string, string>, row: any) => {
          const key = String(row.name || '').trim();
          if (key) acc[key] = String(row.id);
          return acc;
        }, {});

        if (names.length > 0) {
          setExpenseCategories(names);
          setExpenseCategoryIdsByName(byName);
        } else {
          setExpenseCategories(defaultExpenseCategories);
          setExpenseCategoryIdsByName({});
        }
      } catch {
        // Fallback to defaults if expense_categories table is not ready yet.
        setExpenseCategories(defaultExpenseCategories);
        setExpenseCategoryIdsByName({});
      }
    } else {
      setExpenseCategories(defaultExpenseCategories);
      setExpenseCategoryIdsByName({});
    }
  };

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchExpenses(), fetchExpenseCategories()]);
    };
    load();
  }, [isSupabaseConfigured]);

  useEffect(() => {
    const categoriesInExpenses = Array.from(new Set(expenses.map((exp) => String(exp.category || '').trim()).filter(Boolean)));
    if (categoriesInExpenses.length === 0) return;
    setExpenseCategories((prev) => {
      const merged = Array.from(new Set([...prev, ...categoriesInExpenses]));
      return merged;
    });
  }, [expenses]);

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      alert(t.fillAllFields || 'Please fill in all required fields');
      return;
    }

    await addExpense({
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      date: new Date(newExpense.date).toISOString(),
      payment_method: newExpense.payment_method,
      vendor: newExpense.vendor
    });

    setIsAddDialogOpen(false);
    setNewExpense({
      description: '',
      amount: '',
      category: 'Inventory',
      date: new Date().toISOString().split('T')[0],
      payment_method: 'Cash',
      vendor: ''
    });

    // Refresh list
    setTimeout(fetchExpenses, 500);
  };

  const handleOpenEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditExpense({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      payment_method: expense.payment_method || 'Cash',
      vendor: expense.vendor || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleEditExpense = async () => {
    if (!editingExpenseId) return;
    if (!editExpense.description || !editExpense.amount) {
      alert(t.fillAllFields || 'Please fill in all required fields');
      return;
    }

    const payload = {
      description: editExpense.description,
      amount: parseFloat(editExpense.amount),
      category: editExpense.category,
      date: new Date(editExpense.date).toISOString(),
      payment_method: editExpense.payment_method,
      vendor: editExpense.vendor
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', editingExpenseId);

      if (error) {
        alert(error.message || 'Failed to update expense');
        return;
      }
    } else {
      setExpenses((prev) => prev.map((exp) => (
        exp.id === editingExpenseId
          ? { ...exp, ...payload }
          : exp
      )));
    }

    setIsEditDialogOpen(false);
    setEditingExpenseId(null);
    setTimeout(fetchExpenses, 300);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const confirmed = window.confirm(t.confirmDeleteExpense || 'Delete this expense?');
    if (!confirmed) return;

    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) {
        alert(error.message || 'Failed to delete expense');
        return;
      }
    } else {
      setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
    }

    setTimeout(fetchExpenses, 300);
  };

  const handleAddExpenseCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      alert(t.enterCategoryName || 'Please enter category name');
      return;
    }

    const exists = expenseCategories.some((cat) => cat.toLowerCase() === name.toLowerCase());
    if (exists) {
      alert(t.categoryExists || 'Category already exists');
      return;
    }

    const save = async () => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('expense_categories')
          .insert({ name })
          .select('id, name')
          .single();

        if (error) {
          alert(error.message || 'Failed to add category');
          return;
        }

        setExpenseCategories((prev) => [...prev, name]);
        if (data?.id && data?.name) {
          setExpenseCategoryIdsByName((prev) => ({ ...prev, [String(data.name)]: String(data.id) }));
        }
      } else {
        setExpenseCategories((prev) => [...prev, name]);
      }

      setNewExpense((prev) => ({ ...prev, category: name }));
      setEditExpense((prev) => ({ ...prev, category: name }));
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
    };

    save();
  };

  const handleEditExpenseCategory = async (oldCategory: string) => {
    const nextNameRaw = window.prompt(t.newCategoryNamePrompt || 'New category name', oldCategory);
    if (!nextNameRaw) return;
    const newCategory = nextNameRaw.trim();
    if (!newCategory || newCategory.toLowerCase() === oldCategory.toLowerCase()) return;

    const duplicate = expenseCategories.some((cat) => cat.toLowerCase() === newCategory.toLowerCase());
    if (duplicate) {
      alert(t.categoryExists || 'Category already exists');
      return;
    }

    if (isSupabaseConfigured) {
      const categoryId = expenseCategoryIdsByName[oldCategory];
      if (categoryId) {
        const { error: categoryError } = await supabase
          .from('expense_categories')
          .update({ name: newCategory })
          .eq('id', categoryId);

        if (categoryError) {
          alert(categoryError.message || 'Failed to rename category');
          return;
        }
      }

      const { error: expenseError } = await supabase
        .from('expenses')
        .update({ category: newCategory })
        .eq('category', oldCategory);

      if (expenseError) {
        alert(expenseError.message || 'Failed to rename category');
        return;
      }
    } else {
      setExpenses((prev) => prev.map((exp) => (
        exp.category === oldCategory ? { ...exp, category: newCategory } : exp
      )));
    }

    setExpenseCategories((prev) => prev.map((cat) => (cat === oldCategory ? newCategory : cat)));
    setExpenseCategoryIdsByName((prev) => {
      const next = { ...prev };
      const existingId = next[oldCategory];
      delete next[oldCategory];
      if (existingId) next[newCategory] = existingId;
      return next;
    });
    if (newExpense.category === oldCategory) setNewExpense((prev) => ({ ...prev, category: newCategory }));
    if (editExpense.category === oldCategory) setEditExpense((prev) => ({ ...prev, category: newCategory }));
    if (categoryFilter === oldCategory) setCategoryFilter(newCategory);
    setTimeout(() => {
      fetchExpenses();
      fetchExpenseCategories();
    }, 300);
  };

  const handleDeleteExpenseCategory = async (categoryName: string) => {
    if (expenseCategories.length <= 1) {
      alert(t.atLeastOneCategory || 'At least one category is required.');
      return;
    }
    const replacementCategory = categoryName === 'Other'
      ? expenseCategories.find((cat) => cat !== categoryName) || 'Inventory'
      : 'Other';
    const confirmed = window.confirm(
      `Delete category "${categoryName}"? Existing expenses in this category will be moved to "${replacementCategory}".`
    );
    if (!confirmed) return;

    if (isSupabaseConfigured) {
      const { error: expenseError } = await supabase
        .from('expenses')
        .update({ category: replacementCategory })
        .eq('category', categoryName);

      if (expenseError) {
        alert(expenseError.message || 'Failed to delete category');
        return;
      }

      const categoryId = expenseCategoryIdsByName[categoryName];
      if (categoryId) {
        const { error: categoryError } = await supabase
          .from('expense_categories')
          .delete()
          .eq('id', categoryId);
        if (categoryError) {
          alert(categoryError.message || 'Failed to delete category');
          return;
        }
      }
    } else {
      setExpenses((prev) => prev.map((exp) => (
        exp.category === categoryName ? { ...exp, category: replacementCategory } : exp
      )));
    }

    setExpenseCategories((prev) => prev.filter((cat) => cat !== categoryName));
    setExpenseCategoryIdsByName((prev) => {
      const next = { ...prev };
      delete next[categoryName];
      return next;
    });
    if (newExpense.category === categoryName) setNewExpense((prev) => ({ ...prev, category: replacementCategory }));
    if (editExpense.category === categoryName) setEditExpense((prev) => ({ ...prev, category: replacementCategory }));
    if (categoryFilter === categoryName) setCategoryFilter('all');
    setTimeout(() => {
      fetchExpenses();
      fetchExpenseCategories();
    }, 300);
  };

  const activeFilterCount =
    (categoryFilter !== 'all' ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const filteredExpenses = expenses.filter(expense =>
    (expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (categoryFilter === 'all' || expense.category === categoryFilter) &&
    (!dateFrom || new Date(expense.date) >= new Date(`${dateFrom}T00:00:00`)) &&
    (!dateTo || new Date(expense.date) <= new Date(`${dateTo}T23:59:59`))
  );
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedExpenses = filteredExpenses.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalCashExpenses = filteredExpenses
    .filter((exp) => exp.payment_method === 'Cash')
    .reduce((sum, exp) => sum + exp.amount, 0);
  const totalTransferExpenses = filteredExpenses
    .filter((exp) => exp.payment_method === 'Bank Transfer')
    .reduce((sum, exp) => sum + exp.amount, 0);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, dateFrom, dateTo, pageSize]);

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-8 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.expenses}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">{t.totalExpenses}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalExpenses, currencySettings)}</div>
            <p className="text-xs text-blue-600/70 italic">{t.basedOnFilter || 'Based on current filter'}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-900">{t.cash} {t.expenses}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totalCashExpenses, currencySettings)}</div>
            <p className="text-xs text-emerald-600/70 italic">{t.totalCashPaid || 'Total paid via cash'}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/50 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-violet-900">{t.bankTransfer} {t.expenses}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-700">{formatCurrency(totalTransferExpenses, currencySettings)}</div>
            <p className="text-xs text-violet-600/70 italic">{t.totalTransferPaid || 'Total paid via transfer'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder={t.searchExpenses}
                className="pl-9 h-11 rounded-xl border-zinc-200 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 lg:flex gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-xl text-sm font-semibold border-zinc-200 gap-2 shadow-sm"
                onClick={() => setIsFilterDialogOpen(true)}
              >
                <Filter className="h-4 w-4" />
                {t.filter} {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </Button>
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-11 rounded-xl text-sm font-semibold border-zinc-200 gap-2 shadow-sm">
                    <Plus className="h-4 w-4" /> {t.category}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle>{t.addCategory}</DialogTitle>
                    <DialogDescription>{t.createNewCategory || 'Create a new category for expenses.'}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label htmlFor="expense-category-name">{t.categoryName}</Label>
                      <Input
                        id="expense-category-name"
                        placeholder={t.vendorPlaceholder}
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>{t.cancel}</Button>
                    <Button onClick={handleAddExpenseCategory}>{t.saveCategory}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="col-span-2 sm:col-span-1 flex gap-2">
                <Dialog open={isManageCategoryDialogOpen} onOpenChange={setIsManageCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-11 rounded-xl text-sm font-semibold border-zinc-200 shadow-sm">
                      {t.manage}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>{t.manageCategories}</DialogTitle>
                      <DialogDescription>
                        {t.editOrDeleteCategories}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[320px] space-y-2 overflow-auto py-2">
                      {expenseCategories.length === 0 ? (
                        <div className="text-sm text-zinc-500">{t.noCategoriesFound}</div>
                      ) : (
                        expenseCategories.map((category) => (
                          <div key={category} className="flex items-center justify-between rounded-md border border-zinc-200 p-2">
                            <span className="text-sm font-medium">{category}</span>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditExpenseCategory(category)} title={t.editCategory}>
                                <Edit className="h-4 w-4 text-zinc-500" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteExpenseCategory(category)} title={t.deleteCategory}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-11 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 gap-2">
                <Plus className="h-4 w-4" />
                {t.addExpense}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t.addNewExpense}</DialogTitle>
                <DialogDescription>{t.recordNewExpense}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="description">{t.description}</Label>
                  <Input
                    id="description"
                    placeholder={t.descriptionPlaceholder}
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">{t.amount}</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder={t.amountPlaceholder}
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">{t.date}</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">{t.category}</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectCategory} />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="payment_method">{t.paymentMethod}</Label>
                    <Select
                      value={newExpense.payment_method}
                      onValueChange={(value) => setNewExpense({ ...newExpense, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.selectMethod} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">{t.cash}</SelectItem>
                        <SelectItem value="Bank Transfer">{t.bankTransfer}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vendor">{t.vendor}</Label>
                    <Input
                      id="vendor"
                      placeholder={t.vendorPlaceholder}
                      value={newExpense.vendor}
                      onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t.cancel}</Button>
                <Button onClick={handleAddExpense}>{t.saveExpense}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-zinc-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-50 bg-blue-50/20 text-left text-blue-600">
                    <th className="p-4 font-medium whitespace-nowrap">{t.date}</th>
                    <th className="p-4 font-medium whitespace-nowrap">{t.description}</th>
                    <th className="p-4 font-medium whitespace-nowrap">{t.category}</th>
                    <th className="p-4 font-medium whitespace-nowrap">{t.vendor}</th>
                    <th className="p-4 font-medium whitespace-nowrap">{t.method}</th>
                    <th className="p-4 font-medium text-right whitespace-nowrap">{t.amount}</th>
                    <th className="p-4 font-medium text-right whitespace-nowrap">{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-500">
                        {t.noExpensesFound}
                      </td>
                    </tr>
                  ) : (
                    paginatedExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                        <td className="p-4 text-zinc-500 whitespace-nowrap">
                          {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="p-4 font-medium">{expense.description}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
                            {expense.category}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-600">{expense.vendor || '-'}</td>
                        <td className="p-4 text-zinc-600">{expense.payment_method || '-'}</td>
                        <td className="p-4 font-medium text-right whitespace-nowrap">{formatCurrency(expense.amount, currencySettings)}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditExpense(expense)}>
                              <Edit className="h-4 w-4 text-zinc-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200">
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <span>{t.view}</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="hidden sm:inline">{t.recordsPerPage}</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-lg"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                >
                  {t.prev}
                </Button>
                <span className="text-sm font-medium text-zinc-700">
                  {t.page} {safeCurrentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-lg"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                >
                  {t.next}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.editExpense}</DialogTitle>
            <DialogDescription>{t.updateExpenseDetails}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-description">{t.description}</Label>
              <Input
                id="edit-description"
                placeholder={t.descriptionPlaceholder}
                value={editExpense.description}
                onChange={(e) => setEditExpense({ ...editExpense, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-amount">{t.amount}</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  placeholder={t.amountPlaceholder}
                  value={editExpense.amount}
                  onChange={(e) => setEditExpense({ ...editExpense, amount: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-date">{t.date}</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editExpense.date}
                  onChange={(e) => setEditExpense({ ...editExpense, date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">{t.category}</Label>
              <Select
                value={editExpense.category}
                onValueChange={(value) => setEditExpense({ ...editExpense, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-payment_method">{t.paymentMethod}</Label>
                <Select
                  value={editExpense.payment_method}
                  onValueChange={(value) => setEditExpense({ ...editExpense, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectMethod} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">{t.cash}</SelectItem>
                    <SelectItem value="Bank Transfer">{t.bankTransfer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-vendor">{t.vendor}</Label>
                <Input
                  id="edit-vendor"
                  placeholder={t.vendorPlaceholder}
                  value={editExpense.vendor}
                  onChange={(e) => setEditExpense({ ...editExpense, vendor: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleEditExpense}>{t.saveChanges}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.filterExpenses}</DialogTitle>
            <DialogDescription>
              {t.filterByCategoryAndDate}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t.category}</Label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">{t.all}</option>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t.fromDate}</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{t.toDate}</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setCategoryFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                {t.clear}
              </Button>
              <Button onClick={() => setIsFilterDialogOpen(false)}>{t.apply}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

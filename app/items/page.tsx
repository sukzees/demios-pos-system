'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, History, ChefHat, Package, Info } from 'lucide-react';
import { usePosStore } from '@/lib/store';
import { Item, Category, Recipe, supabase } from '@/lib/supabase';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currency';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const isMissingColumnInSchemaCache = (error: unknown, table: string, column: string): boolean => {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  const col = column.toLowerCase();
  const tbl = table.toLowerCase();
  return (
    (message.includes('schema cache') && message.includes(tbl) && message.includes(col)) ||
    (message.includes(col) && (message.includes('does not exist') || message.includes('could not find')))
  );
};

type PortionStockRow = {
  item_id?: string | null;
  recipe_id?: string | null;
  inventory_item_id?: string | null;
  portion_stock?: number | null;
};

const fetchItemPortionStockRows = async (): Promise<PortionStockRow[]> => {
  const full = await supabase
    .from('item_portions')
    .select('item_id, recipe_id, inventory_item_id, portion_stock');

  if (!full.error) return full.data || [];

  if (isMissingColumnInSchemaCache(full.error, 'item_portions', 'inventory_item_id')) {
    const retry = await supabase
      .from('item_portions')
      .select('item_id, recipe_id, portion_stock');
    if (retry.error) throw retry.error;
    return (retry.data || []).map((row: PortionStockRow) => ({
      ...row,
      inventory_item_id: null,
    }));
  }

  throw full.error;
};

type MenuPortionRow = { name: string; price: string; stock: string; costPrice: string };

const mapPortionRowsFromDb = (data: any[]): MenuPortionRow[] =>
  data.map((p) => ({
    name: String(p.portion_name || ''),
    price: String(p.portion_price ?? ''),
    costPrice: String(p.portion_cost_price ?? 0),
    stock: String(p.portion_stock ?? 0),
  }));

/** Load all portions for a Linked Inventory Item (same fallbacks as Inventory page). */
const fetchPortionsForLinkedInventoryItem = async (inventoryItemId: string): Promise<MenuPortionRow[]> => {
  if (!inventoryItemId) return [];

  const queryByInventoryId = async (includeCostPrice: boolean) => {
    const columns = includeCostPrice
      ? 'portion_name, portion_price, portion_cost_price, portion_stock'
      : 'portion_name, portion_price, portion_stock';

    return supabase
      .from('item_portions')
      .select(columns)
      .eq('inventory_item_id', inventoryItemId)
      .order('created_at', { ascending: true });
  };

  const queryByLegacyItemId = async (includeCostPrice: boolean) => {
    const columns = includeCostPrice
      ? 'portion_name, portion_price, portion_cost_price, portion_stock'
      : 'portion_name, portion_price, portion_stock';

    return supabase
      .from('item_portions')
      .select(columns)
      .eq('item_id', inventoryItemId)
      .order('created_at', { ascending: true });
  };

  let result = await queryByInventoryId(true);

  if (!result.error && result.data && result.data.length > 0) {
    return mapPortionRowsFromDb(result.data);
  }

  if (result.error && isMissingColumnInSchemaCache(result.error, 'item_portions', 'portion_cost_price')) {
    result = await queryByInventoryId(false);
    if (!result.error && result.data && result.data.length > 0) {
      return mapPortionRowsFromDb(result.data);
    }
  }

  if (result.error && isMissingColumnInSchemaCache(result.error, 'item_portions', 'inventory_item_id')) {
    result = await queryByLegacyItemId(true);
    if (!result.error && result.data && result.data.length > 0) {
      return mapPortionRowsFromDb(result.data);
    }
    if (result.error && isMissingColumnInSchemaCache(result.error, 'item_portions', 'portion_cost_price')) {
      result = await queryByLegacyItemId(false);
      if (!result.error && result.data && result.data.length > 0) {
        return mapPortionRowsFromDb(result.data);
      }
    }
  } else if (!result.error && (!result.data || result.data.length === 0)) {
    // Legacy rows may still use item_id = inventory item id
    const legacy = await queryByLegacyItemId(true);
    if (!legacy.error && legacy.data && legacy.data.length > 0) {
      return mapPortionRowsFromDb(legacy.data);
    }
    if (legacy.error && isMissingColumnInSchemaCache(legacy.error, 'item_portions', 'portion_cost_price')) {
      const legacyRetry = await queryByLegacyItemId(false);
      if (!legacyRetry.error && legacyRetry.data && legacyRetry.data.length > 0) {
        return mapPortionRowsFromDb(legacyRetry.data);
      }
    }
  }

  if (result.error) throw result.error;
  return [];
};

const emptyPortionRow = (): MenuPortionRow => ({ name: '', price: '', stock: '0', costPrice: '0' });

const TRANSLATIONS = {
  en: {
    itemsAndCategories: 'Items & Categories',
    manageMenu: 'Manage your menu, recipes, and categories',
    searchItems: 'Search items...',
    addItem: 'Add Item',
    editItem: 'Edit Item',
    addNewItem: 'Add New Item',
    createRecipe: 'Create a new recipe item or set up portions.',
    updateDetails: 'Update details and portions.',
    itemName: 'Item Name *',
    sellingPrice: 'Selling Price *',
    category: 'Category *',
    hasPortions: 'Has Portions',
    portionsFromInventory: 'Portions are managed in Inventory — edit selling price only',
    noInventoryPortions: 'No portions on this inventory item. Add portions in Inventory first.',
    hasIngredients: 'Has Ingredients',
    recipeIngredients: 'Recipe Ingredients',
    portionName: 'Portion Name',
    portionPrice: 'Price',
    portionStock: 'Stock',
    addPortion: 'Add Portion',
    add: 'Add',
    selectIngredient: 'Select ingredient',
    cancel: 'Cancel',
    saveItem: 'Save Item',
    items: 'Items',
    categories: 'Categories',
    menuItems: 'Menu items',
    manageProducts: 'Manage your products and recipes',
    allCategories: 'All Categories',
    name: 'Name',
    price: 'Price',
    stock: 'Stock',
    actions: 'Actions',
    noItemsFound: 'No items found.',
    manageCategories: 'Manage categories',
    addCategory: 'Add Category',
    newCategory: 'New Category',
    categoryName: 'Category Name',
    enterCategoryName: 'Enter category name...',
    save: 'Save',
    editCategory: 'Edit Category',
    updateCategoryName: 'Update category name.',
    deleteCategory: 'Delete Category',
    deleteCategoryConfirm: 'Are you sure you want to delete this category?',
    deleteItem: 'Delete Item',
    deleteItemConfirm: 'Are you sure you want to delete this item?',
    ingredient: 'Ingredient',
    standalone: 'Standalone',
    saleOnly: 'Sale only',
    recipe: 'Recipe',
    ingredientsType: 'Ingredients',
    linkInventoryItem: 'Linked Inventory Item',
    selectStandaloneInventory: 'Select standalone inventory item',
    noStandaloneInventoryItems: 'No standalone inventory items found. Create one in Inventory first.',
    standaloneLinkHelp: 'Standalone menu items use the selected Inventory item directly, so checkout deducts stock from that item.',
    selectCategory: 'Select a category',
    fillAllFields: 'Please fill in all required fields',
    addPortionError: 'Please add at least one valid portion with name and price.',
    standaloneWarning: 'Standalone items must be created from Inventory. Add it in Inventory first, then it will appear in Items & POS automatically.',
    errorAdding: 'Error adding item',
    errorEditing: 'Error editing item',
    errorDeleting: 'Error deleting item',
    itemsCount: 'items',
    type: 'Type',
    inStock: 'IN STOCK',
    show: 'Show',
    prev: 'Prev',
    page: 'Page',
    next: 'Next',
    organizeCategories: 'Organize your menu structure',
    menuItem: 'Menu Item',
    saveChanges: 'Save Changes',
    // Smart Filter translations
    filterType: 'Filter by Type',
    filterStock: 'Filter by Stock',
    filterCategory: 'Filter by Category',
    allTypes: 'All Types',
    allStock: 'All Stock',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    resetFilters: 'Reset Filters',
    showingResults: 'Showing',
    of: 'of',
    results: 'results',
  },
  lo: {
    itemsAndCategories: 'ລາຍການ ແລະ ໝວດໝູ່',
    manageMenu: 'ຈັດການເມນູ, ສູດອາຫານ ແລະ ໝວດໝູ່ຂອງທ່ານ',
    searchItems: 'ຄົ້ນຫາລາຍການ...',
    addItem: 'ເພີ່ມລາຍການ',
    editItem: 'ແກ້ໄຂລາຍການ',
    addNewItem: 'ເພີ່ມລາຍການໃໝ່',
    createRecipe: 'ສ້າງລາຍການສູດອາຫານໃໝ່ ຫຼື ຕັ້ງຄ່າຍ່ອຍ.',
    updateDetails: 'ອັບເດດລາຍລະອຽດ ແລະ ສ່ວນຍ່ອຍ.',
    itemName: 'ຊື່ລາຍການ *',
    sellingPrice: 'ລາຄາຂາຍ *',
    category: 'ໝວດໝູ່',
    hasPortions: 'ມີສ່ວນຍ່ອຍ',
    portionsFromInventory: 'ຈັດການສ່ວນຍ່ອຍໃນ Inventory — ແກ້ໄຂໄດ້ເຉພາະລາຄາຂາຍ',
    noInventoryPortions: 'ບໍ່ມີສ່ວນຍ່ອຍໃນສິນຄ້ານີ້ — ເພີ່ມໃນ Inventory ກ່ອນ',
    hasIngredients: 'ມີສ່ວນປະກອບ',
    recipeIngredients: 'ສ່ວນປະກອບຂອງສູດ',
    portionName: 'ຊື່ສ່ວນຍ່ອຍ',
    portionPrice: 'ລາຄາ',
    portionStock: 'ສະຕັອກ',
    addPortion: 'ເພີ່ມສ່ວນຍ່ອຍ',
    add: 'ເພີ່ມ',
    selectIngredient: 'ເລືອກສ່ວນປະກອບ',
    cancel: 'ຍົກເລີກ',
    saveItem: 'ບັນທຶກລາຍການ',
    items: 'ລາຍການ',
    categories: 'ໝວດໝູ່',
    menuItems: 'ລາຍການເມນູ',
    manageProducts: 'ຈັດການຜະລິດຕະພັນ ແລະ ສູດອາຫານຂອງທ່ານ',
    allCategories: 'ທຸກໝວດໝູ່',
    name: 'ຊື່',
    price: 'ລາຄາ',
    stock: 'ສະຕັອກ',
    actions: 'ຈັດການ',
    noItemsFound: 'ບໍ່ພົບລາຍການ.',
    manageCategories: 'ຈັດການໝວດໝູ່',
    addCategory: 'ເພີ່ມໝວດໝູ່',
    newCategory: 'ໝວດໝູ່ໃໝ່',
    categoryName: 'ຊື່ໝວດໝູ່',
    enterCategoryName: 'ປ້ອນຊື່ໝວດໝູ່...',
    save: 'ບັນທຶກ',
    editCategory: 'ແກ້ໄຂໝວດໝູ່',
    updateCategoryName: 'ອັບເດດຊື່ໝວດໝູ່.',
    deleteCategory: 'ລົບໝວດໝູ່',
    deleteCategoryConfirm: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບໝວດໝູ່ໃໝ່?',
    deleteItem: 'ລົບລາຍການ',
    deleteItemConfirm: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລາຍການນີ້?',
    ingredient: 'ສ່ວນປະກອບ',
    standalone: 'ສິນຄ້າທົ່ວໄປ',
    saleOnly: 'Sale only',
    recipe: 'ສູດອາຫານ',
    ingredientsType: 'Ingredients',
    linkInventoryItem: 'Linked Inventory Item',
    selectStandaloneInventory: 'Select standalone inventory item',
    noStandaloneInventoryItems: 'No standalone inventory items found. Create one in Inventory first.',
    standaloneLinkHelp: 'Standalone menu items use the selected Inventory item directly, so checkout deducts stock from that item.',
    selectCategory: 'ເລືອກໝວດໝູ່',
    fillAllFields: 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ',
    addPortionError: 'ກະລຸນາເພີ່ມສ່ວນຍ່ອຍຢ່າງໜ້ອຍໜຶ່ງສ່ວນ ທີ່ມີຊື່ ແລະ ລາຄາ.',
    standaloneWarning: 'ສິນຄ້າທົ່ວໄປຕ້ອງສ້າງຈາກຄັງສິນຄ້າ. ເພີ່ມໃນຄັງສິນຄ້າກ່ອນ, ແລ້ວມັນຈະສະແດງໃນລາຍການ ແລະ POS ໂດຍອັດຕະໂນມັດ.',
    errorAdding: 'ເກີດຂໍ້ຜິດພາດໃນການເພີ່ມລາຍການ',
    errorEditing: 'ເກີດຂໍ້ຜິດພາດໃນການແກ້ໄຂລາຍການ',
    errorDeleting: 'ເກີດຂໍ້ຜິດພາດໃນການລົບລາຍການ',
    itemsCount: 'ລາຍການ',
    type: 'ປະເພດ',
    inStock: 'ມີໃນສະຕັອກ',
    show: 'ສະແດງ',
    prev: 'ກ່ອນໜ້າ',
    page: 'ໜ້າ',
    next: 'ຖັດໄປ',
    organizeCategories: 'ຈັດລະບຽບໂຄງສ້າງເມນູຂອງທ່ານ',
    menuItem: 'ລາຍການເມນູ',
    saveChanges: 'ບັນທຶກການປ່ຽນແປງ',
    // Smart Filter translations
    filterType: 'ກອງຕາມປະເພດ',
    filterStock: 'ກອງຕາມສະຕັອກ',
    filterCategory: 'ກອງຕາມໝວດໝູ່',
    allTypes: 'ທຸກປະເພດ',
    allStock: 'ທຸກສະຕັອກ',
    lowStock: 'ສະຕັອກຕ່ຳ',
    outOfStock: 'ໝົດສະຕັອກ',
    resetFilters: 'ລ້າງຕົວກອງ',
    showingResults: 'ສະແດງ',
    of: 'ຈາກ',
    results: 'ລາຍການ',
  },
  th: {
    itemsAndCategories: 'รายการและหมวดหมู่',
    manageMenu: 'จัดการเมนู สูตรอาหาร และหมวดหมู่ของคุณ',
    searchItems: 'ค้นหารายการ...',
    addItem: 'เพิ่มรายการ',
    editItem: 'แก้ไขรายการ',
    addNewItem: 'เพิ่มรายการใหม่',
    createRecipe: 'สร้างรายการสูตรอาหารใหม่หรือตั้งค่าส่วนย่อย',
    updateDetails: 'อัปเดตรายละเอียดและส่วนย่อย',
    itemName: 'ชื่อรายการ *',
    sellingPrice: 'ราคาขาย *',
    category: 'หมวดหมู่ *',
    hasPortions: 'มีส่วนย่อย',
    portionsFromInventory: 'จัดการส่วนย่อยในหน้า Inventory — แก้ไขได้เฉพาะราคาขาย',
    noInventoryPortions: 'สินค้านี้ยังไม่มีส่วนย่อย — ไปเพิ่มในหน้า Inventory ก่อน',
    hasIngredients: 'มีส่วนประกอบ',
    recipeIngredients: 'ส่วนประกอบของสูตร',
    portionName: 'ชื่อส่วนย่อย',
    portionPrice: 'ราคา',
    portionStock: 'สต็อก',
    addPortion: 'เพิ่มส่วนย่อย',
    add: 'เพิ่ม',
    selectIngredient: 'เลือกส่วนประกอบ',
    cancel: 'ยกเลิก',
    saveItem: 'บันทึกรายการ',
    items: 'รายการ',
    categories: 'หมวดหมู่',
    menuItems: 'รายการเมนู',
    manageProducts: 'จัดการผลิตภัณฑ์และสูตรอาหารของคุณ',
    allCategories: 'ทุกหมวดหมู่',
    name: 'ชื่อ',
    price: 'ราคา',
    stock: 'สต็อก',
    actions: 'จัดการ',
    noItemsFound: 'ไม่พบรายการ',
    manageCategories: 'จัดการหมวดหมู่',
    addCategory: 'เพิ่มหมวดหมู่',
    newCategory: 'หมวดหมู่ใหม่',
    categoryName: 'ชื่อหมวดหมู่',
    enterCategoryName: 'กรอกชื่อหมวดหมู่...',
    save: 'บันทึก',
    editCategory: 'แก้ไขหมวดหมู่',
    updateCategoryName: 'อัปเดตชื่อหมวดหมู่',
    deleteCategory: 'ลบหมวดหมู่',
    deleteCategoryConfirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?',
    deleteItem: 'ลบรายการ',
    deleteItemConfirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?',
    ingredient: 'ส่วนประกอบ',
    standalone: 'สินค้าทั่วไป',
    saleOnly: 'Sale only',
    recipe: 'สูตรอาหาร',
    ingredientsType: 'Ingredients',
    linkInventoryItem: 'Linked Inventory Item',
    selectStandaloneInventory: 'Select standalone inventory item',
    noStandaloneInventoryItems: 'No standalone inventory items found. Create one in Inventory first.',
    standaloneLinkHelp: 'Standalone menu items use the selected Inventory item directly, so checkout deducts stock from that item.',
    selectCategory: 'เลือกหมวดหมู่',
    fillAllFields: 'กรุณากรอกข้อมูลให้ครบทุกช่อง',
    addPortionError: 'กรุณาเพิ่มส่วนย่อยอย่างน้อยหนึ่งส่วนที่มีชื่อและราคา',
    standaloneWarning: 'สินค้าทั่วไปต้องสร้างจากคลังสินค้า เพิ่มในคลังสินค้าก่อน แล้วจะแสดงในรายการและ POS โดยอัตโนมัติ',
    errorAdding: 'เกิดข้อผิดพลาดในการเพิ่มรายการ',
    errorEditing: 'เกิดข้อผิดพลาดในการแก้ไขรายการ',
    errorDeleting: 'เกิดข้อผิดพลาดในการลบรายการ',
    itemsCount: 'รายการ',
    type: 'ประเภท',
    inStock: 'มีในสต็อก',
    show: 'แสดง',
    prev: 'ก่อนหน้า',
    page: 'หน้า',
    next: 'ถัดไป',
    organizeCategories: 'จัดการโครงสร้างเมนูของคุณ',
    menuItem: 'รายการเมนู',
    saveChanges: 'บันทึกการเปลี่ยนแปลง',
    // Smart Filter translations
    filterType: 'กรองตามประเภท',
    filterStock: 'กรองตามสต็อก',
    filterCategory: 'กรองตามหมวดหมู่',
    allTypes: 'ทุกประเภท',
    allStock: 'ทุกสต็อก',
    lowStock: 'สต็อกต่ำ',
    outOfStock: 'หมดสต็อก',
    resetFilters: 'ล้างตัวกรอง',
    showingResults: 'แสดง',
    of: 'จาก',
    results: 'รายการ',
  }
};

const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Burgers', created_at: '' },
  { id: 'c2', name: 'Drinks', created_at: '' },
  { id: 'c3', name: 'Sides', created_at: '' },
];

// MOCK_ITEMS - use any[] type since these include stock (for offline mode)
const MOCK_ITEMS: any[] = [
  { id: 'i1', name: 'Classic Burger', price: 8.99, category_id: 'c1', stock: 50, created_at: '' },
  { id: 'i2', name: 'Cheese Burger', price: 9.99, category_id: 'c1', stock: 45, created_at: '' },
  { id: 'i3', name: 'Double Burger', price: 12.99, category_id: 'c1', stock: 30, created_at: '' },
  { id: 'i4', name: 'Cola', price: 2.50, category_id: 'c2', stock: 100, created_at: '' },
  { id: 'i5', name: 'Lemonade', price: 3.00, category_id: 'c2', stock: 80, created_at: '' },
  { id: 'i6', name: 'Fries', price: 3.99, category_id: 'c3', stock: 60, created_at: '' },
  { id: 'i7', name: 'Onion Rings', price: 4.99, category_id: 'c3', stock: 25, created_at: '' },
];

export default function ItemsPage() {
  const { isSupabaseConfigured, items, categories, fetchItemsAndCategories, addCategory, editCategory, deleteCategory, editItem, deleteItem, currencySettings, generalSettings } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Smart Filter States
  const [filterType, setFilterType] = useState<'all' | 'standalone' | 'recipe' | 'saleOnly'>('all');
  const [filterStock, setFilterStock] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeStocks, setRecipeStocks] = useState<{ [key: string]: number }>({});
  const [recipeHasIngredients, setRecipeHasIngredients] = useState<{ [key: string]: boolean }>({});
  const [portionStockByProduct, setPortionStockByProduct] = useState<Record<string, number>>({});
  /** Standalone rows from inventory_items — refreshed in real-time for Linked Inventory Item dropdown */
  const [inventoryStandaloneItems, setInventoryStandaloneItems] = useState<Array<Record<string, unknown>>>([]);

  // Search state for Linked Inventory Item dropdown
  const [inventoryItemSearch, setInventoryItemSearch] = useState('');
  const [editInventoryItemSearch, setEditInventoryItemSearch] = useState('');

  // Add Item Form State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  // stock removed - managed in inventory_items table
  const [newItemType, setNewItemType] = useState<'standalone' | 'recipe' | 'saleOnly'>('saleOnly');
  const [selectedStandaloneInventoryItemId, setSelectedStandaloneInventoryItemId] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemMinStock, setNewItemMinStock] = useState('0');
  const [showLinkedItems, setShowLinkedItems] = useState(false);
  const [recipeIngredients, setRecipeIngredients] = useState<{ ingredient_id: string; quantity_needed: number; unit: string }[]>([]);
  const [hasPortions, setHasPortions] = useState(false);
  const [portionRows, setPortionRows] = useState<{ name: string; price: string; stock: string; costPrice: string }[]>([{ name: '', price: '', stock: '0', costPrice: '0' }]);

  // Edit Item Form State
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemCategory, setEditItemCategory] = useState('');
  // stock removed - managed in inventory_items table
  const [editStandaloneInventoryItemId, setEditStandaloneInventoryItemId] = useState('');
  const [editItemType, setEditItemType] = useState<'standalone' | 'recipe' | 'saleOnly'>('standalone');
  const [editRecipeIngredients, setEditRecipeIngredients] = useState<{ ingredient_id: string; quantity_needed: number; unit: string }[]>([]);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [editHasPortions, setEditHasPortions] = useState(false);
  const [editHasIngredients, setEditHasIngredients] = useState(false);
  const [editPortionRows, setEditPortionRows] = useState<{ name: string; price: string; stock: string; costPrice: string }[]>([{ name: '', price: '', stock: '0', costPrice: '0' }]);

  // Add Category Form State
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Edit Category State
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const linkedSelectionRef = useRef({
    addOpen: false,
    addInventoryId: '',
    editOpen: false,
    editInventoryId: '',
  });
  const loadLinkedInventoryPortionsRef = useRef<(inventoryItemId: string, target: 'add' | 'edit') => Promise<void>>(async () => {});

  const fetchLinkedInventoryCatalog = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setInventoryStandaloneItems([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('type', 'standalone')
        .order('name', { ascending: true });

      if (error) throw error;
      setInventoryStandaloneItems(data || []);
    } catch (error) {
      console.warn('Could not load linked inventory catalog:', error instanceof Error ? error.message : error);
    }
  }, [isSupabaseConfigured]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchItemsAndCategories();
      fetchRecipes();
      fetchPortionStocks();
      void fetchLinkedInventoryCatalog();
    }
  }, [isSupabaseConfigured, fetchItemsAndCategories, fetchLinkedInventoryCatalog]);

  useEffect(() => {
    linkedSelectionRef.current = {
      addOpen: isAddItemOpen && newItemType === 'standalone',
      addInventoryId: selectedStandaloneInventoryItemId,
      editOpen: isEditItemOpen && editItemType === 'standalone',
      editInventoryId: editStandaloneInventoryItemId,
    };
  }, [
    isAddItemOpen,
    newItemType,
    selectedStandaloneInventoryItemId,
    isEditItemOpen,
    editItemType,
    editStandaloneInventoryItemId,
  ]);

  useEffect(() => {
    if (isSupabaseConfigured && items.length > 0) {
      fetchPortionStocks();
    }
  }, [isSupabaseConfigured, items.length]);

  // Auto-sync: Every 1 minute, calculate total portion stock and sync to inventory_items
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const syncPortionStockToInventory = async () => {
      try {
        const rows = await fetchItemPortionStockRows();
        if (rows.length === 0) return;

        const stockByInventoryItem: Record<string, number> = {};
        for (const portion of rows) {
          const invId = portion.inventory_item_id;
          if (invId) {
            stockByInventoryItem[invId] = (stockByInventoryItem[invId] || 0) + Number(portion.portion_stock || 0);
          }
        }

        if (Object.keys(stockByInventoryItem).length === 0) return;

        for (const [inventoryItemId, totalStock] of Object.entries(stockByInventoryItem)) {
          await supabase
            .from('inventory_items')
            .update({ stock: totalStock })
            .eq('id', inventoryItemId);
        }
      } catch (error) {
        console.warn('[AUTO-SYNC] Could not sync portion stocks:', error instanceof Error ? error.message : error);
      }
    };

    // Run immediately on mount
    syncPortionStockToInventory();

    // Set up interval to run every 1 minute (60000ms)
    const intervalId = setInterval(syncPortionStockToInventory, 60000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [isSupabaseConfigured]);

  useEffect(() => {
    if (recipes.length > 0 && items.length > 0) {
      calculateAllRecipeStocks();
    }
  }, [recipes, items]);

  // Reload portions from Linked Inventory Item when selection changes in edit modal
  useEffect(() => {
    if (isEditItemOpen && editItemType === 'standalone' && editStandaloneInventoryItemId) {
      void loadLinkedInventoryPortions(editStandaloneInventoryItemId, 'edit');
    }
  }, [editStandaloneInventoryItemId, editItemType, isEditItemOpen]);

  const fetchRecipes = async () => {
    try {
      // Fetch recipes with their ingredients in one query
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (recipesError) {
        console.error('Error fetching recipes:', recipesError);
        return;
      }

      if (recipesData) {
        setRecipes(recipesData);
        
        // Fetch all recipe ingredients at once
        const { data: allIngredients, error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .select('recipe_id');
        
        if (ingredientsError) {
          console.error('Error fetching recipe ingredients:', ingredientsError);
        }
        
        // Create a map of which recipes have ingredients
        const hasIngredientsMap: { [key: string]: boolean } = {};
        if (allIngredients) {
          // Count ingredients per recipe
          const ingredientCounts: { [key: string]: number } = {};
          allIngredients.forEach(ing => {
            ingredientCounts[ing.recipe_id] = (ingredientCounts[ing.recipe_id] || 0) + 1;
          });
          
          // Mark recipes that have at least one ingredient
          recipesData.forEach(recipe => {
            hasIngredientsMap[recipe.id] = (ingredientCounts[recipe.id] || 0) > 0;
          });
        }
        
        console.log('Recipe has ingredients map:', hasIngredientsMap);
        setRecipeHasIngredients(hasIngredientsMap);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const handleAddItem = async () => {
    if (isSavingRef.current) return; // Prevent double submit
    if (!newItemCategory || ((newItemType === 'recipe' || newItemType === 'saleOnly') && !newItemName.trim()) || (newItemType === 'recipe' && !hasPortions && !newItemPrice) || (newItemType === 'saleOnly' && !newItemPrice) || (newItemType === 'standalone' && !hasPortions && !newItemPrice && !selectedStandaloneInventoryItemId)) {
      alert(t.fillAllFields);
      return;
    }

    let createdRecord: { table: 'items' | 'recipes'; id: string } | null = null;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const validPortions = hasPortions
        ? portionRows.filter((row) => row.name.trim() && (parseFloat(row.price) || 0) > 0)
        : [];

      if (hasPortions && validPortions.length === 0) {
        alert(t.addPortionError);
        return;
      }

      if (newItemType === 'standalone') {
        const selectedInventoryItem = getStandaloneInventoryItems(showLinkedItems).find(
          (item) => String(item.id) === selectedStandaloneInventoryItemId
        );
        if (!selectedInventoryItem) {
          alert(t.selectStandaloneInventory);
          return;
        }

        const priceToSave = hasPortions ? parseFloat(validPortions[0].price) : parseFloat(newItemPrice || String(selectedInventoryItem.price || 0));
        
        // Create record in items table to show in menu, linked to inventory_item
        // Stock is managed in inventory_items table, not in items table
        const { data: newItem, error: itemError } = await supabase
          .from('items')
          .insert({
            name: newItemName.trim() || String(selectedInventoryItem.name || ''),
            price: priceToSave,
            category_id: newItemCategory,
            inventory_item_id: String(selectedInventoryItem.id),
            type: 'standalone',
            show_in_menu: true,
            is_recipe: false
          })
          .select()
          .single();
        
        if (itemError) throw itemError;
        
        if (newItem) {
          createdRecord = { table: 'items', id: newItem.id };
          if (hasPortions && validPortions.length > 0) {
            await syncStandalonePortions(String(selectedInventoryItem.id), validPortions);
          }
        }
      } else if (newItemType === 'saleOnly') {
        const basePrice = hasPortions ? parseFloat(validPortions[0].price) : parseFloat(newItemPrice);

        // Sale Only items should be saved in items table, not recipes table
        const { data, error } = await supabase
          .from('items')
          .insert({
            name: newItemName.trim(),
            price: basePrice,
            category_id: newItemCategory,
            type: 'saleonly',
            is_recipe: false, // Sale only items have is_recipe = false
            show_in_menu: true
          })
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('Sale-only item was not created');
        createdRecord = { table: 'items', id: data.id };
        
        // Save portions if any
        if (hasPortions && validPortions.length > 0) {
          const { error: portionError } = await supabase
            .from('item_portions')
            .insert(
              validPortions.map((portion) => ({
                item_id: data.id,
                portion_name: portion.name.trim(),
                portion_price: parseFloat(portion.price),
                portion_cost_price: parseFloat(portion.costPrice) || 0,
                portion_stock: parseInt(portion.stock) || 0
              }))
            );
          if (portionError) throw portionError;
        }
      } else if (newItemType === 'recipe') {
        if (!newItemName.trim()) {
          alert(t.fillAllFields);
          return;
        }
        const basePrice = hasPortions ? parseFloat(validPortions[0].price) : parseFloat(newItemPrice);

        const { data, error } = await supabase
          .from('recipes')
          .insert({
            name: newItemName,
            category_id: newItemCategory,
            price: basePrice,
            is_recipe: true
          })
          .select()
          .single();

        if (error) throw error;
        if (data && data.id) {
          createdRecord = { table: 'recipes', id: data.id };
          const ingredientsToInsert = buildRecipeIngredientsToInsert(data.id, recipeIngredients);
          
          if (ingredientsToInsert.length > 0) {
            const { error: ingError } = await supabase
              .from('recipe_ingredients')
              .insert(ingredientsToInsert);
            
            if (ingError) throw ingError;
          }

          if (hasPortions && validPortions.length > 0) {
            const { error: portionError } = await supabase
              .from('item_portions')
              .insert(
                validPortions.map((portion) => ({
                  recipe_id: data.id,
                  portion_name: portion.name.trim(),
                  portion_price: parseFloat(portion.price),
                  portion_cost_price: parseFloat(portion.costPrice) || 0,
                  portion_stock: parseInt(portion.stock) || 0
                }))
              );
            
            if (portionError) throw portionError;
          }
        }
      } else {
        alert(t.fillAllFields);
        return;
      }

      setNewItemName('');
      setNewItemPrice('');
      setNewItemCategory('');
      // stock removed - managed in inventory_items
      setNewItemType('standalone');
      setSelectedStandaloneInventoryItemId('');
      setInventoryItemSearch('');
      setNewItemDescription('');
      setNewItemUnit('pcs');
      setNewItemMinStock('0');
      setRecipeIngredients([]);
      setHasPortions(false);
      setPortionRows([{ name: '', price: '', stock: '0', costPrice: '0' }]);
      setIsAddItemOpen(false);

      fetchItemsAndCategories();
      fetchRecipes();
      fetchPortionStocks();
    } catch (error: any) {
      if (createdRecord) {
        await supabase.from(createdRecord.table).delete().eq('id', createdRecord.id);
      }
      alert(`${t.errorAdding}: ${error.message}`);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const addRecipeIngredient = () => {
    setRecipeIngredients([...recipeIngredients, { ingredient_id: '', quantity_needed: 1, unit: 'pcs' }]);
  };

  const updateRecipeIngredient = (index: number, field: string, value: any) => {
    const updatedIngredients = [...recipeIngredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setRecipeIngredients(updatedIngredients);
  };

  const removeRecipeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const addEditRecipeIngredient = () => {
    setEditRecipeIngredients([...editRecipeIngredients, { ingredient_id: '', quantity_needed: 1, unit: 'pcs' }]);
  };

  const updateEditRecipeIngredient = (index: number, field: string, value: any) => {
    const updatedIngredients = [...editRecipeIngredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setEditRecipeIngredients(updatedIngredients);
  };

  const removeEditRecipeIngredient = (index: number) => {
    setEditRecipeIngredients(editRecipeIngredients.filter((_, i) => i !== index));
  };

  const fetchPortionStocks = async () => {
    if (!isSupabaseConfigured) {
      setPortionStockByProduct({});
      return;
    }

    try {
      const rows = await fetchItemPortionStockRows();
      const totals: Record<string, number> = {};
      for (const row of rows) {
        const stock = Number(row.portion_stock ?? 0);
        if (row.item_id) {
          totals[row.item_id] = (totals[row.item_id] || 0) + stock;
        }
        if (row.recipe_id) {
          totals[row.recipe_id] = (totals[row.recipe_id] || 0) + stock;
        }
        if (row.inventory_item_id) {
          totals[row.inventory_item_id] = (totals[row.inventory_item_id] || 0) + stock;
        }
      }
      setPortionStockByProduct(totals);
    } catch (error) {
      console.warn('Could not load portion stocks:', error instanceof Error ? error.message : error);
      setPortionStockByProduct({});
    }
  };

  const getInventoryItemStock = (inventoryItemId: string): number => {
    if (Object.prototype.hasOwnProperty.call(portionStockByProduct, inventoryItemId)) {
      return portionStockByProduct[inventoryItemId];
    }
    const fromCatalog = inventoryStandaloneItems.find((i) => i.id === inventoryItemId);
    if (fromCatalog) return Number(fromCatalog.stock ?? 0);
    const invItem = items.find((i) => i.id === inventoryItemId);
    return Number((invItem as any)?.stock ?? 0);
  };

  /** Match Inventory page: portion sum on inventory_item_id, else inventory_items.stock */
  const getItemDisplayStock = (item: {
    id: string;
    inventory_item_id?: string | null;
    itemSource?: string;
  }): number => {
    const isRecipeEntity = item.itemSource === 'recipe';
    if (isRecipeEntity) {
      if (recipeHasIngredients[item.id]) {
        return recipeStocks[item.id] || 0;
      }
      return 0;
    }

    if (item.inventory_item_id) {
      return getInventoryItemStock(item.inventory_item_id);
    }

    if (Object.prototype.hasOwnProperty.call(portionStockByProduct, item.id)) {
      return portionStockByProduct[item.id];
    }

    return 0;
  };

  const loadLinkedInventoryPortions = async (inventoryItemId: string, target: 'add' | 'edit') => {
    const apply = (rows: MenuPortionRow[]) => {
      const has = rows.length > 0;
      const nextRows = has ? rows : [emptyPortionRow()];
      if (target === 'add') {
        setHasPortions(has);
        setPortionRows(nextRows);
      } else {
        setEditHasPortions(has);
        setEditPortionRows(nextRows);
      }
    };

    if (!isSupabaseConfigured || !inventoryItemId) {
      apply([]);
      return;
    }

    try {
      const rows = await fetchPortionsForLinkedInventoryItem(inventoryItemId);
      apply(rows);
    } catch {
      apply([]);
    }
  };

  loadLinkedInventoryPortionsRef.current = loadLinkedInventoryPortions;

  const refreshLinkedInventoryRealtime = useCallback(async () => {
    await Promise.all([
      fetchLinkedInventoryCatalog(),
      fetchItemsAndCategories(),
      fetchPortionStocks(),
    ]);

    const sel = linkedSelectionRef.current;
    if (sel.addOpen && sel.addInventoryId) {
      await loadLinkedInventoryPortionsRef.current(sel.addInventoryId, 'add');
    }
    if (sel.editOpen && sel.editInventoryId) {
      await loadLinkedInventoryPortionsRef.current(sel.editInventoryId, 'edit');
    }
  }, [fetchLinkedInventoryCatalog, fetchItemsAndCategories]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void refreshLinkedInventoryRealtime();
      }, 250);
    };

    const channel = supabase
      .channel('items-page-inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_portions' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [isSupabaseConfigured, refreshLinkedInventoryRealtime]);

  // Refresh catalog when Add/Edit standalone dialog opens
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if ((isAddItemOpen && newItemType === 'standalone') || (isEditItemOpen && editItemType === 'standalone')) {
      void fetchLinkedInventoryCatalog();
    }
  }, [isAddItemOpen, isEditItemOpen, newItemType, editItemType, isSupabaseConfigured, fetchLinkedInventoryCatalog]);

  const loadPortionsForEdit = async (id: string, isRecipeEntity: boolean, inventoryItemId?: string) => {
    if (!isSupabaseConfigured) {
      setEditHasPortions(false);
      setEditPortionRows([emptyPortionRow()]);
      return;
    }

    // Standalone menu items: portions come from the Linked Inventory Item only
    if (!isRecipeEntity && inventoryItemId) {
      await loadLinkedInventoryPortions(inventoryItemId, 'edit');
      return;
    }

    try {
      let data: any[] = [];

      if (isRecipeEntity) {
        const { data: recipeData, error: recipeError } = await supabase
          .from('item_portions')
          .select('portion_name, portion_price, portion_cost_price, portion_stock')
          .eq('recipe_id', id)
          .order('created_at', { ascending: true });
        if (recipeError) throw recipeError;
        data = recipeData || [];
      } else {
        const { data: itemData, error: itemError } = await supabase
          .from('item_portions')
          .select('portion_name, portion_price, portion_cost_price, portion_stock')
          .eq('item_id', id)
          .order('created_at', { ascending: true });
        if (itemError) throw itemError;
        data = itemData || [];
      }

      if (data.length > 0) {
        setEditHasPortions(true);
        setEditPortionRows(mapPortionRowsFromDb(data));
      } else {
        setEditHasPortions(false);
        setEditPortionRows([emptyPortionRow()]);
      }
    } catch {
      setEditHasPortions(false);
      setEditPortionRows([emptyPortionRow()]);
    }
  };

  const syncStandaloneMenuPortionPrices = async (
    inventoryItemId: string,
    validPortions: { name: string; price: string; stock: string; costPrice: string }[]
  ) => {
    if (!isSupabaseConfigured || !inventoryItemId || validPortions.length === 0) return;

    const loadExisting = async (column: 'inventory_item_id' | 'item_id') => {
      const { data, error } = await supabase
        .from('item_portions')
        .select('id, portion_name')
        .eq(column, inventoryItemId);
      return { data: data || [], error };
    };

    let existingPortions: Array<{ id: string; portion_name: string }> = [];
    const byInventory = await loadExisting('inventory_item_id');
    if (!byInventory.error && byInventory.data.length > 0) {
      existingPortions = byInventory.data;
    } else if (byInventory.error && isMissingColumnInSchemaCache(byInventory.error, 'item_portions', 'inventory_item_id')) {
      const byLegacy = await loadExisting('item_id');
      if (byLegacy.error) throw byLegacy.error;
      existingPortions = byLegacy.data;
    } else if (!byInventory.error && byInventory.data.length === 0) {
      const byLegacy = await loadExisting('item_id');
      if (byLegacy.error) throw byLegacy.error;
      existingPortions = byLegacy.data;
    } else if (byInventory.error) {
      throw byInventory.error;
    }

    const existingMap = new Map(
      existingPortions.map((p) => [String(p.portion_name || '').trim().toLowerCase(), p.id])
    );

    for (const portion of validPortions) {
      const portionKey = portion.name.trim().toLowerCase();
      const existingId = existingMap.get(portionKey);
      if (!existingId) continue;

      const { error } = await supabase
        .from('item_portions')
        .update({ portion_price: parseFloat(portion.price) || 0 })
        .eq('id', existingId);

      if (error) throw error;
    }
  };

  const syncPortionsForEdit = async (id: string, isRecipeEntity: boolean, validPortions: { name: string; price: string; stock: string; costPrice: string }[]) => {
    if (!isSupabaseConfigured) return;

    try {
      let inventoryItemId: string | null = null;
      if (!isRecipeEntity) {
        const { data: item } = await supabase
          .from('items')
          .select('inventory_item_id, type')
          .eq('id', id)
          .single();

        if (item?.inventory_item_id && item?.type === 'standalone') {
          inventoryItemId = item.inventory_item_id;
        }
      }

      // Standalone menu items: portions live on inventory — update selling price only
      if (inventoryItemId) {
        await syncStandaloneMenuPortionPrices(inventoryItemId, validPortions);
        return;
      }

      console.log('[SAVE-PORTIONS] Updating portions:', validPortions);

      let existingPortions: any[] = [];
      if (isRecipeEntity) {
        const { data } = await supabase
          .from('item_portions')
          .select('id, portion_name')
          .eq('recipe_id', id);
        existingPortions = data || [];
      } else {
        const { data } = await supabase
          .from('item_portions')
          .select('id, portion_name')
          .eq('item_id', id);
        existingPortions = data || [];
      }

      const existingMap = new Map(
        (existingPortions || []).map(p => [p.portion_name.toLowerCase(), p.id])
      );

      // Update or insert portions
      for (const portion of validPortions) {
        const portionName = portion.name.trim();
        const portionKey = portionName.toLowerCase();
        const existingId = existingMap.get(portionKey);

        const data: any = {
          portion_name: portionName,
          portion_price: parseFloat(portion.price) || 0,
          portion_cost_price: parseFloat(portion.costPrice) || 0,
          portion_stock: parseInt(portion.stock) || 0,
        };

        if (existingId) {
          // Update existing portion - แก้ไขข้อมูลเดิม ไม่ลบแล้วสร้างใหม่
          const { error } = await supabase
            .from('item_portions')
            .update(data)
            .eq('id', existingId);
          
          if (error) console.error('[SAVE-PORTIONS] Update error:', error);
          else console.log('[SAVE-PORTIONS] Updated:', portionName);
          
          existingMap.delete(portionKey); // Mark as processed
        } else {
          // Insert new portion - เพิ่มใหม่เฉพาะที่ยังไม่มี
          if (isRecipeEntity) {
            data.recipe_id = id;
            data.item_id = null;
            data.inventory_item_id = null;
          } else {
            data.item_id = id;
            data.recipe_id = null;
            data.inventory_item_id = null;
          }

          const { error } = await supabase
            .from('item_portions')
            .insert(data);
          
          if (error) console.error('[SAVE-PORTIONS] Insert error:', error);
          else console.log('[SAVE-PORTIONS] Inserted:', portionName);
        }
      }

      // Delete portions that were removed
      const toDelete = Array.from(existingMap.values());
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('item_portions')
          .delete()
          .in('id', toDelete);
        
        if (error) console.error('[SAVE-PORTIONS] Delete error:', error);
        else console.log('[SAVE-PORTIONS] Deleted:', toDelete.length);
      }

      console.log('[SAVE-PORTIONS] Success!');
    } catch (error: any) {
      console.error('Failed to save portions:', error?.message || error);
      throw error;
    }
  };

  const loadPortionsForAdd = async (inventoryItemId: string) => {
    await loadLinkedInventoryPortions(inventoryItemId, 'add');
  };

  const syncStandalonePortions = async (
    inventoryItemId: string,
    validPortions: { name: string; price: string; stock: string; costPrice: string }[]
  ) => {
    await syncStandaloneMenuPortionPrices(inventoryItemId, validPortions);
  };

  const getStandaloneInventoryItems = (includeLinked: boolean = false) => {
    const standaloneItems = inventoryStandaloneItems.length > 0
      ? inventoryStandaloneItems
      : items.filter((item) => item.type === 'standalone' && (item as any).cost_price !== undefined);

    if (!includeLinked) {
      const linkedInventoryIds = new Set(
        items
          .filter((item) => {
            const src = (item as any).itemSource;
            if (src === 'inventory' || src === 'recipe') return false;
            const linkId = (item as any).inventory_item_id;
            if (!linkId) return false;
            if (editingItem && item.id === editingItem.id) return false;
            return true;
          })
          .map((item) => String((item as any).inventory_item_id))
      );

      return standaloneItems.filter((item) => !linkedInventoryIds.has(String(item.id)));
    }

    return standaloneItems;
  };

  const getInventoryMenuCategoryId = (invItem: Record<string, unknown>) =>
    String(invItem.category_id || invItem.inventory_category_id || '');

  const getAvailableIngredients = () => {
    // Ingredients come from inventory_items table with type = 'ingredient'
    const ingredients = items.filter(item => item.type === 'ingredient');
    
    // Remove duplicates by ID to prevent duplicate key warnings
    const uniqueIngredients = ingredients.reduce((acc, current) => {
      const exists = acc.find(item => item.id === current.id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, [] as typeof ingredients);
    
    return uniqueIngredients;
  };

  const buildRecipeIngredientsToInsert = (
    recipeId: string,
    sourceIngredients: { ingredient_id: string; quantity_needed: number; unit: string }[]
  ) => {
    const ingredientMap = new Map<string, { ingredient_id: string; quantity_needed: number; unit: string }>();

    for (const ingredient of sourceIngredients) {
      const selectedIngredientId = ingredient.ingredient_id?.trim();
      if (!selectedIngredientId || selectedIngredientId === 'null' || selectedIngredientId === 'undefined') {
        continue;
      }

      const quantityNeeded = Number(ingredient.quantity_needed) || 1;
      const existing = ingredientMap.get(selectedIngredientId);

      if (existing) {
        existing.quantity_needed += quantityNeeded;
      } else {
        ingredientMap.set(selectedIngredientId, {
          ingredient_id: selectedIngredientId,
          quantity_needed: quantityNeeded,
          unit: ingredient.unit || 'pcs'
        });
      }
    }

    return Array.from(ingredientMap.values()).map(ingredient => ({
      recipe_id: recipeId,
      ingredient_id: ingredient.ingredient_id,
      quantity_needed: ingredient.quantity_needed,
      unit: ingredient.unit
    }));
  };

  const loadRecipeIngredients = async (recipeId: string) => {
    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipeId);

      if (data) {
        const ingredients = data.map(ing => ({
          ingredient_id: ing.ingredient_id,
          quantity_needed: ing.quantity_needed,
          unit: ing.unit
        }));
        setEditRecipeIngredients(ingredients);
        setEditHasIngredients(ingredients.length > 0);
      } else {
        setEditRecipeIngredients([]);
        setEditHasIngredients(false);
      }
      if (error) console.error('Error loading recipe ingredients:', error);
    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
      setEditRecipeIngredients([]);
      setEditHasIngredients(false);
    }
  };

  const calculateRecipeStock = async (recipeId: string) => {
    try {
      const { data: ingredients, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipeId);

      if (error || !ingredients || ingredients.length === 0) return 0;

      const stocks = ingredients.map(ingredient => {
        const ingredientItem = items.find(item => item.id === ingredient.ingredient_id);
        if (!ingredientItem) return 0;
        
        // Get stock from inventory_items for standalone ingredients
        const itemType = (ingredientItem as any).type;
        let availableStock = 0;
        
        if (itemType === 'standalone' && (ingredientItem as any).inventory_item_id) {
          const linkedInvItem = items.find(invItem => invItem.id === (ingredientItem as any).inventory_item_id);
          availableStock = (linkedInvItem as any)?.stock ?? 0;
        } else {
          // For items from inventory_items table
          availableStock = (ingredientItem as any)?.stock ?? 0;
        }
        
        return Math.floor(availableStock / (ingredient.quantity_needed || 1));
      });

      return Math.min(...stocks);
    } catch (error) {
      console.error('Error calculating recipe stock:', error);
      return 0;
    }
  };

  const calculateAllRecipeStocks = async () => {
    const newRecipeStocks: { [key: string]: number } = {};
    for (const recipe of recipes) {
      newRecipeStocks[recipe.id] = await calculateRecipeStock(recipe.id);
    }
    setRecipeStocks(newRecipeStocks);
  };

  const handleEditItem = async () => {
    if (isSavingRef.current) return; // Prevent double submit
    if (!editingItem || !editItemName || !editItemPrice || !editItemCategory) {
      alert('Please fill in all required fields');
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const validEditPortions = editHasPortions
        ? editPortionRows.filter((row) => row.name.trim() && (parseFloat(row.price) || 0) > 0)
        : [];

      if (editHasPortions && validEditPortions.length === 0) {
        alert('Please add at least one valid portion with name and price.');
        return;
      }

      const targetInventoryItemId = editStandaloneInventoryItemId || (editingItem as any).inventory_item_id || '';
      if (editItemType === 'standalone' && !targetInventoryItemId) {
        alert(t.selectStandaloneInventory);
        return;
      }

      const wasRecipe = isEditingRecipe;

      // Handle type conversion when changing between recipe and non-recipe
      if (wasRecipe && editItemType !== 'recipe') {
        // Convert from recipe to items table
        const priceToSave = editHasPortions ? parseFloat(validEditPortions[0].price) : parseFloat(editItemPrice);
        
        // Delete from recipes
        await supabase.from('recipes').delete().eq('id', editingItem.id);
        
        // Create in items table
        const { data: newItem, error: itemError } = await supabase
          .from('items')
          .insert({
            name: editItemName,
            price: priceToSave,
            category_id: editItemCategory,
            inventory_item_id: editItemType === 'standalone' ? targetInventoryItemId : null,
            type: editItemType === 'saleOnly' ? 'saleonly' : 'standalone',
            is_recipe: false,
            show_in_menu: true
          })
          .select()
          .single();

        if (itemError) throw itemError;
        
        if (newItem) {
          await syncPortionsForEdit(newItem.id, false, validEditPortions);
        }
      } else if (!wasRecipe && editItemType === 'recipe') {
        // Convert from items to recipes table
        const priceToSave = editHasPortions ? parseFloat(validEditPortions[0].price) : parseFloat(editItemPrice);
        
        // Delete from items
        await supabase.from('items').delete().eq('id', editingItem.id);
        
        // Create in recipes table
        const { data: newRecipe } = await supabase
          .from('recipes')
          .insert({
            name: editItemName,
            category_id: editItemCategory,
            price: priceToSave,
            is_recipe: true
          })
          .select()
          .single();
        
        if (newRecipe && newRecipe.id) {
          const ingredientsToInsert = buildRecipeIngredientsToInsert(newRecipe.id, editRecipeIngredients);
          
          if (ingredientsToInsert.length > 0) {
            const { error: ingError } = await supabase.from('recipe_ingredients').insert(
              ingredientsToInsert
            );
            
            if (ingError) throw ingError;
          }
          
          await syncPortionsForEdit(newRecipe.id, true, validEditPortions);
        }
      } else if (wasRecipe) {
        // Was recipe and still recipe - update in recipes table
        const priceToSave = editHasPortions ? parseFloat(validEditPortions[0].price) : parseFloat(editItemPrice);
        await supabase.from('recipes').update({ 
          name: editItemName, 
          category_id: editItemCategory, 
          price: priceToSave 
        }).eq('id', editingItem.id);
        
        // Update recipe ingredients
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', editingItem.id);
        const ingredientsToInsert = buildRecipeIngredientsToInsert(editingItem.id, editRecipeIngredients);
        
        if (ingredientsToInsert.length > 0) {
          const { error: ingError } = await supabase.from('recipe_ingredients').insert(
            ingredientsToInsert
          );
          
          if (ingError) throw ingError;
        }
        
        // Update portions
        await syncPortionsForEdit(editingItem.id, true, validEditPortions);
      } else {
        // Was items and still items - update in items table
        const priceToSave = editHasPortions ? parseFloat(validEditPortions[0].price) : parseFloat(editItemPrice);
        
        await editItem(editingItem.id, { 
          name: editItemName, 
          price: priceToSave, 
          category_id: editItemCategory,
          inventory_item_id: editItemType === 'saleOnly'
            ? null
            : targetInventoryItemId,
          type: editItemType === 'saleOnly' ? 'saleonly' : 'standalone'
        });
        
        // Update portions
        await syncPortionsForEdit(editingItem.id, false, validEditPortions);
      }

      setIsEditItemOpen(false);
      setEditingItem(null);
      fetchItemsAndCategories();
      fetchRecipes();
      fetchPortionStocks();
    } catch (error: any) {
      console.error('Error editing item:', error);
      alert(`Error editing item: ${error.message}`);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string, itemType?: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        if (itemType === 'Recipe') {
          await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
          await supabase.from('recipes').delete().eq('id', id);
        } else {
          await deleteItem(id);
        }
        fetchItemsAndCategories();
        fetchRecipes();
        fetchPortionStocks();
      } catch (error: any) {
        console.error('Error deleting item:', error);
        alert(`Error deleting item: ${error.message}`);
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) {
      alert(t.enterCategoryName);
      return;
    }
    await addCategory({ name: newCategoryName });
    setIsAddCategoryOpen(false);
    setNewCategoryName('');
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editCategoryName) return;
    await editCategory(editingCategory.id, { name: editCategoryName });
    setIsEditCategoryOpen(false);
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm(t.deleteCategoryConfirm)) {
      await deleteCategory(id);
    }
  };

  const displayCategories = categories.length > 0 ? categories : (isSupabaseConfigured ? [] : MOCK_CATEGORIES);
  const menuItems = items.length > 0
    ? items
        .filter(item => 
          // Only show items from 'items' table (not inventory_items)
          // Items table has category_id, inventory_items has inventory_category_id
          item.category_id !== undefined && item.category_id !== null && (item as any).itemSource !== 'recipe'
        )
        .map(item => ({ ...item, itemSource: 'standalone' as const, uniqueKey: `item-${item.id}` }))
    : (isSupabaseConfigured ? [] : MOCK_ITEMS.map(item => ({ ...item, itemSource: 'standalone' as const, uniqueKey: `mock-${item.id}` })));
  const recipeItems = recipes.length > 0 ? recipes.map(recipe => ({ ...recipe, is_recipe: true, itemSource: 'recipe' as const, uniqueKey: `recipe-${recipe.id}` })) : [];
  const displayItems = [...menuItems, ...recipeItems].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA; // newest first (descending)
  });
  
  // Smart Filter Logic
  const filteredItems = displayItems.filter(item => {
    // Search query filter
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Type filter
    const isRecipeEntity = (item as any).itemSource === 'recipe';
    const hasIngredients = isRecipeEntity && recipeHasIngredients[item.id];
    let matchesType = true;
    if (filterType === 'standalone') {
      matchesType = !isRecipeEntity;
    } else if (filterType === 'recipe') {
      matchesType = isRecipeEntity && hasIngredients;
    } else if (filterType === 'saleOnly') {
      matchesType = isRecipeEntity && !hasIngredients;
    }
    
    // Stock filter
    let matchesStock = true;
    if (filterStock !== 'all') {
      const itemStock = getItemDisplayStock(item as any);
      
      if (filterStock === 'in-stock') {
        matchesStock = itemStock > 10;
      } else if (filterStock === 'low-stock') {
        matchesStock = itemStock > 0 && itemStock <= 10;
      } else if (filterStock === 'out-of-stock') {
        matchesStock = itemStock === 0;
      }
    }
    
    // Category filter
    const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory;
    
    return matchesSearch && matchesType && matchesStock && matchesCategory;
  });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize, filterType, filterStock, filterCategory]);

  const handleResetFilters = () => {
    setFilterType('all');
    setFilterStock('all');
    setFilterCategory('all');
    setSearchQuery('');
  };

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-8 pt-6 bg-zinc-50/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">{t.itemsAndCategories}</h2>
          <p className="text-zinc-500">{t.manageMenu}</p>
        </div>
        <div className="flex flex-col sm:flex-row grow justify-end items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder={t.searchItems}
              className="h-11 pl-9 rounded-xl border-zinc-200 bg-white shadow-sm focus:ring-blue-500 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 transition-all active:scale-95">
                <Plus className="mr-2 h-4 w-4" /> {t.addItem}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{t.addNewItem}</DialogTitle>
                <DialogDescription>{t.createRecipe}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t.itemName}</Label>
                  <Input id="name" placeholder="e.g. Cheese Burger" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">{t.sellingPrice}</Label>
                  <Input id="price" type="number" step="0.01" placeholder="0.00" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">{t.category}</Label>
                  <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={t.selectCategory} /></SelectTrigger>
                    <SelectContent>
                      {displayCategories.map((category) => (<SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t.type}</Label>
                  <Select
                    value={newItemType}
                    onValueChange={(value) => {
                      const nextType = value as 'standalone' | 'recipe' | 'saleOnly';
                      setNewItemType(nextType);
                      if (nextType === 'standalone') {
                        setRecipeIngredients([]);
                      } else {
                        setSelectedStandaloneInventoryItemId('');
                      }
                      if (nextType === 'saleOnly') {
                        setHasPortions(false);
                        setPortionRows([{ name: '', price: '', stock: '0', costPrice: '0' }]);
                        setRecipeIngredients([]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standalone">{t.standalone}</SelectItem>
                      <SelectItem value="saleOnly">{t.saleOnly}</SelectItem>
                      <SelectItem value="recipe">{t.ingredientsType}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newItemType === 'standalone' && (
                  <div className="grid gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <Label>{t.linkInventoryItem}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="showLinkedItems"
                          checked={showLinkedItems}
                          onChange={(e) => setShowLinkedItems(e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="showLinkedItems" className="text-xs text-zinc-500 cursor-pointer select-none">
                          {currentLanguage === 'th' ? 'แสดงสินค้าที่ลิงก์แล้วด้วย' : currentLanguage === 'lo' ? 'ສະແດງສິນຄ້າທີ່ເຊື່ອມໂຍງແລ້ວ' : 'Show linked items too'}
                        </label>
                      </div>
                    </div>
                    <Select
                      value={selectedStandaloneInventoryItemId}
                      onValueChange={async (value) => {
                        const selectedItem = getStandaloneInventoryItems(showLinkedItems).find(
                          (item) => String(item.id) === value
                        );
                        setSelectedStandaloneInventoryItemId(value);
                        if (selectedItem) {
                          setNewItemName(String(selectedItem.name || ''));
                          setNewItemPrice(String(selectedItem.price ?? ''));
                          setNewItemCategory(getInventoryMenuCategoryId(selectedItem) || newItemCategory);
                          await loadPortionsForAdd(String(selectedItem.id));
                        }
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue placeholder={t.selectStandaloneInventory} /></SelectTrigger>
                      <SelectContent>
                        <div className="p-2 border-b border-zinc-200 sticky top-0 bg-white z-10">
                          <Input
                            type="text"
                            placeholder={currentLanguage === 'th' ? 'ค้นหา...' : currentLanguage === 'lo' ? 'ຄົ້ນຫາ...' : 'Search...'}
                            value={inventoryItemSearch}
                            onChange={(e) => setInventoryItemSearch(e.target.value)}
                            className="h-9 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                        {getStandaloneInventoryItems(showLinkedItems)
                          .filter(item => 
                            String(item?.name || '').toLowerCase().includes(inventoryItemSearch.toLowerCase())
                          )
                          .map((item, index) => (
                            <SelectItem key={`add-standalone-${item?.id}-${index}`} value={String(item?.id || '')}>{String(item?.name || 'Unknown')}</SelectItem>
                          ))}
                        {getStandaloneInventoryItems(showLinkedItems).filter(item => 
                          String(item?.name || '').toLowerCase().includes(inventoryItemSearch.toLowerCase())
                        ).length === 0 && (
                          <SelectItem value="no-results" disabled>
                            {currentLanguage === 'th' ? 'ไม่พบรายการที่ค้นหา' : currentLanguage === 'lo' ? 'ບໍ່ພົບລາຍການທີ່ຄົ້ນຫາ' : 'No results found'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {getStandaloneInventoryItems(showLinkedItems).length === 0 ? (
                      <p className="text-xs text-red-600">{t.noStandaloneInventoryItems}</p>
                    ) : (
                      <p className="text-xs text-emerald-700">{t.standaloneLinkHelp}</p>
                    )}
                    {selectedStandaloneInventoryItemId && (
                      <div className="mt-3 grid gap-2 border-t border-emerald-100 pt-3">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input
                            type="checkbox"
                            checked={hasPortions}
                            readOnly
                            disabled
                            className="rounded text-blue-600 focus:ring-blue-500 opacity-70"
                          />
                          {t.hasPortions}
                        </label>
                        {hasPortions ? (
                          <div className="space-y-3 p-3 rounded-xl border border-emerald-100 bg-white/80">
                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-200">
                              {t.portionsFromInventory}
                            </div>
                            {portionRows.map((row, index) => (
                              <div key={`add-inv-portion-${index}`} className="grid grid-cols-12 gap-2">
                                <Input className="col-span-5 h-10 rounded-lg bg-zinc-100" placeholder={t.portionName} value={row.name} readOnly disabled />
                                <Input className="col-span-3 h-10 rounded-lg" type="number" placeholder={t.portionPrice} value={row.price} onChange={(e) => setPortionRows(prev => prev.map((p, i) => i === index ? { ...p, price: e.target.value } : p))} />
                                <Input className="col-span-4 h-10 rounded-lg bg-zinc-100" type="number" placeholder={t.portionStock} value={row.stock} readOnly disabled />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 px-1">{t.noInventoryPortions}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {newItemType === 'recipe' && (
                <div className="grid gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={hasPortions} onChange={(e) => setHasPortions(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    {t.hasPortions}
                  </label>
                  {hasPortions && (
                    <div className="space-y-3 p-4 rounded-xl border border-zinc-100 bg-zinc-50/50">
                      {portionRows.map((row, index) => (
                        <div key={`add-portion-${index}`} className="grid grid-cols-12 gap-2">
                          <Input className="col-span-5 h-10 rounded-lg" placeholder={t.portionName} value={row.name} onChange={(e) => setPortionRows(prev => prev.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} />
                          <Input className="col-span-3 h-10 rounded-lg" type="number" placeholder={t.portionPrice} value={row.price} onChange={(e) => setPortionRows(prev => prev.map((p, i) => i === index ? { ...p, price: e.target.value } : p))} />
                          <Input className="col-span-2 h-10 rounded-lg" type="number" placeholder={t.portionStock} value={row.stock} onChange={(e) => setPortionRows(prev => prev.map((p, i) => i === index ? { ...p, stock: e.target.value } : p))} />
                          <Button variant="ghost" size="icon" className="col-span-2 text-red-500" onClick={() => setPortionRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={() => setPortionRows(prev => [...prev, { name: '', price: '', stock: '0', costPrice: '0' }])}><Plus className="mr-2 h-4 w-4" /> {t.addPortion}</Button>
                    </div>
                  )}
                </div>
                )}
                
                {newItemType === 'recipe' && (
                  <div className="grid gap-2">
                    <div className="space-y-4 pt-2 p-4 rounded-xl border border-blue-100 bg-blue-50/30">
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-bold flex items-center gap-2">
                          <ChefHat className="h-4 w-4 text-blue-600" />
                          {t.recipeIngredients}
                        </Label>
                        <Button onClick={addRecipeIngredient} variant="outline" size="sm" className="rounded-lg h-9"><Plus className="h-4 w-4 mr-2" /> {t.add}</Button>
                      </div>
                      {recipeIngredients.length === 0 ? (
                        <p className="text-sm text-zinc-500 text-center py-4">Click Add to add ingredients</p>
                      ) : (
                        recipeIngredients.map((ingredient, index) => {
                          const ingredientItem = getAvailableIngredients().find(i => i.id === ingredient.ingredient_id);
                          return (
                            <div key={`add-recipe-ing-${index}`} className="flex gap-2 items-center bg-white p-3 rounded-lg border border-zinc-200">
                              <Select value={ingredient.ingredient_id} onValueChange={(v) => updateRecipeIngredient(index, 'ingredient_id', v)}>
                                <SelectTrigger className="h-10 rounded-lg grow"><SelectValue placeholder={t.selectIngredient} /></SelectTrigger>
                                <SelectContent>{getAvailableIngredients().map((item, idx) => (<SelectItem key={`add-ing-opt-${item.id}-${idx}`} value={item.id}>{item.name}</SelectItem>))}</SelectContent>
                              </Select>
                              <Input type="number" step="0.01" className="w-24 h-10 rounded-lg" placeholder="จำนวน" value={ingredient.quantity_needed} onChange={(e) => updateRecipeIngredient(index, 'quantity_needed', parseFloat(e.target.value) || 0)} />
                              <Input className="w-20 h-10 rounded-lg" placeholder="หน่วย" value={ingredient.unit} onChange={(e) => updateRecipeIngredient(index, 'unit', e.target.value)} />
                              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeRecipeIngredient(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddItemOpen(false)} className="rounded-xl h-11 px-6">{t.cancel}</Button>
                <Button disabled={isSaving} onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11 px-6">{t.saveItem}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="items" className="space-y-6">
        <TabsList className="bg-white p-1 rounded-xl border border-zinc-200 shadow-sm w-full sm:w-auto h-auto min-h-[52px] flex flex-wrap gap-1">
          <TabsTrigger value="items" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md px-8 py-2.5 transition-all font-bold text-sm tracking-wide grow sm:grow-0">{t.items}</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md px-8 py-2.5 transition-all font-bold text-sm tracking-wide grow sm:grow-0">{t.categories}</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <Card className="border-0 shadow-xl shadow-zinc-200/50 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-zinc-800">{t.menuItems}</CardTitle>
                  <CardDescription className="text-zinc-500 font-medium">{t.manageProducts}</CardDescription>
                </div>
                
                {/* Smart Filters Section Moved Below */}
                
                <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
                  <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="text-xl font-bold">{t.editItem}</DialogTitle><DialogDescription>{t.updateDetails}</DialogDescription></DialogHeader>
                    <div className="grid gap-6 py-4">
                      {/* Similar form as Add but with editing states */}
                      <div className="grid gap-2"><Label>{t.name}</Label><Input value={editItemName} onChange={(e) => setEditItemName(e.target.value)} className="h-11 rounded-xl" /></div>
                      <div className="grid gap-2"><Label>{t.price}</Label><Input type="number" value={editItemPrice} onChange={(e) => setEditItemPrice(e.target.value)} className="h-11 rounded-xl" /></div>
                      <div className="grid gap-2">
                        <Label>{t.category}</Label>
                        <Select value={editItemCategory} onValueChange={setEditItemCategory}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{displayCategories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>{t.type}</Label>
                        <Select
                          value={editItemType}
                          onValueChange={(value) => {
                            const nextType = value as 'standalone' | 'recipe' | 'saleOnly';
                            setEditItemType(nextType);
                            if (nextType === 'standalone') {
                              setEditRecipeIngredients([]);
                              setEditHasIngredients(false);
                            } else {
                              setEditStandaloneInventoryItemId('');
                            }
                            if (nextType === 'saleOnly') {
                              setEditHasIngredients(false);
                              setEditHasPortions(false);
                              setEditRecipeIngredients([]);
                              setEditPortionRows([{ name: '', price: '', stock: '0', costPrice: '0' }]);
                            }
                          }}
                        >
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standalone">{t.standalone}</SelectItem>
                            <SelectItem value="saleOnly">{t.saleOnly}</SelectItem>
                            <SelectItem value="recipe">{t.ingredientsType}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {editItemType === 'standalone' && (
                        <div className="grid gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                          <div className="flex items-center justify-between">
                            <Label>{t.linkInventoryItem}</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="showEditLinkedItems"
                                checked={showLinkedItems}
                                onChange={(e) => setShowLinkedItems(e.target.checked)}
                                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="showEditLinkedItems" className="text-xs text-zinc-500 cursor-pointer select-none">
                                {currentLanguage === 'th' ? 'แสดงสินค้าที่ลิงก์แล้วด้วย' : currentLanguage === 'lo' ? 'ສະແດງສິນຄ້າທີ່ເຊື່ອມໂຍງແລ້ວ' : 'Show linked items too'}
                              </label>
                            </div>
                          </div>
                          <Select 
                            value={editStandaloneInventoryItemId} 
                            onValueChange={async (value) => {
                              setEditStandaloneInventoryItemId(value);
                              await loadLinkedInventoryPortions(value, 'edit');
                            }}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-white"><SelectValue placeholder={t.selectStandaloneInventory} /></SelectTrigger>
                            <SelectContent>
                              <div className="p-2 border-b border-zinc-200 sticky top-0 bg-white z-10">
                                <Input
                                  type="text"
                                  placeholder={currentLanguage === 'th' ? 'ค้นหา...' : currentLanguage === 'lo' ? 'ຄົ້ນຫາ...' : 'Search...'}
                                  value={editInventoryItemSearch}
                                  onChange={(e) => setEditInventoryItemSearch(e.target.value)}
                                  className="h-9 rounded-lg"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                />
                              </div>
                              {getStandaloneInventoryItems(showLinkedItems)
                                .filter(item => 
                                  String(item?.name || '').toLowerCase().includes(editInventoryItemSearch.toLowerCase())
                                )
                                .length === 0 ? (
                                <SelectItem value="no-items" disabled>
                                  {editInventoryItemSearch 
                                    ? (currentLanguage === 'th' ? 'ไม่พบรายการที่ค้นหา' : currentLanguage === 'lo' ? 'ບໍ່ພົບລາຍການທີ່ຄົ້ນຫາ' : 'No results found')
                                    : t.noStandaloneInventoryItems
                                  }
                                </SelectItem>
                              ) : (
                                getStandaloneInventoryItems(showLinkedItems)
                                  .filter(item => 
                                    String(item?.name || '').toLowerCase().includes(editInventoryItemSearch.toLowerCase())
                                  )
                                  .map((item, index) => (
                                    <SelectItem key={`edit-standalone-${item?.id}-${index}`} value={String(item?.id || '')}>{String(item?.name || 'Unknown')}</SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                          {getStandaloneInventoryItems(showLinkedItems).length === 0 ? (
                            <p className="text-xs text-red-600">{t.noStandaloneInventoryItems}</p>
                          ) : (
                            <p className="text-xs text-emerald-700">{t.standaloneLinkHelp}</p>
                          )}
                          {/* Display total portion stock from item_portions */}
                          {editStandaloneInventoryItemId && (() => {
                            const stock = getInventoryItemStock(editStandaloneInventoryItemId);
                            return (
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs font-semibold text-zinc-600">{t.stock}:</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stock <= 0 ? 'bg-red-100 text-red-700' : stock < 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                  {stock} {stock <= 0 ? '(Out of Stock)' : stock < 10 ? '(Low)' : '(In Stock)'}
                                </span>
                              </div>
                            );
                          })()}
                          {editStandaloneInventoryItemId && (
                            <div className="mt-3 grid gap-2 border-t border-emerald-100 pt-3">
                              <label className="flex items-center gap-2 text-sm font-medium">
                                <input
                                  type="checkbox"
                                  checked={editHasPortions}
                                  readOnly
                                  disabled
                                  className="rounded text-blue-600 focus:ring-blue-500 opacity-70"
                                />
                                {t.hasPortions}
                              </label>
                              {editHasPortions ? (
                                <div className="space-y-3 p-3 rounded-xl border border-emerald-100 bg-white/80">
                                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-200">
                                    {t.portionsFromInventory}
                                  </div>
                                  {editPortionRows.map((row, index) => (
                                    <div key={`edit-portion-${index}`} className="grid grid-cols-12 gap-2">
                                      <Input className="col-span-5 h-10 rounded-lg bg-zinc-100" placeholder={t.portionName} value={row.name} readOnly disabled />
                                      <Input className="col-span-3 h-10 rounded-lg" type="number" placeholder={t.portionPrice} value={row.price} onChange={(e) => setEditPortionRows(prev => prev.map((p, i) => i === index ? { ...p, price: e.target.value } : p))} />
                                      <Input className="col-span-4 h-10 rounded-lg bg-zinc-100" type="number" placeholder={t.portionStock} value={row.stock} readOnly disabled />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-zinc-500 px-1">{t.noInventoryPortions}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {editItemType === 'recipe' && (
                      <div className="grid gap-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input type="checkbox" checked={editHasPortions} onChange={(e) => setEditHasPortions(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                          {t.hasPortions}
                        </label>
                        {editHasPortions && (
                          <div className="space-y-3 p-4 rounded-xl border border-zinc-100 bg-zinc-50/50">
                            {editPortionRows.map((row, index) => (
                              <div key={`edit-recipe-portion-${index}`} className="grid grid-cols-12 gap-2">
                                <Input className="col-span-5 h-10 rounded-lg" placeholder={t.portionName} value={row.name} onChange={(e) => setEditPortionRows(prev => prev.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} />
                                <Input className="col-span-3 h-10 rounded-lg" type="number" placeholder={t.portionPrice} value={row.price} onChange={(e) => setEditPortionRows(prev => prev.map((p, i) => i === index ? { ...p, price: e.target.value } : p))} />
                                <Input className="col-span-2 h-10 rounded-lg" type="number" placeholder={t.portionStock} value={row.stock} onChange={(e) => setEditPortionRows(prev => prev.map((p, i) => i === index ? { ...p, stock: e.target.value } : p))} />
                                <Button variant="ghost" size="icon" className="col-span-2 text-red-500" onClick={() => setEditPortionRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            ))}
                            <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={() => setEditPortionRows(prev => [...prev, { name: '', price: '', stock: '0', costPrice: '0' }])}><Plus className="mr-2 h-4 w-4" /> {t.addPortion}</Button>
                          </div>
                        )}
                      </div>
                      )}

                      {editItemType === 'recipe' && (
                        <div className="grid gap-2">
                          <div className="space-y-4 pt-2 p-4 rounded-xl border border-blue-100 bg-blue-50/30">
                            <div className="flex justify-between items-center">
                              <Label className="text-base font-bold flex items-center gap-2">
                                <ChefHat className="h-4 w-4 text-blue-600" />
                                {t.recipeIngredients}
                              </Label>
                              <Button onClick={addEditRecipeIngredient} variant="outline" size="sm" className="rounded-lg h-9"><Plus className="h-4 w-4 mr-2" /> {t.add}</Button>
                            </div>
                            {editRecipeIngredients.length === 0 ? (
                              <p className="text-sm text-zinc-500 text-center py-4">Click Add to add ingredients</p>
                            ) : (
                              editRecipeIngredients.map((ingredient, index) => {
                                const ingredientItem = getAvailableIngredients().find(i => i.id === ingredient.ingredient_id);
                                return (
                                  <div key={`edit-recipe-ing-${index}`} className="flex gap-2 items-center bg-white p-3 rounded-lg border border-zinc-200">
                                    <Select value={ingredient.ingredient_id} onValueChange={(v) => updateEditRecipeIngredient(index, 'ingredient_id', v)}>
                                      <SelectTrigger className="h-10 rounded-lg grow"><SelectValue placeholder={t.selectIngredient} /></SelectTrigger>
                                      <SelectContent>{getAvailableIngredients().map((item, idx) => (<SelectItem key={`edit-ing-opt-${item.id}-${idx}`} value={item.id}>{item.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                    <Input type="number" step="0.01" className="w-24 h-10 rounded-lg" placeholder="จำนวน" value={ingredient.quantity_needed} onChange={(e) => updateEditRecipeIngredient(index, 'quantity_needed', parseFloat(e.target.value) || 0)} />
                                    <Input className="w-20 h-10 rounded-lg" placeholder="หน่วย" value={ingredient.unit} onChange={(e) => updateEditRecipeIngredient(index, 'unit', e.target.value)} />
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeEditRecipeIngredient(index)}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditItemOpen(false)} className="rounded-xl h-11 px-6">{t.cancel}</Button>
                      <Button disabled={isSaving} onClick={handleEditItem} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11 px-6">{t.save}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* Smart Filters */}
              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Type Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-600">{t.filterType}</Label>
                    <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                      <SelectTrigger className="h-10 rounded-lg bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allTypes}</SelectItem>
                        <SelectItem value="standalone">{t.standalone}</SelectItem>
                        <SelectItem value="recipe">{t.recipe}</SelectItem>
                        <SelectItem value="saleOnly">{t.saleOnly}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stock Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-600">{t.filterStock}</Label>
                    <Select value={filterStock} onValueChange={(value: any) => setFilterStock(value)}>
                      <SelectTrigger className="h-10 rounded-lg bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allStock}</SelectItem>
                        <SelectItem value="in-stock">{t.inStock}</SelectItem>
                        <SelectItem value="low-stock">{t.lowStock}</SelectItem>
                        <SelectItem value="out-of-stock">{t.outOfStock}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-600">{t.filterCategory}</Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="h-10 rounded-lg bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allCategories}</SelectItem>
                        {displayCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reset Button */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-transparent">Reset</Label>
                    <Button 
                      onClick={handleResetFilters}
                      variant="outline"
                      className="w-full h-10 rounded-lg border-zinc-200 hover:bg-zinc-50"
                    >
                      {t.resetFilters}
                    </Button>
                  </div>
                </div>

                {/* Results Count */}
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <span className="font-semibold">{t.showingResults}:</span>
                  <span className="font-bold text-blue-600">{filteredItems.length}</span>
                  <span>{t.of}</span>
                  <span className="font-bold">{displayItems.length}</span>
                  <span>{t.results}</span>
                </div>
              </div>
              
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-50 bg-blue-50/20 text-left text-blue-600">
                      <th className="p-4 font-bold">{t.name}</th>
                      <th className="p-4 font-bold">{t.category}</th>
                      <th className="p-4 font-bold">{t.price}</th>
                      <th className="p-4 font-bold">{t.type}</th>
                      <th className="p-4 font-bold">{t.stock}</th>
                      <th className="p-4 font-bold text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {paginatedItems.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-zinc-500">{t.noItemsFound}</td></tr>
                    ) : (
                      paginatedItems.map((item) => {
                        const category = displayCategories.find(c => c.id === item.category_id);
                        const isRecipeEntity = item.is_recipe === true;
                        const hasIngredients = isRecipeEntity && recipeHasIngredients[item.id];
                        
                        // Determine item type label based on actual type field
                        let itemTypeLabel;
                        if (item.is_recipe) {
                          // Recipe entity from recipes table
                          itemTypeLabel = hasIngredients ? t.ingredientsType : t.ingredientsType;
                        } else {
                          // Item from items table - check type field
                          const itemType = (item as any).type;
                          if (itemType === 'saleonly' || itemType === 'saleOnly') {
                            itemTypeLabel = t.saleOnly;
                          } else if (itemType === 'standalone') {
                            itemTypeLabel = t.standalone;
                          } else if (itemType === 'recipe') {
                            itemTypeLabel = t.ingredientsType;
                          } else {
                            // Legacy items without type
                            itemTypeLabel = t.standalone;
                          }
                        }
                        
                        const stock = getItemDisplayStock(item as any);
                        return (
                          <tr key={(item as any).uniqueKey} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                            <td className="p-4 font-bold text-zinc-800">{item.name}</td>
                            <td className="p-4 text-zinc-500 font-medium">{category?.name || 'Unknown'}</td>
                            <td className="p-4 font-bold text-zinc-900">{formatCurrency(item.price, currencySettings)}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                itemTypeLabel === t.saleOnly 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : itemTypeLabel === t.standalone
                                  ? 'bg-green-50 text-green-700 border border-green-100'
                                  : 'bg-purple-50 text-purple-700 border border-purple-100'
                              }`}>
                                {itemTypeLabel}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${stock < 10 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {stock} {t.inStock}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg hover:bg-blue-50 text-blue-600"><Link href={`/inventory?search=${encodeURIComponent(item.name)}`}><History className="h-4 w-4" /></Link></Button>
                                <Button variant="ghost" size="icon" onClick={async () => {
                                  setEditingItem(item);
                                  setEditItemName(item.name);
                                  setEditItemPrice(item.price.toString());
                                  setEditItemCategory(item.category_id || '');
                                  // stock removed - managed in inventory_items table
                                  setIsEditingRecipe(isRecipeEntity);
                                  setEditInventoryItemSearch('');
                                  
                                  // Determine correct edit type based on actual type field
                                  let nextEditType: 'standalone' | 'recipe' | 'saleOnly';
                                  if (isRecipeEntity) {
                                    // Item from recipes table
                                    nextEditType = recipeHasIngredients[item.id] ? 'recipe' : 'saleOnly';
                                  } else {
                                    // Item from items table - check type field
                                    const itemType = (item as any).type;
                                    if (itemType === 'saleonly') {
                                      nextEditType = 'saleOnly';
                                    } else if (itemType === 'standalone') {
                                      nextEditType = 'standalone';
                                    } else {
                                      // Legacy items without type
                                      nextEditType = 'standalone';
                                    }
                                  }
                                  setEditItemType(nextEditType);
                                  if (isRecipeEntity) { 
                                    setEditStandaloneInventoryItemId('');
                                    await loadRecipeIngredients(item.id);
                                    await loadPortionsForEdit(item.id, true);
                                    if (nextEditType === 'saleOnly') {
                                      setEditHasPortions(false);
                                      setEditPortionRows([{ name: '', price: '', stock: '0', costPrice: '0' }]);
                                    }
                                  } else {
                                    // For standalone items, load the inventory_item_id
                                    setEditStandaloneInventoryItemId((item as any).inventory_item_id || '');
                                    setEditHasIngredients(false);
                                    setEditRecipeIngredients([]);
                                    await loadPortionsForEdit(item.id, false, (item as any).inventory_item_id || undefined);
                                  }
                                  setIsEditItemOpen(true);
                                }} className="h-8 w-8 rounded-lg hover:bg-zinc-100"><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id, isRecipeEntity ? 'Recipe' : 'Item')} className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        )
                      }))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-zinc-100 bg-zinc-50/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <span>{t.show}</span>
                  <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border-zinc-200 text-zinc-800 focus:ring-blue-500 h-8 px-2">
                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage <= 1} className="h-8 rounded-lg">{t.prev}</Button>
                  <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest px-4">{t.page} {safeCurrentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage >= totalPages} className="h-8 rounded-lg">{t.next}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card className="border-0 shadow-xl shadow-zinc-200/50 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/30 flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-xl font-bold text-zinc-800">{t.manageCategories}</CardTitle>
                <CardDescription className="text-zinc-500 font-medium">{t.organizeCategories}</CardDescription>
              </div>
              <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                <DialogTrigger asChild>
                  <Button className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 px-4 font-bold text-xs"><Plus className="mr-2 h-4 w-4" /> {t.addCategory}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                  <DialogHeader><DialogTitle className="text-xl font-bold">{t.addCategory}</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="catName">{t.name}</Label>
                      <Input id="catName" placeholder={t.enterCategoryName} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="h-11 rounded-xl" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)} className="rounded-xl h-11">{t.cancel}</Button>
                    <Button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11">{t.save}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-50 bg-blue-50/20 text-left text-blue-600">
                    <th className="p-4 font-bold">{t.name}</th>
                    <th className="p-4 font-bold">{t.itemsCount}</th>
                    <th className="p-4 font-bold text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {displayCategories.map((cat) => (
                    <tr key={cat.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                      <td className="p-4 font-bold text-zinc-800">{cat.name}</td>
                      <td className="p-4 text-zinc-500 font-medium">{displayItems.filter(i => i.category_id === cat.id).length} {t.itemsCount}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setEditCategoryName(cat.name); setIsEditCategoryOpen(true); }} className="h-8 w-8 rounded-lg hover:bg-zinc-100"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)} className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Category Edit Dialog Overlay */}
              <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                  <DialogHeader><DialogTitle className="font-bold">{t.editCategory}</DialogTitle></DialogHeader>
                  <div className="py-4"><Label className="mb-2 block">{t.name}</Label><Input value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} className="h-11 rounded-xl" /></div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditCategoryOpen(false)} className="rounded-xl h-11">{t.cancel}</Button>
                    <Button onClick={handleEditCategory} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11">{t.saveChanges}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}




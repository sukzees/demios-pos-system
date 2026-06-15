'use client';

import { useState, useEffect } from 'react';
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

const MOCK_ITEMS: Item[] = [
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

  // Search state for Linked Inventory Item dropdown
  const [inventoryItemSearch, setInventoryItemSearch] = useState('');
  const [editInventoryItemSearch, setEditInventoryItemSearch] = useState('');

  // Add Item Form State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemStock, setNewItemStock] = useState('0');
  const [newItemType, setNewItemType] = useState<'standalone' | 'recipe' | 'saleOnly'>('standalone');
  const [selectedStandaloneInventoryItemId, setSelectedStandaloneInventoryItemId] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemMinStock, setNewItemMinStock] = useState('0');
  const [recipeIngredients, setRecipeIngredients] = useState<{ ingredient_id: string; quantity_needed: number; unit: string }[]>([]);
  const [hasPortions, setHasPortions] = useState(false);
  const [portionRows, setPortionRows] = useState<{ name: string; price: string; stock: string; costPrice: string }[]>([{ name: '', price: '', stock: '0', costPrice: '0' }]);

  // Edit Item Form State
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemCategory, setEditItemCategory] = useState('');
  const [editItemStock, setEditItemStock] = useState('0');
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

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchItemsAndCategories();
      fetchRecipes();
      fetchPortionStocks();
    }
  }, [isSupabaseConfigured, fetchItemsAndCategories]);

  useEffect(() => {
    if (recipes.length > 0 && items.length > 0) {
      calculateAllRecipeStocks();
    }
  }, [recipes, items]);

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
    if (!newItemCategory || ((newItemType === 'recipe' || newItemType === 'saleOnly') && !newItemName.trim()) || (newItemType === 'recipe' && !hasPortions && !newItemPrice) || (newItemType === 'saleOnly' && !newItemPrice)) {
      alert(t.fillAllFields);
      return;
    }

    try {
      const validPortions = hasPortions
        ? portionRows.filter((row) => row.name.trim() && (parseFloat(row.price) || 0) > 0)
        : [];

      if (hasPortions && validPortions.length === 0) {
        alert(t.addPortionError);
        return;
      }

      if (newItemType === 'standalone') {
        const selectedInventoryItem = getStandaloneInventoryItems().find(item => item.id === selectedStandaloneInventoryItemId);
        if (!selectedInventoryItem) {
          alert(t.selectStandaloneInventory);
          return;
        }

        const priceToSave = hasPortions ? parseFloat(validPortions[0].price) : parseFloat(newItemPrice || String(selectedInventoryItem.price || 0));
        await editItem(selectedInventoryItem.id, {
          name: newItemName.trim() || selectedInventoryItem.name,
          price: priceToSave,
          category_id: newItemCategory,
          stock: selectedInventoryItem.stock || 0,
          is_recipe: true
        });
        await syncStandalonePortions(selectedInventoryItem.id, validPortions);
      } else if (newItemType === 'saleOnly') {
        const basePrice = parseFloat(newItemPrice);

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
        if (!data) throw new Error('Sale-only item was not created');
      } else if (recipeIngredients.length > 0) {
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
        if (data) {
          const ingredientsToInsert = recipeIngredients.map(ing => ({
            recipe_id: data.id,
            ingredient_id: ing.ingredient_id,
            quantity_needed: ing.quantity_needed,
            unit: ing.unit
          }));

          await supabase
            .from('recipe_ingredients')
            .insert(ingredientsToInsert);

          if (hasPortions && validPortions.length > 0) {
            await supabase
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
          }
        }
      } else {
        alert(t.fillAllFields);
        return;
      }

      setNewItemName('');
      setNewItemPrice('');
      setNewItemCategory('');
      setNewItemStock('0');
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
      console.error('Error adding item:', error);
      alert(`${t.errorAdding}: ${error.message}`);
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
      const { data, error } = await supabase
        .from('item_portions')
        .select('item_id, recipe_id, portion_stock');

      if (error) throw error;

      const totals: Record<string, number> = {};
      for (const row of data || []) {
        const productId = row.item_id || row.recipe_id;
        if (!productId) continue;
        totals[productId] = (totals[productId] || 0) + Number(row.portion_stock || 0);
      }
      setPortionStockByProduct(totals);
    } catch (error) {
      console.error('Error fetching portion stocks:', error);
      setPortionStockByProduct({});
    }
  };

  const loadPortionsForEdit = async (id: string, isRecipeEntity: boolean) => {
    if (!isSupabaseConfigured) {
      setEditHasPortions(false);
      setEditPortionRows([{ name: '', price: '', stock: '0', costPrice: '0' }]);
      return;
    }

    try {
      let query = supabase
        .from('item_portions')
        .select('portion_name, portion_price, portion_cost_price, portion_stock')
        .order('created_at', { ascending: true });

      query = isRecipeEntity ? query.eq('recipe_id', id) : query.eq('item_id', id);
      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        setEditHasPortions(true);
        setEditPortionRows(data.map((p: any) => ({
          name: String(p.portion_name || ''),
          price: String(p.portion_price ?? ''),
          costPrice: String(p.portion_cost_price ?? 0),
          stock: String(p.portion_stock ?? 0)
        })));
      } else {
        setEditHasPortions(false);
        setEditPortionRows([{ name: '', price: '', stock: '0', costPrice: '0' }]);
      }
    } catch {
      setEditHasPortions(false);
      setEditPortionRows([{ name: '', price: '', stock: '0', costPrice: '0' }]);
    }
  };

  const syncPortionsForEdit = async (id: string, isRecipeEntity: boolean, validPortions: { name: string; price: string; stock: string; costPrice: string }[]) => {
    if (!isSupabaseConfigured) return;

    try {
      const deleteQuery = supabase.from('item_portions').delete();
      const { error: deleteError } = isRecipeEntity
        ? await deleteQuery.eq('recipe_id', id)
        : await deleteQuery.eq('item_id', id);
      if (deleteError) throw deleteError;

      if (editHasPortions && validPortions.length > 0) {
        const payload = validPortions.map((portion) => ({
          item_id: isRecipeEntity ? null : id,
          recipe_id: isRecipeEntity ? id : null,
          portion_name: portion.name.trim(),
          portion_price: parseFloat(portion.price),
          portion_cost_price: parseFloat(portion.costPrice) || 0,
          portion_stock: parseInt(portion.stock) || 0,
        }));
        const { error: insertError } = await supabase.from('item_portions').insert(payload);
        if (insertError) throw insertError;
      }
    } catch (error: any) {
      console.warn('Failed to save portions:', error?.message || error);
    }
  };

  const loadPortionsForAdd = async (itemId: string) => {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('item_portions')
        .select('portion_name, portion_price, portion_cost_price, portion_stock')
        .eq('item_id', itemId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setHasPortions(true);
        setPortionRows(data.map((p: any) => ({
          name: String(p.portion_name || ''),
          price: String(p.portion_price ?? ''),
          costPrice: String(p.portion_cost_price ?? 0),
          stock: String(p.portion_stock ?? 0)
        })));
      } else {
        setHasPortions(false);
        setPortionRows([{ name: '', price: '', stock: '0', costPrice: '0' }]);
      }
    } catch {
      setHasPortions(false);
      setPortionRows([{ name: '', price: '', stock: '0', costPrice: '0' }]);
    }
  };

  const syncStandalonePortions = async (itemId: string, validPortions: { name: string; price: string; stock: string; costPrice: string }[]) => {
    if (!isSupabaseConfigured || !hasPortions) return;

    const { error: deleteError } = await supabase
      .from('item_portions')
      .delete()
      .eq('item_id', itemId);
    if (deleteError) throw deleteError;

    if (validPortions.length > 0) {
      const { error: insertError } = await supabase
        .from('item_portions')
        .insert(validPortions.map((portion) => ({
          item_id: itemId,
          recipe_id: null,
          portion_name: portion.name.trim(),
          portion_price: parseFloat(portion.price),
          portion_cost_price: parseFloat(portion.costPrice) || 0,
          portion_stock: parseInt(portion.stock) || 0,
        })));
      if (insertError) throw insertError;
    }
  };

  const getStandaloneInventoryItems = () => {
    // Standalone Inventory Items come from inventory_items table
    // They have type = 'standalone'
    const standaloneItems = items.filter(item => 
      item.type === 'standalone'
    );
    console.log('All items from inventory_items:', items);
    console.log('Standalone inventory items (type === standalone):', standaloneItems);
    return standaloneItems;
  };

  const getAvailableIngredients = () => {
    // Ingredients come from inventory_items table with type = 'ingredient'
    return items.filter(item => item.type === 'ingredient');
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
        return Math.floor((ingredientItem.stock || 0) / (ingredient.quantity_needed || 1));
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
    if (!editingItem || !editItemName || !editItemPrice || !editItemCategory) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const validEditPortions = editHasPortions
        ? editPortionRows.filter((row) => row.name.trim() && (parseFloat(row.price) || 0) > 0)
        : [];

      if (editHasPortions && validEditPortions.length === 0) {
        alert('Please add at least one valid portion with name and price.');
        return;
      }

      // Check if currently should be a recipe (based on editItemType)
      const shouldBeRecipe = editItemType === 'recipe' || editItemType === 'saleOnly';
      const wasRecipe = isEditingRecipe;

      if (shouldBeRecipe) {
        // Save as recipe
        const priceToSave = editHasPortions ? parseFloat(validEditPortions[0].price) : parseFloat(editItemPrice);
        
        if (wasRecipe) {
          // Update existing recipe
          await supabase.from('recipes').update({ name: editItemName, category_id: editItemCategory, price: priceToSave }).eq('id', editingItem.id);
        } else {
          // Convert standalone to recipe - need to delete from items and create in recipes
          await deleteItem(editingItem.id);
          const { data: newRecipe, error } = await supabase
            .from('recipes')
            .insert({
              name: editItemName,
              category_id: editItemCategory,
              price: priceToSave,
              is_recipe: true
            })
            .select()
            .single();
          
          if (error) throw error;
          if (newRecipe) {
            // Update editingItem id for portions sync
            editingItem.id = newRecipe.id;
          }
        }
        
        // Delete existing ingredients
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', editingItem.id);
        
        // Sale-only menu items intentionally have no ingredients, so they never deduct stock.
        if (editItemType === 'recipe' && editRecipeIngredients.length > 0) {
          await supabase.from('recipe_ingredients').insert(editRecipeIngredients.map(ing => ({
            recipe_id: editingItem.id, ingredient_id: ing.ingredient_id, quantity_needed: ing.quantity_needed, unit: ing.unit
          })));
        }
        
        await syncPortionsForEdit(editingItem.id, true, validEditPortions);
      } else {
        // Save as standalone item
        if (wasRecipe) {
          // Convert recipe to standalone - need to delete from recipes and link to inventory item
          await supabase.from('recipe_ingredients').delete().eq('recipe_id', editingItem.id);
          await supabase.from('recipes').delete().eq('id', editingItem.id);
          
          // Update the linked inventory item
          if (editStandaloneInventoryItemId) {
            const priceToSave = editHasPortions ? parseFloat(validEditPortions[0].price) : parseFloat(editItemPrice);
            await editItem(editStandaloneInventoryItemId, {
              name: editItemName,
              price: priceToSave,
              category_id: editItemCategory,
              is_recipe: true
            });
            await syncStandalonePortions(editStandaloneInventoryItemId, validEditPortions);
          }
        } else {
          // Update existing standalone item
          const priceToSave = editHasPortions ? parseFloat(validEditPortions[0].price) : parseFloat(editItemPrice);
          await editItem(editingItem.id, { name: editItemName, price: priceToSave, category_id: editItemCategory, stock: parseInt(editItemStock) || 0 });
          await syncPortionsForEdit(editingItem.id, false, validEditPortions);
        }
      }

      setIsEditItemOpen(false);
      setEditingItem(null);
      fetchItemsAndCategories();
      fetchRecipes();
      fetchPortionStocks();
    } catch (error: any) {
      console.error('Error editing item:', error);
      alert(`Error editing item: ${error.message}`);
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
          item.category_id !== undefined && item.category_id !== null
        )
        .map(item => ({ ...item, itemSource: 'standalone' as const }))
    : (isSupabaseConfigured ? [] : MOCK_ITEMS.map(item => ({ ...item, itemSource: 'standalone' as const })));
  const recipeItems = recipes.length > 0 ? recipes.map(recipe => ({ ...recipe, is_recipe: true, itemSource: 'recipe' as const })) : [];
  const displayItems = [...menuItems, ...recipeItems];
  
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
      const hasPortionStock = Object.prototype.hasOwnProperty.call(portionStockByProduct, item.id);
      const itemStock = hasPortionStock ? portionStockByProduct[item.id] : (isRecipeEntity ? (recipeStocks[item.id] || 0) : (item.stock || 0));
      
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
                    <Label>{t.linkInventoryItem}</Label>
                    <Select
                      value={selectedStandaloneInventoryItemId}
                      onValueChange={async (value) => {
                        const selectedItem = getStandaloneInventoryItems().find(item => item.id === value);
                        setSelectedStandaloneInventoryItemId(value);
                        if (selectedItem) {
                          setNewItemName(selectedItem.name);
                          setNewItemPrice(String(selectedItem.price ?? ''));
                          setNewItemCategory(selectedItem.category_id || newItemCategory);
                          await loadPortionsForAdd(selectedItem.id);
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
                        {getStandaloneInventoryItems()
                          .filter(item => 
                            item.name.toLowerCase().includes(inventoryItemSearch.toLowerCase())
                          )
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                          ))}
                        {getStandaloneInventoryItems().filter(item => 
                          item.name.toLowerCase().includes(inventoryItemSearch.toLowerCase())
                        ).length === 0 && (
                          <SelectItem value="no-results" disabled>
                            {currentLanguage === 'th' ? 'ไม่พบรายการที่ค้นหา' : currentLanguage === 'lo' ? 'ບໍ່ພົບລາຍການທີ່ຄົ້ນຫາ' : 'No results found'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {getStandaloneInventoryItems().length === 0 ? (
                      <p className="text-xs text-red-600">{t.noStandaloneInventoryItems}</p>
                    ) : (
                      <p className="text-xs text-emerald-700">{t.standaloneLinkHelp}</p>
                    )}
                  </div>
                )}
                {newItemType !== 'saleOnly' && (
                <div className="grid gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={hasPortions} onChange={(e) => setHasPortions(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    {t.hasPortions}
                  </label>
                  {hasPortions && (
                    <div className="space-y-3 p-4 rounded-xl border border-zinc-100 bg-zinc-50/50">
                      {portionRows.map((row, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2">
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
                            <div key={index} className="flex gap-2 items-center bg-white p-3 rounded-lg border border-zinc-200">
                              <Select value={ingredient.ingredient_id} onValueChange={(v) => updateRecipeIngredient(index, 'ingredient_id', v)}>
                                <SelectTrigger className="h-10 rounded-lg grow"><SelectValue placeholder={t.selectIngredient} /></SelectTrigger>
                                <SelectContent>{getAvailableIngredients().map(item => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))}</SelectContent>
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
                <Button onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11 px-6">{t.saveItem}</Button>
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
                          <Label>{t.linkInventoryItem}</Label>
                          <Select 
                            value={editStandaloneInventoryItemId} 
                            onValueChange={setEditStandaloneInventoryItemId}
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
                              {getStandaloneInventoryItems()
                                .filter(item => 
                                  item.name.toLowerCase().includes(editInventoryItemSearch.toLowerCase())
                                )
                                .length === 0 ? (
                                <SelectItem value="no-items" disabled>
                                  {editInventoryItemSearch 
                                    ? (currentLanguage === 'th' ? 'ไม่พบรายการที่ค้นหา' : currentLanguage === 'lo' ? 'ບໍ່ພົບລາຍການທີ່ຄົ້ນຫາ' : 'No results found')
                                    : t.noStandaloneInventoryItems
                                  }
                                </SelectItem>
                              ) : (
                                getStandaloneInventoryItems()
                                  .filter(item => 
                                    item.name.toLowerCase().includes(editInventoryItemSearch.toLowerCase())
                                  )
                                  .map((item) => (
                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                          {getStandaloneInventoryItems().length === 0 ? (
                            <p className="text-xs text-red-600">{t.noStandaloneInventoryItems}</p>
                          ) : (
                            <p className="text-xs text-emerald-700">{t.standaloneLinkHelp}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Portions Section */}
                      {editItemType !== 'saleOnly' && (
                      <div className="grid gap-2">
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <input type="checkbox" checked={editHasPortions} onChange={(e) => setEditHasPortions(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                          {t.hasPortions}
                        </label>
                        {editHasPortions && (
                          <div className="space-y-3 p-4 rounded-xl border border-zinc-100 bg-zinc-50/50">
                            {editPortionRows.map((row, index) => (
                              <div key={index} className="grid grid-cols-12 gap-2">
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

                      {/* Recipe Ingredients Section */}
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
                                  <div key={index} className="flex gap-2 items-center bg-white p-3 rounded-lg border border-zinc-200">
                                    <Select value={ingredient.ingredient_id} onValueChange={(v) => updateEditRecipeIngredient(index, 'ingredient_id', v)}>
                                      <SelectTrigger className="h-10 rounded-lg grow"><SelectValue placeholder={t.selectIngredient} /></SelectTrigger>
                                      <SelectContent>{getAvailableIngredients().map(item => (<SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>))}</SelectContent>
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
                      <Button onClick={handleEditItem} className="bg-blue-600 hover:bg-blue-700 rounded-xl h-11 px-6">{t.save}</Button>
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
                      {/* <th className="p-4 font-bold">{t.stock}</th> */}
                      <th className="p-4 font-bold text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {paginatedItems.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-zinc-500">{t.noItemsFound}</td></tr>
                    ) : (
                      paginatedItems.map((item) => {
                        const category = displayCategories.find(c => c.id === item.category_id);
                        const isRecipeEntity = (item as any).itemSource === 'recipe';
                        const hasIngredients = isRecipeEntity && recipeHasIngredients[item.id];
                        const itemTypeLabel = isRecipeEntity ? (hasIngredients ? t.ingredientsType : t.saleOnly) : t.standalone;
                        
                        const hasPortionStock = Object.prototype.hasOwnProperty.call(portionStockByProduct, item.id);
                        let stock = hasIngredients ? (recipeStocks[item.id] || 0) : (hasPortionStock ? portionStockByProduct[item.id] : (item.stock ?? 0));
                        return (
                          <tr key={item.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                            <td className="p-4 font-bold text-zinc-800">{item.name}</td>
                            <td className="p-4 text-zinc-500 font-medium">{category?.name || 'Unknown'}</td>
                            <td className="p-4 font-bold text-zinc-900">{formatCurrency(item.price, currencySettings)}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${isRecipeEntity ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                {itemTypeLabel}
                              </span>
                            </td>
                            {/* <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${stock < 10 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {stock} {t.inStock}
                              </span>
                            </td> */}
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg hover:bg-blue-50 text-blue-600"><Link href={`/inventory?search=${encodeURIComponent(item.name)}`}><History className="h-4 w-4" /></Link></Button>
                                <Button variant="ghost" size="icon" onClick={async () => {
                                  setEditingItem(item);
                                  setEditItemName(item.name);
                                  setEditItemPrice(item.price.toString());
                                  setEditItemCategory(item.category_id || '');
                                  setEditItemStock(String((item as any).stock ?? 0));
                                  setIsEditingRecipe(isRecipeEntity);
                                  setEditInventoryItemSearch('');
                                  const nextEditType = isRecipeEntity ? (recipeHasIngredients[item.id] ? 'recipe' : 'saleOnly') : 'standalone';
                                  setEditItemType(nextEditType);
                                  setEditStandaloneInventoryItemId(isRecipeEntity ? '' : item.id);
                                  if (isRecipeEntity) { 
                                    await loadRecipeIngredients(item.id);
                                    await loadPortionsForEdit(item.id, true);
                                    if (nextEditType === 'saleOnly') {
                                      setEditHasPortions(false);
                                      setEditPortionRows([{ name: '', price: '', stock: '0', costPrice: '0' }]);
                                    }
                                  } else {
                                    setEditStandaloneInventoryItemId(item.id);
                                    setEditHasIngredients(false);
                                    setEditRecipeIngredients([]);
                                    await loadPortionsForEdit(item.id, false);
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




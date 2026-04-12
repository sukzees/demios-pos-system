'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Minus, AlertTriangle, RefreshCw, History, Edit, Package, Trash2, Filter, ShoppingBag } from 'lucide-react';
import { usePosStore } from '@/lib/store';
import { Item, Category, InventoryTransaction, supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TranslationMap = Record<string, string>;

const TRANSLATIONS: Record<'en' | 'lo' | 'th', TranslationMap> = {
  en: {
    inventory: 'Inventory',
    categories: 'Categories',
    transactions: 'Transactions',
    searchInventory: 'Search inventory...',
    newItem: 'New Item',
    addCategory: 'Add Category',
    itemName: 'Item Name',
    category: 'Category',
    currentStock: 'Current Stock',
    type: 'Type',
    status: 'Status',
    actions: 'Actions',
    inStock: 'In Stock',
    lowStock: 'Low Stock',
    outOfStock: 'Out of Stock',
    standalone: 'Standalone',
    ingredient: 'Ingredient',
    addStock: 'Add Stock',
    subtractStock: 'Subtract Stock',
    confirm: 'Confirm',
    cancel: 'Cancel',
    categoryName: 'Category Name',
    items: 'Items',
    recentTransactions: 'Recent Transactions',
    filterByDate: 'Filter by Date',
    date: 'Date',
    item: 'Item',
    change: 'Change',
    notes: 'Notes',
    prev: 'Prev',
    next: 'Next',
    page: 'Page',
    of: 'of',
    show: 'Show',
    itemsPerPage: 'items per page',
    noItemsFound: 'No items found.',
    noCategoriesFound: 'No categories found.',
    noTransactionsFound: 'No transactions found.',
    customDateRange: 'Custom Date Range',
    fromDate: 'From Date',
    toDate: 'To Date',
    clear: 'Clear',
    apply: 'Apply',
    updateStockLevel: 'Update stock level for',
    quantityTo: 'Quantity to',
    add: 'add',
    subtract: 'subtract',
    optional: '(Optional)',
    confimAddition: 'Confirm Addition',
    confirmSubtraction: 'Confirm Subtraction',
    sale: 'Sale',
    inventoryManagement: 'Inventory Management',
    manage: 'Manage',
    saving: 'Saving...',
    saveCategory: 'Save Category',
    editInventoryCategory: 'Edit Inventory Category',
    deleteCategoryPrompt: 'Delete this inventory category? Items will remain and category will be cleared.',
    update: 'Update',
    refreshTransactions: 'Refresh Transactions',
    totalInventoryValue: 'Total Inventory Value',
    lowStockAlerts: 'Low Stock Alerts',
    itemsWithLowStock: 'Items with low stock level',
    addInventoryCategory: 'Add Inventory Category',
    createCategoryDesc: 'Create a category for Inventory Management.',
    manageCategoriesDesc: 'Edit or delete inventory categories.',
    updateStock: 'Update Stock',
    quantity: 'Quantity',
    reason: 'Reason/Notes',
    enterQuantity: 'Enter quantity',
    enterNotes: 'e.g. Received from supplier',
    failedUpdateStock: 'Failed to update stock. Please try again.',
    invalidQuantity: 'Please enter a valid quantity',
    failedSaveItem: 'Failed to save item. Please try again.',
    fillAllFields: 'Please fill in all required fields',
    addAtLeastOnePortion: 'Please add at least one valid portion with name and price.',
    addStockFor: 'Add Stock for',
    subtractStockFor: 'Subtract Stock for',
    standaloneDesc: 'Finished product that can be sold alone',
    ingredientDesc: 'Raw material or component used in products',
    unit: 'Unit',
    minStockLevel: 'Min Stock Alert Level',
    minStockPlaceholder: 'Trigger alert at this level',
    pcs: 'Pcs',
    kg: 'Kg',
    gram: 'Gram',
    liter: 'Liter',
    ml: 'Ml',
    pack: 'Pack',
    box: 'Box',
    itemPrice: 'Cost Price',
    namePlaceholder: 'e.g. Beef Patty',
    pricePlaceholder: '0.00',
    portions: 'Portions (Sizes/Weights)',
    enablePortions: 'Enable different portions/sizes (e.g. Small, Medium, Large)',
    portionName: 'Portion Name',
    sellingPriceShort: 'Sell Price',
    costPriceShort: 'Cost Price',
    addPortion: 'Add Portion',
    stockInTransactions: 'Stock In',
    stockOutTransactions: 'Stock Out',
    allTypes: 'All Types',
    enterCategoryName: 'Please enter category name',
    manageCategories: 'Manage Inventory Categories',
    saveChanges: 'Save Changes',
    editItem: 'Edit Item',
    updateItemDesc: 'Update item details and stock information.',
    addItemDesc: 'Add a new item to your inventory.',
    itemNamePlaceholder: 'e.g., Classic Burger, Tomatoes, Cheese',
    selectCategory: 'Select Category',
    initialStock: 'Initial Stock',
    selectUnit: 'Select unit',
    bottle: 'Bottle',
    note: 'Note',
    ingredientNoteDesc: 'Ingredients are used to track inventory for complex recipes. They won\'t appear as individual items in your main POS menu.',
    totalItemCost: 'Total Item Cost',
    totalPortionCost: 'Total Portion Cost',
    combinedValue: 'Combined Value',
    createItem: 'Create Item',
    updateCategoryDesc: 'Update category name for Inventory Management.',
    name: 'Name',
    updateItem: 'Update Item',
    stockUnitCost: 'Stock × Unit Cost',
    standaloneCost: 'Standalone cost',
    variablePortions: 'Variable portions',
    unitSumWorth: 'Unit sum worth',
    itemsNeedingAttention: 'Items needing attention',
  },
  lo: {
    inventory: 'ສິນຄ້າໃສ່ສາງ',
    categories: 'ໝວດໝູ່',
    transactions: 'ລາຍການເຄື່ອນໄຫວ',
    searchInventory: 'ຄົ້ນຫາສິນຄ້າ...',
    newItem: 'ເພີ່ມສິນຄ້າໃໝ່',
    addCategory: 'ເພີ່ມໝວດໝູ່',
    itemName: 'ຊື່ສິນຄ້າ',
    category: 'ໝວດໝູ່',
    currentStock: 'ຈຳນວນໃນສາງ',
    type: 'ປະເພດ',
    status: 'ສະຖານະ',
    actions: 'ການດຳເນີນການ',
    inStock: 'ມີໃນສາງ',
    lowStock: 'ໃກ້ໝົດ',
    outOfStock: 'ໝົດແລ້ວ',
    standalone: 'ຂາຍດຽວ',
    ingredient: 'ວັດຖຸດິບ',
    addStock: 'ເພີ່ມສິນຄ້າ',
    subtractStock: 'ຫຼຸດສິນຄ້າ',
    confirm: 'ຢືນຢັນ',
    cancel: 'ຍົກເລີກ',
    categoryName: 'ຊື່ໝວດໝູ່',
    items: 'ລາຍການ',
    recentTransactions: 'ລາຍການຫຼ້າສຸດ',
    filterByDate: 'ກັ່ນຕອງຕາມວັນທີ',
    date: 'ວັນທີ',
    item: 'ສິນຄ້າ',
    change: 'ການປ່ຽນແປງ',
    notes: 'ໝາຍເຫດ',
    prev: 'ກ່ອນໜ້າ',
    next: 'ຖັດໄປ',
    page: 'ໜ້າ',
    of: 'ຂອງ',
    show: 'ສະແດງ',
    itemsPerPage: 'ລາຍການຕໍ່ໜ້າ',
    noItemsFound: 'ບໍ່ພົບສິນຄ້າ',
    noCategoriesFound: 'ບໍ່ພົບໝວດໝູ່',
    noTransactionsFound: 'ບໍ່ພົບລາຍການເຄື່ອນໄຫວ',
    customDateRange: 'ຊ່ວງວັນທີ',
    fromDate: 'ຈາກວັນທີ',
    toDate: 'ຫາວັນທີ',
    clear: 'ລ້າງ',
    apply: 'ນຳໃຊ້',
    updateStockLevel: 'ອັບເດດລະດັບສິນຄ້າ',
    quantityTo: 'ຈຳນວນທີ່ຈະ',
    add: 'ເພີ່ມ',
    subtract: 'ຫຼຸດ',
    optional: '(ທາງເລືອກ)',
    confimAddition: 'ຢືນຢັນການເພີ່ມ',
    confirmSubtraction: 'ຢືນຢັນການຫຼຸດ',
    sale: 'ຂາຍ',
    inventoryManagement: 'ການຈັດການສິນຄ້າໃສ່ສາງ',
    manage: 'ຈັດການ',
    saving: 'ກຳລັງບັນທຶກ...',
    saveCategory: 'ບັນທຶກໝວດໝູ່',
    editInventoryCategory: 'ແກ້ໄຂໝວດໝູ່ສິນຄ້າ',
    deleteCategoryPrompt: 'ລຶບໝວດໝູ່ນີ້? ສິນຄ້າຈະຍັງຢູ່ແລະໝວດໝູ່ຈະຖືກລ້າງ',
    update: 'ອັບເດດ',
    refreshTransactions: 'ຣີເຟຣຊ',
    totalInventoryValue: 'ມູນຄ່າສິນຄ້າທັງໝົດ',
    lowStockAlerts: 'ແຈ້ງເຕືອນສິນຄ້າໃກ້ໝົດ',
    itemsWithLowStock: 'ສິນຄ້າທີ່ມີລະດັບຕ່ຳ',
    addInventoryCategory: 'ເພີ່ມໝວດໝູ່ສິນຄ້າ',
    createCategoryDesc: 'ສ້າງໝວດໝູ່ສຳລັບການຈັດການສິນຄ້າໃສ່ສາງ',
    manageCategoriesDesc: 'ແກ້ໄຂ ຫຼື ລຶບໝວດໝູ່ສິນຄ້າ',
    updateStock: 'ອັບເດດສິນຄ້າ',
    quantity: 'ຈຳນວນ',
    reason: 'ເຫດຜົນ/ໝາຍເຫດ',
    enterQuantity: 'ປ້ອນຈຳນວນ',
    enterNotes: 'ເຊັ່ນ: ຮັບມາຈາກຜູ້ສະໜອງ',
    failedUpdateStock: 'ອັບເດດສິນຄ້າບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.',
    invalidQuantity: 'ກະລຸນາປ້ອນຈຳນວນທີ່ຖືກຕ້ອງ',
    failedSaveItem: 'ບັນທຶກສິນຄ້າບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.',
    fillAllFields: 'ກະລຸນາປ້ອນຂໍ້ມູນທີ່ຈຳເປັນທັງໝົດ',
    addAtLeastOnePortion: 'ກະລຸນາເພີ່ມຢ່າງໜ້ອຍໜຶ່ງຂະໜາດທີ່ມີຊື່ ແລະ ລາຄາ.',
    addStockFor: 'ເພີ່ມສິນຄ້າສຳລັບ',
    subtractStockFor: 'ຫຼຸດສິນຄ້າສຳລັບ',
    standaloneDesc: 'ສິນຄ້າສຳເລັດຮູບທີ່ຂາຍດຽວໄດ້',
    ingredientDesc: 'ວັດຖຸດິບ ຫຼື ສ່ວນປະກອບທີ່ໃຊ້ໃນຜະລິດຕະພັນ',
    unit: 'ໜ່ວຍ',
    minStockLevel: 'ລະດັບແຈ້ງເຕືອນຕ່ຳສຸດ',
    minStockPlaceholder: 'ແຈ້ງເຕືອນເມື່ອຮອດລະດັບນີ້',
    pcs: 'ຊິ້ນ',
    kg: 'ກິໂລ',
    gram: 'ກຼາມ',
    liter: 'ລິດ',
    ml: 'ມິນລິດ',
    pack: 'ແພັກ',
    box: 'ກ່ອງ',
    itemPrice: 'ລາຄາຕົ້ນທຶນ',
    namePlaceholder: 'ເຊັ່ນ: ເນື້ອງົວ',
    pricePlaceholder: '0.00',
    portions: 'ຂະໜາດ (ໃຫຍ່/ນ້ອຍ)',
    enablePortions: 'ເປີດໃຊ້ງານຂະໜາດຕ່າງໆ (ເຊັ່ນ: ນ້ອຍ, ກາງ, ໃຫຍ່)',
    portionName: 'ຊື່ຂະໜາດ',
    sellingPriceShort: 'ລາຄາຂາຍ',
    costPriceShort: 'ລາຄາຕົ້ນທຶນ',
    addPortion: 'ເພີ່ມຂະໜາດ',
    stockInTransactions: 'ຮັບເຂົ້າ',
    stockOutTransactions: 'ເບີກອອກ',
    allTypes: 'ທຸກປະເພດ',
    enterCategoryName: 'ກະລຸນາປ້ອນຊື່ໝວດໝູ່',
    manageCategories: 'ຈັດການໝວດໝູ່ສິນຄ້າ',
    saveChanges: 'ບັນທຶກການປ່ຽນແປງ',
    editItem: 'ແກ້ໄຂສິນຄ້າ',
    updateItemDesc: 'ອັບເດດລາຍລະອຽດສິນຄ້າ ແລະ ຂໍ້ມູນສິນຄ້າໃສ່ສາງ.',
    addItemDesc: 'ເພີ່ມສິນຄ້າໃໝ່ໃສ່ສາງຂອງທ່ານ.',
    itemNamePlaceholder: 'ເຊັ່ນ: ເບີເກີຄລາສສິກ, ໝາກເລັ່ນ, ເນີຍ',
    selectCategory: 'ເລືອກໝວດໝູ່',
    initialStock: 'ສິນຄ້າເບື້ອງຕົ້ນ',
    selectUnit: 'ເລືອກໜ່ວຍ',
    bottle: 'ຂວດ',
    note: 'ໝາຍເຫດ',
    ingredientNoteDesc: 'ວັດຖຸດິບໃຊ້ສຳລັບຕິດຕາມສິນຄ້າໃສ່ສາງໃນສູດທີ່ຊັບຊ້ອນ. ຈະບໍ່ສະແດງເປັນລາຍການແຍກຕ່າງຫາກໃນເມນູ POS ຫຼັກ.',
    totalItemCost: 'ມູນຄ່າຕົ້ນທຶນສິນຄ້າທັງໝົດ',
    totalPortionCost: 'ມູນຄ່າຕົ້ນທຶນຂະໜາດທັງໝົດ',
    combinedValue: 'ມູນຄ່າລວມ',
    createItem: 'ສ້າງສິນຄ້າ',
    updateCategoryDesc: 'ອັບເດດຊື່ໝວດໝູ່ສຳລັບການຈັດການສິນຄ້າໃສ່ສາງ.',
    name: 'ຊື່',
    updateItem: 'ອັບເດດສິນຄ້າ',
    stockUnitCost: 'ສິນຄ້າ × ລາຄາຕົ້ນທຶນຕໍ່ໜ່ວຍ',
    standaloneCost: 'ຕົ້ນທຶນແຍກຕ່າງ',
    variablePortions: 'ຕົ້ນທຶນຂະໜາດຕ່າງໆ',
    unitSumWorth: 'ມູນຄ່າລວມຕໍ່ໜ່ວຍ',
    itemsNeedingAttention: 'ສິນຄ້າທີ່ຕ້ອງໃສ່ໃຈ',
  },
  th: {
    inventory: 'คลังสินค้า',
    categories: 'หมวดหมู่',
    transactions: 'ธุรกรรม',
    searchInventory: 'ค้นหาสินค้า...',
    newItem: 'เพิ่มสินค้าใหม่',
    addCategory: 'เพิ่มหมวดหมู่',
    itemName: 'ชื่อสินค้า',
    category: 'หมวดหมู่',
    currentStock: 'จำนวนในคลัง',
    type: 'ประเภท',
    status: 'สถานะ',
    actions: 'การดำเนินการ',
    inStock: 'มีในคลัง',
    lowStock: 'ใกล้หมด',
    outOfStock: 'หมดแล้ว',
    standalone: 'ขายเดี่ยว',
    ingredient: 'วัตถุดิบ',
    addStock: 'เพิ่มสินค้า',
    subtractStock: 'หักสินค้า',
    confirm: 'ยืนยัน',
    cancel: 'ยกเลิก',
    categoryName: 'ชื่อหมวดหมู่',
    items: 'รายการ',
    recentTransactions: 'รายการล่าสุด',
    filterByDate: 'กรองตามวันที่',
    date: 'วันที่',
    item: 'สินค้า',
    change: 'การเปลี่ยนแปลง',
    notes: 'หมายเหตุ',
    prev: 'ก่อนหน้า',
    next: 'ถัดไป',
    page: 'หน้า',
    of: 'ของ',
    show: 'แสดง',
    itemsPerPage: 'รายการต่อหน้า',
    noItemsFound: 'ไม่พบสินค้า',
    noCategoriesFound: 'ไม่พบหมวดหมู่',
    noTransactionsFound: 'ไม่พบรายการเคลื่อนไหว',
    customDateRange: 'ช่วงวันที่',
    fromDate: 'จากวันที่',
    toDate: 'ถึงวันที่',
    clear: 'ล้าง',
    apply: 'ใช้งาน',
    updateStockLevel: 'อัปเดตระดับสินค้า',
    quantityTo: 'จำนวนที่จะ',
    add: 'เพิ่ม',
    subtract: 'หัก',
    optional: '(ทางเลือก)',
    confimAddition: 'ยืนยันการเพิ่ม',
    confirmSubtraction: 'ยืนยันการหัก',
    sale: 'ขาย',
    inventoryManagement: 'การจัดการคลังสินค้า',
    manage: 'จัดการ',
    saving: 'กำลังบันทึก...',
    saveCategory: 'บันทึกหมวดหมู่',
    editInventoryCategory: 'แก้ไขหมวดหมู่สินค้า',
    deleteCategoryPrompt: 'ลบหมวดหมู่นี้? สินค้าจะยังอยู่และหมวดหมู่จะถูกล้าง',
    update: 'อัปเดต',
    refreshTransactions: 'รีเฟรช',
    totalInventoryValue: 'มูลค่าสินค้าทั้งหมด',
    lowStockAlerts: 'แจ้งเตือนสินค้าใกล้หมด',
    itemsWithLowStock: 'สินค้าที่มีระดับต่ำ',
    addInventoryCategory: 'เพิ่มหมวดหมู่สินค้า',
    createCategoryDesc: 'สร้างหมวดหมู่สำหรับการจัดการคลังสินค้า',
    manageCategoriesDesc: 'แก้ไข หรือ ลบหมวดหมู่สินค้า',
    updateStock: 'อัปเดตสินค้า',
    quantity: 'จำนวน',
    reason: 'เหตุผล/หมายเหตุ',
    enterQuantity: 'ป้อนจำนวน',
    enterNotes: 'เช่น: รับมาจากผู้ส่ง',
    failedUpdateStock: 'อัปเดตสินค้าไม่สำเร็จ กรุณาลองใหม่',
    invalidQuantity: 'กรุณาป้อนจำนวนที่ถูกต้อง',
    failedSaveItem: 'บันทึกสินค้าไม่สำเร็จ กรุณาลองใหม่',
    fillAllFields: 'กรุณาป้อนข้อมูลที่จำเป็นทั้งหมด',
    addAtLeastOnePortion: 'กรุณาเพิ่มอย่างน้อยหนึ่งขนาดที่มีชื่อและราคา',
    addStockFor: 'เพิ่มสินค้าสำหรับ',
    subtractStockFor: 'หักสินค้าสำหรับ',
    standaloneDesc: 'สินค้าสำเร็จรูปที่ขายเดี่ยวได้',
    ingredientDesc: 'วัตถุดิบหรือส่วนประกอบที่ใช้ในผลิตภัณฑ์',
    unit: 'หน่วย',
    minStockLevel: 'ระดับแจ้งเตือนต่ำสุด',
    minStockPlaceholder: 'แจ้งเตือนเมื่อถึงระดับนี้',
    pcs: 'ชิ้น',
    kg: 'กิโลกรัม',
    gram: 'กรัม',
    liter: 'ลิตร',
    ml: 'มิลลิลิตร',
    pack: 'แพ็ค',
    box: 'กล่อง',
    itemPrice: 'ราคาต้นทุน',
    namePlaceholder: 'เช่น: เนื้อวัว',
    pricePlaceholder: '0.00',
    portions: 'ขนาด (ใหญ่/เล็ก)',
    enablePortions: 'เปิดใช้งานขนาดต่างๆ (เช่น: เล็ก, กลาง, ใหญ่)',
    portionName: 'ชื่อขนาด',
    sellingPriceShort: 'ราคาขาย',
    costPriceShort: 'ราคาต้นทุน',
    addPortion: 'เพิ่มขนาด',
    stockInTransactions: 'รับเข้า',
    stockOutTransactions: 'เบิกออก',
    allTypes: 'ทุกประเภท',
    enterCategoryName: 'กรุณาป้อนชื่อหมวดหมู่',
    manageCategories: 'จัดการหมวดหมู่สินค้า',
    saveChanges: 'บันทึกการเปลี่ยนแปลง',
    editItem: 'แก้ไขสินค้า',
    updateItemDesc: 'อัปเดตรายละเอียดสินค้าและข้อมูลคลังสินค้า',
    addItemDesc: 'เพิ่มสินค้าใหม่ในคลังของคุณ',
    itemNamePlaceholder: 'เช่น: เบอร์เกอร์คลาสสิก, มะเขือเทศ, ชีส',
    selectCategory: 'เลือกหมวดหมู่',
    initialStock: 'สินค้าเบื้องต้น',
    selectUnit: 'เลือกหน่วย',
    bottle: 'ขวด',
    note: 'หมายเหตุ',
    ingredientNoteDesc: 'วัตถุดิบใช้สำหรับติดตามสินค้าในคลังในสูตรที่ซับซ้อน จะไม่แสดงเป็นรายการแยกในเมนู POS หลัก',
    totalItemCost: 'มูลค่าต้นทุนสินค้าทั้งหมด',
    totalPortionCost: 'มูลค่าต้นทุนขนาดทั้งหมด',
    combinedValue: 'มูลค่ารวม',
    createItem: 'สร้างสินค้า',
    updateCategoryDesc: 'อัปเดตชื่อหมวดหมู่สำหรับการจัดการคลังสินค้า',
    name: 'ชื่อ',
    updateItem: 'อัปเดตสินค้า',
    stockUnitCost: 'สินค้า × ราคาต้นทุนต่อหน่วย',
    standaloneCost: 'ต้นทุนแยกต่างหาก',
    variablePortions: 'ต้นทุนขนาดต่างๆ',
    unitSumWorth: 'มูลค่ารวมต่อหน่วย',
    itemsNeedingAttention: 'สินค้าที่ต้องใส่ใจ',
  }
};

const MOCK_INVENTORY_CATEGORIES: Category[] = [
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

function InventoryContent() {
  const { isSupabaseConfigured, updateItemStock, currencySettings, generalSettings, licenseApiData } = usePosStore();
  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = { ...TRANSLATIONS.en, ...TRANSLATIONS[currentLanguage] };
  const [items, setItems] = useState<any[]>([]);
  const [inventoryCategories, setInventoryCategories] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    inventory_category_id: '',
    stock: '',
    itemType: 'ingredient' as 'ingredient' | 'standalone',
    unit: 'pcs',
    min_stock: '0'
  });
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasPortions, setHasPortions] = useState(false);
  const [portionRows, setPortionRows] = useState<{ name: string; price: string; stock: string; sellingPrice: string }[]>([{ name: '', price: '', stock: '0', sellingPrice: '0' }]);
  const [portionStockByItemId, setPortionStockByItemId] = useState<Record<string, number>>({});
  const [portionsByItemId, setPortionsByItemId] = useState<Record<string, {name: string, stock: number}[]>>({});
  const [portionCostByItemId, setPortionCostByItemId] = useState<Record<string, number>>({});
  const [portionValueByItemId, setPortionValueByItemId] = useState<Record<string, number>>({});
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);
  const [inventoryPageSize, setInventoryPageSize] = useState(10);
  const [transactionsCurrentPage, setTransactionsCurrentPage] = useState(1);
  const [transactionsPageSize, setTransactionsPageSize] = useState(10);
  const [isTransactionFilterOpen, setIsTransactionFilterOpen] = useState(false);
  const [transactionsDateFrom, setTransactionsDateFrom] = useState('');
  const [transactionsDateTo, setTransactionsDateTo] = useState('');
  const [isStockUpdateDialogOpen, setIsStockUpdateDialogOpen] = useState(false);
  const [selectedItemForStockUpdate, setSelectedItemForStockUpdate] = useState<any>(null);
  const [stockUpdateQuantity, setStockUpdateQuantity] = useState('1');
  const [stockUpdateType, setStockUpdateType] = useState<'add' | 'subtract'>('add');
  const [stockUpdateNotes, setStockUpdateNotes] = useState('');

  const fetchItemsAndCategoriesLocal = async () => {
    if (isSupabaseConfigured) {
      try {
        const [itemsRes, categoriesRes, portionsRes] = await Promise.all([
          supabase.from('items').select('*').order('created_at', { ascending: false }),
          supabase.from('inventory_categories').select('*').order('name'),
          supabase.from('item_portions').select('item_id, portion_name, portion_stock, portion_cost_price, portion_price')
        ]);

        if (itemsRes.data) setItems(itemsRes.data);
        if (categoriesRes.data) setInventoryCategories(categoriesRes.data);
        if (portionsRes.data) {
          const totals: Record<string, number> = {};
          const costTotals: Record<string, number> = {};
          const valueTotals: Record<string, number> = {};
          const portionsMap: Record<string, {name: string, stock: number}[]> = {};
          for (const row of portionsRes.data as any[]) {
            if (!row.item_id) continue;
            const stock = Number(row.portion_stock || 0);
            const cost = Number(row.portion_cost_price ?? row.portion_price ?? 0);

            totals[row.item_id] = (totals[row.item_id] || 0) + stock;
            costTotals[row.item_id] = (costTotals[row.item_id] || 0) + cost;
            valueTotals[row.item_id] = (valueTotals[row.item_id] || 0) + (stock * cost);
            
            if (!portionsMap[row.item_id]) portionsMap[row.item_id] = [];
            portionsMap[row.item_id].push({ name: row.portion_name, stock });
          }
          setPortionStockByItemId(totals);
          setPortionsByItemId(portionsMap);
          setPortionCostByItemId(costTotals);
          setPortionValueByItemId(valueTotals);
        } else {
          setPortionStockByItemId({});
          setPortionsByItemId({});
          setPortionCostByItemId({});
          setPortionValueByItemId({});
        }
      } catch (error) {
        // Error fetching data
      }
    } else {
      setItems(MOCK_ITEMS);
      setInventoryCategories(MOCK_INVENTORY_CATEGORIES);
      setPortionStockByItemId({});
      setPortionsByItemId({});
      setPortionCostByItemId({});
      setPortionValueByItemId({});
    }
  };

  const fetchTransactions = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    setIsLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) setTransactions(data);
    } catch (error) {
      // Error fetching transactions
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [isSupabaseConfigured]);

  useEffect(() => {
    fetchItemsAndCategoriesLocal();
    if (isSupabaseConfigured) {
      fetchTransactions();
    }
  }, [isSupabaseConfigured, fetchTransactions]);

  const displayInventoryCategories = inventoryCategories.length > 0 ? inventoryCategories : (isSupabaseConfigured ? [] : MOCK_INVENTORY_CATEGORIES);
  const displayItems = items.length > 0 ? items : (isSupabaseConfigured ? [] : MOCK_ITEMS);

  const filteredItems = displayItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const inventoryTotalPages = Math.max(1, Math.ceil(filteredItems.length / inventoryPageSize));
  const safeInventoryCurrentPage = Math.min(inventoryCurrentPage, inventoryTotalPages);
  const paginatedInventoryItems = filteredItems.slice(
    (safeInventoryCurrentPage - 1) * inventoryPageSize,
    safeInventoryCurrentPage * inventoryPageSize
  );
  const filteredTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.created_at);
    const fromDate = transactionsDateFrom ? new Date(`${transactionsDateFrom}T00:00:00`) : null;
    const toDate = transactionsDateTo ? new Date(`${transactionsDateTo}T23:59:59`) : null;
    const matchesFrom = !fromDate || transactionDate >= fromDate;
    const matchesTo = !toDate || transactionDate <= toDate;
    return matchesFrom && matchesTo;
  });
  const transactionsTotalPages = Math.max(1, Math.ceil(filteredTransactions.length / transactionsPageSize));
  const safeTransactionsCurrentPage = Math.min(transactionsCurrentPage, transactionsTotalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (safeTransactionsCurrentPage - 1) * transactionsPageSize,
    safeTransactionsCurrentPage * transactionsPageSize
  );

  useEffect(() => {
    setInventoryCurrentPage(1);
  }, [searchQuery, inventoryPageSize]);

  useEffect(() => {
    setTransactionsCurrentPage(1);
  }, [transactionsPageSize, transactionsDateFrom, transactionsDateTo]);

  const totalItemCostPrice = displayItems.reduce((sum, item) => sum + Number((item as any).cost_price ?? item.price ?? 0), 0);
  const totalPortionCostPrice = Object.values(portionCostByItemId).reduce((sum, value) => sum + Number(value || 0), 0);
  const combinedCostPrice = totalItemCostPrice + totalPortionCostPrice;

  // New calculation: Total Inventory Value (Current Stock * Cost Price)
  const totalInventoryValue = displayItems.reduce((sum, item) => {
    const hasPortions = Object.prototype.hasOwnProperty.call(portionStockByItemId, item.id);
    if (hasPortions) {
      return sum + (portionValueByItemId[item.id] || 0);
    }
    return sum + (Number((item as any).cost_price ?? item.price ?? 0) * (item.stock || 0));
  }, 0);

  const lowStockCount = displayItems.reduce((count, item) => {
    const hasPortionStock = Object.prototype.hasOwnProperty.call(portionStockByItemId, item.id);
    const stock = hasPortionStock ? portionStockByItemId[item.id] : (item.stock || 0);
    const minStockAlert = Math.max(0, Number((item as any).min_stock ?? 10));
    return (stock > 0 || hasPortionStock) && stock <= minStockAlert ? count + 1 : count;
  }, 0);

  const handleUpdateStock = async (item: any, change: number, notes?: string) => {
    const currentStock = item.stock || 0;
    const newStock = Math.max(0, currentStock + change);

    try {
      await updateItemStock(item.id, newStock, notes);

      // Refresh items list
      setTimeout(fetchItemsAndCategoriesLocal, 500);
    } catch (error) {
      alert(t.failedUpdateStock || 'Failed to update stock. Please try again.');
    }
  };

  const openStockUpdateDialog = (item: any, type: 'add' | 'subtract') => {
    setSelectedItemForStockUpdate(item);
    setStockUpdateType(type);
    setStockUpdateQuantity('1');
    setStockUpdateNotes('');
    setIsStockUpdateDialogOpen(true);
  };

  const handleQuickUpdateStock = async () => {
    if (!selectedItemForStockUpdate) return;
    const qty = parseFloat(stockUpdateQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert(t.invalidQuantity || 'Please enter a valid quantity');
      return;
    }

    const change = stockUpdateType === 'add' ? qty : -qty;
    await handleUpdateStock(selectedItemForStockUpdate, change, stockUpdateNotes);
    setIsStockUpdateDialogOpen(false);
  };

  const loadItemPortions = async (itemId: string) => {
    if (!isSupabaseConfigured) {
      setHasPortions(false);
      setPortionRows([{ name: '', price: '', stock: '0', sellingPrice: '0' }]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('item_portions')
        .select('portion_name, portion_cost_price, portion_price, portion_stock')
        .eq('item_id', itemId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setHasPortions(true);
        setPortionRows(data.map((p: any) => ({
          name: String(p.portion_name || ''),
          price: String(p.portion_cost_price ?? p.portion_price ?? ''),
          sellingPrice: String(p.portion_price ?? 0),
          stock: String(p.portion_stock ?? 0)
        })));
      } else {
        setHasPortions(false);
        setPortionRows([{ name: '', price: '', stock: '0', sellingPrice: '0' }]);
      }
    } catch {
      setHasPortions(false);
      setPortionRows([{ name: '', price: '', stock: '0', sellingPrice: '0' }]);
    }
  };

  const syncItemPortions = async (itemId: string, validPortions: { name: string; price: string; stock: string; sellingPrice: string }[]) => {
    if (!isSupabaseConfigured) return;

    try {
      await supabase.from('item_portions').delete().eq('item_id', itemId);
      if (hasPortions && validPortions.length > 0) {
        const { error } = await supabase
          .from('item_portions')
          .insert(
            validPortions.map((portion) => ({
              item_id: itemId,
              portion_name: portion.name.trim(),
              portion_cost_price: parseFloat(portion.price),
              portion_price: parseFloat(portion.sellingPrice) || 0,
              portion_stock: parseInt(portion.stock) || 0
            }))
          );
        if (error) throw error;
      }
    } catch (error: any) {
      console.warn('Failed to save portions:', error?.message || error);
    }
  };

  const handleSaveItem = async () => {
    if (!newItem.name || !newItem.inventory_category_id || (editingId ? !newItem.price : (!hasPortions && !newItem.price))) {
      alert(t.fillAllFields || 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const validPortions = hasPortions
        ? portionRows.filter((row) => row.name.trim() && (parseFloat(row.price) || 0) > 0)
        : [];

      if (hasPortions && validPortions.length === 0) {
        alert(t.addAtLeastOnePortion || 'Please add at least one valid portion with name and price.');
        return;
      }

      if (editingId) {
        // Update existing item
        const { error } = await supabase
          .from('items')
          .update({
            name: newItem.name,
            cost_price: parseFloat(newItem.price),
            inventory_category_id: newItem.inventory_category_id,
            stock: parseInt(newItem.stock) || 0,
            is_recipe: newItem.itemType === 'standalone',
            min_stock: Math.max(0, parseInt(newItem.min_stock) || 0)
          })
          .eq('id', editingId);

        if (error) throw error;
        await syncItemPortions(editingId, validPortions);
      } else {
        // Keep one product and attach portions metadata; do not split into separate items.
        const basePrice = parseFloat(newItem.price);

        if (isSupabaseConfigured) {
          const stock = parseInt(newItem.stock) || 0;
          const { data, error } = await supabase
            .from('items')
            .insert({
              name: newItem.name,
              price: basePrice,
              cost_price: parseFloat(newItem.price),
              category_id: null,
              inventory_category_id: newItem.inventory_category_id,
              stock,
              image_url: '',
              is_recipe: newItem.itemType === 'standalone',
              min_stock: Math.max(0, parseInt(newItem.min_stock) || 0)
            })
            .select()
            .single();

          if (error) throw error;

          await syncItemPortions(data.id, validPortions);
          if (stock > 0) {
            await supabase.from('inventory_transactions').insert({
              item_id: data.id,
              quantity_change: stock,
              transaction_type: 'restock',
              notes: 'Initial stock'
            });
          }
        } else {
          setItems((prev) => [
            {
              id: `local-${Date.now()}`,
              name: newItem.name,
              price: basePrice,
              cost_price: parseFloat(newItem.price),
              inventory_category_id: newItem.inventory_category_id,
              stock: parseInt(newItem.stock) || 0,
              image_url: '',
              is_recipe: newItem.itemType === 'standalone',
              min_stock: Math.max(0, parseInt(newItem.min_stock) || 0),
              created_at: new Date().toISOString()
            },
            ...prev
          ]);
        }
      }

      setIsDialogOpen(false);
      resetForm();
      // Refresh list
      setTimeout(fetchItemsAndCategoriesLocal, 500);
    } catch (error) {
      alert(t.failedSaveItem || 'Failed to save item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = async (item: any) => {
    setNewItem({
      name: item.name,
      price: String((item as any).cost_price ?? item.price ?? ''),
      inventory_category_id: String((item as any).inventory_category_id ?? ''),
      stock: (item.stock || 0).toString(),
      itemType: item.is_recipe ? 'standalone' : 'ingredient',
      unit: 'pcs',
      min_stock: String((item as any).min_stock ?? 10)
    });
    await loadItemPortions(item.id);
    setEditingId(item.id);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setNewItem({
      name: '',
      price: '',
      inventory_category_id: '',
      stock: '',
      itemType: 'ingredient',
      unit: 'pcs',
      min_stock: '0'
    });
    setHasPortions(false);
    setPortionRows([{ name: '', price: '', stock: '0', sellingPrice: '0' }]);
    setEditingId(null);
  };

  const handleAddInventoryCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      alert(t.enterCategoryName || 'Please enter category name');
      return;
    }

    setIsSavingCategory(true);

    if (!isSupabaseConfigured) {
      setInventoryCategories((prev) => [
        ...prev,
        { id: `local-cat-${Date.now()}`, name, created_at: new Date().toISOString() }
      ]);
      setIsCategoryDialogOpen(false);
      setNewCategoryName('');
      setIsSavingCategory(false);
      return;
    }

    try {
      const { error } = await supabase.from('inventory_categories').insert({ name });
      if (error) throw error;
      await fetchItemsAndCategoriesLocal();
      setIsCategoryDialogOpen(false);
      setNewCategoryName('');
    } catch (error: any) {
      alert(error?.message || 'Failed to add inventory category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleOpenEditCategory = (category: any) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(String(category.name || ''));
    setIsEditCategoryDialogOpen(true);
  };

  const handleUpdateInventoryCategory = async () => {
    const name = editCategoryName.trim();
    if (!editingCategoryId || !name) {
      alert(t.enterCategoryName || 'Please enter category name');
      return;
    }

    setIsUpdatingCategory(true);
    if (!isSupabaseConfigured) {
      setInventoryCategories((prev) => prev.map((c) => (
        c.id === editingCategoryId ? { ...c, name } : c
      )));
      setIsEditCategoryDialogOpen(false);
      setEditingCategoryId(null);
      setEditCategoryName('');
      setIsUpdatingCategory(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('inventory_categories')
        .update({ name })
        .eq('id', editingCategoryId);
      if (error) throw error;
      await fetchItemsAndCategoriesLocal();
      setIsEditCategoryDialogOpen(false);
      setEditingCategoryId(null);
      setEditCategoryName('');
    } catch (error: any) {
      alert(error?.message || 'Failed to update inventory category');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleDeleteInventoryCategory = async (categoryId: string) => {
    const confirmed = window.confirm(t.deleteCategoryPrompt || 'Delete this inventory category? Items will remain and category will be cleared.');
    if (!confirmed) return;

    if (!isSupabaseConfigured) {
      setInventoryCategories((prev) => prev.filter((c) => c.id !== categoryId));
      setItems((prev) => prev.map((item) => (
        ((item as any).inventory_category_id === categoryId)
          ? { ...item, inventory_category_id: null }
          : item
      )));
      return;
    }

    try {
      const { error } = await supabase
        .from('inventory_categories')
        .delete()
        .eq('id', categoryId);
      if (error) throw error;
      await fetchItemsAndCategoriesLocal();
    } catch (error: any) {
      alert(error?.message || 'Failed to delete inventory category');
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-8 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.inventoryManagement}</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="grid grid-cols-2 lg:flex items-center gap-2">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-12 rounded-xl text-sm font-semibold border-zinc-200">
                  <Plus className="mr-2 h-4 w-4" /> {t.category}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{t.addInventoryCategory}</DialogTitle>
                  <DialogDescription>
                    {t.createCategoryDesc}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="inventory-category-name">{t.categoryName}</Label>
                    <Input
                      id="inventory-category-name"
                      placeholder={t.namePlaceholder}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                    {t.cancel}
                  </Button>
                  <Button onClick={handleAddInventoryCategory} disabled={isSavingCategory}>
                    {isSavingCategory ? t.saving : t.saveCategory}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-12 rounded-xl text-sm font-semibold border-zinc-200">
                  {t.manage}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{t.manageCategories}</DialogTitle>
                  <DialogDescription>
                    {t.manageCategoriesDesc}
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[300px] overflow-auto py-4 space-y-2">
                  {inventoryCategories.length === 0 ? (
                    <div className="text-center text-zinc-500 py-4">{t.noCategoriesFound}</div>
                  ) : (
                    inventoryCategories.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 bg-zinc-50/50">
                        <span className="font-medium text-sm">{cat.name}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-500"
                            onClick={() => handleOpenEditCategory(cat)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteInventoryCategory(cat.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="h-12 rounded-xl text-sm font-semibold border-zinc-200"
              onClick={fetchTransactions}
              title={t.refreshTransactions}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingTransactions ? 'animate-spin' : ''}`} />
              {t.refreshTransactions}
            </Button>
          </div>

          <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t.editInventoryCategory}</DialogTitle>
                <DialogDescription>
                  {t.updateCategoryDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-inventory-category-name">{t.categoryName}</Label>
                  <Input
                    id="edit-inventory-category-name"
                    placeholder={t.namePlaceholder}
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
                  {t.cancel}
                </Button>
                <Button onClick={handleUpdateInventoryCategory} disabled={isUpdatingCategory}>
                  {isUpdatingCategory ? t.saving : t.saveChanges}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-all">
                <Plus className="mr-2 h-4 w-4" /> {t.newItem}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingId ? t.editItem : t.newItem}</DialogTitle>
                <DialogDescription>
                  {editingId ? t.updateItemDesc : t.addItemDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-sm font-bold text-zinc-700 ml-1">
                    {t.itemName}
                  </Label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="h-11 rounded-xl border-zinc-200 shadow-sm focus:ring-blue-500"
                    placeholder={t.itemNamePlaceholder}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price" className="text-sm font-bold text-zinc-700 ml-1">
                      {t.itemPrice}
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                      className="h-11 rounded-xl border-zinc-200 shadow-sm"
                      placeholder={t.pricePlaceholder}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inventory_category" className="text-sm font-bold text-zinc-700 ml-1">
                      {t.category}
                    </Label>
                    <Select
                      value={newItem.inventory_category_id}
                      onValueChange={(value) => setNewItem({ ...newItem, inventory_category_id: value })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-zinc-200 shadow-sm">
                        <SelectValue placeholder={t.selectCategory} />
                      </SelectTrigger>
                      <SelectContent>
                        {displayInventoryCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stock" className="text-sm font-bold text-zinc-700 ml-1">
                      {t.initialStock}
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      value={newItem.stock}
                      onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
                      className="h-11 rounded-xl border-zinc-200 shadow-sm"
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="min_stock" className="text-sm font-bold text-zinc-700 ml-1 text-rose-600">
                      {t.minStockLevel}
                    </Label>
                    <Input
                      id="min_stock"
                      type="number"
                      value={newItem.min_stock}
                      onChange={(e) => setNewItem({ ...newItem, min_stock: e.target.value })}
                      className="h-11 rounded-xl border-zinc-200 shadow-sm"
                      placeholder={t.minStockPlaceholder}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="unit" className="text-sm font-bold text-zinc-700 ml-1">
                    {t.unit}
                  </Label>
                  <Select
                    value={newItem.unit}
                    onValueChange={(value) => setNewItem({ ...newItem, unit: value })}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-zinc-200 shadow-sm">
                      <SelectValue placeholder={t.selectUnit} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">{t.pcs}</SelectItem>
                      <SelectItem value="kg">{t.kg}</SelectItem>
                      <SelectItem value="g">{t.gram}</SelectItem>
                      <SelectItem value="l">{t.liter}</SelectItem>
                      <SelectItem value="ml">{t.ml}</SelectItem>
                      <SelectItem value="box">{t.box}</SelectItem>
                      <SelectItem value="bottle">{t.bottle}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 pt-2 border-t border-zinc-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold text-zinc-700 ml-1">{t.portions}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="has-portions-toggle"
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        checked={hasPortions}
                        onChange={(e) => setHasPortions(e.target.checked)}
                      />
                      <Label htmlFor="has-portions-toggle" className="text-xs font-medium text-zinc-500 cursor-pointer">{t.enablePortions}</Label>
                    </div>
                  </div>

                  {hasPortions && (
                    <div className="space-y-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 transition-all">
                      <div className="space-y-3">
                        {portionRows.map((row, index) => (
                          <div key={index} className="grid grid-cols-12 gap-3 pb-3 border-b border-zinc-200/50 last:border-0 last:pb-0">
                            <div className="col-span-12 xs:col-span-5 grid gap-1.5">
                              <Label className="text-[10px] font-bold text-zinc-400 ml-1 uppercase">{t.name}</Label>
                              <Input
                                className="h-10 rounded-xl border-zinc-200 shadow-sm"
                                placeholder="e.g. Small"
                                value={row.name}
                                onChange={(e) => setPortionRows(prev => prev.map((p, i) => i === index ? { ...p, name: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-6 xs:col-span-3 grid gap-1.5">
                              <Label className="text-[10px] font-bold text-zinc-400 ml-1 uppercase">{t.costPriceShort}</Label>
                              <Input
                                className="h-10 rounded-xl border-zinc-200 shadow-sm"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={row.price}
                                onChange={(e) => setPortionRows(prev => prev.map((p, i) => i === index ? { ...p, price: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-6 xs:col-span-2 grid gap-1.5">
                              <Label className="text-[10px] font-bold text-zinc-400 ml-1 uppercase">{t.currentStock}</Label>
                              <Input
                                className="h-10 rounded-xl border-zinc-200 shadow-sm"
                                type="number"
                                placeholder="Qty"
                                value={row.stock}
                                onChange={(e) => setPortionRows(prev => prev.map((p, i) => i === index ? { ...p, stock: e.target.value } : p))}
                              />
                            </div>
                            <div className="col-span-12 xs:col-span-2 flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full h-10 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setPortionRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-10 rounded-xl border-dashed border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-all font-semibold"
                        onClick={() => setPortionRows(prev => [...prev, { name: '', price: '', stock: '0', sellingPrice: '0' }])}
                      >
                        <Plus className="h-3 w-3 mr-2" /> {t.addPortion}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 pt-2">
                  <Label className="text-sm font-bold text-zinc-700 ml-1">{t.type}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, itemType: 'ingredient' })}
                      className={`group relative rounded-2xl border p-4 text-left transition-all ${newItem.itemType === 'ingredient'
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10'
                          : 'border-zinc-200 hover:border-blue-300 hover:bg-zinc-50'
                        }`}
                    >
                      <div className={`h-8 w-8 rounded-full mb-2 flex items-center justify-center transition-colors ${newItem.itemType === 'ingredient' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                        }`}>
                        <Package className="h-4 w-4" />
                      </div>
                      <div className={`text-sm font-bold ${newItem.itemType === 'ingredient' ? 'text-blue-900' : 'text-zinc-700'}`}>{t.ingredient}</div>
                      <div className="text-[10px] text-zinc-500 mt-1 font-medium leading-tight">{t.ingredientDesc}</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, itemType: 'standalone' })}
                      className={`group relative rounded-2xl border p-4 text-left transition-all ${newItem.itemType === 'standalone'
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/10'
                          : 'border-zinc-200 hover:border-emerald-300 hover:bg-zinc-50'
                        }`}
                    >
                      <div className={`h-8 w-8 rounded-full mb-2 flex items-center justify-center transition-colors ${newItem.itemType === 'standalone' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                        }`}>
                        <ShoppingBag className="h-4 w-4" />
                      </div>
                      <div className={`text-sm font-bold ${newItem.itemType === 'standalone' ? 'text-emerald-900' : 'text-zinc-700'}`}>{t.standalone}</div>
                      <div className="text-[10px] text-zinc-500 mt-1 font-medium leading-tight">{t.standaloneDesc}</div>
                    </button>
                  </div>
                </div>

                {newItem.itemType === 'ingredient' && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-sm text-blue-900">
                      <AlertTriangle className="h-4 w-4 text-blue-500" />
                      <span className="font-bold">{t.note}:</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-2 leading-relaxed">
                      {t.ingredientNoteDesc}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter className="pt-2 border-t border-zinc-100">
                <Button
                  type="submit"
                  onClick={handleSaveItem}
                  disabled={isLoading}
                  className="w-full sm:w-auto h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100"
                >
                  {isLoading ? t.saving : (editingId ? t.updateItem : t.createItem)}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm overflow-hidden text-emerald-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t.totalInventoryValue}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInventoryValue, currencySettings)}</div>
              <p className="text-xs italic opacity-70">{t.stockUnitCost}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50 shadow-sm overflow-hidden text-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t.totalItemCost}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalItemCostPrice, currencySettings)}</div>
              <p className="text-xs italic opacity-70">{t.standaloneCost}</p>
            </CardContent>
          </Card>
          <Card className="border-violet-200 bg-violet-50/50 shadow-sm overflow-hidden text-violet-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t.totalPortionCost}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPortionCostPrice, currencySettings)}</div>
              <p className="text-xs italic opacity-70">{t.variablePortions}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50 shadow-sm overflow-hidden text-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t.combinedValue}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(combinedCostPrice, currencySettings)}</div>
              <p className="text-xs italic opacity-70">{t.unitSumWorth}</p>
            </CardContent>
          </Card>
          <Card className="border-rose-200 bg-rose-50/50 shadow-sm overflow-hidden text-rose-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t.lowStockAlerts}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockCount}</div>
              <p className="text-xs italic opacity-70">{t.itemsNeedingAttention}</p>
            </CardContent>
          </Card>
        </div>


        <TabsList>
          <TabsTrigger value="inventory">{t.items}</TabsTrigger>
          <TabsTrigger value="categories">{t.categories}</TabsTrigger>
          <TabsTrigger value="transactions">{t.transactions}</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card className="border-zinc-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-zinc-800">{t.items}</CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder={t.searchInventory}
                  className="pl-9 border-zinc-200 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-50 bg-blue-50/20 text-left text-blue-600">
                      <th className="p-4 font-semibold">{t.itemName}</th>
                      <th className="p-4 font-semibold">{t.category}</th>
                      <th className="p-4 font-semibold">{t.currentStock}</th>
                      <th className="p-4 font-semibold">{t.type}</th>
                      <th className="p-4 font-semibold">{t.status}</th>
                      <th className="p-4 font-semibold text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500">
                          {t.noItemsFound}
                        </td>
                      </tr>
                    ) : (
                      paginatedInventoryItems.map((item) => {
                        const category = displayInventoryCategories.find(
                          c => c.id === ((item as any).inventory_category_id || item.category_id)
                        );
                        const hasPortionStock = Object.prototype.hasOwnProperty.call(portionStockByItemId, item.id);
                        const stock = hasPortionStock ? portionStockByItemId[item.id] : (item.stock || 0);
                        const minStockAlert = Math.max(0, Number((item as any).min_stock ?? 10));
                        let statusColor = 'bg-green-100 text-green-800';
                        let statusText = t.inStock;

                        if (stock === 0) {
                          statusColor = 'bg-red-100 text-red-800';
                          statusText = t.outOfStock;
                        } else if (stock <= minStockAlert) {
                          statusColor = 'bg-yellow-100 text-yellow-800';
                          statusText = t.lowStock;
                        }

                        return (
                          <tr key={item.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                            <td className="p-4 font-medium">{item.name}</td>
                            <td className="p-4 text-zinc-500">{category?.name || 'Unknown'}</td>
                            <td className="p-4 font-medium">
                              <div>{stock}</div>
                              {hasPortionStock && portionsByItemId[item.id] && portionsByItemId[item.id].length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1 w-full max-w-[120px]">
                                  {portionsByItemId[item.id].map((p, idx) => (
                                    <span key={idx} className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] whitespace-nowrap font-medium text-zinc-600">
                                      {p.name}: <span className={`ml-1 ${p.stock <= minStockAlert ? 'text-red-600 font-bold' : ''}`}>{p.stock}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                                ${item.is_recipe ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                {item.is_recipe ? `${t.standalone}` : `${t.ingredient}`}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                                {statusText}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditClick(item)}
                                >
                                  <Edit className="h-4 w-4 text-zinc-500" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                                  onClick={() => openStockUpdateDialog(item, 'subtract')}
                                  disabled={stock <= 0}
                                  title="Subtract Stock"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
                                  onClick={() => openStockUpdateDialog(item, 'add')}
                                  title="Add Stock"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <span>Show</span>
                  <select
                    value={inventoryPageSize}
                    onChange={(e) => setInventoryPageSize(parseInt(e.target.value, 10))}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>items per page</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInventoryCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeInventoryCurrentPage <= 1}
                  >
                    Prev
                  </Button>
                  <span className="text-sm text-zinc-600">
                    {t.page} {safeInventoryCurrentPage} {t.of} {inventoryTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInventoryCurrentPage((p) => Math.min(inventoryTotalPages, p + 1))}
                    disabled={safeInventoryCurrentPage >= inventoryTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card className="border-blue-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-blue-900">{t.categories}</CardTitle>
              <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-100/50" onClick={() => setIsCategoryDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-50 bg-blue-50/20 text-left text-blue-600">
                      <th className="p-4 font-semibold">Category Name</th>
                      <th className="p-4 font-semibold">Items</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayInventoryCategories.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-zinc-500">
                          No categories found.
                        </td>
                      </tr>
                    ) : (
                      displayInventoryCategories.map((category) => {
                        const itemCount = displayItems.filter(
                          i => (((i as any).inventory_category_id || i.category_id) === category.id)
                        ).length;
                        return (
                          <tr key={category.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                            <td className="p-4 font-medium">{category.name}</td>
                            <td className="p-4 text-zinc-500">{itemCount}</td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditCategory(category)}>
                                  <Edit className="h-4 w-4 text-zinc-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteInventoryCategory(category.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card className="border-emerald-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 flex flex-row items-center justify-between py-4">
              <CardTitle className="text-emerald-900">{t.recentTransactions}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-100/50"
                onClick={() => setIsTransactionFilterOpen(true)}
              >
                <Filter className="h-4 w-4" />
                {t.filterByDate}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-50 bg-blue-50/20 text-left text-blue-600">
                      <th className="p-4 font-semibold">{t.date}</th>
                      <th className="p-4 font-semibold">{t.item}</th>
                      <th className="p-4 font-semibold">{t.type}</th>
                      <th className="p-4 font-semibold">{t.change}</th>
                      <th className="p-4 font-semibold">{t.notes}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500">
                          {t.noTransactionsFound}
                        </td>
                      </tr>
                    ) : (
                      paginatedTransactions.map((transaction) => {
                        const item = items.find(i => i.id === transaction.item_id);
                        const isPositive = transaction.quantity_change > 0;

                        return (
                          <tr key={transaction.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                            <td className="p-4 text-zinc-500">
                              {new Date(transaction.created_at).toLocaleString()}
                            </td>
                            <td className="p-4 font-medium">{item?.name || 'Unknown Item'}</td>
                            <td className="p-4 capitalize">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider
                                ${transaction.transaction_type === 'sale' ? 'bg-blue-100 text-blue-700' :
                                  transaction.transaction_type === 'restock' ? 'bg-emerald-100 text-emerald-700' :
                                    transaction.transaction_type === 'waste' ? 'bg-rose-100 text-rose-700' :
                                      'bg-amber-100 text-amber-700'}`}>
                                {transaction.transaction_type === 'adjustment' ? 'Manual Adj' :
                                  transaction.transaction_type === 'restock' ? 'Stock In' :
                                    transaction.transaction_type === 'sale' ? t.sale :
                                      transaction.transaction_type}
                              </span>
                            </td>
                            <td className={`p-4 font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {isPositive ? '+' : ''}{transaction.quantity_change}
                            </td>
                            <td className="p-4 text-zinc-500">{transaction.notes || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <span>Show</span>
                  <select
                    value={transactionsPageSize}
                    onChange={(e) => setTransactionsPageSize(parseInt(e.target.value, 10))}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>items per page</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTransactionsCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeTransactionsCurrentPage <= 1}
                  >
                    Prev
                  </Button>
                  <span className="text-sm text-zinc-600">
                    {t.page} {safeTransactionsCurrentPage} {t.of} {transactionsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTransactionsCurrentPage((p) => Math.min(transactionsTotalPages, p + 1))}
                    disabled={safeTransactionsCurrentPage >= transactionsTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isTransactionFilterOpen} onOpenChange={setIsTransactionFilterOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Custom Date Range</DialogTitle>
            <DialogDescription>
              Filter transaction log by start and end date.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tx-date-from">From Date</Label>
              <Input
                id="tx-date-from"
                type="date"
                value={transactionsDateFrom}
                onChange={(e) => setTransactionsDateFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-date-to">To Date</Label>
              <Input
                id="tx-date-to"
                type="date"
                value={transactionsDateTo}
                onChange={(e) => setTransactionsDateTo(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTransactionsDateFrom('');
                  setTransactionsDateTo('');
                }}
              >
                Clear
              </Button>
              <Button onClick={() => setIsTransactionFilterOpen(false)}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStockUpdateDialogOpen} onOpenChange={setIsStockUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className={stockUpdateType === 'add' ? 'text-green-600' : 'text-red-600'}>
              {stockUpdateType === 'add' ? 'Add Stock' : 'Subtract Stock'}
            </DialogTitle>
            <DialogDescription>
              Update stock level for <span className="font-bold text-zinc-900">{selectedItemForStockUpdate?.name}</span>.
              Current: <span className="font-bold">{selectedItemForStockUpdate?.stock || 0} {selectedItemForStockUpdate?.unit || 'pcs'}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stock-qty">Quantity to {stockUpdateType === 'add' ? 'add' : 'subtract'}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="stock-qty"
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  value={stockUpdateQuantity}
                  onChange={(e) => setStockUpdateQuantity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleQuickUpdateStock();
                    }
                  }}
                  className="text-lg font-bold"
                />
                <span className="text-sm font-medium text-zinc-500">{selectedItemForStockUpdate?.unit || 'pcs'}</span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock-notes">Notes (Optional)</Label>
              <Input
                id="stock-notes"
                placeholder="e.g., Damaged goods, Restock from supplier, Inventory adjustment"
                value={stockUpdateNotes}
                onChange={(e) => setStockUpdateNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuickUpdateStock}
              className={stockUpdateType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              Confirm {stockUpdateType === 'add' ? 'Addition' : 'Subtraction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div>Loading inventory...</div>}>
      <InventoryContent />
    </Suspense>
  );
}

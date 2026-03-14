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
    ingredientDesc: '嗪о罕嗪斷簴嗪膏簲嗪脆簹 嗪�杭嗪� 嗪�粓嗪о簷嗪涏喊嗪佮涵嗪氞簵嗪掂粓嗷冟簥嗷夃粌嗪權邯嗪脆簷嗪勦粔嗪�',
    unit: '嗪�夯嗪о粶嗷堗骇嗪�',
    minStockLevel: '嗪ム喊嗪斷罕嗪氞粊嗪堗粔嗪囙粈嗪曕悍嗪�簷嗪曕粓嗪赤邯嗪膏簲',
    minStockPlaceholder: '嗷佮簣嗷夃簢嗷€嗪曕悍嗪�簷嗷€嗪∴悍嗷堗涵嗪�涵嗪斷亥嗪班簲嗪编簹嗪權旱嗷�',
    pcs: '嗪�罕嗪�/嗪娻捍嗷夃簷',
    kg: '嗪佮捍嗷傕亥',
    gram: '嗪佮海嗪侧骸',
    liter: '嗪ム捍嗪�',
    ml: '嗪∴捍嗪ム捍嗪ム捍嗪�',
    pack: '嗪�粛嗷�/嗷佮簽嗪编簛',
    box: '嗷佮簛嗪编簲/嗪佮粓嗪�簢',
    itemPrice: '嗪ム翰嗪勦翰嗪曕夯嗷夃簷嗪椸憾嗪�',
    namePlaceholder: '嗪曕夯嗪о孩嗷堗翰嗪�: 嗪娻旱嗷夃簷嗪囙夯嗪�',
    pricePlaceholder: '0.00',
    portions: '嗪傕喊嗷溹翰嗪� / 嗪權粔嗪赤粶嗪编簛',
    enablePortions: '嗷€嗪涏旱嗪斷粌嗪娻粔嗪囙翰嗪權韩嗪监翰嗪嵿簜嗪班粶嗪侧簲 (嗪曕夯嗪о孩嗷堗翰嗪�: 嗪權粔嗪�簫, 嗪佮翰嗪�, 嗷冟韩嗪嵿粓)',
    portionName: '嗪娻悍嗷堗簜嗪班粶嗪侧簲',
    sellingPriceShort: '嗪ム翰嗪勦翰嗪傕翰嗪�',
    costPriceShort: '嗪曕夯嗷夃簷嗪椸憾嗪�',
    addPortion: '嗷€嗪炧旱嗷堗骸嗪傕喊嗷溹翰嗪�',
    stockInTransactions: '嗪�罕嗪氞粈嗪傕夯嗷夃翰',
    stockOutTransactions: '嗪堗粓嗪侧簫嗪�涵嗪�',
    allTypes: '嗪椸焊嗪佮簺嗪班粈嗪炧簲',
    enterCategoryName: '嗪佮喊嗪ム焊嗪權翰嗪涏粔嗪�簷嗪娻悍嗷堗粷嗪о簲嗷澿汗嗷�',
    manageCategories: '嗪堗罕嗪斷簛嗪侧簷嗷澿骇嗪斷粷嗪灌粓嗪勦罕嗪囙邯嗪脆簷嗪勦粔嗪�',
    saveChanges: '嗪氞罕嗪權簵嗪多簛嗪佮翰嗪權簺嗷堗航嗪權粊嗪涏簢',
    editItem: '嗷佮簛嗷夃粍嗪傕邯嗪脆簷嗪勦粔嗪�',
    updateItemDesc: '嗪�罕嗪氞粈嗪斷簲嗪ム翰嗪嵿亥嗪班涵嗪洁簲嗪�捍嗪權簞嗷夃翰 嗷佮亥嗪� 嗪傕粛嗷夃骸嗪灌簷嗪�喊嗪曕罕嗪�簛.',
    addItemDesc: '嗷€嗪炧旱嗷堗骸嗪�捍嗪權簞嗷夃翰嗷冟粷嗷堗粈嗪傕夯嗷夃翰嗷冟簷嗪勦罕嗪囙邯嗪脆簷嗪勦粔嗪侧簜嗪�簢嗪椸粓嗪侧簷.',
    itemNamePlaceholder: '嗪曕夯嗪о孩嗷堗翰嗪�: 嗪娻旱嗷夃簷嗪囙夯嗪�, 嗷澿翰嗪佮粈嗪ム罕嗷堗簷, 嗷€嗪權旱嗪�',
    selectCategory: '嗷€嗪ム悍嗪�簛嗷澿骇嗪斷粷嗪灌粓',
    initialStock: '嗪�喊嗪曕罕嗪�簛嗷€嗪ム旱嗷堗骸嗪曕夯嗷夃簷',
    selectUnit: '嗷€嗪ム悍嗪�簛嗪�夯嗪о粶嗷堗骇嗪�',
    bottle: '嗷佮簛嗷夃骇',
    note: '嗷澿翰嗪嵿粈嗪�簲',
    ingredientNoteDesc: '嗪о罕嗪斷簴嗪膏簲嗪脆簹嗷佮骸嗷堗簷嗷冟簥嗷夃粈嗪炧悍嗷堗涵嗪曕捍嗪斷簳嗪侧骸嗪勦罕嗪囙邯嗪脆簷嗪勦粔嗪侧邯嗪赤亥嗪编簹嗪�汗嗪斷涵嗪侧韩嗪侧簷. 嗪炧骇嗪佮骸嗪编簷嗪堗喊嗪氞粛嗷堗邯嗪班粊嗪斷簢嗷€嗪涏罕嗪權亥嗪侧簫嗪佮翰嗪權粊嗪嵿簛嗪曕粓嗪侧簢嗪�翰嗪佮粌嗪權粈嗪∴簷嗪� POS 嗪�杭嗪编簛嗪傕涵嗪囙簵嗷堗翰嗪�.',
    totalItemCost: '嗪曕夯嗷夃簷嗪椸憾嗪權邯嗪脆簷嗪勦粔嗪侧亥嗪о骸',
    totalPortionCost: '嗪曕夯嗷夃簷嗪椸憾嗪權邯嗷堗骇嗪權簺嗪班簛嗪�簹嗪ム骇嗪�',
    combinedValue: '嗪∴汗嗪權簞嗷堗翰嗪ム骇嗪�',
    createItem: '嗪�粔嗪侧簢嗪�捍嗪權簞嗷夃翰',
    updateCategoryDesc: '嗪�罕嗪氞粈嗪斷簲嗪娻悍嗷堗粷嗪о簲嗷澿汗嗷堗邯嗪赤亥嗪编簹嗪佮翰嗪權簣嗪编簲嗪佮翰嗪權簞嗪编簢嗪�捍嗪權簞嗷夃翰.',
    name: '嗪娻悍嗷�',
    updateItem: '嗪�罕嗪氞粈嗪斷簲嗪�捍嗪權簞嗷夃翰',
    stockUnitCost: '嗪�喊嗪曕罕嗪�簛 脳 嗪曕夯嗷夃簷嗪椸憾嗪權簳嗷嵿粓嗷溹粓嗪о簫',
    standaloneCost: '嗪曕夯嗷夃簷嗪椸憾嗪權邯嗪脆簷嗪勦粔嗪侧簲嗷堗航嗪�',
    variablePortions: '嗪曕夯嗷夃簷嗪椸憾嗪權邯嗷堗骇嗪權簺嗪班簛嗪�簹',
    unitSumWorth: '嗪∴汗嗪權簞嗷堗翰嗪ム骇嗪∴粊嗪曕粓嗪ム喊嗷溹粓嗪о簫',
    itemsNeedingAttention: '嗪ム翰嗪嵿簛嗪侧簷嗪椸旱嗷堗簞嗪о簷嗷€嗪�夯嗪侧粌嗪堗粌嗪�粓',
  },
  th: {
    inventory: '喔勦弗喔编竾喔�复喔權竸喙夃覆',
    categories: '喔�浮喔о笖喔�浮喔灌箞',
    transactions: '喔涏福喔班抚喔编笗喔�',
    searchInventory: '喔勦箟喔權斧喔侧釜喔脆笝喔勦箟喔�...',
    newItem: '喙€喔炧复喙堗浮喔�复喔權竸喙夃覆喙冟斧喔∴箞',
    addCategory: '喙€喔炧复喙堗浮喔�浮喔о笖喔�浮喔灌箞',
    itemName: '喔娻阜喙堗腑喔�复喔權竸喙夃覆',
    category: '喔�浮喔о笖喔�浮喔灌箞',
    currentStock: '喔堗赋喔權抚喔權竸喔囙箑喔�弗喔粪腑',
    type: '喔涏福喔班箑喔犩笚',
    status: '喔�笘喔侧笝喔�',
    actions: '喔堗副喔斷竵喔侧福',
    inStock: '嗪∴旱喙冟笝喔�笗喙囙腑喔�',
    lowStock: '喔�复喔權竸喙夃覆喙冟竵喔ム箟喔�浮喔�',
    outOfStock: '喔�复喔權竸喙夃覆喔�浮喔�',
    optional: '(喙勦浮喙堗笟喔编竾喔勦副喔�)',
    confimAddition: '喔⑧阜喔權涪喔编笝喔佮覆喔｀箑喔炧复喙堗浮',
    confirmSubtraction: '喔⑧阜喔權涪喔编笝喔佮覆喔｀弗喔�',
    sale: '喔傕覆喔⑧釜喔脆笝喔勦箟喔�',
    inventoryManagement: '喔佮覆喔｀笀喔编笖喔佮覆喔｀竸喔ム副喔囙釜喔脆笝喔勦箟喔�',
    manage: '喔堗副喔斷竵喔侧福',
    saving: '喔佮赋喔ム副喔囙笟喔编笝喔椸付喔�...',
    saveCategory: '喔氞副喔權笚喔多竵喔�浮喔о笖喔�浮喔灌箞',
    editInventoryCategory: '喙佮竵喙夃箘喔傕斧喔∴抚喔斷斧喔∴腹喙堗竸喔ム副喔囙釜喔脆笝喔勦箟喔�',
    deleteCategoryPrompt: '喔ム笟喔�浮喔о笖喔�浮喔灌箞喔勦弗喔编竾喔�复喔權竸喙夃覆喔權傅喙夃斧喔｀阜喔�箘喔∴箞? 喔�复喔權竸喙夃覆喔堗赴喔⑧副喔囙竸喔囙腑喔⑧腹喙堗箒喔ム赴喔�浮喔о笖喔�浮喔灌箞喔堗赴喔栢腹喔佮弗喙夃覆喔囙腑喔�竵',
    update: '喔�副喔涏箑喔斷笗',
    refreshTransactions: '喙傕斧喔ム笖喔傕箟喔�浮喔灌弗喙冟斧喔∴箞',
    totalInventoryValue: '喔∴腹喔ム竸喙堗覆喔勦弗喔编竾喔�复喔權竸喙夃覆喔｀抚喔�',
    lowStockAlerts: '喙佮笀喙夃竾喙€喔曕阜喔�笝喔�复喔權竸喙夃覆喙冟竵喔ム箟喔�浮喔�',
    itemsWithLowStock: '喔｀覆喔⑧竵喔侧福喔�复喔權竸喙夃覆喔椸傅喙堗笗喙堗赋喔佮抚喙堗覆喙€喔佮笓喔戉箤',
    addInventoryCategory: '喙€喔炧复喙堗浮喔�浮喔о笖喔�浮喔灌箞喔勦弗喔编竾喔�复喔權竸喙夃覆',
    createCategoryDesc: '喔�福喙夃覆喔囙斧喔∴抚喔斷斧喔∴腹喙堗釜喔赤斧喔｀副喔氞竵喔侧福喔堗副喔斷竵喔侧福喔勦弗喔编竾喔�复喔權竸喙夃覆',
    manageCategoriesDesc: '喙佮竵喙夃箘喔傕斧喔｀阜喔�弗喔氞斧喔∴抚喔斷斧喔∴腹喙堗竸喔ム副喔囙釜喔脆笝喔勦箟喔�',
    updateStock: '喔涏福喔编笟喔涏福喔膏竾喔�笗喙囙腑喔�',
    quantity: '喔堗赋喔權抚喔�',
    reason: '喙€喔�笗喔膏笢喔� / 喔�浮喔侧涪喙€喔�笗喔�',
    enterQuantity: '喔佮福喔�竵喔堗赋喔權抚喔�',
    enterNotes: '喙€喔娻箞喔� 喔｀副喔氞笀喔侧竵喔嬥副喔炧笧喔ム覆喔⑧箑喔�腑喔｀箤',
    failedUpdateStock: '喙勦浮喙堗釜喔侧浮喔侧福喔栢笡喔｀副喔氞笡喔｀父喔囙釜喔曕箛喔�竵喙勦笖喙� 喔佮福喔膏笓喔侧弗喔�竾喙冟斧喔∴箞',
    invalidQuantity: '喔佮福喔膏笓喔侧竵喔｀腑喔佮笀喔赤笝喔о笝喔椸傅喙堗笘喔灌竵喔曕箟喔�竾',
    failedSaveItem: '喙勦浮喙堗釜喔侧浮喔侧福喔栢笟喔编笝喔椸付喔佮釜喔脆笝喔勦箟喔侧箘喔斷箟 喔佮福喔膏笓喔侧弗喔�竾喙冟斧喔∴箞',
    fillAllFields: '喔佮福喔膏笓喔侧竵喔｀腑喔佮競喙夃腑喔∴腹喔ム箖喔�箟喔勦福喔氞笘喙夃抚喔�',
    addAtLeastOnePortion: '喔佮福喔膏笓喔侧箑喔炧复喙堗浮喔�涪喙堗覆喔囙笝喙夃腑喔⑧斧喔權付喙堗竾喔�箞喔о笝喔涏福喔班竵喔�笟喔椸傅喙堗浮喔掂笂喔粪箞喔�箒喔ム赴喔｀覆喔勦覆',
    addStockFor: '喙€喔炧复喙堗浮喔�笗喙囙腑喔佮箖喔�箟',
    subtractStockFor: '喔ム笖喔�笗喙囙腑喔佮箖喔�箟',
    standaloneDesc: '喔�复喔權竸喙夃覆喔�赋喙€喔｀箛喔堗福喔灌笡喔椸傅喙堗釜喔侧浮喔侧福喔栢競喔侧涪喙勦笖喙夃笚喔编笝喔椸傅',
    ingredientDesc: '喔о副喔曕笘喔膏笖喔脆笟喔�福喔粪腑喔�箞喔о笝喔涏福喔班竵喔�笟喔椸傅喙堗箖喔娻箟喙冟笝喔�复喔權竸喙夃覆',
    unit: '喔�笝喙堗抚喔�',
    minStockLevel: '喔｀赴喔斷副喔氞箒喔堗箟喔囙箑喔曕阜喔�笝喔曕箞喔赤釜喔膏笖',
    minStockPlaceholder: '喙佮笀喙夃竾喙€喔曕阜喔�笝喙€喔∴阜喙堗腑喔栢付喔囙福喔班笖喔编笟喔權傅喙�',
    pcs: '喔娻复喙夃笝',
    kg: '喔佮复喙傕弗喔佮福喔编浮',
    gram: '喔佮福喔编浮',
    liter: '喔ム复喔曕福',
    ml: '喔∴复喔ム弗喔脆弗喔脆笗喔�',
    pack: '喔�箞喔�/喙佮笧喙囙竸',
    box: '喔ム副喔�/喔佮弗喙堗腑喔�',
    itemPrice: '喔｀覆喔勦覆喔曕箟喔權笚喔膏笝',
    namePlaceholder: '喙€喔娻箞喔� 喙€喔權阜喙夃腑喔о副喔�',
    pricePlaceholder: '0.00',
    portions: '喔傕笝喔侧笖 / 喔權箟喔赤斧喔權副喔�',
    enablePortions: '喙€喔涏复喔斷箖喔娻箟喔囙覆喔權斧喔ム覆喔⑧競喔權覆喔� (喙€喔娻箞喔� 喙€喔ム箛喔�, 喔佮弗喔侧竾, 喙冟斧喔嵿箞)',
    portionName: '喔娻阜喙堗腑喔傕笝喔侧笖',
    sellingPriceShort: '喔｀覆喔勦覆喔傕覆喔�',
    costPriceShort: '喔曕箟喔權笚喔膏笝',
    addPortion: '喙€喔炧复喙堗浮喔傕笝喔侧笖',
    stockInTransactions: '喔｀副喔氞箑喔傕箟喔�',
    stockOutTransactions: '喔堗箞喔侧涪喔�腑喔�',
    allTypes: '喔椸父喔佮笡喔｀赴喙€喔犩笚',
    enterCategoryName: '喔佮福喔膏笓喔侧竵喔｀腑喔佮笂喔粪箞喔�斧喔∴抚喔斷斧喔∴腹喙�',
    manageCategories: '喔堗副喔斷竵喔侧福喔�浮喔о笖喔�浮喔灌箞喔勦弗喔编竾喔�复喔權竸喙夃覆',
    saveChanges: '喔氞副喔權笚喔多竵喔佮覆喔｀箑喔涏弗喔掂箞喔⑧笝喙佮笡喔ム竾',
    editItem: '喙佮竵喙夃箘喔傕釜喔脆笝喔勦箟喔�',
    updateItemDesc: '喔�副喔涏箑喔斷笗喔｀覆喔⑧弗喔班箑喔�傅喔⑧笖喔�复喔權竸喙夃覆喙佮弗喔班競喙夃腑喔∴腹喔ム釜喔曕箛喔�竵',
    addItemDesc: '喙€喔炧复喙堗浮喔�复喔權竸喙夃覆喙冟斧喔∴箞喔ム竾喙冟笝喔勦弗喔编竾喔�复喔權竸喙夃覆喔傕腑喔囙竸喔膏笓',
    itemNamePlaceholder: '喙€喔娻箞喔� 喙€喔權阜喙夃腑喔о副喔�, 喔∴赴喙€喔傕阜喔�箑喔椸辅, 喔娻傅喔�',
    selectCategory: '喙€喔ム阜喔�竵喔�浮喔о笖喔�浮喔灌箞',
    initialStock: '喔�笗喙囙腑喔佮箑喔｀复喙堗浮喔曕箟喔�',
    selectUnit: '喙€喔ム阜喔�竵喔�笝喙堗抚喔�',
    bottle: '喔傕抚喔�',
    note: '喔�浮喔侧涪喙€喔�笗喔�',
    ingredientNoteDesc: '喔о副喔曕笘喔膏笖喔脆笟喙冟笂喙夃釜喔赤斧喔｀副喔氞笗喔脆笖喔曕覆喔∴竸喔ム副喔囙釜喔脆笝喔勦箟喔侧釜喔赤斧喔｀副喔氞釜喔灌笗喔｀腑喔侧斧喔侧福 喔堗赴喙勦浮喙堗箒喔�笖喔囙箑喔涏箛喔權福喔侧涪喔佮覆喔｀箒喔⑧竵喔曕箞喔侧竾喔�覆喔佮箖喔權箑喔∴笝喔� POS 喔�弗喔编竵喔傕腑喔囙竸喔膏笓',
    totalItemCost: '喔曕箟喔權笚喔膏笝喔�复喔權竸喙夃覆喔｀抚喔�',
    totalPortionCost: '喔曕箟喔權笚喔膏笝喔�箞喔о笝喔涏福喔班竵喔�笟喔｀抚喔�',
    combinedValue: '喔∴腹喔ム竸喙堗覆喔｀抚喔�',
    createItem: '喔�福喙夃覆喔囙釜喔脆笝喔勦箟喔�',
    updateCategoryDesc: '喔�副喔涏箑喔斷笗喔娻阜喙堗腑喔�浮喔о笖喔�浮喔灌箞喔�赋喔�福喔编笟喔佮覆喔｀笀喔编笖喔佮覆喔｀竸喔ム副喔囙釜喔脆笝喔勦箟喔�',
    name: '喔娻阜喙堗腑',
    updateItem: '喔�副喔涏箑喔斷笗喔�复喔權竸喙夃覆',
    stockUnitCost: '喔�笗喙囙腑喔� 脳 喔曕箟喔權笚喔膏笝喔曕箞喔�斧喔權箞喔о涪',
    standaloneCost: '喔曕箟喔權笚喔膏笝喔�复喔權竸喙夃覆喙€喔斷傅喙堗涪喔�',
    variablePortions: '喔曕箟喔權笚喔膏笝喔�箞喔о笝喔涏福喔班竵喔�笟',
    unitSumWorth: '喔∴腹喔ム竸喙堗覆喔｀抚喔∴箒喔曕箞喔ム赴喔�笝喙堗抚喔�',
    itemsNeedingAttention: '喔｀覆喔⑧竵喔侧福喔椸傅喙堗竸喔о福喙冟釜喙堗箖喔�',
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
          supabase.from('item_portions').select('item_id, portion_stock, portion_cost_price, portion_price')
        ]);

        if (itemsRes.data) setItems(itemsRes.data);
        if (categoriesRes.data) setInventoryCategories(categoriesRes.data);
        if (portionsRes.data) {
          const totals: Record<string, number> = {};
          const costTotals: Record<string, number> = {};
          const valueTotals: Record<string, number> = {};
          for (const row of portionsRes.data as any[]) {
            if (!row.item_id) continue;
            const stock = Number(row.portion_stock || 0);
            const cost = Number(row.portion_cost_price ?? row.portion_price ?? 0);

            totals[row.item_id] = (totals[row.item_id] || 0) + stock;
            costTotals[row.item_id] = (costTotals[row.item_id] || 0) + cost;
            valueTotals[row.item_id] = (valueTotals[row.item_id] || 0) + (stock * cost);
          }
          setPortionStockByItemId(totals);
          setPortionCostByItemId(costTotals);
          setPortionValueByItemId(valueTotals);
        } else {
          setPortionStockByItemId({});
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
              <Button className="w-full sm:w-auto h-12 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">
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
                    className="h-11 rounded-xl border-zinc-200 shadow-sm focus:ring-indigo-500"
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
                        className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
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
                      className={`group relative rounded-2xl border p-4 text-left transition-all ${
                        newItem.itemType === 'ingredient'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10'
                        : 'border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full mb-2 flex items-center justify-center transition-colors ${
                        newItem.itemType === 'ingredient' ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                      }`}>
                        <Package className="h-4 w-4" />
                      </div>
                      <div className={`text-sm font-bold ${newItem.itemType === 'ingredient' ? 'text-indigo-900' : 'text-zinc-700'}`}>{t.ingredient}</div>
                      <div className="text-[10px] text-zinc-500 mt-1 font-medium leading-tight">{t.ingredientDesc}</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, itemType: 'standalone' })}
                      className={`group relative rounded-2xl border p-4 text-left transition-all ${
                        newItem.itemType === 'standalone'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/10'
                        : 'border-zinc-200 hover:border-emerald-300 hover:bg-zinc-50'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full mb-2 flex items-center justify-center transition-colors ${
                        newItem.itemType === 'standalone' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                      }`}>
                        <ShoppingBag className="h-4 w-4" />
                      </div>
                      <div className={`text-sm font-bold ${newItem.itemType === 'standalone' ? 'text-emerald-900' : 'text-zinc-700'}`}>{t.standalone}</div>
                      <div className="text-[10px] text-zinc-500 mt-1 font-medium leading-tight">{t.standaloneDesc}</div>
                    </button>
                  </div>
                </div>

                {newItem.itemType === 'ingredient' && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-sm text-indigo-900">
                      <AlertTriangle className="h-4 w-4 text-indigo-500" />
                      <span className="font-bold">{t.note}:</span>
                    </div>
                    <p className="text-xs text-indigo-700 mt-2 leading-relaxed">
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
                  className="w-full sm:w-auto h-12 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
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
          <Card className="border-indigo-200 bg-indigo-50/50 shadow-sm overflow-hidden text-indigo-900">
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
                    <tr className="border-b border-zinc-100 bg-zinc-50/30 text-left text-zinc-600">
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
                            <td className="p-4 font-medium">{stock}</td>
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
                    <tr className="border-b border-emerald-50 bg-emerald-50/20 text-left text-emerald-600">
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

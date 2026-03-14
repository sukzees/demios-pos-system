'use client';

import { useState, useEffect } from 'react';
import { usePosStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Search, Trash2, CreditCard, Banknote, Smartphone, ArrowRight, Clock, PauseCircle, PlayCircle, Printer, List, LayoutGrid, AlertTriangle } from 'lucide-react';
import { Item, Recipe, supabase } from '@/lib/supabase';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { formatCurrency as formatCurrencyBySettings } from '@/lib/currency';

const TRANSLATIONS = {
  en: {
    pos: 'POS',
    searchItems: 'Search items...',
    allCategories: 'ALL CATEGORIES',
    cart: 'Cart',
    emptyCart: 'Your cart is empty',
    hold: 'Hold',
    checkout: 'Checkout',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    paymentMethod: 'Select Payment Method',
    cash: 'Cash',
    transfer: 'Transfer',
    confirm: 'Confirm',
    cancel: 'Cancel',
    processing: 'Processing...',
    orderSuccessful: 'Order Successful',
    orderPlaced: 'Your order has been placed.',
    outOfStock: 'Out of Stock',
    available: 'Available',
    selectPortion: 'Select Portion',
    addToCart: 'Add to Cart',
    deleteHeldOrder: 'Delete Held Order?',
    deleteAction: 'Delete Order',
    confirmPayment: 'Confirm Payment',
    confirmTransfer: 'Confirm Transfer',
    verifyTransfer: 'Please verify the transfer receipt before confirming.',
    note: 'Note',
    heldOrders: 'Held Orders',
    resume: 'Resume',
  },
  lo: {
    pos: 'ຂາຍສິນຄ້າ',
    searchItems: 'ຄົ້ນຫາສິນຄ້າ...',
    allCategories: 'ໝວດໝູ່ທັງໝົດ',
    cart: 'ກະຕ່າ',
    emptyCart: 'ກະຕ່າຂອງທ່ານວ່າງເປົ່າ',
    hold: 'ພັກລາຍການ',
    checkout: 'ຊຳລະເງິນ',
    total: 'ລວມທັງໝົດ',
    subtotal: 'ລາຄາລວມ',
    discount: 'ສ່ວນຫຼຸດ',
    paymentMethod: 'ເລືອກວິທີຊຳລະ',
    cash: 'ເງິນສົດ',
    transfer: 'ໂອນເງິນ',
    confirm: 'ຢືນຢັນ',
    cancel: 'ຍົກເລີກ',
    processing: 'ກຳລັງປະມວນຜົນ...',
    orderSuccessful: 'ສັ່ງສຳເລັດແລ້ວ',
    orderPlaced: 'ລາຍການສັ່ງຂອງທ່ານຖືກບັນທຶກແລ້ວ.',
    outOfStock: 'ສິນຄ້າໝົດ',
    available: 'ມີໃນສາງ',
    selectPortion: 'ເລືອກຂະໜາດ',
    addToCart: 'ເພີ່ມໃສ່ກະຕ່າ',
    deleteHeldOrder: 'ລຶບລາຍການທີ່ພັກໄວ້?',
    deleteAction: 'ລຶບລາຍການ',
    confirmPayment: 'ຢືນຢັນການຊຳລະ',
    confirmTransfer: 'ຢືນຢັນການໂອນ',
    verifyTransfer: 'ກະລຸນາກວດສອບໃບບິນໂອນກ່ອນຢືນຢັນ.',
    note: 'ໝາຍເຫດ',
    heldOrders: 'ລາຍການທີ່ພັກໄວ້',
    resume: 'ສືບຕໍ່',
  },
  th: {
    pos: 'ขายหน้าร้าน',
    searchItems: 'ค้นหาสินค้า...',
    allCategories: 'ทุกหมวดหมู่',
    cart: 'ตะกร้า',
    emptyCart: 'ตะกร้าของคุณว่างเปล่า',
    hold: 'พักรายการ',
    checkout: 'ชำระเงิน',
    total: 'รวมทั้งสิ้น',
    subtotal: 'ราคารวม',
    discount: 'ส่วนลด',
    paymentMethod: 'เลือกวิธีชำระเงิน',
    cash: 'เงินสด',
    transfer: 'โอนเงิน',
    confirm: 'ยืนยัน',
    cancel: 'ยกเลิก',
    processing: 'กำลังประมวลผล...',
    orderSuccessful: 'สั่งซื้อสำเร็จ',
    orderPlaced: 'รายการสั่งซื้อของคุณถูกบันทึกแล้ว',
    outOfStock: 'สินค้าหมด',
    available: 'มีจำหน่าย',
    selectPortion: 'เลือกขนาด',
    addToCart: 'เพิ่มลงตะกร้า',
    deleteHeldOrder: 'ลบรายการที่พักไว้?',
    deleteAction: 'ลบรายการ',
    confirmPayment: 'ยืนยันการชำระเงิน',
    confirmTransfer: 'ยืนยันการโอนเงิน',
    verifyTransfer: 'กรุณาตรวจสอบหลักฐานการโอนก่อนยืนยัน',
    note: 'หมายเหตุ',
    heldOrders: 'รายการที่พักไว้',
    resume: 'ดำเนินการต่อ',
  }
};

type ItemPortion = {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
};

// Mock data for when Supabase is not configured
const MOCK_CATEGORIES = [
  { id: 'c1', name: 'Burgers', created_at: '' },
  { id: 'c2', name: 'Drinks', created_at: '' },
  { id: 'c3', name: 'Sides', created_at: '' },
];

const MOCK_ITEMS: Item[] = [
  { id: 'i1', name: 'Classic Burger', price: 8.99, category_id: 'c1', stock: 50, created_at: '', is_recipe: true },
  { id: 'i2', name: 'Cheese Burger', price: 9.99, category_id: 'c1', stock: 45, created_at: '', is_recipe: true },
  { id: 'i3', name: 'Double Burger', price: 12.99, category_id: 'c1', stock: 30, created_at: '', is_recipe: true },
  { id: 'i4', name: 'Cola', price: 2.50, category_id: 'c2', stock: 100, created_at: '', is_recipe: true },
  { id: 'i5', name: 'Lemonade', price: 3.00, category_id: 'c2', stock: 80, created_at: '', is_recipe: true },
  { id: 'i6', name: 'Fries', price: 3.99, category_id: 'c3', stock: 60, created_at: '', is_recipe: true },
  { id: 'i7', name: 'Onion Rings', price: 4.99, category_id: 'c3', stock: 25, created_at: '', is_recipe: true },
];

export default function PosPage() {
  const {
    items, categories, cart, isSupabaseConfigured, heldOrders, receiptSettings,
    checkSupabaseConfig, fetchItemsAndCategories,
    addToCart, removeFromCart, updateCartQuantity, clearCart, checkout,
    holdOrder, resumeOrder, removeHeldOrder, currencySettings, generalSettings, checkoutError, bankConfigs, autoPrint, silentPrint
  } = usePosStore();

  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeStocks, setRecipeStocks] = useState<{ [key: string]: number }>({});
  const [portionsByProduct, setPortionsByProduct] = useState<Record<string, ItemPortion[]>>({});

  // Fetch recipes from database
  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setRecipes(data);
      if (error) console.error('Error fetching recipes:', error);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const fetchItemPortions = async () => {
    if (!isSupabaseConfigured) {
      setPortionsByProduct({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('item_portions')
        .select('id, item_id, recipe_id, portion_name, portion_price, portion_stock')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const grouped: Record<string, ItemPortion[]> = {};
      for (const row of data || []) {
        const productId = row.item_id || row.recipe_id;
        if (!productId) continue;
        if (!grouped[productId]) grouped[productId] = [];
        grouped[productId].push({
          id: String(row.id),
          productId,
          name: String(row.portion_name || ''),
          price: Number(row.portion_price || 0),
          stock: Number(row.portion_stock || 0),
        });
      }
      setPortionsByProduct(grouped);
    } catch (error) {
      console.error('Error fetching item portions:', error);
      setPortionsByProduct({});
    }
  };

  // Calculate recipe stock based on ingredients
  const calculateRecipeStock = async (recipeId: string) => {
    try {
      // Get recipe ingredients
      const { data: ingredients, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipeId);

      if (error || !ingredients || ingredients.length === 0) {
        return 0;
      }

      // Calculate how many recipes can be made based on each ingredient
      const recipeStocks = ingredients.map(ingredient => {
        const ingredientItem = items.find(item => item.id === ingredient.ingredient_id);
        if (!ingredientItem) return 0;

        const availableStock = ingredientItem.stock || 0;
        const neededPerRecipe = ingredient.quantity_needed || 1;

        return Math.floor(availableStock / neededPerRecipe);
      });

      // Return the minimum (limiting ingredient)
      return Math.min(...recipeStocks);
    } catch (error) {
      console.error('Error calculating recipe stock:', error);
      return 0;
    }
  };

  // Calculate all recipe stocks
  const calculateAllRecipeStocks = async () => {
    const newRecipeStocks: { [key: string]: number } = {};

    for (const recipe of recipes) {
      const stock = await calculateRecipeStock(recipe.id);
      newRecipeStocks[recipe.id] = stock;
    }

    setRecipeStocks(newRecipeStocks);
  };

  const formatCurrency = (price: number) => formatCurrencyBySettings(price, currencySettings);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [note, setNote] = useState('');
  const [tip, setTip] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('cash');
  const [transferViewMode, setTransferViewMode] = useState<'list' | 'grid'>('list');
  const [cashTendered, setCashTendered] = useState('');
  const [isCashInputFocused, setIsCashInputFocused] = useState(false);
  const [mainTab, setMainTab] = useState('menu');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [portionSelectionItem, setPortionSelectionItem] = useState<any | null>(null);
  const [portionQuantities, setPortionQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (portionSelectionItem) {
      const initial: Record<string, number> = {};
      (portionsByProduct[portionSelectionItem.id] || []).forEach(p => {
        initial[p.id] = 0;
      });
      setPortionQuantities(initial);
    }
  }, [portionSelectionItem]);

  useEffect(() => {
    checkSupabaseConfig();
    fetchItemsAndCategories();
    fetchRecipes();
  }, [checkSupabaseConfig, fetchItemsAndCategories]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchItemPortions();
    } else {
      setPortionsByProduct({});
    }
  }, [isSupabaseConfigured, items.length, recipes.length]);

  useEffect(() => {
    if (recipes.length > 0 && items.length > 0) {
      calculateAllRecipeStocks();
    }
  }, [recipes, items]);

  const displayCategories = categories.length > 0 ? categories : (isSupabaseConfigured ? [] : MOCK_CATEGORIES);

  // Combine items and recipes for display (same logic as Items & Categories)
  const menuItems = items.length > 0 ? items.filter(item => item.is_recipe !== false) : (isSupabaseConfigured ? [] : MOCK_ITEMS);
  const recipeItems = recipes.length > 0 ? recipes.map(recipe => ({
    ...recipe,
    is_recipe: false // Mark recipes as is_recipe = false for display logic
  })) : [];

  const displayItems = [...menuItems, ...recipeItems];

  const filteredItems = displayItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category_id === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
  const taxRateDecimal = (generalSettings.taxRate || 0) / 100;
  const tax = cartTotal * taxRateDecimal;
  const tipAmount = parseFloat(tip) || 0;
  const total = cartTotal + tax + tipAmount;
  const transferBanks = (bankConfigs || []).filter((b) => b.enabledForTransfer);
  const [selectedTransferBankId, setSelectedTransferBankId] = useState<string>('');

  useEffect(() => {
    if (transferBanks.length === 0) {
      setSelectedTransferBankId('');
      return;
    }
    if (!transferBanks.some((b) => b.id === selectedTransferBankId)) {
      setSelectedTransferBankId(transferBanks[0].id);
    }
  }, [transferBanks, selectedTransferBankId]);

  const handleNumpadClick = (value: string) => {
    if (value === 'C') {
      setCashTendered('');
    } else if (value === 'backspace') {
      setCashTendered(prev => prev.slice(0, -1));
    } else if (value === '.') {
      if (!cashTendered.includes('.')) {
        setCashTendered(prev => prev + value);
      }
    } else {
      // Prevent multiple leading zeros
      if (cashTendered === '0' && value === '0') return;
      // Limit decimal places to 2
      if (cashTendered.includes('.') && cashTendered.split('.')[1].length >= 2) return;

      setCashTendered(prev => prev + value);
    }
  };

  const handleCashTenderedInput = (value: string) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    const integerPart = parts[0] || '';
    const decimalPart = parts[1] ?? '';
    const next = decimalPart.length > 0
      ? `${integerPart}.${decimalPart.slice(0, 2)}`
      : integerPart;
    setCashTendered(next);
  };

  const formattedCashTenderedInput = (() => {
    if (isCashInputFocused) return cashTendered;
    const num = parseFloat(cashTendered || '0');
    if (!Number.isFinite(num) || num <= 0) return '';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  })();

  const handleQuickAmount = (amount: number | 'exact') => {
    if (amount === 'exact') {
      setCashTendered(total.toFixed(2));
    } else {
      setCashTendered(amount.toString());
    }
  };

  const handleCheckout = async () => {
    if (activeTab === 'cash') {
      const tendered = parseFloat(cashTendered || '0');
      if (!Number.isFinite(tendered) || tendered < total) {
        alert('Cash tendered is less than total amount');
        return;
      }
    }

    setIsCheckingOut(true);
    const method = activeTab === 'transfer' ? 'online' : 'cash';
    const tenderedAmount = activeTab === 'cash' ? parseFloat(cashTendered || '0') : undefined;
    const selectedBank = activeTab === 'transfer'
      ? transferBanks.find((b) => b.id === selectedTransferBankId) || null
      : null;
    const success = await checkout(method, note, tenderedAmount, selectedBank);
    setIsCheckingOut(false);
    if (success) {
      if (autoPrint) {
        handlePrintBill();
      }
      setIsCheckoutModalOpen(false);
      setNote('');
      setTip('');
      setCashTendered('');
      alert('Order completed successfully!');
    } else {
      alert(`Checkout failed. Order was not saved.${checkoutError ? `\nReason: ${checkoutError}` : ''}`);
    }
  };

  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    holdOrder(note);
    setNote('');
    setTip('');
    alert('Order held successfully');
  };

  const handleResumeOrder = (orderId: string) => {
    const heldOrder = heldOrders.find(o => o.id === orderId);
    resumeOrder(orderId);
    if (heldOrder?.note) {
      setNote(heldOrder.note);
    }
    setMainTab('menu');
  };

  const handlePrintBill = () => {
    if (cart.length === 0) return;
    const paymentMethodLabel = activeTab === 'transfer' ? 'Transfer' : 'Cash';
    const tendered = parseFloat(cashTendered || '0');
    const change = Math.max(0, tendered - total);
    const selectedTransferBank = transferBanks.find((b) => b.id === selectedTransferBankId);

    const cartItemsHtml = cart.map((cartItem: any) =>
      '<tr>' +
      '<td style="padding: 2px 0; text-align: left;">' + cartItem.item.name + '</td>' +
      '<td style="padding: 2px 0; text-align: right;">' + cartItem.quantity + '</td>' +
      '<td style="padding: 2px 0; text-align: right;">' + formatCurrency(cartItem.item.price) + '</td>' +
      '<td style="padding: 2px 0; text-align: right;">' + formatCurrency(cartItem.item.price * cartItem.quantity) + '</td>' +
      '</tr>'
    ).join('');

    const noteHtml = note ?
      '<div style="margin-top: 10px; border-top: 1px dotted #000; padding-top: 5px;">' +
      '<span class="font-bold">Notes:</span><br>' +
      '<span>' + note + '</span>' +
      '</div>' : '';
    
    const tipHtml = 
      '<div class="flex justify-between">' +
      '<span>Tip</span>' +
      '<span>' + formatCurrency(tipAmount) + '</span>' +
      '</div>';
    
    const paymentMethodHtml =
      '<div class="flex justify-between">' +
      '<span>Payment Method</span>' +
      '<span>' + paymentMethodLabel + '</span>' +
      '</div>';
    const cashDetailsHtml = activeTab === 'cash'
      ? '<div class="flex justify-between">' +
      '<span>Cash Tendered</span>' +
      '<span>' + formatCurrency(Number.isFinite(tendered) ? tendered : 0) + '</span>' +
      '</div>' +
      '<div class="flex justify-between">' +
      '<span>Change</span>' +
      '<span>' + formatCurrency(change) + '</span>' +
      '</div>'
      : '';
    const transferDetailsHtml = (activeTab === 'transfer' && receiptSettings.showBankDetail)
      ? '<div style="margin-top: 8px; border-top: 1px dotted #000; padding-top: 6px;">' +
      '<div class="font-bold" style="margin-bottom: 4px;">Bank</div>' +
      '<div>Bank: ' + (selectedTransferBank?.bankName || '-') + '</div>' +
      '<div>Account Name: ' + (selectedTransferBank?.accountName || '-') + '</div>' +
      '<div>Account No: ' + (selectedTransferBank?.accountNumber || '-') + '</div>' +
      '</div>'
      : '';

    const receiptHtml =
      '<html>' +
      '<head>' +
      '<title>Bill Preview</title>' +
      '<meta charset="UTF-8">' +
      '<style>' +
      'body { font-family: \'Courier New\', monospace; padding: 20px; max-width: 300px; margin: 0 auto; color: #000; }' +
      '.text-center { text-align: center; }' +
      '.mb-4 { margin-bottom: 1rem; }' +
      '.mt-6 { margin-top: 1.5rem; }' +
      '.text-xs { font-size: 12px; }' +
      '.text-sm { font-size: 14px; }' +
      '.font-bold { font-weight: bold; }' +
      '.flex { display: flex; justify-content: space-between; }' +
      '.border-y { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }' +
      '.space-y-1 > div { margin-bottom: 4px; }' +
      'table { width: 100%; border-collapse: collapse; }' +
      'th, td { font-size: 12px; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<div class="text-center mb-4 text-xs">' +
      receiptSettings.headerText +
      '</div>' +
      '<div class="text-xs mb-4">' +
      'Type: BILL PREVIEW<br>' +
      'Date: ' + new Date().toLocaleString() + '<br>' +
      (receiptSettings.storeAddress ? 'Address: ' + receiptSettings.storeAddress + '<br>' : '') +
      (receiptSettings.phoneNumber ? 'Phone: ' + receiptSettings.phoneNumber : '') +
      '</div>' +
      '<div class="border-y text-xs">' +
      '<table>' +
      '<thead>' +
      '<tr>' +
      '<th style="text-align:left; padding-bottom: 4px;">Item</th>' +
      '<th style="text-align:right; padding-bottom: 4px;">Unit</th>' +
      '<th style="text-align:right; padding-bottom: 4px;">Price</th>' +
      '<th style="text-align:right; padding-bottom: 4px;">Total</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      cartItemsHtml +
      '</tbody>' +
      '</table>' +
      '</div>' +
      '<div class="space-y-1 text-xs mb-4">' +
      '<div class="flex justify-between">' +
      '<span>Subtotal</span>' +
      '<span>' + formatCurrency(cartTotal) + '</span>' +
      '</div>' +
      '<div class="flex justify-between">' +
      `<span>Tax (${generalSettings.taxRate}%)</span>` +
      '<span>' + formatCurrency(tax) + '</span>' +
      '</div>' +
      tipHtml +
      paymentMethodHtml +
      cashDetailsHtml +
      transferDetailsHtml +
      noteHtml +
      '</div>' +
      '<div style="text-align: center; margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;">' +
      '<div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 12px;">' +
      '<div style="font-weight: bold; font-size: 14px;">TOTAL</div>' +
      '<div style="font-weight: bold; font-size: 18px;">' + formatCurrency(total) + '</div>' +
      '</div>' +
      '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: center;">' +
      '<div>' +
      '<div style="font-size: 11px; color: #666;">THB</div>' +
      '<div style="font-weight: bold; font-size: 16px;">฿' + (total / (currencySettings.thbRate || 36.5)).toFixed(2) + '</div>' +
      '</div>' +
      '<div>' +
      '<div style="font-size: 11px; color: #666;">USD</div>' +
      '<div style="font-weight: bold; font-size: 16px;">$' + (total / currencySettings.currencyRate).toFixed(2) + '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="text-center mt-6 text-xs">' +
      receiptSettings.footerText +
      '</div>' +
      '<script>' +
      'window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }' +
      '</script>' +
      '</body>' +
      '</html>';

    if (silentPrint) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(receiptHtml);
        doc.close();
        // The script inside receiptHtml handles the printing and closing (not applicable to iframe, so we handle it here)
        setTimeout(() => {
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
        }, 500);
      }
    } else {
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
      }
    }
  };

  const TRANSLATIONS = {
    searchItems: "Search items...",
    allCategories: "All Items",
    ready: "Ready",
    stock: "Stock",
    portionsAvailable: "Portions Available",
    outOfStock: "Out of Stock",
    low: "Low",
    noHeldOrders: "No held orders",
    heldOrdersDescription: "Orders you hold will appear here.",
    resume: "Resume",
    delete: "Delete",
    currentOrder: "Current Order",
    holdOrder: "Hold Order",
    clearCart: "Clear Cart",
    emptyCart: "Your cart is empty",
    addOrderNotes: "Add order notes...",
    tipAmount: "Tip Amount",
    subtotal: "Subtotal",
    tax: "Tax",
    tip: "Tip",
    total: "Total",
    printBill: "Print Bill",
    checkout: "Checkout",
    completeOrder: "Complete Order",
    totalAmount: "Total Amount:",
    cash: "Cash",
    transfer: "Transfer",
    cashTendered: "Cash Tendered",
    totalDue: "Total Due:",
    tendered: "Tendered:",
    change: "Change:",
    due: "Due:",
    exact: "Exact",
    backspace: "Backspace",
    listView: "List view",
    gridView: "Grid view",
    noBankConfigured: "No bank enabled for transfer. Please configure it in Settings → Bank Config.",
    bank: "Bank",
    accountName: "Account Name",
    accountNumber: "Account Number",
    selected: " (Selected)",
    verifyTransfer: "Please verify the transfer has been completed before confirming the order.",
    processing: "Processing...",
    confirm: "Confirm",
    deleteHeldOrder: "Delete Held Order",
    cannotBeUndone: "This action cannot be undone.",
    confirmDeleteHeldOrder: "You are about to delete this held order:",
    items: "Items:",
    note: "Note:",
    time: "Time:",
    cannotBeUndoneWarning: "⚠️ This action cannot be undone.",
    cancel: "Cancel",
    deleteAction: "Delete",
    selectPortion: "Select Portion",
    choosePortionFor: "Choose a portion for",
    available: "Available:",
    cart: "Cart",
    item: "ITEM",
    itemsPlural: "ITEMS",
    discount: "Discount",
    hold: "Hold",
    // Add other translations as needed
  };

  const t = TRANSLATIONS; // Alias for easier access

  return (
    <div className="flex h-full">
      {/* Main POS Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Tabs value={mainTab} onValueChange={setMainTab} className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-zinc-200 bg-white px-4 pt-2">
            <TabsList>
              <TabsTrigger value="menu">Menu</TabsTrigger>
              <TabsTrigger value="takeout">Takeout / Held Orders ({heldOrders.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="menu" className="flex-1 overflow-hidden flex flex-col m-0 data-[state=inactive]:hidden">
            <div className="border-b border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    placeholder={t.searchItems}
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Button
                  variant={activeCategory === 'all' ? 'default' : 'outline'}
                  onClick={() => setActiveCategory('all')}
                  className="rounded-full"
                >
                  {t.allCategories}
                </Button>
                {displayCategories.map(category => (
                  <Button
                    key={category.id}
                    variant={activeCategory === category.id ? 'default' : 'outline'}
                    onClick={() => setActiveCategory(category.id)}
                    className="rounded-full whitespace-nowrap"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {filteredItems.map(item => {
                  // Calculate stock based on item type
                  let stock;
                  const isRecipe = item.is_recipe === false;
                  if (isRecipe) {
                    stock = recipeStocks[item.id] || 0;
                  } else {
                    stock = item.stock ?? 0;
                  }

                  const itemPortions = portionsByProduct[item.id] || [];
                  const hasPortions = itemPortions.length > 0;
                  const baseItemInCartQty = cart
                    .filter((c) => (c.sourceItemId || c.item.id) === item.id)
                    .reduce((sum, c) => sum + c.quantity, 0);
                  const adjustedPortions = itemPortions.map((portion) => {
                    const portionQtyInCart = cart
                      .filter((c) => c.portionId === portion.id)
                      .reduce((sum, c) => sum + c.quantity, 0);
                    const maxByRecipe = isRecipe ? stock : Number.MAX_SAFE_INTEGER;
                    const available = Math.max(0, Math.min(portion.stock, maxByRecipe) - portionQtyInCart);
                    return { ...portion, available };
                  });
                  const adjustedItemStock = hasPortions
                    ? adjustedPortions.reduce((sum, p) => sum + p.available, 0)
                    : Math.max(0, stock - baseItemInCartQty);
                  const isOutOfStock = adjustedItemStock <= 0;
                  const isLowStock = adjustedItemStock > 0 && adjustedItemStock < 10;

                  return (
                    <Card
                      key={item.id}
                      className={`cursor-pointer transition-all hover:border-blue-400 hover:shadow-lg relative overflow-hidden group ${isOutOfStock ? 'opacity-60 grayscale' : 'hover:bg-blue-50/10'}`}
                      onClick={() => {
                        if (isOutOfStock) return;
                        if (hasPortions) {
                          setPortionSelectionItem(item);
                        } else {
                          addToCart({ ...item, stock });
                        }
                      }}
                    >
                      {/* Accent Stripe */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${isOutOfStock ? 'bg-zinc-300' : 'bg-blue-500 group-hover:h-1.5 transition-all'}`} />

                      {isOutOfStock && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 font-bold text-red-600 backdrop-blur-[1px]">
                          {t.outOfStock}
                        </div>
                      )}
                      {isLowStock && (
                        <div className="absolute right-2 top-3 z-10 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-800 border border-yellow-200">
                          {t.low}: {adjustedItemStock}
                        </div>
                      )}
                      {!isOutOfStock && !isLowStock && (
                        <div className="absolute right-2 top-3 z-10 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200 shadow-sm">
                          {isRecipe ? `${t.ready}: ${adjustedItemStock}` : `${t.stock}: ${adjustedItemStock}`}
                        </div>
                      )}

                      <CardContent className="flex h-40 flex-col items-center justify-center p-4 text-center pt-6">
                        <div className="font-bold text-zinc-800">{item.name}</div>
                        <div className="mt-2 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{formatCurrency(item.price)}</div>
                        {hasPortions && (
                          <div className="mt-2 text-[10px] text-zinc-500 font-medium bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                            {itemPortions.length} {t.portionsAvailable}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="takeout" className="flex-1 overflow-y-auto p-4 m-0 data-[state=inactive]:hidden">
            {heldOrders.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-zinc-500">
                <PauseCircle className="mb-4 h-16 w-16 opacity-20" />
                <p className="text-lg font-medium">{t.noHeldOrders}</p>
                <p className="text-sm">{t.heldOrdersDescription}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {heldOrders.map((order) => {
                  const orderTotal = order.cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
                  return (
                    <Card key={order.id} className="flex flex-col">
                      <div className="flex items-center justify-between border-b border-zinc-100 p-4 bg-zinc-50/50">
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Clock className="h-4 w-4" />
                          {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="font-bold text-lg">{formatCurrency(orderTotal * (1 + taxRateDecimal))}</div>
                      </div>
                      <CardContent className="flex-1 p-4">
                        {order.note && (
                          <div className="mb-3 rounded-md bg-yellow-50 p-2 text-sm text-yellow-800 border border-yellow-100">
                            {t.note}: {order.note}
                          </div>
                        )}
                        <div className="space-y-1 text-sm">
                          {order.cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{item.quantity}x {item.item.name}</span>
                              <span className="text-zinc-500">{formatCurrency(item.item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                      <div className="flex gap-2 p-4 pt-0">
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => handleResumeOrder(order.id)}
                        >
                          <PlayCircle className="mr-2 h-4 w-4" /> {t.resume}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setOrderToDelete(order.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> {t.delete}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Cart Sidebar */}
      <div className="flex w-[30rem] flex-col border-l border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4">
          <h2 className="text-lg font-semibold">{t.currentOrder}</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleHoldOrder} disabled={cart.length === 0} title={t.holdOrder} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <PauseCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={clearCart} disabled={cart.length === 0} title={t.clearCart} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500">
              <ShoppingCart className="mb-4 h-12 w-12 opacity-20" />
              <p>{t.emptyCart}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((cartItem) => (
                <div key={cartItem.item.id} className="flex items-center justify-between gap-2 pr-10">
                  <div className="flex-1">
                    <div className="font-medium">{cartItem.item.name}</div>
                    <div className="text-sm text-zinc-500">{formatCurrency(cartItem.item.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 mr-1"
                      onClick={() => removeFromCart(cartItem.item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateCartQuantity(cartItem.item.id, cartItem.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-4 text-center text-sm">{cartItem.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateCartQuantity(cartItem.item.id, cartItem.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="w-12 text-left font-medium">
                    {formatCurrency(cartItem.item.price * cartItem.quantity)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4">
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={t.addOrderNotes}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <label className="text-sm font-semibold text-blue-900 mb-2 block">{t.tipAmount}</label>
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-medium">{currencySettings.currencySymbol}</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                className="flex-1 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">{t.subtotal}</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">{t.tax} ({generalSettings.taxRate}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-500">{t.tip}</span>
                <span>{formatCurrency(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-lg font-bold">
              <span>{t.total}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              variant="outline"
              className="h-12 px-4"
              onClick={handlePrintBill}
              disabled={cart.length === 0}
              title={t.printBill}
            >
              <Printer className="h-5 w-5" />
            </Button>
            <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
              <DialogTrigger asChild>
                <Button
                  className="flex-1 h-12 text-lg"
                  disabled={cart.length === 0 || isCheckingOut}
                >
                  {t.checkout}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>{t.completeOrder}</DialogTitle>
                  <DialogDescription>
                    {t.totalAmount} <span className="font-bold text-lg text-zinc-900">{formatCurrency(total)}</span>
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="cash" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cash">{t.cash}</TabsTrigger>
                    <TabsTrigger value="transfer">{t.transfer}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="cash" className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Left Column: Input and Details */}
                      <div className="space-y-4">
                        <div className="flex flex-col space-y-2">
                          <Label htmlFor="cash-tendered">{t.cashTendered}</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{currencySettings.currencySymbol}</span>
                            <Input
                              id="cash-tendered"
                              className="pl-7 text-lg font-bold"
                              value={formattedCashTenderedInput}
                              onChange={(e) => handleCashTenderedInput(e.target.value)}
                              onFocus={() => setIsCashInputFocused(true)}
                              onBlur={() => {
                                setIsCashInputFocused(false);
                                const parsed = parseFloat(cashTendered || '0');
                                if (Number.isFinite(parsed) && parsed > 0) {
                                  setCashTendered(parsed.toFixed(2));
                                } else {
                                  setCashTendered('');
                                }
                              }}
                              inputMode="decimal"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="rounded-lg bg-zinc-50 p-4 space-y-2 border border-zinc-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">{t.totalDue}</span>
                            <span className="font-bold">{formatCurrency(total)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">{t.tendered}</span>
                            <span className="font-medium">{formatCurrency(parseFloat(cashTendered || '0'))}</span>
                          </div>
                          <div className="border-t border-zinc-200 pt-2 flex justify-between font-bold text-lg">
                            <span className={parseFloat(cashTendered || '0') >= total ? "text-green-600" : "text-red-600"}>
                              {parseFloat(cashTendered || '0') >= total ? t.change : t.due}
                            </span>
                            <span className={parseFloat(cashTendered || '0') >= total ? "text-green-600" : "text-red-600"}>
                              {formatCurrency(Math.abs((parseFloat(cashTendered || '0') - total)))}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {(() => {
                            const exact = total;
                            // Round to next 1k, 10k, 50k, 100k
                            const nextRoundAmounts = [
                              Math.ceil(total / 1000) * 1000,
                              Math.ceil(total / 5000) * 5000,
                              Math.ceil(total / 10000) * 10000,
                              Math.ceil(total / 20000) * 20000,
                              Math.ceil(total / 50000) * 50000,
                              Math.ceil(total / 100000) * 100000,
                              200000,
                              500000,
                              1000000
                            ];

                            // Unique suggestions > exact (except for the buttons we handle separately)
                            const uniqueSuggests = Array.from(new Set(nextRoundAmounts))
                              .filter(a => a > exact)
                              .sort((a, b) => a - b)
                              .slice(0, 5); // Take up to 5 suggestions

                            return (
                              <>
                                <Button variant="outline" onClick={() => handleQuickAmount('exact')} className="text-sm font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50">{t.exact}</Button>
                                {uniqueSuggests.map(amount => (
                                  <Button
                                    key={amount}
                                    variant="outline"
                                    onClick={() => handleQuickAmount(amount)}
                                    className="text-sm font-medium border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50"
                                  >
                                    {formatCurrency(amount)}
                                  </Button>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      {/* Right Column: Numpad */}
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <Button
                            key={num}
                            variant="outline"
                            className="h-12 text-lg font-medium"
                            onClick={() => handleNumpadClick(num.toString())}
                          >
                            {num}
                          </Button>
                        ))}
                        <Button variant="outline" className="h-12 text-lg font-medium" onClick={() => handleNumpadClick('.')}>.</Button>
                        <Button variant="outline" className="h-12 text-lg font-medium" onClick={() => handleNumpadClick('0')}>0</Button>
                        <Button variant="destructive" className="h-12" onClick={() => handleNumpadClick('C')}>C</Button>
                        <Button variant="secondary" className="col-span-3 h-12" onClick={() => handleNumpadClick('backspace')}>
                          {t.backspace}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="transfer" className="space-y-4 py-4">
                    {transferBanks.length > 0 && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant={transferViewMode === 'list' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTransferViewMode('list')}
                          title={t.listView}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={transferViewMode === 'grid' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTransferViewMode('grid')}
                          title={t.gridView}
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {transferBanks.length === 0 ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        {t.noBankConfigured}
                      </div>
                    ) : (
                      <div className={transferViewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
                        {transferBanks.map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => setSelectedTransferBankId(bank.id)}
                            className={`w-full rounded-lg border p-4 space-y-3 text-left ${selectedTransferBankId === bank.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-zinc-200'
                              }`}
                          >
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                              <span className="text-sm text-zinc-500">{t.bank}</span>
                              <span className="font-medium">
                                {bank.bankName}
                                {selectedTransferBankId === bank.id ? t.selected : ''}
                              </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                              <span className="text-sm text-zinc-500">{t.accountName}</span>
                              <span className="font-medium">{bank.accountName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-zinc-500">Account Number</span>
                              <span className="font-mono font-medium">{bank.accountNumber}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                      {t.verifyTransfer}
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <div className="flex w-full gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrintBill}
                      disabled={cart.length === 0}
                      className="w-28"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleCheckout}
                      disabled={isCheckingOut || (activeTab === 'transfer' && (transferBanks.length === 0 || !selectedTransferBankId))}
                      className="flex-1"
                    >
                      {isCheckingOut ? t.processing : `${t.confirm} ${activeTab === 'cash' ? t.cash : t.transfer}`}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
          <AlertDialogContent className="sm:max-w-md border-red-200 shadow-2xl bg-white">
            <AlertDialogHeader className="space-y-3">
              <AlertDialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                {t.deleteHeldOrder}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base text-zinc-700">
                {(() => {
                  const order = heldOrders.find(o => o.id === orderToDelete);
                  if (!order) return 'This action cannot be undone.';
                  const itemCount = order.cart.length;
                  const orderTotal = order.cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
                  return (
                    <div className="space-y-3 mt-4">
                      <p className="font-medium text-zinc-900">You are about to delete this held order:</p>
                      <div className="bg-white border-2 border-red-200 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-red-900">Items:</span>
                          <span className="text-sm font-bold text-red-700 bg-red-50 px-3 py-1 rounded">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-red-900">Total:</span>
                          <span className="text-lg font-bold text-red-700">{formatCurrency(orderTotal)}</span>
                        </div>
                        {order.note && (
                          <div className="pt-2 border-t border-red-200">
                            <span className="text-sm font-semibold text-red-900">Note:</span>
                            <p className="text-sm text-red-800 mt-1 italic">{order.note}</p>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-red-200">
                          <span className="text-sm font-semibold text-red-900">Time:</span>
                          <span className="text-sm text-red-700">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="bg-red-50 border border-red-300 rounded-md p-3">
                        <p className="text-sm font-bold text-red-700">⚠️ This action cannot be undone.</p>
                      </div>
                    </div>
                  );
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 pt-4">
              <AlertDialogCancel className="border-zinc-300 hover:bg-zinc-100">
                {t.cancel}
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (orderToDelete) {
                  removeHeldOrder(orderToDelete);
                  setOrderToDelete(null);
                }
              }} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
                {t.deleteAction}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!portionSelectionItem} onOpenChange={(open) => !open && setPortionSelectionItem(null)}>
          <DialogContent className="sm:max-w-[400px] border-indigo-100 p-0 overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500" />
            <DialogHeader className="p-6 pb-4 bg-indigo-50/50 border-b border-indigo-100">
              <DialogTitle className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-indigo-600" />
                Select Portion
              </DialogTitle>
              <DialogDescription className="text-indigo-700/70">
                Choose a portion for <span className="font-bold text-indigo-900">{portionSelectionItem?.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto bg-white/50 backdrop-blur-sm">
              {portionSelectionItem && (portionsByProduct[portionSelectionItem.id] || []).map((portion) => {
                const isRecipe = portionSelectionItem.is_recipe === false;
                const stock = isRecipe ? (recipeStocks[portionSelectionItem.id] || 0) : (portionSelectionItem.stock || 0);
                const portionQtyInCart = cart
                  .filter((c) => c.portionId === portion.id)
                  .reduce((sum, c) => sum + c.quantity, 0);
                const maxByRecipe = isRecipe ? stock : Number.MAX_SAFE_INTEGER;
                const available = Math.max(0, Math.min(portion.stock, maxByRecipe) - portionQtyInCart);
                const isOutOfStock = available <= 0;
                const currentQty = portionQuantities[portion.id] || 0;

                return (
                  <div
                    key={portion.id}
                    className={`w-full group flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${isOutOfStock
                      ? 'border-zinc-100 bg-zinc-50 opacity-60'
                      : 'border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex flex-col items-start gap-1 flex-1">
                      <span className={`font-bold text-lg ${isOutOfStock ? 'text-zinc-500' : 'text-zinc-800'}`}>
                        {portion.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOutOfStock ? 'bg-zinc-200 text-zinc-500' : 'bg-indigo-100 text-indigo-700'}`}>
                          {isOutOfStock ? 'Out of Stock' : `Available: ${available}`}
                        </span>
                        {!isOutOfStock && (
                          <span className="text-sm font-black text-indigo-600">
                            {formatCurrency(portion.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isOutOfStock && (
                      <div className="flex items-center gap-2 ml-4 bg-white p-1 rounded-lg border border-indigo-100 shadow-sm">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => setPortionQuantities(prev => ({ ...prev, [portion.id]: Math.max(0, prev[portion.id] - 1) }))}
                          disabled={currentQty <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={currentQty === 0 ? '' : currentQty}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                            if (!isNaN(val)) {
                              setPortionQuantities(prev => ({ ...prev, [portion.id]: Math.max(0, Math.min(available, val)) }));
                            }
                          }}
                          className="w-12 h-8 text-center font-bold text-indigo-900 border-none bg-transparent p-0 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => setPortionQuantities(prev => ({ ...prev, [portion.id]: Math.min(available, prev[portion.id] + 1) }))}
                          disabled={currentQty >= available}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter className="p-4 bg-zinc-50 border-t border-zinc-100 flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setPortionSelectionItem(null)}
                className="px-6 border-zinc-300 text-zinc-600 hover:bg-zinc-100 rounded-lg h-11"
              >
                {t.cancel}
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg text-base font-bold shadow-lg shadow-indigo-200"
                onClick={() => {
                  const portions = portionsByProduct[portionSelectionItem.id] || [];
                  portions.forEach(portion => {
                    const qty = portionQuantities[portion.id] || 0;
                    if (qty > 0) {
                      const isRecipe = portionSelectionItem.is_recipe === false;
                      const stock = isRecipe ? (recipeStocks[portionSelectionItem.id] || 0) : (portionSelectionItem.stock || 0);
                      const totalCapacity = Math.min(portion.stock, isRecipe ? stock : Number.MAX_SAFE_INTEGER);
                      addToCart(
                        {
                          ...portionSelectionItem,
                          id: `${portionSelectionItem.id}::${portion.id}`,
                          name: `${portionSelectionItem.name} (${portion.name})`,
                          price: portion.price,
                          stock: totalCapacity,
                         },
                        {
                          sourceItemId: portionSelectionItem.id,
                          portionName: portion.name,
                          portionId: portion.id,
                          quantity: qty,
                        }
                      );
                    }
                  });
                  setPortionSelectionItem(null);
                }}
                disabled={!Object.values(portionQuantities).some(q => q > 0)}
              >
                {t.addToCart}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ShoppingCart(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

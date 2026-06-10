# POS Table Integration Guide

## Overview
คู่มือการ integrate ระบบเลือกโต๊ะเข้ากับหน้า POS

## ✅ สิ่งที่ทำเสร็จแล้ว

### 1. Table Selection Component (`components/table-selection.tsx`)
- ✅ Component สำหรับเลือกโต๊ะหรือ Takeout
- ✅ แสดงโซนและโต๊ะทั้งหมด
- ✅ แสดงสถานะโต๊ะด้วยสี (ว่าง/มีคน/จอง)
- ✅ ปุ่ม Takeout ขนาดใหญ่
- ✅ รองรับ 3 ภาษา (EN/LO/TH)

### 2. Store Updates (`lib/store.ts`)
- ✅ เพิ่ม `currentTable` state
- ✅ เพิ่ม `currentOrderType` state
- ✅ เพิ่ม `setCurrentTable()` function
- ✅ เพิ่ม `clearCurrentTable()` function

## 🚧 สิ่งที่ต้องทำต่อ

### 1. อัปเดต POS Page (`app/pos/page.tsx`)

#### A. เพิ่ม State และ Import
```typescript
import { TableSelection } from '@/components/table-selection';
import { Table } from '@/lib/supabase';

// ใน component
const [showTableSelection, setShowTableSelection] = useState(true);
const { currentTable, currentOrderType, setCurrentTable, clearCurrentTable } = usePosStore();
```

#### B. เพิ่ม Logic การเลือกโต๊ะ
```typescript
// แสดง Table Selection เมื่อเริ่มต้น หรือเมื่อ cart ว่าง
useEffect(() => {
  if (cart.length === 0 && !currentTable && !currentOrderType) {
    setShowTableSelection(true);
  }
}, [cart, currentTable, currentOrderType]);

// Handle table selection
const handleTableSelect = (table: Table | null, orderType: 'dine-in' | 'takeout') => {
  setCurrentTable(table, orderType);
  setShowTableSelection(false);
};

// Clear table when cart is cleared
const handleClearCart = () => {
  clearCart();
  clearCurrentTable();
  setShowTableSelection(true);
};
```

#### C. แสดง Table Selection Modal
```typescript
return (
  <div>
    {showTableSelection && (
      <TableSelection
        onSelectTable={handleTableSelect}
        onClose={() => {
          // ถ้ายังไม่ได้เลือก ให้ redirect กลับหน้าอื่น
          if (!currentTable && !currentOrderType) {
            router.push('/');
          } else {
            setShowTableSelection(false);
          }
        }}
      />
    )}
    
    {/* POS Content */}
    {!showTableSelection && (
      <div>
        {/* แสดงข้อมูลโต๊ะที่เลือก */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          {currentOrderType === 'takeout' ? (
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              <span className="font-bold">Takeout Order</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5 text-blue-600" />
              <span className="font-bold">
                Table: {currentTable?.table_number}
              </span>
              <span className="text-sm text-zinc-600">
                ({currentTable?.capacity} people)
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearCurrentTable();
              setShowTableSelection(true);
            }}
          >
            Change Table
          </Button>
        </div>
        
        {/* Rest of POS UI */}
      </div>
    )}
  </div>
);
```

### 2. อัปเดต Checkout Function (`lib/store.ts`)

ใน checkout function (บรรทัด ~1323) ต้องเพิ่ม:

```typescript
checkout: async (paymentMethod, notes, cashTendered, selectedBank) => {
  const { 
    cart, isSupabaseConfigured, items, isOnline, generalSettings,
    currentTable, currentOrderType  // เพิ่มตรงนี้
  } = get();
  
  if (cart.length === 0) return false;

  // ... existing code ...

  if (isSupabaseConfigured && isOnline) {
    try {
      const orderInsertPayload: Record<string, any> = {
        total_amount: totalAmount,
        status: 'completed',
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
        table_id: currentTable?.id || null,  // เพิ่มตรงนี้
        zone_id: currentTable?.zone_id || null,  // เพิ่มตรงนี้
        order_type: currentOrderType || 'takeout'  // เพิ่มตรงนี้
      };
      
      if (notes) orderInsertPayload.notes = notes;

      // ... rest of checkout code ...

      // หลัง checkout สำเร็จ
      // 1. อัปเดตสถานะโต๊ะเป็น available (ถ้าเป็น dine-in)
      if (currentTable && currentOrderType === 'dine-in') {
        await supabase
          .from('tables')
          .update({ 
            status: 'available',
            current_order_id: null
          })
          .eq('id', currentTable.id);
      }

      // 2. Clear current table
      set({ currentTable: null, currentOrderType: null });

      // ... existing success code ...
    } catch (error) {
      // ... error handling ...
    }
  }
};
```

### 3. อัปเดตสถานะโต๊ะเมื่อเริ่มสั่ง

เพิ่ม function ใหม่ใน store:

```typescript
markTableAsOccupied: async (tableId: string, orderId?: string) => {
  const { isSupabaseConfigured, isOnline } = get();
  
  if (isSupabaseConfigured && isOnline) {
    try {
      await supabase
        .from('tables')
        .update({ 
          status: 'occupied',
          current_order_id: orderId || null
        })
        .eq('id', tableId);
    } catch (error) {
      console.error('Failed to mark table as occupied:', error);
    }
  }
}
```

เรียกใช้เมื่อเพิ่มสินค้าชิ้นแรกในโต๊ะ:

```typescript
addToCart: (item, options) => {
  const { cart, currentTable, currentOrderType } = get();
  
  // ... existing add to cart logic ...

  // ถ้าเป็นสินค้าชิ้นแรกและเป็น dine-in
  if (cart.length === 0 && currentTable && currentOrderType === 'dine-in') {
    get().markTableAsOccupied(currentTable.id);
  }
}
```

### 4. อัปเดต Hold Order

เมื่อ hold order ต้อง:
1. บันทึก table และ order type ด้วย
2. ปล่อยโต๊ะ (เปลี่ยนสถานะเป็น available)

```typescript
holdOrder: (note) => {
  const { cart, currentTable, currentOrderType } = get();
  
  if (cart.length === 0) return;

  const heldOrder = {
    id: Date.now().toString(),
    cart: [...cart],
    date: new Date().toISOString(),
    note: note || '',
    table: currentTable,  // เพิ่มตรงนี้
    orderType: currentOrderType  // เพิ่มตรงนี้
  };

  set(state => ({
    heldOrders: [...state.heldOrders, heldOrder],
    cart: [],
    currentTable: null,
    currentOrderType: null
  }));

  // ปล่อยโต๊ะ
  if (currentTable && currentOrderType === 'dine-in') {
    supabase
      .from('tables')
      .update({ status: 'available', current_order_id: null })
      .eq('id', currentTable.id);
  }
};
```

### 5. อัปเดต Resume Order

เมื่อ resume order ต้อง:
1. โหลด table และ order type กลับมา
2. ตรวจสอบว่าโต๊ะยังว่างอยู่ไหม

```typescript
resumeOrder: (orderId) => {
  const heldOrder = get().heldOrders.find(o => o.id === orderId);
  if (!heldOrder) return;

  // ตรวจสอบว่าโต๊ะยังว่างอยู่ไหม (ถ้าเป็น dine-in)
  if (heldOrder.table && heldOrder.orderType === 'dine-in') {
    supabase
      .from('tables')
      .select('status')
      .eq('id', heldOrder.table.id)
      .single()
      .then(({ data }) => {
        if (data && data.status !== 'available') {
          alert('Table is no longer available. Please select a new table.');
          return;
        }
        
        // Resume order
        set({
          cart: heldOrder.cart,
          currentTable: heldOrder.table,
          currentOrderType: heldOrder.orderType,
          heldOrders: get().heldOrders.filter(o => o.id !== orderId)
        });

        // Mark table as occupied
        if (heldOrder.table) {
          get().markTableAsOccupied(heldOrder.table.id);
        }
      });
  } else {
    // Takeout order - resume directly
    set({
      cart: heldOrder.cart,
      currentTable: heldOrder.table,
      currentOrderType: heldOrder.orderType,
      heldOrders: get().heldOrders.filter(o => o.id !== orderId)
    });
  }
};
```

## 📋 Checklist

### POS Page Updates
- [ ] Import TableSelection component
- [ ] Add showTableSelection state
- [ ] Add useEffect to show table selection when cart is empty
- [ ] Add handleTableSelect function
- [ ] Update handleClearCart to clear table
- [ ] Add table info display in UI
- [ ] Add "Change Table" button

### Store Updates
- [ ] Update checkout to save table_id, zone_id, order_type
- [ ] Update checkout to release table after payment
- [ ] Add markTableAsOccupied function
- [ ] Update addToCart to mark table as occupied on first item
- [ ] Update holdOrder to save and release table
- [ ] Update resumeOrder to restore table and check availability
- [ ] Update clearCart to clear table

### Testing
- [ ] Test selecting table and ordering
- [ ] Test selecting takeout and ordering
- [ ] Test table status updates (available → occupied → available)
- [ ] Test hold order with table
- [ ] Test resume order with table
- [ ] Test changing table mid-order
- [ ] Test multiple orders on different tables
- [ ] Test order history shows table info

## 🎨 UI Enhancements (Optional)

### Table Info Badge
```typescript
<div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 mb-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      {currentOrderType === 'takeout' ? (
        <>
          <div className="bg-blue-600 rounded-full p-2">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-blue-900">Takeout Order</div>
            <div className="text-sm text-blue-600">For pickup</div>
          </div>
        </>
      ) : (
        <>
          <div className="bg-blue-600 rounded-full p-2">
            <Grid3x3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-blue-900">
              Table {currentTable?.table_number}
            </div>
            <div className="text-sm text-blue-600">
              {currentTable?.capacity} seats • {getZoneName(currentTable?.zone_id)}
            </div>
          </div>
        </>
      )}
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (cart.length > 0) {
          if (confirm('Clear current order to change table?')) {
            handleClearCart();
          }
        } else {
          setShowTableSelection(true);
        }
      }}
      className="border-blue-300 text-blue-700 hover:bg-blue-50"
    >
      Change
    </Button>
  </div>
</div>
```

### Order History Table Column
เพิ่มคอลัมน์ Table/Type ในหน้า Order History:

```typescript
<td className="p-4">
  {order.order_type === 'takeout' ? (
    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
      Takeout
    </span>
  ) : order.table_id ? (
    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
      Table {getTableNumber(order.table_id)}
    </span>
  ) : (
    <span className="text-zinc-400">-</span>
  )}
</td>
```

## 🐛 Known Issues & Solutions

### Issue 1: Table stays occupied after app crash
**Solution**: Add cleanup on app start
```typescript
useEffect(() => {
  // On app start, check for orphaned occupied tables
  const cleanupOrphanedTables = async () => {
    const { data: occupiedTables } = await supabase
      .from('tables')
      .select('*')
      .eq('status', 'occupied');
    
    // Check if orders still exist
    for (const table of occupiedTables || []) {
      if (table.current_order_id) {
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('id', table.current_order_id)
          .single();
        
        if (!order) {
          // Order doesn't exist, release table
          await supabase
            .from('tables')
            .update({ status: 'available', current_order_id: null })
            .eq('id', table.id);
        }
      }
    }
  };
  
  cleanupOrphanedTables();
}, []);
```

### Issue 2: User closes browser mid-order
**Solution**: Use localStorage to persist current table
```typescript
// Save to localStorage
useEffect(() => {
  if (currentTable || currentOrderType) {
    localStorage.setItem('currentOrder', JSON.stringify({
      table: currentTable,
      orderType: currentOrderType,
      timestamp: Date.now()
    }));
  } else {
    localStorage.removeItem('currentOrder');
  }
}, [currentTable, currentOrderType]);

// Restore on load
useEffect(() => {
  const saved = localStorage.getItem('currentOrder');
  if (saved) {
    const { table, orderType, timestamp } = JSON.parse(saved);
    // Only restore if less than 1 hour old
    if (Date.now() - timestamp < 3600000) {
      setCurrentTable(table, orderType);
    } else {
      localStorage.removeItem('currentOrder');
    }
  }
}, []);
```

## 📚 Related Files

- `components/table-selection.tsx` - Table selection component
- `app/pos/page.tsx` - POS page (needs updates)
- `lib/store.ts` - State management (partially updated)
- `app/orders/page.tsx` - Order history (needs table column)
- `app/tables/page.tsx` - Table management page

## 🚀 Deployment Checklist

Before deploying:
- [ ] Run database migration (`supabase_schema.sql`)
- [ ] Test all table operations
- [ ] Test order flow end-to-end
- [ ] Verify table status updates correctly
- [ ] Test with multiple concurrent users
- [ ] Check order history shows table info
- [ ] Verify held orders work with tables
- [ ] Test takeout orders
- [ ] Check translations in all 3 languages

# Tables & Zones System Guide

## Overview
ระบบจัดการโต๊ะและโซนสำหรับร้านอาหาร รองรับการเลือกโต๊ะก่อนสั่งอาหาร หรือเลือก Takeout

## Features Implemented

### 1. Database Schema (`tables-system-schema.sql`)

#### Tables Created:
- **zones** - โซนของร้าน (Indoor, Outdoor, VIP, etc.)
  - id, name, description, color, display_order, status, created_at
  
- **tables** - โต๊ะในร้าน
  - id, table_number, zone_id, capacity, status, current_order_id, display_order, created_at
  - Status: available, occupied, reserved, inactive

#### Orders Table Updates:
- Added `table_id` - เชื่อมโยงกับโต๊ะ
- Added `zone_id` - เชื่อมโยงกับโซน
- Added `order_type` - ประเภทออเดอร์ (dine-in, takeout, delivery)

### 2. TypeScript Types (`lib/supabase.ts`)

```typescript
export type Zone = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
};

export type Table = {
  id: string;
  table_number: string;
  zone_id?: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'inactive';
  current_order_id?: string;
  display_order: number;
  created_at: string;
};

export type Order = {
  // ... existing fields
  table_id?: string;
  zone_id?: string;
  order_type?: 'dine-in' | 'takeout' | 'delivery';
};
```

### 3. Tables Management Page (`app/tables/page.tsx`)

#### Features:
- **Two Tabs**: Tables และ Zones
- **CRUD Operations**: Create, Read, Update, Delete
- **Table Management**:
  - เพิ่ม/แก้ไข/ลบโต๊ะ
  - กำหนดเลขโต๊ะ, โซน, จำนวนที่นั่ง, สถานะ
  - แสดงสถานะโต๊ะด้วยสี (ว่าง=เขียว, มีคน=แดง, จอง=เหลือง)
  
- **Zone Management**:
  - เพิ่ม/แก้ไข/ลบโซน
  - กำหนดชื่อ, รายละเอียด, สี, สถานะ
  - แสดงโซนด้วยสีที่กำหนด

#### Translations:
- ✅ English
- ✅ Lao (ລາວ)
- ✅ Thai (ไทย)

### 4. Sidebar Integration (`components/sidebar.tsx`)

- เพิ่มเมนู "Tables & Zones" / "ໂຕະ ແລະ ໂຊນ" / "โต๊ะและโซน"
- ใช้ icon Grid3x3
- รองรับ permissions system

## Setup Instructions

### 1. Run Database Migration

```bash
# Execute in Supabase SQL Editor
# File: tables-system-schema.sql
```

This will:
- Create zones and tables tables
- Add table_id, zone_id, order_type to orders table
- Insert sample zones (Indoor, Outdoor, VIP)
- Insert 10 sample tables

### 2. Access Tables Management

1. Go to sidebar menu
2. Click "Tables & Zones"
3. Manage zones in Zones tab
4. Manage tables in Tables tab

## Next Steps (POS Integration)

### To Be Implemented:

1. **Table Selection Screen in POS**
   - Show all zones with tables
   - Display table status (available/occupied)
   - Add "Takeout" option
   - Select table before ordering

2. **POS Workflow**
   ```
   Start → Select Table/Takeout → Select Items → Checkout
   ```

3. **Table Status Updates**
   - Mark table as "occupied" when order starts
   - Mark table as "available" when order completes
   - Update current_order_id on table

4. **Order History Integration**
   - Show table number in order history
   - Filter orders by table/zone
   - Show order type (dine-in/takeout)

## Default Data

### Zones:
1. **Indoor** - สีน้ำเงิน (#3B82F6)
2. **Outdoor** - สีเขียว (#10B981)
3. **VIP** - สีส้ม (#F59E0B)

### Tables:
- T1-T10 (10 tables)
- T1-T5: 4 seats each
- T6-T8: 6 seats each
- T9-T10: 2 seats each
- All in Indoor zone by default

## Permissions

Add "tables" to employee permissions:
```typescript
permissions: {
  menus: {
    tables: true/false
  }
}
```

## API Endpoints (Future)

Suggested endpoints for table operations:
- `GET /api/tables/list` - Get all tables with status
- `GET /api/tables/available` - Get available tables only
- `POST /api/tables/occupy` - Mark table as occupied
- `POST /api/tables/release` - Mark table as available
- `GET /api/zones/list` - Get all zones

## UI/UX Considerations

### Table Selection Screen:
- Group tables by zone
- Show visual table layout
- Color-coded status
- Quick "Takeout" button
- Search/filter tables

### Table Card Display:
- Table number (large)
- Zone name
- Capacity (people icon)
- Status badge
- Current order info (if occupied)

## Best Practices

1. **Always select table/takeout first** before adding items
2. **Update table status** when order starts/ends
3. **Clear table** when payment is completed
4. **Reserve tables** for future bookings
5. **Inactive tables** for maintenance/cleaning

## Troubleshooting

### Tables not showing?
- Check if zones exist first
- Verify database migration ran successfully
- Check table status (not inactive)

### Cannot delete zone?
- Check if tables are assigned to that zone
- Reassign tables to another zone first

### Table status not updating?
- Verify order has table_id set
- Check POS integration is complete

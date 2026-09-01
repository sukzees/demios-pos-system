# Employee Permissions System

## Overview
The permissions system allows administrators to control which menus and actions each employee can access in the POS system.

## Features

### 1. Menu Access Control
Control which menu items are visible to each employee:
- **Dashboard** - Main dashboard view
- **POS** - Point of Sale interface
- **History** - Order and Shift history
- **Items & Categories** - Product management
- **Inventory** - Stock management
- **Employees** - Staff management
- **Expenses** - Expense tracking
- **Reports** - Business reports
- **Settings** - System settings

### 2. Action Permissions
Control what actions employees can perform:
- **View** - View data
- **Create** - Create new records
- **Edit** - Modify existing records
- **Delete** - Remove records
- **Export** - Export data to CSV

## Implementation

### Database Schema
The `employees` table has a `permissions` JSONB column with the following structure:

```json
{
  "menus": {
    "dashboard": true,
    "pos": true,
    "history": true,
    "items": false,
    "inventory": false,
    "employees": false,
    "expenses": false,
    "reports": false,
    "settings": false
  },
  "actions": {
    "view": true,
    "create": false,
    "edit": false,
    "delete": false,
    "export": false
  }
}
```

### TypeScript Types
```typescript
export type EmployeePermissions = {
  menus: {
    dashboard?: boolean;
    pos?: boolean;
    history?: boolean;
    items?: boolean;
    inventory?: boolean;
    employees?: boolean;
    expenses?: boolean;
    reports?: boolean;
    settings?: boolean;
  };
  actions: {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    export?: boolean;
  };
};

export type Employee = {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  pin?: string;
  status: 'active' | 'inactive';
  permissions?: EmployeePermissions;
  created_at: string;
};
```

### UI Components

#### Employees Page (`app/employees/page.tsx`)
- Add/Edit employee dialog includes permissions management
- Two sections: Menu Access and Action Permissions
- Checkboxes for each menu and action
- Fully translated in EN, LO, TH

#### Sidebar (`components/sidebar.tsx`)
- Filters navigation items based on user permissions
- Admin users see all menus
- Other users only see menus they have permission for
- Uses `hasMenuPermission()` function to check access

### Permission Checking

#### In Sidebar
```typescript
const hasMenuPermission = (menuId: string): boolean => {
  // Admin has access to everything
  if (user?.role === 'admin') return true;
  
  // Check user permissions
  if (!user?.permissions?.menus) return false;
  
  return user.permissions.menus[menuId] || false;
};

const filteredNavigation = navigation.filter(item => hasMenuPermission(item.id));
```

#### In Pages (Example)
```typescript
// Check if user can create
if (!user?.permissions?.actions?.create && user?.role !== 'admin') {
  // Hide or disable create button
}

// Check if user can delete
if (!user?.permissions?.actions?.delete && user?.role !== 'admin') {
  // Hide or disable delete button
}

// Check if user can export
if (!user?.permissions?.actions?.export && user?.role !== 'admin') {
  // Hide or disable export button
}
```

## Setup Instructions

### 1. Run Database Migration
Execute the SQL migration to add the permissions column:

```bash
# Run the migration file in your Supabase SQL editor
# File: add-employee-permissions.sql
```

### 2. Update Existing Employees
The migration automatically:
- Adds default permissions to all existing employees
- Gives admin users full permissions
- Sets staff/manager users with limited permissions

### 3. Configure Permissions
1. Go to **Employees** page
2. Click **Edit** on an employee
3. Scroll to **Permissions** section
4. Check/uncheck menus and actions as needed
5. Click **Save Employee**

## Default Permissions

### Admin Role
- All menus: ✓
- All actions: ✓

### Manager Role (Default)
- Dashboard: ✓
- POS: ✓
- History: ✓
- Items: ✗
- Inventory: ✗
- Employees: ✗
- Expenses: ✗
- Reports: ✗
- Settings: ✗
- View: ✓
- Create/Edit/Delete/Export: ✗

### Staff Role (Default)
- Dashboard: ✓
- POS: ✓
- History: ✓
- Items: ✗
- Inventory: ✗
- Employees: ✗
- Expenses: ✗
- Reports: ✗
- Settings: ✗
- View: ✓
- Create/Edit/Delete/Export: ✗

## Translations

All permission labels are fully translated:

### English
- Permissions, Menu Access, Action Permissions
- View, Create, Edit, Delete, Export
- Dashboard, POS, History, Items & Categories, Inventory, Employees, Expenses, Reports, Settings

### Lao (ລາວ)
- ສິດການເຂົ້າເຖິງ, ການເຂົ້າເຖິງເມນູ, ສິດການກະທຳ
- ເບິ່ງ, ສ້າງ, ແກ້ໄຂ, ລົບ, ສົ່ງອອກ
- ໜ້າຫຼັກ, ຂາຍສິນຄ້າ, ປະຫວັດ, ສິນຄ້າ ແລະ ປະເພດ, ສາງສິນຄ້າ, ພະນັກງານ, ລາຍຈ່າຍ, ລາຍງານ, ຕັ້ງຄ່າ

### Thai (ไทย)
- สิทธิ์การเข้าถึง, การเข้าถึงเมนู, สิทธิ์การกระทำ
- ดู, สร้าง, แก้ไข, ลบ, ส่งออก
- แดชบอร์ด, ขายหน้าร้าน, ประวัติ, สินค้าและหมวดหมู่, สต็อกสินค้า, พนักงาน, ค่าใช้จ่าย, รายงาน, ตั้งค่า

## Best Practices

1. **Admin Access**: Always keep at least one admin user with full permissions
2. **Principle of Least Privilege**: Give users only the permissions they need
3. **Regular Review**: Periodically review and update permissions
4. **Role-Based**: Use roles (admin/manager/staff) as a starting point, then customize
5. **Testing**: Test permissions after changes to ensure proper access control

## Future Enhancements

Potential improvements:
- Permission templates/presets
- Bulk permission updates
- Permission audit log
- Time-based permissions
- Location-based permissions
- Custom permission groups

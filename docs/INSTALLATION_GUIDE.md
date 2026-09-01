# Installation Guide - POS System

## 📋 Prerequisites

- Supabase account
- Node.js 18+ installed
- npm or yarn package manager

---

## 🚀 Quick Start (New Installation)

### Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd supabase-pos-system

# Install dependencies
npm install
```

### Step 2: Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Copy and paste the entire content of `supabase_schema.sql`
4. Click **Run** to execute the schema

This will create:
- ✅ All 17 tables
- ✅ All indexes
- ✅ All RLS policies
- ✅ Default data (categories, zones, tables, admin user)

### Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_POS_LICENSE_KEY=your_license_key (optional)
```

Get these values from:
- Supabase Dashboard → Settings → API

### Step 4: Run the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000)

### Step 5: Login

Default admin credentials:
- **Name**: Administrator
- **PIN**: 123456

---

## 🔄 Upgrading from Version 1.0

### Option A: Fresh Install (Recommended)

⚠️ **WARNING**: This will delete all existing data!

```sql
-- 1. Backup your data first!
-- 2. Drop existing schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- 3. Run new schema
-- Execute: supabase_schema.sql
```

### Option B: Incremental Update

Keep existing data and add new features:

```sql
-- 1. Run in order:
-- Execute: tables-system-schema.sql
-- Execute: add-employee-permissions.sql

-- 2. Add missing columns
ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_price NUMERIC;
ALTER TABLE items ADD COLUMN IF NOT EXISTS min_stock INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS inventory_category_id UUID;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_recipe BOOLEAN DEFAULT false;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS zone_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'dine-in';

-- 3. Create new tables
CREATE TABLE IF NOT EXISTS inventory_categories (...);
CREATE TABLE IF NOT EXISTS recipe_ingredients (...);
CREATE TABLE IF NOT EXISTS item_portions (...);
CREATE TABLE IF NOT EXISTS expense_categories (...);

-- 4. Update admin permissions
UPDATE employees 
SET permissions = '{
  "menus": {
    "dashboard": true,
    "pos": true,
    "history": true,
    "items": true,
    "inventory": true,
    "tables": true,
    "employees": true,
    "expenses": true,
    "reports": true,
    "settings": true
  },
  "actions": {
    "view": true,
    "create": true,
    "edit": true,
    "delete": true,
    "export": true
  }
}'::jsonb
WHERE role = 'admin';
```

---

## ✅ Verification

After installation, verify everything is working:

### 1. Check Database Tables

```sql
-- Should return 17 tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check specific tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
1. categories
2. inventory_categories
3. items
4. recipe_ingredients
5. item_portions
6. zones
7. tables
8. orders
9. order_items
10. inventory_transactions
11. expense_categories
12. expenses
13. employees
14. shifts
15. stations
16. station_mappings
17. license_keys
18. schema_version

### 2. Check Default Data

```sql
-- Should have 3 zones
SELECT * FROM zones;

-- Should have 10 tables
SELECT * FROM tables;

-- Should have at least 1 admin
SELECT * FROM employees WHERE role = 'admin';

-- Should have categories
SELECT * FROM categories;
```

### 3. Test Application

1. ✅ Login with admin credentials
2. ✅ Navigate to all menu items
3. ✅ Check Tables & Zones page
4. ✅ Check Employees page (permissions section)
5. ✅ Try creating a test order

---

## 🔧 Configuration

### 1. General Settings

Go to **Settings** page to configure:
- Store name
- Tax rate
- Timezone
- Language (EN/LO/TH)

### 2. Receipt Settings

Configure receipt printing:
- Header text
- Footer text
- Store address
- Phone number
- Receipt size (58mm/80mm)

### 3. Currency Settings

Set your currency:
- Default currency
- Currency symbol
- Symbol position
- Exchange rate

### 4. Bank Configuration

Add bank accounts for transfers:
- Bank name
- Account name
- Account number
- Enable/disable for transfers

### 5. Printer Configuration

Setup printers:
- Printer name
- IP address
- Location
- Set as default

### 6. Employee Permissions

For each employee, configure:
- **Menu Access**: Which pages they can see
- **Action Permissions**: What they can do (view/create/edit/delete/export)

---

## 📱 Features Overview

### Core Features
- ✅ Point of Sale (POS)
- ✅ Order Management
- ✅ Inventory Tracking
- ✅ Employee Management
- ✅ Expense Tracking
- ✅ Shift Management
- ✅ Reports & Analytics

### New Features (v2.0)
- ✅ **Tables & Zones** - Restaurant table management
- ✅ **Recipe Management** - Items made from ingredients
- ✅ **Portion Sizes** - Multiple sizes per item
- ✅ **Employee Permissions** - Granular access control
- ✅ **Inventory Categories** - Better stock organization
- ✅ **Expense Categories** - Better expense tracking

### Coming Soon
- 🚧 Table selection in POS
- 🚧 Kitchen Display System
- 🚧 Customer Display
- 🚧 Online ordering integration

---

## 🌐 Multi-Language Support

The system supports 3 languages:
- 🇬🇧 English
- 🇱🇦 Lao (ລາວ)
- 🇹🇭 Thai (ไทย)

Change language in: **Settings → General Settings → Language**

---

## 🔐 Security

### Default Security Settings

- ✅ Row Level Security (RLS) enabled
- ✅ Public access policies (for development)
- ⚠️ **Production**: Restrict RLS policies!

### Production Security Checklist

Before going to production:

1. **Update RLS Policies**
```sql
-- Remove public access
DROP POLICY "Allow public access" ON public.employees;

-- Add authenticated access only
CREATE POLICY "Authenticated access" ON public.employees
FOR ALL USING (auth.role() = 'authenticated');
```

2. **Secure Environment Variables**
- Use strong license keys
- Rotate Supabase keys regularly
- Never commit `.env` files

3. **Employee PINs**
- Enforce strong PINs (6+ digits)
- Change default admin PIN
- Rotate PINs regularly

4. **Database Backups**
- Enable automatic backups in Supabase
- Test restore procedures
- Keep backups for 30+ days

---

## 🐛 Troubleshooting

### Issue: Tables not showing in database

**Solution**: Make sure you ran the complete `supabase_schema.sql` file

### Issue: Permission denied errors

**Solution**: Check RLS policies are set to public access for development

### Issue: Cannot login

**Solution**: 
1. Check if employees table has data
2. Verify PIN is correct (default: 123456)
3. Check Supabase connection in `.env.local`

### Issue: Items not loading

**Solution**:
1. Check Supabase URL and key in `.env.local`
2. Verify categories exist in database
3. Check browser console for errors

### Issue: Migrations failed

**Solution**:
1. Check for syntax errors in SQL
2. Run migrations one at a time
3. Check Supabase logs for detailed errors

---

## 📚 Documentation

- `supabase_schema.sql` - Complete database schema
- `SCHEMA_CHANGELOG.md` - Version history and changes
- `TABLES_SYSTEM_GUIDE.md` - Tables & zones documentation
- `PERMISSIONS_SYSTEM.md` - Permissions documentation
- `API_EXTERNAL.md` - API documentation

---

## 🆘 Support

For help:
1. Check documentation files
2. Review Supabase logs
3. Check browser console for errors
4. Verify all environment variables are set

---

## 📝 License

Check your license configuration in Settings or contact your provider.

---

## 🎉 You're Ready!

Your POS system is now installed and ready to use. Start by:

1. ✅ Logging in as admin
2. ✅ Adding your menu items
3. ✅ Setting up employees
4. ✅ Configuring tables and zones
5. ✅ Making your first sale!

Enjoy your new POS system! 🚀

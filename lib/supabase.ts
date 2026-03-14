import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function checkSupabaseConnection(): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return false;
  }
  try {
    const { error } = await supabase.from('items').select('count', { count: 'exact', head: true });
    return !error;
  } catch (e) {
    return false;
  }
}

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'>;
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
      };
      inventory_categories: {
        Row: InventoryCategory;
        Insert: Omit<InventoryCategory, 'id' | 'created_at'>;
        Update: Partial<Omit<InventoryCategory, 'id' | 'created_at'>>;
      };
      items: {
        Row: Item;
        Insert: Omit<Item, 'id' | 'created_at'>;
        Update: Partial<Omit<Item, 'id' | 'created_at'>>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'id' | 'created_at'>;
        Update: Partial<Omit<Order, 'id' | 'created_at'>>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, 'id'>;
        Update: Partial<Omit<OrderItem, 'id'>>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, 'id' | 'created_at'>;
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>;
      };
      expense_categories: {
        Row: ExpenseCategory;
        Insert: Omit<ExpenseCategory, 'id' | 'created_at'>;
        Update: Partial<Omit<ExpenseCategory, 'id' | 'created_at'>>;
      };
      employees: {
        Row: Employee;
        Insert: Omit<Employee, 'id' | 'created_at'>;
        Update: Partial<Omit<Employee, 'id' | 'created_at'>>;
      };
      inventory_transactions: {
        Row: InventoryTransaction;
        Insert: Omit<InventoryTransaction, 'id' | 'created_at'>;
        Update: Partial<Omit<InventoryTransaction, 'id' | 'created_at'>>;
      };
    };
  };
};

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type InventoryCategory = {
  id: string;
  name: string;
  created_at: string;
};

export type Item = {
  id: string;
  name: string;
  price: number;
  cost_price?: number;
  min_stock?: number;
  inventory_category_id?: string | null;
  category_id: string;
  image_url?: string;
  stock?: number;
  is_recipe?: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: 'cash' | 'card' | 'online';
  notes?: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  price_at_time: number;
  notes?: string;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  payment_method?: string;
  vendor?: string;
  created_at: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  created_at: string;
};

export type Employee = {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  pin?: string;
  status: 'active' | 'inactive';
  created_at: string;
};

export type Station = {
  id: string;
  name: string;
  printer_ip?: string;
  created_at: string;
};

export type StationMapping = {
  id: string;
  category_id: string;
  station_id: string;
};

export type InventoryTransaction = {
  id: string;
  item_id: string;
  quantity_change: number;
  transaction_type: 'sale' | 'restock' | 'adjustment' | 'waste';
  notes?: string;
  created_at: string;
};

export type Recipe = {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  price: number;
  image_url?: string;
  stock?: number;
  is_recipe: boolean;
  created_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity_needed: number;
  unit: string;
  created_at: string;
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Raw client without TypeScript types to bypass schema cache issues
export const rawSupabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
export async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Has URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Has Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data, error } = await rawSupabase.from('categories').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Connection test failed:', error);
      return false;
    }
    
    console.log('Connection successful');
    return true;
  } catch (err) {
    console.error('Connection test error:', err);
    return false;
  }
}

// Helper functions that bypass type checking
export async function addItemRaw(itemData: any) {
  try {
    console.log('Adding item with data:', itemData);
    
    const { data, error } = await rawSupabase
      .from('items')
      .insert(itemData)
      .select()
      .single();
    
    if (error) {
      console.error('Raw insert error details:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      throw error;
    }
    
    console.log('Insert successful:', data);
    return data;
  } catch (error: any) {
    console.error('Error in addItemRaw:', error);
    console.error('Full error object:', error);
    throw error;
  }
}

export async function updateStockRaw(itemId: string, stock: number) {
  try {
    const { error } = await rawSupabase
      .from('items')
      .update({ stock })
      .eq('id', itemId);
    
    if (error) {
      console.error('Raw update error:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateStockRaw:', error);
    throw error;
  }
}

export async function addInventoryTransactionRaw(transactionData: any) {
  try {
    const { error } = await rawSupabase
      .from('inventory_transactions')
      .insert(transactionData);
    
    if (error) {
      console.error('Raw transaction error:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in addInventoryTransactionRaw:', error);
    throw error;
  }
}

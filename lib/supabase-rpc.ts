import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const rpcSupabase = createClient(supabaseUrl, supabaseAnonKey);

// RPC functions that bypass PostgREST schema cache
export async function addItemViaRPC(itemData: any) {
  try {
    console.log('Adding item via RPC with data:', itemData);
    
    // Use raw SQL via RPC to bypass schema cache
    const { data, error } = await rpcSupabase.rpc('insert_item', {
      item_name: itemData.name,
      item_price: itemData.price,
      category_id: itemData.category_id,
      item_image_url: itemData.image_url || '',
      item_stock: itemData.stock || 0
    });
    
    if (error) {
      console.error('RPC insert error:', error);
      throw error;
    }
    
    console.log('RPC insert successful:', data);
    return data;
  } catch (error: any) {
    console.error('Error in addItemViaRPC:', error);
    throw error;
  }
}

export async function updateStockViaRPC(itemId: string, stock: number) {
  try {
    console.log('Updating stock via RPC:', itemId, stock);
    
    const { data, error } = await rpcSupabase.rpc('update_item_stock', {
      item_id: itemId,
      new_stock: stock
    });
    
    if (error) {
      console.error('RPC update error:', error);
      throw error;
    }
    
    console.log('RPC update successful:', data);
    return data;
  } catch (error: any) {
    console.error('Error in updateStockViaRPC:', error);
    throw error;
  }
}

export async function addTransactionViaRPC(transactionData: any) {
  try {
    console.log('Adding transaction via RPC:', transactionData);
    
    const { data, error } = await rpcSupabase.rpc('insert_inventory_transaction', {
      item_id: transactionData.item_id,
      quantity_change: transactionData.quantity_change,
      transaction_type: transactionData.transaction_type,
      notes: transactionData.notes
    });
    
    if (error) {
      console.error('RPC transaction error:', error);
      throw error;
    }
    
    console.log('RPC transaction successful:', data);
    return data;
  } catch (error: any) {
    console.error('Error in addTransactionViaRPC:', error);
    throw error;
  }
}

// Fallback: Direct SQL insert (if RPC doesn't work)
export async function addItemDirectSQL(itemData: any) {
  try {
    console.log('Adding item with direct SQL:', itemData);
    
    // Build the SQL query manually
    const sql = `
      INSERT INTO public.items (name, price, category_id, image_url, stock) 
      VALUES ('${itemData.name}', ${itemData.price}, '${itemData.category_id}', '${itemData.image_url || ''}', ${itemData.stock || 0})
      RETURNING *
    `;
    
    const { data, error } = await rpcSupabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      console.error('Direct SQL error:', error);
      throw error;
    }
    
    console.log('Direct SQL successful:', data);
    return data;
  } catch (error: any) {
    console.error('Error in addItemDirectSQL:', error);
    throw error;
  }
}

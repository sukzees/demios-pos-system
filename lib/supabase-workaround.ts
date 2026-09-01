import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const workaroundSupabase = createClient(supabaseUrl, supabaseAnonKey);

// Workaround: Insert item without stock, then update stock separately
export async function addItemWithStockWorkaround(itemData: any) {
  try {
    console.log('Adding item with stock workaround:', itemData);
    
    // Step 1: Insert item without stock column
    const itemWithoutStock = {
      name: itemData.name,
      price: itemData.price,
      category_id: itemData.category_id,
      image_url: itemData.image_url || ''
    };
    
    const { data, error } = await workaroundSupabase
      .from('items')
      .insert(itemWithoutStock)
      .select()
      .single();
    
    if (error) {
      console.error('Step 1 error (insert without stock):', error);
      throw error;
    }
    
    console.log('Step 1 successful - item inserted:', data);
    
    // Step 2: Update stock/type/cost/min stock separately to ensure selected fields are persisted.
    const updatePayload: Record<string, any> = {};
    if (typeof itemData.stock === 'number') {
      updatePayload.stock = itemData.stock;
    }
    if (typeof itemData.is_recipe === 'boolean') {
      updatePayload.is_recipe = itemData.is_recipe;
    }
    if (typeof itemData.cost_price === 'number') {
      updatePayload.cost_price = itemData.cost_price;
    }
    if (typeof itemData.min_stock === 'number') {
      updatePayload.min_stock = itemData.min_stock;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await workaroundSupabase
        .from('items')
        .update(updatePayload)
        .eq('id', data.id);
      
      if (updateError) {
        console.error('Step 2 error (update stock/type/cost/min stock):', updateError);
        // Don't throw error - item was created successfully, just follow-up update failed.
        console.warn('Item created but stock/type/cost/min stock update failed');
      } else {
        console.log('Step 2 successful - stock/type/cost/min stock updated');
      }
    }
    
    return data;
  } catch (error: any) {
    console.error('Error in addItemWithStockWorkaround:', error);
    throw error;
  }
}

// Alternative: Use RPC if available
export async function addItemViaRPC(itemData: any) {
  try {
    console.log('Adding item via RPC:', itemData);
    
    const { data, error } = await workaroundSupabase.rpc('add_item_simple', {
      name: itemData.name,
      price: itemData.price,
      category_id: itemData.category_id,
      stock: itemData.stock || 0
    });
    
    if (error) {
      console.error('RPC error:', error);
      throw error;
    }
    
    console.log('RPC successful:', data);
    return data;
  } catch (error: any) {
    console.error('Error in addItemViaRPC:', error);
    throw error;
  }
}

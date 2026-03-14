import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const directSupabase = createClient(supabaseUrl, supabaseAnonKey);

// Direct REST API calls to bypass PostgREST schema cache
export async function addItemDirect(itemData: any) {
  try {
    console.log('Adding item via direct REST API:', itemData);
    console.log('Supabase URL:', supabaseUrl);
    console.log('Has valid URL:', !supabaseUrl.includes('placeholder'));
    
    const requestBody = {
      name: itemData.name,
      price: itemData.price,
      cost_price: typeof itemData.cost_price === 'number' ? itemData.cost_price : undefined,
      category_id: itemData.category_id,
      image_url: itemData.image_url || '',
      stock: itemData.stock || 0,
      is_recipe: typeof itemData.is_recipe === 'boolean' ? itemData.is_recipe : undefined
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Use the REST API endpoint directly
    const response = await fetch(`${supabaseUrl}/rest/v1/items`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error('Direct REST error - Response status:', response.status);
      console.error('Direct REST error - Response text:', responseText);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { message: `HTTP ${response.status} - ${response.statusText}` };
      }
      
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Direct REST successful:', data);
    return data[0]; // Return first item
  } catch (error: any) {
    console.error('Error in addItemDirect:', error);
    throw error;
  }
}

export async function updateStockDirect(itemId: string, stock: number) {
  try {
    console.log('Updating stock via direct REST API:', itemId, stock);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/items?id=eq.${itemId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ stock })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Direct REST update error:', errorData);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    console.log('Direct REST update successful');
    return true;
  } catch (error: any) {
    console.error('Error in updateStockDirect:', error);
    throw error;
  }
}

export async function addTransactionDirect(transactionData: any) {
  try {
    console.log('Adding transaction via direct REST API:', transactionData);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/inventory_transactions`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Direct REST transaction error:', errorData);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    console.log('Direct REST transaction successful');
    return true;
  } catch (error: any) {
    console.error('Error in addTransactionDirect:', error);
    throw error;
  }
}

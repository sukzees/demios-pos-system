// Debug script to check Supabase schema
// Run this with: node debug-schema.js

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual credentials or load from .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugSchema() {
  console.log('Checking Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('items').select('*').limit(1);
    
    if (error) {
      console.error('Connection error:', error);
      return;
    }
    
    console.log('✅ Connection successful');
    
    // Check table structure
    console.log('\nChecking items table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'items' });
    
    if (tableError) {
      console.log('Table info error (expected if RPC doesn\'t exist):', tableError.message);
    } else {
      console.log('Table columns:', tableInfo);
    }
    
    // Try to select specific columns
    console.log('\nTesting column access...');
    const columns = ['id', 'name', 'price', 'category_id', 'image_url', 'stock', 'created_at'];
    
    for (const column of columns) {
      try {
        const { data: colData, error: colError } = await supabase
          .from('items')
          .select(column)
          .limit(1);
        
        if (colError) {
          console.log(`❌ Column '${column}': ${colError.message}`);
        } else {
          console.log(`✅ Column '${column}': OK`);
        }
      } catch (err) {
        console.log(`❌ Column '${column}': ${err.message}`);
      }
    }
    
    // Check if we can insert with stock
    console.log('\nTesting insert with stock...');
    const testItem = {
      name: 'Test Item',
      price: 9.99,
      category_id: '00000000-0000-0000-0000-000000000000', // Will fail but tests schema
      stock: 10
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('items')
      .insert(testItem)
      .select();
    
    if (insertError) {
      console.log('Insert error:', insertError.message);
      if (insertError.message.includes('stock')) {
        console.log('🔍 This confirms the stock column issue');
      }
    } else {
      console.log('✅ Insert test passed');
      // Clean up
      await supabase.from('items').delete().eq('id', insertData[0].id);
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

debugSchema();

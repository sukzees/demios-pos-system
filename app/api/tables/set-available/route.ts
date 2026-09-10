import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { tableId } = await request.json();

    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
                                process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration is missing' },
        { status: 500 }
      );
    }

    const supabaseKey = supabaseServiceKey || supabaseAnonKey;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: schemaCheck } = await supabaseAdmin
      .from('tables')
      .select('*')
      .limit(1);

    const updateData: Record<string, any> = {
      status: 'available',
      current_order_id: null,
    };

    if (schemaCheck && schemaCheck.length > 0) {
      const availableColumns = Object.keys(schemaCheck[0]);
      
      if (availableColumns.includes('is_merged')) {
        updateData.is_merged = false;
      }
      if (availableColumns.includes('merged_tables')) {
        updateData.merged_tables = null;
      }
      if (availableColumns.includes('merged_into')) {
        updateData.merged_into = null;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('tables')
      .update(updateData)
      .eq('id', tableId)
      .select();

    if (error) {
      return NextResponse.json(
        { 
          error: 'Failed to update table status', 
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

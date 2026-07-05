import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

// Tables to backup in order (respecting foreign key dependencies)
const TABLES_TO_BACKUP = [
  'categories',
  'inventory_categories',
  'items',
  'recipes',
  'recipe_ingredients',
  'item_portions',
  'zones',
  'tables',
  'orders',
  'order_items',
  'inventory_transactions',
  'expense_categories',
  'expenses',
  'employees',
  'shifts',
  'stations',
  'station_mappings',
  'license_keys',
];

function escapeString(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  
  if (typeof value === 'number') return String(value);
  
  if (typeof value === 'object') {
    // Handle JSON/JSONB columns
    return escapeString(JSON.stringify(value));
  }
  
  return escapeString(String(value));
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase configuration is missing' },
        { status: 500 }
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    let sqlContent = `-- ============================================
-- Supabase POS System - Database Backup
-- Generated: ${new Date().toISOString()}
-- ============================================

-- Disable triggers and constraints for faster import
SET session_replication_role = 'replica';

`;

    // Backup each table
    for (const tableName of TABLES_TO_BACKUP) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.warn(`Warning: Could not backup table "${tableName}":`, error.message);
          sqlContent += `-- Warning: Could not backup table "${tableName}": ${error.message}\n\n`;
          continue;
        }

        if (!data || data.length === 0) {
          sqlContent += `-- Table "${tableName}" is empty\n\n`;
          continue;
        }

        sqlContent += `-- Backup for table: ${tableName}\n`;
        sqlContent += `-- Rows: ${data.length}\n`;
        sqlContent += `DELETE FROM public.${tableName};\n`;

        // Get column names from first row
        const columns = Object.keys(data[0]);
        
        // Create INSERT statements in batches
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          sqlContent += `INSERT INTO public.${tableName} (${columns.join(', ')})\nVALUES\n`;
          
          const values = batch.map((row, idx) => {
            const rowValues = columns.map(col => formatValue(row[col])).join(', ');
            return `  (${rowValues})${idx === batch.length - 1 ? ';' : ','}`;
          }).join('\n');
          
          sqlContent += values + '\n';
        }
        
        sqlContent += `\n`;
      } catch (tableError: any) {
        console.error(`Error backing up table "${tableName}":`, tableError);
        sqlContent += `-- Error backing up table "${tableName}": ${tableError.message}\n\n`;
      }
    }

    sqlContent += `-- Re-enable triggers and constraints
SET session_replication_role = 'origin';

-- ============================================
-- Backup Complete
-- ============================================
`;

    // Return SQL file
    return new NextResponse(sqlContent, {
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="pos-backup-${timestamp}.sql"`,
      },
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup', details: error.message },
      { status: 500 }
    );
  }
}

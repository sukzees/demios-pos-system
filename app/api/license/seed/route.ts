import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  '';
const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  { auth: { persistSession: false } }
);

const LICENSE_TABLES = (process.env.LICENSE_TABLES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const LICENSE_KEY_COLUMNS = (process.env.LICENSE_KEY_COLUMNS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const LICENSE_SCHEMA = (process.env.LICENSE_SCHEMA || 'public').trim() || 'public';
const ADMIN_SEED_TOKEN = process.env.LICENSE_SEED_TOKEN || '';

const TABLE_TO_USE = LICENSE_TABLES[0] || 'license_keys';
const KEY_COLUMN = LICENSE_KEY_COLUMNS[0] || 'license_key';

export async function POST(req: NextRequest) {
  try {
    if (!ADMIN_SEED_TOKEN) {
      return NextResponse.json({ error: 'Seeding is not enabled' }, { status: 403 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token || token !== ADMIN_SEED_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const licenseKey = String(body?.license_key || '').trim();
    const expiresAt = String(body?.expires_at || '').trim();
    const renewDate = String(body?.renew_date || '').trim();
    const activationData = body?.activation_data ?? null;

    if (!licenseKey || !expiresAt) {
      return NextResponse.json({ error: 'license_key and expires_at are required' }, { status: 400 });
    }

    if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
    }

    const payload: Record<string, any> = {
      [KEY_COLUMN]: licenseKey,
      expires_at: expiresAt,
      renew_date: renewDate || null,
      activation_data: activationData
    };

    const { data, error } = await supabase
      .schema(LICENSE_SCHEMA)
      .from(TABLE_TO_USE)
      .upsert(payload, { onConflict: KEY_COLUMN })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to seed license' }, { status: 500 });
    }

    return NextResponse.json({ success: true, license: data });
  } catch (error) {
    console.error('License seed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

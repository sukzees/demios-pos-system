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

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('license_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Creating license:', body);
    
    // Ensure required fields
    const licenseData = {
      license_key: body.license_key || body.key,
      expires_at: body.expires_at || body.expiresAt,
      renew_date: body.renew_date || body.renewDate || null,
      activation_data: body.activation_data || body.activationData || null,
      machine_id: body.machine_id || body.machineId || null
    };
    
    if (!licenseData.license_key || !licenseData.expires_at) {
      return NextResponse.json({ error: 'license_key and expires_at are required' }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('license_keys')
      .upsert(licenseData, { onConflict: 'license_key' })
      .select('*')
      .single();

    if (error) {
      console.error('License insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('License created:', data);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('License POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

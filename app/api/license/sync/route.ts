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

const LICENSE_VERIFY_URL = (
    process.env.LICENSE_VERIFY_URL ||
    process.env.NEXT_PUBLIC_LICENSE_VERIFY_URL ||
    'https://pos-license-manager.vercel.app/api/verify'
).trim();

const LICENSE_LIST_URL = 'https://pos-license-manager.vercel.app/api/licenses';

const LICENSE_API_TOKEN = (
    process.env.LICENSE_API_TOKEN ||
    process.env.NEXT_PUBLIC_LICENSE_API_TOKEN ||
    ''
).trim();

// Fetch all licenses from external API and save to local Supabase
async function fetchAndSaveAllLicenses() {
    let externalRes: Response | null = null;
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const url = new URL(LICENSE_LIST_URL);
            url.searchParams.set('ts', Date.now().toString());

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
                console.log(`Fetch all licenses attempt ${attempt}/${maxRetries}...`);
                externalRes = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(LICENSE_API_TOKEN ? { Authorization: `Bearer ${LICENSE_API_TOKEN}` } : {})
                    },
                    cache: 'no-store',
                    signal: controller.signal
                });

                if (externalRes) break;
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (err) {
            lastError = err as Error;
            console.error(`Fetch attempt ${attempt} failed:`, (err as Error)?.message);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    if (!externalRes) {
        throw lastError || new Error('Failed to fetch licenses from external API');
    }

    const data = await externalRes.json();
    console.log('External API licenses response:', JSON.stringify(data, null, 2));

    // Extract licenses array
    const licenses = data?.licenses || data?.data || data || [];
    
    if (!Array.isArray(licenses) || licenses.length === 0) {
        console.log('No licenses found in external API response');
        return [];
    }

    // Transform and save to local Supabase
    const licenseRecords = licenses.map((license: any) => ({
        license_key: license.license_key || license.key || license.licenseKey || '',
        expires_at: license.expires_at || license.expiresAt || license.expiry_date || null,
        renew_date: license.renew_date || license.renewDate || null,
        activation_data: license.activation_data || license.activationData || license,
        machine_id: license.machine_id || license.machineId || null
    })).filter((l: any) => l.license_key);

    // Upsert to local Supabase
    for (const record of licenseRecords) {
        const { error } = await supabase
            .from('license_keys')
            .upsert(record, { onConflict: 'license_key' });
        
        if (error) {
            console.error('Failed to save license:', record.license_key, error);
        }
    }

    console.log(`Saved ${licenseRecords.length} licenses to local Supabase`);
    return licenseRecords;
}

// Sync single license from external API
async function syncSingleLicense(license_key: string, machine_id: string) {
    let externalRes: Response | null = null;
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const url = new URL(LICENSE_VERIFY_URL);
            url.searchParams.set('ts', Date.now().toString());

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                console.log(`Sync attempt ${attempt}/${maxRetries}...`);
                externalRes = await fetch(url.toString(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(LICENSE_API_TOKEN ? { Authorization: `Bearer ${LICENSE_API_TOKEN}` } : {})
                    },
                    body: JSON.stringify({
                        license_key,
                        machine_id,
                        key: license_key,
                        licenseKey: license_key,
                        api_key: license_key
                    }),
                    cache: 'no-store',
                    signal: controller.signal
                });

                if (externalRes) break;
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (err) {
            lastError = err as Error;
            console.error(`Sync attempt ${attempt} failed:`, (err as Error)?.message);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    if (!externalRes) {
        throw lastError || new Error('Failed to sync license from external API');
    }

    const data = await externalRes.json();
    console.log('External API sync response:', JSON.stringify(data, null, 2));

    // Save to local Supabase if valid
    if (data?.valid || data?.expires_at) {
        const record = {
            license_key,
            expires_at: data.expires_at || null,
            renew_date: data.renew_date || null,
            activation_data: data,
            machine_id
        };

        const { error } = await supabase
            .from('license_keys')
            .upsert(record, { onConflict: 'license_key' });

        if (error) {
            console.error('Failed to save synced license:', error);
        }
    }

    return data;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const fetch_all = body?.fetch_all === true;
        const license_key = body?.license_key || body?.key || '';
        const machine_id = body?.machine_id || '';
        const api_token = body?.api_token || '';
        
        // Use provided token or fall back to env var
        const effectiveToken = api_token || LICENSE_API_TOKEN;
        console.log('Sync request - fetch_all:', fetch_all, 'api_token provided:', !!api_token, 'LICENSE_API_TOKEN from env:', !!LICENSE_API_TOKEN, 'effectiveToken:', !!effectiveToken);

        // If fetch_all is true, get all licenses from external API
        if (fetch_all) {
            try {
                const licenses = await fetchAndSaveAllLicensesWithToken(effectiveToken);
                return NextResponse.json({
                    success: true,
                    syncedAt: new Date().toISOString(),
                    count: licenses.length,
                    licenses
                });
            } catch (error: any) {
                return NextResponse.json({
                    error: error?.message || 'Failed to fetch all licenses'
                }, { status: 500 });
            }
        }

        // Otherwise sync a single license
        if (!license_key) {
            return NextResponse.json({ error: 'License key is required' }, { status: 400 });
        }

        console.log('Syncing license from external API:', { license_key, machine_id });

        const data = await syncSingleLicense(license_key, machine_id);

        return NextResponse.json({
            success: true,
            syncedAt: new Date().toISOString(),
            data
        });

    } catch (error) {
        console.error('License sync error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Fetch all licenses with provided token
async function fetchAndSaveAllLicensesWithToken(apiToken: string) {
    let externalRes: Response | null = null;
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
                console.log(`Fetch all licenses attempt ${attempt}/${maxRetries}...`);
                console.log('Using API token:', apiToken ? `${apiToken.substring(0, 10)}...` : 'none');
                const url = new URL(LICENSE_LIST_URL);
                url.searchParams.set('ts', Date.now().toString());
                if (apiToken) {
                    url.searchParams.set('api_token', apiToken);
                }
                externalRes = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-token': apiToken
                    },
                    cache: 'no-store',
                    signal: controller.signal
                });

                if (externalRes) break;
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (err) {
            lastError = err as Error;
            console.error(`Fetch attempt ${attempt} failed:`, (err as Error)?.message);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    if (!externalRes) {
        throw lastError || new Error('Failed to fetch licenses from external API');
    }

    const data = await externalRes.json();
    console.log('External API licenses response:', JSON.stringify(data, null, 2));

    // Extract licenses array
    const licenses = data?.licenses || data?.data || data || [];
    
    if (!Array.isArray(licenses) || licenses.length === 0) {
        console.log('No licenses found in external API response');
        return [];
    }

    // Transform and save to local Supabase
    const licenseRecords = licenses.map((license: any) => ({
        license_key: license.license_key || license.key || license.licenseKey || '',
        expires_at: license.expires_at || license.expiresAt || license.expiry_date || null,
        renew_date: license.renew_date || license.renewDate || null,
        activation_data: license.activation_data || license.activationData || license,
        machine_id: license.machine_id || license.machineId || null
    })).filter((l: any) => l.license_key);

    // Upsert to local Supabase
    for (const record of licenseRecords) {
        const { error } = await supabase
            .from('license_keys')
            .upsert(record, { onConflict: 'license_key' });
        
        if (error) {
            console.error('Failed to save license:', record.license_key, error);
        }
    }

    console.log(`Saved ${licenseRecords.length} licenses to local Supabase`);
    return licenseRecords;
}

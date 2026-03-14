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

const FALLBACK_TABLES = ['licenses', 'license_keys', 'license'];
const FALLBACK_COLUMNS = ['license_key', 'key', 'license'];

const TABLES_TO_TRY = LICENSE_TABLES.length > 0 ? LICENSE_TABLES : FALLBACK_TABLES;
const COLUMNS_TO_TRY = LICENSE_KEY_COLUMNS.length > 0 ? LICENSE_KEY_COLUMNS : FALLBACK_COLUMNS;
const LICENSE_SCHEMA = (process.env.LICENSE_SCHEMA || 'public').trim() || 'public';
const LICENSE_AUTO_SEED = (process.env.LICENSE_AUTO_SEED || 'true').toLowerCase() === 'true';
const LICENSE_AUTO_SEED_EXPIRES_AT = (
    process.env.LICENSE_AUTO_SEED_EXPIRES_AT ||
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0]
).trim();
const LICENSE_VERIFY_URL = (
    process.env.LICENSE_VERIFY_URL ||
    process.env.NEXT_PUBLIC_LICENSE_VERIFY_URL ||
    ''
).trim();
const LICENSE_API_TOKEN = (
    process.env.LICENSE_API_TOKEN ||
    process.env.NEXT_PUBLIC_LICENSE_API_TOKEN ||
    ''
).trim();

const toUtcDateTime = (value: number) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
};

const normalizeExpiresAt = (row: Record<string, any>) => {
    const raw =
        row.expires_at ??
        row.expiresAt ??
        row.expiry_date ??
        row.expiryDate ??
        row.expiration_date ??
        row.expirationDate ??
        row.expires ??
        row.expiry ??
        row.expire_date ??
        '';

    if (raw === null || raw === undefined) return '';
    if (typeof raw === 'number') {
        const ms = raw > 1e12 ? raw : raw * 1000;
        return toUtcDateTime(ms);
    }
    const rawStr = String(raw).trim();
    if (/^\d+$/.test(rawStr)) {
        const num = Number(rawStr);
        const ms = num > 1e12 ? num : num * 1000;
        return toUtcDateTime(ms);
    }
    return rawStr;
};

const normalizeRenewDate = (row: Record<string, any>) =>
    row.renew_date ?? row.renewDate ?? row.last_verified ?? row.lastVerified ?? null;

const normalizeActivationData = (row: Record<string, any>) =>
    row.activation_data ?? row.activationData ?? row.features ?? null;

const unwrapLicensePayload = (payload: Record<string, any>) =>
    payload?.license ??
    payload?.license_info ??
    payload?.licenseInfo ??
    payload;

const parseLicenseDate = (value: string) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const isoDate = new Date(iso);
    if (!Number.isNaN(isoDate.getTime())) return isoDate;
    const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!match) return null;
    const [, dd, mm, yyyy, hh = '00', mi = '00', ss = '00'] = match;
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const buildKeyCandidates = (rawKey: string) => {
    const trimmed = rawKey.trim();
    const noSpaces = trimmed.replace(/\s+/g, '');
    const noDashes = noSpaces.replace(/-/g, '');
    const candidates = [
        rawKey,
        trimmed,
        noSpaces,
        noDashes,
        trimmed.toUpperCase(),
        trimmed.toLowerCase()
    ];
    return Array.from(new Set(candidates.filter(Boolean)));
};

async function fetchLicense(licenseKey: string) {
    const candidates = buildKeyCandidates(licenseKey);
    for (const table of TABLES_TO_TRY) {
        for (const column of COLUMNS_TO_TRY) {
            try {
                const { data, error } = await supabase
                    .schema(LICENSE_SCHEMA)
                    .from(table)
                    .select('*')
                    .in(column, candidates)
                    .limit(1);

                if (!error && data && data.length > 0) {
                    return data[0] as Record<string, any>;
                }

                for (const candidate of candidates) {
                    const { data: ilikeData, error: ilikeError } = await supabase
                        .schema(LICENSE_SCHEMA)
                        .from(table)
                        .select('*')
                        .ilike(column, candidate)
                        .limit(1);

                    if (!ilikeError && ilikeData && ilikeData.length > 0) {
                        return ilikeData[0] as Record<string, any>;
                    }
                }
            } catch {
                continue;
            }
        }
    }
    return null;
}

async function autoSeedLicense(licenseKey: string) {
    if (!LICENSE_AUTO_SEED || !LICENSE_AUTO_SEED_EXPIRES_AT) return null;
    const table = TABLES_TO_TRY[0];
    const column = COLUMNS_TO_TRY[0];
    if (!table || !column) return null;

    const payload: Record<string, any> = {
        [column]: licenseKey.trim(),
        expires_at: LICENSE_AUTO_SEED_EXPIRES_AT,
        renew_date: new Date().toISOString().replace('T', ' ').split('.')[0]
    };

    const { data, error } = await supabase
        .schema(LICENSE_SCHEMA)
        .from(table)
        .upsert(payload, { onConflict: column })
        .select('*')
        .single();

    if (error) return null;
    return data as Record<string, any>;
}

async function getTableDiagnostics() {
    const diagnostics: string[] = [];
    for (const table of TABLES_TO_TRY) {
        try {
            const { count, error } = await supabase
                .schema(LICENSE_SCHEMA)
                .from(table)
                .select('*', { count: 'exact', head: true });
            if (error) {
                diagnostics.push(`${table}: error=${error.message}`);
            } else {
                diagnostics.push(`${table}: ok (count=${count ?? 0})`);
            }
        } catch (err) {
            diagnostics.push(`${table}: error=${(err as Error)?.message || 'unknown'}`);
        }
    }
    return diagnostics.join(' | ');
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const license_key =
            body?.license_key ||
            body?.licenseKey ||
            body?.key ||
            body?.api_key ||
            '';
        const machine_id = body?.machine_id;
        const normalizedKey = String(license_key || '').trim();

        if (!normalizedKey) {
            return NextResponse.json({ error: 'License key is required' }, { status: 400 });
        }

        console.log('Verifying license:', { license_key: normalizedKey, machine_id });

        // First, check local Supabase for the license
        const localLicense = await fetchLicense(normalizedKey);
        if (localLicense) {
            const localExpiresAt = normalizeExpiresAt(localLicense);
            if (localExpiresAt) {
                const expiryDate = parseLicenseDate(String(localExpiresAt));
                const isExpired = expiryDate ? expiryDate < new Date() : false;
                
                if (!isExpired) {
                    console.log('License found in local Supabase:', normalizedKey);
                    return NextResponse.json({
                        valid: true,
                        message: 'License is valid (from local database)',
                        expires_at: localExpiresAt,
                        renew_date: normalizeRenewDate(localLicense),
                        activation_data: normalizeActivationData(localLicense)
                    });
                }
            }
        }

        // If not found locally, try external API
        if (LICENSE_VERIFY_URL) {
            let verifyRes: Response | null = null;
            let lastError: Error | null = null;
            const maxRetries = 3;
            
            // Retry loop for network issues
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const url = new URL(LICENSE_VERIFY_URL);
                    url.searchParams.set('ts', Date.now().toString());
                    url.searchParams.set('attempt', attempt.toString());
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);
                    
                    try {
                        console.log(`Verify attempt ${attempt}/${maxRetries}...`);
                        verifyRes = await fetch(url.toString(), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-api-token': LICENSE_API_TOKEN
                            },
                            body: JSON.stringify({
                                license_key: normalizedKey,
                                machine_id,
                                key: normalizedKey,
                                licenseKey: normalizedKey,
                                api_key: normalizedKey
                            }),
                            cache: 'no-store',
                            signal: controller.signal
                        });
                        
                        // If we got a response, break out of retry loop
                        if (verifyRes) break;
                    } finally {
                        clearTimeout(timeoutId);
                    }
                } catch (err) {
                    lastError = err as Error;
                    console.error(`Verify attempt ${attempt} failed:`, (err as Error)?.message);
                    
                    // Wait before retrying (exponential backoff)
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    }
                }
            }
            
            // If all retries failed
            if (!verifyRes) {
                const errorMsg = lastError?.name === 'AbortError'
                    ? 'License API request timed out after multiple attempts. Please check your network connection.'
                    : `License API unreachable after ${maxRetries} attempts. Please check your network and try again.`;
                console.error('All verify attempts failed:', lastError);
                return NextResponse.json({
                    valid: false,
                    error: errorMsg
                }, { status: 500 });
            }

            const verifyData = await verifyRes.json().catch(() => ({}));
            console.log('External verify API response:', JSON.stringify(verifyData, null, 2));
            const payload = (verifyData as any)?.data ?? (verifyData as any)?.result ?? verifyData;
            const licensePayload = unwrapLicensePayload(payload as Record<string, any>);

            const expiresAt = normalizeExpiresAt(licensePayload as Record<string, any>);
            if (verifyRes.ok && expiresAt) {
                return NextResponse.json({
                    valid: true,
                    message: (verifyData as any).message || (payload as any).message || (licensePayload as any).message || 'License is valid',
                    expires_at: expiresAt,
                    renew_date: normalizeRenewDate(licensePayload as Record<string, any>),
                    activation_data: normalizeActivationData(licensePayload as Record<string, any>)
                });
            }

            return NextResponse.json({
                valid: false,
                error: (verifyData as any).error || (payload as any).error || (licensePayload as any).error || (verifyData as any).message || 'License verification failed',
                expires_at: expiresAt || null,
                activation_data: normalizeActivationData(licensePayload as Record<string, any>)
            });
        }

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
        }

        let data = await fetchLicense(normalizedKey);
        if (!data) {
            data = await autoSeedLicense(normalizedKey);
        }
        if (!data) {
            return NextResponse.json({
                valid: false,
                error: 'License key not found'
            });
        }

        const expiresAt = normalizeExpiresAt(data);
        if (!expiresAt) {
            return NextResponse.json({ valid: false, error: 'License missing expiry date' });
        }

        const expiryDate = parseLicenseDate(String(expiresAt));
        if (expiryDate) {
            expiryDate.setHours(23, 59, 59, 999);
        }
        const isExpired = expiryDate ? expiryDate < new Date() : false;

        if (isExpired) {
            return NextResponse.json({ valid: false, error: 'License expired', expires_at: expiresAt });
        }

        return NextResponse.json({
            valid: true,
            message: 'License is valid',
            expires_at: expiresAt,
            renew_date: normalizeRenewDate(data),
            activation_data: normalizeActivationData(data)
        });

    } catch (error) {
        console.error('License verification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

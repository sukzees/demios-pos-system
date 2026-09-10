import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Set maxDuration for Vercel/Next.js deployment (in seconds)
export const maxDuration = 30; // 30 seconds max for this route
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    '';

const projectRefFromUrl = (supabaseUrl.match(/^https:\/\/([^.]+)\.supabase\.co/i) || [])[1] || '';

const decodeJwtRef = (token: string) => {
    try {
        const payload = token.split('.')[1] || '';
        if (!payload) return '';
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        return String(decoded?.ref || '');
    } catch {
        return '';
    }
};

const serviceRoleRef = decodeJwtRef(supabaseServiceRoleKey);
const shouldUseServiceRole = !!supabaseServiceRoleKey && !!projectRefFromUrl && serviceRoleRef === projectRefFromUrl;
const supabaseServerKey = shouldUseServiceRole ? supabaseServiceRoleKey : supabaseAnonKey;

const supabase = createClient(supabaseUrl, supabaseServerKey, {
    auth: { persistSession: false }
});

const LICENSE_SCHEMA = (process.env.LICENSE_SCHEMA || 'public').trim() || 'public';
const TARGET_LICENSE_TABLE = 'license_keys';
const TARGET_LICENSE_COLUMN = 'license_key';
const LICENSE_VERIFY_FUNCTION_URL = (
    process.env.LICENSE_VERIFY_FUNCTION_URL ||
    process.env.NEXT_PUBLIC_LICENSE_VERIFY_FUNCTION_URL ||
    'https://qrdfkugddyeqwkbijiuo.supabase.co/functions/v1/verify-license'
).trim();
const ENV_LICENSE_KEY = (
    process.env.POS_LICENSE_KEY ||
    process.env.NEXT_PUBLIC_POS_LICENSE_KEY ||
    ''
).trim();
// Reduce timeout to 8 seconds (was 20 seconds)
const EXTERNAL_FETCH_TIMEOUT_MS = Number(process.env.LICENSE_EXTERNAL_TIMEOUT_MS || 8000);
// Reduce retries to 2 (was 3) to prevent long waits
const EXTERNAL_FETCH_RETRIES = Number(process.env.LICENSE_EXTERNAL_RETRIES || 2);

const pad = (value: number) => String(value).padStart(2, '0');

const toUtcDateTime = (date: Date) =>
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;

const normalizeDateTime = (value: unknown) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
        const ms = value > 1e12 ? value : value * 1000;
        const parsed = new Date(ms);
        return Number.isNaN(parsed.getTime()) ? null : toUtcDateTime(parsed);
    }

    const raw = String(value).trim();
    if (!raw) return null;

    const dmyMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (dmyMatch) {
        const [, dd, mm, yyyy, hh = '00', mi = '00', ss = '00'] = dmyMatch;
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    }

    const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) return raw;
    return toUtcDateTime(parsed);
};

const normalizeExternalLicense = (row: Record<string, any>) => {
    const payload = row?.data ?? row?.license ?? row?.result ?? row;

    return {
        license_key: String(payload.license_key ?? payload.licenseKey ?? payload.key ?? '').trim(),
        expires_at: normalizeDateTime(
            payload.expires_at ??
            payload.expiresAt ??
            payload.expiry_date ??
            payload.expiryDate ??
            payload.expiration_date ??
            payload.expirationDate
        ),
        renew_date: normalizeDateTime(payload.renew_date ?? payload.renewDate),
        activation_data: payload,
        machine_id: payload.machine_id ?? payload.machineId ?? null
    };
};

async function fetchLocalLicense(licenseKey: string) {
    const candidates = [
        licenseKey,
        licenseKey.replace(/\s+/g, ''),
        licenseKey.replace(/-/g, ''),
        licenseKey.toUpperCase(),
        licenseKey.toLowerCase()
    ].filter(Boolean).filter((value, index, self) => self.indexOf(value) === index);

    try {
        const { data, error } = await supabase
            .schema(LICENSE_SCHEMA)
            .from(TARGET_LICENSE_TABLE)
            .select('*')
            .in(TARGET_LICENSE_COLUMN, candidates)
            .limit(1);

        if (!error && data && data.length > 0) {
            return data[0] as Record<string, any>;
        }
    } catch (error) {
        // Failed to fetch local license
    }

    return null;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class ExternalApiError extends Error {
    status: number;
    payload: Record<string, any>;

    constructor(message: string, status: number, payload: Record<string, any> = {}) {
        super(message);
        this.name = 'ExternalApiError';
        this.status = status;
        this.payload = payload;
    }
}

const getFetchErrorMessage = (error: any) => {
    const causeCode = error?.cause?.code || error?.code || '';
    if (causeCode === 'UND_ERR_CONNECT_TIMEOUT' || causeCode === 'ETIMEDOUT') {
        return 'Connection to verify-license API timed out. Please try again.';
    }
    if (causeCode === 'ENOTFOUND') {
        return 'verify-license API host could not be resolved.';
    }
    if (causeCode === 'ECONNREFUSED') {
        return 'verify-license API refused the connection.';
    }
    if (error?.name === 'AbortError') {
        return 'verify-license API request timed out. Please try again.';
    }
    return error?.message || 'Failed to reach verify-license API.';
};

async function fetchJsonWithRetry(url: string, init: RequestInit, logLabel: string) {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= EXTERNAL_FETCH_RETRIES; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), EXTERNAL_FETCH_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                cache: 'no-store',
                ...init,
                signal: controller.signal
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new ExternalApiError(
                    String(data?.error || data?.message || `External API error: ${response.status}`),
                    response.status,
                    data
                );
            }

            return data as Record<string, any>;
        } catch (error: any) {
            if (error instanceof ExternalApiError && error.status >= 400 && error.status < 500) {
                throw error;
            }

            lastError = new Error(getFetchErrorMessage(error));

            if (attempt < EXTERNAL_FETCH_RETRIES) {
                // Shorter delay: 500ms * attempt (was 1000ms * attempt)
                await delay(500 * attempt);
            }
        } finally {
            clearTimeout(timeoutId);
        }
    }

    throw lastError || new Error('Failed to reach verify-license API.');
}

async function saveLicenseToSupabase(record: {
    license_key: string;
    expires_at: string | null;
    renew_date: string | null;
    activation_data: any;
    machine_id?: string | null;
}) {
    const payload: Record<string, any> = {
        [TARGET_LICENSE_COLUMN]: record.license_key,
        expires_at: record.expires_at,
        renew_date: record.renew_date,
        activation_data: record.activation_data
    };

    if (record.machine_id) {
        payload.machine_id = record.machine_id;
    }

    const { error } = await supabase
        .schema(LICENSE_SCHEMA)
        .from(TARGET_LICENSE_TABLE)
        .upsert(payload, { onConflict: TARGET_LICENSE_COLUMN });

    if (error) {
        throw new Error(`Failed to save license to Supabase: ${error.message}`);
    }
}

async function fetchExternalLicenseByKey(licenseKey: string) {
    const candidates = [
        licenseKey,
        licenseKey.replace(/\s+/g, ''),
        licenseKey.replace(/-/g, ''),
        licenseKey.toUpperCase(),
        licenseKey.toLowerCase()
    ].filter(Boolean).filter((value, index, self) => self.indexOf(value) === index);

    let notFoundError: ExternalApiError | null = null;

    for (const candidate of candidates) {
        try {
            return await fetchJsonWithRetry(
                LICENSE_VERIFY_FUNCTION_URL,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ license_key: candidate })
                },
                `verify-license POST (${candidate})`
            );
        } catch (postError: any) {
            if (postError instanceof ExternalApiError && postError.status === 404) {
                notFoundError = postError;
            } else if (!(postError instanceof ExternalApiError)) {
                throw postError;
            }
        }

        try {
            const url = new URL(LICENSE_VERIFY_FUNCTION_URL);
            url.searchParams.set('license_key', candidate);

            return await fetchJsonWithRetry(
                url.toString(),
                {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json'
                    }
                },
                `verify-license GET (${candidate})`
            );
        } catch (getError: any) {
            if (getError instanceof ExternalApiError && getError.status === 404) {
                notFoundError = getError;
                continue;
            }
            throw getError;
        }
    }

    throw notFoundError || new Error('License not found in verify-license API');
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const licenseKey = String(ENV_LICENSE_KEY || body?.license_key || body?.licenseKey || body?.key || '').trim();

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
        }

        if (!licenseKey) {
            return NextResponse.json({ error: 'License key is required' }, { status: 400 });
        }

        // Try to fetch from local database first - if exists and valid, use it
        const localLicense = await fetchLocalLicense(licenseKey);
        if (localLicense && localLicense.expires_at) {
            const expiresAt = new Date(localLicense.expires_at);
            const now = new Date();
            
            // If local license is still valid for more than 1 day, return it immediately
            const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            if (expiresAt > oneDayFromNow) {
                return NextResponse.json({
                    success: true,
                    source: 'local_license_cached',
                    syncedAt: new Date().toISOString(),
                    data: localLicense,
                    info: 'Using cached local license (still valid)'
                });
            }
        }

        // Try to sync from external API (with shorter timeout)
        let externalRow: Record<string, any>;
        try {
            externalRow = await fetchExternalLicenseByKey(licenseKey);
        } catch (error: any) {
            // If external API fails but we have a local license, fall back to it
            if (localLicense) {
                return NextResponse.json({
                    success: true,
                    source: 'local_license_fallback',
                    syncedAt: new Date().toISOString(),
                    data: localLicense,
                    warning: 'External API unavailable. Using local database record.'
                });
            }
            
            // If it's a 404, license doesn't exist
            if (error instanceof ExternalApiError && error.status === 404) {
                return NextResponse.json({
                    error: 'License not found in verify-license API',
                    status: 'not_found'
                }, { status: 404 });
            }
            
            // For other errors, throw to be caught by outer try-catch
            throw error;
        }
        
        const normalizedRow = normalizeExternalLicense(externalRow);

        if (!normalizedRow.license_key) {
            normalizedRow.license_key = licenseKey;
        }

        if (!normalizedRow.expires_at) {
            return NextResponse.json({ error: 'verify-license API returned no expires_at' }, { status: 502 });
        }

        await saveLicenseToSupabase(normalizedRow);

        return NextResponse.json({
            success: true,
            source: 'verify_license_function',
            syncedAt: new Date().toISOString(),
            data: normalizedRow
        });
    } catch (error: any) {
        // Provide more helpful error messages
        const errorMessage = error?.message || 'Internal server error';
        const isTimeout = /timed out|timeout|verify-license API|resolved|refused/i.test(errorMessage);
        
        return NextResponse.json({
            error: errorMessage,
            tip: isTimeout 
                ? 'The license verification server is not responding. Please try again later or contact support.'
                : 'Failed to sync license. Please check your internet connection.'
        }, {
            status: error instanceof ExternalApiError && error.status === 404
                ? 404
                : isTimeout
                    ? 504
                    : 500
        });
    }
}

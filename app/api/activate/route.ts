import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

if (supabaseServiceRoleKey && !shouldUseServiceRole) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY project ref does not match NEXT_PUBLIC_SUPABASE_URL project ref. Falling back to anon key.');
}

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
const LICENSE_TIMEZONE_OFFSET = (process.env.LICENSE_TIMEZONE_OFFSET || '+07:00').trim() || '+07:00';
const EXTERNAL_FETCH_TIMEOUT_MS = Number(process.env.LICENSE_EXTERNAL_TIMEOUT_MS || 20000);
const EXTERNAL_FETCH_RETRIES = Number(process.env.LICENSE_EXTERNAL_RETRIES || 3);

const buildKeyCandidates = (rawKey: string) => {
    const trimmed = String(rawKey || '').trim();
    const noSpaces = trimmed.replace(/\s+/g, '');
    const noDashes = noSpaces.replace(/-/g, '');

    return Array.from(
        new Set([
            rawKey,
            trimmed,
            noSpaces,
            noDashes,
            trimmed.toUpperCase(),
            trimmed.toLowerCase()
        ].filter(Boolean))
    );
};

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

    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const parsed = new Date(hasTimezone ? normalized : `${normalized}${LICENSE_TIMEZONE_OFFSET}`);
    if (Number.isNaN(parsed.getTime())) return raw;
    return toUtcDateTime(parsed);
};

const parseLicenseDate = (value: unknown) => {
    const normalized = normalizeDateTime(value);
    if (!normalized) return null;
    const parsed = new Date(normalized.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeExternalLicense = (row: Record<string, any>, requestedKey: string) => {
    const payload = row?.data ?? row?.license ?? row?.result ?? row;
    const licenseKey =
        String(
            payload.license_key ??
            payload.licenseKey ??
            payload.key ??
            payload.code ??
            requestedKey
        ).trim();

    return {
        license_key: licenseKey,
        expires_at: normalizeDateTime(
            payload.expires_at ??
            payload.expiresAt ??
            payload.expiry_date ??
            payload.expiryDate ??
            payload.expiration_date ??
            payload.expirationDate
        ),
        renew_date: normalizeDateTime(payload.renew_date ?? payload.renewDate),
        activation_data: payload
    };
};

const extractExternalStatus = (row: Record<string, any>) => {
    const payload = row?.data ?? row?.license ?? row?.result ?? row;
    const valid = payload?.valid;
    const found = payload?.found;
    const status = String(payload?.status ?? '').trim().toLowerCase();
    const error = String(payload?.error ?? payload?.message ?? '').trim();

    const notFound =
        found === false ||
        valid === false ||
        status === 'not_found' ||
        /license not found/i.test(error);

    return {
        valid,
        found,
        notFound,
        inactive: ['inactive', 'expired', 'revoked', 'suspended', 'blocked', 'disabled'].includes(status),
        status,
        error
    };
};

const buildExternalHeaders = () => ({
    Accept: 'application/json',
    'Content-Type': 'application/json'
});

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
            console.log(`${logLabel} attempt ${attempt} status:`, response.status);
            console.log(`${logLabel} response:`, JSON.stringify(data, null, 2));

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
            console.warn(`${logLabel} attempt ${attempt} failed:`, error);

            if (attempt < EXTERNAL_FETCH_RETRIES) {
                await delay(1000 * attempt);
            }
        } finally {
            clearTimeout(timeoutId);
        }
    }

    throw lastError || new Error('Failed to reach verify-license API.');
}

async function fetchLocalLicense(licenseKey: string) {
    const candidates = buildKeyCandidates(licenseKey);

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

        for (const candidate of candidates) {
            const { data: ilikeData, error: ilikeError } = await supabase
                .schema(LICENSE_SCHEMA)
                .from(TARGET_LICENSE_TABLE)
                .select('*')
                .ilike(TARGET_LICENSE_COLUMN, candidate)
                .limit(1);

            if (!ilikeError && ilikeData && ilikeData.length > 0) {
                return ilikeData[0] as Record<string, any>;
            }
        }
    } catch (error) {
        console.error('Failed to fetch local license:', error);
    }

    return null;
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

    const { data, error } = await supabase
        .schema(LICENSE_SCHEMA)
        .from(TARGET_LICENSE_TABLE)
        .upsert(payload, { onConflict: TARGET_LICENSE_COLUMN })
        .select('*')
        .single();

    if (error) {
        throw new Error(`Failed to save license to Supabase: ${error.message}`);
    }

    return data as Record<string, any>;
}

async function fetchExternalLicenseByKey(licenseKey: string) {
    const candidates = buildKeyCandidates(licenseKey);
    let notFoundError: ExternalApiError | null = null;

    for (const candidate of candidates) {
        try {
            return await fetchJsonWithRetry(
                LICENSE_VERIFY_FUNCTION_URL,
                {
                    method: 'POST',
                    headers: buildExternalHeaders(),
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
                    headers: { Accept: 'application/json' }
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
        const machineId = String(body?.machine_id || '').trim() || null;
        const forceRefresh = body?.force_refresh === true || body?.force_external === true;

        if (!licenseKey) {
            return NextResponse.json({ error: 'License key is required' }, { status: 400 });
        }

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
        }

        if (!forceRefresh) {
            const localLicense = await fetchLocalLicense(licenseKey);
            if (localLicense) {
                const expiresAt = normalizeDateTime(localLicense.expires_at ?? localLicense.expiresAt);
                const renewDate = normalizeDateTime(localLicense.renew_date ?? localLicense.renewDate);
                const expiryDate = parseLicenseDate(expiresAt);
                const isExpired = expiryDate ? expiryDate < new Date() : false;

                if (expiresAt && !isExpired) {
                    return NextResponse.json({
                        success: true,
                        message: 'License loaded from local database',
                        expires_at: expiresAt,
                        renew_date: renewDate,
                        activation_data: localLicense.activation_data ?? localLicense,
                        source: 'local_license_keys'
                    });
                }
            }
        }

        let externalLicense: Record<string, any>;
        try {
            externalLicense = await fetchExternalLicenseByKey(licenseKey);
        } catch (error: any) {
            if (error instanceof ExternalApiError && error.status === 404) {
                const localLicense = await fetchLocalLicense(licenseKey);
                if (localLicense) {
                    const expiresAt = normalizeDateTime(localLicense.expires_at ?? localLicense.expiresAt);
                    const renewDate = normalizeDateTime(localLicense.renew_date ?? localLicense.renewDate);
                    const expiryDate = parseLicenseDate(expiresAt);
                    const isExpired = expiryDate ? expiryDate < new Date() : false;

                    return NextResponse.json({
                        success: !isExpired,
                        message: 'License not found in verify-license API. Using local database record.',
                        error: isExpired ? 'License has expired' : undefined,
                        expires_at: expiresAt,
                        renew_date: renewDate,
                        activation_data: localLicense.activation_data ?? localLicense,
                        source: 'local_license_keys_fallback'
                    }, { status: 200 });
                }
            }
            throw error;
        }
        const externalStatus = extractExternalStatus(externalLicense);
        if (externalStatus.notFound) {
            return NextResponse.json({
                error: externalStatus.error || 'License not found in verify-license API'
            }, { status: 404 });
        }

        const normalized = normalizeExternalLicense(externalLicense, licenseKey);

        if (!normalized.expires_at) {
            return NextResponse.json({
                error: externalStatus.error || 'verify-license API returned no expires_at'
            }, { status: 502 });
        }

        await saveLicenseToSupabase({
            ...normalized,
            machine_id: machineId
        });

        const expiryDate = parseLicenseDate(normalized.expires_at);
        const isExpired = expiryDate ? expiryDate < new Date() : false;

        if (isExpired || externalStatus.inactive) {
            return NextResponse.json({
                success: false,
                error: externalStatus.inactive
                    ? `License status is ${externalStatus.status || 'inactive'}`
                    : 'License has expired',
                expires_at: normalized.expires_at,
                renew_date: normalized.renew_date,
                activation_data: normalized.activation_data,
                source: 'external_license_by_key'
            });
        }

        return NextResponse.json({
            success: true,
            message: 'License synced from verify-license API',
            expires_at: normalized.expires_at,
            renew_date: normalized.renew_date,
            activation_data: normalized.activation_data,
            source: 'external_license_by_key'
        });
    } catch (error: any) {
        console.error('License activation error:', error);
        return NextResponse.json({
            error: error?.message || 'Internal server error'
        }, {
            status:
                error instanceof ExternalApiError && error.status === 404
                    ? 404
                    : /timed out|verify-license API|resolved|refused/i.test(String(error?.message || ''))
                        ? 504
                        : 500
        });
    }
}

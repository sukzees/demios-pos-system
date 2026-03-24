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
const supabase = createClient(
    supabaseUrl,
    supabaseServerKey,
    { auth: { persistSession: false } }
);

const LICENSE_SCHEMA = (process.env.LICENSE_SCHEMA || 'public').trim() || 'public';
const TARGET_LICENSE_TABLE = 'license_keys';
const TARGET_LICENSE_COLUMN = 'license_key';
const ENV_LICENSE_KEY = (
    process.env.POS_LICENSE_KEY ||
    process.env.NEXT_PUBLIC_POS_LICENSE_KEY ||
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
    } catch {
        return null;
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const license_key =
            ENV_LICENSE_KEY ||
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

        console.log('Verifying license from Supabase license_keys:', { license_key: normalizedKey, machine_id });

        const localLicense = await fetchLicense(normalizedKey);
        if (localLicense) {
            const localExpiresAt = normalizeExpiresAt(localLicense);
            if (localExpiresAt) {
                const expiryDate = parseLicenseDate(String(localExpiresAt));
                const isExpired = expiryDate ? expiryDate < new Date() : false;
                if (isExpired) {
                    return NextResponse.json({
                        valid: false,
                        error: 'License expired (from Supabase license_keys)',
                        expires_at: localExpiresAt,
                        renew_date: normalizeRenewDate(localLicense),
                        activation_data: normalizeActivationData(localLicense),
                        source: 'local_license_keys'
                    });
                }

                return NextResponse.json({
                    valid: true,
                    message: 'License is valid (from Supabase license_keys)',
                    expires_at: localExpiresAt,
                    renew_date: normalizeRenewDate(localLicense),
                    activation_data: normalizeActivationData(localLicense),
                    source: 'local_license_keys'
                });
            }
        }

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
        }

        const data = await fetchLicense(normalizedKey);
        if (!data) {
            return NextResponse.json({
                valid: false,
                error: 'License key has not been synced to local database yet. Please press Refresh License Status.',
                source: 'local_license_keys'
            });
        }

        const expiresAt = normalizeExpiresAt(data);
        if (!expiresAt) {
            return NextResponse.json({
                valid: false,
                error: 'License missing expiry date',
                source: 'local_license_keys'
            });
        }

        const expiryDate = parseLicenseDate(String(expiresAt));
        if (expiryDate) {
            expiryDate.setHours(23, 59, 59, 999);
        }
        const isExpired = expiryDate ? expiryDate < new Date() : false;

        if (isExpired) {
            return NextResponse.json({
                valid: false,
                error: 'License expired',
                expires_at: expiresAt,
                source: 'local_license_keys'
            });
        }

        return NextResponse.json({
            valid: true,
            message: 'License is valid (from Supabase license_keys)',
            expires_at: expiresAt,
            renew_date: normalizeRenewDate(data),
            activation_data: normalizeActivationData(data),
            source: 'local_license_keys'
        });

    } catch (error) {
        console.error('License verification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

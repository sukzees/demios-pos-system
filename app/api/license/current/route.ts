import { NextResponse } from 'next/server';

const getCurrentLicenseKey = () =>
    String(
        process.env.POS_LICENSE_KEY ||
        process.env.NEXT_PUBLIC_POS_LICENSE_KEY ||
        ''
    ).trim();

export async function GET() {
    return NextResponse.json(
        {
            license_key: getCurrentLicenseKey(),
            source: 'server_env'
        },
        {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate'
            }
        }
    );
}

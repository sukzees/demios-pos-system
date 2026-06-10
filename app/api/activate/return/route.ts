import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { license_key, machine_id } = body;

        if (!license_key) {
            return NextResponse.json({ error: 'License key is required' }, { status: 400 });
        }

        console.log('Returning (Deactivating) License:', {
            license_key,
            machine_id
        });

        // Simulate successful deactivation (returning the activation slot)
        if (license_key.startsWith('POS-')) {
            return NextResponse.json({
                success: true,
                message: 'License returned successfully. This machine is now deactivated.',
                deactivated_at: new Date().toISOString()
            });
        } else {
            return NextResponse.json({ error: 'Invalid license key for return' }, { status: 400 });
        }

    } catch (error) {
        console.error('License return error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

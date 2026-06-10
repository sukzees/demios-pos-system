import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function GET() {
    try {
        // Try multiple methods to get printers
        let printers: string[] = [];
        let method = '';
        let errorDetails = '';

        // Method 1: Get-CimInstance (most reliable)
        try {
            const { stdout: stdout1, stderr: stderr1 } = await execPromise(
                'powershell -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object -ExpandProperty Name"',
                { timeout: 10000 }
            );
            
            if (stderr1) {
                console.warn('PowerShell stderr (Method 1):', stderr1);
            }

            printers = stdout1
                .split('\r\n')
                .join('\n')
                .split('\n')
                .map(p => p.trim())
                .filter(Boolean);

            if (printers.length > 0) {
                method = 'Get-CimInstance';
                console.log(`Found ${printers.length} printers using ${method}:`, printers);
                return NextResponse.json({ success: true, printers, method });
            }
        } catch (err1) {
            errorDetails += `Method 1 failed: ${err1}\n`;
            console.error('Method 1 (Get-CimInstance) failed:', err1);
        }

        // Method 2: Get-Printer cmdlet
        try {
            const { stdout: stdout2, stderr: stderr2 } = await execPromise(
                'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"',
                { timeout: 10000 }
            );
            
            if (stderr2) {
                console.warn('PowerShell stderr (Method 2):', stderr2);
            }

            printers = stdout2
                .split('\r\n')
                .join('\n')
                .split('\n')
                .map(p => p.trim())
                .filter(Boolean);

            if (printers.length > 0) {
                method = 'Get-Printer';
                console.log(`Found ${printers.length} printers using ${method}:`, printers);
                return NextResponse.json({ success: true, printers, method });
            }
        } catch (err2) {
            errorDetails += `Method 2 failed: ${err2}\n`;
            console.error('Method 2 (Get-Printer) failed:', err2);
        }

        // Method 3: WMI query
        try {
            const { stdout: stdout3, stderr: stderr3 } = await execPromise(
                'powershell -Command "Get-WmiObject -Class Win32_Printer | Select-Object -ExpandProperty Name"',
                { timeout: 10000 }
            );
            
            if (stderr3) {
                console.warn('PowerShell stderr (Method 3):', stderr3);
            }

            printers = stdout3
                .split('\r\n')
                .join('\n')
                .split('\n')
                .map(p => p.trim())
                .filter(Boolean);

            if (printers.length > 0) {
                method = 'Get-WmiObject';
                console.log(`Found ${printers.length} printers using ${method}:`, printers);
                return NextResponse.json({ success: true, printers, method });
            }
        } catch (err3) {
            errorDetails += `Method 3 failed: ${err3}\n`;
            console.error('Method 3 (Get-WmiObject) failed:', err3);
        }

        // If all methods failed, return error with details
        console.error('All methods failed to fetch printers:', errorDetails);
        
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch local printers. All methods failed.',
            errorDetails,
            printers: []
        }, { status: 500 });

    } catch (error) {
        console.error('Unexpected error fetching system printers:', error);

        return NextResponse.json({
            success: false,
            error: 'Unexpected error occurred while fetching printers.',
            errorMessage: error instanceof Error ? error.message : String(error),
            printers: []
        }, { status: 500 });
    }
}

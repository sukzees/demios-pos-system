import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function GET() {
    try {
        // Use PowerShell to list all printers installed on the system
        const { stdout } = await execPromise('powershell "Get-CimInstance -ClassName Win32_Printer | Select-Object -ExpandProperty Name"');

        // Clean up results and return as array
        const printers = stdout
            .split('\r\n')
            .join('\n')
            .split('\n')
            .map(p => p.trim())
            .filter(Boolean);

        return NextResponse.json({ success: true, printers });
    } catch (error) {
        console.error('Error fetching system printers:', error);

        // Mock some fallback printers if the command fails for any reason (like permission depth)
        const mockPrinters = ['Microsoft Print to PDF', 'Microsoft XPS Document Writer', 'OneNote (Desktop)', 'Fax'];

        return NextResponse.json({
            success: false,
            error: 'Failed to fetch local printers via system call.',
            printers: mockPrinters
        });
    }
}

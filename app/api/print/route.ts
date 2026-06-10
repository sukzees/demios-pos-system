import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execPromise = promisify(exec);

export async function POST(request: NextRequest) {
    try {
        const { html, printerName } = await request.json();

        if (!html || !printerName) {
            return NextResponse.json({
                success: false,
                error: 'Missing html or printerName'
            }, { status: 400 });
        }

        // Create temp HTML file in system temp directory
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `kitchen-ticket-${Date.now()}.html`);
        
        fs.writeFileSync(tempFile, html, 'utf8');

        // Print using default browser print
        // This will use the system's default printer or the one specified
        const command = `powershell -Command "Start-Process '${tempFile}' -Verb Print"`;
        
        await execPromise(command);

        // Clean up temp file after a delay
        setTimeout(() => {
            try {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            } catch (err) {
                console.error('Failed to delete temp file:', err);
            }
        }, 5000);

        return NextResponse.json({
            success: true,
            message: 'Print job sent successfully'
        });

    } catch (error) {
        console.error('Print error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

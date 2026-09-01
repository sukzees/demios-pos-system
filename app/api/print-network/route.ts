import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Helper: load an escpos image from base64 data URL and return the image object
async function loadImageFromBase64(escpos: any, dataUrl: string, tempFiles: string[]) {
  const EscposImage = escpos.default.Image;
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`);
  fs.writeFileSync(tempFile, imageBuffer);
  tempFiles.push(tempFile);

  return new Promise((resolve, reject) => {
    EscposImage.load(tempFile, (loadedImage: any) => {
      if (loadedImage) {
        resolve(loadedImage);
      } else {
        reject(new Error('Failed to load image'));
      }
    });
  });
}

// @ts-ignore - escpos doesn't have type definitions
export async function POST(request: NextRequest) {
  let tempFiles: string[] = [];
  try {
    const { printerIp, imageData, paperWidth = '80mm', beep = false, qrImageData = '', logoImageData = '', footerText = '' } = await request.json();

    if (!printerIp) {
      return NextResponse.json({ success: false, error: 'Printer IP is required' }, { status: 400 });
    }

    if (!imageData) {
      return NextResponse.json({ success: false, error: 'Image data is required' }, { status: 400 });
    }

    // Dynamic import
    // @ts-ignore - escpos doesn't have type definitions
    const escpos = await import('escpos');
    // @ts-ignore - escpos-network doesn't have type definitions
    const Network = (await import('escpos-network')).default;

    // Create network device
    const device = new Network(printerIp, 9100);
    const printer = new escpos.default.Printer(device);

    // Open connection
    await new Promise((resolve, reject) => {
      device.open((error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      });
    });

    try {
      // Load receipt image
      const receiptImage = await loadImageFromBase64(escpos, imageData, tempFiles);

      // Print receipt (text + layout) using d24 — standard density, works for all printers
      printer.align('ct');

      // Add beep sound if requested
      if (beep) {
        printer.beep(2, 3); // Beep 2 times, duration 3
      }

      // Print store logo as a separate sharp image (avoid html2canvas blur on small logos)
      if (logoImageData) {
        try {
          const logoImage = await loadImageFromBase64(escpos, logoImageData, tempFiles);
          printer.align('ct');
          printer.image(logoImage, 'd24');
          printer.feed(1);
        } catch (logoError) {
          console.error('Logo image print error:', logoError);
        }
      }

      printer.image(receiptImage, 'd24');

      // Print QR code as a SEPARATE image if provided.
      // QR is pre-resized client-side to ~240px (80mm) / ~180px (58mm) to fit paper.
      // Using 'd24' (24-dot double density) keeps QR sharp and at correct size.
      if (qrImageData) {
        try {
          const qrImage = await loadImageFromBase64(escpos, qrImageData, tempFiles);
          printer.align('ct');
          printer.image(qrImage, 'd24');
        } catch (qrError) {
          console.error('QR image print error:', qrError);
          // Continue even if QR fails — receipt text is already printed
        }
      }

      // Print footer text AFTER QR code (e.g. "Thank you for your business!")
      if (footerText) {
        printer.feed(1);
        printer.align('ct');
        printer.style('normal');
        printer.text(footerText);
      }

      printer.feed(3);
      printer.cut();

      // Close connection
      await new Promise((resolve) => {
        printer.close(() => {
          resolve(true);
        });
      });

      // Clean up temp files
      for (const f of tempFiles) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
      }
      tempFiles = [];

      return NextResponse.json({
        success: true,
        message: 'Print job sent successfully',
        printer: printerIp,
        paperWidth: paperWidth,
        qrPrinted: !!qrImageData,
        logoPrinted: !!logoImageData
      });
    } catch (printError) {
      // Clean up temp file on error
      for (const f of tempFiles) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
      }
      tempFiles = [];
      throw printError;
    }

  } catch (error: any) {
    console.error('Network print error:', error);
    // Cleanup on any error
    for (const f of tempFiles) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
    }
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to print',
      details: error.toString()
    }, { status: 500 });
  }
}

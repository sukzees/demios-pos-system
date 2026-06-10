import { NextRequest, NextResponse } from 'next/server';

// @ts-ignore - escpos doesn't have type definitions
export async function POST(request: NextRequest) {
  try {
    const { printerIp, imageData, paperWidth = '80mm', beep = false } = await request.json();

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
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

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

    // Convert base64 to buffer and save to temp file
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Save to temp file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `ticket-${Date.now()}.png`);
    fs.writeFileSync(tempFile, imageBuffer);

    try {
      // Load image using callback-based approach
      const EscposImage = escpos.default.Image;
      
      // Use promise wrapper for Image.load callback
      const image = await new Promise((resolve, reject) => {
        EscposImage.load(tempFile, (loadedImage: any) => {
          if (loadedImage) {
            resolve(loadedImage);
          } else {
            reject(new Error('Failed to load image'));
          }
        });
      });

      // Print image
      printer.align('ct');
      
      // Add beep sound if requested
      if (beep) {
        printer.beep(2, 3); // Beep 2 times, duration 3
      }
      
      printer.image(image, 'd24');
      printer.feed(3);
      printer.cut();
      
      // Close connection
      await new Promise((resolve) => {
        printer.close(() => {
          resolve(true);
        });
      });

      // Clean up temp file
      fs.unlinkSync(tempFile);

      return NextResponse.json({ 
        success: true, 
        message: 'Print job sent successfully',
        printer: printerIp,
        paperWidth: paperWidth
      });
    } catch (printError) {
      // Clean up temp file on error
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw printError;
    }

  } catch (error: any) {
    console.error('Network print error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to print',
      details: error.toString()
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import iconv from 'iconv-lite';

// @ts-ignore - escpos doesn't have type definitions
export async function POST(request: NextRequest) {
  try {
    const { printerIp, content, paperWidth = '80mm' } = await request.json();

    if (!printerIp) {
      return NextResponse.json({ success: false, error: 'Printer IP is required' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
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
      // Helper function to encode text for Thai/Lao support
      const encodeText = (text: string) => {
        // Try TIS-620 encoding for Thai text
        return iconv.encode(text, 'TIS-620');
      };

      // Print title (centered, bold, larger)
      printer
        .align('ct')
        .style('bu')
        .size(1, 1)
        .raw(encodeText(content.title + '\n'))
        .style('normal')
        .size(0, 0);

      // Print separator
      printer.raw(encodeText(content.separator + '\n'));

      // Print table info and time (left aligned, bold)
      printer
        .align('lt')
        .style('b')
        .raw(encodeText(content.tableInfo + '\n'))
        .raw(encodeText(content.time + '\n'))
        .style('normal');

      // Print separator
      printer.raw(encodeText(content.separator + '\n'));

      // Print section header if exists (for void bill)
      if (content.sectionHeader) {
        printer
          .style('b')
          .raw(encodeText(content.sectionHeader + '\n'))
          .raw(encodeText('\n'))
          .style('normal');
      }

      // Print items
      content.items.forEach((item: any) => {
        printer.style('b').raw(encodeText(item.name + '\n'));
        if (item.portion) {
          printer.raw(encodeText(`    ${item.portion}\n`));
        }
        if (item.notes) {
          printer.raw(encodeText(`    ${item.notes}\n`));
        }
        printer.style('normal');
      });

      // Print separator
      printer.raw(encodeText(content.separator + '\n'));

      // Print note if exists
      if (content.note) {
        printer
          .style('b')
          .raw(encodeText(content.note + '\n'))
          .style('normal')
          .raw(encodeText(content.separator + '\n'));
      }

      // Print message if exists (for void bill)
      if (content.message) {
        printer
          .style('b')
          .raw(encodeText(content.message + '\n'))
          .style('normal')
          .raw(encodeText(content.separator + '\n'));
      }

      // Feed and cut
      printer.feed(3);
      printer.cut();

      // Close connection
      await new Promise((resolve) => {
        printer.close(() => {
          resolve(true);
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Print job sent successfully',
        printer: printerIp,
        paperWidth: paperWidth
      });

    } catch (printError) {
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

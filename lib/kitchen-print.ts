import html2canvas from 'html2canvas';
import { usePosStore } from '@/lib/store';

const KITCHEN_LABELS = {
  en: { table: 'Table', takeout: 'Takeout', note: 'Note', kitchen: 'KITCHEN' },
  lo: { table: 'ໂຕະ', takeout: 'ເອົາກັບບ້ານ', note: 'ໝາຍເຫตุ', kitchen: 'ຫ້ອງຄົວ' },
  th: { table: 'โต๊ะ', takeout: 'ซื้อกลับ', note: 'หมายเหตุ', kitchen: 'ครัว' },
} as const;

type KitchenLanguage = keyof typeof KITCHEN_LABELS;

function getPrintRuntime() {
  if (typeof window === 'undefined') {
    return { isElectron: false, isLocalRuntime: false, canUseOfflineNetworkPrint: false };
  }

  const hostname = window.location.hostname;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isElectron = userAgent.includes('electron');
  const isLocalRuntime =
    hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.startsWith('192.168.')
    || hostname.startsWith('10.')
    || hostname.startsWith('172.');

  return {
    isElectron,
    isLocalRuntime,
    canUseOfflineNetworkPrint: isElectron || isLocalRuntime,
  };
}

function printWithIframe(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) return;

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  const triggerPrint = async () => {
    const imgs = iframeDoc.querySelectorAll('img');
    if (imgs.length > 0) {
      await Promise.allSettled(Array.from(imgs).map(async (img) => {
        try {
          if (typeof (img as HTMLImageElement).decode === 'function') {
            await (img as HTMLImageElement).decode();
          } else {
            await new Promise<void>((resolve) => {
              if (img.complete && (img as HTMLImageElement).naturalWidth > 0) {
                resolve();
                return;
              }
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            });
          }
        } catch {
          // continue printing even if image decode fails
        }
      }));
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  window.setTimeout(() => {
    void triggerPrint();
  }, 500);
}

async function printKitchenHtmlAsImage(html: string, printerIp: string, paperWidth: string) {
  const { canUseOfflineNetworkPrint } = getPrintRuntime();
  const isLocalIP = printerIp.startsWith('192.168.')
    || printerIp.startsWith('10.')
    || printerIp.startsWith('172.');

  if (!canUseOfflineNetworkPrint && isLocalIP) {
    printWithIframe(html);
    return;
  }

  const width = paperWidth === '80mm' ? 576 : 384;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = `${width}px`;
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not access iframe document');
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  await new Promise((resolve) => window.setTimeout(resolve, 800));
  try {
    await (iframe.contentWindow as Window & { document: Document & { fonts?: FontFaceSet } }).document.fonts?.ready;
  } catch {
    // ignore font readiness errors
  }

  const renderRoot = iframeDoc.body;
  const canvas = await html2canvas(renderRoot, {
    backgroundColor: '#ffffff',
    scale: 1,
    logging: false,
    width,
    height: renderRoot.scrollHeight,
    windowWidth: width,
    windowHeight: renderRoot.scrollHeight,
    useCORS: true,
    allowTaint: true,
    foreignObjectRendering: false,
    imageTimeout: 15000,
  });

  document.body.removeChild(iframe);

  const imageData = canvas.toDataURL('image/png', 1.0);
  const response = await fetch('/api/print-network', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerIp,
      imageData,
      paperWidth,
      beep: true,
    }),
  });

  const result = await response.json().catch(() => ({} as { success?: boolean; error?: string }));
  if (!response.ok || !result.success) {
    throw new Error(result.error || `Print request failed (${response.status})`);
  }
}

function createKitchenTicketHTML(
  items: any[],
  options: {
    tableNumber?: string;
    orderNote?: string;
    kitchenBillSize: string;
    language: KitchenLanguage;
  },
) {
  const labels = KITCHEN_LABELS[options.language] || KITCHEN_LABELS.en;
  const currentTime = new Date().toLocaleString();
  const tableInfo = options.tableNumber
    ? `${labels.table} ${options.tableNumber}`
    : labels.takeout;

  const paperSize = options.kitchenBillSize || '80mm';
  const paperWidthMm = paperSize === '80mm' ? '80mm' : '58mm';
  const paperWidthPx = paperSize === '80mm' ? 576 : 384;
  const kitchenFs = paperSize === '80mm' ? 1.7 : 1.2;
  const kfz = (n: number) => Math.round(n * kitchenFs) + 2;

  return `<html>
<head>
<meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Sans+Lao:wght@400;500;700&display=swap');
@page { size: ${paperWidthMm} auto; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Noto Sans Thai', 'Noto Sans Lao', 'Courier New', monospace;
  padding: ${Math.round(10 * kitchenFs)}px;
  width: ${paperWidthPx}px;
  background: white;
  color: black;
  font-size: ${kfz(14)}px;
  line-height: 1.4;
}
.title {
  font-size: ${kfz(16)}px;
  font-weight: bold;
  text-align: center;
  margin: ${Math.round(5 * kitchenFs)}px 0;
}
.separator {
  border-top: 1px dashed #000;
  margin: ${Math.round(5 * kitchenFs)}px 0;
}
.info {
  font-size: ${kfz(14)}px;
  font-weight: 600;
  margin: ${Math.round(3 * kitchenFs)}px 0;
}
.item {
  font-size: ${kfz(14)}px;
  margin: ${Math.round(3 * kitchenFs)}px 0;
  word-wrap: break-word;
}
.portion {
  font-size: ${kfz(12)}px;
  margin: ${Math.round(2 * kitchenFs)}px 0 ${Math.round(2 * kitchenFs)}px ${Math.round(20 * kitchenFs)}px;
  word-wrap: break-word;
}
.item-note {
  font-size: ${kfz(12)}px;
  margin: ${Math.round(2 * kitchenFs)}px 0 ${Math.round(2 * kitchenFs)}px ${Math.round(20 * kitchenFs)}px;
  word-wrap: break-word;
  font-style: italic;
  color: #555;
}
.order-note {
  font-size: ${kfz(14)}px;
  margin: ${Math.round(5 * kitchenFs)}px 0;
  word-wrap: break-word;
}
</style>
</head>
<body>
<div class="title">*** ${labels.kitchen} ***</div>
<div class="separator"></div>
<div class="info">${tableInfo}</div>
<div class="info">${currentTime}</div>
<div class="separator"></div>
${items.map((cartItem) => `<div class="item">${cartItem.quantity}x  ${cartItem.item.name}</div>${cartItem.portionName ? `<div class="portion">${cartItem.portionName}</div>` : ''}${cartItem.notes ? `<div class="item-note">${cartItem.notes}</div>` : ''}`).join('')}
<div class="separator"></div>
${options.orderNote ? `<div class="order-note">${labels.note}: ${options.orderNote}</div><div class="separator"></div>` : ''}
</body>
</html>`;
}

async function printWithSystemDriver(ticketHTML: string, printerName: string, kitchenBillSize: string) {
  await new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      reject(new Error(`System print unavailable for "${printerName}"`));
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page {
              size: ${kitchenBillSize || '80mm'} auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        ${ticketHTML}
      </body>
      </html>
    `);
    doc.close();

    window.setTimeout(() => {
      try {
        iframe.contentWindow?.print();
        window.setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
        resolve();
      } catch (err: any) {
        try {
          document.body.removeChild(iframe);
        } catch {
          // ignore cleanup errors
        }
        reject(new Error(err?.message || `System print failed for "${printerName}"`));
      }
    }, 500);
  });
}

export async function printKitchenTickets(
  itemsToSend: any[],
  options: { tableNumber?: string; orderNote?: string } = {},
) {
  if (!itemsToSend.length) {
    throw new Error('No items to print');
  }

  const {
    stationMappings,
    printerConfigs,
    receiptSettings,
    generalSettings,
  } = usePosStore.getState();

  if (!stationMappings || stationMappings.length === 0) {
    throw new Error('No station mappings configured. Please configure in Settings → Station Mapping');
  }

  if (!printerConfigs || printerConfigs.length === 0) {
    throw new Error('No printers configured. Please configure in Settings → Config Printing');
  }

  const language = (generalSettings?.language || 'en') as KitchenLanguage;
  const kitchenBillSize = receiptSettings.kitchenBillSize || '80mm';
  const itemsByPrinter: Record<string, any[]> = {};
  const unmappedItems: any[] = [];

  itemsToSend.forEach((cartItem) => {
    const item = cartItem.item;
    const mapping = stationMappings.find((entry) => {
      if (String(entry.categoryId) !== String(item.category_id)) return false;
      return entry.selectedItemId === '*' || String(entry.selectedItemId) === String(item.id);
    });

    if (mapping) {
      if (!itemsByPrinter[mapping.printerId]) {
        itemsByPrinter[mapping.printerId] = [];
      }
      itemsByPrinter[mapping.printerId].push(cartItem);
    } else {
      unmappedItems.push(cartItem);
    }
  });

  const printerIds = Object.keys(itemsByPrinter);
  const printErrors: string[] = [];

  if (unmappedItems.length > 0) {
    const names = unmappedItems.map((cartItem) => cartItem.item?.name || 'Unknown').join(', ');
    printErrors.push(
      unmappedItems.length === itemsToSend.length
        ? `No station mapping for these items: ${names}. Configure Settings → Station Mapping`
        : `No station mapping for: ${names}`,
    );
  }

  if (printerIds.length === 0) {
    throw new Error(printErrors[0] || 'No printer mapped for these items. Check Settings → Station Mapping');
  }

  for (const printerId of printerIds) {
    const items = itemsByPrinter[printerId];
    const printer = printerConfigs.find((entry) => entry.id === printerId);

    if (!printer) {
      printErrors.push(`Mapped printer not found (ID: ${printerId}). Check Settings → Config Printing`);
      continue;
    }

    if (!printer.enabled) {
      printErrors.push(`Printer "${printer.name}" is disabled. Enable it in Settings → Config Printing`);
      continue;
    }

    if (printer.ipAddress !== 'System-Driver' && !String(printer.ipAddress || '').trim()) {
      printErrors.push(`Printer "${printer.name}" has no IP address. Check Settings → Config Printing`);
      continue;
    }

    const ticketHTML = createKitchenTicketHTML(items, {
      tableNumber: options.tableNumber,
      orderNote: options.orderNote,
      kitchenBillSize,
      language,
    });

    try {
      if (printer.ipAddress !== 'System-Driver') {
        await printKitchenHtmlAsImage(ticketHTML, printer.ipAddress, kitchenBillSize);
      } else {
        await printWithSystemDriver(ticketHTML, printer.name, kitchenBillSize);
      }
    } catch (err: any) {
      printErrors.push(`Failed to print to "${printer.name}": ${err?.message || 'Print failed'}`);
    }
  }

  if (printErrors.length > 0) {
    throw new Error(printErrors.join(' | '));
  }
}

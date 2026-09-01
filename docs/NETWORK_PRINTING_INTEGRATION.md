# Network Printing Integration - Complete

## Overview
Successfully integrated direct IP network printing for kitchen tickets and cancel tickets. The system now uses ESC/POS protocol to send print jobs directly to network printers via IP address, bypassing browser print dialogs.

## Changes Made

### 1. Network Printing API Endpoint
**File**: `app/api/print-network/route.ts`
- Uses `escpos` and `escpos-network` libraries
- Connects to printers via IP address on port 9100 (standard for network printers)
- Parses plain text content and formats for ESC/POS printers
- Handles different text styles (bold, large, etc.)
- Returns success/error responses

### 2. POS Page Integration
**File**: `app/pos/page.tsx`

#### Kitchen Ticket Printing
- **Modified**: `printKitchenTickets()` function
  - Changed from HTML-based printing to network printing API
  - Now calls `/api/print-network` endpoint with printer IP
  - Passes plain text content instead of HTML
  - Shows error alerts if printing fails

- **Added**: `createKitchenTicketContent()` function
  - Generates plain text content for ESC/POS printers
  - Formats ticket with headers, items, notes, and footer
  - Uses simple text formatting (no HTML)
  - Includes table info, time, item details, portions, and order notes

#### Cancel Ticket Printing
- **Modified**: `printCancelTicket()` function
  - Changed from HTML-based printing to network printing API
  - Now calls `/api/print-network` endpoint with printer IP
  - Passes plain text content instead of HTML

- **Added**: `createCancelTicketContent()` function
  - Generates plain text content for cancel tickets
  - Clearly marks as "CANCEL ORDER"
  - Shows cancelled item details
  - Includes instruction to discard item

## How It Works

### Workflow
1. User clicks "Send to Kitchen" or cancels an item
2. System groups items by printer based on station mapping
3. For each printer:
   - Finds printer config with IP address
   - Creates plain text ticket content
   - Calls `/api/print-network` with printer IP and content
   - API connects to printer via IP:9100
   - Sends ESC/POS formatted commands
   - Printer prints ticket automatically

### Printer Configuration
Printers must be configured in Settings → Config Printing with:
- **Name**: Printer identifier
- **IP Address**: Network IP of the printer (e.g., 192.168.1.100)
- **Location**: Kitchen, Bar, etc.
- **Enabled**: Must be enabled to print
- **Default**: One printer should be marked as default

### Station Mapping
Configure in Settings → Station Mapping:
- Map categories/items to specific printers
- Items without mapping use default printer
- Each printer receives only its assigned items

## Benefits

1. **No Browser Dialogs**: Prints directly without user interaction
2. **Reliable**: Direct IP connection is more stable than browser printing
3. **Fast**: No need to open print windows or wait for user confirmation
4. **Multi-Printer**: Automatically routes items to correct kitchen stations
5. **Network-Based**: Works across network, not just locally

## Testing

To test the integration:
1. Configure printer IP addresses in Settings → Config Printing
2. Configure station mappings in Settings → Station Mapping
3. Add items to cart and click "Send to Kitchen"
4. Verify tickets print on correct printers
5. Cancel an item that was sent to kitchen
6. Verify cancel ticket prints

## Troubleshooting

### Printer Not Responding
- Check printer IP address is correct
- Verify printer is on same network
- Ensure port 9100 is open on printer
- Check printer is powered on and online

### Print Job Fails
- Error message will show printer name and IP
- Check network connectivity
- Verify printer supports ESC/POS protocol
- Check printer is not in error state (paper jam, out of paper, etc.)

### Items Not Printing to Correct Printer
- Verify station mappings are configured correctly
- Check printer is enabled in Config Printing
- Ensure category/item mapping matches

## Technical Details

### Libraries Used
- `escpos`: ESC/POS printer command library
- `escpos-network`: Network adapter for ESC/POS

### Port
- Standard network printer port: **9100**

### Protocol
- **ESC/POS**: Industry standard for receipt printers

### Content Format
Plain text with special characters:
- `═══` for borders
- `***` for emphasis
- Indentation for item details

## Future Enhancements

Possible improvements:
1. Add printer status checking before printing
2. Implement print queue for failed jobs
3. Add support for different paper widths (58mm, 80mm)
4. Support for QR codes on tickets
5. Printer health monitoring dashboard

## Notes

- Old HTML-based printing functions are kept as reference but not used
- `silentPrint` setting is no longer needed (all printing is now silent)
- Browser print dialogs are completely bypassed
- All printing happens server-side via API

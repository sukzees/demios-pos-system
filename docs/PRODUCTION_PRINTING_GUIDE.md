# Production Printing Guide - แก้ปัญหาการพิมพ์ใน Production

## ปัญหา
เมื่อ deploy ขึ้น production (cloud hosting เช่น Vercel, Netlify) จะไม่สามารถพิมพ์ไปยังเครื่องพิมพ์ใน local network ได้

**Error:** `Failed to print to Kitchen Printer: connect ETIMEDOUT 192.168.100.100:9100`

## สาเหตุ
- **Development**: Browser → localhost API → เครื่องพิมพ์ (192.168.x.x) ✅ ใช้งานได้
- **Production**: Browser → Cloud Server API → เครื่องพิมพ์ (192.168.x.x) ❌ ไม่สามารถเข้าถึง local network ได้

Cloud server ไม่สามารถเข้าถึง IP address ใน local network ของร้านค้าได้

## วิธีแก้ปัญหา

### วิธีที่ 1: Self-Hosting บน Local Network (แนะนำที่สุด)

Host application บน server ภายในร้านค้าแทนการใช้ cloud hosting

#### ข้อดี:
- ✅ เข้าถึงเครื่องพิมพ์ได้โดยตรง
- ✅ ไม่ต้องพึ่ง internet
- ✅ ความเร็วสูง
- ✅ ปลอดภัยกว่า (ข้อมูลไม่ออกนอก network)

#### วิธีทำ:

**Option A: ใช้ Docker (แนะนำ)**
```bash
# 1. สร้าง Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# 2. Build และ run
docker build -t pos-system .
docker run -d -p 3000:3000 --name pos-system pos-system

# 3. เข้าถึงผ่าน http://192.168.x.x:3000
```

**Option B: ใช้ PM2 (Node.js Process Manager)**
```bash
# 1. Install PM2
npm install -g pm2

# 2. Build application
npm run build

# 3. Start with PM2
pm2 start npm --name "pos-system" -- start

# 4. Auto-start on reboot
pm2 startup
pm2 save

# 5. เข้าถึงผ่าน http://192.168.x.x:3000
```

**Option C: ใช้ Windows Service**
```bash
# 1. Install node-windows
npm install -g node-windows

# 2. สร้าง service script (install-service.js)
var Service = require('node-windows').Service;
var svc = new Service({
  name: 'POS System',
  description: 'Restaurant POS System',
  script: 'C:\\path\\to\\your\\app\\server.js'
});
svc.on('install', function(){
  svc.start();
});
svc.install();

# 3. Run
node install-service.js
```

#### Hardware Requirements:
- **Minimum**: 
  - CPU: 2 cores
  - RAM: 2GB
  - Storage: 10GB
  - OS: Windows 10/11, Ubuntu 20.04+, or macOS

- **Recommended**:
  - CPU: 4 cores
  - RAM: 4GB
  - Storage: 20GB SSD
  - OS: Ubuntu Server 22.04 LTS

---

### วิธีที่ 2: Print Bridge Application

สร้าง application ตัวกลางที่รันบน local network เพื่อรับคำสั่งพิมพ์จาก cloud

#### Architecture:
```
Browser → Cloud Server → Print Bridge (Local) → Printer
```

#### วิธีทำ:

**1. สร้าง Print Bridge Server (Node.js)**

```javascript
// print-bridge.js
const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
const Network = require('escpos-network');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/print', async (req, res) => {
  try {
    const { printerIp, imageData, paperWidth } = req.body;
    
    // Connect to printer
    const device = new Network(printerIp, 9100);
    const printer = new escpos.Printer(device);
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
    
    // Print
    await new Promise((resolve, reject) => {
      device.open((error) => {
        if (error) return reject(error);
        
        escpos.Image.load(imageBuffer, (image) => {
          printer
            .align('ct')
            .image(image, 's8')
            .cut()
            .close(() => resolve());
        });
      });
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3001, '0.0.0.0', () => {
  console.log('Print Bridge running on port 3001');
});
```

**2. แก้ไข POS Application ให้ใช้ Print Bridge**

```typescript
// ใน app/pos/page.tsx
const PRINT_BRIDGE_URL = process.env.NEXT_PUBLIC_PRINT_BRIDGE_URL || 'http://192.168.100.50:3001';

const printHTMLAsImage = async (html: string, printerIp: string, paperWidth: string) => {
  // ... convert HTML to image ...
  
  // Send to print bridge instead of API route
  const response = await fetch(`${PRINT_BRIDGE_URL}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerIp: printerIp,
      imageData: imageData,
      paperWidth: paperWidth
    })
  });
  
  // ... handle response ...
};
```

**3. Run Print Bridge**
```bash
# On local machine
node print-bridge.js

# Or with PM2
pm2 start print-bridge.js --name "print-bridge"
```

#### ข้อดี:
- ✅ ใช้ cloud hosting ได้
- ✅ แยก print logic ออกมา

#### ข้อเสีย:
- ❌ ต้องมี machine รันอยู่ตลอดเวลา
- ❌ ซับซ้อนกว่า self-hosting
- ❌ ต้องพึ่ง internet

---

### วิธีที่ 3: Browser Extension / Desktop App

สร้าง browser extension หรือ desktop app ที่รันบน client เพื่อจัดการการพิมพ์

#### ข้อดี:
- ✅ ใช้ cloud hosting ได้
- ✅ ไม่ต้องมี server เพิ่ม

#### ข้อเสีย:
- ❌ ต้อง install extension/app ทุกเครื่อง
- ❌ ซับซ้อนในการพัฒนา

---

### วิธีที่ 4: VPN / Tunnel

ใช้ VPN หรือ tunnel service เพื่อให้ cloud server เข้าถึง local network

#### Services:
- Tailscale
- ZeroTier
- ngrok
- Cloudflare Tunnel

#### ข้อดี:
- ✅ ใช้ cloud hosting ได้
- ✅ ไม่ต้องแก้โค้ด

#### ข้อเสีย:
- ❌ มีค่าใช้จ่าย
- ❌ ความปลอดภัยต่ำกว่า
- ❌ พึ่ง internet

---

## คำแนะนำ

### สำหรับร้านอาหารขนาดเล็ก-กลาง:
→ **ใช้วิธีที่ 1: Self-Hosting บน Local Network**
- ซื้อ Mini PC หรือใช้ PC เก่า
- Install Ubuntu Server + Docker
- Deploy application ด้วย Docker
- ตั้ง static IP
- เข้าถึงผ่าน http://192.168.x.x:3000

### สำหรับร้านที่มีหลายสาขา:
→ **ใช้วิธีที่ 2: Print Bridge + Cloud Hosting**
- Deploy POS application บน cloud (Vercel)
- แต่ละสาขารัน Print Bridge บน local machine
- Configure PRINT_BRIDGE_URL ต่างกันแต่ละสาขา

### สำหรับ Development/Testing:
→ **ใช้ localhost**
- `npm run dev` บน local machine
- เข้าถึงผ่าน http://localhost:3000

---

## Environment Variables

```env
# .env.local (สำหรับ self-hosting)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# .env.production (สำหรับ cloud + print bridge)
NEXT_PUBLIC_PRINT_BRIDGE_URL=http://192.168.100.50:3001
```

---

## Troubleshooting

### ปัญหา: ไม่สามารถเข้าถึง application จากเครื่องอื่น
```bash
# ตรวจสอบ firewall
sudo ufw allow 3000

# หรือบน Windows
netsh advfirewall firewall add rule name="POS System" dir=in action=allow protocol=TCP localport=3000
```

### ปัญหา: Printer timeout
```bash
# ตรวจสอบว่า ping ถึงเครื่องพิมพ์ได้หรือไม่
ping 192.168.100.100

# ตรวจสอบ port 9100
telnet 192.168.100.100 9100
```

### ปัญหา: Application crash
```bash
# ดู logs
pm2 logs pos-system

# Restart
pm2 restart pos-system
```

---

## สรุป

| วิธี | ความยาก | ค่าใช้จ่าย | แนะนำ |
|------|---------|-----------|-------|
| Self-Hosting | ⭐⭐ | ต่ำ | ✅ แนะนำที่สุด |
| Print Bridge | ⭐⭐⭐ | กลาง | ⚠️ สำหรับหลายสาขา |
| Browser Extension | ⭐⭐⭐⭐ | กลาง | ❌ ซับซ้อน |
| VPN/Tunnel | ⭐⭐ | สูง | ❌ มีค่าใช้จ่าย |

**คำแนะนำสุดท้าย:** ใช้ Self-Hosting บน local network เพราะง่าย ปลอดภัย และไม่มีค่าใช้จ่ายเพิ่ม

# Build ด้วย pkg (ไม่ใช้ electron-builder)

## ปัญหา
electron-builder มีปัญหา symlinks บน Windows

## วิธีแก้: ใช้ pkg แทน

### 1. Install pkg:

```cmd
npm install -g pkg
```

### 2. สร้าง standalone server:

สร้างไฟล์ `server.js`:

```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    
    // Open browser
    const { exec } = require('child_process');
    exec(`start http://${hostname}:${port}`);
  });
});
```

### 3. Build:

```cmd
npm run build
pkg server.js --targets node18-win-x64 --output POS-System.exe
```

### 4. ไฟล์จะอยู่ที่:

```
POS-System.exe
```

---

## ข้อดี:
- ✅ ไม่มีปัญหา symlinks
- ✅ ไฟล์เดียว
- ✅ ไม่ต้อง install

## ข้อเสีย:
- ❌ ไม่มี Electron UI wrapper
- ❌ ต้องเปิด browser เอง
- ❌ ไม่มี system tray

---

## หรือใช้ Electron แบบง่าย:

### ไม่ต้อง build - ใช้ electron โดยตรง:

1. Copy folder ทั้งหมดไปเครื่องอื่น
2. Install dependencies: `npm install`
3. Run: `npm run electron`

เสร็จแล้ว! 🎉

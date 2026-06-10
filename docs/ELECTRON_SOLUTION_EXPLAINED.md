# Electron Build Solution - คำอธิบาย

## ปัญหาที่พบ

เมื่อ build เป็น .exe file แล้วเปิดใช้งาน จะเจอหน้าจอขาว (white screen) เพราะ:

1. ❌ ใช้ `output: 'export'` (Static Export) แต่มี API routes
2. ❌ Static Export ไม่รองรับ API routes
3. ❌ API routes จำเป็นต้องมี Node.js server

## วิธีแก้ที่ถูกต้อง

ใช้ **Standalone Server** แทน Static Export:

### 1. เปลี่ยน next.config.ts

```typescript
// ❌ ผิด - Static Export
output: 'export'

// ✅ ถูก - Standalone Server
output: 'standalone'
```

### 2. แก้ไข electron/main.js

**สิ่งที่เปลี่ยน:**

```javascript
// ✅ เพิ่ม: Start Next.js standalone server
function startNextServer() {
  // Spawn node process to run server.js
  nextServer = spawn('node', [serverPath], {
    env: { 
      NODE_ENV: 'production',
      PORT: '3000',
      HOSTNAME: 'localhost'
    },
    cwd: appDir
  });
}

// ✅ เพิ่ม: Load from localhost
mainWindow.loadURL('http://localhost:3000');

// ✅ เพิ่ม: Kill server on quit
app.on('quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});
```

### 3. แก้ไข electron-builder.yml

```yaml
# ✅ Package standalone server
extraResources:
  - from: .next/standalone
    to: app                    # → resources/app/
  - from: .next/static
    to: app/.next/static       # → resources/app/.next/static/
  - from: public
    to: app/public             # → resources/app/public/
```

## การทำงาน

### Development Mode (npm run electron-dev)

```
1. npm run dev → Start Next.js dev server (localhost:3000)
2. electron . → Start Electron
3. Load http://localhost:3000
```

### Production Mode (.exe file)

```
1. User double-clicks POS System.exe
2. Electron starts
3. electron/main.js runs
4. Spawn node process: node resources/app/server.js
5. Next.js server starts at localhost:3000
6. Electron window loads http://localhost:3000
7. Application ready!
```

## โครงสร้างไฟล์ใน .exe

```
POS System.exe
├── electron/
│   └── main.js                    ← Electron entry point
├── resources/
│   └── app/                       ← Next.js standalone
│       ├── server.js              ← Next.js server
│       ├── .next/
│       │   └── static/            ← Static files
│       ├── public/                ← Public assets
│       └── node_modules/          ← Dependencies
└── node.exe                       ← Built-in Node.js
```

## ข้อดี

✅ **API Routes ทำงานได้:** มี Node.js server รันอยู่

✅ **Database ทำงานได้:** Supabase client เชื่อมต่อปกติ

✅ **Printing ทำงานได้:** escpos modules ทำงานปกติ

✅ **ไม่ต้องติดตั้ง Node.js:** มี Node.js built-in

✅ **Portable:** Copy folder ไปใช้ที่ไหนก็ได้

✅ **Fast:** Server รันใน local machine

## ข้อเสีย

❌ **ขนาดใหญ่:** ~200-300 MB (เพราะมี Node.js + dependencies)

❌ **Memory Usage:** ~200-400 MB RAM

❌ **Startup Time:** ครั้งแรกใช้เวลา 10-20 วินาที

## เปรียบเทียบ

| Feature | Static Export | Standalone Server |
|---------|--------------|-------------------|
| API Routes | ❌ ไม่ได้ | ✅ ได้ |
| Database | ⚠️ Client-side only | ✅ Full support |
| File Size | 🟢 เล็ก (~50 MB) | 🟡 ใหญ่ (~250 MB) |
| Startup | 🟢 เร็ว (1-2s) | 🟡 ช้า (10-20s) |
| Memory | 🟢 น้อย (~100 MB) | 🟡 มาก (~300 MB) |
| Complexity | 🟢 ง่าย | 🟡 ซับซ้อน |

## ทำไมไม่ใช้ Static Export?

Static Export (`output: 'export'`) จะ generate HTML/CSS/JS files เท่านั้น:

```
out/
├── index.html
├── _next/
│   └── static/
└── ...
```

**ปัญหา:**
- ❌ ไม่มี server
- ❌ API routes ไม่ทำงาน (`/api/*`)
- ❌ Server-side code ไม่ทำงาน
- ❌ ต้องเขียน API ใหม่ทั้งหมด

**ใช้ได้เมื่อ:**
- ไม่มี API routes
- ไม่มี server-side logic
- เป็น static website ล้วนๆ

## ทำไมใช้ Standalone Server?

Standalone Server (`output: 'standalone'`) จะ generate:

```
.next/standalone/
├── server.js              ← Next.js server
├── node_modules/          ← Dependencies (minimal)
└── ...
```

**ข้อดี:**
- ✅ มี server
- ✅ API routes ทำงาน
- ✅ Server-side code ทำงาน
- ✅ ไม่ต้องแก้ code

**ใช้เมื่อ:**
- มี API routes
- มี server-side logic
- ต้องการ full Next.js features

## Build Process

### 1. npm run build

```bash
# Next.js build
next build

# Output:
.next/
├── standalone/           ← Server files
│   ├── server.js
│   └── node_modules/
└── static/              ← Static assets
    └── ...
```

### 2. npm run electron-build-simple

```bash
# Electron Builder
electron-builder --dir

# Copy files:
.next/standalone/  → resources/app/
.next/static/      → resources/app/.next/static/
public/            → resources/app/public/

# Output:
dist/win-unpacked/
└── POS System.exe
```

## Environment Variables

Environment variables จะถูก embed ใน build time:

```env
# .env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

**หมายเหตุ:**
- ✅ `NEXT_PUBLIC_*` จะถูก embed
- ❌ ตัวแปรอื่นๆ ต้อง set ใน Electron

## Debugging

### เปิด DevTools

```javascript
// In development
if (isDev) {
  mainWindow.webContents.openDevTools();
}

// Or press F12
```

### ดู Logs

```javascript
// In electron/main.js
console.log('[Electron] ...');

// In Next.js
console.log('[Next.js] ...');
```

### ตรวจสอบ Server

```javascript
// Check if server is running
http.get('http://localhost:3000', (res) => {
  console.log('Server is ready!');
});
```

## Troubleshooting

### Server ไม่เริ่ม

**ตรวจสอบ:**
1. มี `server.js` ใน `resources/app/`?
2. มี `node_modules/` ใน `resources/app/`?
3. มี `.next/static/` ใน `resources/app/`?

**แก้ไข:**
```cmd
npm run clean
npm run build
npm run electron-build-simple
```

### Port ถูกใช้งาน

**ปัญหา:** Port 3000 ถูกใช้งานแล้ว

**แก้ไข:**
```javascript
// In electron/main.js
const PORT = 3001; // เปลี่ยน port
```

### Memory Leak

**ปัญหา:** Memory ใช้มากเกินไป

**แก้ไข:**
```javascript
// Kill server properly
app.on('quit', () => {
  if (nextServer) {
    nextServer.kill('SIGTERM');
  }
});
```

## Best Practices

### 1. Error Handling

```javascript
nextServer.on('error', (error) => {
  console.error('[Electron] Server error:', error);
  // Show error dialog
});
```

### 2. Graceful Shutdown

```javascript
app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});
```

### 3. Loading State

```javascript
// Show loading page while server starts
mainWindow.loadURL('data:text/html,...');

// Then load actual app
setTimeout(() => {
  mainWindow.loadURL('http://localhost:3000');
}, 5000);
```

## สรุป

✅ **ใช้ Standalone Server** แทน Static Export

✅ **Spawn Node.js process** เพื่อรัน Next.js server

✅ **Load from localhost:3000** ใน Electron window

✅ **Kill server** เมื่อปิดโปรแกรม

✅ **Package ทุกอย่าง** ใน resources/app/

---

## คำสั่งสำคัญ

```cmd
# Build
npm run build && npm run electron-build-simple

# Test
dist\win-unpacked\POS System.exe

# Clean
npm run clean

# Dev
npm run electron-dev
```

---

**เอกสารนี้อธิบายว่าทำไมต้องใช้ Standalone Server และทำงานอย่างไร**

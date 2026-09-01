# Auto Update System & EXE Installer Guide

## ภาพรวม

เอกสารนี้อธิบายวิธีสร้าง:
1. ระบบ Auto Update ในหน้า Settings
2. แพ็คเกจเป็น .exe file สำหรับ Windows

---

## ส่วนที่ 1: ระบบ Auto Update

### Architecture

```
Settings Page → Check for Updates → Download → Extract → Restart
```

### วิธีทำ

#### 1.1 สร้าง API Route สำหรับตรวจสอบ Version

```typescript
// app/api/version/route.ts
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    );
    
    return NextResponse.json({
      version: packageJson.version,
      name: packageJson.name,
      updateAvailable: false, // จะเช็คจาก GitHub releases
      downloadUrl: null
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get version' },
      { status: 500 }
    );
  }
}
```

#### 1.2 สร้าง API Route สำหรับ Update

```typescript
// app/api/update/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Pull latest code from git
    await execAsync('git pull origin main');
    
    // Install dependencies
    await execAsync('npm install');
    
    // Build
    await execAsync('npm run build');
    
    // Restart PM2 (if using PM2)
    try {
      await execAsync('pm2 restart pos-system');
    } catch (e) {
      console.log('PM2 not found, skipping restart');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Update completed successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

#### 1.3 เพิ่ม Update Section ในหน้า Settings

```typescript
// เพิ่มใน app/settings/page.tsx

const [updateStatus, setUpdateStatus] = useState<{
  checking: boolean;
  updating: boolean;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  error: string | null;
}>({
  checking: false,
  updating: false,
  currentVersion: '',
  latestVersion: '',
  updateAvailable: false,
  error: null
});

const checkForUpdates = async () => {
  setUpdateStatus(prev => ({ ...prev, checking: true, error: null }));
  
  try {
    const response = await fetch('/api/version');
    const data = await response.json();
    
    setUpdateStatus(prev => ({
      ...prev,
      checking: false,
      currentVersion: data.version,
      latestVersion: data.latestVersion || data.version,
      updateAvailable: data.updateAvailable
    }));
  } catch (error) {
    setUpdateStatus(prev => ({
      ...prev,
      checking: false,
      error: 'Failed to check for updates'
    }));
  }
};

const performUpdate = async () => {
  if (!confirm('This will update the application and restart it. Continue?')) {
    return;
  }
  
  setUpdateStatus(prev => ({ ...prev, updating: true, error: null }));
  
  try {
    const response = await fetch('/api/update', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      alert('Update completed! The application will restart now.');
      window.location.reload();
    } else {
      throw new Error(data.error);
    }
  } catch (error: any) {
    setUpdateStatus(prev => ({
      ...prev,
      updating: false,
      error: error.message
    }));
  }
};

// ใน JSX เพิ่ม Tab ใหม่
<TabsTrigger value="update">System Update</TabsTrigger>

<TabsContent value="update">
  <Card>
    <CardHeader>
      <CardTitle>System Update</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label>Current Version</Label>
        <Input value={updateStatus.currentVersion} disabled />
      </div>
      
      {updateStatus.updateAvailable && (
        <div className="space-y-2">
          <Label>Latest Version</Label>
          <Input value={updateStatus.latestVersion} disabled />
        </div>
      )}
      
      <div className="flex gap-2">
        <Button
          onClick={checkForUpdates}
          disabled={updateStatus.checking}
        >
          {updateStatus.checking ? 'Checking...' : 'Check for Updates'}
        </Button>
        
        {updateStatus.updateAvailable && (
          <Button
            onClick={performUpdate}
            disabled={updateStatus.updating}
            variant="default"
          >
            {updateStatus.updating ? 'Updating...' : 'Update Now'}
          </Button>
        )}
      </div>
      
      {updateStatus.error && (
        <div className="text-red-500 text-sm">{updateStatus.error}</div>
      )}
      
      {updateStatus.updateAvailable && (
        <div className="text-green-600 text-sm">
          New update available! Click "Update Now" to install.
        </div>
      )}
      
      {!updateStatus.updateAvailable && updateStatus.currentVersion && (
        <div className="text-gray-600 text-sm">
          You are running the latest version.
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>
```

---

## ส่วนที่ 2: สร้าง .exe Installer

### วิธีที่ 1: ใช้ Electron (แนะนำ)

Electron จะแพ็คเกจ Next.js app เป็น desktop application

#### 2.1 Install Dependencies

```bash
npm install --save-dev electron electron-builder electron-is-dev
npm install --save-dev concurrently wait-on cross-env
```

#### 2.2 สร้าง Electron Main Process

```javascript
// electron/main.js
const { app, BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/icons/icon-512x512.png')
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

#### 2.3 แก้ไข package.json

```json
{
  "name": "pos-system",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "export": "next export",
    "electron": "electron .",
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
    "electron-build": "npm run build && npm run export && electron-builder",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  },
  "build": {
    "appId": "com.yourcompany.pos",
    "productName": "POS System",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron/**/*",
      "out/**/*",
      "public/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": ["nsis"],
      "icon": "public/icons/icon-512x512.png"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

#### 2.4 แก้ไข next.config.ts สำหรับ Static Export

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Enable static export
  images: {
    unoptimized: true, // Required for static export
  },
  // ... rest of config
};

export default nextConfig;
```

#### 2.5 Build .exe

```bash
# Development mode
npm run electron-dev

# Build .exe installer
npm run electron-build
```

ไฟล์ .exe จะอยู่ใน `dist/` folder

---

### วิธีที่ 2: ใช้ pkg (Node.js Standalone)

pkg จะแพ็คเกจ Node.js app เป็น executable

#### 2.6 Install pkg

```bash
npm install -g pkg
```

#### 2.7 สร้าง Server Script

```javascript
// server.js
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
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

#### 2.8 Build with pkg

```bash
# Build
npm run build

# Package
pkg server.js --targets node18-win-x64 --output pos-system.exe
```

---

### วิธีที่ 3: ใช้ NSIS (Installer Only)

สร้าง installer script ด้วย NSIS

#### 2.9 Install NSIS

Download จาก: https://nsis.sourceforge.io/

#### 2.10 สร้าง Installer Script

```nsis
; installer.nsi
!define APP_NAME "POS System"
!define COMP_NAME "Your Company"
!define VERSION "1.0.0"
!define INSTALL_DIR "$PROGRAMFILES\${APP_NAME}"

Name "${APP_NAME}"
OutFile "POS-System-Setup.exe"
InstallDir "${INSTALL_DIR}"

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy files
  File /r "build\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\pos-system.exe"
  CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\pos-system.exe"
  
  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\*.*"
  RMDir /r "$INSTDIR"
  Delete "$SMPROGRAMS\${APP_NAME}\*.*"
  RMDir "$SMPROGRAMS\${APP_NAME}"
  Delete "$DESKTOP\${APP_NAME}.lnk"
SectionEnd
```

#### 2.11 Build Installer

```bash
makensis installer.nsi
```

---

## สรุปการเลือกใช้

| วิธี | ข้อดี | ข้อเสีย | แนะนำ |
|------|-------|---------|-------|
| **Electron** | - UI สวย<br>- Auto-update ง่าย<br>- Cross-platform | - ขนาดใหญ่ (150MB+)<br>- ใช้ RAM มาก | ✅ แนะนำที่สุด |
| **pkg** | - ขนาดเล็กกว่า<br>- รวดเร็ว | - ไม่มี UI wrapper<br>- ต้องเปิด browser เอง | ⚠️ สำหรับ advanced users |
| **NSIS** | - Installer เท่านั้น<br>- ขนาดเล็ก | - ต้องใช้กับ pkg/electron | ⚠️ ใช้ร่วมกับวิธีอื่น |

---

## คำแนะนำสุดท้าย

### สำหรับร้านอาหาร:
→ **ใช้ Electron + Auto Update**
- Build เป็น .exe ด้วย electron-builder
- เพิ่มระบบ auto-update ในหน้า Settings
- Deploy update ผ่าน GitHub Releases

### ขั้นตอนการ Deploy Update:
1. แก้ไขโค้ด
2. เพิ่ม version ใน package.json
3. Build: `npm run electron-build`
4. Upload .exe ไปที่ GitHub Releases
5. ผู้ใช้กดปุ่ม "Check for Updates" ในหน้า Settings
6. ระบบจะดาวน์โหลดและติดตั้งอัตโนมัติ

---

## ไฟล์ที่ต้องสร้าง

```
project/
├── electron/
│   └── main.js                    # Electron main process
├── app/
│   └── api/
│       ├── version/
│       │   └── route.ts          # Check version API
│       └── update/
│           └── route.ts          # Update API
├── installer.nsi                  # NSIS installer script (optional)
├── server.js                      # Standalone server (for pkg)
└── package.json                   # Updated with electron scripts
```

---

## Resources

- Electron: https://www.electronjs.org/
- electron-builder: https://www.electron.build/
- pkg: https://github.com/vercel/pkg
- NSIS: https://nsis.sourceforge.io/

# คำแนะนำการ Build และติดตั้ง POS System

## ขั้นตอนการ Build .exe Installer

### 1. เตรียมความพร้อม

```bash
# Install dependencies
npm install

# หรือถ้าใช้ yarn
yarn install
```

### 2. Build Application

```bash
# Build Next.js application
npm run build

# Build Electron .exe installer
npm run electron-build
```

ไฟล์ installer จะอยู่ที่: `dist/POS System Setup 1.0.0.exe`

### 3. ทดสอบใน Development Mode

```bash
# รัน Electron + Next.js พร้อมกัน
npm run electron-dev
```

---

## ขั้นตอนการติดตั้งบนเครื่องลูกค้า

### Windows

1. ดับเบิลคลิก `POS System Setup 1.0.0.exe`
2. เลือกโฟลเดอร์ที่ต้องการติดตั้ง (default: `C:\Program Files\POS System`)
3. คลิก "Install"
4. รอจนติดตั้งเสร็จ
5. เปิดโปรแกรมจาก Desktop shortcut หรือ Start Menu

### การตั้งค่าครั้งแรก

1. เปิดโปรแกรม POS System
2. ไปที่ Settings → License Key
3. ใส่ License Key และกด Activate
4. ตั้งค่า Supabase connection (ถ้าใช้)
5. ตั้งค่าเครื่องพิมพ์ใน Settings → Config Printing
6. เริ่มใช้งาน!

---

## ระบบ Auto Update

### สำหรับผู้ใช้

1. เปิดโปรแกรม POS System
2. ไปที่ Settings → System Update
3. คลิก "Check for Updates"
4. ถ้ามี update ให้คลิก "Update Now"
5. รอจนอัปเดตเสร็จและโปรแกรมจะ restart อัตโนมัติ

### สำหรับ Developer

#### วิธีที่ 1: Git Pull (สำหรับ Self-Hosting)

1. แก้ไขโค้ด
2. Commit และ push ไป GitHub
   ```bash
   git add .
   git commit -m "Update: description"
   git push origin main
   ```
3. ผู้ใช้กด "Check for Updates" ในหน้า Settings
4. ระบบจะ pull code ล่าสุดและ build อัตโนมัติ

#### วิธีที่ 2: GitHub Releases (สำหรับ Electron)

1. แก้ไขโค้ด
2. เพิ่ม version ใน `package.json`
   ```json
   {
     "version": "1.1.0"
   }
   ```
3. Build .exe ใหม่
   ```bash
   npm run electron-build
   ```
4. สร้าง GitHub Release
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
5. Upload `dist/POS System Setup 1.1.0.exe` ไปที่ GitHub Releases
6. ผู้ใช้กด "Check for Updates" จะดาวน์โหลดและติดตั้งอัตโนมัติ

---

## โครงสร้างโปรเจค

```
pos-system/
├── app/                          # Next.js app directory
│   ├── api/
│   │   ├── update/              # Auto update API
│   │   └── version/             # Version check API
│   ├── pos/                     # POS page
│   ├── settings/                # Settings page
│   └── ...
├── electron/
│   └── main.js                  # Electron main process
├── public/
│   └── icons/                   # App icons
├── dist/                        # Build output (gitignored)
│   └── POS System Setup.exe    # Installer
├── package.json                 # Dependencies & build config
└── BUILD_INSTRUCTIONS.md        # This file
```

---

## Troubleshooting

### ปัญหา: Build ไม่สำเร็จ

```bash
# ลบ node_modules และ install ใหม่
rm -rf node_modules
npm install

# ลบ .next และ build ใหม่
rm -rf .next
npm run build
```

### ปัญหา: Electron ไม่เปิด

```bash
# ตรวจสอบ logs
npm run electron-dev

# ดู console errors
```

### ปัญหา: Auto update ไม่ทำงาน

1. ตรวจสอบว่ามี Git repository หรือไม่
2. ตรวจสอบว่า PM2 ติดตั้งแล้วหรือยัง (สำหรับ self-hosting)
3. ตรวจสอบ permissions ของโฟลเดอร์

### ปัญหา: ไม่สามารถพิมพ์ได้

1. ตรวจสอบว่าเครื่องพิมพ์เปิดอยู่
2. ตรวจสอบ IP address ของเครื่องพิมพ์
3. Ping เครื่องพิมพ์: `ping 192.168.100.100`
4. ตรวจสอบ port 9100: `telnet 192.168.100.100 9100`

---

## System Requirements

### สำหรับการ Build

- Node.js 18 หรือสูงกว่า
- npm 9 หรือสูงกว่า
- Windows 10/11 (สำหรับ build .exe)
- RAM: 4GB ขึ้นไป
- Storage: 2GB ว่าง

### สำหรับการใช้งาน

- Windows 10/11
- RAM: 2GB ขึ้นไป
- Storage: 500MB ว่าง
- Network: เชื่อมต่อ LAN (สำหรับเครื่องพิมพ์)

---

## การอัปเดต Dependencies

```bash
# ตรวจสอบ outdated packages
npm outdated

# อัปเดตทั้งหมด
npm update

# อัปเดตเฉพาะ package
npm install package-name@latest
```

---

## การสร้าง Installer สำหรับ Platform อื่น

### macOS

```bash
npm run electron-build -- --mac
```

ไฟล์จะอยู่ที่: `dist/POS System-1.0.0.dmg`

### Linux

```bash
npm run electron-build -- --linux
```

ไฟล์จะอยู่ที่: `dist/POS System-1.0.0.AppImage`

---

## Support

หากมีปัญหาหรือข้อสงสัย:
1. ดู docs/ folder สำหรับเอกสารเพิ่มเติม
2. ตรวจสอบ GitHub Issues
3. ติดต่อทีมพัฒนา

---

## License

Copyright © 2024 Your Company. All rights reserved.

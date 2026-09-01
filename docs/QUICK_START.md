# Quick Start Guide - POS System

## 🚀 สำหรับ Developer

### Build .exe Installer

```bash
# 1. Install dependencies
npm install

# 2. Build .exe
npm run electron-build
```

ไฟล์ installer: `dist/POS System Setup 1.0.0.exe`

### Test ใน Development

```bash
npm run electron-dev
```

---

## 👥 สำหรับผู้ใช้

### ติดตั้งโปรแกรม

1. ดับเบิลคลิก `POS System Setup.exe`
2. เลือกโฟลเดอร์ติดตั้ง
3. คลิก Install
4. เปิดโปรแกรมจาก Desktop

### อัปเดตโปรแกรม

1. เปิด POS System
2. Settings → System Update
3. คลิก "Check for Updates"
4. คลิก "Update Now" (ถ้ามี update)

---

## 📦 ไฟล์ที่สร้างขึ้น

```
✅ app/api/update/route.ts       - Auto update API
✅ app/api/version/route.ts      - Version check API
✅ electron/main.js              - Electron main process
✅ package.json                  - Updated with Electron scripts
✅ BUILD_INSTRUCTIONS.md         - คำแนะนำโดยละเอียด
✅ docs/AUTO_UPDATE_SYSTEM.md    - เอกสารระบบ Auto Update
```

---

## 🔧 คำสั่งที่ใช้บ่อย

```bash
# Development
npm run dev                 # Next.js dev server
npm run electron-dev        # Electron + Next.js

# Build
npm run build              # Build Next.js
npm run electron-build     # Build .exe installer

# Production
npm start                  # Start production server
```

---

## 📚 เอกสารเพิ่มเติม

- `BUILD_INSTRUCTIONS.md` - คำแนะนำการ build และติดตั้ง
- `docs/AUTO_UPDATE_SYSTEM.md` - ระบบ Auto Update
- `docs/PRODUCTION_PRINTING_GUIDE.md` - การพิมพ์ใน Production

---

## ⚡ Next Steps

1. **เพิ่ม Update Tab ในหน้า Settings**
   - ดูตัวอย่างใน `docs/AUTO_UPDATE_SYSTEM.md`
   - เพิ่ม UI สำหรับ Check/Update

2. **Test Build .exe**
   ```bash
   npm run electron-build
   ```

3. **Deploy Update**
   - Push code ไป GitHub
   - สร้าง Release
   - Upload .exe file

---

## 🎯 สรุป

### สำหรับ Self-Hosting (แนะนำ)
- ติดตั้งบน PC ในร้าน
- Auto update ผ่าน Git pull
- พิมพ์ได้โดยตรง

### สำหรับ Desktop App
- Build เป็น .exe
- ติดตั้งบนทุกเครื่อง
- Auto update ผ่าน GitHub Releases

**แนะนำ:** ใช้ Self-Hosting เพราะง่ายและพิมพ์ได้โดยตรง!

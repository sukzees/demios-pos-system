# Build Portable Version (ไม่ต้องใช้ Installer)

## ปัญหา
Windows symlink permission ทำให้ build installer ไม่ได้

## วิธีแก้: Build แบบ Portable

### 1. แก้ไข package.json เพิ่ม script:

```json
"electron-portable": "npm run build && electron-builder --win portable"
```

### 2. รันคำสั่ง:

```cmd
npm run electron-portable
```

### 3. ไฟล์จะอยู่ที่:

```
dist/POS System-1.0.0-portable.exe
```

---

## หรือใช้ --dir (ไม่ต้อง pack)

```cmd
npm run build
npm run electron-pack
```

ไฟล์จะอยู่ใน `dist/win-unpacked/`

---

## วิธีใช้งาน:

1. Copy folder `dist/win-unpacked/` ไปที่เครื่องที่ต้องการใช้
2. Run `POS System.exe`
3. ไม่ต้องติดตั้ง!

---

## ข้อดี:
- ✅ ไม่ต้องใช้ Admin rights
- ✅ ไม่มีปัญหา symlinks
- ✅ Copy ไปใช้ได้เลย
- ✅ ไม่ต้อง install/uninstall

## ข้อเสีย:
- ❌ ไม่มี Start Menu shortcut
- ❌ ไม่มี Desktop shortcut
- ❌ ต้อง copy folder ทั้งหมด

---

## สร้าง Shortcut เอง:

1. คลิกขวาที่ `POS System.exe`
2. เลือก "Create shortcut"
3. ลาก shortcut ไปที่ Desktop

เสร็จแล้ว! 🎉

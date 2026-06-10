# 🚀 วิธี Build POS System เป็น .exe

## ⚡ คำสั่งเดียวจบ

```cmd
cd d:\Projects\POS\supabase-pos-system
npm run build && npx electron-builder --dir
```

## 📍 ไฟล์ที่ได้

```
electron-dist\win-unpacked\POS System.exe
```

## 🎯 วิธีใช้

1. Double-click `POS System.exe`
2. รอ 10-20 วินาที
3. เริ่มใช้งาน!

## ✅ ทดสอบแล้ว

- ✅ เปิดโปรแกรมได้
- ✅ API ทำงานได้ (ทั้ง 16 endpoints)
- ✅ Database เชื่อมต่อได้
- ✅ License verification ทำงานได้
- ✅ Printing ทำงานได้ (Kitchen + Receipt)
- ✅ Kitchen ticket พิมพ์ได้ (แก้ไข JSON error แล้ว)
- ✅ ทุกฟีเจอร์ทำงานปกติ

## 📦 แจกจ่าย

Zip folder `electron-dist\win-unpacked` แล้วแจกจ่ายได้เลย

## 🔧 API Endpoints

**License:**
- `/api/verify` - ตรวจสอบ license (local)
- `/api/activate` - Activate license (external + local)
- `/api/license/sync` - Sync license data
- `/api/license/current` - ดึง license ปัจจุบัน
- `/api/license/seed` - Seed license data

**Printing:**
- `/api/print` - Print receipt
- `/api/print-network` - Print to network printer (image)
- `/api/print-text` - Print to network printer (text)
- `/api/printers/list` - List available printers

**Management:**
- `/api/licenses` - Manage licenses
- `/api/licenses/[id]` - Get/Update/Delete license
- `/api/shifts/list` - List shifts
- `/api/shifts/[id]` - Get/Update/Delete shift
- `/api/activate/return` - Return license

## 📚 เอกสารเพิ่มเติม

- `KITCHEN_PRINT_FIXED.md` - แก้ไขปัญหาการพิมพ์ครัว
- `API_ROUTES_FIXED.md` - รายละเอียด API routes
- `BUILD_SUCCESS.md` - รายละเอียดการ build
- `วิธี_BUILD_EXE.md` - คู่มือแบบละเอียด
- `BUILD_QUICK_START.md` - คู่มือแบบเร็ว

---

**สถานะ:** ✅ พร้อมใช้งาน (API ทำงานได้แล้ว!)

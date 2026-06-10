# ✅ แก้ไข API Routes สำเร็จ!

## 🎉 สถานะ: API ทำงานได้แล้ว

API routes ถูกสร้างขึ้นมาใหม่และทำงานได้ปกติใน Electron app

---

## 📋 API Routes ที่สร้าง

### 1. `/api/verify` (POST)
**ไฟล์:** `app/api/verify/route.ts`

**ฟังก์ชัน:** ตรวจสอบ license key จาก local database

**Request:**
```json
{
  "license_key": "xxx-xxx-xxx"
}
```

**Response (Success):**
```json
{
  "valid": true,
  "license_key": "xxx-xxx-xxx",
  "expires_at": "2026-12-31",
  "renew_date": "2026-11-30",
  "status": "active"
}
```

**Response (Not Found):**
```json
{
  "valid": false,
  "error": "License key not found",
  "message": "No active license was returned..."
}
```

---

### 2. `/api/activate` (POST)
**ไฟล์:** `app/api/activate/route.ts`

**ฟังก์ชัน:** Activate license key โดยเชื่อมต่อกับ external API และบันทึกลง local database

**Request:**
```json
{
  "license_key": "xxx-xxx-xxx"
}
```

**Response (Success):**
```json
{
  "valid": true,
  "license_key": "xxx-xxx-xxx",
  "expires_at": "2026-12-31",
  "renew_date": "2026-11-30",
  "message": "License activated successfully"
}
```

---

### 3. `/api/license/sync` (POST)
**ไฟล์:** `app/api/license/sync/route.ts`

**ฟังก์ชัน:** Sync license data จาก external API

**Request:**
```json
{
  "license_key": "xxx-xxx-xxx"
}
```

**Response (Success):**
```json
{
  "success": true,
  "valid": true,
  "license_key": "xxx-xxx-xxx",
  "expires_at": "2026-12-31",
  "renew_date": "2026-11-30",
  "message": "License synced successfully"
}
```

---

### 4. `/api/license/current` (GET)
**ไฟล์:** `app/api/license/current/route.ts`

**ฟังก์ชัน:** ดึง license key ปัจจุบันจาก database

**Response (Success):**
```json
{
  "license_key": "xxx-xxx-xxx",
  "expires_at": "2026-12-31",
  "renew_date": "2026-11-30",
  "status": "active"
}
```

---

## 🔧 การแก้ไขที่ทำ

### ปัญหา
- API routes ไม่มีในโปรเจค
- Next.js ทำ static export ซึ่งไม่รวม API routes
- เมื่อเปิด .exe แล้ว API ไม่ทำงาน

### วิธีแก้
1. สร้าง API routes ใหม่ทั้งหมด
2. ใช้ `output: 'standalone'` ใน next.config.ts
3. ปิด PWA ในโหมด Electron (`ELECTRON_BUILD=true`)
4. Build ใหม่ด้วย `npm run build`
5. Package ด้วย `npx electron-builder --dir`

---

## 📦 ไฟล์ที่สร้าง

```
app/api/
├── verify/
│   └── route.ts          ← ตรวจสอบ license
├── activate/
│   └── route.ts          ← Activate license
└── license/
    ├── sync/
    │   └── route.ts      ← Sync license data
    └── current/
        └── route.ts      ← ดึง license ปัจจุบัน
```

---

## ✅ การทดสอบ

### ทดสอบ API ใน Development

```cmd
npm run dev
```

แล้วเปิด browser ไปที่:
- http://localhost:3000/api/verify
- http://localhost:3000/api/activate
- http://localhost:3000/api/license/sync
- http://localhost:3000/api/license/current

### ทดสอบ API ใน Production (.exe)

1. Build:
   ```cmd
   npm run build
   npx electron-builder --dir
   ```

2. เปิด:
   ```cmd
   electron-dist\win-unpacked\POS System.exe
   ```

3. ทดสอบ:
   ```powershell
   curl http://localhost:3000/api/verify -Method POST -ContentType "application/json" -Body '{"license_key":"test"}'
   ```

---

## 🐛 Error ที่อาจพบ

### 1. `ENOTFOUND verify-license.demios.app`

**สาเหตุ:** ไม่สามารถเชื่อมต่อ external license API

**วิธีแก้:**
- ตรวจสอบ internet connection
- ตรวจสอบว่า domain `verify-license.demios.app` มีจริง
- ถ้าไม่มี internet ให้ใช้ `/api/verify` แทน (ตรวจสอบจาก local database)

### 2. `404 Not Found`

**สาเหตุ:** License key ไม่มีใน database

**วิธีแก้:**
- ใช้ `/api/activate` เพื่อ activate license ก่อน
- หรือเพิ่ม license key ใน database ด้วยตนเอง

### 3. `500 Internal Server Error`

**สาเหตุ:** Database connection error

**วิธีแก้:**
- ตรวจสอบ `.env` file
- ตรวจสอบ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ตรวจสอบว่า Supabase database มี table `license_keys`

---

## 📊 Database Schema

Table: `license_keys`

```sql
CREATE TABLE license_keys (
  id SERIAL PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  renew_date TIMESTAMP,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 วิธี Build

### คำสั่งเดียวจบ

```cmd
npm run build && npx electron-builder --dir
```

### ไฟล์ที่ได้

```
electron-dist\win-unpacked\POS System.exe
```

---

## ✅ Checklist

- [x] สร้าง API routes
- [x] ตั้งค่า `output: 'standalone'`
- [x] ปิด PWA ในโหมด Electron
- [x] Build Next.js สำเร็จ
- [x] Build Electron สำเร็จ
- [x] ทดสอบ API ทำงานได้
- [x] ทดสอบเปิดโปรแกรมได้
- [x] API routes ทำงานใน .exe

---

## 📝 หมายเหตุ

1. **API routes ทำงานได้** เพราะใช้ standalone server
2. **External API อาจไม่ทำงาน** ถ้าไม่มี internet
3. **Local verification ทำงานได้** ผ่าน `/api/verify`
4. **License activation ต้องมี internet** เพื่อเชื่อมต่อ external API

---

**วันที่:** 14 พฤษภาคม 2026

**สถานะ:** ✅ เสร็จสมบูรณ์

**ทดสอบแล้ว:** ✅ ผ่าน

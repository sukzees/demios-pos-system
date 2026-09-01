# Electron Build Guide - POS System

## วิธีการ Build เป็น .exe File

### ขั้นตอนที่ 1: เตรียมความพร้อม

1. **เปิด Command Prompt แบบ Administrator**
   - กด Windows Key
   - พิมพ์ "cmd"
   - คลิกขวาที่ "Command Prompt"
   - เลือก "Run as administrator"

2. **ไปที่ Folder โปรเจค**
   ```cmd
   cd d:\Projects\POS\supabase-pos-system
   ```

### ขั้นตอนที่ 2: Build Next.js

```cmd
npm run build
```

คำสั่งนี้จะ:
- Build Next.js application
- สร้าง `.next/standalone` folder ที่มี Node.js server
- สร้าง `.next/static` folder ที่มี static files
- ใช้เวลาประมาณ 2-5 นาที

### ขั้นตอนที่ 3: Build Electron

```cmd
npm run electron-build-simple
```

คำสั่งนี้จะ:
- Package Electron application
- รวม Next.js standalone server เข้าไปใน resources
- สร้าง .exe file ใน `dist/win-unpacked/`
- ใช้เวลาประมาณ 1-3 นาที

### ขั้นตอนที่ 4: ทดสอบ

1. ไปที่ folder `dist/win-unpacked/`
2. Double-click ที่ `POS System.exe`
3. รอสักครู่ (ครั้งแรกอาจใช้เวลา 10-20 วินาที)
4. โปรแกรมจะเปิดขึ้นมา

## โครงสร้างการทำงาน

```
POS System.exe
├── electron/main.js          → เริ่มต้น Electron
├── resources/app/            → Next.js standalone server
│   ├── server.js            → Next.js server
│   ├── .next/static/        → Static files
│   └── public/              → Public assets
└── node.exe                  → Node.js runtime (built-in)
```

## การทำงานของ Electron

1. **เมื่อเปิด .exe file:**
   - Electron จะเริ่มต้น
   - `electron/main.js` จะรัน
   - มันจะ spawn Node.js process เพื่อรัน `server.js`
   - Next.js server จะเริ่มที่ `localhost:3000`
   - Electron window จะโหลด `http://localhost:3000`

2. **API Routes:**
   - ทุก API routes ใน `app/api/` จะทำงานปกติ
   - เพราะมี Next.js server รันอยู่ภายใน

3. **Database:**
   - Supabase client จะเชื่อมต่อตามปกติ
   - ใช้ environment variables จาก `.env`

## Troubleshooting

### ปัญหา: หน้าจอขาว (White Screen)

**สาเหตุ:** Server ยังไม่พร้อม

**วิธีแก้:**
1. เปิด DevTools (กด F12)
2. ดูใน Console มี error อะไร
3. รอสักครู่ แล้วกด Reload (Ctrl+R)

### ปัญหา: Build ไม่ได้ - Symlink Error

**สาเหตุ:** Windows ต้องการสิทธิ์ Administrator สำหรับ symlink

**วิธีแก้:**
1. เปิด Command Prompt แบบ Administrator
2. หรือเปิด Developer Mode:
   - Settings → Update & Security → For developers
   - เปิด "Developer Mode"

### ปัญหา: Server ไม่เริ่ม

**วิธีตรวจสอบ:**
1. เปิด Task Manager
2. ดูว่ามี `node.exe` process รันอยู่หรือไม่
3. ถ้าไม่มี แสดงว่า server ไม่ได้เริ่ม

**วิธีแก้:**
1. ตรวจสอบว่า build ครบถ้วน:
   ```cmd
   dir .next\standalone
   ```
   ต้องมี `server.js` file

2. ลอง build ใหม่:
   ```cmd
   npm run clean
   npm run build
   npm run electron-build-simple
   ```

### ปัญหา: API ไม่ทำงาน

**สาเหตุ:** Environment variables ไม่ถูกโหลด

**วิธีแก้:**
1. ตรวจสอบว่ามี `.env` file
2. ตรวจสอบว่า `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ถูกต้อง
3. Build ใหม่หลังแก้ไข `.env`

## คำสั่งที่เกี่ยวข้อง

```cmd
# Clean build files
npm run clean

# Build Next.js only
npm run build

# Build Electron (unpacked)
npm run electron-build-simple

# Build Electron (installer)
npm run electron-build

# Run in development mode
npm run electron-dev
```

## ขนาดไฟล์

- **Unpacked:** ~200-300 MB
- **Packed (NSIS installer):** ~100-150 MB

## การแจกจ่าย

### แบบ Portable (ไม่ต้องติดตั้ง)

1. Zip folder `dist/win-unpacked/`
2. แจกจ่าย zip file
3. ผู้ใช้ unzip แล้ว double-click `POS System.exe`

### แบบ Installer

1. Build installer:
   ```cmd
   npm run electron-build
   ```
2. ไฟล์ installer จะอยู่ใน `dist/`
3. แจกจ่าย installer file
4. ผู้ใช้ติดตั้งแล้วใช้งาน

## Environment Variables

ตรวจสอบว่ามี environment variables เหล่านี้ใน `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Performance Tips

1. **First Launch:** ครั้งแรกอาจช้า รอสักครู่
2. **Subsequent Launches:** จะเร็วขึ้น
3. **Memory Usage:** ประมาณ 200-400 MB RAM
4. **Disk Space:** ประมาณ 300 MB

## Security Notes

1. **Code Signing:** ปิดไว้ (`sign: null`) เพื่อความรวดเร็ว
2. **ASAR:** เปิดใช้งาน เพื่อป้องกันการแก้ไข code
3. **Context Isolation:** เปิดใช้งาน เพื่อความปลอดภัย

## Next Steps

หลังจาก build สำเร็จ:

1. ✅ ทดสอบ .exe file
2. ✅ ทดสอบ login
3. ✅ ทดสอบ POS functions
4. ✅ ทดสอบ printing
5. ✅ ทดสอบ database connection
6. ✅ แจกจ่ายให้ผู้ใช้

## Support

หากมีปัญหา:
1. เปิด DevTools (F12) ดู Console
2. ตรวจสอบ logs ใน Command Prompt
3. ลอง build ใหม่
4. ตรวจสอบ environment variables

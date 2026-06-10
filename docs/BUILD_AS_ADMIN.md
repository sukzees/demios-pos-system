# วิธีแก้ปัญหา "Cannot create symbolic link"

## ปัญหา
```
ERROR: Cannot create symbolic link : A required privilege is not held by the client.
```

## สาเหตุ
Windows ต้องการ Administrator privileges ในการสร้าง symbolic links

---

## วิธีแก้ (เลือก 1 วิธี)

### วิธีที่ 1: รัน Command Prompt แบบ Administrator (แนะนำ)

1. **เปิด Command Prompt แบบ Admin:**
   - กด `Win + X`
   - เลือก "Terminal (Admin)" หรือ "Command Prompt (Admin)"
   - หรือค้นหา "cmd" → คลิกขวา → "Run as administrator"

2. **ไปที่โฟลเดอร์โปรเจค:**
   ```bash
   cd D:\Projects\POS\supabase-pos-system
   ```

3. **Build:**
   ```bash
   npm run electron-build
   ```

---

### วิธีที่ 2: เปิด Developer Mode (แนะนำสำหรับ Windows 10/11)

1. **เปิด Settings:**
   - กด `Win + I`
   - ไปที่ "Privacy & Security" → "For developers"
   - เปิด "Developer Mode"

2. **Restart เครื่อง**

3. **Build ใหม่:**
   ```bash
   npm run electron-build
   ```

---

### วิธีที่ 3: ปิดการใช้ Symlinks (ถ้าวิธีอื่นไม่ได้)

1. **ตั้งค่า Environment Variable:**
   ```bash
   set npm_config_legacy_peer_deps=true
   set ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true
   ```

2. **Build:**
   ```bash
   npm run electron-build
   ```

---

### วิธีที่ 4: ใช้ PowerShell แบบ Admin

1. **เปิด PowerShell แบบ Admin:**
   - กด `Win + X`
   - เลือก "Windows PowerShell (Admin)"

2. **ไปที่โฟลเดอร์:**
   ```powershell
   cd D:\Projects\POS\supabase-pos-system
   ```

3. **Build:**
   ```powershell
   npm run electron-build
   ```

---

## ตรวจสอบว่าเป็น Admin หรือไม่

### ใน Command Prompt:
```bash
net session
```

ถ้าเป็น Admin จะเห็น:
```
There are no entries in the list.
```

ถ้าไม่ใช่ Admin จะเห็น:
```
System error 5 has occurred.
Access is denied.
```

---

## ถ้ายังไม่ได้

### ลอง Clean และ Build ใหม่:

```bash
# 1. ลบ node_modules
rmdir /s /q node_modules

# 2. ลบ cache
npm run clean
rmdir /s /q dist

# 3. Install ใหม่
npm install

# 4. Build (แบบ Admin)
npm run electron-build
```

---

## Alternative: Build แบบไม่ใช้ Symlinks

แก้ไข `package.json`:

```json
{
  "build": {
    "npmRebuild": false,
    "buildDependenciesFromSource": false
  }
}
```

จากนั้น build ใหม่:
```bash
npm run electron-build
```

---

## สรุป

**วิธีที่ง่ายที่สุด:**

1. เปิด Command Prompt แบบ **Administrator**
2. `cd D:\Projects\POS\supabase-pos-system`
3. `npm run electron-build`

**หรือ:**

1. เปิด **Developer Mode** ใน Windows Settings
2. Restart เครื่อง
3. `npm run electron-build`

---

## หมายเหตุ

- ปัญหานี้เกิดเฉพาะ Windows
- macOS และ Linux ไม่มีปัญหานี้
- หลัง build สำเร็จครั้งแรก ครั้งต่อไปจะเร็วขึ้น

---

## ถ้ายังไม่ได้ให้ลอง

```bash
# รัน PowerShell แบบ Admin
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# แล้ว build
npm run electron-build
```

---

**ไฟล์จะอยู่ที่:** `dist/POS System-Setup-1.0.0.exe`

# ฟีเจอร์: Popup ป้อนราคาเมื่อเมนูราคา 0

**วันที่:** 14 พฤษภาคม 2026  
**สถานะ:** ✅ เสร็จสมบูรณ์

---

## 📝 รายละเอียดฟีเจอร์

เมื่อเมนูใน Items & Categories มีราคา = 0 และถูกคลิกเพื่อเพิ่มเข้า Cart ในหน้า POS จะแสดง Dialog ให้ป้อนราคาได้ตามต้องการ

## ✨ คุณสมบัติ

### 1. การตรวจสอบราคา
- ตรวจสอบราคาเมนูเมื่อคลิก
- ถ้าราคา = 0 → แสดง Price Input Dialog
- ถ้าราคา > 0 → เพิ่มเข้า Cart ปกติ

### 2. Price Input Dialog
- **แสดง**: ชื่อเมนู, ราคาปัจจุบันที่ป้อน
- **Numpad**: ตัวเลข 0-9, จุดทศนิยม (.), ปุ่มลบ (C)
- **ข้อจำกัด**: 
  - ไม่สามารถมีจุดทศนิยมซ้ำได้
  - จำกัดทศนิยม 2 ตำแหน่ง
  - ป้องกันเลข 0 นำหน้าซ้ำ
- **ภาษา**: รองรับ EN, TH, LO

### 3. การทำงานหลังป้อนราคา
- **ถ้าเมนูไม่มี Portions**: เพิ่มเข้า Cart ทันทีด้วยราคาที่ป้อน
- **ถ้าเมนูมี Portions**: เปิด Portion Selection Dialog ต่อ (ด้วยราคาที่ป้อน)

### 4. Validation
- ต้องป้อนราคา > 0
- แสดง Alert ถ้าราคาไม่ถูกต้อง (รองรับ 3 ภาษา)
- ปุ่ม "Add to Cart" disabled จนกว่าจะป้อนราคาที่ถูกต้อง

---

## 🔧 การเปลี่ยนแปลงโค้ด

### ไฟล์: `app/pos/page.tsx`

#### 1. เพิ่ม State
```typescript
const [priceInputItem, setPriceInputItem] = useState<{ 
  item: any; 
  stock: number; 
  hasPortions?: boolean 
} | null>(null);
const [customPrice, setCustomPrice] = useState('');
```

#### 2. แก้ไข onClick Handler
```typescript
onClick={() => {
  if (isOutOfStock) return;
  
  // Check if price is 0
  if (item.price === 0) {
    setPriceInputItem({ item: { ...item, stock }, stock, hasPortions });
    setCustomPrice('');
    return;
  }
  
  if (hasPortions) {
    setPortionSelectionItem(item);
  } else {
    addToCart({ ...item, stock });
  }
}}
```

#### 3. เพิ่ม Dialog Component
- Numpad 3x4 (0-9, ., C)
- Price Display
- Confirm/Cancel Buttons
- Multi-language Support

---

## 🎨 UI/UX Design

### สี
- **Primary**: Blue (#2563EB)
- **Background**: Blue-50
- **Border**: Blue-200
- **Delete Button**: Red-500

### Layout
- **Dialog Width**: 400px
- **Numpad Button**: 56px height
- **Font Size**: 
  - Price: 3xl (30px)
  - Numpad: xl (20px)
  - Text: base (16px)

### Animation
- Dialog slide-in
- Button hover effects
- Shadow effects

---

## 📱 การใช้งาน

### ขั้นตอนสำหรับผู้ใช้:

1. **สร้างเมนูราคา 0** ในหน้า Items & Categories
2. **ไปที่หน้า POS** และเลือกเมนูนั้น
3. **Popup จะแสดงขึ้น** พร้อม Numpad
4. **ป้อนราคา** โดยใช้ Numpad
5. **กด "Add to Cart"** เพื่อเพิ่มเข้า Cart

### ตัวอย่างการใช้งาน:

**Use Case 1: เมนูทั่วไป**
- เมนู: "Custom Service" (ราคา 0)
- ผู้ใช้ป้อน: 150
- ผลลัพธ์: เพิ่มเข้า Cart ราคา 150 บาท

**Use Case 2: เมนูที่มี Portions**
- เมนู: "Custom Drink" (ราคา 0, มี portions)
- ผู้ใช้ป้อน: 80
- ผลลัพธ์: เปิด Portion Selection (ราคาฐาน 80)

---

## 🌍 การรองรับภาษา

### ข้อความที่แสดง:

| ภาษา | Title | Description | Validation Error |
|------|-------|-------------|------------------|
| EN | Enter Price | Please enter price for {item} | Please enter a valid price |
| TH | ป้อนราคา | กรุณาป้อนราคาสำหรับ {item} | กรุณาป้อนราคาที่ถูกต้อง |
| LO | ປ້ອນລາຄາ | ກະລຸນາປ້ອນລາຄາສຳລັບ {item} | ກະລຸນາປ້ອນລາຄາທີ່ຖືກຕ້ອງ |

---

## ✅ การทดสอบ

### Test Cases:

1. **✓** เมนูราคา 0 แสดง Popup
2. **✓** เมนูราคา > 0 ไม่แสดง Popup
3. **✓** Numpad ป้อนตัวเลขได้ถูกต้อง
4. **✓** จำกัดทศนิยม 2 ตำแหน่ง
5. **✓** ป้องกันจุดทศนิยมซ้ำ
6. **✓** ปุ่ม C ลบราคาได้
7. **✓** Validation ราคา > 0
8. **✓** Cancel ปิด Dialog ได้
9. **✓** เพิ่มเข้า Cart ด้วยราคาที่ป้อน
10. **✓** เมนูมี Portions เปิด Portion Selection

---

## 🚀 การ Build

```bash
# Build Next.js
npm run build

# Build Electron
npx electron-builder --dir
```

---

## 📦 ไฟล์โปรแกรม

**ตำแหน่ง:** `electron-dist\win-unpacked\POS System.exe`

---

## 🎯 ประโยชน์

1. **ความยืดหยุ่น**: สามารถกำหนดราคาได้ทุกครั้งที่ขาย
2. **ใช้งานง่าย**: UI ชัดเจน, Numpad ใช้งานง่าย
3. **ประหยัดเวลา**: ไม่ต้องสร้างเมนูหลายตัวสำหรับราคาต่างกัน
4. **รองรับหลายภาษา**: EN, TH, LO

---

## 💡 Use Cases

- บริการที่มีราคาแตกต่างแต่ละครั้ง
- สินค้าที่ราคาเปลี่ยนแปลงบ่อย
- ค่าบริการเสริม
- สินค้าพิเศษตามสั่ง

---

**หมายเหตุ:** ฟีเจอร์นี้ใช้งานได้ทันทีหลัง build โปรแกรม ไม่ต้องแก้ Database

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
const TRANSLATIONS = {
  en: {
    settings: 'Settings',
    generalSetting: 'General Setting',
    bankConfig: 'Bank Config',
    configPrinting: 'Config Printing',
    receiptCustomization: 'Receipt Customization',
    stationMapping: 'Station Mapping',
    licenseKey: 'License Key',
    generalSettings: 'General Settings',
    storeName: 'Store Name',
    taxRate: 'Default Tax Rate (%)',
    timezone: 'Timezone',
    language: 'Language',
    currencySettings: 'Currency Settings',
    defaultCurrency: 'Default Currency',
    numberFormat: 'Number Format Pattern',
    currencyRate: 'Currency Rate (relative to USD)',
    symbolPosition: 'Symbol Position',
    left: 'Left',
    right: 'Right',
    currentRate: 'Current Exchange Rate',
    updateRate: 'Update Rate',
    setRate: 'Set Rate',
    thbRateLabel: 'Thai Baht (THB) Rate per 1 THB (relative to USD or Base)',
    thbRatePlaceholder: 'e.g. 0.027 or 1/36.5',
    saveGeneralSettings: 'Save General Settings',
    bankSettings: 'Bank Settings',
    bankName: 'Bank Name',
    accountName: 'Account Name',
    accountNumber: 'Account Number',
    enabled: 'Enabled',
    addBank: 'Add Bank',
    actions: 'Actions',
    saveBankSettings: 'Save Bank Settings',
    printingSettings: 'Printing Settings',
    autoPrint: 'Auto print receipt on checkout',
    silentPrint: 'Silent print (bypass print dialog)',
    printerConfiguration: 'Printer Configuration',
    detectedLocalPrinters: 'Detected Local Printers',
    selectPrinterToAdd: 'Select a printer to add:',
    manualPrinterSetup: 'Manual Printer Setup',
    printerName: 'Printer Name (e.g., Kitchen Printer)',
    ipAddress: 'IP Address / System Name',
    location: 'Location (e.g., Back Kitchen)',
    cancel: 'Cancel',
    updatePrinter: 'Update Printer',
    addManualPrinter: 'Add Manual Printer',
    configuredPrinters: 'Configured Printers',
    default: 'Default',
    setDefault: 'Set Default',
    savePrinterSettings: 'Save Printer Settings',
    receiptSettings: 'Receipt Settings',
    headerText: 'Header Text',
    footerText: 'Footer Text',
    storeAddress: 'Store Address',
    phoneNumber: 'Phone Number',
    showBankOnReceipt: 'Show bank details on receipt',
    receiptSize: 'Receipt Size',
    stationMappingSettings: 'Station Mapping Settings',
    mappingText: 'Map categories to specific printers for order tickets.',
    category: 'Category',
    stationName: 'Station Name',
    printer: 'Printer',
    specificItem: 'Specific Item (Opt)',
    allItems: 'All Items (*)',
    addMapping: 'Add Mapping',
    saveStationMapping: 'Save Station Mapping',
    licenseTitle: 'License Key Activation',
    licenseStatus: 'License Status',
    activeTitle: 'ACTIVE',
    daysLeft: 'Days Remaining',
    expires: 'Expires',
    activeKey: 'Active Key',
    lastVerified: 'Last Verified',
    enterLicense: 'Enter License Key',
    activating: 'Activating...',
    activate: 'Activate License',
    returnLicense: 'Return License',
    refreshActivation: 'Refresh Activation Status',
    checkActivation: 'Check Activation Status',
    activeMachineId: 'Machine ID',
    syncSuccess: 'Settings saved!',
    fillAllFields: 'Please fill in all fields',
    bankFields: 'Please fill in all bank fields',
    printerFields: 'Please fill in printer name and IP address',
    oneDefaultPrinter: 'Please set one default printer',
    selectSystemPrinter: 'Please select a system printer first',
    confirmDeactivate: 'Are you sure you want to deactivate this machine? This will "return" the activation slot to the server.',
    rateMin: 'Exchange rate must be greater than 0',
    rateUpdated: 'Exchange rate updated',
    licenseActivated: 'License Activated Successfully!',
    licenseError: 'Failed to activate license',
    noKey: 'Please provide a license key.',
    receiptSettingsSaved: 'Receipt settings saved!',
    generalSettingsSaved: 'General settings saved!',
    stationMappingSaved: 'Station mapping saved!',
    deactivateSuccess: 'Deactivated this machine successfully.',
    returnSuccess: 'License Returned Successfully.',
    returnError: 'Failed to return license.',
    currencyInfoTitle: 'Currency Information',
    quickRatePresets: 'Quick Rate Presets',
    examples: 'Examples',
    currencySymbol: 'Currency Symbol',
    noItemsFound: 'No items found',
    add: 'Add',
    edit: 'Edit',
    save: 'Save',
    itemName: 'Item Name',
    stock: 'Stock',
    price: 'Price',
    total: 'Total',
    totalSales: 'Total Sales',
    items: 'Items',
  },
  lo: {
    settings: 'ການຕັ້ງຄ່າ',
    generalSetting: 'ຕັ້ງຄ່າທົ່ວໄປ',
    bankConfig: 'ຕັ້ງຄ່າທະນາຄານ',
    configPrinting: 'ຕັ້ງຄ່າການພິມ',
    receiptCustomization: 'ປັບແຕ່ງໃບບິນ',
    stationMapping: 'ຈັບຄູ່ສະຖານີ',
    licenseKey: 'ລະຫັດລິຂະສິດ',
    generalSettings: 'ການຕັ້ງຄ່າທົ່ວໄປ',
    storeName: 'ຊື່ຮ້ານ',
    taxRate: 'ອັດຕາພາສີ (%)',
    timezone: 'ເຂດເວລາ',
    language: 'ພາສາ',
    currencySettings: 'ການຕັ້ງຄ່າສະກຸນເງິນ',
    defaultCurrency: 'ສະກຸນເງິນຫຼັກ',
    numberFormat: 'ຮູບແບບຕົວເລກ',
    currencyRate: 'ອັດຕາແລກປ່ຽນ (ທຽບກັບ USD)',
    symbolPosition: 'ຕຳແໜ່ງສັນຍະລັກ',
    left: 'ຊ້າຍ',
    right: 'ຂວາ',
    currentRate: 'ອັດຕາແລກປ່ຽນປັດຈຸບັນ',
    updateRate: 'ອັບເດດອັດຕາ',
    setRate: 'ຕັ້ງອັດຕາ',
    thbRateLabel: 'ອັດຕາເງິນບາດ (THB) ຕໍ່ 1 THB',
    thbRatePlaceholder: 'ຕົວຢ່າງ: 0.027 ຫຼື 1/36.5',
    saveGeneralSettings: 'ບັນທຶກການຕັ້ງຄ່າທົ່ວໄປ',
    bankSettings: 'ການຕັ້ງຄ່າທະນາຄານ',
    bankName: 'ຊື່ທະນາຄານ',
    accountName: 'ຊື່ບັນຊີ',
    accountNumber: 'ເລກບັນຊີ',
    enabled: 'ເປີດໃຊ້',
    addBank: 'ເພີ່ມທະນາຄານ',
    actions: 'ຈັດການ',
    saveBankSettings: 'ບັນທຶກການຕັ້ງຄ່າທະນາຄານ',
    printingSettings: 'ການຕັ້ງຄ່າການພິມ',
    autoPrint: 'ພິມໃບບິນອັດຕະໂນມັດເມື່ອຊຳລະເງິນ',
    silentPrint: 'ພິມແບບງຽບ (ຂ້າມໜ້າຕ່າງການພິມ)',
    printerConfiguration: 'ການຕັ້ງຄ່າເຄື່ອງພິມ',
    detectedLocalPrinters: 'ເຄື່ອງພິມທີ່ກວດພົບ',
    selectPrinterToAdd: 'ເລືອກເຄື່ອງພິມເພື່ອເພີ່ມ:',
    manualPrinterSetup: 'ຕັ້ງຄ່າເຄື່ອງພິມດ້ວຍຕົນເອງ',
    printerName: 'ຊື່ເຄື່ອງພິມ (ຕົວຢ່າງ: ເຄື່ອງພິມເຮືອນຄົວ)',
    ipAddress: 'ທີ່ຢູ່ IP / ຊື່ລະບົບ',
    location: 'ສະຖານທີ່ (ຕົວຢ່າງ: ໃນເຮືອນຄົວ)',
    cancel: 'ຍົກເລີກ',
    updatePrinter: 'ອັບເດດເຄື່ອງພິມ',
    addManualPrinter: 'ເພີ່ມເຄື່ອງພິມດ້ວຍຕົນເອງ',
    configuredPrinters: 'ເຄື່ອງພິມທີ່ຕັ້ງຄ່າແລ້ວ',
    default: 'ເລີ່ມຕົ້ນ',
    setDefault: 'ຕັ້ງເປັນຄ່າເລີ່ມຕົ້ນ',
    savePrinterSettings: 'ບັນທຶກການຕັ້ງຄ່າເຄື່ອງພິມ',
    receiptSettings: 'ການຕັ້ງຄ່າໃບບິນ',
    headerText: 'ຂໍ້ຄວາມສ່ວນຫົວ',
    footerText: 'ຂໍ້ຄວາມສ່ວນທ້າຍ',
    storeAddress: 'ທີ່ຢູ່ຮ້ານ',
    phoneNumber: 'ເບີໂທລະສັບ',
    showBankOnReceipt: 'ສະແດງລາຍລະອຽດທະນາຄານໃນໃບບິນ',
    receiptSize: 'ຂະໜາດໃບບິນ',
    stationMappingSettings: 'ການຕັ້ງຄ່າການຈັບຄູ່ສະຖານີ',
    mappingText: 'ຈັບຄູ່ໝວດໝູ່ກັບເຄື່ອງພິມສະເພາະສຳລັບໃບສັ່ງອາຫານ.',
    category: 'ໝວດໝູ່',
    stationName: 'ຊື່ສະຖານີ',
    printer: 'ເຄື່ອງພິມ',
    specificItem: 'ລາຍການສະເພາະ (ເລືອກໄດ້)',
    allItems: 'ທຸກລາຍການ (*)',
    addMapping: 'ເພີ່ມການຈັບຄູ່',
    saveStationMapping: 'ບັນທຶກການຈັບຄູ່ສະຖານີ',
    licenseTitle: 'ການເປີດໃຊ້ລະຫັດລິຂະສິດ',
    licenseStatus: 'ສະຖານະລິຂະສິດ',
    activeTitle: 'ເປີດໃຊ້ແລ້ວ',
    daysLeft: 'ຈຳນວນມື້ທີ່ເຫຼືອ',
    expires: 'ໝົດອາຍຸ',
    activeKey: 'ລະຫັດທີ່ໃຊ້ຢູ່',
    lastVerified: 'ກວດສອບຄັ້ງລ່າສຸດ',
    enterLicense: 'ປ້ອນລະຫັດລິຂະສິດ',
    activating: 'ກຳລັງເປີດໃຊ້...',
    activate: 'ເປີດໃຊ້ລິຂະສິດ',
    returnLicense: 'ຄືນລິຂະສິດ',
    refreshActivation: 'ໂຫຼດສະຖານະໃໝ່',
    checkActivation: 'ກວດສອບສະຖານະ',
    activeMachineId: 'ລະຫັດເຄື່ອງ (Machine ID)',
    syncSuccess: 'ບັນທຶກການຕັ້ງຄ່າແລ້ວ!',
    fillAllFields: 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ',
    bankFields: 'ກະລຸນາປ້ອນຂໍ້ມູນທະນາຄານໃຫ້ຄົບຖ້ວນ',
    printerFields: 'ກະລຸນາປ້ອນຊື່ເຄື່ອງພິມ ແລະ ທີ່ຢູ່ IP',
    oneDefaultPrinter: 'ກະລຸນາຕັ້ງເຄື່ອງພິມເລີ່ມຕົ້ນຢ່າງໜ້ອຍໜຶ່ງເຄື່ອງ',
    selectSystemPrinter: 'ກະລຸນາເລືອກເຄື່ອງພິມໃນລະບົບກ່ອນ',
    confirmDeactivate: 'ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການປິດການໃຊ້ງານເຄື່ອງນີ້? ນີ້ຈະເປັນການ "ຄືນ" ສິດການໃຊ້ງານໃຫ້ກັບເຊີເວີ.',
    rateMin: 'ອັດຕາແລກປ່ຽນຕ້ອງຫຼາຍກວ່າ 0',
    rateUpdated: 'ອັບເດດອັດຕາແລກປ່ຽນແລ້ວ',
    licenseActivated: 'ເປີດໃຊ້ລິຂະສິດສຳເລັດແລ້ວ!',
    licenseError: 'ບໍ່ສາມາດເປີດໃຊ້ລິຂະສິດໄດ້',
    noKey: 'ກະລຸນາປ້ອນລະຫັດລິຂະສິດ.',
    receiptSettingsSaved: 'ບັນທຶກການຕັ້ງຄ່າໃບບິນແລ້ວ!',
    generalSettingsSaved: 'ບັນທຶກການຕັ້ງຄ່າທົ່ວໄປແລ້ວ!',
    stationMappingSaved: 'ບັນທຶກການຈັບຄູ່ສະຖານີແລ້ວ!',
    deactivateSuccess: 'ປິດການໃຊ້ງານເຄື່ອງນີ້ສຳເລັດແລ້ວ.',
    returnSuccess: 'ຄືນລິຂະສິດສຳເລັດແລ້ວ.',
    returnError: 'ບໍ່ສາມາດຄືນລິຂະສິດໄດ້.',
    currencyInfoTitle: 'ຂໍ້ມູນສະກຸນເງິນ',
    quickRatePresets: 'ຕັ້ງຄ່າດ່ວນ',
    examples: 'ຕົວຢ່າງ',
    currencySymbol: 'ສັນຍະລັກສະກຸນເງິນ',
    noItemsFound: 'ບໍ່ພົບລາຍການ',
    add: 'ເພີ່ມ',
    edit: 'ແກ້ໄຂ',
    save: 'ບັນທຶກ',
    itemName: 'ຊື່ສິນຄ້າ',
    stock: 'ຄັງສິນຄ້າ',
    price: 'ລາຄາ',
    total: 'ລວມທັງໝົດ',
    totalSales: 'ຍອດຂາຍລວມ',
    items: 'ລາຍການສິນຄ້າ',
  },
  th: {
    settings: 'การตั้งค่า',
    generalSetting: 'ตั้งค่าทั่วไป',
    bankConfig: 'ตั้งค่าธนาคาร',
    configPrinting: 'ตั้งค่าการพิมพ์',
    receiptCustomization: 'ปรับแต่งใบเสร็จ',
    stationMapping: 'จับคู่สถานี',
    licenseKey: 'รหัสลิขสิทธิ์',
    generalSettings: 'การตั้งค่าทั่วไป',
    storeName: 'ชื่อร้าน',
    taxRate: 'อัตราภาษี (%)',
    timezone: 'เขตเวลา',
    language: 'ภาษา',
    currencySettings: 'การตั้งค่าสกุลเงิน',
    defaultCurrency: 'สกุลเงินหลัก',
    numberFormat: 'รูปแบบตัวเลข',
    currencyRate: 'อัตราแลกเปลี่ยน (เทียบกับ USD)',
    symbolPosition: 'ตำแหน่งสัญลักษณ์',
    left: 'ซ้าย',
    right: 'ขวา',
    currentRate: 'อัตราแลกเปลี่ยนปัจจุบัน',
    updateRate: 'อัปเดตอัตรา',
    setRate: 'ตั้งอัตรา',
    thbRateLabel: 'อัตราเงินบาท (THB) ต่อ 1 THB',
    thbRatePlaceholder: 'ตัวอย่าง: 0.027 หรือ 1/36.5',
    saveGeneralSettings: 'บันทึกการตั้งค่าทั่วไป',
    bankSettings: 'การตั้งค่าธนาคาร',
    bankName: 'ชื่อธนาคาร',
    accountName: 'ชื่อบัญชี',
    accountNumber: 'เลขบัญชี',
    enabled: 'เปิดใช้งาน',
    addBank: 'เพิ่มธนาคาร',
    actions: 'จัดการ',
    saveBankSettings: 'บันทึกการตั้งค่าธนาคาร',
    printingSettings: 'การตั้งค่าการพิมพ์',
    autoPrint: 'พิมพ์ใบเสร็จอัตโนมัติเมื่อชำระเงิน',
    silentPrint: 'พิมพ์แบบเงียบ (ข้ามหน้าต่างการพิมพ์)',
    printerConfiguration: 'การตั้งค่าเครื่องพิมพ์',
    detectedLocalPrinters: 'เครื่องพิมพ์ที่ตรวจพบ',
    selectPrinterToAdd: 'เลือกเครื่องพิมพ์เพื่อเพิ่ม:',
    manualPrinterSetup: 'ตั้งค่าเครื่องพิมพ์ด้วยตนเอง',
    printerName: 'ชื่อเครื่องพิมพ์ (เช่น เครื่องพิมพ์ครัว)',
    ipAddress: 'ที่อยู่ IP / ชื่อระบบ',
    location: 'สถานที่ (เช่น ในครัว)',
    cancel: 'ยกเลิก',
    updatePrinter: 'อัปเดตเครื่องพิมพ์',
    addManualPrinter: 'เพิ่มเครื่องพิมพ์ด้วยตนเอง',
    configuredPrinters: 'เครื่องพิมพ์ที่ตั้งค่าแล้ว',
    default: 'เริ่มต้น',
    setDefault: 'ตั้งเป็นค่าเริ่มต้น',
    savePrinterSettings: 'บันทึกการตั้งค่าเครื่องพิมพ์',
    receiptSettings: 'การตั้งค่าใบเสร็จ',
    headerText: 'ข้อความส่วนหัว',
    footerText: 'ข้อความส่วนท้าย',
    storeAddress: 'ที่อยู่ร้าน',
    phoneNumber: 'เบอร์โทรศัพท์',
    showBankOnReceipt: 'แสดงรายละเอียดธนาคารในใบเสร็จ',
    receiptSize: 'ขนาดใบเสร็จ',
    stationMappingSettings: 'การตั้งค่าการจับคู่สถานี',
    mappingText: 'จับคู่หมวดหมู่กับเครื่องพิมพ์เฉพาะสำหรับใบสั่งอาหาร',
    category: 'หมวดหมู่',
    stationName: 'ชื่อสถานี',
    printer: 'เครื่องพิมพ์',
    specificItem: 'รายการเฉพาะ (เลือกได้)',
    allItems: 'ทุกรายการ (*)',
    addMapping: 'เพิ่มการจับคู่',
    saveStationMapping: 'บันทึกการจับคู่สถานี',
    licenseTitle: 'การเปิดใช้งานรหัสลิขสิทธิ์',
    licenseStatus: 'สถานะลิขสิทธิ์',
    activeTitle: 'เปิดใช้งานแล้ว',
    daysLeft: 'จำนวนวันที่เหลือ',
    expires: 'หมดอายุ',
    activeKey: 'รหัสที่ใช้อยู่',
    lastVerified: 'ตรวจสอบล่าสุด',
    enterLicense: 'กรอกรหัสลิขสิทธิ์',
    activating: 'กำลังเปิดใช้งาน...',
    activate: 'เปิดใช้งานลิขสิทธิ์',
    returnLicense: 'คืนลิขสิทธิ์',
    refreshActivation: 'รีเฟรชสถานะ',
    checkActivation: 'ตรวจสอบสถานะ',
    activeMachineId: 'รหัสเครื่อง (Machine ID)',
    syncSuccess: 'บันทึกการตั้งค่าแล้ว!',
    fillAllFields: 'กรุณากรอกข้อมูลให้ครบถ้วน',
    bankFields: 'กรุณากรอกข้อมูลธนาคารให้ครบถ้วน',
    printerFields: 'กรุณากรอกชื่อเครื่องพิมพ์และที่อยู่ IP',
    oneDefaultPrinter: 'กรุณาตั้งเครื่องพิมพ์เริ่มต้นอย่างน้อยหนึ่งเครื่อง',
    selectSystemPrinter: 'กรุณาเลือกเครื่องพิมพ์ในระบบก่อน',
    confirmDeactivate: 'คุณแน่ใจหรือไม่ว่าต้องการปิดการใช้งานเครื่องนี้? นี่จะเป็นการ "คืน" สิทธิ์การใช้งานให้กับเซิร์ฟเวอร์',
    rateMin: 'อัตราแลกเปลี่ยนต้องมากกว่า 0',
    rateUpdated: 'อัปเดตอัตราแลกเปลี่ยนแล้ว',
    licenseActivated: 'เปิดใช้งานลิขสิทธิ์สำเร็จแล้ว!',
    licenseError: 'ไม่สามารถเปิดใช้งานลิขสิทธิ์ได้',
    noKey: 'กรุณากรอกรหัสลิขสิทธิ์',
    receiptSettingsSaved: 'บันทึกการตั้งค่าใบเสร็จแล้ว!',
    generalSettingsSaved: 'บันทึกการตั้งค่าทั่วไปแล้ว!',
    stationMappingSaved: 'บันทึกการจับคู่สถานีแล้ว!',
    deactivateSuccess: 'ปิดการใช้งานเครื่องนี้สำเร็จแล้ว',
    returnSuccess: 'คืนลิขสิทธิ์สำเร็จแล้ว',
    returnError: 'ไม่สามารถคืนลิขสิทธิ์ได้',
    currencyInfoTitle: 'ข้อมูลสกุลเงิน',
    quickRatePresets: 'ตั้งค่าด่วน',
    examples: 'ตัวอย่าง',
    currencySymbol: 'สัญลักษณ์สกุลเงิน',
    noItemsFound: 'ไม่พบรายการ',
    add: 'เพิ่ม',
    edit: 'แก้ไข',
    save: 'บันทึก',
    itemName: 'ชื่อสินค้า',
    stock: 'สต็อก',
    price: 'ราคา',
    total: 'ยอดรวม',
    totalSales: 'ยอดขายรวม',
    items: 'รายการสินค้า',
  }
};

import { Save, Trash2, Plus, Printer, RefreshCw, Eye } from 'lucide-react';
import { usePosStore } from '@/lib/store';

export default function SettingsPage() {
  const [serverLicenseKey, setServerLicenseKey] = useState('');
  const {
    receiptSettings,
    updateReceiptSettings,
    currencySettings,
    updateCurrencySettings,
    generalSettings,
    updateGeneralSettings,
    bankConfigs,
    updateBankConfigs,
    printerConfigs,
    updatePrinterConfigs,
    categories,
    items,
    fetchItemsAndCategories,
    stationMappings,
    updateStationMappings,
    isSupabaseConfigured,
    licenseInfo,
    updateLicenseInfo,
    autoPrint,
    updateAutoPrint,
    silentPrint,
    updateSilentPrint,
    licenseSyncAt,
    licenseApiData,
    syncLicenseDaily,
    syncLicenseNow
  } = usePosStore();

  const currentLanguage = (generalSettings?.language || 'en') as 'en' | 'lo' | 'th';
  const t = TRANSLATIONS[currentLanguage];
  const [headerText, setHeaderText] = useState(receiptSettings.headerText);
  const [footerText, setFooterText] = useState(receiptSettings.footerText);
  const [storeAddress, setStoreAddress] = useState(receiptSettings.storeAddress);
  const [phoneNumber, setPhoneNumber] = useState(receiptSettings.phoneNumber);
  const [showBankDetail, setShowBankDetail] = useState(receiptSettings.showBankDetail ?? true);
  const [receiptSize, setReceiptSize] = useState(receiptSettings.receiptSize || '80mm');

  // General settings
  const [storeName, setStoreName] = useState(generalSettings.storeName);
  const [taxRate, setTaxRate] = useState(generalSettings.taxRate);
  const [timezone, setTimezone] = useState(generalSettings.timezone);
  const [language, setLanguage] = useState<'en' | 'lo' | 'th'>(generalSettings.language || 'en');

  // Currency settings
  const [defaultCurrency, setDefaultCurrency] = useState(currencySettings.defaultCurrency);
  const [currencySymbol, setCurrencySymbol] = useState(currencySettings.currencySymbol);
  const [currencyFormat, setCurrencyFormat] = useState(currencySettings.currencyFormat);
  const [currencyRate, setCurrencyRate] = useState(currencySettings.currencyRate);
  const [currencySymbolPosition, setCurrencySymbolPosition] = useState<'left' | 'right'>(currencySettings.currencySymbolPosition || 'left');
  const [thbRate, setThbRate] = useState(currencySettings.thbRate || 36.5);
  const [availableCurrencies] = useState([
    { code: 'USD', symbol: '$', format: '###,###.00', rate: 1.0, name: 'US Dollar' },
    { code: 'LAK', symbol: '\u20ad', format: '###,###', rate: 21000.0, name: 'Lao Kip' },
    { code: 'THB', symbol: '\u0e3f', format: '###,###.00', rate: 36.5, name: 'Thai Baht' },
  ]);
  const [localBanks, setLocalBanks] = useState(bankConfigs);
  const [localPrinters, setLocalPrinters] = useState(printerConfigs);
  const [newBank, setNewBank] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    enabledForTransfer: true
  });
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    ipAddress: '',
    location: '',
    enabled: true
  });
  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);
  const [localStationMappings, setLocalStationMappings] = useState(stationMappings);
  const [systemPrinters, setSystemPrinters] = useState<string[]>([]);
  const [selectedSystemPrinter, setSelectedSystemPrinter] = useState<string>('');
  const [localAutoPrint, setLocalAutoPrint] = useState(autoPrint ?? false);
  const [localSilentPrint, setLocalSilentPrint] = useState(silentPrint ?? false);

  // License
  const [licenseKey, setLicenseKey] = useState(serverLicenseKey || licenseInfo?.key || '');
  const [isActivating, setIsActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState('');
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    let active = true;

    const loadServerLicenseKey = async () => {
      try {
        const response = await fetch('/api/license/current', { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        const keyFromServer = String(data?.license_key || '').trim();
        if (!active || !keyFromServer) return;

        setServerLicenseKey(keyFromServer);
        setLicenseKey(keyFromServer);

        if (licenseInfo?.key !== keyFromServer) {
          updateLicenseInfo({
            key: keyFromServer,
            machineId: licenseInfo?.machineId || `mach-${Math.random().toString(36).substring(2, 10)}`,
            active: licenseInfo?.active || false,
            expiresAt: licenseInfo?.expiresAt || '',
            renewDate: licenseInfo?.renewDate || '',
            activationData: licenseInfo?.activationData || null
          });
        }
      } catch {
        // Ignore bootstrap errors and keep current local state.
      }
    };

    loadServerLicenseKey();

    return () => {
      active = false;
    };
  }, [licenseInfo?.active, licenseInfo?.activationData, licenseInfo?.expiresAt, licenseInfo?.key, licenseInfo?.machineId, licenseInfo?.renewDate, updateLicenseInfo]);

  useEffect(() => {
    setHeaderText(receiptSettings.headerText);
    setFooterText(receiptSettings.footerText);
    setStoreAddress(receiptSettings.storeAddress);
    setPhoneNumber(receiptSettings.phoneNumber);
    setShowBankDetail(receiptSettings.showBankDetail ?? true);
    setReceiptSize(receiptSettings.receiptSize || '80mm');
    setStoreName(generalSettings.storeName);
    setTaxRate(generalSettings.taxRate);
    setTimezone(generalSettings.timezone);
    setLanguage(generalSettings.language || 'en');
    setDefaultCurrency(currencySettings.defaultCurrency);
    setCurrencySymbol(currencySettings.currencySymbol);
    setCurrencyFormat(currencySettings.currencyFormat);
    setCurrencyRate(currencySettings.currencyRate);
    setCurrencySymbolPosition(currencySettings.currencySymbolPosition || 'left');
    setThbRate(currencySettings.thbRate || 36.5);
    setLocalBanks(bankConfigs);
    setLocalPrinters(printerConfigs);
    setLocalStationMappings(stationMappings);

    if (licenseInfo) {
      setLicenseKey(serverLicenseKey || licenseInfo.key);
      // Calculate days remaining from expires_at
      if (licenseInfo.expiresAt) {
        const expiryDate = parseLicenseDate(licenseInfo.expiresAt);
        if (!expiryDate) {
          setDaysRemaining(0);
          return;
        }
        expiryDate.setHours(23, 59, 59, 999);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(Math.max(0, days));
      }
    }
    setLocalAutoPrint(autoPrint ?? false);
    setLocalSilentPrint(silentPrint ?? false);
  }, [receiptSettings, currencySettings, generalSettings, bankConfigs, printerConfigs, stationMappings, licenseInfo, autoPrint, silentPrint, serverLicenseKey]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchItemsAndCategories();
    }
  }, [isSupabaseConfigured, fetchItemsAndCategories]);

  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const response = await fetch('/api/printers/list');
        const data = await response.json();
        if (data.printers) {
          setSystemPrinters(data.printers);
        }
      } catch (err) {
        console.error('Failed to load system printers');
      }
    };
    fetchPrinters();
  }, []);

  // Remove auto-sync logic to allow manual mapping control as requested.
  // We'll keep stationMappings synced with the store on mount via the main useEffect.

  const normalizeExpiresAt = (payload: Record<string, any>) =>
    payload?.expires_at ??
    payload?.expiresAt ??
    payload?.expiry_date ??
    payload?.expiryDate ??
    payload?.expiration_date ??
    payload?.expirationDate ??
    '';

  const parseLicenseDate = (value: string) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const isoDate = new Date(iso);
    if (!Number.isNaN(isoDate.getTime())) return isoDate;
    const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!match) return null;
    const [, dd, mm, yyyy, hh = '00', mi = '00', ss = '00'] = match;
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getLicenseEndpoints = () => {
    return {
      verifyUrl: '/api/verify',
      activateUrl: '/api/activate',
      returnUrl: '/api/activate/return'
    };
  };

  const getLicenseStatus = (data: any) => {
    const payload = (data as any)?.data ?? (data as any)?.result ?? data;
    const activationData = payload?.activation_data ?? payload?.activationData ?? payload;
    return String(
      payload?.status ??
      payload?.license_status ??
      activationData?.status ??
      activationData?.license_status ??
      ''
    ).trim().toLowerCase();
  };

  const updateLicenseState = (key: string, machineId: string, data: any) => {
    const payload = (data as any)?.data ?? (data as any)?.result ?? data;
    const expiresAt = normalizeExpiresAt(payload as Record<string, any>);
    const status = getLicenseStatus(data);
    const isStatusInactive = ['inactive', 'expired', 'revoked', 'suspended', 'blocked', 'disabled'].includes(status);

    if (expiresAt) {
      updateLicenseInfo({
        key,
        machineId,
        active: (data.success === true || data.valid === true) && !isStatusInactive,
        expiresAt,
        renewDate: (payload as any)?.renew_date || (payload as any)?.renewDate || new Date().toISOString().replace('T', ' ').split('.')[0],
        activationData: (payload as any)?.activation_data || (payload as any)?.activationData || payload
      });

      const expiryDate = parseLicenseDate(expiresAt);
      if (expiryDate) {
        expiryDate.setHours(23, 59, 59, 999);
        const diffTime = expiryDate.getTime() - Date.now();
        setDaysRemaining(Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));
      } else {
        setDaysRemaining(0);
      }
      return true;
    }
    return false;
  };

  const handleActivateLicense = async () => {
    if (!(serverLicenseKey || licenseKey.trim())) {
      setActivationMessage(t.noKey);
      return;
    }

    setIsActivating(true);
    setActivationMessage('');

    try {
      const normalizedKey = serverLicenseKey || licenseKey.trim();
      const machineId = licenseInfo?.machineId || `mach-${Math.random().toString(36).substring(2, 10)}`;
      const { activateUrl } = getLicenseEndpoints();

      const response = await fetch(activateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: normalizedKey,
          machine_id: machineId,
          force_refresh: true
        })
      });

      const data = await response.json().catch(() => ({}));

      if (data.success && updateLicenseState(normalizedKey, machineId, data)) {
        setActivationMessage(t.licenseActivated);
        return;
      }

      const activationError = data?.error || data?.message || t.licenseError;
      if (String(activationError).toLowerCase().includes('not found')) {
        setActivationMessage('License key not found');
      } else {
        setActivationMessage(activationError);
      }
    } catch (error) {
      console.error('License activation error:', error);
      setActivationMessage('An error occurred during activation.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleSyncLicense = async () => {
    setActivationMessage('');
    setIsActivating(true);

    try {
      const keyToSync = serverLicenseKey || licenseKey.trim() || licenseInfo?.key || '';
      const machineId = licenseInfo?.machineId || '';

      if (!keyToSync) {
        setActivationMessage(t.noKey);
        return;
      }

      const syncResponse = await fetch('/api/license/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: keyToSync
        })
      });
      const syncData = await syncResponse.json();

      if (!syncData.success) {
        setActivationMessage(syncData.error || 'Failed to sync license from verify-license API');
        return;
      }

      const verifyResponse = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: keyToSync,
          machine_id: machineId
        })
      });
      const verifyData = await verifyResponse.json();

      if (verifyData.valid && updateLicenseState(keyToSync, machineId, verifyData)) {
        setActivationMessage('Sync complete. License active (from local database)');
        return;
      }

      setActivationMessage(verifyData.error || 'License is still not available in local database after refresh.');
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : 'Failed to sync license. Please check your network connection.';
      setActivationMessage(errorMsg);
    } finally {
      setIsActivating(false);
    }
  };

  const handleCheckActivationStatus = async () => {
    setActivationMessage('');
    setIsActivating(true);

    try {
      const keyToCheck = serverLicenseKey || licenseKey.trim() || licenseInfo?.key || '';
      const machineId = licenseInfo?.machineId || '';

      if (!keyToCheck) {
        setActivationMessage(t.noKey);
        return;
      }

      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: keyToCheck,
          machine_id: machineId
        })
      });
      const data = await response.json();

      if (data.valid && updateLicenseState(keyToCheck, machineId, data)) {
        setActivationMessage('License is active (from local database)');
        return;
      }

      setActivationMessage(data.error || 'License is not available in local database yet. Try "Refresh Activation Status".');
    } catch (error) {
      setActivationMessage('Failed to check activation status.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleViewLicenseData = () => {
    const data = licenseApiData ? JSON.stringify(licenseApiData, null, 2) : 'No license data saved yet.';
    alert(data);
  };

  const getLicenseRow = () => {
    const payload = (licenseApiData as any)?.data ?? (licenseApiData as any)?.result ?? licenseApiData;
    const license = payload?.license ?? payload?.license_info ?? payload?.licenseInfo ?? payload ?? {};
    return {
      key: license.license_key ?? license.key ?? licenseInfo.key ?? '',
      product: license.product ?? license.plan ?? license.tier ?? payload?.tier ?? '-',
      status: license.status ?? (licenseApiData as any)?.valid ?? (licenseApiData as any)?.success ?? licenseInfo.active ?? '',
      expires: license.expires_at ?? license.expiresAt ?? licenseInfo.expiresAt ?? '',
      renew: license.renew_date ?? license.renewDate ?? licenseInfo.renewDate ?? ''
    };
  };

  const handleReturnLicense = async () => {
    if (!(serverLicenseKey || licenseKey.trim())) return;

    if (!window.confirm(t.confirmDeactivate)) {
      return;
    }

    setIsActivating(true);
    setActivationMessage('');

    try {
      const { returnUrl } = getLicenseEndpoints();
      const response = await fetch(returnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: serverLicenseKey || licenseKey,
          machine_id: licenseInfo?.machineId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setActivationMessage(t.returnSuccess);
        updateLicenseInfo({
          key: '',
          machineId: licenseInfo?.machineId || '',
          active: false,
          expiresAt: '',
          activationData: null
        });
        setLicenseKey(serverLicenseKey || '');
      } else {
        setActivationMessage(data.error || t.returnError);
      }
    } catch (error) {
      setActivationMessage('An error occurred while returning the license.');
    } finally {
      setIsActivating(false);
    }
  };

  const verifyLicense = async () => {
    if (!licenseInfo?.active || !licenseInfo?.key) return;

    try {
      const { verifyUrl } = getLicenseEndpoints();
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseInfo.key,
          machine_id: licenseInfo.machineId
        })
      });

      const data = await response.json();
      const payload = (data as any)?.data ?? (data as any)?.result ?? data;
      const expiresAt = normalizeExpiresAt(payload as Record<string, any>);

      if (!data.valid && !expiresAt) {
        updateLicenseInfo({ ...licenseInfo, active: false });
        alert('License is no longer valid or has expired.');
      } else if (expiresAt) {
        updateLicenseInfo({
          ...licenseInfo,
          active: data.valid === true,
          expiresAt: expiresAt,
          renewDate: (payload as any)?.renew_date || licenseInfo.renewDate,
          activationData: (payload as any)?.activation_data || (payload as any)?.activationData || licenseInfo.activationData
        });
      }
    } catch (error) {
      // verification failed due to network etc, let it slide temporarily
    }
  };

  useEffect(() => {
    // Optionally verify when settings page is loaded
    verifyLicense();
  }, []);

  useEffect(() => {
    syncLicenseDaily();
  }, [syncLicenseDaily, licenseInfo?.key]);

  const handleSaveReceiptSettings = () => {
    updateReceiptSettings({
      headerText,
      footerText,
      storeAddress,
      phoneNumber,
      showBankDetail,
      receiptSize: receiptSize as '58mm' | '80mm'
    });
    alert(t.receiptSettingsSaved);
  };

  const handleSaveGeneralSettings = () => {
    updateGeneralSettings({
      storeName,
      taxRate,
      timezone,
      language
    });
    updateCurrencySettings({
      defaultCurrency,
      currencySymbol,
      currencyFormat,
      currencyRate,
      currencySymbolPosition,
      thbRate
    });

    alert(t.generalSettingsSaved);
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = availableCurrencies.find(c => c.code === currencyCode);
    if (currency) {
      setDefaultCurrency(currencyCode);
      setCurrencySymbol(currency.symbol);
      setCurrencyFormat(currency.format);
      setCurrencyRate(currency.rate);
    }
  };

  const handleCustomRateChange = (rate: string) => {
    const parsedRate = parseFloat(rate) || 1.0;
    setCurrencyRate(parsedRate);
  };

  const handleManualRateSet = (rate: string) => {
    const parsedRate = parseFloat(rate) || 1.0;
    if (parsedRate <= 0) {
      alert(t.rateMin);
      return;
    }
    setCurrencyRate(parsedRate);
    alert(`${t.rateUpdated}: ${parsedRate.toLocaleString()} = 1 USD`);
  };

  const handleManualThbRateSet = (rate: string) => {
    const parsedRate = parseFloat(rate) || 36.5;
    if (parsedRate <= 0) {
      alert(t.rateMin);
      return;
    }
    setThbRate(parsedRate);
    alert(`${t.rateUpdated}: ${parsedRate.toLocaleString()} = 1 THB`);
  };

  const handleAddBank = () => {
    if (!newBank.bankName.trim() || !newBank.accountName.trim() || !newBank.accountNumber.trim()) {
      alert(t.bankFields);
      return;
    }
    setLocalBanks((prev) => [
      ...prev,
      {
        id: `bank-${Date.now()}`,
        bankName: newBank.bankName.trim(),
        accountName: newBank.accountName.trim(),
        accountNumber: newBank.accountNumber.trim(),
        enabledForTransfer: newBank.enabledForTransfer
      }
    ]);
    setNewBank({
      bankName: '',
      accountName: '',
      accountNumber: '',
      enabledForTransfer: true
    });
  };

  const handleDeleteBank = (bankId: string) => {
    setLocalBanks((prev) => prev.filter((b) => b.id !== bankId));
  };

  const handleToggleBankEnabled = (bankId: string, checked: boolean) => {
    setLocalBanks((prev) => prev.map((b) => b.id === bankId ? { ...b, enabledForTransfer: checked } : b));
  };

  const handleSaveBankSettings = () => {
    updateBankConfigs(localBanks);
    updateReceiptSettings({
      headerText,
      footerText,
      storeAddress,
      phoneNumber,
      showBankDetail,
      receiptSize: receiptSize as '58mm' | '80mm'
    });
    alert(t.syncSuccess);
  };

  const resetPrinterForm = () => {
    setEditingPrinterId(null);
    setNewPrinter({
      name: '',
      ipAddress: '',
      location: '',
      enabled: true
    });
  };

  const handleAddOrUpdatePrinter = () => {
    if (!newPrinter.name.trim() || !newPrinter.ipAddress.trim()) {
      alert(t.printerFields);
      return;
    }

    if (editingPrinterId) {
      setLocalPrinters((prev) => prev.map((printer) => (
        printer.id === editingPrinterId
          ? {
            ...printer,
            name: newPrinter.name.trim(),
            ipAddress: newPrinter.ipAddress.trim(),
            location: newPrinter.location.trim() || printer.location,
            enabled: newPrinter.enabled
          }
          : printer
      )));
    } else {
      setLocalPrinters((prev) => ([
        ...prev,
        {
          id: `printer-${Date.now()}`,
          name: newPrinter.name.trim(),
          ipAddress: newPrinter.ipAddress.trim(),
          location: newPrinter.location.trim() || 'General',
          isDefault: prev.length === 0,
          enabled: newPrinter.enabled
        }
      ]));
    }

    resetPrinterForm();
  };

  const handleEditPrinter = (printerId: string) => {
    const printer = localPrinters.find((p) => p.id === printerId);
    if (!printer) return;
    setEditingPrinterId(printerId);
    setNewPrinter({
      name: printer.name,
      ipAddress: printer.ipAddress,
      location: printer.location,
      enabled: printer.enabled
    });
  };

  const handleDeletePrinter = (printerId: string) => {
    const printerToDelete = localPrinters.find((p) => p.id === printerId);
    const next = localPrinters.filter((p) => p.id !== printerId);
    if (printerToDelete?.isDefault && next.length > 0) {
      next[0] = { ...next[0], isDefault: true };
    }
    setLocalPrinters(next);
    if (editingPrinterId === printerId) resetPrinterForm();
  };

  const handleSetDefaultPrinter = (printerId: string) => {
    setLocalPrinters((prev) => prev.map((printer) => ({
      ...printer,
      isDefault: printer.id === printerId
    })));
  };

  const handleTogglePrinterEnabled = (printerId: string, checked: boolean) => {
    setLocalPrinters((prev) => prev.map((printer) => (
      printer.id === printerId ? { ...printer, enabled: checked } : printer
    )));
  };

  const handleSavePrinterSettings = () => {
    if (localPrinters.length > 0 && !localPrinters.some((p) => p.isDefault)) {
      alert(t.oneDefaultPrinter);
      return;
    }
    updatePrinterConfigs(localPrinters);
    updateAutoPrint(localAutoPrint);
    updateSilentPrint(localSilentPrint);
    alert(t.syncSuccess);
  };

  const handleAddSystemPrinter = () => {
    if (!selectedSystemPrinter) {
      alert(t.selectSystemPrinter);
      return;
    }

    setLocalPrinters((prev) => ([
      ...prev,
      {
        id: `printer-sys-${Date.now()}`,
        name: selectedSystemPrinter,
        ipAddress: 'System-Driver',
        location: 'General',
        isDefault: prev.length === 0,
        enabled: true
      }
    ]));

    setSelectedSystemPrinter('');
    alert(`Added ${selectedSystemPrinter} to your configuration.`);
  };

  const handleAddStationMapping = () => {
    const defaultPrinterId = localPrinters.find(p => p.isDefault)?.id || localPrinters[0]?.id || '';
    const defaultCategoryId = categories[0]?.id || '';

    setLocalStationMappings((prev) => [
      ...prev,
      {
        id: `station-${Date.now()}`,
        categoryId: defaultCategoryId,
        stationName: 'Kitchen Station',
        printerId: defaultPrinterId,
        selectedItemId: '*'
      }
    ]);
  };

  const handleDeleteStationMapping = (mappingId: string) => {
    setLocalStationMappings((prev) => prev.filter((m) => m.id !== mappingId));
  };

  const updateStationRow = (mappingId: string, field: 'categoryId' | 'printerId' | 'selectedItemId', value: string) => {
    setLocalStationMappings((prev) => prev.map((row) => (
      row.id === mappingId
        ? {
          ...row,
          [field]: value,
          // Reset item selection ONLY if category changes
          ...(field === 'categoryId' ? { selectedItemId: '*' } : {})
        }
        : row
    )));
  };

  const handleSaveStationMappings = () => {
    updateStationMappings(localStationMappings);
    alert(t.syncSuccess);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t.settings}</h2>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{t.generalSetting}</TabsTrigger>
          <TabsTrigger value="bank">{t.bankConfig}</TabsTrigger>
          <TabsTrigger value="printing">{t.configPrinting}</TabsTrigger>
          <TabsTrigger value="receipt">{t.receiptCustomization}</TabsTrigger>
          <TabsTrigger value="station">{t.stationMapping}</TabsTrigger>
          <TabsTrigger value="license">{t.licenseKey}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="border-zinc-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
              <CardTitle className="text-zinc-800">{t.generalSettings}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="store-name">{t.storeName}</Label>
                  <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">{t.taxRate}</Label>
                  <Input id="tax-rate" type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">{t.timezone}</Label>
                  <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">{t.language}</Label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'lo')}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="en">English</option>
                    <option value="lo">ລາວ (Lao)</option>
                    <option value="th">ไทย (Thai)</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">{t.currencySettings}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="default-currency">{t.defaultCurrency}</Label>
                    <select
                      id="default-currency"
                      value={defaultCurrency}
                      onChange={(e) => handleCurrencyChange(e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      {availableCurrencies.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.name} ({currency.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency-pattern">{t.numberFormat}</Label>
                    <Input
                      id="currency-pattern"
                      value={currencyFormat}
                      onChange={(e) => setCurrencyFormat(e.target.value)}
                      placeholder="###,###.00 or ###,###"
                    />
                    <p className="text-xs text-zinc-500">{t.examples || 'Examples'}: `###,###` or `###,###.00`</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currency-symbol">{t.currencySettings}</Label>
                    <Input
                      id="currency-symbol"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      placeholder={currencySymbol}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symbol-position">{t.symbolPosition}</Label>
                    <select
                      id="symbol-position"
                      value={currencySymbolPosition}
                      onChange={(e) => setCurrencySymbolPosition((e.target.value as 'left' | 'right') || 'left')}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="left">{t.left} ({currencySymbol}1,000)</option>
                      <option value="right">{t.right} (1,000{currencySymbol})</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currency-rate">{t.currencyRate}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="currency-rate"
                        type="number"
                        step="0.01"
                        value={currencyRate}
                        onChange={(e) => handleCustomRateChange(e.target.value)}
                        placeholder="1.00"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleManualRateSet(currencyRate.toString())}
                        variant="outline"
                        size="sm"
                      >
                        {t.setRate}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {currencyRate.toLocaleString()} = 1 USD
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thb-rate">{t.thbRateLabel}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="thb-rate"
                        type="number"
                        step="0.01"
                        value={thbRate}
                        onChange={(e) => setThbRate(parseFloat(e.target.value) || 36.5)}
                        placeholder="36.5"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => handleManualThbRateSet(thbRate.toString())}
                        variant="outline"
                        size="sm"
                      >
                        {t.setRate}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {thbRate.toLocaleString()} = 1 THB
                    </p>
                  </div>
                </div>

                  <h4 className="font-medium mb-3">{t.quickRatePresets}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManualRateSet('1.0')}
                      className="text-xs"
                    >
                      USD: 1.0
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManualRateSet('21000.0')}
                      className="text-xs"
                    >
                      LAK: 21,000
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManualRateSet('36.5')}
                      className="text-xs"
                    >
                      THB: 36.5
                    </Button>
                  </div>
                </div>

              <div className="border-t pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">{t.currencyInfoTitle || 'Currency Information'}</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>{t.defaultCurrency}:</strong> {defaultCurrency} - {availableCurrencies.find(c => c.code === defaultCurrency)?.name}</p>
                    <p><strong>{t.currentRate}:</strong> 1 {defaultCurrency} = {currencyRate} USD</p>
                    <p><strong>{t.numberFormat}:</strong> {currencyFormat}</p>
                    <p><strong>{t.currencySymbol}:</strong> {currencySymbol}</p>
                    <p><strong>{t.symbolPosition}:</strong> {currencySymbolPosition}</p>
                  </div>
                </div>
              </div>

              <Button className="mt-4 gap-2" onClick={handleSaveGeneralSettings}>
                <Save className="h-4 w-4" />
                {t.saveGeneralSettings}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="space-y-4">
          <Card className="border-0 shadow-xl shadow-zinc-200/50 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 flex-row items-center justify-between space-y-0 p-6">
              <CardTitle className="text-xl font-bold text-zinc-800">{t.bankSettings}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-end bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100 mb-8">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t.bankName}</Label>
                  <Input value={newBank.bankName} onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })} placeholder="e.g. BCEL" className="h-11 rounded-xl shadow-sm border-zinc-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t.accountName}</Label>
                  <Input value={newBank.accountName} onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })} placeholder="Account Name" className="h-11 rounded-xl shadow-sm border-zinc-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t.accountNumber}</Label>
                  <Input value={newBank.accountNumber} onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })} placeholder="Account Number" className="h-11 rounded-xl shadow-sm border-zinc-200" />
                </div>
                <Button onClick={handleAddBank} className="h-11 bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 font-bold">
                  <Plus className="mr-2 h-4 w-4" /> {t.addBank}
                </Button>
              </div>

              <div className="border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/80 border-b border-zinc-100">
                    <tr className="border-b border-indigo-50 bg-indigo-50/20 text-left text-indigo-600">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t.bankName}</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t.accountName}</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t.accountNumber}</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t.enabled}</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 bg-white">
                    {localBanks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">{t.noItemsFound}</td>
                      </tr>
                    ) : (
                      localBanks.map((bank) => (
                        <tr key={bank.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                          <td className="px-6 py-4 font-bold text-zinc-800">{bank.bankName}</td>
                          <td className="px-6 py-4 text-zinc-600 font-medium">{bank.accountName}</td>
                          <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{bank.accountNumber}</td>
                          <td className="px-6 py-4">
                            <input type="checkbox" checked={bank.enabledForTransfer} onChange={(e) => handleToggleBankEnabled(bank.id, e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteBank(bank.id)} className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-4 mt-6">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!showBankDetail}
                    onChange={(e) => setShowBankDetail(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {t.showBankOnReceipt}
                </label>
              </div>

              <div className="flex justify-end mt-8">
                <Button onClick={handleSaveBankSettings} className="h-12 px-8 bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-lg shadow-zinc-200 font-bold transition-all hover:translate-y-[-2px]">
                  <Save className="mr-2 h-4 w-4" /> {t.saveBankSettings}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printing" className="space-y-4">
          <Card className="border-emerald-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
              <CardTitle className="text-emerald-900">{t.printingSettings}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Print Global Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-emerald-50/50 border-emerald-100">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-emerald-900">{t.autoPrint}</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!!localAutoPrint}
                    onChange={(e) => setLocalAutoPrint(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Silent Print Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50 border-blue-100">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-blue-900">{t.silentPrint}</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!!localSilentPrint}
                    onChange={(e) => setLocalSilentPrint(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {/* System Printers Section */}
              <div className="p-4 border rounded-lg bg-zinc-50 border-zinc-200">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  {t.detectedLocalPrinters}
                </h3>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">{t.selectPrinterToAdd}</Label>
                    <select
                      className="w-full h-10 border rounded-md px-3 bg-white text-sm"
                      value={selectedSystemPrinter}
                      onChange={(e) => setSelectedSystemPrinter(e.target.value)}
                    >
                      <option value="">-- {t.selectPrinterToAdd} --</option>
                      {systemPrinters.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={handleAddSystemPrinter} disabled={!selectedSystemPrinter} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.add}
                  </Button>
                </div>
              </div>

              {/* Manual Configuration Section */}
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-xs">{t.printerName}</Label>
                    <Input
                      placeholder="e.g. Kitchen Printer"
                      value={newPrinter.name}
                      onChange={(e) => setNewPrinter((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.ipAddress}</Label>
                    <Input
                      placeholder="e.g. 192.168.1.100"
                      value={newPrinter.ipAddress}
                      onChange={(e) => setNewPrinter((prev) => ({ ...prev, ipAddress: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t.location}</Label>
                    <Input
                      placeholder="e.g. Back Bar"
                      value={newPrinter.location}
                      onChange={(e) => setNewPrinter((prev) => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs opacity-0">Action</Label>
                    <div className="flex gap-2">
                      <Button onClick={handleAddOrUpdatePrinter} className="flex-1 gap-2">
                        <Plus className="h-4 w-4" />
                        {editingPrinterId ? t.updatePrinter : t.addManualPrinter}
                      </Button>
                      {editingPrinterId && (
                        <Button variant="outline" onClick={resetPrinterForm}>
                          {t.cancel}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-zinc-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-indigo-50 bg-indigo-50/20 text-left text-indigo-600">
                      <th className="p-3 font-medium">{t.default}</th>
                      <th className="p-3 font-medium">{t.enabled}</th>
                      <th className="p-3 font-medium">{t.printer}</th>
                      <th className="p-3 font-medium">{t.ipAddress}</th>
                      <th className="p-3 font-medium">{t.location}</th>
                      <th className="p-3 font-medium text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localPrinters.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-zinc-500">
                          {t.noItemsFound}
                        </td>
                      </tr>
                    ) : (
                      localPrinters.map((printer) => (
                        <tr key={printer.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                          <td className="p-3">
                            <input
                              type="radio"
                              name="default-printer"
                              checked={printer.isDefault}
                              onChange={() => handleSetDefaultPrinter(printer.id)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={printer.enabled}
                              onChange={(e) => handleTogglePrinterEnabled(printer.id, e.target.checked)}
                            />
                          </td>
                          <td className="p-3 font-medium">{printer.name}</td>
                          <td className="p-3 font-mono">{printer.ipAddress}</td>
                          <td className="p-3">{printer.location}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditPrinter(printer.id)}>
                                {t.edit}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeletePrinter(printer.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Button onClick={handleSavePrinterSettings} className="gap-2">
                <Save className="h-4 w-4" />
                {t.savePrinterSettings}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="space-y-4">
          <Card className="border-amber-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-amber-50/50 border-b border-amber-100">
              <CardTitle className="text-amber-900">{t.receiptSettings}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="header-text">{t.headerText}</Label>
                    <Input id="header-text" value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="footer-text">{t.footerText}</Label>
                    <Input id="footer-text" value={footerText} onChange={(e) => setFooterText(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">{t.storeAddress}</Label>
                    <Input id="address" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t.phoneNumber}</Label>
                    <Input id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receipt-size">{t.receiptSize}</Label>
                    <select
                      id="receipt-size"
                      value={receiptSize}
                      onChange={(e) => setReceiptSize(e.target.value as '58mm' | '80mm')}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="58mm">58mm (Thermal Printer)</option>
                      <option value="80mm">80mm (Standard Printer)</option>
                    </select>
                  </div>
                  <Button className="mt-4 gap-2" onClick={handleSaveReceiptSettings}>
                    <Save className="h-4 w-4" />
                    {t.save}
                  </Button>
                </div>

                {/* Receipt Preview */}
                <div className="flex justify-center">
                  <div className="w-[360px] bg-zinc-50 p-6 border border-zinc-200 shadow-sm font-mono text-sm">
                    <div className="text-center mb-4">
                      <h3 className="font-bold text-lg">{storeName}</h3>
                      <p className="text-xs text-zinc-500">{storeAddress}</p>
                      <p className="text-xs text-zinc-500">{phoneNumber}</p>
                    </div>
                    <div className="text-center mb-4 text-xs">
                      {headerText}
                    </div>
                    <div className="border-t border-b border-dashed border-zinc-300 py-2 my-2 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-indigo-50 bg-indigo-50/20 text-left text-indigo-600">
                            <th className="py-1 text-left font-semibold">{t.itemName}</th>
                            <th className="py-1 text-right font-semibold">{t.stock}</th>
                            <th className="py-1 text-right font-semibold">{t.price}</th>
                            <th className="py-1 text-right font-semibold">{t.total || 'Total'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-1">Item A</td>
                            <td className="py-1 text-right">1</td>
                            <td className="py-1 text-right">{currencySymbol}10.00</td>
                            <td className="py-1 text-right">{currencySymbol}10.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between font-bold mt-2">
                      <span>{t.totalSales || t.total || 'TOTAL'}</span>
                      <span>{currencySymbol}10.00</span>
                    </div>
                    <div className="text-center mt-6 text-xs">
                      {footerText}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="station" className="space-y-4">
          <Card className="border-violet-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-violet-50/50 border-b border-violet-100">
              <CardTitle className="text-violet-900">{t.stationMapping}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-500 mb-4">
                {t.mappingText}
              </p>

              <div className="rounded-md border border-zinc-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-indigo-50 bg-indigo-50/20 text-left text-indigo-600">
                      <th className="p-3 font-medium">{t.category}</th>
                      <th className="p-3 font-medium">{t.items}</th>
                      <th className="p-3 font-medium">{t.printer}</th>
                      <th className="p-3 font-medium text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localStationMappings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-zinc-500">
                          {t.noItemsFound}
                        </td>
                      </tr>
                    ) : (
                      localStationMappings.map((mapping) => {
                        const categoryItems = items.filter((item) => item.category_id === mapping.categoryId);
                        return (
                          <tr key={mapping.id} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50/50">
                            <td className="p-3">
                              <select
                                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                value={mapping.categoryId}
                                onChange={(e) => updateStationRow(mapping.id, 'categoryId', e.target.value)}
                              >
                                {categories.length === 0 ? (
                                  <option value="">{t.noItemsFound}</option>
                                ) : (
                                  categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))
                                )}
                              </select>
                            </td>
                            <td className="p-3">
                              <select
                                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                value={mapping.selectedItemId || '*'}
                                onChange={(e) => updateStationRow(mapping.id, 'selectedItemId', e.target.value)}
                                disabled={!mapping.categoryId}
                              >
                                <option value="*">{t.allItems}</option>
                                {categoryItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <select
                                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                value={mapping.printerId || ''}
                                onChange={(e) => updateStationRow(mapping.id, 'printerId', e.target.value)}
                              >
                                {localPrinters.length === 0 ? (
                                  <option value="">{t.noItemsFound}</option>
                                ) : (
                                  localPrinters.map((printer) => (
                                    <option key={printer.id} value={printer.id}>
                                      {printer.name} ({printer.ipAddress})
                                    </option>
                                  ))
                                )}
                              </select>
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteStationMapping(mapping.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={handleAddStationMapping} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t.addMapping}
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleSaveStationMappings}>
                  <Save className="h-4 w-4" />
                  {t.save}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="license" className="space-y-4">
          <Card className="border-rose-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-rose-50/50 border-b border-rose-100">
              <CardTitle className="text-rose-900">{t.licenseTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label htmlFor="license-key">{t.licenseKey}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSyncLicense}
                      disabled={isActivating}
                      title="Sync License"
                      className="shrink-0"
                    >
                      <RefreshCw className={isActivating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                    </Button>
                    <Input
                      id="license-key"
                      placeholder="POS-XXXX-XXXX-XXXX-XXXX"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      disabled={!!serverLicenseKey || licenseInfo?.active}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleViewLicenseData}
                      disabled={isActivating}
                      className="shrink-0"
                      title="View license data"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {activationMessage && (
                  <p className={`text-sm ${licenseInfo?.active ? 'text-green-600' : 'text-red-500'}`}>
                    {activationMessage}
                  </p>
                )}

                {licenseInfo?.active ? (
                  <div className="mt-6 space-y-4">
                    <div className="p-4 border border-green-200 bg-green-50 rounded-md">
                      <p className="font-semibold text-green-800">{t.activeTitle}</p>
                      <p className="text-sm text-green-700">{t.licenseStatus}</p>
                      {licenseInfo.expiresAt && (
                        <div className="space-y-1 mt-2">
                          <p className="text-xs text-green-600 font-bold">
                            {t.expires}: {licenseInfo.expiresAt} ({daysRemaining > 0 ? `${daysRemaining} ${t.daysLeft}` : 'Expired'})
                          </p>
                          {licenseInfo.renewDate && (
                            <p className="text-[11px] text-green-700/80">
                              {t.lastVerified}: {licenseInfo.renewDate}
                            </p>
                          )}
                        </div>
                      )}
                      {licenseInfo.key && (
                        <p className="text-[11px] text-green-700/80 mt-2">
                          {t.activeKey}: {licenseInfo.key}
                        </p>
                      )}
                      <p className="text-xs text-green-600 font-mono mt-2">{t.activeMachineId}: {licenseInfo.machineId}</p>
                      {licenseSyncAt && (
                        <p className="text-[11px] text-green-700/80 mt-1">
                          Last synced: {licenseSyncAt}
                        </p>
                      )}
                      {/* {licenseApiData && (
                        <div className="mt-3 rounded border border-green-200 bg-white/70 p-2 text-[11px] text-green-900">
                          <p className="font-semibold">Saved License API Data</p>
                          <ul className="mt-2 space-y-1">
                            {Object.entries(licenseApiData).map(([key, value]) => (
                              <li key={key} className="flex items-start gap-2">
                                <span className="font-mono text-[10px] text-green-800">{key}:</span>
                                <span className="break-words">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )} */}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={handleSyncLicense}
                        disabled={isActivating}
                      >
                        <RefreshCw className={isActivating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                        {t.refreshActivation}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={handleCheckActivationStatus}
                        disabled={isActivating}
                      >
                        <Eye className="h-4 w-4" />
                        {t.checkActivation}
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50"
                      onClick={handleReturnLicense}
                      disabled={isActivating}
                    >
                      {isActivating ? t.activating : t.returnLicense}
                    </Button>
                    
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {(licenseInfo.expiresAt || licenseInfo.renewDate || licenseInfo.key) && (
                      <div className="p-3 border border-red-200 bg-red-50 rounded-md">
                        {licenseInfo.expiresAt && (
                          <p className="text-xs text-red-700 font-semibold">
                            {t.expires}: {licenseInfo.expiresAt}
                          </p>
                        )}
                        {licenseInfo.renewDate && (
                          <p className="text-[11px] text-red-700/80 mt-1">
                            {t.lastVerified}: {licenseInfo.renewDate}
                          </p>
                        )}
                        {licenseInfo.key && (
                          <p className="text-[11px] text-red-700/80 mt-1">
                            {t.activeKey}: {licenseInfo.key}
                          </p>
                        )}
                        {licenseInfo.machineId && (
                          <p className="text-[11px] text-red-700/80 mt-1">
                            {t.activeMachineId}: {licenseInfo.machineId}
                          </p>
                        )}
                        {licenseSyncAt && (
                          <p className="text-[11px] text-red-700/80 mt-1">
                            Last synced: {licenseSyncAt}
                          </p>
                        )}
                        {licenseApiData && (
                          <div className="mt-2 rounded border border-red-200 bg-white/70 p-2 text-[11px] text-red-900">
                            <p className="font-semibold">Saved License API Data</p>
                            <ul className="mt-2 space-y-1">
                              {Object.entries(licenseApiData).map(([key, value]) => (
                                <li key={key} className="flex items-start gap-2">
                                  <span className="font-mono text-[10px] text-red-800">{key}:</span>
                                  <span className="break-words">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={handleActivateLicense}
                      disabled={isActivating || !licenseKey}
                    >
                      {isActivating ? t.activating : t.activate}
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={handleSyncLicense}
                        disabled={isActivating}
                      >
                        <RefreshCw className={isActivating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                        {t.refreshActivation}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={handleCheckActivationStatus}
                        disabled={isActivating}
                      >
                        <Eye className="h-4 w-4" />
                        {t.checkActivation}
                      </Button>
                    </div>
                  </div>
                )}

                {/* {licenseApiData && (
                  <div className="mt-4 rounded-md border border-zinc-200 bg-white">
                    <div className="border-b border-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700">
                      License Data
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-zinc-600">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold">License Key</th>
                            <th className="px-4 py-2 text-left font-semibold">Product</th>
                            <th className="px-4 py-2 text-left font-semibold">Status</th>
                            <th className="px-4 py-2 text-left font-semibold">Expires</th>
                            <th className="px-4 py-2 text-left font-semibold">Renew</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const row = getLicenseRow();
                            return (
                              <tr className="border-b border-indigo-50 bg-indigo-50/20 text-left text-indigo-600">
                                <td className="px-4 py-2">{row.key || '-'}</td>
                                <td className="px-4 py-2">{row.product || '-'}</td>
                                <td className="px-4 py-2">
                                  {String(row.status) || '-'}
                                </td>
                                <td className="px-4 py-2">{row.expires || '-'}</td>
                                <td className="px-4 py-2">{row.renew || '-'}</td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )} */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


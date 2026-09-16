
import { fetchAdminSettings, updateAdminSetting, uploadAdminAsset } from './admin-api.js';

export const ALLOWED_SETTINGS = {
  shipping_fee: { title: 'ค่าจัดส่งมาตรฐาน', unit: 'บาท', desc: 'ค่าบริการจัดส่งพัสดุปกติ' },
  free_shipping_threshold: { title: 'ยอดสั่งซื้อส่งฟรี', unit: 'บาท', desc: 'ยอดซื้อสุทธิที่ได้รับสิทธิ์ฟรีค่าจัดส่ง' },
  min_order_amount: { title: 'ยอดสั่งซื้อขั้นต่ำ', unit: 'บาท', desc: 'เกณฑ์ยอดรวมสินค้าขั้นต่ำที่อนุญาตให้กดยืนยันออเดอร์' },
  cod_deposit_fee: { title: 'ค่ามัดจำส่ง COD (ไป-กลับ)', unit: 'บาท', desc: 'ยอดเงินที่ลูกค้าต้องโอนมัดจำทันทีเมื่อเลือกเก็บเงินปลายทาง' }
};

class SettingsStateManager {
  constructor() {
    this.settingsMap = {};
    this.rawSettings = [];
  }

  async loadFromApi() {
    this.rawSettings = await fetchAdminSettings();
    this.settingsMap = {};
    this.rawSettings.forEach(s => {
      this.settingsMap[s.key] = s.value;
    });
    return {
      settingsMap: this.settingsMap,
      allowedList: this.rawSettings.filter(s => ALLOWED_SETTINGS[s.key])
    };
  }

  async updateSingleSetting(key, val) {
    await updateAdminSetting(key, val);
    this.settingsMap[key] = val;
    const item = this.rawSettings.find(s => s.key === key);
    if (item) item.value = val;
  }

  async saveBankDetails({ bankName, bankAcc, bankNum, qrUrl }) {
    await Promise.all([
      this.updateSingleSetting('bank_name', bankName),
      this.updateSingleSetting('bank_account_name', bankAcc),
      this.updateSingleSetting('bank_account_number', bankNum),
      this.updateSingleSetting('payment_qr_url', qrUrl)
    ]);
  }

  async uploadQrImage(file) {
    const res = await uploadAdminAsset(file);
    return res.image_url;
  }
}

export const settingsState = new SettingsStateManager();
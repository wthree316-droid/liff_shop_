import { CONFIG } from './config.js';

let cachedSettings = {
  free_shipping_threshold: 500,
  shipping_fee: 50,
  min_order_amount: 100,
  cod_deposit_fee: 80,
  bank_name: 'ธนาคารกสิกรไทย (KBANK)',
  bank_account_name: 'บจก. อาร์ทิซาน วีด',
  bank_account_number: '0987654321',
  payment_qr_url: ''
};

export async function loadStoreSettings() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/settings`);
    if (res.ok) {
      const data = await res.json();
      cachedSettings = { ...cachedSettings, ...data.settings };
    }
  } catch (e) {
    console.warn('ใช้ค่า Settings เริ่มต้น:', e);
  }
  return cachedSettings;
}

export function getStoreSettings() {
  return cachedSettings;
}
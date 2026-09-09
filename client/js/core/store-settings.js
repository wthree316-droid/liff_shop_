import { CONFIG } from './config.js';

let cachedSettings = {
  min_weight_grams: 50,
  min_weight_price: 50,
  free_shipping_threshold: 500,
  shipping_fee: 40
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
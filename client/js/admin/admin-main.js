import { setAdminAuthToken } from './admin-api.js';
import { CONFIG } from '../core/config.js';
import { loadOrders, setupOrderFilters, setupShippingModal } from './orders-view.js';
import { loadProducts, initProductsModule } from './products-view.js';
import { loadPromotions, initPromotionsModule } from './promos-view.js';
import { loadSettings } from './settings-view.js';
import { setupAssetUploads } from './ui-helpers.js';

// client/js/admin/admin-main.js
document.addEventListener('DOMContentLoaded', async () => {
  const badge = document.getElementById('admin-status-badge');
  badge.textContent = 'กำลังตรวจสอบสิทธิ์...';

  // 1. ตรวจสอบสิทธิ์ให้เสร็จสิ้นก่อน
  const isAuthed = await initAdminAuthentication();
  if (!isAuthed) {
    console.error('Admin Auth Failed');
    return; // หยุดการทำงาน ไม่ยิง request เปล่าไปหา server
  }

  // 2. เมื่อได้ Token เรียบร้อยแล้ว จึงเริ่มโหลดข้อมูล
  setupNavigationTabs();
  setupOrderFilters();
  setupShippingModal();
  initProductsModule();
  initPromotionsModule();
  setupAssetUploads();

  loadOrders();
});

async function initAdminAuthentication() {
  const badge = document.getElementById('admin-status-badge');

  if (typeof liff !== 'undefined' && CONFIG.ADMIN_LIFF_ID) {
    try {
      await liff.init({ liffId: CONFIG.ADMIN_LIFF_ID });
      
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return false;
      }

      const idToken = liff.getIDToken();
      if (!idToken) {
        throw new Error('ไม่พบ ID Token จาก LINE');
      }

      setAdminAuthToken(idToken, 'Bearer');
      localStorage.setItem('artisan_admin_auth', `Bearer ${idToken}`);

      const profile = await liff.getProfile();
      badge.textContent = `👤 ${profile.displayName}`;
      badge.className = 'text-xs bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 font-mono';
      return true;

    } catch (e) {
      console.warn('LIFF Auth Error:', e);
    }
  }

  // Fallback สำหรับเบราว์เซอร์บนคอมพิวเตอร์
  let localKey = localStorage.getItem('artisan_admin_key');
  if (!localKey) {
    localKey = prompt('กรุณาระบุ Admin API Key:');
    if (localKey) localStorage.setItem('artisan_admin_key', localKey);
  }

  if (localKey) {
    setAdminAuthToken(localKey, 'Bearer');
    localStorage.setItem('artisan_admin_auth', `Bearer ${localKey}`);
    badge.textContent = '🔑 Local Key';
    badge.className = 'text-xs bg-stone-800 px-3 py-1 rounded-full text-amber-400 font-mono';
    return true;
  }

  badge.textContent = '❌ Unauthorized';
  return false;
}

function setupNavigationTabs() {
  const tabs = [
    { btn: 'nav-orders', sec: 'section-orders', loader: loadOrders },
    { btn: 'nav-products', sec: 'section-products', loader: loadProducts },
    { btn: 'nav-promos', sec: 'section-promos', loader: loadPromotions },
    { btn: 'nav-settings', sec: 'section-settings', loader: loadSettings }
  ];

  tabs.forEach(({ btn, sec, loader }) => {
    document.getElementById(btn).addEventListener('click', () => {
      tabs.forEach(t => {
        const elBtn = document.getElementById(t.btn);
        const elSec = document.getElementById(t.sec);
        if (t.btn === btn) {
          elBtn.className = 'tab-nav py-3 border-b-2 border-amber-600 text-amber-600 font-bold';
          elSec.classList.remove('hidden');
          loader();
        } else {
          elBtn.className = 'tab-nav py-3 border-b-2 border-transparent text-stone-500 font-medium';
          elSec.classList.add('hidden');
        }
      });
    });
  });
}
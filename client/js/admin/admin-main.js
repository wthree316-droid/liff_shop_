import { setAdminAuthToken } from './admin-api.js';
import { CONFIG } from '../core/config.js';
import { loadOrders, setupOrderFilters, setupShippingModal } from './orders-view.js';
import { loadProducts, initProductsModule } from './products-view.js';
import { loadPromotions, initPromotionsModule } from './promos-view.js';
import { loadSettings } from './settings-view.js';
import { setupAssetUploads } from './ui-helpers.js';

// ควบคุมข้อความและความคืบหน้าของ Admin Splash Screen
function setAdminSplashProgress(text, percent) {
  const statusEl = document.getElementById('admin-splash-status-text');
  const barEl = document.getElementById('admin-splash-progress-bar');
  if (statusEl) statusEl.textContent = text;
  if (barEl) barEl.style.width = `${percent}%`;
}

// สั่งให้ Splash Screen ค่อยๆ จางหายไปเมื่อเตรียมระบบเสร็จสิ้น
function dismissAdminSplashScreen() {
  const splash = document.getElementById('admin-splash-screen');
  if (!splash) return;
  setAdminSplashProgress('พร้อมเข้าใช้งาน ✓', 100);
  setTimeout(() => {
    splash.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => splash.remove(), 500);
  }, 350);
}

document.addEventListener('DOMContentLoaded', async () => {
  const badge = document.getElementById('admin-status-badge');
  if (badge) badge.textContent = 'กำลังตรวจสอบสิทธิ์...';

  setAdminSplashProgress('กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...', 30);

  // 1. ตรวจสอบสิทธิ์ให้เสร็จสิ้นก่อน
  const isAuthed = await initAdminAuthentication();
  if (!isAuthed) {
    console.error('Admin Auth Failed');
    setAdminSplashProgress('ไม่ได้รับอนุญาตให้เข้าใช้งาน ✕', 100);
    return; // หยุดการทำงาน ไม่ยิง request เปล่าไปหา server
  }

  setAdminSplashProgress('กำลังตั้งค่าหน้าควบคุมและโมดูล...', 65);

  // 2. เมื่อได้ Token เรียบร้อยแล้ว จึงเริ่มโหลดข้อมูล
  setupNavigationTabs();
  setupOrderFilters();
  setupShippingModal();
  initProductsModule();
  initPromotionsModule();
  setupAssetUploads();

  setAdminSplashProgress('กำลังโหลดคำสั่งซื้อและแดชบอร์ด...', 85);
  
  // 3. โหลดออเดอร์พร้อมเรนเดอร์ตัวเลขบนแดชบอร์ด
  try {
    await loadOrders();
  } catch (err) {
    console.warn('Orders initial load warning:', err);
  } finally {
    // ปิด Splash Screen เมื่อข้อมูลพร้อมแสดงผล
    dismissAdminSplashScreen();
  }
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
      if (badge) {
        badge.textContent = `👤 ${profile.displayName}`;
        badge.className = 'text-xs bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 font-mono';
      }
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
    if (badge) {
      badge.textContent = '🔑 Local Key';
      badge.className = 'text-xs bg-stone-800 px-3 py-1 rounded-full text-amber-400 font-mono';
    }
    return true;
  }

  if (badge) badge.textContent = '❌ Unauthorized';
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
    const elBtn = document.getElementById(btn);
    if (!elBtn) return;

    elBtn.addEventListener('click', () => {
      tabs.forEach(t => {
        const targetBtn = document.getElementById(t.btn);
        const targetSec = document.getElementById(t.sec);
        if (t.btn === btn) {
          targetBtn.className = 'tab-nav flex-1 py-2 rounded-xl text-xs font-bold transition-all text-amber-900 bg-white shadow-xs';
          targetSec.classList.remove('hidden');
          loader();
        } else {
          targetBtn.className = 'tab-nav flex-1 py-2 rounded-xl text-xs font-medium transition-all text-stone-500 hover:text-stone-800';
          targetSec.classList.add('hidden');
        }
      });
    });
  });
}
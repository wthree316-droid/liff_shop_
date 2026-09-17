import { liffService } from './core/liff-service.js';
import { loadStoreSettings } from './core/store-settings.js';
import { fetchActivePromotions } from './modules/promotion/promotion-api.js';
import { renderPromotions } from './modules/promotion/promotion-ui.js';
import { fetchProducts } from './modules/catalog/catalog-api.js';
import { initCatalog } from './modules/catalog/catalog-ui.js';
import { initCartDrawer } from './modules/cart/cart-ui.js';
import { CONFIG } from './core/config.js'; 
import { showToast } from './core/toast.js';
import { promotionLogic } from './modules/promotion/promotion-logic.js';

// ควบคุมการอัปเดตข้อความและความคืบหน้าของ Splash Screen
function setSplashProgress(text, percent) {
  const statusEl = document.getElementById('splash-status-text');
  const barEl = document.getElementById('splash-progress-bar');
  if (statusEl) statusEl.textContent = text;
  if (barEl) barEl.style.width = `${percent}%`;
}

// สั่งให้ Splash Screen ค่อยๆ จางหายไปเมื่อโหลดทุกอย่างเรียบร้อย
function dismissSplashScreen() {
  const splash = document.getElementById('app-splash-screen');
  if (!splash) return;
  setSplashProgress('พร้อมให้บริการ ✓', 100);
  setTimeout(() => {
    splash.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => splash.remove(), 500);
  }, 350);
}

document.addEventListener('DOMContentLoaded', async () => {
  const userBadge = document.getElementById('user-badge');
  setSplashProgress('กำลังเชื่อมต่อ LINE...', 25);

  // 1. เริ่มต้น LIFF SDK
  const profile = await liffService.init();

  if (profile) {
    userBadge.textContent = `👤 ${profile.displayName}`;
    userBadge.classList.replace('text-stone-300', 'text-amber-400');
    
    const custNameInput = document.getElementById('cust-name');
    if (custNameInput && !custNameInput.value) {
      custNameInput.value = profile.displayName;
    }
  } else {
    userBadge.textContent = 'โหมดทดสอบ (Browser)';
  }

  // หากไม่ได้เปิดผ่าน LINE Client และไม่อยู่ใน localhost ให้ล็อกหน้าจอ
  if (!liffService.isInClient && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    dismissSplashScreen();
    document.body.innerHTML = `
      <div class="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <span class="text-5xl mb-4">🍵</span>
        <h2 class="text-lg font-bold">กรุณาเปิดผ่าน LINE Official Account</h2>
        <p class="text-xs text-stone-400 mt-2 max-w-xs leading-relaxed">เพื่อการส่งใบเสร็จ สรุปรายการ และแนบสลิปยืนยันอัตโนมัติ กรุณาทำรายการผ่านห้องแชทของทางร้านครับ</p>
        <a href="https://liff.line.me/${CONFIG.LIFF_ID}" class="mt-6 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-xs font-bold shadow-lg transition">
          เปิดใน LINE
        </a>
      </div>
    `;
    return;
  }

  setSplashProgress('กำลังโหลดข้อมูลร้านค้า...', 55);

  // 2. โหลดคอนฟิกเกณฑ์ร้านค้า
  await loadStoreSettings();

  // Elements สำหรับ Promo Modal
  const promoSlider = document.getElementById('promotions-slider');
  const promoModal = {
    modal: document.getElementById('promo-modal'),
    img: document.getElementById('modal-promo-img'),
    title: document.getElementById('modal-promo-title'),
    desc: document.getElementById('modal-promo-desc'),
    code: document.getElementById('modal-promo-code'),
    copyBtn: document.getElementById('btn-copy-code')
  };

  const btnCloseModal = document.getElementById('btn-close-modal');
  if (btnCloseModal && promoModal.modal) {
    btnCloseModal.addEventListener('click', () => {
      promoModal.modal.close();
    });
  }

  // Elements แคตตาล็อก
  const productContainer = document.getElementById('product-list');
  const categoryTabs = document.getElementById('category-tabs');

  // เริ่มต้น Cart Drawer (ควบคุมทั้ง Drawer และ Floating Cart Bar ภายในตัว)
  initCartDrawer();

  // 3. ดึงข้อมูลสินค้าและโปรโมชั่นพร้อมกัน
  try {
    setSplashProgress('จัดเตรียมเมนูสินค้าและโปรโมชั่น...', 85);
    const [promotions, products] = await Promise.all([
      fetchActivePromotions(),
      fetchProducts()
    ]);

    promotionLogic.setPromotions(promotions);

    if (promoSlider && promoModal.modal) {
      renderPromotions(promotions, promoSlider, promoModal);
    }
    if (productContainer && categoryTabs) {
      initCatalog(products, productContainer, categoryTabs);
    }

    // ทุกอย่างพร้อมใช้งานแล้ว ปิด Splash Screen
    dismissSplashScreen();

  } catch (error) {
    console.error('Initial load failed:', error);
    dismissSplashScreen();
    showToast(`โหลดข้อมูลไม่สำเร็จ: ${error.message || error}`, 'error');
  }
});
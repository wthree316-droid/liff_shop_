import { cartState } from '../../core/state.js';
import { liffService } from '../../core/liff-service.js';
import { getStoreSettings } from '../../core/store-settings.js';
import { apiClient } from '../../core/api-client.js';
import { submitOrder } from './order-api.js'; 

let appliedPromoData = null;

// Helper คำนวณราคาตาม Tier
function getItemPrice(item) {
  const { product, quantityOrWeight } = item;
  if (product.type === 'BY_WEIGHT' && Array.isArray(product.price_tiers) && product.price_tiers.length > 0) {
    const sorted = [...product.price_tiers].sort((a, b) => b.min_weight - a.min_weight);
    const match = sorted.find((t) => quantityOrWeight >= t.min_weight);
    const unitPrice = match ? match.price_per_unit : product.price_per_unit;
    return quantityOrWeight * unitPrice;
  }
  return quantityOrWeight * product.price_per_unit;
}

export function initCartDrawer() {
  createCartDrawerDOM();
  setupEventListeners();

  cartState.subscribe(() => {
    renderDrawerItems();
    updateOrderSummary();
  });
}

function createCartDrawerDOM() {
  const drawerContainer = document.createElement('div');
  drawerContainer.id = 'cart-drawer-wrapper';
  drawerContainer.innerHTML = `
    <div id="drawer-backdrop" class="fixed inset-0 bg-stone-900/60 z-50 hidden transition-opacity"></div>

    <div id="cart-drawer" class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl z-50 transform translate-y-full transition-transform duration-300 max-h-[90vh] flex flex-col">
      
      <!-- Drawer Header & Shipping Bar -->
      <div class="px-5 pt-4 pb-3 border-b border-stone-100 flex-shrink-0 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-stone-900">ตะกร้าสินค้า</h2>
            <span id="drawer-item-badge" class="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono">0 รายการ</span>
          </div>
          <button id="btn-close-drawer" class="text-stone-400 hover:text-stone-600 text-2xl font-bold p-1 leading-none">&times;</button>
        </div>

        <!-- Free Shipping Progress -->
        <div class="bg-stone-50 p-2.5 rounded-2xl border border-stone-200/60 space-y-1.5">
          <div class="flex justify-between text-[11px] font-medium">
            <span id="shipping-progress-text" class="text-stone-600">ซื้อเพิ่มอีก ฿0 เพื่อส่งฟรี</span>
            <span id="shipping-progress-target" class="text-amber-700 font-bold font-mono">฿500</span>
          </div>
          <div class="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div id="shipping-progress-bar" class="h-full bg-amber-600 rounded-full transition-all duration-300" style="width: 0%"></div>
          </div>
        </div>
      </div>

      <!-- Items List -->
      <div id="drawer-items-list" class="p-5 overflow-y-auto space-y-2.5 flex-1"></div>

      <!-- Customer Form & Checkout Summary -->
      <div class="p-5 border-t border-stone-100 bg-stone-50 rounded-b-3xl space-y-3 flex-shrink-0">
        
        <!-- Promo Code Input -->
        <div class="flex gap-2">
          <input type="text" id="input-promo-code" placeholder="รหัสส่วนลด" class="flex-1 px-3 py-2 text-xs border border-stone-200 rounded-xl uppercase font-mono tracking-wider focus:outline-none focus:border-amber-600 bg-white" />
          <button id="btn-apply-promo" type="button" class="bg-stone-900 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-all">ใช้โค้ด</button>
        </div>
        <div id="promo-status-msg" class="text-[11px] hidden font-medium"></div>

        <!-- Shipping Details -->
        <div class="space-y-2 text-xs">
          <input type="text" id="cust-name" placeholder="ชื่อ-นามสกุล ผู้รับ *" class="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-600 bg-white" required />
          <input type="tel" id="cust-phone" maxlength="10" placeholder="เบอร์โทรศัพท์ 10 หลัก *" class="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-600 bg-white" required />
          <textarea id="cust-address" rows="2" placeholder="ที่อยู่จัดส่งโดยละเอียด *" class="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-600 bg-white" required></textarea>
        </div>

        <!-- Price Breakdown -->
        <div class="text-xs space-y-1 pt-1 text-stone-500 border-t border-stone-200/60 font-medium">
          <div class="flex justify-between"><span>ยอดรวมสินค้า</span><span id="drawer-subtotal" class="font-mono text-stone-800">฿0.00</span></div>
          <div class="flex justify-between text-emerald-600"><span>ส่วนลด</span><span id="drawer-discount" class="font-mono">-฿0.00</span></div>
          <div class="flex justify-between"><span>ค่าจัดส่ง</span><span id="drawer-shipping" class="font-mono text-stone-800">฿0.00</span></div>
        </div>

        <div id="order-error-msg" class="text-xs text-red-500 hidden font-medium"></div>

        <button id="btn-submit-order" class="w-full bg-amber-600 hover:bg-amber-500 active:scale-95 text-white py-3 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-between px-5">
          <span>ยืนยันคำสั่งซื้อ</span>
          <span id="drawer-grand-total" class="font-mono text-base">฿0.00</span>
        </button>
      </div>
    </div>

    <!-- Success Modal -->
    <dialog id="order-success-modal" class="rounded-3xl p-0 backdrop:bg-stone-900/60 max-w-sm w-full mx-auto shadow-2xl">
      <div class="bg-white p-6 rounded-3xl text-center space-y-4">
        <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
        <div>
          <h3 class="text-lg font-bold text-stone-900">สั่งซื้อสำเร็จแล้ว!</h3>
          <p class="text-xs text-stone-500 mt-0.5">รหัสคำสั่งซื้อของคุณ</p>
          <p id="success-order-id" class="font-mono text-xs font-bold bg-stone-100 p-2 rounded-xl mt-1.5 select-all text-stone-800"></p>
        </div>
        
        <div class="bg-stone-50 p-3.5 rounded-2xl text-left text-xs space-y-1.5 text-stone-600 border border-stone-100">
          <div class="flex justify-between"><span>ยอดรวมสินค้า:</span><span id="summary-subtotal">-</span></div>
          <div class="flex justify-between text-emerald-600"><span>ส่วนลด:</span><span id="summary-discount">-</span></div>
          <div class="flex justify-between"><span>ค่าจัดส่ง:</span><span id="summary-shipping">-</span></div>
          <div class="flex justify-between font-bold text-stone-900 border-t border-stone-200 pt-1.5 text-sm"><span>ยอดสุทธิ:</span><span id="summary-grand" class="text-amber-700 font-mono">-</span></div>
        </div>

        <button id="btn-finish-order" class="w-full py-3 bg-stone-900 text-white rounded-2xl text-xs font-bold active:scale-95 transition-transform">
          กลับสู่หน้าร้าน
        </button>
      </div>
    </dialog>
  `;

  document.body.appendChild(drawerContainer);
}

function setupEventListeners() {
  const backdrop = document.getElementById('drawer-backdrop');
  const drawer = document.getElementById('cart-drawer');
  const closeBtn = document.getElementById('btn-close-drawer');
  const openBtn = document.getElementById('floating-cart-bar');
  const submitBtn = document.getElementById('btn-submit-order');
  const applyPromoBtn = document.getElementById('btn-apply-promo');
  const finishBtn = document.getElementById('btn-finish-order');
  const successModal = document.getElementById('order-success-modal');

  const openDrawer = () => {
    backdrop.classList.remove('hidden');
    drawer.classList.remove('translate-y-full');
    updateOrderSummary();
  };

  const closeDrawer = () => {
    backdrop.classList.add('hidden');
    drawer.classList.add('translate-y-full');
  };

  if (openBtn) openBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);

  applyPromoBtn.addEventListener('click', handleValidatePromotion);
  submitBtn.addEventListener('click', handleOrderSubmission);

  finishBtn.addEventListener('click', () => {
    successModal.close();
    closeDrawer();
    if (liffService.isInClient) {
      liffService.closeWindow();
    }
  });
}

function updateOrderSummary() {
  const items = cartState.getItems();
  const settings = getStoreSettings();
  const freeThreshold = Number(settings.free_shipping_threshold) || 500;
  const baseShippingFee = Number(settings.shipping_fee) || 40;

  const subtotal = items.reduce((sum, item) => sum + getItemPrice(item), 0);
  
  // Progress Bar ส่งฟรี
  const progressText = document.getElementById('shipping-progress-text');
  const progressBar = document.getElementById('shipping-progress-bar');
  const progressTarget = document.getElementById('shipping-progress-target');
  if (progressTarget) progressTarget.textContent = `฿${freeThreshold}`;

  if (subtotal >= freeThreshold) {
    if (progressText) progressText.innerHTML = '🎉 <strong class="text-emerald-600">ยินดีด้วย! คุณได้รับสิทธิ์ส่งฟรี</strong>';
    if (progressBar) progressBar.style.width = '100%';
  } else {
    const diff = freeThreshold - subtotal;
    const pct = Math.min(100, Math.round((subtotal / freeThreshold) * 100));
    if (progressText) progressText.textContent = `ซื้อเพิ่มอีก ฿${diff.toFixed(2)} เพื่อส่งฟรี`;
    if (progressBar) progressBar.style.width = `${pct}%`;
  }

  const shippingFee = (subtotal >= freeThreshold || items.length === 0) ? 0 : baseShippingFee;

  let discountAmount = 0;
  if (appliedPromoData) {
    if (appliedPromoData.discount_type === 'PERCENTAGE') {
      discountAmount = (subtotal * appliedPromoData.discount_value) / 100;
      if (appliedPromoData.max_discount_amount) {
        discountAmount = Math.min(discountAmount, appliedPromoData.max_discount_amount);
      }
    } else {
      discountAmount = appliedPromoData.discount_value;
    }
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const elSubtotal = document.getElementById('drawer-subtotal');
  const elDiscount = document.getElementById('drawer-discount');
  const elShipping = document.getElementById('drawer-shipping');
  const elGrandTotal = document.getElementById('drawer-grand-total');

  if (elSubtotal) elSubtotal.textContent = `฿${subtotal.toFixed(2)}`;
  if (elDiscount) elDiscount.textContent = `-฿${discountAmount.toFixed(2)}`;
  if (elShipping) elShipping.textContent = `฿${shippingFee.toFixed(2)}`;
  if (elGrandTotal) elGrandTotal.textContent = `฿${grandTotal.toFixed(2)}`;
}

function renderDrawerItems() {
  const items = cartState.getItems();
  const container = document.getElementById('drawer-items-list');
  const badge = document.getElementById('drawer-item-badge');

  badge.textContent = `${items.length} รายการ`;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-stone-400 text-xs">
        <span class="text-3xl block mb-2">🛒</span>
        ไม่มีสินค้าในตะกร้า
      </div>
    `;
    return;
  }

  container.innerHTML = items
    .map((item, index) => {
      const isWeight = item.product.type === 'BY_WEIGHT';
      const unit = isWeight ? 'g' : 'ชิ้น';
      const variantText = item.selectedVariant ? `• ${item.selectedVariant}` : '';
      const lineTotal = getItemPrice(item);

      return `
      <div class="flex items-center justify-between bg-stone-50 border border-stone-200/70 p-3 rounded-2xl">
        <div class="flex-1 min-w-0 pr-2">
          <p class="text-xs font-bold text-stone-900 truncate">${item.product.name}</p>
          <p class="text-[11px] text-stone-500 font-medium">${item.quantityOrWeight}${unit} ${variantText}</p>
        </div>
        <div class="text-right shrink-0 flex items-center gap-3">
          <span class="text-xs font-bold text-stone-900 font-mono">฿${lineTotal.toFixed(2)}</span>
          <button data-index="${index}" class="btn-remove-item text-xs text-stone-400 hover:text-red-500 font-medium transition-colors">
            ✕
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  container.querySelectorAll('.btn-remove-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      const target = items[idx];
      cartState.removeItem(target.product.id, target.selectedVariant);
    });
  });
}

async function handleValidatePromotion() {
  const code = document.getElementById('input-promo-code').value.trim().toUpperCase();
  const msgEl = document.getElementById('promo-status-msg');
  const items = cartState.getItems();
  const subtotal = items.reduce((sum, item) => sum + getItemPrice(item), 0);

  if (!code) {
    appliedPromoData = null;
    msgEl.classList.add('hidden');
    updateOrderSummary();
    return;
  }

  try {
    const data = await apiClient('/promotions/validate', {
      method: 'POST',
      body: JSON.stringify({ code, order_amount: subtotal })
    });

    appliedPromoData = data;
    msgEl.textContent = `✓ ใช้โค้ด "${code}" สำเร็จ`;
    msgEl.className = 'text-[11px] text-emerald-600 font-medium block';
    updateOrderSummary();
  } catch (err) {
    appliedPromoData = null;
    msgEl.textContent = `✕ ${err.message}`;
    msgEl.className = 'text-[11px] text-red-500 font-medium block';
    updateOrderSummary();
  }
}

async function handleOrderSubmission() {
  const submitBtn = document.getElementById('btn-submit-order');
  const errorMsg = document.getElementById('order-error-msg');
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const promoCode = document.getElementById('input-promo-code').value.trim().toUpperCase();
  const items = cartState.getItems();

  errorMsg.classList.add('hidden');

  if (items.length === 0) {
    errorMsg.textContent = 'กรุณาเลือกสินค้าลงตะกร้าก่อนสั่งซื้อ';
    errorMsg.classList.remove('hidden');
    return;
  }

  if (!name || !phone || !address) {
    errorMsg.textContent = 'กรุณากรอกชื่อ เบอร์โทร และที่อยู่จัดส่งให้ครบถ้วน';
    errorMsg.classList.remove('hidden');
    return;
  }

  if (!/^0[0-9]{9}$/.test(phone)) {
    errorMsg.textContent = 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0';
    errorMsg.classList.remove('hidden');
    return;
  }

  const lineUserId = liffService.getUserId();

  const payload = {
    line_user_id: lineUserId,
    customer: { name, phone, address, note: '' },
    items: items.map((item) => ({
      product_id: item.product.id,
      quantity_or_weight: item.quantityOrWeight,
      selected_variant: item.selectedVariant
    })),
    promo_code: promoCode || null
  };

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>กำลังบันทึกคำสั่งซื้อ...</span>';

  try {
    // เรียกใช้ฟังก์ชัน submitOrder จาก order-api.js
    const result = await submitOrder(payload);

    cartState.clearCart();
    appliedPromoData = null;
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('cust-address').value = '';
    document.getElementById('input-promo-code').value = '';

    await liffService.sendOrderSummaryToChat(result);

    document.getElementById('success-order-id').textContent = result.order_id;
    document.getElementById('summary-subtotal').textContent = `฿${result.subtotal.toFixed(2)}`;
    document.getElementById('summary-discount').textContent = `-฿${result.discount_amount.toFixed(2)}`;
    document.getElementById('summary-shipping').textContent = `฿${result.shipping_fee.toFixed(2)}`;
    document.getElementById('summary-grand').textContent = `฿${result.grand_total.toFixed(2)}`;

    const finishBtn = document.getElementById('btn-finish-order');
    if (liffService.isInClient) {
      finishBtn.textContent = 'เสร็จสิ้น (กลับสู่ห้องแชท LINE)';
    }

    const successModal = document.getElementById('order-success-modal');
    successModal.showModal();
  } catch (err) {
    errorMsg.textContent = err.message || 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ';
    errorMsg.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    updateOrderSummary();
  }
}
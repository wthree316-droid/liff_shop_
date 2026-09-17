import { cartState } from '../../core/state.js';
import { liffService } from '../../core/liff-service.js';
import { getStoreSettings } from '../../core/store-settings.js';
import { submitOrder } from './order-api.js';
import { cartLogic } from './cart-logic.js';
import { showToast } from '../../core/toast.js';

export function initCartDrawer() {
  createCartDrawerDOM();
  setupEventListeners();

  cartState.subscribe(() => {
    renderDrawerItems();
    updateOrderSummary();
    updateFloatingCartBar();
  });
}

function updateFloatingCartBar() {
  const bar = document.getElementById('floating-cart-bar');
  if (!bar) return;

  const items = cartState.getItems();
  if (items.length === 0) {
    bar.classList.add('hidden');
    return;
  }

  bar.classList.remove('hidden');

  const totalCount = items.reduce((sum, item) => sum + (item.count || 1), 0);
  const totalAmount = items.reduce((sum, item) => sum + (cartLogic.getItemPrice(item) * (item.count || 1)), 0);

  const countEl = document.getElementById('cart-item-count');
  const priceEl = document.getElementById('cart-total-price');

  if (countEl) countEl.textContent = totalCount;
  if (priceEl) priceEl.textContent = `฿${totalAmount.toFixed(2)}`;
}

function createCartDrawerDOM() {
  const drawerContainer = document.createElement('div');
  drawerContainer.id = 'cart-drawer-wrapper';
  drawerContainer.innerHTML = `
    <div id="drawer-backdrop" class="fixed inset-0 bg-stone-900/60 z-50 hidden transition-opacity"></div>

    <div id="cart-drawer" class="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl z-50 transform translate-y-full transition-transform duration-300 max-h-[92vh] flex flex-col">
      
      <!-- Drawer Header & Shipping Bar -->
      <div class="px-5 pt-4 pb-3 border-b border-stone-100 flex-shrink-0 space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-stone-900">ตะกร้าสินค้า</h2>
            <span id="drawer-item-badge" class="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono">0 รายการ</span>
          </div>
          <button id="btn-close-drawer" class="text-stone-400 hover:text-stone-600 text-2xl font-bold p-1 leading-none">&times;</button>
        </div>

        <!-- Free Shipping Progress -->
        <div id="free-shipping-box" class="bg-stone-50 p-2.5 rounded-2xl border border-stone-200/60 space-y-1.5 transition-all">
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
      <div class="p-5 border-t border-stone-100 bg-stone-50 rounded-b-3xl space-y-3.5 flex-shrink-0 overflow-y-auto max-h-[60vh]">
        
        <!-- Promo Code Input -->
        <div class="flex gap-2">
          <input type="text" id="input-promo-code" placeholder="รหัสส่วนลด" class="flex-1 px-3 py-2 text-xs border border-stone-200 rounded-xl uppercase font-mono tracking-wider focus:outline-none focus:border-amber-600 bg-white" />
          <button id="btn-apply-promo" type="button" class="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-all">ใช้โค้ด</button>
        </div>
        <div id="promo-status-msg" class="text-[11px] hidden font-medium"></div>

        <!-- Shipping Details -->
        <div class="space-y-2 text-xs">
          <div class="flex justify-between items-center px-0.5">
            <label class="text-[11px] font-bold text-stone-700">ข้อมูลจัดส่งพัสดุ</label>
            <span id="saved-address-indicator" class="text-[10px] text-emerald-600 font-medium hidden">✓ ดึงข้อมูลเดิมแล้ว</span>
          </div>
          <input type="text" id="cust-name" placeholder="ชื่อ-นามสกุล ผู้รับ *" class="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-600 bg-white" required />
          <input type="tel" id="cust-phone" maxlength="10" placeholder="เบอร์โทรศัพท์ 10 หลัก *" class="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-600 bg-white font-mono" required />
          <textarea id="cust-address" rows="2" placeholder="ที่อยู่จัดส่งโดยละเอียด (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์) *" class="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-600 bg-white leading-relaxed" required></textarea>
        </div>

        <!-- Payment Method Selection -->
        <div class="space-y-1.5 pt-1">
          <label class="text-[11px] font-bold text-stone-700 block">เลือกวิธีชำระเงิน *</label>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex items-center gap-2 p-2.5 bg-white border border-stone-200 rounded-xl cursor-pointer has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50/50 transition-all">
              <input type="radio" name="payment_method" value="TRANSFER" class="accent-amber-600" checked />
              <span class="text-xs font-semibold text-stone-800">โอนเงินเต็มจำนวน</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 bg-white border border-stone-200 rounded-xl cursor-pointer has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50/50 transition-all">
              <input type="radio" name="payment_method" value="COD" class="accent-amber-600" />
              <span class="text-xs font-semibold text-stone-800">เก็บเงินปลายทาง (COD)</span>
            </label>
          </div>
        </div>

        <!-- COD Consent Box -->
        <div id="cod-consent-box" class="hidden bg-amber-50/80 border border-amber-200 p-3 rounded-2xl space-y-2 text-stone-700">
          <div class="flex items-start gap-2">
            <input type="checkbox" id="cod-consent-checkbox" class="mt-0.5 accent-amber-600 w-4 h-4 rounded cursor-pointer" />
            <label for="cod-consent-checkbox" class="text-[11px] leading-relaxed cursor-pointer select-none">
              <strong>เงื่อนไขเก็บเงินปลายทาง:</strong> ผู้ซื้อยินยอมมัดจำค่าจัดส่ง และยินยอมชำระค่าส่งทั้งขาไปและขากลับหากปฏิเสธการรับพัสดุทุกกรณี
            </label>
          </div>
          <p class="text-[10px] text-amber-800 font-medium pl-6">
            * ระบบจะให้โอนมัดจำค่าจัดส่งไป-กลับทันทีหลังจากกดสั่งซื้อ
          </p>
        </div>

        <!-- Price Breakdown -->
        <div class="text-xs space-y-1.5 pt-1 text-stone-500 border-t border-stone-200/60 font-medium">
          <div class="flex justify-between"><span>ยอดรวมสินค้า</span><span id="drawer-subtotal" class="font-mono text-stone-800 font-bold">฿0.00</span></div>
          <div class="flex justify-between text-emerald-600"><span>ส่วนลด</span><span id="drawer-discount" class="font-mono font-bold">-฿0.00</span></div>
          <div class="flex justify-between">
            <span id="shipping-fee-label">ค่าจัดส่ง</span>
            <span id="drawer-shipping" class="font-mono text-stone-800 font-bold">฿0.00</span>
          </div>
        </div>

        <div id="order-error-msg" class="text-xs text-red-500 hidden font-medium"></div>

        <button id="btn-submit-order" class="w-full bg-amber-600 hover:bg-amber-500 active:scale-95 text-white py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-between px-5">
          <span>ดำเนินการชำระเงิน</span>
          <span id="drawer-grand-total" class="font-mono text-base">฿0.00</span>
        </button>
      </div>
    </div>

    <!-- Enhanced Success / Payment Modal -->
    <dialog id="order-success-modal" class="rounded-3xl p-0 backdrop:bg-stone-900/70 max-w-sm w-full mx-auto shadow-2xl border border-stone-200">
      <div class="bg-white p-5 rounded-3xl text-center space-y-3.5 max-h-[90vh] overflow-y-auto">
        <div class="w-11 h-11 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
        
        <div>
          <h3 class="text-base font-bold text-stone-900">สั่งซื้อสำเร็จ! กรุณาชำระเงิน</h3>
          <p id="success-order-id" class="font-mono text-[11px] font-bold text-stone-500 mt-0.5 select-all"></p>
        </div>

        <!-- กล่องข้อมูลชำระเงิน & QR Code -->
        <div class="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3">
          <div>
            <span id="payment-prompt-label" class="text-[11px] text-stone-500 block font-medium">ยอดที่ต้องโอนชำระตอนนี้</span>
            <p id="deposit-due-display" class="text-2xl font-mono font-extrabold text-amber-700">฿0.00</p>
            <p id="cod-remaining-note" class="text-[11px] text-stone-600 font-medium hidden mt-0.5"></p>
          </div>

          <!-- รูปภาพ QR Code -->
          <div id="qr-container" class="w-44 h-44 mx-auto bg-white p-2 rounded-2xl border border-stone-200 shadow-xs hidden flex items-center justify-center">
            <img id="payment-qr-img" src="" alt="Payment QR" class="w-full h-full object-contain" />
          </div>

          <!-- รายละเอียดบัญชีธนาคาร -->
          <div class="text-left text-xs bg-white p-3 rounded-xl border border-stone-100 space-y-1">
            <div class="flex justify-between"><span class="text-stone-400">ธนาคาร:</span><strong id="bank-name" class="text-stone-800"></strong></div>
            <div class="flex justify-between"><span class="text-stone-400">เลขที่บัญชี:</span><strong id="bank-number" class="text-amber-800 font-mono text-sm select-all"></strong></div>
            <div class="flex justify-between"><span class="text-stone-400">ชื่อบัญชี:</span><span id="bank-acc-name" class="text-stone-800 font-medium"></span></div>
          </div>
        </div>

        <!-- กล่องแจ้งเตือนส่งสลิปเข้าแชท LINE -->
        <div class="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl text-left flex items-center gap-2.5">
          <span class="text-xl shrink-0">📸</span>
          <p class="text-[11px] text-emerald-900 leading-snug font-medium">
            โอนเงินเรียบร้อยแล้ว สามารถ<strong>แนบส่งรูปสลิปเข้ามาในห้องแชท LINE นี้</strong>ได้เลยครับ ร้านค้าจะรีบตรวจสอบให้ทันที
          </p>
        </div>

        <button id="btn-finish-order" class="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold active:scale-95 transition-all shadow-md">
          ฉันโอนเงินแล้ว / ส่งสลิปในแชท ➔
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
    autofillSavedAddress();
    updateOrderSummary();
  };

  const closeDrawer = () => {
    backdrop.classList.add('hidden');
    drawer.classList.add('translate-y-full');
  };

  if (openBtn) openBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);

  const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
  const codBox = document.getElementById('cod-consent-box');
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      cartLogic.setPaymentMethod(e.target.value);
      if (e.target.value === 'COD') {
        codBox.classList.remove('hidden');
      } else {
        codBox.classList.add('hidden');
      }
      updateOrderSummary();
    });
  });

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

function autofillSavedAddress() {
  const saved = cartLogic.loadSavedCustomer();
  if (!saved) return;

  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const addrInput = document.getElementById('cust-address');
  const indicator = document.getElementById('saved-address-indicator');

  if (nameInput && !nameInput.value && saved.name) nameInput.value = saved.name;
  if (phoneInput && !phoneInput.value && saved.phone) phoneInput.value = saved.phone;
  if (addrInput && !addrInput.value && saved.address) addrInput.value = saved.address;

  if (indicator && (saved.name || saved.address)) {
    indicator.classList.remove('hidden');
  }
}

function updateOrderSummary() {
  const summary = cartLogic.calculateSummary();
  const freeBox = document.getElementById('free-shipping-box');
  const progressText = document.getElementById('shipping-progress-text');
  const progressBar = document.getElementById('shipping-progress-bar');
  const progressTarget = document.getElementById('shipping-progress-target');

  if (progressTarget) progressTarget.textContent = `฿${summary.freeThreshold}`;

  const isCod = cartLogic.getPaymentMethod() === 'COD';

  if (isCod) {
    if (freeBox) freeBox.classList.add('opacity-40', 'pointer-events-none');
    if (progressText) progressText.textContent = 'บริการ COD ไม่เข้าร่วมโปรโมชั่นส่งฟรี';
    if (progressBar) progressBar.style.width = '0%';
  } else {
    if (freeBox) freeBox.classList.remove('opacity-40', 'pointer-events-none');
    if (summary.isFreeShipping) {
      if (progressText) progressText.innerHTML = '🎉 <strong class="text-emerald-600">ยินดีด้วย! คุณได้รับสิทธิ์ส่งฟรี</strong>';
      if (progressBar) progressBar.style.width = '100%';
    } else {
      if (progressText) progressText.textContent = `ซื้อเพิ่มอีก ฿${summary.freeShippingDiff.toFixed(2)} เพื่อส่งฟรี`;
      if (progressBar) progressBar.style.width = `${summary.freeShippingProgress}%`;
    }
  }

  const elSubtotal = document.getElementById('drawer-subtotal');
  const elDiscount = document.getElementById('drawer-discount');
  const elShipping = document.getElementById('drawer-shipping');
  const elGrandTotal = document.getElementById('drawer-grand-total');
  const submitBtn = document.getElementById('btn-submit-order');

  if (elSubtotal) elSubtotal.textContent = `฿${summary.subtotal.toFixed(2)}`;
  if (elDiscount) elDiscount.textContent = `-฿${summary.discountAmount.toFixed(2)}`;
  if (elShipping) elShipping.textContent = `฿${summary.shippingFee.toFixed(2)}`;
  if (elGrandTotal) elGrandTotal.textContent = `฿${summary.grandTotal.toFixed(2)}`;

  // ปรับการแสดงผลปุ่มชำระเงินตามวิธีที่เลือก
  if (submitBtn) {
    if (isCod) {
      submitBtn.innerHTML = `
        <div class="text-left">
          <span class="block text-[11px] opacity-90">โอนมัดจำค่าจัดส่งทันที</span>
          <span class="text-xs text-amber-100 font-normal block">(ชำระปลายทาง ฿${summary.remainingCod.toFixed(2)})</span>
        </div>
        <span class="font-mono text-base font-bold">฿${summary.depositAmount.toFixed(2)}</span>
      `;
    } else {
      submitBtn.innerHTML = `
        <span>โอนชำระเงินเต็มจำนวน</span>
        <span class="font-mono text-base font-bold">฿${summary.depositAmount.toFixed(2)}</span>
      `;
    }
  }
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
      const count = item.count || 1;
      const variantText = item.selectedVariant ? `• ${item.selectedVariant}` : '';
      const lineTotal = cartLogic.getItemPrice(item) * count;

      return `
        <div class="flex items-center justify-between bg-stone-50 border border-stone-200/70 p-3 rounded-2xl">
          <div class="flex-1 min-w-0 pr-2">
            <p class="text-xs font-bold text-stone-900 truncate">${item.product.name}</p>
            <p class="text-[11px] text-stone-500 font-medium">
              ${item.quantityOrWeight}${unit} ${variantText} 
              <span class="text-amber-700 font-bold ml-1">x ${count}</span>
            </p>
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

  if (!code) {
    cartLogic.clearPromo();
    msgEl.classList.add('hidden');
    updateOrderSummary();
    return;
  }

  try {
    await cartLogic.validatePromoCode(code);
    msgEl.textContent = `✓ ใช้โค้ด "${code}" สำเร็จ`;
    msgEl.className = 'text-[11px] text-emerald-600 font-medium block';
    showToast(`ใช้โค้ดส่วนลด "${code}" สำเร็จ`, 'success');
    updateOrderSummary();
  } catch (err) {
    msgEl.textContent = `✕ ${err.message}`;
    msgEl.className = 'text-[11px] text-red-500 font-medium block';
    showToast(err.message, 'error');
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
  const settings = getStoreSettings();

  const minOrderAmount = Number(settings.min_order_amount) || 100;
  const currentSubtotal = items.reduce((sum, item) => sum + (cartLogic.getItemPrice(item) * (item.count || 1)), 0);

  if (currentSubtotal < minOrderAmount) {
    errorMsg.textContent = `ยอดสั่งซื้อขั้นต่ำของทางร้านคือ ฿${minOrderAmount.toFixed(2)} (ยอดปัจจุบัน ฿${currentSubtotal.toFixed(2)})`;
    errorMsg.classList.remove('hidden');
    return;
  }

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

  let codConsent = false;
  if (cartLogic.getPaymentMethod() === 'COD') {
    const consentCheckbox = document.getElementById('cod-consent-checkbox');
    if (!consentCheckbox || !consentCheckbox.checked) {
      errorMsg.textContent = 'กรุณาทำเครื่องหมายยินยอมเงื่อนไขค่าจัดส่งสำหรับบริการเก็บเงินปลายทาง';
      errorMsg.classList.remove('hidden');
      return;
    }
    codConsent = true;
  }

  errorMsg.classList.add('hidden');
  const lineUserId = liffService.getUserId();

  const payload = {
    line_user_id: lineUserId,
    customer: { name, phone, address, note: '' },
    items: items.map((item) => ({
      product_id: item.product.id,
      quantity_or_weight: item.quantityOrWeight,
      selected_variant: item.selectedVariant,
      count: item.count || 1
    })),
    promo_code: promoCode || null,
    payment_method: cartLogic.getPaymentMethod(),
    cod_consent: codConsent
  };

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>กำลังบันทึกคำสั่งซื้อ...</span>';

  try {
    const result = await submitOrder(payload);

    // เซฟที่อยู่ลง localStorage ไว้ใช้ครั้งหน้า
    cartLogic.saveCustomer({ name, phone, address });

    cartState.clearCart();
    cartLogic.clearPromo();
    document.getElementById('input-promo-code').value = '';

    document.getElementById('success-order-id').textContent = `รหัสคำสั่งซื้อ #${result.order_id.slice(0, 8)}`;
    
    const promptLabel = document.getElementById('payment-prompt-label');
    const depositDisplay = document.getElementById('deposit-due-display');
    const codNote = document.getElementById('cod-remaining-note');

    if (result.payment_method === 'COD') {
      promptLabel.textContent = 'ยอดมัดจำค่าจัดส่ง (ต้องโอนทันที)';
      depositDisplay.textContent = `฿${Number(result.deposit_amount || 0).toFixed(2)}`;
      codNote.textContent = `* ยอดคงเหลือชำระพนักงานส่งพัสดุปลายทาง: ฿${Number(result.remaining_cod_amount || 0).toFixed(2)}`;
      codNote.classList.remove('hidden');
    } else {
      promptLabel.textContent = 'ยอดชำระสุทธิ (โอนเต็มจำนวน)';
      depositDisplay.textContent = `฿${Number(result.deposit_amount || result.grand_total || 0).toFixed(2)}`;
      codNote.classList.add('hidden');
    }

    if (settings.bank_name) document.getElementById('bank-name').textContent = settings.bank_name;
    if (settings.bank_account_number) document.getElementById('bank-number').textContent = settings.bank_account_number;
    if (settings.bank_account_name) document.getElementById('bank-acc-name').textContent = settings.bank_account_name;

    const qrContainer = document.getElementById('qr-container');
    const qrImg = document.getElementById('payment-qr-img');
    if (settings.payment_qr_url) {
      qrImg.src = settings.payment_qr_url;
      qrContainer.classList.remove('hidden');
    } else {
      qrContainer.classList.add('hidden');
    }

    await liffService.sendOrderSummaryToChat(result);

    const successModal = document.getElementById('order-success-modal');
    successModal.showModal();
  } catch (err) {
    errorMsg.textContent = err.message || 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ';
    errorMsg.classList.remove('hidden');
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    updateOrderSummary();
  }
}
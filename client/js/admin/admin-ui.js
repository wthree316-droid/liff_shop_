import {
  fetchAdminOrders,
  updateOrderStatus,
  fetchAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  toggleAdminProduct,
  deleteAdminProduct,
  fetchAdminPromotions,
  createAdminPromotion,
  toggleAdminPromotion,
  deleteAdminPromotion,
  fetchAdminSettings,
  updateAdminSetting,
  setAdminAuthToken,
  uploadAdminAsset
} from './admin-api.js';
import { CONFIG } from '../core/config.js';

let currentOrderFilter = '';
let cachedProductsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupNavigationTabs();
  setupOrderFilters();
  setupModals();
  await initAdminAuthentication();
  loadOrders();
});

async function initAdminAuthentication() {
  const badge = document.getElementById('admin-status-badge');

  if (typeof liff !== 'undefined' && CONFIG.ADMIN_LIFF_ID) {
    try {
      await liff.init({ liffId: CONFIG.ADMIN_LIFF_ID });
      if (liff.isLoggedIn()) {
        const idToken = liff.getIDToken();
        setAdminAuthToken(idToken, 'Bearer');
        const profile = await liff.getProfile();
        badge.textContent = `👤 ${profile.displayName}`;
        badge.className = 'text-xs bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 font-mono';
        return;
      } else {
        liff.login();
        return;
      }
    } catch (e) {
      console.warn('LIFF init fallback:', e);
    }
  }

  let localKey = localStorage.getItem('artisan_admin_key');
  if (!localKey) {
    localKey = prompt('กรุณาระบุ Admin API Key เพื่อเข้าใช้งาน:');
    if (localKey) localStorage.setItem('artisan_admin_key', localKey);
  }

  if (localKey) {
    setAdminAuthToken(localKey, 'Key');
    badge.textContent = '🔑 Local Key';
    badge.className = 'text-xs bg-stone-800 px-3 py-1 rounded-full text-amber-400 font-mono';
  } else {
    badge.textContent = '❌ Unauthorized';
  }
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

function setupOrderFilters() {
  const filterBtns = document.querySelectorAll('#order-filters .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentOrderFilter = btn.dataset.status;
      filterBtns.forEach(b => {
        b.className = 'filter-btn shrink-0 px-3 py-1 rounded-xl text-xs font-semibold bg-white text-stone-600 border border-stone-200';
      });
      btn.className = 'filter-btn shrink-0 px-3 py-1 rounded-xl text-xs font-semibold bg-stone-900 text-white';
      loadOrders();
    });
  });
}

// --- Orders Domain ---
async function loadOrders() {
  const container = document.getElementById('orders-list');
  container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">กำลังโหลดออเดอร์...</div>';

  try {
    const orders = await fetchAdminOrders(currentOrderFilter);
    if (!orders.length) {
      container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">ไม่มีรายการคำสั่งซื้อ</div>';
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div class="flex justify-between items-start">
          <div>
            <span class="font-mono text-xs font-bold text-stone-900">#${o.id.slice(0, 8)}</span>
            <p class="text-xs font-semibold text-stone-800 mt-0.5">${o.customer_name} (${o.customer_phone})</p>
            <p class="text-[11px] text-stone-500 line-clamp-1">${o.shipping_address}</p>
          </div>
          <div>${renderStatusBadge(o.status)}</div>
        </div>

        <div class="flex justify-between items-center border-t border-stone-100 pt-2 text-xs">
          <span class="text-stone-500">ยอดชำระ: <strong class="text-amber-700 font-bold">฿${o.grand_total.toFixed(2)}</strong></span>
          ${o.tracking_number ? `<span class="text-[11px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded">📦 ${o.tracking_number}</span>` : ''}
        </div>

        <div class="flex justify-end gap-2 border-t border-stone-50 pt-2">
          ${renderOrderActionButtons(o)}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-update-order').forEach(b => {
      b.addEventListener('click', () => handleUpdateOrderStatus(b.dataset.id, b.dataset.status));
    });
    container.querySelectorAll('.btn-ship-order').forEach(b => {
      b.addEventListener('click', () => handleOpenShipModal(b.dataset.id));
    });
    container.querySelectorAll('.btn-quick-ship').forEach(b => {
      b.addEventListener('click', () => handleUpdateOrderStatus(b.dataset.id, 'SHIPPED'));
    });
    // ผูก Event ปุ่มดูสลิป
    container.querySelectorAll('.btn-view-slip').forEach(b => {
      b.addEventListener('click', () => {
        const slipUrl = b.dataset.url;
        const orderId = b.dataset.id;
        const modal = document.getElementById('modal-slip-preview');
        const img = document.getElementById('slip-preview-img');
        const confirmBtn = document.getElementById('btn-confirm-from-slip');

        img.src = slipUrl;
        confirmBtn.onclick = async () => {
          modal.close();
          await handleUpdateOrderStatus(orderId, 'CONFIRMED');
        };
        modal.showModal();
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="bg-white p-6 rounded-2xl border border-red-200 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

function renderStatusBadge(status) {
  const map = {
    AWAITING_PAYMENT: 'bg-stone-100 text-stone-600',
    PAYMENT_SUBMITTED: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    SHIPPED: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-red-100 text-red-700'
  };
  return `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${map[status] || 'bg-stone-100 text-stone-600'}">${status}</span>`;
}

function renderOrderActionButtons(order) {
  if (order.status === 'AWAITING_PAYMENT') {
    return `
      <button data-id="${order.id}" data-status="CANCELLED" class="btn-update-order px-3 py-1 text-red-600 text-xs font-medium">ยกเลิกออเดอร์</button>
      <button data-id="${order.id}" data-status="PAYMENT_SUBMITTED" class="btn-update-order px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold">ลูกค้ายืนยันโอนแล้ว</button>
    `;
  }
  if (order.status === 'PAYMENT_SUBMITTED') {
    return `
      <button data-id="${order.id}" data-status="CANCELLED" class="btn-update-order px-3 py-1 text-red-600 text-xs font-medium">ปฏิเสธสลิป</button>
      ${order.slip_image_url ? `<button data-url="${order.slip_image_url}" data-id="${order.id}" class="btn-view-slip px-3 py-1 bg-stone-800 text-white rounded-lg text-xs font-bold">🖼️ ดูสลิป</button>` : ''}
      <button data-id="${order.id}" data-status="CONFIRMED" class="btn-update-order px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">ยืนยันยอดเงิน</button>
    `;
  }
  if (order.status === 'CONFIRMED') {
    return `
      <button data-id="${order.id}" class="btn-quick-ship px-3 py-1 text-stone-600 text-xs font-medium">ส่งทันที (ไม่ระบุเลข)</button>
      <button data-id="${order.id}" class="btn-ship-order px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">ใส่เลขพัสดุ</button>
    `;
  }
  return '';
}

async function handleUpdateOrderStatus(orderId, nextStatus) {
  if (!confirm(`ยืนยันการเปลี่ยนสถานะเป็น ${nextStatus}?`)) return;
  try {
    await updateOrderStatus(orderId, nextStatus);
    loadOrders();
  } catch (err) {
    alert(`ข้อผิดพลาด: ${err.message}`);
  }
}

function handleOpenShipModal(orderId) {
  const modal = document.getElementById('modal-shipping');
  document.getElementById('ship-order-id').value = orderId;
  document.getElementById('ship-tracking').value = '';
  modal.showModal();
}

// --- Products Domain ---
async function loadProducts() {
  const container = document.getElementById('products-list');
  container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">กำลังโหลดสินค้า...</div>';

  try {
    cachedProductsList = await fetchAdminProducts();
    if (!cachedProductsList.length) {
      container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">ยังไม่มีสินค้า</div>';
      return;
    }

    container.innerHTML = cachedProductsList.map(p => {
      const price = typeof p.price_per_unit === 'number' ? p.price_per_unit : parseFloat(p.price_per_unit || 0);
      return `
        <div class="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-100">
            ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover" />` : '<div class="w-full h-full flex items-center justify-center text-stone-300 text-xs">🍵</div>'}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs text-stone-900 truncate">${p.name}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded font-mono ${p.type === 'BY_WEIGHT' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'}">
                ${p.type === 'BY_WEIGHT' ? 'ชั่ง นน.' : 'ชิ้น'}
              </span>
            </div>
            <p class="text-[11px] text-stone-500 mt-0.5">ราคา: ฿${price.toFixed(2)}</p>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button data-id="${p.id}" class="btn-toggle-prod px-2.5 py-1 rounded-lg text-xs font-bold ${p.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-400'}">
              ${p.is_available ? 'ขาย' : 'ปิด'}
            </button>
            <button data-id="${p.id}" class="btn-edit-prod px-2.5 py-1 rounded-lg text-xs bg-stone-100 text-stone-700">แก้</button>
            <button data-id="${p.id}" class="btn-del-prod px-2 py-1 text-red-500 text-xs">ลบ</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-toggle-prod').forEach(b => {
      b.addEventListener('click', async () => {
        await toggleAdminProduct(b.dataset.id);
        loadProducts();
      });
    });

    container.querySelectorAll('.btn-edit-prod').forEach(b => {
      b.addEventListener('click', () => handleOpenEditProduct(b.dataset.id));
    });

    container.querySelectorAll('.btn-del-prod').forEach(b => {
      b.addEventListener('click', async () => {
        if (confirm('ยืนยันการลบหรือระงับสินค้านี้?')) {
          await deleteAdminProduct(b.dataset.id);
          loadProducts();
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="bg-white p-6 rounded-2xl border border-red-200 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

function handleOpenEditProduct(productId) {
  const prod = cachedProductsList.find(p => p.id === productId);
  if (!prod) return;

  const modal = document.getElementById('modal-product');
  document.getElementById('prod-modal-title').textContent = 'แก้ไขสินค้า';
  document.getElementById('prod-id').value = prod.id;
  document.getElementById('prod-id').disabled = true;
  document.getElementById('prod-name').value = prod.name;
  document.getElementById('prod-cat').value = prod.category_id;
  document.getElementById('prod-type').value = prod.type;
  document.getElementById('prod-price').value = prod.price_per_unit;
  document.getElementById('prod-image').value = prod.image_url || '';
  document.getElementById('prod-variants').value = Array.isArray(prod.variants) ? prod.variants.join(', ') : '';

  const tierContainer = document.getElementById('tier-container');
  if (prod.type === 'BY_WEIGHT') {
    tierContainer.classList.remove('hidden');
    document.getElementById('prod-tiers-input').value = Array.isArray(prod.price_tiers) 
      ? prod.price_tiers.map(t => `${t.min_weight}:${t.price_per_unit}`).join('\n') 
      : '';
  } else {
    tierContainer.classList.add('hidden');
  }

  modal.showModal();
}

// --- Promotions Domain ---
async function loadPromotions() {
  const container = document.getElementById('promos-list');
  container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">กำลังโหลดโปรโมชั่น...</div>';

  try {
    const promos = await fetchAdminPromotions();
    if (!promos.length) {
      container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">ยังไม่มีโปรโมชั่น</div>';
      return;
    }

    container.innerHTML = promos.map(pr => `
      <div class="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-amber-50 overflow-hidden shrink-0 border border-amber-100 flex items-center justify-center">
          ${pr.banner_image_url ? `<img src="${pr.banner_image_url}" alt="${pr.code}" class="w-full h-full object-cover" />` : '<span class="text-xs">🎟️</span>'}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-xs text-amber-700">${pr.code}</span>
            <span class="text-xs font-medium text-stone-800 truncate">${pr.title}</span>
          </div>
          <p class="text-[11px] text-stone-400 mt-0.5">
            ${pr.discount_type === 'PERCENTAGE' ? `ลด ${pr.discount_value}%` : `ลด ฿${pr.discount_value}`} (ขั้นต่ำ ฿${pr.min_order_amount})
          </p>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <button data-id="${pr.id}" class="btn-toggle-promo px-2.5 py-1 rounded-lg text-xs font-bold ${pr.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-400'}">
            ${pr.is_active ? 'เปิด' : 'ปิด'}
          </button>
          <button data-id="${pr.id}" class="btn-del-promo px-2 py-1 text-red-500 text-xs">ลบ</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-toggle-promo').forEach(b => {
      b.addEventListener('click', async () => {
        await toggleAdminPromotion(b.dataset.id);
        loadPromotions();
      });
    });

    container.querySelectorAll('.btn-del-promo').forEach(b => {
      b.addEventListener('click', async () => {
        if (confirm('ยืนยันการลบโค้ดโปรโมชั่นนี้?')) {
          await deleteAdminPromotion(b.dataset.id);
          loadPromotions();
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="bg-white p-6 rounded-2xl border border-red-200 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

// --- Store Settings Domain ---
async function loadSettings() {
  const container = document.getElementById('settings-list');
  container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">กำลังโหลดการตั้งค่า...</div>';

  try {
    const settings = await fetchAdminSettings();
    if (!settings.length) {
      container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">ไม่มีรายการตั้งค่า</div>';
      return;
    }

    container.innerHTML = settings.map(s => `
      <div class="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2">
        <div class="flex justify-between items-start">
          <div>
            <span class="font-mono text-xs font-bold text-stone-900">${s.key}</span>
            <p class="text-[11px] text-stone-500 mt-0.5">${s.description || 'ไม่มีคำอธิบาย'}</p>
          </div>
        </div>
        <div class="flex gap-2 pt-1">
          <input type="number" step="0.01" value="${s.value}" id="input-set-${s.key}" class="w-full px-3 py-1.5 border rounded-xl text-xs font-semibold focus:border-amber-600 outline-none" />
          <button data-key="${s.key}" class="btn-save-setting shrink-0 bg-stone-900 text-white text-xs px-4 py-1.5 rounded-xl font-bold">บันทึก</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-save-setting').forEach(b => {
      b.addEventListener('click', async () => {
        const key = b.dataset.key;
        const val = document.getElementById(`input-set-${key}`).value;
        try {
          await updateAdminSetting(key, val);
          alert(`อัปเดต '${key}' สำเร็จ`);
          loadSettings();
        } catch (err) {
          alert(`บันทึกล้มเหลว: ${err.message}`);
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="bg-white p-6 rounded-2xl border border-red-200 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

// --- Modals Setup ---
function setupModals() {
  const modalShipping = document.getElementById('modal-shipping');
  document.getElementById('form-shipping').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('ship-order-id').value;
    const tracking = document.getElementById('ship-tracking').value;
    try {
      await updateOrderStatus(id, 'SHIPPED', tracking);
      modalShipping.close();
      loadOrders();
    } catch (err) {
      alert(err.message);
    }
  });

  const modalProduct = document.getElementById('modal-product');
  const prodTypeSelect = document.getElementById('prod-type');
  const tierContainer = document.getElementById('tier-container');

  prodTypeSelect.addEventListener('change', () => {
    if (prodTypeSelect.value === 'BY_WEIGHT') {
      tierContainer.classList.remove('hidden');
    } else {
      tierContainer.classList.add('hidden');
    }
  });

  document.getElementById('btn-add-product').addEventListener('click', () => {
    document.getElementById('prod-modal-title').textContent = 'เพิ่มสินค้าใหม่';
    document.getElementById('form-product').reset();
    document.getElementById('prod-id').disabled = false;
    tierContainer.classList.add('hidden');
    modalProduct.showModal();
  });

  document.getElementById('form-product').addEventListener('submit', async (e) => {
    e.preventDefault();
    const isEdit = document.getElementById('prod-id').disabled;
    const id = document.getElementById('prod-id').value.trim();
    const variantsRaw = document.getElementById('prod-variants').value.trim();
    const variants = variantsRaw ? variantsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const type = document.getElementById('prod-type').value;

    let priceTiers = [];
    if (type === 'BY_WEIGHT') {
      const lines = document.getElementById('prod-tiers-input').value.trim().split('\n');
      for (const line of lines) {
        const [w, p] = line.split(':').map(n => parseFloat(n.trim()));
        if (!isNaN(w) && !isNaN(p)) priceTiers.push({ min_weight: w, price_per_unit: p });
      }
    }

    const payload = {
      name: document.getElementById('prod-name').value.trim(),
      category_id: document.getElementById('prod-cat').value,
      type: type,
      price_per_unit: parseFloat(document.getElementById('prod-price').value),
      image_url: document.getElementById('prod-image').value.trim() || '',
      variants: variants,
      price_tiers: priceTiers
    };

    try {
      if (isEdit) {
        await updateAdminProduct(id, payload);
      } else {
        await createAdminProduct({ id, ...payload, is_available: true });
      }
      modalProduct.close();
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  });

  const modalPromo = document.getElementById('modal-promo');
  document.getElementById('btn-add-promo').addEventListener('click', () => modalPromo.showModal());
  document.getElementById('form-promo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      code: document.getElementById('promo-code').value.trim().toUpperCase(),
      title: document.getElementById('promo-title').value.trim(),
      discount_type: document.getElementById('promo-type').value,
      discount_value: parseFloat(document.getElementById('promo-value').value),
      min_order_amount: parseFloat(document.getElementById('promo-min').value) || 0.0,
      banner_image_url: document.getElementById('promo-banner').value.trim() || '',
      is_active: true
    };
    try {
      await createAdminPromotion(payload);
      modalPromo.close();
      e.target.reset();
      loadPromotions();
    } catch (err) {
      alert(err.message);
    }
  });

  const prodFileInput = document.getElementById('prod-file-input');
  if (prodFileInput) {
    prodFileInput.addEventListener('change', (e) => {
      handleImageUpload(e.target, 'prod-image');
    });
  }

  const promoFileInput = document.getElementById('promo-file-input');
  if (promoFileInput) {
    promoFileInput.addEventListener('change', (e) => {
      handleImageUpload(e.target, 'promo-banner');
    });
  }
}


// ฟังก์ชันกลางสำหรับอัปโหลดรูปภาพผ่าน admin-api.js
async function handleImageUpload(fileInput, hiddenInputId) {
  const file = fileInput.files[0];
  if (!file) return;

  const labelEl = fileInput.previousElementSibling;
  const originalText = labelEl ? labelEl.textContent : '';

  if (labelEl) {
    labelEl.textContent = 'กำลังอัปโหลดรูปภาพ... ⏳';
  }

  try {
    // เรียกใช้ฟังก์ชันจาก admin-api.js ตรงๆ
    const data = await uploadAdminAsset(file);
    
    // นำ public url ที่ได้จาก backend มาหยอดลง input hidden
    document.getElementById(hiddenInputId).value = data.image_url;

    if (labelEl) {
      labelEl.textContent = 'อัปโหลดรูปภาพสำเร็จแล้ว ✓';
    }
  } catch (err) {
    alert(`เกิดข้อผิดพลาดในการอัปโหลดรูป: ${err.message}`);
    if (labelEl) {
      labelEl.textContent = originalText;
    }
    fileInput.value = ''; // เคลียร์ไฟล์ออกเพื่อให้เลือกใหม่ได้
  }
}

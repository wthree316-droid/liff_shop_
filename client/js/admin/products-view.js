import { CONFIG } from '../core/config.js';
import { productsState } from './products-logic.js';

let isDelegated = false;

function syncProductTypeUI(type) {
  const tierContainer = document.getElementById('tier-container');
  const priceInput = document.getElementById('prod-price');

  priceInput.classList.remove('hidden');
  priceInput.required = true;

  if (type === 'BY_WEIGHT') {
    tierContainer.classList.remove('hidden');
    priceInput.placeholder = 'ราคาต่อ 1 กรัม (เช่น 5.00)';
  } else {
    tierContainer.classList.add('hidden');
    priceInput.placeholder = 'ราคาต่อชิ้น';
  }
}

export function initProductsModule() {
  const modalProduct = document.getElementById('modal-product');
  const prodTypeSelect = document.getElementById('prod-type');
  const btnAddTier = document.getElementById('btn-add-tier-row');
  const prodCat = document.getElementById('prod-cat');

  if (prodCat) {
    prodCat.innerHTML = CONFIG.CATEGORIES.map(cat => 
      `<option value="${cat.id}">${cat.name}</option>`
    ).join('');

    prodCat.addEventListener('change', () => {
      const selectedCat = CONFIG.CATEGORIES.find(c => c.id === prodCat.value);
      if (selectedCat) {
        prodTypeSelect.value = selectedCat.defaultType;
        syncProductTypeUI(selectedCat.defaultType);
      }
    });
  }

  prodTypeSelect.addEventListener('change', () => {
    syncProductTypeUI(prodTypeSelect.value);
  });

  btnAddTier.addEventListener('click', () => {
    appendTierRow();
  });

  document.getElementById('btn-add-product').addEventListener('click', () => {
    document.getElementById('prod-modal-title').textContent = 'เพิ่มสินค้าใหม่';
    document.getElementById('form-product').reset();
    document.getElementById('prod-id').disabled = false;
    document.getElementById('tier-rows-list').innerHTML = '';
    document.getElementById('prod-image').value = '';
    
    updateProductImagePreview(''); // ล้างพรีวิวภาพ

    const firstCat = CONFIG.CATEGORIES[0];
    if (firstCat) {
      prodCat.value = firstCat.id;
      prodTypeSelect.value = firstCat.defaultType;
      syncProductTypeUI(firstCat.defaultType);
    } else {
      prodTypeSelect.value = 'BY_WEIGHT';
      syncProductTypeUI('BY_WEIGHT');
    }

    appendTierRow(25, '', '25g');
    modalProduct.showModal();
  });

  document.getElementById('form-product').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { isEdit, payload } = productsState.extractFormPayload(e.target);
      const updatedList = await productsState.saveProduct(payload, isEdit);
      modalProduct.close();
      renderProductsList(updatedList);
    } catch (err) {
      alert(`บันทึกล้มเหลว: ${err.message}`);
    }
  });
}

// ฟังก์ชันจัดการแสดง/ซ่อนพรีวิวภาพ
function updateProductImagePreview(imageUrl) {
  const imgEl = document.getElementById('prod-preview-img');
  const placeholderEl = document.getElementById('prod-preview-placeholder');

  if (!imgEl || !placeholderEl) return;

  if (imageUrl) {
    imgEl.src = imageUrl;
    imgEl.classList.remove('hidden');
    placeholderEl.classList.add('hidden');
  } else {
    imgEl.src = '';
    imgEl.classList.add('hidden');
    placeholderEl.classList.remove('hidden');
  }
}

export function appendTierRow(weight = '', price = '', label = '') {
  const container = document.getElementById('tier-rows-list');
  const row = document.createElement('div');
  row.className = 'tier-row flex items-center gap-2';
  row.innerHTML = `
    <input type="text" placeholder="ป้ายชื่อ" value="${label}" class="tier-label w-1/3 px-2.5 py-1.5 border border-stone-200 rounded-xl text-xs outline-none focus:border-amber-600" />
    <input type="number" step="1" placeholder="กรัม" value="${weight}" class="tier-weight w-1/3 px-2.5 py-1.5 border border-stone-200 rounded-xl text-xs outline-none focus:border-amber-600" required />
    <input type="number" step="0.01" placeholder="ราคา (฿)" value="${price}" class="tier-price w-1/3 px-2.5 py-1.5 border border-stone-200 rounded-xl text-xs outline-none focus:border-amber-600" required />
    <button type="button" class="btn-del-tier text-stone-400 hover:text-red-500 px-2 py-1 text-base font-bold transition-colors">&times;</button>
  `;

  row.querySelector('.btn-del-tier').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

export async function loadProducts() {
  const container = document.getElementById('products-list');
  container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">กำลังโหลดสินค้า...</div>';

  try {
    const list = await productsState.loadFromApi();
    renderProductsList(list);
    initProductDelegation();
  } catch (err) {
    container.innerHTML = `<div class="bg-white p-6 rounded-2xl border border-red-200 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

function renderProductsList(products) {
  const container = document.getElementById('products-list');
  if (!products.length) {
    container.innerHTML = `
      <div class="bg-white p-8 rounded-3xl border border-stone-200 text-center space-y-2">
        <span class="text-2xl">🍵</span>
        <p class="text-xs font-bold text-stone-700">ยังไม่มีสินค้าในคลัง</p>
        <p class="text-[11px] text-stone-400">กดปุ่ม "+ เพิ่มสินค้าใหม่" เพื่อลงทะเบียนสินค้า</p>
      </div>
    `;
    return;
  }

  container.innerHTML = products.map(p => {
    const price = typeof p.price_per_unit === 'number' ? p.price_per_unit : parseFloat(p.price_per_unit || 0);
    const isAvail = Boolean(p.is_available);

    return `
      <div class="bg-white p-3.5 rounded-3xl border border-stone-200/80 shadow-xs flex items-center gap-3.5 transition-all">
        <!-- Thumbnail -->
        <div class="w-14 h-14 rounded-2xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200/60 shadow-inner">
          ${p.image_url 
            ? `<img src="${p.image_url}" alt="${p.name}" class="w-full h-full object-cover" />` 
            : '<div class="w-full h-full flex items-center justify-center text-stone-300 text-lg">🍵</div>'}
        </div>

        <!-- รายละเอียดสินค้า -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-bold text-xs text-stone-900 truncate">${p.name}</span>
            <span class="text-[9px] px-2 py-0.5 rounded-md font-mono font-semibold ${p.type === 'BY_WEIGHT' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-stone-100 text-stone-600'}">
              ${p.type === 'BY_WEIGHT' ? 'ชั่งกรัม' : 'ชิ้น'}
            </span>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[11px] text-stone-400">ราคา:</span>
            <span class="text-xs font-bold text-stone-900 font-eng">฿${price.toFixed(2)}</span>
            <span class="text-[10px] font-mono text-stone-400">(${p.id})</span>
          </div>
        </div>

        <!-- สวิตช์ iOS Toggle และปุ่ม Action -->
        <div class="flex items-center gap-2 shrink-0 border-l border-stone-100 pl-3">
          <!-- iOS Switch Toggle -->
          <button 
            type="button" 
            data-id="${p.id}" 
            role="switch" 
            aria-checked="${isAvail}" 
            class="btn-toggle-prod relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAvail ? 'bg-emerald-500' : 'bg-stone-200'}"
            title="${isAvail ? 'เปิดขายอยู่' : 'ปิดการขาย'}"
          >
            <span class="sr-only">Toggle availability</span>
            <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isAvail ? 'translate-x-5' : 'translate-x-0'}"></span>
          </button>

          <!-- Action Buttons -->
          <button data-id="${p.id}" class="btn-edit-prod p-1.5 rounded-xl text-stone-500 hover:text-amber-800 hover:bg-amber-50 active:scale-95 transition-all text-xs" title="แก้ไข">
            ✏️
          </button>
          <button data-id="${p.id}" class="btn-del-prod p-1.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all text-xs" title="ลบ">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function initProductDelegation() {
  if (isDelegated) return;
  isDelegated = true;

  const container = document.getElementById('products-list');
  container.addEventListener('click', async (e) => {
    // 1. จัดการ iOS Toggle Switch (Optimistic UI)
    const btnToggle = e.target.closest('.btn-toggle-prod');
    if (btnToggle) {
      const id = btnToggle.dataset.id;
      const knob = btnToggle.querySelector('span:not(.sr-only)');
      btnToggle.disabled = true;

      try {
        const isAvailable = await productsState.toggleAvailability(id);
        
        // สลับแอนิเมชัน Switch ทันที
        btnToggle.setAttribute('aria-checked', String(isAvailable));
        if (isAvailable) {
          btnToggle.className = 'btn-toggle-prod relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-emerald-500';
          if (knob) knob.className = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out translate-x-5';
        } else {
          btnToggle.className = 'btn-toggle-prod relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-stone-200';
          if (knob) knob.className = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out translate-x-0';
        }
      } catch (err) {
        alert(err.message);
      } finally {
        btnToggle.disabled = false;
      }
      return;
    }

    // 2. จัดการเปิด Edit Modal
    const btnEdit = e.target.closest('.btn-edit-prod');
    if (btnEdit) {
      handleOpenEditProduct(btnEdit.dataset.id);
      return;
    }

    // 3. จัดการลบสินค้า
    const btnDel = e.target.closest('.btn-del-prod');
    if (btnDel) {
      if (!confirm('ยืนยันการลบสินค้านี้ออกจากระบบ?')) return;
      try {
        const updatedList = await productsState.deleteProduct(btnDel.dataset.id);
        renderProductsList(updatedList);
      } catch (err) {
        alert(err.message);
      }
    }
  });
}

function handleOpenEditProduct(productId) {
  const prod = productsState.getProductById(productId);
  if (!prod) return;

  const modal = document.getElementById('modal-product');
  document.getElementById('prod-modal-title').textContent = 'แก้ไขข้อมูลสินค้า';
  document.getElementById('prod-id').value = prod.id;
  document.getElementById('prod-id').disabled = true;
  document.getElementById('prod-name').value = prod.name;
  document.getElementById('prod-desc').value = prod.description || '';
  document.getElementById('prod-cat').value = prod.category_id;
  document.getElementById('prod-type').value = prod.type;
  document.getElementById('prod-price').value = prod.price_per_unit;
  document.getElementById('prod-image').value = prod.image_url || '';
  document.getElementById('prod-variants').value = Array.isArray(prod.variants) ? prod.variants.join(', ') : '';

  // แสดงรูปภาพเดิมของสินค้านี้
  updateProductImagePreview(prod.image_url || '');

  const rowsList = document.getElementById('tier-rows-list');
  rowsList.innerHTML = '';

  syncProductTypeUI(prod.type);

  if (prod.type === 'BY_WEIGHT') {
    if (Array.isArray(prod.price_tiers) && prod.price_tiers.length > 0) {
      prod.price_tiers.forEach(t => {
        appendTierRow(t.weight, t.price, t.label || `${t.weight}g`);
      });
    } else {
      appendTierRow(25, prod.price_per_unit, '25g');
    }
  }

  modal.showModal();
}
import { CONFIG } from '../core/config.js';
import { 
  fetchAdminProducts, 
  createAdminProduct, 
  updateAdminProduct, 
  toggleAdminProduct, 
  deleteAdminProduct 
} from './admin-api.js';

let cachedProductsList = [];

// ฟังก์ชันสลับการแสดงผลระหว่างกล่องแพ็กเกจกับช่องราคาเริ่มต้น
function syncProductTypeUI(type) {
  const tierContainer = document.getElementById('tier-container');
  const priceInput = document.getElementById('prod-price');

  if (type === 'BY_WEIGHT') {
    tierContainer.classList.remove('hidden');
    // หากเป็นแบบชั่ง ซ่อนช่องราคาและปลด required เพื่อให้ดึงราคาจากแพ็กเกจแรกแทน
    priceInput.classList.add('hidden');
    priceInput.required = false;
  } else {
    tierContainer.classList.add('hidden');
    priceInput.classList.remove('hidden');
    priceInput.required = true;
  }
}

export function initProductsModule() {
  const modalProduct = document.getElementById('modal-product');
  const prodTypeSelect = document.getElementById('prod-type');
  const btnAddTier = document.getElementById('btn-add-tier-row');
  const prodCat = document.getElementById('prod-cat');

  // เรนเดอร์ตัวเลือกหมวดหมู่จาก CONFIG ลงใน Dropdown แอดมินอัตโนมัติ
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

    // ตั้งค่าเริ่มต้นตามหมวดหมู่แรกสุดใน CONFIG
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
    await handleProductSubmit();
  });
}

export function appendTierRow(weight = '', price = '', label = '') {
  const container = document.getElementById('tier-rows-list');
  const row = document.createElement('div');
  row.className = 'tier-row flex items-center gap-1.5';
  row.innerHTML = `
    <input type="text" placeholder="ป้ายชื่อ (เช่น 25g)" value="${label}" class="tier-label w-1/3 px-2.5 py-1.5 border rounded-lg text-xs" />
    <input type="number" step="1" placeholder="กรัม" value="${weight}" class="tier-weight w-1/3 px-2.5 py-1.5 border rounded-lg text-xs" required />
    <input type="number" step="0.01" placeholder="ราคา (฿)" value="${price}" class="tier-price w-1/3 px-2.5 py-1.5 border rounded-lg text-xs" required />
    <button type="button" class="btn-del-tier text-red-500 hover:text-red-700 px-1.5 py-1 text-sm font-bold">&times;</button>
  `;

  row.querySelector('.btn-del-tier').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

export async function loadProducts() {
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
                ${p.type === 'BY_WEIGHT' ? 'เลือกขนาด' : 'ชิ้น'}
              </span>
            </div>
            <p class="text-[11px] text-stone-500 mt-0.5">ราคาเริ่มต้น: ฿${price.toFixed(2)}</p>
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
        if (confirm('ยืนยันการลบสินค้านี้?')) {
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
  document.getElementById('prod-desc').value = prod.description || '';
  document.getElementById('prod-cat').value = prod.category_id;
  document.getElementById('prod-type').value = prod.type;
  document.getElementById('prod-price').value = prod.price_per_unit;
  document.getElementById('prod-image').value = prod.image_url || '';
  document.getElementById('prod-variants').value = Array.isArray(prod.variants) ? prod.variants.join(', ') : '';

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

async function handleProductSubmit() {
  const modal = document.getElementById('modal-product');
  const isEdit = document.getElementById('prod-id').disabled;
  const id = document.getElementById('prod-id').value.trim();
  const variantsRaw = document.getElementById('prod-variants').value.trim();
  const variants = variantsRaw ? variantsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const type = document.getElementById('prod-type').value;

  let priceTiers = [];
  let calculatedPricePerUnit = 0;

  if (type === 'BY_WEIGHT') {
    const rows = document.querySelectorAll('#tier-rows-list .tier-row');
    rows.forEach(r => {
      const weight = parseFloat(r.querySelector('.tier-weight').value);
      const price = parseFloat(r.querySelector('.tier-price').value);
      const label = r.querySelector('.tier-label').value.trim() || `${weight}g`;
      if (!isNaN(weight) && !isNaN(price)) {
        priceTiers.push({ weight, price, label });
      }
    });

    if (priceTiers.length === 0) {
      alert('สินค้าแบบชั่งต้องมีขนาดและราคาอย่างน้อย 1 ขนาด');
      return;
    }

    // กำหนดราคาของขนาดแรกเป็นราคาเริ่มต้นให้อัตโนมัติ เพื่อส่งไปเก็บใน schema price_per_unit
    calculatedPricePerUnit = priceTiers[0].price;
  } else {
    calculatedPricePerUnit = parseFloat(document.getElementById('prod-price').value);
    if (isNaN(calculatedPricePerUnit) || calculatedPricePerUnit < 0) {
      alert('กรุณาระบุราคาต่อหน่วยให้ถูกต้อง');
      return;
    }
  }

  const payload = {
    name: document.getElementById('prod-name').value.trim(),
    description: document.getElementById('prod-desc').value.trim(),
    category_id: document.getElementById('prod-cat').value,
    type: type,
    price_per_unit: calculatedPricePerUnit,
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
    modal.close();
    loadProducts();
  } catch (err) {
    alert(`บันทึกล้มเหลว: ${err.message}`);
  }
}
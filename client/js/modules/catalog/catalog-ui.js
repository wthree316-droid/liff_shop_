import { cartState } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';

let allProducts = [];
let activeCategory = 'ALL';

export function initCatalog(products, containerElement, tabContainer) {
  allProducts = products;
  setupCategoryFilter(tabContainer, containerElement);
  renderCatalog(containerElement);
}

function setupCategoryFilter(tabContainer, containerElement) {
  // สร้างรายการแท็บทั้งหมด รวมแท็บ "ทั้งหมด" เข้ากับ CONFIG.CATEGORIES[cite: 8]
  const tabs = [
    { id: 'ALL', name: 'ทั้งหมด' },
    ...CONFIG.CATEGORIES.map(c => ({ id: c.id, name: c.name }))
  ];

  tabContainer.innerHTML = tabs.map((t, idx) => `
    <button 
      data-category="${t.id}" 
      class="px-4 py-1.5 rounded-full text-xs transition-all active:scale-95 ${
        idx === 0
          ? 'font-semibold bg-stone-900 text-white shadow-xs'
          : 'font-medium bg-white border border-stone-200 text-stone-600'
      }">
      ${t.name}
    </button>
  `).join('');

  const buttons = tabContainer.querySelectorAll('button');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;

      buttons.forEach((b) => {
        b.className = 'px-4 py-1.5 rounded-full text-xs font-medium bg-white border border-stone-200 text-stone-600 transition-all active:scale-95';
      });
      btn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold bg-stone-900 text-white shadow-xs transition-all active:scale-95';

      renderCatalog(containerElement);
    });
  });
}

export function renderCatalog(containerElement) {
  containerElement.innerHTML = '';

  const filtered = activeCategory === 'ALL'
    ? allProducts
    : allProducts.filter((p) => p.category_id === activeCategory);

  if (filtered.length === 0) {
    containerElement.innerHTML = `
      <div class="p-12 text-center text-stone-400 bg-white border border-stone-100 rounded-3xl text-xs space-y-1">
        <span class="text-2xl block">🍵</span>
        <p class="font-medium">ไม่พบสินค้าในหมวดหมู่นี้</p>
      </div>
    `;
    return;
  }

  filtered.forEach((product) => {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-3xl border border-stone-200/80 p-4 shadow-xs hover:shadow-md transition-shadow duration-200 space-y-3.5';

  const defaultImg = 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&q=80';
  const isWeight = product.type === 'BY_WEIGHT';

  // คำนวณราคาเริ่มต้นก่อนสร้าง HTML String
  const startingPrice = isWeight && Array.isArray(product.price_tiers) && product.price_tiers.length > 0
    ? Math.min(...product.price_tiers.map(t => Number(t.price)))
    : product.price_per_unit;

  card.innerHTML = `
    <div class="product-clickable flex gap-3.5">
      <div class="relative w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-100">
        <img src="${product.image_url || defaultImg}" alt="${product.name}" class="w-full h-full object-cover" />
        <span class="absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md ${isWeight ? 'bg-emerald-950/70 text-emerald-300' : 'bg-stone-900/70 text-stone-200'}">
          ${isWeight ? 'ชั่งกรัม' : 'ชิ้น'}
        </span>
      </div>
      <div class="flex-1 min-w-0 flex flex-col justify-center">
        <h3 class="text-sm font-bold text-stone-900 truncate leading-snug">${product.name}</h3>
        <p class="text-xs text-stone-500 mt-1 font-mono">
          ${isWeight ? 'เริ่มต้น ' : ''}฿${Number(startingPrice).toFixed(2)} 
          <span class="text-[10px] text-stone-400">/ ${isWeight ? 'แพ็กเกจ' : 'ชิ้น'}</span>
        </p>
      </div>
    </div>
    <div class="action-area border-t border-stone-100 pt-3"></div>
  `;

  const actionArea = card.querySelector('.action-area');

  if (isWeight) {
    renderWeightControls(product, actionArea);
  } else {
    renderPieceControls(product, actionArea);
  }

  const clickableArea = card.querySelector('.product-clickable');
  clickableArea.classList.add('cursor-pointer');
  clickableArea.addEventListener('click', () => {
    openProductDetailModal(product);
  });

  containerElement.appendChild(card);
});
}

function openProductDetailModal(product) {
  const modal = document.getElementById('product-detail-modal');
  if (!modal) return;

  const defaultImg = 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&q=80';
  const isWeight = product.type === 'BY_WEIGHT';

  document.getElementById('detail-prod-img').src = product.image_url || defaultImg;
  document.getElementById('detail-prod-name').textContent = product.name;
  document.getElementById('detail-prod-badge').textContent = isWeight ? 'ชั่งกรัม' : 'ชิ้น';
  document.getElementById('detail-prod-desc').textContent = product.description || 'ไม่มีคำอธิบายสินค้า';

  const actionArea = document.getElementById('detail-action-area');
  actionArea.innerHTML = '';

  // ใช้งานชุดควบคุมราคาและปุ่มใส่ตะกร้าเดิมที่มีอยู่แล้ว
  if (isWeight) {
    renderWeightControls(product, actionArea);
  } else {
    renderPieceControls(product, actionArea);
  }

  // ผูกปุ่มปิด Modal
  const btnClose = document.getElementById('btn-close-detail-modal');
  btnClose.onclick = () => modal.close();

  modal.showModal();
}

function renderWeightControls(product, container) {
  // ดึงรายการแพ็กเกจที่ตั้งไว้ หรือใช้ค่าเริ่มต้นหากไม่มี
  const tiers = Array.isArray(product.price_tiers) && product.price_tiers.length > 0
    ? product.price_tiers
    : [{ label: 'ขนาดมาตรฐาน', weight: 50, price: product.price_per_unit }];

  let selectedTier = tiers[0];

  container.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center gap-1.5 flex-wrap weight-tier-group">
        ${tiers.map((t, idx) => `
          <button type="button" data-idx="${idx}" class="btn-tier px-3 py-1.5 text-xs rounded-xl border font-semibold transition-all active:scale-95 ${
            idx === 0
              ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
          }">
            ${t.label || `${t.weight}g`} (฿${Number(t.price).toFixed(0)})
          </button>
        `).join('')}
      </div>

      <div class="flex items-center justify-between pt-0.5 border-t border-stone-100">
        <div>
          <span class="text-[10px] text-stone-400 block font-medium">ราคาแพ็กเกจ</span>
          <span class="tier-price-display text-sm font-bold text-amber-700 font-mono">฿${Number(selectedTier.price).toFixed(2)}</span>
        </div>
        <button class="btn-add-cart bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs">
          ใส่ตะกร้า
        </button>
      </div>
    </div>
  `;

  const tierBtns = container.querySelectorAll('.btn-tier');
  const priceDisplay = container.querySelector('.tier-price-display');
  const addBtn = container.querySelector('.btn-add-cart');

  tierBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      selectedTier = tiers[idx];

      tierBtns.forEach((b) => {
        b.className = 'btn-tier px-3 py-1.5 text-xs rounded-xl border font-semibold bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 transition-all active:scale-95';
      });
      btn.className = 'btn-tier px-3 py-1.5 text-xs rounded-xl border font-semibold bg-stone-900 text-white border-stone-900 shadow-xs transition-all active:scale-95';

      priceDisplay.textContent = `฿${Number(selectedTier.price).toFixed(2)}`;
    });
  });

  addBtn.addEventListener('click', () => {
    // บันทึกน้ำหนักและชื่อแพ็กเกจลง State ของตะกร้า
    const variantLabel = selectedTier.label || `${selectedTier.weight}g`;
    cartState.addItem(product, selectedTier.weight, variantLabel);
    showAddedFeedback(addBtn);
  });
}

function renderPieceControls(product, container) {
  let quantity = 1;
  let selectedVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
  const hasVariants = product.variants && product.variants.length > 0;

  container.innerHTML = `
    <div class="space-y-3">
      ${
        hasVariants
          ? `
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-stone-400 font-medium">แบบ:</span>
          <div class="flex gap-1.5 flex-wrap variant-group">
            ${product.variants
              .map(
                (v, idx) => `
              <button type="button" data-variant="${v}" class="btn-var px-2.5 py-1 text-[11px] rounded-xl border font-semibold transition-all active:scale-95 ${
                  idx === 0
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }">${v}</button>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      <div class="flex items-center justify-between pt-0.5">
        <div class="flex items-center border border-stone-200 rounded-xl bg-stone-50 p-0.5">
          <button class="btn-minus w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-white rounded-lg text-sm font-bold transition-all active:scale-90">-</button>
          <span class="qty-display w-8 text-center text-xs font-bold text-stone-800 font-mono">${quantity}</span>
          <button class="btn-plus w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-white rounded-lg text-sm font-bold transition-all active:scale-90">+</button>
        </div>

        <button class="btn-add-cart bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs">
          ใส่ตะกร้า ฿<span class="piece-total font-mono">${(quantity * product.price_per_unit).toFixed(2)}</span>
        </button>
      </div>
    </div>
  `;

  const qtyDisplay = container.querySelector('.qty-display');
  const pieceTotal = container.querySelector('.piece-total');
  const minusBtn = container.querySelector('.btn-minus');
  const plusBtn = container.querySelector('.btn-plus');
  const addBtn = container.querySelector('.btn-add-cart');

  if (hasVariants) {
    const varBtns = container.querySelectorAll('.btn-var');
    varBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedVariant = btn.dataset.variant;
        varBtns.forEach((b) => {
          b.className = 'btn-var px-2.5 py-1 text-[11px] rounded-xl border font-semibold bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 transition-all active:scale-95';
        });
        btn.className = 'btn-var px-2.5 py-1 text-[11px] rounded-xl border font-semibold bg-amber-600 text-white border-amber-600 shadow-xs transition-all active:scale-95';
      });
    });
  }

  minusBtn.addEventListener('click', () => {
    if (quantity > 1) {
      quantity -= 1;
      qtyDisplay.textContent = quantity;
      pieceTotal.textContent = (quantity * product.price_per_unit).toFixed(2);
    }
  });

  plusBtn.addEventListener('click', () => {
    quantity += 1;
    qtyDisplay.textContent = quantity;
    pieceTotal.textContent = (quantity * product.price_per_unit).toFixed(2);
  });

  addBtn.addEventListener('click', () => {
    cartState.addItem(product, quantity, selectedVariant);
    showAddedFeedback(addBtn);
  });
}

function showAddedFeedback(button) {
  const originalText = button.innerHTML;
  button.textContent = 'ใส่แล้ว ✓';
  button.classList.replace('bg-stone-900', 'bg-emerald-600');
  setTimeout(() => {
    button.innerHTML = originalText;
    button.classList.replace('bg-emerald-600', 'bg-stone-900');
  }, 900);
}
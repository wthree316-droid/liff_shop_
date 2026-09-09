import { cartState } from '../../core/state.js';
import { getStoreSettings } from '../../core/store-settings.js';

let allProducts = [];
let activeCategory = 'ALL';

export function initCatalog(products, containerElement, tabContainer) {
  allProducts = products;
  setupCategoryFilter(tabContainer, containerElement);
  renderCatalog(containerElement);
}

function setupCategoryFilter(tabContainer, containerElement) {
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

function calculateUnitPrice(weight, tiers, defaultPrice) {
  if (!tiers || tiers.length === 0) return defaultPrice;
  const sorted = [...tiers].sort((a, b) => b.min_weight - a.min_weight);
  const matched = sorted.find((t) => weight >= t.min_weight);
  return matched ? matched.price_per_unit : defaultPrice;
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

    card.innerHTML = `
      <div class="flex gap-3.5">
        <div class="relative w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-100">
          <img src="${product.image_url || defaultImg}" alt="${product.name}" class="w-full h-full object-cover" />
          <span class="absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md ${isWeight ? 'bg-emerald-950/70 text-emerald-300' : 'bg-stone-900/70 text-stone-200'}">
            ${isWeight ? 'ชั่งกรัม' : 'ชิ้น'}
          </span>
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-center">
          <h3 class="text-sm font-bold text-stone-900 truncate leading-snug">${product.name}</h3>
          <p class="text-xs text-stone-500 mt-1 font-mono">
            ฿${product.price_per_unit.toFixed(2)} <span class="text-[10px] text-stone-400">/ ${isWeight ? 'กรัม' : 'ชิ้น'}</span>
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

    containerElement.appendChild(card);
  });
}

function renderWeightControls(product, container) {
  const settings = getStoreSettings();
  const minGrams = Number(settings.min_weight_grams) || 50;
  
  // กำหนดปุ่มพรีเซ็ตอิงจากค่าน้ำหนักขั้นต่ำของร้าน
  let selectedWeight = minGrams;
  const tiers = product.price_tiers || [];

  // สร้างค่าพรีเซ็ตน้ำหนักแบบยืดหยุ่น เช่น [min, min*2, min*4]
  const presetOptions = [minGrams, minGrams * 25, minGrams * 50, minGrams * 100].filter((v, i, a) => a.indexOf(v) === i);

  container.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center gap-1.5 quick-weights">
        ${presetOptions.map((w, idx) => `
          <button type="button" data-val="${w}" class="btn-preset px-2.5 py-1.5 text-xs rounded-xl border font-semibold transition-all active:scale-95 ${
            idx === 0 
              ? 'bg-stone-900 text-white border-stone-900 shadow-xs' 
              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
          }">${w}g</button>
        `).join('')}
        
        <div class="flex-1 flex items-center bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1 focus-within:border-stone-400 transition-colors">
          <input type="number" min="${minGrams}" step="5" value="${selectedWeight}" class="custom-gram w-full bg-transparent text-xs text-right font-bold text-stone-800 focus:outline-none" />
          <span class="text-[11px] text-stone-400 ml-1 font-medium">g</span>
        </div>
      </div>

      <div class="flex items-center justify-between pt-0.5">
        <div>
          <span class="text-[10px] text-stone-400 block font-medium">เรตราคา (<span class="unit-rate text-amber-700 font-bold font-mono">฿0/g</span>)</span>
          <span class="price-display text-sm font-bold text-stone-900 font-mono tracking-tight">฿0.00</span>
        </div>
        <button class="btn-add-cart bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs">
          ใส่ตะกร้า
        </button>
      </div>
    </div>
  `;

  const customInput = container.querySelector('.custom-gram');
  const priceDisplay = container.querySelector('.price-display');
  const unitRateDisplay = container.querySelector('.unit-rate');
  const presetBtns = container.querySelectorAll('.btn-preset');
  const addBtn = container.querySelector('.btn-add-cart');

  const updateWeight = (grams) => {
    selectedWeight = Number(grams) || 0;
    customInput.value = selectedWeight;

    const currentRate = calculateUnitPrice(selectedWeight, tiers, product.price_per_unit);
    const lineTotal = selectedWeight * currentRate;

    unitRateDisplay.textContent = `฿${currentRate.toFixed(2)}/g`;
    priceDisplay.textContent = `฿${lineTotal.toFixed(2)}`;

    presetBtns.forEach((b) => {
      const match = Number(b.dataset.val) === selectedWeight;
      b.className = match
        ? 'btn-preset px-2.5 py-1.5 text-xs rounded-xl border font-semibold bg-stone-900 text-white border-stone-900 shadow-xs transition-all active:scale-95'
        : 'btn-preset px-2.5 py-1.5 text-xs rounded-xl border font-semibold bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 transition-all active:scale-95';
    });

    if (selectedWeight < minGrams) {
      priceDisplay.textContent = `ขั้นต่ำ ${minGrams} กรัม`;
      priceDisplay.classList.add('text-red-500');
      addBtn.disabled = true;
      addBtn.classList.add('opacity-40', 'cursor-not-allowed');
    } else {
      priceDisplay.classList.remove('text-red-500');
      addBtn.disabled = false;
      addBtn.classList.remove('opacity-40', 'cursor-not-allowed');
    }
  };

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => updateWeight(btn.dataset.val));
  });

  customInput.addEventListener('input', (e) => {
    updateWeight(e.target.value);
  });

  addBtn.addEventListener('click', () => {
    if (selectedWeight < minGrams) return;
    cartState.addItem(product, selectedWeight, null);
    showAddedFeedback(addBtn);
  });

  updateWeight(selectedWeight);
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
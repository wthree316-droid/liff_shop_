import { cartState } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { showToast } from '../../core/toast.js';
import { catalogLogic } from './catalog-logic.js';

export function initCatalog(products, containerElement, tabContainer) {
  catalogLogic.setProducts(products);
  setupCategoryFilter(tabContainer, containerElement);
  renderCatalog(containerElement);
}

function setupCategoryFilter(tabContainer, containerElement) {
  const tabs = [
    { id: 'ALL', name: 'ทั้งหมด' },
    ...CONFIG.CATEGORIES.map(c => ({ id: c.id, name: c.name }))
  ];

  tabContainer.innerHTML = tabs.map((t, idx) => `
    <button 
      data-category="${t.id}" 
      class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
        idx === 0
          ? 'bg-stone-900 text-white shadow-xs'
          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
      }">
      ${t.name}
    </button>
  `).join('');

  const buttons = tabContainer.querySelectorAll('button');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      catalogLogic.setActiveCategory(btn.dataset.category);

      buttons.forEach((b) => {
        b.className = 'px-4 py-1.5 rounded-full text-xs font-semibold bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all active:scale-95';
      });
      btn.className = 'px-4 py-1.5 rounded-full text-xs font-semibold bg-stone-900 text-white shadow-xs transition-all active:scale-95';

      renderCatalog(containerElement);
    });
  });
}

export function renderCatalog(containerElement) {
  containerElement.innerHTML = '';
  const filtered = catalogLogic.getFilteredProducts();

  if (filtered.length === 0) {
    containerElement.innerHTML = `
      <div class="p-12 text-center text-stone-400 bg-white border border-stone-200/80 rounded-3xl text-xs space-y-1">
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
    const startingPrice = catalogLogic.getStartingPrice(product);

    card.innerHTML = `
      <div class="product-clickable flex gap-3.5 cursor-pointer">
        <div class="relative w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-100 shadow-inner">
          <img src="${product.image_url || defaultImg}" alt="${product.name}" class="w-full h-full object-cover" loading="lazy" />
          <span class="absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-md ${isWeight ? 'bg-amber-950/70 text-amber-300' : 'bg-stone-900/70 text-stone-200'}">
            ${isWeight ? 'ชั่งกรัม' : 'ชิ้น'}
          </span>
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-center">
          <h3 class="text-sm font-bold text-stone-900 truncate leading-snug">${product.name}</h3>
          <p class="text-xs text-stone-500 mt-1 font-mono">
            ${isWeight ? 'เริ่มต้น ' : ''}฿${Number(startingPrice).toFixed(2)} 
            <span class="text-[10px] text-stone-400 font-sans">/ ${isWeight ? 'แพ็กเกจ' : 'ชิ้น'}</span>
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

    card.querySelector('.product-clickable').addEventListener('click', () => {
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

  if (isWeight) {
    renderWeightControls(product, actionArea, true);
  } else {
    renderPieceControls(product, actionArea, true);
  }

  const btnClose = document.getElementById('btn-close-detail-modal');
  if (btnClose) {
    btnClose.onclick = () => modal.close();
  }

  modal.showModal();
}

function renderWeightControls(product, container, isDetailModal = false) {
  const tiers = Array.isArray(product.price_tiers) && product.price_tiers.length > 0 ? product.price_tiers : [];
  const ratePerGram = Number(product.price_per_unit) || 0;

  let isCustom = tiers.length === 0;
  let selectedTier = tiers[0] || null;
  let customWeight = 10;
  let customPrice = customWeight * ratePerGram;

  function render() {
    container.innerHTML = `
      <div class="space-y-3">
        ${tiers.length > 0 ? `
          <div>
            <span class="text-[10px] text-stone-400 font-medium block mb-1">เลือกขนาดแพ็กเกจ:</span>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${tiers.map((t, idx) => `
                <button type="button" data-idx="${idx}" class="btn-tier px-2.5 py-1 text-xs rounded-xl border font-semibold transition-all active:scale-95 ${
                  !isCustom && selectedTier?.weight === t.weight
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }">
                  ${t.label || `${t.weight}g`} (฿${Number(t.price).toFixed(0)})
                </button>
              `).join('')}
              <button type="button" id="btn-toggle-custom" class="px-2.5 py-1 text-xs rounded-xl border font-semibold transition-all active:scale-95 ${
                isCustom 
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }">
                ✏️ ระบุเอง (฿${ratePerGram}/g)
              </button>
            </div>
          </div>
        ` : ''}

        ${isCustom ? `
          <div class="bg-amber-50/60 p-3 rounded-2xl border border-amber-100 space-y-2">
            <div class="flex items-center justify-between text-[11px] font-bold text-amber-900">
              <span>ระบุปริมาณหรือยอดเงิน</span>
              <span class="text-[10px] text-amber-700 font-normal">฿${ratePerGram.toFixed(2)} ต่อกรัม</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] text-stone-500 block mb-0.5">น้ำหนัก (กรัม)</label>
                <input type="number" id="input-weight" min="1" step="1" value="${customWeight}" 
                  class="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-amber-600" />
              </div>
              <div>
                <label class="text-[10px] text-stone-500 block mb-0.5">ยอดเงิน (บาท)</label>
                <input type="number" id="input-price" min="1" step="0.01" value="${customPrice.toFixed(2)}" 
                  class="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-mono font-bold text-amber-800 focus:outline-amber-600" />
              </div>
            </div>
          </div>
        ` : ''}

        <div class="flex items-center justify-between pt-1 border-t border-stone-100">
          <div>
            <span class="text-[10px] text-stone-400 block font-medium">ยอดชำระ</span>
            <span class="display-total text-sm font-bold text-amber-700 font-mono">
              ฿${Number(isCustom ? customPrice : selectedTier.price).toFixed(2)}
            </span>
          </div>
          <button type="button" class="btn-add-cart bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs">
            ใส่ตะกร้า
          </button>
        </div>
      </div>
    `;

    container.querySelectorAll('.btn-tier').forEach(btn => {
      btn.addEventListener('click', () => {
        isCustom = false;
        selectedTier = tiers[Number(btn.dataset.idx)];
        render();
      });
    });

    const btnCustom = container.querySelector('#btn-toggle-custom');
    if (btnCustom) {
      btnCustom.addEventListener('click', () => {
        isCustom = true;
        render();
      });
    }

    if (isCustom) {
      const inputW = container.querySelector('#input-weight');
      const inputP = container.querySelector('#input-price');
      const totalDisplay = container.querySelector('.display-total');

      inputW.addEventListener('input', () => {
        const res = catalogLogic.calculateCustomWeightPrice(inputW.value, ratePerGram);
        customWeight = res.weight;
        customPrice = res.price;
        inputP.value = res.price.toFixed(2);
        totalDisplay.textContent = `฿${res.price.toFixed(2)}`;
      });

      inputP.addEventListener('input', () => {
        const res = catalogLogic.calculateCustomPriceWeight(inputP.value, ratePerGram);
        customPrice = res.price;
        customWeight = res.weight;
        inputW.value = res.weight;
        totalDisplay.textContent = `฿${res.price.toFixed(2)}`;
      });
    }

    const addBtn = container.querySelector('.btn-add-cart');
    addBtn.addEventListener('click', () => {
      if (isCustom) {
        if (customWeight <= 0) {
          showToast('กรุณาระบุน้ำหนักให้ถูกต้อง', 'error');
          return;
        }
        cartState.addItem(product, customWeight, `${customWeight}g (กำหนดเอง)`);
      } else {
        const variantLabel = selectedTier.label || `${selectedTier.weight}g`;
        cartState.addItem(product, selectedTier.weight, variantLabel);
      }

      showToast(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว`, 'success');
      showAddedFeedback(addBtn);

      if (isDetailModal) {
        setTimeout(() => {
          const detailModal = document.getElementById('product-detail-modal');
          if (detailModal) detailModal.close();
        }, 300);
      }
    });
  }

  render();
}

function renderPieceControls(product, container, isDetailModal = false) {
  let quantity = 1;
  let selectedVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
  const hasVariants = product.variants && product.variants.length > 0;

  container.innerHTML = `
    <div class="space-y-3">
      ${hasVariants ? `
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-stone-400 font-medium">แบบ:</span>
          <div class="flex gap-1.5 flex-wrap variant-group">
            ${product.variants.map((v, idx) => `
              <button type="button" data-variant="${v}" class="btn-var px-2.5 py-1 text-[11px] rounded-xl border font-semibold transition-all active:scale-95 ${
                idx === 0
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }">${v}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

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
    showToast(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว`, 'success');
    showAddedFeedback(addBtn);

    if (isDetailModal) {
      setTimeout(() => {
        const detailModal = document.getElementById('product-detail-modal');
        if (detailModal) detailModal.close();
      }, 300);
    }
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
import { promosState } from './promos-logic.js';

let isDelegated = false;

function updatePromoImagePreview(imageUrl) {
  const imgEl = document.getElementById('promo-preview-img');
  const placeholderEl = document.getElementById('promo-preview-placeholder');

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

export function initPromotionsModule() {
  const btnAdd = document.getElementById('btn-add-promo');
  const modal = document.getElementById('modal-promo');
  const form = document.getElementById('form-promo');

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      form.reset();
      document.getElementById('promo-edit-id').value = '';
      document.getElementById('promo-modal-title').textContent = 'สร้างโค้ดส่วนลด';
      document.getElementById('promo-code').disabled = false;
      document.getElementById('promo-banner').value = '';
      
      updatePromoImagePreview('');
      modal.showModal();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const { editId, payload } = promosState.extractFormPayload(e.target);
        const updatedList = await promosState.savePromo(payload, editId);
        modal.close();
        renderPromotionsList(updatedList);
      } catch (err) {
        alert(err.message);
      }
    });
  }
}

export async function loadPromotions() {
  const container = document.getElementById('promos-list');
  container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">กำลังโหลดโปรโมชั่น...</div>';

  try {
    const list = await promosState.loadFromApi();
    renderPromotionsList(list);
    initPromoDelegation();
  } catch (err) {
    container.innerHTML = `<div class="bg-white p-6 rounded-2xl border border-red-200 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

function renderPromotionsList(promos) {
  const container = document.getElementById('promos-list');
  if (!promos.length) {
    container.innerHTML = `
      <div class="bg-white p-8 rounded-3xl border border-stone-200 text-center space-y-2">
        <span class="text-2xl">🎟️</span>
        <p class="text-xs font-bold text-stone-700">ไม่มีโค้ดโปรโมชั่น</p>
        <p class="text-[11px] text-stone-400">กดปุ่ม "+ สร้างโค้ด" เพื่อเพิ่มแคมเปญส่วนลด</p>
      </div>
    `;
    return;
  }

  container.innerHTML = promos.map(p => {
    const isAvail = Boolean(p.is_active);
    const discountText = p.discount_type === 'PERCENTAGE' 
      ? `ลด ${p.discount_value}%` 
      : `ลด ฿${Number(p.discount_value).toFixed(2)}`;

    return `
      <div class="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden transition-all relative">
        
        <!-- แบนเนอร์ภาพ ถ้ามี -->
        ${p.banner_image_url ? `
          <div class="w-full h-24 bg-stone-100 overflow-hidden border-b border-stone-100">
            <img src="${p.banner_image_url}" alt="${p.title}" class="w-full h-full object-cover" />
          </div>
        ` : ''}

        <!-- เนื้อหาการ์ดคูปอง -->
        <div class="p-3.5 space-y-2.5">
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/80 tracking-wide">${p.code}</span>
                <button data-code="${p.code}" class="btn-copy-promo p-1 text-stone-400 hover:text-amber-800 rounded-lg text-xs" title="คัดลอกโค้ด">
                  📋
                </button>
              </div>
              <h3 class="text-xs font-bold text-stone-900 mt-1">${p.title}</h3>
            </div>

            <!-- สวิตช์ iOS Toggle -->
            <button 
              type="button" 
              data-id="${p.id}" 
              role="switch" 
              aria-checked="${isAvail}" 
              class="btn-toggle-promo relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAvail ? 'bg-emerald-500' : 'bg-stone-200'}"
              title="${isAvail ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}"
            >
              <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isAvail ? 'translate-x-5' : 'translate-x-0'}"></span>
            </button>
          </div>

          <!-- เงื่อนไขส่วนลด -->
          <div class="flex items-center justify-between text-[11px] bg-stone-50 p-2.5 rounded-2xl border border-stone-100">
            <span class="font-bold text-amber-800 font-eng text-xs">${discountText}</span>
            <span class="text-stone-500 font-medium">
              ${p.min_order_amount > 0 ? `ขั้นต่ำ ฿${Number(p.min_order_amount).toFixed(2)}` : 'ไม่มีขั้นต่ำ'}
              ${p.max_discount_amount ? ` (ลดสูงสุด ฿${p.max_discount_amount})` : ''}
            </span>
          </div>

          <!-- ปุ่ม Actions -->
          <div class="flex justify-end items-center gap-2 pt-1 border-t border-stone-100">
            <button data-id="${p.id}" class="btn-edit-promo px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-all active:scale-95">
              ✏️ แก้ไข
            </button>
            <button data-id="${p.id}" class="btn-delete-promo px-3 py-1.5 rounded-xl hover:bg-red-50 text-red-500 text-xs font-medium transition-all active:scale-95">
              🗑️ ลบ
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initPromoDelegation() {
  if (isDelegated) return;
  isDelegated = true;

  const container = document.getElementById('promos-list');
  container.addEventListener('click', async (e) => {
    // 1. ปุ่มคัดลอกโค้ด
    const btnCopy = e.target.closest('.btn-copy-promo');
    if (btnCopy) {
      const code = btnCopy.dataset.code;
      try {
        await navigator.clipboard.writeText(code);
        btnCopy.textContent = '✓';
        setTimeout(() => { btnCopy.textContent = '📋'; }, 1500);
      } catch (err) {
        alert('คัดลอกไม่สำเร็จ');
      }
      return;
    }

    // 2. iOS Toggle Switch (Optimistic UI)
    const btnToggle = e.target.closest('.btn-toggle-promo');
    if (btnToggle) {
      const id = btnToggle.dataset.id;
      const knob = btnToggle.querySelector('span');
      btnToggle.disabled = true;

      try {
        const isActive = await promosState.toggleActive(id);
        btnToggle.setAttribute('aria-checked', String(isActive));
        if (isActive) {
          btnToggle.className = 'btn-toggle-promo relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-emerald-500';
          if (knob) knob.className = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out translate-x-5';
        } else {
          btnToggle.className = 'btn-toggle-promo relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-stone-200';
          if (knob) knob.className = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out translate-x-0';
        }
      } catch (err) {
        alert(err.message);
      } finally {
        btnToggle.disabled = false;
      }
      return;
    }

    // 3. เปิด Modal แก้ไข
    const btnEdit = e.target.closest('.btn-edit-promo');
    if (btnEdit) {
      handleOpenEditPromo(btnEdit.dataset.id);
      return;
    }

    // 4. ลบโปรโมชั่น
    const btnDel = e.target.closest('.btn-delete-promo');
    if (btnDel) {
      if (!confirm('ยืนยันที่จะลบโค้ดโปรโมชั่นนี้?')) return;
      try {
        const updatedList = await promosState.deletePromo(btnDel.dataset.id);
        renderPromotionsList(updatedList);
      } catch (err) {
        alert(err.message);
      }
    }
  });
}

function handleOpenEditPromo(promoId) {
  const item = promosState.getPromoById(promoId);
  if (!item) return;

  document.getElementById('promo-edit-id').value = item.id;
  document.getElementById('promo-modal-title').textContent = `แก้ไขโค้ด: ${item.code}`;
  
  const codeInput = document.getElementById('promo-code');
  codeInput.value = item.code;
  codeInput.disabled = true;

  document.getElementById('promo-title').value = item.title;
  document.getElementById('promo-type').value = item.discount_type;
  document.getElementById('promo-value').value = item.discount_value;
  document.getElementById('promo-min').value = item.min_order_amount || '';
  document.getElementById('promo-max').value = item.max_discount_amount || '';
  document.getElementById('promo-banner').value = item.banner_image_url || '';

  updatePromoImagePreview(item.banner_image_url || '');

  document.getElementById('modal-promo').showModal();
}
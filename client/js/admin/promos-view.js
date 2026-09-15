import {
  fetchAdminPromotions,
  createAdminPromotion,
  toggleAdminPromotion,
  deleteAdminPromotion
} from './admin-api.js';

export function initPromotionsModule() {
  const modalPromo = document.getElementById('modal-promo');
  const btnAddPromo = document.getElementById('btn-add-promo');
  const formPromo = document.getElementById('form-promo');

  if (btnAddPromo) {
    btnAddPromo.addEventListener('click', () => modalPromo.showModal());
  }

  if (formPromo) {
    formPromo.addEventListener('submit', async (e) => {
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
  }
}

export async function loadPromotions() {
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
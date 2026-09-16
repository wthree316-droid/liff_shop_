import { showToast } from '../../core/toast.js';
import { promotionLogic } from './promotion-logic.js';

export function renderPromotions(promotions, containerElement, modalElements) {
  promotionLogic.setPromotions(promotions);
  containerElement.innerHTML = '';

  const list = promotionLogic.getPromotions();

  if (!list || list.length === 0) {
    containerElement.innerHTML = `
      <div class="w-full p-6 text-center bg-white rounded-3xl border border-stone-200/80 text-xs text-stone-400 space-y-1">
        <span class="text-xl block">🎟️</span>
        <p>ยังไม่มีโปรโมชั่นพิเศษในขณะนี้</p>
      </div>
    `;
    return;
  }

  list.forEach((promo) => {
    const card = document.createElement('div');
    card.className = 'min-w-[280px] max-w-[280px] bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden snap-center flex-shrink-0 cursor-pointer active:scale-98 transition-all hover:shadow-md';

    const bannerImg = promo.banner_image_url || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80';
    const discountText = promo.discount_type === 'PERCENTAGE' 
      ? `ลด ${promo.discount_value}%` 
      : `ลด ฿${Number(promo.discount_value).toFixed(0)}`;

    card.innerHTML = `
      <div class="h-28 w-full overflow-hidden relative bg-stone-100">
        <img src="${bannerImg}" alt="${promo.title}" class="w-full h-full object-cover" loading="lazy" />
        <span class="absolute top-2.5 right-2.5 bg-stone-900/85 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
          ${promo.code}
        </span>
      </div>
      <div class="p-3.5 space-y-1">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-stone-900 truncate flex-1">${promo.title}</h3>
          <span class="text-[11px] font-bold text-amber-700 font-mono ml-2 shrink-0">${discountText}</span>
        </div>
        <p class="text-[11px] text-stone-400 line-clamp-1">${promo.description || (promo.min_order_amount > 0 ? `ขั้นต่ำ ฿${promo.min_order_amount}` : 'ไม่มีขั้นต่ำ')}</p>
      </div>
    `;

    card.addEventListener('click', () => {
      openPromoModal(promo, modalElements);
    });

    containerElement.appendChild(card);
  });
}

function openPromoModal(promo, { modal, img, title, desc, code, copyBtn }) {
  img.src = promo.banner_image_url || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80';
  title.textContent = promo.title;
  desc.textContent = promo.description || (promo.min_order_amount > 0 ? `ยอดสั่งซื้อขั้นต่ำ ฿${promo.min_order_amount}` : 'ไม่มีขั้นต่ำในการสั่งซื้อ');
  code.textContent = promo.code;

  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(promo.code);
      showToast(`คัดลอกโค้ด "${promo.code}" สำเร็จแล้ว`, 'success');
      copyBtn.textContent = 'คัดลอกแล้ว ✓';
      setTimeout(() => { copyBtn.textContent = 'คัดลอก'; }, 2000);
    } catch (err) {
      showToast('คัดลอกไม่สำเร็จ กรุณากดเลือกข้อความเอง', 'error');
    }
  };

  modal.showModal();
}
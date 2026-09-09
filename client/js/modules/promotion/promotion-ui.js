export function renderPromotions(promotions, containerElement, modalElements) {
  containerElement.innerHTML = '';

  if (!promotions || promotions.length === 0) {
    containerElement.innerHTML = `
      <div class="w-full p-4 text-center bg-stone-100 rounded-xl text-xs text-stone-400">
        ยังไม่มีโปรโมชั่นพิเศษในขณะนี้
      </div>
    `;
    return;
  }

  promotions.forEach((promo) => {
    const card = document.createElement('div');
    card.className = 'min-w-[280px] max-w-[280px] bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden snap-center flex-shrink-0 cursor-pointer active:scale-95 transition-transform';

    const bannerImg = promo.banner_image_url || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80';

    card.innerHTML = `
      <div class="h-28 w-full overflow-hidden relative bg-stone-100">
        <img src="${bannerImg}" alt="${promo.title}" class="w-full h-full object-cover" loading="lazy" />
        <span class="absolute top-2 right-2 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
          ${promo.code}
        </span>
      </div>
      <div class="p-3">
        <h3 class="text-xs font-bold text-stone-800 truncate">${promo.title}</h3>
        <p class="text-[11px] text-stone-500 mt-1 line-clamp-1">${promo.description || 'กดเพื่อดูรายละเอียดเงื่อนไข'}</p>
      </div>
    `;

    // ผูก Event เปิด Modal แสดงรายละเอียด
    card.addEventListener('click', () => {
      openPromoModal(promo, modalElements);
    });

    containerElement.appendChild(card);
  });
}

function openPromoModal(promo, { modal, img, title, desc, code, copyBtn }) {
  img.src = promo.banner_image_url || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&q=80';
  title.textContent = promo.title;
  desc.textContent = promo.description || 'ไม่มีรายละเอียดเพิ่มเติม';
  code.textContent = promo.code;

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(promo.code).then(() => {
      copyBtn.textContent = 'คัดลอกแล้ว!';
      copyBtn.classList.replace('bg-stone-200', 'bg-amber-600');
      copyBtn.classList.add('text-white');
      setTimeout(() => {
        copyBtn.textContent = 'คัดลอก';
        copyBtn.classList.replace('bg-amber-600', 'bg-stone-200');
        copyBtn.classList.remove('text-white');
      }, 2000);
    });
  };

  modal.showModal();
}
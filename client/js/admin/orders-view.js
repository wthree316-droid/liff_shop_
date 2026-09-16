import { ordersState } from './orders-logic.js';

let isDelegated = false;

export function setupOrderFilters() {
  const filterBtns = document.querySelectorAll('#order-filters .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.className = 'filter-btn shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all bg-white text-stone-600 border border-stone-200 hover:bg-stone-50';
      });
      btn.className = 'filter-btn shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all bg-stone-900 text-white shadow-xs';
      
      const filtered = ordersState.setStatusFilter(btn.dataset.status);
      renderOrders(filtered);
    });
  });

  const dateStart = document.getElementById('order-date-start');
  const dateEnd = document.getElementById('order-date-end');
  const btnClear = document.getElementById('btn-clear-date');

  function handleDateRangeChange() {
    const s = dateStart.value;
    const e = dateEnd.value;
    if (s || e) {
      btnClear.classList.remove('hidden');
    } else {
      btnClear.classList.add('hidden');
    }
    const filtered = ordersState.setDateRange(s, e);
    renderOrders(filtered);
  }

  if (dateStart) dateStart.addEventListener('change', handleDateRangeChange);
  if (dateEnd) dateEnd.addEventListener('change', handleDateRangeChange);

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      dateStart.value = '';
      dateEnd.value = '';
      btnClear.classList.add('hidden');
      const filtered = ordersState.clearDateFilter();
      renderOrders(filtered);
    });
  }
}

export function setupShippingModal() {
  const modalShipping = document.getElementById('modal-shipping');
  const formShipping = document.getElementById('form-shipping');

  if (formShipping) {
    formShipping.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('ship-order-id').value;
      const tracking = document.getElementById('ship-tracking').value;
      try {
        const filtered = await ordersState.updateStatus(id, 'SHIPPED', tracking);
        modalShipping.close();
        renderOrders(filtered);
      } catch (err) {
        alert(err.message);
      }
    });
  }
}

export async function loadOrders() {
  const container = document.getElementById('orders-list');
  container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">กำลังโหลดออเดอร์...</div>';

  try {
    const orders = await ordersState.loadFromApi();
    renderOrders(orders);
    initEventDelegation();
  } catch (err) {
    container.innerHTML = `<div class="bg-white p-6 rounded-2xl border border-red-200 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

function renderOrders(orders) {
  const container = document.getElementById('orders-list');
  const metricBadge = document.getElementById('orders-metric-badge');

  const metrics = ordersState.calculateMetrics(orders);
  if (metricBadge) {
    metricBadge.innerHTML = `
      <span class="text-[10px] text-stone-400 block font-medium">แสดง ${metrics.totalCount} บิล</span>
      <span class="text-xs font-bold text-stone-800 font-eng">฿${metrics.totalSales.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
    `;
  }

  if (!orders.length) {
    container.innerHTML = `
      <div class="bg-white p-8 rounded-3xl border border-stone-200/80 text-center space-y-2">
        <span class="text-2xl">📦</span>
        <p class="text-xs font-bold text-stone-700">ไม่พบคำสั่งซื้อ</p>
        <p class="text-[11px] text-stone-400">ไม่มีรายการคำสั่งซื้อในช่วงเงื่อนไขที่เลือก</p>
      </div>
    `;
    return;
  }

  let renderedHtml = '';
  let lastDateKey = null;

  orders.forEach(o => {
    const currentDateKey = o.date_key || 'unknown';
    if (currentDateKey !== lastDateKey) {
      lastDateKey = currentDateKey;
      const displayDate = o.date_label || currentDateKey;
      renderedHtml += `
        <div class="sticky top-[104px] z-20 py-1 my-1 flex justify-center">
          <span class="bg-stone-800/90 backdrop-blur-md text-stone-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
            📅 ${displayDate}
          </span>
        </div>
      `;
    }

    const isCod = o.payment_method === 'COD';
    const depositVal = Number(o.deposit_amount || 0);
    const grandTotalVal = Number(o.grand_total || 0);
    const timeDisplay = o.time_display ? `🕒 ${o.time_display}` : '';

    const paymentBadge = isCod
      ? `<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">COD (มัดจำ ฿${depositVal.toFixed(2)})</span>`
      : `<span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-stone-100 text-stone-700">โอนเต็ม</span>`;

    const fullShippingCopy = `${o.customer_name} (${o.customer_phone}) ${o.shipping_address}`;

    renderedHtml += `
      <div class="bg-white p-4 rounded-3xl border border-stone-200/90 shadow-xs space-y-3 transition-all">
        <!-- บรรทัดบน: รหัสบิล, เวลา, วิธีจ่าย และ Badge สถานะ -->
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-mono text-xs font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg">#${o.id.slice(0, 8)}</span>
              ${timeDisplay ? `<span class="text-[10px] font-mono text-stone-400">${timeDisplay}</span>` : ''}
              ${paymentBadge}
            </div>
            <p class="text-xs font-bold text-stone-900 mt-1.5">${o.customer_name} <span class="font-mono font-medium text-stone-500">(${o.customer_phone})</span></p>
          </div>
          <div>${renderStatusBadge(o.status)}</div>
        </div>

        <!-- ที่อยู่จัดส่ง พร้อมปุ่มกด Copy ในคลิกเดียว -->
        <div class="bg-stone-50 rounded-2xl p-2.5 border border-stone-100 flex justify-between items-start gap-2">
          <p class="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">${o.shipping_address}</p>
          <button data-copy="${fullShippingCopy}" class="btn-copy-address shrink-0 px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-[10px] font-bold text-stone-700 active:scale-95 transition-all shadow-2xs flex items-center gap-1">
            📋 คัดลอก
          </button>
        </div>

        <!-- รายการสินค้า -->
        <div class="space-y-1 text-xs border-t border-b border-stone-100 py-2">
          <p class="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">สินค้าในบิล (${o.items ? o.items.length : 0} รายการ):</p>
          ${o.items && o.items.length > 0 ? o.items.map(item => `
            <div class="flex justify-between items-center text-stone-700 py-0.5">
              <div class="truncate pr-2">
                <span class="font-medium text-stone-900">${item.product_name}</span>
                <span class="text-[11px] text-stone-400">
                  (${item.quantity_or_weight > 1 ? `${item.quantity_or_weight}g` : 'ชิ้น'}${item.selected_variant ? ` / ${item.selected_variant}` : ''})
                </span>
                <span class="text-amber-800 font-bold ml-1 font-mono text-[11px]">x${item.package_count || 1}</span>
              </div>
              <span class="font-mono text-stone-900 shrink-0 font-bold">฿${Number(item.line_total).toFixed(2)}</span>
            </div>
          `).join('') : '<p class="text-stone-400 text-[11px]">ไม่พบรายการสินค้า</p>'}
        </div>

        <!-- สรุปยอดเงิน -->
        <div class="flex justify-between items-center text-xs">
          <div>
            <span class="text-[11px] text-stone-400 block">ยอดรวมทั้งสิ้น</span>
            <strong class="text-sm font-bold text-stone-900 font-eng">฿${grandTotalVal.toFixed(2)}</strong>
            ${isCod ? `<span class="text-[10px] text-amber-800 block font-medium">รอเก็บปลายทาง ฿${grandTotalVal.toFixed(2)}</span>` : ''}
          </div>
          ${o.tracking_number ? `<span class="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-xl">📦 ${o.tracking_number}</span>` : ''}
        </div>

        <!-- ปุ่ม Action แตะง่าย (Touch Target 40-44px) -->
        <div class="flex justify-end items-center gap-2 pt-1">
          ${renderOrderActionButtons(o)}
        </div>
      </div>
    `;
  });

  container.innerHTML = renderedHtml;
}

function initEventDelegation() {
  if (isDelegated) return;
  isDelegated = true;

  const container = document.getElementById('orders-list');
  container.addEventListener('click', async (e) => {
    // 1. ปุ่มคัดลอกที่อยู่จัดส่ง
    const btnCopy = e.target.closest('.btn-copy-address');
    if (btnCopy) {
      const textToCopy = btnCopy.dataset.copy;
      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalText = btnCopy.innerHTML;
        btnCopy.innerHTML = '✓ คัดลอกแล้ว';
        btnCopy.classList.add('text-emerald-700', 'border-emerald-300', 'bg-emerald-50');
        setTimeout(() => {
          btnCopy.innerHTML = originalText;
          btnCopy.classList.remove('text-emerald-700', 'border-emerald-300', 'bg-emerald-50');
        }, 1500);
      } catch (err) {
        alert('คัดลอกไม่สำเร็จ กรุณากดเลือกข้อความเอง');
      }
      return;
    }

    // 2. เปลี่ยนสถานะคำสั่งซื้อ
    const btnUpdate = e.target.closest('.btn-update-order');
    if (btnUpdate) {
      const { id, status } = btnUpdate.dataset;
      if (!confirm(`ยืนยันการเปลี่ยนสถานะเป็น ${status}?`)) return;
      try {
        const filtered = await ordersState.updateStatus(id, status);
        renderOrders(filtered);
      } catch (err) {
        alert(err.message);
      }
      return;
    }

    // 3. ใส่เลขพัสดุ
    const btnShip = e.target.closest('.btn-ship-order');
    if (btnShip) {
      const modal = document.getElementById('modal-shipping');
      document.getElementById('ship-order-id').value = btnShip.dataset.id;
      document.getElementById('ship-tracking').value = '';
      modal.showModal();
      return;
    }

    // 4. ส่งทันที (ไม่มีแทร็กกิ้ง)
    const btnQuickShip = e.target.closest('.btn-quick-ship');
    if (btnQuickShip) {
      if (!confirm('ยืนยันส่งทันทีโดยไม่ระบุเลขพัสดุ?')) return;
      try {
        const filtered = await ordersState.updateStatus(btnQuickShip.dataset.id, 'SHIPPED');
        renderOrders(filtered);
      } catch (err) {
        alert(err.message);
      }
      return;
    }

    // 5. ดูรูปสลิป
    const btnViewSlip = e.target.closest('.btn-view-slip');
    if (btnViewSlip) {
      const modal = document.getElementById('modal-slip-preview');
      const img = document.getElementById('slip-preview-img');
      const confirmBtn = document.getElementById('btn-confirm-from-slip');

      img.src = btnViewSlip.dataset.url;
      confirmBtn.onclick = async () => {
        modal.close();
        try {
          const filtered = await ordersState.updateStatus(btnViewSlip.dataset.id, 'CONFIRMED');
          renderOrders(filtered);
        } catch (err) {
          alert(err.message);
        }
      };
      modal.showModal();
    }
  });
}

function renderStatusBadge(status) {
  const map = {
    AWAITING_PAYMENT: 'bg-stone-100 text-stone-600 border border-stone-200',
    PAYMENT_SUBMITTED: 'bg-amber-100 text-amber-900 border border-amber-200',
    CONFIRMED: 'bg-blue-50 text-blue-800 border border-blue-200',
    SHIPPED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    CANCELLED: 'bg-stone-100 text-stone-400 border border-stone-200 line-through'
  };
  return `<span class="px-2.5 py-1 rounded-xl text-[10px] font-bold ${map[status] || 'bg-stone-100 text-stone-600'}">${status}</span>`;
}

function renderOrderActionButtons(order) {
  if (order.status === 'AWAITING_PAYMENT') {
    return `
      <button data-id="${order.id}" data-status="CANCELLED" class="btn-update-order px-3 py-2 text-red-500 hover:text-red-700 text-xs font-medium transition-all">ยกเลิก</button>
      <button data-id="${order.id}" data-status="PAYMENT_SUBMITTED" class="btn-update-order px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all">ลูกค้ายืนยันโอนแล้ว</button>
    `;
  }
  if (order.status === 'PAYMENT_SUBMITTED') {
    return `
      <button data-id="${order.id}" data-status="CANCELLED" class="btn-update-order px-3 py-2 text-red-500 hover:text-red-700 text-xs font-medium transition-all">ปฏิเสธสลิป</button>
      ${order.slip_image_url ? `<button data-url="${order.slip_image_url}" data-id="${order.id}" class="btn-view-slip px-3.5 py-2 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all">🖼️ ตรวจสลิป</button>` : ''}
      <button data-id="${order.id}" data-status="CONFIRMED" class="btn-update-order px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all">ยืนยันยอดเงิน</button>
    `;
  }
  if (order.status === 'CONFIRMED') {
    return `
      <button data-id="${order.id}" class="btn-quick-ship px-3 py-2 text-stone-500 hover:text-stone-800 text-xs font-medium transition-all">ส่งเลย</button>
      <button data-id="${order.id}" class="btn-ship-order px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all">ใส่เลขพัสดุ</button>
    `;
  }
  if (order.status === 'CANCELLED') {
    return `<span class="text-[11px] text-stone-400 italic">ยกเลิกรายการแล้ว</span>`;
  }
  return '';
}
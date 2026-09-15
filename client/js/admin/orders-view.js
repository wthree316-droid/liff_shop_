import { fetchAdminOrders, updateOrderStatus } from './admin-api.js';

let currentOrderFilter = '';

export function setupOrderFilters() {
  const filterBtns = document.querySelectorAll('#order-filters .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentOrderFilter = btn.dataset.status;
      filterBtns.forEach(b => {
        b.className = 'filter-btn shrink-0 px-3 py-1 rounded-xl text-xs font-semibold bg-white text-stone-600 border border-stone-200';
      });
      btn.className = 'filter-btn shrink-0 px-3 py-1 rounded-xl text-xs font-semibold bg-stone-900 text-white';
      loadOrders();
    });
  });
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
        await updateOrderStatus(id, 'SHIPPED', tracking);
        modalShipping.close();
        loadOrders();
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
    const orders = await fetchAdminOrders(currentOrderFilter);
    if (!orders.length) {
      container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">ไม่มีรายการคำสั่งซื้อ</div>';
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <!-- ข้อมูลลูกค้าและสถานะ -->
        <div class="flex justify-between items-start">
          <div>
            <span class="font-mono text-xs font-bold text-stone-900">#${o.id.slice(0, 8)}</span>
            <p class="text-xs font-semibold text-stone-800 mt-0.5">${o.customer_name} (${o.customer_phone})</p>
            <p class="text-[11px] text-stone-500 line-clamp-1">${o.shipping_address}</p>
          </div>
          <div>${renderStatusBadge(o.status)}</div>
        </div>

        <!-- รายการสินค้าที่สั่งซื้อในบิลนี้ -->
        <div class="bg-stone-50 rounded-xl p-2.5 space-y-1.5 border border-stone-100">
          <p class="text-[10px] font-bold text-stone-400 uppercase tracking-wider">รายการสินค้า (${o.items ? o.items.length : 0} รายการ):</p>
          <div class="space-y-1 text-xs">
            ${o.items && o.items.length > 0 ? o.items.map(item => `
              <div class="flex justify-between items-center text-stone-700">
                <div class="truncate pr-2">
                  <span class="font-medium">${item.product_name}</span>
                  <span class="text-[11px] text-stone-500">
                    (${item.quantity_or_weight > 1 ? `${item.quantity_or_weight}g` : 'ชิ้น'}${item.selected_variant ? ` / ${item.selected_variant}` : ''})
                  </span>
                  <span class="text-amber-800 font-bold ml-1 font-mono">x${item.package_count || 1}</span>
                </div>
                <span class="font-mono text-stone-900 shrink-0">฿${Number(item.line_total).toFixed(2)}</span>
              </div>
            `).join('') : '<p class="text-stone-400 text-[11px]">ไม่พบรายการสินค้า</p>'}
          </div>
        </div>

        <!-- สรุปยอดรวม -->
        <div class="flex justify-between items-center border-t border-stone-100 pt-2 text-xs">
          <span class="text-stone-500">ยอดชำระ: <strong class="text-amber-700 font-bold">฿${Number(o.grand_total).toFixed(2)}</strong></span>
          ${o.tracking_number ? `<span class="text-[11px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded">📦 ${o.tracking_number}</span>` : ''}
        </div>

        <!-- ปุ่ม Action -->
        <div class="flex justify-end gap-2 border-t border-stone-50 pt-2">
          ${renderOrderActionButtons(o)}
        </div>
      </div>
    `).join('');

    // ผูก Event Listeners ตามเดิม
    container.querySelectorAll('.btn-update-order').forEach(b => {
      b.addEventListener('click', () => handleUpdateOrderStatus(b.dataset.id, b.dataset.status));
    });
    container.querySelectorAll('.btn-ship-order').forEach(b => {
      b.addEventListener('click', () => handleOpenShipModal(b.dataset.id));
    });
    container.querySelectorAll('.btn-quick-ship').forEach(b => {
      b.addEventListener('click', () => handleUpdateOrderStatus(b.dataset.id, 'SHIPPED'));
    });
    container.querySelectorAll('.btn-view-slip').forEach(b => {
      b.addEventListener('click', () => {
        const slipUrl = b.dataset.url;
        const orderId = b.dataset.id;
        const modal = document.getElementById('modal-slip-preview');
        const img = document.getElementById('slip-preview-img');
        const confirmBtn = document.getElementById('btn-confirm-from-slip');

        img.src = slipUrl;
        confirmBtn.onclick = async () => {
          modal.close();
          await handleUpdateOrderStatus(orderId, 'CONFIRMED');
        };
        modal.showModal();
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="bg-white p-6 rounded-2xl border border-red-200 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

function renderStatusBadge(status) {
  const map = {
    AWAITING_PAYMENT: 'bg-stone-100 text-stone-600',
    PAYMENT_SUBMITTED: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    SHIPPED: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-red-100 text-red-700'
  };
  return `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${map[status] || 'bg-stone-100 text-stone-600'}">${status}</span>`;
}

function renderOrderActionButtons(order) {
  if (order.status === 'AWAITING_PAYMENT') {
    return `
      <button data-id="${order.id}" data-status="CANCELLED" class="btn-update-order px-3 py-1 text-red-600 text-xs font-medium">ยกเลิกออเดอร์</button>
      <button data-id="${order.id}" data-status="PAYMENT_SUBMITTED" class="btn-update-order px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold">ลูกค้ายืนยันโอนแล้ว</button>
    `;
  }
  if (order.status === 'PAYMENT_SUBMITTED') {
    return `
      <button data-id="${order.id}" data-status="CANCELLED" class="btn-update-order px-3 py-1 text-red-600 text-xs font-medium">ปฏิเสธสลิป</button>
      ${order.slip_image_url ? `<button data-url="${order.slip_image_url}" data-id="${order.id}" class="btn-view-slip px-3 py-1 bg-stone-800 text-white rounded-lg text-xs font-bold">🖼️ ดูสลิป</button>` : ''}
      <button data-id="${order.id}" data-status="CONFIRMED" class="btn-update-order px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">ยืนยันยอดเงิน</button>
    `;
  }
  if (order.status === 'CONFIRMED') {
    return `
      <button data-id="${order.id}" class="btn-quick-ship px-3 py-1 text-stone-600 text-xs font-medium">ส่งทันที (ไม่ระบุเลข)</button>
      <button data-id="${order.id}" class="btn-ship-order px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold">ใส่เลขพัสดุ</button>
    `;
  }
  return '';
}

async function handleUpdateOrderStatus(orderId, nextStatus) {
  if (!confirm(`ยืนยันการเปลี่ยนสถานะเป็น ${nextStatus}?`)) return;
  try {
    await updateOrderStatus(orderId, nextStatus);
    loadOrders();
  } catch (err) {
    alert(`ข้อผิดพลาด: ${err.message}`);
  }
}

function handleOpenShipModal(orderId) {
  const modal = document.getElementById('modal-shipping');
  document.getElementById('ship-order-id').value = orderId;
  document.getElementById('ship-tracking').value = '';
  modal.showModal();
}
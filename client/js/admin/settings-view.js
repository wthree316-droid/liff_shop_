import { fetchAdminSettings, updateAdminSetting } from './admin-api.js';

// แสดงเฉพาะคีย์ที่ใช้งานจริงในระบบปัจจุบัน
const ALLOWED_SETTINGS = {
  shipping_fee: { title: 'ค่าจัดส่งมาตรฐาน', unit: 'บาท', desc: 'ค่าบริการจัดส่งพัสดุปกติ' },
  free_shipping_threshold: { title: 'ยอดสั่งซื้อส่งฟรี', unit: 'บาท', desc: 'ยอดซื้อสุทธิที่ได้รับสิทธิ์ฟรีค่าจัดส่ง' },
  min_order_amount: { title: 'ยอดสั่งซื้อขั้นต่ำ', unit: 'บาท', desc: 'เกณฑ์ยอดรวมสินค้าขั้นต่ำที่อนุญาตให้กดยืนยันออเดอร์' }
};

export async function loadSettings() {
  const container = document.getElementById('settings-list');
  container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">กำลังโหลดการตั้งค่า...</div>';

  try {
    const settings = await fetchAdminSettings();
    // กรองเอาเฉพาะคีย์ที่อยู่ในระบบใหม่
    const activeSettings = settings.filter(s => ALLOWED_SETTINGS[s.key]);

    if (!activeSettings.length) {
      container.innerHTML = '<div class="bg-white p-6 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">ไม่มีรายการตั้งค่า</div>';
      return;
    }

    container.innerHTML = activeSettings.map(s => {
      const meta = ALLOWED_SETTINGS[s.key];
      return `
        <div class="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-xs font-bold text-stone-900">${meta.title}</span>
              <span class="font-mono text-[10px] text-stone-400 ml-1">(${s.key})</span>
              <p class="text-[11px] text-stone-500 mt-0.5">${s.description || meta.desc}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 pt-1">
            <div class="relative flex-1">
              <input 
                type="number" 
                step="1" 
                value="${s.value}" 
                id="input-set-${s.key}" 
                class="w-full pl-3 pr-12 py-1.5 border rounded-xl text-xs font-semibold focus:border-amber-600 outline-none" 
              />
              <span class="absolute right-3 top-2 text-[10px] text-stone-400 font-medium">${meta.unit}</span>
            </div>
            <button data-key="${s.key}" class="btn-save-setting shrink-0 bg-stone-900 hover:bg-stone-800 text-white text-xs px-4 py-1.5 rounded-xl font-bold transition-all active:scale-95">
              บันทึก
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-save-setting').forEach(b => {
      b.addEventListener('click', async () => {
        const key = b.dataset.key;
        const val = parseFloat(document.getElementById(`input-set-${key}`).value);
        if (isNaN(val) || val < 0) {
          alert('กรุณากรอกตัวเลขที่ถูกต้องและไม่ติดลบ');
          return;
        }

        try {
          await updateAdminSetting(key, val);
          alert(`อัปเดตการตั้งค่า '${key}' เรียบร้อยแล้ว`);
          loadSettings();
        } catch (err) {
          alert(`บันทึกล้มเหลว: ${err.message}`);
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="bg-white p-6 rounded-2xl border border-red-200 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}
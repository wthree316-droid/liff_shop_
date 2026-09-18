import { settingsState, ALLOWED_SETTINGS } from './settings-logic.js';

let isSettingsDelegated = false;

// Helper สร้าง Toast แจ้งเตือนสไตล์มินิมอลแทนการใช้ alert()
function showAdminToast(message, type = 'success') {
  const existing = document.getElementById('admin-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'admin-toast';
  const isSuccess = type === 'success';
  toast.className = `fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xl border flex items-center gap-2 transition-all transform duration-200 translate-y-0 opacity-100 ${
    isSuccess 
      ? 'bg-stone-900 text-white border-stone-800' 
      : 'bg-red-600 text-white border-red-500'
  }`;

  toast.innerHTML = `
    <span>${isSuccess ? '✓' : '✕'}</span>
    <span>${message}</span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 200);
  }, 2200);
}

export async function loadSettings() {
  const container = document.getElementById('settings-list');
  container.innerHTML = '<div class="bg-white p-6 rounded-3xl border border-stone-200/80 text-center text-stone-400 text-xs">กำลังโหลดการตั้งค่า...</div>';

  try {
    const { settingsMap, allowedList } = await settingsState.loadFromApi();
    populateBankForm(settingsMap);
    populateUrlForm(settingsMap); // ✓ เติมจุดนี้เพื่อให้ดึง URL เก่ามาแสดง
    renderThresholdsList(allowedList);
    initSettingsEvents();
  } catch (err) {
    container.innerHTML = `<div class="bg-white p-6 rounded-3xl border border-red-200 text-center text-red-500 text-xs">${err.message}</div>`;
  }
}

function populateUrlForm(map) {
  const groupInput = document.getElementById('setting-url-group');
  const fbInput = document.getElementById('setting-url-facebook');
  const mapsInput = document.getElementById('setting-url-maps');

  if (groupInput) groupInput.value = map['url_group'] || '';
  if (fbInput) fbInput.value = map['url_facebook'] || '';
  if (mapsInput) mapsInput.value = map['url_maps'] || '';
}

function renderThresholdsList(activeSettings) {
  const container = document.getElementById('settings-list');
  if (!activeSettings.length) {
    container.innerHTML = '<div class="bg-white p-6 rounded-3xl border border-stone-200/80 text-center text-stone-400 text-xs">ไม่มีรายการตั้งค่า</div>';
    return;
  }

  const iconsMap = {
    shipping_fee: '🚚',
    free_shipping_threshold: '🎁',
    min_order_amount: '🛒',
    cod_deposit_fee: '🛡️'
  };

  container.innerHTML = activeSettings.map(s => {
    const meta = ALLOWED_SETTINGS[s.key] || { title: s.key, unit: 'บาท', desc: '' };
    const icon = iconsMap[s.key] || '⚙️';

    return `
      <div class="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-xs space-y-2.5 transition-all">
        <div class="flex items-start gap-2.5">
          <span class="text-base shrink-0 p-2 bg-stone-50 rounded-xl border border-stone-100">${icon}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs font-bold text-stone-900">${meta.title}</span>
              <span class="font-mono text-[10px] text-stone-400 font-semibold">(${s.key})</span>
            </div>
            <p class="text-[11px] text-stone-500 mt-0.5 leading-relaxed">${s.description || meta.desc}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1 border-t border-stone-50">
          <div class="relative flex-1">
            <input 
              type="number" 
              step="any" 
              value="${s.value}" 
              id="input-set-${s.key}" 
              class="w-full pl-3.5 pr-12 py-2 border border-stone-200 rounded-xl text-xs font-bold font-mono text-stone-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none bg-stone-50/50 transition-all" 
            />
            <span class="absolute right-3 top-2.5 text-[10px] text-stone-400 font-medium">${meta.unit}</span>
          </div>
          <button data-key="${s.key}" class="btn-save-setting shrink-0 bg-stone-900 hover:bg-stone-800 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-xs">
            บันทึก
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function populateBankForm(map) {
  const bankNameInput = document.getElementById('setting-bank-name');
  const bankAccInput = document.getElementById('setting-bank-acc-name');
  const bankNumInput = document.getElementById('setting-bank-number');
  const qrUrlInput = document.getElementById('setting-qr-url');
  const qrImg = document.getElementById('setting-qr-preview-img');
  const placeholder = document.getElementById('setting-qr-placeholder');

  if (bankNameInput) bankNameInput.value = map['bank_name'] || '';
  if (bankAccInput) bankAccInput.value = map['bank_account_name'] || '';
  if (bankNumInput) bankNumInput.value = map['bank_account_number'] || '';
  if (qrUrlInput) qrUrlInput.value = map['payment_qr_url'] || '';

  if (map['payment_qr_url']) {
    qrImg.src = map['payment_qr_url'];
    qrImg.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    qrImg.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
}

function initSettingsEvents() {
  if (isSettingsDelegated) return;
  isSettingsDelegated = true;

  // 1. จัดการบันทึกค่าเกณฑ์ต่างๆ
  const container = document.getElementById('settings-list');
  if (container) {
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-save-setting');
      if (!btn) return;

      const key = btn.dataset.key;
      const input = document.getElementById(`input-set-${key}`);
      const val = parseFloat(input.value);
      
      if (isNaN(val) || val < 0) {
        showAdminToast('กรุณากรอกตัวเลขที่ถูกต้องและไม่ติดลบ', 'error');
        return;
      }

      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '...';

      try {
        await settingsState.updateSingleSetting(key, val);
        showAdminToast(`บันทึก ${ALLOWED_SETTINGS[key]?.title || key} สำเร็จ`);
      } catch (err) {
        showAdminToast(`บันทึกล้มเหลว: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  // 2. อัปโหลดรูป QR Code พร้อมสถานะ Preview
  const qrFileInput = document.getElementById('setting-qr-file');
  const qrUrlInput = document.getElementById('setting-qr-url');
  const qrImg = document.getElementById('setting-qr-preview-img');
  const placeholder = document.getElementById('setting-qr-placeholder');
  const uploadStatus = document.getElementById('setting-qr-upload-status');
  const btnSaveBank = document.getElementById('btn-save-bank-settings');

  if (qrFileInput) {
    qrFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      uploadStatus.textContent = '⏳ กำลังอัปโหลด QR Code...';
      uploadStatus.className = 'text-[10px] text-amber-600 font-medium';

      try {
        const uploadedUrl = await settingsState.uploadQrImage(file);
        qrUrlInput.value = uploadedUrl;
        qrImg.src = uploadedUrl;
        qrImg.classList.remove('hidden');
        placeholder.classList.add('hidden');

        uploadStatus.textContent = '✓ อัปโหลดสำเร็จ อย่าลืมกดบันทึกข้อมูลการเงิน';
        uploadStatus.className = 'text-[10px] text-emerald-600 font-medium';
      } catch (err) {
        uploadStatus.textContent = `✕ อัปโหลดไม่สำเร็จ: ${err.message}`;
        uploadStatus.className = 'text-[10px] text-red-500 font-medium';
        qrFileInput.value = '';
      }
    });
  }

  // 3. บันทึกข้อมูลบัญชีธนาคาร
  if (btnSaveBank) {
    btnSaveBank.addEventListener('click', async () => {
      const bankName = document.getElementById('setting-bank-name').value.trim();
      const bankAcc = document.getElementById('setting-bank-acc-name').value.trim();
      const bankNum = document.getElementById('setting-bank-number').value.trim();
      const qrUrl = qrUrlInput.value.trim();

      const originalBtnText = btnSaveBank.textContent;
      btnSaveBank.disabled = true;
      btnSaveBank.textContent = 'กำลังบันทึกข้อมูล...';

      try {
        await settingsState.saveBankDetails({ bankName, bankAcc, bankNum, qrUrl });
        showAdminToast('บันทึกบัญชีธนาคารและ QR Code เรียบร้อยแล้ว');
      } catch (err) {
        showAdminToast(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
      } finally {
        btnSaveBank.disabled = false;
        btnSaveBank.textContent = originalBtnText;
      }
    });
  }

  // 4. บันทึกลิงก์ภายนอก (Redirect Links) ✓ นำเข้ามาไว้ในนี้
  const btnSaveUrls = document.getElementById('btn-save-url-settings');
  if (btnSaveUrls) {
    btnSaveUrls.addEventListener('click', async () => {
      const urlGroup = document.getElementById('setting-url-group').value.trim();
      const urlFacebook = document.getElementById('setting-url-facebook').value.trim();
      const urlMaps = document.getElementById('setting-url-maps').value.trim();

      const validate = (url) => !url || url.startsWith('http://') || url.startsWith('https://');
      if (!validate(urlGroup) || !validate(urlFacebook) || !validate(urlMaps)) {
        showAdminToast('URL ต้องขึ้นต้นด้วย http:// หรือ https://', 'error');
        return;
      }

      const originalBtnText = btnSaveUrls.textContent;
      btnSaveUrls.disabled = true;
      btnSaveUrls.textContent = 'กำลังบันทึก...';

      try {
        await settingsState.saveUrlSettings({
          url_group: urlGroup,
          url_facebook: urlFacebook,
          url_maps: urlMaps
        });
        showAdminToast('บันทึกลิงก์โซเชียล & แผนที่ เรียบร้อยแล้ว');
      } catch (err) {
        showAdminToast(`บันทึกล้มเหลว: ${err.message}`, 'error');
      } finally {
        btnSaveUrls.disabled = false;
        btnSaveUrls.textContent = originalBtnText;
      }
    });
  }
}
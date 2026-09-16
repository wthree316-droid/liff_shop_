import { uploadAdminAsset } from './admin-api.js';

/**
 * จัดการอัปโหลดรูปภาพไปยัง Supabase Storage ผ่าน Backend API
 */

export async function handleImageUpload(fileInput, hiddenInputId) {
  const file = fileInput.files[0];
  if (!file) return;

  const labelEl = fileInput.previousElementSibling;
  const originalText = labelEl ? labelEl.textContent : '';

  if (labelEl) {
    labelEl.textContent = 'กำลังอัปโหลดรูปภาพ... ⏳';
  }

  try {
    const data = await uploadAdminAsset(file);
    document.getElementById(hiddenInputId).value = data.image_url;

    // ถ้าเป็นการอัปโหลดรูปสินค้า ให้อัปเดตกล่องพรีวิวทันที
    if (hiddenInputId === 'prod-image') {
      const previewImg = document.getElementById('prod-preview-img');
      const placeholder = document.getElementById('prod-preview-placeholder');
      if (previewImg && placeholder) {
        previewImg.src = data.image_url;
        previewImg.classList.remove('hidden');
        placeholder.classList.add('hidden');
      }
    }

    // ถ้าเป็นการอัปโหลดรูปโปรโมชั่น ให้อัปเดตกล่องพรีวิวทันที
    if (hiddenInputId === 'promo-banner') {
      const previewImg = document.getElementById('promo-preview-img');
      const placeholder = document.getElementById('promo-preview-placeholder');
      if (previewImg && placeholder) {
        previewImg.src = data.image_url;
        previewImg.classList.remove('hidden');
        placeholder.classList.add('hidden');
      }
    }

    if (labelEl) {
      labelEl.textContent = 'อัปโหลดรูปภาพสำเร็จแล้ว ✓';
    }
  } catch (err) {
    alert(`เกิดข้อผิดพลาดในการอัปโหลดรูป: ${err.message}`);
    if (labelEl) {
      labelEl.textContent = originalText;
    }
    fileInput.value = '';
  }
}

/**
 * ผูก Event Listener ให้กับช่องเลือกไฟล์สินค้าและโปรโมชั่น
 */
export function setupAssetUploads() {
  const prodFileInput = document.getElementById('prod-file-input');
  if (prodFileInput) {
    prodFileInput.addEventListener('change', (e) => {
      handleImageUpload(e.target, 'prod-image');
    });
  }

  const promoFileInput = document.getElementById('promo-file-input');
  if (promoFileInput) {
    promoFileInput.addEventListener('change', (e) => {
      handleImageUpload(e.target, 'promo-banner');
    });
  }
}
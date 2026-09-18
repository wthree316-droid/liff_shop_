import { 
  fetchAdminPromotions, 
  createAdminPromotion, 
  updateAdminPromotion, 
  toggleAdminPromotion, 
  deleteAdminPromotion 
} from './admin-api.js';

class PromosStateManager {
  constructor() {
    this.promotions = [];
  }

  async loadFromApi() {
    this.promotions = await fetchAdminPromotions();
    return this.promotions;
  }

  getPromoById(id) {
    return this.promotions.find(p => String(p.id) === String(id));
  }

  async toggleActive(id) {
    const res = await toggleAdminPromotion(id);
    const item = this.getPromoById(id);
    if (item && res) {
      item.is_active = res.is_active;
    }
    return item ? item.is_active : false;
  }

  async deletePromo(id) {
    await deleteAdminPromotion(id);
    this.promotions = this.promotions.filter(p => String(p.id) !== String(id));
    return this.promotions;
  }

  async savePromo(payload, editId = null) {
    if (editId) {
      const updated = await updateAdminPromotion(editId, payload);
      const idx = this.promotions.findIndex(p => String(p.id) === String(editId));
      if (idx !== -1) this.promotions[idx] = { ...this.promotions[idx], ...updated };
    } else {

      const created = await createAdminPromotion({ ...payload, is_active: true });
      this.promotions.unshift(created);
    }
    return this.promotions;
  }

  extractFormPayload(formEl) {
    const editId = document.getElementById('promo-edit-id').value;
    const code = document.getElementById('promo-code').value.trim().toUpperCase();
    const title = document.getElementById('promo-title').value.trim();
    const discount_type = document.getElementById('promo-type').value;
    const discount_value = parseFloat(document.getElementById('promo-value').value);
    const min_order_amount = parseFloat(document.getElementById('promo-min').value) || 0;
    const maxVal = document.getElementById('promo-max').value;
    const max_discount_amount = maxVal ? parseFloat(maxVal) : null;
    const banner_image_url = document.getElementById('promo-banner').value.trim() || null;

    if (!title || isNaN(discount_value) || discount_value <= 0) {
      throw new Error('กรุณากรอกข้อมูลส่วนลดและชื่อแคมเปญให้ถูกต้อง');
    }

    const payload = {
      title,
      discount_type,
      discount_value,
      min_order_amount,
      max_discount_amount,
      banner_image_url
    };

    if (!editId) {
      if (!code) throw new Error('กรุณาระบุโค้ดส่วนลด');
      payload.code = code;
    }

    return { editId, payload };
  }
}

export const promosState = new PromosStateManager();
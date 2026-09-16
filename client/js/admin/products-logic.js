import { 
  fetchAdminProducts, 
  createAdminProduct, 
  updateAdminProduct, 
  toggleAdminProduct, 
  deleteAdminProduct 
} from './admin-api.js';

class ProductsStateManager {
  constructor() {
    this.products = [];
  }

  async loadFromApi() {
    this.products = await fetchAdminProducts();
    return this.products;
  }

  getProductById(id) {
    return this.products.find(p => p.id === id);
  }

  async toggleAvailability(productId) {
    const res = await toggleAdminProduct(productId);
    const prod = this.getProductById(productId);
    if (prod && res) {
      prod.is_available = res.is_available;
    }
    return prod ? prod.is_available : false;
  }

  async deleteProduct(productId) {
    await deleteAdminProduct(productId);
    this.products = this.products.filter(p => p.id !== productId);
    return this.products;
  }

  async saveProduct(payload, isEdit) {
    if (isEdit) {
      await updateAdminProduct(payload.id, payload);
      const idx = this.products.findIndex(p => p.id === payload.id);
      if (idx !== -1) this.products[idx] = { ...this.products[idx], ...payload };
    } else {
      const created = await createAdminProduct({ ...payload, is_available: true });
      this.products.unshift(created);
    }
    return this.products;
  }

  extractFormPayload(formEl) {
    const isEdit = document.getElementById('prod-id').disabled;
    const id = document.getElementById('prod-id').value.trim();
    const type = document.getElementById('prod-type').value;
    const variantsRaw = document.getElementById('prod-variants').value.trim();
    const variants = variantsRaw ? variantsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    const pricePerUnit = parseFloat(document.getElementById('prod-price').value);
    if (isNaN(pricePerUnit) || pricePerUnit < 0) {
      throw new Error('กรุณาระบุราคาต่อหน่วยให้ถูกต้อง');
    }

    let priceTiers = [];
    if (type === 'BY_WEIGHT') {
      const rows = document.querySelectorAll('#tier-rows-list .tier-row');
      rows.forEach(r => {
        const weight = parseFloat(r.querySelector('.tier-weight').value);
        const price = parseFloat(r.querySelector('.tier-price').value);
        const label = r.querySelector('.tier-label').value.trim() || `${weight}g`;
        if (!isNaN(weight) && !isNaN(price)) {
          priceTiers.push({ weight, price, label });
        }
      });
    }

    return {
      isEdit,
      payload: {
        id,
        name: document.getElementById('prod-name').value.trim(),
        description: document.getElementById('prod-desc').value.trim(),
        category_id: document.getElementById('prod-cat').value,
        type: type,
        price_per_unit: pricePerUnit,
        image_url: document.getElementById('prod-image').value.trim() || '',
        variants: variants,
        price_tiers: priceTiers
      }
    };
  }
}

export const productsState = new ProductsStateManager();
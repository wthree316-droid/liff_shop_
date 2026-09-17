import { cartState } from '../../core/state.js';
import { getStoreSettings } from '../../core/store-settings.js';
import { apiClient } from '../../core/api-client.js';

const STORAGE_KEY_CUSTOMER = 'artisan_saved_shipping_address';

class CartLogicManager {
  constructor() {
    this.appliedPromo = null;
    this.paymentMethod = 'TRANSFER'; // 'TRANSFER' | 'COD'
  }

  setPaymentMethod(method) {
    this.paymentMethod = method;
  }

  getPaymentMethod() {
    return this.paymentMethod;
  }

  getAppliedPromo() {
    return this.appliedPromo;
  }

  clearPromo() {
    this.appliedPromo = null;
  }

  getItemPrice(item) {
    const { product, quantityOrWeight, selectedVariant } = item;
    if (product.type === 'BY_WEIGHT' && Array.isArray(product.price_tiers)) {
      const tier = product.price_tiers.find(
        (t) => t.label === selectedVariant || Number(t.weight) === Number(quantityOrWeight)
      );
      if (tier) return Number(tier.price);
    }
    return quantityOrWeight * product.price_per_unit;
  }

  calculateSummary() {
    const items = cartState.getItems();
    const settings = getStoreSettings();
    const freeThreshold = Number(settings.free_shipping_threshold) || 500;
    const baseShippingFee = Number(settings.shipping_fee) || 40;
    const codDepositFee = Number(settings.cod_deposit_fee) || 80;

    const subtotal = items.reduce((sum, item) => {
      const count = item.count || 1;
      return sum + (this.getItemPrice(item) * count);
    }, 0);

    let discountAmount = 0;
    if (this.appliedPromo) {
      if (this.appliedPromo.discount_type === 'PERCENTAGE') {
        discountAmount = (subtotal * this.appliedPromo.discount_value) / 100;
        if (this.appliedPromo.max_discount_amount) {
          discountAmount = Math.min(discountAmount, this.appliedPromo.max_discount_amount);
        }
      } else {
        discountAmount = this.appliedPromo.discount_value;
      }
      discountAmount = Math.min(discountAmount, subtotal);
    }

    const netSubtotal = Math.max(0, subtotal - discountAmount);

    let shippingFee = 0;
    let isFreeShipping = false;
    let freeShippingDiff = 0;
    let freeShippingProgress = 0;
    let depositAmount = 0;
    let remainingCod = 0;

    if (this.paymentMethod === 'COD') {
      shippingFee = items.length > 0 ? baseShippingFee : 0;
      depositAmount = codDepositFee; // ยอดโอนมัดจำทันที

      const depositCredit = Math.max(0, codDepositFee - baseShippingFee);
      remainingCod = Math.max(0, netSubtotal - depositCredit);
    } else {
      if (netSubtotal >= freeThreshold) {
        shippingFee = 0;
        isFreeShipping = true;
        freeShippingProgress = 100;
      } else {
        shippingFee = items.length > 0 ? baseShippingFee : 0;
        freeShippingDiff = freeThreshold - netSubtotal;
        freeShippingProgress = Math.min(100, Math.round((netSubtotal / freeThreshold) * 100));
      }
      depositAmount = Math.max(0, netSubtotal + shippingFee);
      remainingCod = 0;
    }

    const grandTotal = Math.max(0, netSubtotal + shippingFee);

    return {
      subtotal,
      shippingFee,
      discountAmount,
      grandTotal,
      depositAmount,
      remainingCod,
      freeThreshold,
      isFreeShipping,
      freeShippingDiff,
      freeShippingProgress
    };
  }

  async validatePromoCode(code) {
    if (!code) {
      this.appliedPromo = null;
      return null;
    }

    const items = cartState.getItems();
    const subtotal = items.reduce((sum, item) => sum + (this.getItemPrice(item) * (item.count || 1)), 0);

    const data = await apiClient('/promotions/validate', {
      method: 'POST',
      body: JSON.stringify({ code, order_amount: subtotal })
    });

    this.appliedPromo = data;
    return data;
  }

  // Address Persistence via LocalStorage
  loadSavedCustomer() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOMER);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Failed to load address:', e);
      return null;
    }
  }

  saveCustomer(customerData) {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMER, JSON.stringify({
        name: customerData.name || '',
        phone: customerData.phone || '',
        address: customerData.address || ''
      }));
    } catch (e) {
      console.warn('Failed to save address:', e);
    }
  }
}

export const cartLogic = new CartLogicManager();
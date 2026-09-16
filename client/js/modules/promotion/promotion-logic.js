class PromotionLogicManager {
  constructor() {
    this.promotions = [];
  }

  setPromotions(promotions) {
    this.promotions = Array.isArray(promotions) ? promotions : [];
  }

  getPromotions() {
    return this.promotions;
  }

  getPromoByCode(code) {
    if (!code) return null;
    return this.promotions.find(p => p.code.toUpperCase() === code.toUpperCase()) || null;
  }

  // คำนวณหาโปรโมชั่นที่เข้าเกณฑ์ยอดซื้อและลดเงินได้มากที่สุด (Best-Value Auto-Apply)
  findBestAutoPromotion(subtotal) {
    if (!this.promotions.length || subtotal <= 0) return null;

    const eligible = this.promotions.filter(p => {
      const minAmount = Number(p.min_order_amount) || 0;
      return p.is_active && subtotal >= minAmount;
    });

    if (!eligible.length) return null;

    let bestPromo = null;
    let maxDiscount = 0;

    eligible.forEach(promo => {
      let discount = 0;
      if (promo.discount_type === 'PERCENTAGE') {
        discount = (subtotal * Number(promo.discount_value)) / 100;
        if (promo.max_discount_amount) {
          discount = Math.min(discount, Number(promo.max_discount_amount));
        }
      } else {
        discount = Number(promo.discount_value);
      }
      discount = Math.min(discount, subtotal);

      if (discount > maxDiscount) {
        maxDiscount = discount;
        bestPromo = { ...promo, calculatedDiscount: discount };
      }
    });

    return bestPromo;
  }
}

export const promotionLogic = new PromotionLogicManager();
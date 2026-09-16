class CatalogLogicManager {
  constructor() {
    this.products = [];
    this.activeCategory = 'ALL';
  }

  setProducts(products) {
    this.products = Array.isArray(products) ? products : [];
  }

  getProducts() {
    return this.products;
  }

  setActiveCategory(catId) {
    this.activeCategory = catId;
  }

  getActiveCategory() {
    return this.activeCategory;
  }

  getFilteredProducts() {
    if (this.activeCategory === 'ALL') return this.products;
    return this.products.filter(p => p.category_id === this.activeCategory);
  }

  // คำนวณราคาเริ่มต้นที่ถูกที่สุดของสินค้า
  getStartingPrice(product) {
    if (product.type === 'BY_WEIGHT' && Array.isArray(product.price_tiers) && product.price_tiers.length > 0) {
      return Math.min(...product.price_tiers.map(t => Number(t.price)));
    }
    return Number(product.price_per_unit || 0);
  }

  calculateCustomWeightPrice(weight, ratePerGram) {
    const w = parseFloat(weight) || 0;
    return {
      weight: w,
      price: Math.round(w * ratePerGram * 100) / 100
    };
  }

  calculateCustomPriceWeight(price, ratePerGram) {
    const p = parseFloat(price) || 0;
    return {
      price: p,
      weight: ratePerGram > 0 ? Math.round((p / ratePerGram) * 100) / 100 : 0
    };
  }
}

export const catalogLogic = new CatalogLogicManager();
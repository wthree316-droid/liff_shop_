class CartState {
  constructor() {
    this.items = [];
    this.listeners = [];
  }

  getItems() {
    return this.items;
  }

addItem(product, quantityOrWeight, selectedVariant = null, packageCount = 1) {
  const existingIndex = this.items.findIndex(
    (item) => item.product.id === product.id && item.selectedVariant === selectedVariant
  );

  if (existingIndex > -1) {
    // ไม่ว่าจะเป็นชิ้นเดี่ยวหรือแพ็กเกจไซส์ตายตัว หากกดไซส์เดิมซ้ำให้บวกจำนวนชิ้น (count) เพิ่ม
    this.items[existingIndex].count = (this.items[existingIndex].count || 1) + packageCount;
  } else {
    this.items.push({
      product,
      quantityOrWeight: Number(quantityOrWeight),
      selectedVariant,
      count: packageCount
    });
  }

  this.notify();
}

  removeItem(productId, selectedVariant = null) {
    this.items = this.items.filter(
      (item) => !(item.product.id === productId && item.selectedVariant === selectedVariant)
    );
    this.notify();
  }

  clearCart() {
    this.items = [];
    this.notify();
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach((callback) => callback(this.items));
  }
}

export const cartState = new CartState();
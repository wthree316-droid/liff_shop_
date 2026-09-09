class CartState {
  constructor() {
    this.items = [];
    this.listeners = [];
  }

  getItems() {
    return this.items;
  }

  addItem(product, quantityOrWeight, selectedVariant = null) {
    const existingIndex = this.items.findIndex(
      (item) => item.product.id === product.id && item.selectedVariant === selectedVariant
    );

    if (existingIndex > -1) {
      // ถ้าเป็นนับชิ้น ให้บวกทบยอดเดิม แต่ถ้าเป็นชั่งน้ำหนักให้เปลี่ยนค่าน้ำหนักใหม่
      if (product.type === 'PER_PIECE') {
        this.items[existingIndex].quantityOrWeight += Number(quantityOrWeight);
      } else {
        this.items[existingIndex].quantityOrWeight = Number(quantityOrWeight);
      }
    } else {
      this.items.push({
        product,
        quantityOrWeight: Number(quantityOrWeight),
        selectedVariant
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
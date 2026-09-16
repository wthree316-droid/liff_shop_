import { fetchAdminOrders, updateOrderStatus } from './admin-api.js';

class OrdersStateManager {
  constructor() {
    this.rawOrders = [];
    this.statusFilter = '';
    this.startDate = ''; // 'YYYY-MM-DD'
    this.endDate = '';   // 'YYYY-MM-DD'
  }

  async loadFromApi() {
    this.rawOrders = await fetchAdminOrders();
    return this.getFilteredOrders();
  }

  setStatusFilter(status) {
    this.statusFilter = status;
    return this.getFilteredOrders();
  }

  setDateRange(start, end) {
    this.startDate = start || '';
    this.endDate = end || '';
    return this.getFilteredOrders();
  }

  clearDateFilter() {
    this.startDate = '';
    this.endDate = '';
    return this.getFilteredOrders();
  }

  getFilteredOrders() {
    return this.rawOrders.filter(o => {
      const matchStatus = !this.statusFilter || o.status === this.statusFilter;
      
      const orderDate = o.date_key || '';
      let matchDate = true;

      if (this.startDate && this.endDate) {
        matchDate = orderDate >= this.startDate && orderDate <= this.endDate;
      } else if (this.startDate) {
        matchDate = orderDate >= this.startDate;
      } else if (this.endDate) {
        matchDate = orderDate <= this.endDate;
      }

      return matchStatus && matchDate;
    });
  }

  calculateMetrics(orders) {
    return orders.reduce((acc, o) => {
      acc.totalCount += 1;
      if (o.status !== 'CANCELLED') {
        acc.totalSales += Number(o.grand_total || 0);
      }
      return acc;
    }, { totalCount: 0, totalSales: 0 });
  }

  async updateStatus(orderId, nextStatus, trackingNumber = null) {
    await updateOrderStatus(orderId, nextStatus, trackingNumber);
    const idx = this.rawOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      this.rawOrders[idx].status = nextStatus;
      if (trackingNumber) this.rawOrders[idx].tracking_number = trackingNumber;
    }
    return this.getFilteredOrders();
  }
}

export const ordersState = new OrdersStateManager();
import { fetchAdminOrders, updateOrderStatus } from './admin-api.js';

class OrdersStateManager {
  constructor() {
    this.rawOrders = [];
    this.statusFilter = '';
    this.startDate = '';
    this.endDate = '';
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

  // ดึงออเดอร์ตามช่วงวันที่ (ยังไม่กรองสถานะ) สำหรับคำนวณ Dashboard ให้ตัวเลขตรงกับช่วงวัน
  getDateFilteredOrders() {
    return this.rawOrders.filter(o => {
      const orderDate = o.date_key || '';
      if (this.startDate && this.endDate) {
        return orderDate >= this.startDate && orderDate <= this.endDate;
      }
      if (this.startDate) return orderDate >= this.startDate;
      if (this.endDate) return orderDate <= this.endDate;
      return true;
    });
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

  // คำนวณสถิติสรุปตามช่วงวันที่เลือก
  calculateDetailedMetrics() {
    const ordersInDateRange = this.getDateFilteredOrders();

    const stats = {
      TOTAL: { count: 0, amount: 0 },
      AWAITING_PAYMENT: { count: 0, amount: 0 },
      PAYMENT_SUBMITTED: { count: 0, amount: 0 },
      CONFIRMED: { count: 0, amount: 0 },
      SHIPPED: { count: 0, amount: 0 },
      CANCELLED: { count: 0, amount: 0 },
      // สัดส่วนช่องทางชำระเงิน (ไม่นับรายการยกเลิก)
      TRANSFER: { count: 0, amount: 0 },
      COD: { count: 0, amount: 0, depositAmount: 0, remainingCod: 0 }
    };

    ordersInDateRange.forEach(o => {
      const amount = Number(o.grand_total || 0);
      const isCancelled = o.status === 'CANCELLED';

      if (stats[o.status]) {
        stats[o.status].count += 1;
        stats[o.status].amount += amount;
      }

      // ยอดรวมคำสั่งซื้อ (ไม่รวมบิลยกเลิก)
      if (!isCancelled) {
        stats.TOTAL.count += 1;
        stats.TOTAL.amount += amount;

        if (o.payment_method === 'COD') {
          stats.COD.count += 1;
          stats.COD.amount += amount;
          stats.COD.depositAmount += Number(o.deposit_amount || 0);

          // ถ้าไม่มี remaining_cod_amount จาก API ให้คำนวณ fallback ให้ทันที
          const remainingVal = o.remaining_cod_amount !== undefined 
            ? Number(o.remaining_cod_amount) 
            : Math.max(0, amount - Number(o.deposit_amount || 0));

          stats.COD.remainingCod += remainingVal;
        } else {
          stats.TRANSFER.count += 1;
          stats.TRANSFER.amount += amount;
        }
      }
    });

    return stats;
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
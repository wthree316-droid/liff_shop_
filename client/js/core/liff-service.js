import { CONFIG } from './config.js';

class LiffService {
  constructor() {
    this.profile = null;
    this.isInClient = false;
    this.isInitialized = false;
  }

async init() {
  if (this.isInitialized) return this.profile;

  try {
    if (typeof liff === 'undefined') {
      console.warn('LINE LIFF SDK not loaded. Running in standalone browser mode.');
      return null;
    }

    await liff.init({ liffId: CONFIG.LIFF_ID });
    this.isInitialized = true;
    this.isInClient = liff.isInClient();

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.origin });
      return null;
    }

    // โหลด Profile ไว้ใช้งาน
    this.profile = await liff.getProfile();
    return this.profile;
  } catch (error) {
    console.error('LIFF Init Error:', error);
    return null;
  }
}

  getUserId() {
    return this.profile ? this.profile.userId : null;
  }

  getUserName() {
    return this.profile ? this.profile.displayName : '';
  }

  /**
   * ส่ง Flex Message บิลใบเสร็จ + รายการสินค้าเข้าห้องแชทลูกค้า
   */
  async sendOrderSummaryToChat(orderData) {
    if (!this.isInClient || !liff.isLoggedIn()) {
      return false;
    }

    const rawId = orderData.order_id || orderData.id || 'ORDER';
    const orderId = String(rawId);
    const shortId = orderId.length >= 8 ? orderId.slice(0, 8) : orderId;

    const isCod = orderData.payment_method === 'COD';
    const items = Array.isArray(orderData.items) ? orderData.items : [];

    const itemRows = items.map((item) => {
      const isWeight = Number(item.quantity_or_weight) > 1;
      const unit = isWeight ? 'g' : 'ชิ้น';
      const variantText = item.selected_variant ? ` (${item.selected_variant})` : '';
      const count = item.package_count || 1;

      return {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: `${item.product_name}${variantText} [${item.quantity_or_weight}${unit}] x${count}`,
            size: 'xxs',
            color: '#44403C',
            flex: 4,
            wrap: true
          },
          {
            type: 'text',
            text: `฿${Number(item.line_total || 0).toFixed(2)}`,
            size: 'xxs',
            color: '#1C1917',
            weight: 'bold',
            align: 'end',
            flex: 2
          }
        ]
      };
    });

    const paymentRows = [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: 'วิธีชำระเงิน', size: 'xs', color: '#78716C' },
          { type: 'text', text: isCod ? 'เก็บเงินปลายทาง (COD)' : 'โอนเงินเต็มจำนวน', size: 'xs', align: 'end', weight: 'bold', color: isCod ? '#D97706' : '#1C1917' }
        ]
      },
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: 'ยอดรวมสินค้า', size: 'xs', color: '#78716C' },
          { type: 'text', text: `฿${Number(orderData.subtotal || 0).toFixed(2)}`, size: 'xs', align: 'end', color: '#1C1917' }
        ]
      },
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: 'ค่าจัดส่ง', size: 'xs', color: '#78716C' },
          { type: 'text', text: `฿${Number(orderData.shipping_fee || 0).toFixed(2)}`, size: 'xs', align: 'end', color: '#1C1917' }
        ]
      },
      { type: 'separator', margin: 'sm' },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          { type: 'text', text: isCod ? 'ยอดมัดจำที่ต้องโอนตอนนี้' : 'ยอดชำระสุทธิ', size: 'sm', weight: 'bold', color: '#1C1917' },
          { type: 'text', text: `฿${Number(orderData.deposit_amount || orderData.grand_total || 0).toFixed(2)}`, size: 'md', align: 'end', weight: 'bold', color: '#B45309' }
        ]
      }
    ];

    if (isCod) {
      paymentRows.push({
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: 'ยอดชำระพนักงานปลายทาง', size: 'xxs', color: '#78716C' },
          { type: 'text', text: `฿${Number(orderData.remaining_cod_amount || 0).toFixed(2)}`, size: 'xxs', align: 'end', color: '#78716C' }
        ]
      });
    }

    const singleBubble = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1C1917',
        paddingTop: 'lg',
        paddingBottom: 'lg',
        contents: [
          { type: 'text', text: isCod ? 'COD ORDER REGISTERED' : 'ORDER CONFIRMED', weight: 'bold', color: '#D97706', size: 'xxs' },
          { type: 'text', text: 'บันทึกคำสั่งซื้อสำเร็จ', weight: 'bold', size: 'md', margin: 'xs', color: '#FFFFFF' },
          { type: 'text', text: `#${shortId}`, size: 'xs', color: '#A8A29E', margin: 'xs' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              { type: 'text', text: 'รายการสินค้า', size: 'xxs', weight: 'bold', color: '#A8A29E' },
              ...(itemRows.length > 0 ? itemRows : [{ type: 'text', text: 'ไม่มีรายละเอียดสินค้า', size: 'xxs', color: '#A8A29E' }])
            ]
          },
          { type: 'separator' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: paymentRows
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'โอนเงินแล้ว แนบส่งรูปสลิปเข้ามาในห้องแชทนี้ได้เลยครับ 📸',
            size: 'xs',
            color: '#059669',
            align: 'center',
            weight: 'bold',
            wrap: true
          }
        ]
      }
    };

    try {
      await liff.sendMessages([{
        type: 'flex',
        altText: `ใบสั่งซื้อ #${shortId} ยอดโอน ฿${Number(orderData.deposit_amount || orderData.grand_total || 0).toFixed(2)}`,
        contents: singleBubble
      }]);
      return true;
    } catch (err) {
      console.error('Failed to send flex via LIFF:', err);
      return false;
    }
  }

  closeWindow() {
    if (this.isInClient) {
      liff.closeWindow();
    }
  }
}

export const liffService = new LiffService();
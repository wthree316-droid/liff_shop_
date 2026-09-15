import { CONFIG } from './config.js';

class LiffService {
  constructor() {
    this.profile = null;
    this.isInClient = false;
    this.isInitialized = false;
  }

  // แก้ไขใน client/js/core/liff-service.js
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
   * ส่ง Flex Message บิลใบเสร็จ + ข้อมูลโอนเงิน (Single Bubble การันตี 100%)
   */
  async sendOrderSummaryToChat(orderData) {
    if (!this.isInClient || !liff.isLoggedIn()) {
      console.log('Not in LINE client or not logged in. Skipping liff.sendMessages()');
      return false;
    }

    const rawId = orderData.order_id || orderData.id || 'ORDER';
    const orderId = String(rawId);
    const shortId = orderId.length >= 8 ? orderId.slice(0, 8) : orderId;

    const bankAccountNumber = '0987654321';
    const bankAccountName = 'บจก. อาร์ทิซาน ที (Artisan Tea)';
    const bankName = 'ธนาคารกสิกรไทย (KBANK)';

    const singleBubble = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1C1917',
        paddingTop: 'lg',
        paddingBottom: 'lg',
        contents: [
          { type: 'text', text: 'ORDER CONFIRMED', weight: 'bold', color: '#D97706', size: 'xxs' },
          { type: 'text', text: 'คำสั่งซื้อสำเร็จแล้ว', weight: 'bold', size: 'lg', margin: 'xs', color: '#FFFFFF' },
          { type: 'text', text: `#${shortId}`, size: 'xs', color: '#A8A29E', margin: 'xs' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          // รายละเอียดราคา
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
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
                  { type: 'text', text: 'ส่วนลด', size: 'xs', color: '#78716C' },
                  { type: 'text', text: `-฿${Number(orderData.discount_amount || 0).toFixed(2)}`, size: 'xs', align: 'end', color: '#059669' }
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
                  { type: 'text', text: 'ยอดชำระสุทธิ', size: 'sm', weight: 'bold', color: '#1C1917' },
                  { type: 'text', text: `฿${Number(orderData.grand_total || 0).toFixed(2)}`, size: 'md', align: 'end', weight: 'bold', color: '#B45309' }
                ]
              }
            ]
          },
          // กล่องช่องทางการชำระเงิน
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#F5F5F4',
            cornerRadius: 'md',
            paddingAll: 'md',
            spacing: 'xs',
            contents: [
              { type: 'text', text: 'ช่องทางโอนเงินชำระ', size: 'xxs', color: '#78716C', weight: 'bold' },
              { type: 'text', text: bankName, size: 'xs', color: '#1C1917', weight: 'bold' },
              { type: 'text', text: bankAccountNumber, size: 'lg', weight: 'bold', color: '#B45309' },
              { type: 'text', text: `ชื่อบัญชี: ${bankAccountName}`, size: 'xxs', color: '#78716C' }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'โอนเงินแล้ว แนบส่งรูปสลิปเข้ามาในแชทได้เลยครับ 📸',
            size: 'xs',
            color: '#78716C',
            align: 'center',
            wrap: true
          }
        ]
      }
    };

    const flexPayload = {
      type: 'flex',
      altText: `ใบสั่งซื้อ #${shortId} ยอดชำระ ฿${Number(orderData.grand_total || 0).toFixed(2)}`,
      contents: singleBubble
    };

    try {
      await liff.sendMessages([flexPayload]);
      return true;
    } catch (err) {
      console.error('Failed to send flex via LIFF:', err);
      alert(`สาเหตุที่ส่งบิลไม่ผ่าน: ${err.message || JSON.stringify(err)}`);
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
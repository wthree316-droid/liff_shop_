import { apiClient } from '../../core/api-client.js';

/**
 * ยิง API สร้างคำสั่งซื้อใหม่
 * @param {Object} orderPayload
 * @returns {Promise<Object>}
 */
export async function submitOrder(orderPayload) {
  return await apiClient('/orders', {
    method: 'POST',
    body: JSON.stringify(orderPayload)
  });
}
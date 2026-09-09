import { CONFIG } from '../core/config.js';

let cachedToken = null;

export function setAdminAuthToken(token, type = 'Bearer') {
  cachedToken = `${type} ${token}`;
}

async function adminFetch(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;
  const authHeader = cachedToken || localStorage.getItem('artisan_admin_auth') || '';

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': authHeader,
    ...options.headers
  };

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'การร้องขอข้อมูลล้มเหลว');
  }
  return data;
}

// Orders
export const fetchAdminOrders = (status = '') => adminFetch(`/admin/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`);
export const updateOrderStatus = (orderId, newStatus, trackingNumber = null) => 
  adminFetch(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus, tracking_number: trackingNumber })
  });

// Products
export const fetchAdminProducts = () => adminFetch('/admin/products');
export const createAdminProduct = (payload) => adminFetch('/admin/products', { method: 'POST', body: JSON.stringify(payload) });
export const updateAdminProduct = (id, payload) => adminFetch(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const toggleAdminProduct = (id) => adminFetch(`/admin/products/${id}/toggle`, { method: 'PATCH' });
export const deleteAdminProduct = (id) => adminFetch(`/admin/products/${id}`, { method: 'DELETE' });

// Promotions
export const fetchAdminPromotions = () => adminFetch('/admin/promotions');
export const createAdminPromotion = (payload) => adminFetch('/admin/promotions', { method: 'POST', body: JSON.stringify(payload) });
export const toggleAdminPromotion = (id) => adminFetch(`/admin/promotions/${id}/toggle`, { method: 'PATCH' });
export const deleteAdminPromotion = (id) => adminFetch(`/admin/promotions/${id}`, { method: 'DELETE' });

// Settings API
export const fetchAdminSettings = () => adminFetch('/settings/details');
export const updateAdminSetting = (key, value) => 
  adminFetch(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value: parseFloat(value) })
  });

export async function uploadAdminAsset(file) {
  const url = `${CONFIG.API_BASE_URL}/admin/upload`;
  const authHeader = cachedToken || localStorage.getItem('artisan_admin_auth') || '';

  const formData = new FormData();
  formData.append('file', file);

  // หมายเหตุ: ห้ามใส่ 'Content-Type': 'application/json' เพราะเบราว์เซอร์ต้องสร้าง boundary สำหรับ multipart/form-data เอง
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader
    },
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'อัปโหลดภาพล้มเหลว');
  }
  return data;
}
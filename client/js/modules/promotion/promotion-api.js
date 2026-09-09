import { apiClient } from '../../core/api-client.js';

export async function fetchActivePromotions() {
  return await apiClient('/promotions/active');
}
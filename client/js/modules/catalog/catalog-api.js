import { apiClient } from '../../core/api-client.js';

export async function fetchProducts() {
  return await apiClient('/products');
}
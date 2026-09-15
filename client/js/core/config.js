export const CONFIG = {
  API_BASE_URL: '/api', // หรือ URL เซิร์ฟเวอร์จริง
  LIFF_ID: '2011466802-ry1dKoq2',            // LIFF ID สำหรับหน้าร้าน
  ADMIN_LIFF_ID: '2011466802-Gw5WHngi',      // LIFF ID สำหรับหน้า Admin

  CATEGORIES: [
    { id: 'cat_weight', name: 'ชั่งกรัม', defaultType: 'BY_WEIGHT' },
    { id: 'cat_pack',   name: 'แพ็ค',    defaultType: 'PER_PIECE' },
    { id: 'cat_gear',   name: 'อุปกรณ์',  defaultType: 'PER_PIECE' }
  ]
};
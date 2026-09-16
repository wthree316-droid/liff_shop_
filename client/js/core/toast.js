/**
 * Toast Notification กลางสำหรับแสดงข้อความแจ้งเตือนสไตล์มินิมอล
 * @param {string} message ข้อความแจ้งเตือน
 * @param {'success'|'error'|'info'} type ประเภทข้อความ
 */
export function showToast(message, type = 'success') {
  const existing = document.getElementById('app-toast-box');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'app-toast-box';

  const typeStyles = {
    success: 'bg-stone-900 text-white border-stone-800',
    error: 'bg-red-600 text-white border-red-500',
    info: 'bg-amber-800 text-white border-amber-700'
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  toast.className = `fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl border flex items-center gap-2 transition-all duration-200 opacity-0 translate-y-2 pointer-events-none select-none max-w-xs text-center ${typeStyles[type] || typeStyles.success}`;
  toast.innerHTML = `<span class="shrink-0">${icons[type] || '✓'}</span><span>${message}</span>`;

  document.body.appendChild(toast);

  // Trigger Entrance Animation
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
  });

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 250);
  }, 2300);
}
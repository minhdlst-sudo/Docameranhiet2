/* eslint-disable no-restricted-globals */

// Service worker đơn giản để hỗ trợ PWA và thông báo
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const icon = '/favicon.ico';
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Cảnh báo mới', {
      body: data.body || 'Kiểm tra ngay dữ liệu nhiệt độ',
      icon: icon,
      badge: icon,
      data: data.url
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/')
  );
});

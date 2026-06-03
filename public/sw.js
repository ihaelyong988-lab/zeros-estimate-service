// Kill-switch service worker.
// 기존에 휴대폰/브라우저에 설치된 옛 서비스 워커가 이 파일을 업데이트로 받아오면,
// 스스로 등록을 해제하고 모든 캐시를 삭제한 뒤 열려 있는 탭을 새로고침한다.
// fetch 핸들러가 없으므로 어떤 요청도 가로채거나 캐시하지 않는다 → 항상 네트워크 최신.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        if ('navigate' in client) {
          client.navigate(client.url);
        }
      });
    })()
  );
});

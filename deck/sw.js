// The encrypted portfolio deck is retired. Browsers that installed its worker
// fetch this one on their next update check; it clears the deck's caches and
// unregisters itself so /deck/ falls through to the normal site.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) await caches.delete(key);
  await self.registration.unregister();
  for (const client of await self.clients.matchAll()) client.navigate(client.url);
})()));

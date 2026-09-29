// Serves the encrypted deck: /deck/<path> is decrypted from /deck/<path>.enc
// with the key the home page stored in IndexedDB after unlocking.
const base = new URL('./', self.location).pathname;
const types = { html: 'text/html; charset=utf-8', png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', mp4: 'video/mp4', otf: 'font/otf', woff2: 'font/woff2' };
const decrypted = new Map();
let memoryKey = null;

self.addEventListener('message', event => {
  memoryKey = event.data;
  decrypted.clear();
  event.ports[0]?.postMessage('ok');
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function storedKey() {
  return new Promise(resolve => {
    const open = indexedDB.open('neil-site', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('keys');
    open.onerror = () => resolve(null);
    open.onsuccess = () => {
      const get = open.result.transaction('keys').objectStore('keys').get('site-raw');
      get.onsuccess = () => { open.result.close(); resolve(get.result || null); };
      get.onerror = () => { open.result.close(); resolve(null); };
    };
  });
}

async function load(rel) {
  const raw = memoryKey || await storedKey();
  if (!raw) return null;
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  if (decrypted.has(rel)) return decrypted.get(rel);
  const response = await fetch(base + rel + '.enc');
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  try {
    const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, key, bytes.subarray(12));
    decrypted.set(rel, data);
    return data;
  } catch {
    return null;
  }
}

async function serve(request, rel) {
  let data = await load(rel);
  if (!data) return fetch(request);
  // Attach the public analytics script when serving the decrypted deck. This also
  // covers existing encrypted releases without changing their ciphertext.
  if (rel === 'index.html') {
    const html = new TextDecoder().decode(data);
    data = new TextEncoder().encode(html.replace('</head>',
      '<script src="../analytics.js?v=1" defer></script></head>'));
  }
  const type = types[rel.split('.').pop()] || 'application/octet-stream';
  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') || '');
  if (!range) {
    return new Response(data, { headers: { 'Content-Type': type, 'Content-Length': data.byteLength, 'Accept-Ranges': 'bytes' } });
  }
  const size = data.byteLength;
  let start = range[1] ? +range[1] : Math.max(0, size - +range[2]);
  let end = range[1] && range[2] ? Math.min(+range[2], size - 1) : size - 1;
  if (start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(data.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': type, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' },
  });
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(base)) return;
  let rel = decodeURIComponent(url.pathname.slice(base.length));
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  if (rel === 'sw.js' || rel.endsWith('.enc')) return;
  event.respondWith(serve(event.request, rel));
});

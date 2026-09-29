const menuItems = Array.from(document.querySelectorAll('.play, .linkedin'));
document.addEventListener('keydown', (event) => {
  if (document.querySelector('#resume-dialog').open) return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  const current = menuItems.indexOf(document.activeElement);
  const next = current < 0
    ? (event.key === 'ArrowDown' ? 0 : menuItems.length - 1)
    : (current + (event.key === 'ArrowDown' ? 1 : -1) + menuItems.length) % menuItems.length;
  menuItems[next].focus();
});

const resumeDialog = document.querySelector('#resume-dialog');
const resumeForm = document.querySelector('#resume-form');
const resumeTitle = document.querySelector('#resume-title');
const passwordInput = document.querySelector('#resume-password');
const resumeError = document.querySelector('#resume-error');
const resumeStorageKey = 'neil-resume-password';
const bytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
let action = 'resume';
let opening = false;
function cachedPassword() {
  try { return localStorage.getItem(resumeStorageKey); } catch { return null; }
}
const passwordToggle = document.querySelector('#password-toggle');
function showPassword(show) {
  passwordInput.type = show ? 'text' : 'password';
  passwordToggle.setAttribute('aria-pressed', show);
  passwordToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}
passwordToggle.addEventListener('click', () => {
  showPassword(passwordInput.type === 'password');
  passwordInput.focus();
});
function ask(name) {
  action = name;
  resumeTitle.textContent = name === 'portfolio' ? 'Portfolio' : 'Resume';
  resumeForm.reset();
  showPassword(false);
  resumeError.textContent = '';
  if (!resumeDialog.open) resumeDialog.showModal();
}
function start(name) {
  if (opening) return;
  const password = cachedPassword();
  if (password) {
    action = name;
    unlock(password);
    return;
  }
  ask(name);
}
document.querySelector('.resume').addEventListener('click', () => start('resume'));
document.querySelector('.portfolio').addEventListener('click', () => start('portfolio'));
document.querySelector('#resume-cancel').addEventListener('click', () => resumeDialog.close());
resumeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  unlock(passwordInput.value);
});
if (location.hash === '#portfolio') {
  history.replaceState(null, '', location.pathname);
  ask('portfolio');
}

async function deriveBits(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({name: 'PBKDF2', salt: bytes(salt), iterations: 600000, hash: 'SHA-256'}, material, 256);
}
const aesKey = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
// Raw bytes, not a CryptoKey: Safari can't read stored CryptoKeys from a service worker.
function storeKey(raw) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('neil-site', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('keys');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('keys', 'readwrite');
      tx.objectStore('keys').put(raw, 'site-raw');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));
async function activeWorker(raw) {
  const registration = await navigator.serviceWorker.register('deck/sw.js?v=4', {scope: 'deck/', updateViaCache: 'none'});
  const worker = registration.installing || registration.waiting;
  if (worker && worker.state !== 'activated') {
    await Promise.race([
      new Promise(resolve => worker.addEventListener('statechange', () => ['activated', 'redundant'].includes(worker.state) && resolve())),
      timeout(5000),
    ]);
  }
  // Hand the key over directly too, in case the worker can't read IndexedDB.
  const active = registration.active;
  if (!active) throw new Error('worker');
  await Promise.race([
    new Promise(resolve => {
      const channel = new MessageChannel();
      channel.port1.onmessage = resolve;
      active.postMessage(raw, [channel.port2]);
    }),
    timeout(2000),
  ]);
}
class WrongPassword extends Error {}

async function openResume(password) {
  const response = await fetch('resume.enc.json?v=pdf2');
  if (!response.ok) throw new Error('network');
  const payload = await response.json();
  const key = await aesKey(await deriveBits(password, payload.salt));
  let pdf;
  try {
    pdf = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(payload.iv)}, key, bytes(payload.data));
  } catch {
    throw new WrongPassword();
  }
  const url = URL.createObjectURL(new Blob([pdf], {type: 'application/pdf'}));
  window.siteAnalytics?.('resume_open');
  if (!window.open(url, '_blank')) location.href = url;
}
async function openPortfolio(password) {
  const [keyInfo, deck] = await Promise.all([
    fetch('key.json').then(r => r.ok ? r.json() : Promise.reject(new Error('network'))),
    fetch('deck/index.html.enc').then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error('network'))),
  ]);
  const raw = await deriveBits(password, keyInfo.salt);
  const key = await aesKey(raw);
  const data = new Uint8Array(deck);
  try {
    await crypto.subtle.decrypt({name: 'AES-GCM', iv: data.subarray(0, 12)}, key, data.subarray(12));
  } catch {
    throw new WrongPassword();
  }
  await storeKey(raw);
  await activeWorker(raw);
  window.siteAnalytics?.('portfolio_open');
  location.href = 'deck/';
}

// Check the password before opening anything, so a wrong one never flashes a page.
async function unlock(password) {
  if (opening) return;
  opening = true;
  const submit = resumeForm.querySelector('[type="submit"]');
  submit.disabled = true;
  resumeError.textContent = '';
  try {
    await (action === 'portfolio' ? openPortfolio(password) : openResume(password));
    try { localStorage.setItem(resumeStorageKey, password); } catch {}
    resumeDialog.close();
    resumeForm.reset();
  } catch (error) {
    if (!resumeDialog.open) ask(action);
    if (error instanceof WrongPassword) {
      try { localStorage.removeItem(resumeStorageKey); } catch {}
      resumeError.textContent = 'Incorrect password. Try again.';
      passwordInput.select();
    } else {
      resumeError.textContent = `Could not open ${action}. Try again.`;
    }
  } finally {
    submit.disabled = false;
    opening = false;
  }
}

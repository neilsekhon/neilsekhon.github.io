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
function ask(name) {
  action = name;
  resumeTitle.textContent = name === 'portfolio' ? 'Portfolio' : 'Resume';
  resumeForm.reset();
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
      const tx = request.result.transaction('keys', 'readwrite');
      tx.objectStore('keys').put(raw, 'site-raw');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}
async function activeWorker() {
  const registration = await navigator.serviceWorker.register('deck/sw.js?v=2', {scope: 'deck/', updateViaCache: 'none'});
  const worker = registration.installing || registration.waiting;
  if (!worker) return;
  await new Promise(resolve => worker.addEventListener('statechange', () => worker.state === 'activated' && resolve()));
}
class WrongPassword extends Error {}

async function openResume(password) {
  const response = await fetch('resume.enc.json?v=pdf2');
  if (!response.ok) throw new Error('network');
  const payload = await response.json();
  const key = await aesKey(await deriveBits(password, payload.salt));
  try {
    const pdf = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(payload.iv)}, key, bytes(payload.data));
    return URL.createObjectURL(new Blob([pdf], {type: 'application/pdf'}));
  } catch {
    throw new WrongPassword();
  }
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
  await activeWorker();
  return 'deck/';
}

async function unlock(password) {
  if (opening) return;
  // Open during the click or submit gesture so browsers allow the new tab.
  const tab = window.open('about:blank', '_blank');
  if (!tab) {
    ask(action);
    resumeError.textContent = 'Allow pop-ups, then try again.';
    return;
  }
  tab.opener = null;
  opening = true;
  const submit = resumeForm.querySelector('[type="submit"]');
  submit.disabled = true;
  resumeError.textContent = '';
  try {
    const url = action === 'portfolio' ? await openPortfolio(password) : await openResume(password);
    try { localStorage.setItem(resumeStorageKey, password); } catch {}
    tab.location.replace(new URL(url, location.href).href);
    resumeDialog.close();
    resumeForm.reset();
  } catch (error) {
    tab.close();
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

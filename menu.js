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
const passwordInput = document.querySelector('#resume-password');
const resumeError = document.querySelector('#resume-error');
const resumeStorageKey = 'neil-resume-password';
let openingResume = false;
function cachedPassword() {
  try { return localStorage.getItem(resumeStorageKey); } catch { return null; }
}
document.querySelector('.resume').addEventListener('click', () => {
  if (openingResume) return;
  const password = cachedPassword();
  if (password) {
    openResume(password);
    return;
  }
  resumeForm.reset();
  resumeError.textContent = '';
  resumeDialog.showModal();
});
document.querySelector('#resume-cancel').addEventListener('click', () => resumeDialog.close());
resumeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  openResume(passwordInput.value);
});
async function openResume(password) {
  if (openingResume) return;
  // Open during the click or submit gesture so browsers allow the new tab.
  const resumeTab = window.open('about:blank', '_blank');
  if (!resumeTab) {
    if (!resumeDialog.open) resumeDialog.showModal();
    resumeError.textContent = 'Allow pop-ups, then try again.';
    return;
  }
  resumeTab.opener = null;
  openingResume = true;
  const submit = resumeForm.querySelector('[type="submit"]');
  submit.disabled = true;
  resumeError.textContent = '';
  try {
    const response = await fetch('resume.enc.json');
    if (!response.ok) throw new Error('network');
    const payload = await response.json();
    const bytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: bytes(payload.salt), iterations: 600000, hash: 'SHA-256'}, material, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
    let html;
    try {
      html = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(payload.iv)}, key, bytes(payload.data));
    } catch {
      resumeTab.close();
      try { localStorage.removeItem(resumeStorageKey); } catch {}
      if (!resumeDialog.open) resumeDialog.showModal();
      resumeError.textContent = 'Incorrect password. Try again.';
      passwordInput.select();
      return;
    }
    try { localStorage.setItem(resumeStorageKey, password); } catch {}
    resumeTab.location.replace(URL.createObjectURL(new Blob([html], {type: 'text/html'})));
    resumeDialog.close();
    resumeForm.reset();
  } catch {
    resumeTab.close();
    if (!resumeDialog.open) resumeDialog.showModal();
    resumeError.textContent = 'Could not open resume. Try again.';
  } finally {
    submit.disabled = false;
    openingResume = false;
  }
}

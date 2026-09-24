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
document.querySelector('.resume').addEventListener('click', () => {
  resumeForm.reset();
  resumeError.textContent = '';
  resumeDialog.showModal();
});
document.querySelector('#resume-cancel').addEventListener('click', () => resumeDialog.close());
resumeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = resumeForm.querySelector('[type="submit"]');
  submit.disabled = true;
  resumeError.textContent = '';
  try {
    const response = await fetch('resume.enc.json');
    if (!response.ok) throw new Error('network');
    const payload = await response.json();
    const bytes = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passwordInput.value), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: bytes(payload.salt), iterations: 600000, hash: 'SHA-256'}, material, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
    let html;
    try {
      html = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(payload.iv)}, key, bytes(payload.data));
    } catch {
      resumeError.textContent = 'Incorrect password. Try again.';
      passwordInput.select();
      return;
    }
    location.assign(URL.createObjectURL(new Blob([html], {type: 'text/html'})));
  } catch {
    resumeError.textContent = 'Could not open resume. Try again.';
  } finally {
    submit.disabled = false;
  }
});

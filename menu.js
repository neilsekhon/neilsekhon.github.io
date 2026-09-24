const menuItems = Array.from(document.querySelectorAll('.play, .linkedin'));
document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  const current = menuItems.indexOf(document.activeElement);
  const next = current < 0
    ? (event.key === 'ArrowDown' ? 0 : menuItems.length - 1)
    : (current + (event.key === 'ArrowDown' ? 1 : -1) + menuItems.length) % menuItems.length;
  menuItems[next].focus();
});

(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const measure = () => document.documentElement.style.setProperty('--header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(header);
  window.addEventListener('resize', measure);
})();

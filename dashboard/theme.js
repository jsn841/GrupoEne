// Day / night switch. Remembers the choice in this browser; without one, follows the device setting.
(function () {
  const root = document.documentElement;
  const dark = () => root.getAttribute('data-theme') === 'dark' ||
    (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nz-theme';
  const paint = () => {
    const d = dark();
    btn.textContent = d ? '☀️ Modo día' : '🌙 Modo noche';
    btn.setAttribute('aria-label', d ? 'Cambiar a modo día' : 'Cambiar a modo noche');
  };
  btn.addEventListener('click', () => {
    const next = dark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('nz-theme', next); } catch (e) {}
    paint();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paint);
  const live = document.querySelector('.nz-head .nz-live');
  const wrap = document.createElement('div');
  wrap.className = 'nz-head-right';
  live.replaceWith(wrap);
  wrap.append(live, btn);
  paint();
})();

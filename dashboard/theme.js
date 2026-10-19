// Day / night switch (iOS-style). Remembers the choice in this browser; without one, follows the device setting.
(function () {
  const root = document.documentElement;
  const isDark = () => root.getAttribute('data-theme') === 'dark' ||
    (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'nz-theme';
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-label', 'Modo noche');
  sw.innerHTML = '<span class="nz-ico nz-sun" aria-hidden="true">☀️</span><span class="nz-track"><span class="nz-knob"></span></span><span class="nz-ico nz-moon" aria-hidden="true">🌙</span>';
  const paint = () => sw.setAttribute('aria-checked', String(isDark()));
  sw.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('nz-theme', next); } catch (e) {}
    paint();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paint);
  const live = document.querySelector('.nz-head .nz-live');
  const wrap = document.createElement('div');
  wrap.className = 'nz-head-right';
  live.replaceWith(wrap);
  wrap.append(live, sw);
  paint();
})();

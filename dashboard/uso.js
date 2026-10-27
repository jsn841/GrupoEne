// Medición del uso de la beta (anónima): cuándo se entra y cuánto tiempo se usa cada sección.
// Cada navegador lleva un identificador aleatorio («dispositivo»); no se guarda nombre, correo ni IP propia.
// Se envía a la tabla «accesos» de Supabase (solo insertar; con la clave pública nadie puede leerla).
// Se avisa en la pantalla de acceso. Si config.js no tiene url/key, no se envía nada.
(function () {
  var TABLA = 'accesos', LATIDO = 60000, INACTIVO = 5 * 60000;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function rid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  var disp = store('nz-dispositivo'); if (!disp) { disp = 'd-' + rid(); store('nz-dispositivo', disp); }
  var sesion = 's-' + rid(), seccion = 'inicio', ultimo = Date.now();
  function navegador() {
    var u = navigator.userAgent, b = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'Otro';
    var s = /iPhone|iPad/.test(u) ? 'iOS' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac OS/.test(u) ? 'Mac' : /Linux/.test(u) ? 'Linux' : 'Otro';
    return b + ' · ' + s;
  }
  function dentro() { return document.documentElement.classList.contains('nz-locked') === false && store('nz-beta-ok') === '1'; }
  function enviar(evento, extra) {
    var C = window.ENVIO; if (!C || !C.url || !C.key) return;
    var fila = { dispositivo: disp, sesion: sesion, evento: evento, seccion: seccion, navegador: navegador(), pantalla: (screen.width || 0) + 'x' + (screen.height || 0), segundos: (extra && extra.segundos) || null };
    try {
      fetch(C.url.replace(/\/$/, '') + '/rest/v1/' + TABLA, { method: 'POST', keepalive: true,
        headers: { apikey: C.key, Authorization: 'Bearer ' + C.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(fila) }).catch(function () {});
    } catch (e) {}
  }
  ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach(function (t) { window.addEventListener(t, function () { ultimo = Date.now(); }, { passive: true, capture: true }); });
  setInterval(function () {
    if (document.visibilityState === 'visible' && dentro() && Date.now() - ultimo < INACTIVO) enviar('activo', { segundos: LATIDO / 1000 });
  }, LATIDO);
  window.USO = {
    login: function () { enviar('login'); },
    seccion: function (s) { if (s === seccion) return; seccion = s; if (dentro()) enviar('seccion'); },
  };
  // Entrada con la sesión ya abierta (sin pasar por el login)
  function alAbrir() { if (dentro()) enviar('entrada'); }
  if (document.readyState === 'complete') setTimeout(alAbrir, 0); else window.addEventListener('load', alAbrir);
})();

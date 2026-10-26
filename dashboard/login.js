// Puerta de acceso de la maqueta (NO es seguridad real: la web es pública y estática).
// Sirve para la demo y el aviso de beta. El acceso con Microsoft 365 está simulado y no captura nada.
(function () {
  var USER = 'admin_nozar', PASS = '4321', KEY = 'nz-beta-ok';
  var root = document.documentElement;
  var authed = false;
  try { authed = localStorage.getItem(KEY) === '1'; } catch (e) {}

  function abrir() { var o = document.getElementById('nz-login'); if (o) o.hidden = true; root.classList.remove('nz-locked'); }
  function init() {
    var o = document.getElementById('nz-login');
    if (!o) return;
    if (authed) { o.hidden = true; return; }
    o.hidden = false; root.classList.add('nz-locked');
    var ms = document.getElementById('nz-login-ms');
    ms.addEventListener('click', function () {
      // Simulado: no hay login real de Microsoft 365 en la beta y no se captura ningún dato.
      ms.classList.add('off');
      if (!document.getElementById('nz-login-msnote')) {
        var n = document.createElement('p'); n.id = 'nz-login-msnote'; n.className = 'nz-login-msnote';
        n.textContent = 'El acceso con Microsoft 365 estará disponible en la versión final. Usa el acceso del equipo.';
        ms.insertAdjacentElement('afterend', n);
      }
    });
    var form = document.getElementById('nz-login-form'), err = document.getElementById('nz-login-err');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var u = (document.getElementById('nz-login-user').value || '').trim();
      var p = document.getElementById('nz-login-pass').value || '';
      if (u === USER && p === PASS) {
        try { localStorage.setItem(KEY, '1'); } catch (x) {}
        abrir();
      } else {
        err.hidden = false;
        document.getElementById('nz-login-pass').value = '';
      }
    });
    document.getElementById('nz-login-user').focus();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

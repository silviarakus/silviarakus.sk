/* Report avatara: kopírovanie textov, tlač a potvrdenie výmazu. */
(function () {
  'use strict';

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy'));
    });
  }

  function flash(btn, ok) {
    var label = btn.dataset.label || btn.textContent;
    btn.dataset.label = label;
    btn.textContent = ok ? 'Skopírované' : 'Nepodarilo sa, označ text ručne';
    btn.classList.toggle('done', ok);
    setTimeout(function () { btn.textContent = label; btn.classList.remove('done'); }, 2000);
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (btn) {
      copy(btn.dataset.copy).then(function () { flash(btn, true); }, function () { flash(btn, false); });
      return;
    }
    if (e.target.closest('#copy-all')) {
      var all = e.target.closest('#copy-all');
      var src = document.getElementById('avatar-text');
      copy(src ? JSON.parse(src.textContent) : '').then(function () { flash(all, true); }, function () { flash(all, false); });
      return;
    }
    if (e.target.closest('#print')) window.print();
  });

  var del = document.getElementById('delete-form');
  if (del) {
    del.addEventListener('submit', function (e) {
      if (!confirm('Naozaj chceš tohto avatara natrvalo vymazať? Zmizne aj z prehľadu tímu.')) e.preventDefault();
    });
  }
})();

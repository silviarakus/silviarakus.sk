// Uloženie výsledkov diagnostiky ako PDF.
// Na počítači otvorí tlač (Uložiť ako PDF). Na mobile a v prehliadačoch v aplikáciách
// (Instagram, Facebook, čítačka QR), kde tlač nefunguje, vytvorí PDF priamo a stiahne ho.
(function () {
  var LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  var HIDE = '.print-btn, .restart-btn, .nav-buttons, .view-switch, .results-actions, .action-btn, .btn-primary';

  function useDirectPdf() {
    var ua = navigator.userAgent || '';
    var inApp = /Instagram|FBAN|FBAV|FB_IAB|Line\/|Messenger|LinkedInApp|TikTok|Snapchat|wv\)/i.test(ua);
    var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return inApp || touch || typeof window.print !== 'function';
  }

  function loadLib(cb) {
    if (window.html2pdf) return cb();
    var s = document.createElement('script');
    s.src = LIB; s.onload = cb;
    s.onerror = function () { cb(new Error('lib')); };
    document.head.appendChild(s);
  }

  window.saveResultsPdf = function (btn, filename) {
    if (!useDirectPdf()) { window.print(); return; }
    var label = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Pripravujem PDF…'; }
    loadLib(function (err) {
      var done = function (msg) { if (btn) { btn.disabled = false; btn.textContent = msg || label; if (msg) setTimeout(function () { btn.textContent = label; }, 4000); } };
      if (err || !window.html2pdf) { done('PDF sa nepodarilo vytvoriť, skús to na počítači'); return; }
      var el = document.getElementById('app');
      var hidden = Array.prototype.slice.call(el.querySelectorAll(HIDE));
      hidden.forEach(function (h) { h.dataset.pdfDisplay = h.style.display; h.style.display = 'none'; });
      window.html2pdf().set({
        margin: [8, 6, 8, 6],
        filename: (filename || 'Diagnostika') + '.pdf',
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, backgroundColor: '#0B0D10', useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      }).from(el).save().then(function () {
        hidden.forEach(function (h) { h.style.display = h.dataset.pdfDisplay || ''; });
        done();
      }).catch(function () {
        hidden.forEach(function (h) { h.style.display = h.dataset.pdfDisplay || ''; });
        done('PDF sa nepodarilo vytvoriť, skús to na počítači');
      });
    });
  };
})();

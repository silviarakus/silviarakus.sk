/* Prehľad zóny: zoznam avatarov tímu s filtrom a vyhľadávaním. */
(function () {
  'use strict';

  var TYPY = { predavajuci: 'Predávajúci', kupujuci: 'Kupujúci' };
  var rows = document.getElementById('rows');
  var empty = document.getElementById('empty');
  var search = document.getElementById('search');
  var all = [];
  var filter = '';

  if (/[?&]vymazane=1/.test(location.search)) document.getElementById('deleted').hidden = false;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function date(iso) {
    return new Date(iso).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric' });
  }

  function render() {
    var q = search.value.trim().toLowerCase();
    var items = all.filter(function (a) {
      if (filter && a.typ !== filter) return false;
      if (!q) return true;
      return [a.archetyp, a.region, a.autor, a.nehnutelnost].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    rows.innerHTML = items.map(function (a) {
      return '<li><a href="/makler/avatar/' + encodeURIComponent(a.token) + '">' +
        '<span class="r-title">' + esc(a.archetyp) + '</span>' +
        '<span class="r-type">' + esc(TYPY[a.typ] || '') + '</span>' +
        '<span class="r-meta">' + esc(a.region) + ' · ' + esc(a.nehnutelnost) + ' · ' + esc(a.cena) +
        ' · ' + esc(a.autor) + ', ' + date(a.created_at) + '</span></a></li>';
    }).join('');
    empty.hidden = items.length > 0;
    empty.textContent = all.length ? 'Nič nezodpovedá filtru.' : 'Zatiaľ tu nie je žiadny avatar. Vytvor prvého.';
  }

  document.querySelector('.filters').addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]');
    if (!b) return;
    filter = b.dataset.filter;
    [].forEach.call(this.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    render();
  });
  search.addEventListener('input', render);

  fetch('/api/makler/list', { cache: 'no-store', credentials: 'same-origin' })
    .then(function (r) {
      if (r.status === 401) { location.href = '/makler/prihlasenie.html'; return Promise.reject(); }
      return r.ok ? r.json() : Promise.reject();
    })
    .then(function (d) { all = d.avatary || []; render(); })
    .catch(function () { empty.textContent = 'Zoznam avatarov sa nepodarilo načítať. Obnov stránku.'; });
})();

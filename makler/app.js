/* Formulár „Avatar zákazníka“: vykreslenie polí, rýchle voľby, autosave, odoslanie a čakanie na výsledok. */
(function () {
  'use strict';

  var FORM = window.MAKLER_FORM;
  var POLL_MS = 3000;
  var POLL_MAX_MS = 4 * 60 * 1000;
  var AUTOR_KEY = 'makler-autor';
  var $ = function (id) { return document.getElementById(id); };

  var params = new URLSearchParams(location.search);
  var typ = FORM.TYPY[params.get('typ')] ? params.get('typ') : 'predavajuci';
  var T = FORM.TYPY[typ];
  var FIELDS = FORM.fields(typ);
  var DRAFT_KEY = 'makler-avatar-' + typ;
  var touched = {};
  var showAll = false;

  var values = {};
  try { values = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}; } catch (e) { values = {}; }
  try { if (!values.autor) values.autor = localStorage.getItem(AUTOR_KEY) || ''; } catch (e) { /* bez localStorage */ }
  FIELDS.forEach(function (f) { if (values[f.id] === undefined && f.value) values[f.id] = f.value; });

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function save() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
      if (values.autor) localStorage.setItem(AUTOR_KEY, values.autor);
    } catch (e) { /* bez localStorage */ }
  }

  function fieldHtml(f) {
    var id = 'f-' + f.id;
    var v = values[f.id] || '';
    var described = 'h-' + f.id + ' e-' + f.id;
    var control;
    if (f.type === 'textarea') {
      control = '<textarea id="' + id + '" name="' + f.id + '" rows="4" placeholder="' + esc(f.placeholder) +
        '" aria-describedby="' + described + '"' + (f.optional ? '' : ' aria-required="true"') + '>' + esc(v) + '</textarea>';
    } else if (f.type === 'select') {
      control = '<select id="' + id + '" name="' + f.id + '" aria-describedby="' + described + '" aria-required="true">' +
        '<option value="">Vyber</option>' +
        f.options.map(function (o) { return '<option' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') +
        '</select>';
    } else {
      control = '<input type="text" id="' + id + '" name="' + f.id + '" maxlength="' + (f.max || 200) + '" placeholder="' +
        esc(f.placeholder) + '" value="' + esc(v) + '" aria-describedby="' + described + '"' +
        (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : '') + ' aria-required="true">';
    }
    var picks = f.moznosti
      ? '<div class="picks" role="group" aria-label="Rýchle voľby">' + f.moznosti.map(function (m) {
        return '<button type="button" data-pick="' + esc(m) + '" aria-pressed="' + (v === m) + '">' + esc(m) + '</button>';
      }).join('') + '</div>'
      : '';
    return '<div class="field" id="w-' + f.id + '">' +
      '<label class="label" for="' + id + '">' + esc(f.label) + (f.optional ? ' <span class="optional">(nepovinné)</span>' : '') + '</label>' +
      '<p class="help" id="h-' + f.id + '">' + esc(f.help) + '</p>' +
      picks + '<div class="control">' + control + '</div>' +
      '<p class="error" id="e-' + f.id + '"></p></div>';
  }

  function errors() {
    var out = {};
    FIELDS.forEach(function (f) {
      var e = FORM.fieldError(f, values[f.id]);
      if (e) out[f.id] = e;
    });
    return out;
  }

  function refresh() {
    var errs = errors();
    FIELDS.forEach(function (f) {
      var show = !!errs[f.id] && !!(showAll || touched[f.id]);
      $('e-' + f.id).textContent = show ? errs[f.id] : '';
      $('w-' + f.id).classList.toggle('invalid', show);
      $('f-' + f.id).setAttribute('aria-invalid', show ? 'true' : 'false');
    });
    var pickBtns = document.querySelectorAll('[data-pick]');
    [].forEach.call(pickBtns, function (b) { b.setAttribute('aria-pressed', values.situacia === b.dataset.pick ? 'true' : 'false'); });
    return errs;
  }

  function renderForm() {
    document.title = T.title + ' — Moderný maklér';
    $('title').textContent = T.title;
    $('purpose').textContent = T.ucel;
    [].forEach.call(document.querySelectorAll('.switch a'), function (a) {
      if (a.dataset.typ === typ) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $('fields').innerHTML = FIELDS.map(fieldHtml).join('');
    refresh();
  }

  var form = $('form');
  form.addEventListener('input', function (e) {
    if (!e.target.name || e.target.name === 'web') return;
    values[e.target.name] = e.target.value;
    save();
    refresh();
  });
  form.addEventListener('change', function (e) {
    if (!e.target.name || e.target.name === 'web') return;
    values[e.target.name] = e.target.value;
    touched[e.target.name] = true;
    save();
    refresh();
  });
  form.addEventListener('focusout', function (e) {
    if (e.target.name && String(e.target.value || '').trim()) { touched[e.target.name] = true; refresh(); }
  });
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]');
    if (!b) return;
    values.situacia = b.dataset.pick;
    $('f-situacia').value = b.dataset.pick;
    touched.situacia = true;
    save();
    refresh();
    $('f-situacia').focus();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showAll = true;
    var errs = refresh();
    var first = Object.keys(errs)[0];
    if (first) { $('f-' + first).focus(); return; }

    var btn = $('submit');
    var formErr = $('form-error');
    btn.disabled = true;
    btn.textContent = 'Odosielam…';
    formErr.hidden = true;

    fetch('/api/makler/submit', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typ: typ, vstupy: values, web: form.elements.web.value })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; }); })
      .then(function (res) {
        if (res.ok && res.data.token) {
          try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* bez localStorage */ }
          return showGenerating(res.data.token);
        }
        if (res.status === 401) { location.href = '/makler/prihlasenie.html?next=' + encodeURIComponent(location.pathname); return; }
        var field = res.data.field;
        if (field && $('e-' + field)) {
          touched[field] = true;
          refresh();
          $('e-' + field).textContent = res.data.error;
          $('f-' + field).focus();
        } else {
          formErr.textContent = res.data.error || 'Odoslanie sa nepodarilo. Skús to znova.';
          formErr.hidden = false;
        }
        btn.disabled = false;
        btn.textContent = 'Vytvoriť avatara';
      })
      .catch(function () {
        formErr.textContent = 'Spojenie zlyhalo. Skontroluj internet a skús to znova, formulár ostáva vyplnený.';
        formErr.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Vytvoriť avatara';
      });
  });

  function showGenerating(token) {
    var reportUrl = '/makler/avatar/' + encodeURIComponent(token);
    $('app').innerHTML =
      '<section class="state"><p class="kicker">Pracujem na tom</p>' +
      '<h1>Skladám ' + esc(T.title.toLowerCase()) + '</h1>' +
      '<p class="lead">Zvyčajne to trvá 1–2 minúty. Keď bude hotový, otvorí sa sám. Môžeš odísť, nájdeš ho v prehľade tímu.</p>' +
      '<ol class="live"><li class="done"><span class="dot"></span><span>Zadanie je uložené.</span></li>' +
      '<li class="active"><span class="dot"></span><span>AI skladá psychológiu, námietky, cenovú stratégiu a podklady pre ' + esc(values.kanal) + '.</span></li>' +
      '<li><span class="dot"></span><span>Otvorím hotového avatara.</span></li></ol>' +
      '<p class="elapsed" id="elapsed">Beží 0:00</p></section>';
    window.scrollTo(0, 0);
    var started = Date.now();
    var timer = setInterval(function () {
      var s = Math.floor((Date.now() - started) / 1000);
      var el = $('elapsed');
      if (el) el.textContent = 'Beží ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }, 1000);
    var poll = function () {
      if (Date.now() - started > POLL_MAX_MS) { clearInterval(timer); location.href = reportUrl; return; }
      fetch('/api/makler/status/' + encodeURIComponent(token), { cache: 'no-store', credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (d) {
          if (d.status === 'done' || d.status === 'failed') { clearInterval(timer); location.href = reportUrl; return; }
          setTimeout(poll, POLL_MS);
        })
        .catch(function () { setTimeout(poll, POLL_MS); });
    };
    setTimeout(poll, POLL_MS);
  }

  renderForm();
})();

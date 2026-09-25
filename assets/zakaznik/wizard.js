(function () {
  'use strict';

  var FORM = window.ZAKAZNIK_FORM;
  var STORAGE_KEY = 'srk-kto-je-moj-zakaznik-v1';
  var STEPS = FORM.STEPS.concat([FORM.DELIVERY_STEP]);
  var TOTAL = STEPS.length;
  var POLL_MS = 3000;
  var POLL_MAX_MS = 3 * 60 * 1000;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    landing: $('landing'), start: $('start'), btnStart: $('btn-start'),
    wizard: $('wizard'), stepsNav: $('steps-nav'), label: $('progress-label'), saved: $('progress-saved'),
    bar: $('progress-bar'), form: $('form'), step: $('step'), back: $('btn-back'), next: $('btn-next'),
    state: $('state')
  };

  var state = {
    step: 0,
    maxStep: 0,
    values: {},
    delivery: { meno: '', email: '', firma: '', marketing_suhlas: false, gdpr_suhlas: false },
    utm: {},
    touched: {},
    showAll: false
  };
  var turnstile = { siteKey: null, token: '', widget: null, loading: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- úložisko ---------- */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (d && d.v === 1) return d;
    } catch (e) { /* poškodený draft ignorujeme */ }
    return null;
  }
  var saveTimer = null;
  function save(immediate) {
    clearTimeout(saveTimer);
    var run = function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          v: 1, step: state.step, maxStep: state.maxStep, values: state.values, utm: state.utm,
          delivery: { meno: state.delivery.meno, email: state.delivery.email, firma: state.delivery.firma, marketing_suhlas: state.delivery.marketing_suhlas },
          savedAt: Date.now()
        }));
        el.saved.textContent = 'Uložené v tomto prehliadači';
      } catch (e) { el.saved.textContent = ''; }
    };
    if (immediate) run(); else saveTimer = setTimeout(run, 300);
  }
  function clearDraft() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* nič */ }
  }

  function readUtm() {
    var params = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
      var v = params.get(k);
      if (v) state.utm[k] = v.slice(0, 200);
    });
  }

  /* ---------- validácia ---------- */
  function deliveryErrors() {
    var d = state.delivery;
    var e = {};
    if (!d.meno.trim()) e.meno = 'Napíš, ako ťa mám osloviť. Tak ťa oslovím aj v e-maile s reportom.';
    if (!EMAIL_RE.test(d.email.trim())) e.email = 'Skontroluj e-mail. Na túto adresu ti príde hotový report.';
    if (!d.gdpr_suhlas) e.gdpr_suhlas = 'Bez tohto súhlasu ti report nemôžem vytvoriť ani poslať.';
    if (turnstile.siteKey && !turnstile.token) e.turnstile = 'Potvrď, že nie si robot. Overenie je tesne nad tlačidlom.';
    return e;
  }

  function stepErrors(index) {
    if (index === TOTAL - 1) return deliveryErrors();
    var errors = {};
    STEPS[index].fields.forEach(function (f) {
      var msg = FORM.fieldError(f, state.values[f.id]);
      if (msg) errors[f.id] = msg;
    });
    return errors;
  }

  function isStepValid(index) {
    return Object.keys(stepErrors(index)).length === 0;
  }

  /* ---------- vykreslenie ---------- */
  function renderNav() {
    el.stepsNav.innerHTML = STEPS.map(function (s, i) {
      var cls = i === state.step ? 'active' : (i < state.maxStep || (i < state.step) ? 'done' : '');
      var reachable = i <= state.maxStep && i !== state.step;
      return '<li class="' + cls + '"><button type="button" data-go="' + i + '" data-reachable="' + reachable + '"' +
        (i === state.step ? ' aria-current="step"' : '') + (reachable ? '' : ' tabindex="-1"') + '>' +
        '<span class="n">' + (i + 1) + '</span><span>' + esc(s.short) + '</span></button></li>';
    }).join('');
  }

  function fieldHtml(f) {
    var id = 'f-' + f.id;
    var described = 'h-' + f.id + ' e-' + f.id + ' s-' + f.id;
    var head =
      '<label class="label" for="' + id + '">' + esc(f.label) +
      (f.optional ? ' <span class="optional">(voliteľné)</span>' : '') + '</label>' +
      '<p class="help" id="h-' + f.id + '">' + esc(f.help) + '</p>';
    var control;
    if (f.type === 'textarea') {
      control = '<textarea id="' + id + '" name="' + f.id + '" rows="5" placeholder="' + esc(f.placeholder) +
        '" aria-describedby="' + described + '"' + (f.optional ? '' : ' aria-required="true"') + '>' +
        esc(state.values[f.id] || '') + '</textarea>';
    } else if (f.type === 'select') {
      control = '<select id="' + id + '" name="' + f.id + '" aria-describedby="' + described + '" aria-required="true">' +
        '<option value="">' + esc(f.placeholder) + '</option>' +
        f.options.map(function (o) {
          return '<option' + (state.values[f.id] === o ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') + '</select>';
    } else {
      control =
        '<div class="chip-box"><ul class="chip-list" id="l-' + f.id + '" aria-label="Pridané položky"></ul>' +
        '<div class="chip-add"><input type="text" id="' + id + '" data-chips="' + f.id + '" maxlength="' + FORM.CHIP_MAX_LENGTH +
        '" placeholder="Napr. ' + esc('„' + f.examples[0] + '“') + '" aria-describedby="' + described + '" enterkeyhint="done">' +
        '<button type="button" class="btn btn-secondary" data-add="' + f.id + '">Pridať</button></div></div>';
    }
    return '<div class="field" id="w-' + f.id + '">' + head + '<div class="control">' + control + '</div>' +
      '<div class="meta-row"><p class="error" id="e-' + f.id + '"></p><span class="count" id="c-' + f.id + '" aria-hidden="true"></span></div>' +
      '<p class="soft" id="s-' + f.id + '" hidden></p></div>';
  }

  function deliveryHtml() {
    var d = state.delivery;
    var input = function (id, label, type, extra, optional) {
      return '<div class="field" id="w-' + id + '"><label class="label" for="f-' + id + '">' + label +
        (optional ? ' <span class="optional">(voliteľné)</span>' : '') + '</label><div class="control">' +
        '<input type="' + type + '" id="f-' + id + '" name="' + id + '" value="' + esc(d[id]) + '" ' + extra +
        ' aria-describedby="e-' + id + '"></div><div class="meta-row"><p class="error" id="e-' + id + '"></p></div></div>';
    };
    return input('meno', 'Ako ťa mám osloviť?', 'text', 'autocomplete="given-name" maxlength="120" aria-required="true"') +
      input('email', 'Tvoj e-mail', 'email', 'autocomplete="email" inputmode="email" maxlength="254" aria-required="true"') +
      input('firma', 'Firma', 'text', 'autocomplete="organization" maxlength="200"', true) +
      '<div class="field" id="w-gdpr_suhlas"><label class="check"><input type="checkbox" id="f-gdpr_suhlas" name="gdpr_suhlas"' +
      (d.gdpr_suhlas ? ' checked' : '') + ' aria-describedby="e-gdpr_suhlas" aria-required="true"><span>' + esc(FORM.GDPR_TEXT) + '</span></label>' +
      '<div class="meta-row"><p class="error" id="e-gdpr_suhlas"></p></div>' +
      '<label class="check"><input type="checkbox" id="f-marketing_suhlas" name="marketing_suhlas"' + (d.marketing_suhlas ? ' checked' : '') +
      '><span>' + esc(FORM.MARKETING_TEXT) + '</span></label></div>' +
      '<div class="hp" aria-hidden="true"><label for="f-web">Nechaj prázdne</label><input type="text" id="f-web" name="web" tabindex="-1" autocomplete="off"></div>' +
      '<div class="ts" id="ts"></div><div class="meta-row"><p class="error" id="e-turnstile"></p></div>' +
      '<p class="privacy">Ako s údajmi narábam, nájdeš v <a href="/ochrana-osobnych-udajov" target="_blank" rel="noopener">zásadách ochrany osobných údajov</a>.</p>' +
      '<div id="form-error" class="form-error" role="alert" hidden></div>';
  }

  function renderStep(focusFirst) {
    var s = STEPS[state.step];
    var isLast = state.step === TOTAL - 1;
    el.label.textContent = 'Krok ' + (state.step + 1) + ' zo ' + TOTAL;
    el.bar.style.width = Math.round(((state.step + 1) / TOTAL) * 100) + '%';
    el.back.hidden = state.step === 0;
    el.next.textContent = isLast ? 'Vytvoriť profil zákazníka' : 'Ďalej';

    el.step.innerHTML =
      '<div class="step-head"><h2 id="step-title" tabindex="-1">' + esc(s.title) + '</h2>' +
      (s.intro ? '<p class="step-intro">' + esc(s.intro) + '</p>' : '') + '</div>' +
      (isLast ? deliveryHtml() : s.fields.map(fieldHtml).join(''));

    if (!isLast) s.fields.forEach(function (f) { if (f.type === 'chips') renderChips(f); });
    state.showAll = false;
    refresh();
    renderNav();
    if (isLast) setupTurnstile();
    if (focusFirst) {
      el.wizard.scrollIntoView({ block: 'start' });
      $('step-title').focus({ preventScroll: true });
    }
  }

  function renderChips(f) {
    var list = $('l-' + f.id);
    var items = Array.isArray(state.values[f.id]) ? state.values[f.id] : [];
    list.innerHTML = items.map(function (v, i) {
      return '<li><span>' + esc(v) + '</span><button type="button" class="chip-remove" data-remove="' + f.id + '" data-index="' + i +
        '" aria-label="Odstrániť: ' + esc(v) + '">×</button></li>';
    }).join('');
  }

  /* Prekreslí chyby, počítadlá a hinty bez straty fokusu. */
  function refresh() {
    var errors = stepErrors(state.step);
    var isLast = state.step === TOTAL - 1;
    var ids = isLast ? ['meno', 'email', 'gdpr_suhlas', 'turnstile'] : STEPS[state.step].fields.map(function (f) { return f.id; });

    ids.forEach(function (id) {
      var show = !!errors[id] && (state.showAll || state.touched[id]);
      var err = $('e-' + id);
      if (err) err.textContent = show ? errors[id] : '';
      var wrap = $('w-' + id);
      if (wrap) wrap.classList.toggle('invalid', show);
      var input = $('f-' + id);
      if (input) input.setAttribute('aria-invalid', show ? 'true' : 'false');
    });

    if (!isLast) {
      STEPS[state.step].fields.forEach(function (f) {
        var count = $('c-' + f.id);
        if (f.type === 'textarea' && !f.optional) {
          var len = String(state.values[f.id] || '').trim().length;
          count.textContent = len + ' / ' + f.min;
          count.classList.toggle('ok', len >= f.min);
        } else if (f.type === 'chips') {
          var n = FORM.cleanChips(state.values[f.id]).length;
          count.textContent = n + ' / ' + f.minItems + ' položky';
          count.classList.toggle('ok', n >= f.minItems);
        }
        var soft = $('s-' + f.id);
        if (soft && f.type === 'textarea') {
          var hint = FORM.emptyPhraseHint(state.values[f.id]);
          soft.hidden = !hint;
          soft.textContent = hint || '';
        }
      });
    }
    el.next.setAttribute('aria-disabled', Object.keys(errors).length ? 'true' : 'false');
  }

  /* ---------- chips ---------- */
  function addChip(id) {
    var input = $('f-' + id);
    var v = input.value.trim().replace(/^[„"“']+|[“"”']+$/g, '').trim();
    if (v.length < FORM.CHIP_MIN_LENGTH) return false;
    var items = Array.isArray(state.values[id]) ? state.values[id].slice() : [];
    items.push(v);
    state.values[id] = items;
    input.value = '';
    state.touched[id] = true;
    renderChips(fieldById(id));
    refresh();
    save();
    return true;
  }
  function flushChipInputs() {
    if (state.step === TOTAL - 1) return;
    STEPS[state.step].fields.forEach(function (f) {
      if (f.type === 'chips' && $('f-' + f.id).value.trim()) addChip(f.id);
    });
  }
  function fieldById(id) {
    return FORM.allFields().filter(function (f) { return f.id === id; })[0];
  }

  /* ---------- navigácia ---------- */
  function go(index) {
    state.step = Math.max(0, Math.min(TOTAL - 1, index));
    state.maxStep = Math.max(state.maxStep, state.step);
    save(true);
    renderStep(true);
  }

  function next() {
    flushChipInputs();
    var errors = stepErrors(state.step);
    var keys = Object.keys(errors);
    if (keys.length) {
      state.showAll = true;
      refresh();
      var first = $('f-' + keys[0]) || $('ts');
      if (first) {
        first.scrollIntoView({ block: 'center' });
        if (first.focus) first.focus({ preventScroll: true });
      }
      return;
    }
    if (state.step === TOTAL - 1) return submit();
    go(state.step + 1);
  }

  function showWizard(step) {
    el.landing.hidden = true;
    el.state.hidden = true;
    el.wizard.hidden = false;
    state.step = step || 0;
    state.maxStep = Math.max(state.maxStep, state.step);
    renderStep(true);
  }

  /* ---------- Turnstile ---------- */
  function setupTurnstile() {
    var mount = function () {
      if (!turnstile.siteKey || !window.turnstile || !$('ts')) return;
      turnstile.token = '';
      turnstile.widget = window.turnstile.render('#ts', {
        sitekey: turnstile.siteKey,
        theme: 'dark',
        language: 'sk',
        callback: function (t) { turnstile.token = t; state.touched.turnstile = true; refresh(); },
        'expired-callback': function () { turnstile.token = ''; refresh(); },
        'error-callback': function () { turnstile.token = ''; refresh(); }
      });
      refresh();
    };
    var loadScript = function () {
      if (window.turnstile) return mount();
      if (turnstile.loading) return;
      turnstile.loading = true;
      window.__srkTurnstileReady = mount;
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__srkTurnstileReady';
      s.async = true;
      document.head.appendChild(s);
    };
    if (turnstile.siteKey !== null) return loadScript();
    fetch('/api/zakaznik/config').then(function (r) { return r.json(); }).then(function (c) {
      turnstile.siteKey = c.turnstileSiteKey || '';
      if (turnstile.siteKey) loadScript();
    }).catch(function () { turnstile.siteKey = ''; });
  }

  /* ---------- odoslanie ---------- */
  function fieldStep(id) {
    for (var i = 0; i < FORM.STEPS.length; i++) {
      if (FORM.STEPS[i].fields.some(function (f) { return f.id === id; })) return i;
    }
    return TOTAL - 1;
  }

  function submit() {
    var box = $('form-error');
    box.hidden = true;
    el.next.disabled = true;
    el.next.textContent = 'Odosielam…';
    var payload = {
      odpovede: state.values,
      meno: state.delivery.meno.trim(),
      email: state.delivery.email.trim(),
      firma: state.delivery.firma.trim(),
      gdpr_suhlas: state.delivery.gdpr_suhlas,
      marketing_suhlas: state.delivery.marketing_suhlas,
      turnstile_token: turnstile.token,
      utm: state.utm,
      web: $('f-web').value
    };
    fetch('/api/zakaznik/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) { return { ok: r.ok, data: data }; });
    }).then(function (res) {
      if (res.ok && res.data.token) {
        clearDraft();
        return showGenerating(res.data.token, payload.email);
      }
      failSubmit(res.data);
    }).catch(function () {
      failSubmit({ error: 'Nepodarilo sa spojiť so serverom. Skontroluj pripojenie a skús to znova — odpovede máš uložené.' });
    });
  }

  function failSubmit(data) {
    el.next.disabled = false;
    el.next.textContent = 'Vytvoriť profil zákazníka';
    if (window.turnstile && turnstile.widget !== null) {
      window.turnstile.reset(turnstile.widget);
      turnstile.token = '';
    }
    var field = data && data.field;
    if (field && fieldStep(field) !== TOTAL - 1) {
      go(fieldStep(field));
      state.showAll = true;
      refresh();
      return;
    }
    if (field && $('e-' + field)) {
      state.showAll = true;
      refresh();
      $('e-' + field).textContent = data.error;
      return;
    }
    var box = $('form-error');
    box.textContent = (data && data.error) || 'Niečo sa pokazilo. Skús to o chvíľu znova — odpovede máš uložené.';
    box.hidden = false;
    box.scrollIntoView({ block: 'center' });
  }

  /* ---------- stav po odoslaní ---------- */
  function reportUrl(token) { return '/kto-je-moj-zakaznik/report/' + encodeURIComponent(token); }

  function showState(html) {
    el.wizard.hidden = true;
    el.landing.hidden = true;
    el.state.hidden = false;
    el.state.innerHTML = '<div class="state">' + html + '</div>';
    window.scrollTo(0, 0);
    var h = el.state.querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function showGenerating(token, email) {
    showState(
      '<p class="kicker">Pracujem na tom</p>' +
      '<h2>Skladám profil tvojho zákazníka</h2>' +
      '<p class="lead">Zvyčajne to trvá 1–2 minúty. Stránku môžeš zavrieť — report ti príde na e-mail aj tak.</p>' +
      '<ol class="live" id="live">' +
      '<li class="done" data-s="saved"><span class="dot"></span><span>Odpovede sú uložené.</span></li>' +
      '<li class="active" data-s="gen"><span class="dot"></span><span id="gen-text">Čakám, kým sa AI uvoľní na tvoje odpovede.</span></li>' +
      '<li data-s="mail"><span class="dot"></span><span>Report odchádza na ' + esc(email) + '.</span></li>' +
      '</ol><p class="elapsed" id="elapsed">Beží 0:00</p>'
    );
    var started = Date.now();
    var doneAt = null;
    var timer = setInterval(function () {
      var s = Math.floor((Date.now() - started) / 1000);
      var e = $('elapsed');
      if (e) e.textContent = 'Beží ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }, 1000);

    var setItem = function (name, cls) {
      var li = document.querySelector('#live [data-s="' + name + '"]');
      if (li) li.className = cls;
    };
    var finish = function (fn) { clearInterval(timer); fn(); };

    var poll = function () {
      if (Date.now() - started > POLL_MAX_MS) return finish(function () { showLater(token, email); });
      fetch('/api/zakaznik/status/' + encodeURIComponent(token), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (d) {
          if (d.status === 'generating') {
            var t = $('gen-text');
            if (t) t.textContent = 'AI číta tvoje odpovede a skladá psychografiu, vnútorný dialóg, námietky a vety do reklamy.';
          }
          if (d.status === 'failed') return finish(function () { showLater(token, email); });
          if (d.status === 'done') {
            setItem('gen', 'done');
            setItem('mail', d.email_sent ? 'done' : 'active');
            doneAt = doneAt || Date.now();
            if (d.email_sent || Date.now() - doneAt > 20000) {
              return finish(function () { showDone(token, email, d.email_sent); });
            }
          }
          setTimeout(poll, POLL_MS);
        })
        .catch(function () { setTimeout(poll, POLL_MS); });
    };
    setTimeout(poll, POLL_MS);
  }

  function showDone(token, email, sent) {
    showState(
      '<p class="kicker">Hotovo</p>' +
      '<h2>' + (sent ? 'Report ti prišiel na e-mail' : 'Report je hotový') + '</h2>' +
      '<p class="lead">' + (sent
        ? 'Odišiel na <strong>' + esc(email) + '</strong>. Ak ho o chvíľu nevidíš, pozri aj priečinok Promo alebo Spam.'
        : 'E-mail na <strong>' + esc(email) + '</strong> je na ceste. Report si môžeš otvoriť hneď.') + '</p>' +
      '<div class="actions"><a class="btn btn-primary" href="' + reportUrl(token) + '">Otvoriť report</a></div>' +
      '<p class="note">Odkaz na report je trvalý. Ulož si ho alebo ho nájdeš v e-maile.</p>'
    );
  }

  function showLater(token, email) {
    showState(
      '<p class="kicker">Odpovede máme</p>' +
      '<h2>Report ti pošleme do niekoľkých minút na e-mail</h2>' +
      '<p class="lead">Tvoje odpovede sú uložené a profil sa dokončuje na pozadí. Hotový report príde na <strong>' + esc(email) +
      '</strong>. Nemusíš nič vypĺňať znova.</p>' +
      '<div class="actions"><a class="btn btn-secondary" href="' + reportUrl(token) + '">Stav reportu</a></div>'
    );
  }

  /* ---------- udalosti ---------- */
  el.form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.chips || t.name === 'web') return;
    if (t.name in state.delivery) {
      state.delivery[t.name] = t.type === 'checkbox' ? t.checked : t.value;
    } else if (t.name) {
      state.values[t.name] = t.value;
    }
    save();
    refresh();
  });
  el.form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.type === 'checkbox' || t.tagName === 'SELECT') {
      if (t.name in state.delivery) state.delivery[t.name] = t.type === 'checkbox' ? t.checked : t.value;
      else state.values[t.name] = t.value;
      state.touched[t.name] = true;
      save();
      refresh();
    }
  });
  el.form.addEventListener('focusout', function (e) {
    var t = e.target;
    var id = t.dataset.chips || t.name;
    if (!id || id === 'web') return;
    var empty = t.dataset.chips ? !FORM.cleanChips(state.values[id]).length && !t.value.trim() : !String(t.value || '').trim();
    if (!empty) state.touched[id] = true;
    refresh();
  });
  el.form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.dataset.chips) {
      e.preventDefault();
      addChip(e.target.dataset.chips);
    }
  });
  el.form.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) { addChip(add.dataset.add); $('f-' + add.dataset.add).focus(); return; }
    var rm = e.target.closest('[data-remove]');
    if (rm) {
      var id = rm.dataset.remove;
      var items = state.values[id].slice();
      items.splice(Number(rm.dataset.index), 1);
      state.values[id] = items;
      renderChips(fieldById(id));
      refresh();
      save();
      $('f-' + id).focus();
    }
  });
  el.form.addEventListener('submit', function (e) { e.preventDefault(); next(); });
  el.back.addEventListener('click', function () { flushChipInputs(); go(state.step - 1); });
  el.stepsNav.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b && b.dataset.reachable === 'true') { flushChipInputs(); go(Number(b.dataset.go)); }
  });

  /* ---------- štart ---------- */
  readUtm();
  var draft = load();
  if (draft) {
    state.values = draft.values || {};
    state.step = Math.min(draft.step || 0, TOTAL - 1);
    state.maxStep = Math.min(draft.maxStep || 0, TOTAL - 1);
    Object.assign(state.delivery, draft.delivery || {});
    state.utm = Object.assign({}, draft.utm || {}, state.utm);
    el.btnStart.textContent = 'Pokračovať';
    el.start.insertAdjacentHTML('beforeend',
      '<button type="button" class="btn-link" id="btn-reset">Začať odznova</button>' +
      '<p class="resume-note">Máš rozpracovaný formulár — krok ' + (state.step + 1) + ' zo ' + TOTAL + '. Odpovede sú uložené v tomto prehliadači.</p>');
    $('btn-reset').addEventListener('click', function () {
      if (!confirm('Naozaj chceš vymazať rozpracované odpovede a začať odznova?')) return;
      clearDraft();
      state.values = {};
      state.step = 0;
      state.maxStep = 0;
      state.delivery = { meno: '', email: '', firma: '', marketing_suhlas: false, gdpr_suhlas: false };
      showWizard(0);
    });
  }
  el.btnStart.addEventListener('click', function () { showWizard(state.step); });
})();

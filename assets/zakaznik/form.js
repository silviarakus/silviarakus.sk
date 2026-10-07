/* Definícia formulára „Kto je môj zákazník?“ — jediný zdroj pravdy pre prehliadač aj server. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZAKAZNIK_FORM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var CENY = [
    'do 500 €',
    '500–2 000 €',
    '2 000–10 000 €',
    '10 000–50 000 €',
    'nad 50 000 €',
    'provízia z transakcie'
  ];

  var STEPS = [
    {
      id: 'ponuka',
      title: 'Tvoja firma, ponuka a zákazník',
      short: 'Firma a zákazník',
      intro: 'Stačí pár viet. Zvyšok — bolesti, obavy, námietky, vnútorný dialóg aj vety do reklamy — za teba dopracuje AI. Čím konkrétnejšie opíšeš, komu predávaš, tým presnejší profil dostaneš.',
      fields: [
        {
          id: 'firma', label: 'Ako sa volá tvoja firma?', type: 'text', min: 0, optional: true,
          help: 'Ak ešte nemáš názov, pokojne preskoč.',
          placeholder: 'Reality Novák'
        },
        {
          id: 'o_firme', label: 'Čím sa tvoja firma zaoberá?', type: 'textarea', min: 30,
          help: 'Jednou-dvomi vetami. V akom odbore pôsobíš a čo robíš inak ako ostatní.',
          placeholder: 'Sme malá realitná kancelária v Trenčíne. Predávame byty a domy a celý proces riešime za klienta.',
          hint: 'Dopíš aspoň jednu celú vetu. V akom odbore pôsobíš a pre koho pracuješ?'
        },
        {
          id: 'produkt', label: 'Čo konkrétne predávaš?', type: 'textarea', min: 30,
          help: 'Jeden produkt alebo službu, pre ktorú chceš profil zákazníka.',
          placeholder: 'Kompletný predaj bytu na kľúč — nacenenie, fotky, inzercia, obhliadky, právny servis až po odovzdanie kľúčov.',
          hint: 'Opíš to konkrétnejšie. Čo presne človek dostane, keď si to od teba kúpi?'
        },
        {
          id: 'segment', label: 'Komu to predávaš?', type: 'textarea', min: 30,
          help: 'Vyber jeden typ zákazníka alebo jednu situáciu. „Majitelia bytov“ sú desiatky rôznych ľudí — „ľudia, ktorí zdedili byt a nevedia, kde začať“ je jeden konkrétny zákazník.',
          placeholder: 'Ľudia, ktorí zdedili byt po rodičoch, bývajú v inom meste a chcú ho predať, ale nevedia, kde začať.',
          hint: 'Zúž to na jeden typ zákazníka. Kto presne, v akej situácii a s akým problémom k tebe prichádza?'
        },
        {
          id: 'cena', label: 'Cenová hladina ponuky', type: 'select', options: CENY,
          help: 'Mení to, ako dlho a ako opatrne sa zákazník rozhoduje.',
          placeholder: 'Vyber cenovú hladinu',
          hint: 'Vyber cenovú hladinu. Podľa nej AI odhadne, ako opatrne sa tvoj zákazník rozhoduje.'
        },
        {
          id: 'doplnok', label: 'Čo o svojich zákazníkoch už vieš?', type: 'textarea', min: 0, optional: true,
          help: 'Voliteľné. Čo ich trápi, čo ti hovoria, čo namietajú. Každá skutočná veta od zákazníka spresní výsledok.',
          placeholder: 'Často počúvam: „Nechcem, aby to išlo niekomu za babku.“ Väčšinou sa boja, že ich realiťák oklame.'
        }
      ]
    }
  ];

  var DELIVERY_STEP = {
    id: 'dorucenie',
    title: 'Kam ti pošlem report',
    short: 'Doručenie'
  };

  var GDPR_EMAIL = 'silvia@fenixos.sk';
  var GDPR_TEXT = 'Súhlasím so spracovaním vyplnených údajov na účel vytvorenia a zaslania profilu môjho zákazníka. Údaje sa neposkytujú tretím stranám okrem technických poskytovateľov (hosting, e-mail, AI spracovanie). Súhlas môžem kedykoľvek odvolať na ' + GDPR_EMAIL + '.';
  var MARKETING_TEXT = 'Chcem občas dostať e-mail s praktickými vecami k predaju a marketingu.';

  var EMPTY_PHRASES = [
    { phrase: 'kvalitu', hint: 'Toto je zatiaľ všeobecné. Čo presne pre neho znamená kvalita a podľa čoho ju spozná?' },
    { phrase: 'individuálny prístup', hint: 'Toto je zatiaľ všeobecné. Čo konkrétne chce, aby bolo inak ako u ostatných?' },
    { phrase: 'chce ušetriť', hint: 'Toto je zatiaľ všeobecné. Na čom presne chce ušetriť a čo by s tými peniazmi robil?' },
    { phrase: 'nemá čas', hint: 'Toto je zatiaľ všeobecné. Na čo mu chýba čas a čo by s ním robil, keby ho mal?' },
    { phrase: 'chce byť úspešný', hint: 'Toto je zatiaľ všeobecné. Ako vyzerá úspech práve pre neho a čo by sa zmenilo v jeho bežnom dni?' },
    { phrase: 'profesionálny prístup', hint: 'Toto je zatiaľ všeobecné. Čo by musel dodávateľ urobiť, aby povedal, že to bolo profesionálne?' }
  ];
  var EMPTY_PHRASE_MAX_LENGTH = 140;
  var CHIP_MIN_LENGTH = 3;
  var CHIP_MAX_LENGTH = 300;
  var TEXT_MAX_LENGTH = 4000;

  function fold(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function allFields() {
    var out = [];
    STEPS.forEach(function (step) { step.fields.forEach(function (f) { out.push(f); }); });
    return out;
  }

  function cleanChips(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map(function (v) { return String(v || '').trim(); })
      .filter(function (v) { return v.length >= CHIP_MIN_LENGTH; });
  }

  /* Vráti text výzvy, ak pole nespĺňa minimum; inak null. */
  function fieldError(field, value) {
    if (field.optional) return null;
    if (field.type === 'chips') {
      return cleanChips(value).length >= field.minItems ? null : field.hint;
    }
    if (field.type === 'select') {
      return field.options.indexOf(value) === -1 ? field.hint : null;
    }
    var len = String(value || '').trim().length;
    return len >= field.min ? null : field.hint;
  }

  /* Mäkký hint pri prázdnych frázach — neblokuje. */
  function emptyPhraseHint(value) {
    var text = fold(value).trim();
    if (!text || text.length > EMPTY_PHRASE_MAX_LENGTH) return null;
    for (var i = 0; i < EMPTY_PHRASES.length; i++) {
      if (text.indexOf(fold(EMPTY_PHRASES[i].phrase)) !== -1) return EMPTY_PHRASES[i].hint;
    }
    return null;
  }

  return {
    STEPS: STEPS,
    DELIVERY_STEP: DELIVERY_STEP,
    CENY: CENY,
    GDPR_EMAIL: GDPR_EMAIL,
    GDPR_TEXT: GDPR_TEXT,
    MARKETING_TEXT: MARKETING_TEXT,
    EMPTY_PHRASES: EMPTY_PHRASES,
    CHIP_MIN_LENGTH: CHIP_MIN_LENGTH,
    CHIP_MAX_LENGTH: CHIP_MAX_LENGTH,
    TEXT_MAX_LENGTH: TEXT_MAX_LENGTH,
    allFields: allFields,
    cleanChips: cleanChips,
    fieldError: fieldError,
    emptyPhraseHint: emptyPhraseHint
  };
});

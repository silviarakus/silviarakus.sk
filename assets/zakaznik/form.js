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
      title: 'Čo predávaš a komu',
      short: 'Ponuka a segment',
      fields: [
        {
          id: 'produkt', label: 'Čo predávaš?', type: 'textarea', min: 80,
          help: 'Potrebujem vedieť, čo je predmet predaja, aby som nemiešal produkt s výsledkom.',
          placeholder: 'Kompletná realitná služba pri predaji bytu — od nacenenia po odovzdanie kľúčov.',
          hint: 'Opíš to konkrétnejšie. Čo presne človek dostane a od čoho do čoho to tvoja služba alebo produkt pokrýva?'
        },
        {
          id: 'segment', label: 'Ktorý jeden konkrétny segment teraz riešime?', type: 'textarea', min: 60,
          help: 'Cieľová skupina nie je avatar. „Majitelia bytov“ sú desiatky rôznych ľudí s úplne inou motiváciou. Vyber jeden segment — pre ďalší si urobíš avatara zvlášť.',
          placeholder: 'Ľudia, ktorí zdedili byt a chcú ho predať, ale nevedia, kde začať.',
          hint: 'Zúž to na jednu situáciu. Kto presne, v akom momente a s akým problémom prichádza?'
        },
        {
          id: 'cena', label: 'Cenová hladina ponuky', type: 'select', options: CENY,
          help: 'Mení to, ako hlboko človek rozmýšľa pred rozhodnutím.',
          placeholder: 'Vyber cenovú hladinu',
          hint: 'Vyber cenovú hladinu. Podľa nej viem, ako dlho a ako opatrne sa tvoj zákazník rozhoduje.'
        }
      ]
    },
    {
      id: 'kto',
      title: 'Kto to je',
      short: 'Demografia a situácia',
      fields: [
        {
          id: 'vek_situacia', label: 'Vek a životná situácia', type: 'textarea', min: 60,
          help: 'Nehľadám štatistiku, hľadám kontext — v akej fáze života sa rozhoduje.',
          placeholder: '38–55, ženatý, dve deti na základnej, vlastný dom na predmestí.',
          hint: 'Pridaj kontext. V akej fáze života je, keď sa rozhoduje — rodina, bývanie, čo práve mení?'
        },
        {
          id: 'profesia', label: 'Profesia a finančná situácia', type: 'textarea', min: 60,
          help: '„Manažér“ mi nestačí. Zaujíma ma, ako zarába a ako rozmýšľa o peniazoch.',
          placeholder: 'Podnikateľ alebo IT manažér, stabilne vyšší príjem, nehľadá najnižšiu cenu, ale bojí sa vyhodených peňazí.',
          hint: 'Ako zarába a ako rozmýšľa, keď míňa väčšiu sumu? Šetrí, investuje, bojí sa vyhodených peňazí?'
        },
        {
          id: 'aktualny_stav', label: 'Kde je dnes — čo práve rieši?', type: 'textarea', min: 100,
          help: 'Toto je bod „PRED“. Čo má, čo robí, ako sa cíti.',
          placeholder: 'Má moderný dom a elektromobil, ale stále platí vysoké účty a nevie, čo príde na ďalšej faktúre.',
          hint: 'Toto je bod PRED. Napíš tri veci: čo dnes má, čo s tým robí a ako sa pri tom cíti.'
        }
      ]
    },
    {
      id: 'bolest',
      title: 'Čo ho štve',
      short: 'Bolesť',
      fields: [
        {
          id: 'problem_technicky', label: 'Aký má technický problém?', type: 'textarea', min: 40,
          help: 'Najprv fakt, potom emócia.',
          placeholder: 'Má vysoký účet za elektrinu.',
          hint: 'Pomenuj fakt. Čo konkrétne nefunguje, chýba alebo ho stojí peniaze?'
        },
        {
          id: 'problem_emocny', label: 'A čo ho na tom štve najviac?', type: 'textarea', min: 80,
          help: 'Hlavná bolesť nie je problém — je to pocit, ktorý ten problém vyrába. Napíš to tak, ako to cíti on.',
          placeholder: 'Štve ho, že každý rok platí viac a nemá nad tým žiadnu kontrolu.',
          hint: 'Skús ísť o úroveň hlbšie. Čo pre neho ten problém znamená? Čo kvôli tomu nemôže robiť alebo čoho sa bojí?'
        },
        {
          id: 'strach', label: 'Čoho sa v tejto téme bojí?', type: 'textarea', min: 80,
          help: 'Za vetou „neviem, či sa mi to oplatí“ býva strach z chybného rozhodnutia, nie z ceny.',
          placeholder: 'Bojí sa, že zaplatí veľa a o dva roky zistí, že to bolo zle navrhnuté.',
          hint: 'Čo najhoršie sa môže stať, keď sa rozhodne zle? Čo by si potom pomyslel o sebe alebo čo by povedalo okolie?'
        },
        {
          id: 'cena_necinnosti', label: 'Čo ho to stojí, keď nič neurobí?', type: 'textarea', min: 60,
          help: 'Ak to nevieš, nevieš postaviť urgenciu.',
          placeholder: 'Každý rok, čo to odkladá, preplatí pár tisíc a problém sa nezmenší.',
          hint: 'Čo ho stojí každý mesiac čakania? Peniaze, čas, nervy, stratené príležitosti — čo z toho a koľko?'
        }
      ]
    },
    {
      id: 'skusal',
      title: 'Čo už skúšal a čomu neverí',
      short: 'Skúsenosti a námietky',
      fields: [
        {
          id: 'co_skusal', label: 'Čo už skúšal, kúpil alebo zisťoval?', type: 'textarea', min: 80,
          help: 'Tu vzniká nedôvera. Bez tejto odpovede nevieš, prečo ti nemusí veriť.',
          placeholder: 'Oslovil tri firmy a každá mu odporučila niečo iné.',
          hint: 'Vybav si, čo robil predtým, než prišiel za tebou. Koho oslovil, čo kúpil, čo si naštudoval?'
        },
        {
          id: 'preco_nefungovalo', label: 'Prečo to nedopadlo?', type: 'textarea', min: 60,
          help: 'Výsledok väčšinou nie je „nechce riešenie“, ale „chce riešenie a bojí sa urobiť chybu“.',
          placeholder: 'Stratil sa v protichodných odporúčaniach a rozhodnutie odložil.',
          hint: 'Čo presne ho zastavilo? Cena, zmätok, zlá skúsenosť, nedôvera k dodávateľovi?'
        },
        {
          id: 'namietky', label: 'Aké námietky od neho reálne slýchaš?', type: 'chips', minItems: 3,
          help: 'Napíš ich presne tak, ako ich hovorí. Neprekladaj ich do firemného jazyka.',
          placeholder: '„Je to drahé.“ / „Ešte počkám.“ / „Neviem, komu veriť.“',
          examples: ['Je to drahé.', 'Ešte počkám.', 'Neviem, komu veriť.'],
          hint: 'Bez námietok je profil zákazníka neúplný. Skús si vybaviť posledné tri hovory, ktoré nedopadli.'
        },
        {
          id: 'falosne_presvedcenia', label: 'Čomu verí tesne predtým, než povie NIE?', type: 'chips', minItems: 3,
          help: 'Nemusia byť objektívne pravdivé. Podstatné je, že im on verí.',
          placeholder: '„Všetky firmy sú rovnaké.“ / „U mňa to nebude fungovať.“',
          examples: ['Všetky firmy sú rovnaké.', 'U mňa to nebude fungovať.'],
          hint: 'Doplň aspoň tri. Čo si hovorí v duchu, keď tvoju ponuku odkladá? Napíš to jeho slovami.'
        }
      ]
    },
    {
      id: 'chce',
      title: 'Čo chce namiesto toho',
      short: 'Túžba a výsledok',
      fields: [
        {
          id: 'vysledok', label: 'Aký konkrétny výsledok mu sľubuješ?', type: 'textarea', min: 80,
          help: 'Nie produkt — konečný stav.',
          placeholder: 'Dom, batéria a auto fungujú ako jeden premyslený celok.',
          hint: 'Opíš konečný stav, nie produkt. Ako vyzerá jeho situácia v deň, keď je hotovo?'
        },
        {
          id: 'skryta_tuzba', label: 'Čo chce mať konečne pod kontrolou alebo prestať riešiť?', type: 'textarea', min: 80,
          help: 'Viditeľný cieľ nie je vždy skutočný cieľ. „Chcem viac peňazí“ môže znamenať „chcem prestať kontrolovať účet pred každým nákupom“.',
          placeholder: 'Chce mať energetiku domu vyriešenú raz a poriadne a prestať to riešiť.',
          hint: 'Choď za viditeľný cieľ. Čo konkrétne už nechce riešiť, kontrolovať alebo vysvetľovať?'
        },
        {
          id: 'pocit', label: 'Ako sa chce cítiť, keď je to vyriešené?', type: 'textarea', min: 40,
          help: 'Emócia za logickým cieľom.',
          placeholder: 'Pokojne, s pocitom, že to má pod kontrolou.',
          hint: 'Pomenuj emóciu. Ako sa chce cítiť, keď si na túto tému spomenie?'
        },
        {
          id: 'identita', label: 'Kým sa chce stať — ako chce sám seba vnímať?', type: 'textarea', min: 60,
          help: 'Ľudia kupujú aj identitu: zodpovedný rodič, človek, čo sa nenechá nachytať, ten, kto robí rozumné rozhodnutia.',
          placeholder: 'Človek, ktorý má moderný dom dotiahnutý do detailu a robí rozumné rozhodnutia.',
          hint: 'Kým chce byť vo vlastných očiach a v očiach okolia? Zodpovedný rodič, ten, čo sa nenechá nachytať, ten, kto to má dotiahnuté?'
        }
      ]
    },
    {
      id: 'jazyk',
      title: 'Jeho jazyk',
      short: 'Jeho jazyk',
      intro: 'Toto je najcennejšia časť. Ak máš poznámky z hovorov, e-mailov alebo recenzií, prepíš z nich presné vety. Nevymýšľaj a neprepisuj ich do pekného jazyka — pôvodná veta je vždy silnejšia.',
      fields: [
        {
          id: 'citaty', label: 'Presné vety, ktoré od neho slýchaš', type: 'chips', minItems: 3,
          help: 'Doslovne. „Nechcem kúpiť mačku vo vreci“ je 10× silnejšie ako „požaduje transparentnosť“.',
          placeholder: '„Každý mi hovorí niečo iné.“ / „Chcem to spraviť raz a poriadne.“',
          examples: ['Každý mi hovorí niečo iné.', 'Chcem to spraviť raz a poriadne.'],
          hint: 'Doplň aspoň tri vety. Doslova, tak ako ich povedal — aj s hovorovými slovami.'
        },
        {
          id: 'kamaradovi', label: 'Ako by svoj problém opísal kamarátovi pri káve?', type: 'textarea', min: 100,
          help: 'Nie obchodníkovi, nie odborníkovi. Kamarátovi.',
          placeholder: 'Ja nehľadám najlacnejšie. Chcem, aby to bolo spravené poriadne a nemusel som to za tri roky prerábať.',
          hint: 'Napíš to jeho hlasom, v prvej osobe. Takto by to povedal kamarátovi pri káve, nie tebe na stretnutí.'
        },
        {
          id: 'kde_zije', label: 'Kde sa informuje a komu verí?', type: 'textarea', min: 0, optional: true,
          help: 'Voliteľné, ale zlepší výstup.',
          placeholder: 'Facebookové skupiny o bývaní, YouTube recenzie, odporúčanie od kolegu.'
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

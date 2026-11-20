/* Polia formulára „Avatar zákazníka“ pre maklérov. Jeden zdroj pre prehliadač (window.MAKLER_FORM)
   aj pre server (require). Texty sú tu, nie v HTML. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MAKLER_FORM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TEXT_MAX = 1500;

  var NEHNUTELNOSTI = ['Byt', 'Rodinný dom', 'Pozemok', 'Chata alebo chalupa', 'Komerčný priestor', 'Rôzne typy'];
  var CENY = ['Do 100 000 €', '100 000 – 200 000 €', '200 000 – 350 000 €', '350 000 – 500 000 €', 'Nad 500 000 €'];
  var KANALY = ['Facebook a Instagram', 'Instagram', 'Facebook', 'TikTok', 'LinkedIn'];
  var FINANCOVANIE = ['Hypotéka', 'Hypotéka a vlastné úspory', 'Hotovosť', 'Ešte nevie'];

  var TYPY = {
    predavajuci: {
      id: 'predavajuci',
      nazov: 'Predávajúci',
      title: 'Avatar predávajúceho',
      kratko: 'Majiteľ, ktorý chce alebo musí predať nehnuteľnosť.',
      ucel: 'Na náberové kampane, obsah pre majiteľov a rozhovor o cene a provízii.',
      situacia: {
        label: 'V akej situácii je tvoj predávajúci?',
        help: 'Vyber jednu konkrétnu situáciu alebo napíš vlastnú. Čím konkrétnejšie, tým presnejší avatar.',
        placeholder: 'Napr. Zdedil byt po rodičoch v inom meste, nevie, koľko pýtať, a bojí sa, že ho niekto oberie.',
        moznosti: [
          'Zdedil byt po rodičoch a nevie, čo s ním',
          'Rodina sa sťahuje do väčšieho a potrebuje predať starý byt',
          'Rozvod – nehnuteľnosť treba predať a peniaze rozdeliť',
          'Senior sa sťahuje bližšie k deťom alebo do menšieho',
          'Predáva sám cez inzerát a nedarí sa mu',
          'Investor chce predať byt, ktorý doteraz prenajímal',
          'Sťahuje sa za prácou do iného mesta alebo do zahraničia'
        ]
      }
    },
    kupujuci: {
      id: 'kupujuci',
      nazov: 'Kupujúci',
      title: 'Avatar kupujúceho',
      kratko: 'Človek, ktorý hľadá nehnuteľnosť na bývanie alebo investíciu.',
      ucel: 'Na kampane k ponukám, obsah pre záujemcov a vyjednávanie o cene.',
      situacia: {
        label: 'V akej situácii je tvoj kupujúci?',
        help: 'Vyber jednu konkrétnu situáciu alebo napíš vlastnú. Čím konkrétnejšie, tým presnejší avatar.',
        placeholder: 'Napr. Mladý pár, obaja pracujú, platia nájom a chcú konečne vlastné, ale boja sa hypotéky.',
        moznosti: [
          'Mladý pár hľadá prvé vlastné bývanie',
          'Rodina s deťmi potrebuje väčší byt alebo dom',
          'Investor hľadá byt na prenájom',
          'Vracia sa zo zahraničia a chce si kúpiť domov',
          'Senior chce menšie bývanie bližšie k deťom',
          'Chce sa odsťahovať z mesta do domu so záhradou'
        ]
      }
    }
  };

  function fields(typ) {
    var t = TYPY[typ];
    if (!t) return [];
    var list = [
      { id: 'situacia', type: 'textarea', min: 15, label: t.situacia.label, help: t.situacia.help,
        placeholder: t.situacia.placeholder, moznosti: t.situacia.moznosti,
        error: 'Opíš aspoň jednou vetou, v akej situácii je tvoj zákazník. Môžeš kliknúť na niektorú možnosť.' },
      { id: 'region', type: 'text', min: 3, label: 'Kde ho chceš osloviť?',
        help: 'Mesto alebo región. Použije sa na cielenie reklamy aj na tón textov.',
        placeholder: 'Napr. Trenčín a okolie do 30 km', error: 'Napíš mesto alebo región.' },
      { id: 'nehnutelnost', type: 'select', options: NEHNUTELNOSTI, label: 'Typ nehnuteľnosti',
        help: typ === 'predavajuci' ? 'Čo predáva.' : 'Čo hľadá.', error: 'Vyber typ nehnuteľnosti.' },
      { id: 'cena', type: 'select', options: CENY, label: 'Cenové pásmo nehnuteľnosti',
        help: 'Od ceny sa odvíja cenová stratégia aj to, ako opatrne sa zákazník rozhoduje.', error: 'Vyber cenové pásmo.' }
    ];
    if (typ === 'kupujuci') {
      list.push({ id: 'financovanie', type: 'select', options: FINANCOVANIE, label: 'Ako bude kupovať?',
        help: 'Financovanie mení, čoho sa bojí a ako rýchlo sa vie rozhodnúť.', error: 'Vyber spôsob financovania.' });
    }
    list.push(
      { id: 'kanal', type: 'select', options: KANALY, value: KANALY[0], label: 'Kde ho budeš oslovovať?',
        help: 'Podľa siete sa prispôsobí cielenie, formáty a dĺžka textov.', error: 'Vyber sociálnu sieť.' },
      { id: 'doplnok', type: 'textarea', optional: true, label: 'Čo o takýchto ľuďoch už vieš z praxe?',
        help: 'Nepovinné. Čo hovoria na prvom stretnutí, čoho sa boja, aké námietky počuješ. Každá skutočná veta spresní výsledok.',
        placeholder: 'Napr. Často počujem: „Najprv to skúsim predať sám, províziu platiť nebudem.“' },
      { id: 'autor', type: 'text', min: 2, max: 80, label: 'Tvoje meno',
        help: 'Aby tím vedel, kto avatara vytvoril. Zapamätá sa v tomto prehliadači.',
        placeholder: 'Meno a priezvisko', error: 'Napíš svoje meno.', autocomplete: 'name' }
    );
    return list;
  }

  function fieldError(field, value) {
    var v = String(value == null ? '' : value).trim();
    if (field.optional) return v.length > TEXT_MAX ? 'Text je príliš dlhý.' : null;
    if (field.type === 'select') return field.options.indexOf(v) === -1 ? field.error : null;
    if (v.length < (field.min || 1)) return field.error;
    if (v.length > (field.max || TEXT_MAX)) return 'Text je príliš dlhý.';
    return null;
  }

  return {
    TYPY: TYPY,
    TEXT_MAX: TEXT_MAX,
    NEHNUTELNOSTI: NEHNUTELNOSTI,
    CENY: CENY,
    KANALY: KANALY,
    FINANCOVANIE: FINANCOVANIE,
    fields: fields,
    fieldError: fieldError
  };
});

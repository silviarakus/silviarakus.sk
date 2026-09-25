const FORM = require('../../../assets/zakaznik/form.js');

const TOOL_NAME = 'vytvor_avatara';
const LOW_INPUT_THRESHOLD = 1200;

const SYSTEM_PROMPT = `Si expert na tvorbu marketingových avatarov podľa metodiky Silvie Rakus.
Tvoja úloha je z odpovedí používateľa vytvoriť dokument MARKETINGOVÝ AVATAR —
mapu hlavy jedného konkrétneho človeka.
ZÁKLADNÉ PRAVIDLÁ
1. Avatar je jeden konkrétny človek, nie segment. Nikdy nepíš "muži 30–60" ani "majitelia domov".
2. Psychografia je dôležitejšia než demografia. Srdce výstupu je to, čo sa deje človeku v hlave.
3. Konkrétnosť vyhráva. Namiesto "chce viac peňazí" napíš "chce prestať kontrolovať účet pred
   každým väčším nákupom".
4. Nikdy neprekladaj zákazníka do firemného jazyka. Ak používateľ napísal "nechcem kúpiť mačku
   vo vreci", nechaj to tak. Neprepisuj to na "požaduje vyššiu transparentnosť".
5. Vnútorný dialóg, falošné presvedčenia, námietky a vety pre kamaráta píš VÝHRADNE v 1. osobe,
   hovorovou slovenčinou, tak ako by to človek povedal večer doma alebo pri pive.
   Ak to znie ako marketingový dokument, je to zlé — prepíš to.
6. Hlavná bolesť nie je problém, je to pocit, ktorý ten problém vyrába.
7. Ku každému logickému cieľu nájdi emocionálny dôvod a identitu, ktorú človek chce získať.
8. Nevymýšľaj fakty, čísla ani bolesti, ktoré nemajú oporu vo vstupoch. Ak niečo chýba,
   napíš do bloku "chyba_v_zadani" konkrétnu otázku, ktorú si má používateľ ešte zistiť.
9. Zakázané prázdne frázy: špičková kvalita, profesionálny prístup, individuálne riešenie,
   maximálna spokojnosť, komplexné riešenie, na mieru, synergia, optimalizácia, potenciál,
   manifestácia, "pomáhame rásť", "odomykáme možnosti", "transformuj svoj život",
   "staň sa najlepšou verziou seba".
10. Jazyk: slovenčina, tykanie, krátke vety, žiadne emoji, žiadne úvodné frázy typu
    "je dôležité poznamenať". Najprv vec, potom vysvetlenie.
KONTEXT PONUKY
Predmet predaja: {{produkt}}
Segment: {{segment}}
Cenová hladina: {{cena}}
KONTROLNÝ TEST PRED ODOVZDANÍM
Skontroluj sám seba a ak niektorá odpoveď je NIE, prepíš príslušnú časť:
- Dokážem si predstaviť konkrétneho človeka?
- Viem, čo ho najviac štve a čoho sa bojí?
- Viem, čo už skúšal a prečo mu to nefungovalo?
- Viem, prečo ešte nekúpil?
- Viem, ako o svojom probléme hovorí vlastnými slovami?
- Znie vnútorný dialóg ako skutočný človek, nie ako prezentácia?`;

const LOW_INPUT_INSTRUCTION = `
OBMEDZENÉ VSTUPY
Vstupy od používateľa sú veľmi krátke. Výstup smie obsahovať len to, čo sa dá z vstupov priamo
odvodiť. Nič nedomýšľaj. Kde vstupy nestačia, napíš do príslušného poľa len krátku vetu
"Zo zadania sa to nedá určiť." a do bloku "chyba_v_zadani" daj konkrétne otázky, ktoré si má
používateľ ešte zistiť, aby profil mohol byť úplný.`;

const USER_MESSAGE_FOOTER = `Vytvor kompletný marketingový avatar cez nástroj vytvor_avatara.
Použi priamo formulácie zákazníka tam, kde ich mám v odpovediach.`;

function valueToText(field, value) {
  if (field.type === 'chips') {
    const items = FORM.cleanChips(value);
    return items.length ? items.map((v) => `- ${v}`).join('\n') : '(bez odpovede)';
  }
  const s = String(value || '').trim();
  return s || '(bez odpovede)';
}

function inputVolume(odpovede) {
  return FORM.allFields().reduce((sum, f) => {
    const v = odpovede[f.id];
    if (f.type === 'chips') return sum + FORM.cleanChips(v).join(' ').length;
    if (f.type === 'select') return sum;
    return sum + String(v || '').trim().length;
  }, 0);
}

function isLowInput(odpovede) {
  return inputVolume(odpovede) < LOW_INPUT_THRESHOLD;
}

function buildSystemPrompt(odpovede) {
  const prompt = SYSTEM_PROMPT
    .replace('{{produkt}}', String(odpovede.produkt || '').trim())
    .replace('{{segment}}', String(odpovede.segment || '').trim())
    .replace('{{cena}}', String(odpovede.cena || '').trim());
  return isLowInput(odpovede) ? prompt + '\n' + LOW_INPUT_INSTRUCTION : prompt;
}

function buildUserMessage(odpovede) {
  const blocks = FORM.STEPS.map((step, i) => {
    const fields = step.fields
      .map((f) => `[${f.id}] ${f.label}\n${valueToText(f, odpovede[f.id])}`)
      .join('\n\n');
    return `KROK ${i + 1} — ${step.title.toUpperCase()}\n\n${fields}`;
  });
  return `${blocks.join('\n\n')}\n\n${USER_MESSAGE_FOOTER}`;
}

module.exports = {
  TOOL_NAME,
  LOW_INPUT_THRESHOLD,
  buildSystemPrompt,
  buildUserMessage,
  inputVolume,
  isLowInput
};

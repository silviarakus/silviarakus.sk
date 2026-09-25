const { z } = require('zod');

const text = (description) => z.string().trim().min(1).describe(description);
const list = (min, description) => z.array(z.string().trim().min(1)).min(min).describe(description);

const predPoStav = z.object({
  co_ma: text('Čo má'),
  co_robi: text('Čo robí'),
  ako_sa_citi: text('Ako sa cíti'),
  ako_sa_vnima: text('Ako sa vníma')
});

const profileSchema = z.object({
  archetyp: text('2–3 slová, pamätateľný label, napr. "Technologický Peter"'),
  esencia: text('1–2 vety: kto je, čo chce, čoho sa bojí'),
  a_demografia: z.object({
    meno: text('vymyslené slovenské meno'),
    vek: text('vek'),
    profesia: text('2–3 vety'),
    prijem: text('opis, nie číslo'),
    rodina: text('rodina'),
    lokalita: text('lokalita'),
    denny_rytmus: text('2–3 vety'),
    aktualny_stav: text('3–4 vety')
  }),
  b_psychografia: z.object({
    hlavna_bolest: text('3–4 vety, emocionálne'),
    najvacsia_frustracia: text('najväčšia frustrácia'),
    najvacsi_strach: text('najväčší strach'),
    co_uz_skusal: text('čo už skúšal'),
    preco_to_nefungovalo: text('prečo to nefungovalo'),
    falosne_presvedcenia: list(3, 'presne 4 položky, v 1. osobe'),
    skryta_tuzba: text('4–5 viet'),
    vysneny_vysledok: text('vysnený výsledok'),
    ako_sa_chce_citit: text('ako sa chce cítiť'),
    kym_sa_chce_stat: text('kým sa chce stať'),
    socialny_rozmer: text('ako ho má vidieť okolie'),
    hodnoty: list(3, 'presne 5 položiek, 1–3 slová'),
    strachy: list(3, '3–4 položky, hlbšie než peniaze'),
    statusove_symboly: list(3, '3–4 položky')
  }),
  c_vnutorny_dialog: text('5–7 viet, 1. osoba, hovorovo, súvislá myšlienka'),
  d_jazyk_zakaznika: z.object({
    styl_komunikacie: text('štýl komunikácie'),
    ako_opisuje_problem: list(1, 'ako opisuje problém — jeho slovami'),
    ako_hovori_o_peniazoch: list(1, 'ako hovorí o peniazoch — jeho slovami'),
    ako_hovori_o_riziku: list(1, 'ako hovorí o riziku — jeho slovami'),
    ako_opisuje_vysledok: list(1, 'ako opisuje výsledok — jeho slovami'),
    spustacie_slova: list(6, '8–10 položiek, čo chce počuť'),
    odpudzujuce_slova: list(4, '5–6 položiek')
  }),
  e_kamaradovi: list(3, 'min. 3 vety v 1. osobe, hovorovo, ako to povie kamarátovi'),
  f_pred_po: z.object({
    pred: predPoStav,
    po: predPoStav
  }),
  g_namietky: z
    .array(
      z.object({
        namietka: text('námietka v 1. osobe, doslova'),
        co_je_pod_tym: text('čo je pod tým'),
        odpoved: text('odpoveď')
      })
    )
    .min(3)
    .describe('presne 5 položiek'),
  h_marketingove_materialy: z.object({
    headliny: list(3, 'presne 3'),
    podnadpisy: list(3, 'presne 3'),
    uvodne_vety_na_hovor: list(3, 'presne 3'),
    napady_na_obsah: list(3, 'presne 5')
  }),
  chyba_v_zadani: z
    .array(z.string().trim().min(1))
    .describe('konkrétne otázky, ak vstupy nestačili; inak prázdne pole')
});

function toolInputSchema() {
  const schema = z.toJSONSchema(profileSchema);
  delete schema.$schema;
  return schema;
}

function formatIssues(error) {
  return error.issues
    .slice(0, 25)
    .map((i) => `${i.path.join('.') || '(koreň)'}: ${i.message}`)
    .join('\n');
}

module.exports = { profileSchema, toolInputSchema, formatIssues };

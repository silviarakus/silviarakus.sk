/* Lokálna náhrada Anthropic API. Vráti ukážkový profil vo formáte tool_use.
   MOCK_AI_DELAY_MS — umelé oneskorenie (default 4000)
   MOCK_AI_FAIL=1   — simuluje zlyhanie API
   MOCK_AI_INVALID=1 — prvá odpoveď nesedí so schémou (overí opravný re-prompt) */
const fixture = require('./fixture-profile.json');

let invalidServed = false;

async function call({ model, system, messages }) {
  const delay = Number(process.env.MOCK_AI_DELAY_MS || 4000);
  await new Promise((r) => setTimeout(r, delay));
  if (process.env.MOCK_AI_FAIL === '1') throw new Error('Mock: Anthropic API je nedostupné');

  const input = JSON.parse(JSON.stringify(fixture));
  if (system.includes('OBMEDZENÉ VSTUPY')) {
    input.chyba_v_zadani = [
      'Aké konkrétne vety od zákazníka počúvaš na prvom hovore?',
      'Čo presne už skúšal predtým, než prišiel za tebou, a prečo to nedotiahol?',
      'Čoho sa bojí, keď sa rozhoduje — čo najhoršie by sa mohlo stať?'
    ];
  }
  if (process.env.MOCK_AI_INVALID === '1' && !invalidServed && messages.length === 1) {
    invalidServed = true;
    delete input.g_namietky;
  }
  return {
    model,
    content: [{ type: 'tool_use', id: `toolu_mock_${Date.now()}`, name: 'vytvor_avatara', input }],
    usage: { input_tokens: 2500, output_tokens: 4200 }
  };
}

module.exports = { call };

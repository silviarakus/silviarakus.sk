/* Lokálna náhrada Anthropic API. Vráti ukážkového avatara vo formáte structured outputs.
   MOCK_AI_DELAY_MS — umelé oneskorenie (default 4000)
   MOCK_AI_FAIL=1   — simuluje zlyhanie API */
const predavajuci = require('./fixture-predavajuci.json');
const kupujuci = require('./fixture-kupujuci.json');

async function call({ model, system }) {
  const delay = Number(process.env.MOCK_AI_DELAY_MS || 4000);
  await new Promise((r) => setTimeout(r, delay));
  if (process.env.MOCK_AI_FAIL === '1') throw new Error('Mock: Anthropic API je nedostupné');
  const fixture = system.includes('CENOVÁ STRATÉGIA PRE KUPUJÚCEHO') ? kupujuci : predavajuci;
  return {
    model,
    stop_reason: 'end_turn',
    content: [{ type: 'thinking', thinking: '', signature: 'mock' }, { type: 'text', text: JSON.stringify(fixture) }],
    usage: { input_tokens: 2600, output_tokens: 5200 }
  };
}

module.exports = { call };

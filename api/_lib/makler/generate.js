const config = require('./config');
const { avatarSchema, outputSchema, formatIssues } = require('./schema');
const { buildSystemPrompt, buildUserMessage } = require('./prompt');

const API_URL = 'https://api.anthropic.com/v1/messages';

class GenerationError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/* Opus 5.5 a Sonnet 5.5 neprijímajú vynútené volanie nástroja ani temperature, preto
   výstup ide cez structured outputs (output_config.format) a hĺbku riadi effort. */
async function callAnthropic({ model, system, messages, timeoutMs }) {
  if (config.mock) return require('../../../scripts/dev/mock-ai').call({ model, system, messages });
  if (!config.anthropicKey) throw new GenerationError('Chýba ANTHROPIC_API_KEY', 'config');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': config.anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 32000,
        system,
        messages,
        output_config: {
          effort: config.effort,
          format: { type: 'json_schema', schema: outputSchema() }
        }
      })
    });
    if (!res.ok) {
      const code = res.status === 401 || res.status === 403 ? 'config' : res.status === 404 ? 'model' : 'api';
      throw new GenerationError(`Anthropic ${res.status}: ${(await res.text()).slice(0, 400)}`, code);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new GenerationError(`Model ${model} neodpovedal do ${Math.round(timeoutMs / 1000)} s`, 'timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function parseOutput(response) {
  if (response.stop_reason === 'refusal') throw new GenerationError('Model odmietol zadanie spracovať', 'refusal');
  if (response.stop_reason === 'max_tokens') throw new GenerationError('Výstup sa nezmestil do limitu tokenov', 'invalid');
  const textBlock = (response.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  let data;
  try {
    data = JSON.parse(textBlock);
  } catch {
    throw new GenerationError('Model nevrátil platný JSON', 'invalid');
  }
  const parsed = avatarSchema.safeParse(data);
  if (!parsed.success) throw new GenerationError(`Výstup nesedí so schémou:\n${formatIssues(parsed.error)}`, 'invalid');
  return parsed.data;
}

async function runOnce(typ, vstupy, model, timeoutMs) {
  const response = await callAnthropic({
    model,
    system: buildSystemPrompt(typ, vstupy),
    messages: [{ role: 'user', content: buildUserMessage(typ, vstupy) }],
    timeoutMs
  });
  const usage = response.usage || {};
  return {
    avatar: parseOutput(response),
    model,
    tokensIn: usage.input_tokens || 0,
    tokensOut: usage.output_tokens || 0
  };
}

/* Jeden pokus + jeden retry. Pri timeoute alebo neznámom modeli ide retry na záložný model. */
async function generateAvatar(typ, vstupy) {
  try {
    return await runOnce(typ, vstupy, config.model, config.modelTimeoutMs);
  } catch (err) {
    if (err.code === 'config') throw err;
    console.error(`[makler] prvý pokus zlyhal (${err.code || 'error'}): ${err.message}`);
    const fast = err.code === 'timeout' || err.code === 'model';
    return runOnce(typ, vstupy, fast ? config.fallbackModel : config.model, fast ? config.fallbackTimeoutMs : config.modelTimeoutMs);
  }
}

module.exports = { generateAvatar, GenerationError };

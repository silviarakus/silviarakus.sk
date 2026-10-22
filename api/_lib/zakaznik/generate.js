const config = require('./config');
const { profileSchema, toolInputSchema, formatIssues } = require('./schema');
const { TOOL_NAME, buildSystemPrompt, buildUserMessage } = require('./prompt');

const API_URL = 'https://api.anthropic.com/v1/messages';

class GenerationError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

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
        max_tokens: 8000,
        temperature: 0.7,
        system,
        messages,
        tools: [{
          name: TOOL_NAME,
          description: 'Uloží hotový marketingový avatar podľa metodiky Silvie Rakus.',
          input_schema: toolInputSchema()
        }],
        tool_choice: { type: 'tool', name: TOOL_NAME }
      })
    });
    if (!res.ok) {
      throw new GenerationError(`Anthropic ${res.status}: ${(await res.text()).slice(0, 400)}`, 'api');
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new GenerationError(`Model ${model} neodpovedal do ${timeoutMs} ms`, 'timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function toolUse(response) {
  const block = (response.content || []).find((b) => b.type === 'tool_use' && b.name === TOOL_NAME);
  if (!block) throw new GenerationError('Model nezavolal nástroj vytvor_avatara', 'invalid');
  return block;
}

async function runOnce(odpovede, model, timeoutMs) {
  const system = buildSystemPrompt(odpovede);
  const messages = [{ role: 'user', content: buildUserMessage(odpovede) }];
  const usage = { in: 0, out: 0 };
  const track = (r) => {
    usage.in += (r.usage && r.usage.input_tokens) || 0;
    usage.out += (r.usage && r.usage.output_tokens) || 0;
  };

  const first = await callAnthropic({ model, system, messages, timeoutMs });
  track(first);
  const block = toolUse(first);
  let parsed = profileSchema.safeParse(block.input);

  if (!parsed.success) {
    const repair = await callAnthropic({
      model,
      system,
      timeoutMs,
      messages: [
        ...messages,
        { role: 'assistant', content: first.content },
        {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: block.id,
            is_error: true,
            content: `Výstup nesedí so schémou:\n${formatIssues(parsed.error)}\n\nOprav tieto chyby a zavolaj nástroj ${TOOL_NAME} znova s kompletným výstupom.`
          }]
        }
      ]
    });
    track(repair);
    parsed = profileSchema.safeParse(toolUse(repair).input);
    if (!parsed.success) {
      throw new GenerationError(`Nevalidný výstup aj po oprave:\n${formatIssues(parsed.error)}`, 'invalid');
    }
  }

  return { profile: parsed.data, model, tokensIn: usage.in, tokensOut: usage.out };
}

/* Jeden pokus + jeden retry. Pri timeoute ide retry na rýchlejší model. */
async function generateProfile(odpovede) {
  try {
    return await runOnce(odpovede, config.model, config.modelTimeoutMs);
  } catch (err) {
    if (err.code === 'config') throw err;
    const timedOut = err.code === 'timeout';
    console.error(`[zakaznik] prvý pokus zlyhal (${err.code || 'error'}): ${err.message}`);
    return runOnce(
      odpovede,
      timedOut ? config.fallbackModel : config.model,
      timedOut ? config.fallbackTimeoutMs : config.modelTimeoutMs
    );
  }
}

module.exports = { generateProfile, GenerationError };

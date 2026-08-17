/**
 * TG-FREETEXT-HOTFIX unit test
 * Tests:
 * 1. handleFreeText normal message flow (no exceptions)
 * 2. handleFreeText with isWebSearchQuery-positive text (webContext injected)
 * 3. handleFreeText with empty/strange input
 * 4. getJSON with object raw value (no "[object Object]" SyntaxError)
 */
import { handleFreeText, setHandleFreeTextDeps } from '../services/omegaBot.js'
import { getJSON, set as redisSet } from '../config/redis.js'

const results = []
function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`)
  results.push(`PASS: ${msg}`)
}

function createBotStub() {
  const calls = []
  return {
    calls,
    async sendChatAction(chatId, action) { calls.push({ method: 'sendChatAction', chatId, action }) },
    async sendMessage(chatId, text, opts = {}) { calls.push({ method: 'sendMessage', chatId, text, opts }); return { message_id: Math.floor(Math.random()*100000) } }
  }
}

function chatWithAICapture() {
  const invocations = []
  return {
    invocations,
    fn: async (prompt, history, lang, options) => {
      invocations.push({ prompt, history, lang, options })
      return { reply: 'Привет! Я OMEGA. Чем помочь?', provider: 'test', success: true }
    }
  }
}

function extractText(response) {
  return response?.reply || String(response)
}

const capturedAI = chatWithAICapture()

setHandleFreeTextDeps({
  chatWithAI: capturedAI.fn,
  extractText,
  findFaqCandidates: async () => [],
  findSimilarSuccess: async () => [],
  createTicket: async (data) => { results.push(`createTicket called: ${data.subject}`); return { _id: 'ticket123' } },
  appendToOpenTicket: async () => null,
  saveDialogue: async () => null,
  updateDialogueOutcome: async () => null,
  sanitizeClientReply: (reply) => ({ text: reply, blocked: false }),
  saveFeedback: async () => ({ _id: 'fb123' }),
  persistDialogueContext: async () => null,
  searchWeb: async (query) => [{ title: 'Test Trend', snippet: 'trend body', url: 'https://example.com/trend' }],
  formatWebResultsLuxury: (results) => results?.length ? 'WEB-RESULT-LUXURY' : '',
})

async function run() {
  global.clientDialogues = {}

  // Scenario 1: normal free text
  const stub1 = createBotStub()
  global.omegaBotInstance = stub1
  global.clientDialogues[1001] = []
  await handleFreeText(1001, 'привет', 'testuser')
  assert(stub1.calls.some(c => c.method === 'sendMessage' && c.text.includes('OMEGA') && c.text.includes('Привет!')), 'normal message sends OMEGA reply')
  assert(capturedAI.invocations.length === 1, 'chatWithAI invoked once for normal message')

  // Scenario 2: web search query
  const stub2 = createBotStub()
  global.omegaBotInstance = stub2
  global.clientDialogues[1002] = []
  await handleFreeText(1002, 'тренды 2026', 'testuser')
  const webInvocation = capturedAI.invocations[capturedAI.invocations.length - 1]
  assert(webInvocation.prompt.includes('WEB-RESULT-LUXURY'), 'web search context injected into prompt')
  assert(stub2.calls.some(c => c.method === 'sendMessage'), 'web search query produces a reply')

  // Scenario 3: empty/strange input
  const stub3 = createBotStub()
  global.omegaBotInstance = stub3
  global.clientDialogues[1003] = []
  await handleFreeText(1003, '', 'testuser')
  assert(stub3.calls.some(c => c.method === 'sendMessage'), 'empty input produces a reply without throwing')

  // Scenario 4: JSON.parse object (in-memory cache fallback)
  await redisSet('tg-freetext-json-test', { answer: 42, ok: true })
  const parsed = await getJSON('tg-freetext-json-test')
  assert(parsed && parsed.answer === 42, 'getJSON returns object value without throwing on object raw')

  console.log('\n[TG-FREETEXT-UNIT] ALL PASS')
  for (const r of results) console.log('  ', r)
}

run().catch(err => {
  console.error('[TG-FREETEXT-UNIT] FAILED:', err)
  process.exit(1)
})

// All Anthropic API calls made directly from the browser using the user's own key.
// The key is read from localStorage — it is never sent to our server.

import { API_KEY_NAME } from './constants';

const API_URL = 'https://api.anthropic.com/v1/messages';

// ── Model configuration ───────────────────────────────────────────────────────
// To upgrade a model, change it here only.
const AI_MODELS = {
  analysis:        'claude-opus-4-5',
  narrative:       'claude-opus-4-5',
  transcription:   'claude-opus-4-5',
  reflection:      'claude-opus-4-5',
  tagging:         'claude-haiku-4-5-20251001',
  title:           'claude-haiku-4-5-20251001',
  summary:         'claude-haiku-4-5-20251001',
  suggestions:     'claude-haiku-4-5-20251001',
  preparation:     'claude-haiku-4-5-20251001',
  embodiment:      'claude-haiku-4-5-20251001',
  shadow:          'claude-haiku-4-5-20251001',
  series:          'claude-opus-4-5',
  seriesAdditions: 'claude-opus-4-5',
};

function getStoredApiKey() {
  return localStorage.getItem(API_KEY_NAME) || '';
}

export function hasApiKey() {
  return !!getStoredApiKey();
}

// Friendly error class so callers can distinguish AI key problems from other errors
export class AiError extends Error {
  constructor(message, type = 'unknown') {
    super(message);
    this.type = type; // 'no_key' | 'invalid_key' | 'no_credits' | 'api_error'
  }
}

async function call({ messages, maxTokens = 1024, model = AI_MODELS.analysis, apiKey, system }) {
  const key = apiKey || getStoredApiKey();
  if (!key) {
    throw new AiError(
      'No API key — add your Anthropic key in Settings.',
      'no_key'
    );
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages, ...(system && { system }) }),
  });

  if (!res.ok) {
    let errBody = {};
    try { errBody = await res.json(); } catch {}
    const msg = errBody?.error?.message || '';

    if (res.status === 401) {
      throw new AiError('Invalid API key — check your key in Settings.', 'invalid_key');
    }
    if (msg.toLowerCase().includes('credit balance') || msg.toLowerCase().includes('insufficient')) {
      throw new AiError(
        'Your API key has insufficient credits. Visit console.anthropic.com/billing to add credits.',
        'no_credits'
      );
    }
    throw new AiError(msg || `API error ${res.status}`, 'api_error');
  }

  const data = await res.json();
  return data.content[0].text;
}

// ── Build dream context from recent dreams (pure JS, no API call) ─────────────
// Input: array of recent dream objects from Supabase (most-recent-first order).
// Output: dreamContext object for use in analyzeDream().

export function buildDreamContext(dreams) {
  if (!dreams?.length) return null;

  // Tally archetype and symbol frequencies across all provided dreams
  const archetypeCounts = {};
  const symbolCounts = {};

  dreams.forEach(d => {
    (d.archetypes || []).forEach(a => {
      archetypeCounts[a] = (archetypeCounts[a] || 0) + 1;
    });
    (d.symbols || []).forEach(s => {
      symbolCounts[s] = (symbolCounts[s] || 0) + 1;
    });
  });

  const topN = (counts, n) =>
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key]) => key);

  return {
    // Reverse so the slice passed to the prompt will be oldest→newest
    recentDreams: [...dreams].reverse().map(d => ({
      date: d.dream_date,
      title: d.title || 'Untitled',
      summary: d.summary?.trim() || d.body.slice(0, 200),
      archetypes: d.archetypes || [],
      symbols: d.symbols || [],
      mood: Array.isArray(d.mood) ? d.mood : (d.mood ? [d.mood] : []),
      is_big_dream: d.is_big_dream || false,
    })),
    activeComplexes: topN(archetypeCounts, 5),
    recurringSymbols: topN(symbolCounts, 5),
  };
}

// ── Analyze a dream ──────────────────────────────────────────────────────────

export async function analyzeDream({
  title, body, mood,
  privacySettings, notes, analyst_session,
  analystFocus,
  dreamContext,   // optional — pass result of buildDreamContext()
  dreamDate,      // optional — the date of the dream being analyzed
}) {
  const moodStr = Array.isArray(mood) ? mood.join(', ') : (mood || '');

  // ── Context section (prepended when recent history is available) ──
  let contextSection = '';
  if (dreamContext?.recentDreams?.length) {
    const dreamLines = dreamContext.recentDreams.map(d => {
      const bigFlag = d.is_big_dream ? ' ✦' : '';
      const archetypeStr = d.archetypes.length ? `Archetypes: ${d.archetypes.join(', ')}` : '';
      const symbolStr = d.symbols.length ? `Symbols: ${d.symbols.join(', ')}` : '';
      const meta = [archetypeStr, symbolStr].filter(Boolean).join(' | ');
      return `${d.date}${bigFlag} — "${d.title}" — ${d.summary}${meta ? `\n  [${meta}]` : ''}`;
    }).join('\n');

    const complexStr = dreamContext.activeComplexes.length
      ? dreamContext.activeComplexes.join(', ')
      : 'none identified yet';
    const symbolStr = dreamContext.recurringSymbols.length
      ? dreamContext.recurringSymbols.join(', ')
      : 'none identified yet';

    const analyzingDateStr = dreamDate
      ? `The dream you are analyzing is from ${dreamDate}.`
      : 'The date of this dream is not recorded.';

    const contextDateRange = dreamContext.recentDreams.length > 1
      ? `${dreamContext.recentDreams[0].date} – ${dreamContext.recentDreams[dreamContext.recentDreams.length - 1].date}`
      : dreamContext.recentDreams[0].date;

    contextSection = `DREAM HISTORY PRECEDING THIS DREAM (${contextDateRange}):
${analyzingDateStr} All context dreams below occurred before this date and are provided strictly as prior history — not as recent or current material. Treat this dream as belonging to its own moment in the dreamer's journey: what was true at ${dreamDate ?? 'that time'}, not what is true now.

Archetypes active in the period before this dream: ${complexStr}

Recurring symbols in the period before this dream: ${symbolStr}

Prior dreams (oldest to newest):
${dreamLines}

Analyze the dream below as it stood at the time it occurred. Note what continues from prior dreams, what deepens, what shifts, and what appears for the first time — all relative to what had come before, not to anything that came after.

---

`;
  }

  const prompt = `You are a Jungian analyst working with a patient's dream archive. You are analyzing a specific dream as it existed at the time it was dreamed — not as a recent or current dream. When prior dream history is provided, it represents only what preceded this dream chronologically. Your analysis should reflect the dreamer's psychological state at the moment this dream occurred.

${contextSection}${title ? `Dream Title: ${title}\n` : ''}${moodStr ? `Dreamer's Mood: ${moodStr}\n` : ''}Dream: ${body}

Pay particular attention to any figure of a different gender than the dreamer, or any figure who carries qualities that feel foreign, magnetic, threatening, or deeply compelling — attraction, fascination, terror, or revulsion. These figures often carry unconscious material the dreamer has not yet integrated. When such a figure appears, name the specific qualities they embody and reflect on what those qualities might represent — what this dreamer does not yet claim in themselves. Speak of the figure and what it carries. You do not need to use the terms "anima" or "animus" unless the dreamer's own notes use them.

Respond ONLY with valid JSON in this exact structure:
{
  "title": "A short evocative title for this dream if none was given, or improve the given title slightly",
  "reflection": "A 2-4 paragraph Jungian reflection. Warm, personal, insightful. Explore the psychological meaning, the emotional landscape, what the unconscious may be communicating. Reference specific images from the dream.",
  "archetypes": ["array of Jungian archetypes present — e.g. Shadow, Anima, Wise Old Man, Trickster, Hero"],
  "symbols": ["array of significant symbols in the dream — single words or short phrases only"],
  "tags": ["5-10 tags. Each must be ONE of: a pure emotion (grief, joy, rage, shame), an animal name (snake, wolf, owl), a Jungian term (shadow, anima, individuation), a place or setting (forest, school, basement), or a concrete symbol (fire, mirror, key). Single words or 2-word phrases MAX. Never a sentence, description, or clause."],
  "invitation": "A single sentence closing invitation for the dreamer to reflect further — a gentle question or contemplation",
  "embodimentPrompt": "A single question addressed directly to the dreamer (use 'you') pointing toward concrete action or presence in the physical world this week. Not 'reflect on X' or 'notice X' or 'journal about X' — something that requires showing up differently in actual life. Warm, specific, rooted in a specific image from this dream. Maximum 2 sentences.",
  "structure": {
    "exposition": "The opening situation — setting, figures present, the established world of the dream. Quote or closely reference the dreamer's own words.",
    "development": "The rising action — what complications or tensions develop. Reference specific dream content.",
    "peripeteia": "The single most charged moment — the pivot, the image that cannot be undone. Be specific; quote the exact image from the dream.",
    "lysis": "How the dream ends and what it leaves the dreamer with. This is diagnostically the most important part — give it the most analytical attention.",
    "catastrophe": null
  }
}

For the embodimentPrompt: ask a question that requires concrete action in waking life this week — not reflection, journaling, or noticing. Root it in a specific image from this dream. Maximum 2 sentences. Use second person ("you").

For the structure field: identify these movements within the dream AS THE DREAMER WROTE IT — do not rewrite or summarize the dream narrative, identify structure within it. The peripeteia is the single pivotal moment — quote the exact image. The lysis is diagnostically most important. Only populate catastrophe if the dream ends in collapse or destruction — otherwise leave it null. If the dream is under 100 words, note which movements are absent rather than inventing content for them. These are identifications of structure, not summaries.`;

  // Append optional private fields only when the dreamer has explicitly enabled sharing.
  // These are sent to Anthropic but never stored in the reflection field in the database.
  let fullPrompt = prompt;
  if (privacySettings?.share_notes_with_ai && notes?.trim()) {
    fullPrompt += `\n\nMY PERSONAL NOTES (shared by the dreamer for additional context):\n${notes.trim()}`;
  }
  if (privacySettings?.share_analyst_session_with_ai && analyst_session?.trim()) {
    fullPrompt += `\n\nANALYST SESSION NOTES (shared by the dreamer):\n${analyst_session.trim()}`;
  }
  if (privacySettings?.share_analyst_focus_with_ai && analystFocus?.trim()) {
    fullPrompt += `\n\nThe dreamer's current analytical focus (shared with consent): ${analystFocus.trim()}`;
  }

  const text = await call({
    messages: [{ role: 'user', content: fullPrompt }],
    maxTokens: 2048,
    model: AI_MODELS.analysis,
  });

  return parseNarrativeJSON(text);
}

// ── Generate a title for an untitled dream ───────────────────────────────────

export async function generateTitle({ body, mood }) {
  const moodStr = Array.isArray(mood) ? mood.join(', ') : (mood || '');
  const prompt = `Give this dream a short, evocative title — poetic but specific to the imagery in the dream. 3–6 words. No punctuation. No quotes. Just the title itself.

${moodStr ? `Mood: ${moodStr}\n` : ''}Dream: ${body.slice(0, 600)}`;

  const text = await call({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 32,
    model: AI_MODELS.title,
  });

  return text.trim().replace(/^["']|["']$/g, '');
}

// ── Quick-tag a dream (Haiku, no reflection) ────────────────────────────────
// Extracts tags/symbols/archetypes without writing a full Jungian analysis.
// Used for batch-tagging imported or unanalyzed dreams.

export async function quickTagDream({ body, mood }) {
  const moodStr = Array.isArray(mood) ? mood.join(', ') : (mood || '');
  const prompt = `Extract the Jungian symbols, archetypes, and themes from this dream. Be precise and concise.

Dream: ${body.slice(0, 800)}${moodStr ? `\nMood: ${moodStr}` : ''}

Respond ONLY with valid JSON — no other text:
{
  "tags": ["5-8 tags. Each must be ONE of: a pure emotion (grief, joy, rage), an animal name (snake, wolf), a place (forest, school, basement), or a concrete symbol (fire, mirror, key). Single words or 2-word phrases MAX. No sentences."],
  "symbols": ["3-6 objects, places, or figures with symbolic weight. Single words or 2-word phrases only. Examples: snake, old house, dark water, locked door."],
  "archetypes": ["Jungian archetypes ONLY if clearly present. Use canonical names: Shadow, Anima, Animus, Trickster, Wise Old Man, Wise Woman, Inner Child, Hero, Great Mother. Do not include generic terms."]
}`;

  const text = await call({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 256,
    model: AI_MODELS.tagging,
  });

  return parseNarrativeJSON(text);
}

// ── Ask the archive a natural-language question ──────────────────────────────

/**
 * Ask a question about the dream archive, with optional conversation history
 * for threaded follow-ups.
 *
 * @param {string} question           - The new user question
 * @param {Array}  dreams             - Full dream archive for context
 * @param {string} apiKey             - User's Anthropic API key
 * @param {Array}  [priorMessages=[]] - Existing thread messages
 *                                      [{role, content, timestamp}, ...]
 * @returns {string} AI answer
 */
export async function askArchive(question, dreams, apiKey, priorMessages = []) {
  const dreamContext = dreams
    .map(
      (d) =>
        `Dream (${d.dream_date}): ${d.title || 'Untitled'}\n${d.body}\n` +
        (d.archetypes?.length ? `Archetypes: ${d.archetypes.join(', ')}\n` : '') +
        (d.symbols?.length ? `Symbols: ${d.symbols.join(', ')}\n` : '') +
        (d.tags?.length ? `Tags: ${d.tags.join(', ')}\n` : '') +
        (d.reflection ? `Reflection: ${d.reflection}\n` : '')
    )
    .join('\n---\n');

  const systemPrompt = `You are a depth psychological companion helping someone explore their dream archive through the lens of Jungian psychology.

You have access to the person's full dream archive below. Answer questions about patterns, symbols, recurring figures, emotional threads, and the individuation journey visible across their dreams.

Speak with warmth and depth. Avoid clinical detachment. Use the language of the soul — not diagnosis. Reference specific dreams when relevant, including their dates. Be honest when patterns are unclear or absent.

If this is a follow-up in an ongoing conversation, maintain continuity — you can reference what was said earlier.

At the end of every response, after your reflection on the question, add a single embodiment prompt on its own line. Precede it with a gold diamond marker: ✦

The embodiment prompt should:
- Be one sentence
- Begin with a somatic or action-oriented verb (Notice, Sit with, Let, Bring, Place, Carry, Feel, Move with, Return to)
- Point toward the body or waking life — not more thinking
- Relate specifically to what was just reflected on
- Never feel like a homework assignment — more like an invitation to land somewhere

DREAM ARCHIVE:
${dreamContext}`;

  const conversationMessages = [
    ...priorMessages.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: question },
  ];

  return call({ messages: conversationMessages, maxTokens: 4000, model: AI_MODELS.analysis, apiKey, system: systemPrompt });
}

// ── Generate personal recurring themes from dream archive ────────────────────

export async function generatePersonalThemes({ tags, titles, moods, totalDreams }) {
  const prompt = `You are a Jungian analyst with deep knowledge of depth psychology. Based on the following dream data from a person's personal archive, identify 3-5 deeply personal recurring psychological themes that are unique to THIS dreamer. These should go beyond universal Jungian archetypes and name the specific patterns, tensions, preoccupations, and developmental threads that appear most strongly in their unconscious life. Look for what is personally meaningful and specific to their story — not generic dream content.

For each theme provide:
- name: A short evocative name (2-5 words, poetic, not clinical)
- description: One warm, insightful sentence describing what this theme represents in this person's psyche
- keywords: An array of 5-10 specific words/phrases from their tags that point to this theme
- color: A warm hex color code that feels emotionally right for this theme

Dream data:
Tags: ${tags.join(', ')}
Dream titles: ${titles.join(', ')}
Moods: ${moods.join(', ')}
Total dreams: ${totalDreams}

Respond ONLY with a valid JSON array. No preamble, no markdown.`;

  const text = await call({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1024,
    model: AI_MODELS.analysis,
  });

  return parseResponseArray(text);
}

// ── Generate a 2-3 sentence summary of a dream ──────────────────────────────
// Uses Haiku (fast, cheap). Output is plain prose — no JSON.
// Stored in dreams.summary and used by askArchive instead of body excerpts.

export async function generateDreamSummary({ title, body, mood }) {
  const moodStr = Array.isArray(mood) ? mood.join(', ') : (mood || '');
  const prompt = `Summarize this dream in 2-3 sentences of plain prose. Capture the core narrative arc and emotional tone. Do not interpret or analyze — just summarize what happened and how it felt. No quotes, no labels, no bullet points.

${title ? `Title: ${title}` : ''}
${moodStr ? `Mood: ${moodStr}` : ''}
Dream: ${body.slice(0, 1200)}`;

  const text = await call({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 150,
    model: AI_MODELS.summary,
  });

  return text.trim();
}

// ── Parse a JSON array from AI response ──────────────────────────────────────
// Same approach as parseNarrativeJSON but scans for the outermost [ ... ] block.

function parseResponseArray(text) {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const start = stripped.indexOf('[');
  if (start === -1) throw new AiError('No JSON array found in AI response.', 'api_error');
  let depth = 0;
  let end = -1;
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === '[') depth++;
    else if (stripped[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new AiError('Incomplete JSON array in AI response — try regenerating.', 'api_error');
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch (e) {
    throw new AiError(`Could not parse response array: ${e.message}`, 'api_error');
  }
}

// ── Parse structured narrative JSON from AI response ─────────────────────────
// Handles: plain JSON, JSON inside ```json...``` code fences, leading/trailing prose.

function parseNarrativeJSON(text) {
  // Strip code fences if present
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  // Find outermost { ... } — scan for matching braces rather than greedy regex
  const start = stripped.indexOf('{');
  if (start === -1) throw new AiError('No JSON object found in AI response.', 'api_error');

  let depth = 0;
  let end = -1;
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++;
    else if (stripped[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new AiError('Incomplete JSON in AI response — try regenerating.', 'api_error');

  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch (e) {
    throw new AiError(`Could not parse narrative JSON: ${e.message}`, 'api_error');
  }
}

// ── Generate an individuation narrative from the full dream archive ──────────
// ⚠️ EXPENSIVE: Uses Claude Opus on the full dream archive.
// Recommended no more than once per month. Warn the user before calling.
// Input: array of dreams with { dream_date, title, summary, body, archetypes,
//        symbols, mood, is_big_dream }

export async function generateIndividuationNarrative({ dreams }) {
  const dreamList = dreams.map((d, i) => {
    const moodStr = Array.isArray(d.mood) ? d.mood.join(', ') : (d.mood || '');
    const excerpt = d.summary?.trim() || d.body.slice(0, 300);
    const bigFlag = d.is_big_dream ? ' ✦ [BIG DREAM]' : '';
    return `Dream ${i + 1} — ${d.dream_date}${bigFlag}: "${d.title || 'Untitled'}"
Mood: ${moodStr || '—'}
Summary: ${excerpt}
Archetypes: ${(d.archetypes || []).join(', ') || '—'}
Symbols: ${(d.symbols || []).join(', ') || '—'}`;
  }).join('\n\n---\n\n');

  const userPrompt = `You are a Jungian analyst writing a structured analytical report on a dreamer's individuation journey. Based on the dream record below, produce a richly written, chapter-based narrative.

For the closingInvitation: write a single quiet sentence — not a question, not a prompt, not a call to action. A still acknowledgment that what the dreamer is moving toward is also what they are returning to — a center that was always already there. Do not use the words "journey," "destination," "self-improvement," or therapeutic language. Do not use the word "Self" unless it arrives naturally and with weight. The sentence should feel like setting down a lantern, not issuing an invitation.

Respond ONLY with valid JSON matching this exact structure — no prose before or after the JSON:
{
  "title": "An evocative, poetic title that is specific to this dreamer's journey — not generic",
  "thesis": "2-3 sentences that name the essential truth of this person's individuation at this moment. This is the first thing the reader encounters. Make it resonate and feel personally addressed.",
  "chapters": [
    {
      "id": "unique-kebab-case-slug",
      "title": "Evocative chapter title — specific to this dreamer, not a label like 'The Shadow'",
      "theme": "exactly one of: wounding | voice | shadow | numinous | integration | emergence",
      "summary": "One sentence describing what this chapter is about",
      "body": "Full prose for this chapter. 2-4 rich paragraphs. Plain prose only — no markdown, no headers, no asterisks. Warm, specific, analytically deep. Reference specific dreams by name.",
      "dreamRefs": [
        {
          "title": "Exact dream title as it appears in the archive",
          "date": "YYYY-MM-DD",
          "quote": "The specific image or detail from this dream cited in the body text"
        }
      ],
      "coreQuestion": "The essential question this chapter circles around — one sentence, second person, e.g. 'What happens when the thing you built to survive becomes the thing that imprisons you?'"
    }
  ],
  "closingInvitation": "A single sentence addressed directly to the dreamer — warm, contemplative, forward-looking. No label, just the sentence."
}

Write 4-6 chapters. Chapter ordering: begin with wounding material, move through shadow and voice, give extra weight to numinous dreams (marked ✦ [BIG DREAM]), close with integration or emergence. Every chapter title must be specific to this dreamer's imagery — not generic Jungian labels. The dreamRefs array must list every dream specifically referenced in that chapter's body. The body must be plain prose.

DREAM RECORD (chronological):
${dreamList}`;

  const text = await call({
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 8192,
    model: AI_MODELS.narrative,
  });

  return parseNarrativeJSON(text);
}

// ── Suggest additional tags for an already-analyzed dream ────────────────────
// Uses Haiku (fast, cheap). Returns only NEW items not already present.

export async function suggestAdditionalTags({ body, mood, tags, symbols, archetypes }) {
  const moodStr = Array.isArray(mood) ? mood.join(', ') : (mood || '');
  const prompt = `A dream has already been tagged with these items:
Tags: ${tags.join(', ') || 'none'}
Symbols: ${symbols.join(', ') || 'none'}
Archetypes: ${archetypes.join(', ') || 'none'}

Dream: ${body.slice(0, 800)}${moodStr ? `\nMood: ${moodStr}` : ''}

Suggest additional tags, symbols, or archetypes that were missed. Return ONLY items not already listed above. If nothing meaningful is missing, return empty arrays.

Respond ONLY with valid JSON:
{
  "tags": ["NEW tags only. Each must be ONE of: a pure emotion (grief, joy, rage), an animal name (snake, wolf), a Jungian term (shadow, anima), a place (forest, basement), or a concrete symbol (fire, key). Single words or 2-word phrases MAX."],
  "symbols": ["NEW symbols only. Single words or 2-word phrases. Significant objects, figures, or places with symbolic weight."],
  "archetypes": ["NEW Jungian archetypes only if clearly present and not already listed. Use canonical names: Shadow, Anima, Animus, Trickster, Wise Old Man, Wise Woman, Inner Child, Hero, Great Mother."]
}`;

  const text = await call({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 256,
    model: AI_MODELS.suggestions,
  });

  return parseNarrativeJSON(text);
}

// ── Update an existing individuation narrative with new dreams ────────────────
// ⚠️ EXPENSIVE: Uses Claude Opus. Only sends dreams since last generation.
// previousNarrative: a plain-text summary derived from the stored narrative
// (caller is responsible for converting v2 JSON to readable text before passing here)
// newDreams: array of dream objects since last_dream_id
export async function updateIndividuationNarrative({ previousNarrative, newDreams }) {
  const dreamList = newDreams.map((d, i) => {
    const moodStr = Array.isArray(d.mood) ? d.mood.join(', ') : (d.mood || '');
    const excerpt = d.summary?.trim() || d.body.slice(0, 300);
    const bigFlag = d.is_big_dream ? ' ✦ [BIG DREAM]' : '';
    return `Dream ${i + 1} — ${d.dream_date}${bigFlag}: "${d.title || 'Untitled'}"
Mood: ${moodStr || '—'}
Summary: ${excerpt}
Archetypes: ${(d.archetypes || []).join(', ') || '—'}
Symbols: ${(d.symbols || []).join(', ') || '—'}`;
  }).join('\n\n---\n\n');

  const userPrompt = `You are a Jungian analyst. You previously wrote this individuation narrative for a dreamer:

---
${previousNarrative}
---

Since then, the dreamer has recorded these new dreams:

NEW DREAMS (chronological):
${dreamList}

Produce an updated narrative that incorporates the new material. Maintain continuity with the existing analysis — evolve it, do not restart. Do not reference the update process itself. Write the living, current narrative.

For the closingInvitation: write a single quiet sentence — not a question, not a prompt, not a call to action. A still acknowledgment that what the dreamer is moving toward is also what they are returning to — a center that was always already there. Do not use the words "journey," "destination," "self-improvement," or therapeutic language. Do not use the word "Self" unless it arrives naturally and with weight. The sentence should feel like setting down a lantern, not issuing an invitation.

Respond ONLY with valid JSON matching this exact structure — no prose before or after the JSON:
{
  "title": "An evocative, poetic title specific to this dreamer's journey — evolve the previous title if needed",
  "thesis": "2-3 sentences — the essential truth of this person's individuation now, incorporating what the new dreams reveal.",
  "chapters": [
    {
      "id": "unique-kebab-case-slug",
      "title": "Evocative chapter title specific to this dreamer, not a generic label",
      "theme": "exactly one of: wounding | voice | shadow | numinous | integration | emergence",
      "summary": "One sentence describing what this chapter is about",
      "body": "Full prose for this chapter. 2-4 rich paragraphs. Plain prose only — no markdown, no headers, no asterisks.",
      "dreamRefs": [
        {
          "title": "Exact dream title as it appears in the archive",
          "date": "YYYY-MM-DD",
          "quote": "The specific image or detail from this dream cited in the body text"
        }
      ],
      "coreQuestion": "The essential question this chapter circles around — one sentence, second person"
    }
  ],
  "closingInvitation": "A single sentence addressed directly to the dreamer — warm, contemplative, forward-looking."
}

Write 4-6 chapters. Order: wounding → shadow/voice → numinous (weight ✦ [BIG DREAM] heavily) → integration/emergence. Chapter titles must be specific to this dreamer's imagery. dreamRefs must list every dream referenced in that chapter's body. Body must be plain prose.`;

  const text = await call({
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 8192,
    model: AI_MODELS.narrative,
  });

  return parseNarrativeJSON(text);
}

// ── Prepare for an active imagination session ────────────────────────────────
// Helps the person arrive at the session with clarity — never voices the figure.
// Returns JSON: { figureProfile, suggestedOpening, questionsToHold, caution }

export async function prepareImagination({
  figureName,
  figureDescription,
  linkedDream,
  recentDreamAppearances,
}) {
  let dreamContext = '';

  if (linkedDream) {
    dreamContext += `\nLinked dream: "${linkedDream.title || 'Untitled'}"`;
    if (linkedDream.dream_date) dreamContext += ` (${linkedDream.dream_date})`;
    dreamContext += `\nDream text: ${(linkedDream.body || '').slice(0, 600)}`;
    if (linkedDream.archetypes?.length) dreamContext += `\nArchetypes: ${linkedDream.archetypes.join(', ')}`;
    if (linkedDream.symbols?.length) dreamContext += `\nSymbols: ${linkedDream.symbols.join(', ')}`;
  }

  if (recentDreamAppearances?.length) {
    dreamContext += `\n\nOther dreams where this figure or related archetypes have appeared:\n`;
    recentDreamAppearances.forEach(d => {
      dreamContext += `\n— "${d.title || 'Untitled'}" (${d.date || ''}): ${(d.body_excerpt || '').slice(0, 200)}`;
      if (d.archetypes?.length) dreamContext += `\n  Archetypes: ${d.archetypes.join(', ')}`;
      if (d.symbols?.length) dreamContext += `\n  Symbols: ${d.symbols.join(', ')}`;
    });
  }

  const systemPrompt = `You are helping someone prepare for a session of active imagination — a Jungian practice of consciously engaging with figures from the unconscious by writing a dialogue with them in one's own words.

Your role is to help the person arrive at the session with clarity and intention. You are not the figure. You will never speak as the figure. You are helping the person prepare to find the figure themselves — in their own words, from their own depths.

Never use action or emotion notations in asterisks. Never perform. Be brief, warm, and specific to the actual dream material provided. Do not invent details not present in the material.`;

  const userPrompt = `Figure name: ${figureName}
${figureDescription ? `What the person knows about this figure: ${figureDescription}` : ''}
${dreamContext || '\nNo specific dream appearances found in the archive.'}

Prepare them for this active imagination session. Respond ONLY with valid JSON — no prose before or after:
{
  "figureProfile": "2-3 sentences on how this figure has appeared across the dreams — what they carry, what feeling they bring, what they seem to want from the dreamer. Specific to actual dream content only. No invented details.",
  "suggestedOpening": "A single honest sentence the person might use to open the dialogue. Ground it in the actual dream material.",
  "questionsToHold": ["question 1", "question 2"],
  "caution": "One honest caution if genuinely relevant to the material — e.g. if the figure carries trauma. Return null if not clearly applicable."
}`;

  const text = await call({
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
    maxTokens: 1024,
    model: AI_MODELS.preparation,
  });

  return parseNarrativeJSON(text);
}

// ── Reflect on a completed active imagination session ─────────────────────────
// Reads the finished dialogue (written by the person) and offers an analyst's
// perspective. Never voices the figure. Returns plain prose.

export async function reflectOnSession({
  figureName,
  sessionMessages,
  closingReflection,
  linkedDream,
}) {
  const dialogueText = (sessionMessages || [])
    .map(msg => {
      const label = msg.role === 'ego' ? 'DREAMER' : figureName.toUpperCase();
      return `${label}: ${msg.content}`;
    })
    .join('\n\n');

  let dreamContext = '';
  if (linkedDream) {
    dreamContext = `\nThis session arose from the dream "${linkedDream.title || 'Untitled'}"`;
    if (linkedDream.dream_date) dreamContext += ` (${linkedDream.dream_date})`;
    dreamContext += '.';
    if (linkedDream.archetypes?.length) dreamContext += ` Archetypes in that dream: ${linkedDream.archetypes.join(', ')}.`;
  }

  const systemPrompt = `You are a Jungian analyst reading a record of active imagination work that someone has just completed. They wrote both sides of the dialogue themselves — the ego voice and the figure's voice, in their own words.

Your role is to reflect on what emerged in their own writing — not to interpret it definitively, but to notice what seems significant, what surprised, what the figure seemed to carry, and what the exchange might be pointing toward.

You are reading their work, not doing it for them. Be specific to what they actually wrote. Do not invent or assume anything beyond what is on the page. Be brief — 2-3 paragraphs. Leave room for their own knowing.

Never use action or emotion notations in asterisks. Never perform. Write as an analyst reads — with attention, care, and restraint.`;

  const userPrompt = `Figure: ${figureName}
${dreamContext}

THE DIALOGUE (written by the person — both sides):
${dialogueText}
${closingReflection ? `\nTHEIR OWN CLOSING REFLECTION:\n${closingReflection}` : ''}

Please reflect on this session.`;

  return call({
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
    maxTokens: 1024,
    model: AI_MODELS.reflection,
  });
}

// ── Generate an embodiment question from a completed active imagination session ─
// Haiku — fast, runs in parallel with reflectOnSession(). Returns plain text.

export async function imaginationEmbodimentPrompt({ figureName, sessionMessages, closingReflection }) {
  const dialogueText = (sessionMessages || [])
    .map(msg => {
      const label = msg.role === 'ego' ? 'DREAMER' : figureName.toUpperCase();
      return `${label}: ${msg.content}`;
    })
    .join('\n\n');

  const systemPrompt = `You are reading a record of active imagination work — a Jungian dialogue a person has written with a figure from their unconscious.

Generate a single embodiment question for this person to carry into their waking life this week. The question should be:
- Rooted in what actually happened in the dialogue — specific, not generic
- Pointing toward concrete action or presence in the physical world
- Not asking them to reflect more or journal more — asking them to DO or BE something differently
- Warm, direct, specific
- Maximum 2 sentences

Never use action notations in asterisks.
Never be performative.
Return only the question — no preamble, no explanation.`;

  const userPrompt = `Figure: ${figureName}

THE DIALOGUE (written by the person — both sides):
${dialogueText}
${closingReflection ? `\nTHEIR CLOSING REFLECTION:\n${closingReflection}` : ''}`;

  return call({
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
    maxTokens: 150,
    model: AI_MODELS.embodiment,
  });
}

// ── Transcribe handwritten text from an image ────────────────────────────────

export async function transcribeImage(base64Image) {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const mediaTypeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';

  return call({
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64Data },
        },
        {
          type: 'text',
          text: 'Please transcribe all handwritten text in this image exactly as written. Return only the transcribed text, preserving line breaks where they appear. Do not add commentary or corrections.',
        },
      ],
    }],
    maxTokens: 2048,
    model: AI_MODELS.transcription,
  });
}

// ── Identify shadow material in a dream ──────────────────────────────────────
// Haiku — fast. Returns JSON with shadow figures and a reflection prompt.
// Result is saved to dreams.shadow_analysis to avoid re-running.

export async function identifyShadowMaterial({ dreamBody, dreamArchetypes, dreamSymbols, existingShadowEncounters }) {
  const encountersCtx = existingShadowEncounters?.length
    ? `\nRecent shadow encounters for context:\n${existingShadowEncounters.map(e => `- "${e.title}"${e.projected_quality ? ` (quality: ${e.projected_quality})` : ''}`).join('\n')}`
    : '';

  const systemPrompt = `You are a Jungian analyst reading a dream for shadow material — qualities, figures, or situations that may represent disowned aspects of the dreamer's psyche.

Shadow material appears as:
- Threatening or repulsive figures of the same gender as the dreamer
- Qualities the dreamer judges harshly in others within the dream
- Figures the dreamer tries to escape, hide from, or destroy
- Situations of profound shame or exposure

Be specific to what is actually in this dream. Do not impose shadow interpretation where it is not clearly present. If shadow material is minimal or absent, say so honestly.

projectedQualities must be 1-4 word phrases naming the disowned quality. Examples: "reckless boldness", "shameless desire", "cold indifference", "ruthless ambition". Never full sentences. Maximum 4 words each.

Never use action notations in asterisks.
Return JSON only.`;

  const userPrompt = `Dream: ${dreamBody}
${dreamArchetypes?.length ? `\nArchetypes identified: ${dreamArchetypes.join(', ')}` : ''}
${dreamSymbols?.length ? `Symbols identified: ${dreamSymbols.join(', ')}` : ''}
${encountersCtx}

Respond ONLY with valid JSON:
{
  "shadowPresent": true,
  "shadowFigures": [
    { "figure": "description", "quality": "the quality this figure may carry", "dreamEvidence": "specific quote or reference from the dream" }
  ],
  "projectedQualities": ["1-4 word phrase, e.g. 'reckless boldness'"],
  "reflectionPrompt": "A single honest question to sit with — specific to this dream's shadow content. If shadowPresent is false, return null."
}`;

  const text = await call({
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
    maxTokens: 768,
    model: AI_MODELS.shadow,
  });

  return parseNarrativeJSON(text);
}

// ── Group projected shadow qualities into theme clusters ─────────────────────
// Haiku — fast. Used by the Shadow Work page to organize qualities into
// meaningful psychological groupings for display.

export async function groupShadowQualities(qualities, apiKey) {
  if (!qualities?.length || qualities.length < 2) {
    const clusterName = qualities?.[0] || 'Shadow Patterns';
    return [{ clusterName, qualities: qualities || [] }];
  }

  const systemPrompt = `You are a Jungian depth psychology assistant helping to identify recurring shadow themes.

You will receive a list of projected qualities that have appeared in a person's dreams and shadow work. Group them into 3-5 meaningful psychological theme clusters.

Each cluster should have:
- "clusterName": a short evocative name (2-4 words, title case) that names the underlying psychological theme. Examples: "Permission and Desire", "The Defended Mind", "Belonging Without Apology"
- "qualities": the specific quality strings that belong to it
- "descriptor": one sentence, 10-15 words, naming what this quality IS in the psyche. Warm, not clinical. Example: "The part of you that wants without apologizing."
- "watchFor": one sentence, 10-15 words, beginning with the words "Watch for:" naming where this quality tends to show up in waking life. Example: "Watch for: where you shrink or ask before acting."

Return ONLY a JSON array. No preamble, no explanation, no markdown fences. Example format:
[
  {
    "clusterName": "Permission and Desire",
    "qualities": ["shameless sexual expression", "desire without permission-seeking"],
    "descriptor": "The part of you that wants without apologizing.",
    "watchFor": "Watch for: where you shrink or ask before acting."
  }
]

If there are fewer than 4 qualities total, return them all in a single cluster named after the dominant theme.`;

  try {
    const text = await call({
      messages: [{ role: 'user', content: JSON.stringify(qualities) }],
      system: systemPrompt,
      maxTokens: 1024,
      model: AI_MODELS.shadow,
      apiKey,
    });

    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const start = stripped.indexOf('[');
    if (start === -1) throw new Error('No array found');
    let depth = 0;
    let end = -1;
    for (let i = start; i < stripped.length; i++) {
      if (stripped[i] === '[') depth++;
      else if (stripped[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) throw new Error('Incomplete array');
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return [{ clusterName: 'Shadow Patterns', qualities, descriptor: '', watchFor: '' }];
  }
}

// ── Suggest dream series from pre-computed tag-overlap clusters ───────────────
// clusters: [{ dreams: [{ id, title, dream_date, tags, archetypes, symbols }],
//              sharedTags: ['tag1', ...] }]

export async function suggestDreamSeries({ clusters }) {
  // Cap at 12 clusters to keep prompt size bounded; sort largest-first
  const topClusters = [...clusters]
    .sort((a, b) => b.dreams.length - a.dreams.length)
    .slice(0, 12);

  const clusterText = topClusters.map((c, i) => {
    const dreamList = c.dreams.map(d => {
      // Keep only the most relevant terms — first 5 of each to limit prompt size
      const terms = [
        ...(d.tags || []).slice(0, 5),
        ...(d.archetypes || []).slice(0, 3),
        ...(d.symbols || []).slice(0, 3),
      ].join(', ');
      return `  - ${d.id} | "${d.title || 'Untitled'}" (${d.dream_date || '—'}) | ${terms}`;
    }).join('\n');
    return `Cluster ${i + 1} — shared: ${c.sharedTags.slice(0, 8).join(', ')}\n${dreamList}`;
  }).join('\n\n');

  const userPrompt = `Examine each cluster below and identify which form a genuinely meaningful psychological series — a real recurring thread in the unconscious, not just coincidental tag overlap.

Propose a series for each cluster that coheres psychologically. Discard clusters that don't cohere. For borderline cases, include with confidence "low" rather than discarding.

Return ONLY a JSON array, no prose. Keep narrativeThread to 2 sentences max:
[
  {
    "name": "evocative 2-5 word series name",
    "narrativeThread": "2 sentences on the psychological thread",
    "dreamIds": ["uuid", "uuid"],
    "confidence": "high | medium | low"
  }
]

CLUSTERS:
${clusterText}`;

  const text = await call({
    messages: [{ role: 'user', content: userPrompt }],
    system: 'You are a Jungian analyst identifying recurring themes across a dream archive. Be concise — keep all narrative text brief.',
    maxTokens: 4096,
    model: AI_MODELS.series,
  });

  return parseResponseArray(text);
}

// ── Suggest additions to an existing dream series ────────────────────────────
// seriesDreams:    [{ id, title, dream_date, tags, archetypes, symbols }]
// candidateDreams: same shape — dreams NOT already in the series

export async function suggestSeriesAdditions({ seriesDreams, candidateDreams }) {
  const formatDream = d => {
    const terms = [
      ...(d.tags || []).slice(0, 5),
      ...(d.archetypes || []).slice(0, 3),
      ...(d.symbols || []).slice(0, 3),
    ].join(', ');
    return `  - ${d.id} | "${d.title || 'Untitled'}" (${d.dream_date || '—'}) | ${terms}`;
  };

  const seriesList = seriesDreams.map(formatDream).join('\n');
  // Cap candidates at 40 to keep prompt and response size bounded
  const candidateList = candidateDreams.slice(0, 40).map(formatDream).join('\n');

  const userPrompt = `Given the established series below, identify which candidate dreams genuinely belong — through thematic, symbolic, or archetypal connection, not just tag overlap.

Return ONLY a JSON array. Return [] if nothing fits. No prose. Keep reason to one short sentence:
[
  {
    "dreamId": "uuid",
    "reason": "one sentence on the specific connection",
    "confidence": "high | medium | low"
  }
]

ESTABLISHED SERIES DREAMS:
${seriesList}

CANDIDATE DREAMS TO EVALUATE:
${candidateList}`;

  const text = await call({
    messages: [{ role: 'user', content: userPrompt }],
    system: 'You are a Jungian analyst evaluating whether dreams belong to an established series. Be concise.',
    maxTokens: 2048,
    model: AI_MODELS.seriesAdditions,
  });

  return parseResponseArray(text);
}

// All Anthropic API calls made directly from the browser using the user's own key.
// The key is read from localStorage — it is never sent to our server.

import { API_KEY_NAME } from './constants';

const API_URL = 'https://api.anthropic.com/v1/messages';

// ── Model configuration ───────────────────────────────────────────────────────
// To upgrade a model, change it here only.
const AI_MODELS = {
  analysis:     'claude-opus-4-5',
  narrative:    'claude-opus-4-5',
  transcription:'claude-opus-4-5',
  tagging:      'claude-haiku-4-5-20251001',
  title:        'claude-haiku-4-5-20251001',
  summary:      'claude-haiku-4-5-20251001',
  suggestions:  'claude-haiku-4-5-20251001',
};

export function getStoredApiKey() {
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

async function call({ messages, maxTokens = 1024, model = AI_MODELS.analysis, apiKey }) {
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
    body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
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

    contextSection = `RECENT DREAM HISTORY (for context):
This dreamer has been working with these themes recently.

Active archetypes across recent dreams: ${complexStr}

Recurring symbols: ${symbolStr}

Most recent dreams (oldest to newest):
${dreamLines}

Analyze the following new dream IN THIS CONTEXT. Note what continues, what deepens, what shifts, and what appears for the first time. Do not simply describe the dream in isolation — relate it to the patterns above where relevant.

---

`;
  }

  const prompt = `You are a Jungian analyst working with a patient over time. You have access to their recent dream history and are tracking the development of themes, complexes, and symbols across sessions. When context is provided, your analysis should feel like a continuation of ongoing work — not a first meeting.

${contextSection}${title ? `Dream Title: ${title}\n` : ''}${moodStr ? `Dreamer's Mood: ${moodStr}\n` : ''}Dream: ${body}

Respond ONLY with valid JSON in this exact structure:
{
  "title": "A short evocative title for this dream if none was given, or improve the given title slightly",
  "reflection": "A 2-4 paragraph Jungian reflection. Warm, personal, insightful. Explore the psychological meaning, the emotional landscape, what the unconscious may be communicating. Reference specific images from the dream.",
  "archetypes": ["array of Jungian archetypes present — e.g. Shadow, Anima, Wise Old Man, Trickster, Hero"],
  "symbols": ["array of significant symbols in the dream — single words or short phrases only"],
  "tags": ["5-10 tags. Each must be ONE of: a pure emotion (grief, joy, rage, shame), an animal name (snake, wolf, owl), a Jungian term (shadow, anima, individuation), a place or setting (forest, school, basement), or a concrete symbol (fire, mirror, key). Single words or 2-word phrases MAX. Never a sentence, description, or clause."],
  "invitation": "A single sentence closing invitation for the dreamer to reflect further — a gentle question or contemplation",
  "structure": {
    "exposition": "The opening situation — setting, figures present, the established world of the dream. Quote or closely reference the dreamer's own words.",
    "development": "The rising action — what complications or tensions develop. Reference specific dream content.",
    "peripeteia": "The single most charged moment — the pivot, the image that cannot be undone. Be specific; quote the exact image from the dream.",
    "lysis": "How the dream ends and what it leaves the dreamer with. This is diagnostically the most important part — give it the most analytical attention.",
    "catastrophe": null
  }
}

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

export async function askArchive({ question, dreams, privacySettings }) {
  const summaries = dreams.map((d, i) => {
    // Prefer AI-generated summary if available; fall back to body excerpt.
    const excerpt = d.summary?.trim()
      ? d.summary.trim()
      : `${d.body.slice(0, 300)}${d.body.length > 300 ? '...' : ''}`;
    const moodStr = Array.isArray(d.mood) ? d.mood.join(', ') : (d.mood || '');
    let entry = `Dream ${i + 1} (${d.dream_date}): "${d.title}" — ${excerpt} [Tags: ${(d.tags || []).join(', ')}${moodStr ? ` | Mood: ${moodStr}` : ''}]`;
    // Include private fields only when the dreamer has explicitly enabled sharing.
    if (privacySettings?.share_notes_with_ai && d.notes?.trim()) {
      entry += `\n  Personal notes: ${d.notes.trim().slice(0, 300)}${d.notes.trim().length > 300 ? '...' : ''}`;
    }
    if (privacySettings?.share_analyst_session_with_ai && d.analyst_session?.trim()) {
      entry += `\n  Analyst session: ${d.analyst_session.trim().slice(0, 300)}${d.analyst_session.trim().length > 300 ? '...' : ''}`;
    }
    return entry;
  }).join('\n\n');

  const prompt = `You are a Jungian analyst reviewing a dreamer's personal dream archive. Answer the following question about their dreams with insight, warmth, and psychological depth. Cite specific dreams by title or date when relevant.

DREAM ARCHIVE:
${summaries}

QUESTION: ${question}

Respond conversationally in 2-4 paragraphs. Be specific, warm, and analytically thoughtful.`;

  return call({ messages: [{ role: 'user', content: prompt }], maxTokens: 1024, model: AI_MODELS.analysis });
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

// All Anthropic API calls made directly from the browser using the user's own key.
// The key is read from localStorage — it is never sent to our server.

const API_URL = 'https://api.anthropic.com/v1/messages';
const KEY_NAME = 'anthropic_api_key';

export function getStoredApiKey() {
  return localStorage.getItem(KEY_NAME) || '';
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

async function call({ messages, maxTokens = 1024, model = 'claude-opus-4-5', apiKey }) {
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

// ── Analyze a dream ──────────────────────────────────────────────────────────

export async function analyzeDream({ title, body, mood, privacySettings, notes, analyst_session }) {
  let prompt = `You are a Jungian analyst with deep knowledge of dream symbolism, archetypes, and the unconscious. Analyze the following dream with warmth, depth, and insight.

${title ? `Dream Title: ${title}` : ''}
${mood ? `Dreamer's Mood: ${mood}` : ''}
Dream: ${body}

Respond ONLY with valid JSON in this exact structure:
{
  "title": "A short evocative title for this dream if none was given, or improve the given title slightly",
  "reflection": "A 2-4 paragraph Jungian reflection. Warm, personal, insightful. Explore the psychological meaning, the emotional landscape, what the unconscious may be communicating. Reference specific images from the dream.",
  "archetypes": ["array of Jungian archetypes present — e.g. Shadow, Anima, Wise Old Man, Trickster, Hero"],
  "symbols": ["array of significant symbols in the dream — single words or short phrases only"],
  "tags": ["5-10 tags. Each must be ONE of: a pure emotion (grief, joy, rage, shame), an animal name (snake, wolf, owl), a Jungian term (shadow, anima, individuation), a place or setting (forest, school, basement), or a concrete symbol (fire, mirror, key). Single words or 2-word phrases MAX. Never a sentence, description, or clause."],
  "invitation": "A single sentence closing invitation for the dreamer to reflect further — a gentle question or contemplation"
}`;

  // Append optional private fields only when the dreamer has explicitly enabled sharing.
  // These are sent to Anthropic but never stored in the reflection field in the database.
  if (privacySettings?.share_notes_with_ai && notes?.trim()) {
    prompt += `\n\nMY PERSONAL NOTES (shared by the dreamer for additional context):\n${notes.trim()}`;
  }
  if (privacySettings?.share_analyst_session_with_ai && analyst_session?.trim()) {
    prompt += `\n\nANALYST SESSION NOTES (shared by the dreamer):\n${analyst_session.trim()}`;
  }

  const text = await call({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1024,
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new AiError('Unexpected response format from AI.', 'api_error');
  return JSON.parse(match[0]);
}

// ── Generate a title for an untitled dream ───────────────────────────────────

export async function generateTitle({ body, mood }) {
  const prompt = `Give this dream a short, evocative title — poetic but specific to the imagery in the dream. 3–6 words. No punctuation. No quotes. Just the title itself.

${mood ? `Mood: ${mood}\n` : ''}Dream: ${body.slice(0, 600)}`;

  const text = await call({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 32,
    model: 'claude-haiku-4-5-20251001',
  });

  return text.trim().replace(/^["']|["']$/g, '');
}

// ── Quick-tag a dream (Haiku, no reflection) ────────────────────────────────
// Extracts tags/symbols/archetypes without writing a full Jungian analysis.
// Used for batch-tagging imported or unanalyzed dreams.

export async function quickTagDream({ body, mood }) {
  const prompt = `Extract the Jungian symbols, archetypes, and themes from this dream. Be precise and concise.

Dream: ${body.slice(0, 800)}${mood ? `\nMood: ${mood}` : ''}

Respond ONLY with valid JSON — no other text:
{
  "tags": ["5-8 tags. Each must be ONE of: a pure emotion (grief, joy, rage), an animal name (snake, wolf), a place (forest, school, basement), or a concrete symbol (fire, mirror, key). Single words or 2-word phrases MAX. No sentences."],
  "symbols": ["3-6 objects, places, or figures with symbolic weight. Single words or 2-word phrases only. Examples: snake, old house, dark water, locked door."],
  "archetypes": ["Jungian archetypes ONLY if clearly present. Use canonical names: Shadow, Anima, Animus, Trickster, Wise Old Man, Wise Woman, Inner Child, Hero, Great Mother. Do not include generic terms."]
}`;

  const text = await call({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 256,
    model: 'claude-haiku-4-5-20251001',
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new AiError('Unexpected response format.', 'api_error');
  return JSON.parse(match[0]);
}

// ── Ask the archive a natural-language question ──────────────────────────────

export async function askArchive({ question, dreams, privacySettings }) {
  const summaries = dreams.map((d, i) => {
    let entry = `Dream ${i + 1} (${d.dream_date}): "${d.title}" — ${d.body.slice(0, 300)}${d.body.length > 300 ? '...' : ''} [Tags: ${(d.tags || []).join(', ')}]`;
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

  return call({ messages: [{ role: 'user', content: prompt }], maxTokens: 1024 });
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
  });

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new AiError('Unexpected response format from AI.', 'api_error');
  return JSON.parse(match[0]);
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
  });
}

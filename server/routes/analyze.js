const express = require('express');
const router = express.Router();
const client = require('../lib/anthropic');

router.post('/', async (req, res) => {
  const { title, body, mood } = req.body;

  if (!body) {
    return res.status(400).json({ error: 'Dream body is required' });
  }

  const prompt = `You are a Jungian analyst with deep knowledge of dream symbolism, archetypes, and the unconscious. Analyze the following dream with warmth, depth, and insight.

${title ? `Dream Title: ${title}` : ''}
${mood ? `Dreamer's Mood: ${mood}` : ''}
Dream: ${body}

Respond ONLY with valid JSON in this exact structure:
{
  "title": "A short evocative title for this dream if none was given, or improve the given title slightly",
  "reflection": "A 2-4 paragraph Jungian reflection. Warm, personal, insightful. Explore the psychological meaning, the emotional landscape, what the unconscious may be communicating. Reference specific images from the dream.",
  "archetypes": ["array of Jungian archetypes present — e.g. Shadow, Anima, Wise Old Man, Trickster, Hero"],
  "symbols": ["array of significant symbols in the dream — single words or short phrases only"],
  "tags": ["array of tags — emotions, animals, archetypes, or symbols only. Single words or max 2-word phrases. No sentences. 5-10 tags."],
  "invitation": "A single sentence closing invitation for the dreamer to reflect further — a gentle question or contemplation"
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    res.json(analysis);
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});

module.exports = router;

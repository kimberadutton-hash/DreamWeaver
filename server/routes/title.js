const express = require('express');
const router = express.Router();
const client = require('../lib/anthropic');

// Lightweight title generation — uses Haiku for speed and cost
router.post('/', async (req, res) => {
  const { body, mood } = req.body;

  if (!body) {
    return res.status(400).json({ error: 'Dream body is required' });
  }

  const prompt = `Give this dream a short, evocative title — poetic but specific to the imagery in the dream. 3–6 words. No punctuation. No quotes. Just the title itself.

${mood ? `Mood: ${mood}\n` : ''}Dream: ${body.slice(0, 600)}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      messages: [{ role: 'user', content: prompt }],
    });

    const title = message.content[0].text.trim().replace(/^["']|["']$/g, '');
    res.json({ title });
  } catch (err) {
    console.error('Title error:', err);
    res.status(500).json({ error: 'Title generation failed', detail: err.message });
  }
});

module.exports = router;

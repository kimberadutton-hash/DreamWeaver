const express = require('express');
const router = express.Router();
const client = require('../lib/anthropic');

router.post('/', async (req, res) => {
  const { question, dreams } = req.body;

  if (!question || !dreams?.length) {
    return res.status(400).json({ error: 'Question and dreams are required' });
  }

  const dreamSummaries = dreams.map((d, i) =>
    `Dream ${i + 1} (${d.dream_date}): "${d.title}" — ${d.body.slice(0, 300)}${d.body.length > 300 ? '...' : ''} [Tags: ${(d.tags || []).join(', ')}]`
  ).join('\n\n');

  const prompt = `You are a Jungian analyst reviewing a dreamer's personal dream archive. Answer the following question about their dreams with insight, warmth, and psychological depth. Cite specific dreams by title or date when relevant.

DREAM ARCHIVE:
${dreamSummaries}

QUESTION: ${question}

Respond conversationally in 2-4 paragraphs. Be specific, warm, and analytically thoughtful.`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({ answer: message.content[0].text });
  } catch (err) {
    console.error('Ask error:', err);
    res.status(500).json({ error: 'Query failed', detail: err.message });
  }
});

module.exports = router;

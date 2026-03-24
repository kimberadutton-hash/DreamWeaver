const express = require('express');
const router = express.Router();
const client = require('../lib/anthropic');

router.post('/', async (req, res) => {
  const { image } = req.body; // base64 encoded image

  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  // Strip data URL prefix if present
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
  const mediaType = (mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg');

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
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
    });

    res.json({ text: message.content[0].text });
  } catch (err) {
    console.error('Transcribe error:', err);
    res.status(500).json({ error: 'Transcription failed', detail: err.message });
  }
});

module.exports = router;

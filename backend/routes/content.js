const express = require('express');
const { z } = require('zod');
const { ensureAdmin } = require('../middleware/auth');
const { contentSchema } = require('../schemas');
const { StorageOperationError } = require('../storage/errors');
const { getContent, saveContent } = require('../services/contentService');

const router = express.Router();

router.get('/', async (_req, res) => {
  const content = await getContent();
  res.json(content);
});

router.put('/', ensureAdmin, async (req, res) => {
  try {
    const updatedContent = contentSchema.parse(req.body);
    const savedContent = await saveContent(updatedContent);
    return res.json(savedContent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Conteúdo inválido.', issues: error.issues });
    }

    if (error instanceof StorageOperationError) {
      return res.status(502).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Erro interno ao atualizar conteúdo.' });
  }
});

module.exports = router;

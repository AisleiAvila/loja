const express = require('express');
const { ensureAdmin, adminLimiter, logAdminAction } = require('../middleware/auth');
const { contentSchema } = require('../schemas');
const { getContent, saveContent } = require('../services/contentService');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const content = await getContent();
    return res.json(content);
  } catch (error) {
    return next(error);
  }
});

router.put('/', ensureAdmin, adminLimiter, logAdminAction, async (req, res, next) => {
  try {
    const updatedContent = contentSchema.parse(req.body);
    const savedContent = await saveContent(updatedContent);
    return res.json(savedContent);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

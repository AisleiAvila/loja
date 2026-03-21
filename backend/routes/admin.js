const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { adminPassword, jwtSecret } = require('../config');
const { loginLimiter } = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginLimiter, (req, res) => {
  const provided = Buffer.from(String(req.body?.password ?? ''));
  const expected = Buffer.from(adminPassword);
  const match = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

  if (!match) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }

  const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '8h' });
  return res.json({ token });
});

module.exports = router;

const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { adminPassword, jwtSecret } = require('../config');
const { loginSchema } = require('../schemas');
const { loginLimiter } = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginLimiter, (req, res) => {
  try {
    const { password } = loginSchema.parse(req.body);
    const provided = Buffer.from(password);
    const expected = Buffer.from(adminPassword);
    const match = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

    if (!match) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '8h' });
    return res.json({ token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos.', issues: error.issues });
    }
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

module.exports = router;

const express = require('express');
const jwt = require('jsonwebtoken');
const { adminPassword, jwtSecret } = require('../config');
const { loginLimiter } = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginLimiter, (req, res) => {
  if (req.body?.password !== adminPassword) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }

  const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '8h' });
  return res.json({ token });
});

module.exports = router;

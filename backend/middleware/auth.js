const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { jwtSecret } = require('../config');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas tentativas. Tente novamente em 15 minutos.' }
});

function ensureAdmin(req, res, next) {
  const authorization = req.header('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  try {
    jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Acesso não autorizado.' });
  }
}

module.exports = { ensureAdmin, loginLimiter };

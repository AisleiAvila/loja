const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { jwtSecret } = require('../config');

const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados pedidos. Tente novamente em 1 minuto.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas tentativas. Tente novamente em 15 minutos.' }
});

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados pedidos. Tente novamente em 15 minutos.' }
});

function ensureAdmin(req, res, next) {
  const authorization = req.header('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso restrito a administradores.' });
    }

    return next();
  } catch {
    return res.status(401).json({ message: 'Acesso não autorizado.' });
  }
}

module.exports = { ensureAdmin, loginLimiter, orderLimiter, publicReadLimiter };

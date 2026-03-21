const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { jwtSecret } = require('../config');
const logger = require('../logger');

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

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados pedidos administrativos. Tente novamente em 1 minuto.' }
});

function logAdminAction(req, _res, next) {
  if (req.method !== 'GET') {
    logger.info('Admin action', { method: req.method, path: `${req.baseUrl}${req.path}` });
  }
  return next();
}

function validateParamId(pattern) {
  return (req, res, next) => {
    const id = req.params.id;
    if (!id || !pattern.test(id)) {
      return res.status(400).json({ message: 'Identificador inválido.' });
    }
    return next();
  };
}

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

module.exports = { ensureAdmin, loginLimiter, orderLimiter, publicReadLimiter, adminLimiter, logAdminAction, validateParamId };

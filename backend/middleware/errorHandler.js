const multer = require('multer');
const { z } = require('zod');
const { StorageOperationError } = require('../storage/errors');
const { invalidImageTypeMessage } = require('../config');

function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: 'Dados inválidos.', issues: error.issues });
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'A imagem deve ter no máximo 5 MB.' });
    }

    return res.status(400).json({ message: 'Erro ao processar upload da imagem.' });
  }

  if (error?.message === invalidImageTypeMessage) {
    return res.status(400).json({ message: invalidImageTypeMessage });
  }

  if (error instanceof StorageOperationError) {
    return res.status(502).json({ message: error.message });
  }

  require('../logger').error('Erro não tratado na API', { message: error.message, stack: error.stack });
  return res.status(500).json({ message: 'Erro interno do servidor.' });
}

module.exports = { errorHandler };

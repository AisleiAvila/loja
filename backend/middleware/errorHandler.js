const multer = require('multer');
const { StorageOperationError } = require('../storage/errors');
const { invalidImageTypeMessage } = require('../config');

function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    return next(error);
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

  console.error('Erro não tratado na API:', error);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
}

module.exports = { errorHandler };

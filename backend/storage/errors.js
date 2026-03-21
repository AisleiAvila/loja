class StorageOperationError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageOperationError';
    this.cause = cause;
  }
}

function logStorageError(message, cause) {
  const logger = require('../logger');
  const details = cause
    ? (typeof cause === 'object' && cause !== null
        ? { message: cause.message, code: cause.code, details: cause.details, hint: cause.hint }
        : { cause: String(cause) })
    : undefined;

  logger.error(message, details);
}

function createStorageOperationError(message, cause) {
  logStorageError(message, cause);
  return new StorageOperationError(message, cause);
}

module.exports = { StorageOperationError, createStorageOperationError };

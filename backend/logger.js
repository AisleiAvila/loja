const levels = { error: 0, warn: 1, info: 2, debug: 3 };

const configuredLevel = levels[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'production' ? levels.info : levels.debug);

function write(level, message, data) {
  if (levels[level] > configuredLevel) return;

  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(data !== undefined ? { data } : {})
  };

  const output = JSON.stringify(entry);

  if (level === 'error') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

module.exports = {
  info: (message, data) => write('info', message, data),
  warn: (message, data) => write('warn', message, data),
  error: (message, data) => write('error', message, data),
  debug: (message, data) => write('debug', message, data)
};

const fs = require('node:fs/promises');
const { dataFile } = require('../config');

async function readLocalStore() {
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw);
}

async function writeLocalStore(store) {
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2));
}

module.exports = { readLocalStore, writeLocalStore };

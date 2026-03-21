const fs = require('node:fs/promises');
const { dataFile } = require('../config');

// Simple async mutex to prevent concurrent read-modify-write races
let lockPromise = Promise.resolve();

function withLock(fn) {
  const next = lockPromise.then(fn, fn);
  lockPromise = next.then(() => {}, () => {});
  return next;
}

async function readLocalStore() {
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw);
}

async function writeLocalStore(store) {
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2));
}

async function updateLocalStore(updater) {
  return withLock(async () => {
    const store = await readLocalStore();
    const result = await updater(store);
    await writeLocalStore(store);
    return result;
  });
}

module.exports = { readLocalStore, writeLocalStore, updateLocalStore };

const { supabase } = require('../config');
const { createStorageOperationError } = require('../storage/errors');
const { mapContentRow } = require('../storage/mappers');
const { readLocalStore, writeLocalStore } = require('../storage/localStore');

async function getContent() {
  if (supabase) {
    const { data, error } = await supabase.from('site_content').select('*').eq('id', 'default').maybeSingle();

    if (!error && data) {
      return mapContentRow(data);
    }
  }

  const store = await readLocalStore();
  return store.content;
}

async function saveContent(content) {
  if (supabase) {
    const { data, error } = await supabase
      .from('site_content')
      .upsert(
        {
          id: 'default',
          brand: content.brand,
          about: content.about,
          contact: content.contact
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (!error && data) {
      return mapContentRow(data);
    }

    throw createStorageOperationError('Não foi possível guardar o conteúdo institucional no Supabase.', error);
  }

  const store = await readLocalStore();
  store.content = content;
  await writeLocalStore(store);
  return content;
}

module.exports = { getContent, saveContent };

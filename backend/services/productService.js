const { supabase } = require('../config');
const { createStorageOperationError } = require('../storage/errors');
const { mapProductRow, serializeProduct } = require('../storage/mappers');
const { readLocalStore, updateLocalStore } = require('../storage/localStore');

async function listProducts() {
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*').order('name');

    if (!error && data?.length) {
      return data.map(mapProductRow);
    }

    if (error) {
      console.warn('[supabase] Falha ao listar produtos:', error.message);
    }
  }

  const store = await readLocalStore();
  return store.products;
}

async function getProductBySlug(slug) {
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*').eq('slug', slug).maybeSingle();

    if (!error && data) {
      return mapProductRow(data);
    }

    if (error) {
      console.warn('[supabase] Falha ao obter produto por slug:', error.message);
    }
  }

  const store = await readLocalStore();
  return store.products.find((product) => product.slug === slug) || null;
}

async function getProductById(productId) {
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();

    if (!error && data) {
      return mapProductRow(data);
    }

    if (error) {
      console.warn('[supabase] Falha ao obter produto por ID:', error.message);
    }
  }

  const store = await readLocalStore();
  return store.products.find((product) => product.id === productId) || null;
}

async function saveProduct(product) {
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .upsert(serializeProduct(product), { onConflict: 'id' })
      .select()
      .single();

    if (!error && data) {
      return mapProductRow(data);
    }

    throw createStorageOperationError('Não foi possível guardar o produto no Supabase.', error);
  }

  return updateLocalStore((store) => {
    const index = store.products.findIndex((item) => item.id === product.id);

    if (index === -1) {
      store.products.push(product);
    } else {
      store.products[index] = product;
    }

    return product;
  });
}

async function deleteProduct(productId) {
  if (supabase) {
    const { data, error } = await supabase.from('products').delete().eq('id', productId).select().maybeSingle();

    if (!error && data) {
      return mapProductRow(data);
    }

    throw createStorageOperationError('Não foi possível apagar o produto no Supabase.', error);
  }

  return updateLocalStore((store) => {
    const productIndex = store.products.findIndex((product) => product.id === productId);

    if (productIndex === -1) {
      return null;
    }

    const [removedProduct] = store.products.splice(productIndex, 1);
    return removedProduct;
  });
}

function normalizeProductId(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '');
}

module.exports = {
  listProducts,
  getProductBySlug,
  getProductById,
  saveProduct,
  deleteProduct,
  normalizeProductId
};

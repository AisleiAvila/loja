const { supabase } = require('../config');
const { createStorageOperationError } = require('../storage/errors');
const { mapOrderRow, serializeOrder, serializeOrderPatch } = require('../storage/mappers');
const { readLocalStore, updateLocalStore } = require('../storage/localStore');

async function listOrders() {
  if (supabase) {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

    if (!error && data) {
      return data.map(mapOrderRow);
    }

    if (error) {
      console.warn('[supabase] Falha ao listar pedidos:', error.message);
    }
  }

  const store = await readLocalStore();
  return store.orders;
}

async function getOrderById(orderId) {
  if (supabase) {
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();

    if (!error && data) {
      return mapOrderRow(data);
    }

    if (error) {
      console.warn('[supabase] Falha ao obter pedido por ID:', error.message);
    }
  }

  const store = await readLocalStore();
  return store.orders.find((order) => order.id === orderId) || null;
}

async function hasOrdersForProduct(productId) {
  if (supabase) {
    const { count, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);

    if (!error) {
      return Boolean(count);
    }

    if (error) {
      console.warn('[supabase] Falha ao verificar pedidos do produto:', error.message);
    }
  }

  const store = await readLocalStore();
  return store.orders.some((order) => order.productId === productId);
}

async function createOrder(order) {
  if (supabase) {
    const { data, error } = await supabase.from('orders').insert(serializeOrder(order)).select().single();

    if (!error && data) {
      return mapOrderRow(data);
    }

    throw createStorageOperationError('Não foi possível gravar o pedido no Supabase.', error);
  }

  return updateLocalStore((store) => {
    store.orders.unshift(order);
    return order;
  });
}

async function updateOrder(orderId, patch) {
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .update(serializeOrderPatch(patch))
      .eq('id', orderId)
      .select()
      .maybeSingle();

    if (!error && data) {
      return mapOrderRow(data);
    }

    throw createStorageOperationError('Não foi possível atualizar o pedido no Supabase.', error);
  }

  return updateLocalStore((store) => {
    const orderIndex = store.orders.findIndex((order) => order.id === orderId);

    if (orderIndex === -1) {
      return null;
    }

    store.orders[orderIndex] = {
      ...store.orders[orderIndex],
      ...patch
    };

    return store.orders[orderIndex];
  });
}

module.exports = { listOrders, getOrderById, hasOrdersForProduct, createOrder, updateOrder };

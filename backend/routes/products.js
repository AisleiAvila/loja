const express = require('express');
const { z } = require('zod');
const { ensureAdmin } = require('../middleware/auth');
const { productSchema, newProductSchema } = require('../schemas');
const { StorageOperationError } = require('../storage/errors');
const { deleteManagedAssets } = require('../storage/assets');
const { listProducts, getProductBySlug, getProductById, saveProduct, deleteProduct, normalizeProductId } = require('../services/productService');
const { hasOrdersForProduct } = require('../services/orderService');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const products = await listProducts();
    return res.json(products);
  } catch (error) {
    return next(error);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const product = await getProductBySlug(req.params.slug);

    if (!product) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    return res.json(product);
  } catch (error) {
    return next(error);
  }
});

router.post('/', ensureAdmin, async (req, res) => {
  try {
    const payload = newProductSchema.parse(req.body);
    const productId = normalizeProductId(payload.id || payload.slug || payload.name);

    if (!productId) {
      return res.status(400).json({ message: 'Não foi possível gerar um identificador para o produto.' });
    }

    const existingById = await getProductById(productId);

    if (existingById) {
      return res.status(409).json({ message: 'Já existe um produto com este identificador.' });
    }

    const existingBySlug = await getProductBySlug(payload.slug);

    if (existingBySlug) {
      return res.status(409).json({ message: 'Já existe um produto com este slug.' });
    }

    const createdProduct = productSchema.parse({
      ...payload,
      id: productId
    });

    const savedProduct = await saveProduct(createdProduct);
    return res.status(201).json(savedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Produto inválido.', issues: error.issues });
    }

    if (error instanceof StorageOperationError) {
      return res.status(502).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Erro interno ao criar produto.' });
  }
});

router.put('/:id', ensureAdmin, async (req, res) => {
  try {
    const existingProduct = await getProductById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    const updatedProduct = productSchema.parse({
      ...existingProduct,
      ...req.body
    });

    const conflictingProduct = await getProductBySlug(updatedProduct.slug);

    if (conflictingProduct && conflictingProduct.id !== existingProduct.id) {
      return res.status(409).json({ message: 'Já existe um produto com este slug.' });
    }

    const savedProduct = await saveProduct(updatedProduct);
    return res.json(savedProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Produto inválido.', issues: error.issues });
    }

    if (error instanceof StorageOperationError) {
      return res.status(502).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Erro interno ao atualizar produto.' });
  }
});

router.delete('/:id', ensureAdmin, async (req, res, next) => {
  try {
    const existingProduct = await getProductById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    if (await hasOrdersForProduct(req.params.id)) {
      return res.status(409).json({ message: 'Não é possível apagar um produto com pedidos associados.' });
    }

    await deleteManagedAssets(existingProduct.images);

    const deletedProduct = await deleteProduct(req.params.id);
    return res.json(deletedProduct);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

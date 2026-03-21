const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Readable } = require('node:stream');
const express = require('express');
const { put, get } = require('@vercel/blob');
const { blobReadWriteToken, uploadDir, supabase, stripe, upload } = require('../config');
const { ensureAdmin, adminLimiter, logAdminAction } = require('../middleware/auth');
const {
  isPrivateBlobStoreError,
  decodeManagedBlobPathname,
  buildManagedBlobProxyUrl,
  getImageExtension,
  deleteManagedAsset
} = require('../storage/assets');

const router = express.Router();

router.get('/health', ensureAdmin, (_req, res) => {
  const assetStorage = blobReadWriteToken ? 'vercel-blob' : 'local-filesystem';

  res.json({
    ok: true,
    storage: supabase ? 'supabase' : 'local-json',
    assetStorage,
    payments: stripe ? 'stripe' : 'offline'
  });
});

router.post('/uploads/image', ensureAdmin, adminLimiter, logAdminAction, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum ficheiro enviado.' });
    }

    const fileExtension = getImageExtension(req.file);
    const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${fileExtension}`;

    if (blobReadWriteToken) {
      const blobPathname = `products/${fileName}`;

      try {
        const blob = await put(blobPathname, req.file.buffer, {
          access: 'public',
          addRandomSuffix: false,
          contentType: req.file.mimetype,
          token: blobReadWriteToken
        });

        return res.status(201).json({ url: blob.url });
      } catch (error) {
        if (!isPrivateBlobStoreError(error)) {
          throw error;
        }

        await put(blobPathname, req.file.buffer, {
          access: 'private',
          addRandomSuffix: false,
          contentType: req.file.mimetype,
          token: blobReadWriteToken
        });

        return res.status(201).json({ url: buildManagedBlobProxyUrl(blobPathname) });
      }
    }

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), req.file.buffer);

    return res.status(201).json({ url: `/uploads/${fileName}` });
  } catch (error) {
    return next(error);
  }
});

router.get(/^\/assets\/blob\/(.+)$/, async (req, res, next) => {
  try {
    if (!blobReadWriteToken) {
      return res.status(404).json({ message: 'Storage de imagens não configurado.' });
    }

    const blobPathname = decodeManagedBlobPathname(req.params[0]);

    if (!blobPathname) {
      return res.status(400).json({ message: 'Asset inválido.' });
    }

    const asset = await get(blobPathname, {
      access: 'private',
      token: blobReadWriteToken
    });

    if (asset?.statusCode !== 200 || !asset?.stream) {
      return res.status(404).json({ message: 'Asset não encontrado.' });
    }

    res.setHeader('Content-Type', asset.blob.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', asset.blob.cacheControl || 'public, max-age=3600');
    res.setHeader('Content-Disposition', asset.blob.contentDisposition || 'inline');
    Readable.fromWeb(asset.stream).pipe(res);
  } catch (error) {
    return next(error);
  }
});

router.delete('/uploads/image', ensureAdmin, async (req, res, next) => {
  try {
    const assetUrl = typeof req.body?.url === 'string' ? req.body.url : '';

    if (!assetUrl) {
      return res.status(400).json({ message: 'URL do asset em falta.' });
    }

    const deleted = await deleteManagedAsset(assetUrl);

    if (!deleted) {
      return res.status(400).json({ message: 'O asset indicado não é gerido pela aplicação.' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

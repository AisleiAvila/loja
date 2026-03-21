const fs = require('node:fs/promises');
const path = require('node:path');
const { del } = require('@vercel/blob');
const { supabase, supabaseUrl, blobReadWriteToken, uploadDir, siteUrl } = require('../config');

function isLocalUploadAsset(assetUrl) {
  return typeof assetUrl === 'string' && assetUrl.startsWith('/uploads/');
}

function getSupabaseStorageAssetPath(assetUrl) {
  if (!supabaseUrl || typeof assetUrl !== 'string' || !/^https?:\/\//.test(assetUrl)) {
    return null;
  }

  try {
    const parsedAssetUrl = new URL(assetUrl);
    const expectedPrefix = '/storage/v1/object/public/product-assets/';

    if (!parsedAssetUrl.href.startsWith(supabaseUrl)) {
      return null;
    }

    if (!parsedAssetUrl.pathname.startsWith(expectedPrefix)) {
      return null;
    }

    return decodeURIComponent(parsedAssetUrl.pathname.slice(expectedPrefix.length));
  } catch {
    return null;
  }
}

function isVercelBlobAsset(assetUrl) {
  if (typeof assetUrl !== 'string' || !/^https?:\/\//.test(assetUrl)) {
    return false;
  }

  try {
    const hostname = new URL(assetUrl).hostname;
    return hostname.includes('blob.vercel-storage.com');
  } catch {
    return false;
  }
}

function isPrivateBlobStoreError(error) {
  return error instanceof Error && error.message.includes('Cannot use public access on a private store');
}

function encodeManagedBlobPathname(blobPathname) {
  return String(blobPathname || '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function decodeManagedBlobPathname(encodedBlobPathname) {
  if (typeof encodedBlobPathname !== 'string' || !encodedBlobPathname.trim()) {
    return null;
  }

  try {
    const pathname = encodedBlobPathname
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/');

    if (!pathname || pathname.includes('..')) {
      return null;
    }

    return pathname;
  } catch {
    return null;
  }
}

function buildManagedBlobProxyUrl(blobPathname) {
  return `/api/assets/blob/${encodeManagedBlobPathname(blobPathname)}`;
}

function getManagedBlobPathname(assetUrl) {
  if (typeof assetUrl !== 'string' || !assetUrl) {
    return null;
  }

  const proxyPathPrefix = '/api/assets/blob/';

  if (assetUrl.startsWith(proxyPathPrefix)) {
    return decodeManagedBlobPathname(assetUrl.slice(proxyPathPrefix.length));
  }

  if (!/^https?:\/\//.test(assetUrl)) {
    return null;
  }

  try {
    const parsedAssetUrl = new URL(assetUrl);

    if (!parsedAssetUrl.pathname.startsWith(proxyPathPrefix)) {
      return null;
    }

    return decodeManagedBlobPathname(parsedAssetUrl.pathname.slice(proxyPathPrefix.length));
  } catch {
    return null;
  }
}

function getImageExtension(file) {
  const extensionByMimeType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/svg+xml': '.svg'
  };

  const extensionFromMimeType = extensionByMimeType[file.mimetype];

  if (extensionFromMimeType) {
    return extensionFromMimeType;
  }

  return path.extname(file.originalname || '').toLowerCase() || '.bin';
}

function buildAbsoluteAssetUrl(assetPath) {
  if (!assetPath) {
    return undefined;
  }

  if (/^https?:\/\//.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${siteUrl}${normalizedPath}`;
}

async function deleteManagedAsset(assetUrl) {
  if (isLocalUploadAsset(assetUrl)) {
    const fileName = path.basename(assetUrl);
    const absoluteFilePath = path.join(uploadDir, fileName);

    await fs.rm(absoluteFilePath, { force: true });
    return true;
  }

  const managedBlobPathname = getManagedBlobPathname(assetUrl);

  if (blobReadWriteToken && managedBlobPathname) {
    await del(managedBlobPathname, { token: blobReadWriteToken });
    return true;
  }

  if (blobReadWriteToken && isVercelBlobAsset(assetUrl)) {
    await del(assetUrl, { token: blobReadWriteToken });
    return true;
  }

  if (supabase) {
    const supabaseAssetPath = getSupabaseStorageAssetPath(assetUrl);

    if (supabaseAssetPath) {
      const { error } = await supabase.storage.from('product-assets').remove([supabaseAssetPath]);

      if (!error) {
        return true;
      }
    }
  }

  return false;
}

async function deleteManagedAssets(assetUrls) {
  for (const assetUrl of assetUrls) {
    try {
      await deleteManagedAsset(assetUrl);
    } catch {
      // Ignore orphan-cleanup failures to avoid blocking the main operation.
    }
  }
}

module.exports = {
  isLocalUploadAsset,
  isPrivateBlobStoreError,
  decodeManagedBlobPathname,
  buildManagedBlobProxyUrl,
  getManagedBlobPathname,
  getImageExtension,
  buildAbsoluteAssetUrl,
  deleteManagedAsset,
  deleteManagedAssets
};

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const assetFingerprintCache = new Map();
const fingerprintedAssets = new Map();

const splitAssetUrl = (value) => {
  const [withoutHash, hashFragment] = String(value).split('#');
  const [pathname, queryString] = withoutHash.split('?');
  return {
    pathname,
    hash: hashFragment ? `#${hashFragment}` : '',
    query: queryString ? `?${queryString}` : '',
  };
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAssetFingerprint = (assetPath) => {
  const stats = fs.statSync(assetPath);
  const signature = `${stats.size}-${stats.mtimeMs}`;
  const cached = assetFingerprintCache.get(assetPath);
  if (cached && cached.signature === signature) {
    return cached.hash;
  }

  const hash = createHash('sha256')
    .update(fs.readFileSync(assetPath))
    .digest('hex')
    .slice(0, 10);

  assetFingerprintCache.set(assetPath, { signature, hash });
  return hash;
};

const buildFingerprintedAssetPath = (pathname, fingerprint) => {
  const ext = path.extname(pathname);
  if (!ext) {
    return `${pathname}.${fingerprint}`;
  }
  return `${pathname.slice(0, -ext.length)}.${fingerprint}${ext}`;
};

const registerFingerprintedAsset = (pathname, sourcePath, fingerprintedPath) => {
  fingerprintedAssets.set(fingerprintedPath, {
    pathname,
    sourcePath,
  });
};

export const emitFingerprintedAssets = (outputDir = '_site') => {
  for (const [fingerprintedPath, asset] of fingerprintedAssets) {
    const outputPath = path.join(
      outputDir,
      fingerprintedPath.replace(/^\/+/, ''),
    );
    const sourceExt = path.extname(asset.pathname);
    const sourceBase = path.basename(asset.pathname, sourceExt);
    const outputDirname = path.dirname(outputPath);

    fs.mkdirSync(outputDirname, { recursive: true });

    if (fs.existsSync(outputDirname)) {
      const pattern = new RegExp(
        `^${escapeRegex(sourceBase)}\\.[a-f0-9]{10}${escapeRegex(sourceExt)}$`,
      );
      for (const entry of fs.readdirSync(outputDirname)) {
        if (pattern.test(entry) && entry !== path.basename(outputPath)) {
          fs.rmSync(path.join(outputDirname, entry), { force: true });
        }
      }
    }

    fs.copyFileSync(asset.sourcePath, outputPath);
  }
};

export const buildAssetUrl = (href) => {
  if (typeof href !== 'string' || !href.startsWith('/')) {
    return href;
  }

  const { pathname, query, hash } = splitAssetUrl(href);
  const assetPath = path.resolve(pathname.replace(/^\/+/, ''));

  if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
    return href;
  }

  const fingerprint = getAssetFingerprint(assetPath);
  const fingerprintedPath = buildFingerprintedAssetPath(pathname, fingerprint);
  registerFingerprintedAsset(pathname, assetPath, fingerprintedPath);
  return `${fingerprintedPath}${query}${hash}`;
};

export const __resetFingerprintCachesForTest = () => {
  assetFingerprintCache.clear();
  fingerprintedAssets.clear();
};

// Temporary backport of https://github.com/digitalbazaar/forge/pull/1152.
// GHSA-86w9-cpqp-85rv has no published fix as of 2026-10-24.
// Keep the version visible to npm audit; remove this backport after upgrading upstream.
const fs = require('node:fs');
const filename = require.resolve('node-forge/lib/rsa');
const version = require('node-forge/package.json').version;
const source = fs.readFileSync(filename, 'utf8');
const original = "obj.value.length !== 2) {";
const replacement = "obj.value.length !== 2 ||\n        obj.value[0].value.length !==\n          (('parameters' in capture) ? 2 : 1)) {";
if (source.includes(replacement)) {
  console.log('node-forge nested DigestAlgorithm backport already applied.');
} else if (version === '1.4.0' && source.split(original).length === 2) {
  fs.writeFileSync(filename, source.replace(original, replacement));
  console.log('Applied node-forge GHSA-86w9-cpqp-85rv backport.');
} else {
  throw new Error('Review the node-forge backport against the installed upstream source before proceeding.');
}

// image-size 2 accepts bytes instead of filesystem paths. Adapt Metro's legacy call.
const path = require('node:path');
const assetsFile = path.join(path.dirname(require.resolve('metro/package.json')), 'src/Assets.js');
const assets = fs.readFileSync(assetsFile, 'utf8');
const oldCall = 'const dimensions = isImage ? (0, _imageSize.default)(isImageInput) : null;';
const newCall = 'const dimensions = isImage ? (0, _imageSize.default)(typeof isImageInput === "string" ? _fs.default.readFileSync(isImageInput) : isImageInput) : null;';
if (assets.includes(oldCall)) {
  fs.writeFileSync(assetsFile, assets.replace(oldCall, newCall));
  console.log('Adapted Metro asset reads for patched image-size 2.');
} else if (!assets.includes(newCall)) {
  throw new Error('Review Metro image-size compatibility before proceeding.');
}

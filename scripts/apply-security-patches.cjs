const fs = require('node:fs');
const path = require('node:path');

// image-size 2 accepts bytes instead of filesystem paths. Adapt Metro's legacy call.
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

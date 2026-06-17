// Rasterizes icon.svg into the app icons electron-builder + the BrowserWindow use.
// Outputs: build/icon.png (512, linux + builder), build/icon.ico (256, win),
// resources/icon.png (256, dev window/taskbar). Re-run after editing icon.svg:
//   node apps/client/build/generate-icons.cjs
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');
const pnpmDir = path.join(repoRoot, 'node_modules/.pnpm');
const sharpPkg = fs.readdirSync(pnpmDir).find((d) => d.startsWith('sharp@'));
if (!sharpPkg) throw new Error('sharp not found in node_modules/.pnpm — run pnpm install');
const sharp = require(path.join(pnpmDir, sharpPkg, 'node_modules/sharp'));

const svg = fs.readFileSync(path.join(__dirname, 'icon.svg'));
const resourcesDir = path.join(__dirname, '..', 'resources');
fs.mkdirSync(resourcesDir, { recursive: true });

/** Wrap a PNG buffer in a single-image .ico container (Vista+ PNG-in-ICO). */
function pngToIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // width 256 encoded as 0
  entry.writeUInt8(0, 1); // height 256 encoded as 0
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // image size
  entry.writeUInt32LE(22, 12); // offset = 6 + 16
  return Buffer.concat([header, entry, png]);
}

async function render(size) {
  return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
}

(async () => {
  const png512 = await render(512);
  const png256 = await render(256);
  fs.writeFileSync(path.join(__dirname, 'icon.png'), png512);
  fs.writeFileSync(path.join(resourcesDir, 'icon.png'), png256);
  fs.writeFileSync(path.join(__dirname, 'icon.ico'), pngToIco(png256));
  console.log('✓ build/icon.png (512), build/icon.ico (256), resources/icon.png (256)');
})();

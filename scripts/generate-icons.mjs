// Generates the PWA PNG icons from the SVG sources in assets/.
// Run manually with `npm run icons`; the output is committed to Git.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));

const ICONS = [
  { source: "assets/app-icon.svg", output: "public/icons/icon-192.png", size: 192 },
  { source: "assets/app-icon.svg", output: "public/icons/icon-512.png", size: 512 },
  { source: "assets/app-icon-maskable.svg", output: "public/icons/icon-maskable-512.png", size: 512 },
  // iOS rounds the icon itself, so the full-bleed maskable artwork avoids transparent corners.
  { source: "assets/app-icon-maskable.svg", output: "public/icons/apple-touch-icon.png", size: 180 },
];

for (const { source, output, size } of ICONS) {
  await sharp(root + source, { density: 300 }).resize(size, size).png().toFile(root + output);
  console.log(`${output} (${size}x${size})`);
}

// Browser tab icon: an ICO container holding PNG images (supported by all modern browsers).
const FAVICON_SIZES = [16, 32, 48];
const images = await Promise.all(
  FAVICON_SIZES.map((size) =>
    sharp(root + "assets/app-icon.svg", { density: 300 }).resize(size, size).png().toBuffer(),
  ),
);
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((image, i) => {
  const entry = 6 + 16 * i;
  header.writeUInt8(FAVICON_SIZES[i], entry); // width
  header.writeUInt8(FAVICON_SIZES[i], entry + 1); // height
  header.writeUInt16LE(1, entry + 4); // color planes
  header.writeUInt16LE(32, entry + 6); // bits per pixel
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(root + "app/favicon.ico", Buffer.concat([header, ...images]));
console.log(`app/favicon.ico (${FAVICON_SIZES.join(", ")})`);

/**
 * The Hemisphere One logo for dark grounds, derived from the one supplied
 * (src/assets/brand/hemisphere-one.png, client 2026-10-09): every pixel is
 * read as a mix of the logo's two colours, its near-black and its yellow,
 * and written as the same mix of the page's paper and that yellow. The
 * drawing, the yellow and the edges are the supplied file's; only the dark
 * ink becomes light. Run: node scripts/logo-reversed.mjs
 *
 * CONFIRM: a reversed logo from Hemisphere One themselves would replace it
 * (notes N1).
 */
import sharp from 'sharp';

const SRC = 'src/assets/brand/hemisphere-one.png';
const OUT = 'src/assets/brand/hemisphere-one-reversed.png';
const DARK = [12, 26, 34];
const YELLOW = [248, 208, 0];
const PAPER = [242, 240, 235];

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const axis = YELLOW.map((v, k) => v - DARK[k]);
const len2 = axis.reduce((s, v) => s + v * v, 0);
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] === 0) continue;
  let t = 0;
  for (let k = 0; k < 3; k++) t += (data[i + k] - DARK[k]) * axis[k];
  t = Math.min(1, Math.max(0, t / len2));
  for (let k = 0; k < 3; k++) data[i + k] = Math.round(PAPER[k] + (YELLOW[k] - PAPER[k]) * t);
}
await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(OUT);
console.log('wrote', OUT, `${info.width} × ${info.height}`);

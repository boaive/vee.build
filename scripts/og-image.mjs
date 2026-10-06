// Generates public/og.png (1200 × 630) — the two shells in isometric, to scale.
// Run: node scripts/og-image.mjs
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);
const K = 42; // px per metre
const OX = 760;
const OY = 300;
const iso = (x, y, z) => [OX + (x - z) * COS * K, OY + ((x + z) * SIN - y) * K];
const poly = (pts, fill) =>
  `<polygon points="${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="${fill}" stroke="#151617" stroke-width="2" stroke-linejoin="round"/>`;

function shell(x0, z0, L) {
  const x1 = x0 + L;
  const z1 = z0 + 3;
  const glass = [];
  for (let c = 0; c < L / 3; c++) {
    const a = x0 + c * 3 + 0.8;
    const b = x0 + c * 3 + 2.2;
    glass.push(`<polygon points="${[iso(a, 1, z1), iso(b, 1, z1), iso(b, 2.2, z1), iso(a, 2.2, z1)].map((p) => p.join(',')).join(' ')}" fill="#3a3c3e"/>`);
  }
  return [
    poly([iso(x0, 3, z0), iso(x1, 3, z0), iso(x1, 3, z1), iso(x0, 3, z1)], '#fbfaf7'),
    poly([iso(x0, 0, z1), iso(x1, 0, z1), iso(x1, 3, z1), iso(x0, 3, z1)], '#e9e6df'),
    poly([iso(x1, 0, z0), iso(x1, 0, z1), iso(x1, 3, z1), iso(x1, 3, z0)], '#d3cfc6'),
    ...glass,
  ].join('');
}

const base = [iso(-2, 0, -2), iso(12.5, 0, -2), iso(12.5, 0, 5), iso(-2, 0, 5)].map((p) => p.join(',')).join(' ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#eceae4"/>
  <polygon points="${base}" fill="#e2dfd8"/>
  ${shell(0, 0, 6)}
  ${shell(7.5, 0, 3)}
  <g fill="none" stroke="#151617" stroke-width="4">
    <rect x="72" y="74" width="56" height="28"/>
    <rect x="134" y="74" width="28" height="28"/>
  </g>
  <g font-family="Arial, Helvetica, sans-serif" fill="#151617">
    <text x="184" y="100" font-size="34" font-weight="700" letter-spacing="3">VEE<tspan fill="#d9431b">.</tspan>BUILD</text>
    <text x="72" y="452" font-size="66" font-weight="700" letter-spacing="-2">One system.</text>
    <text x="72" y="526" font-size="66" font-weight="700" letter-spacing="-2">Many buildings.</text>
  </g>
  <text x="72" y="578" font-family="Consolas, 'Courier New', monospace" font-size="22" letter-spacing="3" fill="#62656a">6 M × 3 M × 3 M  ·  3 M × 3 M × 3 M</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(join(root, 'public', 'og.png'));
console.log('public/og.png written');

// PWA 아이콘/애플 터치 아이콘 생성기
// 하나의 SVG(따뜻한 코랄 배경 + 흰 해님 마크)를 여러 크기 PNG로 래스터화.
// 실행: node scripts/gen-icons.mjs

import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

const S = 1024;
const cx = 512;
const cy = 480;
const sunR = 196;

// 해님 광선 8개
let rays = "";
for (let i = 0; i < 8; i++) {
  const angle = i * 45;
  rays += `<rect x="${cx - 22}" y="${cy - sunR - 118}" width="44" height="92" rx="22" fill="#FFFFFF" transform="rotate(${angle} ${cx} ${cy})"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F79A6E"/>
      <stop offset="1" stop-color="#D96A3D"/>
    </linearGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  ${rays}
  <circle cx="${cx}" cy="${cy}" r="${sunR}" fill="#FFFFFF"/>
  <circle cx="${cx - 62}" cy="${cy - 18}" r="24" fill="#F0885A"/>
  <circle cx="${cx + 62}" cy="${cy - 18}" r="24" fill="#F0885A"/>
  <path d="M ${cx - 74} ${cy + 46} Q ${cx} ${cy + 118} ${cx + 74} ${cy + 46}" stroke="#F0885A" stroke-width="26" stroke-linecap="round" fill="none"/>
</svg>`;

const buf = Buffer.from(svg);

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-192.png", size: 192 },
  { file: "icon-maskable-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32.png", size: 32 },
];

for (const t of targets) {
  await sharp(buf)
    .resize(t.size, t.size)
    .png()
    .toFile(join(OUT, t.file));
  console.log("✓", t.file, `${t.size}x${t.size}`);
}

console.log("아이콘 생성 완료 →", OUT);

"use client";

// ─────────────────────────────────────────────────────────
//  아이 사진 → 만화 캐릭터 이모티콘/스티커 (전부 브라우저 캔버스).
//  외부 서비스로 사진 전송 없음. 배경 제거 모델도 자체 호스팅.
//
//  파이프라인(무거운 작업은 base 1회):
//   prepareStickerBase() : 로드 → 인물 배경제거(온디바이스) → 만화 스타일화
//                          → 흰 다이컷 외곽선 + 그림자 캐릭터 캔버스 생성
//   renderStickerFromBase(): base 위에 무드별 꾸미기(하트/반짝/집중선 등)
//                          + 만화체 캡션 리본을 얹어 투명 PNG 반환
// ─────────────────────────────────────────────────────────

import { cartoonize, CartoonStyle } from "./cartoonize";
import { getSubjectAlpha } from "./segment";

export type StickerMood = "hearts" | "sparkle" | "stars" | "zzz" | "pop" | "wave" | "none";

export interface StickerPreset {
  id: string;
  caption: string;
  emoji: string;
  color: string; // 리본·포인트 색
  mood: StickerMood;
}

export const STICKER_PRESETS: StickerPreset[] = [
  { id: "love", caption: "사랑해", emoji: "❤️", color: "#F0568B", mood: "hearts" },
  { id: "best", caption: "최고최고", emoji: "⭐", color: "#F5A623", mood: "stars" },
  { id: "yay", caption: "신난다!", emoji: "🎉", color: "#8B6FE8", mood: "pop" },
  { id: "good", caption: "잘했어!", emoji: "👍", color: "#F0885A", mood: "sparkle" },
  { id: "hi", caption: "안녕!", emoji: "👋", color: "#33A7D9", mood: "wave" },
  { id: "sleepy", caption: "졸려…", emoji: "😴", color: "#4F9BE8", mood: "zzz" },
  { id: "cutie", caption: "귀요미", emoji: "🥰", color: "#F5883E", mood: "hearts" },
  { id: "wow", caption: "우와!", emoji: "✨", color: "#28B7A6", mood: "sparkle" },
];

// ── 기본 그리기 유틸 ──────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, d: number
) {
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, dx, dy, d, d);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ── Sticker base(무거운 작업 1회 산출물) ───────────────────
export interface StickerBase {
  size: number;
  /** 캐릭터(만화화 + 배경제거 + 흰 다이컷) 캔버스. 투명 배경. */
  character: HTMLCanvasElement;
  /** 배경 제거 성공 여부 */
  cutout: boolean;
  /** 피사체 경계(캔버스 좌표). 꾸미기 배치용. */
  bounds: { cx: number; cy: number; top: number; bottom: number; left: number; right: number };
}

export interface PrepareOptions {
  style?: CartoonStyle;
  cutout?: boolean; // false면 배경제거 생략(빠름)
  size?: number;
}

// 알파(Uint8) 적용해 만화화 이미지를 잘라낸 RGBA 캔버스 생성
function applyAlpha(
  cartoon: HTMLCanvasElement,
  alpha: Uint8ClampedArray
): HTMLCanvasElement {
  const w = cartoon.width, h = cartoon.height;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(cartoon, 0, 0);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) d[i + 3] = alpha[p];
  ctx.putImageData(id, 0, 0);
  return out;
}

// 알파 마스크에서 피사체 경계 계산
function boundsFromAlpha(alpha: Uint8ClampedArray, w: number, h: number) {
  let minX = w, minY = h, maxX = 0, maxY = 0, sumX = 0, sumY = 0, n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > 140) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        sumX += x; sumY += y; n++;
      }
    }
  }
  if (n === 0) return { cx: w / 2, cy: h / 2, top: 0, bottom: h, left: 0, right: w };
  return { cx: sumX / n, cy: sumY / n, top: minY, bottom: maxY, left: minX, right: maxX };
}

// 흰 실루엣(subject 알파 그대로, 색만 흰색)
function whiteSilhouette(subject: HTMLCanvasElement): HTMLCanvasElement {
  const w = subject.width, h = subject.height;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(subject, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  return c;
}

/** 무거운 작업(로드/세그/만화화/다이컷)을 1회 수행해 재사용 base 반환. */
export async function prepareStickerBase(
  photoDataUrl: string,
  opts: PrepareOptions = {}
): Promise<StickerBase> {
  const size = opts.size ?? 480;
  const style = opts.style ?? "cartoon";
  const wantCutout = opts.cutout ?? true;

  const img = await loadImage(photoDataUrl);

  // 정사각 소스 캔버스
  const src = document.createElement("canvas");
  src.width = size; src.height = size;
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  drawCover(sctx, img, 0, 0, size);

  // 1) 배경 제거(온디바이스). 실패/비활성 → null
  let alpha: Uint8ClampedArray | null = null;
  if (wantCutout) {
    try {
      alpha = await getSubjectAlpha(src);
    } catch {
      alpha = null;
    }
  }

  // 2) 만화 스타일화
  const cartoon = cartoonize(src, { style });

  const character = document.createElement("canvas");
  character.width = size; character.height = size;
  const cctx = character.getContext("2d")!;

  if (alpha) {
    // 다이컷 캐릭터: 흰 외곽선 + 그림자 + 잘라낸 만화 피사체
    const subject = applyAlpha(cartoon, alpha);
    const sil = whiteSilhouette(subject);
    const border = Math.max(3, Math.round(size * 0.02));

    // 그림자
    cctx.save();
    cctx.shadowColor = "rgba(0,0,0,0.28)";
    cctx.shadowBlur = size * 0.035;
    cctx.shadowOffsetY = size * 0.012;
    // 흰 실루엣을 여러 방향으로 찍어 외곽선(팽창) 생성
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      cctx.drawImage(sil, Math.cos(a) * border, Math.sin(a) * border);
    }
    cctx.restore();
    // 외곽선 내부를 확실히 흰색으로(그림자 없이 한 번 더)
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      cctx.drawImage(sil, Math.cos(a) * border, Math.sin(a) * border);
    }
    // 색 피사체 올리기
    cctx.drawImage(subject, 0, 0);

    const bounds = boundsFromAlpha(alpha, size, size);
    return { size, character, cutout: true, bounds };
  }

  // 폴백: 배경 제거 실패 → 둥근 프레임 만화 카드
  const inset = size * 0.06;
  const r = size * 0.16;
  cctx.save();
  cctx.shadowColor = "rgba(0,0,0,0.22)";
  cctx.shadowBlur = size * 0.03;
  cctx.shadowOffsetY = size * 0.01;
  roundRect(cctx, inset - size * 0.02, inset - size * 0.02, size - inset * 2 + size * 0.04, size - inset * 2 + size * 0.04, r + size * 0.02);
  cctx.fillStyle = "#ffffff";
  cctx.fill();
  cctx.restore();
  cctx.save();
  roundRect(cctx, inset, inset, size - inset * 2, size - inset * 2, r);
  cctx.clip();
  cctx.drawImage(cartoon, inset, inset, size - inset * 2, size - inset * 2);
  cctx.restore();
  return {
    size,
    character,
    cutout: false,
    bounds: { cx: size / 2, cy: size / 2, top: inset, bottom: size - inset, left: inset, right: size - inset },
  };
}

// ── 꾸미기(무드별 데코) ───────────────────────────────────
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0.3);
  ctx.bezierCurveTo(0, 0, -0.5, -0.1, -0.5, -0.4);
  ctx.bezierCurveTo(-0.5, -0.7, -0.1, -0.75, 0, -0.45);
  ctx.bezierCurveTo(0.1, -0.75, 0.5, -0.7, 0.5, -0.4);
  ctx.bezierCurveTo(0.5, -0.1, 0, 0, 0, 0.3);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 0.12;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, points = 5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const ang = (Math.PI / points) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? s : s * 0.45;
    ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(ang) * rad, Math.sin(ang) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = s * 0.12;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a - 0.25) * s * 0.3, Math.sin(a - 0.25) * s * 0.3, Math.cos(a) * s, Math.sin(a) * s);
    ctx.quadraticCurveTo(Math.cos(a + 0.25) * s * 0.3, Math.sin(a + 0.25) * s * 0.3, 0, 0);
  }
  ctx.fill();
  ctx.restore();
}

// 결정론적 의사난수(프리셋별 데코 위치 고정 → 리렌더 안정)
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function hashStr(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

function drawMood(
  ctx: CanvasRenderingContext2D,
  mood: StickerMood,
  size: number,
  color: string,
  seedKey: string
) {
  const rnd = seeded(hashStr(seedKey));
  const put = (n: number, fn: (x: number, y: number, s: number) => void) => {
    for (let i = 0; i < n; i++) {
      // 상단 양옆에 흩뿌림(캡션 영역 피함)
      const side = i % 2 === 0 ? -1 : 1;
      const x = size / 2 + side * (size * 0.28 + rnd() * size * 0.12);
      const y = size * 0.12 + rnd() * size * 0.4;
      const s = size * (0.05 + rnd() * 0.04);
      fn(x, y, s);
    }
  };

  switch (mood) {
    case "hearts":
      put(5, (x, y, s) => drawHeart(ctx, x, y, s * 2.4, color));
      break;
    case "stars":
      put(6, (x, y, s) => drawStar(ctx, x, y, s * 1.3, color));
      break;
    case "sparkle":
      put(6, (x, y, s) => drawSparkle(ctx, x, y, s * 1.4, color));
      break;
    case "pop": {
      // 축포 조각(컨페티)
      const cols = [color, "#F5A623", "#8B6FE8", "#33A7D9", "#5AB552"];
      put(9, (x, y, s) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rnd() * Math.PI);
        ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
        ctx.fillRect(-s * 0.4, -s * 0.25, s * 0.8, s * 0.5);
        ctx.restore();
      });
      break;
    }
    case "wave":
      put(4, (x, y, s) => drawSparkle(ctx, x, y, s, "#FFD966"));
      break;
    case "zzz": {
      ctx.save();
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < 3; i++) {
        const s = size * (0.07 + i * 0.03);
        ctx.font = `800 ${s}px "Pretendard","Malgun Gothic",sans-serif`;
        ctx.fillText("Z", size * (0.72 + i * 0.06), size * (0.24 - i * 0.06));
      }
      ctx.restore();
      break;
    }
    case "none":
    default:
      break;
  }
}

// 만화체 캡션 리본(굵은 외곽선 텍스트) — 하단
function drawCaption(
  ctx: CanvasRenderingContext2D,
  caption: string,
  size: number,
  color: string
) {
  if (!caption) return;
  const y = size * 0.9;
  let fontSize = size * 0.135;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${fontSize}px "Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
  // 길면 축소
  const maxW = size * 0.86;
  while (ctx.measureText(caption).width > maxW && fontSize > size * 0.07) {
    fontSize -= size * 0.008;
    ctx.font = `900 ${fontSize}px "Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
  }

  ctx.save();
  ctx.lineJoin = "round";
  // 바깥 흰 테두리(두껍게) → 다이컷 스티커 글씨
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = size * 0.02;
  ctx.shadowOffsetY = size * 0.008;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = fontSize * 0.34;
  ctx.strokeText(caption, size / 2, y);
  ctx.restore();

  // 안쪽 컬러 테두리 + 컬러 채움
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = fontSize * 0.14;
  ctx.strokeText(caption, size / 2, y);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(caption, size / 2, y);
  ctx.restore();
}

export interface RenderOptions {
  showCaption?: boolean;
  showEmoji?: boolean;
  showMood?: boolean;
}

/** base 위에 프리셋 꾸미기를 얹어 PNG data URL 반환(가벼움). */
export function renderStickerFromBase(
  base: StickerBase,
  preset: StickerPreset,
  opts: RenderOptions = {}
): string {
  const { showCaption = true, showEmoji = true, showMood = true } = opts;
  const size = base.size;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // 무드 데코(캐릭터 뒤쪽 레이어)
  if (showMood) drawMood(ctx, preset.mood, size, preset.color, preset.id);

  // 캐릭터
  ctx.drawImage(base.character, 0, 0);

  // 이모지 배지(우상단, 피사체 경계 기준)
  if (showEmoji) {
    const badgeX = Math.min(size * 0.82, base.bounds.right - size * 0.02);
    const badgeY = Math.max(size * 0.16, base.bounds.top + size * 0.02);
    const br = size * 0.1;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = size * 0.02;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, br, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    ctx.font = `${br * 1.2}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(preset.emoji, badgeX, badgeY + br * 0.06);
  }

  // 캡션
  if (showCaption) drawCaption(ctx, preset.caption, size, preset.color);

  return canvas.toDataURL("image/png");
}

// ── 하위호환: 단발 렌더(기존 호출부 대비) ──────────────────
export async function renderSticker(
  photoDataUrl: string,
  preset: StickerPreset,
  size = 480
): Promise<string> {
  const base = await prepareStickerBase(photoDataUrl, { size, cutout: true });
  return renderStickerFromBase(base, preset);
}

"use client";

// ─────────────────────────────────────────────────────────
//  아이 사진 → 이모티콘/스티커 (전부 브라우저 캔버스에서 처리).
//  외부 서비스·AI 없음 → 사진이 기기 밖으로 나가지 않음(프라이버시 안전).
//  원형 컷아웃 + 컬러 링 + 이모지 배지 + 캡션 말풍선 을 합성해 투명 PNG로 반환.
// ─────────────────────────────────────────────────────────

export interface StickerPreset {
  id: string;
  caption: string;
  emoji: string;
  color: string; // 링·말풍선 색
}

export const STICKER_PRESETS: StickerPreset[] = [
  { id: "good", caption: "좋아!", emoji: "👍", color: "#F5883E" },
  { id: "love", caption: "사랑해", emoji: "❤️", color: "#F0568B" },
  { id: "best", caption: "최고!", emoji: "⭐", color: "#F5A623" },
  { id: "yay", caption: "신나!", emoji: "🎉", color: "#8B6FE8" },
  { id: "sleepy", caption: "졸려…", emoji: "😴", color: "#4F9BE8" },
  { id: "no", caption: "안 돼~", emoji: "🙅", color: "#28B7A6" },
  { id: "hungry", caption: "배고파", emoji: "🍚", color: "#5AB552" },
  { id: "hi", caption: "안녕!", emoji: "👋", color: "#33A7D9" },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    img.src = src;
  });
}

// 대상 정사각 영역을 꽉 채우도록(cover) 이미지를 그린다.
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  d: number
) {
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, dx, dy, d, d);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
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

// 하나의 스티커를 렌더해 PNG data URL로 반환.
export async function renderSticker(
  photoDataUrl: string,
  preset: StickerPreset,
  size = 480
): Promise<string> {
  const img = await loadImage(photoDataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 처리를 지원하지 않는 브라우저예요.");

  const cx = size / 2;
  const cy = size * 0.4;
  const r = size * 0.31;
  const ring = size * 0.022;
  const white = size * 0.02;

  // 다이컷 흰 테두리 + 컬러 링 (살짝 그림자로 스티커 느낌)
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = size * 0.03;
  ctx.shadowOffsetY = size * 0.01;
  ctx.beginPath();
  ctx.arc(cx, cy, r + ring + white, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r + ring, 0, Math.PI * 2);
  ctx.fillStyle = preset.color;
  ctx.fill();

  // 사진 클립
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  drawCover(ctx, img, cx - r, cy - r, r * 2);
  ctx.restore();

  // 이모지 배지 (우상단)
  const bx = cx + r * 0.72;
  const by = cy - r * 0.72;
  const br = size * 0.11;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)";
  ctx.shadowBlur = size * 0.02;
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  ctx.font = `${br * 1.25}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(preset.emoji, bx, by + br * 0.06);

  // 캡션 말풍선(하단)
  ctx.font = `700 ${size * 0.11}px "Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const padX = size * 0.06;
  const tw = ctx.measureText(preset.caption).width;
  const pillW = Math.min(size * 0.86, tw + padX * 2);
  const pillH = size * 0.19;
  const pillY = size * 0.78;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)";
  ctx.shadowBlur = size * 0.02;
  ctx.shadowOffsetY = size * 0.008;
  roundRect(ctx, cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = preset.color;
  ctx.fill();
  ctx.restore();
  // 흰 테두리
  roundRect(ctx, cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
  ctx.lineWidth = size * 0.012;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(preset.caption, cx, pillY + pillH / 2 + size * 0.004);

  return canvas.toDataURL("image/png");
}

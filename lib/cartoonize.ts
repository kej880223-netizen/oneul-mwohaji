"use client";

// ─────────────────────────────────────────────────────────
//  사진 → 만화/캐릭터 톤 스타일라이즈 (전부 브라우저 캔버스, 의존성 0)
//  파이프라인:
//   1) 엣지 보존 스무딩(정방향/역방향 박스블러 반복)으로 피부 노이즈를 평탄화
//   2) 채도·대비 부스트 후 컬러 양자화(포스터라이즈) → 셀셰이딩(만화 칠) 느낌
//   3) 소벨 엣지 검출 → 임계값 → 검은 잉크 라인 오버레이(멀티플라이)
//   4) 살짝 밝기/따뜻함 보정
//  결과: 원본 톤은 유지하되 "그린 것 같은" 캐릭터 톤. 얼굴을 새로 그리는
//  생성형이 아니라, 온디바이스에서 안전하게 돌아가는 스타일 변환이다.
// ─────────────────────────────────────────────────────────

export type CartoonStyle = "cartoon" | "sketch" | "pop" | "soft";

export interface CartoonOptions {
  style?: CartoonStyle;
  /** 0~1, 만화 효과 강도(기본 스타일별 프리셋) */
  strength?: number;
}

interface StyleParams {
  smoothPasses: number; // 스무딩 반복 횟수
  smoothRadius: number; // 블러 반경(px)
  levels: number; // 채널당 색 단계(포스터라이즈)
  saturation: number; // 채도 배수
  contrast: number; // 대비 배수
  edgeThreshold: number; // 잉크 라인 임계값(낮을수록 라인 많음)
  edgeStrength: number; // 잉크 라인 진하기 0~1
  warmth: number; // 따뜻함 보정(-1~1)
  shadowLift: number; // 어두운 영역을 들어올려 순검정 뭉침 방지(0~60)
  grayscaleBase?: boolean; // 스케치: 바탕을 밝은 회색으로
}

const STYLE_PRESETS: Record<CartoonStyle, StyleParams> = {
  // 기본: 부드럽고 귀여운 셀셰이딩 만화 캐릭터
  cartoon: {
    smoothPasses: 3,
    smoothRadius: 2,
    levels: 9,
    saturation: 1.4,
    contrast: 1.05,
    edgeThreshold: 58,
    edgeStrength: 0.5,
    warmth: 0.08,
    shadowLift: 34,
  },
  // 손그림 스케치: 밝은 바탕 + 진한 라인
  sketch: {
    smoothPasses: 2,
    smoothRadius: 2,
    levels: 5,
    saturation: 0.55,
    contrast: 1.02,
    edgeThreshold: 40,
    edgeStrength: 0.95,
    warmth: 0.02,
    shadowLift: 10,
    grayscaleBase: true,
  },
  // 팝아트: 강한 채도 + 굵은 라인
  pop: {
    smoothPasses: 3,
    smoothRadius: 3,
    levels: 5,
    saturation: 1.75,
    contrast: 1.16,
    edgeThreshold: 52,
    edgeStrength: 0.8,
    warmth: 0,
    shadowLift: 18,
  },
  // 부드러운 파스텔 만화: 라인 약하게
  soft: {
    smoothPasses: 4,
    smoothRadius: 2,
    levels: 10,
    saturation: 1.18,
    contrast: 1.0,
    edgeThreshold: 70,
    edgeStrength: 0.32,
    warmth: 0.14,
    shadowLift: 44,
  },
};

export const CARTOON_STYLE_LABELS: { id: CartoonStyle; label: string; emoji: string }[] = [
  { id: "cartoon", label: "만화", emoji: "🎨" },
  { id: "pop", label: "팝아트", emoji: "💥" },
  { id: "soft", label: "파스텔", emoji: "🌸" },
  { id: "sketch", label: "스케치", emoji: "✏️" },
];

// ── 분리형 박스블러(수평·수직) : ImageData in-place ────────────
function boxBlur(data: Uint8ClampedArray, w: number, h: number, radius: number) {
  if (radius < 1) return;
  const tmp = new Uint8ClampedArray(data.length);
  const win = radius * 2 + 1;

  // 수평
  for (let y = 0; y < h; y++) {
    let rs = 0, gs = 0, bs = 0;
    const row = y * w * 4;
    for (let k = -radius; k <= radius; k++) {
      const x = Math.min(w - 1, Math.max(0, k));
      const i = row + x * 4;
      rs += data[i]; gs += data[i + 1]; bs += data[i + 2];
    }
    for (let x = 0; x < w; x++) {
      const o = row + x * 4;
      tmp[o] = rs / win; tmp[o + 1] = gs / win; tmp[o + 2] = bs / win; tmp[o + 3] = 255;
      const addX = Math.min(w - 1, x + radius + 1);
      const subX = Math.max(0, x - radius);
      const ai = row + addX * 4, si = row + subX * 4;
      rs += data[ai] - data[si];
      gs += data[ai + 1] - data[si + 1];
      bs += data[ai + 2] - data[si + 2];
    }
  }
  // 수직
  for (let x = 0; x < w; x++) {
    let rs = 0, gs = 0, bs = 0;
    for (let k = -radius; k <= radius; k++) {
      const y = Math.min(h - 1, Math.max(0, k));
      const i = (y * w + x) * 4;
      rs += tmp[i]; gs += tmp[i + 1]; bs += tmp[i + 2];
    }
    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 4;
      data[o] = rs / win; data[o + 1] = gs / win; data[o + 2] = bs / win; data[o + 3] = 255;
      const addY = Math.min(h - 1, y + radius + 1);
      const subY = Math.max(0, y - radius);
      const ai = (addY * w + x) * 4, si = (subY * w + x) * 4;
      rs += tmp[ai] - tmp[si];
      gs += tmp[ai + 1] - tmp[si + 1];
      bs += tmp[ai + 2] - tmp[si + 2];
    }
  }
}

function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// 소벨 엣지 → 픽셀별 엣지 강도(0~255) 맵
function sobelEdges(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = luminance(data[i], data[i + 1], data[i + 2]);
  }
  const edges = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const tl = lum[p - w - 1], t = lum[p - w], tr = lum[p - w + 1];
      const l = lum[p - 1], rr = lum[p + 1];
      const bl = lum[p + w - 1], bb = lum[p + w], br = lum[p + w + 1];
      const gx = -tl - 2 * l - bl + tr + 2 * rr + br;
      const gy = -tl - 2 * t - tr + bl + 2 * bb + br;
      edges[p] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

// RGB→HSL 최소구현(채도 부스트용)
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hue2rgb(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}

/**
 * 소스 이미지를 만화 톤으로 변환해 새 캔버스로 반환.
 * @param source 이미 정사각형으로 그려진 캔버스(또는 ImageBitmap 소스)
 */
export function cartoonize(
  source: HTMLCanvasElement,
  opts: CartoonOptions = {}
): HTMLCanvasElement {
  const style = opts.style ?? "cartoon";
  const p = STYLE_PRESETS[style];
  const w = source.width;
  const h = source.height;

  const work = document.createElement("canvas");
  work.width = w;
  work.height = h;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("이미지 처리를 지원하지 않는 브라우저예요.");
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // 원본 luminance 기반 엣지는 스무딩 전에 뽑아야 디테일이 산다
  const edges = sobelEdges(data, w, h);

  // 1) 엣지 보존 스무딩(간단화: 박스블러 반복)
  for (let i = 0; i < p.smoothPasses; i++) {
    boxBlur(data, w, h, p.smoothRadius);
  }

  // 2) 채도/대비 + 포스터라이즈 + 따뜻함
  const step = 255 / (p.levels - 1);
  const sat = p.saturation;
  const con = p.contrast;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    if (p.grayscaleBase) {
      // 스케치: 밝은 회색 바탕
      const lu = luminance(r, g, b);
      const lifted = 255 - (255 - lu) * 0.35; // 전체적으로 밝게
      r = g = b = lifted;
    } else {
      // 채도 부스트(HSL)
      let [hh, ss, ll] = rgbToHsl(r, g, b);
      ss = Math.min(1, ss * sat);
      [r, g, b] = hslToRgb(hh, ss, ll);
    }

    // 대비(중앙 128 기준)
    r = (r - 128) * con + 128;
    g = (g - 128) * con + 128;
    b = (b - 128) * con + 128;

    // 그림자 리프트: 어두운 영역이 순검정으로 뭉치지 않게 바닥을 올림
    if (p.shadowLift > 0) {
      const scale = (255 - p.shadowLift) / 255;
      r = p.shadowLift + r * scale;
      g = p.shadowLift + g * scale;
      b = p.shadowLift + b * scale;
    }

    // 따뜻함
    r += p.warmth * 22;
    b -= p.warmth * 18;

    // 포스터라이즈(셀셰이딩)
    r = Math.round(r / step) * step;
    g = Math.round(g / step) * step;
    b = Math.round(b / step) * step;

    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }

  // 3) 잉크 라인 오버레이(멀티플라이)
  const th = p.edgeThreshold;
  const es = p.edgeStrength;
  for (let pI = 0; pI < edges.length; pI++) {
    const e = edges[pI];
    if (e <= th) continue;
    // 임계 위 → 라인. 강도는 임계 초과분에 비례(부드러운 라인 끝)
    const t = Math.min(1, (e - th) / th) * es;
    const i = pI * 4;
    data[i] *= 1 - t;
    data[i + 1] *= 1 - t;
    data[i + 2] *= 1 - t;
  }

  ctx.putImageData(imageData, 0, 0);
  return work;
}

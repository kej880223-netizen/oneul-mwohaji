"use client";

// ─────────────────────────────────────────────────────────
//  온디바이스 인물 배경 제거 (MediaPipe Selfie Segmenter).
//  모델·wasm 은 자체 호스팅(/public) → 사진은 물론 어떤 데이터도
//  기기 밖으로 나가지 않는다. 모델 파일만 최초 1회 브라우저가 받음.
//
//  export: getSubjectAlpha(canvas) → 전경(사람) 알파 마스크(Uint8, 0~255).
//  모델 로드/추론 실패 시 null 반환 → 호출측이 컷아웃 없이 폴백.
// ─────────────────────────────────────────────────────────

import type { ImageSegmenter } from "@mediapipe/tasks-vision";

let segmenterPromise: Promise<ImageSegmenter | null> | null = null;

async function getSegmenter(): Promise<ImageSegmenter | null> {
  if (segmenterPromise) return segmenterPromise;
  segmenterPromise = (async () => {
    try {
      const { ImageSegmenter, FilesetResolver } = await import(
        "@mediapipe/tasks-vision"
      );
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      return await ImageSegmenter.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "/models/selfie_segmenter.tflite",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
    } catch (e) {
      console.warn("[segment] 모델 로드 실패, 컷아웃 없이 진행합니다.", e);
      return null;
    }
  })();
  return segmenterPromise;
}

/** 세그멘테이션 가능 여부를 미리 예열(페이지 진입 시 호출용). */
export function warmupSegmenter() {
  void getSegmenter();
}

// 마스크(mw×mh, 0~1) → 타깃(w×h) 알파로 이중선형 리샘플.
function resample(
  mask: Float32Array,
  mw: number,
  mh: number,
  w: number,
  h: number
): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = (y / h) * mh - 0.5;
    const y0 = Math.max(0, Math.min(mh - 1, Math.floor(sy)));
    const y1 = Math.min(mh - 1, y0 + 1);
    const fy = sy - Math.floor(sy);
    for (let x = 0; x < w; x++) {
      const sx = (x / w) * mw - 0.5;
      const x0 = Math.max(0, Math.min(mw - 1, Math.floor(sx)));
      const x1 = Math.min(mw - 1, x0 + 1);
      const fx = sx - Math.floor(sx);
      const a = mask[y0 * mw + x0], b = mask[y0 * mw + x1];
      const c = mask[y1 * mw + x0], d = mask[y1 * mw + x1];
      const top = a + (b - a) * fx;
      const bot = c + (d - c) * fx;
      out[y * w + x] = top + (bot - top) * fy;
    }
  }
  return out;
}

// 알파 경계 부드럽게(수평·수직 박스블러) → 다이컷 깔끔하게.
function featherAlpha(alpha: Float32Array, w: number, h: number, radius: number) {
  if (radius < 1) return;
  const tmp = new Float32Array(alpha.length);
  const win = radius * 2 + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    const row = y * w;
    for (let k = -radius; k <= radius; k++) s += alpha[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = s / win;
      const add = row + Math.min(w - 1, x + radius + 1);
      const sub = row + Math.max(0, x - radius);
      s += alpha[add] - alpha[sub];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let k = -radius; k <= radius; k++) s += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      alpha[y * w + x] = s / win;
      const add = Math.min(h - 1, y + radius + 1) * w + x;
      const sub = Math.max(0, y - radius) * w + x;
      s += tmp[add] - tmp[sub];
    }
  }
}

/**
 * 인물 전경 알파 마스크(0~255)를 캔버스 해상도로 반환. 실패 시 null.
 */
export async function getSubjectAlpha(
  source: HTMLCanvasElement
): Promise<Uint8ClampedArray | null> {
  const segmenter = await getSegmenter();
  if (!segmenter) return null;

  const w = source.width;
  const h = source.height;
  try {
    const result = segmenter.segment(source);
    const conf = result.confidenceMasks?.[0];
    if (!conf) {
      result.close?.();
      return null;
    }
    const mw = conf.width;
    const mh = conf.height;
    const raw = conf.getAsFloat32Array(); // 0~1, 전경 확률
    // 값 복사 후 MP 리소스 해제
    const maskCopy = Float32Array.from(raw);
    result.close?.();

    // 타깃 해상도로 리샘플
    const alphaF = resample(maskCopy, mw, mh, w, h);

    // 부드러운 임계 + 경계 페더링
    const feather = Math.max(1, Math.round(Math.min(w, h) * 0.012));
    featherAlpha(alphaF, w, h, feather);

    // 확률을 알파로: 0.4 이하 배경, 0.6 이상 전경, 사이는 그라데이션
    const out = new Uint8ClampedArray(w * h);
    for (let i = 0; i < alphaF.length; i++) {
      const v = alphaF[i];
      const t = v <= 0.4 ? 0 : v >= 0.6 ? 1 : (v - 0.4) / 0.2;
      out[i] = Math.round(t * 255);
    }

    // 전경이 거의 없으면(인물 인식 실패) 컷아웃 포기
    let fg = 0;
    for (let i = 0; i < out.length; i++) if (out[i] > 128) fg++;
    if (fg < out.length * 0.02) return null;

    return out;
  } catch (e) {
    console.warn("[segment] 추론 실패, 컷아웃 없이 진행합니다.", e);
    return null;
  }
}

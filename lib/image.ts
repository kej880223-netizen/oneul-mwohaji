"use client";

// 업로드한 이미지를 정사각형에 맞게 리사이즈·압축해 data URL로 변환.
// localStorage 부담을 줄이기 위해 기본 320px, JPEG 품질 0.82로 저장(≈20~40KB).
export async function fileToResizedDataUrl(
  file: File,
  max = 320,
  quality = 0.82
): Promise<string> {
  const srcUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("파일을 읽지 못했어요."));
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    i.src = srcUrl;
  });

  // 정사각형 중앙 크롭 후 max×max로 축소
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const size = Math.min(max, side);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 처리를 지원하지 않는 브라우저예요.");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", quality);
}

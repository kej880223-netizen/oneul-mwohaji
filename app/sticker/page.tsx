"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireChild } from "@/lib/useStore";
import { fileToResizedDataUrl } from "@/lib/image";
import {
  STICKER_PRESETS,
  StickerPreset,
  StickerBase,
  prepareStickerBase,
  renderStickerFromBase,
} from "@/lib/sticker";
import { CartoonStyle, CARTOON_STYLE_LABELS } from "@/lib/cartoonize";
import { warmupSegmenter } from "@/lib/segment";
import { PageHeader, Card, Button, Loading, EmptyState } from "@/components/ui";

interface Made {
  key: string;
  caption: string;
  url: string;
}

export default function StickerPage() {
  const router = useRouter();
  const { child, ready } = useRequireChild();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [style, setStyle] = useState<CartoonStyle>("cartoon");
  const [cutout, setCutout] = useState(true);

  const [base, setBase] = useState<StickerBase | null>(null);
  const [stickers, setStickers] = useState<Made[]>([]);
  const [customMade, setCustomMade] = useState<Made[]>([]);
  const [phase, setPhase] = useState<"" | "prep" | "render">("");

  const [selected, setSelected] = useState<Made | null>(null);
  const [custom, setCustom] = useState("");
  const [customEmoji, setCustomEmoji] = useState("💛");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // 초기 사진: 아이 프로필 사진 + 배경제거 모델 예열
  useEffect(() => {
    if (child?.photo) setPhoto(child.photo);
    warmupSegmenter();
  }, [child]);

  // 사진/스타일/컷아웃 변경 → base 재생성 후 프리셋 일괄 렌더
  useEffect(() => {
    if (!photo) {
      setBase(null);
      setStickers([]);
      setCustomMade([]);
      return;
    }
    let alive = true;
    setErr("");
    setPhase("prep");
    setCustomMade([]);
    (async () => {
      try {
        const b = await prepareStickerBase(photo, { style, cutout, size: 480 });
        if (!alive) return;
        setBase(b);
        setPhase("render");
        const made = STICKER_PRESETS.map((p: StickerPreset) => ({
          key: p.id,
          caption: p.caption,
          url: renderStickerFromBase(b, p),
        }));
        if (!alive) return;
        setStickers(made);
        if (!b.cutout && cutout) {
          setMsg("인물을 또렷이 인식하지 못해 배경은 그대로 뒀어요. 얼굴이 크게 나온 사진일수록 잘 잘려요.");
        } else {
          setMsg("");
        }
      } catch {
        if (alive) setErr("스티커를 만들지 못했어요. 다른 사진으로 시도해 주세요.");
      } finally {
        if (alive) setPhase("");
      }
    })();
    return () => {
      alive = false;
    };
  }, [photo, style, cutout]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await fileToResizedDataUrl(file, 640);
      setPhoto(url);
      setMsg("사진을 바꿨어요.");
    } catch (er) {
      setErr(er instanceof Error ? er.message : "사진을 불러오지 못했어요.");
    }
  }

  function makeCustom() {
    const caption = custom.trim();
    if (!base || !caption) return;
    const url = renderStickerFromBase(base, {
      id: `custom-${caption}`,
      caption,
      emoji: customEmoji,
      color: "#F0885A",
      mood: "sparkle",
    });
    setCustomMade((prev) => [
      { key: `custom-${caption}-${prev.length}`, caption, url },
      ...prev,
    ]);
    setCustom("");
  }

  function download(s: Made) {
    const a = document.createElement("a");
    a.href = s.url;
    a.download = `${child?.name || "아이"}_${s.caption}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMsg("이미지를 저장했어요. (갤러리/다운로드 확인)");
  }

  async function share(s: Made) {
    try {
      const blob = await (await fetch(s.url)).blob();
      const file = new File([blob], `${child?.name || "아이"}_${s.caption}.png`, {
        type: "image/png",
      });
      const nav = navigator as Navigator & {
        canShare?: (d: any) => boolean;
        share?: (d: any) => Promise<void>;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: "우리 아이 이모티콘" });
        return;
      }
      download(s);
    } catch {
      /* 사용자가 공유 취소 */
    }
  }

  if (!ready || !child) return <Loading />;

  const EMOJI_CHOICES = ["💛", "😄", "😍", "🥰", "😆", "🤗", "😎", "🌟"];
  const busy = phase !== "";
  const all = [...customMade, ...stickers];

  return (
    <div>
      <PageHeader
        title="이모티콘 만들기"
        subtitle={`${child.name} 사진을 만화 캐릭터로`}
        onBack={() => router.push("/profile")}
      />

      <div className="px-5 pb-8">
        {/* 사진 소스 */}
        <Card className="mb-4">
          <div className="flex items-center gap-3">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt="사용할 사진"
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary-soft flex items-center justify-center text-2xl">
                👶
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">사용할 사진</p>
              <p className="text-xs text-ink-faint">
                아이 얼굴이 정면으로 크게 나온 사진일수록 예뻐요.
              </p>
            </div>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              {photo ? "변경" : "선택"}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPick}
            className="hidden"
          />
          <p className="text-[11px] text-ink-faint mt-3 leading-relaxed">
            🔒 사진은 이 기기 안에서만 처리돼요. 배경 지우기·만화 변환 전부
            기기에서 돌아가고, 서버나 AI로 전송되지 않아요.
          </p>
        </Card>

        {!photo ? (
          <EmptyState
            emoji="🎨"
            title="사진을 먼저 골라주세요"
            description="아이 사진을 고르면 배경을 지우고 만화 캐릭터 스티커로 바꿔드려요."
            action={
              <Button onClick={() => fileRef.current?.click()}>사진 선택</Button>
            }
          />
        ) : (
          <>
            {/* 스타일 선택 */}
            <Card className="mb-4">
              <p className="text-sm font-semibold text-ink mb-2">그림체</p>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {CARTOON_STYLE_LABELS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    disabled={busy}
                    className={
                      "flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-medium transition disabled:opacity-50 " +
                      (style === s.id
                        ? "bg-primary-soft ring-2 ring-primary text-primary-dark"
                        : "bg-cream text-ink-soft")
                    }
                  >
                    <span className="text-xl">{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-between">
                <span className="text-sm text-ink-soft">
                  배경 지우기 <span className="text-ink-faint">(캐릭터 다이컷)</span>
                </span>
                <button
                  onClick={() => setCutout((v) => !v)}
                  disabled={busy}
                  role="switch"
                  aria-checked={cutout}
                  className={
                    "relative w-11 h-6 rounded-full transition disabled:opacity-50 " +
                    (cutout ? "bg-primary" : "bg-ink-faint/40")
                  }
                >
                  <span
                    className={
                      "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all " +
                      (cutout ? "left-[22px]" : "left-0.5")
                    }
                  />
                </button>
              </label>
            </Card>

            {/* 직접 문구 */}
            <Card className="mb-4">
              <p className="text-sm font-semibold text-ink mb-2">
                ✏️ 직접 문구로 만들기
              </p>
              <div className="flex gap-2 mb-2">
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.slice(0, 8))}
                  placeholder="예: 우리 아기 (최대 8자)"
                  className="flex-1 rounded-xl border border-primary-soft px-3 py-2.5 text-sm focus:border-primary outline-none"
                />
                <Button onClick={makeCustom} disabled={!custom.trim() || !base}>
                  만들기
                </Button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {EMOJI_CHOICES.map((em) => (
                  <button
                    key={em}
                    onClick={() => setCustomEmoji(em)}
                    className={
                      "w-9 h-9 rounded-lg text-lg transition " +
                      (customEmoji === em
                        ? "bg-primary-soft ring-2 ring-primary"
                        : "bg-cream")
                    }
                  >
                    {em}
                  </button>
                ))}
              </div>
            </Card>

            {err && (
              <p className="text-sm text-primary-dark bg-primary-soft rounded-xl px-3 py-2 mb-3">
                {err}
              </p>
            )}
            {msg && <p className="text-xs text-ink-soft mb-3">{msg}</p>}

            {phase === "prep" && stickers.length === 0 ? (
              <Loading label="배경을 지우고 만화로 그리는 중..." />
            ) : (
              <div className="relative">
                {busy && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-cream/60 rounded-2xl">
                    <Loading label="다시 그리는 중..." />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {all.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSelected(s)}
                      className="rounded-2xl bg-white shadow-card p-1.5 active:scale-95 transition"
                      aria-label={`${s.caption} 스티커 열기`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.url}
                        alt={`${s.caption} 스티커`}
                        className="w-full aspect-square object-contain"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-ink-faint mt-4 leading-relaxed">
              스티커를 누르면 저장하거나 공유할 수 있어요. 저장한 PNG를
              카카오톡·메시지의 사진 첨부로 보내면 이모티콘처럼 쓸 수 있어요.
            </p>
          </>
        )}
      </div>

      {/* 미리보기 시트 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 체크무늬 배경으로 투명 다이컷을 보여줌 */}
            <div
              className="w-56 h-56 mx-auto mb-4 rounded-2xl"
              style={{
                backgroundColor: "#f4efe9",
                backgroundImage:
                  "linear-gradient(45deg,#e7ddd2 25%,transparent 25%),linear-gradient(-45deg,#e7ddd2 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e7ddd2 75%),linear-gradient(-45deg,transparent 75%,#e7ddd2 75%)",
                backgroundSize: "16px 16px",
                backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.url}
                alt={`${selected.caption} 스티커 미리보기`}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button full onClick={() => download(selected)}>
                💾 저장
              </Button>
              <Button variant="secondary" full onClick={() => share(selected)}>
                📤 공유
              </Button>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full text-sm text-ink-faint mt-3"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

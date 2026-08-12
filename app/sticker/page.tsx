"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChild } from "@/lib/useStore";
import { fileToResizedDataUrl } from "@/lib/image";
import {
  STICKER_PRESETS,
  StickerPreset,
  renderSticker,
} from "@/lib/sticker";
import { PageHeader, Card, Button, Loading, EmptyState } from "@/components/ui";

interface Made {
  key: string;
  caption: string;
  url: string;
}

export default function StickerPage() {
  const router = useRouter();
  const { child, ready } = useChild();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [stickers, setStickers] = useState<Made[]>([]);
  const [rendering, setRendering] = useState(false);
  const [selected, setSelected] = useState<Made | null>(null);
  const [custom, setCustom] = useState("");
  const [customEmoji, setCustomEmoji] = useState("💛");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // 초기 사진: 아이 프로필 사진
  useEffect(() => {
    if (child?.photo) setPhoto(child.photo);
  }, [child]);

  // 사진이 준비되면 프리셋 스티커 일괄 렌더 (경쟁 방지 토큰)
  useEffect(() => {
    if (!photo) {
      setStickers([]);
      return;
    }
    let alive = true;
    setRendering(true);
    setErr("");
    Promise.all(
      STICKER_PRESETS.map(async (p: StickerPreset) => ({
        key: p.id,
        caption: p.caption,
        url: await renderSticker(photo, p),
      }))
    )
      .then((made) => {
        if (alive) setStickers(made);
      })
      .catch(() => alive && setErr("스티커를 만들지 못했어요."))
      .finally(() => alive && setRendering(false));
    return () => {
      alive = false;
    };
  }, [photo]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      // 스티커 화질을 위해 512px로
      const url = await fileToResizedDataUrl(file, 512);
      setPhoto(url);
      setMsg("사진을 바꿨어요.");
    } catch (er) {
      setErr(er instanceof Error ? er.message : "사진을 불러오지 못했어요.");
    }
  }

  async function makeCustom() {
    const caption = custom.trim();
    if (!photo || !caption) return;
    try {
      const url = await renderSticker(photo, {
        id: `custom-${caption}`,
        caption,
        emoji: customEmoji,
        color: "#F5883E",
      });
      setStickers((prev) => [
        { key: `custom-${caption}-${prev.length}`, caption, url },
        ...prev,
      ]);
      setCustom("");
    } catch {
      setErr("스티커를 만들지 못했어요.");
    }
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
      download(s); // 공유 미지원 → 저장으로 폴백
    } catch {
      /* 사용자가 공유 취소 */
    }
  }

  if (!ready) return <Loading />;
  if (!child) {
    router.replace("/onboarding");
    return <Loading />;
  }

  const EMOJI_CHOICES = ["💛", "😄", "😍", "🥰", "😆", "🤗", "😎", "🌟"];

  return (
    <div>
      <PageHeader
        title="이모티콘 만들기"
        subtitle={`${child.name} 사진으로 스티커를 만들어요`}
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
            🔒 사진은 이 기기 안에서만 처리돼요. 서버나 AI로 전송되지 않아요.
          </p>
        </Card>

        {!photo ? (
          <EmptyState
            emoji="🎨"
            title="사진을 먼저 골라주세요"
            description="아이 사진을 선택하면 다양한 표정 스티커를 만들어드려요."
            action={
              <Button onClick={() => fileRef.current?.click()}>사진 선택</Button>
            }
          />
        ) : (
          <>
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
                <Button onClick={makeCustom} disabled={!custom.trim()}>
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

            {rendering && stickers.length === 0 ? (
              <Loading label="스티커를 만드는 중..." />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {stickers.map((s) => (
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.url}
              alt={`${selected.caption} 스티커 미리보기`}
              className="w-56 h-56 mx-auto object-contain mb-4"
            />
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

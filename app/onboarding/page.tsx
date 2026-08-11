"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveChild, getChild, addChild } from "@/lib/storage";
import { Child, Gender, PERSONALITY_OPTIONS, Personality } from "@/lib/types";
import { uid, ageInMonths } from "@/lib/utils";
import { fileToResizedDataUrl } from "@/lib/image";
import { Button, Card, OptionButton } from "@/components/ui";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "boy", label: "남아" },
  { value: "girl", label: "여아" },
  { value: "other", label: "선택 안 함" },
];

export default function OnboardingPage() {
  const router = useRouter();
  // ?mode=add 이면 새 아이 추가(프리필 없음), 아니면 활성 아이 수정
  const isAddMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "add";
  const existing =
    !isAddMode && typeof window !== "undefined" ? getChild() : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [birthDate, setBirthDate] = useState(existing?.birthDate ?? "");
  const [gender, setGender] = useState<Gender>(existing?.gender ?? "other");
  const [likes, setLikes] = useState(existing?.likes ?? "");
  const [dislikes, setDislikes] = useState(existing?.dislikes ?? "");
  const [personality, setPersonality] = useState<Personality[]>(
    existing?.personality ?? []
  );
  const [concerns, setConcerns] = useState(existing?.concerns ?? "");
  const [photo, setPhoto] = useState<string | undefined>(existing?.photo);
  const [error, setError] = useState("");
  const [forceAllow, setForceAllow] = useState(false);
  const isEdit = !!existing;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function togglePersonality(p: Personality) {
    setPersonality((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능하도록 초기화
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setPhoto(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 불러오지 못했어요.");
    }
  }

  function submit() {
    if (!name.trim()) return setError("아이 이름을 알려주세요.");
    if (!birthDate) return setError("생년월일을 알려주세요.");

    const months = ageInMonths(birthDate);
    if (months < 12 || months > 60) {
      // MVP 권장 범위는 24~48개월. 벗어나도 막지는 않고 안내만.
      setError(
        "이 앱은 24~48개월 아이에게 맞춰져 있어요. 그래도 계속하려면 한 번 더 눌러주세요."
      );
      // 두 번째 클릭에서 통과시키기 위한 플래그
      setForceAllow(true);
      if (!forceAllow) return;
    }

    const child: Child = {
      id: existing?.id ?? uid(),
      name: name.trim(),
      birthDate,
      gender,
      likes: likes.trim(),
      dislikes: dislikes.trim(),
      personality,
      concerns: concerns.trim(),
      photo,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    if (isAddMode) addChild(child);
    else saveChild(child);
    router.replace(isEdit ? "/profile" : "/");
  }

  return (
    <div className="px-5 py-8">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">
          {isEdit ? "✏️" : isAddMode ? "➕" : "👋"}
        </div>
        <h1 className="text-2xl font-extrabold text-ink">
          {isEdit
            ? "프로필 수정"
            : isAddMode
              ? "새 아이 추가"
              : "아이 정보를 알려주세요"}
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          알려주실수록 더 꼭 맞는 놀이와 조언을 드릴 수 있어요.
          {!isEdit && !isAddMode && (
            <>
              <br />
              가입 없이 바로 시작해요.
            </>
          )}
        </p>
      </div>

      <div className="space-y-4">
        {/* 프로필 사진 (선택) */}
        <div className="flex flex-col items-center gap-2 py-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden bg-primary-soft flex items-center justify-center active:scale-[0.98] transition"
            aria-label="아이 사진 추가"
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt="아이 사진 미리보기"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl">👶</span>
            )}
            <span className="absolute bottom-0 inset-x-0 bg-black/35 text-white text-[11px] py-0.5">
              📷 사진
            </span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-primary"
          >
            {photo ? "사진 변경" : "사진 추가하기 (선택)"}
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => setPhoto(undefined)}
              className="text-xs text-ink-faint"
            >
              사진 제거
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPickPhoto}
            className="hidden"
          />
        </div>

        <Card>
          <label className="block text-sm font-semibold text-ink mb-1.5">
            아이 이름 <span className="text-primary">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 유안"
            autoComplete="off"
            className="w-full rounded-xl border border-primary-soft px-3 py-2.5 text-sm focus:border-primary outline-none"
          />
        </Card>

        <Card>
          <label className="block text-sm font-semibold text-ink mb-1.5">
            생년월일 <span className="text-primary">*</span>
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            autoComplete="off"
            className="w-full rounded-xl border border-primary-soft px-3 py-2.5 text-sm focus:border-primary outline-none"
          />
          <p className="text-xs text-ink-faint mt-1">권장 연령: 24~48개월</p>
        </Card>

        <Card>
          <span className="block text-sm font-semibold text-ink mb-2">성별</span>
          <div className="grid grid-cols-3 gap-2">
            {GENDERS.map((g) => (
              <OptionButton
                key={g.value}
                selected={gender === g.value}
                onClick={() => setGender(g.value)}
                className="text-center py-2.5"
              >
                {g.label}
              </OptionButton>
            ))}
          </div>
        </Card>

        <Card>
          <label className="block text-sm font-semibold text-ink mb-1.5">
            좋아하는 것
          </label>
          <input
            value={likes}
            onChange={(e) => setLikes(e.target.value)}
            placeholder="예: 공룡, 자동차, 물놀이"
            autoComplete="off"
            className="w-full rounded-xl border border-primary-soft px-3 py-2.5 text-sm focus:border-primary outline-none"
          />
        </Card>

        <Card>
          <label className="block text-sm font-semibold text-ink mb-1.5">
            싫어하는 것
          </label>
          <input
            value={dislikes}
            onChange={(e) => setDislikes(e.target.value)}
            placeholder="예: 큰 소리, 낯선 사람"
            autoComplete="off"
            className="w-full rounded-xl border border-primary-soft px-3 py-2.5 text-sm focus:border-primary outline-none"
          />
        </Card>

        <Card>
          <span className="block text-sm font-semibold text-ink mb-2">
            아이의 성향 <span className="text-ink-faint font-normal">(복수 선택)</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            {PERSONALITY_OPTIONS.map((p) => (
              <OptionButton
                key={p}
                selected={personality.includes(p)}
                onClick={() => togglePersonality(p)}
                className="text-center py-2.5 text-xs"
              >
                {p}
              </OptionButton>
            ))}
          </div>
        </Card>

        <Card>
          <label className="block text-sm font-semibold text-ink mb-1.5">
            요즘 가장 고민되는 부분
          </label>
          <textarea
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            rows={3}
            placeholder="예: 밥을 잘 안 먹어요 / 떼를 자주 써요"
            autoComplete="off"
            className="w-full rounded-xl border border-primary-soft px-3 py-2.5 text-sm focus:border-primary outline-none resize-none"
          />
        </Card>

        {error && (
          <p className="text-sm text-primary-dark bg-primary-soft rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <Button size="lg" full onClick={submit}>
          {isEdit ? "저장하기" : isAddMode ? "아이 추가하기" : "시작하기 →"}
        </Button>
      </div>
    </div>
  );
}

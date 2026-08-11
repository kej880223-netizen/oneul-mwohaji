"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveChild, getChild } from "@/lib/storage";
import { Child, Gender, PERSONALITY_OPTIONS, Personality } from "@/lib/types";
import { uid, ageInMonths } from "@/lib/utils";
import { Button, Card, OptionButton } from "@/components/ui";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "boy", label: "남아" },
  { value: "girl", label: "여아" },
  { value: "other", label: "선택 안 함" },
];

export default function OnboardingPage() {
  const router = useRouter();
  // 기존 프로필이 있으면 수정 모드로 값 프리필
  const existing = typeof window !== "undefined" ? getChild() : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [birthDate, setBirthDate] = useState(existing?.birthDate ?? "");
  const [gender, setGender] = useState<Gender>(existing?.gender ?? "other");
  const [likes, setLikes] = useState(existing?.likes ?? "");
  const [dislikes, setDislikes] = useState(existing?.dislikes ?? "");
  const [personality, setPersonality] = useState<Personality[]>(
    existing?.personality ?? []
  );
  const [concerns, setConcerns] = useState(existing?.concerns ?? "");
  const [error, setError] = useState("");
  const [forceAllow, setForceAllow] = useState(false);
  const isEdit = !!existing;

  function togglePersonality(p: Personality) {
    setPersonality((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
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
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    saveChild(child);
    router.replace(isEdit ? "/profile" : "/");
  }

  return (
    <div className="px-5 py-8">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">{isEdit ? "✏️" : "👋"}</div>
        <h1 className="text-2xl font-extrabold text-ink">
          {isEdit ? "프로필 수정" : "아이 정보를 알려주세요"}
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          알려주실수록 더 꼭 맞는 놀이와 조언을 드릴 수 있어요.
          {!isEdit && (
            <>
              <br />
              가입 없이 바로 시작해요.
            </>
          )}
        </p>
      </div>

      <div className="space-y-4">
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
          {isEdit ? "저장하기" : "시작하기 →"}
        </Button>
      </div>
    </div>
  );
}

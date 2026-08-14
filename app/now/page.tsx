"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireChild, useActivityLogs } from "@/lib/useStore";
import { requestNow } from "@/lib/ai/client";
import { addQuestion } from "@/lib/storage";
import { getAuthor } from "@/lib/identity";
import { SituationAdvice, ParentingQuestion } from "@/lib/types";
import { SITUATIONS } from "@/lib/constants";
import { uid } from "@/lib/utils";
import { useSpeechRecognition } from "@/lib/useSpeech";
import {
  Button,
  Card,
  PageHeader,
  Loading,
  ErrorState,
} from "@/components/ui";
import { SafetyNotice, Disclaimer } from "@/components/Notices";
import SpeakButton from "@/components/SpeakButton";

type Step = "pick" | "input" | "loading" | "result" | "error";

export default function NowPage() {
  const router = useRouter();
  const { child, ready } = useRequireChild();
  const { logs } = useActivityLogs();

  const [step, setStep] = useState<Step>("pick");
  const [category, setCategory] = useState("기타");
  const [customText, setCustomText] = useState("");
  const [thread, setThread] = useState<
    { question: string; advice: SituationAdvice }[]
  >([]);
  const [followUp, setFollowUp] = useState("");
  const [sending, setSending] = useState(false);
  const [lastQ, setLastQ] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const speech = useSpeechRecognition();

  const adviceToSpeech = (a: SituationAdvice) =>
    [
      "먼저,",
      a.firstStep,
      "이렇게 말해보세요.",
      a.sayThis,
      "지금은 피해주세요.",
      a.avoidThis,
      "왜 그럴까요?",
      a.why,
      "그다음.",
      a.afterwards,
    ].join(" ");

  if (!ready || !child) return <Loading />;

  async function ask(cat: string, q: string) {
    if (!child) return;
    setCategory(cat);
    setLastQ(q);
    setStep("loading");
    setSaved(false);
    setNote("");
    setFollowUp("");
    setThread([]);
    try {
      const res = await requestNow(child, cat, q, logs.slice(0, 10), []);
      setThread([{ question: q, advice: res }]);
      setStep("result");
    } catch {
      setStep("error");
    }
  }

  async function askFollowUp() {
    const q = followUp.trim();
    if (!q || !child || sending) return;
    setFollowUp("");
    setSending(true);
    try {
      const res = await requestNow(child, category, q, logs.slice(0, 10), thread);
      setThread((prev) => [...prev, { question: q, advice: res }]);
    } catch {
      /* 유지 */
    } finally {
      setSending(false);
    }
  }

  function saveRecord() {
    if (!child || !thread.length) return;
    const first = thread[0];
    const last = thread[thread.length - 1];
    const q: ParentingQuestion = {
      id: uid(),
      childId: child.id,
      category,
      question: first.question,
      aiResponse: last.advice,
      note: note.trim(),
      createdBy: getAuthor() ?? undefined,
      createdAt: new Date().toISOString(),
    };
    addQuestion(q);
    setSaved(true);
  }

  // ─── 결과 화면 (대화형) ──────────────────────
  if (step === "result" && thread.length) {
    return (
      <div>
        <PageHeader
          title="지금 어떡하지?"
          subtitle={thread[0].question}
          onBack={() => setStep("pick")}
        />
        <div className="px-5 space-y-4 pb-6">
          {thread.map((turn, idx) => (
            <div key={idx} className="space-y-3">
              {idx > 0 && (
                <p className="text-sm font-semibold text-ink bg-primary-soft rounded-xl px-3 py-2">
                  💬 {turn.question}
                </p>
              )}
              {turn.advice.safetyNotice && (
                <SafetyNotice message={turn.advice.safetyNotice} />
              )}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">{turn.advice.title}</h2>
                <SpeakButton text={adviceToSpeech(turn.advice)} label="읽어주기" />
              </div>
              <AdviceItem n="1" title="먼저" body={turn.advice.firstStep} />
              <AdviceItem
                n="2"
                title="이렇게 말해보세요"
                body={turn.advice.sayThis}
                highlight
              />
              <AdviceItem
                n="3"
                title="지금은 피해주세요"
                body={turn.advice.avoidThis}
              />
              <AdviceItem n="4" title="왜 그럴까요?" body={turn.advice.why} />
              <AdviceItem n="5" title="그다음" body={turn.advice.afterwards} />
            </div>
          ))}

          {sending && <Loading label="이어서 방법을 찾는 중..." />}

          {/* 이어서 물어보기 (대화형 후속질문) */}
          <Card>
            <p className="text-sm font-semibold text-ink mb-2">
              💬 해봐도 안 되나요? 이어서 물어보세요
            </p>
            <textarea
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              rows={2}
              placeholder="예: 그래도 계속 울어요 / 그건 이미 해봤어요"
              className="w-full rounded-xl border border-primary-soft px-3 py-2.5 text-sm focus:border-primary outline-none resize-none mb-2"
            />
            <div className="flex gap-2">
              {speech.supported && (
                <button
                  type="button"
                  onClick={() =>
                    speech.listening
                      ? speech.stop()
                      : speech.start((t) =>
                          setFollowUp((prev) => (prev ? prev + " " : "") + t)
                        )
                  }
                  className={
                    "shrink-0 rounded-xl px-3 text-sm font-semibold transition " +
                    (speech.listening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-primary-soft text-primary-dark")
                  }
                >
                  {speech.listening ? "🔴" : "🎤"}
                </button>
              )}
              <Button
                full
                disabled={!followUp.trim() || sending}
                onClick={askFollowUp}
              >
                이어서 물어보기
              </Button>
            </div>
          </Card>

          {/* 기록 */}
          {!saved ? (
            <Card className="mt-2">
              <p className="text-sm font-semibold text-ink mb-2">
                기록해둘까요?
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="메모 (선택) · 예: 밖에서 떼쓸 때 효과 있었음"
                className="w-full rounded-xl border border-primary-soft px-3 py-2.5 text-sm focus:border-primary outline-none resize-none mb-2"
              />
              <div className="flex gap-2">
                <Button full onClick={saveRecord}>
                  기록 저장
                </Button>
                <Button variant="secondary" full onClick={() => setStep("pick")}>
                  다른 상황
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="bg-accent-soft text-center">
              <p className="text-sm text-ink">✅ 기록에 저장했어요.</p>
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" full onClick={() => setStep("pick")}>
                  다른 상황
                </Button>
                <Button full onClick={() => router.push("/records")}>
                  기록 보기
                </Button>
              </div>
            </Card>
          )}

          <div className="pt-2">
            <Disclaimer />
          </div>
        </div>
      </div>
    );
  }

  if (step === "loading")
    return <Loading label="지금 상황에 맞는 방법을 찾는 중..." />;

  if (step === "error")
    return (
      <ErrorState
        message="답변을 불러오지 못했어요. 다시 시도해주세요."
        onRetry={() => ask(category, lastQ)}
      />
    );

  // ─── 직접 입력 화면 ───────────────────────────
  if (step === "input") {
    return (
      <div>
        <PageHeader
          title="상황을 알려주세요"
          subtitle="지금 어떤 일이 있나요?"
          onBack={() => setStep("pick")}
        />
        <div className="px-5 space-y-4">
          <Card>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={4}
              autoFocus
              placeholder="예: 마트에서 장난감 사달라고 바닥에 누워서 울어요"
              className="w-full rounded-xl border border-primary-soft px-3 py-2.5 text-sm focus:border-primary outline-none resize-none"
            />
            {speech.supported && (
              <button
                type="button"
                onClick={() =>
                  speech.listening
                    ? speech.stop()
                    : speech.start((t) =>
                        setCustomText((prev) => (prev ? prev + " " : "") + t)
                      )
                }
                className={
                  "mt-2 inline-flex items-center gap-1.5 text-sm font-semibold rounded-full px-3.5 py-2 transition " +
                  (speech.listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-primary-soft text-primary-dark")
                }
              >
                {speech.listening ? "🔴 듣는 중... (탭하면 중지)" : "🎤 말로 입력하기"}
              </button>
            )}
          </Card>
          <Button
            size="lg"
            full
            disabled={!customText.trim()}
            onClick={() => ask("기타", customText.trim())}
          >
            해결 방법 물어보기
          </Button>
        </div>
      </div>
    );
  }

  // ─── 상황 선택 화면 ───────────────────────────
  return (
    <div className="pb-8">
      <PageHeader
        title="지금 어떡하지?"
        subtitle="지금 겪고 있는 상황을 골라주세요"
        onBack={() => router.push("/")}
      />
      <div className="px-5">
        <div className="grid grid-cols-2 gap-2.5">
          {SITUATIONS.map((s) => (
            <button
              key={s.category}
              onClick={() => ask(s.category, s.label)}
              className="rounded-2xl bg-white shadow-card p-4 text-left active:scale-[0.98] transition hover:shadow-soft"
            >
              <div className="text-2xl mb-1.5" aria-hidden>
                {s.emoji}
              </div>
              <div className="text-sm font-semibold text-ink leading-snug">
                {s.label}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setStep("input")}
          className="mt-3 w-full rounded-2xl border-2 border-dashed border-primary-soft p-4 text-sm font-semibold text-primary-dark active:scale-[0.99] transition hover:bg-primary-soft/30"
        >
          ✏️ 직접 입력하기
        </button>
      </div>
    </div>
  );
}

function AdviceItem({
  n,
  title,
  body,
  highlight,
}: {
  n: string;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "bg-accent-soft animate-fade-up" : "animate-fade-up"}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
          {n}
        </span>
        <h2 className="text-sm font-bold text-ink">{title}</h2>
      </div>
      <p className="text-sm text-ink leading-relaxed pl-8">{body}</p>
    </Card>
  );
}

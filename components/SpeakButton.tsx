"use client";

import { useEffect, useState } from "react";
import { speak, stopSpeaking, speechSupported } from "@/lib/useSpeech";
import { cx } from "@/lib/utils";

// 텍스트를 소리로 읽어주는 토글 버튼(TTS). 미지원 브라우저에서는 렌더되지 않음.
export default function SpeakButton({
  text,
  label = "읽어주기",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => stopSpeaking();
  }, []);

  if (!mounted || !speechSupported()) return null;

  function toggle() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      const ok = speak(text, { onEnd: () => setSpeaking(false) });
      setSpeaking(ok);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className={cx(
        "inline-flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1.5 transition",
        speaking
          ? "bg-primary text-white"
          : "bg-white text-primary border border-primary-soft",
        className
      )}
    >
      {speaking ? "⏹ 멈춤" : `🔊 ${label}`}
    </button>
  );
}

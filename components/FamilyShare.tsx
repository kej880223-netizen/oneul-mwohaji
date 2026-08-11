"use client";

import { useEffect, useState } from "react";
import {
  getFamilyCode,
  setFamilyCode,
  generateFamilyCode,
  pushToCloud,
  pullAndMerge,
  syncOnce,
} from "@/lib/share";
import { Card, Button } from "./ui";

export default function FamilyShare() {
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [join, setJoin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [memoryWarn, setMemoryWarn] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCode(getFamilyCode());
  }, []);

  if (!mounted) return null;

  function noteSource(source: string) {
    setMemoryWarn(source === "memory");
  }

  async function startShare() {
    setBusy(true);
    setMsg("");
    try {
      const c = generateFamilyCode();
      const { source } = await pushToCloud(c);
      setFamilyCode(c);
      setCode(c);
      noteSource(source);
      setMsg("가족 코드를 만들었어요. 배우자에게 코드를 알려주세요!");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "시작하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function joinShare() {
    const c = join.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) {
      setMsg("6자리 코드를 정확히 입력해주세요.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const pulled = await pullAndMerge(c);
      noteSource(pulled.source);
      await pushToCloud(c);
      setFamilyCode(c);
      setCode(c);
      setJoin("");
      setMsg(
        pulled.empty
          ? "이 코드에 아직 데이터가 없어요. 이제부터 공유돼요."
          : "배우자의 데이터를 불러왔어요! 이제부터 함께 쌓여요."
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "참여하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    if (!code) return;
    setBusy(true);
    setMsg("");
    try {
      const { source } = await syncOnce(code);
      noteSource(source);
      setMsg("동기화했어요.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "동기화 실패");
    } finally {
      setBusy(false);
    }
  }

  function stopShare() {
    if (window.confirm("공유를 중단할까요? 지금까지의 데이터는 이 기기에 그대로 남아요.")) {
      setFamilyCode(null);
      setCode(null);
      setMsg("");
    }
  }

  function copyCode() {
    if (code) navigator.clipboard?.writeText(code).then(() => setMsg("코드를 복사했어요."));
  }

  // ─── 공유 중 ────────────────────────────────
  if (code) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink mb-1">💞 부부 공유 중</p>
        <p className="text-xs text-ink-faint mb-3">
          아래 코드를 배우자가 입력하면 같은 데이터를 함께 봐요.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl font-extrabold tracking-widest text-primary bg-primary-soft rounded-xl px-4 py-2">
            {code}
          </span>
          <Button variant="secondary" onClick={copyCode}>
            복사
          </Button>
        </div>
        <div className="flex gap-2">
          <Button full onClick={syncNow} disabled={busy}>
            {busy ? "동기화 중..." : "🔄 지금 동기화"}
          </Button>
          <Button variant="secondary" onClick={stopShare} disabled={busy}>
            공유 중단
          </Button>
        </div>
        {memoryWarn && (
          <p className="text-[11px] text-primary-dark mt-3 leading-relaxed">
            ⚠️ 공유 서버(KV)가 아직 배포에 연결되지 않았어요. 실제로 두 기기에서
            함께 쓰려면 Vercel에 무료 KV 연결이 필요해요.
          </p>
        )}
        {msg && <p className="text-xs text-ink-soft mt-2">{msg}</p>}
        <p className="text-[11px] text-ink-faint mt-3 leading-relaxed">
          ※ 서로의 기록·즐겨찾기·아이 프로필이 합쳐져요. (현재는 '삭제'는 서로
          전파되지 않아요.)
        </p>
      </Card>
    );
  }

  // ─── 공유 시작 전 ───────────────────────────
  return (
    <Card>
      <p className="text-sm font-semibold text-ink mb-1">💞 부부 공유</p>
      <p className="text-xs text-ink-faint mb-3">
        배우자와 같은 아이 기록을 함께 보고 쌓을 수 있어요.
      </p>
      <Button full onClick={startShare} disabled={busy}>
        {busy ? "준비 중..." : "가족 코드 만들기"}
      </Button>

      <div className="flex items-center gap-2 my-3">
        <div className="flex-1 h-px bg-primary-soft" />
        <span className="text-xs text-ink-faint">또는 코드로 참여</span>
        <div className="flex-1 h-px bg-primary-soft" />
      </div>

      <div className="flex gap-2">
        <input
          value={join}
          onChange={(e) => setJoin(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="가족 코드 6자리"
          className="flex-1 rounded-xl border border-primary-soft px-3 py-2.5 text-sm tracking-widest uppercase focus:border-primary outline-none"
        />
        <Button variant="secondary" onClick={joinShare} disabled={busy}>
          참여
        </Button>
      </div>

      {msg && <p className="text-xs text-ink-soft mt-2">{msg}</p>}
    </Card>
  );
}

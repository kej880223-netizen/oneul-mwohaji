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
import { getRole, setProfile, ROLE_META, ROLE_OPTIONS } from "@/lib/identity";
import { markSelfLeft, clearMembers } from "@/lib/members";
import { CaregiverRole } from "@/lib/types";
import { Card, Button } from "./ui";
import FamilyMembers from "./FamilyMembers";

export default function FamilyShare() {
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [join, setJoin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [memoryWarn, setMemoryWarn] = useState(false);
  // 배경(30초) 자동 동기화가 최근 실패했는지 — 조용히 멈춘 상태를 알린다.
  const [syncWarn, setSyncWarn] = useState(false);
  const [role, setRole] = useState<CaregiverRole | null>(null);

  useEffect(() => {
    setMounted(true);
    const existing = getFamilyCode();
    setCode(existing);
    setRole(getRole());
    // 초대 링크(?join=코드)로 들어온 경우: 아직 공유 중이 아니면 코드 자동 입력
    if (!existing) {
      try {
        const q = new URLSearchParams(window.location.search)
          .get("join")
          ?.toUpperCase();
        if (q && /^[A-Z0-9]{6}$/.test(q)) {
          setJoin(q);
          setMsg("초대 코드가 입력됐어요. ‘참여’를 누르면 함께 쓰기 시작해요.");
        }
      } catch {
        /* noop */
      }
    }

    // 배경 자동 동기화 성공/실패 신호를 구독해 표시(FamilySync가 발화).
    const onOk = () => setSyncWarn(false);
    const onFail = () => setSyncWarn(true);
    window.addEventListener("omh:sync-ok", onOk);
    window.addEventListener("omh:sync-fail", onFail);
    return () => {
      window.removeEventListener("omh:sync-ok", onOk);
      window.removeEventListener("omh:sync-fail", onFail);
    };
  }, []);

  if (!mounted) return null;

  function pickRole(r: CaregiverRole) {
    setProfile(r);
    setRole(r);
  }

  // "나는 누구?" 선택 — 기록에 작성자로 붙어 배우자 기기에서 구분돼 보인다.
  const roleSelector = (
    <div className="mb-3">
      <p className="text-xs text-ink-faint mb-1.5">나는 아이의…</p>
      <div className="flex gap-2">
        {ROLE_OPTIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => pickRole(r)}
            className={
              "flex-1 rounded-xl border px-2 py-1.5 text-xs font-semibold transition " +
              (role === r
                ? "border-primary bg-primary-soft text-primary-dark"
                : "border-primary-soft text-ink-soft")
            }
          >
            {ROLE_META[r].emoji} {ROLE_META[r].label}
          </button>
        ))}
      </div>
    </div>
  );

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
      const { source, trimmed } = await syncOnce(code);
      noteSource(source);
      setSyncWarn(false); // 수동 동기화 성공 → 실패 표시 해제
      setMsg(
        trimmed > 0
          ? `동기화했어요. 다만 저장 공간 한계로 사진 ${trimmed}장은 이 기기에만 남았어요(기록은 모두 공유돼요).`
          : "동기화했어요."
      );
    } catch (e) {
      setSyncWarn(true);
      setMsg(e instanceof Error ? e.message : "동기화 실패");
    } finally {
      setBusy(false);
    }
  }

  async function stopShare() {
    if (!code) return;
    if (
      !window.confirm(
        "공유를 나갈까요? 지금까지의 데이터는 이 기기에 그대로 남고, 배우자에게는 '나감'으로 표시돼요."
      )
    )
      return;
    setBusy(true);
    try {
      // 배우자 기기에서 '나감'이 보이도록 마지막으로 한 번 알리고 정리
      markSelfLeft();
      await pushToCloud(code, { register: false }).catch(() => {});
    } finally {
      clearMembers();
      setFamilyCode(null);
      setCode(null);
      setMsg("");
      setBusy(false);
    }
  }

  function copyCode() {
    if (code) navigator.clipboard?.writeText(code).then(() => setMsg("코드를 복사했어요."));
  }

  function inviteUrl(c: string): string {
    return `${window.location.origin}/profile?join=${c}`;
  }

  // 초대 링크 공유 — 모바일이면 네이티브 공유 시트, 아니면 링크 복사.
  async function shareInvite() {
    if (!code) return;
    const url = inviteUrl(code);
    const text = `우리 아이 육아 기록을 함께 써요 💞\n앱에서 초대 코드 ${code} 를 입력하거나 아래 링크로 참여하세요.`;
    const nav = navigator as Navigator & {
      share?: (d: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "오늘 뭐하지 · 부부 공유 초대", text, url });
      } catch {
        /* 사용자가 공유 시트를 닫음 — 조용히 종료 */
      }
      return;
    }
    try {
      await nav.clipboard?.writeText(url);
      setMsg("초대 링크를 복사했어요. 배우자에게 붙여넣어 보내주세요.");
    } catch {
      setMsg(`초대 링크: ${url}`);
    }
  }

  // ─── 공유 중 ────────────────────────────────
  if (code) {
    return (
      <Card>
        <p className="text-sm font-semibold text-ink mb-1">💞 부부 공유 중</p>
        <p className="text-xs text-ink-faint mb-3">
          아래 코드를 배우자가 입력하면 같은 데이터를 함께 봐요.
        </p>
        {roleSelector}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl font-extrabold tracking-widest text-primary bg-primary-soft rounded-xl px-4 py-2">
            {code}
          </span>
          <Button variant="secondary" onClick={copyCode}>
            복사
          </Button>
        </div>
        <Button full onClick={shareInvite} className="mb-3">
          📤 초대 링크 보내기
        </Button>
        <div className="flex gap-2">
          <Button full onClick={syncNow} disabled={busy}>
            {busy ? "동기화 중..." : "🔄 지금 동기화"}
          </Button>
          <Button variant="secondary" onClick={stopShare} disabled={busy}>
            나가기
          </Button>
        </div>

        <FamilyMembers />

        {syncWarn && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3 leading-relaxed">
            ⚠️ 최근 자동 동기화가 지연되고 있어요(네트워크 또는 용량 문제).
            연결되면 자동으로 다시 맞춰지고, ‘지금 동기화’로 바로 시도할 수 있어요.
          </p>
        )}
        {memoryWarn && (
          <p className="text-[11px] text-primary-dark mt-3 leading-relaxed">
            ⚠️ 공유 서버(KV)가 아직 배포에 연결되지 않았어요. 실제로 두 기기에서
            함께 쓰려면 Vercel에 무료 KV 연결이 필요해요.
          </p>
        )}
        {msg && <p className="text-xs text-ink-soft mt-2">{msg}</p>}
        <p className="text-[11px] text-ink-faint mt-3 leading-relaxed">
          ※ 서로의 기록·즐겨찾기·아이 프로필이 합쳐지고, 한쪽에서 지운 항목은
          동기화 시 양쪽에서 함께 사라져요.
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
      {roleSelector}
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

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────
//  부부 공유 저장소 (가족 코드 기반)
//  Vercel KV / Upstash Redis(REST) 사용. 미설정 시 인메모리 폴백은
//  개발 환경에서만 허용하고, 프로덕션에서는 503으로 거절(가짜 공유 방지).
// ─────────────────────────────────────────────────────────

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TTL = 60 * 60 * 24 * 180; // 180일
const kvReady = !!(KV_URL && KV_TOKEN);

// 인메모리 폴백은 개발/로컬에서만 허용. 프로덕션에서 KV 없이 폴백하면
// 프로세스 재시작·다중 인스턴스에서 데이터가 조용히 사라져 "공유되는 척"만
// 하므로 차단한다. 부득이 프로덕션에서 허용하려면 ALLOW_MEMORY_SHARE=1.
const memoryAllowed =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_MEMORY_SHARE === "1";

// 인메모리 폴백(프로세스 재시작/다중 인스턴스에서는 유지 안 됨)
const g = globalThis as any;
if (!g.__omhShareMem) g.__omhShareMem = new Map<string, string>();
const mem: Map<string, string> = g.__omhShareMem;

async function kvCmd(args: (string | number)[]): Promise<any> {
  const res = await fetch(KV_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`kv ${res.status}`);
  return res.json();
}

async function storeGet(key: string): Promise<string | null> {
  if (kvReady) {
    const r = await kvCmd(["GET", key]);
    return (r?.result as string) ?? null;
  }
  return mem.get(key) ?? null;
}

async function storeSet(key: string, value: string): Promise<void> {
  if (kvReady) {
    await kvCmd(["SET", key, value, "EX", TTL]);
    return;
  }
  mem.set(key, value);
}

const CODE_RE = /^[A-Z0-9]{6}$/;

export async function POST(req: NextRequest) {
  try {
    const { action, code, blob, base, force } = await req.json();
    if (typeof code !== "string" || !CODE_RE.test(code)) {
      return NextResponse.json({ error: "유효하지 않은 코드예요." }, { status: 400 });
    }
    // 프로덕션에서 KV 미연결이면 공유가 실제로 유지되지 않으므로 명시적으로 거절.
    if (!kvReady && !memoryAllowed) {
      return NextResponse.json(
        {
          error:
            "공유 서버가 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요.",
          source: "unavailable",
        },
        { status: 503 }
      );
    }
    const key = `omh:fam:${code}`;
    const source = kvReady ? "kv" : "memory";

    if (action === "pull") {
      const raw = await storeGet(key);
      if (!raw) return NextResponse.json({ empty: true, source });
      const parsed = JSON.parse(raw);
      return NextResponse.json({
        blob: parsed.blob,
        updatedAt: parsed.updatedAt,
        source,
      });
    }

    if (action === "push") {
      // 낙관적 동시성(CAS): 클라가 마지막으로 본 버전(base)과 현재 저장본의
      // updatedAt이 다르면, 그 사이 상대가 먼저 올린 것이므로 덮어쓰지 않고
      // 최신본을 돌려준다(클라가 재병합 후 재시도). force=true면 강제 저장
      // (재시도 소진 시 교착 방지). GET→SET이 완전 원자적이진 않지만, 폴링
      // 주기(수십 초) 대비 서버측 경합창(수 ms)이 매우 좁아 실질적 유실을 막는다.
      if (!force) {
        const current = await storeGet(key);
        if (current) {
          let curUpdatedAt: number | undefined;
          try {
            curUpdatedAt = JSON.parse(current).updatedAt;
          } catch {
            curUpdatedAt = undefined;
          }
          const baseNum = typeof base === "number" ? base : null;
          if (curUpdatedAt !== undefined && curUpdatedAt !== baseNum) {
            const parsed = JSON.parse(current);
            return NextResponse.json({
              conflict: true,
              blob: parsed.blob,
              updatedAt: parsed.updatedAt,
              source,
            });
          }
        }
      }
      const now = Date.now();
      const value = JSON.stringify({ blob, updatedAt: now });
      if (value.length > 1_000_000) {
        return NextResponse.json(
          {
            error:
              "데이터가 너무 커요(사진 용량). 사진 일부를 줄이거나 나중에 다시 시도해주세요.",
          },
          { status: 413 }
        );
      }
      await storeSet(key, value);
      return NextResponse.json({ ok: true, updatedAt: now, source });
    }

    return NextResponse.json({ error: "알 수 없는 요청이에요." }, { status: 400 });
  } catch (e) {
    console.error("[api/share] error:", e);
    return NextResponse.json(
      { error: "공유 처리 중 오류가 발생했어요." },
      { status: 500 }
    );
  }
}

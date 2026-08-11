import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────
//  부부 공유 저장소 (가족 코드 기반)
//  Vercel KV / Upstash Redis(REST) 사용. 미설정 시 인메모리 폴백
//  (로컬/단일 인스턴스 전용 — 실제 기기 간 공유엔 KV 연결 필요).
// ─────────────────────────────────────────────────────────

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TTL = 60 * 60 * 24 * 180; // 180일
const kvReady = !!(KV_URL && KV_TOKEN);

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
    const { action, code, blob } = await req.json();
    if (typeof code !== "string" || !CODE_RE.test(code)) {
      return NextResponse.json({ error: "유효하지 않은 코드예요." }, { status: 400 });
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
      const value = JSON.stringify({ blob, updatedAt: Date.now() });
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
      return NextResponse.json({ ok: true, updatedAt: Date.now(), source });
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

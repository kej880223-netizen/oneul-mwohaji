// ─────────────────────────────────────────────────────────
//  날씨 (Open-Meteo) — 무료·API 키 불필요, 브라우저에서 직접 호출(CORS 허용)
//  현재 위치의 날씨로 실내/실외 놀이 적합도를 판단.
// ─────────────────────────────────────────────────────────

export interface Weather {
  tempC: number;
  code: number;
  emoji: string;
  label: string;
  outdoorOk: boolean; // 야외 놀기 적합 여부(날씨+기온)
  note: string;
}

// WMO weather_code → 이모지/라벨/야외적합
function describe(code: number): { emoji: string; label: string; fair: boolean } {
  if (code === 0) return { emoji: "☀️", label: "맑음", fair: true };
  if (code === 1 || code === 2) return { emoji: "🌤️", label: "구름 조금", fair: true };
  if (code === 3) return { emoji: "☁️", label: "흐림", fair: true };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "안개", fair: false };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "이슬비", fair: false };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "비", fair: false };
  if (code >= 71 && code <= 77) return { emoji: "🌨️", label: "눈", fair: false };
  if (code >= 80 && code <= 82) return { emoji: "🌧️", label: "소나기", fair: false };
  if (code === 85 || code === 86) return { emoji: "🌨️", label: "눈", fair: false };
  if (code >= 95) return { emoji: "⛈️", label: "뇌우", fair: false };
  return { emoji: "🌡️", label: "날씨", fair: true };
}

export async function fetchWeather(lat: number, lng: number): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const data = await res.json();

  const code = Number(data?.current?.weather_code ?? 0);
  const tempC = Math.round(Number(data?.current?.temperature_2m ?? 0));
  const { emoji, label, fair } = describe(code);

  // 영유아 기준 야외 적합: 날씨가 맑고 기온 5~30°C
  const tempOk = tempC >= 5 && tempC <= 30;
  const outdoorOk = fair && tempOk;

  let note: string;
  if (outdoorOk) note = "야외에서 놀기 좋은 날이에요!";
  else if (!fair) note = "오늘은 실내 놀이를 추천해요.";
  else if (tempC < 5) note = "쌀쌀해요. 짧게 나가거나 실내 놀이가 좋아요.";
  else note = "더워요. 시원한 실내 놀이가 좋아요.";

  return { tempC, code, emoji, label, outdoorOk, note };
}

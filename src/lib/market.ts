/**
 * لایهٔ دادهٔ بازار — CoinGecko (رایگان، بدون کلید، با CORS)
 * ------------------------------------------------------------------
 * - دادهٔ زندهٔ قیمت/حجم/مارکت‌کپ از simple/price
 * - سری‌های زمانی market_chart: روز=۳۰ (ساعتی) و روز=۳۶۵ (روزانه)
 * - ساخت کندل‌های OHLC واقعی ۴ساعته و روزانه از نقاط ساعتی/روزانه
 * - کش localStorage برای تاب‌آوری آفلاین + هش SHA-256 برای راستی‌آزمایی داده
 */
import { APP, PENGU } from "../config";
import type { Candle } from "./ta";

const CG = "https://api.coingecko.com/api/v3";

export interface MarketSnapshot {
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  ath: number;
  updatedAt: number;
}

export interface MarketBundle {
  snapshot: MarketSnapshot;
  candles4h: Candle[];
  candles1d: Candle[];
  dataHash: string;
  fetchedAt: number;
  stale?: boolean;
}

async function getJson<T>(url: string, timeoutMs = 14_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** ساخت کندل از نقاط [ts, value] با حجم همراه */
function buildCandles(
  prices: [number, number][],
  volumes: [number, number][],
  bucketMs: number,
): Candle[] {
  const volMap = new Map<number, number>();
  for (const [t, v] of volumes) {
    const key = Math.floor(t / bucketMs) * bucketMs;
    volMap.set(key, (volMap.get(key) ?? 0) + v);
  }
  const buckets = new Map<number, number[]>();
  for (const [t, p] of prices) {
    const key = Math.floor(t / bucketMs) * bucketMs;
    const arr = buckets.get(key);
    if (arr) arr.push(p);
    else buckets.set(key, [p]);
  }
  const out: Candle[] = [];
  for (const [t, arr] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    if (arr.length === 0) continue;
    out.push({
      t,
      o: arr[0],
      c: arr[arr.length - 1],
      h: Math.max(...arr),
      l: Math.min(...arr),
      v: volMap.get(t) ?? 0,
    });
  }
  return out;
}

async function sha256Short(input: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "--------";
  }
}

const CACHE_KEY = "pp:market:v1";

function readCache(): MarketBundle | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MarketBundle;
  } catch {
    return null;
  }
}

function writeCache(b: MarketBundle) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(b));
  } catch {
    /* حافظه پر — مهم نیست */
  }
}

/**
 * دریافت کامل دادهٔ بازار. اگر کش تازه باشد همان را برمی‌گرداند؛
 * در غیر این صورت از شبکه می‌گیرد و در خطا، کش کهنه را با پرچم stale می‌دهد.
 */
export async function fetchMarket(opts: { force?: boolean } = {}): Promise<MarketBundle> {
  const cached = readCache();
  if (cached && !opts.force && Date.now() - cached.fetchedAt < APP.cacheTtlMs) return cached;

  try {
    const [spotRaw, chart30, chart365] = await Promise.all([
      getJson<{
        [id: string]: {
          usd: number;
          usd_market_cap: number;
          usd_24h_vol: number;
          usd_24h_change: number;
          usd_24h_high?: number;
          usd_24h_low?: number;
          usd_ath?: number;
        };
      }>(
        `${CG}/simple/price?ids=${PENGU.coingeckoId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_24hr_high_low=true&include_ath=true`,
      ),
      getJson<{ prices: [number, number][]; total_volumes: [number, number][] }>(
        `${CG}/coins/${PENGU.coingeckoId}/market_chart?vs_currency=usd&days=30`,
      ),
      getJson<{ prices: [number, number][]; total_volumes: [number, number][] }>(
        `${CG}/coins/${PENGU.coingeckoId}/market_chart?vs_currency=usd&days=365`,
      ),
    ]);

    const spot = spotRaw[PENGU.coingeckoId];
    const candles4h = buildCandles(chart30.prices, chart30.total_volumes, 4 * 3_600_000);
    const candles1d = buildCandles(chart365.prices, chart365.total_volumes, 24 * 3_600_000);

    const sample = chart365.prices.filter((_, i) => i % 7 === 0).map((p) => `${p[0]}:${p[1].toFixed(6)}`).join(",");
    const dataHash = await sha256Short(`pengu|${candles4h.length}|${candles1d.length}|${sample}`);

    const bundle: MarketBundle = {
      snapshot: {
        price: spot.usd,
        marketCap: spot.usd_market_cap,
        volume24h: spot.usd_24h_vol,
        change24h: spot.usd_24h_change,
        high24h: spot.usd_24h_high ?? Math.max(...candles4h.slice(-6).map((c) => c.h)),
        low24h: spot.usd_24h_low ?? Math.min(...candles4h.slice(-6).map((c) => c.l)),
        ath: spot.usd_ath ?? Math.max(...candles1d.map((c) => c.h)),
        updatedAt: Date.now(),
      },
      candles4h,
      candles1d,
      dataHash,
      fetchedAt: Date.now(),
    };
    writeCache(bundle);
    return bundle;
  } catch (err) {
    if (cached) return { ...cached, stale: true };
    throw err;
  }
}

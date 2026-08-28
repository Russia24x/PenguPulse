/**
 * موتور تحلیل تکنیکال ترکیبی — پنگو پالس
 * ------------------------------------------------------------------
 * همهٔ اندیکاتورها با فرمول‌های استاندارد و روی دادهٔ واقعی بازار
 * محاسبه می‌شوند؛ هیچ عدد ساختگی وجود ندارد. خروجی هر اندیکاتور یک
 * «رأی» نرمال‌شده در بازهٔ [1-, 1+] است و امتیاز نهایی، میانگین وزنی
 * آراست (وزن‌ها از config می‌آیند).
 */
import { ENGINE } from "../config";

export interface Candle {
  t: number; // ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ----------------------------- میانگین‌ها ----------------------------- */
export function sma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  const k = 2 / (period + 1);
  let prev = NaN;
  for (let i = 0; i < values.length; i++) {
    if (i === period - 1) {
      prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      out[i] = prev;
    } else if (i >= period) {
      prev = values[i] * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

/* ------------------------------ RSI ---------------------------------- */
/** RSI با هموارسازی Wilder */
export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = new Array(closes.length).fill(NaN);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    const gain = Math.max(ch, 0);
    const loss = Math.max(-ch, 0);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i === period) out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
  }
  return out;
}

/* ------------------------------ MACD --------------------------------- */
export function macd(closes: number[], fast = 12, slow = 26, sig = 9) {
  const ef = ema(closes, fast);
  const es = ema(closes, slow);
  const line = closes.map((_, i) => ef[i] - es[i]);
  const valid = line.map((v, i) => (i >= slow - 1 ? v : NaN));
  const start = valid.findIndex((v) => !Number.isNaN(v));
  const signal: number[] = new Array(closes.length).fill(NaN);
  if (start >= 0) {
    const sigArr = ema(valid.slice(start).map((v) => (Number.isNaN(v) ? 0 : v)), sig);
    sigArr.forEach((v, i) => (signal[start + i] = i >= sig - 1 ? v : NaN));
  }
  const hist = line.map((v, i) => v - signal[i]);
  return { line, signal, hist };
}

/* --------------------------- Bollinger Bands -------------------------- */
export function bollinger(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const pctB: number[] = [];
  const bandwidth: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (Number.isNaN(mid[i])) {
      upper.push(NaN);
      lower.push(NaN);
      pctB.push(NaN);
      bandwidth.push(NaN);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const sd = Math.sqrt(slice.reduce((a, v) => a + (v - mid[i]) ** 2, 0) / period);
    const u = mid[i] + mult * sd;
    const l = mid[i] - mult * sd;
    upper.push(u);
    lower.push(l);
    pctB.push(u === l ? 0.5 : (closes[i] - l) / (u - l));
    bandwidth.push(((u - l) / mid[i]) * 100);
  }
  return { mid, upper, lower, pctB, bandwidth };
}

/* ---------------------------- Stochastic ------------------------------ */
export function stochastic(candles: Candle[], k = 14, d = 3) {
  const raw: number[] = new Array(candles.length).fill(NaN);
  for (let i = k - 1; i < candles.length; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - k + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].h);
      ll = Math.min(ll, candles[j].l);
    }
    raw[i] = hh === ll ? 50 : ((candles[i].c - ll) / (hh - ll)) * 100;
  }
  const kLine = raw.map((v) => (Number.isNaN(v) ? NaN : v));
  const dLine = sma(
    kLine.map((v) => (Number.isNaN(v) ? NaN : v)),
    d,
  ).map((v, i) => {
    // میانگین فقط روی مقادیر معتبر
    const win = kLine.slice(Math.max(0, i - d + 1), i + 1).filter((x) => !Number.isNaN(x));
    return win.length === d ? win.reduce((a, b) => a + b, 0) / d : NaN;
  });
  return { k: kLine, d: dLine };
}

/* -------------------------------- ATR --------------------------------- */
export function atr(candles: Candle[], period = 14): number[] {
  const out: number[] = new Array(candles.length).fill(NaN);
  const trs: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const tr =
      i === 0
        ? candles[i].h - candles[i].l
        : Math.max(
            candles[i].h - candles[i].l,
            Math.abs(candles[i].h - candles[i - 1].c),
            Math.abs(candles[i].l - candles[i - 1].c),
          );
    trs.push(tr);
    if (i === period) out[i] = trs.slice(0, period + 1).reduce((a, b) => a + b, 0) / period;
    else if (i > period) out[i] = (out[i - 1] * (period - 1) + tr) / period;
  }
  return out;
}

/* -------------------------------- OBV --------------------------------- */
export function obv(candles: Candle[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const dir = candles[i].c > candles[i - 1].c ? 1 : candles[i].c < candles[i - 1].c ? -1 : 0;
    out.push(out[i - 1] + dir * candles[i].v);
  }
  return out;
}

/* -------------------------------- ROC --------------------------------- */
export function roc(closes: number[], period = 10): number[] {
  return closes.map((v, i) => (i >= period && closes[i - period] !== 0 ? ((v - closes[i - period]) / closes[i - period]) * 100 : NaN));
}

/* --------------------------- Pivot Points ------------------------------ */
export interface Pivots {
  p: number;
  r1: number;
  s1: number;
  r2: number;
  s2: number;
  r3: number;
  s3: number;
}
export function classicPivots(c: Candle): Pivots {
  const p = (c.h + c.l + c.c) / 3;
  return {
    p,
    r1: 2 * p - c.l,
    s1: 2 * p - c.h,
    r2: p + (c.h - c.l),
    s2: p - (c.h - c.l),
    r3: c.h + 2 * (p - c.l),
    s3: c.l - 2 * (c.h - p),
  };
}

/* --------------------- نوسان‌های اخیر (حمایت/مقاومت) -------------------- */
export function swings(candles: Candle[], lookback = 5, max = 4) {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isH = true;
    let isL = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (candles[j].h > candles[i].h) isH = false;
      if (candles[j].l < candles[i].l) isL = false;
    }
    if (isH) highs.push(candles[i].h);
    if (isL) lows.push(candles[i].l);
  }
  return { highs: highs.slice(-max), lows: lows.slice(-max) };
}

/* ====================================================================== */
/*  موتور امتیازدهی                                                        */
/* ====================================================================== */
export type Reading = "buy" | "sell" | "neutral";

export interface IndicatorResult {
  key: keyof typeof ENGINE.weights;
  /** رأی نرمال‌شده [-1, 1] */
  vote: number;
  reading: Reading;
  /** مقدار عددی برای نمایش */
  display: string;
  /** توضیح کوتاه وضعیت */
  note: "overbought" | "oversold" | "bullish" | "bearish" | "flat" | "squeeze" | "cross-up" | "cross-down" | "above" | "below";
  weight: number;
}

export interface TimeframeAnalysis {
  label: "4H" | "1D";
  score: number;
  indicators: IndicatorResult[];
}

export interface Analysis {
  score: number; // [-100, 100]
  verdict: "strongBuy" | "buy" | "neutral" | "sell" | "strongSell";
  confidence: number; // 0..100
  agreement: number; // درصد وزنی اندیکاتورهای هم‌جهت
  timeframes: TimeframeAnalysis[];
  price: number;
  atrPct: number;
  pivots: Pivots;
  swingHighs: number[];
  swingLows: number[];
  ema20: number;
  ema50: number;
  ema200: number;
  candles: Candle[]; // تایم‌فریم نمایشی پیش‌فرض
  generatedAt: number;
}

function voteFrom(v: number, eps = 0.15): Reading {
  return v > eps ? "buy" : v < -eps ? "sell" : "neutral";
}

function analyzeCandles(candles: Candle[], label: "4H" | "1D"): TimeframeAnalysis {
  const closes = candles.map((c) => c.c);
  const last = closes.length - 1;
  const W = ENGINE.weights;
  const P = ENGINE.periods;
  const results: IndicatorResult[] = [];

  // RSI
  const r = rsi(closes, P.rsi);
  const rsiNow = r[last];
  const rsiVote = clamp((50 - rsiNow) / 20, -1, 1);
  results.push({
    key: "rsi",
    vote: rsiVote,
    reading: voteFrom(rsiVote),
    display: rsiNow.toFixed(1),
    note: rsiNow >= 70 ? "overbought" : rsiNow <= 30 ? "oversold" : rsiVote > 0.15 ? "bullish" : rsiVote < -0.15 ? "bearish" : "flat",
    weight: W.rsi,
  });

  // MACD
  const m = macd(closes);
  const h0 = m.hist[last];
  const h1 = m.hist[last - 1];
  const crossUp = h0 > 0 && h1 <= 0;
  const crossDown = h0 < 0 && h1 >= 0;
  const mVote = clamp(
    (crossUp ? 0.9 : crossDown ? -0.9 : 0) + (Number.isNaN(h0) ? 0 : h0 > 0 ? 0.45 : -0.45) + (!Number.isNaN(h1) && !Number.isNaN(h0) ? (h0 > h1 ? 0.25 : -0.25) : 0),
    -1,
    1,
  );
  results.push({
    key: "macd",
    vote: mVote,
    reading: voteFrom(mVote),
    display: m.line[last].toFixed(7),
    note: crossUp ? "cross-up" : crossDown ? "cross-down" : h0 > 0 ? "above" : "below",
    weight: W.macd,
  });

  // روند EMA
  const e20 = ema(closes, P.emaFast);
  const e50 = ema(closes, P.emaMid);
  const e200 = ema(closes, P.emaSlow);
  const price = closes[last];
  let trendVote = 0;
  if (!Number.isNaN(e20[last])) trendVote += price > e20[last] ? 0.35 : -0.35;
  if (!Number.isNaN(e50[last])) trendVote += price > e50[last] ? 0.35 : -0.35;
  if (!Number.isNaN(e200[last])) trendVote += price > e200[last] ? 0.3 : -0.3;
  else trendVote += !Number.isNaN(e50[last]) ? (e50[last] > e50[last - 1] ? 0.3 : -0.3) : 0;
  trendVote = clamp(trendVote, -1, 1);
  results.push({
    key: "trend",
    vote: trendVote,
    reading: voteFrom(trendVote),
    display: Number.isNaN(e50[last]) ? "—" : e50[last].toFixed(6),
    note: trendVote > 0.5 ? "bullish" : trendVote < -0.5 ? "bearish" : "flat",
    weight: W.trend,
  });

  // بولینگر
  const bb = bollinger(closes, P.bb, P.bbMult);
  const pb = bb.pctB[last];
  const bw = bb.bandwidth[last];
  const squeeze = !Number.isNaN(bw) && bw < Math.min(...bb.bandwidth.slice(-60).filter((x) => !Number.isNaN(x))) * 1.08;
  const bbVote = Number.isNaN(pb) ? 0 : clamp((0.5 - pb) * 2.2, -1, 1) * 0.8;
  results.push({
    key: "bollinger",
    vote: bbVote,
    reading: voteFrom(bbVote),
    display: Number.isNaN(pb) ? "—" : `%B ${(pb * 100).toFixed(0)}`,
    note: squeeze ? "squeeze" : pb > 0.5 ? "above" : "below",
    weight: W.bollinger,
  });

  // استوکاستیک
  const st = stochastic(candles, P.stochK, P.stochD);
  const sk = st.k[last];
  const sd = st.d[last];
  const stVote = Number.isNaN(sk) ? 0 : clamp(((50 - sk) / 25) * 0.7 + (sk > sd ? 0.3 : -0.3), -1, 1);
  results.push({
    key: "stoch",
    vote: stVote,
    reading: voteFrom(stVote),
    display: Number.isNaN(sk) ? "—" : `K ${sk.toFixed(0)} / D ${sd.toFixed(0)}`,
    note: sk >= 80 ? "overbought" : sk <= 20 ? "oversold" : sk > sd ? "bullish" : "bearish",
    weight: W.stoch,
  });

  // مومنتوم ROC
  const rc = roc(closes, P.roc);
  const rocNow = rc[last];
  const moVote = Number.isNaN(rocNow) ? 0 : clamp(rocNow / 6, -1, 1);
  results.push({
    key: "momentum",
    vote: moVote,
    reading: voteFrom(moVote),
    display: Number.isNaN(rocNow) ? "—" : `${rocNow.toFixed(2)}%`,
    note: rocNow > 0 ? "bullish" : rocNow < 0 ? "bearish" : "flat",
    weight: W.momentum,
  });

  // حجم OBV
  const ov = obv(candles);
  const ovSma = sma(ov, 20);
  const volVote = Number.isNaN(ovSma[last]) ? 0 : clamp(((ov[last] - ovSma[last]) / (Math.abs(ovSma[last]) + 1)) * 8, -1, 1) * 0.85;
  results.push({
    key: "volume",
    vote: volVote,
    reading: voteFrom(volVote),
    display: ov[last] >= 0 ? `+${(ov[last] / 1e6).toFixed(1)}M` : `${(ov[last] / 1e6).toFixed(1)}M`,
    note: volVote > 0.1 ? "bullish" : volVote < -0.1 ? "bearish" : "flat",
    weight: W.volume,
  });

  // ساختار بازار (کف‌ها و سقف‌های بالاتر/پایین‌تر)
  const sw = swings(candles, 4, 4);
  const hh = sw.highs.length >= 2 && sw.highs[sw.highs.length - 1] > sw.highs[sw.highs.length - 2];
  const hl = sw.lows.length >= 2 && sw.lows[sw.lows.length - 1] > sw.lows[sw.lows.length - 2];
  const lh = sw.highs.length >= 2 && sw.highs[sw.highs.length - 1] < sw.highs[sw.highs.length - 2];
  const ll = sw.lows.length >= 2 && sw.lows[sw.lows.length - 1] < sw.lows[sw.lows.length - 2];
  const stVote2 = clamp((hh ? 0.5 : lh ? -0.5 : 0) + (hl ? 0.5 : ll ? -0.5 : 0), -1, 1);
  results.push({
    key: "structure",
    vote: stVote2,
    reading: voteFrom(stVote2),
    display: `${hh ? "HH" : lh ? "LH" : "–"} ${hl ? "HL" : ll ? "LL" : "–"}`,
    note: stVote2 > 0 ? "bullish" : stVote2 < 0 ? "bearish" : "flat",
    weight: W.structure,
  });

  const totalW = results.reduce((a, r2) => a + r2.weight, 0);
  const score = (results.reduce((a, r2) => a + r2.vote * r2.weight, 0) / totalW) * 100;
  return { label, score, indicators: results };
}

export function analyze(candles4h: Candle[], candles1d: Candle[]): Analysis | null {
  if (candles4h.length < 60 || candles1d.length < 40) return null;
  const fast = analyzeCandles(candles4h, "4H");
  const slow = analyzeCandles(candles1d, "1D");
  const score = fast.score * ENGINE.tfMix.fast + slow.score * ENGINE.tfMix.slow;

  const v = ENGINE.verdicts;
  const verdict =
    score >= v.strongBuy ? "strongBuy" : score >= v.buy ? "buy" : score <= v.strongSell ? "strongSell" : score <= v.sell ? "sell" : "neutral";

  // هم‌سویی: سهم وزنی آرای هم‌جهت با امتیاز نهایی
  const all = [...fast.indicators, ...slow.indicators];
  const totalW = all.reduce((a, r) => a + r.weight, 0);
  const aligned = all.reduce((a, r) => a + (Math.sign(r.vote) === Math.sign(score) && r.vote !== 0 ? r.weight : 0), 0);
  const agreement = (aligned / totalW) * 100;
  const confidence = Math.round(clamp(Math.abs(score) * 0.65 + agreement * 0.45, 4, 97));

  const closes1d = candles1d.map((c) => c.c);
  const e20 = ema(closes1d, ENGINE.periods.emaFast);
  const e50 = ema(closes1d, ENGINE.periods.emaMid);
  const e200 = ema(closes1d, ENGINE.periods.emaSlow);
  const lastDay = candles1d[candles1d.length - 2] ?? candles1d[candles1d.length - 1];
  const a14 = atr(candles1d, ENGINE.periods.atr);
  const atrNow = a14[a14.length - 1];
  const price = candles4h[candles4h.length - 1].c;
  const sw = swings(candles4h, 5, 4);

  return {
    score,
    verdict,
    confidence,
    agreement: Math.round(agreement),
    timeframes: [fast, slow],
    price,
    atrPct: Number.isNaN(atrNow) ? 0 : (atrNow / price) * 100,
    pivots: classicPivots(lastDay),
    swingHighs: sw.highs,
    swingLows: sw.lows,
    ema20: e20[e20.length - 1],
    ema50: e50[e50.length - 1],
    ema200: e200[e200.length - 1],
    candles: candles4h,
    generatedAt: Date.now(),
  };
}

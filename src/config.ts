/**
 * پنگو پالس — پیکربندی مرکزی (Data-Driven)
 * ------------------------------------------------------------------
 * همهٔ اعداد و آدرس‌های حیاتی سیستم در همین فایل نگهداری می‌شوند تا
 * هیچ‌چیز در لایه‌های UI/منطق پخش و هاردکد نشود. تغییر شبکه، توکن،
 * خزانه، تعرفه‌ها یا وزن موتور = فقط ویرایش این فایل.
 */

export const APP = {
  name: "پنگو پالس",
  nameEn: "PENGU PULSE",
  engineVersion: "2.1.0",
  /** فاصلهٔ تازه‌سازی دادهٔ بازار (میلی‌ثانیه) */
  marketPollMs: 90_000,
  /** فاصلهٔ خواندن شمارهٔ بلوک Abstract برای نوار زنده */
  blockPollMs: 12_000,
  /** عمر کش بازار در localStorage */
  cacheTtlMs: 5 * 60_000,
} as const;

/** بلاکچین Abstract — Mainnet */
export const ABSTRACT = {
  id: 2741,
  hexId: "0xab5",
  name: "Abstract",
  testnet: false,
  rpcUrls: ["https://api.mainnet.abs.xyz", "https://api.abs.xyz"],
  wsUrls: ["wss://api.mainnet.abs.xyz"],
  explorer: "https://abscan.org",
  explorerName: "Abscan",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
} as const;

/** توکن PENGU روی Abstract (OFT — تأییدشده در Abscan و LayerZero) */
export const PENGU = {
  symbol: "PENGU",
  name: "Pudgy Penguins",
  decimals: 18,
  address: "0x9eBe3A824Ca958e4b3Da772D2065518F009CBa62",
  /** شناسهٔ CoinGecko برای دادهٔ بازار واقعی */
  coingeckoId: "pudgy-penguins",
} as const;

/** خزانهٔ پروژه — همهٔ پرداخت‌ها مستقیم و شفاف به این آدرس واریز می‌شود */
export const TREASURY = "0x60Df4E186364c3a49A550Aee29Da1d5fe3658818";

/* ------------------------------------------------------------------ */
/* تعرفه‌ها — قیمت‌ها به واحد PENGU و مدت به ساعت                       */
/* ------------------------------------------------------------------ */
export type PlanId = "signal" | "full" | "week" | "month";

export interface Plan {
  id: PlanId;
  /** قیمت به واحد PENGU */
  price: string;
  /** مدت اعتبار (ساعت) */
  hours: number;
  /** سطح دسترسی: 1 = سیگنال روزانه، 2 = کامل */
  tier: 1 | 2;
  /** اشتراک (با یادآوری تمدید خودکار) */
  subscription?: boolean;
  popular?: boolean;
}

export const PLANS: Plan[] = [
  { id: "signal", price: "1", hours: 24, tier: 1 },
  { id: "full", price: "5", hours: 24 * 30, tier: 2, popular: true },
  { id: "week", price: "7", hours: 24 * 7, tier: 2, subscription: true },
  { id: "month", price: "30", hours: 24 * 30, tier: 2, subscription: true },
];

export const planById = (id: PlanId): Plan => PLANS.find((p) => p.id === id)!;

/** حداقل مبلغ برای به‌رسمیت‌شناختن یک تراکنش به‌عنوان پرداخت (جلوگیری از اسپم) */
export const MIN_PAYMENT = "1";

/* ------------------------------------------------------------------ */
/* موتور تحلیل — وزن اندیکاتورها (مجموع = 100)                          */
/* ------------------------------------------------------------------ */
export const ENGINE = {
  weights: {
    rsi: 12,
    macd: 16,
    trend: 18,
    bollinger: 10,
    stoch: 10,
    momentum: 10,
    volume: 12,
    structure: 12,
  },
  /** وزن تایم‌فریم سریع (4h) در برابر کند (1d) */
  tfMix: { fast: 0.45, slow: 0.55 },
  verdicts: { strongBuy: 55, buy: 22, sell: -22, strongSell: -55 },
  periods: { rsi: 14, emaFast: 20, emaMid: 50, emaSlow: 200, bb: 20, bbMult: 2, stochK: 14, stochD: 3, atr: 14, roc: 10 },
} as const;

/* ------------------------------------------------------------------ */
/* قالب‌بندی اعداد — ارقام لاتین مونو برای حس ترمینالی                  */
/* ------------------------------------------------------------------ */
const nf = (d: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });

export const fmt = {
  usd: (v: number) =>
    v >= 1 ? `$${nf(2).format(v)}` : `$${v.toFixed(6).replace(/0{2,}$/, "0")}`,
  num: (v: number, d = 2) => nf(d).format(v),
  compact: (v: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v),
  pengu: (v: bigint) => {
    const n = Number(v) / 1e18;
    return nf(n >= 100 ? 0 : 2).format(n);
  },
  pct: (v: number, d = 2) => `${v >= 0 ? "+" : ""}${nf(d).format(v)}%`,
  addr: (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`,
  dateTime: (tsMs: number, lang: string) =>
    new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(tsMs)),
  duration: (ms: number, t: (h: number) => string) => {
    const h = Math.max(0, Math.round(ms / 3_600_000));
    return t(h);
  },
};

export type Lang = "fa" | "en";
export const DEFAULT_LANG: Lang = "fa";

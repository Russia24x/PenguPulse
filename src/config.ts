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

/**
 * بلاکچین Abstract — Mainnet
 * تعریف رسمی زنجیره (chain object) از `viem/chains` وارد می‌شود؛ اینجا فقط
 * متادیتای نمایشی/لینک‌ها نگهداری می‌شود تا هیچ دادهٔ زنجیره‌ای تکرار نشود.
 */
export const ABSTRACT = {
  id: 2741,
  name: "Abstract",
  rpcUrls: ["https://api.mainnet.abs.xyz", "https://api.abs.xyz"],
  explorer: "https://abscan.org",
  explorerName: "Abscan",
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
/* تعرفه‌ها — قیمت‌ها به واحد PENGU؛ همهٔ پرداخت‌ها انتقال مستقیم ERC-20   */
/* ------------------------------------------------------------------ */
export type PlanId = "signup" | "signal" | "week" | "month" | "year";

export interface Plan {
  id: PlanId;
  /** قیمت به واحد PENGU */
  price: string;
  /** مدت اعتبار (ساعت)؛ 0 = دائمی */
  hours: number;
  /** سطح دسترسی: 1 = ترمینال بازار (بدون سیگنال)، 2 = کامل با سیگنال */
  tier: 1 | 2;
  /** دائمی (یک‌بار پرداخت، برای همیشه) */
  permanent?: boolean;
  /** اشتراک (با یادآوری تمدید خودکار) */
  subscription?: boolean;
  popular?: boolean;
}

export const PLANS: Plan[] = [
  { id: "signup", price: "10", hours: 0, tier: 1, permanent: true },
  { id: "signal", price: "5", hours: 24, tier: 2 },
  { id: "week", price: "30", hours: 24 * 7, tier: 2, subscription: true, popular: true },
  { id: "month", price: "100", hours: 24 * 30, tier: 2, subscription: true },
  { id: "year", price: "1500", hours: 24 * 365, tier: 2, subscription: true },
];

export const planById = (id: PlanId): Plan => PLANS.find((p) => p.id === id)!;

/** حداقل مبلغ برای به‌رسمیت‌شناختن یک تراکنش به‌عنوان پرداخت (جلوگیری از اسپم) */
export const MIN_PAYMENT = "5";

/* ------------------------------------------------------------------ */
/* کشف خودکار دسترسی از زنجیره (بدون نیاز به هش یا ذخیرهٔ محلی)          */
/* ------------------------------------------------------------------ */
export const AUTO_SCAN = {
  /** بازهٔ اسکن به تعداد بلوک (Abstract ≈ 1s/block → ~3 روز) */
  blocks: 259_200,
  /** در صورت خطای محدودهٔ RPC، یک‌بار با این ضریب کوچک‌تر تکرار می‌شود */
  fallbackFactor: 6,
  /** فاصلهٔ اسکن دوره‌ای پس از اتصال (میلی‌ثانیه) */
  intervalMs: 60_000,
} as const;

/* ------------------------------------------------------------------ */
/* اکوسیستم Abstract — همهٔ لینک‌ها و APIهای برون‌سازمانی یکجا            */
/* ------------------------------------------------------------------ */
export const ECOSYSTEM = {
  portal: "https://portal.abs.xyz",
  wallet: "https://abs.xyz/wallet",
  build: "https://build.abs.xyz",
  docs: "https://docs.abs.xyz",
  portalDocs: "https://docs.abs.xyz/portal/overview",
  jsonRpc: "https://docs.abs.xyz/api-reference/overview/abstract-json-rpc-api",
  aiAgents: "https://docs.abs.xyz/ai-agents/resources/overview",
  agw: "https://docs.abs.xyz/abstract-global-wallet/overview",
  llmsTxt: "https://docs.abs.xyz/llms.txt",
  /** API پروفایل Portal — چند مسیر محتمل؛ اولین پاسخ معتبر استفاده می‌شود */
  profileApis: [
    (a: string) => `https://portal.abs.xyz/api/profile/${a}`,
    (a: string) => `https://api.portal.abs.xyz/api/profile/${a}`,
  ],
} as const;

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

export type Lang = "fa" | "en" | "es" | "hi" | "zh" | "ja" | "ko" | "de" | "fr" | "ru";
export const DEFAULT_LANG: Lang = "fa";

/** زبان‌های راست‌به‌چپ */
export const RTL_LANGS: Lang[] = ["fa"];

/** متادیتای نمایشی زبان‌ها برای انتخاب‌گر (نام بومی هر زبان) */
export const LANG_META: { code: Lang; native: string; flag: string }[] = [
  { code: "fa", native: "فارسی", flag: "🇮🇷" },
  { code: "en", native: "English", flag: "🇬🇧" },
  { code: "es", native: "Español", flag: "🇪🇸" },
  { code: "hi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "zh", native: "中文", flag: "🇨🇳" },
  { code: "ja", native: "日本語", flag: "🇯🇵" },
  { code: "ko", native: "한국어", flag: "🇰🇷" },
  { code: "de", native: "Deutsch", flag: "🇩🇪" },
  { code: "fr", native: "Français", flag: "🇫🇷" },
  { code: "ru", native: "Русский", flag: "🇷🇺" },
];

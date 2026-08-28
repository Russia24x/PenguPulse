/**
 * i18n ماژولار — فرهنگ واژه‌ها کاملاً Data-Driven است.
 * افزودن زبان جدید = افزودن یک شیء Dict و ثبت آن در DICTS.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANG, type Lang } from "./config";

export interface Dict {
  meta: { appName: string; title: string; tagline: string };
  nav: { signal: string; indicators: string; plans: string; security: string; method: string; verify: string };
  status: {
    live: string;
    refresh: string;
    block: string;
    onAbstract: string;
    connectWallet: string;
    disconnect: string;
    connected: string;
    connecting: string;
    loginHint: string;
    loginError: string;
    balance: string;
    engine: string;
    data: string;
    offline: string;
    loadingMarket: string;
    marketError: string;
    retry: string;
    langToggle: string;
  };
  hero: {
    kicker: string;
    title1: string;
    title2: string;
    lead: string;
    ctaSignal: string;
    ctaFull: string;
    scroll: string;
  };
  gauge: {
    composite: string;
    confidence: string;
    agreement: string;
    strongBuy: string;
    buy: string;
    neutral: string;
    sell: string;
    strongSell: string;
    actionBuy: string;
    actionSell: string;
    actionWait: string;
    updated: string;
    tf4h: string;
    tf1d: string;
    mix: string;
  };
  chart: { title: string; tf4h: string; tf1d: string; ema20: string; ema50: string; bb: string; price: string; o: string; h: string; l: string; c: string; v: string };
  indicators: {
    title: string;
    body: string;
    indicator: string;
    value: string;
    reading: string;
    weight: string;
    buy: string;
    sell: string;
    neutral: string;
    rsi: string;
    macd: string;
    trend: string;
    bollinger: string;
    stoch: string;
    momentum: string;
    volume: string;
    structure: string;
    overbought: string;
    oversold: string;
    bullish: string;
    bearish: string;
    flat: string;
    squeeze: string;
    crossUp: string;
    crossDown: string;
    above: string;
    below: string;
    tf: string;
    score: string;
  };
  risk: {
    title: string;
    pivots: string;
    swings: string;
    resistance: string;
    support: string;
    atr: string;
    atrHint: string;
    longStop: string;
    shortStop: string;
    note: string;
  };
  plans: {
    title: string;
    body: string;
    signup: string;
    signupDesc: string;
    signal: string;
    signalDesc: string;
    week: string;
    weekDesc: string;
    month: string;
    monthDesc: string;
    year: string;
    yearDesc: string;
    pay: string;
    popular: string;
    subscription: string;
    permanent: string;
    treasury: string;
    networkFee: string;
    duration: string;
    hours: (h: number) => string;
    featureSignup: string[];
    featureSignal: string[];
    featureFull: string[];
    autoRenew: string;
    autoRenewHint: string;
  };
  pay: {
    title: string;
    amount: string;
    recipient: string;
    network: string;
    duration: string;
    steps: string;
    step1: string;
    step2: string;
    step3: string;
    confirm: string;
    signing: string;
    confirming: string;
    success: string;
    successBody: string;
    failed: string;
    rejected: string;
    viewTx: string;
    retry: string;
    close: string;
    insufficient: string;
    need: string;
  };
  verify: {
    title: string;
    body: string;
    placeholder: string;
    btn: string;
    working: string;
    ok: string;
    errInvalid: string;
    errNotFound: string;
    errFailed: string;
    errToken: string;
    errRecipient: string;
    errAmount: string;
    savedFor: string;
    payer: string;
    amount: string;
    plan: string;
    validUntil: string;
  };
  access: {
    title: string;
    none: string;
    noneBody: string;
    tier1: string;
    tier2: string;
    activeUntil: string;
    plan: string;
    tx: string;
    remaining: string;
    locked: string;
    lockedBody: string;
    renewSoon: string;
    renewNow: string;
  };
  security: {
    title: string;
    body: string;
    p1t: string;
    p1b: string;
    p2t: string;
    p2b: string;
    p3t: string;
    p3b: string;
    bullets: string[];
  };
  method: { title: string; body: string; rows: { name: string; formula: string; desc: string }[]; verdicts: string };
  footer: {
    disclaimer: string;
    built: string;
    treasury: string;
    explorer: string;
    docs: string;
    portal: string;
    rights: string;
  };
  terminal: {
    agwReady: string;
    agwOn: string;
    gateTitle: string;
    gateBody: string;
    gateBtn: string;
    why1: string;
    why2: string;
    why3: string;
    gasFree: string;
    smartWallet: string;
    foundation: string;
    dailySignal: string;
    dailyBody: string;
    dailyReset: string;
    unlock: string;
    otherPlans: string;
  };
  toast: { copied: string; paid: string; verified: string; payFail: string; renewed: string };
}

const fa: Dict = {
  meta: {
    appName: "پنگو پالس",
    title: "پنگو پالس | ترمینال سیگنال PENGU روی Abstract",
    tagline: "موتور تحلیل تکنیکال ترکیبی $PENGU — دادهٔ زنده، راستی‌آزمایی روی‌زنجیره‌ای، اجرا روی Abstract",
  },
  nav: { signal: "سیگنال", indicators: "اندیکاتورها", plans: "تعرفه‌ها", security: "امنیت", method: "متدولوژی", verify: "راستی‌آزمایی" },
  status: {
    live: "زنده",
    refresh: "تازه‌سازی",
    block: "بلوک",
    onAbstract: "روی Abstract",
    connectWallet: "ورود با کیف پول Abstract",
    disconnect: "قطع اتصال",
    connected: "متصل",
    connecting: "در حال ورود…",
    loginHint: "بدون نصب افزونه — با ایمیل، QR یا اکانت اجتماعی",
    loginError: "ورود ناموفق بود؛ دوباره تلاش کنید",
    balance: "موجودی",
    engine: "موتور",
    data: "داده",
    offline: "کش آفلاین",
    loadingMarket: "دریافت دادهٔ زندهٔ بازار…",
    marketError: "خطا در دریافت دادهٔ بازار",
    retry: "تلاش دوباره",
    langToggle: "English",
  },
  hero: {
    kicker: "تحلیل تکنیکال ترکیبی • بلاکچین Abstract",
    title1: "ترمینال سیگنال",
    title2: "پنگو",
    lead: "هشت اندیکاتور کلاسیک، دو تایم‌فریم، یک امتیاز ریاضی شفاف — سیگنال خرید/فروش $PENGU از دل دادهٔ واقعی بازار؛ دسترسی با پرداخت PENGU و تأیید مستقیم روی زنجیره.",
    ctaSignal: "سیگنال امروز — ۵ PENGU",
    ctaFull: "ثبت‌نام — ۱۰ PENGU",
    scroll: "ورود به ترمینال",
  },
  gauge: {
    composite: "امتیاز ترکیبی موتور",
    confidence: "اطمینان",
    agreement: "هم‌سویی وزنی اندیکاتورها",
    strongBuy: "خرید قوی",
    buy: "خرید",
    neutral: "خنثی",
    sell: "فروش",
    strongSell: "فروش قوی",
    actionBuy: "الان بخر",
    actionSell: "الان بفروش",
    actionWait: "دست نگه دار",
    updated: "به‌روزرسانی",
    tf4h: "۴ ساعته",
    tf1d: "روزانه",
    mix: "ترکیب تایم‌فریم‌ها",
  },
  chart: { title: "نمودار قیمت و باندها", tf4h: "4H", tf1d: "1D", ema20: "EMA 20", ema50: "EMA 50", bb: "بولینگر ۲۰(۲σ)", price: "قیمت", o: "باز", h: "سقف", l: "کف", c: "بسته", v: "حجم" },
  indicators: {
    title: "تفکیک اندیکاتورها",
    body: "هر اندیکاتور مستقل رأی می‌دهد؛ امتیاز نهایی میانگین وزنی این آراست. وزن‌ها در پیکربندی عمومی موتور تعریف شده‌اند.",
    indicator: "اندیکاتور",
    value: "مقدار",
    reading: "رأی",
    weight: "وزن",
    buy: "خرید",
    sell: "فروش",
    neutral: "خنثی",
    rsi: "RSI (۱۴)",
    macd: "MACD (۱۲/۲۶/۹)",
    trend: "روند — EMA 20/50/200",
    bollinger: "بولینگر %B (۲۰, ۲σ)",
    stoch: "استوکاستیک (۱۴,۳)",
    momentum: "مومنتوم ROC (۱۰)",
    volume: "حجم — OBV",
    structure: "ساختار (HH/HL/LH/LL)",
    overbought: "اشباع خرید",
    oversold: "اشباع فروش",
    bullish: "صعودی",
    bearish: "نزولی",
    flat: "خنثی",
    squeeze: "فشردگی",
    crossUp: "تقاطع طلایی هیستوگرام",
    crossDown: "تقاطع مرگ هیستوگرام",
    above: "بالای باند میانی",
    below: "پایین باند میانی",
    tf: "تایم‌فریم",
    score: "امتیاز",
  },
  risk: {
    title: "سطوح و مدیریت ریسک",
    pivots: "پیوت‌های کلاسیک روز قبل",
    swings: "سقف‌ها و کف‌های اخیر (۴H)",
    resistance: "مقاومت",
    support: "حمایت",
    atr: "نوسان روزانه (ATR۱۴)",
    atrHint: "فاصلهٔ پیشنهادی حد ضرر از نقطهٔ ورود",
    longStop: "حد ضرر پیشنهادی خرید",
    shortStop: "حد ضرر پیشنهادی فروش",
    note: "این سطوح صرفاً خروجی ریاضی دادهٔ تاریخی‌اند و توصیهٔ مالی نیستند.",
  },
  plans: {
    title: "تعرفه‌ها — پرداخت مستقیم با PENGU",
    body: "هر پرداخت یک انتقال مستقیم ERC-20 روی Abstract به خزانهٔ عمومی پروژه است؛ رسید تراکنش همان لحظه روی زنجیره راستی‌آزمایی می‌شود و دسترسی را باز می‌کند. بدون Session Key و بدون هیچ اجازهٔ برداشت خودکار.",
    signup: "ثبت‌نام و ورود",
    signupDesc: "یک‌بار پرداخت، برای همیشه — ترمینال بازار بدون سیگنال",
    signal: "سیگنال امروز",
    signalDesc: "دسترسی ۲۴ ساعته به سیگنال کامل روزانه",
    week: "دسترسی ۷ روزه",
    weekDesc: "سیگنال کامل برای ۷ روز + یادآوری تمدید",
    month: "دسترسی ۳۰ روزه",
    monthDesc: "سیگنال کامل برای ۳۰ روز + یادآوری تمدید",
    year: "دسترسی سالانه",
    yearDesc: "سیگنال کامل برای ۳۶۵ روز + یادآوری تمدید",
    pay: "پرداخت {n} PENGU",
    popular: "پیشنهادی",
    subscription: "اشتراک",
    permanent: "دائمی",
    treasury: "خزانهٔ پروژه",
    networkFee: "کارمزد شبکه (ETH) جدا از مبلغ تعرفه است.",
    duration: "مدت اعتبار",
    hours: (h: number) => (h === 0 ? "دائمی" : h < 48 ? `${h} ساعت` : h < 24 * 60 ? `${Math.round(h / 24)} روز` : `${Math.round(h / (24 * 365))} سال`),
    featureSignup: ["ترمینال بازار و نمودارها", "جدول اندیکاتورها", "بدون سیگنال ترکیبی", "اعتبار دائمی"],
    featureSignal: ["امتیاز و حکم موتور", "۵ اندیکاتور اصلی", "پیوت‌های روزانه", "۲۴ ساعت اعتبار"],
    featureFull: ["همهٔ ۸ اندیکاتور در ۲ تایم‌فریم", "سطوح حمایت/مقاومت و ATR", "حد ضررهای پیشنهادی", "هش داده و نسخهٔ موتور", "تمدید یک‌کلیکی"],
    autoRenew: "تمدید خودکار",
    autoRenewHint: "با فعال‌کردن، هنگام انقضای دسترسی پرداخت با یک کلیک از همین‌جا آغاز می‌شود (بدون هیچ برداشت خودکار از کیف پول).",
  },
  pay: {
    title: "پرداخت روی Abstract",
    amount: "مبلغ",
    recipient: "گیرنده (خزانه)",
    network: "شبکه",
    duration: "اعتبار",
    steps: "مراحل",
    step1: "مرور و تأیید",
    step2: "امضای کیف پول",
    step3: "تأیید روی زنجیره",
    confirm: "شروع پرداخت",
    signing: "در انتظار امضای شما در کیف پول…",
    confirming: "در حال ثبت و راستی‌آزمایی روی Abstract…",
    success: "دسترسی فعال شد",
    successBody: "رسید تراکنش روی زنجیره تأیید شد؛ دسترسی از همین لحظه فعال است.",
    failed: "پرداخت ناموفق بود",
    rejected: "تراکنش در کیف پول رد شد",
    viewTx: "مشاهده در Abscan",
    retry: "تلاش دوباره",
    close: "بستن",
    insufficient: "موجودی PENGU کافی نیست",
    need: "مورد نیاز",
  },
  verify: {
    title: "راستی‌آزمایی روی‌زنجیره‌ای",
    body: "هش هر تراکنش پرداخت را وارد کنید؛ سیستم رسید و لاگ Transfer را مستقیم از RPC عمومی Abstract می‌خواند و در صورت صحت، دسترسی را بازمی‌گرداند. این همان مکانیسمی است که همهٔ پرداخت‌ها با آن سنجیده می‌شوند — بدون هیچ سرور واسطه.",
    placeholder: "0x… هش تراکنش (۶۴ کاراکتر هگز)",
    btn: "بررسی روی زنجیره",
    working: "در حال خواندن از Abstract…",
    ok: "تراکنش معتبر است",
    errInvalid: "قالب هش نامعتبر است",
    errNotFound: "تراکنش پیدا نشد یا هنوز تأیید نشده",
    errFailed: "تراکنش ناموفق (reverted) بوده است",
    errToken: "توکن منتقل‌شده PENGU نیست",
    errRecipient: "گیرنده، خزانهٔ پروژه نیست",
    errAmount: "مبلغ کمتر از حداقل تعرفه است",
    savedFor: "دسترسی برای کیف پول پرداخت‌کننده ذخیره شد",
    payer: "پرداخت‌کننده",
    amount: "مبلغ",
    plan: "تعرفه",
    validUntil: "معتبر تا",
  },
  access: {
    title: "وضعیت دسترسی",
    none: "بدون دسترسی فعال",
    noneBody: "برای ورود به ترمینال، ثبت‌نام (۱۰ PENGU، دائمی) را بپردازید؛ برای سیگنال کامل، یکی از تعرفه‌های سیگنال را انتخاب کنید. دسترسی‌ها مستقیم روی زنجیره کشف و راستی‌آزمایی می‌شوند.",
    tier1: "ترمینال بازار",
    tier2: "سیگنال کامل",
    activeUntil: "فعال تا",
    plan: "تعرفه",
    tx: "تراکنش",
    remaining: "باقی‌مانده",
    locked: "این بخش قفل است",
    lockedBody: "با سیگنال روزانه ۵ اندیکاتور اصلی و با دسترسی کامل همهٔ تحلیل باز می‌شود.",
    renewSoon: "دسترسی شما کمتر از ۲۴ ساعت دیگر منقضی می‌شود",
    renewNow: "تمدید یک‌کلیکی",
  },
  security: {
    title: "اول امنیت، دوم امنیت، سوم موتور تحلیل",
    body: "کل سیستم طوری ساخته شده که حتی اگر این صفحه روی یک سرور متخاصم میزبانی شود، دارایی کاربر به‌جز آنچه خودش در کیف پولش امضا می‌کند در خطر نباشد.",
    p1t: "بدون کلید، بدون واسطه",
    p1b: "هیچ بک‌اندی وجود ندارد؛ کلید خصوصی فقط داخل کیف پول شماست و هر پرداخت را خودتان امضا می‌کنید. سایت نمی‌تواند بدون امضای شما تراکنشی بسازد.",
    p2t: "راستی‌آزمایی روی‌زنجیره‌ای",
    p2b: "مرجع حقیقت، بلاکچین Abstract است: رسید تراکنش، لاگ Transfer، آدرس خزانه و مهر زمانی بلوک — همه از RPC عمومی خوانده و محلی ذخیره نمی‌شوند.",
    p3t: "موتور تحلیل شفاف",
    p3b: "فرمول‌ها و وزن‌ها عمومی و قطعی‌اند؛ هش SHA-256 دادهٔ ورودی کنار هر تحلیل نمایش داده می‌شود تا هرکس بتواند خروجی را بازتولید و راستی‌آزمایی کند.",
    bullets: [
      "ورود با Abstract Global Wallet — کیف پول هوشمند با Account Abstraction بومی، بدون نیاز به نصب هیچ افزونه‌ای",
      "CSP سخت‌گیرانه در Cloudflare (_headers) — بدون اسکریپت خارجی",
      "آدرس‌ها همیشه Checksum می‌شوند (EIP-55) و با getAddress مقایسه می‌شوند",
      "حداقل مبلغ پرداخت برای دفع تراکنش‌های اسپم روی زنجیره چک می‌شود",
      "دسترسی‌ها فقط روی دستگاه خود کاربر ذخیره می‌شود؛ با هش تراکنش قابل بازیابی‌اند",
      "کد منبع ماژولار و قابل حسابرسی — بدون eval، بدون ذخیرهٔ حساس در مرورگر",
    ],
  },
  method: {
    title: "متدولوژی موتور — نسخه",
    body: "هر اندیکاتور روی کندل‌های واقعی ۴ساعته و روزانهٔ ساخته‌شده از دادهٔ CoinGecko محاسبه و به رأی نرمال‌شدهٔ [۱-،۱+] تبدیل می‌شود؛ امتیاز نهایی میانگین وزنی دو تایم‌فریم است.",
    rows: [
      { name: "RSI (Wilder)", formula: "RSI = 100 − 100 / (1 + EMA(gain) / EMA(loss))", desc: "زیر ۳۰ اشباع فروش (رأی خرید)، بالای ۷۰ اشباع خرید (رأی فروش)" },
      { name: "MACD", formula: "MACD = EMA₁₂ − EMA₂₆ ، Signal = EMA₉(MACD)", desc: "علامت و شیب هیستوگرام + تقاطع‌های صفر" },
      { name: "EMA Stack", formula: "EMAₜ = α·Pₜ + (1−α)·EMAₜ₋₁ ، α = 2/(n+1)", desc: "موقعیت قیمت نسبت به EMA 20/50/200" },
      { name: "Bollinger", formula: "%B = (P − (μ − 2σ)) / 4σ", desc: "بازگشت به میانگین در لبه‌های باند + تشخیص فشردگی" },
      { name: "Stochastic", formula: "%K = 100·(C − LL₁₄)/(HH₁₄ − LL₁₄)", desc: "اشباع ۲۰/۸۰ و رابطهٔ K/D" },
      { name: "ROC", formula: "ROC = 100·(Pₜ − Pₜ₋₁₀)/Pₜ₋₁₀", desc: "مومنتوم خالص ۱۰ دوره‌ای" },
      { name: "OBV", formula: "OBVₜ = OBVₜ₋₁ ± Vₜ", desc: "واگرایی/همگرایی جریان حجم با میانگین ۲۰" },
      { name: "ساختار", formula: "HH/HL → صعودی ، LH/LL → نزولی", desc: "ترتیب سقف‌ها و کف‌های محلی (Swing)" },
    ],
    verdicts: "حکم نهایی: امتیاز ≥ ۵۵ خرید قوی • ≥ ۲۲ خرید • ≤ ۲۲- فروش • ≤ ۵۵- فروش قوی • وگرنه خنثی",
  },
  footer: {
    disclaimer: "پنگو پالس صرفاً خروجی ریاضی دادهٔ بازار است و توصیهٔ مالی، حقوقی یا سرمایه‌گذاری نیست. مسئولیت معاملات با خود شماست.",
    built: "ساخته‌شده روی بلاکچین Abstract",
    treasury: "خزانهٔ عمومی",
    explorer: "مشاهدهٔ خزانه در Abscan",
    docs: "مستندات فنی (README + docs/)",
    portal: "ثبت پروژه در Abstract Portal",
    rights: "© {y} پنگو پالس — متن‌باز و قابل حسابرسی",
  },
  terminal: {
    agwReady: "AGW آمادهٔ ورود",
    agwOn: "AGW متصل",
    gateTitle: "ترمینال، پشت دروازهٔ AGW",
    gateBody: "برای دیدن سیگنال امروز با کیف پول جهانی Abstract وارد شوید — بدون نصب هیچ افزونه‌ای؛ ایمیل، کد QR یا اکانت اجتماعی کافی است.",
    gateBtn: "ورود با کیف پول Abstract",
    why1: "بدون افزونه — کیف پول هوشمند، درون مرورگر شما",
    why2: "گس رایگان — حمایت‌شده توسط Paymaster شبکهٔ Abstract",
    why3: "پرداخت مستقیم به خزانهٔ عمومی پروژه — قابل رصد در Abscan",
    gasFree: "کارمزد گس: ۰ — توسط Paymaster شبکهٔ Abstract اسپانسر می‌شود",
    smartWallet: "کیف پول هوشمند AGW",
    foundation: "لایهٔ بنیادین امنیت",
    dailySignal: "سیگنال امروز",
    dailyBody: "۵ PENGU برای ۲۴ ساعت دسترسی به سیگنال کامل روزانه — سبک‌ترین راه آزمودن موتور تحلیل.",
    dailyReset: "بازنشانی روزانه (UTC)",
    unlock: "بازکردن با {n} PENGU",
    otherPlans: "سایر تعرفه‌ها و اشتراک‌ها",
  },
  toast: { copied: "کپی شد", paid: "پرداخت تأیید و دسترسی فعال شد", verified: "تراکنش معتبر است — دسترسی بازموند", payFail: "پرداخت ناموفق بود", renewed: "تمدید با موفقیت انجام شد" },
};

const en: Dict = {
  meta: {
    appName: "Pengu Pulse",
    title: "Pengu Pulse | PENGU Signal Terminal on Abstract",
    tagline: "Hybrid technical-analysis engine for $PENGU — live data, on-chain verification, running on Abstract",
  },
  nav: { signal: "Signal", indicators: "Indicators", plans: "Pricing", security: "Security", method: "Methodology", verify: "Verify" },
  status: {
    live: "LIVE",
    refresh: "Refresh",
    block: "Block",
    onAbstract: "on Abstract",
    connectWallet: "Sign in with Abstract",
    disconnect: "Disconnect",
    connected: "Connected",
    connecting: "Signing in…",
    loginHint: "No extension needed — email, QR code, or social login",
    loginError: "Sign-in failed; please try again",
    balance: "Balance",
    engine: "Engine",
    data: "Data",
    offline: "Offline cache",
    loadingMarket: "Fetching live market data…",
    marketError: "Market data failed",
    retry: "Retry",
    langToggle: "فارسی",
  },
  hero: {
    kicker: "Hybrid technical analysis • Abstract blockchain",
    title1: "The Pengu",
    title2: "Signal Terminal",
    lead: "Eight classic indicators, two timeframes, one transparent math score — a buy/sell signal for $PENGU straight from real market data; unlocked with PENGU payments verified directly on-chain.",
    ctaSignal: "Today's signal — 5 PENGU",
    ctaFull: "Sign-up — 10 PENGU",
    scroll: "Enter the terminal",
  },
  gauge: {
    composite: "Engine composite score",
    confidence: "Confidence",
    agreement: "Weighted indicator agreement",
    strongBuy: "STRONG BUY",
    buy: "BUY",
    neutral: "NEUTRAL",
    sell: "SELL",
    strongSell: "STRONG SELL",
    actionBuy: "Buy now",
    actionSell: "Sell now",
    actionWait: "Hold tight",
    updated: "Updated",
    tf4h: "4-hour",
    tf1d: "Daily",
    mix: "Timeframe mix",
  },
  chart: { title: "Price & bands", tf4h: "4H", tf1d: "1D", ema20: "EMA 20", ema50: "EMA 50", bb: "Bollinger 20(2σ)", price: "Price", o: "O", h: "H", l: "L", c: "C", v: "Vol" },
  indicators: {
    title: "Indicator breakdown",
    body: "Each indicator votes independently; the final score is their weighted average. Weights live in the engine's public config.",
    indicator: "Indicator",
    value: "Value",
    reading: "Vote",
    weight: "Weight",
    buy: "Buy",
    sell: "Sell",
    neutral: "Neutral",
    rsi: "RSI (14)",
    macd: "MACD (12/26/9)",
    trend: "Trend — EMA 20/50/200",
    bollinger: "Bollinger %B (20, 2σ)",
    stoch: "Stochastic (14,3)",
    momentum: "Momentum ROC (10)",
    volume: "Volume — OBV",
    structure: "Structure (HH/HL/LH/LL)",
    overbought: "Overbought",
    oversold: "Oversold",
    bullish: "Bullish",
    bearish: "Bearish",
    flat: "Flat",
    squeeze: "Squeeze",
    crossUp: "Histogram golden cross",
    crossDown: "Histogram death cross",
    above: "Above mid band",
    below: "Below mid band",
    tf: "Timeframe",
    score: "Score",
  },
  risk: {
    title: "Levels & risk",
    pivots: "Previous-day classic pivots",
    swings: "Recent swing highs/lows (4H)",
    resistance: "Resistance",
    support: "Support",
    atr: "Daily volatility (ATR14)",
    atrHint: "Suggested stop distance from entry",
    longStop: "Suggested long stop",
    shortStop: "Suggested short stop",
    note: "These levels are pure math over historical data — not financial advice.",
  },
  plans: {
    title: "Pricing — pay in PENGU, on Abstract",
    body: "Every payment is a direct ERC-20 transfer on Abstract to the project's public treasury; the receipt is verified on-chain the moment it lands and unlocks access. No session keys, no automatic withdrawal allowance.",
    signup: "Sign-up & entry",
    signupDesc: "Pay once, forever — market terminal without signals",
    signal: "Today's signal",
    signalDesc: "24-hour access to the full daily signal",
    week: "7-day access",
    weekDesc: "Full signal for 7 days + renewal reminder",
    month: "30-day access",
    monthDesc: "Full signal for 30 days + renewal reminder",
    year: "Yearly access",
    yearDesc: "Full signal for 365 days + renewal reminder",
    pay: "Pay {n} PENGU",
    popular: "Best value",
    subscription: "Subscription",
    permanent: "Lifetime",
    treasury: "Project treasury",
    networkFee: "Network fee (ETH) is separate from the tariff.",
    duration: "Validity",
    hours: (h: number) => (h === 0 ? "Lifetime" : h < 48 ? `${h} hours` : h < 24 * 60 ? `${Math.round(h / 24)} days` : `${Math.round(h / (24 * 365))} year`),
    featureSignup: ["Market terminal & charts", "Indicator board", "No composite signal", "Lifetime validity"],
    featureSignal: ["Engine score & verdict", "Top 5 indicators", "Daily pivots", "24-hour validity"],
    featureFull: ["All 8 indicators on 2 timeframes", "Support/resistance + ATR", "Suggested stops", "Data hash & engine version", "One-click renewal"],
    autoRenew: "Auto-renew",
    autoRenewHint: "When enabled, renewal starts from here with one click as access expires (never an automatic withdrawal).",
  },
  pay: {
    title: "Pay on Abstract",
    amount: "Amount",
    recipient: "Recipient (treasury)",
    network: "Network",
    duration: "Validity",
    steps: "Steps",
    step1: "Review",
    step2: "Wallet signature",
    step3: "On-chain confirmation",
    confirm: "Start payment",
    signing: "Waiting for your wallet signature…",
    confirming: "Verifying on Abstract…",
    success: "Access unlocked",
    successBody: "The receipt was verified on-chain; access is live from this moment.",
    failed: "Payment failed",
    rejected: "Transaction rejected in wallet",
    viewTx: "View on Abscan",
    retry: "Retry",
    close: "Close",
    insufficient: "Not enough PENGU balance",
    need: "Required",
  },
  verify: {
    title: "On-chain verification",
    body: "Paste any payment transaction hash; the app reads the receipt and Transfer log straight from Abstract's public RPC and restores access if valid. This is the exact mechanism every payment is judged by — no server in between.",
    placeholder: "0x… transaction hash (64 hex chars)",
    btn: "Check on-chain",
    working: "Reading from Abstract…",
    ok: "Transaction is valid",
    errInvalid: "Invalid hash format",
    errNotFound: "Transaction not found or not confirmed yet",
    errFailed: "Transaction reverted",
    errToken: "Transferred token is not PENGU",
    errRecipient: "Recipient is not the project treasury",
    errAmount: "Amount is below the minimum tariff",
    savedFor: "Access saved for the payer wallet",
    payer: "Payer",
    amount: "Amount",
    plan: "Plan",
    validUntil: "Valid until",
  },
  access: {
    title: "Access status",
    none: "No active access",
    noneBody: "Pay for a plan with a connected wallet, or verify a previous payment hash to unlock the signal.",
    tier1: "Daily signal",
    tier2: "Full access",
    activeUntil: "Active until",
    plan: "Plan",
    tx: "Transaction",
    remaining: "Remaining",
    locked: "This section is locked",
    lockedBody: "The daily signal unlocks the top 5 indicators; full access unlocks the whole analysis.",
    renewSoon: "Your access expires in less than 24 hours",
    renewNow: "One-click renewal",
  },
  security: {
    title: "Security first, security second, engine third",
    body: "The system is built so that even if this page were hosted on a hostile server, nothing is at risk beyond what you sign in your own wallet.",
    p1t: "No keys, no middleman",
    p1b: "There is no backend; private keys never leave your wallet and every payment is signed by you. The site cannot build a transaction without your signature.",
    p2t: "On-chain verification",
    p2b: "The source of truth is the Abstract blockchain: transaction receipts, Transfer logs, the treasury address and block timestamps — all read from public RPC, never stored centrally.",
    p3t: "Transparent engine",
    p3b: "Formulas and weights are public and deterministic; a SHA-256 hash of the input data ships with every analysis so anyone can reproduce and audit the output.",
    bullets: [
      "Sign-in via Abstract Global Wallet — a smart wallet with native Account Abstraction, no browser extension to install",
      "Strict CSP served by Cloudflare (_headers) — no third-party scripts",
      "Addresses are always EIP-55 checksummed and compared via getAddress",
      "Minimum payment enforced on-chain to reject spam transactions",
      "Access lives only on the user's device and is recoverable from a tx hash",
      "Modular, auditable source — no eval, no sensitive browser storage",
    ],
  },
  method: {
    title: "Engine methodology — v",
    body: "Each indicator runs on real 4-hour and daily candles built from CoinGecko data and is normalised to a [-1, +1] vote; the final score is the weighted mix of both timeframes.",
    rows: [
      { name: "RSI (Wilder)", formula: "RSI = 100 − 100 / (1 + EMA(gain) / EMA(loss))", desc: "Below 30 oversold (buy vote), above 70 overbought (sell vote)" },
      { name: "MACD", formula: "MACD = EMA₁₂ − EMA₂₆ , Signal = EMA₉(MACD)", desc: "Histogram sign & slope + zero-line crosses" },
      { name: "EMA Stack", formula: "EMAₜ = α·Pₜ + (1−α)·EMAₜ₋₁ , α = 2/(n+1)", desc: "Price position vs EMA 20/50/200" },
      { name: "Bollinger", formula: "%B = (P − (μ − 2σ)) / 4σ", desc: "Mean reversion at band edges + squeeze detection" },
      { name: "Stochastic", formula: "%K = 100·(C − LL₁₄)/(HH₁₄ − LL₁₄)", desc: "20/80 extremes and K/D relation" },
      { name: "ROC", formula: "ROC = 100·(Pₜ − Pₜ₋₁₀)/Pₜ₋₁₀", desc: "Pure 10-period momentum" },
      { name: "OBV", formula: "OBVₜ = OBVₜ₋₁ ± Vₜ", desc: "Volume-flow divergence vs its 20-MA" },
      { name: "Structure", formula: "HH/HL → uptrend , LH/LL → downtrend", desc: "Ordering of local swing highs/lows" },
    ],
    verdicts: "Final verdict: score ≥ 55 strong buy • ≥ 22 buy • ≤ −22 sell • ≤ −55 strong sell • otherwise neutral",
  },
  footer: {
    disclaimer: "Pengu Pulse is a mathematical read of market data only — not financial, legal or investment advice. You are responsible for your trades.",
    built: "Built on the Abstract blockchain",
    treasury: "Public treasury",
    explorer: "View treasury on Abscan",
    docs: "Technical docs (README + docs/)",
    portal: "Register on Abstract Portal",
    rights: "© {y} Pengu Pulse — open & auditable",
  },
  terminal: {
    agwReady: "AGW ready to sign in",
    agwOn: "AGW connected",
    gateTitle: "The terminal lives behind the AGW gate",
    gateBody: "Sign in with your Abstract Global Wallet to unlock today's signal — no extension to install; email, QR code or a social account is enough.",
    gateBtn: "Sign in with Abstract",
    why1: "No extension — a smart wallet right in your browser",
    why2: "Gas-free — sponsored by the Abstract network paymaster",
    why3: "Payments go straight to the public project treasury — trackable on Abscan",
    gasFree: "Gas fee: 0 — sponsored by the Abstract network paymaster",
    smartWallet: "AGW smart wallet",
    foundation: "Security foundation layer",
    dailySignal: "Today's signal",
    dailyBody: "One PENGU for 24 hours of daily-signal access — the lightest way to try the engine.",
    dailyReset: "Daily reset (UTC)",
    unlock: "Unlock for {n} PENGU",
    otherPlans: "Other plans & subscriptions",
  },
  toast: { copied: "Copied", paid: "Payment confirmed — access active", verified: "Valid transaction — access restored", payFail: "Payment failed", renewed: "Renewed successfully" },
};

const DICTS: Record<Lang, Dict> = { fa, en };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  dir: "rtl" | "ltr";
}

const Ctx = createContext<I18nCtx>({ lang: DEFAULT_LANG, setLang: () => {}, t: DICTS[DEFAULT_LANG], dir: "rtl" });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("pp:lang");
      return saved === "en" || saved === "fa" ? saved : DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("pp:lang", l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    document.title = DICTS[lang].meta.title;
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t: DICTS[lang], dir: (lang === "fa" ? "rtl" : "ltr") as "rtl" | "ltr" }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

# دیپلوی روی Cloudflare Pages (طرح رایگان، بدون کارت) + ثبت در Abstract Portal

## ۱) Cloudflare Pages — گام‌به‌گام

1. در [dash.cloudflare.com](https://dash.cloudflare.com) با ایمیل ثبت‌نام کنید (طرح Free — بدون کارت اعتباری).
2. کد را در یک ریپازیتوری گیت‌هاب/گیت‌لب بگذارید.
3. منوی **Workers & Pages → Create → Pages → Connect to Git** و ریپازیتوری را انتخاب کنید.
4. تنظیمات بیلد:

   | فیلد | مقدار |
   |---|---|
   | Framework preset | `Vite` (یا None) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Node version | `18+` (متغیر `NODE_VERSION=20`) |

5. **Deploy**. فایل‌های `public/_headers` و `public/_redirects` به‌صورت خودکار کپی و اعمال می‌شوند:
   - `_headers` → CSP سخت‌گیرانه و هدرهای امنیتی (بدون نیاز به تنظیمات اضافی)
   - `_redirects` → روتینگ SPA

6. (اختیاری) **Custom domains** → اتصال دامنه با DNS خودکار Cloudflare.

### جایگزین CLI

```bash
npm i -g wrangler
npm run build
wrangler pages deploy dist --project-name pengu-pulse
```

> هر دو مسیر روی طرح رایگان‌اند؛ محدودیت‌ها (پهنای باند نامحدود، ۵۰۰ دیپلوی/ماه) برای این پروژه بسیار بیشتر از نیاز است.

## ۲) ثبت پروژه در Abstract Portal

[portal.abs.xyz](https://portal.abs.xyz) درگاه رسمی اکوسیستم Abstract برای نمایش و کشف پروژه‌هاست.

### پیش‌نیازها
- سایت دیپلوی‌شده روی دامنهٔ عمومی (ترجیحاً HTTPS با دامنهٔ اختصاصی)
- یک کیف پول Abstract (یا هر کیف EVM) برای امضای ثبت
- لوگو/تصویر پروژه (مربع، ترجیحاً 512×512)

### مراحل
1. ورود به [portal.abs.xyz](https://portal.abs.xyz) و اتصال کیف پول.
2. انتخاب **Submit / Register a project** و تکمیل فرم:
   - **نام**: `Pengu Pulse (پنگو پالس)`
   - **دسته**: Analytics / Tools / Trading
   - **شبکه**: Abstract Mainnet (Chain ID 2741)
   - **URL**: آدرس دیپلوی‌شدهٔ Cloudflare Pages
   - **توضیح کوتاه**: «ترمینال سیگنال تکنیکال PENGU با راستی‌آزمایی پرداخت روی‌زنجیره‌ای»
   - **قرارداد‌ها**: آدرس توکن PENGU `0x9eBe3A824Ca958e4b3Da772D2065518F009CBa62` و خزانه `0x60Df4E186364c3a49A550Aee29Da1d5fe3658818`
3. امضای پیام تأیید مالکیت با کیف پول و ارسال برای بازبینی تیم Abstract.
4. پس از تأیید، پروژه در Portal فهرست می‌شود؛ می‌توانید نشان «Built on Abstract» را هم دریافت کنید.

### نکات افزایش شانس تأیید
- صفحهٔ Security/Methodology شفاف است (در خود اپ موجود) — لینک مستقیم بدهید
- لینک Abscan خزانه را ضمیمه کنید تا جریان وجوه عمومی و قابل حسابرسی دیده شود
- ریپازیتوری عمومی + README کامل (این مخزن) را ذکر کنید

## ۳) چک‌لیست نهایی دیپلوی

- [ ] بیلد بدون خطا: `npm run build`
- [ ] هدرهای CSP فعال‌اند (در DevTools → Network بررسی `content-security-policy`)
- [ ] اتصال کیف پول + افزودن خودکار شبکهٔ Abstract کار می‌کند
- [ ] پرداخت 1 PENGU → باز شدن سیگنال امروز (رسید در Abscan)
- [ ] پنل «راستی‌آزمایی» همان تراکنش را با هش تأیید می‌کند
- [ ] کش آفلاین: قطع شبکه → دادهٔ `stale` نمایش داده می‌شود، نه خطای خالی
- [ ] هر دو زبان fa/en و جهت RTL/LTR

# دیپلوی روی Cloudflare Workers Static Assets (رایگان) + ثبت در Abstract Portal

## ۱) مدل دیپلوی فعلی پروژه

پروژه به‌صورت **Workers Static Assets** دیپلوی می‌شود (نه Pages):

- فایل `wrangler.jsonc` ریشه + پلاگین `@cloudflare/vite-plugin`
- دستور دیپلوی: `npm run deploy` (= بیلد + `wrangler deploy`)
- روتینگ SPA با `assets.not_found_handling: "single-page-application"` — به همین دلیل فایل `_redirects` حذف شده (باعث خطای 100324 حلقهٔ بی‌نهایت می‌شد)
- هدرهای امنیتی: `public/_headers` (CSP سازگار با مودال ورود AGW/Privy)

> نکتهٔ مهم: CSP شامل `frame-src` و `connect-src` برای `*.privy.io` و ریله‌های WalletConnect است؛ بدون آن‌ها مودال ورود AGW در مرورگر مسدود می‌شود.

## ۲) گام‌به‌گام (طرح رایگان، بدون کارت اعتباری)

1. ثبت‌نام در [dash.cloudflare.com](https://dash.cloudflare.com) (طرح Free)
2. اتصال ریپازیتوری به **Workers Builds** یا دیپلوی دستی با CLI:

```bash
npm i -D wrangler
npm run build
npx wrangler deploy        # در اولین اجرا، پروژه را به‌صورت خودکار پیکربندی می‌کند
```

3. پیکربندی خودکار wrangler برای Vite:
   - Worker Name: `pengupulse`
   - Build Command: `npm run build`
   - Output: `dist`
   - SPA fallback فعال
4. (اختیاری) اتصال دامنهٔ اختصاصی در داشبورد Workers → Settings → Domains

## ۳) ثبت پروژه در Abstract Portal

[portal.abs.xyz](https://portal.abs.xyz) درگاه رسمی اکوسیستم Abstract برای کشف پروژه‌هاست.

### پیش‌نیازها
- سایت دیپلوی‌شده با دامنهٔ عمومی HTTPS
- کیف پول Abstract (AGW) برای امضای ثبت
- لوگوی مربع 512×512

### مراحل
1. ورود به Portal و اتصال کیف پول
2. تکمیل فرم ثبت پروژه:
   - **نام**: Pengu Pulse (پنگو پالس)
   - **دسته**: Analytics / Trading Tools
   - **شبکه**: Abstract Mainnet — Chain ID 2741
   - **URL**: آدرس دیپلوی‌شده
   - **قرارداد‌ها**: توکن PENGU `0x9eBe3A824Ca958e4b3Da772D2065518F009CBa62` و خزانه `0x60Df4E186364c3a49A550Aee29Da1d5fe3658818`
3. امضای پیام تأیید و ارسال برای بازبینی
4. پس از تأیید، پروژه در Portal فهرست و واجد شرایط رأی‌گیری جامعه می‌شود

### نکات افزایش شانس تأیید
- لینک Abscan خزانه (جریان وجوه عمومی و قابل حسابرسی)
- ریپازیتوری عمومی + README کامل
- صفحهٔ Security/Methodology شفاف داخل خود اپ

## ۴) چک‌لیست نهایی

- [ ] `npm run build` بدون خطا
- [ ] `npx wrangler deploy` بدون خطای `_redirects` (فایل حذف شده)
- [ ] هدر CSP در DevTools → Network وجود دارد و مودال AGW باز می‌شود
- [ ] پرداخت PENGU → رسید در Abscan → باز شدن دسترسی
- [ ] پنل «راستی‌آزمایی» همان تراکنش را با هش تأیید می‌کند
- [ ] جریان زندهٔ خزانه، تراکنش‌های عمومی را نشان می‌دهد
- [ ] ۱۰ زبان و جهت RTL/LTR

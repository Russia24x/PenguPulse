# معماری پنگو پالس

## ۱) نمای کلی جریان داده

```
CoinGecko API ──► lib/market.ts ──► کندل‌های 4H/1D ──► lib/ta.ts (موتور) ──► Analysis
                                                                                 │
Abstract RPC ◄── viem (lib/chain.ts) ◄── کیف پول هوشمند AGW (بدون افزونه)        ▼
        │                │                                               UI (App.tsx)
        └── دریافت رسید + لاگ Transfer + مهر بلوک ──► AccessGrant ──► دروازهٔ tier 0/1/2
```

- **بدون سرور**: همه‌چیز در مرورگر اجرا می‌شود؛ خروجی `npm run build` یک سایت کاملاً استاتیک است.
- **مرجع حقیقت زنجیره است**: هیچ ادعای دسترسی‌ای بدون رسید معتبر روی Abstract پذیرفته نمی‌شود.

## ۲) مدل اعتماد (Trust Model)

| دارایی | محل نگهداری | ریسک |
|---|---|---|
| کلید خصوصی | فقط کیف پول کاربر | اپ هرگز به آن دسترسی ندارد |
| وجوه PENGU | خزانهٔ عمومی روی زنجیره | هر انتقال با امضای کاربر و قابل مشاهده در Abscan |
| وضعیت دسترسی | کش localStorage + زنجیره | با گم‌شدن کش، با هش تراکنش بازیابی می‌شود |
| دادهٔ بازار | CoinGecko + کش محلی | هش SHA-256 داده کنار تحلیل منتشر می‌شود |

### جریان پرداخت (Pay Flow)

1. `buildPaymentData` → کالیدیتای `transfer(treasury, amount)` روی توکن PENGU
2. `abstractClient.sendTransaction` از طریق AGW (امضای کاربر داخل کیف پول هوشمند)
3. `waitForTransactionReceipt` (۱ تأیید) → بررسی `status === success`
4. رمزگشایی لاگ `Transfer` → بررسی `token == PENGU` و `to == treasury` و `value >= حداقل`
5. `getBlock` → مهر زمانی بلوک = شروع اعتبار؛ `expiresAt = grantedAt + hours×3600`
6. ذخیرهٔ `AccessGrant` فقط روی دستگاه کاربر

### راستی‌آزمایی عمومی

هر کس با هر هش تراکنش می‌تواند از پنل «راستی‌آزمایی» همان مسیر ۳ تا ۵ را اجرا کند — همان کدی که پرداخت جدید را تأیید می‌کند. این یعنی **ادعای دسترسی ≡ اثبات روی زنجیره**.

## ۳) موتور تحلیل — جزئیات

### نرمال‌سازی آرا
| اندیکاتور | منطق رأی |
|---|---|
| RSI | `clamp((50−RSI)/20, −1, 1)` — پیوسته حول ۵۰ |
| MACD | تقاطع صفر هیستوگرام (±0.9) + علامت (±0.45) + شیب (±0.25) |
| EMA Stack | موقعیت قیمت نسبت به 20/50/200 (هرکدام ≈⅓) |
| Bollinger | `clamp((0.5−%B)×2.2)×0.8` + تشخیص Squeeze (اطلاع‌رسانی، نه جهت) |
| Stochastic | ناحیهٔ ۲۰/۸۰ + رابطهٔ K/D |
| ROC | `clamp(ROC₁₀/6)` |
| OBV | انحراف از میانگین ۲۰ دوره‌ای، نرمال‌شده |
| ساختار | HH/HL در برابر LH/LL روی Swingهای محلی |

### ترکیب
`score = 0.45 × score₄ₕ + 0.55 × score₁𝒹` که هر `score` میانگین وزنی آرا × ۱۰۰ است.
`confidence = clamp(|score|×0.65 + agreement×0.45)` و `agreement` سهم وزنی آرای هم‌جهت.

### داده‌ورودی
- `market_chart?days=30` (ساعتی) → کندل ۴ساعته با OHLC از نقاط داخل باکت و حجم تجمعی
- `market_chart?days=365` (روزانه) → کندل روزانه برای EMA200 و ATR و پیوت‌ها
- تازه‌سازی هر ۹۰ ثانیه + کش ۵ دقیقه‌ای + fallback به کش کهنه با پرچم `stale`

## ۴) چندزبانه‌سازی

`src/i18n.tsx` از نوع `Dict` استفاده می‌کند؛ افزودن زبان:
1. کپی شیء `fa` و ترجمه
2. ثبت در `DICTS`
تماس‌ها: `useI18n().t.…` — جهت صفحه (`dir`) و عنوان به‌صورت خودکار اعمال می‌شود.

## ۵) پیکربندی (Data-Driven)

همهٔ اعداد حیاتی در `src/config.ts`:
- `ABSTRACT` (زنجیره/RPC/اکسپلورر) · `PENGU` (آدرس توکن/اعشار/شناسهٔ CoinGecko) · `TREASURY`
- `PLANS` (قیمت/مدت/سطح) · `ENGINE.weights` · `ENGINE.tfMix` · `ENGINE.verdicts`
تغییر هر سیاست = ویرایش یک فایل، بدون دست‌کاری UI یا منطق.

## ۶) نقشهٔ راه — قرارداد اشتراک (Auto-Pay واقعی)

برای تمدید بدون امضای روزانه، یک قرارداد حداقلی پیشنهاد می‌شود (دیپلوی با Foundry/Hardhat روی Abstract):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface IERC20 { function transferFrom(address,address,uint256) external returns (bool); }

/// کاربر یک‌بار approve می‌کند؛ سپس هرکس می‌تواند تمدید دورهٔ بعد را
/// (فقط در بازهٔ مجازِ نزدیک انقضا) با transferFrom اجرا کند.
contract SubscriptionVault {
    IERC20 public immutable pengu;
    address public immutable treasury;
    uint256 public constant DAILY_PRICE = 1e18;
    mapping(address => uint256) public validUntil;

    constructor(IERC20 _p, address _t) { pengu = _p; treasury = _t; }

    /// فقط در ۶ ساعت مانده به انقضا یا بعد از آن قابل اجراست
    function renew(address user) external {
        uint256 base = block.timestamp > validUntil[user] ? block.timestamp : validUntil[user];
        require(base - validUntil[user] <= 6 hours, "too-early");
        require(pengu.transferFrom(user, treasury, DAILY_PRICE), "pay");
        validUntil[user] = base + 1 days;
    }

    function hasAccess(address user) external view returns (bool) {
        return validUntil[user] > block.timestamp;
    }
}
```

سپس `lib/chain.ts` به‌جای خواندن رسید، `hasAccess(user)` را می‌خواند و `bestAccess` از زنجیره می‌آید — ارتقایی کاملاً سازگار با معماری فعلی.

## ۷) تست و راستی‌آزمایی عملکردی

- `npm run typecheck` در CI محلی
- توابع `lib/ta.ts` خالص‌اند — تست واحد روی دادهٔ واقعی CoinGecko ممکن است (ورودی/خروجی JSON)
- هر پرداخت با لینک Abscan قابل بازرسی عمومی است؛ پنل Verify همان مسیر را برای هر هش تکرار می‌کند

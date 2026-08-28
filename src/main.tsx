/*
 * Polyfillهای محیط مرورگر برای کتابخانه‌های web3 (AGW/Privy/wagmi).
 * باید پیش از وارد کردن App (و در نتیجهٔ زنجیرهٔ import کتابخانه‌ها) اجرا شود.
 */
import { Buffer } from "buffer";

const g = globalThis as Record<string, unknown>;
if (typeof g.Buffer === "undefined") g.Buffer = Buffer;
if (typeof g.global === "undefined") g.global = globalThis;
if (typeof g.process === "undefined") {
  g.process = { env: {}, version: "", browser: true };
}

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

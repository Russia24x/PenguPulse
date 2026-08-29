/**
 * لایهٔ کیف پول و پرداخت — Abstract Global Wallet (AGW)
 * ------------------------------------------------------------------
 * AGW یک کیف پول هوشمند (Smart Contract Wallet) با Account Abstraction
 * بومیِ Abstract است؛ کاربر بدون نصب هیچ افزونه‌ای (ایمیل/QR/اجتماعی)
 * وارد می‌شود. ورود با useLoginWithAbstract، وضعیت با useAccount و
 * پرداخت با abstractClient.sendTransaction انجام می‌شود؛ گس تراکنش‌ها
 * توسط Paymaster شبکهٔ Abstract اسپانسر می‌شود.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ABSTRACT, PENGU, PLANS, TREASURY, fmt, planById, type Plan, type PlanId } from "../config";
import { useI18n } from "../i18n";
import {
  ChainError,
  confirmAndGrant,
  explorerAddr,
  explorerTx,
  fetchPenguBalance,
  fetchTreasuryFeed,
  readAutoRenew,
  saveGrantFor,
  sendPaymentViaAgw,
  type TreasuryInflow,
  verifyTxHash,
  writeAutoRenew,
  type AccessGrant,
} from "../lib/chain";
import { IcBolt, IcChain, IcCheck, IcCopy, IcExternal, IcLock, IcRefresh, IcSearch, IcShield, IcWallet, IcX } from "./icons";
import { Section, planName } from "./panels";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { useAbstractClient, useLoginWithAbstract } from "@abstract-foundation/agw-react";
import { useAccount } from "wagmi";
import type { AbstractClient } from "@abstract-foundation/agw-client";

/* ------------------------------- useWallet ------------------------------ */
export interface WalletApi {
  status: "idle" | "connecting" | "connected";
  address: Address | null;
  balance: bigint | null;
  connect: () => void;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  abstractClient: AbstractClient | null;
}

export function useWallet(): WalletApi {
  const { address: rawAddress, isConnected, isConnecting } = useAccount();
  const { login, logout } = useLoginWithAbstract();
  const { data: abstractClient } = useAbstractClient();
  const [balance, setBalance] = useState<bigint | null>(null);

  const address = (rawAddress as Address | undefined) ?? null;
  const status: WalletApi["status"] = isConnecting ? "connecting" : isConnected ? "connected" : "idle";

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      setBalance(await fetchPenguBalance(address));
    } catch {
      /* RPC موقتاً در دسترس نیست */
    }
  }, [address]);

  useEffect(() => {
    if (status === "connected") void refreshBalance();
    else setBalance(null);
  }, [status, refreshBalance]);

  return {
    status,
    address,
    balance,
    connect: login,
    disconnect: logout,
    refreshBalance,
    abstractClient: abstractClient ?? null,
  };
}

/* ------------------------------ WalletButton ---------------------------- */
export function WalletButton({ wallet, notify }: { wallet: WalletApi; notify: (msg: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      notify(t.toast.copied);
    } catch {
      /* clipboard blocked */
    }
  };

  if (wallet.status === "connected" && wallet.address) {
    return (
      <div className="relative">
        <button onClick={() => setOpen((v) => !v)} className="btn-press flex items-center gap-2.5 rounded-lg border border-gain/40 bg-gain/10 py-2 pe-2.5 ps-3.5 font-mono text-[13px] font-semibold text-gain">
          <span className="relative flex h-2 w-2">
            <span className="pp-ping absolute inline-flex h-full w-full rounded-full bg-gain" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gain" />
          </span>
          <span dir="ltr">{fmt.addr(wallet.address)}</span>
          <span className="rounded-md border border-ice/45 bg-ice/10 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-ice">AGW</span>
        </button>
        {open && (
          <div className="absolute end-0 z-50 mt-2 w-64 rounded-xl border border-line bg-panel p-4 shadow-lift">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-faint">{t.terminal.smartWallet}</p>
              <span className="font-mono text-[10px] tracking-widest text-ice">ABSTRACT #{ABSTRACT.id}</span>
            </div>
            <p className="mt-1 font-mono text-xl font-bold text-snow tabular">
              {wallet.balance === null ? "…" : fmt.pengu(wallet.balance)} <span className="text-[12px] text-beak">{PENGU.symbol}</span>
            </p>
            <div className="mt-3 space-y-1.5 text-[13px]">
              <button onClick={() => void copy(wallet.address!)} className="flex w-full items-center justify-between rounded-lg bg-ink/70 px-3 py-2 text-fog transition-colors hover:text-snow">
                <span dir="ltr" className="font-mono text-[12px]">{fmt.addr(wallet.address)}</span>
                <IcCopy size={15} />
              </button>
              <a href={explorerAddr(wallet.address)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg bg-ink/70 px-3 py-2 text-fog transition-colors hover:text-snow">
                {ABSTRACT.explorerName} <IcExternal size={15} />
              </a>
              <button onClick={() => { wallet.refreshBalance(); setOpen(false); }} className="flex w-full items-center justify-between rounded-lg bg-ink/70 px-3 py-2 text-fog transition-colors hover:text-snow">
                {t.status.refresh} <IcRefresh size={15} />
              </button>
              <button onClick={() => { wallet.disconnect(); setOpen(false); }} className="flex w-full items-center justify-between rounded-lg bg-loss/10 px-3 py-2 font-semibold text-loss transition-colors hover:bg-loss/20">
                {t.status.disconnect} <IcX size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        onClick={() => wallet.connect()}
        disabled={wallet.status === "connecting"}
        className="btn-press flex items-center gap-2 rounded-lg bg-beak px-4 py-2.5 text-sm font-black text-ink shadow-[0_8px_24px_-10px_rgba(255,158,44,0.7)] hover:bg-frost disabled:opacity-60"
      >
        {wallet.status === "connecting" ? (
          <span className="pp-spin inline-block h-4 w-4 rounded-full border-2 border-ink/30 border-t-ink" />
        ) : (
          <IcWallet size={17} />
        )}
        {wallet.status === "connecting" ? t.status.connecting : t.status.connectWallet}
      </button>
      <span className="pointer-events-none absolute end-0 top-full z-50 mt-2 hidden w-60 rounded-lg border border-line bg-abyss/95 p-2.5 text-[11.5px] leading-5 text-fog group-hover:block">
        {t.status.loginHint}
      </span>
    </div>
  );
}

/* -------------------------------- AgwGate ------------------------------- */
export function AgwGate({ wallet }: { wallet: WalletApi }) {
  const { t } = useI18n();
  const [stuck, setStuck] = useState(false);
  const reasons = [
    { icon: <IcWallet size={16} />, text: t.terminal.why1 },
    { icon: <IcBolt size={16} />, text: t.terminal.why2 },
    { icon: <IcChain size={16} />, text: t.terminal.why3 },
  ];

  // اگر پنجرهٔ ورود باز نشد یا دکمه‌هایش پاسخ ندادند، بعد از ۱۲ ثانیه راهنما نشان بده
  useEffect(() => {
    if (wallet.status !== "connecting") {
      setStuck(false);
      return;
    }
    const timer = setTimeout(() => setStuck(true), 12_000);
    return () => clearTimeout(timer);
  }, [wallet.status]);

  const tryConnect = () => {
    setStuck(false);
    wallet.connect();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ice/35 bg-panel/85 p-6">
      <div className="pointer-events-none absolute -start-10 -top-10 h-36 w-36 rounded-full bg-ice/10 blur-2xl" aria-hidden />
      <p className="font-mono text-[11.5px] tracking-[0.22em] text-ice">▚ {t.terminal.gateTitle}</p>
      <p className="mt-2.5 max-w-md text-[13.5px] leading-7 text-fog">{t.terminal.gateBody}</p>
      <button
        onClick={tryConnect}
        disabled={wallet.status === "connecting"}
        className="btn-press pp-ring mt-5 flex items-center gap-2.5 rounded-xl bg-ice px-6 py-3.5 text-[15px] font-black text-ink hover:bg-frost disabled:opacity-60"
      >
        {wallet.status === "connecting" ? (
          <span className="pp-spin inline-block h-4.5 w-4.5 rounded-full border-2 border-ink/30 border-t-ink" />
        ) : (
          <IcWallet size={19} />
        )}
        {wallet.status === "connecting" ? t.status.connecting : t.terminal.gateBtn}
      </button>
      {stuck && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-beak/45 bg-beak/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] leading-5 text-beak">{t.status.loginError}</p>
          <a
            href={window.location.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => setStuck(false)}
            className="btn-press shrink-0 rounded-lg bg-beak px-4 py-1.5 text-[12px] font-black text-ink hover:bg-frost"
          >
            {t.status.openNewTab}
          </a>
        </div>
      )}
      <ul className="mt-5 space-y-2">
        {reasons.map((r, i) => (
          <li key={i} className="flex items-center gap-2.5 text-[12.5px] text-fog">
            <span className="text-beak">{r.icon}</span> {r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------- PayModal ------------------------------ */
type PayStep = "review" | "signing" | "confirming" | "done" | "error";

export function PayModal({
  plan,
  wallet,
  onClose,
  onPaid,
}: {
  plan: Plan;
  wallet: WalletApi;
  onClose: () => void;
  onPaid: (g: AccessGrant) => void;
}) {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<PayStep>("review");
  const [errCode, setErrCode] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [grant, setGrant] = useState<AccessGrant | null>(null);

  const priceWei = useMemo(() => parseUnits(plan.price, PENGU.decimals), [plan]);
  const insufficient = wallet.balance !== null && wallet.balance < priceWei;

  const errText = () => {
    switch (errCode) {
      case "USER_REJECTED": return t.pay.rejected;
      case "INSUFFICIENT": return t.pay.insufficient;
      default: return `${t.pay.failed} (${errCode ?? "NETWORK"})`;
    }
  };

  const start = async () => {
    if (!wallet.address || !wallet.abstractClient) return;
    setErrCode(null);
    setStep("signing");
    try {
      const hash = await sendPaymentViaAgw(wallet.abstractClient, plan);
      setTxHash(hash);
      setStep("confirming");
      const g = await confirmAndGrant(hash);
      saveGrantFor(wallet.address, g);
      setGrant(g);
      setStep("done");
      onPaid(g);
    } catch (e) {
      setErrCode(e instanceof ChainError ? e.code : "NETWORK");
      setStep("error");
    }
  };

  const steps: { id: PayStep; label: string }[] = [
    { id: "review", label: t.pay.step1 },
    { id: "signing", label: t.pay.step2 },
    { id: "confirming", label: t.pay.step3 },
  ];
  const stepIdx = step === "review" ? 0 : step === "signing" ? 1 : 2;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-abyss/85 p-4 backdrop-blur-sm" onClick={step === "signing" || step === "confirming" ? undefined : onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2.5 font-display text-2xl text-snow">
            {t.pay.title}
            <span className="rounded-md border border-ice/45 bg-ice/10 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-ice">AGW</span>
          </h3>
          {step !== "signing" && step !== "confirming" && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-faint transition-colors hover:bg-ink hover:text-snow"><IcX size={18} /></button>
          )}
        </div>

        <div className="mb-6 flex items-center gap-1.5">
          {steps.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center gap-1.5">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-bold ${i < stepIdx || step === "done" ? "bg-gain text-ink" : i === stepIdx ? "bg-beak text-ink" : "bg-ink text-faint"}`}>
                {i < stepIdx || step === "done" ? <IcCheck size={14} /> : i + 1}
              </span>
              <span className={`text-[11.5px] ${i === stepIdx ? "text-snow" : "text-faint"}`}>{s.label}</span>
              {i < 2 && <span className="h-px flex-1 bg-line" />}
            </div>
          ))}
        </div>

        {step === "review" && (
          <>
            <div className="space-y-2.5 rounded-xl border border-line bg-ink/60 p-4 text-[13.5px]">
              <div className="flex items-center justify-between">
                <span className="text-fog">{t.pay.amount}</span>
                <span className="font-mono text-lg font-black text-beak">{plan.price} {PENGU.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fog">{t.pay.duration}</span>
                <span className="font-semibold text-snow">{t.plans.hours(plan.hours)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fog">{t.pay.network}</span>
                <span className="font-mono text-ice">{ABSTRACT.name} · #{ABSTRACT.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fog">Gas</span>
                <span className="font-mono font-bold text-gain">0 ETH ✓</span>
              </div>
              <div>
                <span className="text-fog">{t.pay.recipient}</span>
                <a href={explorerAddr(TREASURY)} target="_blank" rel="noreferrer" dir="ltr" className="mt-1 block break-all font-mono text-[11.5px] text-frost underline-offset-4 hover:underline">
                  {TREASURY}
                </a>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-gain/30 bg-gain/8 px-3 py-2.5 text-[12px] leading-5 text-gain">
              <IcBolt size={15} className="mt-0.5 shrink-0" /> {t.terminal.gasFree}
            </p>
            {insufficient && (
              <p className="mt-3 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-[12.5px] text-loss">
                {t.pay.insufficient} — {t.pay.need}: <b className="font-mono">{plan.price} {PENGU.symbol}</b>
              </p>
            )}
            <button
              onClick={() => void start()}
              disabled={insufficient || wallet.status !== "connected" || !wallet.abstractClient}
              className="btn-press mt-5 w-full rounded-xl bg-beak py-3.5 text-[15px] font-black text-ink hover:bg-frost disabled:cursor-not-allowed disabled:opacity-50"
            >
              {wallet.status !== "connected" ? t.status.connectWallet : t.pay.confirm}
            </button>
          </>
        )}

        {(step === "signing" || step === "confirming") && (
          <div className="py-8 text-center">
            <div className="pp-spin mx-auto h-12 w-12 rounded-full border-[3px] border-line border-t-beak" />
            <p className="mt-5 text-[14.5px] font-semibold text-snow">{step === "signing" ? t.pay.signing : t.pay.confirming}</p>
            {txHash && (
              <a href={explorerTx(txHash)} target="_blank" rel="noreferrer" dir="ltr" className="mt-2 inline-block font-mono text-[11.5px] text-ice underline-offset-4 hover:underline">
                {fmt.addr(txHash)} ↗
              </a>
            )}
          </div>
        )}

        {step === "done" && grant && (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-gain bg-gain/12 text-gain"><IcCheck size={30} /></span>
            <p className="mt-4 font-display text-2xl text-gain">{t.pay.success}</p>
            <p className="mt-2 text-[13px] leading-6 text-fog">{t.pay.successBody}</p>
            <p className="mt-3 font-mono text-[12px] text-faint">
              {t.access.activeUntil}: <span className="text-snow">{fmt.dateTime(grant.expiresAt * 1000, lang)}</span>
            </p>
            <div className="mt-5 flex gap-2">
              {txHash && (
                <a href={explorerTx(txHash)} target="_blank" rel="noreferrer" className="btn-press flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-ink py-3 text-[13px] font-bold text-ice hover:border-ice/50">
                  {t.pay.viewTx} <IcExternal size={15} />
                </a>
              )}
              <button onClick={onClose} className="btn-press flex-1 rounded-xl bg-beak py-3 text-[13px] font-black text-ink hover:bg-frost">{t.pay.close}</button>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="py-4 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-loss bg-loss/12 text-loss"><IcX size={30} /></span>
            <p className="mt-4 text-[14.5px] font-bold text-loss">{errText()}</p>
            {txHash && (
              <a href={explorerTx(txHash)} target="_blank" rel="noreferrer" dir="ltr" className="mt-2 inline-block font-mono text-[11.5px] text-ice underline-offset-4 hover:underline">{fmt.addr(txHash)} ↗</a>
            )}
            <div className="mt-5 flex gap-2">
              <button onClick={() => setStep("review")} className="btn-press flex-1 rounded-xl border border-line bg-ink py-3 text-[13px] font-bold text-snow hover:border-beak/50">{t.pay.retry}</button>
              <button onClick={onClose} className="btn-press flex-1 rounded-xl bg-panel2 py-3 text-[13px] font-bold text-fog">{t.pay.close}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- PlansPanel ----------------------------- */

export function PlansPanel({
  wallet,
  access,
  onPay,
  notify,
}: {
  wallet: WalletApi;
  access: AccessGrant | null;
  onPay: (p: Plan) => void;
  notify: (m: string) => void;
}) {
  const { t } = useI18n();
  const [autoRenew, setAutoRenew] = useState(() => readAutoRenew()?.enabled ?? false);
  const [renewPlan, setRenewPlan] = useState<PlanId>(() => readAutoRenew()?.planId ?? "week");
  void notify;

  const featured = PLANS.find((p) => p.id === "signal")!;
  const rows = PLANS.filter((p) => p.id !== "signal");

  const toggle = (v: boolean, plan: PlanId) => {
    setAutoRenew(v);
    setRenewPlan(plan);
    writeAutoRenew(v ? { enabled: v, planId: plan } : null);
  };

  return (
    <Section id="plans" num="02" kicker="ACCESS & TARIFF" title={t.plans.title} body={t.plans.body} icon={<IcWallet size={30} />}>
      <div className="grid gap-5 lg:grid-cols-5">
        {/* تعرفهٔ ویژه — سیگنال امروز */}
        <RevealFeatured>
          <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-beak/55 bg-gradient-to-b from-panel2 to-panel p-6">
            <span className="absolute -top-3 start-5 rounded-md bg-beak px-2.5 py-0.5 text-[11px] font-black text-ink">{t.plans.popular}</span>
            <div className="pointer-events-none absolute -end-14 -top-14 h-44 w-44 rounded-full bg-beak/10 blur-3xl" aria-hidden />
            <h3 className="font-display text-[26px] text-snow">{t.terminal.dailySignal}</h3>
            <p className="mt-1 text-[13px] leading-6 text-fog">{t.terminal.dailyBody}</p>
            <p className="mt-5 font-mono text-[56px] font-bold leading-none text-beak tabular">
              1<span className="ms-2 text-[18px] font-semibold text-snow/80">{PENGU.symbol}</span>
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line bg-abyss/60 px-4 py-3">
              <p className="flex items-center gap-2 text-[12.5px] text-fog">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="pp-ping absolute h-full w-full rounded-full bg-beak" />
                  <span className="relative h-2 w-2 rounded-full bg-beak" />
                </span>
                {t.plans.duration}
              </p>
              <p className="font-mono text-[16px] font-bold text-snow tabular">{t.plans.hours(featured.hours)}</p>
            </div>
            <ul className="mt-4 flex-1 space-y-2">
              {t.plans.featureSignal.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] leading-5 text-fog">
                  <IcCheck size={14} className="mt-0.5 shrink-0 text-gain" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => onPay(featured)}
              className={`btn-press mt-5 w-full rounded-xl py-3.5 text-[14.5px] font-black ${access?.planId === "signal" ? "bg-gain/15 text-gain" : "bg-beak text-ink hover:bg-frost"}`}
            >
              {access?.planId === "signal" ? `✓ ${t.access.plan}` : t.terminal.unlock.replace("{n}", featured.price)}
            </button>
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-faint"><IcBolt size={13} className="text-gain" /> {t.terminal.gasFree}</p>
          </div>
        </RevealFeatured>

        {/* سایر تعرفه‌ها — ردیف‌های کنسول */}
        <div className="lg:col-span-3">
          <p className="mb-3 font-mono text-[12px] tracking-[0.2em] text-faint">▤ {t.terminal.otherPlans}</p>
          <div className="space-y-3">
            {rows.map((p, i) => {
              const name = planName(t, p.id);
              const desc =
                p.id === "signup"
                  ? t.plans.signupDesc
                  : p.id === "signal"
                    ? t.plans.signalDesc
                    : p.id === "week"
                      ? t.plans.weekDesc
                      : p.id === "month"
                        ? t.plans.monthDesc
                        : t.plans.yearDesc;
              const active = access?.planId === p.id;
              return (
                <div key={p.id} className="plan-row relative rounded-xl border border-line bg-panel/70 p-4 sm:p-5" style={{ transitionDelay: `${i * 30}ms` }}>
                  {p.popular && p.id !== "signal" && (
                    <span className="absolute -top-2.5 end-5 rounded-md bg-ice px-2 py-0.5 text-[10.5px] font-black text-ink">{t.plans.popular}</span>
                  )}
                  {p.subscription && (
                    <span className="absolute -top-2.5 end-5 rounded-md bg-ice/90 px-2 py-0.5 text-[10.5px] font-black text-ink">{t.plans.subscription}</span>
                  )}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[20px] text-snow">{name}</h3>
                      <p className="mt-0.5 text-[12.5px] text-fog">{desc}</p>
                      <ul className="mt-2.5 hidden gap-x-5 gap-y-1 sm:flex sm:flex-wrap">
                        {(p.tier === 1 ? t.plans.featureSignal : t.plans.featureFull).slice(0, 3).map((f, j) => (
                          <li key={j} className="flex items-center gap-1.5 text-[11.5px] text-faint">
                            <IcCheck size={12} className="text-gain" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-end">
                      <p className="font-mono text-[26px] font-bold leading-none text-snow tabular">
                        {p.price}<span className="ms-1.5 text-[13px] font-semibold text-beak">{PENGU.symbol}</span>
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-faint">{t.plans.duration}: {t.plans.hours(p.hours)}</p>
                    </div>
                    <button
                      onClick={() => onPay(p)}
                      className={`btn-press pp-arrow flex items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-black ${active ? "bg-gain/15 text-gain" : "border border-line bg-ink text-snow hover:border-beak/60 hover:text-beak"}`}
                    >
                      {active ? `✓ ${t.access.plan}` : t.terminal.unlock.replace("{n}", p.price)}
                    </button>
                  </div>
                  {p.subscription && (
                    <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-ink/60 px-3 py-1.5 text-[12px] text-fog transition-colors hover:text-snow">
                      <input
                        type="checkbox"
                        checked={autoRenew && renewPlan === p.id}
                        onChange={(e) => toggle(e.target.checked, p.id)}
                        className="h-4 w-4 accent-[#FF9E2C]"
                      />
                      {t.plans.autoRenew}
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-6 text-faint">
            <IcShield size={16} className="mt-0.5 shrink-0 text-gain" />
            {t.plans.autoRenewHint}
          </p>
        </div>
      </div>
    </Section>
  );
}

import { Reveal } from "./display";
function RevealFeatured({ children }: { children: ReactNode }) {
  return <Reveal delay={80} className="lg:col-span-2">{children}</Reveal>;
}

/* ------------------------------- VerifyPanel ---------------------------- */
export function VerifyPanel({ notify }: { notify: (m: string) => void }) {
  const { t, lang } = useI18n();
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: { payer: string; grant: AccessGrant } } | { err: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const { grant, payer } = await verifyTxHash(hash);
      saveGrantFor(payer, grant);
      setResult({ ok: { payer, grant } });
      notify(t.toast.verified);
    } catch (e) {
      const code = e instanceof ChainError ? e.code : "NOT_FOUND";
      const map: Record<string, string> = {
        INVALID_HASH: t.verify.errInvalid,
        NOT_FOUND: t.verify.errNotFound,
        TX_FAILED: t.verify.errFailed,
        NOT_PENGU: t.verify.errToken,
        WRONG_RECIPIENT: t.verify.errRecipient,
        AMOUNT_TOO_LOW: t.verify.errAmount,
      };
      setResult({ err: map[code] ?? t.verify.errNotFound });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="verify" num="03" kicker="ON-CHAIN PROOF" title={t.verify.title} body={t.verify.body} icon={<IcSearch size={30} />}>
      <div className="max-w-3xl rounded-2xl border border-line bg-panel/70 p-6">
        <div className="flex flex-col gap-2 sm:flex-row" dir="ltr">
          <input
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder={t.verify.placeholder}
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-4 py-3.5 font-mono text-[13px] text-snow placeholder:text-faint focus:border-ice/60"
          />
          <button
            onClick={() => void run()}
            disabled={busy || hash.trim().length !== 66}
            className="btn-press flex items-center justify-center gap-2 rounded-xl bg-ice px-6 py-3.5 text-[14px] font-black text-ink hover:bg-frost disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? <IcRefresh size={17} className="pp-spin" /> : <IcSearch size={17} />}
            {busy ? t.verify.working : t.verify.btn}
          </button>
        </div>

        {result && "err" in result && (
          <p className="mt-4 rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-[13px] font-semibold text-loss">✗ {result.err}</p>
        )}
        {result && "ok" in result && (
          <div className="mt-4 rounded-xl border border-gain/40 bg-gain/8 p-4">
            <p className="flex items-center gap-2 font-bold text-gain"><IcCheck size={18} /> {t.verify.ok}</p>
            <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2" dir="ltr">
              <p className="text-fog">{t.verify.payer}: <a className="font-mono text-[12px] text-frost hover:underline" href={explorerAddr(result.ok.payer)} target="_blank" rel="noreferrer">{fmt.addr(result.ok.payer)}</a></p>
              <p className="text-fog">{t.verify.amount}: <b className="font-mono text-beak">{result.ok.grant.pricePaid} {PENGU.symbol}</b></p>
              <p className="text-fog">{t.verify.plan}: <b className="text-snow">{planName(t, result.ok.grant.planId)}</b></p>
              <p className="text-fog">{t.verify.validUntil}: <b className="font-mono text-snow">{fmt.dateTime(result.ok.grant.expiresAt * 1000, lang)}</b></p>
            </div>
            <a href={explorerTx(result.ok.grant.txHash)} target="_blank" rel="noreferrer" dir="ltr" className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] text-ice hover:underline">
              {fmt.addr(result.ok.grant.txHash)} <IcExternal size={13} />
            </a>
            <p className="mt-3 text-[12px] text-faint">{t.verify.savedFor}</p>
          </div>
        )}
      </div>
      <TreasuryFeed />
    </Section>
  );
}

/* -------------------------------- AccessCard ---------------------------- */
export function AccessCard({
  access,
  onRenew,
}: {
  access: AccessGrant | null;
  onRenew: (p: Plan) => void;
}) {
  const { t, lang } = useI18n();
  const [, force] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => force((x) => x + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  const remainingMs = access ? access.expiresAt * 1000 - Date.now() : 0;
  const remainingH = Math.max(0, Math.floor(remainingMs / 3_600_000));
  const remainingM = Math.max(0, Math.floor((remainingMs % 3_600_000) / 60_000));
  const renewSoon = !!access && remainingMs < 24 * 3_600_000;

  return (
    <div className={`rounded-2xl border p-5 ${access ? (access.tier === 2 ? "border-gain/45 bg-gain/6" : "border-ice/45 bg-ice/6") : "border-line bg-panel/70"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-xl text-snow">
          {access ? <IcShield size={20} className="text-gain" /> : <IcLock size={20} className="text-faint" />}
          {t.access.title}
        </h3>
        <span className={`rounded-md px-2.5 py-1 font-mono text-[11.5px] font-bold ${access ? "bg-gain/15 text-gain" : "bg-ink text-faint"}`}>
          {access ? (access.tier === 2 ? t.access.tier2 : t.access.tier1) : "—"}
        </span>
      </div>
      {access ? (
        <>
          {renewSoon && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-beak/45 bg-beak/10 px-3 py-2.5">
              <p className="text-[12.5px] font-semibold text-beak">⚠ {t.access.renewSoon}</p>
              <button onClick={() => onRenew(planById("week"))} className="btn-press rounded-lg bg-beak px-3.5 py-1.5 text-[12px] font-black text-ink hover:bg-frost">
                {t.access.renewNow} — {planById("week").price} {PENGU.symbol}
              </button>
            </div>
          )}
          <div className="mt-3 grid gap-2 text-[13px]">
            <p className="flex items-center justify-between text-fog">
              {t.access.plan}
              <b className="text-snow">{planName(t, access.planId)} · {access.pricePaid} {PENGU.symbol}</b>
            </p>
            <p className="flex items-center justify-between text-fog">
              {t.access.remaining}
              <b className="font-mono text-ice tabular" dir="ltr">{remainingH}h {remainingM}m</b>
            </p>
            <p className="flex items-center justify-between text-fog">
              {t.access.activeUntil}
              <b className="font-mono text-[12px] text-snow" dir="ltr">{fmt.dateTime(access.expiresAt * 1000, lang)}</b>
            </p>
            <a href={explorerTx(access.txHash)} target="_blank" rel="noreferrer" className="flex items-center justify-between text-fog transition-colors hover:text-ice">
              {t.access.tx}
              <span className="font-mono text-[12px]" dir="ltr">{fmt.addr(access.txHash)} ↗</span>
            </a>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[13px] leading-6 text-fog">{t.access.noneBody}</p>
      )}
    </div>
  );
}

/* ------------------------------- TreasuryFeed ---------------------------
 * فید زندهٔ پرداخت‌های خزانه — فقط دادهٔ عمومی زنجیره
 */
export function TreasuryFeed() {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<TreasuryInflow[] | null>(null);

  useEffect(() => {
    let stop = false;
    const load = () => fetchTreasuryFeed(8).then((r) => !stop && setRows(r)).catch(() => {});
    load();
    const iv = setInterval(load, 60_000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="corners relative mt-8 max-w-3xl rounded-2xl border border-line bg-ink/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-xl text-snow">
          <IcChain size={20} className="text-ice" /> {t.feed.title}
        </h3>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-faint">
          <span className="relative flex h-1.5 w-1.5">
            <span className="pp-ping absolute h-full w-full rounded-full bg-gain" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-gain" />
          </span>
          60s
        </span>
      </div>
      {rows === null ? (
        <div className="flex items-center gap-3 py-6 text-fog">
          <span className="pp-spin inline-block h-5 w-5 rounded-full border-2 border-line border-t-ice" />
          <span className="font-mono text-[12px]">{t.verify.working}</span>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-4 font-mono text-[12.5px] text-faint">{t.feed.empty}</p>
      ) : (
        <ul className="divide-y divide-line/60" dir="ltr">
          {rows.map((r) => (
            <li key={r.txHash + String(r.blockNumber)} className="flex items-center justify-between gap-3 py-2.5 font-mono text-[12px]">
              <a href={explorerAddr(r.from)} target="_blank" rel="noreferrer" className="text-fog transition-colors hover:text-frost">
                {fmt.addr(r.from)}
              </a>
              <span className="font-bold text-beak tabular">{fmt.pengu(r.value)} {PENGU.symbol}</span>
              <span className="hidden text-faint sm:inline tabular">#{r.blockNumber.toLocaleString("en-US")}</span>
              <a href={explorerTx(r.txHash)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-ice transition-colors hover:text-frost">
                tx <IcExternal size={12} />
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11.5px] leading-5 text-faint">{t.feed.note}</p>
    </div>
  );
}

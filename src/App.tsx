/**
 * پنگو پالس — App
 * ترکیب: دادهٔ زندهٔ بازار → موتور تحلیل → دروازهٔ دسترسی روی‌زنجیره‌ای
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ABSTRACT, APP, PENGU, fmt, planById, type Plan } from "./config";
import { I18nProvider, useI18n } from "./i18n";
import { analyze } from "./lib/ta";
import { fetchMarket, type MarketBundle } from "./lib/market";
import { bestAccess, discoverOnChainAccess, fetchBlockNumber, readAutoRenew, saveGrantFor, type AccessGrant, type ScanState } from "./lib/chain";
import { PenguLogo, IcBolt, IcCandles, IcCompass, IcGlobe, IcPulse, IcRefresh, IcSnow } from "./components/icons";
import { PriceChart, Reveal, SignalGauge, TickerTape, type TickerItem } from "./components/display";
import { Footer, IndicatorPanel, MethodPanel, RiskPanel, SecurityPanel } from "./components/panels";
import { AccessCard, AgwGate, PayModal, PlansPanel, VerifyPanel, WalletButton, useWallet, type WalletApi } from "./components/wallet";
import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { abstractChain } from "./lib/chain";

interface MarketState {
  status: "loading" | "live" | "error";
  bundle: MarketBundle | null;
}

/* ------------------------------ BootStrip ------------------------------
 * نوار وضعیت زندهٔ ترمینال: وضعیت AGW، بلوک، فید داده، نسخهٔ موتور
 */
function BootStrip({ wallet, blockNum, dataHash, stale }: { wallet: WalletApi; blockNum: bigint | null; dataHash?: string; stale?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="border-b border-line/60 bg-ink/60">
      <div dir="ltr" className="mx-auto flex w-full max-w-6xl items-center gap-2.5 overflow-x-auto whitespace-nowrap px-4 py-2 font-mono text-[11px] tracking-wider text-faint">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${wallet.status === "connected" ? "bg-gain" : "bg-beak"}`} />
          <span className={wallet.status === "connected" ? "text-gain" : "text-beak"}>
            {wallet.status === "connected" && wallet.address ? `AGW:${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : "AGW:READY"}
          </span>
        </span>
        <span aria-hidden>·</span>
        <span className="text-ice">ABS#{ABSTRACT.id}</span>
        <span aria-hidden>·</span>
        <span className="tabular">{t.status.block} {blockNum !== null ? `#${blockNum.toLocaleString("en-US")}` : "…"}</span>
        <span aria-hidden>·</span>
        <span className={stale ? "text-beak" : ""}>FEED:CG{dataHash ? `#${dataHash}` : ""}{stale ? "(CACHE)" : ""}</span>
        <span aria-hidden>·</span>
        <span>ENGINE:v{APP.engineVersion}</span>
        <span className="pp-caret inline-block h-3 w-1.5 bg-ice/80" aria-hidden />
      </div>
    </div>
  );
}

/* -------------------------------- Spark ---------------------------------
 * اسپارک‌لاین کوچک از آخرین بسته‌شدن‌های کندل
 */
function Spark({ values, tone }: { values: number[]; tone: "gain" | "loss" | "ice" }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${26 - ((v - min) / span) * 22 + 1}`).join(" ");
  const cls = tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ice";
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={`h-7 w-24 ${cls}`} aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" pathLength={300} style={{ ["--dash" as string]: 300 }} className="pp-spark" />
    </svg>
  );
}

function AppInner() {
  const { t, lang, setLang } = useI18n();
  const wallet = useWallet();

  const [market, setMarket] = useState<MarketState>({ status: "loading", bundle: null });
  const [blockNum, setBlockNum] = useState<bigint | null>(null);
  const [tf, setTf] = useState<"4H" | "1D">("4H");
  const [payPlan, setPayPlan] = useState<Plan | null>(null);
  const [accessTick, setAccessTick] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [flash, setFlash] = useState<{ dir: "up" | "down"; key: number } | null>(null);
  const prevPrice = useRef<number | null>(null);

  const notify = (msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-3), { id, msg }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4600);
  };

  /* ------------------------- دادهٔ بازار ------------------------- */
  useEffect(() => {
    let stop = false;
    const load = async (force: boolean) => {
      try {
        const bundle = await fetchMarket({ force });
        if (!stop) setMarket({ status: "live", bundle });
      } catch {
        if (!stop) setMarket((s) => (s.bundle ? { status: "live", bundle: s.bundle } : { status: "error", bundle: null }));
      }
    };
    void load(false);
    const iv = setInterval(() => void load(true), APP.marketPollMs);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);

  /* ------------------------- شمارهٔ بلوک ------------------------- */
  useEffect(() => {
    const f = () => fetchBlockNumber().then(setBlockNum).catch(() => {});
    f();
    const iv = setInterval(f, APP.blockPollMs);
    return () => clearInterval(iv);
  }, []);

  /* ------------------------- تایمر دسترسی ------------------------ */
  useEffect(() => {
    const iv = setInterval(() => setAccessTick((x) => x + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  const analysis = useMemo(
    () => (market.bundle ? analyze(market.bundle.candles4h, market.bundle.candles1d) : null),
    [market.bundle],
  );

  const access: AccessGrant | null = useMemo(
    () => bestAccess(wallet.address, Math.floor(Date.now() / 1000)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet.address, accessTick, market.bundle],
  );
  const tier: 0 | 1 | 2 = access?.tier ?? 0;

  /* ------------------------- فلش قیمت ---------------------------- */
  useEffect(() => {
    const p = market.bundle?.snapshot.price;
    if (p && prevPrice.current !== null && p !== prevPrice.current) {
      setFlash({ dir: p > prevPrice.current ? "up" : "down", key: Date.now() });
    }
    if (p) prevPrice.current = p;
  }, [market.bundle]);

  /* ------------------------- تمدید خودکار ------------------------ */
  const autoRenewBanner = useMemo(() => {
    const pref = readAutoRenew();
    if (!pref?.enabled) return null;
    const remaining = access ? access.expiresAt * 1000 - Date.now() : 0;
    if (access && remaining > 3_600_000) return null;
    return planById(pref.planId);
  }, [access, accessTick]);

  const onPay = (plan: Plan) => {
    if (wallet.status !== "connected") {
      notify(t.status.connectWallet);
      wallet.connect();
      return;
    }
    setPayPlan(plan);
  };

  /* --------------------------- تیکرها ---------------------------- */
  const snap = market.bundle?.snapshot;
  const items: TickerItem[] = useMemo(() => {
    if (!snap) return [];
    const athDrop = ((snap.ath - snap.price) / snap.ath) * 100;
    return [
      { label: `${PENGU.symbol}/USD`, value: fmt.usd(snap.price), tone: "beak" },
      { label: "24H", value: fmt.pct(snap.change24h), tone: snap.change24h >= 0 ? "gain" : "loss" },
      { label: "VOL", value: `$${fmt.compact(snap.volume24h)}`, tone: "ice" },
      { label: "MCAP", value: `$${fmt.compact(snap.marketCap)}` },
      { label: "H24", value: fmt.usd(snap.high24h), tone: "gain" },
      { label: "L24", value: fmt.usd(snap.low24h), tone: "loss" },
      { label: "ATH↓", value: `${athDrop.toFixed(1)}%`, tone: "loss" },
      { label: t.status.block, value: blockNum ? `#${blockNum.toLocaleString("en-US")}` : "…", tone: "ice" },
      { label: t.status.engine, value: `v${APP.engineVersion}` },
      { label: t.status.data, value: market.bundle?.dataHash ?? "…", tone: "beak" },
    ];
  }, [snap, blockNum, market.bundle, t]);

  const verdictColor =
    !analysis || tier === 0
      ? "text-faint border-line"
      : analysis.verdict === "strongBuy" || analysis.verdict === "buy"
        ? "text-gain border-gain"
        : analysis.verdict === "sell" || analysis.verdict === "strongSell"
          ? "text-loss border-loss"
          : "text-ice border-ice";
  const verdictText = !analysis
    ? "—"
    : t.gauge[analysis.verdict];
  const actionText = !analysis
    ? "…"
    : analysis.score >= 22
      ? t.gauge.actionBuy
      : analysis.score <= -22
        ? t.gauge.actionSell
        : t.gauge.actionWait;
  const chartCandles = market.bundle ? (tf === "4H" ? market.bundle.candles4h : market.bundle.candles1d) : [];

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="bg-grid-ice pointer-events-none fixed inset-0" aria-hidden />
      <div className="pointer-events-none fixed -top-32 start-1/4 h-96 w-96 rounded-full bg-ice/8 blur-[110px]" aria-hidden />
      <div className="pointer-events-none fixed bottom-0 end-0 h-80 w-80 rounded-full bg-beak/7 blur-[110px]" aria-hidden />

      <div className="relative z-10">
        <TickerTape items={items.length ? items : [{ label: PENGU.symbol, value: "…" }]} />

        {/* ------------------------------ Header ------------------------------ */}
        <header className="sticky top-0 z-40 border-b border-line/70 bg-abyss/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <a href="#signal" className="flex items-center gap-3">
              <PenguLogo size={38} />
              <span className="leading-none">
                <span className="block font-display text-[21px] text-snow">{APP.name}</span>
                <span className="block font-mono text-[10.5px] tracking-[0.3em] text-ice">{APP.nameEn} · ABS</span>
              </span>
            </a>
            <nav className="hidden items-center gap-6 text-[13.5px] font-semibold text-fog lg:flex">
              <a href="#signal" className="transition-colors hover:text-beak">{t.nav.signal}</a>
              <a href="#indicators" className="transition-colors hover:text-beak">{t.nav.indicators}</a>
              <a href="#plans" className="transition-colors hover:text-beak">{t.nav.plans}</a>
              <a href="#verify" className="transition-colors hover:text-beak">{t.nav.verify}</a>
              <a href="#security" className="transition-colors hover:text-beak">{t.nav.security}</a>
              <a href="#method" className="transition-colors hover:text-beak">{t.nav.method}</a>
            </nav>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setLang(lang === "fa" ? "en" : "fa")}
                className="btn-press flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2.5 text-[12.5px] font-bold text-fog hover:border-ice/50 hover:text-ice"
                title={t.status.langToggle}
              >
                <IcGlobe size={15} /> {t.status.langToggle}
              </button>
              <WalletButton wallet={wallet} notify={notify} />
            </div>
          </div>
        </header>

        <BootStrip wallet={wallet} blockNum={blockNum} dataHash={market.bundle?.dataHash} stale={market.bundle?.stale} />

        {/* --------------------------- Opening terminal ------------------------ */}
        <main>
          <section id="signal" className="relative mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-10 pt-10 sm:pt-14">
            <div className="grid gap-8 lg:grid-cols-12">
              {/* ستون سیگنال */}
              <div className="lg:col-span-5">
                <Reveal>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[12px] tracking-[0.18em] text-beak">
                    <span className="flex items-center gap-2"><IcPulse size={16} /> {t.hero.kicker}</span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-widest ${wallet.status === "connected" ? "border-gain/45 bg-gain/10 text-gain" : "border-ice/45 bg-ice/10 text-ice"}`}>
                      {wallet.status === "connected" ? t.terminal.agwOn : t.terminal.agwReady}
                    </span>
                  </p>
                  <h1 className="mt-3 font-display leading-[1.06]">
                    <span className="block text-[52px] text-snow sm:text-[68px]">{t.hero.title1}</span>
                    <span className="block text-[52px] text-ice sm:text-[68px]">{t.hero.title2}</span>
                  </h1>
                  <p className="mt-4 max-w-md text-[14.5px] leading-8 text-fog">{t.hero.lead}</p>
                </Reveal>

                <Reveal delay={110}>
                  <div className="mt-7 flex flex-wrap items-end gap-x-6 gap-y-2">
                    {market.status === "error" ? (
                      <div>
                        <p className="text-[14px] font-semibold text-loss">{t.status.marketError}</p>
                        <button
                          onClick={() => {
                            setMarket({ status: "loading", bundle: null });
                            void fetchMarket({ force: true })
                              .then((b) => setMarket({ status: "live", bundle: b }))
                              .catch(() => setMarket({ status: "error", bundle: null }));
                          }}
                          className="btn-press mt-2 flex items-center gap-2 rounded-lg bg-beak px-4 py-2 text-[13px] font-black text-ink"
                        >
                          <IcRefresh size={15} /> {t.status.retry}
                        </button>
                      </div>
                    ) : !snap ? (
                      <div className="flex items-center gap-3 py-3 text-fog">
                        <span className="pp-spin inline-block h-6 w-6 rounded-full border-2 border-line border-t-ice" />
                        <span className="text-[13.5px]">{t.status.loadingMarket}</span>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-mono text-[11px] tracking-widest text-faint">{PENGU.symbol} / USD</p>
                          <p key={flash?.key ?? 0} className={`font-mono text-[44px] font-bold leading-tight text-snow tabular sm:text-[54px] ${flash ? (flash.dir === "up" ? "flash-up" : "flash-down") : ""}`} dir="ltr">
                            {fmt.usd(snap.price)}
                          </p>
                        </div>
                        <div className="pb-2">
                          <div className="flex items-center gap-3">
                            <span className={`rounded-lg px-3 py-1.5 font-mono text-[13.5px] font-bold tabular ${snap.change24h >= 0 ? "bg-gain/12 text-gain" : "bg-loss/12 text-loss"}`} dir="ltr">
                              {fmt.pct(snap.change24h)}
                            </span>
                            {market.bundle && (
                              <Spark
                                values={market.bundle.candles4h.slice(-40).map((c) => c.c)}
                                tone={snap.change24h >= 0 ? "gain" : "loss"}
                              />
                            )}
                          </div>
                          <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-faint">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="pp-ping absolute h-full w-full rounded-full bg-gain" />
                              <span className="relative h-1.5 w-1.5 rounded-full bg-gain" />
                            </span>
                            {t.status.live} · {t.gauge.updated} {fmt.dateTime(snap.updatedAt, lang)}
                            {market.bundle?.stale && <span className="text-beak">· {t.status.offline}</span>}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {snap && (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { k: "VOL 24H", v: `$${fmt.compact(snap.volume24h)}` },
                        { k: "MCAP", v: `$${fmt.compact(snap.marketCap)}` },
                        { k: "H24", v: fmt.usd(snap.high24h) },
                        { k: "L24", v: fmt.usd(snap.low24h) },
                      ].map((s) => (
                        <div key={s.k} className="rounded-lg border border-line/70 bg-panel/60 px-3 py-2.5 transition-colors hover:border-ice/40">
                          <p className="font-mono text-[10.5px] tracking-wider text-faint">{s.k}</p>
                          <p className="font-mono text-[14px] font-semibold text-snow tabular" dir="ltr">{s.v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Reveal>

                {/* گیج + حکم */}
                <Reveal delay={200}>
                  <div className="mt-7 rounded-2xl border border-line bg-panel/70 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-bold text-fog">{t.gauge.composite}</p>
                      <span className="font-mono text-[11px] text-faint">4H ×45% + 1D ×55%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-center">
                      <SignalGauge score={analysis?.score ?? 0} locked={tier === 0} />
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-4">
                      {tier === 0 ? (
                        <a href="#plans" className="btn-press flex items-center gap-2 rounded-xl bg-beak px-6 py-3 text-[15px] font-black text-ink hover:bg-frost">
                          <IcBolt size={18} /> {t.hero.ctaSignal}
                        </a>
                      ) : (
                        <>
                          <span className={`stamp px-4 py-1.5 font-display text-[22px] ${verdictColor}`}>{verdictText}</span>
                          <span className="font-mono text-[13px] text-fog">
                            {actionText} · {t.gauge.confidence} <b className="text-snow tabular">{analysis?.confidence}%</b>
                          </span>
                        </>
                      )}
                    </div>
                    {tier !== 0 && analysis && (
                      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                        {analysis.timeframes.map((x) => (
                          <div key={x.label} className="rounded-lg bg-ink/60 px-3 py-2">
                            <p className="font-mono text-[11px] text-faint">{x.label}</p>
                            <p className={`font-mono text-[16px] font-bold tabular ${x.score >= 0 ? "text-gain" : "text-loss"}`} dir="ltr">
                              {x.score >= 0 ? "+" : ""}{x.score.toFixed(1)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Reveal>

                <Reveal delay={260}>
                  <div className="mt-5 space-y-4">
                    {wallet.status !== "connected" ? (
                      <AgwGate wallet={wallet} />
                    ) : (
                      <>
                        <AccessCard access={access} onRenew={onPay} />
                        {!access && (
                          <button
                            onClick={() => onPay(planById("signal"))}
                            className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-beak py-3.5 text-[14.5px] font-black text-ink hover:bg-frost"
                          >
                            <IcBolt size={18} /> {t.hero.ctaSignal}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </Reveal>
              </div>

              {/* ستون نمودار */}
              <div className="lg:col-span-7">
                <Reveal delay={140} className="h-full">
                  <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel/80 shadow-lift">
                    <div className="pp-scanline pointer-events-none absolute inset-x-0 top-0 z-0 h-24 bg-gradient-to-b from-ice/8 to-transparent" aria-hidden />
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                      <h2 className="flex items-center gap-2.5 font-display text-xl text-snow">
                        <IcCandles size={22} className="text-ice" /> {t.chart.title}
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="hidden items-center gap-1.5 font-mono text-[11px] text-fog sm:flex">
                          <i className="h-0.5 w-4 bg-ice" /> {t.chart.ema20}
                          <i className="ms-2 h-0.5 w-4 bg-beak" /> {t.chart.ema50}
                          <i className="ms-2 inline-block h-2.5 w-4 rounded-sm bg-ice/20" /> {t.chart.bb}
                        </span>
                        <div className="flex overflow-hidden rounded-lg border border-line font-mono text-[12px]">
                          {(["4H", "1D"] as const).map((k) => (
                            <button
                              key={k}
                              onClick={() => setTf(k)}
                              className={`px-3.5 py-1.5 font-bold transition-colors ${tf === k ? "bg-ice text-ink" : "bg-ink text-fog hover:text-snow"}`}
                            >
                              {k}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            setMarket((s) => ({ ...s }));
                            void fetchMarket({ force: true })
                              .then((b) => setMarket({ status: "live", bundle: b }))
                              .catch(() => notify(t.status.marketError));
                          }}
                          className="btn-press rounded-lg border border-line bg-ink p-1.5 text-fog hover:border-ice/50 hover:text-ice"
                          title={t.status.refresh}
                        >
                          <IcRefresh size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="relative z-10 flex-1 px-2 pt-2">
                      {chartCandles.length ? (
                        <PriceChart candles={chartCandles} visible={tf === "4H" ? 96 : 120} />
                      ) : (
                        <div className="flex h-[300px] items-center justify-center sm:h-[360px]">
                          <span className="pp-spin h-9 w-9 rounded-full border-[3px] border-line border-t-ice" />
                        </div>
                      )}
                    </div>
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
                      <p className="font-mono text-[11px] tracking-wider text-faint" dir="ltr">
                        4H×{chartCandles.length} + 1D×{market.bundle?.candles1d.length ?? 0} candles · CoinGecko → Abstract
                      </p>
                      <div className="flex items-center gap-2 font-mono text-[11.5px] text-fog">
                        <IcSnow size={14} className="text-ice" /> {t.status.onAbstract}
                        {blockNum !== null && <span className="text-ice tabular" dir="ltr">#{blockNum.toLocaleString("en-US")}</span>}
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>

            {autoRenewBanner && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-beak/50 bg-beak/10 px-5 py-4">
                <p className="flex items-center gap-2 text-[13.5px] font-bold text-beak">
                  <IcCompass size={18} /> {t.access.renewSoon} — {t.plans.autoRenew}
                </p>
                <button onClick={() => onPay(autoRenewBanner)} className="btn-press rounded-lg bg-beak px-4 py-2 text-[13px] font-black text-ink hover:bg-frost">
                  {t.access.renewNow} — {autoRenewBanner.price} {PENGU.symbol}
                </button>
              </div>
            )}
          </section>

          <IndicatorPanel analysis={analysis} tier={tier} />
          <RiskPanel analysis={analysis} tier={tier} />
          <PlansPanel wallet={wallet} access={access} onPay={onPay} notify={notify} />
          <VerifyPanel notify={notify} />
          <SecurityPanel />
          <MethodPanel />
        </main>

        <Footer />
      </div>

      {payPlan && (
        <PayModal
          plan={payPlan}
          wallet={wallet}
          onClose={() => setPayPlan(null)}
          onPaid={(g) => {
            setAccessTick((x) => x + 1);
            notify(t.toast.paid);
            void wallet.refreshBalance();
            void g;
          }}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-5 start-4 z-[100] space-y-2">
        {toasts.map((x) => (
          <div key={x.id} className="stamp-none animate-[pp-stamp_0.35s_ease-out] rounded-xl border border-ice/40 bg-panel/95 px-4 py-3 text-[13px] font-bold text-snow shadow-lift backdrop-blur">
            {x.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AbstractWalletProvider chain={abstractChain}>
      <I18nProvider>
        <AppInner />
      </I18nProvider>
    </AbstractWalletProvider>
  );
}

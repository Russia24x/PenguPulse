/**
 * پنل‌های محتوایی ترمینال
 */
import type { ReactNode } from "react";
import { ABSTRACT, APP, ENGINE, PENGU, TREASURY } from "../config";
import { useI18n, type Dict } from "../i18n";
import type { Analysis, IndicatorResult, TimeframeAnalysis } from "../lib/ta";
import { IcBolt, IcChain, IcCompass, IcDoc, IcFish, IcGauge, IcLock, IcShield, IcSnow, IcWallet } from "./icons";
import { Reveal } from "./display";
import { explorerAddr } from "../lib/chain";

/* ------------------------------ Section ------------------------------ */
export function Section({
  id,
  num,
  kicker,
  title,
  body,
  children,
  icon,
}: {
  id: string;
  num?: string;
  kicker: string;
  title: string;
  body?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:py-20">
      <Reveal>
        <div className="mb-8">
          <p className="mb-2 flex items-center gap-3 font-mono text-[12px] tracking-[0.22em] text-beak uppercase">
            {num && <span className="text-ice">{"//"}</span>}
            {num && <span className="tabular">{num}</span>}
            {kicker}
          </p>
          <div className="flex items-end gap-4">
            {icon && <div className="mb-2 hidden shrink-0 text-ice sm:block">{icon}</div>}
            <h2 className="font-display text-3xl leading-tight text-snow sm:text-[40px]">{title}</h2>
          </div>
          <div className="pp-rule mt-4 h-px w-full bg-gradient-to-l from-line via-line to-transparent" />
          {body && <p className="mt-4 max-w-3xl text-[15px] leading-8 text-fog">{body}</p>}
        </div>
      </Reveal>
      {children}
    </section>
  );
}

const readingTone = (r: IndicatorResult["reading"]) =>
  r === "buy" ? "bg-gain/12 text-gain border-gain/40" : r === "sell" ? "bg-loss/12 text-loss border-loss/40" : "bg-ice/10 text-ice border-ice/35";

/* --------------------------- VoteBar (رأی اندیکاتور) --------------------------- */
function VoteBar({ vote, delay }: { vote: number; delay: number }) {
  const w = Math.min(100, Math.abs(vote)) * 50;
  return (
    <div dir="ltr" className="relative h-2 w-full overflow-hidden rounded-full bg-ink">
      <span className="absolute inset-y-0 left-1/2 w-px bg-line" aria-hidden />
      <span
        className={`pp-votegrow absolute inset-y-0 rounded-full ${vote >= 0 ? "left-1/2 bg-gain" : "right-1/2 bg-loss"}`}
        style={{ width: `${w}%`, animationDelay: `${delay}ms` }}
      />
    </div>
  );
}

function TfVoteBoard({ tf, t, limit, redacted }: { tf: TimeframeAnalysis; t: Dict; limit?: number; redacted?: boolean }) {
  const rows = limit ? tf.indicators.slice(0, limit) : tf.indicators;
  const weightSum = rows.reduce((s, r) => s + r.weight, 0);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel/70">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-mono text-sm font-semibold text-ice">{tf.label}</span>
        {redacted ? (
          <span className="flex items-center gap-1.5 font-mono text-[12px] text-faint">
            <IcLock size={13} /> {t.indicators.score}: <b className="text-faint">–––</b>
          </span>
        ) : (
          <span className="font-mono text-[12px] text-fog">
            {t.indicators.score}: <b className={tf.score >= 0 ? "text-gain" : "text-loss"}>{tf.score >= 0 ? "+" : ""}{tf.score.toFixed(1)}</b>
            <span className="ms-2 text-faint">Σw = {weightSum}</span>
          </span>
        )}
      </div>
      <ul>
        {rows.map((r, i) => (
          <li key={r.key} className="group border-t border-line/60 px-4 py-3.5 transition-colors first:border-t-0 hover:bg-panel2/60">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13.5px] font-semibold text-snow">
                {t.indicators[r.key]}
                {!redacted && (
                  <span className="ms-2 text-[11.5px] font-normal text-faint">{t.indicators[noteKey(r.note)]}</span>
                )}
              </p>
              {redacted ? (
                <span className="shrink-0 rounded-md border border-line px-2.5 py-0.5 text-[11.5px] font-bold text-faint">–</span>
              ) : (
                <span className={`shrink-0 rounded-md border px-2.5 py-0.5 text-[11.5px] font-bold ${readingTone(r.reading)}`}>
                  {r.reading === "buy" ? t.indicators.buy : r.reading === "sell" ? t.indicators.sell : t.indicators.neutral}
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <span className="w-20 shrink-0 font-mono text-[12px] text-fog tabular" dir="ltr">
                {redacted ? "–––––" : r.display}
              </span>
              <VoteBar vote={redacted ? 0 : r.vote} delay={120 + i * 70} />
              <span className="w-9 shrink-0 text-end font-mono text-[11px] text-faint tabular" dir="ltr">w{r.weight}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const NOTE_MAP: Record<
  IndicatorResult["note"],
  "overbought" | "oversold" | "bullish" | "bearish" | "flat" | "squeeze" | "crossUp" | "crossDown" | "above" | "below"
> = {
  overbought: "overbought",
  oversold: "oversold",
  bullish: "bullish",
  bearish: "bearish",
  flat: "flat",
  squeeze: "squeeze",
  "cross-up": "crossUp",
  "cross-down": "crossDown",
  above: "above",
  below: "below",
};
const noteKey = (n: IndicatorResult["note"]) => NOTE_MAP[n];

/* --------------------------- IndicatorPanel --------------------------- */
export function IndicatorPanel({ analysis, tier }: { analysis: Analysis | null; tier: 0 | 1 | 2 }) {
  const { t } = useI18n();
  if (!analysis) return null;
  const [fast, slow] = analysis.timeframes;
  return (
    <Section id="indicators" num="01" kicker="SIGNAL ENGINE" title={t.indicators.title} body={t.indicators.body} icon={<IcGauge size={30} />}>
      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal delay={0}>
          <TfVoteBoard tf={fast} t={t} limit={tier === 1 ? 5 : undefined} redacted={tier === 0} />
        </Reveal>
        <Reveal delay={120}>
          {tier === 2 ? (
            <TfVoteBoard tf={slow} t={t} />
          ) : (
            <div className="relative flex h-full min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel/40 p-8 text-center">
              <IcLock size={34} className="text-faint" />
              <p className="mt-4 font-display text-xl text-snow">{t.access.locked}</p>
              <p className="mt-2 max-w-sm text-[13.5px] leading-7 text-fog">{t.access.lockedBody}</p>
              <a href="#plans" className="btn-press mt-5 rounded-lg bg-beak px-5 py-2.5 text-sm font-bold text-ink hover:bg-frost">
                {t.nav.plans} ↑
              </a>
            </div>
          )}
        </Reveal>
      </div>
    </Section>
  );
}

/* ------------------------------ RiskPanel ------------------------------ */
export function RiskPanel({ analysis, tier }: { analysis: Analysis | null; tier: 0 | 1 | 2 }) {
  const { t } = useI18n();
  if (!analysis) return null;
  const p = analysis.pivots;
  const price = analysis.price;
  const levels = [
    { k: "R3", v: p.r3, tone: "loss" },
    { k: "R2", v: p.r2, tone: "loss" },
    { k: "R1", v: p.r1, tone: "loss" },
    { k: "P", v: p.p, tone: "ice" },
    { k: "S1", v: p.s1, tone: "gain" },
    { k: "S2", v: p.s2, tone: "gain" },
    { k: "S3", v: p.s3, tone: "gain" },
  ] as const;
  const stopLong = price - 1.5 * (analysis.atrPct / 100) * price;
  const stopShort = price + 1.5 * (analysis.atrPct / 100) * price;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16">
      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="h-full rounded-xl border border-line bg-panel/70 p-5">
            <h3 className="mb-1 flex items-center gap-2 font-display text-xl text-snow">
              <IcCompass size={22} className="text-ice" /> {t.risk.pivots}
              {tier === 0 && <IcLock size={15} className="text-faint" />}
            </h3>
            <p className="mb-4 text-[12.5px] text-faint">{t.risk.pivots} · {t.risk.swings}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {levels.map((l) => (
                <div key={l.k} className="rounded-lg border border-line/70 bg-ink/60 px-3 py-2.5 transition-transform hover:-translate-y-0.5">
                  <p className={`font-mono text-[11px] ${l.tone === "gain" ? "text-gain" : l.tone === "loss" ? "text-loss" : "text-ice"}`}>{l.k}</p>
                  <p className="font-mono text-[13.5px] font-semibold text-snow tabular" dir="ltr">
                    {tier === 0 ? "––––––" : l.v.toFixed(6)}
                  </p>
                </div>
              ))}
              <div className="rounded-lg border border-beak/40 bg-beak/8 px-3 py-2.5">
                <p className="font-mono text-[11px] text-beak">{t.risk.atr}</p>
                <p className="font-mono text-[13.5px] font-semibold text-snow tabular">
                  {tier === 0 ? "–––" : `${analysis.atrPct.toFixed(2)}%`}
                </p>
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="h-full rounded-xl border border-line bg-panel/70 p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-xl text-snow">
              <IcShield size={22} className="text-beak" /> {t.risk.title}
              {tier < 2 && <IcLock size={15} className="text-faint" />}
            </h3>
            <div className="space-y-2.5 font-mono text-[13px]" dir="ltr">
              <div className="flex items-center justify-between rounded-lg bg-ink/60 px-3 py-2.5">
                <span className="text-fog">{t.risk.longStop}</span>
                <span className="font-semibold text-gain tabular">{tier < 2 ? "––––––" : stopLong.toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-ink/60 px-3 py-2.5">
                <span className="text-fog">{t.risk.shortStop}</span>
                <span className="font-semibold text-loss tabular">{tier < 2 ? "––––––" : stopShort.toFixed(6)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-ink/60 px-3 py-2.5">
                <span className="text-fog">1.5×ATR</span>
                <span className="text-ice tabular">{tier < 2 ? "–––" : `±${(1.5 * analysis.atrPct).toFixed(2)}%`}</span>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-6 text-faint">{t.risk.note}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------- SecurityPanel ---------------------------- */
export function SecurityPanel() {
  const { t } = useI18n();
  const slabs = [
    { n: "01", icon: <IcShield size={24} />, title: t.security.p1t, body: t.security.p1b, accent: "text-gain", bar: "bg-gain" },
    { n: "02", icon: <IcChain size={24} />, title: t.security.p2t, body: t.security.p2b, accent: "text-ice", bar: "bg-ice" },
    { n: "03", icon: <IcBolt size={24} />, title: t.security.p3t, body: t.security.p3b, accent: "text-beak", bar: "bg-beak" },
  ];
  return (
    <Section id="security" num="04" kicker="SECURITY FIRST · ۱ و ۲ و ۳ = امنیت" title={t.security.title} body={t.security.body} icon={<IcShield size={30} />}>
      {/* لایهٔ بنیادین: AGW */}
      <Reveal>
        <div className="relative overflow-hidden rounded-xl border border-ice/45 bg-gradient-to-l from-ice/12 via-panel/80 to-panel/80 p-6">
          <div className="flex flex-wrap items-center gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-ice/40 bg-abyss/60 text-ice">
              <IcWallet size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2.5 font-display text-[22px] text-snow">
                {t.terminal.smartWallet}
                <span className="rounded-md border border-ice/45 bg-ice/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-ice">{t.terminal.foundation}</span>
              </p>
              <p className="mt-1.5 max-w-3xl text-[13.5px] leading-7 text-fog">
                {t.terminal.why1} · {t.terminal.why2} · {t.terminal.why3}
              </p>
            </div>
          </div>
          <div className="pp-scanline pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ice/10 to-transparent" aria-hidden />
        </div>
      </Reveal>
      {/* سه اصل — چیدمان پلکانی */}
      <div className="mt-5 space-y-4">
        {slabs.map((c, i) => (
          <Reveal key={c.n} delay={i * 110}>
            <div className={`card-lift relative overflow-hidden rounded-xl border border-line bg-panel/70 p-6 ${i === 1 ? "lg:ms-[5%]" : i === 2 ? "lg:ms-[10%]" : ""}`}>
              <span className={`absolute inset-y-0 start-0 w-1 ${c.bar}`} aria-hidden />
              <div className="flex items-start gap-5">
                <span className={`mt-0.5 shrink-0 ${c.accent}`}>{c.icon}</span>
                <div className="min-w-0">
                  <h3 className="flex items-baseline gap-3 font-display text-[22px] leading-8 text-snow">
                    <span className={`font-mono text-[13px] font-bold ${c.accent}`}>{c.n}</span>
                    {c.title}
                  </h3>
                  <p className="mt-1.5 max-w-3xl text-[13.5px] leading-7 text-fog">{c.body}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={160}>
        <ul className="mt-8 grid gap-2.5 rounded-xl border border-line bg-ink/50 p-5 sm:grid-cols-2">
          {t.security.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-6 text-fog">
              <IcSnow size={15} className="mt-1 shrink-0 text-ice" />
              {b}
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}

/* ----------------------------- MethodPanel ----------------------------- */
/** ترتیب ردیف‌های i18n دقیقاً مطابق ترتیب وزن‌های موتور است */
const WEIGHT_ORDER: (keyof typeof ENGINE.weights)[] = [
  "rsi", "macd", "trend", "bollinger", "stoch", "momentum", "volume", "structure",
];

export function MethodPanel() {
  const { t } = useI18n();
  return (
    <Section id="method" num="05" kicker="METHODOLOGY" title={`${t.method.title} ${APP.engineVersion}`} body={t.method.body} icon={<IcFish size={30} />}>
      <Reveal>
        <div className="grid gap-3 md:grid-cols-2">
          {t.method.rows.map((r, i) => (
            <div key={r.name} className="card-lift rounded-xl border border-line bg-panel/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-snow">{r.name}</h3>
                <span className="rounded-md bg-ink px-2 py-0.5 font-mono text-[11px] text-beak">w = {ENGINE.weights[WEIGHT_ORDER[i]]}</span>
              </div>
              <p className="mt-3 overflow-x-auto whitespace-nowrap rounded-lg bg-abyss px-3 py-2 font-mono text-[12.5px] text-frost" dir="ltr">
                {r.formula}
              </p>
              <p className="mt-2.5 text-[12.5px] leading-6 text-fog">{r.desc}</p>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal delay={120}>
        <p className="mt-6 rounded-xl border border-beak/35 bg-beak/8 px-5 py-4 text-center font-mono text-[13px] text-beak" >
          {t.method.verdicts}
        </p>
      </Reveal>
    </Section>
  );
}

/* -------------------------------- Footer ------------------------------- */
export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative border-t border-line/70 bg-ink/60">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl text-snow">{t.meta.appName} <span className="text-beak">•</span> PENGU PULSE</p>
          <p className="mt-3 max-w-xs text-[13px] leading-7 text-fog">{t.meta.tagline}</p>
          <p className="mt-4 flex items-center gap-2 font-mono text-[12px] text-ice">
            <IcChain size={15} /> {t.footer.built}
          </p>
        </div>
        <div className="text-[13px] leading-7 text-fog">
          <p className="mb-2 font-bold text-snow">{t.footer.treasury}</p>
          <a href={explorerAddr(TREASURY)} target="_blank" rel="noreferrer" dir="ltr" className="block break-all font-mono text-[12px] text-frost underline-offset-4 hover:text-beak hover:underline">
            {TREASURY}
          </a>
          <a href={explorerAddr(TREASURY)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-ice hover:text-frost">
            {t.footer.explorer} ↗
          </a>
        </div>
        <div className="text-[13px] leading-7 text-fog">
          <p className="mb-2 font-bold text-snow">{t.footer.docs}</p>
          <p dir="ltr" className="font-mono text-[12px] text-faint">README.md · docs/ARCHITECTURE.md · docs/DEPLOYMENT.md</p>
          <a href="https://portal.abs.xyz/" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-beak hover:text-frost">
            <IcDoc size={15} /> {t.footer.portal} ↗
          </a>
          <p className="mt-3 font-mono text-[11.5px] text-faint" dir="ltr">
            {PENGU.symbol} · {ABSTRACT.name} #{ABSTRACT.id} · engine v{APP.engineVersion}
          </p>
        </div>
      </div>
      <div className="border-t border-line/60">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <p className="text-[12px] leading-6 text-faint">{t.footer.disclaimer}</p>
          <p className="mt-2 font-mono text-[11.5px] text-faint">{t.footer.rights.replace("{y}", String(new Date().getFullYear()))}</p>
        </div>
      </div>
    </footer>
  );
}

export const planName = (t: Dict, id: string) =>
  id === "signup"
    ? t.plans.signup
    : id === "signal"
      ? t.plans.signal
      : id === "week"
        ? t.plans.week
        : id === "month"
          ? t.plans.month
          : id === "year"
            ? t.plans.year
            : t.plans.lifetime;

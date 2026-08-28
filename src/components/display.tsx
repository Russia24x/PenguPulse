/**
 * لایهٔ نمایش — عناصر زندهٔ بصری
 * Reveal • SnowCanvas • TickerTape • SignalGauge • PriceChart
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { bollinger, ema, type Candle } from "../lib/ta";
import { fmt } from "../config";
import { useI18n } from "../i18n";

/* ------------------------------ Reveal ------------------------------ */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            io.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} data-reveal className={className} style={{ "--rv-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

/* ---------------------------- SnowCanvas ----------------------------- */
export function SnowCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let flakes: { x: number; y: number; r: number; s: number; w: number }[] = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(window.innerWidth / 22);
      flakes = Array.from({ length: n }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0.7 + Math.random() * 1.9,
        s: 0.25 + Math.random() * 0.75,
        w: Math.random() * Math.PI * 2,
      }));
    };
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = "rgba(214,238,248,0.5)";
      for (const f of flakes) {
        f.y += f.s;
        f.w += 0.008;
        f.x += Math.sin(f.w) * 0.3;
        if (f.y > window.innerHeight + 4) {
          f.y = -4;
          f.x = Math.random() * window.innerWidth;
        }
        ctx.globalAlpha = 0.18 + f.r * 0.14;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}

/* ----------------------------- TickerTape ---------------------------- */
export interface TickerItem {
  label: string;
  value: string;
  tone?: "gain" | "loss" | "ice" | "beak";
}
export function TickerTape({ items }: { items: TickerItem[] }) {
  const toneCls = (t?: TickerItem["tone"]) =>
    t === "gain" ? "text-gain" : t === "loss" ? "text-loss" : t === "ice" ? "text-ice" : t === "beak" ? "text-beak" : "text-snow";
  const Row = () => (
    <div className="flex items-center gap-8 px-4">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2 whitespace-nowrap font-mono text-[12.5px] tracking-wide">
          <span className="text-faint">{it.label}</span>
          <span className={`tabular font-semibold ${toneCls(it.tone)}`}>{it.value}</span>
          <span className="ms-4 text-line">◆</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="pp-marquee overflow-hidden border-b border-line/60 bg-ink/80 py-2 backdrop-blur">
      <div className="pp-marquee-track">
        <Row />
        <Row />
      </div>
    </div>
  );
}

/* ----------------------------- SignalGauge ---------------------------- */
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
};

export function SignalGauge({ score, locked }: { score: number; locked: boolean }) {
  const [shown, setShown] = useState(locked ? 0 : score);
  useEffect(() => {
    if (locked) return;
    const from = shown;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 1100);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (score - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, locked]);

  const zones = [
    { from: -100, to: -55, color: "#FF5C5C" },
    { from: -55, to: -22, color: "#FF9E2C" },
    { from: -22, to: 22, color: "#4CC9E8" },
    { from: 22, to: 55, color: "#7DDFB2" },
    { from: 55, to: 100, color: "#3BDC96" },
  ];
  const needleDeg = locked ? 0 : (Math.max(-100, Math.min(100, shown)) / 100) * 90;

  return (
    <div className={`relative ${locked ? "locked-blur" : ""}`}>
      <svg viewBox="0 0 220 128" className="w-full max-w-[340px]">
        {zones.map((z, i) => (
          <path
            key={i}
            d={arc(110, 112, 92, ((z.from + 100) / 200) * 180, ((z.to + 100) / 200) * 180)}
            stroke={z.color}
            strokeWidth="13"
            fill="none"
            strokeLinecap="butt"
            opacity="0.85"
          />
        ))}
        {[-100, -50, 0, 50, 100].map((v) => {
          const p1 = polar(110, 112, 78, ((v + 100) / 200) * 180);
          const p2 = polar(110, 112, 70, ((v + 100) / 200) * 180);
          return <line key={v} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#5D7890" strokeWidth="1.6" />;
        })}
        <g style={{ transform: `rotate(${needleDeg}deg)`, transformOrigin: "110px 112px", transition: "transform 1.15s cubic-bezier(0.2,0.9,0.25,1)" }}>
          <path d="M110 34 L114.5 108 L105.5 108 Z" fill="#EAF4F9" />
        </g>
        <circle cx="110" cy="112" r="9" fill="#0E2133" stroke="#4CC9E8" strokeWidth="2.5" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-1">
        <span className="font-mono text-[11px] text-faint">
          {locked ? "–––" : `${shown >= 0 ? "+" : ""}${shown.toFixed(0)}`}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ PriceChart ---------------------------- */
export function PriceChart({ candles, visible = 96 }: { candles: Candle[]; visible?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; i: number } | null>(null);
  const { t, lang } = useI18n();

  const view = useMemo(() => candles.slice(-visible), [candles, visible]);
  const overlays = useMemo(() => {
    const closes = candles.map((c) => c.c);
    return { e20: ema(closes, 20).slice(-view.length), e50: ema(closes, 50).slice(-view.length), bb: (() => {
      const b = bollinger(closes, 20, 2);
      return {
        u: b.upper.slice(-view.length),
        l: b.lower.slice(-view.length),
      };
    })() };
  }, [candles, view.length]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const draw = () => {
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!view.length) return;

      const padR = 64;
      const padT = 14;
      const padB = 26;
      const plotW = W - padR - 6;
      const volH = H * 0.16;
      const plotH = H - padT - padB - volH - 8;

      let min = Infinity;
      let max = -Infinity;
      view.forEach((c, i) => {
        min = Math.min(min, c.l, overlays.bb.l[i] ?? Infinity);
        max = Math.max(max, c.h, overlays.bb.u[i] ?? -Infinity);
      });
      const pad = (max - min) * 0.06;
      min -= pad;
      max += pad;
      const maxVol = Math.max(...view.map((c) => c.v));

      const x = (i: number) => 6 + (i + 0.5) * (plotW / view.length);
      const y = (v: number) => padT + (1 - (v - min) / (max - min)) * plotH;
      const cw = Math.max(1.4, (plotW / view.length) * 0.62);

      // خطوط شبکه
      ctx.strokeStyle = "rgba(28,58,85,0.45)";
      ctx.lineWidth = 1;
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#5D7890";
      for (let g = 0; g <= 4; g++) {
        const gy = padT + (plotH / 4) * g;
        ctx.beginPath();
        ctx.moveTo(6, gy);
        ctx.lineTo(6 + plotW, gy);
        ctx.stroke();
        const val = max - ((max - min) / 4) * g;
        ctx.fillText(val >= 1 ? val.toFixed(4) : val.toFixed(6), 6 + plotW + 6, gy + 3);
      }

      // باندهای بولینگر
      ctx.beginPath();
      let started = false;
      view.forEach((_, i) => {
        const v = overlays.bb.u[i];
        if (Number.isNaN(v)) return;
        if (!started) {
          ctx.moveTo(x(i), y(v));
          started = true;
        } else ctx.lineTo(x(i), y(v));
      });
      for (let i = view.length - 1; i >= 0; i--) {
        const v = overlays.bb.l[i];
        if (!Number.isNaN(v)) ctx.lineTo(x(i), y(v));
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(76,201,232,0.07)";
      ctx.fill();

      const line = (arr: number[], color: string, width: number, dash: number[] = []) => {
        ctx.beginPath();
        ctx.setLineDash(dash);
        let s = false;
        arr.forEach((v, i) => {
          if (Number.isNaN(v)) return;
          if (!s) {
            ctx.moveTo(x(i), y(v));
            s = true;
          } else ctx.lineTo(x(i), y(v));
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.setLineDash([]);
      };
      line(overlays.bb.u, "rgba(76,201,232,0.4)", 1);
      line(overlays.bb.l, "rgba(76,201,232,0.4)", 1);
      line(overlays.e20, "#4CC9E8", 1.6);
      line(overlays.e50, "#FF9E2C", 1.6);

      // حجم
      view.forEach((c, i) => {
        const vh = (c.v / maxVol) * volH;
        ctx.fillStyle = c.c >= c.o ? "rgba(59,220,150,0.3)" : "rgba(255,92,92,0.3)";
        ctx.fillRect(x(i) - cw / 2, H - padB - vh, cw, vh);
      });

      // کندل‌ها
      view.forEach((c, i) => {
        const up = c.c >= c.o;
        ctx.strokeStyle = up ? "#3BDC96" : "#FF5C5C";
        ctx.fillStyle = up ? "#3BDC96" : "#FF5C5C";
        ctx.beginPath();
        ctx.moveTo(x(i), y(c.h));
        ctx.lineTo(x(i), y(c.l));
        ctx.lineWidth = 1;
        ctx.stroke();
        const top = y(Math.max(c.o, c.c));
        const bh = Math.max(1, Math.abs(y(c.o) - y(c.c)));
        ctx.fillRect(x(i) - cw / 2, top, cw, bh);
      });

      // خط آخرین قیمت
      const last = view[view.length - 1];
      const ly = y(last.c);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = last.c >= last.o ? "rgba(59,220,150,0.8)" : "rgba(255,92,92,0.8)";
      ctx.beginPath();
      ctx.moveTo(6, ly);
      ctx.lineTo(6 + plotW, ly);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = last.c >= last.o ? "#3BDC96" : "#FF5C5C";
      const label = last.c >= 1 ? last.c.toFixed(4) : last.c.toFixed(6);
      ctx.fillRect(6 + plotW + 2, ly - 9, 58, 17);
      ctx.fillStyle = "#071019";
      ctx.fillText(label, 6 + plotW + 7, ly + 3);

      // برچسب زمان
      ctx.fillStyle = "#5D7890";
      const step = Math.ceil(view.length / 6);
      for (let i = 0; i < view.length; i += step) {
        const d = new Date(view[i].t);
        const lbl = `${d.getMonth() + 1}/${d.getDate()}`;
        ctx.fillText(lbl, x(i) - 12, H - 8);
      }

      // کراس‌هِیر
      if (hover && hover.i >= 0 && hover.i < view.length) {
        const hx = x(hover.i);
        ctx.strokeStyle = "rgba(234,244,249,0.35)";
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(hx, padT);
        ctx.lineTo(hx, H - padB);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [view, overlays, hover]);

  const onMove = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const plotW = rect.width - 64 - 6;
    const i = Math.round(((px - 6) / plotW) * view.length - 0.5);
    setHover({ x: px, y: e.clientY - rect.top, i: Math.max(0, Math.min(view.length - 1, i)) });
  };

  const hc = hover ? view[hover.i] : null;

  return (
    <div ref={wrapRef} className="relative h-[300px] w-full sm:h-[360px]" dir="ltr">
      <canvas ref={canvasRef} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="absolute inset-0 cursor-crosshair" />
      {hc && (
        <div className="pointer-events-none absolute top-2 left-2 z-10 rounded-md border border-line bg-abyss/90 px-3 py-2 font-mono text-[11px] leading-5 text-fog shadow-lift">
          <div className="text-snow">{new Date(hc.t).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric" })}</div>
          <div>
            {t.chart.o} <span className="text-snow tabular">{hc.o.toFixed(6)}</span> {t.chart.h} <span className="text-gain tabular">{hc.h.toFixed(6)}</span>
          </div>
          <div>
            {t.chart.l} <span className="text-loss tabular">{hc.l.toFixed(6)}</span> {t.chart.c} <span className="text-snow tabular">{hc.c.toFixed(6)}</span>
          </div>
          <div>
            {t.chart.v} <span className="text-ice tabular">{fmt.compact(hc.v)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

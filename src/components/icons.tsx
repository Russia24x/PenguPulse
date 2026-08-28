/**
 * آیکن‌های اختصاصی پنگو پالس — همه inline SVG و دست‌ساز
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (p: P) => ({
  width: p.size ?? 20,
  height: p.size ?? 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IcSnow = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2v20M4 6l16 12M20 6L4 18M12 2l-2 3h4l-2-3zM12 22l-2-3h4l-2 3z" />
  </svg>
);
export const IcWallet = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V9" />
    <path d="M3 7.5V17a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17v-5.5A2.5 2.5 0 0 0 18.5 9H5.5A2.5 2.5 0 0 1 3 7.5Z" />
    <circle cx="16.6" cy="14.2" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);
export const IcShield = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l7 2.6v5.2c0 4.6-3 8.4-7 10.2-4-1.8-7-5.6-7-10.2V5.6L12 3Z" />
    <path d="M8.8 12l2.2 2.2 4.2-4.6" />
  </svg>
);
export const IcChain = (p: P) => (
  <svg {...base(p)}>
    <path d="M9.5 14.5 14.5 9.5" />
    <path d="M11 6.8 12.7 5a3.6 3.6 0 0 1 5.1 5.1L16 12" />
    <path d="M13 17.2 11.3 19a3.6 3.6 0 0 1-5.1-5.1L8 12" />
  </svg>
);
export const IcPulse = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 12h4l2.2-6.5 3.4 13 2.6-8 1.6 1.5h5.2" />
  </svg>
);
export const IcCandles = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4v3M7 17v3M4.5 7h5v10h-5zM17 3v2M17 15v3M14.5 5h5v10h-5z" />
  </svg>
);
export const IcCompass = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5 13.2 13.2 8.5 15.5l2.3-4.7 4.7-2.3Z" />
  </svg>
);
export const IcLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
  </svg>
);
export const IcCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.5 12.5 10 18 19.5 6.5" />
  </svg>
);
export const IcX = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IcRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 11.5A8 8 0 0 0 6.2 6.6L4 8.8M4 4.5v4.3h4.3M4 12.5a8 8 0 0 0 13.8 4.9l2.2-2.2M20 19.5v-4.3h-4.3" />
  </svg>
);
export const IcExternal = (p: P) => (
  <svg {...base(p)}>
    <path d="M13.5 5H19v5.5M19 5l-8 8M16 13.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V9.5A1.5 1.5 0 0 1 6 8h4.5" />
  </svg>
);
export const IcCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M5.5 15.5h-1a1.5 1.5 0 0 1-1.5-1.5V5.5A1.5 1.5 0 0 1 4.5 4H13a1.5 1.5 0 0 1 1.5 1.5v1" />
  </svg>
);
export const IcSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </svg>
);
export const IcMenu = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h10M4 17h16" />
  </svg>
);
export const IcGlobe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.8 2.6 4 5.6 4 9s-1.2 6.4-4 9c-2.8-2.6-4-5.6-4-9s1.2-6.4 4-9Z" />
  </svg>
);
export const IcBolt = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
  </svg>
);
export const IcFish = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12Z" />
    <path d="M17.5 9.5 21 12l-3.5 2.5M8 12h.01" />
  </svg>
);
export const IcDoc = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5Z" />
    <path d="M14 3.5V8h4.5M9 12h6M9 15.5h6M9 8.5h2" />
  </svg>
);
export const IcGauge = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 15.5a8 8 0 1 1 16 0" />
    <path d="M12 15.5 15.5 9" />
    <circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

/** نشان پنگو — لوگو و ماسکوت حال‌وهوای میم */
export const PenguLogo = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect width="64" height="64" rx="16" fill="#0E2133" />
    <ellipse cx="32" cy="37" rx="18" ry="22" fill="#10161D" />
    <ellipse cx="32" cy="43" rx="11" ry="14" fill="#EAF4F9" />
    <ellipse cx="14.5" cy="38" rx="4.5" ry="10" fill="#10161D" transform="rotate(14 14.5 38)" />
    <ellipse cx="49.5" cy="38" rx="4.5" ry="10" fill="#10161D" transform="rotate(-14 49.5 38)" />
    <circle cx="25.5" cy="27" r="2.8" fill="#EAF4F9" />
    <circle cx="38.5" cy="27" r="2.8" fill="#EAF4F9" />
    <circle cx="26.3" cy="27" r="1.2" fill="#10161D" />
    <circle cx="37.7" cy="27" r="1.2" fill="#10161D" />
    <path d="M32 30.5 38 35l-6 4.5-6-4.5 6-4.5Z" fill="#FF9E2C" />
  </svg>
);

/** ماسکوت پنگو با حالت‌های چهره بر اساس سیگنال */
export function Mascot({ mood, size = 120 }: { mood: "happy" | "sad" | "cool" | "wait"; size?: number }) {
  const mouth =
    mood === "happy" ? (
      <path d="M26 40 Q32 46 38 40" stroke="#10161D" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    ) : mood === "sad" ? (
      <path d="M26 44 Q32 38.5 38 44" stroke="#10161D" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    ) : mood === "cool" ? (
      <>
        <rect x="18" y="24" width="28" height="7.5" rx="3.5" fill="#10161D" />
        <path d="M46 27.5h5" stroke="#10161D" strokeWidth="2.4" strokeLinecap="round" />
      </>
    ) : (
      <circle cx="32" cy="42.5" r="2.1" fill="#10161D" />
    );
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="pp-bob" aria-hidden>
      <ellipse cx="32" cy="59" rx="15" ry="3.4" fill="#06101A" opacity="0.7" />
      <ellipse cx="32" cy="36" rx="19" ry="23" fill="#141B23" />
      <ellipse cx="32" cy="42.5" rx="12" ry="14.5" fill="#EAF4F9" />
      <ellipse cx="12.5" cy="37" rx="5" ry="11" fill="#141B23" transform="rotate(16 12.5 37)" />
      <ellipse cx="51.5" cy="37" rx="5" ry="11" fill="#141B23" transform="rotate(-16 51.5 37)" />
      <path d="M24 55l-2.5 5h6L26 55M40 55l-2.5 5h6L42 55" fill="#FF9E2C" />
      {mood !== "cool" && (
        <>
          <circle cx="25" cy="26.5" r="3.4" fill="#EAF4F9" className="pp-eye" />
          <circle cx="39" cy="26.5" r="3.4" fill="#EAF4F9" className="pp-eye" />
          <circle cx="25.9" cy="26.5" r="1.5" fill="#10161D" />
          <circle cx="38.1" cy="26.5" r="1.5" fill="#10161D" />
        </>
      )}
      <path d="M32 30l6.5 4.5L32 39l-6.5-4.5L32 30Z" fill="#FF9E2C" />
      {mouth}
      <circle cx="18" cy="31" r="2.6" fill="#4CC9E8" opacity="0.5" />
      <circle cx="46" cy="31" r="2.6" fill="#4CC9E8" opacity="0.5" />
    </svg>
  );
}

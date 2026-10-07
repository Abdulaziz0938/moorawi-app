// Simple SVG crown (used above podium circle)

interface Props {
  rank: 1 | 2 | 3;
  size: number; // px — عرض التاج
}

const COLORS = {
  1: { main: "#FFD700", dark: "#B8860B", light: "#FFF3B0" },  // ذهبي
  2: { main: "#E0E0E0", dark: "#909090", light: "#FFFFFF" },  // فضي
  3: { main: "#D48A5C", dark: "#8B4513", light: "#F0C6A8" },  // برونزي
};

export default function PodiumSVG({ rank, size }: Props) {
  const c = COLORS[rank];
  const h = size * 0.6;
  const w = size;

  return (
    <svg
      viewBox="0 0 100 60"
      width={w}
      height={h}
      style={{ display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`crown-${rank}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="50%" stopColor={c.main} />
          <stop offset="100%" stopColor={c.dark} />
        </linearGradient>
      </defs>

      {/* قاعدة التاج */}
      <rect
        x="10"
        y="42"
        width="80"
        height="14"
        rx="3"
        fill={`url(#crown-${rank})`}
        stroke={c.dark}
        strokeWidth="1"
      />

      {/* قمم التاج (3 قمم) */}
      <path
        d="M 14 42
           L 20 14
           L 34 32
           L 50 8
           L 66 32
           L 80 14
           L 86 42 Z"
        fill={`url(#crown-${rank})`}
        stroke={c.dark}
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* نجوم على القمم */}
      <circle cx="20" cy="14" r="2.5" fill={c.light} stroke={c.dark} strokeWidth="0.6" />
      <circle cx="50" cy="8" r="3.5" fill={c.light} stroke={c.dark} strokeWidth="0.6" />
      <circle cx="80" cy="14" r="2.5" fill={c.light} stroke={c.dark} strokeWidth="0.6" />
    </svg>
  );
}

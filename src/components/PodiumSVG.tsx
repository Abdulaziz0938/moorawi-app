// Simple flat crown (like the reference image)

interface Props {
  rank: 1 | 2 | 3;
  size: number;
}

const COLORS = {
  1: { main: "#FFD700", dark: "#B8860B" },  // Gold
  2: { main: "#C0C0C0", dark: "#808080" },  // Silver
  3: { main: "#CD7F32", dark: "#8B4513" },  // Bronze
};

export default function PodiumSVG({ rank, size }: Props) {
  const c = COLORS[rank];
  const h = size * 0.7;

  return (
    <svg
      viewBox="0 0 40 28"
      width={size}
      height={h}
      style={{ display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`c-${rank}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={c.main} />
          <stop offset="100%" stopColor={c.dark} />
        </linearGradient>
      </defs>
      {/* Base */}
      <rect x="2" y="20" width="36" height="6" rx="1" fill={`url(#c-${rank})`} />
      {/* Peaks */}
      <path
        d="M 2 20 L 8 6 L 14 16 L 20 2 L 26 16 L 32 6 L 38 20 Z"
        fill={`url(#c-${rank})`}
      />
    </svg>
  );
}

// SVG-based podium for Leaderboard
// 3 variants: gold (rank 1), silver (rank 2), bronze (rank 3)

interface Props {
  rank: 1 | 2 | 3;
  width: number;  // px
  height: number; // px
}

const COLORS = {
  1: {
    // Gold
    bar1: "#FFE9A0", bar2: "#F5C842", bar3: "#B8860B", bar4: "#8B6508",
    crown: "#FFD700", crownDark: "#B8860B",
    frame1: "#FFE9A0", frame2: "#F5C842", frame3: "#8B6508",
    number: "#FFFFFF", numberShadow: "#8B6508",
    hasWings: true,
  },
  2: {
    // Silver
    bar1: "#F5F5F5", bar2: "#D0D0D0", bar3: "#909090", bar4: "#606060",
    crown: "#E8E8E8", crownDark: "#909090",
    frame1: "#FFFFFF", frame2: "#D0D0D0", frame3: "#606060",
    number: "#FFFFFF", numberShadow: "#606060",
    hasWings: false,
  },
  3: {
    // Bronze
    bar1: "#F0C6A8", bar2: "#D48A5C", bar3: "#A0562D", bar4: "#6B3418",
    crown: "#E0A075", crownDark: "#8B4513",
    frame1: "#F0C6A8", frame2: "#D48A5C", frame3: "#6B3418",
    number: "#FFFFFF", numberShadow: "#6B3418",
    hasWings: false,
  },
};

export default function PodiumSVG({ rank, width, height }: Props) {
  const c = COLORS[rank];

  // نسبة الأبعاد
  const w = 100;          // viewBox width
  const h = 220;          // viewBox height
  const barTop = 60;      // حيث يبدأ العمود (يترك مساحة للتاج + الدائرة)
  const barBottom = 210;  // حيث ينتهي
  const barLeft = 15;
  const barRight = 85;
  const barWidth = barRight - barLeft;

  // مركز الدائرة
  const circleCx = 50;
  const circleCy = 55;
  const circleR = 30;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={width}
      height={height}
      style={{ display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* تدرجات العمود */}
        <linearGradient id={`bar-${rank}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c.bar3} />
          <stop offset="15%" stopColor={c.bar2} />
          <stop offset="50%" stopColor={c.bar1} />
          <stop offset="85%" stopColor={c.bar2} />
          <stop offset="100%" stopColor={c.bar3} />
        </linearGradient>

        {/* تدرج التاج */}
        <linearGradient id={`crown-${rank}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={c.crown} />
          <stop offset="100%" stopColor={c.crownDark} />
        </linearGradient>

        {/* تدرج إطار الدائرة */}
        <linearGradient id={`frame-${rank}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.frame1} />
          <stop offset="50%" stopColor={c.frame2} />
          <stop offset="100%" stopColor={c.frame3} />
        </linearGradient>

        {/* ظل الأجنحة (للمركز الأول) */}
        {c.hasWings && (
          <linearGradient id="wings-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#D0D8E0" stopOpacity="0.7" />
          </linearGradient>
        )}
      </defs>

      {/* ============ الأجنحة (للمركز الأول فقط) ============ */}
      {c.hasWings && (
        <g opacity="0.95">
          {/* الجناح الأيسر */}
          <path
            d={`M ${circleCx - 5} ${circleCy - 8} 
                C ${circleCx - 30} ${circleCy - 35}, 5 5, 0 15
                C 5 25, 20 20, 30 30
                C 30 15, ${circleCx - 15} ${circleCy - 5}, ${circleCx - 5} ${circleCy - 8} Z`}
            fill="url(#wings-gradient)"
            stroke="#A0A8B0"
            strokeWidth="0.5"
          />
          {/* الجناح الأيمن (مرآة) */}
          <path
            d={`M ${circleCx + 5} ${circleCy - 8}
                C ${circleCx + 30} ${circleCy - 35}, ${w - 5} 5, ${w} 15
                C ${w - 5} 25, ${w - 20} 20, ${w - 30} 30
                C ${w - 30} 15, ${circleCx + 15} ${circleCy - 5}, ${circleCx + 5} ${circleCy - 8} Z`}
            fill="url(#wings-gradient)"
            stroke="#A0A8B0"
            strokeWidth="0.5"
          />
        </g>
      )}

      {/* ============ جسم العمود ============ */}
      <path
        d={`M ${barLeft} ${barTop} 
            L ${barRight} ${barTop}
            L ${barRight} ${barBottom - 15}
            L ${circleCx} ${barBottom}
            L ${barLeft} ${barBottom - 15} Z`}
        fill={`url(#bar-${rank})`}
        stroke={c.bar4}
        strokeWidth="1"
      />

      {/* ============ إطار الدائرة (خارجي) ============ */}
      <circle
        cx={circleCx}
        cy={circleCy}
        r={circleR + 4}
        fill={`url(#frame-${rank})`}
        stroke={c.frame3}
        strokeWidth="0.8"
      />

      {/* ============ الدائرة الداخلية (خلفية الأفاتار) ============ */}
      <circle
        cx={circleCx}
        cy={circleCy}
        r={circleR}
        fill="#FFFFFF"
        stroke={c.frame3}
        strokeWidth="0.5"
      />

      {/* ============ شارة المرتبة (أسفل الدائرة) ============ */}
      <g>
        {/* شكل الدرع */}
        <path
          d={`M ${circleCx - 8} ${circleCy + circleR - 6}
              L ${circleCx} ${circleCy + circleR - 2}
              L ${circleCx + 8} ${circleCy + circleR - 6}
              L ${circleCx + 6} ${circleCy + circleR + 6}
              L ${circleCx} ${circleCy + circleR + 10}
              L ${circleCx - 6} ${circleCy + circleR + 6} Z`}
          fill={c.frame3}
          stroke={c.frame1}
          strokeWidth="0.5"
        />
        {/* الرقم */}
        <text
          x={circleCx}
          y={circleCy + circleR + 4}
          textAnchor="middle"
          fontSize="9"
          fontWeight="900"
          fill={c.number}
          stroke={c.numberShadow}
          strokeWidth="0.3"
        >
          {rank}
        </text>
      </g>

      {/* ============ التاج ============ */}
      <g>
        {/* قاعدة التاج */}
        <rect
          x={circleCx - 14}
          y={circleCy - circleR - 16}
          width={28}
          height={6}
          rx={1}
          fill={`url(#crown-${rank})`}
          stroke={c.crownDark}
          strokeWidth="0.5"
        />
        {/* قمم التاج (3 قمم) */}
        <path
          d={`M ${circleCx - 14} ${circleCy - circleR - 16}
              L ${circleCx - 12} ${circleCy - circleR - 28}
              L ${circleCx - 8} ${circleCy - circleR - 20}
              L ${circleCx - 3} ${circleCy - circleR - 32}
              L ${circleCx + 2} ${circleCy - circleR - 20}
              L ${circleCx + 7} ${circleCy - circleR - 32}
              L ${circleCx + 12} ${circleCy - circleR - 20}
              L ${circleCx + 14} ${circleCy - circleR - 28}
              L ${circleCx + 14} ${circleCy - circleR - 16} Z`}
          fill={`url(#crown-${rank})`}
          stroke={c.crownDark}
          strokeWidth="0.5"
        />
        {/* نجمات على القمم */}
        <circle cx={circleCx - 12} cy={circleCy - circleR - 28} r="1.2" fill={c.crown} />
        <circle cx={circleCx - 3} cy={circleCy - circleR - 32} r="1.5" fill={c.crown} />
        <circle cx={circleCx + 7} cy={circleCy - circleR - 32} r="1.5" fill={c.crown} />
        <circle cx={circleCx + 14} cy={circleCy - circleR - 28} r="1.2" fill={c.crown} />
      </g>
    </svg>
  );
}

// [moorawi-medals] Horizontal medals row (under name)
// Shows owned medals as small badges
import { Award } from "lucide-react";

interface Medal {
  _id: string;
  name: string;
  imageUrl?: string;
  tier: string; // C, B, A, S, SS, SSS
  value?: number;
}

interface Props {
  medals: Medal[];
  max?: number;
  size?: "xs" | "sm" | "md";
}

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  C:   { bg: "from-slate-700 to-slate-800",     border: "border-slate-500/60",   text: "text-slate-300",   glow: "shadow-slate-500/30" },
  B:   { bg: "from-emerald-700 to-emerald-900", border: "border-emerald-500/60", text: "text-emerald-300", glow: "shadow-emerald-500/40" },
  A:   { bg: "from-blue-700 to-blue-900",       border: "border-blue-500/60",    text: "text-blue-300",    glow: "shadow-blue-500/40" },
  S:   { bg: "from-red-700 to-red-900",         border: "border-red-500/60",     text: "text-red-300",     glow: "shadow-red-500/40" },
  SS:  { bg: "from-amber-600 to-amber-800",     border: "border-amber-400/70",   text: "text-amber-200",   glow: "shadow-amber-500/50" },
  SSS: { bg: "from-purple-600 to-pink-700",     border: "border-purple-400/70",  text: "text-purple-200",  glow: "shadow-purple-500/50" },
};

const SIZE_MAP = {
  xs: { box: 20, icon: 11, gap: "gap-0.5" },
  sm: { box: 26, icon: 14, gap: "gap-1" },
  md: { box: 34, icon: 18, gap: "gap-1" },
};

export default function MedalsRow({ medals, max = 12, size = "sm" }: Props) {
  if (!medals || medals.length === 0) return null;

  const s = SIZE_MAP[size];
  const shown = medals.slice(0, max);

  return (
    <div className={`flex items-center ${s.gap} flex-wrap`}>
      {shown.map((m) => {
        const t = TIER_COLORS[m.tier] ?? TIER_COLORS.C;
        return (
          <div
            key={m._id}
            className={`relative flex-shrink-0 rounded-full border-2 ${t.border} bg-gradient-to-br ${t.bg} flex items-center justify-center shadow-lg ${t.glow}`}
            style={{ width: s.box, height: s.box }}
            title={`${m.name} (${m.tier})`}
          >
            {m.imageUrl ? (
              <img
                src={m.imageUrl}
                alt={m.name}
                className="w-full h-full object-contain rounded-full"
                draggable={false}
              />
            ) : (
              <Award
                size={s.icon}
                className="text-white drop-shadow"
                strokeWidth={2}
                fill="rgba(255,255,255,0.2)"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

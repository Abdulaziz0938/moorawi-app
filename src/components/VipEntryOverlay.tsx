// [ezo-vip] VipEntryOverlay — تأثير دخول VIP (مطابق لـ Bigo/SUGO)
//
// يظهر عند دخول VIP 3+ للغرفة:
//   - خلفية معتمة خفيفة
//   - بطاقة بألوان المستوى + هالة متوهجة
//   - أفاتار بحجم كبير + إطار متحرك
//   - اسم بتدرج لوني
//   - شارة VIP + المستوى
//   - تختفي تلقائياً بعد 3.5 ثانية

import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import VipAvatar from "./ui/VipAvatar";
import VipName from "./VipName";
import { playVipEntry } from "../lib/sound";
import { haptic } from "../lib/haptics";

interface Entry {
  _id: string;
  userId: string;
  level: number;
  name: string;
  avatarUrl?: string;
  createdAt: number;
}

const VIP_COLORS: Record<number, { main: string; accent: string; glow: string }> = {
  3: { main: "#a855f7", accent: "#c084fc", glow: "rgba(168,85,247,0.6)" },
  4: { main: "#dc2626", accent: "#f87171", glow: "rgba(220,38,38,0.65)" },
  5: { main: "#eab308", accent: "#facc15", glow: "rgba(234,179,8,0.7)" },
  6: { main: "#f97316", accent: "#fb923c", glow: "rgba(249,115,22,0.75)" },
  7: { main: "#fbbf24", accent: "#fde047", glow: "rgba(251,191,36,0.85)" },
};

export default function VipEntryOverlay({ entry }: { entry: Entry | null }) {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<Entry | null>(null);

  useEffect(() => {
    if (!entry) return;
    if (active?._id === entry._id) return;
    // فقط VIP 3+
    if (entry.level < 3) return;

    setActive(entry);
    setVisible(true);

    // Sound + Haptic
    playVipEntry(entry.level);
    haptic(entry.level >= 5 ? "heavy" : "medium");

    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [entry?._id]);

  if (!visible || !active) return null;

  const c = VIP_COLORS[Math.min(active.level, 7)] ?? VIP_COLORS[3];

  return (
    <div
      className="fixed inset-0 z-[500] pointer-events-none flex items-center justify-center"
      dir="rtl"
    >
      {/* Radial glow background */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${c.glow} 0%, transparent 60%)`,
          animation: "vipEntryFade 3.5s ease-out",
        }}
      />

      {/* Card */}
      <div
        className="relative flex flex-col items-center px-8 py-6 rounded-3xl"
        style={{
          background: "linear-gradient(135deg, rgba(10,6,18,0.95), rgba(15,12,40,0.92))",
          border: `2px solid ${c.main}`,
          boxShadow: `0 0 40px ${c.glow}, 0 0 80px ${c.glow.replace("0.6", "0.3")}, inset 0 0 20px ${c.main}20`,
          backdropFilter: "blur(20px)",
          animation: "vipEntrySlideGPU 3.5s cubic-bezier(0.22, 1, 0.36, 1) forwards", willChange: "transform, opacity", transform: "translate3d(0,0,0)",
        }}
      >
        {/* Crown row */}
        <div className="flex items-center gap-1.5 mb-2">
          <Crown size={16} style={{ color: c.accent }} fill="currentColor" />
          <span
            className="text-[10px] font-black tracking-wider uppercase"
            style={{ color: c.accent }}
          >
            VIP {active.level}
          </span>
          <Crown size={16} style={{ color: c.accent }} fill="currentColor" />
        </div>

        {/* Avatar */}
        <div className="relative mb-3">
          <VipAvatar
            src={active.avatarUrl}
            name={active.name}
            size={104}
            vip={active.level}
          />
        </div>

        {/* Name with VIP gradient */}
        <VipName level={active.level} className="text-2xl font-black">
          {active.name}
        </VipName>

        {/* Entrance text */}
        <p
          className="mt-2 text-[11px] font-black tracking-wider"
          style={{ color: c.accent }}
        >
          انضم إلى الغرفة
        </p>
      </div>

      
    </div>
  );
}

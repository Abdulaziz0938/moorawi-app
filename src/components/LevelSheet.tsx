// [ezo-services] المستوى
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { useBackButton } from "../lib/hooks/useBackButton";
import { Header, Spinner } from "./VisitsSheet";
import { Sparkles, Heart, Gem, TrendingUp, Zap } from "lucide-react";
import { getActiveToken } from "../lib/session";

interface Props { onClose: () => void; }

export default function LevelSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: getActiveToken() ?? deviceId });

  if (!me) return null;

  const charms = (me as any).charms ?? 0;
  const totalSent = (me as any).totalSent ?? 0;

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="المستوى" assetKey="ui.sheet.level" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 mx-auto flex items-center justify-center mb-3">
            <Sparkles size={48} className="text-white" fill="currentColor" />
          </div>
          <p className="text-white text-lg font-black">مستوياتك</p>
          <p className="text-white/50 text-xs mt-1">تقدمك في Ezo</p>
        </div>

        <LevelCard
          icon={Heart}
          label="الجاذبية"
          value={charms}
          gradient="from-pink-700/40 to-rose-900/40"
          border="border-pink-400/30"
          color="text-pink-300"
          hint="من الهدايا المستلمة"
        />

        <LevelCard
          icon={Gem}
          label="الثروة"
          value={totalSent}
          gradient="from-amber-700/40 to-orange-900/40"
          border="border-amber-400/30"
          color="text-amber-300"
          hint="من الهدايا المرسلة"
        />
      </div>
    </div>
  );
}

function LevelCard({ icon: Icon, label, value, gradient, border, color, hint }: any) {
  // حساب المستوى من العتبات
  const level = calcLevel(value);
  const nextThreshold = getThreshold(level + 1);
  const currentThreshold = getThreshold(level);
  const progress = nextThreshold === Infinity
    ? 100
    : Math.min(100, Math.round(((value - currentThreshold) / (nextThreshold - currentThreshold)) * 100));

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} border ${border} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={24} className={color} fill="currentColor" />
          <p className="text-white text-base font-black">{label}</p>
        </div>
        <div className={`px-3 py-1 rounded-full bg-black/30 border border-white/10`}>
          <p className={`text-lg font-black ${color}`}>Lv.{level}</p>
        </div>
      </div>

      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-gradient-to-r from-white/60 to-white/80" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className="text-white/60">{formatNum(value)}</span>
        <span className="text-white/40">
          المستوى التالي: <span className="font-black" dir="ltr">{nextThreshold === Infinity ? "MAX" : formatNum(nextThreshold)}</span>
        </span>
      </div>

      <p className="text-white/40 text-[10px] mt-2 text-center">{hint}</p>
    </div>
  );
}

function calcLevel(value: number): number {
  if (value < 500) return 0;
  for (let l = 100; l >= 1; l--) {
    if (value >= getThreshold(l)) return l;
  }
  return 0;
}

function getThreshold(level: number): number {
  if (level <= 0) return 0;
  if (level >= 100) return 4_000_000_000;
  const T = [0, 500];
  let cur = 500;
  const steps = [
    { from: 2, to: 10, inc: 5_500 }, { from: 11, to: 20, inc: 12_500 },
    { from: 21, to: 30, inc: 42_500 }, { from: 31, to: 40, inc: 150_000 },
    { from: 41, to: 50, inc: 540_000 }, { from: 51, to: 60, inc: 1_850_000 },
    { from: 61, to: 70, inc: 6_400_000 }, { from: 71, to: 80, inc: 23_000_000 },
    { from: 81, to: 90, inc: 78_000_000 }, { from: 91, to: 100, inc: 290_000_000 },
  ];
  for (const s of steps) {
    for (let l = s.from; l <= s.to; l++) {
      cur += s.inc;
      T[l] = cur;
    }
  }
  return T[level] ?? 0;
}

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

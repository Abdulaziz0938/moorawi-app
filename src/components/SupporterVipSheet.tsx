// [ezo-services] VIP خاصة بالداعمين
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { useBackButton } from "../lib/hooks/useBackButton";
import { Header } from "./VisitsSheet";
import { Crown, Sparkles, Star, TrendingUp, Lock } from "lucide-react";
import { getActiveToken } from "../lib/session";

interface Props { onClose: () => void; }

const TIERS = [
  { name: "S5",  min: 5,   max: 10,  reward: "شارة الداعم" },
  { name: "S11", min: 11,  max: 20,  reward: "شارة + إطار خاص" },
  { name: "S21", min: 21,  max: 50,  reward: "شارة + إطار + تأثير دخول" },
  { name: "S51", min: 51,  max: 100, reward: "كل الميزات + لقب مميز" },
];

export default function SupporterVipSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: getActiveToken() ?? deviceId });

  const totalSent = (me as any)?.totalSent ?? 0;
  const myLevel = calcWealthLevel(totalSent);

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="VIP خاصة بالداعمين" assetKey="ui.sheet.supporterVip" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Hero */}
        <div className="text-center mb-2">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 mx-auto flex items-center justify-center mb-3">
            <Crown size={48} className="text-white" fill="currentColor" />
          </div>
          <p className="text-white text-lg font-black">برنامج الداعمين</p>
          <p className="text-white/50 text-xs mt-1">
            مستواك الحالي: <span className="text-amber-300 font-black">S{myLevel}</span>
          </p>
        </div>

        {/* Info */}
        <div className="rounded-2xl bg-pink-500/10 border border-pink-400/30 p-4">
          <p className="text-pink-100/80 text-xs leading-relaxed">
            VIP خاص بالداعمين — ميزات حصرية تُمنح تلقائياً حسب مستوى الثراء (من S5 إلى S100).
          </p>
        </div>

        {/* Tiers */}
        <div className="space-y-3">
          {TIERS.map((tier) => {
            const unlocked = myLevel >= tier.min;
            return (
              <div
                key={tier.name}
                className={`rounded-2xl border p-4 flex items-center gap-3 ${
                  unlocked
                    ? "bg-gradient-to-r from-pink-900/40 to-purple-900/40 border-pink-400/50"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  unlocked ? "bg-gradient-to-br from-pink-500 to-purple-600" : "bg-white/10"
                }`}>
                  {unlocked ? (
                    <Crown size={26} className="text-white" fill="currentColor" />
                  ) : (
                    <Lock size={26} className="text-white/40" />
                  )}
                </div>
                <div className="flex-1 text-right">
                  <p className={`text-base font-black ${unlocked ? "text-white" : "text-white/50"}`}>
                    {tier.name} <span className="text-white/40 text-xs font-normal">(S{tier.min}-S{tier.max})</span>
                  </p>
                  <p className={`text-xs mt-0.5 ${unlocked ? "text-pink-200" : "text-white/40"}`}>
                    {tier.reward}
                  </p>
                </div>
                {unlocked && (
                  <div className="px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40">
                    <span className="text-emerald-300 text-[10px] font-black">مفعّل</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function calcWealthLevel(v: number): number {
  if (v < 500) return 0;
  for (let l = 100; l >= 1; l--) if (v >= getThreshold(l)) return l;
  return 0;
}
function getThreshold(level: number): number {
  if (level <= 0) return 0;
  if (level >= 100) return 4_000_000_000;
  const T = [0, 500]; let cur = 500;
  const steps = [
    { from: 2, to: 10, inc: 5_500 }, { from: 11, to: 20, inc: 12_500 },
    { from: 21, to: 30, inc: 42_500 }, { from: 31, to: 40, inc: 150_000 },
    { from: 41, to: 50, inc: 540_000 }, { from: 51, to: 60, inc: 1_850_000 },
    { from: 61, to: 70, inc: 6_400_000 }, { from: 71, to: 80, inc: 23_000_000 },
    { from: 81, to: 90, inc: 78_000_000 }, { from: 91, to: 100, inc: 290_000_000 },
  ];
  for (const s of steps) for (let l = s.from; l <= s.to; l++) { cur += s.inc; T[l] = cur; }
  return T[level] ?? 0;
}

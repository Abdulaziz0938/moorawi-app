// [moorawi-vip] VIP Shop — 7 tiers, coin purchase
// Pattern mirrors ShopSheet. All visuals from DB (VIP_LEVELS) + /vip/*.png fallback.

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import {
  X, Crown, Coins, Loader2, Clock, Shield, Sparkles, Eye,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

const BENEFITS: { icon: any; text: string }[] = [
  { icon: Crown,    text: "شارة VIP بجانب الاسم في كل مكان" },
  { icon: Sparkles, text: "إطار بروفايل مخصص لكل مستوى" },
  { icon: Eye,      text: "ظهور مميز في قائمة الأعضاء" },
  { icon: Shield,   text: "حماية إضافية داخل الغرف" },
];

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toString();
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export default function VipShopSheet({ onClose }: Props) {
  const token = getActiveToken();
  const data = useQuery(api.vip.myVip, { tokenOverride: token });
  const balance = useQuery(api.wallet.balance, { tokenOverride: token });
  const buyVip = useMutation(api.vip.buyVip);

  const [selected, setSelected] = useState<number>(1);
  const [busy, setBusy] = useState(false);

  const plans = data?.plans ?? [];
  const currentLevel = data?.level ?? 0;
  const active = data?.active ?? false;
  const coins = balance?.coins ?? 0;

  const handleBuy = () => {
    const plan = plans.find((p) => p.level === selected);
    if (!plan) return;
    if (coins < plan.priceCoins) {
      dialog.alert(
        `تحتاج ${plan.priceCoins.toLocaleString()} عملة — رصيدك ${coins.toLocaleString()}`
      );
      return;
    }
    dialog.confirm(
      `شراء ${plan.name} بمبلغ ${plan.priceCoins.toLocaleString()} عملة؟`,
      async () => {
        setBusy(true);
        try {
          await buyVip({ level: selected, tokenOverride: token });
          dialog.alert(`تم تفعيل ${plan.name} لمدة 30 يوماً`);
        } catch (e: any) {
          dialog.alert(e?.message || "فشل الشراء");
        } finally {
          setBusy(false);
        }
      },
      plan.name,
      "شراء"
    );
  };

  const plan = plans.find((p) => p.level === selected);
  const owned = plan ? selected <= currentLevel && active : false;
  const isUpgrade = plan ? selected > currentLevel && active : false;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end justify-center"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-purple-600 flex items-center justify-center">
              <Crown size={18} className="text-white" fill="currentColor" />
            </div>
            <h2 className="text-white text-lg font-black">VIP</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30">
              <Coins size={14} className="text-amber-300" />
              <span className="text-amber-200 text-xs font-black tabular-nums" dir="ltr">
                {formatNum(coins)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ===== Active status bar ===== */}
        {active && (
          <div className="mx-4 mt-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 to-purple-500/15 p-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <img
                src={`/vip/pvip${currentLevel}.png`}
                alt={`VIP ${currentLevel}`}
                className="w-9 h-9 object-contain"
                draggable={false}
              />
              <div>
                <p className="text-amber-200 text-sm font-black">
                  VIP {currentLevel} نشط
                </p>
                <p className="text-white/50 text-[10px] flex items-center gap-1">
                  <Clock size={10} />
                  ينتهي {data?.expiresAt ? formatDate(data.expiresAt) : "-"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===== Tabs ===== */}
        <div
          className="mt-3 px-4 flex gap-2 overflow-x-auto flex-shrink-0 pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {plans.map((p) => {
            const isSel = p.level === selected;
            const isOwned = p.level === currentLevel && active;
            return (
              <button
                key={p.level}
                onClick={() => setSelected(p.level)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl border transition active:scale-95 ${
                  isSel
                    ? "bg-amber-500/20 border-amber-400/60"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <span
                  className={`text-xs font-black ${
                    isSel ? "text-amber-200" : "text-white/70"
                  }`}
                >
                  VIP {p.level}
                </span>
                {isOwned && (
                  <span className="mr-1 text-[8px] text-amber-300">●</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ===== Content ===== */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {plan && (
            <div className="space-y-4">
              {/* Big banner */}
              <div className="flex flex-col items-center py-4">
                <img
                  src={plan.imageUrl || `/vip/vip${plan.level}.png`}
                  alt={plan.name}
                  className="w-52 h-auto object-contain drop-shadow-2xl"
                  draggable={false}
                />
              </div>

              {/* Price + duration */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">المدة</span>
                  <span className="text-white text-sm font-black">30 يوم</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-xs">السعر</span>
                  <div className="flex items-center gap-1.5">
                    <Coins size={14} className="text-amber-300" />
                    <span
                      className="text-amber-200 text-sm font-black tabular-nums"
                      dir="ltr"
                    >
                      {plan.priceCoins.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <p className="text-white text-sm font-black">المزايا</p>
                {BENEFITS.map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                        <Icon size={13} className="text-amber-300" />
                      </div>
                      <span className="text-white/80 text-xs">{b.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Buy button */}
              <button
                onClick={handleBuy}
                disabled={busy}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-purple-600 py-3.5 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Crown size={16} fill="currentColor" />
                )}
                {owned
                  ? "تمديد 30 يوم"
                  : isUpgrade
                  ? `ترقية إلى VIP ${plan.level}`
                  : "شراء"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

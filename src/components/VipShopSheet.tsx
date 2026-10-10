// [moorawi-vip] VIP Shop — Poppo-style page per level
// Structure: tabs (7 levels) → banner → 9 asset slots → benefits table → buy footer

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { useAssets } from "../lib/assets";
import { dialog } from "../lib/dialog";
import {
  X, Crown, Coins, Loader2, Clock, Sparkles, Lock,
  Gift, Star, Eye, Heart, Percent, TrendingUp, MessageCircle,
  Zap, ShoppingBag, Wand2, Award, Ban, Ghost, IdCard, Share2,
  Megaphone, ShieldOff, BadgeCheck, Users, Mic, UserCircle,
  Car, Home, AudioLines, MicVocal, Bell, Music, Palette,
  LayoutGrid, Check,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

// Icon name → lucide component (only those used in seedBenefits)
const ICONS: Record<string, any> = {
  Gift, Star, Coins, Eye, Heart, Percent, TrendingUp, MessageCircle,
  Zap, ShoppingBag, Wand2, Award, Ban, Ghost, IdCard, Share2,
  Megaphone, ShieldOff, BadgeCheck, Users, Mic, UserCircle,
  Car, Home, AudioLines, MicVocal, Bell, Music, Palette, LayoutGrid,
};

// 9 asset slot keys per level (order matters for grid 3x3)
const VIP_SLOTS: { key: string; label: string }[] = [
  { key: "logo",     label: "الشعار" },
  { key: "medal",    label: "الميدالية" },
  { key: "frame",    label: "الإطار" },
  { key: "halo",     label: "الهالة" },
  { key: "card",     label: "البطاقة" },
  { key: "nickname", label: "الاسم" },
  { key: "entry",    label: "الدخول" },
  { key: "wave",     label: "الموجة" },
  { key: "bubble",   label: "الفقاعات" },
];

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function VipShopSheet({ onClose }: Props) {
  const token = getActiveToken();
  const assets = useAssets();
  const data = useQuery(api.vip.myVip, { tokenOverride: token });
  const allBenefits = useQuery(api.vip.getAllBenefits);
  const balance = useQuery(api.wallet.balance, { tokenOverride: token });
  const buyVip = useMutation(api.vip.buyVip);

  const [selected, setSelected] = useState<number>(1);
  const [busy, setBusy] = useState(false);

  const plans = data?.plans ?? [];
  const currentLevel = data?.level ?? 0;
  const active = data?.active ?? false;
  const coins = balance?.coins ?? 0;

  const plan = plans.find((p) => p.level === selected);

  // Benefits indexed by level
  const benefitsByLevel = useMemo(() => {
    const map: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    for (const b of allBenefits ?? []) {
      if (!map[b.level]) map[b.level] = [];
      map[b.level].push(b);
    }
    return map;
  }, [allBenefits]);

  const selectedBenefits = benefitsByLevel[selected] ?? [];

  const handleBuy = () => {
    if (!plan) return;
    if (plan.exclusive) {
      dialog.alert("هذا المستوى حصري — يُحصل عليه عبر الشحن التركي");
      return;
    }
    const price = plan.priceCoins ?? 0;
    if (coins < price) {
      dialog.alert(`تحتاج ${price.toLocaleString()} عملة — رصيدك ${coins.toLocaleString()}`);
      return;
    }
    dialog.confirm(
      `شراء ${plan.name} بمبلغ ${price.toLocaleString()} عملة؟`,
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

  const owned = selected <= currentLevel && active;
  const isUpgrade = selected > currentLevel && active;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl h-[92dvh] flex flex-col overflow-hidden"
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

        {/* ===== Level tabs ===== */}
        <div
          className="flex gap-1 px-4 pt-3 pb-2 overflow-x-auto flex-shrink-0"
          style={{ scrollbarWidth: "none" }}
        >
          {[7, 6, 5, 4, 3, 2, 1].map((lvl) => {
            const p = plans.find((x) => x.level === lvl);
            const isSel = lvl === selected;
            const isOwned = lvl <= currentLevel && active;
            return (
              <button
                key={lvl}
                onClick={() => setSelected(lvl)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full border transition active:scale-95 text-xs font-black ${
                  isSel
                    ? "bg-white/15 border-white/40 text-white"
                    : "bg-white/5 border-white/10 text-white/60"
                }`}
              >
                VIP {lvl}
                {isOwned && <span className="mr-1 text-[8px] text-amber-300">●</span>}
              </button>
            );
          })}
        </div>

        {/* ===== Content ===== */}
        <div className="flex-1 overflow-y-auto">
          {plan && (
            <>
              {/* ===== Banner ===== */}
              <div
                className="mx-4 mt-2 rounded-2xl border overflow-hidden relative flex-shrink-0"
                style={{
                  borderColor: plan.color + "80",
                  background: `linear-gradient(135deg, ${plan.color}30 0%, ${plan.accent}15 50%, transparent 100%)`,
                }}
              >
                <div className="aspect-[16/9] flex items-center justify-center relative">
                  {(() => {
                    const logoKey = `vip.logo.${plan.level}`;
                    const logoUrl = assets[logoKey];
                    if (logoUrl) {
                      return (
                        <img
                          src={logoUrl}
                          alt={plan.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      );
                    }
                    return (
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="w-24 h-24 rounded-2xl flex items-center justify-center"
                          style={{ background: `${plan.color}40` }}
                        >
                          <Crown size={56} style={{ color: plan.accent }} strokeWidth={1.2} />
                        </div>
                        <p className="text-white text-3xl font-black tracking-wider">
                          {plan.name}
                        </p>
                        {plan.exclusive && (
                          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 border border-amber-400/40 text-amber-200 text-[10px] font-black">
                            <Lock size={10} />
                            حصري للشحن التركي
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="py-2 text-center text-white/70 text-xs">
                  ✦ <span className="text-amber-200 font-black">
                    {selectedBenefits.length} امتيازاً
                  </span> ✦
                </div>
              </div>

              {/* ===== 9 asset slots (3x3) ===== */}
              <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
                {VIP_SLOTS.map((slot) => {
                  const key = `vip.${slot.key}.${plan.level}`;
                  const url = assets[key];
                  return (
                    <div
                      key={slot.key}
                      className="aspect-square rounded-xl border border-white/10 bg-black/30 flex items-center justify-center overflow-hidden p-1"
                      style={{ borderColor: plan.color + "40" }}
                    >
                      {url ? (
                        <img
                          src={url}
                          alt={slot.label}
                          className="max-h-full max-w-full object-contain"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Sparkles size={22} style={{ color: plan.accent, opacity: 0.5 }} />
                          <span className="text-white/60 text-[9px]">{slot.label}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ===== Benefits ===== */}
              <div className="mx-4 mt-4 pb-4">
                <p className="text-center text-white text-sm font-black mb-3">
                  ✦ امتيازات VIP ✦
                </p>
                <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
                  {selectedBenefits.length === 0 ? (
                    <div className="p-6 text-center text-white/40 text-xs">
                      لا توجد امتيازات بعد
                    </div>
                  ) : (
                    selectedBenefits.map((b) => {
                      const Icon = ICONS[b.icon] ?? Sparkles;
                      return (
                        <div key={b._id} className="flex items-center gap-3 px-4 py-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: plan.color + "30" }}
                          >
                            <Icon size={14} style={{ color: plan.accent }} />
                          </div>
                          <span className="text-white/85 text-sm">{b.textAr}</span>
                          <Check size={14} className="text-emerald-400 mr-auto" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ===== Footer (buy) ===== */}
        {plan && (
          <div className="flex-shrink-0 border-t border-white/10 px-4 py-3 flex items-center gap-3 bg-black/60 backdrop-blur">
            <div className="flex flex-col items-start gap-0.5">
              {plan.exclusive ? (
                <span className="text-amber-300 text-sm font-black">حصري</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Coins size={16} className="text-amber-300" />
                  <span className="text-amber-200 text-lg font-black tabular-nums" dir="ltr">
                    {(plan.priceCoins ?? 0).toLocaleString()}
                  </span>
                </div>
              )}
              <span className="text-white/50 text-[10px] flex items-center gap-1">
                <Clock size={10} /> 30 يوماً
              </span>
            </div>
            <button
              onClick={handleBuy}
              disabled={busy || plan.exclusive}
              className="flex-1 rounded-xl py-3 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
              style={{
                background: plan.exclusive
                  ? "linear-gradient(90deg, #4b5563, #6b7280)"
                  : `linear-gradient(90deg, ${plan.color}, ${plan.accent})`,
              }}
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : plan.exclusive ? (
                <>
                  <Lock size={16} />
                  الشحن التركي
                </>
              ) : (
                <>
                  <Crown size={16} fill="currentColor" />
                  {owned ? "تمديد 30 يوم" : isUpgrade ? `ترقية لـ VIP ${plan.level}` : "اشترِ الآن"}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

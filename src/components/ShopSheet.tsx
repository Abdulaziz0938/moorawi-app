import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getActiveToken } from "../lib/session";
import { dialog } from "../lib/dialog";
import {
  X, Loader2, ShoppingBag, Frame, Car, Wand2, MessageSquare,
  AudioWaveform, IdCard, Flame, Sparkles, Coins,
} from "lucide-react";

interface Props {
  onClose: () => void;
}

type Category = "frame" | "vehicle" | "entryEffect" | "chatBubble" | "soundWave" | "profileCard";

const CATEGORIES: { key: Category; label: string; icon: any; color: string }[] = [
  { key: "frame",       label: "إطار",       icon: Frame,          color: "text-purple-300" },
  { key: "vehicle",     label: "مركبة",      icon: Car,            color: "text-blue-300" },
  { key: "entryEffect", label: "دخول",       icon: Wand2,          color: "text-pink-300" },
  { key: "chatBubble",  label: "فقاعات",     icon: MessageSquare,  color: "text-emerald-300" },
  { key: "soundWave",   label: "موجة صوتية", icon: AudioWaveform,  color: "text-cyan-300" },
  { key: "profileCard", label: "بطاقة الملف", icon: IdCard,        color: "text-amber-300" },
];

const RARITY_STYLE: Record<string, { border: string; bg: string; text: string; label: string }> = {
  common:    { border: "border-slate-500/40",   bg: "bg-slate-500/10",   text: "text-slate-300",   label: "عادي" },
  rare:      { border: "border-blue-500/50",    bg: "bg-blue-500/10",    text: "text-blue-300",    label: "نادر" },
  epic:      { border: "border-purple-500/50",  bg: "bg-purple-500/10",  text: "text-purple-300",  label: "ملحمي" },
  legendary: { border: "border-amber-500/60",   bg: "bg-amber-500/10",   text: "text-amber-300",   label: "أسطوري" },
  mythic:    { border: "border-pink-500/60",    bg: "bg-pink-500/10",    text: "text-pink-300",    label: "أسطوري+" },
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toString();
}

export default function ShopSheet({ onClose }: Props) {
  const token = getActiveToken();
  const balance = useQuery(api.wallet.balance, { tokenOverride: token });
  const inventory = useQuery(api.shop.myInventory, { tokenOverride: token });

  const [category, setCategory] = useState<Category>("frame");
  const items = useQuery(api.shop.listByCategory, { category });
  const buyItem = useMutation(api.shop.buyItem);
  const equipItem = useMutation(api.shop.equipItem);
  const unequipItem = useMutation(api.shop.unequipItem);

  const [busy, setBusy] = useState<string | null>(null);

  const coins = balance?.coins ?? 0;
  const ownedItemIds = new Set((inventory ?? []).map((i: any) => i.itemId));
  const equippedByCategory: Record<string, string> = {};
  for (const inv of inventory ?? []) {
    if (inv.isEquipped) equippedByCategory[inv.category] = inv._id;
  }

  const handleBuy = (item: any) => {
    const r = RARITY_STYLE[item.rarity] ?? RARITY_STYLE.common;
    dialog.confirm(
      `شراء "${item.name}" بمبلغ ${item.price.toLocaleString()} عملة؟`,
      async () => {
        setBusy(item._id);
        try {
          await buyItem({ itemId: item._id, tokenOverride: token });
          dialog.alert(`تم شراء "${item.name}" ✅`);
        } catch (e: any) {
          dialog.alert(e?.message || "فشل الشراء");
        } finally {
          setBusy(null);
        }
      },
      `${r.label} — ${item.name}`,
      "شراء",
    );
  };

  const handleEquipToggle = async (inv: any) => {
    setBusy(inv._id);
    try {
      if (inv.isEquipped) {
        await unequipItem({ inventoryId: inv._id, tokenOverride: token });
      } else {
        await equipItem({ inventoryId: inv._id, tokenOverride: token });
      }
    } catch (e: any) {
      dialog.alert(e?.message || "فشل التفعيل");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <h2 className="text-white text-lg font-black">المتجر</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30">
              <Coins size={14} className="text-amber-300" />
              <span className="text-amber-200 text-xs font-black tabular-nums" dir="ltr">
                {formatNum(coins)}
              </span>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ===== Category tabs ===== */}
        <div className="flex gap-1.5 px-3 py-3 border-b border-white/10 overflow-x-auto flex-shrink-0 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border transition ${
                  active
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                }`}
              >
                <Icon size={14} className={active ? cat.color : ""} />
                <span className="text-xs font-bold whitespace-nowrap">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* ===== Items grid ===== */}
        <div className="flex-1 overflow-y-auto p-3">
          {items === undefined ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-white/40" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/40">
              <ShoppingBag size={48} className="mb-3 opacity-40" />
              <p className="text-sm">لا توجد منتجات في هذا التصنيف</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((item: any) => {
                const r = RARITY_STYLE[item.rarity] ?? RARITY_STYLE.common;
                const CatIcon = CATEGORIES.find((c) => c.key === item.category)?.icon ?? ShoppingBag;
                const owned = ownedItemIds.has(item._id);
                const isBusy = busy === item._id;

                return (
                  <div
                    key={item._id}
                    className={`relative rounded-2xl border ${r.border} ${r.bg} backdrop-blur p-3 flex flex-col items-center gap-2 overflow-hidden`}
                  >
                    {/* HOT badge */}
                    {item.isHot && (
                      <span className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black">
                        <Flame size={8} /> HOT
                      </span>
                    )}

                    {/* Owned badge */}
                    {owned && (
                      <span className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black">
                        ✓ مملوك
                      </span>
                    )}

                    {/* Placeholder icon */}
                    <div className={`w-20 h-20 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center ${r.text}`}>
                      <CatIcon size={48} strokeWidth={1.5} />
                    </div>

                    {/* Name */}
                    <p className="text-white text-xs font-bold text-center truncate w-full" title={item.name}>
                      {item.name}
                    </p>

                    {/* Price + Duration */}
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      <div className="flex items-center gap-0.5">
                        <Coins size={11} className="text-amber-300" />
                        <span className="text-amber-200 text-[11px] font-black tabular-nums" dir="ltr">
                          {formatNum(item.price)}
                        </span>
                      </div>
                      {item.durationDays ? (
                        <span className="text-white/40 text-[9px]">• {item.durationDays}ي</span>
                      ) : (
                        <span className="text-white/40 text-[9px]">• دائم</span>
                      )}
                    </div>

                    {/* Action */}
                    {owned ? (
                      <button
                        disabled={isBusy}
                        onClick={() => {
                          const inv = (inventory ?? []).find((i: any) => i.itemId === item._id);
                          if (inv) handleEquipToggle(inv);
                        }}
                        className="w-full py-1.5 rounded-xl text-[11px] font-black transition disabled:opacity-50 bg-white/15 hover:bg-white/25 text-white"
                      >
                        {isBusy ? (
                          <Loader2 size={12} className="animate-spin mx-auto" />
                        ) : equippedByCategory[item.category] &&
                          (inventory ?? []).find((i: any) => i.itemId === item._id)?.isEquipped ? (
                          "✓ مُفعّل — إلغاء"
                        ) : (
                          "تفعيل"
                        )}
                      </button>
                    ) : (
                      <button
                        disabled={isBusy}
                        onClick={() => handleBuy(item)}
                        className="w-full py-1.5 rounded-xl text-[11px] font-black transition disabled:opacity-50 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90"
                      >
                        {isBusy ? (
                          <Loader2 size={12} className="animate-spin mx-auto" />
                        ) : (
                          "شراء"
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

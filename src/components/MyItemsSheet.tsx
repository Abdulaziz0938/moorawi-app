// [ezo-shop] MyItemsSheet — خزانتي (الممتلكات + ارتداء/نزع)
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getActiveToken } from "../lib/session";
import { useAssetsFull } from "../lib/assets";
import { dialog } from "../lib/dialog";
import {
  X, Loader2, ShoppingBag, Frame, Car, Wand2, MessageSquare,
  AudioWaveform, IdCard, Check, Sparkles, Crown,
} from "lucide-react";
import Card from "./ui/Card";

type Category = "frame" | "vehicle" | "entryEffect" | "chatBubble" | "soundWave" | "profileCard";

const CATEGORIES: { key: Category; label: string; icon: any; color: string }[] = [
  { key: "frame",       label: "الإطارات",   icon: Frame,          color: "text-purple-300" },
  { key: "vehicle",     label: "المركبات",   icon: Car,            color: "text-blue-300" },
  { key: "entryEffect", label: "الدخولية",   icon: Wand2,          color: "text-pink-300" },
  { key: "chatBubble",  label: "الفقاعات",   icon: MessageSquare,  color: "text-emerald-300" },
  { key: "soundWave",   label: "الموجات",    icon: AudioWaveform,  color: "text-cyan-300" },
  { key: "profileCard", label: "البطاقات",   icon: IdCard,         color: "text-amber-300" },
];

const RARITY_STYLE: Record<string, { border: string; text: string; bg: string }> = {
  common:    { border: "border-slate-500/40",   text: "text-slate-300",   bg: "bg-slate-500/10" },
  rare:      { border: "border-blue-500/50",    text: "text-blue-300",    bg: "bg-blue-500/10" },
  epic:      { border: "border-purple-500/50",  text: "text-purple-300",  bg: "bg-purple-500/10" },
  legendary: { border: "border-amber-500/60",   text: "text-amber-300",   bg: "bg-amber-500/10" },
  mythic:    { border: "border-pink-500/60",    text: "text-pink-300",    bg: "bg-pink-500/10" },
};

interface Props {
  onClose: () => void;
  initialCategory?: Category;
  onOpenStore?: () => void;
  userId?: Id<"users">;
}

export default function MyItemsSheet({ onClose, initialCategory = "frame", onOpenStore, userId }: Props) {
  const token = getActiveToken();
  const [category, setCategory] = useState<Category>(initialCategory);
  const [busy, setBusy] = useState<string | null>(null);

  const inventory = useQuery(api.shop.myInventory, { tokenOverride: token, userId });
  const me = useQuery(api.profiles.me, { tokenOverride: token });
  const assetsFull = useAssetsFull();

  const equipItem = useMutation(api.shop.equipItem);
  const unequipItem = useMutation(api.shop.unequipItem);
  const equipVipFrame = useMutation(api.profiles.equipVipFrame);
  const unequipVipFrame = useMutation(api.profiles.unequipVipFrame);

  const myVipLevel = (me as any)?.vipLevel ?? 0;
  const equippedVipLevel = (me as any)?.equippedVipFrameLevel ?? null;

  // (vipframe merged into frame)

  const allItems = useQuery(api.shop.listByCategory, { category, limit: 100 });

  // VIP frames items (1..7)
  const vipItems = Array.from({ length: 7 }, (_, i) => i + 1).map((n) => {
    const key = `vip.frame.${n}`;
    const data = (assetsFull as any)[key];
    return {
      _id: `vip-${n}`,
      key,
      name: `VIP ${n}`,
      imageUrl: data?.url ?? null,
      level: n,
      isVipFrame: true,
    };
  });

  const catInv = (inventory ?? []).filter((i: any) => i.category === category);
  const ownedIds = new Set(catInv.map((i: any) => i.itemId));
  const shopOwned = (allItems ?? []).filter((item: any) => ownedIds.has(item._id));
  // إطارات VIP مملوكة (ضمن تبويب الإطارات)
  const vipOwned = category === "frame"
    ? vipItems.filter((v: any) => v.level <= myVipLevel)
    : [];
  const ownedItems = [...vipOwned, ...shopOwned];
  const equippedItemId = catInv.find((i: any) => i.isEquipped)?.itemId;
  const invByItemId = new Map(catInv.map((i: any) => [i.itemId, i]));

  const handleToggle = async (item: any) => {
    if (item.isVipFrame) {
      setBusy(item._id);
      try {
        if (equippedVipLevel === item.level) {
          await unequipVipFrame({ tokenOverride: token });
        } else {
          await equipVipFrame({ level: item.level, tokenOverride: token });
        }
      } catch (e: any) {
        dialog.alert(e?.message || "فشل التفعيل");
      } finally {
        setBusy(null);
      }
      return;
    }
    const inv = invByItemId.get(item._id);
    if (!inv) return;
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

  const currentCat = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0];
  const CatIcon = currentCat.icon;
  const totalOwned = (inventory ?? []).length;

  const loading = inventory === undefined || allItems === undefined;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end justify-center"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded-t-3xl h-[85dvh] flex flex-col overflow-hidden border-t border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-white text-base font-black">خزانتي</h2>
              <p className="text-white/50 text-[10px]">{totalOwned} عنصر مملوك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 px-3 py-3 border-b border-white/10 overflow-x-auto flex-shrink-0 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.key;
            const count =
              cat.key === "frame"
                ? (inventory ?? []).filter((i: any) => i.category === "frame").length + myVipLevel
                : (inventory ?? []).filter((i: any) => i.category === cat.key).length;
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
                {count > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 rounded-full ${
                      active ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-white/40" />
            </div>
          ) : ownedItems.length === 0 ? (
            <Card tone="default" padding="lg">
              <div className="text-center py-12 text-white/40">
                <ShoppingBag size={56} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-black text-white/70">
                  {false && myVipLevel === 0
                    ? "لست مشتركاً في VIP"
                    : `لا تملك أي ${currentCat.label}`}
                </p>
                <p className="text-xs mt-1">
                  {false ? "اشترك في VIP للحصول على الإطارات" : "اشترِ من المتجر لعرضها هنا"}
                </p>
                {onOpenStore && (
                  <button
                    onClick={onOpenStore}
                    className="mt-4 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-black active:scale-95"
                  >
                    زيارة المتجر
                  </button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ownedItems.map((item: any) => {
                const inv = invByItemId.get(item._id);
                const isEquipped = item.isVipFrame
                  ? equippedVipLevel === item.level
                  : item._id === equippedItemId;
                const isBusy = busy === (item.isVipFrame ? item._id : inv?._id);
                const r = RARITY_STYLE[item.rarity] ?? RARITY_STYLE.common;
                return (
                  <Card
                    key={item._id}
                    tone="default"
                    padding="md"
                    className={isEquipped ? "ring-2 ring-emerald-400/60" : ""}
                  >
                    <div className="relative">
                      {isEquipped && (
                        <span className="absolute -top-1 -right-1 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black shadow-lg">
                          <Check size={9} strokeWidth={3} /> مُفعّل
                        </span>
                      )}
                      <div
                        className={`w-full aspect-square rounded-xl border ${r.border} ${r.bg} flex items-center justify-center overflow-hidden mb-2`}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain p-2"
                            draggable={false}
                          />
                        ) : (
                          <CatIcon size={36} className={r.text} />
                        )}
                      </div>
                    </div>
                    <p className="text-white text-xs font-black text-center truncate mb-2" title={item.name}>
                      {item.name}
                    </p>
                    <button
                      disabled={isBusy}
                      onClick={() => handleToggle(item)}
                      className={`w-full py-2 rounded-xl text-[11px] font-black transition disabled:opacity-50 ${
                        isEquipped
                          ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30"
                          : "bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90"
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 size={14} className="animate-spin mx-auto" />
                      ) : isEquipped ? (
                        "نزع"
                      ) : (
                        "ارتداء"
                      )}
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

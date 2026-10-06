import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { X, Coins, Loader2, Check, Music, Globe, Heart } from "lucide-react";

interface Props { roomId: Id<"rooms">; onClose: () => void; }

const CATEGORIES = [
  { key: "all",      label: "الأحداث" },
  { key: "classic",  label: "كلاسيكي" },
  { key: "vip",      label: "VIP" },
  { key: "relation", label: "العلاقة" },
  { key: "fun",      label: "مرح" },
];

const QUANTITIES = [1, 5, 10, 33, 66, 99];

export default function GiftSheet({ roomId, onClose }: Props) {
  const deviceId = getDeviceId();
  const gifts = useQuery(api.gifts.listActive);
  const balance = useQuery(api.gifts.myBalance, { tokenOverride: deviceId });
  const seats = useQuery(api.mics.state, { roomId });
  const members = useQuery(api.rooms.members, { roomId });
  const sendGift = useMutation(api.gifts.send);

  const [category, setCategory] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [qtyMenu, setQtyMenu] = useState<{ giftId: Id<"gifts">; x: number; y: number } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sendingId, setSendingId] = useState<Id<"gifts"> | null>(null);
  const [showRecharge, setShowRecharge] = useState(false);

  // Drag to dismiss
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);

  const membersList = (members ?? []).map((m) => ({
    ...m,
    isOnMic: !!seats?.find((s) => s.userId === m.userId),
  }));

  const filteredGifts = (gifts ?? []).filter(
    (g) => category === "all" || g.category === category
  );

  const handleSend = async (giftId: Id<"gifts">, qty: number) => {
    if (!selectedUserId) { alert("اختر المستلم أولاً"); return; }
    setSendingId(giftId);
    try {
      await sendGift({ roomId, toUserId: selectedUserId, giftId, quantity: qty, tokenOverride: deviceId });
      onClose();
    } catch (e: any) {
      const msg = typeof e?.data === "object" ? (e.data?.message || e?.message) : e?.message;
      alert(msg || "فشل الإرسال");
    } finally {
      setSendingId(null);
    }
  };

  const onDragStart = (e: React.TouchEvent) => { setDragging(true); setTouchStartY(e.touches[0].clientY); };
  const onDragMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const delta = e.touches[0].clientY - touchStartY;
    if (delta > 0) setDragY(delta);
  };
  const onDragEnd = () => {
    setDragging(false);
    if (dragY > 100) onClose();
    setDragY(0);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gray-950 rounded-t-3xl h-[80vh] flex flex-col"
        style={{ transform: `translateY(${dragY}px)`, transition: dragging ? "none" : "transform 0.3s" }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Drag handle */}
        <div className="pt-2 pb-1 flex justify-center cursor-grab touch-none"
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
          <div className="w-12 h-1.5 bg-white/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <h2 className="text-white font-bold text-sm">الهدايا</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowRecharge(true)}
              className="flex items-center gap-1 bg-yellow-500/20 hover:bg-yellow-500/30 px-2.5 py-1 rounded-full">
              <Coins size={11} className="text-yellow-400" />
              <span className="text-yellow-300 text-xs font-bold">{balance ?? 0}</span>
              <span className="text-yellow-300 text-[10px] font-bold">+</span>
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        {/* Recipients */}
        <div className="border-b border-white/10 py-2">
          <p className="text-white/50 text-[10px] px-3 mb-1">اختر المستلم</p>
          <div className="flex gap-2 px-3 overflow-x-auto thin-scroll">
            {membersList.length === 0 ? (
              <p className="text-white/40 text-xs py-2">لا يوجد أعضاء</p>
            ) : membersList.map((m) => (
              <button key={m._id} onClick={() => setSelectedUserId(m.userId)}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 w-14 transition ${selectedUserId === m.userId ? "opacity-100" : "opacity-60"}`}>
                <div className={`w-11 h-11 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-sm font-bold text-white border-2 ${selectedUserId === m.userId ? "border-purple-400 ring-2 ring-purple-400/40" : "border-transparent"}`}>
                  {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : (m.name?.[0] || "?")}
                </div>
                <span className="text-white text-[9px] truncate max-w-full">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-1 px-3 py-2 border-b border-white/10 overflow-x-auto thin-scroll flex-shrink-0">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition ${category === c.key ? "bg-purple-600 text-white font-bold" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Gifts grid — 2 rows horizontal scroll */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {gifts === undefined ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/40" size={24} /></div>
          ) : filteredGifts.length === 0 ? (
            <p className="text-white/40 text-xs text-center py-8">لا توجد هدايا</p>
          ) : (
            <div
              className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto thin-scroll pb-1"
              style={{ gridAutoColumns: "76px" }}
            >
              {filteredGifts.map((g) => {
                const isSending = sendingId === g._id;
                const insufficient = (balance ?? 0) < g.price;
                return (
                  <div key={g._id}
                    className="relative rounded-xl flex flex-col items-center bg-white/5 border border-white/10 overflow-hidden">
                    {/* Media */}
                    <div className="w-full aspect-square flex items-center justify-center overflow-hidden relative bg-black/20">
                      {g.mediaType === "video" && g.mediaUrl ? (
                        <video src={g.mediaUrl ?? undefined} className="w-full h-full object-contain" muted loop autoPlay playsInline />
                      ) : g.mediaUrl ? (
                        <img src={g.mediaUrl ?? undefined} alt={g.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-2xl">🎁</span>
                      )}

                      {/* Badges (top-left corner) */}
                      <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                        {g.isGlobal && (
                          <div className="w-4 h-4 rounded bg-blue-500/90 flex items-center justify-center shadow">
                            <Globe size={9} className="text-white" />
                          </div>
                        )}
                        {g.hasSound && (
                          <div className="w-4 h-4 rounded bg-purple-500/90 flex items-center justify-center shadow">
                            <Music size={9} className="text-white" />
                          </div>
                        )}
                        {g.isRelationship && (
                          <div className="w-4 h-4 rounded bg-pink-500/90 flex items-center justify-center shadow">
                            <Heart size={9} className="text-white fill-white" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name + price */}
                    <div className="w-full px-1 pt-1 text-center">
                      <p className="text-white text-[9px] truncate font-bold">{g.name}</p>
                      <p className="text-yellow-400 text-[9px] font-bold flex items-center justify-center gap-0.5">
                        <Coins size={8} />{g.price}
                      </p>
                    </div>

                    {/* Send button (per gift) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSend(g._id, 1); }}
                      onContextMenu={(e) => e.preventDefault()}
                      onPointerDown={(e) => {
                        e.currentTarget.dataset.longPressed = "0";
                        const t = setTimeout(() => {
                          e.currentTarget.dataset.longPressed = "1";
                          const rect = e.currentTarget.getBoundingClientRect();
                          setQtyMenu({ giftId: g._id, x: rect.left, y: rect.top });
                        }, 500);
                        (e.currentTarget as any)._longPress = t;
                      }}
                      onPointerUp={(e) => {
                        clearTimeout((e.currentTarget as any)._longPress);
                        if (e.currentTarget.dataset.longPressed === "1") {
                          e.currentTarget.dataset.longPressed = "0";
                        }
                      }}
                      onPointerLeave={(e) => {
                        clearTimeout((e.currentTarget as any)._longPress);
                      }}
                      disabled={isSending || insufficient}
                      className={`w-full py-1 text-[10px] font-bold rounded-b-xl flex items-center justify-center gap-1 transition active:scale-95 ${
                        insufficient ? "bg-gray-600/40 text-white/40" :
                        "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                      }`}
                    >
                      {isSending ? <Loader2 size={10} className="animate-spin" /> : <Coins size={9} />}
                      إرسال
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quantity menu (long press) */}
        {qtyMenu && (
          <>
            <div className="fixed inset-0 z-[85]" onClick={() => setQtyMenu(null)} />
            <div
              className="fixed z-[90] bg-gray-900 rounded-xl shadow-2xl border border-white/20 py-1 w-24"
              style={{ left: qtyMenu.x, top: Math.max(60, qtyMenu.y - 180) }}
            >
              <p className="text-white/50 text-[9px] px-3 py-1 border-b border-white/10">اختر العدد</p>
              {QUANTITIES.map((q) => (
                <button key={q}
                  onClick={() => { setQtyMenu(null); handleSend(qtyMenu.giftId, q); }}
                  className="w-full px-3 py-1.5 text-white text-xs hover:bg-white/10 flex items-center justify-between">
                  <span>×{q}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Recharge modal */}
        {showRecharge && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 rounded-t-3xl" onClick={() => setShowRecharge(false)}>
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-white/20" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-white font-bold text-lg mb-3 text-center">شحن الرصيد</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1000, 5000, 10000, 25000, 50000, 100000].map((amt) => (
                  <button key={amt} onClick={() => alert(`قريباً: ${amt} عملة`)}
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-xl p-3 flex flex-col items-center gap-1">
                    <Coins size={18} className="text-yellow-400" />
                    <span className="text-yellow-300 text-xs font-bold">{amt}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowRecharge(false)} className="w-full mt-2 bg-white/10 py-2 rounded-xl text-white text-sm font-bold">إغلاق</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { X, Coins, Loader2, Music, Globe, Heart } from "lucide-react";

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
  const [selectedGiftId, setSelectedGiftId] = useState<Id<"gifts"> | null>(null);
  const [qtyMenu, setQtyMenu] = useState<{ giftId: Id<"gifts">; x: number; y: number } | null>(null);
  const [sendingId, setSendingId] = useState<Id<"gifts"> | null>(null);
  const [showRecharge, setShowRecharge] = useState(false);
  const longPressTimer = useRef<any>(null);
  const longPressTriggered = useRef(false);

  // Drag to dismiss
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);

  // Disable page scroll when sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

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

  // Long press handlers (touch + mouse)
  const startLongPress = (giftId: Id<"gifts">, e: React.TouchEvent | React.MouseEvent) => {
    longPressTriggered.current = false;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      let x = 0, y = 0;
      if ("touches" in e) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = (e as React.MouseEvent).clientX;
        y = (e as React.MouseEvent).clientY;
      }
      setQtyMenu({ giftId, x, y });
    }, 450);
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleGiftClick = (giftId: Id<"gifts">) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    setSelectedGiftId(giftId === selectedGiftId ? null : giftId);
  };

  const onDragStart = (e: React.TouchEvent) => { setDragging(true); setTouchStartY(e.touches[0].clientY); };
  const onDragMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const delta = e.touches[0].clientY - touchStartY;
    if (delta > 0) setDragY(delta);
  };
  const onDragEnd = () => {
    setDragging(false);
    if (dragY > 80) onClose();
    setDragY(0);
  };

  const selectedGift = gifts?.find((g) => g._id === selectedGiftId);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gray-950/95 backdrop-blur-md rounded-t-3xl flex flex-col select-none"
        style={{
          height: "42vh",
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.3s",
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        dir="rtl"
      >
        {/* Drag handle */}
        <div className="pt-1.5 pb-0.5 flex justify-center cursor-grab touch-none"
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Header (compact) */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
          <h2 className="text-white font-bold text-xs">الهدايا</h2>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowRecharge(true)}
              className="flex items-center gap-0.5 bg-yellow-500/20 hover:bg-yellow-500/30 px-2 py-0.5 rounded-full">
              <Coins size={10} className="text-yellow-400" />
              <span className="text-yellow-300 text-[10px] font-bold">{balance ?? 0}</span>
              <span className="text-yellow-300 text-[9px] font-bold">+</span>
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white p-0.5"><X size={14} /></button>
          </div>
        </div>

        {/* Recipients (small) */}
        <div className="border-b border-white/10 py-1">
          <div className="flex gap-1.5 px-2 overflow-x-auto thin-scroll">
            {membersList.length === 0 ? (
              <p className="text-white/40 text-[10px] py-1 px-2">لا يوجد أعضاء</p>
            ) : membersList.map((m) => (
              <button key={m._id} onClick={() => setSelectedUserId(m.userId)}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 w-10 transition ${selectedUserId === m.userId ? "opacity-100" : "opacity-55"}`}>
                <div className={`w-8 h-8 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white border-2 ${selectedUserId === m.userId ? "border-purple-400 ring-1 ring-purple-400/40" : "border-transparent"}`}>
                  {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : (m.name?.[0] || "?")}
                </div>
                <span className="text-white text-[8px] truncate max-w-full">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Categories (compact) */}
        <div className="flex gap-1 px-2 py-1 border-b border-white/10 overflow-x-auto thin-scroll flex-shrink-0">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap transition ${category === c.key ? "bg-purple-600 text-white font-bold" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Gifts grid 5×2 horizontal scroll (frozen thumbnails) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1.5">
          {gifts === undefined ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-white/40" size={18} /></div>
          ) : filteredGifts.length === 0 ? (
            <p className="text-white/40 text-[10px] text-center py-4">لا توجد هدايا</p>
          ) : (
            <div
              className="grid grid-rows-2 grid-flow-col gap-1.5 overflow-x-auto thin-scroll pb-1"
              style={{ gridAutoColumns: "62px" }}
            >
              {filteredGifts.map((g) => {
                const isSelected = selectedGiftId === g._id;
                const isSending = sendingId === g._id;
                const insufficient = (balance ?? 0) < g.price;
                return (
                  <button
                    key={g._id}
                    onClick={() => handleGiftClick(g._id)}
                    onTouchStart={(e) => startLongPress(g._id, e)}
                    onTouchEnd={cancelLongPress}
                    onTouchCancel={cancelLongPress}
                    onMouseDown={(e) => startLongPress(g._id, e)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`relative rounded-lg flex flex-col items-center overflow-hidden transition border ${
                      isSelected
                        ? "bg-purple-600/40 border-purple-400 ring-1 ring-purple-400/50"
                        : "bg-white/5 border-white/10"
                    }`}
                    style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
                  >
                    {/* Media — static thumbnail, video NOT playing */}
                    <div className="w-full aspect-square flex items-center justify-center overflow-hidden relative bg-black/20">
                      {g.mediaUrl ? (
                        <img src={g.mediaUrl} alt={g.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-lg">🎁</span>
                      )}

                      {/* Badges */}
                      <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5">
                        {g.isGlobal && (
                          <div className="w-3 h-3 rounded bg-blue-500/90 flex items-center justify-center shadow">
                            <Globe size={7} className="text-white" />
                          </div>
                        )}
                        {g.hasSound && (
                          <div className="w-3 h-3 rounded bg-purple-500/90 flex items-center justify-center shadow">
                            <Music size={7} className="text-white" />
                          </div>
                        )}
                        {g.isRelationship && (
                          <div className="w-3 h-3 rounded bg-pink-500/90 flex items-center justify-center shadow">
                            <Heart size={7} className="text-white fill-white" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name + price */}
                    <div className="w-full px-0.5 pb-0.5 text-center">
                      <p className="text-white text-[8px] truncate font-bold leading-tight">{g.name}</p>
                      <p className="text-yellow-400 text-[8px] font-bold flex items-center justify-center gap-0.5 leading-tight">
                        <Coins size={7} />{g.price}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Send button — only when a gift is selected */}
        {selectedGift && (
          <div className="border-t border-white/10 p-1.5 flex-shrink-0">
            <button
              onClick={() => handleSend(selectedGift._id, 1)}
              disabled={sendingId === selectedGift._id || (balance ?? 0) < selectedGift.price}
              className="w-full py-2 rounded-xl text-white font-bold text-xs bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {sendingId === selectedGift._id ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Coins size={12} />
              )}
              إرسال {selectedGift.name} ({selectedGift.price})
            </button>
            <p className="text-white/40 text-[9px] text-center mt-0.5">
              اضغط مطولاً على الهدية لاختيار العدد
            </p>
          </div>
        )}

        {/* Quantity menu (long press) */}
        {qtyMenu && (
          <>
            <div className="fixed inset-0 z-[85]" onClick={() => setQtyMenu(null)} />
            <div
              className="fixed z-[90] bg-gray-900 rounded-xl shadow-2xl border border-white/20 py-1 w-20"
              style={{
                left: Math.min(qtyMenu.x, window.innerWidth - 90),
                top: Math.max(60, qtyMenu.y - 200),
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <p className="text-white/50 text-[9px] px-2 py-0.5 border-b border-white/10">اختر العدد</p>
              {QUANTITIES.map((q) => (
                <button key={q}
                  onClick={() => { const id = qtyMenu.giftId; setQtyMenu(null); handleSend(id, q); }}
                  className="w-full px-2 py-1 text-white text-[10px] hover:bg-white/10 flex items-center justify-between">
                  <span>×{q}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Recharge modal */}
        {showRecharge && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 rounded-t-3xl" onClick={() => setShowRecharge(false)}>
            <div className="bg-gray-900 rounded-2xl p-4 max-w-sm w-full border border-white/20" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-white font-bold text-sm mb-2 text-center">شحن الرصيد</h3>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {[1000, 5000, 10000, 25000, 50000, 100000].map((amt) => (
                  <button key={amt} onClick={() => alert(`قريباً: ${amt} عملة`)}
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-lg p-2 flex flex-col items-center gap-0.5">
                    <Coins size={14} className="text-yellow-400" />
                    <span className="text-yellow-300 text-[10px] font-bold">{amt}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowRecharge(false)} className="w-full mt-1 bg-white/10 py-1.5 rounded-lg text-white text-xs font-bold">إغلاق</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

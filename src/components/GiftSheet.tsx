import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { X, Coins, Loader2, Music, Heart, Globe } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
  }

const CATEGORIES = [
  { key: "all",      label: "الكل" },
  { key: "classic",  label: "كلاسيكي" },
  { key: "vip",      label: "VIP" },
  { key: "relation", label: "العلاقة" },
  { key: "fun",      label: "مرح" },
];

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
  const [showRecharge, setShowRecharge] = useState(false);

  // Drag to dismiss
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);

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

  const selectedGift = gifts?.find((g) => g._id === selectedGiftId);
  const insufficient = selectedGift ? (balance ?? 0) < selectedGift.price : false;

  const [sendingGiftId, setSendingGiftId] = useState<Id<"gifts"> | null>(null);

  const handleSelectGiftAndSend = async (giftId: Id<"gifts">) => {
    if (!selectedUserId) { alert("اختر المستلم أولاً"); return; }
    const gift = gifts?.find((g) => g._id === giftId);
    if (!gift) return;
    if ((balance ?? 0) < gift.price) { alert("رصيدك غير كافٍ"); return; }
    setSendingGiftId(giftId);
    try {
      await sendGift({ roomId, toUserId: selectedUserId, giftId, quantity: 1, tokenOverride: deviceId });
    } catch (e: any) {
      const msg = typeof e?.data === "object" ? (e.data?.message || e?.message) : e?.message;
      alert(msg || "فشل الإرسال");
    } finally {
      setSendingGiftId(null);
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
    if (dragY > 80) onClose();
    setDragY(0);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gray-950/98 backdrop-blur-md rounded-t-3xl flex flex-col select-none overflow-hidden"
        style={{
          height: "40vh",
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.3s",
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        dir="rtl"
      >
        {/* Drag handle */}
        <div className="pt-1.5 pb-0.5 flex justify-center cursor-grab touch-none flex-shrink-0"
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-0.5 flex-shrink-0">
          <button onClick={onClose} className="text-white/70 hover:text-white p-0.5"><X size={16} /></button>
          <h2 className="text-white font-bold text-[11px]">الهدايا</h2>
          <div className="flex items-center gap-0.5 bg-gray-800/80 border border-white/20 rounded-full overflow-hidden">
            <button onClick={(e) => { e.stopPropagation(); setShowRecharge(true); }} className="px-1.5 py-0.5 hover:bg-gray-700">
              <span className="text-yellow-300 text-[11px] font-bold">‹</span>
            </button>
            <span className="text-yellow-300 text-[10px] font-bold">{balance ?? 0}</span>
            <div className="px-1.5 py-0.5"><Coins size={9} className="text-yellow-400" /></div>
          </div>
        </div>

        {/* Recipients */}
        <div className="border-b border-white/10 py-0.5 flex-shrink-0 mt-0.5">
          <div className="flex gap-1.5 px-2 overflow-x-auto thin-scroll">
            {membersList.length === 0 ? (
              <p className="text-white/40 text-[9px] py-0.5 px-2">لا يوجد أعضاء</p>
            ) : membersList.map((m) => (
              <button key={m._id} onClick={() => setSelectedUserId(m.userId)}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 w-9 transition ${selectedUserId === m.userId ? "opacity-100" : "opacity-50"}`}>
                <div className={`w-7 h-7 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-[9px] font-bold text-white border-2 ${selectedUserId === m.userId ? "border-purple-400" : "border-transparent"}`}>
                  {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : (m.name?.[0] || "?")}
                </div>
                <span className="text-white text-[7px] truncate max-w-full">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-row-reverse gap-1 px-2 py-1 border-b border-white/10 overflow-x-auto thin-scroll flex-shrink-0">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`px-2 py-0.5 rounded-md text-[10px] whitespace-nowrap transition relative ${category === c.key ? "text-white font-bold" : "text-white/60"}`}>
              {c.label}
              {category === c.key && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-400 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Gifts grid */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1.5 py-1.5 thin-scroll">
          {gifts === undefined ? (
            <div className="flex justify-center py-3"><Loader2 className="animate-spin text-white/40" size={16} /></div>
          ) : filteredGifts.length === 0 ? (
            <p className="text-white/40 text-[9px] text-center py-3">لا توجد هدايا</p>
          ) : (
            <div className="grid grid-cols-5 gap-1">
              {filteredGifts.map((g) => (
                <button
                  key={g._id}
                  onClick={() => handleSelectGiftAndSend(g._id)}
                  onContextMenu={(e) => e.preventDefault()}
                  className="relative rounded-md flex flex-col overflow-hidden transition active:scale-95 bg-white/5 hover:bg-white/15"
                  style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
                >
                  <div className="w-full aspect-square overflow-hidden bg-black/20 relative">
                    {g.mediaUrl ? (
                      g.mediaType === "video" ? (
                        <video src={g.mediaUrl} className="w-full h-full object-cover pointer-events-none" preload="metadata" muted playsInline disablePictureInPicture controlsList="nodownload noplaybackrate" />
                      ) : (
                        <img src={g.mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )
                    ) : <div className="w-full h-full flex items-center justify-center"><span className="text-base">🎁</span></div>}
                    <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 pointer-events-none">
                      {g.isRelationship && <div className="w-3 h-3 rounded-sm bg-pink-500/95 flex items-center justify-center"><Heart size={7} className="text-white fill-white" /></div>}
                      {g.isGlobal && <div className="w-3 h-3 rounded-sm bg-blue-500/95 flex items-center justify-center"><Globe size={7} className="text-white" /></div>}
                      {g.hasSound && <div className="w-3 h-3 rounded-sm bg-purple-500/95 flex items-center justify-center"><Music size={7} className="text-white" /></div>}
                    </div>
                  </div>
                  <div className="px-0.5 py-0.5 text-center leading-tight">
                    <p className="text-white text-[8px] truncate font-bold">{g.name}</p>
                    <p className="text-yellow-400 text-[8px] font-bold flex items-center justify-center gap-0.5">{g.price}<Coins size={6} /></p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

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

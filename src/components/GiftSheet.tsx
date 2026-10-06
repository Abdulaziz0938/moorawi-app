import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { X, Coins, Loader2, Check } from "lucide-react";

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

const QUANTITIES = [1, 5, 10, 33, 66, 99];

export default function GiftSheet({ roomId, onClose }: Props) {
  const deviceId = getDeviceId();
  const gifts = useQuery(api.gifts.listActive);
  const balance = useQuery(api.gifts.myBalance, { tokenOverride: deviceId });
  const seats = useQuery(api.mics.state, { roomId });
  const members = useQuery(api.rooms.members, { roomId });
  const sendGift = useMutation(api.gifts.send);

  const [category, setCategory] = useState("all");
  const [selectedGiftId, setSelectedGiftId] = useState<Id<"gifts"> | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);
  const [showQtyMenu, setShowQtyMenu] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);

  // Drag to dismiss
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);

  const membersList = (members ?? []).map((m) => {
    const seatInfo = seats?.find((s) => s.userId === m.userId);
    return { ...m, isOnMic: !!seatInfo };
  });

  const filteredGifts = (gifts ?? []).filter((g) => category === "all" || g.category === category);
  const selectedGift = gifts?.find((g) => g._id === selectedGiftId);
  const totalPrice = selectedGift ? selectedGift.price * quantity : 0;
  const canSend = !!selectedGiftId && !!selectedUserId && totalPrice <= (balance ?? 0) && !sending;

  const handleSend = async () => {
    if (!selectedGiftId || !selectedUserId) return;
    setSending(true);
    try {
      await sendGift({ roomId, toUserId: selectedUserId, giftId: selectedGiftId, quantity, tokenOverride: deviceId });
      onClose();
    } catch (e: any) {
      const msg = typeof e?.data === "object" ? (e.data?.message || e?.message) : e?.message;
      alert(msg || "فشل الإرسال");
    } finally {
      setSending(false);
    }
  };

  const handleDragStart = (e: React.TouchEvent) => {
    setDragging(true);
    setTouchStartY(e.touches[0].clientY);
  };
  const handleDragMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const delta = e.touches[0].clientY - touchStartY;
    if (delta > 0) setDragY(delta);
  };
  const handleDragEnd = () => {
    setDragging(false);
    if (dragY > 100) onClose();
    setDragY(0);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gray-950 rounded-t-3xl h-[85vh] flex flex-col shadow-2xl border-t border-white/10"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.3s",
        }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Drag handle */}
        <div
          className="pt-2 pb-1 flex justify-center cursor-grab touch-none"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-12 h-1.5 bg-white/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
          <h2 className="text-white font-bold text-sm">الهدايا</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRecharge(true)}
              className="flex items-center gap-1 bg-yellow-500/20 hover:bg-yellow-500/30 px-2.5 py-1 rounded-full transition"
            >
              <Coins size={12} className="text-yellow-400" />
              <span className="text-yellow-300 text-xs font-bold">{balance ?? 0}</span>
              <span className="text-yellow-300 text-[10px] font-bold">+</span>
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        {/* Recipients (horizontal scroll) */}
        <div className="border-b border-white/10 py-2">
          <p className="text-white/50 text-[10px] px-3 mb-1">اختر المستلم</p>
          <div className="flex gap-2 px-3 overflow-x-auto thin-scroll">
            {membersList.length === 0 ? (
              <p className="text-white/40 text-xs py-2">لا يوجد أعضاء</p>
            ) : membersList.map((m) => (
              <button
                key={m._id}
                onClick={() => setSelectedUserId(m.userId)}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 w-14 transition ${
                  selectedUserId === m.userId ? "opacity-100 scale-105" : "opacity-60"
                }`}
              >
                <div className={`w-11 h-11 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-sm font-bold text-white border-2 ${
                  selectedUserId === m.userId ? "border-purple-400 ring-2 ring-purple-400/40" : "border-transparent"
                }`}>
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
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition ${
                category === c.key
                  ? "bg-purple-600 text-white font-bold"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Gifts grid: 2 rows, horizontal scroll */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {gifts === undefined ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/40" size={24} /></div>
          ) : filteredGifts.length === 0 ? (
            <p className="text-white/40 text-xs text-center py-8">لا توجد هدايا</p>
          ) : (
            <div
              className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto thin-scroll pb-1"
              style={{ gridAutoColumns: "90px" }}
            >
              {filteredGifts.map((g) => (
                <button
                  key={g._id}
                  onClick={() => setSelectedGiftId(g._id)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 transition border-2 relative overflow-hidden ${
                    selectedGiftId === g._id
                      ? "bg-purple-600/30 border-purple-400"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="w-14 h-14 flex items-center justify-center overflow-hidden rounded-lg">
                    {g.mediaType === "video" && g.mediaUrl ? (
                      <video src={g.mediaUrl ?? undefined} className="w-full h-full object-contain" muted loop autoPlay playsInline />
                    ) : g.mediaUrl ? (
                      <img src={g.mediaUrl ?? undefined} alt={g.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl">🎁</span>
                    )}
                  </div>
                  <span className="text-white text-[10px] mt-0.5 truncate max-w-full font-bold">{g.name}</span>
                  <span className="text-yellow-400 text-[10px] font-bold flex items-center gap-0.5">
                    <Coins size={9} />{g.price}
                  </span>
                  {selectedGiftId === g._id && (
                    <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-0.5">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send bar */}
        <div className="border-t border-white/10 p-2 flex items-center gap-2 flex-shrink-0">
          {/* Quantity selector */}
          <div className="relative">
            <button
              onClick={() => setShowQtyMenu((v) => !v)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-bold min-w-[50px]"
            >
              ×{quantity}
            </button>
            {showQtyMenu && (
              <>
                <div className="fixed inset-0 z-[85]" onClick={() => setShowQtyMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 z-[90] bg-gray-900 rounded-xl shadow-2xl border border-white/20 py-1 w-24">
                  {QUANTITIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setQuantity(q); setShowQtyMenu(false); }}
                      className="w-full px-3 py-2 text-white text-sm hover:bg-white/10 flex items-center justify-between"
                    >
                      <span>{q}</span>
                      {quantity === q && <Check size={12} className="text-purple-300" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-40 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition"
          >
            {sending ? <Loader2 className="animate-spin" size={16} /> : <Coins size={14} />}
            {sending ? "جاري الإرسال..." : `إرسال (${totalPrice})`}
          </button>
        </div>

        {/* Recharge modal */}
        {showRecharge && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 rounded-t-3xl" onClick={() => setShowRecharge(false)}>
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-white/20" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-white font-bold text-lg mb-3 text-center">شحن الرصيد</h3>
              <p className="text-white/60 text-sm text-center mb-4">اختر باقة الشحن</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1000, 5000, 10000, 25000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => alert(`سيتم شحن ${amt} عملة قريباً`)}
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-xl p-3 flex flex-col items-center gap-1"
                  >
                    <Coins size={18} className="text-yellow-400" />
                    <span className="text-yellow-300 text-xs font-bold">{amt}</span>
                  </button>
                ))}
              </div>
              <p className="text-white/40 text-[10px] text-center">قريباً: الدفع عبر Google Play / Apple Pay</p>
              <button onClick={() => setShowRecharge(false)} className="w-full mt-4 bg-white/10 py-2 rounded-xl text-white text-sm font-bold">
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

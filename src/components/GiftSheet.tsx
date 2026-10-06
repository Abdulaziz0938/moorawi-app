import { useState } from "react";
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

  // Enrich members with avatar
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
      alert(e?.message || "فشل الإرسال");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gray-950 rounded-t-2xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
          <h2 className="text-white font-bold text-sm">الهدايا</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
              <Coins size={12} className="text-yellow-400" />
              <span className="text-yellow-300 text-xs font-bold">{balance ?? 0}</span>
            </div>
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
                  selectedUserId === m.userId ? "opacity-100" : "opacity-60"
                }`}
              >
                <div className={`w-11 h-11 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-sm font-bold text-white border-2 ${
                  selectedUserId === m.userId ? "border-purple-400" : "border-transparent"
                }`}>
                  {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : (m.name?.[0] || "?")}
                </div>
                <span className="text-white text-[9px] truncate max-w-full">{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-1 px-3 py-2 border-b border-white/10 overflow-x-auto thin-scroll">
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

        {/* Gifts grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {gifts === undefined ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/40" size={24} /></div>
          ) : filteredGifts.length === 0 ? (
            <p className="text-white/40 text-xs text-center py-8">لا توجد هدايا</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {filteredGifts.map((g) => (
                <button
                  key={g._id}
                  onClick={() => setSelectedGiftId(g._id)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 transition border-2 ${
                    selectedGiftId === g._id
                      ? "bg-purple-600/30 border-purple-400"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {/* media preview */}
                  {g.mediaType === "video" ? (
                    <video src={g.mediaUrl} className="w-12 h-12 rounded object-cover" muted loop autoPlay playsInline />
                  ) : g.mediaUrl ? (
                    <img src={g.mediaUrl} alt={g.name} className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <span className="text-2xl">🎁</span>
                  )}
                  <span className="text-white text-[9px] mt-0.5 truncate max-w-full">{g.name}</span>
                  <span className="text-yellow-400 text-[9px] font-bold flex items-center gap-0.5">
                    <Coins size={8} />{g.price}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send bar */}
        <div className="border-t border-white/10 p-2 flex items-center gap-2">
          {/* Quantity selector */}
          <div className="relative">
            <button
              onClick={() => setShowQtyMenu((v) => !v)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-bold"
            >
              ×{quantity}
            </button>
            {showQtyMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowQtyMenu(false)} />
                <div className="absolute bottom-12 left-0 z-50 bg-gray-900 rounded-xl shadow-2xl border border-white/20 py-1 w-20">
                  {QUANTITIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setQuantity(q); setShowQtyMenu(false); }}
                      className="w-full px-3 py-1.5 text-white text-sm hover:bg-white/10 flex items-center justify-between"
                    >
                      {q} {quantity === q && <Check size={12} className="text-purple-300" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-40 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 text-sm"
          >
            {sending ? <Loader2 className="animate-spin" size={16} /> : <Coins size={14} />}
            {sending ? "جاري الإرسال..." : `إرسال (${totalPrice})`}
          </button>
        </div>
      </div>
    </div>
  );
}

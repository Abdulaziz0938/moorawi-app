// [ezo-live-gift] ورقة اختيار هدية للبث
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getDeviceId } from "../../lib/device";
import { getActiveToken } from "../../lib/session";
import { dialog } from "../../lib/dialog";
import { X, Coins, Loader2 } from "lucide-react";

interface Props {
  streamId: string;
  toUserId: string; // host or co-host
  toName: string;
  onClose: () => void;
}

export default function LiveGiftSheet({
  streamId,
  toUserId,
  toName,
  onClose,
}: Props) {
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;

  const gifts = useQuery(api.gifts.listActive);
  const balance = useQuery(api.gifts.myBalance, { tokenOverride: token });
  const sendGift = useMutation(api.live.sendGiftToLive);

  const [selectedGift, setSelectedGift] = useState<Id<"gifts"> | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);

  const gift = gifts?.find((g: any) => g._id === selectedGift);
  const total = (gift?.price ?? 0) * quantity;
  const coins = typeof balance === "number" ? balance : (balance as any)?.coins ?? 0;
  const canAfford = coins >= total;

  const handleSend = async () => {
    if (!selectedGift) {
      dialog.alert("اختر هدية أولاً");
      return;
    }
    if (!canAfford) {
      dialog.alert(`رصيدك ${coins.toLocaleString()} — تحتاج ${total.toLocaleString()}`);
      return;
    }
    setSending(true);
    try {
      await sendGift({
        streamId: streamId as Id<"liveStreams">,
        giftId: selectedGift,
        quantity,
        toUserId: toUserId as Id<"users">,
        tokenOverride: token,
      });
      onClose();
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الإرسال");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-end"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-md mx-auto bg-gradient-to-b from-slate-900 to-black rounded-t-3xl max-h-[75dvh] flex flex-col border-t border-pink-400/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-pink-400 text-lg">🎁</span>
            <div>
              <h2 className="text-white text-base font-black">أرسل هدية</h2>
              <p className="text-white/50 text-[10px]">إلى {toName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30">
              <Coins size={12} className="text-amber-300" />
              <span className="text-amber-200 text-[10px] font-black tabular-nums">
                {coins.toLocaleString()}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Gift grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {!gifts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="text-white/40 animate-spin" size={28} />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {gifts.map((g: any) => {
                const sel = selectedGift === g._id;
                return (
                  <button
                    key={g._id}
                    onClick={() => setSelectedGift(g._id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition active:scale-95 ${
                      sel
                        ? "bg-pink-500/20 border-pink-400"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center">
                      {g.mediaType === "video" ? (
                        <video
                          src={g.mediaUrl}
                          className="w-full h-full object-contain"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <img
                          src={g.mediaUrl}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <div className="text-white text-[9px] font-black truncate max-w-full">
                      {g.name}
                    </div>
                    <div className="text-amber-300 text-[8px] font-black tabular-nums">
                      {g.price.toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quantity + Send */}
        {gift && (
          <div className="border-t border-white/10 p-3 space-y-2">
            {/* Quantity presets */}
            <div className="flex gap-1">
              {[1, 5, 10, 33, 66, 99].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition ${
                    quantity === q
                      ? "bg-pink-500 text-white"
                      : "bg-white/5 text-white/60"
                  }`}
                >
                  ×{q}
                </button>
              ))}
            </div>

            {/* Total + Send */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30">
                <Coins size={12} className="text-amber-300" />
                <span className="text-amber-200 text-xs font-black tabular-nums">
                  {total.toLocaleString()}
                </span>
              </div>
              <button
                onClick={handleSend}
                disabled={sending || !canAfford}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-sm shadow-lg active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    🎁 إرسال ×{quantity}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// [ezo-live-gift] شيت الهدايا للبث (مطابق لشيت الغرف)
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getDeviceId } from "../../lib/device";
import { getActiveToken } from "../../lib/session";
import { dialog } from "../../lib/dialog";
import { X, Coins, Loader2, Heart, Globe, Music, Gift, Check, ChevronUp } from "lucide-react";

interface Props {
  streamId: string;
  toUserId: string;
  toName: string;
  onClose: () => void;
}

const CATEGORIES = [
  { key: "all", label: "الكل" },
  { key: "classic", label: "كلاسيكي" },
  { key: "vip", label: "VIP" },
  { key: "relation", label: "العلاقة" },
  { key: "fun", label: "مرح" },
];

const QUANTITY_PRESETS = [1, 5, 10, 33, 66, 99];

export default function LiveGiftSheet({ streamId, toUserId, toName, onClose }: Props) {
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;

  const gifts = useQuery(api.gifts.listActive);
  const balance = useQuery(api.gifts.myBalance, { tokenOverride: token });
  const sendGift = useMutation(api.live.sendGiftToLive);

  const [category, setCategory] = useState("all");
  const [selectedGiftId, setSelectedGiftId] = useState<Id<"gifts"> | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [showQtyMenu, setShowQtyMenu] = useState<boolean>(false);
  const [sending, setSending] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [comboProgress, setComboProgress] = useState(100);
  const [showComboCircle, setShowComboCircle] = useState(false);
  const comboTimeoutRef = useState<any>({ current: null })[0];
  const comboIntervalRef = useState<any>({ current: null })[0];

  const coins = typeof balance === "number" ? balance : (balance as any)?.coins ?? 0;
  const filteredGifts = (gifts ?? []).filter((g) => category === "all" || g.category === category);
  const selectedGift = gifts?.find((g) => g._id === selectedGiftId);
  const totalCost = selectedGift ? selectedGift.price * selectedQuantity : 0;
  const insufficient = totalCost > coins;

  const handleGiftTap = (giftId: Id<"gifts">) => {
    if (selectedGiftId === giftId) setSelectedGiftId(null);
    else setSelectedGiftId(giftId);
  };

  const resetComboTimer = () => {
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    if (comboIntervalRef.current) clearInterval(comboIntervalRef.current);

    const duration = 2500;
    const startTime = Date.now();

    comboIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setComboProgress(Math.max(0, 100 - (elapsed / duration) * 100));
    }, 30);

    comboTimeoutRef.current = setTimeout(() => {
      if (comboIntervalRef.current) clearInterval(comboIntervalRef.current);
      setShowComboCircle(false);
      setComboCount(0);
      setComboProgress(100);
    }, duration);
  };

  const handleSendClick = async (e: React.MouseEvent, giftId: Id<"gifts">) => {
    e.stopPropagation();
    const gift = gifts?.find((g) => g._id === giftId);
    if (!gift) return;
    const cost = gift.price * selectedQuantity;
    if (cost > coins) { dialog.alert("رصيدك غير كافٍ"); return; }

    setComboCount((c) => c + 1);
    setComboProgress(100);
    setShowComboCircle(true);
    resetComboTimer();

    setSending(true);
    try {
      await sendGift({
        streamId: streamId as Id<"liveStreams">,
        giftId,
        quantity: selectedQuantity,
        toUserId: toUserId as Id<"users">,
        tokenOverride: token,
      });
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الإرسال");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/70 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-gray-950/98 backdrop-blur-md rounded-t-3xl flex flex-col select-none overflow-hidden relative"
        style={{ height: "55vh" }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 flex-shrink-0">
          <button onClick={onClose} className="text-white/70 hover:text-white p-1"><X size={18} /></button>
          <div className="flex flex-col items-center">
            <h2 className="text-white font-bold text-sm">الهدايا</h2>
            <p className="text-pink-400 text-[10px]">إلى {toName}</p>
          </div>
          <div className="flex items-center gap-0.5 bg-gray-800/80 border border-white/20 rounded-full px-2 py-1">
            <span className="text-yellow-300 text-xs font-bold">{coins.toLocaleString()}</span>
            <Coins size={12} className="text-yellow-400" />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-row-reverse gap-2 px-3 py-2 border-b border-white/10 overflow-x-auto thin-scroll flex-shrink-0">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition relative ${
                category === c.key ? "text-white font-bold bg-white/10" : "text-white/60"
              }`}
            >
              {c.label}
              {category === c.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Gifts Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 thin-scroll">
          {gifts === undefined ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-white/40" size={20} /></div>
          ) : filteredGifts.length === 0 ? (
            <p className="text-white/40 text-xs text-center py-6">لا توجد هدايا</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {filteredGifts.map((g) => {
                const isSelected = selectedGiftId === g._id;
                return (
                  <div key={g._id} className="relative flex flex-col">
                    <button
                      onClick={() => handleGiftTap(g._id)}
                      className={`relative rounded-xl flex flex-col overflow-hidden transition active:scale-95 border-2 ${
                        isSelected ? "border-emerald-400 bg-purple-600/20" : "border-transparent bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="w-full aspect-square overflow-hidden bg-black/20 relative">
                        {g.mediaUrl ? (
                          g.mediaType === "video" ? (
                            <video src={g.mediaUrl} className="w-full h-full object-cover pointer-events-none" preload="metadata" muted playsInline />
                          ) : (
                            <img src={g.mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Gift size={24} className="text-pink-400" /></div>
                        )}
                        <div className="absolute top-1 right-1 flex flex-col gap-1 pointer-events-none">
                          {g.isRelationship && <div className="w-4 h-4 rounded bg-pink-500/95 flex items-center justify-center"><Heart size={10} className="text-white fill-white" /></div>}
                          {g.isGlobal && <div className="w-4 h-4 rounded bg-blue-500/95 flex items-center justify-center"><Globe size={10} className="text-white" /></div>}
                          {g.hasSound && <div className="w-4 h-4 rounded bg-purple-500/95 flex items-center justify-center"><Music size={10} className="text-white" /></div>}
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 left-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Check size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="px-1 py-1 text-center leading-tight">
                        <p className="text-white text-[10px] truncate font-bold">{g.name}</p>
                        <p className="text-yellow-400 text-[10px] font-bold flex items-center justify-center gap-0.5">{g.price}<Coins size={8} /></p>
                      </div>
                    </button>

                    {/* Send Button (if selected) */}
                    {isSelected && (
                      <div className="mt-1 flex flex-col gap-1">
                        <button
                          onClick={(e) => handleSendClick(e, g._id)}
                          disabled={sending || insufficient}
                          className={`w-full rounded-lg py-1.5 flex items-center justify-center gap-1 active:scale-95 transition-all duration-200 shadow-lg ${
                            insufficient ? "bg-red-500/80" : "bg-gradient-to-br from-emerald-400 to-teal-600"
                          } disabled:opacity-60`}
                        >
                          {sending ? (
                            <Loader2 className="animate-spin text-white" size={12} />
                          ) : insufficient ? (
                            <span className="text-white text-[10px] font-black">رصيد غير كافٍ</span>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
                                <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span className="text-white text-[10px] font-black">إرسال</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowQtyMenu(true); }}
                          className="w-full bg-yellow-500/20 border border-yellow-400/40 rounded-lg py-0.5 flex items-center justify-center gap-1 active:scale-95"
                        >
                          <ChevronUp size={10} className="text-yellow-300" />
                          <span className="text-yellow-300 text-[10px] font-black">x{selectedQuantity}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Combo Circle */}
        {showComboCircle && comboCount > 0 && (
          <div className="absolute bottom-4 left-4 z-[90] pointer-events-none">
            <div className="relative w-16 h-16">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="rgba(0,0,0,0.6)" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#fbbf24" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - comboProgress / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.05s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span key={comboCount} className="text-yellow-300 text-lg font-black combo-pulse">
                  x{comboCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Qty Selector Popup */}
        {showQtyMenu && (
          <>
            <div className="fixed inset-0 z-[405]" onClick={() => setShowQtyMenu(false)} />
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[410] bg-gray-900 rounded-2xl shadow-2xl border border-white/20 p-2 min-w-[160px]">
              <p className="text-white/50 text-[10px] text-center mb-1 font-bold">اختر عدد الإرسال</p>
              <div className="grid grid-cols-3 gap-1.5">
                {QUANTITY_PRESETS.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setSelectedQuantity(q); setShowQtyMenu(false); }}
                    className={`py-2 rounded-xl text-xs font-black transition ${
                      selectedQuantity === q
                        ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                  >
                    x{q}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

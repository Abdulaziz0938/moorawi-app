import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { X, Coins, Loader2, Music, Heart, Globe, Mic, Users, Check, ChevronUp } from "lucide-react";

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

type RecipientMode = "mic" | "room" | "individual";

const QUANTITY_PRESETS = [1, 5, 10, 33, 66, 99];

export default function GiftSheet({ roomId, onClose }: Props) {
  const deviceId = getDeviceId();
  const gifts = useQuery(api.gifts.listActive);
  const balance = useQuery(api.gifts.myBalance, { tokenOverride: deviceId });
  const seats = useQuery(api.mics.state, { roomId });
  const members = useQuery(api.rooms.members, { roomId });
  const sendBatch = useMutation(api.gifts.sendBatch);

  const [category, setCategory] = useState("all");
  const [selectedGiftId, setSelectedGiftId] = useState<Id<"gifts"> | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<Id<"users">>>(new Set());
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("mic");
  const [showRecharge, setShowRecharge] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [showQtyMenu, setShowQtyMenu] = useState<boolean>(false);
  const [comboCount, setComboCount] = useState(0);
  const [comboProgress, setComboProgress] = useState(100);
  const [showComboCircle, setShowComboCircle] = useState(false);
  const comboTimeoutRef = useState<any>({ current: null })[0];
  const comboIntervalRef = useState<any>({ current: null })[0];

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

  const micMembers = membersList.filter((m) => m.isOnMic);

  // Auto-select based on mode
  useEffect(() => {
    if (recipientMode === "mic") {
      setSelectedUserIds(new Set(micMembers.map((m) => m.userId)));
    } else if (recipientMode === "room") {
      setSelectedUserIds(new Set(membersList.map((m) => m.userId)));
    }
    // eslint-disable-next-line
  }, [recipientMode, seats?.length, members?.length]);

  const toggleUser = (userId: Id<"users">) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUserIds(next);
    setRecipientMode("individual");
  };

  const filteredGifts = (gifts ?? []).filter(
    (g) => category === "all" || g.category === category
  );

  const selectedGift = gifts?.find((g) => g._id === selectedGiftId);
  const totalCost = selectedGift ? selectedGift.price * selectedQuantity * selectedUserIds.size : 0;
  const insufficient = totalCost > (balance ?? 0);

  // ============ ضغطة على الهدية: اختيار أو إلغاء ============
  const handleGiftTap = (giftId: Id<"gifts">) => {
    if (selectedGiftId === giftId) {
      setSelectedGiftId(null);
    } else {
      setSelectedGiftId(giftId);
    }
  };

  // ============ ضغطة على زر الإرسال داخل البطاقة: إرسال فوري (مع Combo) ============
  const handleSendClick = async (e: React.MouseEvent, giftId: Id<"gifts">) => {
    e.stopPropagation();
    if (selectedUserIds.size === 0) { alert("اختر مستلماً واحداً على الأقل"); return; }
    const gift = gifts?.find((g) => g._id === giftId);
    if (!gift) return;
    const cost = gift.price * selectedUserIds.size;
    if (cost > (balance ?? 0)) { alert("رصيدك غير كافٍ"); return; }

    // Update combo UI immediately (optimistic)
    setComboCount((c) => c + 1);
    setComboProgress(100);
    setShowComboCircle(true);
    resetComboTimer();

    setSending(true);
    try {
      await sendBatch({
        roomId,
        toUserIds: Array.from(selectedUserIds),
        giftId,
        quantity: selectedQuantity,
        tokenOverride: deviceId,
      });
    } catch (e: any) {
      const msg = typeof e?.data === "object" ? (e.data?.message || e?.message) : e?.message;
      alert(msg || "فشل الإرسال");
    } finally {
      setSending(false);
    }
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
          height: "45vh",
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

        {/* Recipient mode buttons */}
        <div className="flex gap-1 px-2 py-1 border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setRecipientMode("mic")}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition ${
              recipientMode === "mic" ? "bg-purple-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            <Mic size={11} />
            المايكات ({micMembers.length})
          </button>
          <button
            onClick={() => setRecipientMode("room")}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition ${
              recipientMode === "room" ? "bg-purple-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            <Users size={11} />
            الغرفة ({membersList.length})
          </button>
          <button
            onClick={() => setRecipientMode("individual")}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition ${
              recipientMode === "individual" ? "bg-purple-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            <Check size={11} />
            محدد ({selectedUserIds.size})
          </button>
        </div>

        {/* Recipients */}
        <div className="border-b border-white/10 py-1 flex-shrink-0">
          <div className="flex gap-1.5 px-2 overflow-x-auto thin-scroll">
            {membersList.length === 0 ? (
              <p className="text-white/40 text-[9px] py-0.5 px-2">لا يوجد أعضاء</p>
            ) : membersList.map((m) => {
              const isSelected = selectedUserIds.has(m.userId);
              return (
                <button
                  key={m._id}
                  onClick={() => toggleUser(m.userId)}
                  className={`flex-shrink-0 flex flex-col items-center gap-0.5 w-11 transition ${
                    isSelected ? "opacity-100" : "opacity-50"
                  }`}
                >
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white border-2 transition ${
                      isSelected ? "border-emerald-400" : "border-transparent"
                    }`}>
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        m.name?.[0] || "?"
                      )}
                    </div>
                    {m.isOnMic && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-purple-600 rounded-full border border-white flex items-center justify-center">
                        <Mic size={6} className="text-white" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-emerald-500 rounded-full border border-white flex items-center justify-center">
                        <Check size={7} className="text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-white text-[7px] truncate max-w-full">{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-row-reverse gap-1 px-2 py-1 border-b border-white/10 overflow-x-auto thin-scroll flex-shrink-0">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-2 py-0.5 rounded-md text-[10px] whitespace-nowrap transition relative ${
                category === c.key ? "text-white font-bold" : "text-white/60"
              }`}
            >
              {c.label}
              {category === c.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-400 rounded-full" />
              )}
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
              {filteredGifts.map((g) => {
                const isSelected = selectedGiftId === g._id;
                return (
                  <div key={g._id} className="relative flex flex-col">
                    {/* Gift card */}
                    <button
                      onClick={() => handleGiftTap(g._id)}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`relative rounded-md flex flex-col overflow-hidden transition active:scale-95 border-2 ${
                        isSelected ? "border-emerald-400 bg-purple-600/20" : "border-transparent bg-white/5 hover:bg-white/15"
                      }`}
                      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
                    >
                      <div className="w-full aspect-square overflow-hidden bg-black/20 relative">
                        {g.mediaUrl ? (
                          g.mediaType === "video" ? (
                            <video src={g.mediaUrl} className="w-full h-full object-cover pointer-events-none" preload="metadata" muted playsInline disablePictureInPicture controlsList="nodownload noplaybackrate" />
                          ) : (
                            <img src={g.mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><span className="text-base">🎁</span></div>
                        )}
                        <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 pointer-events-none">
                          {g.isRelationship && <div className="w-3 h-3 rounded-sm bg-pink-500/95 flex items-center justify-center"><Heart size={7} className="text-white fill-white" /></div>}
                          {g.isGlobal && <div className="w-3 h-3 rounded-sm bg-blue-500/95 flex items-center justify-center"><Globe size={7} className="text-white" /></div>}
                          {g.hasSound && <div className="w-3 h-3 rounded-sm bg-purple-500/95 flex items-center justify-center"><Music size={7} className="text-white" /></div>}
                        </div>
                        {isSelected && (
                          <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Check size={9} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="px-0.5 py-0.5 text-center leading-tight">
                        <p className="text-white text-[8px] truncate font-bold">{g.name}</p>
                        <p className="text-yellow-400 text-[8px] font-bold flex items-center justify-center gap-0.5">{g.price}<Coins size={6} /></p>
                      </div>
                    </button>

                    {/* Send button — improved design */}
                    {isSelected && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {/* Send button */}
                        <button
                          onClick={(e) => handleSendClick(e, g._id)}
                          disabled={sending || insufficient || selectedUserIds.size === 0}
                          className={`group relative w-full rounded-lg py-1.5 flex items-center justify-center gap-1 active:scale-95 transition-all duration-200 overflow-hidden shadow-lg ${
                            insufficient
                              ? "bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/30"
                              : "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-emerald-500/40"
                          } disabled:opacity-60`}
                        >
                          {sending ? (
                            <Loader2 className="animate-spin text-white" size={10} />
                          ) : insufficient ? (
                            <span className="text-white text-[9px] font-black">رصيد غير كافٍ</span>
                          ) : (
                            <>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
                                <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span className="text-white text-[9px] font-black">إرسال</span>
                            </>
                          )}
                        </button>

                        {/* Quantity badge */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowQtyMenu(true); }}
                          className="w-full bg-yellow-500/30 hover:bg-yellow-500/50 border border-yellow-400/50 rounded-lg py-0.5 flex items-center justify-center gap-1 active:scale-95 transition"
                        >
                          <ChevronUp size={9} className="text-yellow-300" />
                          <span className="text-yellow-300 text-[9px] font-black">×{selectedQuantity}</span>
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
          <div className="absolute bottom-2 left-2 z-[90] pointer-events-none">
            <div className="relative w-14 h-14">
              {/* Circular progress SVG */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="rgba(0,0,0,0.7)" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke="#fbbf24" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - comboProgress / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.05s linear" }}
                />
              </svg>
              {/* Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span key={comboCount} className="text-yellow-300 text-base font-black combo-pulse">
                  ×{comboCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Qty Selector Popup */}
        {showQtyMenu && (
          <>
            <div className="fixed inset-0 z-[85]" onClick={() => setShowQtyMenu(false)} />
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[90] bg-gray-900 rounded-2xl shadow-2xl border border-white/20 p-2 min-w-[140px]">
              <p className="text-white/50 text-[9px] text-center mb-1 font-bold">اختر عدد الإرسال</p>
              <div className="grid grid-cols-3 gap-1">
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
                    ×{q}
                  </button>
                ))}
              </div>
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

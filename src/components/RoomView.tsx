import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Mic, MicOff, LogOut, Loader2, Heart, Trophy,
  MessageCircle, Gift, Grid2x2, Share2, Minimize2, ArrowRight,
  Lock, Unlock, UserPlus, Move, X, Check,
} from "lucide-react";
import { agoraManager } from "../lib/agora";
import { getDeviceId } from "../lib/device";
import SettingsSheet from "./SettingsSheet";
import GiftSheet from "./GiftSheet";
import CompactChatInput from "./CompactChatInput";

interface Props { roomId: Id<"rooms">; onLeave: () => void; }

const LAYOUT_ROWS: Record<string, number[]> = {
  m1: [1],
  m2: [2],
  m3: [3],
  m5: [2, 3],
  m7: [1, 6],
  m12b: [6, 6],
  m18: [6, 6, 6],
  m24: [6, 6, 6, 6],
};

function bubbleClass(vip: number): string {
  if (vip <= 0) return "bg-white/5 border border-white/10";
  const g = [
    "bg-gradient-to-br from-sky-500/25 to-sky-700/25 border border-sky-400/40",
    "bg-gradient-to-br from-emerald-500/25 to-emerald-700/25 border border-emerald-400/40",
    "bg-gradient-to-br from-purple-500/25 to-purple-700/25 border border-purple-400/40",
    "bg-gradient-to-br from-pink-500/25 to-pink-700/25 border border-pink-400/40",
    "bg-gradient-to-br from-red-500/25 to-red-700/25 border border-red-400/40",
    "bg-gradient-to-br from-orange-500/25 to-orange-700/25 border border-orange-400/40",
    "bg-gradient-to-br from-yellow-500/30 to-yellow-700/30 border border-yellow-400/50",
  ];
  return g[Math.min(vip - 1, g.length - 1)];
}

export default function RoomView({ roomId, onLeave }: Props) {
  const deviceId = getDeviceId();
  const [lastGiftSeen, setLastGiftSeen] = useState(() => Date.now());
  const [activeGift, setActiveGift] = useState<any>(null);
  const [enteredAt] = useState(() => {
    const key = `entered_${roomId}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return Number(existing);
    const now = Date.now();
    sessionStorage.setItem(key, String(now));
    return now;
  });
  const room = useQuery(api.rooms.get, { roomId });
  const seats = useQuery(api.mics.state, { roomId });
  const members = useQuery(api.rooms.members, { roomId });
  const myInfo = useQuery(api.mics.myInfo, { roomId, tokenOverride: deviceId });
  const messages = useQuery(api.messages.list, { roomId });
  const listeners = useQuery(api.mics.listeners, { roomId });
  const myInvite = useQuery(api.mics.myInvite, { roomId, tokenOverride: deviceId });
  const latestGift = useQuery(api.gifts.latestGiftFull, { roomId, since: lastGiftSeen });

  const takeSeat = useMutation(api.mics.takeSeat);
  const leaveSeat = useMutation(api.mics.leaveSeat);
  const clearMySeats = useMutation(api.mics.clearMySeats);
  const toggleLock = useMutation(api.mics.toggleLock);
  const toggleMuteSeat = useMutation(api.mics.toggleMuteSeat);
  const inviteToSeat = useMutation(api.mics.inviteToSeat);
  const respondInvite = useMutation(api.mics.respondInvite);
  const sendMsg = useMutation(api.messages.send);
  const genUpload = useMutation(api.messages.generateUploadUrl);
  const getToken = useAction(api.voice.getToken);

  const [agoraConnected, setAgoraConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteCount, setRemoteCount] = useState(0);

  const [showBackMenu, setShowBackMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);

  const [openSeatMenu, setOpenSeatMenu] = useState<number | null>(null);
  const [inviteSeatIndex, setInviteSeatIndex] = useState<number | null>(null);

  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const joinedRef = useRef(false);
  const publishedRef = useRef(false);

  useEffect(() => {
    if (!room || joinedRef.current) return;
    joinedRef.current = true;
    (async () => {
      try {
        const tokenData = await getToken({ roomId, tokenOverride: deviceId });
        await agoraManager.join(tokenData.appId, roomId, tokenData.token, tokenData.account,
          () => setRemoteCount((c) => c + 1),
          () => setRemoteCount((c) => Math.max(0, c - 1)));
        setAgoraConnected(true);
      } catch (e: any) { setError(e?.message || "فشل الاتصال"); }
    })();
    return () => { agoraManager.leave(); joinedRef.current = false; publishedRef.current = false; };
  }, [room, roomId, getToken, deviceId]);

  const mySeat = seats?.find((s) => myInfo?.userId && s.userId === myInfo.userId);
  const isOnMic = !!mySeat;

  useEffect(() => {
    if (!agoraConnected) return;
    if (isOnMic && !publishedRef.current) {
      publishedRef.current = true;
      agoraManager.publishMicrophone().catch(() => setError("فشل الميكروفون"));
    } else if (!isOnMic && publishedRef.current) {
      publishedRef.current = false;
      agoraManager.unpublishMicrophone().catch(console.error);
    }
  }, [agoraConnected, isOnMic]);

  useEffect(() => {
    const h = () => { if (myInfo?.userId) clearMySeats({ roomId, tokenOverride: deviceId }).catch(() => {}); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [roomId, deviceId, myInfo, clearMySeats]);

  useEffect(() => {
    if (latestGift && latestGift._id !== activeGift?._id) {
      setActiveGift(latestGift);
      const timer = setTimeout(() => {
        setActiveGift(null);
        setLastGiftSeen(Date.now());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [latestGift]);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [messages?.length, showChatInput]);

  if (!room || !seats || !myInfo || members === undefined) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-white" size={40} /></div>;
  }

  const owner = members.find((m) => m.role === "owner");
  const topMembers = members.slice(0, 3);
  const isOnMicRole = myInfo?.role === "speaker" || myInfo?.role === "owner" || myInfo?.role === "moderator";
  const isOwnerOrMod = myInfo?.role === "owner" || myInfo?.role === "moderator";

  const roomAvatar = room.coverUrl || owner?.avatarUrl || null;

  const layout = room.micLayout || "m18";
  const layoutRows = LAYOUT_ROWS[layout] ?? LAYOUT_ROWS["m18"];
  const maxRowCount = Math.max(...layoutRows);
  const cellWidth = `calc((100% - ${(maxRowCount - 1) * 6}px) / ${maxRowCount})`;
  const gridHeight = Math.min(80 + layoutRows.length * 55, 340);

  const handleSeatClick = (seatIndex: number, userId: string | undefined) => {
    if (userId) setOpenSeatMenu(seatIndex);
    else takeSeat({ roomId, seatIndex, tokenOverride: deviceId }).catch((e: any) => alert(e?.message || "خطأ"));
  };

  const handleToggleMute = () => {
    const next = !isMuted; setIsMuted(next); agoraManager.muteMicrophone(next);
  };

  const handleLeave = async () => {
    sessionStorage.removeItem(`entered_${roomId}`);
    try { await clearMySeats({ roomId, tokenOverride: deviceId }); } catch {}
    await agoraManager.leave();
    publishedRef.current = false; joinedRef.current = false;
    onLeave();
  };

  const handleSendMsg = async (text: string) => {
    setSending(true);
    try { await sendMsg({ roomId, text, tokenOverride: deviceId }); }
    catch (e: any) { alert(e?.message || "خطأ"); }
    finally { setSending(false); }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await genUpload({ tokenOverride: deviceId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await sendMsg({ roomId, imageId: storageId, tokenOverride: deviceId });
    } catch (e: any) { alert(e?.message || "فشل رفع الصورة"); }
    finally { setUploading(false); }
  };

  const formatTime = (t: number) => {
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const currentSeatMenuData = openSeatMenu !== null ? seats.find((s) => s.seatIndex === openSeatMenu) : null;
  const isMySeat = currentSeatMenuData?.userId === myInfo.userId;

  return (
    <div
      className="flex flex-col overflow-hidden fixed inset-0 mx-auto"
      dir="rtl"
      style={{
        maxWidth: "28rem",
        backgroundImage: room.backgroundUrl ? `url(${room.backgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {room.backgroundUrl && <div className="absolute inset-0 bg-black/55 pointer-events-none" />}

      <div className="relative z-10 flex flex-col h-full min-h-0">
        {/* TOP BAR */}
        <header className="flex items-center justify-between gap-1 px-2 py-1.5 flex-shrink-0 bg-black/40 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button onClick={() => setShowBackMenu((v) => !v)} className="p-1.5 rounded-full hover:bg-white/10 flex-shrink-0 text-white">
              <ArrowRight size={16} />
            </button>

            <div className="flex items-center gap-1.5 bg-white/10 rounded-full pl-2 pr-1 py-0.5 min-w-0 flex-1">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {roomAvatar ? (
                  <img src={roomAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  (room.name?.[0] || "?")
                )}
              </div>
              <span className="text-[10px] font-bold text-white truncate flex-1">{room.name}</span>
              {owner && (
                <span className="text-[9px] font-bold text-white/90 bg-black/40 rounded-full px-1.5 py-0.5 flex-shrink-0" dir="ltr">
                  ID:{owner.userNumber ?? "—"}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <div className="flex -space-x-1.5">
              {topMembers.map((m) => (
                <div key={m._id} className="w-5 h-5 rounded-full border border-purple-900 overflow-hidden bg-purple-500 flex items-center justify-center text-[9px] font-bold text-white">
                  {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : (m.name?.[0] || "?")}
                </div>
              ))}
            </div>
            <span className="text-[9px] font-bold bg-white/10 text-white px-1.5 py-0.5 rounded-full">{members.length}</span>
            <button onClick={() => setIsFavorite(!isFavorite)} className="p-1 rounded-full hover:bg-white/10 text-white">
              <Heart size={14} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
            </button>
            <button className="p-1 rounded-full hover:bg-white/10 text-white"><Trophy size={14} /></button>
          </div>
        </header>

        {showBackMenu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowBackMenu(false)} />
            <div className="absolute top-10 right-2 z-30 bg-gray-900/95 backdrop-blur rounded-xl shadow-2xl border border-white/10 py-1 w-40">
              <button onClick={handleLeave} className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs"><LogOut size={14} /> مغادرة</button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs"><Minimize2 size={14} /> تصغير</button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs"><Share2 size={14} /> مشاركة</button>
            </div>
          </>
        )}

        <div className="text-center py-0.5 flex-shrink-0">
          {agoraConnected && <p className="text-[8px] text-green-300">متصل بالصوت ({remoteCount})</p>}
          {error && <p className="text-[8px] text-red-300">{error}</p>}
        </div>

        {/* MIC GRID */}
        <div className="mx-2 flex-shrink-0 relative" style={{ height: `${gridHeight}px` }}>
          <div className="flex flex-col gap-1.5 h-full">
            {layoutRows.map((count, rowIdx) => {
              const rowStart = layoutRows.slice(0, rowIdx).reduce((a, b) => a + b, 0);
              return (
                <div key={rowIdx} className="flex justify-center gap-1.5 flex-1">
                  {Array.from({ length: count }).map((_, i) => {
                    const seat = seats[rowStart + i];
                    if (!seat) return null;
                    const occupied = !!seat.userId;
                    return (
                      <div key={seat._id} className="flex flex-col items-center justify-start pt-0.5 min-w-0" style={{ width: cellWidth }}>
                        <div
                          onClick={() => handleSeatClick(seat.seatIndex, seat.userId)}
                          className={`relative w-full aspect-square rounded-full flex items-center justify-center text-white transition cursor-pointer overflow-hidden ${
                            occupied ? "ring-2 ring-purple-300" : seat.locked ? "bg-gray-700 ring-2 ring-gray-500" : "bg-white/5 ring-1 ring-white/20 hover:bg-white/15"
                          }`}
                        >
                          {occupied ? (
                            seat.avatarUrl ? (
                              <img src={seat.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-[10px] font-bold">{(seat.userName ?? "?")[0]}</span>
                            )
                          ) : seat.locked ? (
                            <Lock size={12} className="opacity-70" />
                          ) : (
                            <span className="text-[10px] font-bold text-white/60">{seat.seatIndex + 1}</span>
                          )}
                          {occupied && seat.muted && (
                            <div className="absolute bottom-0 left-0 bg-black/80 rounded-full p-0.5">
                              <MicOff size={8} className="text-white" />
                            </div>
                          )}
                        </div>
                        {occupied && (
                          <>
                            <p className="text-[8px] text-white/90 mt-1 truncate max-w-full leading-tight">{seat.userName}</p>
                            <p className="text-[8px] text-pink-300 leading-tight">{(seat.charms ?? 0)} ❤</p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {openSeatMenu !== null && currentSeatMenuData && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenSeatMenu(null)} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 rounded-xl shadow-2xl border border-white/20 py-1.5 w-52">
                <p className="text-white/60 text-[10px] px-3 py-1">المايك رقم {currentSeatMenuData.seatIndex + 1}</p>
                {isMySeat ? (
                  <>
                    <button onClick={() => { toggleMuteSeat({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: deviceId }); setOpenSeatMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs">
                      <MicOff size={14} /> {currentSeatMenuData.muted ? "إلغاء الكتم" : "كتم"}
                    </button>
                    <button onClick={() => { leaveSeat({ roomId, tokenOverride: deviceId }).then(() => agoraManager.unpublishMicrophone()); setOpenSeatMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-white/10 text-xs">
                      <LogOut size={14} /> انزل من المايك
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setInviteSeatIndex(currentSeatMenuData.seatIndex); setOpenSeatMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs">
                      <UserPlus size={14} /> دعوة شخص للجلوس
                    </button>
                    {isOwnerOrMod && (
                      <>
                        <button onClick={() => { toggleLock({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: deviceId }); setOpenSeatMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs">
                          {currentSeatMenuData.locked ? <Unlock size={14} /> : <Lock size={14} />} {currentSeatMenuData.locked ? "فتح المايك" : "قفل المايك"}
                        </button>
                        <button onClick={() => { toggleMuteSeat({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: deviceId }); setOpenSeatMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs">
                          <MicOff size={14} /> {currentSeatMenuData.muted ? "إلغاء كتمه" : "اكتمه"}
                        </button>
                      </>
                    )}
                    {!currentSeatMenuData.userId && isOwnerOrMod && (
                      <button onClick={() => { takeSeat({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: deviceId }); setOpenSeatMenu(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs">
                        <Move size={14} /> اجلس هنا
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* CHAT */}
        <div ref={chatBoxRef} className="thin-scroll flex-1 min-h-0 overflow-y-auto px-2 py-2 mx-2 mt-1 bg-black/30 backdrop-blur rounded-2xl">
          {messages === undefined ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-white/40" size={18} /></div>
          ) : messages.length === 0 ? (
            <p className="text-white/40 text-xs text-center py-6">{room.welcomeMessage || "لا توجد رسائل بعد"}</p>
          ) : (
            <div className="space-y-2">
              {messages.filter((m) => (m.createdAt ?? 0) >= enteredAt || m.system).map((m) => (
                <div key={m._id} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                    {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : (m.senderName?.[0] || "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-purple-300">{m.senderName}</span>
                      {m.senderNumber && <span className="text-[8px] text-white/40" dir="ltr">ID:{m.senderNumber}</span>}
                      <span className="text-[8px] text-white/40">{formatTime(m.createdAt)}</span>
                    </div>
                    {(m.text || m.imageUrl) && (
                      <div className={`w-fit max-w-[85%] mt-1 px-2.5 py-1.5 rounded-2xl rounded-tr-sm ${bubbleClass(m.senderVip ?? 0)}`}>
                        {m.text && <p className="text-white text-xs break-words whitespace-pre-wrap">{m.text}</p>}
                        {m.imageUrl && <img src={m.imageUrl} alt="" className="mt-1 rounded-lg max-w-[140px] max-h-[140px] object-cover" />}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showChatInput && (
          <div className="px-2 pt-1 flex-shrink-0">
            <CompactChatInput onSend={handleSendMsg} onImage={handleImageUpload} sending={sending} uploading={uploading} />
          </div>
        )}

        {/* BOTTOM BAR */}
        <footer className="border-t border-white/10 px-2 py-1.5 flex items-center justify-around flex-shrink-0 backdrop-blur-md bg-black/40">
          <button onClick={() => setShowChatInput((v) => !v)} className={`p-2 rounded-full text-white ${showChatInput ? "bg-purple-600" : "hover:bg-white/10"}`}>
            <MessageCircle size={20} />
          </button>
          <button onClick={handleToggleMute} disabled={!isOnMicRole} className={`p-2 rounded-full transition ${isMuted ? "bg-yellow-600" : "hover:bg-white/10"} text-white disabled:opacity-30`}>
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-white/10 text-white"><Grid2x2 size={20} /></button>
          <button onClick={() => setShowGifts(true)} className="p-2 rounded-full hover:bg-white/10 text-white"><Gift size={20} /></button>
        </footer>
      </div>

      {inviteSeatIndex !== null && listeners && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setInviteSeatIndex(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-gray-950 rounded-t-2xl max-h-[60vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-white font-bold text-sm">دعوة للمايك {inviteSeatIndex + 1}</h2>
              <button onClick={() => setInviteSeatIndex(null)} className="text-white/70"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {listeners.length === 0 ? (
                <p className="text-white/40 text-center py-8 text-sm">لا يوجد مستمعون</p>
              ) : listeners.map((l) => (
                <button key={l._id} onClick={() => { inviteToSeat({ roomId, toUserId: l.userId, seatIndex: inviteSeatIndex, tokenOverride: deviceId }); setInviteSeatIndex(null); }} className="w-full flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-sm font-bold text-white">
                    {l.avatarUrl ? <img src={l.avatarUrl} alt="" className="w-full h-full object-cover" /> : (l.name?.[0] || "?")}
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-white text-sm font-bold">{l.name}</p>
                    {l.userNumber && <p className="text-white/50 text-[10px]" dir="ltr">ID: {l.userNumber}</p>}
                  </div>
                  <UserPlus size={18} className="text-purple-300" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {myInvite && (
        <div className="fixed bottom-20 left-3 right-3 z-50 max-w-md mx-auto bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-3 shadow-2xl border border-white/20" dir="rtl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-white text-sm font-bold flex-1">{myInvite.fromName} يدعوك للمايك {myInvite.seatIndex + 1}</p>
            <div className="flex gap-2">
              <button onClick={() => respondInvite({ inviteId: myInvite._id, accept: true, tokenOverride: deviceId })} className="bg-white text-purple-800 p-2 rounded-full"><Check size={16} /></button>
              <button onClick={() => respondInvite({ inviteId: myInvite._id, accept: false, tokenOverride: deviceId })} className="bg-red-500 text-white p-2 rounded-full"><X size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {showGifts && (
        <GiftSheet roomId={roomId} onClose={() => setShowGifts(false)} />
      )}

      {/* Gift Animation Overlay — Full Screen */}
      {activeGift && (
        <div className="fixed inset-0 z-[60] flex flex-col pointer-events-none" dir="rtl">
          {/* Dark backdrop */}
          <div className="absolute inset-0 bg-black/80" />

          {/* TOP BANNER */}
          <div className="relative z-10 mx-3 mt-3 bg-gradient-to-r from-pink-600/90 via-purple-600/90 to-pink-600/90 rounded-2xl p-2 flex items-center gap-2 shadow-2xl border border-white/20 backdrop-blur">
            {/* Sender */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-500 ring-2 ring-white/40">
                {activeGift.fromAvatar ? (
                  <img src={activeGift.fromAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    {activeGift.fromName?.[0] || "?"}
                  </div>
                )}
              </div>
              <span className="text-white text-[11px] font-bold max-w-[70px] truncate">{activeGift.fromName}</span>
            </div>

            {/* Arrow */}
            <span className="text-white/80 text-lg flex-shrink-0">←</span>

            {/* Gift icon + name + quantity */}
            <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center flex-shrink-0">
                {activeGift.mediaType === "video" && activeGift.mediaUrl ? (
                  <video src={activeGift.mediaUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                ) : activeGift.mediaUrl ? (
                  <img src={activeGift.mediaUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>🎁</span>
                )}
              </div>
              <div className="flex flex-col items-center min-w-0">
                <span className="text-white text-[10px] font-bold truncate max-w-[80px]">{activeGift.giftName}</span>
                <span className="text-yellow-300 text-[10px] font-bold">×{activeGift.quantity}</span>
              </div>
            </div>

            {/* Arrow */}
            <span className="text-white/80 text-lg flex-shrink-0">→</span>

            {/* Receiver */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-white text-[11px] font-bold max-w-[70px] truncate">{activeGift.toName}</span>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-500 ring-2 ring-white/40">
                {activeGift.toAvatar ? (
                  <img src={activeGift.toAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    {activeGift.toName?.[0] || "?"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FULL-SCREEN MEDIA (video/image) */}
          <div className="flex-1 flex items-center justify-center p-3">
            {activeGift.mediaType === "video" && activeGift.mediaUrl ? (
              <video
                key={activeGift._id}
                src={activeGift.mediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full max-w-[95vw] max-h-[70vh] object-contain"
              />
            ) : activeGift.mediaUrl ? (
              <img
                src={activeGift.mediaUrl}
                alt=""
                className="w-full h-full max-w-[95vw] max-h-[70vh] object-contain"
              />
            ) : null}
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsSheet
          roomId={roomId}
          currentLayout={layout}
          isOwnerOrMod={isOwnerOrMod}
          currentName={room.name}
          currentWelcome={room.welcomeMessage ?? ""}
          currentCoverUrl={room.coverUrl ?? null}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

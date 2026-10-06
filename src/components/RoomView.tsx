import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Mic, MicOff, LogOut, Loader2, Heart, Trophy,
  MessageCircle, Gift, Grid2x2, Share2, Minimize2, ArrowRight,
  Send, Image as ImageIcon, Lock, Unlock, UserPlus, Move, X, Check,
} from "lucide-react";
import { agoraManager } from "../lib/agora";
import { getDeviceId } from "../lib/device";
import SettingsSheet from "./SettingsSheet";

interface Props {
  roomId: Id<"rooms">;
  onLeave: () => void;
}

export default function RoomView({ roomId, onLeave }: Props) {
  const deviceId = getDeviceId();
  const room = useQuery(api.rooms.get, { roomId });
  const seats = useQuery(api.mics.state, { roomId });
  const members = useQuery(api.rooms.members, { roomId });
  const myInfo = useQuery(api.mics.myInfo, { roomId, tokenOverride: deviceId });
  const messages = useQuery(api.messages.list, { roomId });
  const listeners = useQuery(api.mics.listeners, { roomId });
  const myInvite = useQuery(api.mics.myInvite, { roomId, tokenOverride: deviceId });

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

  const [chatText, setChatText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const joinedRef = useRef(false);
  const publishedRef = useRef(false);

  useEffect(() => {
    if (!room || joinedRef.current) return;
    joinedRef.current = true;
    (async () => {
      try {
        const tokenData = await getToken({ roomId, tokenOverride: deviceId });
        await agoraManager.join(
          tokenData.appId, roomId, tokenData.token, tokenData.account,
          () => setRemoteCount((c) => c + 1),
          () => setRemoteCount((c) => Math.max(0, c - 1)),
        );
        setAgoraConnected(true);
      } catch (e: any) {
        setError(e?.message || "فشل الاتصال بالصوت");
      }
    })();
    return () => {
      agoraManager.leave();
      joinedRef.current = false;
      publishedRef.current = false;
    };
  }, [room, roomId, getToken, deviceId]);

  const mySeat = seats?.find((s) => myInfo?.userId && s.userId === myInfo.userId);
  const isOnMic = !!mySeat;

  useEffect(() => {
    if (!agoraConnected) return;
    if (isOnMic && !publishedRef.current) {
      publishedRef.current = true;
      agoraManager.publishMicrophone().catch(() => setError("فشل تفعيل الميكروفون"));
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
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages?.length, showChatInput]);

  // Focus chat input when it opens
  useEffect(() => {
    if (showChatInput) setTimeout(() => chatInputRef.current?.focus(), 100);
  }, [showChatInput]);

  if (!room || !seats || !myInfo || members === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    );
  }

  const owner = members.find((m) => m.role === "owner");
  const topMembers = members.slice(0, 3);
  const isOnMicRole = myInfo?.role === "speaker" || myInfo?.role === "owner" || myInfo?.role === "moderator";
  const isOwnerOrMod = myInfo?.role === "owner" || myInfo?.role === "moderator";

  // Grid columns based on room layout (default 5)
  const layout = (room.micLayout as "4" | "5" | "6") || "5";
  const cols = parseInt(layout);
  const visibleSeats = layout === "6" ? seats.slice(0, 18) : seats;

  const handleSeatClick = (seatIndex: number, userId: string | undefined) => {
    if (userId === myInfo.userId) {
      setOpenSeatMenu(seatIndex);
    } else if (userId) {
      setOpenSeatMenu(seatIndex);
    } else {
      takeSeat({ roomId, seatIndex, tokenOverride: deviceId }).catch((e: any) => alert(e?.message || "خطأ"));
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    agoraManager.muteMicrophone(next);
  };

  const handleLeave = async () => {
    try { await clearMySeats({ roomId, tokenOverride: deviceId }); } catch {}
    await agoraManager.leave();
    publishedRef.current = false;
    joinedRef.current = false;
    onLeave();
  };

  const handleSendMsg = async () => {
    const clean = chatText.trim();
    if (!clean) return;
    setSending(true);
    try {
      await sendMsg({ roomId, text: clean, tokenOverride: deviceId });
      setChatText("");
      chatInputRef.current?.focus();
    } catch (e: any) { alert(e?.message || "خطأ"); }
    finally { setSending(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    <div className="max-w-md mx-auto flex flex-col h-screen relative" dir="rtl">
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-3 py-2 text-white border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBackMenu((v) => !v)} className="p-1.5 rounded-full hover:bg-white/10">
            <ArrowRight size={20} />
          </button>
          {owner && (
            <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-full">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-xs font-bold">
                {owner.avatarUrl ? <img src={owner.avatarUrl} alt="" className="w-full h-full object-cover" /> : (owner.name?.[0] || "?")}
              </div>
              <span className="text-[10px] font-bold" dir="ltr">ID: {owner.userNumber ?? "—"}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {topMembers.map((m) => (
              <div key={m._id} className="w-6 h-6 rounded-full border-2 border-purple-900 overflow-hidden bg-purple-500 flex items-center justify-center text-[10px] font-bold">
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : (m.name?.[0] || "?")}
              </div>
            ))}
          </div>
          <span className="text-xs font-bold bg-white/10 px-1.5 py-0.5 rounded-full">{members.length}</span>
          <button onClick={() => setIsFavorite(!isFavorite)} className="p-1.5 rounded-full hover:bg-white/10">
            <Heart size={18} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
          </button>
          <button className="p-1.5 rounded-full hover:bg-white/10"><Trophy size={18} /></button>
        </div>
      </header>

      {/* Back dropdown */}
      {showBackMenu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowBackMenu(false)} />
          <div className="absolute top-12 right-3 z-30 bg-gray-900/95 backdrop-blur rounded-xl shadow-2xl border border-white/10 py-1 w-44">
            <button onClick={handleLeave} className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-white/10 text-sm">
              <LogOut size={16} /> مغادرة الغرفة
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-white/10 text-sm">
              <Minimize2 size={16} /> تصغير
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-white/10 text-sm">
              <Share2 size={16} /> مشاركة
            </button>
          </div>
        </>
      )}

      {/* Room title */}
      <div className="text-center text-white py-1 flex-shrink-0">
        <h1 className="text-sm font-bold">{room.name}</h1>
        {agoraConnected && <p className="text-[9px] text-green-300">متصل ({remoteCount} بعيد)</p>}
        {error && <p className="text-[9px] text-red-300">{error}</p>}
      </div>

      {/* Mic grid */}
      <div className="bg-white/5 rounded-2xl p-2 mx-3 flex-shrink-0 relative">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {visibleSeats.map((seat) => (
            <div key={seat._id} className="relative">
              <div
                onClick={() => handleSeatClick(seat.seatIndex, seat.userId)}
                className={`aspect-square rounded-full flex flex-col items-center justify-center text-white border-2 transition cursor-pointer ${
                  seat.userId
                    ? "bg-purple-500 border-purple-300"
                    : seat.locked
                    ? "bg-gray-600 border-gray-400"
                    : "bg-white/10 border-white/30 hover:bg-white/20"
                }`}
              >
                {seat.userId ? (
                  <>
                    {seat.muted ? <MicOff size={12} /> : <Mic size={12} />}
                    <span className="text-[8px] mt-0.5 truncate max-w-full px-0.5">{seat.userName ?? "..."}</span>
                  </>
                ) : seat.locked ? (
                  <Lock size={12} className="opacity-60" />
                ) : (
                  <span className="text-base opacity-50">+</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Seat dropdown */}
        {openSeatMenu !== null && currentSeatMenuData && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenSeatMenu(null)} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 rounded-xl shadow-2xl border border-white/20 py-2 w-56">
              <p className="text-white/60 text-xs px-4 py-1">المايك رقم {currentSeatMenuData.seatIndex + 1}</p>
              {isMySeat ? (
                <>
                  <button
                    onClick={() => { toggleMuteSeat({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: deviceId }); setOpenSeatMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-white/10 text-sm"
                  >
                    <MicOff size={16} /> {currentSeatMenuData.muted ? "إلغاء الكتم" : "كتم"}
                  </button>
                  <button
                    onClick={() => { leaveSeat({ roomId, tokenOverride: deviceId }).then(() => agoraManager.unpublishMicrophone()); setOpenSeatMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-white/10 text-sm"
                  >
                    <LogOut size={16} /> انزل من المايك
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setInviteSeatIndex(currentSeatMenuData.seatIndex); setOpenSeatMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-white/10 text-sm"
                  >
                    <UserPlus size={16} /> دعوة شخص للجلوس
                  </button>
                  {isOwnerOrMod && (
                    <>
                      <button
                        onClick={() => { toggleLock({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: deviceId }); setOpenSeatMenu(null); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-white/10 text-sm"
                      >
                        {currentSeatMenuData.locked ? <Unlock size={16} /> : <Lock size={16} />}
                        {currentSeatMenuData.locked ? "فتح المايك" : "قفل المايك"}
                      </button>
                      <button
                        onClick={() => { toggleMuteSeat({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: deviceId }); setOpenSeatMenu(null); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-white/10 text-sm"
                      >
                        <MicOff size={16} /> {currentSeatMenuData.muted ? "إلغاء كتمه" : "اكتمه"}
                      </button>
                    </>
                  )}
                  {!currentSeatMenuData.userId && isOwnerOrMod && (
                    <button
                      onClick={() => { takeSeat({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: deviceId }); setOpenSeatMenu(null); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-white hover:bg-white/10 text-sm"
                    >
                      <Move size={16} /> اجلس هنا
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chat box */}
      <div
        ref={chatBoxRef}
        className="flex-1 overflow-y-auto px-3 py-2 mx-3 my-2 bg-white/5 rounded-2xl min-h-0"
      >
        {messages === undefined ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-white/40" size={20} /></div>
        ) : messages.length === 0 ? (
          <p className="text-white/40 text-xs text-center py-6">لا توجد رسائل بعد</p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
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
                  {m.text && <p className="text-white text-xs break-words mt-0.5">{m.text}</p>}
                  {m.imageUrl && <img src={m.imageUrl} alt="" className="mt-1 rounded-lg max-w-[140px] max-h-[140px] object-cover" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat input (only when showChatInput) */}
      {showChatInput && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-2 py-1.5">
            <label className="p-1.5 text-white/70 hover:text-white cursor-pointer">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
            </label>
            <input
              ref={chatInputRef}
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMsg()}
              onBlur={() => setTimeout(() => setShowChatInput(false), 150)}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40"
              maxLength={500}
            />
            <button onClick={handleSendMsg} disabled={sending || !chatText.trim()} className="p-1.5 bg-purple-600 rounded-full text-white disabled:opacity-40">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <footer className="border-t border-white/10 px-3 py-2 flex items-center justify-around flex-shrink-0">
        <button onClick={() => setShowChatInput(true)} className="p-2 rounded-full hover:bg-white/10 text-white">
          <MessageCircle size={22} />
        </button>
        <button
          onClick={handleToggleMute}
          disabled={!isOnMicRole}
          className={`p-2 rounded-full transition ${isMuted ? "bg-yellow-600" : "hover:bg-white/10"} text-white disabled:opacity-30`}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-white/10 text-white">
          <Grid2x2 size={22} />
        </button>
        <button onClick={() => setShowGifts(true)} className="p-2 rounded-full hover:bg-white/10 text-white">
          <Gift size={22} />
        </button>
      </footer>

      {/* Invite picker modal */}
      {inviteSeatIndex !== null && listeners && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setInviteSeatIndex(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-gray-950 rounded-t-2xl max-h-[60vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-white font-bold text-sm">دعوة للجلوس على المايك {inviteSeatIndex + 1}</h2>
              <button onClick={() => setInviteSeatIndex(null)} className="text-white/70"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {listeners.length === 0 ? (
                <p className="text-white/40 text-center py-8 text-sm">لا يوجد مستمعون حالياً</p>
              ) : (
                listeners.map((l) => (
                  <button
                    key={l._id}
                    onClick={() => {
                      inviteToSeat({ roomId, toUserId: l.userId, seatIndex: inviteSeatIndex, tokenOverride: deviceId });
                      setInviteSeatIndex(null);
                    }}
                    className="w-full flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-sm font-bold text-white">
                      {l.avatarUrl ? <img src={l.avatarUrl} alt="" className="w-full h-full object-cover" /> : (l.name?.[0] || "?")}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-white text-sm font-bold">{l.name}</p>
                      {l.userNumber && <p className="text-white/50 text-[10px]" dir="ltr">ID: {l.userNumber}</p>}
                    </div>
                    <UserPlus size={18} className="text-purple-300" />
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Invite banner */}
      {myInvite && (
        <div className="fixed bottom-20 left-3 right-3 z-50 max-w-md mx-auto bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-3 shadow-2xl border border-white/20" dir="rtl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-white text-sm font-bold flex-1">
              {myInvite.fromName} يدعوك للمايك {myInvite.seatIndex + 1}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => respondInvite({ inviteId: myInvite._id, accept: true, tokenOverride: deviceId })}
                className="bg-white text-purple-800 p-2 rounded-full"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => respondInvite({ inviteId: myInvite._id, accept: false, tokenOverride: deviceId })}
                className="bg-red-500 text-white p-2 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Sheet */}
      {showSettings && (
        <SettingsSheet
          roomId={roomId}
          currentLayout={layout}
          isOwnerOrMod={isOwnerOrMod}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

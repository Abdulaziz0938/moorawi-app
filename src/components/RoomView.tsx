import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Mic, MicOff, LogOut, Loader2, Heart, Trophy,
  MessageCircle, Gift, Grid2x2, Share2, Minimize2, ArrowRight,
  Send, Image as ImageIcon,
} from "lucide-react";
import { agoraManager } from "../lib/agora";
import { getDeviceId } from "../lib/device";

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
  const takeSeat = useMutation(api.mics.takeSeat);
  const leaveSeat = useMutation(api.mics.leaveSeat);
  const clearMySeats = useMutation(api.mics.clearMySeats);
  const sendMsg = useMutation(api.messages.send);
  const genUpload = useMutation(api.messages.generateUploadUrl);
  const getToken = useAction(api.voice.getToken);

  const [agoraConnected, setAgoraConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteCount, setRemoteCount] = useState(0);

  // UI state
  const [showBackMenu, setShowBackMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGifts, setShowGifts] = useState(false);

  // Chat state
  const [chatText, setChatText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  if (!room || !seats || myInfo === undefined || members === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    );
  }

  const owner = members.find((m) => m.role === "owner");
  const topMembers = members.slice(0, 3);

  const handleSeatClick = async (seatIndex: number, userId: string | undefined) => {
    if (userId) return;
    try { await takeSeat({ roomId, seatIndex, tokenOverride: deviceId }); }
    catch (e: any) { alert(e?.message || "خطأ"); }
  };

  const handleLeaveSeat = async () => {
    try {
      await leaveSeat({ roomId, tokenOverride: deviceId });
      await agoraManager.unpublishMicrophone();
      publishedRef.current = false;
    } catch (e: any) { alert(e?.message || "خطأ"); }
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
    } catch (e: any) {
      alert(e?.message || "خطأ");
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await genUpload({ tokenOverride: deviceId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await sendMsg({ roomId, imageId: storageId, tokenOverride: deviceId });
    } catch (e: any) {
      alert(e?.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (t: number) => {
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const isOnMicRole = myInfo?.role === "speaker" || myInfo?.role === "owner" || myInfo?.role === "moderator";

  return (
    <div className="max-w-md mx-auto flex flex-col h-screen relative" dir="rtl">
      {/* TOP BAR */}
      <header className="flex items-center justify-between px-3 py-2 text-white border-b border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBackMenu((v) => !v)}
            className="p-1.5 rounded-full hover:bg-white/10 transition"
          >
            <ArrowRight size={20} />
          </button>
          {owner && (
            <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-full">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-xs font-bold">
                {owner.avatarUrl
                  ? <img src={owner.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : (owner.name?.[0] || "?")}
              </div>
              <span className="text-[10px] font-bold" dir="ltr">ID: {owner.userNumber ?? "—"}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {topMembers.map((m) => (
              <div key={m._id} className="w-6 h-6 rounded-full border-2 border-purple-900 overflow-hidden bg-purple-500 flex items-center justify-center text-[10px] font-bold">
                {m.avatarUrl
                  ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : (m.name?.[0] || "?")}
              </div>
            ))}
          </div>
          <span className="text-xs font-bold bg-white/10 px-1.5 py-0.5 rounded-full">
            {members.length}
          </span>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="p-1.5 rounded-full hover:bg-white/10 transition"
          >
            <Heart size={18} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
          </button>
          <button className="p-1.5 rounded-full hover:bg-white/10 transition">
            <Trophy size={18} />
          </button>
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

      {/* MAIN scrollable: title + mics + chat */}
      <main className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Room title */}
        <div className="text-center text-white">
          <h1 className="text-lg font-bold">{room.name}</h1>
          {agoraConnected && (
            <p className="text-[10px] text-green-300">متصل بالصوت ({remoteCount} بعيد)</p>
          )}
          {error && <p className="text-[10px] text-red-300">{error}</p>}
        </div>

        {/* Mic grid */}
        <div className="bg-white/5 rounded-2xl p-3">
          <div className="grid grid-cols-4 gap-2.5">
            {seats.map((seat) => (
              <div
                key={seat._id}
                onClick={() => handleSeatClick(seat.seatIndex, seat.userId)}
                className={`aspect-square rounded-full flex flex-col items-center justify-center text-white border-2 transition cursor-pointer ${
                  seat.userId ? "bg-purple-500 border-purple-300" : "bg-white/10 border-white/30 hover:bg-white/20"
                }`}
              >
                {seat.userId ? (
                  <>
                    <Mic size={16} />
                    <span className="text-[9px] mt-0.5 truncate max-w-full px-1">
                      {seat.userName ?? "..."}
                    </span>
                  </>
                ) : (
                  <span className="text-xl opacity-50">+</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat messages inline */}
        <div className="bg-white/5 rounded-2xl p-3 min-h-[180px]">
          <h2 className="text-white/60 text-xs mb-2 text-center">الدردشة</h2>
          {messages === undefined ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-white/40" size={20} />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-white/40 text-xs text-center py-6">لا توجد رسائل بعد. ابدأ الحديث!</p>
          ) : (
            <div className="space-y-2.5">
              {messages.map((m) => (
                <div key={m._id} className="flex gap-2 items-start">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {m.avatarUrl
                      ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : (m.senderName?.[0] || "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-purple-300">{m.senderName}</span>
                      {m.senderNumber && (
                        <span className="text-[9px] text-white/40" dir="ltr">ID:{m.senderNumber}</span>
                      )}
                      <span className="text-[9px] text-white/40">{formatTime(m.createdAt)}</span>
                    </div>
                    {m.text && (
                      <p className="text-white text-sm break-words mt-0.5">{m.text}</p>
                    )}
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="mt-1 rounded-lg max-w-[180px] max-h-[180px] object-cover"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Chat input (fixed above mic controls) */}
      <div className="px-3 py-2 border-t border-white/10">
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-2 py-1.5">
          <label className="p-1.5 text-white/70 hover:text-white cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
          </label>
          <input
            type="text"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMsg()}
            placeholder="اكتب رسالة..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40"
            maxLength={500}
          />
          <button
            onClick={handleSendMsg}
            disabled={sending || !chatText.trim()}
            className="p-1.5 bg-purple-600 rounded-full text-white disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* On mic controls */}
      {isOnMicRole && (
        <div className="px-3 pb-2 flex gap-2">
          <button
            onClick={handleToggleMute}
            className={`flex-1 py-2 rounded-xl text-sm font-bold text-white transition ${isMuted ? "bg-yellow-600" : "bg-green-600"}`}
          >
            {isMuted ? <MicOff size={16} className="inline mr-1" /> : <Mic size={16} className="inline mr-1" />}
            {isMuted ? "إلغاء الكتم" : "كتم"}
          </button>
          <button
            onClick={handleLeaveSeat}
            className="flex-1 bg-red-500/80 py-2 rounded-xl text-sm font-bold text-white"
          >
            مغادرة المايك
          </button>
        </div>
      )}

      {/* BOTTOM BAR */}
      <footer className="border-t border-white/10 px-3 py-2 flex items-center justify-around">
        <button className="p-2 rounded-full hover:bg-white/10 text-white">
          <MessageCircle size={22} />
        </button>

        <button
          onClick={handleToggleMute}
          disabled={!isOnMicRole}
          className={`p-2 rounded-full transition ${isMuted ? "bg-yellow-600" : "hover:bg-white/10"} text-white disabled:opacity-30`}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full hover:bg-white/10 text-white"
        >
          <Grid2x2 size={22} />
        </button>

        <button
          onClick={() => setShowGifts(true)}
          className="p-2 rounded-full hover:bg-white/10 text-white"
        >
          <Gift size={22} />
        </button>
      </footer>
    </div>
  );
}

// [ezo-live] واجهة المشاهد — Agora audience + قلوب + تعليق
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getDeviceId } from "../../lib/device";
import { getActiveToken } from "../../lib/session";
import { agoraManager } from "../../lib/agora";
import { dialog } from "../../lib/dialog";
import VipAvatar from "../ui/VipAvatar";
import {
  X, Heart, Users, Send, Gift, Loader2, Share2, Eye,
} from "lucide-react";

interface Props {
  streamId: string;
  onLeave: () => void;
}

export default function LiveViewer({ streamId, onLeave }: Props) {
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;

  const stream = useQuery(api.live.getStream, {
    streamId: streamId as Id<"liveStreams">,
  });

  const me = useQuery(api.profiles.me, { tokenOverride: token });
  const endStream = useMutation(api.live.endStream);
  const isHost = !!me && !!stream && String(me._id) === String(stream.hostId);
  const comments = useQuery(api.live.listComments, {
    streamId: streamId as Id<"liveStreams">,
    limit: 5,
  });
  const getLiveToken = useAction(api.voice.getLiveToken);
  const joinAsViewer = useMutation(api.live.joinAsViewer);
  const leaveViewer = useMutation(api.live.leaveViewer);
  const sendLikes = useMutation(api.live.sendLikes);
  const sendComment = useMutation(api.live.sendComment);


  const videoRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; color: string }[]>([]);
  const [lastTap, setLastTap] = useState(0);

  // ═══ Join as audience — ينتظر stream ═══
  useEffect(() => {
    if (!stream?.channelName) return;
    let mounted = true;
    (async () => {
      try {
        const { appId, token: rtcToken, account } = await getLiveToken({
          streamId: streamId as Id<"liveStreams">,
          asHost: false,
          tokenOverride: token,
        });
        if (!mounted) return;
        await agoraManager.join(
          appId,
          stream.channelName,
          rtcToken,
          account,
          (user) => {
            // Remote user published video
            if (user.videoTrack && videoRef.current) {
              user.videoTrack.play(videoRef.current);
            }
          },
          () => {},
          { asHost: false }
        );
        if (mounted) setConnected(true);
        joinAsViewer({
          streamId: streamId as Id<"liveStreams">,
          tokenOverride: token,
        }).catch(() => {});
      } catch (e: any) {
        console.error("[live-viewer] join error:", e);
      }
    })();

    return () => {
      mounted = false;
      leaveViewer({
        streamId: streamId as Id<"liveStreams">,
        tokenOverride: token,
      }).catch(() => {});
      agoraManager.leave();
    };
  }, [streamId, stream?.channelName]);

  // ═══ Auto-scroll comments ═══
  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
    }
  }, [comments?.length]);

  // ═══ Double tap for hearts ═══
  const handleScreenTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap → send heart
      spawnHeart();
      sendLikes({
        streamId: streamId as Id<"liveStreams">,
        count: 1,
        tokenOverride: token,
      }).catch(() => {});
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  };

  const spawnHeart = () => {
    const colors = ["#ef4444", "#f97316", "#ec4899", "#a855f7", "#3b82f6"];
    const id = Date.now() + Math.random();
    const x = 20 + Math.random() * 60;
    const color = colors[Math.floor(Math.random() * colors.length)];
    setHearts((h) => [...h, { id, x, color }].slice(-20));
    setTimeout(() => {
      setHearts((h) => h.filter((x) => x.id !== id));
    }, 3000);
  };

  // ═══ Send comment ═══
  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendComment({
        streamId: streamId as Id<"liveStreams">,
        text,
        tokenOverride: token,
      });
      setCommentText("");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الإرسال");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    leaveViewer({
      streamId: streamId as Id<"liveStreams">,
      tokenOverride: token,
    }).catch(() => {});
    onLeave();
  };

  if (!stream) {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
        <Loader2 className="text-white/40 animate-spin" size={40} />
      </div>
    );
  }

  if (stream.status === "ended") {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center gap-4 text-white">
        <div className="text-5xl">👋</div>
        <div className="text-lg font-black">انتهى البث</div>
        <button
          onClick={handleClose}
          className="px-6 py-2.5 rounded-full bg-white/10 border border-white/20 text-sm font-black"
        >
          عودة
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black overflow-hidden" dir="rtl">
      {/* Video area — fullscreen */}
      <div
        ref={videoRef}
        onClick={handleScreenTap}
        className="absolute inset-0 bg-gradient-to-br from-purple-900/30 to-black flex items-center justify-center"
      >
        {!connected && (
          <div className="text-white/40 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin" size={40} />
            <div className="text-xs font-black">جاري الاتصال...</div>
          </div>
        )}
      </div>

      {/* ═══ TOP BAR — host info ═══ */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-5 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          {/* Close */}
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-white active:scale-95"
          >
            <X size={18} />
          </button>

          {/* End stream button — if I am the host */}
          {isHost && (
            <button
              onClick={async () => {
                try {
                  await endStream({ streamId: streamId as Id<"liveStreams">, tokenOverride: token });
                  agoraManager.leave();
                  onLeave();
                } catch (e: any) {
                  dialog.alert(e?.message || "فشل الإنهاء");
                }
              }}
              className="px-3 h-9 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center gap-1 active:scale-95 shadow-lg"
            >
              🔴 إنهاء البث
            </button>
          )}

          {/* Host card */}
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur rounded-full pl-1 pr-3 py-1 border border-white/15">
            <VipAvatar
              src={stream.hostAvatarUrl}
              name={stream.hostName}
              size={28}
              vip={stream.hostVipLevel}
              ring={stream.hostVipLevel === 0}
            />
            <div className="flex flex-col">
              <span className="text-white text-[11px] font-black">
                {stream.hostName}
              </span>
              <span className="text-white/60 text-[8px]">
                {stream.viewerCount.toLocaleString()} مشاهد
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* LIVE badge */}
          <div className="flex items-center gap-1 bg-red-500 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[10px] font-black">LIVE</span>
          </div>
        </div>
      </div>

      {/* ═══ Floating hearts ═══ */}
      <div className="absolute inset-x-0 bottom-24 h-40 pointer-events-none overflow-hidden z-20">
        {hearts.map((h) => (
          <div
            key={h.id}
            className="absolute animate-[heartFloat_3s_ease-out_forwards]"
            style={{ left: `${h.x}%`, bottom: 0, color: h.color }}
          >
            <Heart size={28} fill="currentColor" />
          </div>
        ))}
      </div>

      {/* ═══ COMMENTS — صف واحد ═══ */}
      <div
        ref={commentsRef}
        className="absolute bottom-24 left-3 right-24 z-20 max-h-[35dvh] overflow-hidden flex flex-col gap-1"
      >
        {(comments ?? []).slice(-5).map((c: any) => (
          <div
            key={c._id}
            className="flex items-center gap-2 bg-black/60 backdrop-blur rounded-full px-3 py-1.5 border border-white/10 max-w-full"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-700 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black">
              {c.userAvatarUrl ? (
                <img src={c.userAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (c.userName?.[0] ?? "?").toUpperCase()
              )}
            </div>
            <span className="text-cyan-300 text-xs font-black flex-shrink-0 max-w-[80px] truncate">
              {c.userName}
            </span>
            <span className="text-white text-xs truncate">{c.text}</span>
          </div>
        ))}
      </div>

      {/* ═══ BOTTOM ACTIONS ═══ */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-3 pb-5 bg-gradient-to-t from-black/85 to-transparent">
        <div className="flex items-center gap-2">
          {/* Comment input */}
          <div className="flex-1 flex items-center gap-2 bg-black/60 backdrop-blur border border-white/20 rounded-full pl-3 pr-2 py-1.5">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
              placeholder="اكتب تعليقاً..."
              maxLength={200}
              className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-white/30"
            />
            <button
              onClick={handleSendComment}
              disabled={!commentText.trim() || sending}
              className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white disabled:opacity-40 active:scale-95"
            >
              {sending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
            </button>
          </div>

          {/* Like button */}
          <button
            onClick={spawnHeart}
            className="w-11 h-11 rounded-full bg-pink-500/90 flex items-center justify-center text-white active:scale-95"
          >
            <Heart size={20} fill="currentColor" />
          </button>

          {/* Gift */}
          <button
            onClick={() => dialog.alert("هدايا البث قريباً")}
            className="w-11 h-11 rounded-full bg-amber-500/90 flex items-center justify-center text-black active:scale-95"
          >
            <Gift size={20} />
          </button>
        </div>
      </div>

      {/* Gift value badge */}
      {stream.totalGiftValue > 0 && (
        <div className="absolute top-20 right-3 z-30 flex items-center gap-1 bg-amber-500/90 px-2 py-1 rounded-full">
          <Gift size={11} className="text-black" />
          <span className="text-black text-[10px] font-black tabular-nums">
            {stream.totalGiftValue.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

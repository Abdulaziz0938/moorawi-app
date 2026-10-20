// [ezo-live] واجهة المذيعة — Agora publish + overlay
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getDeviceId } from "../../lib/device";
import { getActiveToken } from "../../lib/session";
import { agoraManager } from "../../lib/agora";
import { dialog } from "../../lib/dialog";
import LiveGiftSheet from "./LiveGiftSheet";
import PKInviteSheet from "./PKInviteSheet";
import PKView from "./PKView";
import PKWinnerModal from "./PKWinnerModal";
import LiveGiftAnimation from "./LiveGiftAnimation";
import {
  X, Heart, Users, Send, Gift, Loader2, Video, VideoOff,
  Mic, MicOff, Swords, Camera, RotateCcw,
} from "lucide-react";

interface Props {
  streamId: string;
  onEnd: () => void;
  asCoHost?: boolean;
}

interface Comment {
  _id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  userVipLevel: number;
  text: string;
  createdAt: number;
}

export default function LiveBroadcaster({ streamId, onEnd, asCoHost = false }: Props) {
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;

  const stream = useQuery(api.live.getStream, {
    streamId: streamId as Id<"liveStreams">,
  });
  const comments = useQuery(api.live.listComments, {
    streamId: streamId as Id<"liveStreams">,
    limit: 100,
  });
  const getLiveToken = useAction(api.voice.getLiveToken);
  const endStream = useMutation(api.live.endStream);
  const sendLikes = useMutation(api.live.sendLikes);
  const endCoHost = useMutation(api.live.endCoHost);
  const startPKFromCoHost = useMutation(api.live.startPKFromCoHost);
  const endPK = useMutation(api.live.endPK);
  const me = useQuery(api.auth.me, { tokenOverride: token });
  const kickViewer = useMutation(api.live.kickViewer);

  const videoRef = useRef<HTMLDivElement>(null);
  const coHostVideoRef = useRef<HTMLDivElement>(null);
  const coHostUidRef = useRef<string | null>(null);
  const pkActiveRef = useRef<boolean>(false);
  const wasPkActiveRef = useRef<boolean>(false);
  const localRef = asCoHost ? coHostVideoRef : videoRef;
  const remoteRef = asCoHost ? videoRef : coHostVideoRef;
  const [agoraReady, setAgoraReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [frontCamera, setFrontCamera] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lastTapRef = useRef(0);
  const tapLockRef = useRef(false);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const [commentText, setCommentText] = useState("");
  const sendComment = useMutation(api.live.sendComment);
  const [showPKInvite, setShowPKInvite] = useState(false);
  const [pkWinnerData, setPkWinnerData] = useState<any>(null);
  const prevPKRef = useRef<boolean>(false);

  // إنهاء PK تلقائياً عند انتهاء الوقت
  useEffect(() => {
    if (!stream?.pkActive || !stream?.pkStartedAt || !stream?.pkDurationSec) return;
    const endTime = stream.pkStartedAt + (stream.pkDurationSec * 1000);
    const remaining = Math.max(0, endTime - Date.now());
    const timeout = setTimeout(() => {
      if (stream.pkActive) {
        endPK({ streamId: streamId as Id<"liveStreams">, tokenOverride: token }).catch(() => {});
      }
    }, remaining + 1000);
    return () => clearTimeout(timeout);
  }, [stream?.pkActive, stream?.pkStartedAt, stream?.pkDurationSec]);

  // كشف نهاية PK تلقائياً (من السيرفر أو من عدّاد الوقت)
  useEffect(() => {
    if (!stream) return;
    if (prevPKRef.current === true && stream.pkActive === false) {
      // PK انتهى
      if (stream.coHostId) {
        // نحتاج حفظ الـ scores قبل الإزالة — لكنها أُزيلت مع endPK
        // نستخدم محلياً
      }
    }
    prevPKRef.current = stream.pkActive;
  }, [stream?.pkActive]);

  useEffect(() => {
    const hasCoHost = !!stream?.coHostId;
    pkActiveRef.current = hasCoHost;
    if (!hasCoHost) {
      if (remoteRef.current) remoteRef.current.innerHTML = "";
      coHostUidRef.current = null;
      if (asCoHost) onEnd();
      return;
    }
    const t = setTimeout(() => {
      const remotes = agoraManager.getRemoteUsers();
      for (const u of remotes) {
        if (u.videoTrack && remoteRef.current) {
          u.videoTrack.play(remoteRef.current);
          coHostUidRef.current = String(u.uid);
          break;
        }
      }
    }, 150);
    return () => clearTimeout(t);
  }, [stream?.coHostId]);

  // ═══ Join Agora as host — ينتظر تحميل stream ═══
  useEffect(() => {
    if (!stream?.channelName) return; // انتظر تحميل stream
    let mounted = true;
    (async () => {
      try {
        const { appId, token: rtcToken, account } = await getLiveToken({
          streamId: streamId as Id<"liveStreams">,
          asHost: true,
          tokenOverride: token,
        });
        if (!mounted) return;
        await agoraManager.join(
          appId,
          stream.channelName,
          rtcToken,
          account,
          (user: any) => {
            if (!user?.videoTrack) return;
            if (!pkActiveRef.current) return;
            const uid = String(user.uid);
            if (coHostUidRef.current && coHostUidRef.current !== uid) return;
            const el = remoteRef.current;
            if (!el) return;
            user.videoTrack.play(el);
            coHostUidRef.current = uid;
          },
          (user: any, mediaType?: "audio" | "video" | "datachannel") => {
            if (coHostUidRef.current !== String(user.uid)) return;
            if (mediaType === "audio") return;
            if (remoteRef.current) remoteRef.current.innerHTML = "";
            coHostUidRef.current = null;
          },
          { asHost: true }
        );
        // Publish mic by default
        await agoraManager.publishMicrophone();
        if (asCoHost) {
          try {
            const track = await agoraManager.publishCamera("720p");
            if (track && localRef.current) {
              track.play(localRef.current, { mirror: true });
              if (mounted) setCameraOn(true);
            }
          } catch (e) {
            console.warn("[live] coHost auto-camera failed:", e);
          }
        }
        if (mounted) setAgoraReady(true);
      } catch (e: any) {
        console.error("[live] join error:", e);
        if (mounted) setError(e?.message || "فشل الاتصال بالبث");
      }
    })();
    return () => {
      mounted = false;
      agoraManager.leave();
    };
  }, [streamId, stream?.channelName]);

  // ═══ Toggle camera ═══
  const handleToggleCamera = async () => {
    try {
      const track = await agoraManager.toggleCamera(!cameraOn, "720p");
      if (track && localRef.current) {
        track.play(localRef.current, { mirror: frontCamera });
        setCameraOn(true);
      } else {
        setCameraOn(false);
      }
    } catch (e: any) {
      dialog.alert(e?.message || "فشل تشغيل الكاميرا");
    }
  };

  // ═══ Toggle mic ═══
  const handleToggleMic = () => {
    agoraManager.muteMicrophone(micOn);
    setMicOn(!micOn);
  };

  // ═══ Switch camera (front/back) ═══
  const handleSwitchCamera = async () => {
    if (!cameraOn) return;
    try {
      await agoraManager.unpublishCamera();
      const track = await agoraManager.publishCamera("720p");
      if (track && localRef.current) {
        track.play(localRef.current, { mirror: !frontCamera });
      }
      setFrontCamera(!frontCamera);
    } catch (e) {
      console.error(e);
    }
  };

  // ═══ End stream ═══
  const handleEnd = async () => {
    if (asCoHost) {
      dialog.confirm("مغادرة التحدي؟ ستعود إلى بثك الفردي.", async () => {
        await agoraManager.leave();
        try {
          await endCoHost({ streamId: streamId as Id<"liveStreams">, tokenOverride: token });
        } catch {}
        onEnd();
      });
      return;
    }
    dialog.confirm("إنهاء البث؟", async () => {
      try {
        await endStream({ streamId: streamId as Id<"liveStreams">, tokenOverride: token });
        await agoraManager.leave();
        onEnd();
      } catch (e: any) {
        dialog.alert(e?.message || "فشل الإنهاء");
      }
    }, "إنهاء", "إنهاء");
  };

  // ═══ بدء PK من جلوس عادي ═══
  const handleStartPKFromCasual = async () => {
    dialog.confirm(
      "بدء منافسة PK مع الضيفة؟",
      async () => {
        try {
          await startPKFromCoHost({
            streamId: streamId as Id<"liveStreams">,
            tokenOverride: token,
          });
        } catch (e: any) {
          dialog.alert(e?.message || "فشل بدء PK");
        }
      },
      "ابدأ",
      "ابدأ"
    );
  };

  // ═══ Double tap for like ═══
  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    try {
      await sendComment({
        streamId: streamId as Id<"liveStreams">,
        text: commentText.trim(),
        tokenOverride: token,
      });
      setCommentText("");
    } catch (e) {}
  };

  const handleScreenTap = (targetId?: string) => {
    if (tapLockRef.current) return; // قفل لمنع التكرار
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      tapLockRef.current = true;
      sendLikes({
        streamId: streamId as Id<"liveStreams">,
        count: 1,
        targetId: targetId ? (targetId as Id<"users">) : undefined,
        tokenOverride: token,
      }).catch(() => {});
      lastTapRef.current = 0;
      setTimeout(() => { tapLockRef.current = false; }, 500);
    } else {
      lastTapRef.current = now;
    }
  };

  if (!stream) {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
        <Loader2 className="text-white/40 animate-spin" size={40} />
      </div>
    );
  }

  const recentComments = (comments ?? []) as Comment[];
  
  // حساب الانقسام الديناميكي (TikTok Style)
  const hostScore = stream.hostScore ?? 0;
  const coHostScore = stream.coHostScore ?? 0;
  const totalScore = hostScore + coHostScore;
  let hostWidth = 50;
  if (stream.pkActive && totalScore > 0) {
    const diff = (hostScore - coHostScore) / totalScore;
    hostWidth = 50 + (diff * 20);
  }
  const coHostWidth = 100 - hostWidth;

  return (
    <div className="fixed inset-0 z-[300] bg-black overflow-hidden" dir="rtl">
      {/* ═══ VIDEO AREA (65%) ═══ */}
      <div className="absolute top-0 left-0 right-0 flex flex-row" style={{ height: "65%" }}>
        <div
          ref={videoRef}
          onClick={() => handleScreenTap(String(stream.hostId))}
          className={`relative bg-gradient-to-br from-purple-900/40 to-black flex items-center justify-center ${
            !stream.coHostId ? "flex-1" : "border-l border-white/20"
          }`}
          style={stream.coHostId ? { width: `${hostWidth}%`, transition: "width 500ms cubic-bezier(0.22, 1, 0.36, 1)" } : undefined}
        >
          {!cameraOn && (
            <div className="text-center text-white/40 flex flex-col items-center gap-3">
              {!agoraReady ? (
                <>
                  <Loader2 className="animate-spin text-white/40" size={48} />
                  <div className="text-xs font-black">جاري الاتصال بالسيرفر...</div>
                </>
              ) : (
                <>
                  <Video size={60} strokeWidth={1} />
                  <div className="text-xs font-black">الكاميرا مغلقة</div>
                  <button
                    onClick={handleToggleCamera}
                    className="mt-2 px-5 py-2.5 rounded-full bg-red-500 text-white text-xs font-black active:scale-95"
                  >
                    تشغيل الكاميرا
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div
          ref={coHostVideoRef}
          onClick={() => stream.coHostId && handleScreenTap(String(stream.coHostId))}
          className={`relative bg-gradient-to-br from-pink-900/40 to-black ${
            stream.coHostId ? "" : "hidden"
          }`}
          style={stream.coHostId ? { width: `${coHostWidth}%`, transition: "width 500ms cubic-bezier(0.22, 1, 0.36, 1)" } : undefined}
        >
          {stream.coHostId && (
            <div className="absolute top-20 left-2 z-20 bg-pink-500/90 px-2 py-0.5 rounded-full">
              <span className="text-white text-[9px] font-black">
                {stream.coHostName ?? "مذيعة"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ زر بدء PK أثناء جلوس عادي (للمضيف فقط) ═══ */}
      {!asCoHost && stream.coHostId && !stream.pkActive && (
        <button
          onClick={handleStartPKFromCasual}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 rounded-full text-white text-xs font-black shadow-2xl active:scale-95 flex items-center gap-1.5"
        >
          <Swords size={14} />
          ابدأ PK
        </button>
      )}

      {/* Error banner */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-40 bg-red-500/90 text-white text-xs p-3 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* ═══ TOP BAR ═══ */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-5 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent">
        {/* Close / End */}
        <button
          onClick={handleEnd}
          className="w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-white active:scale-95"
        >
          <X size={18} />
        </button>

        {/* LIVE + viewers */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-red-500 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[10px] font-black">LIVE</span>
          </div>
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur px-2 py-1 rounded-full border border-white/20">
            <Users size={11} className="text-white/80" />
            <span className="text-white text-[10px] font-black tabular-nums">
              {stream.viewerCount}
            </span>
          </div>
        </div>

        <div className="flex-1" />

        {/* PK invite button — يظهر فقط عندما لا يوجد PK نشط */}
        {!stream.pkActive && !stream.coHostId && !asCoHost && (
          <button
            onClick={() => setShowPKInvite(true)}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-amber-400/40 flex items-center justify-center text-amber-300 active:scale-95"
            title="منافسة PK"
          >
            <Swords size={16} />
          </button>
        )}

        {/* Switch camera */}
        {cameraOn && agoraReady && (
          <button
            onClick={handleSwitchCamera}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center text-white active:scale-95"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {/* ═══ Floating hearts (double-tap visual) ═══ */}
      <FloatingHearts likes={stream.totalLikes} />

      {/* ═══ CHAT AREA (35%) ═══ */}
      <div className="absolute left-0 right-0 bg-black flex flex-col" style={{ top: "65%", bottom: 0, zIndex: 20 }}>
      <div
        className="flex-1 overflow-y-auto px-3 py-2 thin-scroll flex flex-col gap-1 pointer-events-auto min-h-0"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {recentComments.map((c, idx) => {
          const total = recentComments.length;
          // آخر 5 = بتدرج، الأقدم = شفاف ثابت
          const fromEnd = total - 1 - idx;
          let opacity = 0.25;
          if (fromEnd === 0) opacity = 1;
          else if (fromEnd === 1) opacity = 0.9;
          else if (fromEnd === 2) opacity = 0.7;
          else if (fromEnd === 3) opacity = 0.5;
          else if (fromEnd === 4) opacity = 0.3;
          else opacity = 0.25;

          return (
            <div
              key={c._id}
              className="flex items-center gap-2 bg-black/60 backdrop-blur rounded-full px-3 py-1.5 border border-white/10 max-w-full self-start flex-shrink-0"
              style={{ opacity, transition: "opacity 300ms ease" }}
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
              <span className="text-white text-xs truncate flex-1 text-right" dir="rtl">
                {c.text}
              </span>
              {me && (String(me._id) === String(stream.hostId) || String(me._id) === String(stream.coHostId)) && String(c.userId) !== String(me._id) && (
                <button
                  onClick={() => kickViewer({ streamId: streamId as Id<"liveStreams">, userId: c.userId as Id<"users">, tokenOverride: token })}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="طرد"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ BOTTOM CONTROLS ═══ */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          {/* Comment input (Active) */}
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
              <Send size={12} />
            </button>
          </div>

          {/* Gift button */}
          <button
            onClick={() => setShowGiftSheet(true)}
            className="w-11 h-11 rounded-full bg-pink-500/90 flex items-center justify-center text-white active:scale-95"
          >
            <Gift size={20} />
          </button>

          {/* Mic */}
          <button
            onClick={handleToggleMic}
            disabled={!agoraReady}
            className={`w-11 h-11 rounded-full flex items-center justify-center text-white active:scale-95 disabled:opacity-40 ${
              micOn ? "bg-black/60 border border-white/20" : "bg-red-500"
            }`}
          >
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* Camera */}
          <button
            onClick={handleToggleCamera}
            disabled={!agoraReady}
            className={`w-11 h-11 rounded-full flex items-center justify-center text-white active:scale-95 disabled:opacity-40 ${
              cameraOn ? "bg-black/60 border border-white/20" : "bg-red-500"
            }`}
          >
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
        </div>
      </div>

      {/* ═══ PK Split Screen ═══ */}
      {stream.pkActive && stream.coHostId && (
        <PKView
          hostName={stream.hostName}
          hostAvatarUrl={stream.hostAvatarUrl}
          hostVipLevel={stream.hostVipLevel}
          hostScore={stream.hostScore}
          coHostName={stream.coHostName ?? "مذيعة"}
          coHostAvatarUrl={stream.coHostAvatarUrl}
          coHostVipLevel={stream.coHostVipLevel ?? 0}
          coHostScore={stream.coHostScore}
          pkStartedAt={stream.pkStartedAt ?? Date.now()}
          pkDurationSec={stream.pkDurationSec ?? 300}
        />
      )}

      </div>
      {/* ═══ Gift Animation ═══ */}
      <LiveGiftAnimation streamId={streamId} />

      {/* ═══ PK Winner Modal متزامن مع السيرفر ═══ */}
      {(stream?.pkResult && (Date.now() - (stream.pkResult.endedAt || 0) < 6500)) ? (
        <PKWinnerModal
          hostName={stream.pkResult.hostName}
          hostAvatarUrl={stream.pkResult.hostAvatarUrl}
          hostVipLevel={stream.pkResult.hostVipLevel}
          hostScore={stream.pkResult.hostScore}
          coHostName={stream.pkResult.coHostName}
          coHostAvatarUrl={stream.pkResult.coHostAvatarUrl}
          coHostVipLevel={stream.pkResult.coHostVipLevel}
          coHostScore={stream.pkResult.coHostScore}
          onClose={() => {}}
        />
      ) : pkWinnerData && (
        <PKWinnerModal
          {...pkWinnerData}
          onClose={() => setPkWinnerData(null)}
        />
      )}

      {/* ═══ PK Invite Sheet ═══ */}
      {showPKInvite && !stream.pkActive && (
        <PKInviteSheet
          streamId={streamId}
          onClose={() => setShowPKInvite(false)}
          onInviteSent={(name: string) => {
            setShowPKInvite(false);
            dialog.alert(`تم إرسال الدعوة إلى ${name}`);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Floating hearts overlay
// ═══════════════════════════════════════════════════════════
function FloatingHearts({ likes }: { likes: number }) {
  const [bubbles, setBubbles] = useState<{ id: number; x: number; color: string }[]>([]);
  const lastCountRef = useRef(likes);

  useEffect(() => {
    if (likes <= lastCountRef.current) {
      lastCountRef.current = likes;
      return;
    }
    const diff = Math.min(likes - lastCountRef.current, 5);
    lastCountRef.current = likes;

    const colors = ["#ef4444", "#f97316", "#ec4899", "#a855f7"];
    const newBubbles: { id: number; x: number; color: string }[] = [];
    for (let i = 0; i < diff; i++) {
      newBubbles.push({
        id: Date.now() + i + Math.random(),
        x: Math.random() * 60 + 20,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    setBubbles((b) => [...b, ...newBubbles].slice(-15));

    setTimeout(() => {
      setBubbles((b) => b.filter((x) => !newBubbles.find((n) => n.id === x.id)));
    }, 3000);
  }, [likes]);

  return (
    <div className="absolute inset-x-0 bottom-24 h-40 pointer-events-none overflow-hidden z-20">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute animate-[heartFloat_3s_ease-out_forwards]"
          style={{ left: `${b.x}%`, bottom: 0, color: b.color }}
        >
          <Heart size={28} fill="currentColor" />
        </div>
      ))}
    </div>
  );
}

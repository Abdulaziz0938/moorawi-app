import { useEffect, useMemo, useRef, useState } from "react";
import AssetVideo from "./ui/AssetVideo";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Mic, MicOff, LogOut, Loader2, Heart, Trophy, Bell, Crown, Shield, Home, User,
  MessageCircle, Gift, Grid2x2, Share2, Minimize2, Maximize2, ArrowRight, Music,
  Lock, Unlock, UserPlus, Move, X, Check,
} from "lucide-react";
import { agoraManager } from "../lib/agora";
import { getDeviceId } from "../lib/device";
import { getActiveToken } from "../lib/session";
import MemberEntryEffect from "./ui/MemberEntryEffect";
import { useAssets, useAssetsFull } from "../lib/assets";
import { uploadToCloudinary } from "../lib/cloudinary";
import { smartUpload } from "../lib/uploadAssets";
import SettingsSheet from "./SettingsSheet";
import RoomLockSheet from "./RoomLockSheet";
import GiftSheet from "./GiftSheet";
import MusicSheet from "./MusicSheet";
import MusicPlayer from "./MusicPlayer";
import CompactChatInput from "./CompactChatInput";
import ChatBubble from "./ChatBubble";
import IconOrImage from "./IconOrImage";
import VipAvatar from "./ui/VipAvatar";
import VipName from "./VipName";
import VipEntryOverlay from "./VipEntryOverlay";
import LeaderboardSheet from "./LeaderboardSheet";
import MiniProfileSheet from "./MiniProfileSheet";
import LuckyWheelSheet from "./LuckyWheelSheet";
import ChatThreadSheet from "./ChatThreadSheet";
import RoomInfoSheet from "./RoomInfoSheet";
import MicRequestsSheet from "./MicRequestsSheet";
import SystemNotifSheet from "./SystemNotifSheet";
import GiftWavesLayer, { type GiftWavesHandle } from "./GiftWavesLayer";
import RocketSheet from "./RocketSheet";
import RocketLaunchOverlay from "./RocketLaunchOverlay";
import { useRoomPresence } from "../lib/hooks/useRoomPresence";
import MembersSheet from "./MembersSheet";
import GamesSheet from "./GamesSheet";
import EmojiSheet from "./EmojiSheet";
import ActivitySheet from "./ActivitySheet";
import ProfilePage from "./ProfilePage";
import { UserName } from "./UserBadges";
import { dialog } from "../lib/dialog";

// [ezo-batch] Flying particle data for batch gifts
type FlyingTarget = {
  userId: string;
  targetX: number;
  targetY: number;
  spreadX: number;
  spreadY: number;
  isOnMic: boolean;
  seatIndex?: number;
  delay?: number;
};

// [ezo-batch] Limits to keep animation smooth on all devices
const MAX_MIC_PARTICLES = 24;
const MAX_LISTENER_PARTICLES = 8;
const MAX_TOTAL_PARTICLES = 80;
// [ezo-waterfall] Max stacked waves during combo (prevents runaway)
const MAX_STACKED_WAVES = 12;

// [ezo-waterfall] A single combo wave (part of the waterfall)
type StackedWave = {
  id: number;
  particles: FlyingTarget[];
  gift: any;
};

// [ezo-batch] Compute particle positions for batch gifts
function calculateTargetCoords(
  recipientIds: string[],
  seats: any[] | undefined,
  quantity: number = 1
): {
  particles: FlyingTarget[];
  aggregateBadge: { count: number; x: number; y: number } | null;
} {
  if (!recipientIds.length) return { particles: [], aggregateBadge: null };

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  const micTargets: { userId: string; seatIndex: number }[] = [];
  const listenerTargets: string[] = [];

  for (const id of recipientIds) {
    const seat = seats?.find((s: any) => s.userId === id);
    if (seat) micTargets.push({ userId: id, seatIndex: seat.seatIndex });
    else listenerTargets.push(id);
  }

  const visibleMicTargets = micTargets.slice(0, MAX_MIC_PARTICLES);
  const sampledListeners = listenerTargets
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, MAX_LISTENER_PARTICLES);

  // [ezo-waterfall] حساب عدد الجسيمات لكل مستلم (بسقف إجمالي 80)
  const visibleCount = visibleMicTargets.length + sampledListeners.length;
  const particlesPerRecipient = visibleCount > 0
    ? Math.max(1, Math.min(quantity, Math.floor(MAX_TOTAL_PARTICLES / visibleCount)))
    : 1;

  const particles: FlyingTarget[] = [];

  // 1) Mic targets — شلال من الجسيمات لكل مايك
  visibleMicTargets.forEach((t, idx) => {
    let targetX = 0;
    let targetY = 0;
    const el = document.querySelector(`[data-mic-seat="${t.seatIndex}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      targetX = r.left + r.width / 2 - cx;
      targetY = r.top + r.height / 2 - cy;
    }
    const angle = (idx / Math.max(1, visibleMicTargets.length)) * 2 * Math.PI;
    const spread = Math.min(40, 6 + visibleMicTargets.length * 2);

    for (let k = 0; k < particlesPerRecipient; k++) {
      particles.push({
        userId: `${t.userId}_k${k}`,
        targetX,
        targetY,
        spreadX: Math.cos(angle) * spread + (Math.random() - 0.5) * 10,
        spreadY: Math.sin(angle) * spread + (Math.random() - 0.5) * 10,
        isOnMic: true,
        seatIndex: t.seatIndex,
        delay: k * 90,
      });
    }
  });

  // 2) Listener targets — شلال صاعد للأعلى
  sampledListeners.forEach((id, idx) => {
    const angle = (idx / Math.max(1, sampledListeners.length)) * 2 * Math.PI;
    const spread = Math.min(40, 8 + sampledListeners.length * 3);

    for (let k = 0; k < particlesPerRecipient; k++) {
      particles.push({
        userId: `l_${id}_${idx}_k${k}`,
        targetX: (Math.random() - 0.5) * 120,
        targetY: -cy + 140,
        spreadX: Math.cos(angle) * spread + (Math.random() - 0.5) * 10,
        spreadY: Math.sin(angle) * spread + (Math.random() - 0.5) * 10,
        isOnMic: false,
        delay: k * 90,
      });
    }
  });

  const hiddenCount = listenerTargets.length - sampledListeners.length;
  const aggregateBadge = hiddenCount > 0
    ? { count: hiddenCount, x: 0, y: -cy + 100 }
    : null;

  return { particles, aggregateBadge };
}

interface Props { roomId: Id<"rooms">; onLeave: () => void; onMinimizeChange?: (v: boolean) => void; }

// [ezo] Chat bubble style
function bubbleClass(vip: number, customUrl?: string): string {
  if (customUrl) return ""; // إذا كان هناك صورة مخصصة، سنعرضها كخلفية ولن نستخدم الكلاسات الافتراضية
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

// [ezo-mention] يلوّن @name بلون ذهبي
function renderTextWithMentions(text: string | null | undefined) {
  if (!text) return null;
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-amber-300 font-black">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function RoomView({ roomId, onLeave, onMinimizeChange }: Props) {
  const recordRoomEntry = useMutation(api.visits.recordRoomEntry);
  useEffect(() => {
    if (roomId) {
      recordRoomEntry({ roomId, tokenOverride: getActiveToken() ?? getDeviceId() })
        .then(() => console.log("[visit] room recorded"))
        .catch((err) => console.error("[visit] error:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);
  const deviceId = getDeviceId();
  const assets = useAssets();
  const assetsFull = useAssetsFull();
  const me = useQuery(api.auth.me, { tokenOverride: getActiveToken() });
  const myEquipped = useQuery(api.shop.getEquippedAssets, { userId: me?._id as Id<"users"> });
  const customBubbleUrl = myEquipped?.chatBubble?.imageUrl;
  const room = useQuery(api.rooms.get, { roomId });
  const roomWeekly = useQuery(api.rooms.weeklyTotal, { roomId });
  const seats = useQuery(api.mics.state, { roomId });
  const members = useQuery(api.rooms.members, { roomId });
  const myInfo = useQuery(api.mics.myInfo, { roomId, tokenOverride: getActiveToken() ?? deviceId });
  // [ezo-notif-badge] نفس استعلام SystemNotifSheet — Convex dedupe تلقائي
  const _notifs = useQuery(api.notifications.listMine, { tokenOverride: getActiveToken() ?? deviceId });
  const unreadNotifs = (_notifs ?? []).filter((n: any) => !n.readAt).length;

  // [ezo-rocket-launch] كشف إطلاق جديد — عرض Overlay في RoomView
  const recentLaunch = useQuery(api.rockets.listRoomHistory, { roomId, limit: 1 });
  const rocketStates = useQuery(api.rockets.getState, { roomId });
  const activeRocket = rocketStates?.find((r: any) => !r.launched) ?? rocketStates?.[rocketStates.length - 1];
  const [launchAnimEvent, setLaunchAnimEvent] = useState<any>(null);
  const [openRewardsOnSheet, setOpenRewardsOnSheet] = useState(false);
  const seenLaunchesRef = useRef<Set<string>>(new Set());
  const launchInitRef = useRef(false);

  // [ezo-room-emoji] بث الإيموجي لكل من في الغرفة
  const activeEmojis = useQuery(api.roomEmojis.listActive, { roomId });
  const sendEmoji = useMutation(api.roomEmojis.sendEmoji);
  const emojiByUser: Record<string, { url: string; id: string }> = {};
  (activeEmojis ?? []).forEach((e: any) => {
    emojiByUser[String(e.userId)] = { url: e.emojiUrl, id: String(e._id) };
  });
  const msgSinceRef = useRef(Date.now());
  const messages = useQuery(api.messages.list, { roomId, since: msgSinceRef.current });
  const listeners = useQuery(api.mics.listeners, { roomId });
  const myInvite = useQuery(api.mics.myInvite, { roomId, tokenOverride: getActiveToken() ?? deviceId });

  const takeSeat = useMutation(api.mics.takeSeat);
  const leaveSeat = useMutation(api.mics.leaveSeat);
  const clearMySeats = useMutation(api.mics.clearMySeats);
  const toggleFollow = useMutation(api.follows.toggle);
  const openDM = useMutation(api.directMessages.openWith);
  const toggleLock = useMutation(api.mics.toggleLock);
  const toggleMuteSeat = useMutation(api.mics.toggleMuteSeat);
  const toggleAdminMute = useMutation(api.mics.toggleAdminMute);

  // [ezo-mute] sync initial state
  useEffect(() => {
    const mySeat = seats?.find((s: any) => myInfo?.userId && s.userId === myInfo.userId);
    if (mySeat) {
      setIsMuted(!!mySeat.muted);
      agoraManager.muteMicrophone(!!mySeat.muted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, myInfo?.userId]);
  const kickFromRoom = useMutation(api.mics.kickFromRoom);
  const toggleBanUser = useMutation(api.mics.toggleBanUser);
  const promoteToMod = useMutation(api.mics.promoteToMod);
  const demoteMod = useMutation(api.mics.demoteMod);
  const removeFromSeat = useMutation(api.mics.removeFromSeat);
  const inviteToSeat = useMutation(api.mics.inviteToSeat);
  const respondInvite = useMutation(api.mics.respondInvite);
  const sendMsg = useMutation(api.messages.send);
    const getToken = useAction(api.voice.getToken);

  const [enteredAt] = useState(() => {
    const key = `entered_${roomId}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return Number(existing);
    const now = Date.now();
    sessionStorage.setItem(key, String(now));
    return now;
  });

  const [agoraConnected, setAgoraConnected] = useState(false);

  // [ezo-presence] heartbeat + leave تلقائي
  const { leave: leavePresence } = useRoomPresence(roomId, deviceId);
  const [isMuted, setIsMuted] = useState(false);
  // sync from server (see useEffect below)
  const [error, setError] = useState<string | null>(null);
  const [remoteCount, setRemoteCount] = useState(0);

  const [showBackMenu, setShowBackMenu] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  useEffect(() => { onMinimizeChange?.(isMinimized); }, [isMinimized, onMinimizeChange]);
  const [shareToast, setShareToast] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSubSheet, setActiveSubSheet] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [miniProfileUserId, setMiniProfileUserId] = useState<string | null>(null);
  const [dmConversationId, setDmConversationId] = useState<string | null>(null);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [mySeatIndexForMiniProfile, setMySeatIndexForMiniProfile] = useState<number | null>(null);
  const [preSelectedGiftUserId, setPreSelectedGiftUserId] = useState<string | null>(null);
  const [fullProfileUserId, setFullProfileUserId] = useState<string | null>(null);
  const [fullProfileIsMe, setFullProfileIsMe] = useState(false);
  const [showMicRequests, setShowMicRequests] = useState(false);
  const [myRequestToast, setMyRequestToast] = useState<string | null>(null);

  // [ezo] mic requests queries
  const micRequestsList = useQuery(api.mics.listRequests, { roomId });
  const micRequestsCount = micRequestsList?.length ?? 0;
  const myMicRequest = useQuery(api.mics.myRequestStatus, { roomId, tokenOverride: getActiveToken() ?? deviceId });
  const requestMicMutation = useMutation(api.mics.requestMic);
  const cancelMyRequestMutation = useMutation(api.mics.cancelMyRequest);
  const [showGifts, setShowGifts] = useState(false);
  const [showMusicSheet, setShowMusicSheet] = useState(false);
  const [showGamesSheet, setShowGamesSheet] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [chatTab, setChatTab] = useState<"chat" | "system">("chat");
  // [ezo-unread] Red dot on chat button when new user messages arrive
  const [seenChatMsgId, setSeenChatMsgId] = useState<string | null>(() => {
    try { return localStorage.getItem(`ezo:chat:seen:${roomId}`); } catch { return null; }
  });
  const lastUserMsgId = (() => {
    if (!messages || messages.length === 0) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i] as any;
      if (!m.system) return String(m._id);
    }
    return null;
  })();
  const hasChatUnread = !!lastUserMsgId && lastUserMsgId !== seenChatMsgId && !showChatInput;
  const markChatSeen = () => {
    if (!lastUserMsgId) return;
    try { localStorage.setItem(`ezo:chat:seen:${roomId}`, lastUserMsgId); } catch {}
    setSeenChatMsgId(lastUserMsgId);
  };
  const [pendingMention, setPendingMention] = useState<{ name: string; ts: number } | null>(null);
  const [showEmojiSheet, setShowEmojiSheet] = useState(false);
  const [showNotifSheet, setShowNotifSheet] = useState(false);
  const [showRocketSheet, setShowRocketSheet] = useState(false);
  const [openSeatMenu, setOpenSeatMenu] = useState<number | null>(null);
  const [openSeatMenuPos, setOpenSeatMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [inviteSeatIndex, setInviteSeatIndex] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Gift queue + combo
  const [activeGift, setActiveGift] = useState<any>(null);
  const [videoReady, setVideoReady] = useState(false); // [ezo-gift-fix] ينتظر انتهاء طيران الهدية
  const [giftTarget, setGiftTarget] = useState<{x: number; y: number} | null>(null);
  const [giftQueue, setGiftQueue] = useState<any[]>([]);
  const [comboCount, setComboCount] = useState(1);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [comboValue, setComboValue] = useState(0);
  const [showComboPulse, setShowComboPulse] = useState(false);
  const [isGlobalBanner, setIsGlobalBanner] = useState(false);
  const lastGiftIdRef = useRef<string | null>(null);
  const comboTimeoutRef = useRef<any>(null);
  const targetCoordsRef = useRef<{x: number; y: number} | null>(null);
  const [comboOverlay, setComboOverlay] = useState<{gift: any; count: number; id: number} | null>(null);
  const comboOverlayTimerRef = useRef<any>(null);

  // [ezo-batch] Flying particles for batch gifts
  const [flyingTargets, setFlyingTargets] = useState<FlyingTarget[]>([]);
  const [aggregateBadge, setAggregateBadge] = useState<{ count: number; x: number; y: number } | null>(null);

  // [ezo-waterfall] Combo stacked waves (شلال)
  const [stackedWaves, setStackedWaves] = useState<StackedWave[]>([]);
  // [ezo-gifts-pro] imperative wave spawner ref — لا React re-render
  const wavesRef = useRef<GiftWavesHandle>(null);

  // [ezo-fix] Track latest userId for cleanup on unmount
  const myUserIdRef = useRef<Id<"users"> | undefined>(undefined);
  useEffect(() => { myUserIdRef.current = myInfo?.userId; }, [myInfo?.userId]);

  // [ezo-fix] Reset room-local state whenever roomId changes
  useEffect(() => {
    setActiveGift(null);
    setGiftQueue([]);
    setStackedWaves([]);
    setComboCount(1);
    setTotalQuantity(0);
    setComboValue(0);
    setIsGlobalBanner(false);
    setComboOverlay(null);
    targetCoordsRef.current = null;
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    if (comboOverlayTimerRef.current) clearTimeout(comboOverlayTimerRef.current);
  }, [roomId]);

  // [ezo-fix] Leave seat + release DB slot on unmount
  useEffect(() => {
    return () => {
      if (myUserIdRef.current) {
        clearMySeats({ roomId, tokenOverride: getActiveToken() ?? deviceId }).catch(() => {});
      }
    };
  }, [roomId, deviceId, clearMySeats]);

  const giftSinceRef = useRef(Date.now());
  const latestGift = useQuery(api.gifts.latestGiftFull, { roomId, since: giftSinceRef.current });

  // [ezo-vip] entry animation — فقط للأحداث بعد دخولي للغرفة
  const mountTimeRef = useRef<number>(Date.now());
  const entrySinceRef = useRef<number>(Date.now());
  const recentEntries = useQuery(
    api.presence.recentEntries,
    { roomId, since: entrySinceRef.current }
  );
  const [currentEntry, setCurrentEntry] = useState<any>(null);

  useEffect(() => {
    if (!recentEntries || recentEntries.length === 0) return;
    // أحدث حدث لم يُعرض بعد
    const latest = recentEntries[0];
    if (latest._id === currentEntry?._id) return;
    setCurrentEntry(latest);
  }, [recentEntries]);
  const globalBroadcast = useQuery(api.gifts.latestGlobalBroadcast, { since: giftSinceRef.current });
  const [activeGlobalBanner, setActiveGlobalBanner] = useState<any>(null);

  const chatBoxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const joinedRef = useRef(false);
  const [activeEntryUserId, setActiveEntryUserId] = useState<Id<"users"> | null>(null);
  const seenMembersRef = useRef<Set<string>>(new Set());
  const myEntryPlayedRef = useRef(false);
  const publishedRef = useRef(false);

  useEffect(() => {
    if (!room || joinedRef.current) return;
    joinedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const tokenData = await getToken({ roomId, tokenOverride: getActiveToken() ?? deviceId });
        if (cancelled) return;
        await agoraManager.join(tokenData.appId, roomId, tokenData.token, tokenData.account,
          () => setRemoteCount((c) => c + 1),
          () => setRemoteCount((c) => Math.max(0, c - 1)));
        if (cancelled) { agoraManager.leave(); return; }
        setAgoraConnected(true);
        setError(null);
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.message || "فشل الاتصال";
        if (msg.includes("OPERATION_ABORTED") || msg.includes("cancel token")) return;
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
      agoraManager.leave().catch(() => {});
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
      agoraManager.publishMicrophone().catch(() => setError("فشل الميكروفون"));
    } else if (!isOnMic && publishedRef.current) {
      publishedRef.current = false;
      agoraManager.unpublishMicrophone().catch(console.error);
    }
  }, [agoraConnected, isOnMic]);

  // [ezo] Auto-hide my request toast
  useEffect(() => {
    if (!myRequestToast) return;
    const t = setTimeout(() => setMyRequestToast(null), 3000);
    return () => clearTimeout(t);
  }, [myRequestToast]);

  // [ezo] Watch my request status change
  const lastReqStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const status = myMicRequest?.status ?? null;
    if (status && status !== lastReqStatusRef.current) {
      lastReqStatusRef.current = status;
      if (status === "accepted") {
        setMyRequestToast("✅ تم قبول طلب المايك");
        cancelMyRequestMutation({ roomId, tokenOverride: getActiveToken() ?? deviceId }).catch(() => {});
      } else if (status === "rejected") {
        setMyRequestToast("تم رفض طلب المايك");
        cancelMyRequestMutation({ roomId, tokenOverride: getActiveToken() ?? deviceId }).catch(() => {});
      }
    }
  }, [myMicRequest?.status, roomId, deviceId, cancelMyRequestMutation]);

  // Gift: combo detection
  useEffect(() => {
    if (!latestGift) return;
    const giftKey = `${latestGift.fromUserId}_${latestGift.giftId}`;
    if (activeGift && `${activeGift.fromUserId}_${activeGift.giftId}` === giftKey) {
      // [ezo-waterfall] احسب العدد الفعلي = مستقبلون × كمية
      const recipientIds: string[] = Array.isArray(latestGift.batchTargets) && latestGift.batchTargets.length > 0
        ? latestGift.batchTargets.map((t: any) => t.toUserId).filter(Boolean)
        : (latestGift.toUserId ? [latestGift.toUserId] : []);
      const qty = latestGift.quantity || 1;
      const totalAdd = recipientIds.length * qty;

      setComboCount((c) => c + totalAdd);
      setTotalQuantity((q) => q + totalAdd);
      setComboValue((v) => v + totalAdd * (latestGift.price ?? 0));
      setShowComboPulse(true);
      setTimeout(() => setShowComboPulse(false), 350);

      // أطلق موجة جديدة للشلال
      if (latestGift.mediaUrl && recipientIds.length > 0) { // [ezo-gift-fix] طيران لكل الهدايا بلا استثناء
        const waveId = Date.now() + Math.random();
        const { particles } = calculateTargetCoords(recipientIds, seats, qty);
        const waveGift = latestGift;

        // [ezo-pro] imperative spawn — لا re-render
        wavesRef.current?.spawn(waveGift, particles);
      }

      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = setTimeout(() => finishActiveGift(), 3000);
      lastGiftIdRef.current = latestGift._id;
      return;
    }
    if (lastGiftIdRef.current !== latestGift._id) {
      lastGiftIdRef.current = latestGift._id;
      setGiftQueue((q) => [...q, latestGift]);
    }
  }, [latestGift]);

  // [ezo-rocket-launch] كشف الإطلاق الجديد
  useEffect(() => {
    // انتظر حتى تصل أول استجابة فعلية من السيرفر
    if (recentLaunch === undefined) return;

    // أول استجابة — ضع التهيئة (حتى لو فارغة)
    if (!launchInitRef.current) {
      launchInitRef.current = true;
      // علّم كل الأحداث القديمة كـ "مُشاهدة"
      for (const evt of recentLaunch) {
        seenLaunchesRef.current.add(evt._id);
      }
      return;
    }

    // استجابة لاحقة — افحص الأحدث
    const latest = recentLaunch[0];
    if (latest && !seenLaunchesRef.current.has(latest._id)) {
      seenLaunchesRef.current.add(latest._id);
      setLaunchAnimEvent(latest);
    }
  }, [recentLaunch]);

  // [ezo-gift-fix] تأخير الفيديو حتى انتهاء طيران الهدية (~1.1s)
  useEffect(() => {
    if (!activeGift) { setVideoReady(false); return; }
    const isBigVideo =
      (activeGift.price ?? 0) >= 1000 && activeGift.mediaType === "video";
    if (!isBigVideo) { setVideoReady(true); return; }
    setVideoReady(false);
    const t = setTimeout(() => setVideoReady(true), 2400); // [ezo-gift] ينتظر انتهاء طيران الهدية (2.2s)
    return () => clearTimeout(t);
  }, [activeGift?._id]);

  // Global broadcast effect (≥ 30000 in any room)
  useEffect(() => {
    if (!globalBroadcast) return;
    if (globalBroadcast.roomId === roomId && activeGift) return;
    setActiveGlobalBanner(globalBroadcast);
    const timer = setTimeout(() => setActiveGlobalBanner(null), 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [globalBroadcast]);

  // Combo Overlay effect (new layer, doesn't affect anything)
  useEffect(() => {
    if (!activeGift || comboCount < 2) return;
    if ((activeGift.price ?? 0) >= 1000) return; // Only for Micro gifts

    setComboOverlay({ gift: activeGift, count: totalQuantity, id: Date.now() });
    if (comboOverlayTimerRef.current) clearTimeout(comboOverlayTimerRef.current);
    comboOverlayTimerRef.current = setTimeout(() => {
      setComboOverlay(null);
    }, 2600); // [ezo-combo-pro] يبقى 2.6s بعد آخر هدية
  }, [comboCount, activeGift]);

  // Gift: queue processor
  useEffect(() => {
    if (activeGift || giftQueue.length === 0) return;
    const next = giftQueue[0];
    setGiftQueue((q) => q.slice(1));

    // [ezo-batch] حساب كل الجسيمات بناءً على قائمة المستقبلين
    // batchTargets → هدية جماعية | toUserId → هدية فردية
    const recipientIds: string[] = Array.isArray(next.batchTargets) && next.batchTargets.length > 0
      ? next.batchTargets.map((t: any) => t.toUserId).filter(Boolean)
      : (next.toUserId ? [next.toUserId] : []);

    // ننتظر إطار واحد لضمان وجود عناصر data-mic-seat في DOM
    const qty = next.quantity || 1;
    requestAnimationFrame(() => {
      const { particles, aggregateBadge: badge } = calculateTargetCoords(recipientIds, seats, qty);
      setFlyingTargets(particles);
      setAggregateBadge(badge);
    });

    // نبضة المايك لاحقاً (بعد وصول الجسيمات)
    if (recipientIds.length > 0 && next.mediaType !== "video") {
      setTimeout(() => {
        recipientIds.forEach((uid: string) => {
          const seat = seats?.find((s: any) => s.userId === uid);
          if (!seat) return;
          const el = document.querySelector(`[data-mic-seat="${seat.seatIndex}"]`);
          if (!el) return;
          (el as HTMLElement).classList.add("mic-hit-anim");
          setTimeout(() => (el as HTMLElement).classList.remove("mic-hit-anim"), 700);
        });
      }, 1600);
    }

    setActiveGift(next);
    // [ezo-waterfall] العدّاد = عدد المستقبلين × الكمية
    const totalQtyInit = recipientIds.length * qty;
    setComboCount(totalQtyInit);
    setTotalQuantity(totalQtyInit);
    setComboValue(totalQtyInit * (next.price ?? 0));
    setIsGlobalBanner(next.isGlobal && (next.price ?? 0) >= 30000);

    // إخفاء الهدية — مددنا الوقت لأنيميشن multiGiftFly (2.2s)
    if (next.mediaType !== "video") {
      comboTimeoutRef.current = setTimeout(() => finishActiveGift(), 2400);
    } else {
      // مؤقت أمان للفيديو (12s) في حال فشل onEnded
      comboTimeoutRef.current = setTimeout(() => finishActiveGift(), 60000); // [ezo-gift-fix] fallback فقط — onEnded يُنهي عادةً
    }
  }, [giftQueue, activeGift, seats]);

  // (mic target position now handled via targetCoordsRef in queue processor)

    const finishActiveGift = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch (e) {}
    }
    setActiveGift(null);
    targetCoordsRef.current = null;
    setFlyingTargets([]);
    setAggregateBadge(null);
    setIsGlobalBanner(false);
    setComboCount(1);
    setTotalQuantity(0);
    setComboValue(0);
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
  };

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [messages?.length, showChatInput]);

  useEffect(() => {
    const onBackPress = () => setShowBackMenu(true);
    window.addEventListener("room-back-pressed", onBackPress);
    return () => window.removeEventListener("room-back-pressed", onBackPress);
  }, []);

  // [ezo-entry] تشغيل دخولية (مركبة) المستخدم نفسه عند تحميل بياناته
  useEffect(() => {
    if (!myInfo?.userId || myEntryPlayedRef.current) return;
    myEntryPlayedRef.current = true;
    
    // تأخير بسيط للتأكد من أن الغرفة ظهرت بالكامل
    const timer = setTimeout(() => {
      setActiveEntryUserId(myInfo.userId);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [myInfo?.userId]);

  useEffect(() => {
    if (!members) return;
    if (seenMembersRef.current.size === 0) {
      members.forEach((m: any) => seenMembersRef.current.add(String(m.userId)));
      // شغل تأثير دخول المستخدم نفسه (المركبة) فور دخوله للغرفة
      if (myInfo?.userId) {
        setActiveEntryUserId(myInfo.userId);
      }
      return;
    }
    const newMembers = members.filter((m: any) => !seenMembersRef.current.has(String(m.userId)));
    if (newMembers.length > 0) {
      newMembers.forEach((m: any) => seenMembersRef.current.add(String(m.userId)));
      // شغل تأثير الدخول لأول عضو جديد
      setActiveEntryUserId(newMembers[0].userId);
    }
  }, [members]);

  if (!room || !seats || !myInfo || members === undefined) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-white" size={40} /></div>;
  }

  const owner = members.find((m) => m.role === "owner");
  const topMembers = members.slice(0, 3);
  const isOnMicRole = myInfo?.role === "speaker" || myInfo?.role === "owner" || myInfo?.role === "moderator";
  const isOwnerOrMod = myInfo?.role === "owner" || myInfo?.role === "moderator";
  const roomAvatar = room.coverUrl || owner?.avatarUrl || null;

  const layout = room.micLayout || "m10";
  const LAYOUT_ROWS: Record<string, number[]> = {
    "m1":   [1],
    "m2":   [2],
    "m3":   [3],
    "m4":   [4],
    "m5":   [5],
    "m6":   [3, 3],
    "m7":   [3, 4],
    "m8":   [4, 4],
    "m9":   [1, 4, 4],
    "m10":  [5, 5],
    "m12":  [4, 4, 4],
    "m12b": [5, 5, 2],
    "m15":  [5, 5, 5],
    "m18":  [5, 5, 5, 3],
    "m20":  [5, 5, 5, 5],
    "m24":  [6, 6, 6, 6],
    "m30":  [5, 5, 5, 5, 5, 5],
  };
  const layoutRows = LAYOUT_ROWS[layout] ?? LAYOUT_ROWS["m10"];
  const maxRowCount = Math.max(...layoutRows);
  const baseMicSize = maxRowCount === 1 ? 84 : maxRowCount === 2 ? 72 : maxRowCount === 3 ? 64 : maxRowCount === 4 ? 60 : 56;
  const cellWidth = `min(calc((100% - ${(maxRowCount - 1) * 12}px) / ${maxRowCount}), ${baseMicSize + 8}px)`;
  const gridHeight = layoutRows.length * (baseMicSize + 36) + 16;

  const handleSeatClick = (seatIndex: number, userId: string | undefined) => {
    const seat = seats?.find((s) => s.seatIndex === seatIndex);
    const isMine = userId && myInfo?.userId && userId === myInfo.userId;

    // احسب موضع المايك أولاً (لكل الحالات)
    const seatEl = document.querySelector(`[data-mic-seat="${seatIndex}"]`) as HTMLElement | null;
    let menuPos: { x: number; y: number } | null = null;
    if (seatEl) {
      const r = seatEl.getBoundingClientRect();
      menuPos = { x: r.left + r.width / 2, y: r.bottom + 4 };
    }

    // 1) مايك فاضي (سواء مقفل أو لا)
    if (!userId) {
      // [ezo-fix] Owner/Mod: always show menu (even locked/empty)
      if (isOwnerOrMod) {
        setOpenSeatMenuPos(menuPos);
        setOpenSeatMenu(seatIndex);
        return;
      }
      if (seat?.locked) {
        dialog.alert("المايك مقفل");
        return;
      }
      if (room?.micRequestsEnabled) {
        requestMicMutation({ roomId, tokenOverride: getActiveToken() ?? deviceId })
          .then(() => setMyRequestToast("⏳ تم إرسال طلبك"))
          .catch((e: any) => dialog.alert(e?.message || "خطأ"));
      } else {
        takeSeat({ roomId, seatIndex, tokenOverride: getActiveToken() ?? deviceId }).catch((e: any) => dialog.alert(e?.message || "خطأ"));
      }
      return;
    }

    // 2) مايكي أنا → MiniProfile (isMySeat)
    if (isMine) {
      setMiniProfileUserId(userId!);
      setMySeatIndexForMiniProfile(seatIndex);
      return;
    }

    // 3) شخص آخر → Mini Profile
    setMiniProfileUserId(userId);
    setMySeatIndexForMiniProfile(null);
  };

  const handleToggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    agoraManager.muteMicrophone(next);
    // [ezo-mute] Sync server state (so others see mute icon on my seat)
    const mySeat = seats?.find((s: any) => myInfo?.userId && s.userId === myInfo.userId);
    if (mySeat) {
      try {
        await toggleMuteSeat({ roomId, seatIndex: mySeat.seatIndex, tokenOverride: getActiveToken() ?? deviceId });
      } catch (e: any) {
        // Rollback local state + Agora on server failure
        setIsMuted(!next);
        agoraManager.muteMicrophone(!next);
        dialog.alert(e?.message || "فشل الكتم");
      }
    }
  };

  const handleLeave = async () => {
    // [ezo-presence] إبلاغ الـ server بالخروج فوراً
    try { await leavePresence({ roomId, tokenOverride: getActiveToken() ?? deviceId }); } catch {}
    try { await clearMySeats({ roomId, tokenOverride: getActiveToken() ?? deviceId }); } catch {}
    await agoraManager.leave();
    publishedRef.current = false;
    joinedRef.current = false;
    onLeave();
  };

  const handleSendMsg = async (text: string) => {
    setSending(true);
    try { await sendMsg({ roomId, text, tokenOverride: getActiveToken() ?? deviceId }); }
    catch (e: any) { dialog.alert(e?.message || "خطأ"); }
    finally { setSending(false); }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await smartUpload(file, { allowVideo: false });
      await sendMsg({ roomId, imageUrl: result.url, tokenOverride: getActiveToken() ?? deviceId });
    } catch (e: any) { dialog.alert(e?.message || "فشل رفع الصورة"); }
    finally { setUploading(false); }
  };

  const formatTime = (t: number) => {
    const d = new Date(t);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const currentSeatMenuData = openSeatMenu !== null ? seats.find((s) => s.seatIndex === openSeatMenu) : null;
  const isMySeat = currentSeatMenuData?.userId === myInfo.userId;

  if (isMinimized) {
    return (
      <div className="fixed top-4 right-4 z-[300] rounded-full bg-gray-900/95 backdrop-blur border border-white/20 shadow-2xl px-3 py-2 flex items-center gap-3" dir="rtl">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-white text-xs font-black truncate max-w-[120px]">{room.name}</span>
        <button onClick={() => setIsMinimized(false)} className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white active:scale-90 transition">
          <Maximize2 size={14} />
        </button>
      </div>
    );
  }


  // [ezo-gift-waves] useMemo لعزل JSX الشلال — منع الوميض عند الإرسال السريع
  const wavesJsx = null; // [ezo-pro] replaced by <GiftWavesLayer ref={wavesRef} />

  return (
    <div className="flex flex-col overflow-hidden fixed inset-0 mx-auto z-[100] bg-[#0a0a0a]" dir="rtl"
      style={{ maxWidth: "28rem", backgroundImage: room.backgroundUrl ? `url(${room.backgroundUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
      {room.backgroundUrl && <div className="absolute inset-0 bg-black/55 pointer-events-none" />}

      <div className="relative z-10 flex flex-col h-full min-h-0">
        <header className="flex flex-col gap-1.5 px-2 py-2 flex-shrink-0 bg-black/40 backdrop-blur-md border-b border-white/10">

          {/* Row 1: Exit (right) | Favorite + Room Capsule (left) */}
          <div className="flex items-center justify-between gap-2">
            {/* Exit button (right in RTL) */}
            <button
              onClick={() => setShowBackMenu((v) => !v)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white flex-shrink-0 active:scale-90 transition"
            >
              <LogOut size={16} />
            </button>

            {/* Favorite + Room Capsule (left in RTL) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 active:scale-90 transition"
              >
                <Heart size={15} className={isFavorite ? "fill-red-500 text-red-500" : "text-white"} />
              </button>

              {/* Unified room capsule: room name + owner ID + avatar */}
              <div
                className="flex items-center gap-2 pl-1 pr-3 h-10 rounded-full flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(30,27,75,0.6) 0%, rgba(15,12,40,0.8) 100%)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <div className="flex flex-col items-end leading-tight">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-black text-white truncate max-w-[120px]">
                      {room.name}
                    </span>
                    <Home size={10} className="text-purple-300 flex-shrink-0" strokeWidth={1.5} />
                  </div>
                  <span className="text-[9px] text-white/50 font-bold" dir="ltr">
                    ID:{owner?.userNumber ?? "—"} • Lv.0
                  </span>
                </div>
                  <button
                    type="button"
                    onClick={() => setShowRoomInfo(true)}
                    className="w-8 h-8 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ring-2 ring-purple-400/40 hover:ring-purple-300 transition active:scale-95"
                    title={owner?.name || "الغرفة"}
                  >
                    <img src={owner?.avatarUrl || roomAvatar || "/avatar.png"} alt="" className="w-full h-full object-cover" />
                  </button>
              </div>
            </div>
          </div>

          {/* Row 2: Members + Avatars (right) | Leaderboard + Bell (left) */}
          <div className="flex items-center justify-between gap-2">
            {/* Members + Avatars (right side in RTL) */}
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={() => setShowMembers(true)}
                className="h-7 px-2 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1 flex-shrink-0 active:scale-95 transition"
              >
                <Grid2x2 size={12} className="text-white/80" />
                <span className="text-[10px] font-black text-white">{members.length}</span>
              </button>
              <div className="flex items-center -space-x-1.5">
                {topMembers.slice(0, 5).map((m) => (
                  <div key={m._id} className="w-6 h-6 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-[9px] font-bold text-white border-2 border-purple-900 flex-shrink-0">
                    {true ? <img src={m?.avatarUrl || "/avatar.png"} alt="" className="w-full h-full object-cover" /> : (m.name?.[0] || "?")}
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard + Bell (left side in RTL) */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isOwnerOrMod && room?.micRequestsEnabled && (
                <button
                  onClick={() => setShowMicRequests(true)}
                  className="relative w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white flex-shrink-0 active:scale-90 transition"
                >
                  <Bell size={13} />
                  {micRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[14px] h-[14px] flex items-center justify-center border border-white px-0.5">
                      {micRequestsCount > 9 ? "9+" : micRequestsCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowLeaderboard(true)}
                className="h-7 px-2.5 rounded-full bg-gradient-to-r from-amber-500/40 to-yellow-500/30 border border-amber-400/40 hover:opacity-90 flex items-center gap-1 flex-shrink-0 active:scale-95 transition"
              >
                <Trophy size={12} className="text-amber-300" />
                <span className="text-[10px] font-black text-white tabular-nums" dir="ltr">
                  {(() => {
                    const t = roomWeekly?.total ?? 0;
                    if (t >= 1_000_000) return (t / 1_000_000).toFixed(2) + "M";
                    if (t >= 1_000) return (t / 1_000).toFixed(1) + "K";
                    return t.toString();
                  })()}
                </span>
              </button>
            </div>
          </div>
        </header>

                {showBackMenu && (
          <div
            className="fixed inset-0 z-[350] bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowBackMenu(false)}
            dir="rtl"
          >
            <div
              className="w-full max-w-xs rounded-3xl bg-gradient-to-b from-slate-800 to-slate-950 border border-white/15 shadow-2xl p-5 flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mb-1">
                <LogOut size={26} className="text-amber-300" />
              </div>
              <h3 className="text-white font-black text-base text-center leading-tight">هل تريد مغادرة الغرفة؟</h3>
              <p className="text-white/50 text-[11px] text-center -mt-1">يمكنك تصغيرها والاستمرار بالاستماع</p>
              <button
                onClick={() => { setShowBackMenu(false); setIsMinimized(true); }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition mt-1"
              >
                <Minimize2 size={16} /> تصغير (الاستماع مستمر)
              </button>
              <button
                onClick={handleLeave}
                className="w-full py-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <LogOut size={16} /> مغادرة نهائية
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setShowBackMenu(false);
                  setShareToast(true);
                  setTimeout(() => setShareToast(false), 1800);
                }}
                className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Share2 size={14} /> مشاركة رابط الغرفة
              </button>
              <button
                onClick={() => setShowBackMenu(false)}
                className="mt-1 text-white/50 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="text-center py-0.5 flex-shrink-0">
          {agoraConnected && <p className="text-[8px] text-green-300">متصل بالصوت ({remoteCount})</p>}
          {error && <p className="text-[8px] text-red-300">{error}</p>}
        </div>

        <div className="mx-2 flex-shrink-0 relative" style={{ height: `${gridHeight}px`, overflow: "visible" }}>
          <div className="flex flex-col gap-1.5 h-full">
            {layoutRows.map((count, rowIdx) => {
              const rowStart = layoutRows.slice(0, rowIdx).reduce((a, b) => a + b, 0);
              return (
                <div key={rowIdx} className="flex justify-center gap-[18px] flex-1">
                  {Array.from({ length: count }).map((_, i) => {
                    const seat = seats[rowStart + i];
                    if (!seat) return null;
                    const occupied = !!seat.userId;
                    const isHeroSeat = count === 1;
                    const seatPx = isHeroSeat ? 78 : baseMicSize;
                    return (
                      <div key={seat._id} className="flex flex-col items-center justify-start pt-0.5 min-w-0" style={{ width: isHeroSeat ? '86px' : cellWidth }}>
                        <div data-mic-seat={seat.seatIndex}
                          onClick={() => handleSeatClick(seat.seatIndex, seat.userId)}
                          style={{ width: `${seatPx}px`, height: `${seatPx}px` }}
                          className="relative rounded-full mx-auto flex-shrink-0 cursor-pointer flex items-center justify-center bg-black/35 ring-1 ring-white/25 shadow-[inset_0_0_16px_rgba(255,255,255,0.08)]">
                          {occupied ? (
                            <>
                              {(() => {
                                const vipLvl = (seat as any)?.userVipFrameLevel ?? seat?.userVip ?? 0;
                                const vipF = vipLvl ? assetsFull[`vip.frame.${vipLvl}`] : null;
                                const shopF = (seat as any)?.userFrameData ?? null;
                                const activeF = (seat?.userFrameUrl && shopF) ? shopF : vipF;
                                const finalUrl = seat?.userFrameUrl || vipF?.url || (vipLvl ? assets[`vip.frame.${vipLvl}`] : null) || null;
                                return (
                                  <VipAvatar
                                    src={seat?.avatarUrl}
                                    name={seat?.userName ?? "?"}
                                    size={seatPx}
                                    vip={seat?.userVip ?? 0}
                                    ring={false}
                                    customFrameUrl={finalUrl}
                                    frameScale={activeF?.frameScale ?? 1.4}
                                    frameOffsetX={activeF?.frameOffsetX ?? 0}
                                    frameOffsetY={activeF?.frameOffsetY ?? 0}
                                    canvasSize={activeF?.canvasSize ?? null}
                                    holeSize={activeF?.holeSize ?? null}
                                    offsetX={activeF?.offsetX ?? 0}
                                    offsetY={activeF?.offsetY ?? 0}
                                    assetType={activeF?.assetType ?? null}
                                  />
                                );
                              })()}
                          {occupied && emojiByUser[String(seat.userId)] && (
                            <div
                              key={emojiByUser[String(seat.userId)].id}
                              className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center animate-emoji-burst"
                            >
                              <img
                                src={emojiByUser[String(seat.userId)].url}
                                alt=""
                                draggable={false}
                                className="w-14 h-14 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                              />
                            </div>
                          )}
                          </>
                          ) : (
                            <div className={`w-full h-full rounded-full flex items-center justify-center text-white overflow-hidden transition ${seat.locked ? "bg-gray-700 ring-2 ring-gray-500" : "bg-white/10 ring-1 ring-white/30 hover:bg-white/20 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]"}`}>
                              {seat.locked ? (
                                <Lock size={16} className="opacity-70" />
                              ) : (
                                <Mic size={24} className="text-white/70 drop-shadow-md" />
                              )}
                            </div>
                          )}
                          {(seat.adminMuted === true || (occupied && seat.muted)) && (
                            <div className={`absolute -bottom-1 -left-1 rounded-full p-1 ring-1 shadow-md z-40 ${seat.adminMuted ? "bg-red-600 ring-red-300/60" : "bg-black/90 ring-white/30"}`}>
                              <MicOff size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                        {!occupied && (
                          <div className="text-[10px] font-bold text-white/50 mt-1 tracking-wide font-sans">
                            No.{seat.seatIndex + 1}
                          </div>
                        )}
                        {occupied && (
                          <>
                            <div className="flex items-center justify-center gap-0.5 mt-1 max-w-full">
                              {seat.adminRole === "super" && (
                                <Home size={9} className="text-amber-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />
                              )}
                              {seat.adminRole === "moderator" && (
                                <Shield size={9} className="text-sky-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />
                              )}
                              {!seat.adminRole && (
                                <User size={9} className="text-emerald-400 flex-shrink-0" fill="currentColor" strokeWidth={1.5} />
                              )}
                              <VipName
                                level={seat.userVip ?? 0}
                                className="text-[8px] font-bold truncate leading-tight"
                              >
                                {seat.userName}
                              </VipName>
                            </div>
                            <p className="text-[8px] text-pink-300 leading-tight">{(seat.sessionCharms ?? 0)} <Heart size={8} className="inline text-pink-400" fill="currentColor" /></p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {openSeatMenu !== null && currentSeatMenuData && openSeatMenuPos && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setOpenSeatMenu(null); setOpenSeatMenuPos(null); }} />
              <div
                className="fixed z-50 rounded-2xl shadow-2xl overflow-hidden animate-[seatMenuPop_0.2s_cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  left: `${Math.max(8, Math.min(openSeatMenuPos.x - 110, window.innerWidth - 228))}px`,
                  top: `${openSeatMenuPos.y}px`,
                  width: "220px",
                  background: "linear-gradient(145deg, rgba(30,27,75,0.88) 0%, rgba(15,12,40,0.94) 100%)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                {/* Top glow line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
                <p className="text-white/60 text-[10px] px-3 py-1">المايك رقم {currentSeatMenuData.seatIndex + 1}</p>
                {isMySeat ? (
                  <>
                    <button
                      disabled={currentSeatMenuData.adminMuted === true}
                      onClick={() => { toggleMuteSeat({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: getActiveToken() ?? deviceId }).catch((e: any) => dialog.alert(e?.message || "خطأ")); setOpenSeatMenu(null); setOpenSeatMenuPos(null); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${currentSeatMenuData.adminMuted ? "text-red-400/60 cursor-not-allowed" : "text-white hover:bg-white/10"}`}
                    >
                      <MicOff size={14} />
                      {currentSeatMenuData.adminMuted
                        ? "مكتوم من الإدارة"
                        : currentSeatMenuData.muted ? "إلغاء الكتم" : "كتم"}
                    </button>
                    <button onClick={() => { leaveSeat({ roomId, tokenOverride: getActiveToken() ?? deviceId }).then(() => agoraManager.unpublishMicrophone()); setOpenSeatMenu(null); setOpenSeatMenuPos(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-white/10 text-xs">
                      <LogOut size={14} /> انزل من المايك
                    </button>
                  </>
                ) : (
                  <>
                    {/* دعوة شخص — متاح للجميع */}
                    <button onClick={() => { setInviteSeatIndex(currentSeatMenuData.seatIndex); setOpenSeatMenu(null); setOpenSeatMenuPos(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs">
                      <UserPlus size={14} /> دعوة شخص للجلوس
                    </button>
                    {isOwnerOrMod && (
                      <>
                        {/* فك/قفل المايك */}
                        <button onClick={() => { toggleLock({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: getActiveToken() ?? deviceId }); setOpenSeatMenu(null); setOpenSeatMenuPos(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs">
                          {currentSeatMenuData.locked ? <Unlock size={14} /> : <Lock size={14} />} {currentSeatMenuData.locked ? "فك القفل" : "قفل المايك"}
                        </button>
                        {/* [ezo] الكتم الإداري — يمنع المستخدم من إلغاء الكتم */}
                        <button onClick={() => { toggleAdminMute({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: getActiveToken() ?? deviceId }); setOpenSeatMenu(null); setOpenSeatMenuPos(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs">
                          <MicOff size={14} />
                          {currentSeatMenuData.adminMuted ? "إلغاء الكتم الإداري" : "كتم المايك (إداري)"}
                        </button>
                      </>
                    )}
                    {/* اجلس هنا — يفتح القفل تلقائياً إذا كان مقفل */}
                    {!currentSeatMenuData.userId && isOwnerOrMod && (
                      <button
                        onClick={async () => {
                          try {
                            if (currentSeatMenuData.locked) {
                              await toggleLock({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: getActiveToken() ?? deviceId });
                            }
                            await takeSeat({ roomId, seatIndex: currentSeatMenuData.seatIndex, tokenOverride: getActiveToken() ?? deviceId });
                          } catch (e: any) {
                            dialog.alert(e?.message || "خطأ");
                          }
                          setOpenSeatMenu(null);
                          setOpenSeatMenuPos(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 text-xs"
                      >
                        <Move size={14} /> اجلس هنا {currentSeatMenuData.locked && "(يفتح القفل)"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex-shrink-0 mx-3 mt-2 flex items-center justify-start gap-4 border-b border-white/5">
          <button
            onClick={() => setChatTab("system")}
            className="relative pb-1.5 text-xs font-black transition"
          >
            <span className={chatTab === "system" ? "text-white" : "text-white/50"}>النظام</span>
            {chatTab === "system" && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 rounded-full bg-emerald-400" />
            )}
          </button>
          <button
            onClick={() => setChatTab("chat")}
            className="relative pb-1.5 text-xs font-black transition"
          >
            <span className={chatTab === "chat" ? "text-white" : "text-white/50"}>الدردشة</span>
            {chatTab === "chat" && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        <div ref={chatBoxRef} className="thin-scroll flex-1 min-h-0 overflow-y-auto px-3 py-2 mx-1 mt-1 space-y-1.5">
          {messages === undefined ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-white/40" size={18} /></div>
          ) : messages.length === 0 ? (
            <p className="text-white/40 text-xs text-center py-6">{room.welcomeMessage || "لا توجد رسائل بعد"}</p>
          ) : (
            <div className="space-y-2">
              {messages
              .filter((m: any) => (m.createdAt ?? 0) >= enteredAt || m.system)
              .filter((m: any) => chatTab === "chat" ? !m.system : m.system)
              .map((m: any) => {
                // [ezo-chat] System messages (entry/announcement) — centered pill
                if (m.system || !m.senderId) {
                  const isAnnouncement = (m.text ?? "").includes("اعلان") || (m.text ?? "").includes("إعلان");
                  return (
                    <div key={m._id} className="flex justify-center py-0.5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md ${
                        isAnnouncement
                          ? "bg-amber-500/10 border-amber-400/30"
                          : "bg-white/5 border-white/10"
                      }`}>
                        {isAnnouncement && <span className="text-amber-200 text-[10px]">📢</span>}
                        <span className={`text-[10px] font-bold ${isAnnouncement ? "text-amber-200" : "text-white/60"}`}>
                          {renderTextWithMentions(m.text)}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Regular chat message
                return (
                  <div key={m._id} className="flex gap-2 items-start">
                    <button
                      onClick={() => {
                        setMiniProfileUserId(m.senderId);
                        setMySeatIndexForMiniProfile(null);
                      }}
                      className="flex-shrink-0 active:scale-95 transition"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                        <img src={m?.avatarUrl || "/avatar.png"} alt="" className="w-full h-full object-cover" />
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setMiniProfileUserId(m.senderId);
                            setMySeatIndexForMiniProfile(null);
                          }}
                          className="hover:opacity-80 transition active:scale-95"
                        >
                          <UserName
                            name={m.senderName}
                            vip={m.senderVip}
                            charmValue={m.senderCharmValue}
                            wealthValue={m.senderWealthValue}
                            adminRole={m.senderAdminRole}
                            roomRole={m.senderRoomRole}
                            size="sm"
                          />
                        </button>
                        <span className="text-[9px] text-white/30 mr-auto">{formatTime(m.createdAt)}</span>
                      </div>
                      {(m.text || m.imageUrl) && (
                        <div className="inline-block max-w-[85%] rounded-2xl rounded-tr-sm bg-white/5 border border-white/10 px-2.5 py-1.5">
                          {m.text && <p className="text-white text-xs break-words whitespace-pre-wrap leading-relaxed">{renderTextWithMentions(m.text)}</p>}
                          {m.imageUrl && <AssetVideo url={m.imageUrl} type="auto" className="mt-1 rounded-lg max-w-[160px] max-h-[160px] object-cover" />}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showChatInput && (
          <div className="px-2 pt-1 flex-shrink-0 relative z-[100]">
            <CompactChatInput onSend={handleSendMsg} onImage={handleImageUpload} sending={sending} uploading={uploading} pendingMention={pendingMention} />
          </div>
        )}

        <footer className="px-2 py-2 flex items-center justify-around flex-shrink-0">
          {/* 1. Chat — RIGHT in RTL (reversed) */}
          <button
            onClick={() => { const next = !showChatInput; setShowChatInput(next); if (next) markChatSeen(); }}
            className="relative w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition text-white/90"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 01-8 8H7l-4 3v-7a8 8 0 018-8h2a8 8 0 018 4z" />
            </svg>
            {hasChatUnread && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-black/50 animate-pulse" />
            )}
          </button>

          {/* 2. Mic (mic-only) */}
          {isOnMic && (
            <button
              onClick={handleToggleMute}
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition text-white relative"
            >
              <Mic size={22} />
              {isMuted && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="w-7 h-0.5 bg-red-500 rotate-45 rounded-full" />
                </span>
              )}
            </button>
          )}

          {/* 3. Emoji (mic-only) */}
          {isOnMic && (
            <button
              onClick={() => setShowEmojiSheet(true)}
              className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition text-white/90"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
          )}

          {/* 4. Apps / Settings (4-squares) */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition text-white/90"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="8" height="8" rx="2.5" />
              <rect x="13" y="3" width="8" height="8" rx="2.5" />
              <rect x="3" y="13" width="8" height="8" rx="2.5" />
              <rect x="13" y="13" width="8" height="8" rx="2.5" />
            </svg>
          </button>

          {/* 5. Mail */}
          <button
            onClick={() => setShowNotifSheet(true)}
            className="relative w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition text-white/90"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
            {unreadNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {unreadNotifs > 99 ? "99+" : unreadNotifs}
              </span>
            )}
          </button>

          {/* 6. Games */}
          <button
            onClick={() => setShowGamesSheet(true)}
            className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition text-amber-300"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 6h10c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4h-1.5l-1-2h-5l-1 2H7c-2.2 0-4-1.8-4-4v-4c0-2.2 1.8-4 4-4zm1 3v2H6v2h2v2h2v-2h2v-2h-2V9H8zm8 1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-2 1a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
          </button>

          {/* 7. Gift — LEFT in RTL (reversed) */}
          <button
            onClick={() => setShowGifts(true)}
            className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition"
          >
            <Gift size={22} className="text-pink-400" fill="currentColor" />
          </button>
        </footer>

        {/* [ezo-rocket] زر الصاروخ العائم */}
        {activeRocket && (
          <button
            onClick={() => setShowRocketSheet(true)}
            className="fixed bottom-20 left-2 z-[72] flex flex-col items-center active:scale-90 transition-transform"
            title="الصاروخ"
          >
            <img
              src={activeRocket.img}
              alt="rocket"
              className="w-16 h-22 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
            />
            <div className="w-14 h-[3px] bg-black/70 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${activeRocket.progress}%`,
                  background: `linear-gradient(90deg, ${activeRocket.color}, ${activeRocket.color}dd)`,
                  boxShadow: `0 0 6px ${activeRocket.color}`,
                }}
              />
            </div>
          </button>
        )}
      </div>

      {/* ==================== GLOBAL MARQUEE (≥ 30000) ==================== */}
      {activeGlobalBanner && !(isGlobalBanner && activeGift?.roomId === roomId) && (
        <div className="fixed top-2 left-0 right-0 z-[100] flex justify-center pointer-events-none animate-marquee-slide">
          <div className="max-w-[360px] w-[calc(100%-16px)] bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 p-[1.5px] rounded-full golden-glow">
            <div className="bg-black/90 backdrop-blur-xl rounded-full px-3 py-1.5 flex items-center justify-between text-white border border-yellow-300/40">
              <div className="flex items-center gap-1 min-w-0">
                <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-yellow-400 flex-shrink-0">
                  {activeGlobalBanner.fromAvatar ? (
                    <img src={activeGlobalBanner.fromAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">{activeGlobalBanner.fromName?.[0] || "?"}</div>
                  )}
                </div>
                <span className="text-[11px] font-black text-yellow-300 truncate max-w-[65px]">{activeGlobalBanner.fromName}</span>
              </div>
              <div className="flex flex-col items-center px-1">
                <span className="text-[9px] font-bold text-white/90 truncate">أهدى {activeGlobalBanner.giftName}</span>
                <span className="text-xs font-black text-yellow-400">×{activeGlobalBanner.quantity}</span>
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[11px] font-black text-yellow-300 truncate max-w-[65px]">{activeGlobalBanner.toName}</span>
                <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-yellow-400 flex-shrink-0">
                  {activeGlobalBanner.toAvatar ? (
                    <img src={activeGlobalBanner.toAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">{activeGlobalBanner.toName?.[0] || "?"}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeGift && (
        <>
          {/* ============ VIDEO FULLSCREEN (≥ 1000) ============ */}
          {(activeGift.price ?? 0) >= 1000 && activeGift.mediaType === "video" && activeGift.mediaUrl && videoReady && (
            <div className="fixed inset-0 z-[80] pointer-events-none flex items-center justify-center">
              <video
                ref={videoRef}
                key={activeGift._id}
                src={activeGift.mediaUrl}
                autoPlay
                playsInline
                preload="auto"
                className="w-full h-full object-contain pointer-events-none"
                style={{
                  maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
                  maskComposite: "intersect",
                  WebkitMaskComposite: "source-in",
                  mixBlendMode: "screen",
                }}
                onCanPlayThrough={() => {
                  if (videoRef.current) {
                    videoRef.current.volume = 1;
                    videoRef.current.muted = false;
                    videoRef.current.play().catch(() => {
                      if (videoRef.current) videoRef.current.muted = true;
                    });
                  }
                }}
                onEnded={finishActiveGift}
                onError={finishActiveGift}
              />
            </div>
          )}

          {/* ============ ROOM BANNER (1000 - 29999) ============ */}
          {((activeGift.price ?? 0) >= 1000 || comboValue >= 950) && (activeGift.price ?? 0) < 30000 && (
            <div key={activeGift._id} className="fixed top-4 left-0 right-0 z-[85] flex justify-center pointer-events-none animate-banner-floating">
              <div className={`max-w-[360px] w-[calc(100%-20px)] bg-gradient-to-r from-purple-900/95 via-black/95 to-purple-900/95 backdrop-blur-xl rounded-2xl px-4 py-2.5 border border-purple-400/60 shadow-[0_0_30px_rgba(168,85,247,0.4)] flex items-center justify-between transition-transform duration-300 ${showComboPulse ? "scale-[1.06]" : "scale-100"}`}>
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-purple-400/80 flex-shrink-0 shadow-lg">
                    {activeGift.fromAvatar ? (
                      <img src={activeGift.fromAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">{activeGift.fromName?.[0] || "?"}</div>
                    )}
                  </div>
                  <span className="text-white text-xs font-bold truncate max-w-[60px]">{activeGift.fromName}</span>
                </div>
                <div className="flex flex-col items-center px-2 min-w-0">
                  <div className="flex items-center gap-1 justify-center">
                    {activeGift.mediaUrl && (
                      activeGift.mediaType === "video" ? (
                        <video
                          src={activeGift.mediaUrl}
                          className="w-5 h-5 object-contain pointer-events-none"
                          autoPlay muted loop playsInline
                        />
                      ) : (
                        <img
                          src={activeGift.mediaUrl}
                          alt=""
                          className="w-5 h-5 object-contain"
                        />
                      )
                    )}
                    <span className="text-purple-300 text-[10px] font-bold truncate max-w-[80px]">{activeGift.giftName}</span>
                  </div>
                  <span className={`text-yellow-300 text-xs font-black ${showComboPulse ? "combo-pulse" : ""}`}>×{totalQuantity}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-white text-xs font-bold truncate max-w-[60px]">{activeGift.toName}</span>
                  <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-purple-400/80 flex-shrink-0 shadow-lg">
                    {activeGift.toAvatar ? (
                      <img src={activeGift.toAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">{activeGift.toName?.[0] || "?"}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ GLOBAL GOLDEN BANNER (≥ 30000 — in-room) ============ */}
          {isGlobalBanner && (
            <div className="fixed top-2 left-0 right-0 z-[95] flex justify-center pointer-events-none">
              <div className="max-w-[360px] w-[calc(100%-16px)] bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 p-[1.5px] rounded-full golden-glow">
                <div className="bg-black/90 backdrop-blur-xl rounded-full px-3 py-1.5 flex items-center justify-between text-white border border-yellow-300/40">
                  <div className="flex items-center gap-1 min-w-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-yellow-400 flex-shrink-0">
                      {activeGift.fromAvatar ? (
                        <img src={activeGift.fromAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">{activeGift.fromName?.[0] || "?"}</div>
                      )}
                    </div>
                    <span className="text-[11px] font-black text-yellow-300 truncate max-w-[65px]">{activeGift.fromName}</span>
                  </div>
                  <div className="flex flex-col items-center px-1">
                    <div className="flex items-center gap-1 justify-center">
                      {activeGift.mediaUrl && (
                        activeGift.mediaType === "video" ? (
                          <video
                            src={activeGift.mediaUrl}
                            className="w-4 h-4 object-contain pointer-events-none"
                            autoPlay muted loop playsInline
                          />
                        ) : (
                          <img
                            src={activeGift.mediaUrl}
                            alt=""
                            className="w-4 h-4 object-contain"
                          />
                        )
                      )}
                      <span className="text-[9px] font-bold text-white/90 truncate max-w-[90px]">أهدى {activeGift.giftName}</span>
                    </div>
                    <span className={`text-xs font-black text-yellow-400 ${showComboPulse ? "combo-pulse" : ""}`}>×{totalQuantity}</span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[11px] font-black text-yellow-300 truncate max-w-[65px]">{activeGift.toName}</span>
                    <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-yellow-400 flex-shrink-0">
                      {activeGift.toAvatar ? (
                        <img src={activeGift.toAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">{activeGift.toName?.[0] || "?"}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ MICRO GIFT (< 1000) — multi-particle flies to mics/listeners ============ */}
          {(activeGift.price ?? 0) < 1000 && activeGift.mediaUrl && (
            <div className="fixed inset-0 z-[75] pointer-events-none">
              {flyingTargets.map((target, idx) => (
                <div
                  key={`${activeGift._id}_${target.userId}_${comboCount}_${idx}`}
                  className="fixed pointer-events-none multi-gift-particle"
                  style={{
                    left: "50%",
                    top: "50%",
                    animationDelay: `${target.delay ?? 0}ms`,
                    ["--spread-x" as any]: `${target.spreadX}px`,
                    ["--spread-y" as any]: `${target.spreadY}px`,
                    ["--target-x" as any]: `${target.targetX}px`,
                    ["--target-y" as any]: `${target.targetY}px`,
                  }}
                >
                  <img
                    src={activeGift.mediaUrl}
                    alt=""
                    className={`${target.isOnMic ? "w-24 h-24" : "w-16 h-16"} object-contain drop-shadow-2xl`}
                  />
                </div>
              ))}

              {/* شارة تجميع المستمعين المخفيين */}
              {aggregateBadge && (
                <div
                  className="fixed pointer-events-none aggregate-badge-anim"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${aggregateBadge.x}px), calc(-50% + ${aggregateBadge.y}px))`,
                  }}
                >
                  <div className="bg-gradient-to-r from-pink-500/90 to-purple-600/90 rounded-full px-3 py-1 shadow-2xl border border-white/30">
                    <span className="text-white text-xs font-black">
                      +{aggregateBadge.count} مستمع <Gift size={10} className="inline text-pink-400" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============ [ezo-waterfall] STACKED COMBO WAVES ============ */}
          <GiftWavesLayer ref={wavesRef} />

           

          {(
            <div className={`fixed left-3 z-[70] pointer-events-none flex items-center transition-transform duration-200 ${showComboPulse ? "scale-110" : "scale-100"}`} style={{ bottom: "42vh" }}>
              <div className="bg-black/70 backdrop-blur-md rounded-full pl-2 pr-3 py-1 border border-white/20 shadow-xl flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-500 ring-1 ring-white/50 flex-shrink-0">
                  {activeGift.fromAvatar ? (
                    <img src={activeGift.fromAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-bold">{activeGift.fromName?.[0] || "?"}</div>
                  )}
                </div>
                <div className="flex flex-col text-right min-w-0">
                  <span className="text-white text-[10px] font-bold truncate max-w-[70px]">{activeGift.fromName}</span>
                  <span className="text-white/60 text-[8px] truncate max-w-[70px]">أرسل إلى {activeGift.toName}</span>
                </div>
                <span className="text-yellow-300 text-xl font-black italic drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]">×{totalQuantity}</span>
              </div>
            </div>
          )}
        </>
      )}

{showLeaderboard && (
        <LeaderboardSheet
          roomId={roomId}
          onClose={() => setShowLeaderboard(false)}
          onUserClick={(uid) => {
            setShowLeaderboard(false);
            setMiniProfileUserId(uid);
          }}
        />
      )}

      {showMicRequests && (
        <MicRequestsSheet roomId={roomId} onClose={() => setShowMicRequests(false)} />
      )}

      {myRequestToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] pointer-events-none" dir="rtl">
          <div className="bg-black/85 backdrop-blur-md border border-white/30 rounded-full px-5 py-2 shadow-2xl animate-pulse">
            <p className="text-white text-xs font-bold whitespace-nowrap">{myRequestToast}</p>
          </div>
        </div>
      )}

      {showActivity && (
        <ActivitySheet
          roomId={roomId}
          onClose={() => setShowActivity(false)}
          currentUserId={myInfo?.userId}
        />
      )}

      {showMembers && (
        <MembersSheet
          roomId={roomId}
          onClose={() => setShowMembers(false)}
          onUserClick={(uid) => {
            setShowMembers(false);
            setMiniProfileUserId(uid);
          }}
        />
      )}

      {fullProfileUserId && (
        <ProfilePage
          userId={fullProfileUserId}
          isMe={fullProfileIsMe}
          onClose={() => { setFullProfileUserId(null); setFullProfileIsMe(false); }}
          onOpenGift={() => {
            setPreSelectedGiftUserId(fullProfileUserId);
            setFullProfileUserId(null);
            setFullProfileIsMe(false);
            setShowGifts(true);
          }}
          onOpenAdminPanel={() => { setFullProfileUserId(null); }}
          onOpenOwnerPanel={() => { setFullProfileUserId(null); }}
        />
      )}

      {showRoomInfo && (
        <RoomInfoSheet
          roomId={roomId}
          onClose={() => setShowRoomInfo(false)}
          onUserClick={(uid) => {
            setShowRoomInfo(false);
            setMiniProfileUserId(uid);
          }}
        />
      )}

      {dmConversationId && (
        <ChatThreadSheet
          conversationId={dmConversationId}
          onClose={() => setDmConversationId(null)}
        />
      )}



      {miniProfileUserId && (
        <MiniProfileSheet
          userId={miniProfileUserId}
          roomId={roomId}
          currentUserRole={myInfo?.role as any}
          isMySeat={mySeatIndexForMiniProfile !== null}
          isMySeatMuted={mySeatIndexForMiniProfile !== null ? !!seats?.find((s: any) => s.seatIndex === mySeatIndexForMiniProfile)?.muted : false}
          isTargetOnMic={!!seats?.find((s: any) => s.userId === miniProfileUserId)}
          targetIsMod={members?.find((m: any) => m.userId === miniProfileUserId)?.role === "moderator"}
          onClose={() => { setMiniProfileUserId(null); setMySeatIndexForMiniProfile(null); }}
          onOpenGift={() => {
            setPreSelectedGiftUserId(miniProfileUserId);
            setMiniProfileUserId(null);
            setMySeatIndexForMiniProfile(null);
            setShowGifts(true);
          }}
          onOpenChat={async () => {
            if (!miniProfileUserId) return;
            try {
              const res = await openDM({
                otherUserId: miniProfileUserId as any,
                tokenOverride: getActiveToken() ?? deviceId,
              });
              setMiniProfileUserId(null);
              setMySeatIndexForMiniProfile(null);
              setDmConversationId(res.conversationId);
            } catch (e: any) {
              dialog.alert(e?.message || "فشل");
            }
          }}
          onFollowToggle={() => {
            if (!miniProfileUserId) return;
            toggleFollow({ targetUserId: miniProfileUserId as any, tokenOverride: getActiveToken() ?? deviceId })
              .then(() => dialog.alert("تم التحديث"))
              .catch((e: any) => dialog.alert(e?.message || "فشل"));
          }}
          onOpenFullProfile={() => {
            setFullProfileUserId(miniProfileUserId);
            setFullProfileIsMe(miniProfileUserId === myInfo?.userId);
            setMiniProfileUserId(null);
            setMySeatIndexForMiniProfile(null);
          }}
          onMention={(name: string) => {
            setPendingMention({ name, ts: Date.now() });
            setMiniProfileUserId(null);
            setMySeatIndexForMiniProfile(null);
            setShowChatInput(true);
          }}
          onKick={() => {
            if (!miniProfileUserId) return;
            (() => {
            const seatItem = seats?.find((s: any) => s.userId === miniProfileUserId);
            if (seatItem && (seatItem.userVip || 0) >= 5) {
              alert("عذراً، هذا العضو يتمتع بحصانة ملكية (VIP 5+) ضد الطرد");
              return Promise.reject(new Error("VIP immunity"));
            }
            return kickFromRoom({ roomId, toUserId: miniProfileUserId as any, tokenOverride: getActiveToken() ?? deviceId });
          })()
              .then(() => {
                setMiniProfileUserId(null);
                setMySeatIndexForMiniProfile(null);
              })
              .catch((e: any) => dialog.alert(e?.message || "خطأ"));
          }}
          onBan={() => {
            if (!miniProfileUserId) return;
            toggleBanUser({ roomId, toUserId: miniProfileUserId as any, tokenOverride: getActiveToken() ?? deviceId })
              .then(() => {
                setMiniProfileUserId(null);
                setMySeatIndexForMiniProfile(null);
              })
              .catch((e: any) => dialog.alert(e?.message || "خطأ"));
          }}
          onMute={() => {
            const targetSeat = mySeatIndexForMiniProfile !== null
              ? mySeatIndexForMiniProfile
              : seats?.find((s: any) => s.userId === miniProfileUserId)?.seatIndex;
            if (targetSeat === undefined || targetSeat === null) return;
            toggleMuteSeat({ roomId, seatIndex: targetSeat, tokenOverride: getActiveToken() ?? deviceId }).then(() => {
              setMiniProfileUserId(null);
              setMySeatIndexForMiniProfile(null);
            }).catch(() => {});
          }}
          onRemoveFromSeat={() => {
            const targetSeat = mySeatIndexForMiniProfile !== null
              ? mySeatIndexForMiniProfile
              : seats?.find((s: any) => s.userId === miniProfileUserId)?.seatIndex;
            if (targetSeat === undefined || targetSeat === null) return;
            // إذا كان مايكي أنا → leaveSeat
            if (mySeatIndexForMiniProfile !== null) {
              leaveSeat({ roomId, tokenOverride: getActiveToken() ?? deviceId })
                .then(() => agoraManager.unpublishMicrophone())
                .then(() => { setMiniProfileUserId(null); setMySeatIndexForMiniProfile(null); })
                .catch(() => {});
            } else {
              // إنزال شخص آخر
              if (!miniProfileUserId) return;
              removeFromSeat({ roomId, toUserId: miniProfileUserId as any, tokenOverride: getActiveToken() ?? deviceId })
                .then(() => {
                  setMiniProfileUserId(null);
                  setMySeatIndexForMiniProfile(null);
                })
                .catch((e: any) => dialog.alert(e?.message || "خطأ"));
            }
          }}
          onPromote={() => {
            if (!miniProfileUserId) return;
            promoteToMod({ roomId, toUserId: miniProfileUserId as any, tokenOverride: getActiveToken() ?? deviceId })
              .then(() => {
                setMiniProfileUserId(null);
                setMySeatIndexForMiniProfile(null);
              })
              .catch((e: any) => dialog.alert(e?.message || "خطأ"));
          }}
          onDemote={() => {
            if (!miniProfileUserId) return;
            demoteMod({ roomId, toUserId: miniProfileUserId as any, tokenOverride: getActiveToken() ?? deviceId })
              .then(() => {
                setMiniProfileUserId(null);
                setMySeatIndexForMiniProfile(null);
              })
              .catch((e: any) => dialog.alert(e?.message || "خطأ"));
          }}
          onInviteToMic={() => {
            const targetSeat = seats?.find((s: any) => s.userId === miniProfileUserId)?.seatIndex;
            if (targetSeat !== undefined) {
              setInviteSeatIndex(targetSeat);
              setMiniProfileUserId(null);
            }
          }}
        />
      )}

            {inviteSeatIndex !== null && listeners && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[75]" onClick={() => setInviteSeatIndex(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[80] max-w-md mx-auto bg-gray-950 rounded-t-2xl max-h-[70vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-white font-bold text-sm">دعوة للمايك {inviteSeatIndex + 1}</h2>
              <button onClick={() => setInviteSeatIndex(null)} className="text-white/70"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {listeners.length === 0 ? <p className="text-white/40 text-center py-8 text-sm">لا يوجد مستمعون</p> : listeners.map((l) => (
                <button key={l._id} onClick={() => { inviteToSeat({ roomId, toUserId: l.userId, seatIndex: inviteSeatIndex, tokenOverride: getActiveToken() ?? deviceId }); setInviteSeatIndex(null); }} className="w-full flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center text-sm font-bold text-white">
                    {true ? <img src={l?.avatarUrl || "/avatar.png"} alt="" className="w-full h-full object-cover" /> : (l.name?.[0] || "?")}
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
        <div className="fixed bottom-20 left-3 right-3 z-[90] max-w-md mx-auto bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-3 shadow-2xl border border-white/20" dir="rtl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-white text-sm font-bold flex-1">{myInvite.fromName} يدعوك للمايك {myInvite.seatIndex + 1}</p>
            <div className="flex gap-2">
              <button onClick={() => respondInvite({ inviteId: myInvite._id, accept: true, tokenOverride: getActiveToken() ?? deviceId })} className="bg-white text-purple-800 p-2 rounded-full"><Check size={16} /></button>
              <button onClick={() => respondInvite({ inviteId: myInvite._id, accept: false, tokenOverride: getActiveToken() ?? deviceId })} className="bg-red-500 text-white p-2 rounded-full"><X size={16} /></button>
            </div>
          </div>
        </div>
      )}



      {/* Combo Overlay (new layer, center) — doesn't affect anything */}
      {comboOverlay && comboOverlay.gift?.mediaUrl && (
        <div className="fixed inset-0 z-[72] pointer-events-none flex items-center justify-center" dir="rtl">
          <div
            key={`combo_${comboOverlay.count}`}
            className="combo-pop-in flex flex-col items-center"
          >
            <div className="w-32 h-32 flex items-center justify-center">
              {comboOverlay.gift.mediaType === "video" ? (
                <video
                  src={comboOverlay.gift.mediaUrl}
                  className="max-w-full max-h-full object-contain"
                  autoPlay muted loop playsInline
                />
              ) : (
                <img
                  src={comboOverlay.gift.mediaUrl}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
            {/* Big italic glowing number */}
            <div
              key={`num_${comboOverlay.count}`}
              className="combo-number-pulse relative"
            >
              <span className="text-6xl font-black italic tracking-tighter bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(250,204,21,0.8)]">
                ×{comboOverlay.count}
              </span>
            </div>

            {/* Sender → Recipient */}
            <div className="bg-black/85 backdrop-blur-xl rounded-full px-5 py-2 border border-yellow-400/50 shadow-[0_0_24px_rgba(250,204,21,0.35)] flex items-center gap-2">
              {comboOverlay.gift.fromAvatar && (
                <img
                  src={comboOverlay.gift.fromAvatar}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-yellow-400/70"
                />
              )}
              <span className="text-white text-xs font-black truncate max-w-[80px]">
                {comboOverlay.gift.fromName}
              </span>
              <span className="text-white/50 text-[10px]">→</span>
              <span className="text-white text-xs font-black truncate max-w-[80px]">
                {comboOverlay.gift.toName}
              </span>
            </div>
          </div>
        </div>
      )}

      <MusicPlayer roomId={roomId} variant="hidden" />
      {showGamesSheet && <GamesSheet onClose={() => setShowGamesSheet(false)} />}

      {showEmojiSheet && (
        <EmojiSheet
          onClose={() => setShowEmojiSheet(false)}
          onPick={(url: string) => {
            sendEmoji({ roomId, emojiUrl: url, tokenOverride: getActiveToken() ?? deviceId });
          }}
        />
      )}

      {showNotifSheet && <SystemNotifSheet onClose={() => setShowNotifSheet(false)} />}

      {/* [ezo-rocket-launch] Launch animation */}
      {launchAnimEvent && (
        <RocketLaunchOverlay
          rocket={{
            img: `/rockets/rocket-${["green", "blue", "purple", "red", "gold"][launchAnimEvent.levelIndex] ?? "green"}.png`,
            color: launchAnimEvent.levelColor ?? "#10b981",
            name: launchAnimEvent.levelName ?? "أخضر",
          }}
          launcher={{
            avatarUrl: launchAnimEvent.lastHitAvatarUrl ?? undefined,
            name: launchAnimEvent.lastHitUserName ?? "لاعب",
          }}
          onComplete={() => {
            setLaunchAnimEvent(null);
            setOpenRewardsOnSheet(true);
            setShowRocketSheet(true);
          }}
        />
      )}

      {showRocketSheet && (
        <RocketSheet
          roomId={roomId}
          autoOpenRewards={openRewardsOnSheet}
          onClose={() => {
            setShowRocketSheet(false);
            setOpenRewardsOnSheet(false);
          }}
          onOpenGiftSheet={() => {
            setShowRocketSheet(false);
            setTimeout(() => setShowGifts(true), 200);
          }}
        />
      )}

      {showMusicSheet && (
        <MusicSheet
          roomId={roomId}
          onClose={() => setShowMusicSheet(false)}
        />
      )}
      {showGifts && (
        <GiftSheet
          roomId={roomId}
          onClose={() => { setShowGifts(false); setPreSelectedGiftUserId(null); }}
          preSelectedUserId={preSelectedGiftUserId}
        />
      )}

      {showSettings && (
        <SettingsSheet roomId={roomId} currentLayout={layout} isOwnerOrMod={isOwnerOrMod}
          currentName={room.name} currentWelcome={room.welcomeMessage ?? ""} currentCoverUrl={room.coverUrl ?? null}
          micRequestsEnabled={!!room?.micRequestsEnabled}
          onClose={() => setShowSettings(false)}
          onOpenActivity={() => { setShowSettings(false); setShowActivity(true); }}
          onOpenSubSheet={(key) => {
            if (key === "music") { setShowMusicSheet(true); return; }
            setActiveSubSheet(key);
          }} />
      )}

        {activeSubSheet === "lock" && (
          <RoomLockSheet
            roomId={roomId}
            onClose={() => setActiveSubSheet(null)}
          />
        )}
      {shareToast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] bg-black/85 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-2xl border border-white/20">
          <p className="text-white text-sm font-black">تم نسخ رابط الغرفة</p>
        </div>
      )}
      <VipEntryOverlay entry={currentEntry} />
      {activeEntryUserId && (
        <MemberEntryEffect
          userId={activeEntryUserId}
          onDone={() => setActiveEntryUserId(null)}
        />
      )}
    </div>
  );
}

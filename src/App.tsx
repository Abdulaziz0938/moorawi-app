import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import Dashboard from "./components/Dashboard";
import LiveBroadcaster from "./components/live/LiveBroadcaster";
import LiveViewer from "./components/live/LiveViewer";
import BannerPopup from "./components/BannerPopup";
import BgRemovalPrompt from "./components/BgRemovalPrompt";
import PKAcceptModal from "./components/live/PKAcceptModal";
import RoomView from "./components/RoomView";
import Onboarding from "./components/Onboarding";
import AuthScreen from "./components/AuthScreen";
import { getActiveToken, hasSession, clearSession } from "./lib/session";
import { Loader2 } from "lucide-react";
import { useBackButton } from "./lib/hooks/useBackButton";
import { initHistoryGuard } from "./lib/historyStack";
import DailyLoginModal from "./components/DailyLoginModal";
import InstallBanner from "./components/InstallBanner";

function App() {
  // [ezo-global] نبضة النشاط العام
  useEffect(() => {
    const handler = () => {
      window.dispatchEvent(new CustomEvent('ezo-activity-ping'));
    };
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
  }, []);

  const [token, setToken] = useState<string>(() => getActiveToken());
  const [showAuth, setShowAuth] = useState<boolean>(() => !hasSession());
  const [currentRoomId, setCurrentRoomId] = useState<Id<"rooms"> | null>(null);
  const [roomMinimized, setRoomMinimized] = useState(false);
  const [currentLiveId, setCurrentLiveId] = useState<string | null>(null);
  const [isLiveHost, setIsLiveHost] = useState(false);
  const [isLiveCoHost, setIsLiveCoHost] = useState(false);
  const [myOriginalStreamId, setMyOriginalStreamId] = useState<string | null>(null);
  const [showDailyLogin, setShowDailyLogin] = useState(false);
  useEffect(() => { initHistoryGuard(); }, []);

  // Back button → leave room
  useBackButton(!!currentRoomId, () => window.dispatchEvent(new CustomEvent("room-back-pressed")));
  const [refreshKey, setRefreshKey] = useState(0);

  const me = useQuery(api.auth.me, { tokenOverride: token });
  const notifs = useQuery(
    api.notifications.listMine,
    me ? { tokenOverride: token } : "skip" as any
  );
  // [ezo-live] الدعوة تظهر حتى لو كنت في بثك الخاص (الضيفة)
  const pkInvite = !currentRoomId
    ? (notifs ?? []).find(
        (n: any) =>
          (n.actionType === "pk_invite" || n.actionType === "cohost_invite") &&
          !n.readAt
      )
    : null;

  // [ezo-live] الاستماع لحدث تبديل البث (Migration/Swipe)
  useEffect(() => {
    const handleSwitch = (e: any) => {
      setCurrentLiveId(e.detail);
      setIsLiveHost(false);
      setIsLiveCoHost(false);
    };
    window.addEventListener('switch-live', handleSwitch);
    return () => window.removeEventListener('switch-live', handleSwitch);
  }, []);

    // [ezo-live] الاستماع لحدث فتح بث من تبويب الغرف
  useEffect(() => {
    const handleOpenLive = (e: any) => {
      setCurrentLiveId(e.detail);
      setIsLiveHost(false);
    };
    window.addEventListener("open-live-stream", handleOpenLive);
    return () => window.removeEventListener("open-live-stream", handleOpenLive);
  }, []);

    // [ezo-rooms] الاستماع لحدث الدخول للغرفة من لوحة التصنيفات
  useEffect(() => {
    const handleEnterRoom = (e: any) => {
      setCurrentRoomId(e.detail);
    };
    window.addEventListener("enter-room", handleEnterRoom);
    return () => window.removeEventListener("enter-room", handleEnterRoom);
  }, []);

  // [ezo-missions] Daily login check — once per 24h
  const dailyStatus = useQuery(
    api.missions.myProgress,
    me ? { tokenOverride: token } : "skip" as any
  );

  // [ezo-missions] فتح نافذة الدخول اليومي تلقائياً
  useEffect(() => {
    if (dailyStatus?.canClaimDaily && me) {
      const t = setTimeout(() => setShowDailyLogin(true), 800);
      return () => clearTimeout(t);
    }
  }, [dailyStatus?.canClaimDaily, me?._id]);

  // [ezo-auth] يُستدعى من AuthScreen مع session token الجديد مباشرة
  const handleAuthSuccess = (sessionToken: string) => {
    if (sessionToken) {
      setToken(sessionToken);
    } else {
      setToken(getActiveToken()); // زائر → device id
    }
    setShowAuth(false);
    setRefreshKey((k) => k + 1);
  };

  // Loading state
  if (me === undefined) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center app-bg overflow-hidden">
        <Loader2 className="animate-spin text-slate-900" size={48} />
      </div>
    );
  }

  // Auth welcome screen
  if (showAuth) {
    return (
      <AuthScreen onSuccess={handleAuthSuccess} />
    );
  }

  // If token resolves to nothing, bounce back to auth
  if (!me) {
    return (
      <AuthScreen onSuccess={handleAuthSuccess} />
    );
  }

  // Onboarding for new users
  if (!me.profileComplete) {
    return (
      <div className="h-[100dvh] w-full overflow-y-auto app-bg" dir="rtl">
        <Onboarding
            onComplete={() => setRefreshKey((k) => k + 1)}
            onBackToAuth={() => {
              clearSession();
              setShowAuth(true);
              setRefreshKey((k) => k + 1);
            }}
          />
      </div>
    );
  }

  // Main app
  return (
    <div key={refreshKey} className="h-[100dvh] w-full overflow-hidden app-bg" dir="rtl">
      {currentLiveId ? (
        isLiveHost ? (
          <LiveBroadcaster
            streamId={currentLiveId}
            onEnd={() => {
              setCurrentLiveId(null);
              setIsLiveHost(false);
              setIsLiveCoHost(false);
            }}
          />
        ) : isLiveCoHost ? (
          <LiveBroadcaster
            streamId={currentLiveId}
            asCoHost
            onEnd={() => {
              if (myOriginalStreamId) {
                // العودة لبث الضيفة الأصلي (كأن شيئاً لم يكن)
                setCurrentLiveId(myOriginalStreamId);
                setIsLiveHost(true); // الضيفة تعود كمضيفة لبثها
                setIsLiveCoHost(false);
                setMyOriginalStreamId(null);
              } else {
                setCurrentLiveId(null);
                setIsLiveHost(false);
                setIsLiveCoHost(false);
              }
            }}
          />
        ) : (
          <LiveViewer
            streamId={currentLiveId}
            onLeave={() => setCurrentLiveId(null)}
          />
        )
      ) : currentRoomId ? (
        <>
          {roomMinimized && (
            <Dashboard
              onEnterRoom={setCurrentRoomId}
              onEnterLive={(id) => {
                setIsLiveHost(false);
                setCurrentLiveId(id);
              }}
              onStartLive={(id) => {
                setIsLiveHost(true);
                setCurrentLiveId(id);
              }}
            />
          )}
          <RoomView
            roomId={currentRoomId}
            onLeave={() => { setRoomMinimized(false); setCurrentRoomId(null); }}
            onMinimizeChange={setRoomMinimized}
          />
        </>
      ) : (
        <Dashboard
          onEnterRoom={setCurrentRoomId}
          onEnterLive={(id) => {
            setIsLiveHost(false);
            setCurrentLiveId(id);
          }}
          onStartLive={(id) => {
            setIsLiveHost(true);
            setCurrentLiveId(id);
          }}
        />
      )}
      {pkInvite && (
        <PKAcceptModal
          streamId={String(pkInvite.actionPayload)}
          onDecline={() => {}}
          onAccepted={(sid) => {
            // سلوك تيك توك: لا ننهي بث الضيفة، بل نحفظه وننتقل مؤقتاً
            if (currentLiveId && currentLiveId !== sid) {
              setMyOriginalStreamId(currentLiveId);
            }
            setIsLiveHost(false);
            setIsLiveCoHost(true);
            setCurrentLiveId(sid);
          }}
        />
      )}
      {showDailyLogin && <DailyLoginModal onClose={() => setShowDailyLogin(false)} />}
      {me.profileComplete && <InstallBanner />}
      <BgRemovalPrompt />
      {me.profileComplete && (
        <BannerPopup
          onOpenRoom={(roomId) => setCurrentRoomId(roomId)}
          onOpenLive={(streamId) => {
            setIsLiveHost(false);
            setIsLiveCoHost(false);
            setCurrentLiveId(streamId);
          }}
        />
      )}
    </div>
  );
}

export default App;

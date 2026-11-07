import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
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
  
  // [ezo-global-gift] حالة الإشعار العالمي للهدايا
  const [activeGlobalGiftApp, setActiveGlobalGiftApp] = useState<any>(null);

  useEffect(() => { initHistoryGuard(); }, []);

  // التحكم العام بزر الرجوع في الأندرويد
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const backButtonListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        // 1. إذا كان داخل غرفة، اترك الغرفة
        if (currentRoomId) {
          window.dispatchEvent(new CustomEvent("room-back-pressed"));
        } 
        // 2. إذا كان داخل بث مباشر، اخرج من البث
        else if (currentLiveId) {
          setCurrentLiveId(null);
          setIsLiveHost(false);
          setIsLiveCoHost(false);
        } 
        // 3. إذا كان في صفحة داخلية (مثل الإعدادات)، ارجع للخلف
        else if (canGoBack) {
          window.history.back();
        } 
        // 4. إذا كان في الصفحة الرئيسية (الرئيسية)، أغلق التطبيق
        else {
          CapacitorApp.exitApp();
        }
      });

      return () => {
        backButtonListener.then(listener => listener.remove());
      };
    }
  }, [currentRoomId, currentLiveId]);
  
  // Back button → leave room
  useBackButton(!!currentRoomId, () => window.dispatchEvent(new CustomEvent("room-back-pressed")));
  const [refreshKey, setRefreshKey] = useState(0);

  const me = useQuery(api.auth.me, { tokenOverride: token });
  
  // [ezo-splash] جلب صورة شاشة البداية وعرضها لمدة 5 ثوان
  const splashImageUrl = useQuery(api.splash.getSplashImage);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, []);

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

  // [ezo-global-gift] استعلام للهدايا العالمية (يظهر في كل التطبيق)
  const globalGiftBroadcast = useQuery(api.gifts.latestGlobalBroadcast, {
    since: Date.now() - 10000, // آخر 10 ثواني
  });

  useEffect(() => {
    if (globalGiftBroadcast) {
      setActiveGlobalGiftApp(globalGiftBroadcast);
      const timer = setTimeout(() => setActiveGlobalGiftApp(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [globalGiftBroadcast]);

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

  // [ezo-rooms] الاستماع لحدث الدخول للغرفة من لوحة التصنيفات أو من إشعار
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

  // [ezo-splash] عرض الصورة إذا كانت موجودة ولم تنتهِ الـ 5 ثواني
  if (showSplash) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center relative">
        {splashImageUrl ? (
          <img src={splashImageUrl} alt="Splash" className="w-full h-full object-cover" />
        ) : (
          <Loader2 className="animate-spin text-white" size={48} />
        )}
      </div>
    );
  }
  
  // Loading state
  if (me === undefined) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center app-bg overflow-hidden">
        <Loader2 className="animate-spin text-white" size={48} />
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
      <div className="h-[100dvh] w-full overflow-y-auto app-bg" dir="ltr">
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
    <div key={refreshKey} className="h-[100dvh] w-full overflow-hidden app-bg" dir="ltr">
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

      {/* 👇 الإشعار العالمي للهدايا (يظهر في كل التطبيق) 👇 */}
      {activeGlobalGiftApp && (
        <div 
          className="fixed top-10 left-0 right-0 z-[9999] flex justify-center pointer-events-none animate-in slide-in-from-top-20 duration-500" 
          dir="rtl"
        >
          <div className="relative max-w-[90%] w-[400px]">
            {/* خلفية متوهجة */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 blur-xl opacity-70 animate-pulse"></div>
            
            <div className="relative bg-black/90 backdrop-blur-xl rounded-full p-[2px] border-2 border-yellow-400/50 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2">
                
                <div className="flex items-center gap-2">
                  <img src={activeGlobalGiftApp.fromAvatar || "/avatar.png"} className="w-10 h-10 rounded-full border-2 border-yellow-400 object-cover" />
                  <span className="text-yellow-300 text-sm font-black truncate max-w-[80px]">{activeGlobalGiftApp.fromName}</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-white text-xs font-bold">أهدى</span>
                  <div className="flex items-center gap-1">
                    <img src={activeGlobalGiftApp.giftIcon} className="w-6 h-6 object-contain animate-spin" style={{ animationDuration: '3s' }} />
                    <span className="text-white text-xs font-black truncate max-w-[80px]">{activeGlobalGiftApp.giftName}</span>
                    <span className="text-yellow-400 text-lg font-black">×{activeGlobalGiftApp.quantity}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-yellow-300 text-sm font-black truncate max-w-[80px]">{activeGlobalGiftApp.toName}</span>
                  <img src={activeGlobalGiftApp.toAvatar || "/avatar.png"} className="w-10 h-10 rounded-full border-2 border-yellow-400 object-cover" />
                </div>

              </div>
              {/* شريط التحميل السفلي */}
              <div className="h-1 bg-yellow-500/20 w-full">
                <div className="h-full bg-yellow-400 animate-[progress_6s_linear_forwards]" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

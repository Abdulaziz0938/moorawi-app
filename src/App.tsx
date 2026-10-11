import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import Dashboard from "./components/Dashboard";
import RoomView from "./components/RoomView";
import Onboarding from "./components/Onboarding";
import AuthScreen from "./components/AuthScreen";
import { getActiveToken, hasSession, clearSession } from "./lib/session";
import { Loader2 } from "lucide-react";
import { useBackButton } from "./lib/hooks/useBackButton";
import DailyLoginModal from "./components/DailyLoginModal";

function App() {
  const [token, setToken] = useState<string>(() => getActiveToken());
  const [showAuth, setShowAuth] = useState<boolean>(() => !hasSession());
  const [currentRoomId, setCurrentRoomId] = useState<Id<"rooms"> | null>(null);
  const [showDailyLogin, setShowDailyLogin] = useState(false);

  // فتح نافذة الدخول اليومي تلقائياً
  useEffect(() => {
    if (dailyStatus?.canClaimDaily && me) {
      const t = setTimeout(() => setShowDailyLogin(true), 800);
      return () => clearTimeout(t);
    }
  }, [dailyStatus?.canClaimDaily, me?._id]);

  // Back button → leave room
  useBackButton(!!currentRoomId, () => setCurrentRoomId(null));
  const [refreshKey, setRefreshKey] = useState(0);

  const me = useQuery(api.auth.me, { tokenOverride: token });

  // [moorawi-missions] Daily login check — once per 24h
  const dailyStatus = useQuery(
    api.missions.myProgress,
    me ? { tokenOverride: token } : "skip" as any
  );

  // [moorawi-auth] يُستدعى من AuthScreen مع session token الجديد مباشرة
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
      {currentRoomId ? (
        <RoomView roomId={currentRoomId} onLeave={() => setCurrentRoomId(null)} />
      ) : (
        <Dashboard onEnterRoom={setCurrentRoomId} />
      )}
      {showDailyLogin && <DailyLoginModal onClose={() => setShowDailyLogin(false)} />}
    </div>
  );
}

export default App;

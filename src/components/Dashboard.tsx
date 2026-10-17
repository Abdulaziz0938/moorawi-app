import { useState } from "react";
import { useQuery } from "convex/react";
import { useBackButton } from "../lib/hooks/useBackButton";
import MessagesTab from "./MessagesTab";
import MomentsTab from "./MomentsTab";
import DiscoverTab from "./DiscoverTab";
import PullToRefresh from "./PullToRefresh";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Home, Compass, Image as ImageIcon, MessageCircle, User as UserIcon } from "lucide-react";
import { getActiveToken } from "../lib/session";
import IconOrImage from "./IconOrImage";
import RoomsTab from "./RoomsTab";
import MeTab from "./MeTab";

type Tab = "rooms" | "discover" | "moments" | "messages" | "me";

interface Props {
  onEnterRoom: (roomId: Id<"rooms">) => void;
  onEnterLive?: (streamId: string) => void;
  onStartLive?: (streamId: string) => void;
}

export default function Dashboard({ onEnterRoom, onEnterLive, onStartLive }: Props) {
  const [tab, setTab] = useState<Tab>("rooms");
  const [refreshKey, setRefreshKey] = useState(0);

  // Back button → return to rooms tab
  useBackButton(tab !== "rooms", () => setTab("rooms"));
  const token = getActiveToken();
  const me = useQuery(api.auth.me, { tokenOverride: token });

  // ============ Tabs (RTL: الأيمن أولاً) ============
  const tabs: { key: Tab; label: string; icon: any; assetKey: string; badge?: number }[] = [
    { key: "rooms",     label: "الغرف",   icon: Home,           assetKey: "ui.nav.home" },
    { key: "discover",  label: "اكتشاف", icon: Compass,        assetKey: "ui.nav.discover" },
    { key: "moments",   label: "لحظات",  icon: ImageIcon,      assetKey: "ui.nav.moments" },
    { key: "messages",  label: "رسائل",  icon: MessageCircle,  assetKey: "ui.nav.messages", badge: 0 },
    { key: "me",        label: "أنا",     icon: UserIcon,       assetKey: "ui.nav.me" },
  ];

  return (
    <div className="h-[100dvh] w-full flex flex-col app-bg overflow-hidden" dir="rtl">
      {/* ============ Content ============ */}
      <PullToRefresh onRefresh={() => setRefreshKey((k) => k + 1)} className="flex-1 pb-20">
        <div key={refreshKey}>
        {tab === "rooms" && (
          <RoomsTab
            onEnter={onEnterRoom}
            onEnterLive={onEnterLive}
            onStartLive={onStartLive}
          />
        )}

        {tab === "discover" && <DiscoverTab onEnterRoom={(id) => onEnterRoom(id as any)} />}

        {tab === "moments" && <MomentsTab />}

        {tab === "messages" && <MessagesTab />}

        {tab === "me" && <MeTab onEnterRoom={(id) => onEnterRoom(id as any)} />}

        {tab === "me" && !me && (
          <div className="h-full flex flex-col items-center justify-center text-white/60 p-8">
            <UserIcon size={64} className="mb-4 opacity-40" />
            <p className="text-lg font-bold">جاري التحميل...</p>
          </div>
        )}
        </div>
      </PullToRefresh>

      {/* ============ TabBar ============ */}
            {/* ============ Binmo Custom Image Bottom Navigation ============ */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 select-none"
        style={{
          height: "calc(74px + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div 
          className="relative w-full h-full"
          style={{
            backgroundImage: "url(/ui/bottom-nav.png)",
            backgroundSize: "100% 100%",
            backgroundPosition: "bottom center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* مناطق النقر الشفافة للتبويبات الـ 5 (مرتبة من اليمين لليسار حسب الصورة: الغرف، اكتشاف، لحظات، رسائل، أنا) */}
          <div className="absolute inset-0 flex items-center justify-between px-1" dir="rtl">
            
            {/* 1. الغرف (أقصى اليمين) */}
            <div 
              onClick={() => setTab("rooms")} 
              className="w-[20%] h-full cursor-pointer active:opacity-60 transition" 
              title="الغرف" 
            />

            {/* 2. اكتشاف */}
            <div 
              onClick={() => setTab("discover")} 
              className="w-[20%] h-full cursor-pointer active:opacity-60 transition" 
              title="اكتشاف" 
            />

            {/* 3. لحظات */}
            <div 
              onClick={() => setTab("moments")} 
              className="w-[20%] h-full cursor-pointer active:opacity-60 transition" 
              title="لحظات" 
            />

            {/* 4. رسائل */}
            <div 
              onClick={() => setTab("messages")} 
              className="w-[20%] h-full cursor-pointer active:opacity-60 transition" 
              title="رسائل" 
            />

            {/* 5. أنا (أقصى اليسار) */}
            <div 
              onClick={() => setTab("me")} 
              className="w-[20%] h-full cursor-pointer active:opacity-60 transition" 
              title="أنا" 
            />

          </div>
        </div>
      </nav>
    </div>
  );
}

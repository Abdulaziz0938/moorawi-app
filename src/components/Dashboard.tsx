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
                        <div key={refreshKey} className="relative min-h-full">
        {tab !== "rooms" && (
          <div
            className="sticky top-0 z-30 w-full pointer-events-none select-none"
            style={{
              aspectRatio: "1080 / 300",
              marginBottom: "-52px",
              backgroundImage: "url(/ui/top-banner-purple.png)",
              backgroundSize: "100% 100%",
              backgroundPosition: "center top",
              backgroundRepeat: "no-repeat",
              filter: "drop-shadow(0 6px 14px rgba(5, 2, 12, 0.8))",
            }}
          />
        )}{tab === "rooms" && (
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
        className="fixed bottom-0 left-0 right-0 z-50 select-none bg-transparent pointer-events-none"
        style={{
          height: "calc(78px + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          filter: "drop-shadow(0 -6px 16px rgba(5, 2, 12, 0.9))",
        }}
      >
        <div
          className="relative w-full h-full pointer-events-auto"
          style={{
            backgroundImage: "url(/ui/bottom-nav.png)",
            backgroundSize: "100% 100%",
            backgroundPosition: "bottom center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-between px-1" dir="rtl">
            <div onClick={() => setTab("rooms")} className="w-[20%] h-full cursor-pointer active:scale-95 transition" title="الغرف" />
            <div onClick={() => setTab("discover")} className="w-[20%] h-full cursor-pointer active:scale-95 transition" title="اكتشاف" />
            <div onClick={() => setTab("moments")} className="w-[20%] h-full cursor-pointer active:scale-95 transition" title="لحظات" />
            <div onClick={() => setTab("messages")} className="w-[20%] h-full cursor-pointer active:scale-95 transition" title="رسائل" />
            <div onClick={() => setTab("me")} className="w-[20%] h-full cursor-pointer active:scale-95 transition" title="أنا" />
          </div>
        </div>
      </nav>
    </div>
  );
}

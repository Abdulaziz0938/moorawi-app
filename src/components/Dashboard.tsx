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

        {tab === "discover" && <DiscoverTab onEnterRoom={onEnterRoom} />}

        {tab === "moments" && <MomentsTab />}

        {tab === "messages" && <MessagesTab />}

        {tab === "me" && <MeTab onEnterRoom={onEnterRoom} />}

        {tab === "me" && !me && (
          <div className="h-full flex flex-col items-center justify-center text-white/60 p-8">
            <UserIcon size={64} className="mb-4 opacity-40" />
            <p className="text-lg font-bold">جاري التحميل...</p>
          </div>
        )}
        </div>
      </PullToRefresh>

      {/* ============ TabBar ============ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          backgroundImage: "url(/ui/bottom-nav-purple.png)",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "bottom center",
        }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around px-1">
          {tabs.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition overflow-visible ${active ? "text-white" : "text-white/45 hover:text-white/70"}`}
              >
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute -inset-3 flex items-center justify-center">
                    <IconOrImage assetKey={t.assetKey} Icon={Icon} size={28} imgSize={40} fillParent strokeWidth={active ? 2.5 : 2} imgClassName={active ? "" : "opacity-75"} />
                  </div>
                </div>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
                )}
                {t.badge && t.badge > 0 ? (
                  <span className="absolute top-1 right-1/4 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                    {t.badge > 99 ? "99+" : t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

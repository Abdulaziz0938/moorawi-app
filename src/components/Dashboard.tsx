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
    <div className="h-[100dvh] w-full flex flex-col app-bg overflow-hidden relative" dir="rtl">
      {/* ═══ LAYER 1: Top Banner (fixed, behind all tabs) ═══ */}
      <div
        className="fixed top-0 left-0 right-0 z-0 pointer-events-none"
        style={{
          height: "160px",
          backgroundImage: "url(/ui/top-banner-purple.png)",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ═══ LAYER 2: Content (below banner) ═══ */}
      <div className="relative z-10 flex-1 flex flex-col" style={{ paddingTop: "160px" }}>
      <PullToRefresh onRefresh={() => setRefreshKey((k) => k + 1)} className="flex-1 pb-28">
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
      </div>

      {/* ============ TabBar ============ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          height: "100px",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "url(/ui/bottom-nav-purple.png)",
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="relative max-w-md mx-auto h-full flex items-end justify-around px-2 pb-2">
          {tabs.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative flex-1 flex flex-col items-center justify-end gap-0.5"
              >
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <IconOrImage
                    assetKey={t.assetKey}
                    Icon={Icon}
                    size={24}
                    imgSize={36}
                    strokeWidth={active ? 2.5 : 2}
                    imgClassName={active ? "" : "opacity-60"}
                  />
                  {t.badge && t.badge > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                      {t.badge > 99 ? "99+" : t.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] font-black transition ${active ? "text-white" : "text-white/50"}`}>
                  {t.label}
                </span>
                {active && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 shadow-lg shadow-pink-500/60" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

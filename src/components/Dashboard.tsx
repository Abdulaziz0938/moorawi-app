import { useState } from "react";
import { useQuery } from "convex/react";
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
}

export default function Dashboard({ onEnterRoom }: Props) {
  const [tab, setTab] = useState<Tab>("rooms");
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
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === "rooms" && <RoomsTab onEnter={onEnterRoom} />}

        {tab === "discover" && (
          <div className="h-full flex flex-col items-center justify-center text-white/60 p-8">
            <Compass size={64} className="mb-4 opacity-40" />
            <p className="text-lg font-bold">اكتشاف</p>
            <p className="text-sm mt-1">قريباً</p>
          </div>
        )}

        {tab === "moments" && (
          <div className="h-full flex flex-col items-center justify-center text-white/60 p-8">
            <ImageIcon size={64} className="mb-4 opacity-40" />
            <p className="text-lg font-bold">لحظات</p>
            <p className="text-sm mt-1">قريباً</p>
          </div>
        )}

        {tab === "messages" && (
          <div className="h-full flex flex-col items-center justify-center text-white/60 p-8">
            <MessageCircle size={64} className="mb-4 opacity-40" />
            <p className="text-lg font-bold">رسائل</p>
            <p className="text-sm mt-1">قريباً</p>
          </div>
        )}

        {tab === "me" && <MeTab />}

        {tab === "me" && !me && (
          <div className="h-full flex flex-col items-center justify-center text-white/60 p-8">
            <UserIcon size={64} className="mb-4 opacity-40" />
            <p className="text-lg font-bold">جاري التحميل...</p>
          </div>
        )}
      </div>

      {/* ============ TabBar ============ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 backdrop-blur-xl bg-black/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around px-1">
          {tabs.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition ${active ? "text-white" : "text-white/45 hover:text-white/70"}`}
              >
                <IconOrImage assetKey={t.assetKey} Icon={Icon} size={22} imgSize={28} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-[10px] font-bold ${active ? "text-white" : ""}`}>{t.label}</span>
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

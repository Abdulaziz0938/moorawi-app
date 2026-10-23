// [ezo-messages] تبويب الرسائل — رسائل | أصدقائي
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import UserAvatar from "./UserAvatar";
import ChatThreadSheet from "./ChatThreadSheet";
import SystemNotifSheet from "./SystemNotifSheet";
import FriendRequestsSheet from "./FriendRequestsSheet";
import Card from "./ui/Card";
import SectionTitle from "./ui/SectionTitle";
import VipName from "./VipName";
import {
  Search, Loader2, MessageCircle, Bell, Heart, UserPlus,
  Check, ChevronLeft,
} from "lucide-react";
import { getActiveToken } from "../lib/session";

type Tab = "messages" | "friends";

interface Props {
  onUserClick?: (userId: any) => void;
}

export default function MessagesTab({ onUserClick }: Props) {
  const deviceId = getDeviceId();
  const [tab, setTab] = useState<Tab>("messages");
  const [search, setSearch] = useState("");
  const [openThread, setOpenThread] = useState<any>(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showFriendReqs, setShowFriendReqs] = useState(false);

  const conversations = useQuery(api.directMessages.listConversations, { tokenOverride: getActiveToken() ?? deviceId });
  const notifCount = useQuery(api.notifications.unreadCount, { tokenOverride: getActiveToken() ?? deviceId });
  const pendingFriendReqs = useQuery(api.friends.pendingRequests, { tokenOverride: getActiveToken() ?? deviceId });
  const pendingRelReqs = undefined;
  const friends = useQuery(api.friends.listFriends, { tokenOverride: getActiveToken() ?? deviceId });

  const friendReqCount = pendingFriendReqs?.length ?? 0;
  const relReqCount = (pendingRelReqs as any)?.length ?? 0;
  const totalNotifs = notifCount ?? 0;
  const totalBadge = totalNotifs + friendReqCount + relReqCount;

  // Filter conversations by search
  const filteredConvs = (conversations ?? []).filter((c: any) =>
    search.trim().length === 0
      ? true
      : c.otherName.toLowerCase().includes(search.toLowerCase()) ||
        String(c.otherUserNumber ?? "").includes(search)
  );

  const filteredFriends = (friends ?? []).filter((f: any) =>
    search.trim().length === 0
      ? true
      : f.name.toLowerCase().includes(search.toLowerCase()) ||
        String(f.userNumber ?? "").includes(search)
  );

  return (
    <div className="relative z-30 max-w-md mx-auto pb-24 min-h-screen" dir="rtl">
      {/* ===== Header ===== */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTab("messages")}
              className={`relative pb-1 text-lg font-black transition ${
                tab === "messages" ? "text-slate-900" : "text-slate-900/50"
              }`}
            >
              رسائل
              {tab === "messages" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-emerald-400" />}
            </button>
            <button
              onClick={() => setTab("friends")}
              className={`relative pb-1 text-lg font-black transition ${
                tab === "friends" ? "text-slate-900" : "text-slate-900/50"
              }`}
            >
              أصدقائي
              {tab === "friends" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-emerald-400" />}
            </button>
          </div>
          {totalBadge > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-500 text-slate-900 text-[10px] font-black">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </div>

        {/* ===== Search ===== */}
<Card className="flex items-center gap-2" padding="md">
            <Search size={16} className="text-slate-900/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "messages" ? "بحث ID، الاسم" : "بحث في الأصدقاء"}
            className="flex-1 bg-transparent text-slate-900 text-sm outline-none placeholder:text-slate-900/40"
          />
          </Card>
      </div>

      {/* ===== Content ===== */}
      <div className="px-4">
        {tab === "messages" ? (
          <div className="space-y-2 mt-3">

            {/* System notification */}
<Card interactive onClick={() => setShowNotifs(true)} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bell size={22} className="text-slate-900" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-slate-900 text-sm font-black">رسالة النظام</p>
                <p className="text-slate-900/50 text-[11px] truncate">
                  {totalNotifs > 0 ? `${totalNotifs} رسالة جديدة` : "لا توجد رسائل جديدة"}
                </p>
              </div>
              {totalNotifs > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-slate-900 text-[10px] font-black">
                  {totalNotifs}
                </span>
              )}
              <ChevronLeft size={16} className="text-slate-900/30" />
            </Card>

            {/* Friend requests */}
<Card interactive onClick={() => setShowFriendReqs(true)} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <UserPlus size={22} className="text-slate-900" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-slate-900 text-sm font-black">طلب صداقة</p>
                <p className="text-slate-900/50 text-[11px] truncate">
                  {friendReqCount > 0 ? `${friendReqCount} طلب جديد` : "طلبات الصداقة الجديدة هنا"}
                </p>
              </div>
              {friendReqCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-slate-900 text-[10px] font-black">
                  {friendReqCount}
                </span>
              )}
              <ChevronLeft size={16} className="text-slate-900/30" />
            </Card>

            {/* CP/relationship requests */}
            {relReqCount > 0 && (
<Card tone="pink" padding="md" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center flex-shrink-0">
                  <Heart size={22} className="text-slate-900" fill="currentColor" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-slate-900 text-sm font-black">طلب علاقة</p>
                  <p className="text-slate-900/50 text-[11px] truncate">{relReqCount} طلب جديد</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-slate-900 text-[10px] font-black">
                  {relReqCount}
                </span>
                <ChevronLeft size={16} className="text-slate-900/30" />
              </Card>
            )}

            {/* DM conversations */}
            <div className="pt-3">
              <SectionTitle icon={MessageCircle} title="المحادثات" tone="default" />
              {conversations === undefined ? (
                <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-slate-900/40" /></div>
              ) : filteredConvs.length === 0 ? (
<Card tone="default" padding="lg">
                    <div className="text-center py-8 text-slate-900/40">
                      <MessageCircle size={40} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">لا توجد محادثات بعد</p>
                    </div>
                  </Card>
              ) : (
                <div className="space-y-1.5">
                  {filteredConvs.map((c: any) => (
                    <button
                      key={c._id}
                      onClick={() => setOpenThread(c)}
                      className="w-full rounded-2xl bg-[#161c24] border border-slate-200 p-3 flex items-center gap-3 active:bg-white/10"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center">
                          <UserAvatar avatarUrl={c.otherAvatar} name={c.otherName} className="w-full h-full" />
                        </div>
                        {c.unread > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-slate-900 text-[10px] font-black flex items-center justify-center border-2 border-slate-900">
                            {c.unread > 99 ? "99+" : c.unread}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.otherVerified && <Check size={11} className="text-blue-400" />}
                          <p className="text-slate-900 text-sm font-black truncate">{c.otherName}</p>
                        </div>
                        <p className={`text-[11px] truncate ${c.unread > 0 ? "text-slate-900/80 font-bold" : "text-slate-900/40"}`}>
                          {c.lastMessageFromMe ? "أنت: " : ""}{c.lastMessageText}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-slate-900/40 text-[9px]">
                          {formatTime(c.lastMessageAt)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ===== Friends tab ===== */
          <div className="mt-3">
            {friends === undefined ? (
              <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-slate-900/40" /></div>
            ) : filteredFriends.length === 0 ? (
<Card tone="default" padding="lg">
                  <div className="text-center py-10 text-slate-900/40">
                    <UserPlus size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">لا يوجد أصدقاء بعد</p>
                    <p className="text-xs mt-1">أضف أصدقاء للتواصل معهم</p>
                  </div>
                </Card>
            ) : (
              <div className="space-y-1.5">
                {filteredFriends.map((f: any) => (
                  <button
                    key={f._id}
                    onClick={() => onUserClick?.(f.userId)}
                    className="w-full rounded-2xl bg-[#161c24] border border-slate-200 p-3 flex items-center gap-3 active:bg-white/10"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
                      <UserAvatar avatarUrl={f.avatarUrl} name={f.name} className="w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {f.verified && <Check size={11} className="text-blue-400" />}
                        <VipName
                          level={f.vip ?? 0}
                          className="text-slate-900 text-sm font-black truncate"
                        >
                          {f.name}
                        </VipName>
                      </div>
                      <p className="text-slate-900/40 text-[10px]" dir="ltr">ID:{f.userNumber ?? "—"}</p>
                    </div>
                    <ChevronLeft size={16} className="text-slate-900/30" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Overlays ===== */}
      {openThread && (
        <ChatThreadSheet
          conversationId={openThread._id}
          onClose={() => setOpenThread(null)}
        />
      )}
      {showNotifs && <SystemNotifSheet onClose={() => setShowNotifs(false)} />}
      {showFriendReqs && <FriendRequestsSheet onClose={() => setShowFriendReqs(false)} />}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const diff = now.getTime() - ts;
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString("ar-EG", { weekday: "short" });
  }
  return d.toLocaleDateString("ar-EG");
}

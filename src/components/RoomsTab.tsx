// [moorawi-rooms] RoomsTab — Binmo-style rooms discovery
// Tabs: mine | trend | live
// Sub-tabs (mine): recent | following
// Sub-tabs (trend): thisRoom | new | hourly

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import UserAvatar from "./UserAvatar";
import {
  Home, Plus, X, Check, Loader2, Search, Lock,
  Signal, Users, Flame, Sparkles, Clock, Trophy,
} from "lucide-react";

interface Props {
  onEnter: (roomId: Id<"rooms">) => void;
}

type MainTab = "mine" | "trend" | "live";
type MineSub = "recent" | "following";
type TrendSub = "thisRoom" | "new" | "hourly";

type RoomCard = {
  _id: Id<"rooms">;
  name: string;
  coverUrl: string | null;
  welcomeMessage: string;
  memberCount: number;
  roomNumber: number | null;
  ownerName: string;
  ownerAvatar: string | null;
  ownerUserNumber: number | null;
};

export default function RoomsTab({ onEnter }: Props) {
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: deviceId });
  const myRoom = useQuery(api.rooms.myRoom, { tokenOverride: deviceId });
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);

  const [mainTab, setMainTab] = useState<MainTab>("mine");
  const [mineSub, setMineSub] = useState<MineSub>("recent");
  const [trendSub, setTrendSub] = useState<TrendSub>("thisRoom");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Data queries — only run when relevant
  const recent = useQuery(api.rooms.listRecent,
    mainTab === "mine" && mineSub === "recent" ? { tokenOverride: deviceId } : "skip" as any);
  const following = useQuery(api.rooms.listFollowing,
    mainTab === "mine" && mineSub === "following" ? { tokenOverride: deviceId } : "skip" as any);
  const trending = useQuery(api.rooms.listTrending,
    mainTab === "trend" && trendSub === "thisRoom" ? {} : "skip" as any);
  const newRooms = useQuery(api.rooms.listNew,
    mainTab === "trend" && trendSub === "new" ? {} : "skip" as any);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const roomId = await createRoom({ name: newName.trim(), isPrivate: false, tokenOverride: deviceId });
      setNewName(""); setShowCreate(false); onEnter(roomId);
    } catch (e: any) { dialog.alert(e.message || "خطأ"); }
    finally { setIsCreating(false); }
  };

  const handleJoin = async (roomId: Id<"rooms">) => {
    try {
      await joinRoom({ roomId, tokenOverride: deviceId });
      onEnter(roomId);
    } catch (e: any) { dialog.alert(e.message || "خطأ"); }
  };

  const handleCopyId = async () => {
    if (!me?.userNumber) return;
    try { await navigator.clipboard.writeText(String(me.userNumber)); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = String(me.userNumber); document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-md mx-auto">
      {/* ============ Top Header (avatar + ID) ============ */}
      {me && (
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={handleCopyId} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-full px-2.5 py-1 transition active:scale-95">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-purple-500 flex items-center justify-center">
                <UserAvatar avatarUrl={me?.avatarUrl} name={me?.name} className="w-full h-full" />
              </div>
              <span className="text-white text-[11px] font-black" dir="ltr">ID:{me.userNumber}</span>
              {copied && <Check size={10} className="text-green-300" />}
            </button>
          </div>
          <div className="text-white text-sm font-black" dir="rtl">{me.name}</div>
        </div>
      )}

      {/* ============ My Room Button ============ */}
      <div className="px-4 pb-3">
        {myRoom ? (
          <button
            onClick={() => onEnter(myRoom._id)}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-2xl flex items-center justify-center gap-2 font-black text-sm active:scale-95 transition shadow-lg"
          >
            <Home size={18} /> غرفتي
          </button>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full bg-white/10 hover:bg-white/15 border border-white/15 text-white py-2.5 rounded-2xl flex items-center justify-center gap-2 font-black text-sm active:scale-95 transition relative"
          >
            <div className="relative">
              <Home size={18} />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-purple-900">
                <Plus size={8} className="text-white" strokeWidth={3} />
              </div>
            </div>
            إنشاء غرفة جديدة
          </button>
        )}
      </div>

      {/* ============ Main Tabs ============ */}
      <div className="px-4 flex items-center justify-center gap-6 border-b border-white/10">
        <MainTabBtn active={mainTab === "mine"} onClick={() => setMainTab("mine")} label="الخاص بي" />
        <MainTabBtn active={mainTab === "trend"} onClick={() => setMainTab("trend")} label="ترند" />
        <MainTabBtn active={mainTab === "live"} onClick={() => setMainTab("live")} label="لايف" />
      </div>

      {/* ============ Content ============ */}
      <div className="px-4 py-3">
        {mainTab === "mine" && (
          <>
            <div className="flex items-center gap-4 mb-3">
              <SubTabBtn active={mineSub === "recent"} onClick={() => setMineSub("recent")} label="حديث" />
              <SubTabBtn active={mineSub === "following"} onClick={() => setMineSub("following")} label="المتابعين" />
            </div>
            {mineSub === "recent" && <RoomList rooms={recent} onEnter={handleJoin} empty="لا توجد غرف زرتها بعد" />}
            {mineSub === "following" && <RoomList rooms={following} onEnter={handleJoin} empty="لا تتابع أحداً بعد" />}
          </>
        )}

        {mainTab === "trend" && (
          <>
            <div className="flex items-center justify-center gap-3 mb-3">
              <SubTabIcon active={trendSub === "thisRoom"} onClick={() => setTrendSub("thisRoom")} icon={Home} label="هذه الغرفة" />
              <SubTabIcon active={trendSub === "new"} onClick={() => setTrendSub("new")} icon={Sparkles} label="جديد" badge="NEW" />
              <SubTabIcon active={trendSub === "hourly"} onClick={() => setTrendSub("hourly")} icon={Flame} label="تصنيف الساعات" />
            </div>
            {trendSub === "thisRoom" && <RoomGrid rooms={trending} onEnter={handleJoin} empty="لا توجد غرف" />}
            {trendSub === "new" && <RoomGrid rooms={newRooms} onEnter={handleJoin} empty="لا توجد غرف جديدة" />}
            {trendSub === "hourly" && (
              <div className="text-center py-12 text-white/50">
                <Trophy size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold">تصنيف الساعات</p>
                <p className="text-xs mt-1">قريباً</p>
              </div>
            )}
          </>
        )}

        {mainTab === "live" && (
          <div className="text-center py-12 text-white/50">
            <Signal size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold">البث المباشر</p>
            <p className="text-xs mt-1">قريباً</p>
          </div>
        )}
      </div>

      {/* ============ Create Room Modal ============ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={() => setShowCreate(false)}>
          <div className="bg-gradient-to-b from-slate-900 to-black rounded-3xl p-6 max-w-sm w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-lg font-black">غرفة جديدة</h2>
              <button onClick={() => setShowCreate(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="اسم الغرفة"
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400 mb-4"
              maxLength={40}
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-2xl font-black disabled:opacity-50 active:scale-95 transition"
            >
              {isCreating ? "جاري الإنشاء..." : "إنشاء"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================ Sub-components

function MainTabBtn({ active, onClick, label }: any) {
  return (
    <button onClick={onClick} className={`relative py-3 text-sm font-black transition ${active ? "text-white" : "text-white/50"}`}>
      {label}
      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />}
    </button>
  );
}

function SubTabBtn({ active, onClick, label }: any) {
  return (
    <button onClick={onClick} className={`relative pb-1.5 text-xs font-black transition ${active ? "text-white" : "text-white/45"}`}>
      {label}
      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-emerald-400" />}
    </button>
  );
}

function SubTabIcon({ active, onClick, icon: Icon, label, badge }: any) {
  return (
    <button onClick={onClick} className={`relative flex items-center gap-1 px-3 py-1.5 rounded-full border transition text-[11px] font-black ${
      active ? "bg-white/15 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/60"
    }`}>
      <Icon size={12} />
      {label}
      {badge && <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded text-[7px] bg-red-500 text-white font-black">{badge}</span>}
    </button>
  );
}

// ============================ Room List (compact, one column)
function RoomList({ rooms, onEnter, empty }: any) {
  if (rooms === undefined) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-white/40" size={24} /></div>;
  }
  if (rooms.length === 0) {
    return <div className="text-center py-12 text-white/40 text-sm">{empty}</div>;
  }
  return (
    <div className="space-y-2.5">
      {rooms.map((r: RoomCard) => (
        <button
          key={r._id}
          onClick={() => onEnter(r._id)}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition text-right"
        >
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-purple-900/40 flex-shrink-0 relative">
            {r.coverUrl ? (
              <img src={r.coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40 text-lg font-black">
                {r.name?.[0] || "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white text-sm font-black truncate">{r.name}</p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-white/50 text-[10px] font-mono" dir="ltr">
                {r.roomNumber ? `ID:${r.roomNumber}` : ""}
              </span>
              <span className="text-emerald-400 text-[10px] font-black flex items-center gap-0.5">
                <Signal size={10} /> {r.memberCount}
              </span>
            </div>
            {r.welcomeMessage && (
              <p className="text-white/40 text-[10px] truncate mt-0.5">{r.welcomeMessage}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================ Room Grid (two columns, Binmo-style)
function RoomGrid({ rooms, onEnter, empty }: any) {
  if (rooms === undefined) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-white/40" size={24} /></div>;
  }
  if (rooms.length === 0) {
    return <div className="text-center py-12 text-white/40 text-sm">{empty}</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {rooms.map((r: RoomCard) => (
        <button
          key={r._id}
          onClick={() => onEnter(r._id)}
          className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl overflow-hidden flex flex-col active:scale-[0.98] transition text-right"
        >
          {/* Cover image square */}
          <div className="aspect-square bg-purple-900/40 relative">
            {r.coverUrl ? (
              <img src={r.coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-3xl font-black">
                {r.name?.[0] || "?"}
              </div>
            )}
            {/* Member count badge */}
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Signal size={9} className="text-emerald-400" />
              <span className="text-white text-[10px] font-black">{r.memberCount}</span>
            </div>
          </div>
          {/* Info */}
          <div className="p-2">
            <p className="text-white text-[11px] font-black truncate">{r.name}</p>
            {r.welcomeMessage && (
              <p className="text-white/45 text-[9px] truncate mt-0.5">{r.welcomeMessage}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// [moorawi-rooms] RoomsTab — Ezo room discovery
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import UserAvatar from "./UserAvatar";
import RoomSearchScreen from "./RoomSearchScreen";
import LiveListScreen from "./live/LiveListScreen";
import LiveSetupSheet from "./live/LiveSetupSheet";
import { UserName } from "./UserBadges";
import Card from "./ui/Card";
import RankBadge from "./ui/RankBadge";
import {
  Home, Plus, X, Check, Loader2, Search, Lock,
  Users, Flame, Sparkles, Clock, Crown, Heart,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { getActiveToken } from "../lib/session";

interface Props {
  onEnter: (roomId: Id<"rooms">) => void;
  onEnterLive?: (streamId: string) => void;
  onStartLive?: (streamId: string) => void;
}

type MainTab = "mine" | "trend" | "live";
type MineSub = "recent" | "following";

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function RoomsTab({ onEnter, onEnterLive, onStartLive }: Props) {
  const deviceId = getDeviceId();
  const me = useQuery(api.profiles.me, { tokenOverride: getActiveToken() ?? deviceId });
  const myRoom = useQuery(api.rooms.myRoom, { tokenOverride: getActiveToken() ?? deviceId });
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);

  const [mainTab, setMainTab] = useState<MainTab>("mine");
  const [mineSub, setMineSub] = useState<MineSub>("recent");
  const [showCreate, setShowCreate] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLiveSetup, setShowLiveSetup] = useState(false);
  const myLive = useQuery(api.live.myLive, { tokenOverride: getActiveToken() ?? deviceId });
  const endMyStream = useMutation(api.live.endMyActiveStream);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const recent = useQuery(api.rooms.listRecent,
    mainTab === "mine" && mineSub === "recent" ? { tokenOverride: getActiveToken() ?? deviceId } : "skip" as any);
  const following = useQuery(api.rooms.listFollowing,
    mainTab === "mine" && mineSub === "following" ? { tokenOverride: getActiveToken() ?? deviceId } : "skip" as any);

  const handleCopyId = () => {
    if (!me?.userNumber) return;
    navigator.clipboard.writeText(String(me.userNumber)).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const handleJoin = async (roomId: Id<"rooms">) => {
    try {
      await joinRoom({ roomId, tokenOverride: getActiveToken() ?? deviceId });
      onEnter(roomId);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الدخول");
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const roomId = await createRoom({ name: newName.trim(), isPrivate: false, tokenOverride: getActiveToken() ?? deviceId });
      setShowCreate(false);
      setNewName("");
      onEnter(roomId);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الإنشاء");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* ============ Top Header with banner bg ============ */}
      <div
        className="sticky top-0 z-30 w-full flex items-end px-4 pb-3"
        style={{
          height: "95px",
          backgroundImage: "url(/ui/top-banner-purple.png)",
          backgroundSize: "100% 100%",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="w-full flex items-center justify-between">
          <button
            onClick={() => setShowSearch(true)}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition"
          >
            <Search size={16} />
          </button>
          <div className="flex items-center gap-5" dir="rtl">
            <TopTabBtn active={mainTab === "mine"}  onClick={() => setMainTab("mine")}  label="الخاص بي" />
            <TopTabBtn active={mainTab === "trend"} onClick={() => setMainTab("trend")} label="ترند" />
            <TopTabBtn active={mainTab === "live"}  onClick={() => setMainTab("live")}  label="لايف" />
          </div>
          <button
            onClick={() => myRoom ? onEnter(myRoom._id) : setShowCreate(true)}
            className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition"
          >
            <Home size={16} />
          </button>
        </div>
      </div>

      {/* ============ Content ============ */}
      <div className="px-4 py-3">
        {mainTab === "mine" && (
          <MineTab
            mineSub={mineSub}
            setMineSub={setMineSub}
            recent={recent}
            following={following}
            myRoom={myRoom}
            onEnter={handleJoin}
          />
        )}
        {mainTab === "trend" && <TrendTab onEnter={handleJoin} />}
        {mainTab === "live" && onEnterLive && (
          <>
            {/* Active stream banner */}
            {myLive && onStartLive && (
              <div className="w-full mb-3 rounded-2xl bg-red-500/15 border border-red-400/40 p-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-white text-xs font-black">أنتِ تبثين الآن</div>
                  <div className="text-white/60 text-[10px] truncate">{myLive.title}</div>
                </div>
                <button
                  onClick={() => onStartLive(myLive._id)}
                  className="px-3 py-1.5 rounded-full bg-red-500 text-white text-[10px] font-black active:scale-95"
                >
                  متابعة
                </button>
                <button
                  onClick={async () => {
                    try {
                      await endMyStream({ tokenOverride: getActiveToken() ?? deviceId });
                    } catch (e: any) {
                      dialog.alert(e?.message || "فشل");
                    }
                  }}
                  className="px-2 py-1.5 rounded-full bg-black/60 text-white/70 text-[10px] font-black active:scale-95"
                >
                  إنهاء
                </button>
              </div>
            )}

            {/* Start live button — only if no active stream */}
            {onStartLive && !myLive && (
              <button
                onClick={() => setShowLiveSetup(true)}
                className="w-full mb-3 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-black text-sm shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                🔴 ابدئي البث المباشر
              </button>
            )}
            <LiveListScreen onEnter={onEnterLive} />
          </>
        )}
      </div>

      {/* ============ Search Screen ============ */}
      {showSearch && (
        <RoomSearchScreen
          onClose={() => setShowSearch(false)}
          onEnter={onEnter}
        />
      )}

      {/* ============ Create Modal ============ */}
      {showCreate && (
        <CreateRoomModal
          value={newName}
          onChange={setNewName}
          onCancel={() => { setShowCreate(false); setNewName(""); }}
          onConfirm={handleCreate}
          busy={isCreating}
        />
      )}

      {/* Live setup */}
      {showLiveSetup && onStartLive && (
        <LiveSetupSheet
          onClose={() => setShowLiveSetup(false)}
          onStarted={(id) => {
            setShowLiveSetup(false);
            onStartLive(id);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// MINE TAB
// ============================================================
function MineTab({ mineSub, setMineSub, recent, following, myRoom, onEnter }: any) {
  return (
    <>
      {/* My room info card */}
      {myRoom && (
        <div className="mb-4">
          <MyRoomCard room={myRoom} onEnter={onEnter} />
        </div>
      )}

      {/* Sub tabs */}
      <div className="flex items-center gap-4 mb-3">
        <SubTabBtn active={mineSub === "recent"} onClick={() => setMineSub("recent")} label="حديث" />
        <SubTabBtn active={mineSub === "following"} onClick={() => setMineSub("following")} label="المتابعين" />
      </div>

      {mineSub === "recent" && <RoomList rooms={recent} onEnter={onEnter} empty="لا توجد غرف زرتها بعد" />}
      {mineSub === "following" && <RoomList rooms={following} onEnter={onEnter} empty="لا تتابع أحداً بعد" />}
    </>
  );
}

// ============================================================
// MY ROOM CARD
// ============================================================
function MyRoomCard({ room, onEnter }: any) {
  return (
<Card
      interactive
      onClick={() => onEnter(room._id)}
      tone="purple"
      padding="md"
    >
      {/* Cover */}
      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/40 flex-shrink-0 flex items-center justify-center">
        {room.coverUrl ? (
          <img src={room.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Home size={26} className="text-purple-300/60" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-right">
        <p className="text-white text-sm font-black truncate">{room.name}</p>
        <p className="text-white/50 text-[10px]" dir="ltr">ID:{room.roomNumber ?? "—"}</p>
        <div className="flex items-center gap-3 mt-1 justify-end">
          <span className="text-emerald-300 text-[10px] flex items-center gap-1">
            <Users size={10} /> {room.memberCount ?? 0} متصل
          </span>
        </div>
      </div>

      <ChevronLeft size={18} className="text-white/40 flex-shrink-0" />
    </Card>
  );
}

// ============================================================
// TREND TAB
// ============================================================
function TrendTab({ onEnter }: { onEnter: (id: Id<"rooms">) => void }) {
  return (
    <div className="space-y-4">
      {/* Banners */}
      <BannerSlideshow />

      {/* Rankings row */}
      <div className="grid grid-cols-2 gap-3">
        <WealthRankingBox />
        <CpRankingBox />
      </div>

      {/* Rooms grid */}
      <RoomsWithStatsGrid onEnter={onEnter} />
    </div>
  );
}

// ============================================================
// LIVE TAB
// ============================================================
function LiveTab() {
  return (
    <div className="text-center py-16 text-white/50">
      <Flame size={48} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm font-bold">البث المباشر</p>
      <p className="text-xs mt-1">قريباً</p>
    </div>
  );
}

// ============================================================
// BANNER SLIDESHOW
// ============================================================
function BannerSlideshow() {
  const banners = useQuery(api.banners.list);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % banners.length);
    }, 4500);
    return () => clearInterval(t);
  }, [banners]);

  useEffect(() => {
    if (banners && idx >= banners.length) setIdx(0);
  }, [banners, idx]);

  if (!banners || banners.length === 0) {
    return (
<Card tone="purple" padding="lg">
          <div className="aspect-video flex items-center justify-center">
            <p className="text-white/40 text-xs">لا توجد إعلانات</p>
          </div>
        </Card>
    );
  }

  const banner = banners[idx];

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40">
      <img src={banner.imageUrl} alt={banner.title ?? ""} className="absolute inset-0 w-full h-full object-cover" />

      {/* Nav buttons */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % banners.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {banners.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? "bg-white w-4" : "bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// WEALTH RANKING BOX
// ============================================================
function WealthRankingBox() {
  const ranking = useQuery(api.rooms.wealthRanking, { period: "month", limit: 3 });

  const order = [1, 0, 2]; // silver, gold, bronze (left to right)
  const positions = ["silver", "gold", "bronze"];

  return (
<Card tone="gold" padding="md">
      <div className="flex items-center justify-center gap-1 mb-2">
        <Crown size={14} className="text-amber-300" />
        <p className="text-white text-xs font-black">ترتيب الثروة</p>
      </div>
      <div className="flex items-end justify-center gap-2 h-24">
        {positions.map((pos, idx) => {
          const item = ranking?.[order[idx]];
          const isGold = pos === "gold";
          const isSilver = pos === "silver";
          const size = isGold ? "w-14 h-14" : "w-11 h-11";
          const borderColor = isGold ? "border-amber-300" : isSilver ? "border-slate-200" : "border-orange-500";
          const label = isGold ? "1" : isSilver ? "2" : "3";
          return (
            <div key={pos} className={`flex flex-col items-center ${isGold ? "mb-1" : ""}`}>
              <div className={`${size} rounded-full overflow-hidden border-2 ${borderColor} bg-purple-700 flex items-center justify-center`}>
                {item?.avatarUrl ? (
                  <img src={item.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-black">{item?.name?.[0] ?? "?"}</span>
                )}
              </div>
              <span className={`text-[8px] font-black text-white mt-0.5 ${isGold ? "text-amber-200" : isSilver ? "text-slate-100" : "text-orange-300"}`}>
                #{label}
              </span>
            </div>
          );
        })}
      </div>
      {(!ranking || ranking.length === 0) && (
        <p className="text-white/40 text-[9px] text-center mt-1">لا توجد بيانات</p>
      )}
    </Card>
  );
}

// ============================================================
// CP RANKING BOX
// ============================================================
function CpRankingBox() {
  const ranking = useQuery(api.rooms.cpRanking);
  const pair = ranking?.[0];

  return (
<Card tone="pink" padding="md">
      <div className="flex items-center justify-center gap-1 mb-2">
        <Heart size={14} className="text-pink-300" fill="currentColor" />
        <p className="text-white text-xs font-black">كوبل</p>
      </div>
      <div className="flex items-center justify-center gap-2 h-24">
        {pair ? (
          <>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-pink-300 bg-purple-700 flex items-center justify-center">
                {pair.user1.avatarUrl ? (
                  <img src={pair.user1.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-black">{pair.user1.name[0]}</span>
                )}
              </div>
              <p className="text-white/70 text-[8px] mt-0.5 truncate max-w-[48px]">{pair.user1.name}</p>
            </div>
            <Heart size={16} className="text-pink-400 mb-4" fill="currentColor" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-pink-300 bg-purple-700 flex items-center justify-center">
                {pair.user2.avatarUrl ? (
                  <img src={pair.user2.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-black">{pair.user2.name[0]}</span>
                )}
              </div>
              <p className="text-white/70 text-[8px] mt-0.5 truncate max-w-[48px]">{pair.user2.name}</p>
            </div>
          </>
        ) : (
          <p className="text-white/40 text-[9px]">لا يوجد كوبل</p>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// ROOMS WITH STATS GRID (top 3 ranked)
// ============================================================
function RoomsWithStatsGrid({ onEnter }: { onEnter: (id: Id<"rooms">) => void }) {
  const rooms = useQuery(api.rooms.publicRoomsWithStats);

  if (rooms === undefined) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin text-white/40" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-10 text-white/50">
        <Home size={40} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm font-bold">لا توجد غرف</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {rooms.map((r: any) => (
        <RoomCardGrid key={r._id} room={r} onEnter={onEnter} />
      ))}
    </div>
  );
}

function RoomCardGrid({ room, onEnter }: { room: any; onEnter: (id: Id<"rooms">) => void }) {
  const showRank = room.rank <= 3;

  return (
    <button
      onClick={() => onEnter(room._id)}
      className="relative rounded-2xl overflow-hidden aspect-square bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-white/10 active:scale-95 transition"
    >
      {/* Cover */}
      {room.coverUrl ? (
        <img src={room.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Home size={40} className="text-purple-300/40" />
        </div>
      )}

      {/* Dark overlay bottom */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

      {/* Rank badge (top-left) */}
      {showRank && (
          <div className="absolute top-1.5 left-1.5">
            <RankBadge rank={room.rank} size="sm" />
          </div>
        )}

      {/* Bottom info */}
      <div className="absolute inset-x-0 bottom-0 p-2 text-right">
        <p className="text-white text-[11px] font-black truncate">{room.name}</p>
        <div className="flex items-center gap-2 mt-0.5 justify-end">
          <span className="text-emerald-300 text-[9px] flex items-center gap-0.5">
            <Users size={8} /> {room.onlineCount}
          </span>
          <span className="text-white/50 text-[9px]">ID:{room.roomNumber ?? "—"}</span>
        </div>
      </div>
    </button>
  );
}

// ============================================================
// ROOM LIST (Mine tab — smaller rows)
// ============================================================
function RoomList({ rooms, onEnter, empty }: any) {
  if (rooms === undefined) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-white/40" /></div>;
  }
  if (rooms.length === 0) {
    return (
<Card tone="default" padding="lg">
          <div className="text-center py-6 text-white/40">
            <p className="text-xs">{empty}</p>
          </div>
        </Card>
    );
  }
  return (
    <div className="space-y-2">
      {rooms.map((r: any) => (
        <button
          key={r._id}
          onClick={() => onEnter(r._id)}
          className="w-full rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center gap-3 active:scale-95 transition"
        >
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 flex items-center justify-center">
            {r.coverUrl ? (
              <img src={r.coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Home size={20} className="text-purple-300/50" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-white text-xs font-black truncate">{r.name}</p>
            <p className="text-white/50 text-[10px] truncate">{r.welcomeMessage || "—"}</p>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <span className="text-emerald-300 text-[9px] flex items-center gap-0.5">
              <Users size={9} /> {r.memberCount ?? 0}
            </span>
            <span className="text-white/40 text-[9px]">ID:{r.roomNumber ?? "—"}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// CREATE ROOM MODAL
// ============================================================
function CreateRoomModal({ value, onChange, onCancel, onConfirm, busy }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onCancel}>
      <div className="bg-gradient-to-b from-slate-900 to-black rounded-3xl p-6 max-w-sm w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-black">غرفة جديدة</h2>
          <button onClick={onCancel} className="text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        <input
          autoFocus
          type="text"
          placeholder="اسم الغرفة"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={30}
          className="w-full bg-white/10 border border-white/20 rounded-2xl p-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-400 mb-4"
        />
        <button
          onClick={onConfirm}
          disabled={busy || !value.trim()}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-2xl font-black disabled:opacity-50 active:scale-95 transition"
        >
          {busy ? <Loader2 size={18} className="animate-spin mx-auto" /> : "إنشاء"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SMALL BUTTONS
// ============================================================
function TopTabBtn({ active, onClick, label }: any) {
  return (
    <button onClick={onClick} className={`relative pb-1 text-sm font-black transition ${active ? "text-white" : "text-white/50"}`}>
      {label}
      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />}
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

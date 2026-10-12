// [ezo-discover] تبويب اكتشاف
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import UserAvatar from "./UserAvatar";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Loader2, Home, Users, TrendingUp, Heart, Crown, Sparkles,
  Check, Flame, Eye,
} from "lucide-react";

interface Props {
  onEnterRoom: (roomId: Id<"rooms">) => void;
  onUserClick?: (id: any) => void;
}

export default function DiscoverTab({ onEnterRoom, onUserClick }: Props) {
  const data = useQuery(api.discover.overview, {});

  if (data === undefined) {
    return (
      <div className="flex justify-center py-20 min-h-screen">
        <Loader2 size={32} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-24 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-slate-950/95 to-slate-950/80 backdrop-blur-xl px-4 py-3 border-b border-white/10">
        <h1 className="text-white text-lg font-black">اكتشاف</h1>
        <p className="text-white/50 text-[11px] mt-0.5">أفضل الغرف والأعضاء في Ezo</p>
      </div>

      {/* ===== Top Rooms ===== */}
      <Section
        icon={Flame}
        color="text-orange-400"
        title="الغرف الرائجة"
        count={data.rooms.length}
      >
        <div className="grid grid-cols-2 gap-3">
          {data.rooms.map((r: any, i: number) => (
            <button
              key={r._id}
              onClick={() => onEnterRoom(r._id)}
              className="relative rounded-2xl overflow-hidden aspect-square bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-white/10 active:scale-95 transition"
            >
              {r.coverUrl ? (
                <img src={r.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Home size={40} className="text-purple-300/40" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
              {i < 3 && (
                <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-black shadow-lg border-2 border-white/40 ${
                  i === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-500" :
                  i === 1 ? "bg-gradient-to-br from-slate-200 to-slate-400" :
                  "bg-gradient-to-br from-orange-500 to-amber-700"
                }`}>
                  {i + 1}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2 text-right">
                <p className="text-white text-[11px] font-black truncate">{r.name}</p>
                <div className="flex items-center gap-2 mt-0.5 justify-end">
                  <span className="text-emerald-300 text-[9px] flex items-center gap-0.5">
                    <Users size={8} /> {r.onlineCount}
                  </span>
                  <span className="text-white/50 text-[9px]">ID:{r.roomNumber ?? "—"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* ===== Top Wealth ===== */}
      <Section icon={TrendingUp} color="text-amber-300" title="أعلى ثراء" count={data.topWealth.length}>
        <div className="grid grid-cols-3 gap-2">
          {data.topWealth.map((u: any, i: number) => (
            <UserCard key={u.userId} user={u} rank={i + 1} onClick={() => onUserClick?.(u.userId)} color="text-amber-300" />
          ))}
        </div>
      </Section>

      {/* ===== Top Charm ===== */}
      <Section icon={Heart} color="text-pink-300" title="أعلى جاذبية" count={data.topCharm.length}>
        <div className="grid grid-cols-3 gap-2">
          {data.topCharm.map((u: any, i: number) => (
            <UserCard key={u.userId} user={u} rank={i + 1} onClick={() => onUserClick?.(u.userId)} color="text-pink-300" />
          ))}
        </div>
      </Section>

      {/* ===== New Users ===== */}
      <Section icon={Sparkles} color="text-emerald-300" title="أعضاء جدد" count={data.newUsers.length}>
        <div className="grid grid-cols-3 gap-2">
          {data.newUsers.map((u: any) => (
            <UserCard key={u.userId} user={u} onClick={() => onUserClick?.(u.userId)} color="text-emerald-300" />
          ))}
        </div>
      </Section>
    </div>
  );
}

// ============================================================
function Section({ icon: Icon, color, title, count, children }: any) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/40 text-xs">{count}</span>
        <div className="flex items-center gap-2">
          <h2 className="text-white text-sm font-black">{title}</h2>
          <Icon size={16} className={color} />
        </div>
      </div>
      {children}
    </div>
  );
}

function UserCard({ user, rank, onClick, color }: any) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition"
    >
      <div className="relative">
        <div className={`w-16 h-16 rounded-full overflow-hidden bg-purple-700 border-2 ${
          rank === 1 ? "border-amber-400" : rank === 2 ? "border-slate-300" : rank === 3 ? "border-orange-500" : "border-white/15"
        }`}>
          <UserAvatar avatarUrl={user.avatarUrl} name={user.name} className="w-full h-full" />
        </div>
        {rank && rank <= 3 && (
          <div className={`absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-black border-2 border-slate-900 ${
            rank === 1 ? "bg-gradient-to-br from-amber-400 to-yellow-500" :
            rank === 2 ? "bg-gradient-to-br from-slate-200 to-slate-400" :
            "bg-gradient-to-br from-orange-500 to-amber-700"
          }`}>
            {rank}
          </div>
        )}
        {user.verified && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border-2 border-slate-900">
            <Check size={10} className="text-white" strokeWidth={3} />
          </div>
        )}
      </div>
      <p className="text-white text-[10px] font-black truncate max-w-[72px]">{user.name}</p>
    </button>
  );
}

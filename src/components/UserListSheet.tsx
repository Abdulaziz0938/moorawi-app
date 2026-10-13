import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useBackButton } from "../lib/hooks/useBackButton";
import { ChevronRight, Loader2, Users } from "lucide-react";
import VipAvatar from "./ui/VipAvatar";
import { UserName } from "./UserBadges";

interface Props {
  userId: string;
  mode: "followers" | "following" | "fans";
  onClose: () => void;
  onUserClick?: (id: string) => void;
}

export default function UserListSheet({ userId, mode, onClose, onUserClick }: Props) {
  useBackButton(true, onClose);

  const followers = useQuery(
    api.follows.listFollowers,
    mode === "followers" ? { userId: userId as Id<"users">, limit: 100 } : ("skip" as any)
  );
  const following = useQuery(
    api.follows.listFollowing,
    mode === "following" ? { userId: userId as Id<"users">, limit: 100 } : ("skip" as any)
  );
  const fans = useQuery(
    api.follows.listFans,
    mode === "fans" ? { userId: userId as Id<"users">, limit: 100 } : ("skip" as any)
  );

  const list = mode === "followers" ? followers : mode === "following" ? following : fans;
  const titles = { followers: "المتابعين", following: "يتابعهم", fans: "المعجبين" };
  const empties = { followers: "لا يوجد متابعون بعد", following: "لا يتابع أحداً بعد", fans: "لا يوجد معجبون بعد" };

  return (
    <div className="fixed inset-0 z-[180] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95"
        >
          <ChevronRight size={20} />
        </button>
        <Users size={18} className="text-white/70" />
        <h1 className="text-white text-base font-black flex-1">{titles[mode]}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {list === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-white/40" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-white/40">
            <Users size={48} className="mb-3 opacity-30" />
            <p className="text-sm">{empties[mode]}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((u: any) => (
              <button
                key={u._id}
                onClick={() => onUserClick?.(u._id)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-3 active:bg-white/10"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-700 flex items-center justify-center flex-shrink-0">
                  <VipAvatar src={u.avatarUrl} name={u.name} size={48} vip={u.vip ?? 0} />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white text-sm font-black truncate">{u.name ?? "—"}</p>
                  <p className="text-white/40 text-[10px]" dir="ltr">ID:{u.userNumber ?? "—"}</p>
                </div>
                <ChevronRight size={16} className="text-white/30 rotate-180" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// [moorawi] Members Sheet — list of all room members
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { X, Users } from "lucide-react";
import MemberRow from "./MemberRow";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
}

export default function MembersSheet({ roomId, onClose, onUserClick }: Props) {
  const members = useQuery(api.rooms.members, { roomId });
  const seats = useQuery(api.mics.state, { roomId });

  if (!members) {
    return null;
  }

  // Sort: owner → moderator → speaker → listener
  const roleOrder: Record<string, number> = { owner: 0, moderator: 1, speaker: 2, listener: 3 };
  const sorted = [...members].sort((a, b) => (roleOrder[a.role] ?? 4) - (roleOrder[b.role] ?? 4));

  return (
    <div className="fixed inset-0 z-[110] flex items-end" dir="rtl">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-md mx-auto rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(30,27,75,0.95) 0%, rgba(15,12,40,0.98) 100%)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderTop: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-white/80" />
            <h2 className="text-sm font-black text-white">الأعضاء ({members.length})</h2>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sorted.map((m) => {
            const seat = seats?.find((s: any) => s.userId === m.userId);
            return (
              <MemberRow
                key={m._id}
                userId={m.userId}
                name={m.name}
                avatarUrl={m.avatarUrl}
                userNumber={m.userNumber}
                vip={m.vip}
                charmLevel={m.charmLevel}
                adminRole={m.adminRole}
                roomRole={m.role as any}
                seatIndex={seat?.seatIndex ?? null}
                onClick={() => onUserClick?.(m.userId)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

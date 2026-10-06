import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Mic, LogOut, Loader2 } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onLeave: () => void;
}

export default function RoomView({ roomId, onLeave }: Props) {
  const room = useQuery(api.rooms.get, { roomId });
  const seats = useQuery(api.mics.state, { roomId });
  const takeSeat = useMutation(api.mics.takeSeat);
  const leaveSeat = useMutation(api.mics.leaveSeat);

  if (!room || !seats) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  const handleSeatClick = async (seatIndex: number, userId: string | undefined) => {
    try {
      if (userId) {
        // Seat is occupied - for now, do nothing (or show profile)
        return;
      }
      await takeSeat({ roomId, seatIndex });
    } catch (e: any) {
      alert("خطأ: " + (e.message || "غير معروف"));
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <header className="flex items-center justify-between text-white mb-6 pt-4">
        <button onClick={onLeave} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
          <LogOut size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold">{room.name}</h1>
          <p className="text-xs opacity-70">{room.memberCount} عضو</p>
        </div>
        <div className="w-10" />
      </header>

      <div className="bg-white/5 rounded-2xl p-4 mb-6">
        <h2 className="text-white text-sm mb-4 flex items-center gap-2">
          <Mic size={16} /> المايكات
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {seats.map((seat) => (
            <div
              key={seat._id}
              onClick={() => handleSeatClick(seat.seatIndex, seat.userId)}
              className={`aspect-square rounded-full flex flex-col items-center justify-center text-white border-2 transition cursor-pointer ${
                seat.userId
                  ? "bg-purple-500 border-purple-300"
                  : "bg-white/10 border-white/30 hover:bg-white/20"
              }`}
            >
              {seat.userId ? (
                <>
                  <Mic size={18} />
                  <span className="text-[10px] mt-1 truncate max-w-full px-1">
                    {seat.userName ?? "..."}
                  </span>
                </>
              ) : (
                <span className="text-2xl opacity-50">+</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => leaveSeat({ roomId })}
        className="w-full bg-red-500/80 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition"
      >
        مغادرة المايك
      </button>
    </div>
  );
}

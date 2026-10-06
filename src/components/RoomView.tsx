import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Mic, MicOff, LogOut, Loader2 } from "lucide-react";
import { agoraManager } from "../lib/agora";

interface Props {
  roomId: Id<"rooms">;
  onLeave: () => void;
}

export default function RoomView({ roomId, onLeave }: Props) {
  const room = useQuery(api.rooms.get, { roomId });
  const seats = useQuery(api.mics.state, { roomId });
  const myRole = useQuery(api.mics.myRole, { roomId });
  const takeSeat = useMutation(api.mics.takeSeat);
  const leaveSeat = useMutation(api.mics.leaveSeat);
  const getToken = useAction(api.voice.getToken);

  const [agoraConnected, setAgoraConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);

  const mySeat = seats?.find((s) => s.userName !== null && s.userName !== undefined && s.userId);

  useEffect(() => {
    if (!room || joinedRef.current) return;
    joinedRef.current = true;

    (async () => {
      try {
        const tokenData = await getToken({ roomId });
        await agoraManager.join(
          tokenData.appId,
          roomId,
          tokenData.token,
          tokenData.account,
          () => {},
          () => {},
        );
        setAgoraConnected(true);
      } catch (e: any) {
        setError(e?.message || "فشل الاتصال بالصوت");
      }
    })();

    return () => {
      agoraManager.leave();
      joinedRef.current = false;
    };
  }, [room, roomId, getToken]);

  // Publish/unpublish microphone based on seat status
  useEffect(() => {
    if (!agoraConnected) return;
    const onSeat = seats?.some((s) => s.userId && s.userName && myRole === "speaker");
    if (onSeat && !isMuted) {
      agoraManager.publishMicrophone().catch((e) => console.error(e));
    }
    return () => {
      // Cleanup on unmount
    };
  }, [agoraConnected, myRole, isMuted, seats]);

  if (!room || !seats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white" size={40} />
      </div>
    );
  }

  const handleSeatClick = async (seatIndex: number, userId: string | undefined) => {
    try {
      if (userId) return;
      await takeSeat({ roomId, seatIndex });
    } catch (e: any) {
      alert(e?.message || "خطأ");
    }
  };

  const handleLeaveSeat = async () => {
    await leaveSeat({ roomId });
    await agoraManager.unpublishMicrophone();
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    agoraManager.muteMicrophone(next);
  };

  const handleLeave = async () => {
    await agoraManager.leave();
    onLeave();
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <header className="flex items-center justify-between text-white mb-6 pt-4">
        <button onClick={handleLeave} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition">
          <LogOut size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold">{room.name}</h1>
          <p className="text-xs opacity-70">{room.memberCount} عضو</p>
          {agoraConnected && (
            <p className="text-[10px] text-green-300 mt-1">● متصل بالصوت</p>
          )}
          {error && (
            <p className="text-[10px] text-red-300 mt-1">{error}</p>
          )}
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

      {myRole === "speaker" || myRole === "owner" || myRole === "moderator" ? (
        <div className="flex gap-3">
          <button
            onClick={handleToggleMute}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition ${
              isMuted ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isMuted ? <MicOff className="inline mr-2" size={18} /> : <Mic className="inline mr-2" size={18} />}
            {isMuted ? "إلغاء الكتم" : "كتم الصوت"}
          </button>
          <button
            onClick={handleLeaveSeat}
            className="flex-1 bg-red-500/80 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition"
          >
            مغادرة المايك
          </button>
        </div>
      ) : (
        <p className="text-white text-center text-sm opacity-70">
          اضغط على أي مايك للانضمام إلى الحديث
        </p>
      )}
    </div>
  );
}

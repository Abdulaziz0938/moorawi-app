// [ezo-live] بطاقة البث المباشر في القائمة
import { Users, Heart } from "lucide-react";
import VipAvatar from "../ui/VipAvatar";

interface LiveStream {
  _id: string;
  hostId: string;
  hostName: string;
  hostAvatarUrl?: string;
  hostVipLevel: number;
  title: string;
  coverUrl?: string;
  viewerCount: number;
  totalLikes: number;
  pkActive: boolean;
  coHostName?: string;
}

interface Props {
  stream: LiveStream;
  onEnter: () => void;
}

export default function LiveTile({ stream, onEnter }: Props) {
  return (
    <button
      onClick={onEnter}
      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden active:scale-95 transition border border-white/10 group"
      dir="rtl"
    >
      {stream.coverUrl ? (
        <img
          src={stream.coverUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : stream.hostAvatarUrl ? (
        <img
          src={stream.hostAvatarUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-pink-700" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />

      <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 px-2 py-0.5 rounded-full shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-white text-[9px] font-black">LIVE</span>
      </div>

      {stream.pkActive && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500 px-2 py-0.5 rounded-full shadow-lg">
          <span className="text-black text-[9px] font-black">PK ⚔️</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-7 h-7 flex-shrink-0">
            <VipAvatar
              src={stream.hostAvatarUrl}
              name={stream.hostName}
              size={28}
              vip={stream.hostVipLevel}
              ring={stream.hostVipLevel === 0}
            />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="text-white text-[11px] font-black truncate">
              {stream.hostName}
            </div>
            {stream.pkActive && stream.coHostName && (
              <div className="text-amber-300 text-[8px] font-bold truncate">
                vs {stream.coHostName}
              </div>
            )}
          </div>
        </div>

        <div className="text-white/90 text-[10px] font-bold truncate text-right mb-1.5">
          {stream.title}
        </div>

        <div className="flex items-center justify-between text-[9px]">
          <span className="flex items-center gap-1 text-white/70">
            <Heart size={10} className="text-pink-400" fill="currentColor" />
            <span className="font-black tabular-nums">
              {stream.totalLikes.toLocaleString()}
            </span>
          </span>
          <span className="flex items-center gap-1 text-white/90">
            <Users size={10} />
            <span className="font-black tabular-nums">
              {stream.viewerCount.toLocaleString()}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}

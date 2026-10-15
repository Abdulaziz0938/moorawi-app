// [ezo-live-pk] إعلان الفائزة في PK
import { Trophy, Swords } from "lucide-react";
import VipAvatar from "../ui/VipAvatar";

interface Props {
  hostName: string;
  hostAvatarUrl?: string;
  hostVipLevel: number;
  hostScore: number;
  coHostName: string;
  coHostAvatarUrl?: string;
  coHostVipLevel: number;
  coHostScore: number;
  onClose: () => void;
}

export default function PKWinnerModal({
  hostName, hostAvatarUrl, hostVipLevel, hostScore,
  coHostName, coHostAvatarUrl, coHostVipLevel, coHostScore,
  onClose,
}: Props) {
  const hostWon = hostScore >= coHostScore;
  const winner = hostWon
    ? { name: hostName, avatar: hostAvatarUrl, vip: hostVipLevel, score: hostScore }
    : { name: coHostName, avatar: coHostAvatarUrl, vip: coHostVipLevel, score: coHostScore };
  const loser = hostWon
    ? { name: coHostName, score: coHostScore }
    : { name: hostName, score: hostScore };

  return (
    <div
      className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden border-2 border-amber-400/60 bg-gradient-to-b from-amber-900/60 via-black/95 to-amber-900/40 shadow-[0_0_60px_rgba(250,204,21,0.5)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Trophy */}
        <div className="flex justify-center mb-3">
          <div className="w-20 h-20 rounded-full bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center shadow-2xl animate-[winnerPulse_1.5s_ease-in-out_infinite]">
            <Trophy size={44} className="text-amber-300" fill="currentColor" />
          </div>
        </div>

        {/* Winner name */}
        <div className="text-center mb-5">
          <div className="text-amber-300 text-sm font-black mb-1">🏆 الفائز</div>
          <div className="text-white text-2xl font-black tracking-tight">
            {winner.name}
          </div>
        </div>

        {/* Winner avatar + score */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <VipAvatar
            src={winner.avatar}
            name={winner.name}
            size={80}
            vip={winner.vip}
            ring={winner.vip === 0}
          />
          <div className="flex items-center gap-2 bg-amber-500/20 backdrop-blur rounded-full px-4 py-2 border border-amber-400/50">
            <Swords size={14} className="text-amber-300" />
            <span className="text-amber-200 text-lg font-black tabular-nums">
              {winner.score.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Loser score (small) */}
        <div className="flex items-center justify-center gap-2 text-white/50 text-xs mb-6">
          <span>{loser.name}</span>
          <span className="tabular-nums">{loser.score.toLocaleString()}</span>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-amber-500 text-black font-black text-sm active:scale-95"
        >
          حسناً
        </button>
      </div>
    </div>
  );
}

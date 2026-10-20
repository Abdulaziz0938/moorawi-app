// [ezo-live-pk] إعلان الفائز في PK — مع دعم التعادل والإغلاق التلقائي
import { useEffect } from "react";
import { Trophy, Swords, Scale } from "lucide-react";
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
  // إغلاق تلقائي بعد 5 ثوانٍ
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isDraw = hostScore === coHostScore;
  const hostWon = hostScore > coHostScore;

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
        className={`w-full max-w-sm rounded-3xl overflow-hidden border-2 p-6 shadow-2xl ${
          isDraw
            ? "border-cyan-400/60 bg-gradient-to-b from-cyan-950/80 via-black/95 to-blue-950/80 shadow-[0_0_60px_rgba(6,182,212,0.4)]"
            : "border-amber-400/60 bg-gradient-to-b from-amber-900/60 via-black/95 to-amber-900/40 shadow-[0_0_60px_rgba(250,204,21,0.5)]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* أيقونة الفوز أو التعادل */}
        <div className="flex justify-center mb-3">
          {isDraw ? (
            <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-2xl animate-pulse">
              <Scale size={42} className="text-cyan-300" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center shadow-2xl animate-[winnerPulse_1.5s_ease-in-out_infinite]">
              <Trophy size={44} className="text-amber-300" fill="currentColor" />
            </div>
          )}
        </div>

        {/* العنوان */}
        <div className="text-center mb-5">
          <div className={`text-sm font-black mb-1 ${isDraw ? "text-cyan-300" : "text-amber-300"}`}>
            {isDraw ? "⚖️ تعادل متكافئ" : "🏆 الفائز في التحدي"}
          </div>
          <div className="text-white text-2xl font-black tracking-tight">
            {isDraw ? "لا يوجد خاسر!" : winner.name}
          </div>
        </div>

        {/* عرض النتيجة */}
        {isDraw ? (
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex flex-col items-center gap-1">
              <VipAvatar src={hostAvatarUrl} name={hostName} size={60} vip={hostVipLevel} ring={hostVipLevel === 0} />
              <span className="text-white text-xs font-bold truncate max-w-[70px]">{hostName}</span>
              <span className="text-cyan-300 text-sm font-black tabular-nums">{hostScore.toLocaleString()}</span>
            </div>
            <div className="text-white/40 font-black text-lg">VS</div>
            <div className="flex flex-col items-center gap-1">
              <VipAvatar src={coHostAvatarUrl} name={coHostName} size={60} vip={coHostVipLevel} ring={coHostVipLevel === 0} />
              <span className="text-white text-xs font-bold truncate max-w-[70px]">{coHostName}</span>
              <span className="text-cyan-300 text-sm font-black tabular-nums">{coHostScore.toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <>
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

            <div className="flex items-center justify-center gap-2 text-white/50 text-xs mb-6">
              <span>{loser.name}:</span>
              <span className="tabular-nums font-bold">{loser.score.toLocaleString()}</span>
            </div>
          </>
        )}

        {/* زر الإغلاق السريع */}
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-2xl font-black text-sm active:scale-95 transition ${
            isDraw ? "bg-cyan-500 text-black hover:bg-cyan-400" : "bg-amber-500 text-black hover:bg-amber-400"
          }`}
        >
          متابعة البث
        </button>
      </div>
    </div>
  );
}

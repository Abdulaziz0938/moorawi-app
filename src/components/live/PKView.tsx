// [ezo-live-pk] عرض PK — فيديو split + شريط نقاط + timer
import { useEffect, useState } from "react";

interface Props {
  hostName: string;
  hostAvatarUrl?: string;
  hostVipLevel: number;
  hostScore: number;
  coHostName: string;
  coHostAvatarUrl?: string;
  coHostVipLevel: number;
  coHostScore: number;
  pkStartedAt: number;
  pkDurationSec: number;
}

export default function PKView({
  hostName,
  hostAvatarUrl,
  hostVipLevel,
  hostScore,
  coHostName,
  coHostAvatarUrl,
  coHostVipLevel,
  coHostScore,
  pkStartedAt,
  pkDurationSec,
}: Props) {
  const [remaining, setRemaining] = useState(pkDurationSec);

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - pkStartedAt) / 1000;
      const left = Math.max(0, pkDurationSec - elapsed);
      setRemaining(Math.floor(left));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pkStartedAt, pkDurationSec]);

  const total = hostScore + coHostScore;
  const hostPct = total === 0 ? 50 : (hostScore / total) * 100;
  const coHostPct = 100 - hostPct;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="absolute top-16 left-0 right-0 z-30 px-3">
      {/* Timer bar */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="bg-black/70 backdrop-blur rounded-full px-4 py-1.5 border border-amber-400/40 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-amber-200 text-xs font-black tabular-nums">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="rounded-2xl bg-black/70 backdrop-blur border border-white/15 overflow-hidden">
        {/* Two avatars at top */}
        <div className="flex items-center justify-between p-2">
          {/* Host */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-700 flex-shrink-0">
              {hostAvatarUrl ? (
                <img src={hostAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black">
                  {(hostName?.[0] ?? "?").toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-white text-[11px] font-black truncate max-w-[80px]">
                {hostName}
              </div>
              <div className="text-cyan-300 text-[10px] font-black tabular-nums">
                {hostScore.toLocaleString()}
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="bg-amber-500/90 rounded-full px-2 py-0.5 flex-shrink-0">
            <span className="text-black text-[9px] font-black">VS</span>
          </div>

          {/* CoHost */}
          <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-700 flex-shrink-0">
              {coHostAvatarUrl ? (
                <img src={coHostAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black">
                  {(coHostName?.[0] ?? "?").toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 text-left">
              <div className="text-white text-[11px] font-black truncate max-w-[80px]">
                {coHostName}
              </div>
              <div className="text-pink-300 text-[10px] font-black tabular-nums">
                {coHostScore.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex h-2">
          <div
            className="bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
            style={{ width: `${hostPct}%`, boxShadow: "0 0 12px rgba(34,211,238,0.6)" }}
          />
          <div
            className="bg-gradient-to-l from-pink-400 to-rose-500 transition-all duration-500"
            style={{ width: `${coHostPct}%`, boxShadow: "0 0 12px rgba(236,72,153,0.6)" }}
          />
        </div>
      </div>
    </div>
  );
}

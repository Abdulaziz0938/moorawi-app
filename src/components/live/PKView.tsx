// [ezo-live-pk] عرض PK — شريط نقاط وتوقيت بشكل تيك توك
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
  hostScore,
  coHostName,
  coHostAvatarUrl,
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
  const rawHostPct = total === 0 ? 50 : (hostScore / total) * 100;
  const hostPct = total === 0 ? 50 : Math.min(Math.max(rawHostPct, 5), 95);
  const coHostPct = 100 - hostPct;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="absolute top-[60px] left-0 right-0 z-[50] flex flex-col items-center pointer-events-none">
      {/* Timer Pill */}
      <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1 mb-1 border border-white/20 flex items-center gap-1.5 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white text-[10px] font-black tabular-nums tracking-wider">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
      </div>

      {/* Score Bar Container */}
      <div className="w-full bg-black/60 backdrop-blur-md overflow-hidden border-b border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-2 py-1.5">
          {/* Host Side */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-700 flex-shrink-0 border border-cyan-400">
              {hostAvatarUrl ? (
                <img src={hostAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-black">
                  {(hostName?.[0] ?? "?").toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-white text-[9px] font-bold truncate leading-none">
                {hostName}
              </span>
              <span className="text-cyan-400 text-[11px] font-black tabular-nums leading-none mt-0.5">
                {hostScore.toLocaleString()}
              </span>
            </div>
          </div>

          {/* VS */}
          <div className="px-1.5 flex-shrink-0">
            <span className="text-amber-400 text-[9px] font-black italic">VS</span>
          </div>

          {/* CoHost Side */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-row-reverse">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-700 flex-shrink-0 border border-pink-400">
              {coHostAvatarUrl ? (
                <img src={coHostAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-black">
                  {(coHostName?.[0] ?? "?").toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex flex-col items-end">
              <span className="text-white text-[9px] font-bold truncate leading-none">
                {coHostName}
              </span>
              <span className="text-pink-400 text-[11px] font-black tabular-nums leading-none mt-0.5">
                {coHostScore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative flex h-2 w-full bg-black/40">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
            style={{ width: `${hostPct}%`, transition: "width 300ms ease-out", willChange: "width" }}
          />
          <div
            className="h-full bg-gradient-to-l from-pink-400 to-rose-500"
            style={{ width: `${coHostPct}%`, transition: "width 300ms ease-out", willChange: "width" }}
          />
          {/* Glowing Spark */}
          <div
            className="absolute top-0 bottom-0 w-1.5 -ml-[3px] bg-white shadow-[0_0_8px_#fff]"
            style={{ left: `${hostPct}%`, transition: "left 300ms ease-out", willChange: "left" }}
          />
        </div>
      </div>
    </div>
  );
}

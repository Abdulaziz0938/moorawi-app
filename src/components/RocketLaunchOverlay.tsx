// [ezo-rocket-launch] إطلاق الصاروخ — انيميشن كامل الشاشة
import { useEffect, useState } from "react";

interface Props {
  rocket: { img: string; color: string; name: string };
  launcher: { avatarUrl?: string; name: string };
  onComplete: () => void;
}

export default function RocketLaunchOverlay({ rocket, launcher, onComplete }: Props) {
  const [phase, setPhase] = useState<"idle" | "rising" | "exploding">("idle");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("rising"), 600);
    const t2 = setTimeout(() => setPhase("exploding"), 2800);
    const t3 = setTimeout(() => onComplete(), 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[400] pointer-events-none overflow-hidden">
      {/* Dark vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/70 animate-fade-in" />

      {/* Launcher name at top */}
      {phase !== "idle" && (
        <div className="absolute top-[15%] left-0 right-0 text-center animate-fade-in">
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]">
            {launcher.name}
          </div>
          <div className="text-yellow-200/80 text-sm font-black mt-1 tracking-widest">
            أطلق صاروخ {rocket.name}!
          </div>
        </div>
      )}

      {/* Rocket with avatar */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 bottom-[10%] ${
          phase === "rising" ? "animate-rocket-launch" : ""
        }`}
      >
        <div className="relative flex flex-col items-center">
          {/* Avatar bubble — appears on rocket */}
          <div className="relative z-10 -mb-6 animate-avatar-pop">
            <div
              className="w-16 h-16 rounded-full p-[3px] shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${rocket.color}, #fff, ${rocket.color})`,
              }}
            >
              <div className="w-full h-full rounded-full bg-black/60 flex items-center justify-center overflow-hidden ring-2 ring-black/50">
                {launcher.avatarUrl ? (
                  <img
                    src={launcher.avatarUrl}
                    alt={launcher.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-black text-xl">
                    {launcher.name[0] ?? "?"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rocket */}
          <img
            src={rocket.img}
            alt={rocket.name}
            className="w-40 h-60 object-contain drop-shadow-[0_0_40px_rgba(255,200,0,0.6)]"
          />

          {/* Thruster trail */}
          <div
            className="w-3 h-16 rounded-b-full animate-rocket-trail -mt-2"
            style={{
              background: `linear-gradient(180deg, ${rocket.color}, transparent)`,
              filter: "blur(2px)",
            }}
          />
        </div>
      </div>

      {/* Explosion */}
      {phase === "exploding" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/ui/glow-gold.png"
            alt=""
            className="w-[120vw] h-[120vw] max-w-[600px] max-h-[600px] object-contain animate-explosion"
            style={{ filter: "drop-shadow(0 0 30px rgba(250,204,21,0.9))" }}
          />
        </div>
      )}
    </div>
  );
}

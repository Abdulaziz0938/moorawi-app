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
    <div className={`fixed inset-0 z-[400] overflow-hidden ${
      phase === "exploding" ? "animate-shake" : ""
    }`}>
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

      {/* ═══ Explosion (Ezo style) ═══ */}
      {phase === "exploding" && (
        <>
          {/* 1. White flash */}
          <div className="absolute inset-0 bg-white animate-flash pointer-events-none" />

          {/* 2. Shockwave rings (3 layers) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-32 h-32 rounded-full border-white/80 animate-shockwave"
              style={{ borderWidth: "40px", borderStyle: "solid" }}
            />
            <div
              className="absolute w-32 h-32 rounded-full border-amber-400/60 animate-shockwave"
              style={{ borderWidth: "30px", borderStyle: "solid", animationDelay: "0.15s" }}
            />
            <div
              className="absolute w-32 h-32 rounded-full border-yellow-300/40 animate-shockwave"
              style={{ borderWidth: "20px", borderStyle: "solid", animationDelay: "0.3s" }}
            />
          </div>

          {/* 3. Golden rays */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img
              src="/ui/glow-gold.webp"
              alt=""
              className="w-[100vw] h-[100vw] max-w-[600px] max-h-[600px] object-contain animate-rays"
            />
          </div>

          {/* 4. Golden particles (24 flying out) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * Math.PI * 2;
              const dist = 150 + Math.random() * 200;
              const px = Math.cos(angle) * dist;
              const py = Math.sin(angle) * dist;
              const size = 8 + Math.random() * 12;
              return (
                <div
                  key={i}
                  className="absolute rounded-full animate-particle"
                  style={{
                    width: size,
                    height: size,
                    background:
                      i % 2 === 0
                        ? "radial-gradient(circle, #fde047, #f59e0b)"
                        : "radial-gradient(circle, #fbbf24, transparent)",
                    boxShadow: "0 0 12px rgba(250, 204, 21, 0.9)",
                    ["--px" as any]: `${px}px`,
                    ["--py" as any]: `${py}px`,
                    animationDelay: `${Math.random() * 0.15}s`,
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

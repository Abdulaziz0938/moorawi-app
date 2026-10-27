import { useEffect } from "react";
import { motion } from "framer-motion";
import AssetVideo from "./AssetVideo";

export default function EntryEffectOverlay({
  url,
  type,
  onFinish,
}: {
  url: string;
  type: string;
  onFinish: () => void;
}) {
  useEffect(() => {
    const fallback = setTimeout(() => onFinish(), 4500);
    return () => clearTimeout(fallback);
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[500] pointer-events-none flex items-center justify-center"
    >
      <div className="w-full h-full pointer-events-none" style={{ mixBlendMode: "screen" }}>
        <AssetVideo
          url={url}
          type={type}
          muted={true}
          onCanPlay={(e: any) => {
            const v = e.target as HTMLVideoElement;
            try { v.muted = false; v.volume = 0.85; } catch {}
          }}
          onEnded={onFinish}
          onError={onFinish}
          className="w-full h-full object-cover pointer-events-none"
          style={{
            opacity: 0.85,
            maskImage: "radial-gradient(ellipse 70% 70% at center, black 30%, rgba(0,0,0,0.85) 55%, transparent 90%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 70% at center, black 30%, rgba(0,0,0,0.85) 55%, transparent 90%)",
          }}
        />
      </div>
    </motion.div>
  );
}


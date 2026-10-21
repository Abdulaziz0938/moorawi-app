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
    const timer = setTimeout(() => {
      onFinish();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.15 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[500] pointer-events-none flex items-center justify-center"
    >
      <AssetVideo
        url={url}
        type={type}
        muted={false}
        className="w-full h-full object-cover"
        style={{
          opacity: 0.85,
          maskImage: "radial-gradient(ellipse 75% 75% at center, black 25%, rgba(0,0,0,0.9) 50%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 75% at center, black 25%, rgba(0,0,0,0.9) 50%, transparent 95%)",
        }}
      />
    </motion.div>
  );
}

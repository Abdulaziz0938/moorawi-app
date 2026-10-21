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
    // إخفاء تلقائي بعد 4 ثوانٍ
    const timer = setTimeout(() => {
      onFinish();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  const isVid = type === "video" || (type === "auto" && (/\.(mp4|webm|mov|mkv)($|\?|#)/i.test(url) || url.includes("/video/upload/")));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[500] pointer-events-none flex items-center justify-center"
    >
      <div className="rounded-3xl overflow-hidden max-h-[75vh] max-w-[85vw] drop-shadow-[0_0_50px_rgba(255,255,255,0.35)]">
        <AssetVideo
          url={url}
          type={type}
          muted={false}
          className={`max-h-[75vh] max-w-[85vw] object-contain ${isVid ? "mix-blend-screen" : ""}`}
          style={{ opacity: 0.7 }}
        />
      </div>
    </motion.div>
  );
}

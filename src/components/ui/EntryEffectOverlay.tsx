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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[500] pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <AssetVideo
        url={url}
        type={type}
        className="w-full h-full max-h-[80vh] max-w-[90vw] drop-shadow-[0_0_50px_rgba(255,255,255,0.4)]"
      />
    </motion.div>
  );
}

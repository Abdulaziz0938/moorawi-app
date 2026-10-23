import React, { useEffect, useState } from "react";
import SvgaPlayer from "./ui/SvgaPlayer";
import { haptic } from "../lib/haptics";

interface Entry {
  _id: string;
  userId: string;
  level: number;
  name: string;
  avatarUrl?: string;
  createdAt: number;
}

export default function VipEntryOverlay({ entry }: { entry: Entry | null }) {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<Entry | null>(null);

  useEffect(() => {
    if (entry && (!active || entry._id !== active._id)) {
      setActive(entry);
      setVisible(true);
      haptic("heavy");
      const timer = setTimeout(() => {
        setVisible(false);
      }, 10000); // 10 ثواني للتجربة
      return () => clearTimeout(timer);
    }
  }, [entry, active]);

  if (!visible || !active) return null;

  // رابط Cloudinary الخاص بك
  const assetUrl = "https://res.cloudinary.com/wdicx984/raw/upload/v1792714809/ztvoqlnpvf7vuuwct3xa.svga";

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/80 pointer-events-auto">
      <div className="aspect-square w-full max-w-md flex items-center justify-center bg-black/50 rounded-2xl overflow-hidden relative">
        <SvgaPlayer 
          src={assetUrl} 
          className="w-full h-full" 
          loops={0} 
          autoPlay={true} 
        />
      </div>
      <button 
        onClick={() => setVisible(false)} 
        className="mt-6 bg-white text-black px-6 py-2 rounded-xl font-bold shadow-lg"
      >
        إغلاق
      </button>
    </div>
  );
}

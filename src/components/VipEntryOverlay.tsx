import React, { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import VipAvatar from "./ui/VipAvatar";
import AssetVideo from "./ui/AssetVideo";
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
      }, 5000); // 5 ثواني
      return () => clearTimeout(timer);
    }
  }, [entry, active]);

  if (!visible || !active) return null;

  // رابط الـ SVGA الخاص بـ VIP 5 من Cloudinary
  const svgaAsset = "https://res.cloudinary.com/wdicx984/raw/upload/v1792714809/ztvoqlnpvf7vuuwct3xa.svga";

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex flex-col items-center justify-center overflow-hidden">
      
      {/* خلفية معتمة خفيفة */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* 1. الأنيميشن (SVGA) بكامل الشاشة */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AssetVideo 
          url={svgaAsset} 
          className="w-full h-full object-contain scale-110" 
        />
      </div>

      {/* 2. الأفاتار والاسم */}
      <div className="relative z-10 flex flex-col items-center animate-scale-up mt-32">
        <div className="relative ring-4 ring-amber-400/80 rounded-full shadow-[0_0_60px_rgba(251,191,36,0.9)] bg-black/50">
          <VipAvatar src={active.avatarUrl} name={active.name} vip={active.level} size={100} />
        </div>
        
        <div className="mt-4 flex flex-col items-center bg-black/70 px-6 py-2 rounded-xl backdrop-blur-md border border-amber-500/50 shadow-2xl">
           <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-amber-300 font-black text-xs tracking-widest">VIP {active.level}</span>
           </div>
           <span className="text-white font-black text-xl drop-shadow-lg">{active.name}</span>
        </div>
      </div>

    </div>
  );
}

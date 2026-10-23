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
      }, 5000); // 5 ثواني عشان ياخد الأنيميشن حقه
      return () => clearTimeout(timer);
    }
  }, [entry, active]);

  if (!visible || !active) return null;

  // مسار الأنيميشن: نستخدم الـ PAG اللي شفناه في مجلد vip_assets
  const vipPagAsset = `/vip_assets/bimo_vip${active.level}.pag`;
  
  // لو المستوى 7 (لأننا ما لقينا bimo_vip7.pag، بنستخدم الـ svga الخاص بيه)
  const svgaFallback = `/vip_assets/wl_come_${active.level}.svga`;
  const assetUrl = active.level === 7 ? svgaFallback : vipPagAsset;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black/40 backdrop-blur-[2px]">
      
      {/* 1. الأنيميشن (PAG/SVGA) بكامل الشاشة باستخدام مشغل التطبيق */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AssetVideo 
          url={assetUrl} 
          className="w-full h-full object-contain scale-125" 
        />
      </div>

      {/* 2. الأفاتار والاسم يطيرون فوق الأنيميشن */}
      <div className="relative z-10 flex flex-col items-center animate-scale-up mt-24">
        <div className="relative ring-4 ring-amber-400/80 rounded-full shadow-[0_0_60px_rgba(251,191,36,0.9)]">
          <VipAvatar src={active.avatarUrl} name={active.name} vip={active.level} size={110} />
        </div>
        
        {/* الاسم واللقب بتصميم خفيف بدون كرت يغطي الشاشة */}
        <div className="mt-6 flex flex-col items-center bg-black/60 px-8 py-3 rounded-2xl backdrop-blur-md border border-amber-500/50 shadow-2xl">
           <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-amber-400 animate-bounce" />
              <span className="text-amber-300 font-black text-sm tracking-widest">VIP {active.level}</span>
           </div>
           <span className="text-white font-black text-2xl drop-shadow-lg">{active.name}</span>
        </div>
      </div>

    </div>
  );
}

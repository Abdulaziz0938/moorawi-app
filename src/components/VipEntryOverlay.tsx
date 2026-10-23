import React, { useEffect, useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import VipAvatar from "./ui/VipAvatar";
import VipName from "./VipName";
import AssetVideo from "./ui/AssetVideo";
import { useReactiveAssets } from "../lib/assets";
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
  const { map: assets } = useReactiveAssets();
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<Entry | null>(null);

  useEffect(() => {
    if (entry && (!active || entry._id !== active._id)) {
      setActive(entry);
      setVisible(true);
      haptic("heavy");

      const timer = setTimeout(() => {
        setVisible(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [entry, active]);

  if (!visible || !active) return null;

  const vipPagAsset = `/vip_assets/bimo_vip${active.level}.pag`;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in" />
      
      <div className="relative flex flex-col items-center animate-scale-up">
        <div className="absolute -inset-20 z-0 opacity-90 flex items-center justify-center pointer-events-none">
          <AssetVideo url={vipPagAsset} className="w-[450px] h-[450px] object-contain" />
        </div>

        <div className="relative z-10 flex flex-col items-center bg-gradient-to-b from-purple-950/80 via-black/90 to-black/95 border border-amber-500/50 rounded-2xl p-6 shadow-2xl backdrop-blur-md min-w-[300px]">
          <div className="absolute -top-10">
            <div className="relative ring-4 ring-amber-400/80 rounded-full shadow-lg">
              <VipAvatar src={active.avatarUrl} name={active.name} vip={active.level} size={64} />
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-center space-x-1 space-x-reverse bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/30 mb-2">
              <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-amber-300 font-bold text-xs">VIP {active.level} - أسطورة بينمو</span>
            </div>
            
            <div className="text-lg font-black text-white tracking-wide mb-1">
              <span className="text-amber-400 font-bold">{active.name}</span>
            </div>
            
            <p className="text-xs text-purple-300 flex items-center gap-1 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              انضم إلى الغرفة بسلام وهيبة ملكية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

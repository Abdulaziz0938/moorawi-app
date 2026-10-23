import React, { useEffect, useState } from "react";
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

  // نستخدم ملف محلي موجود أصلاً بمشروعك (cl_come_5.svga)
  const svgaAsset = "/vip_assets/cl_come_5.svga";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 pointer-events-none">
      {/* الأنيميشن فقط، بدون أي HTML أو كرت يغطيه */}
      <AssetVideo 
        url={svgaAsset} 
        className="w-full h-full object-contain" 
      />
    </div>
  );
}

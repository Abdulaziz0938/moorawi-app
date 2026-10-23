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
      }, 6000); // 6 ثواني عشان ياخد الأنيميشن حقه
      return () => clearTimeout(timer);
    }
  }, [entry, active]);

  if (!visible || !active) return null;

  // استخدام ملفك الأصلي بدون أي إضافات
  const assetUrl = `/vip_assets/cl_come_${active.level}.svga`;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-black/40">
      {/* الأنيميشن فقط */}
      <AssetVideo 
        url={assetUrl} 
        className="w-full h-full object-contain" 
      />
    </div>
  );
}

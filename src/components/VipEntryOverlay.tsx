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
      }, 8000); // 8 ثواني عشان نلحق نشوف لو في خطأ
      return () => clearTimeout(timer);
    }
  }, [entry, active]);

  if (!visible || !active) return null;

  // نستخدم نفس رابط Cloudinary اللي شغال في المعرض
  const assetUrl = "https://res.cloudinary.com/wdicx984/raw/upload/v1792714809/ztvoqlnpvf7vuuwct3xa.svga";

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-black/40">
      <SvgaPlayer 
        src={assetUrl} 
        className="w-full h-full" 
        loops={0} 
        autoPlay={true} 
      />
    </div>
  );
}

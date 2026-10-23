import React, { useEffect, useState } from "react";
import AssetVideo from "./ui/AssetVideo";

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
      // خلينا نخليها 10 ثواني عشان نلحق نشوفها
      const timer = setTimeout(() => {
        setVisible(false);
      }, 10000); 
      return () => clearTimeout(timer);
    }
  }, [entry, active]);

  if (!visible || !active) return null;

  const svgaAsset = "https://res.cloudinary.com/wdicx984/raw/upload/v1792714809/ztvoqlnpvf7vuuwct3xa.svga";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80">
      
      {/* رسالة تأكيد إن الشاشة ظهرت */}
      <div className="absolute top-10 z-50 bg-red-600 text-white font-bold p-2 rounded text-center text-sm">
        الشاشة ظهرت! جاري تحميل الأنيميشن...
      </div>

      {/* مشغل الأنيميشن */}
      <div className="w-full h-full flex items-center justify-center">
        <AssetVideo 
          url={svgaAsset} 
          className="w-full h-full object-contain" 
        />
      </div>
      
    </div>
  );
}

import { useEffect, useState } from "react";
import SvgaPlayer from "./ui/SvgaPlayer";
import { haptic } from "../lib/haptics";
import { useAssets } from "../lib/assets";

interface Entry {
  _id: string;
  userId: string;
  level: number;
  name: string;
  avatarUrl?: string;
  createdAt: number;
}

export default function VipEntryOverlay({ entry }: { entry: Entry | null }) {
  const assets = useAssets();
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<Entry | null>(null);

  useEffect(() => {
    if (entry && (!active || entry._id !== active._id)) {
      setActive(entry);
      setVisible(true);
      haptic("heavy");
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [entry, active]);

  if (!visible || !active) return null;

  const assetUrl =
    assets[`vip.entry.${active.level}`] ??
    assets["vip.entry.3"] ??
    "https://res.cloudinary.com/wdicx984/raw/upload/v1792714809/ztvoqlnpvf7vuuwct3xa.svga";

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none bg-transparent">
      <SvgaPlayer src={assetUrl} className="w-full h-full" loops={0} autoPlay={true} />
    </div>
  );
}

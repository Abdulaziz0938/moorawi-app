import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import AssetVideo from "./ui/AssetVideo";
import { Search, Copy, Check } from "lucide-react";

export default function AssetsGalleryTab() {
  const assets = useQuery(api.assets.list);
  const [search, setSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!assets) return <div className="text-white text-center py-4">جاري التحميل...</div>;

  // الفئات المفيدة فقط (إخفاء الـ 527 ملف UI من مشروع shor-voice القديم)
  const USEFUL_CATEGORIES = ["asset.gifts.", "asset.custom.", "asset.frames.", "asset.vehicles.", "asset.entries.", "asset.emojis.", "asset.banners."];
  
  const filtered = assets.filter((a: any) => {
    const isUseful = USEFUL_CATEGORIES.some(cat => a.key.startsWith(cat));
    return isUseful && a.key.toLowerCase().includes(search.toLowerCase());
  });

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
          <input
            type="text"
            placeholder="بحث عن أصل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/10 text-white border border-white/20 rounded-xl pl-10 pr-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-400"
          />
        </div>
        <div className="bg-purple-600/20 text-purple-300 px-3 py-2 rounded-xl text-sm flex items-center">
          {filtered.length} أصل
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {filtered.map((item: any) => (
          <div
            key={item._id}
            onClick={() => handleCopy(item.key)}
            className="relative aspect-square bg-black/40 rounded-xl overflow-hidden border border-white/10 active:scale-95 transition cursor-pointer group"
          >
            <AssetVideo
              url={item.imageUrl}
              type="auto"
              loop={true}
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center p-2 text-center text-[10px] text-white break-all">
              {copiedKey === item.key ? (
                <><Check size={16} className="text-green-400 mb-1" /> تم النسخ</>
              ) : (
                <><Copy size={16} className="mb-1" /> {item.key.replace('asset.', '')}</>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

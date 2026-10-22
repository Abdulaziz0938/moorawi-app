import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import AssetVideo from "./ui/AssetVideo";
import { Search, Copy, Check, Link as LinkIcon } from "lucide-react";

export default function AssetsGalleryTab() {
  const assets = useQuery(api.assets.list);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  if (!assets) return <div className="text-white text-center py-4">جاري التحميل...</div>;

  const filtered = assets.filter((a: any) => {
    const isUseful = a.key.startsWith("asset.") || a.key.startsWith("vip.");
    const hasUrl = !!a.imageUrl && !a.imageUrl.includes("undefined");
    return isUseful && hasUrl && a.key.toLowerCase().includes(search.toLowerCase());
  });

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type + text);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
          <input
            type="text"
            placeholder="ابحث عن أصل (مثلاً: dragon أو car)..."
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
            className="relative aspect-square bg-black/40 rounded-xl overflow-hidden border border-white/10 group flex flex-col"
          >
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <AssetVideo url={item.imageUrl} type="auto" loop={true} className="w-full h-full object-contain" />
            </div>
            
            {/* أزرار التحكم */}
            <div className="bg-black/80 p-1 flex flex-col gap-1 text-[9px] text-white">
              <button 
                onClick={() => handleCopy(item.imageUrl, "url-")}
                className="flex items-center justify-center gap-1 bg-blue-600/50 hover:bg-blue-600 py-1 rounded transition"
              >
                {copied === "url-" + item.imageUrl ? <Check size={10} className="text-green-400"/> : <LinkIcon size={10} />} نسخ الرابط
              </button>
              <button 
                onClick={() => handleCopy(item.key, "key-")}
                className="flex items-center justify-center gap-1 bg-purple-600/50 hover:bg-purple-600 py-1 rounded transition truncate px-1"
              >
                {copied === "key-" + item.key ? <Check size={10} className="text-green-400"/> : <Copy size={10} />} 
                <span className="truncate">{item.key.replace('asset.', '').replace('custom.', '')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

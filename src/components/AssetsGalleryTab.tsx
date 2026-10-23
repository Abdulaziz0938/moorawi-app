import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import AssetVideo from "./ui/AssetVideo";
import { Search, Copy, Check, Link as LinkIcon, X, Maximize } from "lucide-react";

export default function AssetsGalleryTab() {
  const assets = useQuery(api.assets.list);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);
  const [previewAsset, setPreviewAsset] = useState<any>(null); // للمعاينة الكاملة

  useEffect(() => {
    setLimit(30);
  }, [search]);

  if (!assets) return <div className="text-white text-center py-4">جاري التحميل...</div>;

  const filtered = assets.filter((a: any) => {
    const isUseful = a.key.startsWith("asset.") || a.key.startsWith("vip.");
    const hasUrl = !!a.imageUrl && !a.imageUrl.includes("undefined");
    return isUseful && hasUrl && a.key.toLowerCase().includes(search.toLowerCase());
  });

  // ترتيب: الحركات (PAG/SVGA) أولاً، ثم الصور الثابتة
  filtered.sort((a: any, b: any) => {
    const isAnimA = a.imageUrl.includes('.pag') || a.imageUrl.includes('.svga');
    const isAnimB = b.imageUrl.includes('.pag') || b.imageUrl.includes('.svga');
    if (isAnimA && !isAnimB) return -1;
    if (!isAnimA && isAnimB) return 1;
    return 0;
  });

  const displayed = filtered.slice(0, limit);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type + text);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  // خلفية شبكية لرؤية الصور الشفافة
  const checkerboardBg = {
    backgroundImage: "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
    backgroundColor: "#1a1a1a"
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
          <input
            type="text"
            placeholder="ابحث عن أصل..."
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
        {displayed.map((item: any) => (
          <div
            key={item._id}
            className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group flex flex-col"
            style={checkerboardBg}
          >
            {/* زر المعاينة الكاملة */}
            <button 
              onClick={() => setPreviewAsset(item)}
              className="absolute top-1 right-1 z-10 bg-black/60 p-1.5 rounded-full text-white/80 hover:text-white"
            >
              <Maximize size={12} />
            </button>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden p-1">
              <AssetVideo url={item.imageUrl} type="auto" loop={true} className="w-full h-full object-contain" />
            </div>
            
            <div className="bg-black/90 p-1 flex flex-col gap-1 text-[9px] text-white z-10">
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

      {limit < filtered.length && (
        <button
          onClick={() => setLimit(limit + 30)}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition"
        >
          تحميل المزيد (متبقي {filtered.length - limit})
        </button>
      )}

      {/* شاشة المعاينة الكاملة */}
      {previewAsset && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex flex-col p-4" dir="rtl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-white font-black">{previewAsset.key}</span>
            <button onClick={() => setPreviewAsset(null)} className="p-2 bg-white/10 rounded-full text-white">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center relative p-2" style={checkerboardBg}>
             <div className="w-full h-full flex items-center justify-center">
               <AssetVideo url={previewAsset.imageUrl} type="auto" loop={true} className="max-w-full max-h-full object-contain" />
             </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => handleCopy(previewAsset.imageUrl, "url-")} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              نسخ الرابط
            </button>
            <button onClick={() => handleCopy(previewAsset.key, "key-")} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold">
              نسخ المفتاح
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

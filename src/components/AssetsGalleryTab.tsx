import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import AssetVideo from "./ui/AssetVideo";
import { Search, Copy, Check, Link as LinkIcon, X, Maximize, FolderPlus, Folder, MoveRight, CheckSquare, Square } from "lucide-react";
import { getActiveToken } from "../lib/session";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";

const DEFAULT_COLLECTIONS = ["أساسي", "دخوليات", "إطارات", "هدايا", "زخارف", "بانرات", "تأثيرات"];

export default function AssetsGalleryTab() {
  const assets = useQuery(api.assets.list);
  const moveAssets = useMutation(api.assets.moveAssets);
  
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [limit, setLimit] = useState(30);
  const [previewAsset, setPreviewAsset] = useState<any>(null);
  
  // Collections
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [customCollections, setCustomCollections] = useState<string[]>(DEFAULT_COLLECTIONS);

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const token = getActiveToken() || getDeviceId();

  useEffect(() => {
    setLimit(30);
  }, [search, selectedCollection]);

  if (!assets) return <div className="text-white text-center py-4">جاري التحميل...</div>;

  // استخراج كل المجلدات الموجودة
  const existingCollections = Array.from(new Set(assets.map((a: any) => a.collection).filter(Boolean))) as string[];
  const allCollections = Array.from(new Set([...DEFAULT_COLLECTIONS, ...customCollections, ...existingCollections]));

  const filtered = assets.filter((a: any) => {
    const isUseful = a.key.startsWith("asset.") || a.key.startsWith("vip.");
    const hasUrl = !!a.imageUrl && !a.imageUrl.includes("undefined");
    const matchesSearch = a.key.toLowerCase().includes(search.toLowerCase());
    
    let matchesCollection = true;
    if (selectedCollection === "all") matchesCollection = true;
    else if (selectedCollection === "none") matchesCollection = !a.collection;
    else matchesCollection = a.collection === selectedCollection;
    
    return isUseful && hasUrl && matchesSearch && matchesCollection;
  });

  // ترتيب: الحركات أولاً
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

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === displayed.length && displayed.every((a:any) => selectedIds.has(a._id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayed.map((a:any) => a._id)));
    }
  };

  const handleCreateCollection = () => {
    const name = prompt("اسم المجلد الجديد:");
    if (name && name.trim()) {
      setCustomCollections([...customCollections, name.trim()]);
      setSelectedCollection(name.trim());
    }
  };

  const handleMoveSelected = async () => {
    if (selectedIds.size === 0) {
      dialog.alert("لم تحدد أي ملف");
      return;
    }
    const target = prompt(`نقل ${selectedIds.size} ملف إلى مجلد (اكتب اسم المجلد):`, "هدايا");
    if (!target || !target.trim()) return;
    
    try {
      await moveAssets({
        ids: Array.from(selectedIds) as any[],
        collection: target.trim(),
        tokenOverride: token,
      });
      dialog.alert(`تم نقل ${selectedIds.size} ملف إلى "${target}"`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      setSelectedCollection(target.trim());
    } catch (e: any) {
      dialog.alert("فشل النقل: " + e.message);
    }
  };

  const checkerboardBg = {
    backgroundImage: "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
    backgroundColor: "#1a1a1a"
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Search + Count */}
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

      {/* Collections bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCollection("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${selectedCollection === "all" ? "bg-purple-600 text-white" : "bg-white/10 text-white/70"}`}
        >
          الكل
        </button>
        <button
          onClick={() => setSelectedCollection("none")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${selectedCollection === "none" ? "bg-purple-600 text-white" : "bg-white/10 text-white/70"}`}
        >
          غير مصنف
        </button>
        {allCollections.filter(Boolean).map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCollection(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${selectedCollection === c ? "bg-purple-600 text-white" : "bg-white/10 text-white/70"}`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={handleCreateCollection}
          className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-emerald-600/30 text-emerald-300 border border-emerald-400/40 flex items-center gap-1"
        >
          <FolderPlus size={12} /> جديد
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${selectionMode ? "bg-red-600 text-white" : "bg-blue-600/30 text-blue-300 border border-blue-400/40"}`}
        >
          <CheckSquare size={12} /> {selectionMode ? "إلغاء التحديد" : "تحديد متعدد"}
        </button>

        {selectionMode && (
          <>
            <button onClick={handleSelectAll} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white">
              {selectedIds.size === displayed.length && displayed.length > 0 ? "إلغاء الكل" : "تحديد الكل"}
            </button>
            <span className="text-white/70 text-xs font-bold">
              ({selectedIds.size} محدد)
            </span>
            {selectedIds.size > 0 && (
              <button
                onClick={handleMoveSelected}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white flex items-center gap-1"
              >
                <MoveRight size={12} /> نقل المحدد
              </button>
            )}
          </>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {displayed.map((item: any) => {
          const isSelected = selectedIds.has(item._id);
          return (
            <div
              key={item._id}
              className={`relative aspect-square rounded-xl overflow-hidden border group flex flex-col ${isSelected ? "border-emerald-400 ring-2 ring-emerald-400" : "border-white/10"}`}
              style={checkerboardBg}
            >
              {selectionMode && (
                <button 
                  onClick={() => toggleSelection(item._id)}
                  className="absolute top-1 left-1 z-20 bg-black/70 p-1 rounded-full text-white"
                >
                  {isSelected ? <CheckSquare size={16} className="text-emerald-400"/> : <Square size={16} />}
                </button>
              )}

              {!selectionMode && (
                <button 
                  onClick={() => setPreviewAsset(item)}
                  className="absolute top-1 right-1 z-10 bg-black/60 p-1.5 rounded-full text-white/80 hover:text-white"
                >
                  <Maximize size={12} />
                </button>
              )}

              {item.collection && (
                <div className="absolute top-1 right-1 z-10 bg-amber-600/80 text-white text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Folder size={8} /> {item.collection}
                </div>
              )}

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
          );
        })}
      </div>

      {limit < filtered.length && (
        <button
          onClick={() => setLimit(limit + 30)}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition"
        >
          تحميل المزيد (متبقي {filtered.length - limit})
        </button>
      )}

      {/* Preview Modal */}
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

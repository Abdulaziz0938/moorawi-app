// [ezo-music] MusicSheet — Binmo-style (library + multi-upload + YouTube search)
import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import MusicPlayer from "./MusicPlayer";
import {
  X, Music, Upload, Trash2, Play, Pencil, Save,
  Loader2, Library, Search, PlayCircle, Check,
} from "lucide-react";
import { getActiveToken } from "../lib/session";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
  currentTrackId?: string | null;
}

type Tab = "library" | "upload" | "search";

interface UploadJob {
  id: string;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

export default function MusicSheet({ roomId, onClose }: Props) {
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;
  const tracks = useQuery(api.music.listMine, { tokenOverride: token });
  const addTrack = useMutation(api.music.addTrack);
  const removeTrack = useMutation(api.music.removeTrack);
  const renameTrack = useMutation(api.music.renameTrack);
  const playForRoom = useMutation(api.music.playForRoom);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("library");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 200);
    if (arr.length === 0) return;

    const initialJobs: UploadJob[] = arr.map((f, i) => ({
      id: `job-${Date.now()}-${i}`,
      name: f.name.replace(/\.[^.]+$/, "").slice(0, 40),
      status: "pending",
      progress: 0,
    }));
    setJobs(initialJobs);
    setIsUploading(true);

    const BATCH = 3;
    for (let i = 0; i < arr.length; i += BATCH) {
      const batch = arr.slice(i, i + BATCH);
      const batchJobs = initialJobs.slice(i, i + BATCH);
      await Promise.all(batch.map(async (file, j) => {
        const job = batchJobs[j];
        setJobs(prev => prev.map(x => x.id === job.id ? { ...x, status: "uploading", progress: 15 } : x));
        try {
          const res = await uploadToCloudinary(file, "video");
          setJobs(prev => prev.map(x => x.id === job.id ? { ...x, progress: 85 } : x));
          await addTrack({
            name: job.name || "مقطع",
            url: res.url,
            tokenOverride: token,
          });
          setJobs(prev => prev.map(x => x.id === job.id ? { ...x, status: "done", progress: 100 } : x));
        } catch (e: any) {
          setJobs(prev => prev.map(x => x.id === job.id ? { ...x, status: "error", error: e?.message || "فشل الرفع" } : x));
        }
      }));
    }
    setIsUploading(false);
  };

  const handleRemove = (id: any) => {
    dialog.confirm("حذف هذا المقطع؟", async () => {
      setBusy(true);
      try { await removeTrack({ musicId: id, tokenOverride: token }); }
      catch (e: any) { dialog.alert(e?.message || "فشل"); }
      finally { setBusy(false); }
    }, "حذف", "حذف");
  };

  const saveRename = async () => {
    if (!editId) return;
    setBusy(true);
    try {
      await renameTrack({ musicId: editId as any, name: editName, tokenOverride: token });
      setEditId(null);
    } catch (e: any) { dialog.alert(e?.message || "فشل"); }
    finally { setBusy(false); }
  };

  const doneCount = jobs.filter(j => j.status === "done").length;

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl h-[85dvh] flex flex-col overflow-hidden border-t border-purple-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Music size={18} className="text-white" />
            </div>
            <h2 className="text-white text-lg font-black">الموسيقى</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X size={20} />
          </button>
        </div>

        {/* Now playing */}
        <div className="px-4 pt-3 flex-shrink-0">
          <MusicPlayer roomId={roomId} variant="inline" />
        </div>

        {/* Tabs (Binmo style) */}
        <div className="flex border-b border-white/10 flex-shrink-0 mt-3">
          <button
            onClick={() => setTab("library")}
            className={`flex-1 py-3 text-xs font-black flex items-center justify-center gap-1.5 transition relative ${tab === "library" ? "text-white" : "text-white/50"}`}
          >
            <Library size={14} /> مكتبتي
            {tab === "library" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-400 rounded-full" />}
          </button>
          <button
            onClick={() => setTab("upload")}
            className={`flex-1 py-3 text-xs font-black flex items-center justify-center gap-1.5 transition relative ${tab === "upload" ? "text-white" : "text-white/50"}`}
          >
            <Upload size={14} /> رفع
            {tab === "upload" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-400 rounded-full" />}
          </button>
          <button
            onClick={() => setTab("search")}
            className={`flex-1 py-3 text-xs font-black flex items-center justify-center gap-1.5 transition relative ${tab === "search" ? "text-white" : "text-white/50"}`}
          >
            <Search size={14} /> بحث
            {tab === "search" && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-400 rounded-full" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "library" && (
            <div className="p-4 space-y-2">
              {tracks === undefined ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/40" size={24} /></div>
              ) : tracks.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <Music size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد مقاطع بعد</p>
                  <button onClick={() => setTab("upload")} className="mt-3 px-4 py-2 rounded-full bg-purple-500/30 text-purple-200 text-xs font-bold">
                    ارفع أول مقطع
                  </button>
                </div>
              ) : (
                tracks.map((t: any) => {
                  const isPlaying = false;
                  const isEditing = editId === t._id;
                  const isYouTube = t.source === "youtube";
                  return (
                    <div key={t._id} className={`rounded-2xl border p-3 flex items-center gap-3 border-white/10 bg-white/5`}>
                      <button
                        onClick={async () => {
                          try { await playForRoom({ roomId, musicId: t._id, tokenOverride: token }); }
                          catch (e: any) { dialog.alert(e?.message || "فشل التشغيل"); }
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-500/30 border border-purple-400/40 text-purple-200 active:scale-95"
                      >
                        <Play size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-black/40 border border-white/20 rounded-lg px-2 py-1 text-white text-sm"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            {isYouTube && <PlayCircle size={12} className="text-red-500 flex-shrink-0" />}
                            <p className="text-white text-sm font-black truncate">{t.name}</p>
                          </div>
                        )}
                        <p className="text-white/40 text-[10px]">
                          {isYouTube ? "يوتيوب" : "من الجهاز"} · {new Date(t.uploadedAt).toLocaleDateString("ar")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isEditing ? (
                          <>
                            <button onClick={saveRename} disabled={busy} className="p-2 rounded-lg bg-emerald-500/25 border border-emerald-400/40 text-emerald-200">
                              <Save size={12} />
                            </button>
                            <button onClick={() => setEditId(null)} className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/60">
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => { setEditId(t._id); setEditName(t.name); }} className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/70">
                            <Pencil size={12} />
                          </button>
                        )}
                        <button onClick={() => handleRemove(t._id)} disabled={busy} className="p-2 rounded-lg bg-red-500/25 border border-red-400/40 text-red-200 disabled:opacity-50">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "upload" && (
            <div className="p-4 space-y-3">
              <label className={`block w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer ${isUploading ? "opacity-60 pointer-events-none" : ""}`}>
                {isUploading ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
                <span>{isUploading ? "جاري الرفع..." : "اختر ملفات صوتية"}</span>
                <span className="text-[10px] opacity-80 font-normal">حتى 200 ملف دفعة واحدة · بدون حد للحجم</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".mp3,.m4a,.aac,.wav,.ogg,.flac,.opus,.wma,.m4b,audio/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) handleFiles(files);
                    e.target.value = "";
                  }}
                />
              </label>

              {jobs.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>{doneCount}/{jobs.length} مكتمل</span>
                    {!isUploading && (
                      <button onClick={() => setJobs([])} className="text-purple-300 font-bold">مسح القائمة</button>
                    )}
                  </div>
                  {jobs.map((j) => (
                    <div key={j.id} className="rounded-xl border border-white/10 bg-white/5 p-2 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                        {j.status === "done" && <Check size={12} className="text-emerald-400" />}
                        {j.status === "uploading" && <Loader2 size={12} className="text-purple-400 animate-spin" />}
                        {j.status === "error" && <X size={12} className="text-red-400" />}
                        {j.status === "pending" && <div className="w-2 h-2 rounded-full bg-white/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[10px] font-bold truncate">{j.name}</p>
                        <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden mt-1">
                          <div className={`h-full transition-all ${j.status === "error" ? "bg-red-500" : "bg-purple-500"}`} style={{ width: `${j.progress}%` }} />
                        </div>
                        {j.error && <p className="text-red-300 text-[9px] truncate mt-0.5">{j.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-white/40 text-[10px] text-center pt-2">
                التشغيل مسموع لجميع من في الغرفة
              </p>
            </div>
          )}

          {tab === "search" && (
            <div className="p-8 text-center text-white/40">
              <Search size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">بحث يوتيوب قيد التطوير</p>
              <p className="text-[10px] mt-1">قريباً — المرحلة 3</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// [moorawi-music] MusicSheet — personal library + upload
// Accessible to all users. Each user sees only their own tracks.
// Playback is LOCAL — the selected track plays on this device only.

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { uploadToCloudinary } from "../lib/cloudinary";
import { dialog } from "../lib/dialog";
import {
  X, Music, Upload, Trash2, Play, Pause, Pencil, Save,
  Loader2, Volume2, VolumeX,
} from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
  currentTrackId?: string | null;
}

export default function MusicSheet({ roomId, onClose, currentTrackId }: Props) {
  const deviceId = getDeviceId();
  const tracks = useQuery(api.music.listMine, { tokenOverride: deviceId });
  const addTrack = useMutation(api.music.addTrack);
  const removeTrack = useMutation(api.music.removeTrack);
  const renameTrack = useMutation(api.music.renameTrack);
  const playForRoom = useMutation(api.music.playForRoom);

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleUpload = async (file: File) => {
    // اسم مبدئي من الملف (بدون امتداد)
    const defaultName = file.name.replace(/\.[^.]+$/, "").slice(0, 40);
    setUploading(true);
    try {
      const res = await uploadToCloudinary(file, "video"); // video يدعم الصوت أيضاً
      await addTrack({
        name: defaultName || "مقطع",
        url: res.url,
        tokenOverride: deviceId,
      });
      dialog.alert("تم رفع المقطع");
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (id: any) => {
    dialog.confirm("حذف هذا المقطع؟", async () => {
      setBusy(true);
      try {
        await removeTrack({ musicId: id, tokenOverride: deviceId });
      } catch (e: any) {
        dialog.alert(e?.message || "فشل");
      } finally {
        setBusy(false);
      }
    }, "حذف", "حذف");
  };

  const saveRename = async () => {
    if (!editId) return;
    setBusy(true);
    try {
      await renameTrack({ musicId: editId as any, name: editName, tokenOverride: deviceId });
      setEditId(null);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl h-[80dvh] flex flex-col overflow-hidden border-t border-purple-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Music size={18} className="text-white" />
            </div>
            <h2 className="text-white text-lg font-black">مكتبة الموسيقى</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X size={20} />
          </button>
        </div>

        {/* Upload */}
        <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
          <label className={`w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "جاري الرفع..." : "رفع مقطع جديد"}
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,video/mp4,video/webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
          </label>
          <p className="text-white/40 text-[10px] text-center mt-2">
            عند التشغيل، سيسمع المقطع جميع من في الغرفة
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tracks === undefined ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-white/40" size={24} />
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <Music size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد مقاطع بعد</p>
            </div>
          ) : (
            tracks.map((t: any) => {
              const isPlaying = currentTrackId === t._id;
              const isEditing = editId === t._id;
              return (
                <div
                  key={t._id}
                  className={`rounded-2xl border p-3 flex items-center gap-3 ${
                    isPlaying ? "border-emerald-400/60 bg-emerald-500/10" : "border-white/10 bg-white/5"
                  }`}
                >
                  <button
                    onClick={async () => {
                      try {
                        await playForRoom({ roomId, musicId: t._id, tokenOverride: deviceId });
                      } catch (e: any) {
                        dialog.alert(e?.message || "فشل التشغيل");
                      }
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                      isPlaying ? "bg-emerald-500 text-white" : "bg-purple-500/30 border border-purple-400/40 text-purple-200"
                    }`}
                  >
                    {isPlaying ? <Volume2 size={16} /> : <Play size={16} />}
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
                      <p className="text-white text-sm font-black truncate">{t.name}</p>
                    )}
                    <p className="text-white/40 text-[10px]">
                      {new Date(t.uploadedAt).toLocaleDateString("ar")}
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
      </div>
    </div>
  );
}

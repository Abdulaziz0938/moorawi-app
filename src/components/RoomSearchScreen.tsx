// [moorawi-rooms] Full-screen room search
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import { ChevronRight, Search, Loader2, Users, X, Home } from "lucide-react";
import Card from "./ui/Card";
import SectionTitle from "./ui/SectionTitle";
import { getActiveToken } from "../lib/session";

interface Props {
  onClose: () => void;
  onEnter: (roomId: Id<"rooms">) => void;
}

export default function RoomSearchScreen({ onClose, onEnter }: Props) {
  const deviceId = getDeviceId();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const joinRoom = useMutation(api.rooms.join);

  const results = useQuery(
    api.rooms.search,
    submitted.length > 0 ? { q: submitted } : "skip" as any
  );

  const handleSubmit = () => {
    if (q.trim().length > 0) setSubmitted(q.trim());
  };

  const handleEnter = async (roomId: Id<"rooms">) => {
    try {
      await joinRoom({ roomId, tokenOverride: getActiveToken() ?? deviceId });
      onEnter(roomId);
      onClose();
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الدخول");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-slate-900 via-slate-950 to-black flex flex-col" dir="rtl">
      {/* ===== Header ===== */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-white/10">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95"
        >
          <ChevronRight size={20} />
        </button>
<Card tone="default" padding="md" className="flex-1 flex items-center gap-2">
          <Search size={16} className="text-white/50" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="ابحث بالاسم أو رقم الغرفة..."
            className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm outline-none"
          />
          {q.length > 0 && (
            <button onClick={() => { setQ(""); setSubmitted(""); }} className="text-white/50">
              <X size={14} />
            </button>
          )}
        </Card>
        <button
          onClick={handleSubmit}
          disabled={!q.trim()}
          className="h-10 px-4 rounded-full bg-purple-600 text-white text-sm font-black disabled:opacity-40 active:scale-95"
        >
          بحث
        </button>
      </div>

      {/* ===== Results ===== */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {submitted.length === 0 && (
<Card tone="default" padding="lg">
            <div className="text-center py-12 text-white/40">
              <Search size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">ابحث عن غرفة بالاسم أو رقم الغرفة</p>
            </div>
          </Card>
        )}

        {submitted.length > 0 && results === undefined && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-white/40" />
          </div>
        )}

        {submitted.length > 0 && results && results.length === 0 && (
<Card tone="default" padding="lg">
            <div className="text-center py-12 text-white/40">
              <p className="text-sm">لا توجد نتائج</p>
            </div>
          </Card>
        )}

        {results && results.length > 0 && (
          <div className="space-y-2">
            {results.map((r: any) => (
<Card
                key={r._id}
                interactive
                onClick={() => handleEnter(r._id)}
                className="flex items-center gap-3"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 flex items-center justify-center">
                  {r.coverUrl ? (
                    <img src={r.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Home size={22} className="text-purple-300/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white text-sm font-black truncate">{r.name}</p>
                  <p className="text-white/50 text-[10px] truncate">{r.welcomeMessage || "—"}</p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-emerald-300 text-[10px] flex items-center gap-0.5">
                      <Users size={10} /> {r.onlineCount}
                    </span>
                    <span className="text-white/40 text-[10px]">ID:{r.roomNumber ?? "—"}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/30" />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

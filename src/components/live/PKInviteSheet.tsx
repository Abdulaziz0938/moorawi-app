// [ezo-live-pk] دعوة مذيعة أخرى لمنافسة PK
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getDeviceId } from "../../lib/device";
import { getActiveToken } from "../../lib/session";
import { dialog } from "../../lib/dialog";
import VipAvatar from "../ui/VipAvatar";
import { X, Swords, Loader2, Search, Users } from "lucide-react";

interface Props {
  streamId: string;
  onClose: () => void;
  onInviteSent: (coHostName: string) => void;
}

export default function PKInviteSheet({ streamId, onClose, onInviteSent }: Props) {
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;

  // قائمة المذيعات النشطات (لبث PK)
  const liveStreams = useQuery(api.live.listLive, { limit: 30 });
  const invitePK = useMutation(api.live.invitePK);

  const [selectedHostId, setSelectedHostId] = useState<Id<"users"> | null>(null);
  const [selectedHostName, setSelectedHostName] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"casual" | "pk">("casual");

  // استثناء نفسي
  const me = useQuery(api.profiles.me, { tokenOverride: token });
  const otherStreams = (liveStreams ?? []).filter((s: any) => s._id !== streamId && s.hostId !== me?._id);

  const filtered = search.trim()
    ? otherStreams.filter((s: any) => s.hostName.includes(search.trim()))
    : otherStreams;

  const handleStart = async () => {
    if (!selectedHostId) {
      dialog.alert("اختر مذيعة أولاً");
      return;
    }
    setBusy(true);
    try {
      await invitePK({
        streamId: streamId as Id<"liveStreams">,
        coHostId: selectedHostId,
        mode,
        tokenOverride: token,
      });
      onInviteSent(selectedHostName);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل إرسال الدعوة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] bg-black/85 backdrop-blur-sm flex items-end"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="w-full max-w-md mx-auto bg-gradient-to-b from-slate-900 to-black rounded-t-3xl max-h-[80dvh] flex flex-col border-t border-amber-400/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
              mode === "pk" ? "bg-amber-500/20" : "bg-cyan-500/20"
            }`}>
              {mode === "pk" ? (
                <Swords size={18} className="text-amber-400" />
              ) : (
                <Users size={18} className="text-cyan-400" />
              )}
            </div>
            <div>
              <h2 className="text-white text-base font-black">
                {mode === "pk" ? "منافسة PK" : "دعوة للجلوس"}
              </h2>
              <p className="text-white/50 text-[10px]">
                {mode === "pk" ? "5 دقائق — الهدايا تحدد الفائزة" : "بث مشترك مع ضيفة"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-4 pt-3 flex gap-2">
          <button
            onClick={() => setMode("casual")}
            className={`flex-1 h-11 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
              mode === "casual"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                : "bg-white/5 text-white/50 border border-white/10"
            }`}
          >
            <Users size={14} />
            جلوس مشترك
          </button>
          <button
            onClick={() => setMode("pk")}
            className={`flex-1 h-11 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 ${
              mode === "pk"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
                : "bg-white/5 text-white/50 border border-white/10"
            }`}
          >
            <Swords size={14} />
            منافسة PK
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Search size={14} className="text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن مذيعة..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Hosts list */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Swords size={40} className="text-white/20 mb-3" />
              <p className="text-white/60 text-sm font-black">لا توجد مذيعات متصلات</p>
              <p className="text-white/40 text-[10px] mt-1">
                انتظر ظهور بث من مذيعة أخرى
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((s: any) => {
                const sel = selectedHostId === s.hostId;
                return (
                  <button
                    key={s._id}
                    onClick={() => {
                      setSelectedHostId(s.hostId);
                      setSelectedHostName(s.hostName);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-2xl border transition active:scale-95 ${
                      sel
                        ? "bg-amber-500/20 border-amber-400"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <VipAvatar
                      src={s.hostAvatarUrl}
                      name={s.hostName}
                      size={36}
                      vip={s.hostVipLevel}
                      ring={s.hostVipLevel === 0}
                    />
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-white text-[11px] font-black truncate">
                        {s.hostName}
                      </div>
                      <div className="text-white/50 text-[9px]">
                        {s.viewerCount} مشاهد
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Start button */}
        <div className="p-4 border-t border-white/10">
          {selectedHostId ? (
            <button
              onClick={handleStart}
              disabled={busy}
              className={`w-full h-12 rounded-2xl text-white font-black text-sm shadow-2xl active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 ${
              mode === "pk"
                ? "bg-gradient-to-r from-amber-500 to-orange-600"
                : "bg-gradient-to-r from-cyan-500 to-blue-600"
            }`}
            >
              {busy ? (
                <Loader2 size={18} className="animate-spin" />
              ) : mode === "pk" ? (
                <>
                  <Swords size={18} />
                  أرسل تحدّي PK إلى {selectedHostName}
                </>
              ) : (
                <>
                  <Users size={18} />
                  أرسل دعوة جلوس إلى {selectedHostName}
                </>
              )}
            </button>
          ) : (
            <div className="text-center text-white/40 text-xs py-2">
              اختر مذيعة من القائمة أعلاه
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

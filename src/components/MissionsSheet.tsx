// [moorawi-missions] المهام اليومية + الأسبوعية
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { dialog } from "../lib/dialog";
import { useBackButton } from "../lib/hooks/useBackButton";
import { Header, Spinner, Empty } from "./VisitsSheet";
import { CheckSquare, Check, Loader2, Gift, Clock, Trophy, Coins } from "lucide-react";
import { getActiveToken } from "../lib/session";

interface Props { onClose: () => void; }

type Tab = "daily" | "weekly";

export default function MissionsSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const data = useQuery(api.missions.myProgress, { tokenOverride: getActiveToken() ?? deviceId });
  const claim = useMutation(api.missions.claim);
  const [tab, setTab] = useState<Tab>("daily");
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleClaim = async (missionId: string, reward: number) => {
    setBusyId(missionId);
    try {
      await claim({ missionId: missionId as any, tokenOverride: getActiveToken() ?? deviceId });
      dialog.alert(`تم استلام ${reward} عملة ✅`);
    } catch (e: any) {
      dialog.alert(e?.message || "فشل الاستلام");
    } finally {
      setBusyId(null);
    }
  };

  if (data === undefined) {
    return (
      <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
        <Header onClose={onClose} title="المهام" assetKey="ui.sheet.mission" />
        <Spinner />
      </div>
    );
  }

  const list = tab === "daily" ? data.daily : data.weekly;
  const completedCount = list.filter((m: any) => m.completed && !m.claimed).length;

  return (
    <div className="fixed inset-0 z-[160] bg-gradient-to-b from-slate-900 to-black flex flex-col" dir="rtl">
      <Header onClose={onClose} title="المهام" assetKey="ui.sheet.mission" />

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 pb-3 flex-shrink-0">
        <button
          onClick={() => setTab("daily")}
          className={`flex-1 py-2 rounded-xl border text-xs font-black transition ${
            tab === "daily" ? "bg-emerald-500/25 border-emerald-400/60 text-white" : "bg-white/5 border-white/10 text-white/60"
          }`}
        >
          <Clock size={12} className="inline ml-1" />
          يومية ({data.daily.length})
        </button>
        <button
          onClick={() => setTab("weekly")}
          className={`flex-1 py-2 rounded-xl border text-xs font-black transition ${
            tab === "weekly" ? "bg-purple-500/25 border-purple-400/60 text-white" : "bg-white/5 border-white/10 text-white/60"
          }`}
        >
          <Trophy size={12} className="inline ml-1" />
          أسبوعية ({data.weekly.length})
        </button>
      </div>

      {/* Progress summary */}
      {completedCount > 0 && (
        <div className="mx-4 mb-3 rounded-xl bg-amber-500/15 border border-amber-400/40 p-3 flex items-center justify-center gap-2">
          <Gift size={14} className="text-amber-300" />
          <span className="text-amber-200 text-xs font-black">
            {completedCount} مكافأة جاهزة للاستلام
          </span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {list.length === 0 ? (
          <Empty icon={CheckSquare} text="لا توجد مهام" />
        ) : (
          list.map((m: any) => {
            const pct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0;
            const isBusy = busyId === m._id;
            return (
              <div key={m._id} className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    m.claimed ? "bg-emerald-500/20 border border-emerald-400/40" :
                    m.completed ? "bg-amber-500/20 border border-amber-400/40" :
                    "bg-white/5 border border-white/10"
                  }`}>
                    {m.claimed ? (
                      <Check size={18} className="text-emerald-400" />
                    ) : m.completed ? (
                      <Gift size={18} className="text-amber-300" />
                    ) : (
                      <CheckSquare size={18} className="text-white/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-black">{m.title}</p>
                    {m.description && (
                      <p className="text-white/50 text-[11px] mt-0.5">{m.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Coins size={12} className="text-amber-300" />
                      <span className="text-amber-200 text-xs font-black" dir="ltr">+{m.reward}</span>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        m.completed ? "bg-gradient-to-r from-amber-400 to-yellow-500" : "bg-gradient-to-r from-emerald-400 to-teal-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-white/40 text-[10px] tabular-nums" dir="ltr">
                    {m.progress}/{m.target}
                  </span>
                </div>

                {/* Claim button */}
                {m.completed && !m.claimed && (
                  <button
                    onClick={() => handleClaim(m._id, m.reward)}
                    disabled={isBusy}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 py-2.5 text-white text-xs font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                    استلام المكافأة
                  </button>
                )}

                {m.claimed && (
                  <p className="text-center text-emerald-400 text-[10px] font-black">
                    ✓ تم الاستلام
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

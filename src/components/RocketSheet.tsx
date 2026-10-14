// [ezo-rockets] شيت الصاروخ — Binmo-style energy system UI
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { getActiveToken } from "../lib/session";
import { useBackButton } from "../lib/hooks/useBackButton";
import { X, Gift, Trophy, ChevronLeft, Loader2, Sparkles } from "lucide-react";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
  onOpenGiftSheet?: () => void;
}

interface RocketState {
  levelIndex: number;
  name: string;
  color: string;
  img: string;
  vehicle: string;
  frame: string;
  threshold: number;
  currentEnergy: number;
  progress: number;
  launched: boolean;
  mvpUserId: string | null;
  lastHitUserId: string | null;
}

export default function RocketSheet({ roomId, onClose, onOpenGiftSheet }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;

  const rocketState = useQuery(api.rockets.getState, { roomId }) as RocketState[] | undefined;
  const history = useQuery(api.rockets.listRoomHistory, { roomId, limit: 10 });
  const myRewards = useQuery(api.rockets.listMyRewards, {
    tokenOverride: token,
    limit: 30,
  });
  const claimReward = useMutation(api.rockets.claimReward);

  const [selectedLevel, setSelectedLevel] = useState(0);
  const [tab, setTab] = useState<"main" | "history" | "rewards">("main");
  const [launching, setLaunching] = useState<number | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const current = rocketState?.[selectedLevel];

  // كشف الإطلاق التلقائي
  useEffect(() => {
    if (!rocketState) return;
    const idx = rocketState.findIndex((r) => r.progress >= 100 && !r.launched);
    if (idx !== -1) {
      setLaunching(idx);
      const t = setTimeout(() => setLaunching(null), 4000);
      return () => clearTimeout(t);
    }
  }, [rocketState]);

  // اختيار أول صاروخ غير منطلق
  useEffect(() => {
    if (!rocketState) return;
    const firstActive = rocketState.findIndex((r) => !r.launched);
    if (firstActive !== -1 && selectedLevel > firstActive) {
      setSelectedLevel(firstActive);
    }
  }, [rocketState, selectedLevel]);

  const unclaimedCount = useMemo(
    () => (myRewards ?? []).filter((r: any) => !r.claimed).length,
    [myRewards]
  );

  const handleClaim = async (id: string) => {
    setClaiming(id);
    try {
      await claimReward({ rewardId: id as any, tokenOverride: token });
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden flex flex-col" dir="rtl">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-50"
        style={{ backgroundImage: "url(/ui/rocket-bg.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/95" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-6">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("main")}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition ${
              tab === "main"
                ? "bg-yellow-400 text-black"
                : "bg-white/10 text-white/70"
            }`}
          >
            الصاروخ
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition ${
              tab === "history"
                ? "bg-yellow-400 text-black"
                : "bg-white/10 text-white/70"
            }`}
          >
            سجل الغرفة
          </button>
          <button
            onClick={() => setTab("rewards")}
            className={`relative px-4 py-1.5 rounded-full text-xs font-black transition ${
              tab === "rewards"
                ? "bg-yellow-400 text-black"
                : "bg-white/10 text-white/70"
            }`}
          >
            تسجيلي
            {unclaimedCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {unclaimedCount}
              </span>
            )}
          </button>
        </div>

        <div className="w-10 h-10" />
      </div>

      {/* MAIN TAB */}
      {tab === "main" && (
        <>
          {/* Rocket strip */}
          <div className="relative z-10 flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {rocketState === undefined
              ? [0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-[80px] h-[140px] rounded-2xl bg-white/5 animate-pulse"
                  />
                ))
              : rocketState.map((r, idx) => {
                  const isSelected = selectedLevel === idx;
                  const isLaunched = r.launched;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedLevel(idx)}
                      className={`relative flex-shrink-0 w-[80px] rounded-2xl p-2 border-2 transition-all ${
                        isSelected
                          ? "border-yellow-400 bg-white/15 scale-105"
                          : "border-white/15 bg-white/5"
                      } ${isLaunched ? "opacity-40" : ""}`}
                    >
                      <img
                        src={r.img}
                        alt={r.name}
                        className={`w-12 h-16 mx-auto object-contain ${
                          launching === idx ? "animate-bounce" : ""
                        }`}
                      />
                      <div className="mt-1 text-[11px] font-black text-white text-center">
                        {r.name}
                      </div>
                      <div className="text-[9px] text-white/60 text-center">
                        {r.threshold >= 1_000_000
                          ? `${(r.threshold / 1_000_000).toFixed(1)}M`
                          : `${Math.round(r.threshold / 1000)}K`}
                      </div>
                      <div className="mt-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${r.progress}%`,
                            background: r.color,
                            boxShadow: `0 0 8px ${r.color}`,
                          }}
                        />
                      </div>
                      <div className="text-[8px] text-white/60 mt-0.5 text-center font-bold">
                        {Math.round(r.progress)}%
                      </div>
                      {isLaunched && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-[9px] font-black bg-red-500/80 px-2 py-0.5 rounded-full">
                            انطلق
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
          </div>

          {/* Selected rocket display */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 min-h-0">
            {!current ? (
              <Loader2 className="text-white/40 animate-spin" size={32} />
            ) : (
              <div className="flex flex-col items-center w-full max-w-[360px]">
                <div className="relative mb-4">
                  {launching === selectedLevel && (
                    <img
                      src="/ui/glow-gold.png"
                      className="absolute inset-0 w-[180%] h-[180%] -m-[40%] asset-blend animate-ping"
                      alt=""
                    />
                  )}
                  <img
                    src={current.img}
                    alt={current.name}
                    className={`w-40 h-56 object-contain drop-shadow-2xl transition-transform ${
                      launching === selectedLevel
                        ? "animate-[rocketLaunch_2.5s_ease-in_forwards]"
                        : "animate-[rocketFloat_2.5s_ease-in-out_infinite]"
                    }`}
                  />
                </div>

                {/* Progress panel */}
                <div className="w-full bg-black/50 backdrop-blur-xl rounded-3xl p-4 border border-white/15">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-black text-base">
                      صاروخ {current.name}
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-white text-[11px] font-black"
                      style={{ background: current.color }}
                    >
                      {current.threshold >= 1_000_000
                        ? `${(current.threshold / 1_000_000).toFixed(1)}M`
                        : `${Math.round(current.threshold / 1000)}K`}
                    </span>
                  </div>

                  <div className="h-3 bg-black/50 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${current.progress}%`,
                        background: `linear-gradient(90deg, ${current.color}, ${current.color}dd)`,
                        boxShadow: `0 0 16px ${current.color}`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <span className="text-white/60">
                      {current.currentEnergy.toLocaleString()} / {current.threshold.toLocaleString()}
                    </span>
                    <span className="text-white font-black" style={{ color: current.color }}>
                      {Math.round(current.progress)}%
                    </span>
                  </div>

                  {/* Rewards preview */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-white/5 rounded-2xl p-2 flex flex-col items-center">
                      <img
                        src={current.vehicle}
                        className="w-14 h-10 object-contain asset-blend"
                        alt=""
                      />
                      <span className="text-[10px] text-white/70 mt-1">مركبة</span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-2 flex flex-col items-center">
                      <img
                        src={current.frame}
                        className="w-10 h-10 object-contain asset-blend"
                        alt=""
                      />
                      <span className="text-[10px] text-white/70 mt-1">إطار</span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-2 flex flex-col items-center">
                      <img
                        src={`/rewards/vip${
                          selectedLevel === 0 ? 1 : selectedLevel <= 2 ? 2 : 3
                        }.png`}
                        className="w-14 h-6 object-contain asset-blend mt-2"
                        alt=""
                      />
                      <span className="text-[10px] text-white/70 mt-1">VIP</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom action */}
          <div className="relative z-10 p-4 pb-8">
            <button
              onClick={onOpenGiftSheet}
              className="w-full h-14 rounded-2xl font-black text-base text-white shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(90deg, ${
                  current?.color ?? "#fbbf24"
                }, ${(current?.color ?? "#fbbf24") + "cc"})`,
              }}
            >
              <Gift size={20} />
              أرسل هدية لشحن الصاروخ
            </button>
            <div className="text-center text-white/40 text-[11px] mt-2">
              كل هدية = نقاط طاقة • يتصفر يومياً 00:00 بتوقيت الرياض
            </div>
          </div>
        </>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div className="relative z-10 flex-1 overflow-y-auto p-4">
          {!history ? (
            <div className="flex justify-center py-16">
              <Loader2 className="text-white/40 animate-spin" size={32} />
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              title="لا توجد إطلاقات بعد"
              subtitle="أرسل الهدايا لشحن الصاروخ وإطلاقه"
            />
          ) : (
            <div className="space-y-2">
              {history.map((evt: any) => (
                <div
                  key={evt._id}
                  className="bg-white/5 backdrop-blur rounded-2xl p-3 border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={`/rockets/rocket-${
                          ["green", "blue", "purple", "red", "gold"][evt.levelIndex]
                        }.png`}
                        className="w-8 h-12 object-contain"
                        alt=""
                      />
                      <div>
                        <div className="text-white font-black text-sm">
                          صاروخ {evt.levelName}
                        </div>
                        <div className="text-white/50 text-[10px]">
                          {new Date(evt.createdAt).toLocaleString("ar-EG")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-300 text-xs font-black">
                        {evt.totalValue.toLocaleString()}
                      </div>
                      <div className="text-white/50 text-[10px]">
                        {evt.recipientCount} مستلم
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[11px]">
                    <Trophy size={12} className="text-amber-400" />
                    <span className="text-white/70">
                      MVP: <span className="text-amber-400 font-bold">{evt.mvpUserName}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REWARDS TAB */}
      {tab === "rewards" && (
        <div className="relative z-10 flex-1 overflow-y-auto p-4">
          {!myRewards ? (
            <div className="flex justify-center py-16">
              <Loader2 className="text-white/40 animate-spin" size={32} />
            </div>
          ) : myRewards.length === 0 ? (
            <EmptyState
              title="لا توجد مكافآت حتى الآن"
              subtitle="استكشف المزيد من الغرف وجرب حظك!"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {myRewards.map((r: any) => (
                <div
                  key={r._id}
                  className={`bg-white/5 backdrop-blur rounded-2xl p-3 border ${
                    r.claimed ? "border-white/10 opacity-60" : "border-yellow-400/40"
                  }`}
                >
                  <div className="flex items-center justify-center h-16">
                    <img
                      src={r.rewardImgUrl}
                      className="max-w-full max-h-full object-contain asset-blend"
                      alt=""
                    />
                  </div>
                  <div className="text-center mt-2">
                    <div className="text-white text-[11px] font-black">
                      {r.levelName}
                    </div>
                    <div className="text-white/50 text-[10px]">
                      {r.rewardAmount
                        ? `${r.rewardAmount.toLocaleString()} ${
                            r.rewardType === "bcoins" ? "B" : "🪙"
                          }`
                        : r.rewardType === "vip"
                        ? "VIP"
                        : r.rewardType === "vehicle"
                        ? "مركبة"
                        : "إطار"}
                    </div>
                  </div>
                  {r.claimed ? (
                    <div className="text-center text-[10px] text-white/40 mt-2">
                      تم الاستلام
                    </div>
                  ) : (
                    <button
                      onClick={() => handleClaim(r._id)}
                      disabled={claiming === r._id}
                      className="w-full mt-2 py-1.5 rounded-full bg-yellow-400 text-black text-[11px] font-black active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {claiming === r._id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      استلام
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================================================================
// Empty State
// ================================================================
function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <img
        src="/ui/treasure-box-closed.png"
        alt=""
        className="w-32 h-32 object-contain asset-blend opacity-50"
      />
      <p className="text-white/70 text-sm font-bold mt-4">{title}</p>
      <p className="text-white/40 text-xs mt-1">{subtitle}</p>
    </div>
  );
}

// [ezo-rockets] شيت الصاروخ — Binmo style (rocket hero + circular progress)
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getDeviceId } from "../lib/device";
import { getActiveToken } from "../lib/session";
import { useBackButton } from "../lib/hooks/useBackButton";
import { X, Gift, Loader2 } from "lucide-react";
import RocketLaunchOverlay from "./RocketLaunchOverlay";

interface Props {
  roomId: Id<"rooms">;
  onClose: () => void;
  onOpenGiftSheet?: () => void;
  autoOpenRewards?: boolean;
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
}

// عدّاد تنازلي حتى منتصف الليل GMT+3
function useResetCountdown() {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const gmt3 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const midnight = new Date(gmt3);
      midnight.setUTCHours(24, 0, 0, 0);
      const diff = midnight.getTime() - gmt3.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setRemaining(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return remaining;
}

export default function RocketSheet({ roomId, onClose, onOpenGiftSheet, autoOpenRewards }: Props) {
  useBackButton(true, onClose);
  const deviceId = getDeviceId();
  const token = getActiveToken() ?? deviceId;
  const resetIn = useResetCountdown();

  const rocketState = useQuery(api.rockets.getState, { roomId }) as RocketState[] | undefined;
  const history = useQuery(api.rockets.listRoomHistory, { roomId, limit: 10 });
  const myRewards = useQuery(api.rockets.listMyRewards, { tokenOverride: token, limit: 20 });
  const claimReward = useMutation(api.rockets.claimReward);

  const [selectedLevel, setSelectedLevel] = useState(0);
  const [tab, setTab] = useState<"main" | "history" | "rewards">("main");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [launchAnim, setLaunchAnim] = useState<{
    rocket: { img: string; color: string; name: string };
    launcher: { avatarUrl?: string; name: string };
  } | null>(null);
  const [showRewardsAfterLaunch, setShowRewardsAfterLaunch] = useState(false);

  // [ezo-rocket] فتح المكافآت تلقائياً عند الإطلاق
  useEffect(() => {
    if (autoOpenRewards) setShowRewardsAfterLaunch(true);
  }, [autoOpenRewards]);
  const seenLaunchIdsRef = useRef<Set<string>>(new Set());
  const initDoneRef = useRef(false);

  const current = rocketState?.[selectedLevel];

  useEffect(() => {
    if (!rocketState) return;
    const firstActive = rocketState.findIndex((r) => !r.launched);
    if (firstActive !== -1) setSelectedLevel(firstActive);
  }, [rocketState]);

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

  // [ezo-launch] كشف الإطلاق الجديد
  useEffect(() => {
    if (!history || !rocketState) return;

    if (!initDoneRef.current) {
      history.forEach((evt: any) => seenLaunchIdsRef.current.add(evt._id));
      initDoneRef.current = true;
      return;
    }

    for (const evt of history) {
      if (!seenLaunchIdsRef.current.has(evt._id)) {
        seenLaunchIdsRef.current.add(evt._id);
        const rocket = rocketState.find((r) => r.levelIndex === evt.levelIndex);
        if (rocket) {
          setLaunchAnim({
            rocket: { img: rocket.img, color: rocket.color, name: rocket.name },
            launcher: {
              avatarUrl: evt.lastHitAvatarUrl ?? undefined,
              name: evt.lastHitUserName ?? "لاعب",
            },
          });
        }
        break;
      }
    }
  }, [history, rocketState]);

  // حسابات SVG للـ progress الدائري
  const R = 26;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - (current?.progress ?? 0) / 100);
  const ringColor = current?.color ?? "#fbbf24";

  return (
    <div className="fixed inset-0 z-[300]" dir="rtl">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-visible shadow-2xl animate-slide-up">
        {/* Big rocket — floats above sheet */}
        {current && tab === "main" && (
          <div className="absolute -top-[140px] left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
            {/* Rocket — 3x bigger, no ring */}
            <img
              src={current.img}
              alt={current.name}
              className="w-40 h-56 object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] animate-[rocketFloat_2.5s_ease-in-out_infinite]"
            />

            {/* Horizontal progress bar below rocket */}
            <div className="w-44 h-2 bg-black/60 rounded-full overflow-hidden mt-1 border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${current.progress}%`,
                  background: `linear-gradient(90deg, ${current.color}, ${current.color}dd)`,
                  boxShadow: `0 0 8px ${current.color}`,
                }}
              />
            </div>
            <span
              className="text-[10px] font-black mt-1 tabular-nums"
              style={{ color: current.color, textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
            >
              {Math.round(current.progress)}%
            </span>
          </div>
        )}

        {/* Sheet body */}
        <div className="relative rounded-t-3xl overflow-hidden">
          {/* Background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/ui/rocket-bg.jpg)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black/95" />

          {/* Content */}
          <div className="relative z-10 flex flex-col">
            {/* Handle + Close */}
            <div className="flex items-center justify-between px-4 pt-2 pb-1">
              <div className="w-8" />
              <div className="w-10 h-1 rounded-full bg-white/30" />
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white active:scale-90 transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-center gap-1.5 px-3 pt-1 pb-2">
              <button
                onClick={() => setTab("main")}
                className={`px-3 py-1 rounded-full text-[11px] font-black transition ${
                  tab === "main" ? "bg-yellow-400 text-black" : "bg-white/10 text-white/70"
                }`}
              >
                الصاروخ
              </button>
              <button
                onClick={() => setTab("history")}
                className={`px-3 py-1 rounded-full text-[11px] font-black transition ${
                  tab === "history" ? "bg-yellow-400 text-black" : "bg-white/10 text-white/70"
                }`}
              >
                السجل
              </button>
              <button
                onClick={() => setTab("rewards")}
                className={`relative px-3 py-1 rounded-full text-[11px] font-black transition ${
                  tab === "rewards" ? "bg-yellow-400 text-black" : "bg-white/10 text-white/70"
                }`}
              >
                تسجيلي
                {unclaimedCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">
                    {unclaimedCount}
                  </span>
                )}
              </button>
            </div>

            {/* ============ MAIN TAB ============ */}
            {tab === "main" && (
              <>
                {/* Spacer for floating rocket */}
                <div className="h-[140px]" />

                {/* Timer */}
                <div className="text-center text-white/70 text-[10px] font-bold">
                  <span className="text-white/50">إعادة التعيين</span>{" "}
                  <span className="text-yellow-300 font-black tabular-nums">{resetIn}</span>
                </div>

                {/* Level selector — small rockets */}
                <div className="flex items-end justify-center gap-4 px-4 pt-3 pb-3">
                  {rocketState === undefined
                    ? [0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-10 h-14 rounded bg-white/5 animate-pulse" />
                      ))
                    : rocketState.map((r, idx) => {
                        const sel = selectedLevel === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedLevel(idx)}
                            className="flex flex-col items-center active:scale-95 transition-transform"
                          >
                            <div className={`transition-all ${sel ? "scale-110" : "opacity-55"}`}>
                              <img
                                src={r.img}
                                alt={r.name}
                                className="w-9 h-12 object-contain"
                              />
                            </div>
                            <div className="w-9 h-1 bg-black/60 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${r.progress}%`,
                                  background: r.color,
                                  boxShadow: sel ? `0 0 6px ${r.color}` : "none",
                                }}
                              />
                            </div>
                          </button>
                        );
                      })}
                </div>

                {/* Rewards row */}
                {current && (
                  <div className="flex gap-2 px-4 pb-3">
                    <div className="flex-1 bg-black/40 backdrop-blur rounded-xl p-2 flex flex-col items-center border border-white/10">
                      <img
                        src="/rewards/coins-large.webp"
                        alt=""
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div className="flex-1 bg-black/40 backdrop-blur rounded-xl p-2 flex flex-col items-center border border-white/10">
                      <img
                        src="/rewards/bcoins-large.webp"
                        alt=""
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div className="flex-1 bg-black/40 backdrop-blur rounded-xl p-2 flex flex-col items-center border border-white/10">
                      <img
                        src={`/rewards/vip${
                          selectedLevel === 0 ? 1 : selectedLevel <= 2 ? 2 : 3
                        }.png`}
                        alt=""
                        className="w-12 h-6 object-contain mt-2"
                      />
                    </div>
                    <div className="flex-1 bg-black/40 backdrop-blur rounded-xl p-2 flex flex-col items-center border border-white/10">
                      <img
                        src={current.vehicle}
                        alt=""
                        className="w-10 h-7 object-contain mt-1"
                      />
                    </div>
                    <div className="flex-1 bg-black/40 backdrop-blur rounded-xl p-2 flex flex-col items-center border border-white/10">
                      <img
                        src={current.frame}
                        alt=""
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Send button */}
                <div className="px-4 pb-5">
                  <button
                    onClick={onOpenGiftSheet}
                    className="w-full h-11 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
                    style={{
                      background: current
                        ? `linear-gradient(90deg, ${current.color}, ${current.color}cc)`
                        : "linear-gradient(90deg,#fbbf24,#f59e0b)",
                    }}
                  >
                    <Gift size={16} />
                    أرسل هدية
                  </button>
                </div>
              </>
            )}

            {/* ============ HISTORY TAB ============ */}
            {tab === "history" && (
              <div className="max-h-[55dvh] overflow-y-auto px-3 pb-5 pt-2">
                {!history ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="text-white/40 animate-spin" size={24} />
                  </div>
                ) : history.length === 0 ? (
                  <MiniEmpty
                    title="لا توجد إطلاقات بعد"
                    subtitle="أرسل هدايا لشحن الصاروخ"
                  />
                ) : (
                  <div className="space-y-1.5">
                    {history.map((evt: any) => (
                      <div
                        key={evt._id}
                        className="flex items-center gap-2 bg-white/5 rounded-xl p-2 border border-white/10"
                      >
                        <img
                          src={`/rockets/rocket-${
                            ["green", "blue", "purple", "red", "gold"][evt.levelIndex]
                          }.png`}
                          className="w-6 h-8 object-contain"
                          alt=""
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-[11px] font-black">
                            صاروخ {evt.levelName}
                          </div>
                          <div className="text-white/50 text-[9px] truncate">
                            MVP: {evt.mvpUserName} • {evt.recipientCount} مستلم
                          </div>
                        </div>
                        <div className="text-yellow-300 text-[10px] font-black">
                          {evt.totalValue.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ============ REWARDS TAB ============ */}
            {tab === "rewards" && (
              <div className="max-h-[55dvh] overflow-y-auto px-3 pb-5 pt-2">
                {!myRewards ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="text-white/40 animate-spin" size={24} />
                  </div>
                ) : myRewards.length === 0 ? (
                  <MiniEmpty
                    title="لا توجد مكافآت بعد"
                    subtitle="جرّب حظك في إطلاق الصاروخ"
                  />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {myRewards.map((r: any) => (
                      <div
                        key={r._id}
                        className={`bg-white/5 rounded-xl p-2 border flex flex-col items-center ${
                          r.claimed ? "border-white/10 opacity-50" : "border-yellow-400/40"
                        }`}
                      >
                        <img
                          src={r.rewardImgUrl}
                          alt=""
                          className="w-10 h-10 object-contain"
                        />
                        <div className="text-white text-[9px] font-black mt-1 text-center">
                          {r.rewardAmount
                            ? `${r.rewardAmount}`
                            : r.rewardType === "vip"
                            ? "VIP"
                            : r.rewardType === "vehicle"
                            ? "مركبة"
                            : "إطار"}
                        </div>
                        {r.claimed ? (
                          <span className="text-[8px] text-white/40 mt-1">✓</span>
                        ) : (
                          <button
                            onClick={() => handleClaim(r._id)}
                            disabled={claiming === r._id}
                            className="w-full mt-1 py-0.5 rounded-full bg-yellow-400 text-black text-[9px] font-black active:scale-95 transition"
                          >
                            {claiming === r._id ? "..." : "استلام"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Launch Animation */}
      {launchAnim && (
        <RocketLaunchOverlay
          rocket={launchAnim.rocket}
          launcher={launchAnim.launcher}
          onComplete={() => {
            setLaunchAnim(null);
            setShowRewardsAfterLaunch(true);
          }}
        />
      )}

      {/* Rewards popup after launch */}
      {showRewardsAfterLaunch && (
        <div
          className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/85 animate-fade-in"
          onClick={() => setShowRewardsAfterLaunch(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden border-2 border-yellow-400/40 bg-gradient-to-b from-purple-900/95 via-black/95 to-purple-900/95 backdrop-blur-xl shadow-[0_0_60px_rgba(250,204,21,0.4)] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 text-center border-b border-white/10">
              <img
                src="/ui/treasure-box-opened.webp"
                alt=""
                className="w-20 h-20 object-contain mx-auto -mt-2"
              />
              <div className="text-yellow-300 text-lg font-black">
                مبروك! حصلت على مكافآت
              </div>
              <div className="text-white/60 text-[11px] mt-1">
                من إطلاق صاروخ {launchAnim?.rocket.name ?? ""}
              </div>
            </div>

            <div className="p-3 max-h-[50dvh] overflow-y-auto">
              {!myRewards ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="text-white/40 animate-spin" size={24} />
                </div>
              ) : myRewards.length === 0 ? (
                <div className="text-center text-white/60 text-xs py-6">
                  لم تحصل على مكافأة — كن على المايك في المرة القادمة!
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {myRewards.slice(0, 8).map((r: any) => (
                    <div
                      key={r._id}
                      className={`bg-white/5 rounded-xl p-2 border flex flex-col items-center ${
                        r.claimed ? "border-white/10 opacity-50" : "border-yellow-400/40"
                      }`}
                    >
                      <img
                        src={r.rewardImgUrl}
                        alt=""
                        className="w-12 h-12 object-contain"
                      />
                      <div className="text-white text-[10px] font-black mt-1 text-center">
                        {r.rewardAmount
                          ? `${r.rewardAmount} ${r.rewardType === "bcoins" ? "B" : "🪙"}`
                          : r.rewardType === "vip"
                          ? "VIP"
                          : r.rewardType === "vehicle"
                          ? "مركبة"
                          : "إطار"}
                      </div>
                      {r.claimed ? (
                        <span className="text-[9px] text-white/40 mt-1">✓ مستلم</span>
                      ) : (
                        <button
                          onClick={() => handleClaim(r._id)}
                          disabled={claiming === r._id}
                          className="w-full mt-1 py-1 rounded-full bg-yellow-400 text-black text-[10px] font-black active:scale-95 transition"
                        >
                          {claiming === r._id ? "..." : "استلام"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/10">
              <button
                onClick={() => setShowRewardsAfterLaunch(false)}
                className="w-full py-2.5 rounded-xl bg-yellow-400 text-black font-black text-sm active:scale-95 transition"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniEmpty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <img
        src="/ui/treasure-box-closed.webp"
        alt=""
        className="w-16 h-16 object-contain opacity-40"
      />
      <p className="text-white/70 text-[11px] font-bold mt-2">{title}</p>
      <p className="text-white/40 text-[9px] mt-0.5">{subtitle}</p>
    </div>
  );
}

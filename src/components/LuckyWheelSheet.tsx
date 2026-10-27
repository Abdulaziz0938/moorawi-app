
import imgApple from "../assets/wheel/apple.webp";
import imgWatermelon from "../assets/wheel/watermelon.webp";
import imgSeven from "../assets/wheel/seven.webp";
import imgWheel from "../assets/wheel/wheel.webp";
import imgCenterGem from "../assets/wheel/center_gem.webp";
import imgPointer from "../assets/wheel/pointer.webp";
import img100 from "../assets/wheel/100.webp";
import img1k from "../assets/wheel/1k.webp";
import img5k from "../assets/wheel/5k.webp";
import img10k from "../assets/wheel/10k.webp";
import img50k from "../assets/wheel/50k.webp";

import { getActiveToken } from '../lib/session';
import React, { useEffect, useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";

import { api } from "../../convex/_generated/api";
import { Volume2, VolumeX, HelpCircle, Trophy, FileText, Plus, X, Wifi } from "lucide-react";

interface LuckyWheelSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRecharge?: () => void;
}

const SECTORS = [
  { index: 0, item: "watermelon", label: "ط¨ط·ظٹط®" },
  { index: 1, item: "apple", label: "طھظپط§ط­" },
  { index: 2, item: "watermelon", label: "ط¨ط·ظٹط®" },
  { index: 3, item: "apple", label: "طھظپط§ط­" },
  { index: 4, item: "77", label: "77" },
  { index: 5, item: "watermelon", label: "ط¨ط·ظٹط®" },
  { index: 6, item: "apple", label: "طھظپط§ط­" },
  { index: 7, item: "watermelon", label: "ط¨ط·ظٹط®" },
  { index: 8, item: "apple", label: "طھظپط§ط­" },
];

export default function LuckyWheelSheet({ isOpen, onClose, onOpenRecharge }: LuckyWheelSheetProps) {
  const token = getActiveToken();
  const data = useQuery(api.wheelGame.getState, { tokenOverride: token ?? undefined });
  const [leaderboardTab, setLeaderboardTab] = useState<"day" | "week" | "all">("day");
  const leaderboardData = useQuery(api.wheelGame.getLeaderboard, { period: leaderboardTab, tokenOverride: getActiveToken() ?? undefined });
  const leaderboard = leaderboardData?.top10 || [];
  const myRank = leaderboardData?.myRank;
  const ensureRunning = useMutation(api.wheelGame.ensureGameRunning);
  const liveBets = useQuery(api.wheelGame.getLiveBets);
  const placeBetMut = useMutation(api.wheelGame.placeBet);

  const [screen, setScreen] = useState<"lobby" | "game">("lobby");
  const [showStats, setShowStats] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChip, setSelectedChip] = useState<number>(1000);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [rotation, setRotation] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  const [showLowBalance, setShowLowBalance] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
const [activeRankTab, setActiveRankTab] = useState<string>("VI");
  const [lastRoundBets, setLastRoundBets] = useState<{ watermelon: number; "77": number; apple: number }>({
    watermelon: 0,
    "77": 0,
    apple: 0,
  });

  // ط§ظ„ط¹ظ…ظ„ط§طھ ط§ظ„ط°ظ‡ط¨ظٹط© ط§ظ„ظ…طھط·ط§ظٹط±ط© ط¯ط§ط®ظ„ ط§ظ„طµظ†ط§ط¯ظٹظ‚ ط§ظ„ط«ظ„ط§ط«ط©
  const [coinsPile, setCoinsPile] = useState<{


    watermelon: { id: number; x: number; y: number; img: string }[];
    "77": { id: number; x: number; y: number; img: string }[];
    apple: { id: number; x: number; y: number; img: string }[];
  }>({ watermelon: [], "77": [], apple: [] });

  const lastSpunRound = useRef<number | null>(null);

  const handleEnterGame = () => {
    setIsLoading(true);
    setTimeout(() => {
      setScreen("game");
      setIsLoading(false);
    }, 1500); // ط«ط§ظ†ظٹط© ظˆظ†طµظپ طھط­ظ…ظٹظ„
  };

  // ط§ظ„طھط£ظƒط¯ ظ…ظ† ط£ظ† ظ…ط­ط±ظƒ ط§ظ„ط³ظٹط±ظپط± ظٹط¹ظ…ظ„ ظپظˆط± ظپطھط­ ط§ظ„ظ„ط¹ط¨ط©
  useEffect(() => {
    if (isOpen) {
      ensureRunning().catch(() => {});
    }
  }, [isOpen]);

  // ط­ط³ط§ط¨ ط§ظ„ط¹ط¯ط§ط¯ ط§ظ„طھظ†ط§ط²ظ„ظٹ ط¨ط§ظ„ط«ظˆط§ظ†ظٹ ط¨ط¯ظ‚ط© ظˆظ…ط²ط§ظ…ظ†طھظ‡ ظ…ط¹ ط§ظ„ط³ظٹط±ظپط±
  useEffect(() => {
    if (!data?.state) return;
    const state = data.state;

    const updateTimer = () => {
      if (state.status === "BETTING") {
        const diff = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
        setTimeLeft(diff);
        if (diff === 0) {
          ensureRunning().catch(() => {});
        }
      } else {
        setTimeLeft(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 300);
    return () => clearInterval(interval);
  }, [data?.state?.status, data?.state?.endTime, data?.state?.roundNumber]);

  // ط§ظ„طھط­ظƒظ… ط¨ط¯ظˆط±ط§ظ† ط§ظ„ط¹ط¬ظ„ط© ط¹ظ†ط¯ طھط­ظˆظ„ ط§ظ„ط­ط§ظ„ط© ط¥ظ„ظ‰ SPINNING
  useEffect(() => {
    if (!data?.state) return;
    const state = data.state;

    if (state.status === "BETTING") {
      // طھطµظپظٹط± ط§ظ„ط¹ظ…ظ„ط§طھ ط§ظ„ظ…ط±ط¦ظٹط© ط¹ظ†ط¯ ط¨ط¯ط§ظٹط© ط¬ظˆظ„ط© ط¬ط¯ظٹط¯ط©
      if (lastSpunRound.current !== null && lastSpunRound.current !== state.roundNumber) {
        setCoinsPile({ watermelon: [], "77": [], apple: [] });
      }
    }

    if (
      state.status === "SPINNING" &&
      state.winningIndex !== undefined &&
      lastSpunRound.current !== state.roundNumber
    ) {
      lastSpunRound.current = state.roundNumber;

      // ط­ظپط¸ ط±ظ‡ط§ظ†ط§طھ ط§ظ„ظ…ط³طھط®ط¯ظ… ظ„ط§ط³طھط®ط¯ط§ظ…ظ‡ط§ ظپظٹ ط²ط± "ظƒط±ط±"
      if (data.myTotalBet > 0) {
        setLastRoundBets(data.myBets);
      }

      // ط­ط³ط§ط¨ ط§ظ„ط²ط§ظˆظٹط© ط¨ط­ظٹط« ظٹطھظˆظ‚ظپ ط§ظ„ط³ظ‡ظ… ظپظٹ ظ…ظ†طھطµظپ ط§ظ„ظ‚ط·ط§ط¹ ط¨ط¯ظ‚ط©
      // [ezo-fix] ط­ط³ط§ط¨ ط§ظ„ط²ط§ظˆظٹط© ط§ظ„ظ†ظ‡ط§ط¦ظٹ (ظ…ط¹ ط¥ط²ط§ط­ط© ظ„طھطµط­ظٹط­ ط§ظ„ط§ظ†ط¹ظƒط§ط³)
      const numSectors = 9;
      const sectorSize = 360 / numSectors;
      const index = state.winningIndex;
      
      // ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ط§ط®طھط¨ط§ط±: ط§ظ„ط³ظ‡ظ… ظٹط¹ط·ظٹ ط§ظ„ظ‚ط·ط§ط¹ ط§ظ„ظ…ط¹ط§ظƒط³طŒ ظ„ط°ط§ ظ†ط¶ظٹظپ 180 ط¯ط±ط¬ط© (ظ†طµظپ ط¯ظˆط±ط©)
      // + ظ†ط¶ط¨ط· ط§ظ„ط¥ط²ط§ط­ط© ظ„طھظ†ط§ط³ط¨ ط§ظ„طµظˆط±ط© ط§ظ„ط­ط§ظ„ظٹط©
      const offsetCorrection = 20;
      const baseAngle = (index - 1) * sectorSize + (sectorSize / 2);
      // [ezo-fix] ط¹ظƒط³ ط§ظ„ط§طھط¬ط§ظ‡ ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ†ط¹ظƒط§ط³ LTR
      // [ezo-fix] ط¹ظƒط³ ط§طھط¬ط§ظ‡ ط§ظ„ط¯ظˆط±ط§ظ† ظ„ظ„طھطµط­ظٹط­ ط§ظ„ط¨طµط±ظٹ
      const targetStopAngle = 360 - (state.winningIndex * (360 / 9));
      const extraSpins = 360 * 6;
      console.log(`[EZO-WHEEL] WinningIndex: ${state.winningIndex} | TargetAngle: ${targetStopAngle}`);
                  const winningIdx = state.winningIndex ?? 0;
      setRotation((prevRotation) => {
        const NUM_SECTORS = 9;
        const SECTOR_DEG = 360 / NUM_SECTORS;
        const WHEEL_OFFSET_DEG = 20;
        const targetAngle = (360 - (winningIdx * SECTOR_DEG) - (SECTOR_DEG / 2) + WHEEL_OFFSET_DEG + 360) % 360;
        const currentAngle = ((prevRotation % 360) + 360) % 360;
        let diff = targetAngle - currentAngle;
        if (diff <= 0) diff += 360;
        return prevRotation + (5 * 360) + diff;
      });
    }
  }, [data?.state?.status, data?.state?.winningIndex, data?.state?.roundNumber]);

  // ظ…ط±ط§ظ‚ط¨ط© ط§ظ„ط±ظ‡ط§ظ†ط§طھ ط§ظ„ط­ظ‚ظٹظ‚ظٹط© ظˆطھط·ط§ظٹط± ط§ظ„ظپظٹط´ط§طھ
  const processedBets = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!liveBets || data?.state?.status !== "BETTING") return;
    
    liveBets.forEach((bet: any) => {
      if (!processedBets.current.has(bet._id)) {
        processedBets.current.add(bet._id);
        
        // طھط­ط¯ظٹط¯ طµظˆط±ط© ط§ظ„ظپظٹط´ط© ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ظ…ط¨ظ„ط؛ ط§ظ„ط­ظ‚ظٹظ‚ظٹ
        let chipImg = img100;
        if (bet.amount >= 50000) chipImg = img50k;
        else if (bet.amount >= 10000) chipImg = img10k;
        else if (bet.amount >= 5000) chipImg = img5k;
        else if (bet.amount >= 1000) chipImg = img1k;
        
        addVisualCoin(bet.item as any, chipImg);
      }
    });
  }, [liveBets, data?.state?.status]);

  const addVisualCoin = (item: "watermelon" | "77" | "apple", img: string) => {
    setCoinsPile((prev) => {
      const currentList = prev[item];
      if (currentList.length > 18) return prev;
      return {
        ...prev,
        [item]: [
          ...currentList,
          {
            id: Date.now() + Math.random(),
            x: 15 + Math.random() * 68,
            y: 18 + Math.random() * 48,
            img: img,
          },
        ],
      };
    });
  };

  const handlePlaceBet = async (item: "watermelon" | "77" | "apple") => {
    if (!data?.state || data.state.status !== "BETTING" || timeLeft <= 0) return;

    if (data.userCoins < selectedChip) {
      setShowLowBalance(true);
      return;
    }

    try {
      await placeBetMut({ item, amount: selectedChip, tokenOverride: token ?? undefined });
    } catch (err: any) {
      if (err?.message?.includes("LOW_BALANCE")) {
        setShowLowBalance(true);
      }
    }
  };

  const handleRepeatBet = async () => {
    if (!data?.state || data.state.status !== "BETTING" || timeLeft <= 0) return;
    const totalNeeded = lastRoundBets.watermelon + lastRoundBets["77"] + lastRoundBets.apple;
    if (totalNeeded <= 0) return;
    if (data.userCoins < totalNeeded) {
      setShowLowBalance(true);
      return;
    }

    for (const item of ["watermelon", "77", "apple"] as const) {
      if (lastRoundBets[item] > 0) {
            await placeBetMut({ item, amount: lastRoundBets[item], tokenOverride: token ?? undefined }).catch(() => {});
      }
    }
  };

  if (!isOpen) return null;

  const state = data?.state;
  const isBetting = state?.status === "BETTING" && timeLeft > 0;
  const isResultModal = state?.status === "RESULT";

  const renderIcon = (item: string) => {
    if (item === "77") return <img src={imgSeven} alt="77" className="w-8 h-8 object-contain drop-shadow" />;
    if (item === "watermelon") return <img src={imgWatermelon} alt="watermelon" className="w-8 h-8 object-contain drop-shadow" />;
    return <img src={imgApple} alt="apple" className="w-8 h-8 object-contain drop-shadow" />;
  };

  // ط­ط³ط§ط¨ ط§ظ„ظ†ط³ط¨ ط§ظ„ظ…ط¦ظˆظٹط© ظ„ظ„ط¥ط­طµط§ط¦ظٹط§طھ
  const historyList = data?.state?.history ?? [];
  const totalHistory = historyList.length || 1;
  const appleCount = historyList.filter((h: string) => h === "apple").length;
  const melonCount = historyList.filter((h: string) => h === "watermelon").length;
  const sevenCount = historyList.filter((h: string) => h === "77").length;
  const applePct = Math.round((appleCount / totalHistory) * 100);
  const melonPct = Math.round((melonCount / totalHistory) * 100);
  const sevenPct = Math.round((sevenCount / totalHistory) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs select-none" dir="rtl">
      <div className="relative w-full max-w-[430px] h-[85vh] rounded-t-3xl border-t-2 border-yellow-400 bg-gradient-to-b from-[#4c1d95] via-[#2e1065] to-[#170536] p-3 flex flex-col justify-between overflow-hidden shadow-2xl text-white">
        
        {/* ط²ط± ط§ظ„ط¥ط؛ظ„ط§ظ‚ ط§ظ„ط¹ظ„ظˆظٹ */}
        <button
          onClick={onClose}
          className="absolute top-2.5 left-2.5 z-30 w-8 h-8 rounded-full bg-white/15 border border-yellow-400/60 flex items-center justify-center active:scale-90"
        >
          <X size={18} />
        </button>

        {/* ط§ظ„ط´ط±ظٹط· ط§ظ„ط¹ظ„ظˆظٹ ظˆط§ظ„ط¬ط§ظƒط¨ظˆطھ */}
        <div className="flex items-center justify-between px-1 z-20">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMuted(!muted)}
              className="w-8 h-8 rounded-full bg-purple-900/80 border border-yellow-400 flex items-center justify-center"
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="w-8 h-8 rounded-full bg-purple-900/80 border border-yellow-400 flex items-center justify-center text-yellow-300"
            >
              <Trophy size={15} />
            </button>
          </div>

          <div
            className="px-5 py-1 rounded-full bg-gradient-to-b from-amber-600 to-amber-900 border-2 border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.5)] font-black text-sm tracking-wider"
            dir="ltr"
          >
            Jackpot: <span className="text-yellow-300">{state?.jackpot ?? 0}</span>
          </div>

          <div className="flex items-center gap-1.5 ml-8">
            <div className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold bg-black/30 px-1.5 py-0.5 rounded-full">
              <Wifi size={11} /> 78ms
            </div>
          </div>
        </div>

        {/* ظ…ظ†ط·ظ‚ط© ط§ظ„ط¹ط¬ظ„ط© ط§ظ„ط¯ظˆط§ط±ط© */}
        <div className="relative w-[265px] h-[265px] mx-auto my-1 flex items-center justify-center">
          {/* ط§ظ„ط³ظ‡ظ… ط§ظ„ط¹ظ„ظˆظٹ ط§ظ„ط­ظ‚ظٹظ‚ظٹ ط§ظ„ظ…ظپط±ط؛ */}
          <img
            src={imgPointer}
            alt="pointer"
            className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 w-11 h-14 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]"
          />

          {/* طµظˆط±ط© ط§ظ„ط¹ط¬ظ„ط© ط§ظ„ط­ظ‚ظٹظ‚ظٹط© ط§ظ„ظ…ظپط±ط؛ط© ط§ظ„طھظٹ طھط¯ظˆط± */}
          <div
            className="w-full h-full aspect-square rounded-full relative flex items-center justify-center"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center center",
              transition: state?.status === "SPINNING" ? "transform 4.5s cubic-bezier(0.12, 0.8, 0.2, 1)" : "transform 0.5s ease-out",
              willChange: "transform",
              backfaceVisibility: "hidden",
            }}
          >
            <img src={imgWheel} alt="wheel" className="w-full h-full object-contain pointer-events-none" />
          </div>

          {/* ط·ط¨ظ‚ط© ط¥ط®ظپط§ط، ط¸ظ„ ط§ظ„ط¬ظˆظ‡ط±ط© ط§ظ„ظ‚ط¯ظٹظ…ط© */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            {/* ط¯ط§ط¦ط±ط© ط³ظˆط¯ط§ط، طµظ„ط¨ط© طھط؛ط·ظٹ ط¸ظ„ ط§ظ„ط¬ظˆظ‡ط±ط© ط§ظ„ظ‚ط¯ظٹظ…ط© طھظ…ط§ظ…ط§ظ‹ */}
            <div className="absolute w-[28%] h-[28%] rounded-full bg-[#120a1f] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]" />
            
            {/* ط§ظ„ط¬ظˆظ‡ط±ط© ط§ظ„ط«ط§ط¨طھط© (ظپظˆظ‚ ط§ظ„ط¯ط§ط¦ط±ط©) */}
            <img
              src={imgCenterGem}
              alt=""
              className="absolute w-[26%] h-[26%] rounded-full object-fill z-10"
            />
            
            {/* ط§ظ„ط¹ط¯ط§ط¯ (ظپظٹ ط§ظ„ط£ظ…ط§ظ… ط¨ظˆط¶ظˆط­) */}
            <span
              className="relative z-20 text-4xl font-black text-white"
              style={{
                fontFamily: "'Arial Black', 'Impact', sans-serif",
                textShadow: "0 0 15px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,1)",
              }}
            >
              {state?.status === "BETTING" ? timeLeft : ""}
            </span>
          </div>

          {/* ط±ظ‚ظ… ط§ظ„ط¬ظˆظ„ط© */}
          <div className="absolute -bottom-1 right-1 text-[11px] text-purple-200 font-semibold">
            {state?.roundNumber ?? 2774} ط§ظ„ط¬ظˆظ„ط©
          </div>
        </div>

        {/* ط´ط±ظٹط· ط³ط¬ظ„ ط§ظ„ظ†طھط§ط¦ط¬ (History Bar) - ظ‚ط§ط¨ظ„ ظ„ظ„ظ†ظ‚ط± */}
        <div 
          onClick={() => setShowStats(true)}
          className="bg-black/45 border border-purple-500/60 rounded-full px-3 py-1.5 flex items-center gap-2 cursor-pointer active:scale-95 transition hover:bg-black/60"
        >
          <span className="text-xs font-bold text-purple-200 shrink-0">ظ†طھظٹط¬ط©</span>
          <div className="flex items-center gap-2 overflow-hidden flex-1 pointer-events-none">
            {(state?.history ?? []).slice(0, 9).map((h, i) => (
              <div key={i} className="relative flex items-center justify-center text-lg shrink-0">
                {renderIcon(h)}
                {i === 0 && (
                  <span className="absolute -bottom-1 left-0 bg-emerald-500 text-[8px] font-black px-1 rounded text-white leading-tight">
                    NEW
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* طµظ†ط§ط¯ظٹظ‚ ط§ظ„ظ…ط±ط§ظ‡ظ†ط© ط§ظ„ط«ظ„ط§ط«ط© (ط¨ط·ظٹط® x2 | 77 x8 | طھظپط§ط­ x2) */}
        <div className="grid grid-cols-3 gap-2 my-1">
          {[
            { key: "watermelon" as const, img: imgWatermelon, mult: "x2" },
            { key: "77" as const, img: imgSeven, mult: "x8" },
            { key: "apple" as const, img: imgApple, mult: "x2" },
          ].map((box) => {
            const isWinner = state?.status !== "BETTING" && state?.winningItem === box.key;
            return (
              <button
                key={box.key}
                disabled={!isBetting}
                onClick={() => handlePlaceBet(box.key)}
                className={`relative rounded-2xl border-2 pt-3 pb-0 flex flex-col items-center overflow-hidden transition-all ${
                  isWinner
                    ? "border-yellow-300 bg-purple-800/90 shadow-[0_0_20px_#fde047] scale-[1.03]"
                    : "border-purple-400/70 bg-gradient-to-b from-purple-800/60 to-indigo-950/90 active:scale-95"
                } ${!isBetting ? "opacity-80 cursor-not-allowed" : ""}`}
              >
                {/* ط§ظ„ط¹ظ…ظ„ط§طھ ط§ظ„ط°ظ‡ط¨ظٹط© ط§ظ„ظ…طھط·ط§ظٹط±ط© ط¯ط§ط®ظ„ ط§ظ„طµظ†ط¯ظˆظ‚ */}
                <div className="absolute inset-0 pointer-events-none">
                  {coinsPile[box.key].map((c) => (
                    <img
                      key={c.id}
                      src={c.img}
                      alt="chip"
                      className="absolute w-5 h-5 object-contain drop-shadow-md"
                      style={{ left: `${c.x}%`, top: `${c.y}%`, transform: "translate(-50%, -50%)" }}
                    />
                  ))}
                </div>

                <div className="relative z-10 flex items-center gap-1 my-1">
                  <img src={box.img} alt="" className="w-10 h-10 object-contain drop-shadow" />
                  <span className="text-sm font-black text-yellow-300">{box.mult}</span>
                </div>

                <div className="relative z-10 w-full bg-slate-950/80 border-t border-purple-500/50 py-1 text-center text-xs font-bold text-yellow-300">
                  {data?.myBets?.[box.key] ?? 0}
                </div>
              </button>
            );
          })}
        </div>

        {/* ط§ظ„ط´ط±ظٹط· ط§ظ„ط³ظپظ„ظٹ: ط§ظ„ظپظٹط´ + ط²ط± ظƒط±ط± + ط§ظ„ظ…ط­ظپط¸ط© */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {[
                { val: 100, img: img100, label: "100" },
                { val: 1000, img: img1k, label: "1K" },
                { val: 5000, img: img5k, label: "5K" },
                { val: 10000, img: img10k, label: "10K" },
                { val: 50000, img: img50k, label: "50K" },
              ].map((chip) => (
                <button
                  key={chip.val}
                  onClick={() => setSelectedChip(chip.val)}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-transform ${
                    selectedChip === chip.val
                      ? "-translate-y-2 scale-110 drop-shadow-[0_0_12px_#fde047]"
                      : "opacity-85 hover:opacity-100"
                  }`}
                >
                  <img src={chip.img} alt={chip.label} className="w-full h-full object-contain drop-shadow-md" />
                </button>
              ))}
            </div>

            <button
              disabled={!isBetting}
              onClick={handleRepeatBet}
              className="px-6 py-2 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border border-yellow-200 font-black text-sm shadow-md active:scale-95 disabled:opacity-50"
            >
              ظƒط±ط±
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-purple-300">
              {isBetting ? "ط§ظ„ظ…ط±ط§ظ‡ظ†ط© ظ…ظپطھظˆط­ط© ط§ظ„ط¢ظ†" : "ط§ظ„ط±ظ‡ط§ظ† ظ…ط؛ظ„ظ‚ - ط§ظ„ط¹ط¬ظ„ط© طھط¯ظˆط±..."}
            </div>
            <div className="flex items-center gap-2 bg-black/50 border border-purple-500/60 rounded-full px-3 py-1">
              <span className="text-yellow-400 font-black text-sm">{data?.userCoins ?? 0}</span>
              <span>ًںھ™</span>
              <button
                onClick={() => (onOpenRecharge ? onOpenRecharge() : setShowLowBalance(true))}
                className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-xs"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* 1. ظ†ط§ظپط°ط© ط¥ط¹ظ„ط§ظ† ط§ظ„ظپط§ط¦ط²ظٹظ† ط¨ط¹ط¯ ظƒظ„ ط¬ظˆظ„ط© (ط­ط¸ط§ظ‹ ط³ط¹ظٹط¯ط§ظ‹) */}
        {isResultModal && (
          <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full rounded-2xl border-2 border-yellow-400 bg-gradient-to-b from-purple-900 via-indigo-950 to-slate-950 p-4 text-center shadow-2xl">
              <div className="inline-block px-6 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 font-black text-sm mb-1">
                ط­ط¸ط§ظ‹ ط³ط¹ظٹط¯ط§ظ‹
              </div>
              <div className="text-xs text-purple-200">{state?.roundNumber} ط§ظ„ط¬ظˆظ„ط©</div>
              <div className="text-yellow-300 font-bold text-sm my-2">طھظ‡ط§ظ†ظٹظ†ط§ ظ„ظ„ظپط§ط¦ط²ظٹظ† ط§ظ„طھط§ظ„ظٹظٹظ†</div>

              <div className="grid grid-cols-3 gap-2 my-3">
                {(state?.topWinners ?? []).slice(0, 3).map((w: any, idx: number) => (
                  <div key={idx} className="bg-white/10 rounded-xl p-2 text-[11px] flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full border-2 border-yellow-400 bg-purple-700 flex items-center justify-center font-bold mb-1 overflow-hidden">
                      <img 
                        src={w.avatarUrl || "/avatar.png"} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { (e.target as HTMLImageElement).src = "/avatar.png"; }}
                      />
                    </div>
                    <div className="font-bold truncate w-full text-center">{w.name || "ظ…ط³طھط®ط¯ظ…"}</div>
                    <div className="text-slate-300">ط§ظ„ط±ظ‡ط§ظ†: {w.bet?.toLocaleString() ?? 0}</div>
                    <div className="text-yellow-300 font-bold">ظپظˆط²: {w.win?.toLocaleString() ?? 0}</div>
                  </div>
                ))}
              </div>

              <div className="bg-black/40 rounded-xl p-2.5 flex items-center justify-between text-xs border border-purple-500/30">
                <span className="font-bold">ًں’ھ ظ†طھظٹط¬طھظƒ ظپظٹ ط§ظ„ط¬ظˆظ„ط©</span>
                <div className="flex gap-3">
                  <span>
                    ط§ظ„ط±ظ‡ط§ظ†: <b className="text-white">{data?.myTotalBet ?? 0}</b>
                  </span>
                  <span>
                    ظپظˆط²: <b className="text-yellow-300">{data?.myWin ?? 0}</b>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. ظ†ط§ظپط°ط© ط§ظ„ط±طµظٹط¯ ط؛ظٹط± ظƒط§ظپظچ */}
        {showLowBalance && (
          <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
            <div className="bg-white text-slate-800 rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl">
              <div className="text-blue-600 font-black text-sm mb-2">ًں”¥ HOT GAMES</div>
              <div className="text-4xl my-3">ًں‘›</div>
              <p className="font-bold text-sm mb-4">ط±طµظٹط¯ظƒ ط؛ظٹط± ظƒط§ظپظٹطŒ ظ‡ظ„ طھط±ظٹط¯ ط§ظ„ط´ط­ظ† ط§ظ„ط¢ظ†طں</p>
              <div className="flex justify-around gap-3">
                <button
                  onClick={() => {
                    setShowLowBalance(false);
                    if (onOpenRecharge) onOpenRecharge();
                  }}
                  className="flex-1 py-2 rounded-full bg-emerald-500 text-white font-bold text-sm"
                >
                  طھط£ظƒظٹط¯
                </button>
                <button
                  onClick={() => setShowLowBalance(false)}
                  className="flex-1 py-2 rounded-full bg-slate-400 text-white font-bold text-sm"
                >
                  ط¥ظ„ط؛ط§ط،
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. ظ†ط§ظپط°ط© ظ„ظˆط­ط© ط§ظ„ظ…طھطµط¯ط±ظٹظ† ط¨ط§ظ„ظ…ط³طھظˆظٹط§طھ I ط¥ظ„ظ‰ VI ظƒظ…ط§ ظپظٹ ط§ظ„ظپظٹط¯ظٹظˆ */}
        {showLeaderboard && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
            <div className="w-full h-[78%] rounded-2xl border-2 border-yellow-400 bg-[#2a0b4e] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-purple-950 border-b border-yellow-400/40">
                <span className="text-yellow-300 font-black text-sm">ًںڈ† ظ‚ط§ط¦ظ…ط© ط§ظ„ظ…طھطµط¯ط±ظٹظ†</span>
                <button onClick={() => setShowLeaderboard(false)} className="text-white/80">
                  <X size={18} />
                </button>
              </div>

              <div className="flex justify-around py-2 bg-purple-900/50 border-b border-purple-700">
                {["I", "II", "III", "IV", "V", "VI"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setActiveRankTab(lvl)}
                    className={`w-9 h-9 rounded-full font-black text-xs border-2 ${
                      activeRankTab === lvl
                        ? "bg-red-600 border-yellow-300 text-white scale-110"
                        : "bg-purple-800 border-purple-400 text-purple-200"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* طھط¨ظˆظٹط¨ط§طھ ط§ظ„ظپطھط±ط§طھ ط§ظ„ط²ظ…ظ†ظٹط© */}
              <div className="flex justify-center gap-2 p-2 bg-purple-950/50">
                <button onClick={() => setLeaderboardTab("day")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${leaderboardTab === "day" ? "bg-yellow-500 text-black" : "bg-white/5 text-white/60"}`}>ط§ظ„ظٹظˆظ…</button>
                <button onClick={() => setLeaderboardTab("week")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${leaderboardTab === "week" ? "bg-yellow-500 text-black" : "bg-white/5 text-white/60"}`}>ط§ظ„ط£ط³ط¨ظˆط¹</button>
                <button onClick={() => setLeaderboardTab("all")} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${leaderboardTab === "all" ? "bg-yellow-500 text-black" : "bg-white/5 text-white/60"}`}>ط¯ط§ط¦ظ…</button>
              </div>

              <div className="bg-[#2a1b54] rounded-t-xl overflow-hidden">
                <div className="grid grid-cols-4 text-[11px] font-bold text-white bg-[#1a0b36] py-2 px-2 text-center border-b border-purple-500/30">
                  <span>ط§ظ„طھط±طھظٹط¨</span>
                  <span className="text-right pr-2 col-span-2">ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ…</span>
                  <span>ظ…ظƒط§ظپط¢طھ</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-purple-800/50 text-xs min-h-[300px]">
                  {(leaderboard ?? []).map((u: any, i: number) => {
                    // طھط­ط¯ظٹط¯ ط£ظ„ظˆط§ظ† ط§ظ„ظ…ط±ط§ظƒط² ط§ظ„ط«ظ„ط§ط«ط© ط§ظ„ط£ظˆظ„ظ‰
                    const bgClass = i === 0 ? "bg-gradient-to-r from-[#8e6b16] to-[#5c4306]" : i === 1 ? "bg-gradient-to-r from-[#5f6773] to-[#3b4048]" : i === 2 ? "bg-gradient-to-r from-[#6e361e] to-[#442012]" : "bg-[#120724] hover:bg-white/5";
                    const textClass = i < 3 ? "text-white" : "text-gray-300";

                    return (
                      <div key={u._id} className={`grid grid-cols-4 items-center py-2 px-2 text-center ${bgClass}`}>
                        <div className="flex justify-center relative">
                          {i === 0 ? <span className="text-yellow-300 font-black text-lg italic drop-shadow">1<sup>st</sup></span> :
                           i === 1 ? <span className="text-gray-300 font-black text-lg italic drop-shadow">2<sup>nd</sup></span> :
                           i === 2 ? <span className="text-amber-500 font-black text-lg italic drop-shadow">3<sup>rd</sup></span> :
                           <span className="text-white/50 font-bold">{i + 1}</span>}
                        </div>
                        <div className="flex items-center gap-2 justify-end pr-1 col-span-2">
                          <span className={`truncate font-bold ${textClass}`}>{u.name}</span>
                          {u.avatarUrl ? <img src={u.avatarUrl} className="w-7 h-7 rounded-full object-cover border border-white/20" alt="" /> : <div className="w-7 h-7 rounded-full bg-purple-700" />}
                        </div>
                        <div className="flex items-center justify-center gap-1 font-black text-yellow-300">
                          <img src="/rewards/coins-small.png" className="w-4 h-4" alt="" onError={(e) => (e.target as any).style.display='none'} />
                          {u.reward?.toLocaleString() ?? 0}
                        </div>
                      </div>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <div className="text-center py-10 text-white/40">ظ„ط§ طھظˆط¬ط¯ ط£ط±ط¨ط§ط­ ظ…ط³ط¬ظ„ط© ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظپطھط±ط©</div>
                  )}
                </div>
              </div>
              
              {/* طھط±طھظٹط¨ظٹ */}
              {myRank && (
                <div className="p-2 bg-black/40 border-t border-yellow-500/30">
                  <div className="grid grid-cols-3 items-center py-2 px-2 text-center rounded-xl bg-purple-500/20 border border-purple-400/40">
                    <span className="font-black text-white text-sm">#{myRank.rank}</span>
                    <span className="font-black text-yellow-300">ط£ظ†طھ</span>
                    <span className="text-green-400 font-bold">{myRank.points.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    
      {/* ظ†ط§ظپط°ط© ط§ظ„ط¥ط­طµط§ط¦ظٹط§طھ (Stats Modal) */}
      {showStats && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-[#3b1157] border-2 border-yellow-500 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.3)] overflow-hidden">
            
            {/* Header */}
            <div className="bg-[#4b1a6e] p-3 flex items-center justify-between border-b border-yellow-500/30">
              <h3 className="text-yellow-400 font-black text-lg">ظ†طھظٹط¬ط© ط§ظ„ط³ط­ط¨</h3>
              <button onClick={() => setShowStats(false)} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50">
                <X size={18} />
              </button>
            </div>

            {/* Grid of History */}
            <div className="p-4">
              <div className="grid grid-cols-10 gap-1.5 mb-4">
                {historyList.map((h: string, i: number) => (
                  <div key={i} className="relative flex items-center justify-center w-7 h-7">
                    <img 
                      src={h === "apple" ? imgApple : h === "watermelon" ? imgWatermelon : imgSeven} 
                      alt={h} 
                      className="w-6 h-6 object-contain drop-shadow-md" 
                    />
                    {i === 0 && (
                      <span className="absolute -top-2 -right-1 bg-[#22c55e] text-[7px] font-black px-1 rounded-sm text-white shadow-sm z-10">
                        NEW
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Percentages (ط¨ط§ط³طھط®ط¯ط§ظ… ط§ظ„طµظˆط± ط§ظ„ط­ظ‚ظٹظ‚ظٹط©) */}
            <div className="bg-[#2d0d44] p-3 flex justify-around items-center border-t border-yellow-500/30">
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-white/10 text-white font-bold text-sm">
                <img src={imgApple} alt="apple" className="w-5 h-5 object-contain" /> 
                <span>{applePct}%</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-white/10 text-white font-bold text-sm">
                <img src={imgSeven} alt="77" className="w-5 h-5 object-contain" /> 
                <span>{sevenPct}%</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-white/10 text-white font-bold text-sm">
                <img src={imgWatermelon} alt="watermelon" className="w-5 h-5 object-contain" /> 
                <span>{melonPct}%</span>
              </div>
            </div>

          </div>
        </div>
      )}
</div>
  );
}



import { useState } from "react";
import { X, Dices, Loader2 } from "lucide-react";
import { useBackButton } from "../lib/hooks/useBackButton";
import LudoGame from "./games/LudoGame";
import TicTacToe from "./games/TicTacToe";
import MemoryGame from "./games/MemoryGame";

interface Props { onClose: () => void; }

type GameKey = "ludo" | "snake" | "memory" | "tictactoe";

const GAMES: { key: GameKey; label: string; emoji: string; soon?: boolean }[] = [
  { key: "ludo",      label: "لودو",      emoji: "🎲" },
  { key: "tictactoe", label: "إكس أو",    emoji: "⭕" },
  { key: "snake",     label: "ثعبان",     emoji: "🐍", soon: true },
  { key: "memory",    label: "ذاكرة",     emoji: "🧠" },
];

export default function GamesSheet({ onClose }: Props) {
  useBackButton(true, onClose);
  const [active, setActive] = useState<GameKey>("ludo");

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black rounded-t-3xl h-[92dvh] flex flex-col overflow-hidden border-t border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Dices size={20} className="text-amber-300" />
            <h2 className="text-white text-base font-black">الألعاب</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Game tabs */}
        <div className="flex gap-2 px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-hide">
          {GAMES.map((g) => (
            <button
              key={g.key}
              onClick={() => !g.soon && setActive(g.key)}
              disabled={g.soon}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-black transition ${
                active === g.key
                  ? "bg-purple-500/30 border border-purple-400/60 text-white"
                  : g.soon
                  ? "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                  : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              <span className="ml-1">{g.emoji}</span>
              {g.label}
              {g.soon && <span className="mr-1 text-[9px]">(soon)</span>}
            </button>
          ))}
        </div>

        {/* Active game */}
        <div className="flex-1 overflow-hidden">
          {active === "ludo" && <LudoGame onClose={onClose} />}
            {active === "tictactoe" && <TicTacToe onClose={onClose} />}
            {active === "memory" && <MemoryGame onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

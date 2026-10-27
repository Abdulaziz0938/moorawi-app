// [ezo-games] TicTacToe — 2-player hot-seat
import { useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";

type Cell = "X" | "O" | null;
type Board = Cell[];

const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

function checkWinner(b: Board): Cell {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}

function findWinningLine(b: Board, w: Cell): number[] | null {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] === w && b[a] === b[c] && b[a] === b[d]) return line;
  }
  return null;
}

interface Props {
  onClose: () => void;
}

export default function TicTacToe({ onClose: _onClose }: Props) {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [scores, setScores] = useState({ X: 0, O: 0, D: 0 });
  const [winLine, setWinLine] = useState<number[] | null>(null);

  const winner = checkWinner(board);
  const isFull = board.every((c) => c !== null);
  const finished = winner !== null || isFull;

  const handleClick = (i: number) => {
    if (board[i] || finished) return;
    const nb = [...board];
    nb[i] = turn;
    setBoard(nb);
    const w = checkWinner(nb);
    if (w) {
      setScores((s) => ({ ...s, [w]: s[w] + 1 }));
      setWinLine(findWinningLine(nb, w));
    } else if (nb.every((c) => c !== null)) {
      setScores((s) => ({ ...s, D: s.D + 1 }));
    } else {
      setTurn(turn === "X" ? "O" : "X");
    }
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn(winner === "O" ? "X" : winner === "X" ? "O" : "X");
    setWinLine(null);
  };

  const resetAll = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setWinLine(null);
    setScores({ X: 0, O: 0, D: 0 });
  };

  return (
    <div className="h-full flex flex-col p-4" dir="rtl">
      {/* Score bar */}
      <div className="flex items-center justify-center gap-4 mb-3 text-xs font-black">
        <div className={`flex items-center gap-1.5 ${turn === "X" && !finished ? "text-cyan-400" : "text-white/40"}`}>
          <span>اللاعب 1</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10">{scores.X}</span>
        </div>
        <div className="text-white/40">
          <span className="px-2 py-0.5 rounded-full bg-white/10">{scores.D}</span>
        </div>
        <div className={`flex items-center gap-1.5 ${turn === "O" && !finished ? "text-rose-400" : "text-white/40"}`}>
          <span className="px-2 py-0.5 rounded-full bg-white/10">{scores.O}</span>
          <span>اللاعب 2</span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-3 h-7">
        {winner ? (
          <div className="flex items-center justify-center gap-2 text-amber-300">
            <Trophy size={16} />
            <span className="font-black text-sm">
              فاز {winner === "X" ? "اللاعب 1" : "اللاعب 2"}!
            </span>
          </div>
        ) : isFull ? (
          <span className="text-white/60 font-bold text-sm">تعادل</span>
        ) : (
          <span className="text-white/80 font-bold text-sm">
            دور {turn === "X" ? "اللاعب 1 (X)" : "اللاعب 2 (O)"}
          </span>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-2 w-full max-w-[280px] aspect-square">
          {board.map((cell, i) => {
            const isWin = winLine?.includes(i);
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                disabled={!!cell || finished}
                className={`rounded-2xl flex items-center justify-center text-5xl font-black transition ${
                  isWin
                    ? "bg-amber-500/30 border-2 border-amber-400"
                    : "bg-white/5 border border-white/10"
                } ${!cell && !finished ? "hover:bg-white/10 active:scale-95" : ""}`}
              >
                {cell === "X" && <span className="text-cyan-400 leading-none">×</span>}
                {cell === "O" && <span className="text-rose-400 leading-none">○</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={reset}
          className="flex-1 py-3 rounded-2xl bg-purple-500/30 border border-purple-400/60 text-white font-black flex items-center justify-center gap-2 active:scale-95"
        >
          <RotateCcw size={16} />
          {finished ? "لعبة جديدة" : "إعادة"}
        </button>
        <button
          onClick={resetAll}
          className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold active:scale-95"
        >
          تصفير الكل
        </button>
      </div>
    </div>
  );
}

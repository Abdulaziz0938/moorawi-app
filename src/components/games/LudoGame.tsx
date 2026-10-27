// [ezo-games] LudoGame — 4-player hot-seat Ludo
import { useState, useEffect } from "react";
import { Dices, RotateCcw, Trophy } from "lucide-react";

const PATH: [number, number][] = [
  [1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],
  [14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],
  [6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6],
];

const START_IDX = [0, 13, 26, 39];
const HOME_COL: [number, number][][] = [
  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
];
const YARD: [number, number][][] = [
  [[1,1],[3,1],[1,3],[3,3]],
  [[11,1],[13,1],[11,3],[13,3]],
  [[11,11],[13,11],[11,13],[13,13]],
  [[1,11],[3,11],[1,13],[3,13]],
];
const COLORS = ["#ef4444", "#22c55e", "#eab308", "#3b82f6"];
const NAMES = ["الأحمر", "الأخضر", "الأصفر", "الأزرق"];
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

type T = { pos: number }; // -1 = yard, 0-50 main, 51-56 home col, 57 = home
type State = T[][];

const initState = (): State => Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ({ pos: -1 })));

export default function LudoGame({ onClose }: { onClose?: () => void }) {
  const [tokens, setTokens] = useState<State>(initState);
  const [current, setCurrent] = useState(0);
  const [dice, setDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [movable, setMovable] = useState<number[]>([]);
  const [winner, setWinner] = useState<number | null>(null);

  const reset = () => {
    setTokens(initState());
    setCurrent(0);
    setDice(null);
    setMovable([]);
    setWinner(null);
  };

  // Calculate absolute position on path
  const getAbsPos = (player: number, pos: number): number | null => {
    if (pos < 0) return null; // yard
    if (pos >= 51) return null; // home column
    return (START_IDX[player] + pos) % 52;
  };

  const getCoord = (player: number, tok: T): [number, number] => {
    if (tok.pos === -1) {
      const idx = tokens[player].indexOf(tok);
      return YARD[player][idx];
    }
    if (tok.pos >= 51 && tok.pos <= 56) {
      return HOME_COL[player][tok.pos - 51];
    }
    if (tok.pos === 57) {
      // Home center-ish
      return [7, 7];
    }
    const abs = getAbsPos(player, tok.pos);
    return PATH[abs!];
  };

  const canMove = (player: number, tokenIdx: number, d: number): boolean => {
    const tok = tokens[player][tokenIdx];
    if (tok.pos === 57) return false; // home already
    if (tok.pos === -1) return d === 6; // must roll 6 to enter
    const next = tok.pos + d;
    if (next > 57) return false; // overshoot
    return true;
  };

  const roll = () => {
    if (rolling || movable.length > 0 || winner !== null) return;
    setRolling(true);
    setTimeout(() => {
      const d = Math.floor(Math.random() * 6) + 1;
      setDice(d);
      const moves: number[] = [];
      for (let i = 0; i < 4; i++) {
        if (canMove(current, i, d)) moves.push(i);
      }
      setMovable(moves);
      setRolling(false);
      if (moves.length === 0) {
        // no moves, pass turn
        setTimeout(() => {
          setDice(null);
          setCurrent((c) => (c + 1) % 4);
        }, 800);
      }
    }, 400);
  };

  const move = (tokenIdx: number) => {
    if (!movable.includes(tokenIdx) || dice === null) return;
    const d = dice;
    const newTokens = tokens.map((p) => p.map((t) => ({ ...t })));
    const tok = newTokens[current][tokenIdx];
    if (tok.pos === -1) {
      tok.pos = 0;
    } else {
      tok.pos += d;
    }
    // check kill
    const myAbs = getAbsPos(current, tok.pos);
    if (myAbs !== null && !SAFE.has(myAbs)) {
      for (let p = 0; p < 4; p++) {
        if (p === current) continue;
        for (let i = 0; i < 4; i++) {
          const opp = newTokens[p][i];
          const oppAbs = getAbsPos(p, opp.pos);
          if (oppAbs !== null && oppAbs === myAbs) {
            opp.pos = -1; // send home
          }
        }
      }
    }
    // check win
    const allHome = newTokens[current].every((t) => t.pos === 57);
    if (allHome) {
      setWinner(current);
      setTokens(newTokens);
      return;
    }
    setTokens(newTokens);
    setDice(null);
    setMovable([]);
    if (d === 6) {
      // extra turn (stay on same player)
    } else {
      setCurrent((c) => (c + 1) % 4);
    }
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Dices size={18} className="text-amber-300" />
          <span className="text-white text-sm font-black">لودو</span>
        </div>
        <button
          onClick={reset}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white active:scale-95"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Turn indicator */}
      {winner === null ? (
        <div className="px-3 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full ring-2 ring-white/40"
              style={{ background: COLORS[current] }}
            />
            <span className="text-white font-black">دور: {NAMES[current]}</span>
          </div>
          {dice !== null && (
            <span className="text-white/70 font-black">
              🎲 {dice} {movable.length > 0 && <span className="text-emerald-300">اختر قطعة</span>}
            </span>
          )}
        </div>
      ) : (
        <div className="px-3 py-2 flex items-center justify-center gap-2">
          <Trophy size={18} className="text-amber-300" />
          <span className="text-white font-black">فاز {NAMES[winner]}! 🎉</span>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-2">
        <div
          className="relative bg-[#1a0b2e] rounded-2xl border-2 border-white/20 shadow-2xl"
          style={{ width: "min(100%, 380px)", aspectRatio: "1 / 1" }}
        >
          {/* 15x15 grid */}
          {Array.from({ length: 225 }).map((_, idx) => {
            const col = idx % 15;
            const row = Math.floor(idx / 15);
            const cellPct = 100 / 15;
            // determine cell style
            let bg = "transparent";
            const isPath = PATH.some(([c, r]) => c === col && r === row);
            if (isPath) bg = "#e5e7eb";
            // home columns
            for (let p = 0; p < 4; p++) {
              if (HOME_COL[p].some(([c, r]) => c === col && r === row)) bg = COLORS[p];
            }
            // yards (2x2 blocks per player)
            const inYard = YARD[0].concat(YARD[1], YARD[2], YARD[3]).some(([c, r]) => c === col && r === row);
            // big colored home areas
            let bigColored = "";
            if (col <= 5 && row <= 5) bigColored = COLORS[0] + "33";
            else if (col >= 9 && row <= 5) bigColored = COLORS[1] + "33";
            else if (col >= 9 && row >= 9) bigColored = COLORS[2] + "33";
            else if (col <= 5 && row >= 9) bigColored = COLORS[3] + "33";
            // center triangle
            const center = col >= 6 && col <= 8 && row >= 6 && row <= 8;
            return (
              <div
                key={idx}
                className="absolute border border-black/20"
                style={{
                  left: `${col * cellPct}%`,
                  top: `${row * cellPct}%`,
                  width: `${cellPct}%`,
                  height: `${cellPct}%`,
                  background: bg !== "transparent" ? bg : bigColored || "rgba(255,255,255,0.02)",
                }}
              >
                {center && (
                  <div
                    className="w-full h-full"
                    style={{
                      background:
                        "conic-gradient(from 45deg, " +
                        COLORS[0] + " 0deg 90deg, " +
                        COLORS[1] + " 90deg 180deg, " +
                        COLORS[2] + " 180deg 270deg, " +
                        COLORS[3] + " 270deg 360deg)",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Tokens */}
          {tokens.map((playerTokens, p) =>
            playerTokens.map((tok, i) => {
              const [c, r] = getCoord(p, tok);
              const cellPct = 100 / 15;
              const isMovable = p === current && movable.includes(i);
              return (
                <button
                  key={`${p}-${i}`}
                  onClick={() => isMovable && move(i)}
                  disabled={!isMovable}
                  className={`absolute rounded-full transition-all ${
                    isMovable ? "ring-4 ring-white animate-pulse z-30 cursor-pointer" : "z-20"
                  }`}
                  style={{
                    left: `${c * cellPct + cellPct * 0.15}%`,
                    top: `${r * cellPct + cellPct * 0.15}%`,
                    width: `${cellPct * 0.7}%`,
                    height: `${cellPct * 0.7}%`,
                    background: COLORS[p],
                    border: "2px solid rgba(0,0,0,0.5)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Dice */}
      {winner === null && (
        <div className="p-3 flex justify-center">
          <button
            onClick={roll}
            disabled={rolling || movable.length > 0}
            className={`px-6 py-3 rounded-2xl font-black text-white shadow-lg flex items-center gap-2 transition active:scale-95 ${
              rolling || movable.length > 0
                ? "bg-white/10 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-500 to-yellow-500"
            }`}
          >
            <Dices size={20} />
            {rolling ? "..." : movable.length > 0 ? "اختر قطعة" : "ارمِ الزهر"}
          </button>
        </div>
      )}
    </div>
  );
}

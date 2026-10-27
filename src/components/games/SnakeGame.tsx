// [ezo-games] SnakeGame — 12x12 grid, arrows control
import { useState, useEffect, useRef, useCallback } from "react";
import { RotateCcw, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

const SIZE = 12;
const TICK_MS = 160;

type Pos = { x: number; y: number };

function randFood(snake: Pos[]): Pos {
  const free: Pos[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  return free[Math.floor(Math.random() * free.length)] || { x: 0, y: 0 };
}

interface Props {
  onClose: () => void;
}

export default function SnakeGame({ onClose: _onClose }: Props) {
  const initialSnake: Pos[] = [
    { x: 6, y: 6 },
    { x: 5, y: 6 },
    { x: 4, y: 6 },
  ];
  const [snake, setSnake] = useState<Pos[]>(initialSnake);
  const [dir, setDir] = useState<Pos>({ x: 1, y: 0 });
  const [food, setFood] = useState<Pos>(() => randFood(initialSnake));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [alive, setAlive] = useState(true);
  const dirRef = useRef(dir);
  const snakeRef = useRef(snake);

  // Keep refs in sync
  useEffect(() => { dirRef.current = dir; }, [dir]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);

  const turn = useCallback((nx: number, ny: number) => {
    const d = dirRef.current;
    // منع الانعكاس
    if (d.x === -nx && d.y === -ny) return;
    setDir({ x: nx, y: ny });
  }, []);

  // Game loop
  useEffect(() => {
    if (!alive) return;
    const id = setInterval(() => {
      const s = snakeRef.current;
      const d = dirRef.current;
      const head = s[0];
      const nh: Pos = { x: head.x + d.x, y: head.y + d.y };

      // Wall collision
      if (nh.x < 0 || nh.x >= SIZE || nh.y < 0 || nh.y >= SIZE) {
        setAlive(false);
        return;
      }
      // Self collision (exclude tail)
      if (s.slice(0, -1).some((p) => p.x === nh.x && p.y === nh.y)) {
        setAlive(false);
        return;
      }

      const ate = nh.x === food.x && nh.y === food.y;
      const ns = [nh, ...s];
      if (!ate) ns.pop();
      setSnake(ns);

      if (ate) {
        setScore((sc) => {
          const nv = sc + 1;
          setBest((b) => (nv > b ? nv : b));
          return nv;
        });
        setFood(randFood(ns));
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [alive, food]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") turn(0, -1);
      if (e.key === "ArrowDown") turn(0, 1);
      if (e.key === "ArrowLeft") turn(-1, 0);
      if (e.key === "ArrowRight") turn(1, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  const reset = () => {
    setSnake(initialSnake);
    setDir({ x: 1, y: 0 });
    setFood(randFood(initialSnake));
    setScore(0);
    setAlive(true);
  };

  // Build grid cells
  const cells: ("snake" | "head" | "food" | null)[][] = Array.from(
    { length: SIZE },
    () => Array(SIZE).fill(null)
  );
  snake.forEach((p, i) => {
    if (p.x >= 0 && p.x < SIZE && p.y >= 0 && p.y < SIZE) {
      cells[p.y][p.x] = i === 0 ? "head" : "snake";
    }
  });
  if (food.x >= 0 && food.x < SIZE && food.y >= 0 && food.y < SIZE) {
    cells[food.y][food.x] = "food";
  }

  return (
    <div className="h-full flex flex-col p-4" dir="rtl">
      {/* Score bar */}
      <div className="flex items-center justify-center gap-4 mb-3 text-xs font-black">
        <div className="flex items-center gap-1.5 text-white/70">
          <span>النقاط</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10">{score}</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/70">
          <span>الأفضل</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{best}</span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-3 h-7">
        {!alive ? (
          <div className="flex items-center justify-center gap-2 text-rose-400">
            <Trophy size={16} />
            <span className="font-black text-sm">انتهت! النقاط: {score}</span>
          </div>
        ) : (
          <span className="text-white/60 font-bold text-sm">
            استخدم الأسهم للتحكم
          </span>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="grid gap-[1px] w-full max-w-[340px] aspect-square bg-white/5 p-1 rounded-2xl border border-white/10"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
        >
          {cells.flatMap((row, y) =>
            row.map((cell, x) => {
              const key = `${x}-${y}`;
              const cls =
                cell === "head"
                  ? "bg-emerald-400 rounded-[3px]"
                  : cell === "snake"
                  ? "bg-emerald-500/70 rounded-[2px]"
                  : cell === "food"
                  ? "bg-rose-500 rounded-full"
                  : "bg-transparent";
              return <div key={key} className={cls} />;
            })
          )}
        </div>
      </div>

      {/* Direction pad */}
      <div className="mt-4 flex items-center justify-between">
        <div className="grid grid-cols-3 gap-1 w-32">
          <div />
          <button
            onClick={() => turn(0, -1)}
            className="aspect-square rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-90"
          >
            <ArrowUp size={20} />
          </button>
          <div />
          <button
            onClick={() => turn(-1, 0)}
            className="aspect-square rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => turn(0, 1)}
            className="aspect-square rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-90"
          >
            <ArrowDown size={20} />
          </button>
          <button
            onClick={() => turn(1, 0)}
            className="aspect-square rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-90"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        <button
          onClick={reset}
          className="flex-1 mr-3 py-3 rounded-2xl bg-purple-500/30 border border-purple-400/60 text-white font-black flex items-center justify-center gap-2 active:scale-95"
        >
          <RotateCcw size={16} />
          {alive ? "إعادة" : "لعبة جديدة"}
        </button>
      </div>
    </div>
  );
}

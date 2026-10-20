// [ezo-games] MemoryGame — 4x4 cards, 8 pairs
import { useState, useEffect } from "react";
import { RotateCcw, Trophy } from "lucide-react";

const EMOJIS = ["🎁", "⭐", "🔥", "💎", "🎈", "🍕", "⚽", "🎸"];

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

function shuffle(): Card[] {
  const deck: Card[] = [];
  EMOJIS.forEach((e, i) => {
    deck.push({ id: i * 2,     emoji: e, flipped: false, matched: false });
    deck.push({ id: i * 2 + 1, emoji: e, flipped: false, matched: false });
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface Props {
  onClose: () => void;
}

export default function MemoryGame({ onClose: _onClose }: Props) {
  const [cards, setCards] = useState<Card[]>(shuffle);
  const [picks, setPicks] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);

  const matchedPairs = cards.filter((c) => c.matched).length / 2;
  const won = matchedPairs === EMOJIS.length;

  // Auto-flip back after 2 non-matching
  useEffect(() => {
    if (picks.length !== 2) return;
    setBusy(true);
    const [a, b] = picks;
    if (cards[a].emoji === cards[b].emoji) {
      // Match
      setTimeout(() => {
        setCards((cs) =>
          cs.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c))
        );
        setPicks([]);
        setBusy(false);
      }, 300);
    } else {
      // No match — flip back
      setTimeout(() => {
        setCards((cs) =>
          cs.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c))
        );
        setPicks([]);
        setBusy(false);
      }, 800);
    }
  }, [picks, cards]);

  const handleClick = (i: number) => {
    if (busy) return;
    const c = cards[i];
    if (c.flipped || c.matched) return;
    const nc = cards.map((x, j) => (j === i ? { ...x, flipped: true } : x));
    setCards(nc);
    setPicks((p) => [...p, i]);
    if (picks.length === 0) setMoves((m) => m + 1);
  };

  const reset = () => {
    setCards(shuffle());
    setPicks([]);
    setMoves(0);
    setBusy(false);
  };

  return (
    <div className="h-full flex flex-col p-4" dir="rtl">
      {/* Stats */}
      <div className="flex items-center justify-center gap-4 mb-3 text-xs font-black">
        <div className="flex items-center gap-1.5 text-white/70">
          <span>الحركات</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10">{moves}</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/70">
          <span>الأزواج</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10">
            {matchedPairs}/{EMOJIS.length}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-3 h-7">
        {won ? (
          <div className="flex items-center justify-center gap-2 text-amber-300">
            <Trophy size={16} />
            <span className="font-black text-sm">
              أكملت! ({moves} حركة)
            </span>
          </div>
        ) : (
          <span className="text-white/60 font-bold text-sm">
            اقلب بطاقتين متطابقتين
          </span>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-2 w-full max-w-[340px]">
          {cards.map((c, i) => {
            const shown = c.flipped || c.matched;
            return (
              <button
                key={c.id}
                onClick={() => handleClick(i)}
                disabled={shown || busy}
                className={`aspect-square rounded-2xl flex items-center justify-center text-3xl font-black transition ${
                  c.matched
                    ? "bg-emerald-500/25 border-2 border-emerald-400/70"
                    : shown
                    ? "bg-white/15 border border-white/20"
                    : "bg-gradient-to-br from-purple-600/40 to-purple-800/40 border border-purple-400/30 hover:from-purple-500/50 hover:to-purple-700/50 active:scale-95"
                }`}
              >
                {shown ? (
                  <span>{c.emoji}</span>
                ) : (
                  <span className="text-white/30 text-xl">?</span>
                )}
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
          إعادة الخلط
        </button>
      </div>
    </div>
  );
}

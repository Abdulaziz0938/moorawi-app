import { useState } from "react";
import { X } from "lucide-react";
import { useBackButton } from "../lib/hooks/useBackButton";
import AnimalKingdomSheet from "./AnimalKingdomSheet";

interface Props { 
  onClose: () => void; 
  userId: string; 
  userName: string; 
  userBalance: number; 
}

export default function GamesSheet({ onClose, userId, userName, userBalance }: Props) {
  const [activeGame, setActiveGame] = useState<"animals" | "wheel" | null>(null);

  useBackButton(() => {
    if (activeGame) setActiveGame(null);
    else onClose();
  });

  if (activeGame === "animals") {
    return (
      <AnimalKingdomSheet
        onClose={() => setActiveGame(null)}
        initialUserId={userId}
        initialUserName={userName}
        initialBalance={userBalance}
      />
    );
  }

  if (activeGame === "wheel") {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🎡</div>
        <h2 className="text-white text-xl font-bold mb-6">عجلة الحظ قيد التطوير...</h2>
        <button onClick={() => setActiveGame(null)} className="bg-rose-600 text-white px-6 py-2 rounded-xl">رجوع</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 relative border-t sm:border border-slate-700">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-black flex items-center gap-2">
            🎮 الألعاب
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setActiveGame("animals")} 
            className="bg-gradient-to-br from-emerald-600 to-emerald-900 border-2 border-emerald-500/50 p-4 rounded-2xl flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all"
          >
            <span className="text-4xl mb-2 drop-shadow-md">🦁</span>
            <span className="text-amber-300 font-black text-sm">مملكة الحيوانات</span>
          </button>

          <button 
            onClick={() => setActiveGame("wheel")} 
            className="bg-gradient-to-br from-purple-600 to-purple-900 border-2 border-purple-500/50 p-4 rounded-2xl flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all"
          >
            <span className="text-4xl mb-2 drop-shadow-md">🎡</span>
            <span className="text-white font-black text-sm">عجلة الحظ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

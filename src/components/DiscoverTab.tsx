import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Trophy, Gamepad2, Users, Globe, Sparkles, ChevronLeft, Play, Dices } from "lucide-react";

interface DiscoverTabProps {
  onEnterRoom: (roomId: any) => void;
}

export default function DiscoverTab({ onEnterRoom }: DiscoverTabProps) {
  const [activeTab, setActiveTab] = useState<"official" | "games" | "activities">("activities");
  const [selectedGame, setSelectedGame] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("SA");

  // جلب الغرف الحقيقية من قاعدة البيانات مباشرة بدون أي بيانات وهمية
  const rooms = useQuery(api.rooms.listPublic) || [];

  const gameCategories = [
    { id: "all", name: "الكل", icon: Sparkles },
    { id: "guess", name: "Guess", icon: Play },
    { id: "uno", name: "UNO", icon: Gamepad2 },
    { id: "baloot", name: "Baloot", icon: Trophy },
    { id: "jackaroo", name: "Jackaroo", icon: Dices },
  ];

  return (
    <div className="relative z-30 w-full flex flex-col pb-32 text-white select-none" dir="rtl">
      
      {/* 1. البانر العلوي الفاخر */}
      <div className="relative w-full px-4 pt-3">
        <div 
          className="relative w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-end p-5 border border-amber-500/40"
          style={{
            aspectRatio: "16 / 7",
            background: "linear-gradient(135deg, #2a1558 0%, #0d0618 100%)",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-[10px] bg-amber-500/30 text-amber-300 px-2.5 py-0.5 rounded-full font-bold border border-amber-500/40 shadow">
                تصنيف الوكالات النشطة
              </span>
              <h2 className="text-base font-black text-amber-200 mt-1.5 drop-shadow-md">
                مستوى النخبة في الغرف الصوتية
              </h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-200/60 flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              S
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-4 relative z-10">
            <span className="w-6 h-1.5 bg-amber-400 rounded-full shadow-[0_0_8px_#f59e0b]" />
            <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
            <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>

      {/* 2. حاوية متراكبة بحواف دائرية فوق البانر مثل بينمو */}
      <div className="relative z-10 -mt-3 pt-4 rounded-t-3xl bg-[#0b0e14]/95 border-t border-purple-500/20 shadow-[0_-8px_25px_rgba(0,0,0,0.7)] flex items-center justify-between px-4 mb-3 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => setActiveTab("official")}
            className={`text-sm font-bold transition ${activeTab === "official" ? "text-amber-300 scale-105 border-b-2 border-amber-400 pb-1" : "text-white/40 hover:text-white/70"}`}
          >
            رسمي
          </button>
          <button 
            onClick={() => setActiveTab("games")}
            className={`text-sm font-bold transition ${activeTab === "games" ? "text-amber-300 scale-105 border-b-2 border-amber-400 pb-1" : "text-white/40 hover:text-white/70"}`}
          >
            الألعاب
          </button>
          <button 
            onClick={() => setActiveTab("activities")}
            className={`text-sm font-bold transition ${activeTab === "activities" ? "text-amber-300 scale-105 border-b-2 border-amber-400 pb-1" : "text-white/40 hover:text-white/70"}`}
          >
            الأنشطة
          </button>
        </div>

        <button className="text-xs text-amber-400/80 hover:text-amber-300 flex items-center gap-1 font-semibold">
          أكثر <ChevronLeft size={14} />
        </button>
      </div>

      {/* 3. فئات الألعاب الحقيقية */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {gameCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedGame === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedGame(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition whitespace-nowrap shadow-lg ${
                  isSelected 
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-amber-400/50 text-white shadow-purple-500/30" 
                    : "bg-[#161c26] border-white/10 text-white/70 hover:bg-[#1f293d]"
                }`}
              >
                <Icon size={16} className={isSelected ? "text-amber-300" : "text-purple-400"} />
                <span className="text-xs font-bold">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* فلاتر الدول */}
      <div className="flex items-center gap-2 px-4 mb-4">
        <button 
          onClick={() => setSelectedCountry("SA")}
          className={`px-3 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${selectedCountry === "SA" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-white/5 text-white/50 border-white/5"}`}
        >
          🇸🇦 السعودية
        </button>
        <button 
          onClick={() => setSelectedCountry("ALL")}
          className={`px-3 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${selectedCountry === "ALL" ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "bg-white/5 text-white/50 border-white/5"}`}
        >
          <Globe size={12} /> العالم
        </button>
      </div>

      {/* 4. قائمة الغرف الحقيقية القادمة من قاعدة البيانات فقط */}
      <div className="flex flex-col gap-3 px-4">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/40 gap-2">
            <Trophy size={32} className="text-amber-500/50 animate-pulse" />
            <p className="text-xs">لا توجد غرف نشطة حالياً في النظام</p>
          </div>
        ) : (
          rooms.map((room: any) => (
            <div 
              key={room._id}
              onClick={() => onEnterRoom(room._id)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#161c26] border border-white/10 hover:border-purple-500/40 transition cursor-pointer shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-amber-500/30 bg-black/40 flex-shrink-0">
                  <img 
                    src={room.coverUrl || room.image || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200"} 
                    alt={room.title} 
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-center text-amber-300 font-bold py-0.5">
                    LIVE
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white line-clamp-1">{room.title}</h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      SA 🇸🇦
                    </span>
                  </div>
                  <p className="text-xs text-white/50 flex items-center gap-1">
                    <Users size={12} className="text-purple-400" /> {room.memberCount || 1} متصل الآن
                  </p>
                </div>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEnterRoom(room._id);
                }}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)] transition active:scale-95"
              >
                + دخول
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

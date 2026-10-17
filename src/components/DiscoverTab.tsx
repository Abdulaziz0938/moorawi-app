import React, { useState } from "react";
import { ChevronLeft, RefreshCw, Trophy, Gamepad2, Star, Calendar } from "lucide-react";

interface DiscoverTabProps {
  onEnterRoom?: (roomId: string) => void;
}

export default function DiscoverTab({ onEnterRoom }: DiscoverTabProps) {
  const [subTab, setSubTab] = useState<"official" | "games" | "activities">("activities");

  // بيانات وهمية للفعاليات والأنشطة مطابقة لصورة بينمو
  const events = [
    {
      id: "1",
      title: "النوم 😂",
      tag: "قريباً",
      time: "10-18 01:55",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=500&auto=format&fit=crop",
      agency: "حرفي..",
    },
    {
      id: "2",
      title: "عالم المطاعم",
      tag: "قريباً",
      time: "10-17 22:00",
      image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=500&auto=format&fit=crop",
      agency: "وكاله بي...",
    },
    {
      id: "3",
      title: "عنجد كل الناس مصالح",
      tag: "قريباً",
      time: "10-22 02:02",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=500&auto=format&fit=crop",
      agency: "نبض قل..",
    },
    {
      id: "4",
      title: "مذظ",
      tag: "قريباً",
      time: "10-20 14:05",
      image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=500&auto=format&fit=crop",
      agency: "مجيل..",
    },
  ];

  return (
    <div className="w-full flex flex-col pb-32 text-white select-none" dir="rtl">
      
      {/* 1. البانر العلوي المتحرك (Carousel Banner) */}
      <div className="relative w-full px-4 pt-3">
        <div 
          className="relative w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-end p-4 border border-amber-500/30"
          style={{
            aspectRatio: "16 / 7",
            background: "linear-gradient(135deg, #1e103f 0%, #0d0618 100%)",
          }}
        >
          {/* خلفية جمالية تخيلية للبانر */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-[10px] bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/40">
                مسابقة تصنيف الوكالات
              </span>
              <h2 className="text-lg font-black text-amber-200 mt-1 drop-shadow-md">
                تهانينا على الوصول إلى مستوى S
              </h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-black text-xl shadow-lg">
              S
            </div>
          </div>

          {/* نقاط التمرير (Dots) */}
          <div className="flex items-center justify-center gap-1.5 mt-3 relative z-10">
            <span className="w-5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_6px_#f59e0b]" />
            <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
            <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
            <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>

      {/* 2. شريط التصنيفات (Tabs: رسمى، الألعاب، الأنشطة) */}
      <div className="flex items-center justify-between px-4 mt-5 mb-3 border-b border-white/5 pb-2">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setSubTab("official")}
            className={`text-sm font-bold transition ${subTab === "official" ? "text-white scale-105 border-b-2 border-emerald-400 pb-1" : "text-white/40 hover:text-white/70"}`}
          >
            رسمي
          </button>
          <button 
            onClick={() => setSubTab("games")}
            className={`text-sm font-bold transition ${subTab === "games" ? "text-white scale-105 border-b-2 border-emerald-400 pb-1" : "text-white/40 hover:text-white/70"}`}
          >
            الألعاب
          </button>
          <button 
            onClick={() => setSubTab("activities")}
            className={`text-sm font-bold transition ${subTab === "activities" ? "text-white scale-105 border-b-2 border-emerald-400 pb-1" : "text-white/40 hover:text-white/70"}`}
          >
            الأنشطة
          </button>
        </div>

        <button className="text-xs text-white/50 hover:text-white flex items-center gap-1">
          أكثر <ChevronLeft size={14} />
        </button>
      </div>

      {/* 3. شبكة الكروت (Grid Cards) للأنشطة */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {events.map((item) => (
          <div 
            key={item.id}
            className="flex flex-col rounded-2xl bg-[#161c26] border border-white/10 overflow-hidden shadow-lg hover:border-purple-500/40 transition"
          >
            {/* صورة الكرت مع شارة "قريباً" */}
            <div className="relative w-full h-32 bg-black/40">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#161c26] via-transparent to-transparent opacity-80" />
              
              {/* شارة قريباً */}
              <span className="absolute top-2 right-2 text-[10px] bg-emerald-500/90 text-white font-bold px-2 py-0.5 rounded-md shadow">
                {item.tag}
              </span>

              {/* الوقت والوكالة */}
              <div className="absolute bottom-2 right-2 left-2 flex items-center justify-between text-[10px] text-white/80">
                <span className="truncate">{item.agency}</span>
                <span className="flex items-center gap-1"><Calendar size={10} /> {item.time}</span>
              </div>
            </div>

            {/* تفاصيل الكرت وزر الاشتراك */}
            <div className="p-3 flex flex-col gap-2">
              <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
              
              <div className="flex items-center gap-2 mt-1">
                <button className="flex-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 py-1.5 rounded-xl text-xs font-bold transition text-center shadow">
                  + الاشتراك
                </button>
                <button className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

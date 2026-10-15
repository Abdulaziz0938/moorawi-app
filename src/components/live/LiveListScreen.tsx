// [ezo-live] شاشة قائمة البث المباشر — تُضمَّن في تبويب "لايف"
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader2, Radio } from "lucide-react";
import LiveTile from "./LiveTile";

interface Props {
  onEnter: (streamId: string) => void;
}

export default function LiveListScreen({ onEnter }: Props) {
  const streams = useQuery(api.live.listLive, { limit: 60 });

  if (streams === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="text-white/40 animate-spin" size={32} />
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-400/30 flex items-center justify-center mb-3">
          <Radio size={36} className="text-red-400/60" />
        </div>
        <p className="text-white/70 text-sm font-black">لا يوجد بث مباشر حالياً</p>
        <p className="text-white/40 text-[11px] mt-1">
          تحقق لاحقاً — قد تبث مذيعة قريباً
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {streams.map((s: any) => (
        <LiveTile
          key={s._id}
          stream={s}
          onEnter={() => onEnter(s._id)}
        />
      ))}
    </div>
  );
}

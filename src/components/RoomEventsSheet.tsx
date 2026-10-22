// [ezo-events] Room Events Sheet — Binmo style (white, empty state)
import { X, Plus, Gift } from "lucide-react";

interface Props {
  ownerName: string;
  ownerWealthLevel: number; // 0-100
  onClose: () => void;
}

const REQUIRED_LEVEL = 10;

export default function RoomEventsSheet({ ownerName, ownerWealthLevel, onClose }: Props) {
  const canCreate = ownerWealthLevel >= REQUIRED_LEVEL;

  return (
    <div className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-sm flex items-end justify-center" dir="rtl" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-3xl h-[80dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="p-1 text-gray-700">
            <X size={22} />
          </button>
          <h2 className="text-gray-900 font-black text-base">نشاط الغرفة</h2>
          <button
            disabled={!canCreate}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-black ${canCreate ? "bg-emerald-500 text-white active:scale-95" : "bg-gray-200 text-gray-400"}`}
            title={canCreate ? "إنشاء فعالية" : "يتطلب مستوى الثروة 10"}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
              <Gift size={40} className="text-gray-400" />
            </div>
            {/* Three sparkles above */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1">
              <span className="w-1 h-3 bg-emerald-400 rounded-full" />
              <span className="w-1 h-4 bg-emerald-400 rounded-full" />
              <span className="w-1 h-3 bg-emerald-400 rounded-full" />
            </div>
          </div>
          <p className="text-gray-500 text-sm font-bold">هنا فارغ</p>
        </div>

        {/* Condition message */}
        <div className="p-3 flex-shrink-0">
          <div className={`rounded-2xl px-3 py-2.5 text-center text-[11px] font-bold ${canCreate ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
            {canCreate
              ? "يمكنك الآن إنشاء فعاليات الغرفة بجمع النقاط وفتح الأوسمة"
              : `يمكن إنشاء الأحداث فقط عندما يصل مستوى ثروة صاحب الغرفة إلى المستوى ${REQUIRED_LEVEL} أو أعلى (الحالي: ${ownerWealthLevel})`}
          </div>
        </div>
      </div>
    </div>
  );
}

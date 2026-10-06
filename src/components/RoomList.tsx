import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Mic, Users, Plus, X } from "lucide-react";

interface Props {
  onEnter: (roomId: Id<"rooms">) => void;
}

export default function RoomList({ onEnter }: Props) {
  const rooms = useQuery(api.rooms.listPublic);
  const createRoom = useMutation(api.rooms.create);
  const joinRoom = useMutation(api.rooms.join);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const roomId = await createRoom({ name: newName.trim(), isPrivate: false });
      setNewName("");
      setShowCreate(false);
      onEnter(roomId);
    } catch (e: any) {
      alert("خطأ: " + (e.message || "غير معروف"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (roomId: Id<"rooms">) => {
    try {
      await joinRoom({ roomId });
      onEnter(roomId);
    } catch (e: any) {
      alert("خطأ: " + (e.message || "غير معروف"));
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <header className="text-center py-6 text-white">
        <h1 className="text-3xl font-bold mb-2">الدولة العمراوية</h1>
        <p className="text-sm opacity-80">غرف صوتية للجميع</p>
      </header>

      <button
        onClick={() => setShowCreate(true)}
        className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-xl flex items-center justify-center gap-2 mb-4 font-bold transition"
      >
        <Plus size={20} /> إنشاء غرفة جديدة
      </button>

      <div className="space-y-3">
        {rooms === undefined ? (
          <p className="text-white text-center">جاري التحميل...</p>
        ) : rooms.length === 0 ? (
          <p className="text-white text-center opacity-70">لا توجد غرف حالياً. كن أول من ينشئ غرفة!</p>
        ) : (
          rooms.map((room) => (
            <div
              key={room._id}
              onClick={() => handleJoin(room._id)}
              className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl cursor-pointer flex items-center justify-between transition"
            >
              <div>
                <p className="font-bold">{room.name}</p>
                <p className="text-xs opacity-70 flex items-center gap-1 mt-1">
                  <Users size={14} /> {room.memberCount} عضو
                </p>
              </div>
              <div className="bg-purple-600 rounded-full p-2">
                <Mic size={20} />
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">غرفة جديدة</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500"><X /></button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="اسم الغرفة"
              className="w-full border-2 border-gray-200 rounded-lg p-3 mb-4 focus:border-purple-500 outline-none"
              maxLength={40}
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition"
            >
              {isCreating ? "جاري الإنشاء..." : "إنشاء"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

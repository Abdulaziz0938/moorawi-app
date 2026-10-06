import { useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import RoomList from "./components/RoomList";
import RoomView from "./components/RoomView";

function App() {
  const [currentRoomId, setCurrentRoomId] = useState<Id<"rooms"> | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900" dir="rtl">
      {currentRoomId ? (
        <RoomView roomId={currentRoomId} onLeave={() => setCurrentRoomId(null)} />
      ) : (
        <RoomList onEnter={setCurrentRoomId} />
      )}
    </div>
  );
}

export default App;

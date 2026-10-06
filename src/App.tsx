import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function App() {
  const rooms = useQuery(api.rooms.listPublic);

  return (
    <div className="p-8 text-center" dir="rtl">
      <h1 className="text-3xl font-bold mb-4">الدولة العمراوية</h1>
      <p className="mb-4">جاري الاتصال بقاعدة البيانات...</p>
      {rooms === undefined ? (
        <p>جاري التحميل...</p>
      ) : (
        <p>تم الاتصال بنجاح! عدد الغرف المتاحة: {rooms.length}</p>
      )}
    </div>
  );
}

export default App;

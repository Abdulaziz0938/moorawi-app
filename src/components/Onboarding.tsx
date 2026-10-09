import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getDeviceId } from "../lib/device";
import { getSessionUsername } from "../lib/session";
import { uploadToCloudinary } from "../lib/cloudinary";
import { Camera, Check, Loader2, ChevronLeft } from "lucide-react";

interface Props {
  onComplete: () => void;
}

type Gender = "male" | "female" | "other";

export default function Onboarding({ onComplete }: Props) {
  const deviceId = getDeviceId();
  const options = useQuery(api.profiles.getOptions);
    const saveAvatar = useMutation(api.profiles.saveAvatar);
  const completeProfile = useMutation(api.profiles.completeProfile);

  const [step, setStep] = useState(1);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const sessionUsername = getSessionUsername();
  const [username, setUsername] = useState(sessionUsername ?? "");
  const [age, setAge] = useState(18);
  const [gender, setGender] = useState<Gender>("male");
  const [country, setCountry] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // [moorawi-auth] هل هذا اسم المستخدم الخاص بالمستخدم المسجل حالياً؟
  const isOwnUsername = !!sessionUsername && username.toLowerCase() === sessionUsername.toLowerCase();

  // Username availability check (skip if it's own username)
  const usernameCheck = useQuery(
    api.profiles.isUsernameAvailable,
    username.length >= 3 && !isOwnUsername ? { username } : "skip" as any,
  );

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await uploadToCloudinary(file, "image");
      const url = await saveAvatar({ avatarUrl: result.url, tokenOverride: deviceId });
      setAvatarPreview(url);
    } catch (e: any) {
      setError(e?.message || "فشل رفع الصورة");
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 8 ? [...prev, interest] : prev
    );
  };

  const handleFinish = async () => {
    if (!country) { setError("اختر دولتك"); return; }
    if (selectedInterests.length < 3) { setError("اختر 3 اهتمامات على الأقل"); return; }
    setLoading(true);
    setError(null);
    try {
      await completeProfile({
        name, username, age, gender, country,
        interests: selectedInterests,
        bio: bio || undefined,
        tokenOverride: deviceId,
      });
      onComplete();
    } catch (e: any) {
      setError(e?.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep3 = name.length >= 2 && (isOwnUsername || usernameCheck?.available === true);
  const canProceedStep4 = country && selectedInterests.length >= 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900 text-white p-6" dir="rtl">
      {/* Progress bar */}
      <div className="max-w-md mx-auto mb-8 pt-4">
        <div className="flex items-center justify-between mb-2">
          {step > 1 && step < 5 && (
            <button onClick={() => setStep(step - 1)} className="p-2 hover:bg-white/10 rounded-full">
              <ChevronLeft size={20} />
            </button>
          )}
          <span className="text-xs opacity-70">الخطوة {step} من 4</span>
        </div>
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-md mx-auto">
        {/* STEP 1: Welcome */}
        {step === 1 && (
          <div className="text-center space-y-6 pt-12">
            <div className="text-6xl mb-4">🎙️</div>
            <h1 className="text-4xl font-bold">أهلاً بك في</h1>
            <h2 className="text-3xl font-bold text-purple-200">الدولة العمراوية</h2>
            <p className="opacity-80 text-sm leading-relaxed px-4">
              انضم إلى غرف صوتية، تعرف على أصدقاء جدد، وشارك لحظاتك مع المجتمع.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-white text-purple-800 py-4 rounded-xl font-bold text-lg mt-8 hover:bg-purple-100 transition"
            >
              لنبدأ!
            </button>
          </div>
        )}

        {/* STEP 2: Avatar */}
        {step === 2 && (
          <div className="text-center space-y-6 pt-8">
            <h2 className="text-2xl font-bold">اختر صورة ملفك الشخصي</h2>
            <p className="opacity-70 text-sm">يمكنك تخطي هذه الخطوة وإضافتها لاحقاً</p>
            <div className="flex justify-center my-8">
              <label className="cursor-pointer relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <div className="w-40 h-40 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center overflow-hidden group-hover:border-white transition">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  ) : loading ? (
                    <Loader2 className="animate-spin" size={40} />
                  ) : (
                    <Camera size={48} className="opacity-70" />
                  )}
                </div>
                <div className="absolute bottom-1 left-1 bg-purple-600 rounded-full p-2 border-2 border-white">
                  <Camera size={16} />
                </div>
              </label>
            </div>
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <div className="space-y-3 pt-4">
              <button
                onClick={() => setStep(3)}
                disabled={loading}
                className="w-full bg-white text-purple-800 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                متابعة
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-full py-3 text-sm opacity-70 hover:opacity-100"
              >
                تخطي
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Basic Info */}
        {step === 3 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-center mb-6">معلوماتك الأساسية</h2>
            <div>
              <label className="text-sm opacity-80 mb-1 block">الاسم الظاهر</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أحمد"
                maxLength={30}
                className="w-full bg-white/10 border border-white/30 rounded-xl p-3 outline-none focus:border-white text-white placeholder-white/40"
              />
            </div>
            <div>
              <label className="text-sm opacity-80 mb-1 block">اسم المستخدم (بالإنجليزية)</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="ahmad_123"
                  maxLength={20}
                  readOnly={!!sessionUsername}
                  className={`w-full bg-white/10 border border-white/30 rounded-xl p-3 outline-none focus:border-white text-white placeholder-white/40 pl-10 ${sessionUsername ? "opacity-70 cursor-not-allowed" : ""}`}
                  dir="ltr"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">@</span>
              </div>
              {isOwnUsername ? (
                <p className="text-xs mt-1 text-green-300">✓ مرتبط بحسابك</p>
              ) : username.length >= 3 && usernameCheck ? (
                <p className={`text-xs mt-1 ${usernameCheck.available ? "text-green-300" : "text-red-300"}`}>
                  {usernameCheck.available ? "✓ متاح" : `✗ ${usernameCheck.reason}`}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm opacity-80 mb-1 block">العمر</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  min={13}
                  max={100}
                  className="w-full bg-white/10 border border-white/30 rounded-xl p-3 outline-none focus:border-white text-white"
                />
              </div>
              <div>
                <label className="text-sm opacity-80 mb-1 block">الجنس</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full bg-white/10 border border-white/30 rounded-xl p-3 outline-none focus:border-white text-white"
                >
                  <option value="male" className="text-black">ذكر</option>
                  <option value="female" className="text-black">أنثى</option>
                  <option value="other" className="text-black">آخر</option>
                </select>
              </div>
            </div>
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <button
              onClick={() => setStep(4)}
              disabled={!canProceedStep3}
              className="w-full bg-white text-purple-800 py-3 rounded-xl font-bold disabled:opacity-50 mt-4"
            >
              متابعة
            </button>
          </div>
        )}

        {/* STEP 4: Country + Interests */}
        {step === 4 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold text-center mb-6">الدولة والاهتمامات</h2>
            <div>
              <label className="text-sm opacity-80 mb-1 block">الدولة</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-white/10 border border-white/30 rounded-xl p-3 outline-none focus:border-white text-white"
              >
                <option value="" className="text-black">اختر دولتك</option>
                {options?.countries.map((c) => (
                  <option key={c} value={c} className="text-black">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm opacity-80 mb-2 block">
                الاهتمامات ({selectedInterests.length}/8) - اختر 3 على الأقل
              </label>
              <div className="flex flex-wrap gap-2">
                {options?.interests.map((interest) => {
                  const selected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        selected
                          ? "bg-white text-purple-800 font-bold"
                          : "bg-white/10 border border-white/30 hover:bg-white/20"
                      }`}
                    >
                      {selected && <Check className="inline mr-1" size={14} />}
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm opacity-80 mb-1 block">نبذة عنك (اختياري)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="اكتب شيئاً عن نفسك..."
                maxLength={200}
                rows={3}
                className="w-full bg-white/10 border border-white/30 rounded-xl p-3 outline-none focus:border-white text-white placeholder-white/40 resize-none"
              />
              <p className="text-xs opacity-50 text-left">{bio.length}/200</p>
            </div>
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <button
              onClick={handleFinish}
              disabled={!canProceedStep4 || loading}
              className="w-full bg-white text-purple-800 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
              {loading ? "جاري الحفظ..." : "إتمام التسجيل"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

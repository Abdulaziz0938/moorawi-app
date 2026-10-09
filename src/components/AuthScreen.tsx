import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Loader2, User, Lock, ArrowLeft, Sparkles } from "lucide-react";
import { setSession } from "../lib/session";

interface Props {
  onSuccess: () => void;
}

type Mode = "welcome" | "signin" | "signup";

export default function AuthScreen({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>("welcome");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signin = useMutation(api.auth.signin);
  const signup = useMutation(api.auth.signup);

  const deviceId =
    typeof localStorage !== "undefined"
      ? (() => {
          const KEY = "moorawi_device_id";
          let id = localStorage.getItem(KEY);
          if (!id) {
            id = "dev-" + Math.random().toString(36).slice(2, 10);
            localStorage.setItem(KEY, id);
          }
          return id;
        })()
      : "";

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setPassword2("");
    setError(null);
  };

  const handleSignin = async () => {
    setError(null);
    if (!username.trim() || !password) {
      setError("املأ جميع الحقول");
      return;
    }
    setLoading(true);
    try {
      const res = await signin({ identifier: username.trim(), password });
      setSession(res.sessionToken, res.username);
      onSuccess();
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "فشل تسجيل الدخول";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setError(null);
    if (!username.trim() || !password) {
      setError("املأ جميع الحقول");
      return;
    }
    if (password !== password2) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور: 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      const res = await signup({
        username: username.trim(),
        password,
        deviceId,
      });
      setSession(res.sessionToken, res.username);
      onSuccess();
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || "فشل إنشاء الحساب";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ============ Welcome ============
  if (mode === "welcome") {
    return (
      <div className="min-h-[100dvh] w-full app-bg flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-md flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-2xl">
              <Sparkles size={48} className="text-white" />
            </div>
            <h1 className="text-white text-3xl font-black mt-2">الدولة العمراوية</h1>
            <p className="text-white/60 text-sm">انضم لأفضل غرف صوتية</p>
          </div>

          <div className="w-full flex flex-col gap-3 mt-4">
            <button
              onClick={() => { resetForm(); setMode("signin"); }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-lg shadow-lg active:scale-95 transition"
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { resetForm(); setMode("signup"); }}
              className="w-full py-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white font-bold text-lg active:scale-95 transition hover:bg-white/15"
            >
              إنشاء حساب جديد
            </button>
            <button
              onClick={() => onSuccess()}
              className="w-full py-3 text-white/50 text-sm hover:text-white/80 transition mt-2"
            >
              متابعة كزائر
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ Signin / Signup ============
  const isSignup = mode === "signup";

  return (
    <div className="min-h-[100dvh] w-full app-bg flex flex-col items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md flex flex-col gap-6">
        <button
          onClick={() => { resetForm(); setMode("welcome"); }}
          className="flex items-center gap-2 text-white/60 hover:text-white transition self-start"
        >
          <ArrowLeft size={20} className="rotate-180" />
          <span className="text-sm font-bold">رجوع</span>
        </button>

        <h2 className="text-white text-2xl font-black text-center">
          {isSignup ? "إنشاء حساب" : "تسجيل الدخول"}
        </h2>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <User size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isSignup ? "اسم المستخدم (إنجليزي)" : "اسم المستخدم أو ID"}
              className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl py-4 pr-12 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400 transition"
              autoComplete="username"
              dir="ltr"
            />
          </div>

          <div className="relative">
            <Lock size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl py-4 pr-12 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400 transition"
              autoComplete={isSignup ? "new-password" : "current-password"}
              dir="ltr"
            />
          </div>

          {isSignup && (
            <div className="relative">
              <Lock size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="تأكيد كلمة المرور"
                className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl py-4 pr-12 pl-4 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400 transition"
                autoComplete="new-password"
                dir="ltr"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={isSignup ? handleSignup : handleSignin}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-lg shadow-lg active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 size={22} className="animate-spin" />
          ) : isSignup ? (
            "إنشاء الحساب"
          ) : (
            "دخول"
          )}
        </button>
      </div>
    </div>
  );
}

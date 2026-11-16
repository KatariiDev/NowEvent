"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { testConnection } from "@/lib/api";
import { DEMO_EMAIL, DEMO_PASSWORD, login } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button, inputClass } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMsg, setForgotMsg] = useState(false);
  /** null = chưa kiểm tra xong; true = BE không kết nối được → có demo. */
  const [demoAvailable, setDemoAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    testConnection()
      .then(() => {
        if (!cancelled) setDemoAvailable(false);
      })
      .catch(() => {
        if (!cancelled) setDemoAvailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }
    setLoading(true);
    setError(null);
    setForgotMsg(false);
    try {
      await login(email.trim(), password, remember);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">NowEvent</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Dashboard quản lý thông báo sự kiện Đoàn trường
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="mb-5 text-xl font-semibold text-slate-900 dark:text-white">Đăng nhập</h1>

          {demoAvailable === true && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
              <strong>DEMO MODE — BE không kết nối được.</strong> Bạn có thể đăng nhập demo bằng tài
              khoản dưới đây; chỉ xem dữ liệu mẫu, không lưu lên server.
              <br />
              <span className="font-mono text-xs">
                {DEMO_EMAIL} / {DEMO_PASSWORD}
              </span>
              <br />
              <button
                type="button"
                onClick={fillDemo}
                className="mt-1 font-medium text-indigo-700 underline dark:text-indigo-400"
              >
                Điền tài khoản demo
              </button>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
                {error}
              </p>
            )}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="vd: admin@truong.edu.vn"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mật khẩu
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </label>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Ghi nhớ đăng nhập
              </label>
              <button
                type="button"
                onClick={() => setForgotMsg(true)}
                className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400"
              >
                Quên mật khẩu?
              </button>
            </div>
            {forgotMsg && (
              <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                Chức năng đặt lại mật khẩu chưa được triển khai. Vui lòng liên hệ quản trị viên để
                được cấp lại mật khẩu.
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full justify-center py-2.5">
              {loading ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={toggleTheme}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            {theme === "light" ? "🌙 Chuyển theme Tối" : "☀️ Chuyển theme Sáng"}
          </button>
        </div>
      </div>
    </div>
  );
}

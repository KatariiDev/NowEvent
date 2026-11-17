"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { getAuth, logout, type AuthSession } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Tổng quan", icon: "◈" },
  { href: "/events", label: "Sự kiện", icon: "▤" },
  { href: "/users", label: "Sinh viên", icon: "👥" },
  { href: "/topics", label: "Topic FCM", icon: "📡" },
  { href: "/notifications", label: "Thông báo", icon: "✉" },
  { href: "/settings", label: "Cài đặt", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(getAuth());
  }, [pathname]);

  const doLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-indigo-800 px-4 py-3 text-white lg:hidden">
        <span className="text-lg font-bold">NowEvent</span>
        <button
          onClick={() => setOpen(!open)}
          aria-label="Mở menu"
          className="rounded-lg border border-indigo-600 px-3 py-1 text-sm"
        >
          {open ? "Đóng ✕" : "Menu ☰"}
        </button>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } w-64 shrink-0 bg-indigo-900 text-indigo-100 lg:block lg:sticky lg:top-0 lg:h-screen`}
      >
        <div className="px-5 py-5">
          <p className="text-2xl font-bold text-white">NowEvent</p>
          <p className="mt-1 text-xs text-indigo-300">Dashboard thông báo sự kiện Đoàn trường</p>
        </div>
        <nav className="space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-700 text-white"
                    : "text-indigo-200 hover:bg-indigo-800 hover:text-white"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-6">
          {session && (
            <div className="mb-4 rounded-lg bg-indigo-800 px-3 py-2">
              <p className="truncate text-sm font-medium text-white">{session.user.name}</p>
              <p className="truncate text-xs text-indigo-300">{session.user.email}</p>
              {session.demo && <p className="mt-1 text-xs font-medium text-amber-300">DEMO MODE</p>}
              <button
                onClick={doLogout}
                className="mt-2 w-full rounded-lg border border-indigo-600 px-3 py-1.5 text-sm font-medium text-indigo-100 hover:bg-indigo-700"
              >
                Đăng xuất
              </button>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="w-full rounded-lg border border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-800"
          >
            {theme === "light" ? "🌙 Chuyển theme Tối" : "☀️ Chuyển theme Sáng"}
          </button>
          <p className="mt-4 text-xs leading-relaxed text-indigo-300">
            FCM: 20 topic — 15 khoa + 5 khóa. Mỗi sinh viên đăng ký 1 khoa + 1 khóa.
          </p>
        </div>
      </aside>
    </>
  );
}

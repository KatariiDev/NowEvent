"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getAuth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

/**
 * Route guard + app shell.
 * - Trang /login: không có aside; đã đăng nhập thì chuyển về Tổng quan.
 * - Mọi trang khác: chưa đăng nhập thì chuyển về /login; đã đăng nhập thì
 *   hiện aside trái (Sidebar, giữ nguyên layout) + nội dung.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!getAuth());
    setChecked(true);
  }, [pathname]);

  useEffect(() => {
    if (!checked) return;
    if (pathname === "/login") {
      if (authed) router.replace("/");
    } else if (!authed) {
      router.replace("/login");
    }
  }, [checked, authed, pathname, router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang kiểm tra đăng nhập…</p>
      </div>
    );
  }

  if (pathname === "/login") {
    if (authed) return null;
    return <>{children}</>;
  }

  if (!authed) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}

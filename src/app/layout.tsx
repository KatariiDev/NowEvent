import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { AuthGuard } from "@/components/AuthGuard";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "NowEvent — Dashboard quản lý thông báo sự kiện",
  description:
    "Web dashboard quản lý sự kiện cào từ web Đoàn trường, client đăng ký và thông báo FCM theo khoa + khóa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100`}
      >
        <ThemeProvider>
          <AuthGuard>{children}</AuthGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}

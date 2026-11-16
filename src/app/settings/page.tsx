"use client";

import { useEffect, useState } from "react";
import { DEFAULT_API_BASE_URL, getApiBaseUrl, setApiBaseUrl, testConnection } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { Button, Card, Field, inputClass } from "@/components/ui";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_BASE_URL);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setApiUrl(getApiBaseUrl());
  }, []);

  const saveApiUrl = () => {
    const cleaned = apiUrl.trim().replace(/\/$/, "");
    if (!cleaned.startsWith("http")) {
      setTestResult("URL phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    setApiBaseUrl(cleaned);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 3000);
  };

  const doTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testConnection(apiUrl.trim());
      setTestResult(`Kết nối OK — BE phản hồi sau ${r.latencyMs}ms (GET /health).`);
    } catch (err) {
      setTestResult(
        `Không kết nối được: ${err instanceof Error ? err.message : "lỗi không rõ"}. Dashboard sẽ hiển thị DEMO MODE.`,
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cài đặt</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Kết nối BE, realtime và giao diện.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Kết nối Backend (BE cào)
          </h2>
          <div className="space-y-4">
            <Field label="API Base URL">
              <input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className={inputClass}
                placeholder="http://localhost:8080/api"
              />
            </Field>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mặc định từ biến môi trường{" "}
              <code className="font-mono">NEXT_PUBLIC_API_BASE_URL</code> ({DEFAULT_API_BASE_URL}).
              Giá trị lưu ở đây ghi đè env và được lưu trong localStorage của trình duyệt.
            </p>
            {testResult && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${testResult.startsWith("Kết nối OK") ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200"}`}
              >
                {testResult}
              </p>
            )}
            {saved && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                Đã lưu. Tải lại các trang để dùng URL mới.
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={saveApiUrl}>Lưu URL</Button>
              <Button variant="secondary" onClick={doTest} disabled={testing}>
                {testing ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Realtime</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Kênh chính</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-white">
                SSE — GET /events/stream
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Dự phòng</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-white">
                Polling mỗi 5 giây
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Khi tab ẩn</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-white">
                Tạm dừng polling, nối lại khi quay lại tab
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Khi BE không reachable</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-white">
                DEMO MODE — dữ liệu mẫu, không lưu server
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Nếu BE chưa triển khai <code className="font-mono">/events/stream</code>, dashboard tự
            dùng polling — sự kiện mới vẫn xuất hiện mà không cần tải lại trang. Xem chi tiết ở{" "}
            <code className="font-mono">docs/realtime.md</code>.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Giao diện</h2>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Theme hiện tại: <strong>{theme === "light" ? "Sáng" : "Tối"}</strong>
            </p>
            <Button variant="secondary" onClick={toggleTheme}>
              {theme === "light" ? "🌙 Chuyển theme Tối" : "☀️ Chuyển theme Sáng"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Lựa chọn được lưu trong localStorage. Màu chủ đạo: xanh indigo solid #1E40AF, nền slate
            — không dùng gradient.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Firebase / FCM
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            FE không giữ bất kỳ credential Firebase nào. Việc gửi FCM do BE thực hiện bằng Firebase
            Admin SDK (service account chỉ nằm phía BE). FE chỉ gọi{" "}
            <code className="font-mono">POST /api/notifications/send</code>.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Chưa có Firebase project: tạo project tại Firebase Console, bật Cloud Messaging, tải
            service account cho BE, rồi đối chiếu payload mẫu trong{" "}
            <code className="font-mono">docs/api.md</code>.
          </p>
        </Card>
      </div>
    </div>
  );
}

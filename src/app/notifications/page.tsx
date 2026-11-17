"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  demoRetryNotification,
  demoSendNotification,
  demoStore,
  fetchEvents,
  fetchNotifications,
  retryNotification,
  sendNotification,
} from "@/lib/api";
import { Badge, Button, Card, DemoBanner, EmptyState, Field, inputClass } from "@/components/ui";
import {
  COHORTS,
  FACULTIES,
  batchToCohortSlug,
  buildFcmCondition,
  cohortLabel,
  facultyLabel,
  majorToFacultySlug,
} from "@/lib/faculties";
import type { EventItem, NotificationLog, NotificationStatus } from "@/types";

const STATUS_TONE: Record<NotificationStatus, "green" | "amber" | "red" | "slate" | "blue"> = {
  delivered: "green",
  sent: "blue",
  failed: "red",
  pending: "slate",
};
const STATUS_LABEL: Record<NotificationStatus, string> = {
  delivered: "Đã gửi",
  sent: "Đã gửi (chờ xác nhận)",
  failed: "Thất bại",
  pending: "Đang chờ",
};

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | NotificationStatus>("all");
  const [search, setSearch] = useState("");

  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [faculty, setFaculty] = useState("cntt");
  const [cohorts, setCohorts] = useState<string[]>(["k21"]);
  const [sendMode, setSendMode] = useState<"condition" | "per-cohort">("condition");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nt, ev] = await Promise.all([fetchNotifications(), fetchEvents()]);
      setLogs(nt);
      setEvents(ev);
      setDemo(false);
    } catch {
      setLogs([...demoStore.notifications]);
      setEvents([...demoStore.events]);
      setDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      logs.filter((n) => {
        if (statusFilter !== "all" && n.status !== statusFilter) return false;
        if (search && !`${n.title} ${n.body}`.toLowerCase().includes(search.toLowerCase()))
          return false;
        return true;
      }),
    [logs, statusFilter, search],
  );

  const pickEvent = (id: string) => {
    setEventId(id);
    const ev = events.find((e) => e.id === id);
    if (ev) {
      setTitle(ev.title);
      setBody(ev.content.slice(0, 200));
      // Sự kiện BE chỉ có major (text) + batch (số) — suy ra slug khoa/khóa
      // để điền sẵn khung soạn thông báo; BE phải tự tính condition thật.
      setFaculty(majorToFacultySlug(ev.major));
      setCohorts([batchToCohortSlug(ev.batch)]);
    }
  };

  const toggleCohort = (slug: string) => {
    setCohorts((prev) => (prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]));
  };

  const doSend = async () => {
    if (!title.trim() || !body.trim()) {
      setSendError("Tiêu đề và nội dung không được để trống.");
      return;
    }
    if (cohorts.length === 0) {
      setSendError("Chọn ít nhất 1 khóa.");
      return;
    }
    setSending(true);
    setSendError(null);
    setSendOk(null);
    try {
      const input = {
        eventId: eventId || undefined,
        title: title.trim(),
        body: body.trim(),
        faculty,
        cohorts,
        sendMode,
      };
      const created = demo ? demoSendNotification(input) : await sendNotification(input);
      setLogs((prev) => [created, ...prev]);
      setSendOk(`Đã gửi qua FCM — condition: ${created.condition}`);
      setTitle("");
      setBody("");
      setEventId("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Gửi thất bại.");
    } finally {
      setSending(false);
    }
  };

  const doRetry = async (n: NotificationLog) => {
    try {
      const updated = demo ? demoRetryNotification(n.id) : await retryNotification(n.id);
      setLogs((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
    } catch {
      /* keep as-is */
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Thông báo</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Soạn và gửi thông báo qua FCM. Việc gửi thật do BE thực hiện qua{" "}
        <code className="font-mono">POST /api/notifications/send</code> — FE chỉ kích hoạt.
      </p>

      {demo && (
        <div className="mt-4">
          <DemoBanner />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Soạn thông báo mới
          </h2>
          <div className="space-y-4">
            {sendError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
                {sendError}
              </p>
            )}
            {sendOk && (
              <p className="break-all rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                {sendOk}
              </p>
            )}
            <Field label="Lấy nội dung từ sự kiện (không bắt buộc)">
              <select
                value={eventId}
                onChange={(e) => pickEvent(e.target.value)}
                className={inputClass}
              >
                <option value="">— Tự soạn —</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tiêu đề *">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="VD: Hội trại truyền thống Khoa CNTT"
              />
            </Field>
            <Field label="Nội dung *">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="Nội dung hiển thị trên điện thoại…"
              />
            </Field>
            <Field label="Khoa">
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                className={inputClass}
              >
                {FACULTIES.map((f) => (
                  <option key={f.slug} value={f.slug}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Khóa nhận *">
              <div className="flex flex-wrap gap-2">
                {COHORTS.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => toggleCohort(c.slug)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${cohorts.includes(c.slug) ? "bg-indigo-700 text-white" : "border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Cách gửi">
              <select
                value={sendMode}
                onChange={(e) => setSendMode(e.target.value as "condition" | "per-cohort")}
                className={inputClass}
              >
                <option value="condition">Gửi 1 lần — condition OR các khóa (Cách A)</option>
                <option value="per-cohort">Gửi lặp — mỗi khóa 1 lần (Cách B)</option>
              </select>
            </Field>
            <div className="rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-900">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Xem trước FCM condition:
              </p>
              <p className="mt-1 break-all font-mono text-slate-600 dark:text-slate-300">
                {buildFcmCondition(faculty, cohorts)}
              </p>
              <p className="mt-1 text-slate-500">
                Người nhận: {facultyLabel(faculty)} — {cohorts.map(cohortLabel).join(", ")}
              </p>
            </div>
            <Button onClick={doSend} disabled={sending} className="w-full justify-center">
              {sending ? "Đang gửi…" : "Gửi thông báo qua FCM"}
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-3">
          <Card className="mb-4 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tiêu đề, nội dung…"
                className={inputClass}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | NotificationStatus)}
                className={inputClass}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="delivered">Đã gửi</option>
                <option value="sent">Đã gửi (chờ xác nhận)</option>
                <option value="failed">Thất bại</option>
                <option value="pending">Đang chờ</option>
              </select>
            </div>
          </Card>

          <Card>
            <h2 className="border-b border-slate-200 px-4 py-3 text-base font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
              Lịch sử gửi
            </h2>
            {loading ? (
              <p className="p-6 text-sm text-slate-500">Đang tải dữ liệu…</p>
            ) : filtered.length === 0 ? (
              <EmptyState
                title="Chưa có thông báo nào."
                hint="Soạn và gửi thông báo đầu tiên ở khung bên trái."
              />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((n) => (
                  <li key={n.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white">{n.title}</p>
                        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                          {n.body}
                        </p>
                        <p className="mt-1 break-all font-mono text-xs text-slate-500">
                          {n.condition}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {n.targetDescription} · {new Date(n.sentAt).toLocaleString("vi-VN")} ·
                          Thành công {n.successCount ?? 0}, lỗi {n.failureCount ?? 0}
                          {n.error ? ` · Lỗi: ${n.error}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge tone={STATUS_TONE[n.status]}>{STATUS_LABEL[n.status]}</Badge>
                        {n.status === "failed" && (
                          <Button variant="secondary" onClick={() => doRetry(n)}>
                            Gửi lại
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { demoStore, fetchClients, fetchEvents, fetchNotifications, fetchTopics } from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { Badge, Card, DemoBanner, ErrorBox, LiveBadge, StatCard } from "@/components/ui";
import { cohortLabel, facultyLabel } from "@/lib/faculties";
import type { Client, EventItem, NotificationLog, Topic } from "@/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [ev, cl, tp, nt] = await Promise.all([
        fetchEvents(),
        fetchClients(),
        fetchTopics(),
        fetchNotifications(),
      ]);
      setEvents(ev);
      setClients(cl);
      setTopics(tp);
      setNotifications(nt);
      setDemo(false);
      setError(null);
    } catch {
      setEvents([...demoStore.events]);
      setClients([...demoStore.clients]);
      setTopics([...demoStore.topics]);
      setNotifications([...demoStore.notifications]);
      setDemo(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { status, lastUpdate, refresh } = useRealtime({ onPoll: load, demo });

  const sent = notifications.filter((n) => n.status === "sent" || n.status === "delivered");
  const totalSuccess = notifications.reduce((s, n) => s + (n.successCount ?? 0), 0);
  const totalFail = notifications.reduce((s, n) => s + (n.failureCount ?? 0), 0);
  const deliveryRate =
    totalSuccess + totalFail > 0
      ? Math.round((totalSuccess / (totalSuccess + totalFail)) * 100)
      : 100;
  const activeClients = clients.filter((c) => c.enabled).length;
  const newEvents = events.filter((e) => e.status === "new").length;

  // Simple 7-day bar chart: events scraped per day (solid bars, no chart lib).
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    days.push({
      label: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      count: events.filter((e) => new Date(e.scrapedAt).toDateString() === key).length,
    });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tổng quan</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sự kiện cào từ web Đoàn trường, client đăng ký và thông báo FCM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge status={status} />
          <button
            onClick={refresh}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            ↻ Làm mới
          </button>
        </div>
      </div>

      {demo && <DemoBanner />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {lastUpdate && !demo && (
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Cập nhật lần cuối: {lastUpdate.toLocaleTimeString("vi-VN")} — dữ liệu mới tự xuất hiện,
          không cần tải lại trang.
        </p>
      )}
      {loading && <p className="mb-4 text-sm text-slate-500">Đang tải dữ liệu…</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng sự kiện"
          value={events.length}
          sub={`${newEvents} sự kiện mới chưa xử lý`}
          tone="indigo"
        />
        <StatCard
          label="Người dùng"
          value={clients.length}
          sub={`${activeClients} đang bật nhận thông báo`}
          tone="indigo"
        />
        <StatCard
          label="Client đang hoạt động"
          value={`${activeClients}/${clients.length}`}
          sub={`${topics.length} topic FCM (15 khoa + 5 khóa)`}
          tone="green"
        />
        <StatCard
          label="Thông báo đã gửi"
          value={sent.length}
          sub={`${totalSuccess} gửi thành công, ${totalFail} lỗi`}
          tone="amber"
        />
        <StatCard
          label="Tỉ lệ gửi thành công"
          value={`${deliveryRate}%`}
          sub="Tính trên tổng số lượt gửi FCM"
          tone={deliveryRate >= 95 ? "green" : "red"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
            Sự kiện cào về — 7 ngày qua
          </h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Số sự kiện mới theo ngày cào.
          </p>
          <div className="flex items-end gap-2" style={{ height: 140 }}>
            {days.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {d.count}
                </span>
                <div
                  className="w-full rounded-t bg-indigo-700"
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 90)}px` }}
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Sự kiện mới nhất
            </h2>
            <Link
              href="/events"
              className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-400"
            >
              Xem tất cả →
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Chưa có sự kiện nào.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {events.slice(0, 5).map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {e.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {facultyLabel(e.faculty)} — {e.cohorts.map(cohortLabel).join(", ")} ·{" "}
                        {formatTime(e.scrapedAt)}
                      </p>
                    </div>
                    <Badge
                      tone={
                        e.status === "new" ? "amber" : e.status === "notified" ? "green" : "slate"
                      }
                    >
                      {e.status === "new" ? "Mới" : e.status === "notified" ? "Đã gửi" : "Bỏ qua"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

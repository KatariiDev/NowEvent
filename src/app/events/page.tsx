"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createEvent,
  deleteEvent,
  demoCreateEvent,
  demoDeleteEvent,
  demoStore,
  demoUpdateEvent,
  fetchEvents,
  markEvent,
  updateEvent,
} from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DemoBanner,
  EmptyState,
  Field,
  LiveBadge,
  Modal,
  inputClass,
} from "@/components/ui";
import { COHORTS, FACULTIES, buildFcmCondition, cohortLabel, facultyLabel } from "@/lib/faculties";
import type { EventItem, EventStatus } from "@/types";

const STATUS_LABEL: Record<EventStatus, string> = {
  new: "Mới",
  notified: "Đã gửi",
  ignored: "Bỏ qua",
};
const STATUS_TONE: Record<EventStatus, "amber" | "green" | "slate"> = {
  new: "amber",
  notified: "green",
  ignored: "slate",
};

interface EventFormValues {
  title: string;
  content: string;
  sourceUrl: string;
  faculty: string;
  cohorts: string[];
  type: string;
}

const EMPTY_FORM: EventFormValues = {
  title: "",
  content: "",
  sourceUrl: "",
  faculty: "cntt",
  cohorts: ["k21"],
  type: "Hoạt động",
};

function toForm(e: EventItem): EventFormValues {
  return {
    title: e.title,
    content: e.content,
    sourceUrl: e.sourceUrl,
    faculty: e.faculty,
    cohorts: e.cohorts,
    type: e.type,
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const [form, setForm] = useState<EventFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await fetchEvents());
      setDemo(false);
    } catch {
      setEvents([...demoStore.events]);
      setDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { status, refresh } = useRealtime({
    demo,
    onPoll: load,
    onEvent: (payload) => {
      // SSE payload: { type: "event.created" | "event.updated", event: EventItem }
      if (payload && typeof payload === "object") {
        const p = payload as { type?: string; event?: EventItem };
        if (p.event) {
          setEvents((prev) => {
            const exists = prev.some((e) => e.id === p.event!.id);
            return exists
              ? prev.map((e) => (e.id === p.event!.id ? p.event! : e))
              : [p.event!, ...prev];
          });
          return;
        }
      }
      load();
    },
  });

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (search && !`${e.title} ${e.content}`.toLowerCase().includes(search.toLowerCase()))
          return false;
        if (facultyFilter !== "all" && e.faculty !== facultyFilter) return false;
        if (cohortFilter !== "all" && !e.cohorts.includes(cohortFilter)) return false;
        if (statusFilter !== "all" && e.status !== statusFilter) return false;
        return true;
      }),
    [events, search, facultyFilter, cohortFilter, statusFilter],
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreating(true);
  };

  const openEdit = (e: EventItem) => {
    setEditing(e);
    setForm(toForm(e));
  };

  const save = async () => {
    if (!form.title.trim()) {
      setFormError("Tiêu đề không được để trống.");
      return;
    }
    if (form.cohorts.length === 0) {
      setFormError("Chọn ít nhất 1 khóa.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = demo
          ? demoUpdateEvent(editing.id, { ...form, status: editing.status })
          : await updateEvent(editing.id, form);
        setEvents((prev) => prev.map((e) => (e.id === editing.id ? updated : e)));
        setEditing(null);
      } else {
        const created = demo
          ? demoCreateEvent({ ...form, status: "new", notifiedAt: null })
          : await createEvent({ ...form, status: "new", notifiedAt: null });
        setEvents((prev) => [created, ...prev]);
        setCreating(false);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    try {
      if (demo) demoDeleteEvent(deleting.id);
      else await deleteEvent(deleting.id);
      setEvents((prev) => prev.filter((e) => e.id !== deleting.id));
      setSelected(null);
    } finally {
      setDeleting(null);
    }
  };

  const doMark = async (e: EventItem, next: "notified" | "ignored") => {
    try {
      const updated = demo
        ? demoUpdateEvent(e.id, {
            status: next,
            notifiedAt: next === "notified" ? new Date().toISOString() : e.notifiedAt,
          })
        : await markEvent(e.id, next);
      setEvents((prev) => prev.map((x) => (x.id === e.id ? updated : x)));
      setSelected((s) => (s?.id === e.id ? updated : s));
    } catch {
      /* keep list as-is; user can retry */
    }
  };

  const toggleCohort = (slug: string) => {
    setForm((f) => ({
      ...f,
      cohorts: f.cohorts.includes(slug)
        ? f.cohorts.filter((c) => c !== slug)
        : [...f.cohorts, slug],
    }));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sự kiện cào</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sự kiện BE cào từ web Đoàn trường. Bấm vào 1 dòng để xem chi tiết.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge status={status} />
          <button
            onClick={refresh}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            ↻ Làm mới
          </button>
          <Button onClick={openCreate}>+ Thêm sự kiện</Button>
        </div>
      </div>

      {demo && <DemoBanner />}

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung…"
            className={inputClass}
          />
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className={inputClass}
          >
            <option value="all">Tất cả khoa</option>
            {FACULTIES.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className={inputClass}
          >
            <option value="all">Tất cả khóa</option>
            {COHORTS.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | EventStatus)}
            className={inputClass}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="new">Mới</option>
            <option value="notified">Đã gửi</option>
            <option value="ignored">Bỏ qua</option>
          </select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Đang tải dữ liệu…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Không có sự kiện nào khớp bộ lọc."
            hint="Thử đổi từ khóa hoặc bộ lọc."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Khoa</th>
                  <th className="px-4 py-3">Khóa</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Cào lúc</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                  >
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {e.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">{e.type}</p>
                    </td>
                    <td className="px-4 py-3">{facultyLabel(e.faculty)}</td>
                    <td className="px-4 py-3">{e.cohorts.map(cohortLabel).join(", ")}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(e.scrapedAt).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" onClick={() => openEdit(e)}>
                          Sửa
                        </Button>
                        <Button variant="ghost" onClick={() => setDeleting(e)}>
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-slate-900/40"
          onClick={() => setSelected(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {selected.title}
              </h2>
              <button
                onClick={() => setSelected(null)}
                aria-label="Đóng"
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
              <Badge tone="indigo">{facultyLabel(selected.faculty)}</Badge>
              {selected.cohorts.map((c) => (
                <Badge key={c} tone="blue">
                  {cohortLabel(c)}
                </Badge>
              ))}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {selected.content}
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Loại</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{selected.type}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Nguồn</dt>
                <dd>
                  <a
                    href={selected.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-indigo-700 hover:underline dark:text-indigo-400"
                  >
                    {selected.sourceUrl}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Cào lúc</dt>
                <dd className="font-medium text-slate-900 dark:text-white">
                  {new Date(selected.scrapedAt).toLocaleString("vi-VN")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">FCM condition (BE sẽ dùng)</dt>
                <dd className="mt-1 break-all rounded-lg bg-slate-100 p-2 font-mono text-xs dark:bg-slate-900">
                  {buildFcmCondition(selected.faculty, selected.cohorts)}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => doMark(selected, "notified")}>Đánh dấu đã gửi</Button>
              <Button variant="secondary" onClick={() => doMark(selected, "ignored")}>
                Bỏ qua
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  openEdit(selected);
                  setSelected(null);
                }}
              >
                Sửa
              </Button>
              <Button variant="danger" onClick={() => setDeleting(selected)}>
                Xóa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / edit form */}
      {(creating || editing) && (
        <Modal
          title={editing ? "Sửa sự kiện" : "Thêm sự kiện"}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        >
          <div className="space-y-4">
            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
                {formError}
              </p>
            )}
            <Field label="Tiêu đề *">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                placeholder="VD: Hội trại truyền thống Khoa CNTT"
              />
            </Field>
            <Field label="Nội dung">
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className={inputClass}
              />
            </Field>
            <Field label="Link nguồn">
              <input
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                className={inputClass}
                placeholder="https://…"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Khoa">
                <select
                  value={form.faculty}
                  onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                  className={inputClass}
                >
                  {FACULTIES.map((f) => (
                    <option key={f.slug} value={f.slug}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Loại">
                <input
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Khóa nhận *">
              <div className="flex flex-wrap gap-2">
                {COHORTS.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => toggleCohort(c.slug)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${form.cohorts.includes(c.slug) ? "bg-indigo-700 text-white" : "border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>
            <p className="rounded-lg bg-slate-100 p-2 font-mono text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              Condition: {buildFcmCondition(form.faculty, form.cohorts)}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              >
                Hủy
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Đang lưu…" : "Lưu"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Xóa sự kiện?"
          message={`Sự kiện “${deleting.title}” sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.`}
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

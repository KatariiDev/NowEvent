"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createEvent,
  deleteEvent,
  demoCreateEvent,
  demoDeleteEvent,
  demoStore,
  fetchEvents,
  fetchRegistrationsByEvent,
  fetchUsers,
  type EventCreateInput,
} from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { COHORTS, FACULTIES } from "@/lib/faculties";
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
import type { EventItem, EventStatus, Registration, Student } from "@/types";

const STATUS_LABEL: Record<EventStatus, string> = {
  Open: "Đang mở",
  Closed: "Đã đóng",
};
const STATUS_TONE: Record<EventStatus, "green" | "slate"> = {
  Open: "green",
  Closed: "slate",
};

interface EventFormValues {
  title: string;
  content: string;
  major: string;
  batch: string;
  eventTimeStart: string;
  maxSlot: string;
  currentSlot: string;
  status: EventStatus;
}

const EMPTY_FORM: EventFormValues = {
  title: "",
  content: "",
  major: FACULTIES[0].label,
  batch: "21",
  eventTimeStart: "",
  maxSlot: "300",
  currentSlot: "0",
  status: "Open",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** datetime-local (YYYY-MM-DDTHH:mm) → ISO 8601 để gửi cho BE. */
function toIso(local: string): string {
  return local ? new Date(local).toISOString() : new Date().toISOString();
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [users, setUsers] = useState<Student[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [majorFilter, setMajorFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const [form, setForm] = useState<EventFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Dropdown theo topic: khoa = 15 topic faculty, khóa = 5 topic cohort.
  // Giữ lại giá trị cũ khi sửa nếu dữ liệu cũ gõ tay không nằm trong danh sách.
  const majorOptions = useMemo(() => {
    const labels = FACULTIES.map((f) => f.label);
    return form.major && !labels.includes(form.major) ? [form.major, ...labels] : labels;
  }, [form.major]);
  const batchOptions = useMemo(() => {
    const nums = COHORTS.map((c) => c.slug.slice(1));
    return form.batch && !nums.includes(form.batch) ? [form.batch, ...nums] : nums;
  }, [form.batch]);

  const load = useCallback(async () => {
    try {
      const [ev, us] = await Promise.all([fetchEvents(), fetchUsers()]);
      setEvents(ev);
      setUsers(us);
      setDemo(false);
    } catch {
      setEvents([...demoStore.events]);
      setUsers([...demoStore.users]);
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
    // BE chưa có hợp đồng SSE — mọi message SSE (nếu có) chỉ kích hoạt tải lại.
    onEvent: () => load(),
  });

  const majors = useMemo(() => Array.from(new Set(events.map((e) => e.major))).sort(), [events]);
  const batches = useMemo(
    () => Array.from(new Set(events.map((e) => e.batch))).sort((a, b) => b - a),
    [events],
  );

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (search && !`${e.title} ${e.content}`.toLowerCase().includes(search.toLowerCase()))
          return false;
        if (majorFilter !== "all" && e.major !== majorFilter) return false;
        if (batchFilter !== "all" && e.batch !== Number(batchFilter)) return false;
        if (statusFilter !== "all" && e.status !== statusFilter) return false;
        return true;
      }),
    [events, search, majorFilter, batchFilter, statusFilter],
  );

  const userName = useCallback(
    (studentId: number) =>
      users.find((u) => u.studentId === studentId)?.studentName ?? `MSSV ${studentId}`,
    [users],
  );

  const openDetail = async (e: EventItem) => {
    setSelected(e);
    setRegistrations([]);
    setRegistrationsLoading(true);
    try {
      if (demo) {
        setRegistrations(demoStore.registrations.filter((r) => r.eventId === e.id));
      } else {
        setRegistrations(await fetchRegistrationsByEvent(e.id));
      }
    } catch {
      setRegistrations([]);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreating(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setFormError("Tiêu đề không được để trống.");
      return;
    }
    if (!form.major.trim()) {
      setFormError("Ngành không được để trống.");
      return;
    }
    if (!/^\d+$/.test(form.batch.trim())) {
      setFormError("Khóa phải là số (VD: 21 = K21).");
      return;
    }
    if (!form.eventTimeStart) {
      setFormError("Chọn thời gian bắt đầu sự kiện.");
      return;
    }
    const maxSlot = Number(form.maxSlot);
    const currentSlot = Number(form.currentSlot);
    if (
      !Number.isInteger(maxSlot) ||
      maxSlot < 0 ||
      !Number.isInteger(currentSlot) ||
      currentSlot < 0
    ) {
      setFormError("Slot phải là số nguyên không âm.");
      return;
    }
    if (currentSlot > maxSlot && maxSlot > 0) {
      setFormError("Slot đã đăng ký không được vượt slot tối đa.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: EventCreateInput = {
        title: form.title.trim(),
        content: form.content,
        major: form.major.trim(),
        batch: Number(form.batch),
        eventTimeStart: toIso(form.eventTimeStart),
        maxSlot,
        currentSlot,
        status: form.status,
      };
      const created = demo ? demoCreateEvent(payload) : await createEvent(payload);
      setEvents((prev) => [created, ...prev]);
      setCreating(false);
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sự kiện</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sự kiện BE cào từ web Đoàn trường. Bấm vào 1 dòng để xem chi tiết và danh sách đăng ký.
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
            value={majorFilter}
            onChange={(e) => setMajorFilter(e.target.value)}
            className={inputClass}
          >
            <option value="all">Tất cả ngành</option>
            {majors.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className={inputClass}
          >
            <option value="all">Tất cả khóa</option>
            {batches.map((b) => (
              <option key={b} value={String(b)}>
                Khóa K{b}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | EventStatus)}
            className={inputClass}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Open">Đang mở</option>
            <option value="Closed">Đã đóng</option>
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
                  <th className="px-4 py-3">Ngành</th>
                  <th className="px-4 py-3">Khóa</th>
                  <th className="px-4 py-3">Thời gian bắt đầu</th>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => openDetail(e)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                  >
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {e.title}
                      </p>
                    </td>
                    <td className="px-4 py-3">{e.major}</td>
                    <td className="px-4 py-3">
                      <Badge tone="indigo">K{e.batch}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(e.eventTimeStart)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {e.currentSlot}/{e.maxSlot}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                      <Button variant="ghost" onClick={() => setDeleting(e)}>
                        Xóa
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Detail drawer + registrations */}
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
              <Badge tone="indigo">{selected.major}</Badge>
              <Badge tone="blue">K{selected.batch}</Badge>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {selected.content}
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Thời gian bắt đầu</dt>
                <dd className="font-medium text-slate-900 dark:text-white">
                  {formatDateTime(selected.eventTimeStart)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Slot đã đăng ký</dt>
                <dd className="font-medium text-slate-900 dark:text-white">
                  {selected.currentSlot}/{selected.maxSlot}
                </dd>
              </div>
            </dl>

            <h3 className="mt-6 text-base font-semibold text-slate-900 dark:text-white">
              Danh sách đăng ký ({registrations.length})
            </h3>
            {registrationsLoading ? (
              <p className="mt-2 text-sm text-slate-500">Đang tải danh sách đăng ký…</p>
            ) : registrations.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Chưa có sinh viên nào đăng ký.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
                {registrations.map((r) => (
                  <li key={`${r.eventId}-${r.studentId}`} className="py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {userName(r.studentId)}
                        </p>
                        <p className="text-xs text-slate-500">
                          MSSV {r.studentId} · {formatDateTime(r.registeredAt)}
                        </p>
                      </div>
                      <Badge tone={r.status === "SUCCESS" ? "green" : "red"}>
                        {r.status === "SUCCESS" ? "Thành công" : "Thất bại"}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="danger" onClick={() => setDeleting(selected)}>
                Xóa sự kiện
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              BE không có API sửa sự kiện — muốn đổi nội dung thì xóa rồi tạo lại.
            </p>
          </div>
        </div>
      )}

      {/* Create form — BE không có PUT nên chỉ có tạo mới, không có sửa. */}
      {creating && (
        <Modal title="Thêm sự kiện" onClose={() => setCreating(false)}>
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
                placeholder="VD: Chào Tân Sinh Viên K21"
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
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngành *">
                <select
                  value={form.major}
                  onChange={(e) => setForm({ ...form, major: e.target.value })}
                  className={inputClass}
                >
                  {majorOptions.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Khóa *">
                <select
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                  className={inputClass}
                >
                  {batchOptions.map((n) => (
                    <option key={n} value={n}>
                      Khóa K{n}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Thời gian bắt đầu *">
              <input
                type="datetime-local"
                value={form.eventTimeStart}
                onChange={(e) => setForm({ ...form, eventTimeStart: e.target.value })}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Slot tối đa *">
                <input
                  value={form.maxSlot}
                  onChange={(e) => setForm({ ...form, maxSlot: e.target.value })}
                  className={inputClass}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Đã đăng ký">
                <input
                  value={form.currentSlot}
                  onChange={(e) => setForm({ ...form, currentSlot: e.target.value })}
                  className={inputClass}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Trạng thái">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}
                  className={inputClass}
                >
                  <option value="Open">Đang mở</option>
                  <option value="Closed">Đã đóng</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreating(false)}>
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

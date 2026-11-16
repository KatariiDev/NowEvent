"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createClient,
  deleteClient,
  demoCreateClient,
  demoDeleteClient,
  demoStore,
  demoUpdateClient,
  fetchClients,
  updateClient,
} from "@/lib/api";
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
import { useRealtime } from "@/hooks/useRealtime";
import { COHORTS, FACULTIES, cohortLabel, facultyLabel } from "@/lib/faculties";
import type { Client } from "@/types";

interface ClientFormValues {
  fullName: string;
  classCode: string;
  faculty: string;
  major: string;
  phone: string;
  fcmToken: string;
  enabled: boolean;
}

const EMPTY_FORM: ClientFormValues = {
  fullName: "",
  classCode: "",
  faculty: "cntt",
  major: "",
  phone: "",
  fcmToken: "",
  enabled: true,
};

/** SĐT trống/null hiển thị "--" — cả bảng và chi tiết đều dùng helper này. */
function displayPhone(phone?: string | null): string {
  return phone?.trim() ? phone : "--";
}

/** FCM token chỉ hiện rút gọn trong chi tiết, không bao giờ hiện đủ. */
function shortToken(token: string): string {
  if (!token) return "--";
  return token.length > 24 ? `${token.slice(0, 18)}…${token.slice(-4)}` : token;
}

/**
 * Khóa suy ra từ mã lớp: "CNTT-K21A" → "k21", "KT-K22B" → "k22".
 * Không suy ra được thì giữ khóa cũ (khi sửa) hoặc mặc định "k21".
 */
function deriveCohort(classCode: string, fallback = "k21"): string {
  const m = classCode.match(/k(\d{2})/i);
  if (!m) return fallback;
  const slug = `k${m[1]}`;
  return COHORTS.some((c) => c.slug === slug) ? slug : fallback;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [majorFilter, setMajorFilter] = useState("all");
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [viewing, setViewing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setClients(await fetchClients());
      setDemo(false);
    } catch {
      setClients([...demoStore.clients]);
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
      // SSE payload: { type: "client.created" | "client.updated", client: Client }
      if (payload && typeof payload === "object") {
        const p = payload as { type?: string; client?: Client };
        if (p.client) {
          setClients((prev) => {
            const exists = prev.some((c) => c.id === p.client!.id);
            return exists
              ? prev.map((c) => (c.id === p.client!.id ? p.client! : c))
              : [p.client!, ...prev];
          });
          return;
        }
      }
      load();
    },
  });

  const majors = useMemo(() => Array.from(new Set(clients.map((c) => c.major))).sort(), [clients]);

  const filtered = useMemo(
    () =>
      clients.filter((c) => {
        if (
          search &&
          !`${c.fullName} ${c.classCode} ${c.phone ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        )
          return false;
        if (facultyFilter !== "all" && c.faculty !== facultyFilter) return false;
        if (majorFilter !== "all" && c.major !== majorFilter) return false;
        return true;
      }),
    [clients, search, facultyFilter, majorFilter],
  );

  const topicsFor = (faculty: string, cohort: string) => [`faculty_${faculty}`, `cohort_${cohort}`];

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreating(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      fullName: c.fullName,
      classCode: c.classCode,
      faculty: c.faculty,
      major: c.major,
      phone: c.phone ?? "",
      fcmToken: c.fcmToken,
      enabled: c.enabled,
    });
  };

  const save = async () => {
    if (!form.fullName.trim()) {
      setFormError("Họ và tên không được để trống.");
      return;
    }
    if (!form.classCode.trim()) {
      setFormError("Mã lớp không được để trống.");
      return;
    }
    if (!form.major.trim()) {
      setFormError("Ngành không được để trống.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const cohort = deriveCohort(form.classCode, editing?.cohort ?? "k21");
      const payload = {
        ...form,
        // SĐT để trống → null (hiển thị "--").
        phone: form.phone.trim() ? form.phone.trim() : null,
        cohort,
        topics: topicsFor(form.faculty, cohort),
      };
      if (editing) {
        const updated = demo
          ? demoUpdateClient(editing.id, payload)
          : await updateClient(editing.id, payload);
        setClients((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
        setEditing(null);
      } else {
        const created = demo ? demoCreateClient(payload) : await createClient(payload);
        setClients((prev) => [created, ...prev]);
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
      if (demo) demoDeleteClient(deleting.id);
      else await deleteClient(deleting.id);
      setClients((prev) => prev.filter((c) => c.id !== deleting.id));
    } finally {
      setDeleting(null);
    }
  };

  const toggleEnabled = async (c: Client) => {
    try {
      const updated = demo
        ? demoUpdateClient(c.id, { enabled: !c.enabled })
        : await updateClient(c.id, { enabled: !c.enabled });
      setClients((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    } catch {
      /* keep as-is */
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Người dùng (Client)</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Người dùng chính là Client: 1 người = 1 client đăng ký nhận thông báo FCM (2 topic: 1
            khoa + 1 khóa suy ra từ mã lớp).
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
          <Button onClick={openCreate}>+ Thêm người dùng</Button>
        </div>
      </div>

      {demo && <DemoBanner />}

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm họ tên, mã lớp, SĐT…"
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
        </div>
      </Card>

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Đang tải dữ liệu…</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="Không có người dùng nào khớp bộ lọc." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Mã lớp</th>
                  <th className="px-4 py-3">Khoa</th>
                  <th className="px-4 py-3">Ngành</th>
                  <th className="px-4 py-3">SĐT</th>
                  <th className="px-4 py-3">Trạng thái nhận TB</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewing(c)}
                        className="font-medium text-indigo-700 hover:underline dark:text-indigo-400"
                        title="Bấm để xem chi tiết"
                      >
                        {c.fullName}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">
                      {c.classCode}
                    </td>
                    <td className="px-4 py-3">{facultyLabel(c.faculty)}</td>
                    <td className="px-4 py-3">{c.major}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">
                      {displayPhone(c.phone)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleEnabled(c)}
                        title="Bấm để bật/tắt nhận thông báo"
                      >
                        <Badge tone={c.enabled ? "green" : "slate"}>
                          {c.enabled ? "Đang bật" : "Đã tắt"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" onClick={() => openEdit(c)}>
                          Sửa
                        </Button>
                        <Button variant="ghost" onClick={() => setDeleting(c)}>
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

      {(creating || editing) && (
        <Modal
          title={editing ? "Sửa người dùng" : "Thêm người dùng"}
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
            <Field label="Họ và tên *">
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className={inputClass}
                placeholder="VD: Nguyễn Văn An"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mã lớp *">
                <input
                  value={form.classCode}
                  onChange={(e) => setForm({ ...form, classCode: e.target.value })}
                  className={inputClass}
                  placeholder="VD: CNTT-K21A"
                />
              </Field>
              <Field label="Khoa *">
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
            </div>
            <Field label="Ngành *">
              <input
                value={form.major}
                onChange={(e) => setForm({ ...form, major: e.target.value })}
                className={inputClass}
                placeholder="VD: Công nghệ thông tin"
              />
            </Field>
            <Field label="Số điện thoại">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
                placeholder="VD: 0901234567"
              />
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Không bắt buộc — để trống nếu không có, hệ thống sẽ hiển thị &quot;--&quot;.
              </span>
            </Field>
            <Field label="FCM token">
              <input
                value={form.fcmToken}
                onChange={(e) => setForm({ ...form, fcmToken: e.target.value })}
                className={inputClass}
                placeholder="Để trống nếu chưa có thiết bị — cập nhật sau"
              />
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Không bắt buộc khi tạo tay. Token do thiết bị gửi lên khi đăng ký nhận thông báo.
              </span>
            </Field>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Khóa suy ra từ mã lớp:{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                {cohortLabel(deriveCohort(form.classCode, editing?.cohort ?? "k21"))}
              </strong>{" "}
              — topic sẽ đăng ký:{" "}
              <code className="font-mono">
                {topicsFor(
                  form.faculty,
                  deriveCohort(form.classCode, editing?.cohort ?? "k21"),
                ).join(", ")}
              </code>
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Bật nhận thông báo
            </label>
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

      {viewing && (
        <Modal title="Chi tiết người dùng" onClose={() => setViewing(null)}>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Họ và tên</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{viewing.fullName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Mã lớp</dt>
              <dd className="font-mono text-slate-900 dark:text-white">{viewing.classCode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Khoa</dt>
              <dd className="text-slate-900 dark:text-white">{facultyLabel(viewing.faculty)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Ngành</dt>
              <dd className="text-slate-900 dark:text-white">{viewing.major}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Số điện thoại</dt>
              <dd className="text-slate-900 dark:text-white">{displayPhone(viewing.phone)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Khóa</dt>
              <dd className="text-slate-900 dark:text-white">
                {cohortLabel(viewing.cohort)} (suy ra từ mã lớp)
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Topic đã đăng ký</dt>
              <dd className="flex flex-wrap justify-end gap-1">
                {viewing.topics.map((t) => (
                  <Badge key={t} tone="indigo">
                    {t}
                  </Badge>
                ))}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">FCM token</dt>
              <dd className="font-mono text-xs text-slate-900 dark:text-white">
                {shortToken(viewing.fcmToken)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Nhận thông báo</dt>
              <dd>
                <Badge tone={viewing.enabled ? "green" : "slate"}>
                  {viewing.enabled ? "Đang bật" : "Đã tắt"}
                </Badge>
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setViewing(null);
                openEdit(viewing);
              }}
            >
              Sửa
            </Button>
            <Button onClick={() => setViewing(null)}>Đóng</Button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Xóa người dùng?"
          message={`Người dùng “${deleting.fullName}” (${deleting.classCode}) sẽ bị xóa và không nhận thông báo nữa. Hành động này không thể hoàn tác.`}
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

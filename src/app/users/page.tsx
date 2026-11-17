"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createUser,
  deleteUser,
  demoCreateUser,
  demoDeleteUser,
  demoStore,
  demoUpdateUser,
  fetchUsers,
  updateUser,
  type StudentUpdateInput,
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
import { COHORTS, FACULTIES } from "@/lib/faculties";
import type { Gender, Student } from "@/types";

const GENDER_LABEL: Record<Gender, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

interface StudentFormValues {
  studentId: string;
  studentName: string;
  gender: Gender;
  email: string;
  zaloUid: string;
  major: string;
  batch: string;
}

const EMPTY_FORM: StudentFormValues = {
  studentId: "",
  studentName: "",
  gender: "male",
  email: "",
  zaloUid: "",
  major: FACULTIES[0].label,
  batch: "21",
};

export default function UsersPage() {
  const [users, setUsers] = useState<Student[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [majorFilter, setMajorFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [editing, setEditing] = useState<Student | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [viewing, setViewing] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentFormValues>(EMPTY_FORM);
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
      setUsers(await fetchUsers());
      setDemo(false);
    } catch {
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

  const majors = useMemo(() => Array.from(new Set(users.map((u) => u.major))).sort(), [users]);
  const batches = useMemo(
    () => Array.from(new Set(users.map((u) => u.batch))).sort((a, b) => b - a),
    [users],
  );

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (
          search &&
          !`${u.studentName} ${u.studentId} ${u.email}`.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        if (majorFilter !== "all" && u.major !== majorFilter) return false;
        if (batchFilter !== "all" && u.batch !== Number(batchFilter)) return false;
        return true;
      }),
    [users, search, majorFilter, batchFilter],
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreating(true);
  };

  const openEdit = (u: Student) => {
    setEditing(u);
    setForm({
      studentId: String(u.studentId),
      studentName: u.studentName,
      gender: u.gender,
      email: u.email,
      zaloUid: u.zaloUid,
      major: u.major,
      batch: String(u.batch),
    });
  };

  const save = async () => {
    if (creating && !/^\d+$/.test(form.studentId.trim())) {
      setFormError("MSSV phải là số (VD: 21084201).");
      return;
    }
    if (!form.studentName.trim()) {
      setFormError("Họ và tên không được để trống.");
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setFormError("Email không hợp lệ.");
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
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        // PUT của BE không có student_id và gender — 2 trường này không đổi.
        const payload: StudentUpdateInput = {
          studentName: form.studentName.trim(),
          email: form.email.trim(),
          zaloUid: form.zaloUid.trim(),
          major: form.major.trim(),
          batch: Number(form.batch),
        };
        if (demo) {
          const updated = demoUpdateUser(editing.studentId, payload);
          setUsers((prev) => prev.map((u) => (u.studentId === editing.studentId ? updated : u)));
        } else {
          // BE PUT chỉ trả {message} — tự gộp giá trị form vào dòng hiện tại.
          await updateUser(editing.studentId, payload);
          const updated: Student = { ...editing, ...payload };
          setUsers((prev) => prev.map((u) => (u.studentId === editing.studentId ? updated : u)));
        }
        setEditing(null);
      } else {
        const payload: Student = {
          studentId: Number(form.studentId),
          studentName: form.studentName.trim(),
          gender: form.gender,
          email: form.email.trim(),
          zaloUid: form.zaloUid.trim(),
          major: form.major.trim(),
          batch: Number(form.batch),
        };
        const created = demo ? demoCreateUser(payload) : await createUser(payload);
        setUsers((prev) => [created, ...prev]);
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
      if (demo) demoDeleteUser(deleting.studentId);
      else await deleteUser(deleting.studentId);
      setUsers((prev) => prev.filter((u) => u.studentId !== deleting.studentId));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sinh viên</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sinh viên đăng ký nhận thông báo — khớp đúng collection users của BE Go (khóa chính là
            MSSV).
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
          <Button onClick={openCreate}>+ Thêm sinh viên</Button>
        </div>
      </div>

      {demo && <DemoBanner />}

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm họ tên, MSSV, email…"
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
        </div>
      </Card>

      <Card>
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Đang tải dữ liệu…</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="Không có sinh viên nào khớp bộ lọc." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-4 py-3">MSSV</th>
                  <th className="px-4 py-3">Họ tên</th>
                  <th className="px-4 py-3">Giới tính</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Zalo UID</th>
                  <th className="px-4 py-3">Ngành</th>
                  <th className="px-4 py-3">Khóa</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.studentId} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">
                      {u.studentId}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewing(u)}
                        className="font-medium text-indigo-700 hover:underline dark:text-indigo-400"
                        title="Bấm để xem chi tiết"
                      >
                        {u.studentName}
                      </button>
                    </td>
                    <td className="px-4 py-3">{GENDER_LABEL[u.gender]}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.zaloUid}</td>
                    <td className="px-4 py-3">{u.major}</td>
                    <td className="px-4 py-3">
                      <Badge tone="indigo">K{u.batch}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" onClick={() => openEdit(u)}>
                          Sửa
                        </Button>
                        <Button variant="ghost" onClick={() => setDeleting(u)}>
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
          title={editing ? "Sửa sinh viên" : "Thêm sinh viên"}
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
            {editing && (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                MSSV <strong className="font-mono">{editing.studentId}</strong> và giới tính{" "}
                <strong>{GENDER_LABEL[editing.gender]}</strong> không sửa được — API PUT của BE
                không nhận 2 trường này.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="MSSV *">
                <input
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  className={inputClass}
                  placeholder="VD: 21084201"
                  inputMode="numeric"
                  disabled={!!editing}
                />
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
            <Field label="Họ và tên *">
              <input
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                className={inputClass}
                placeholder="VD: Nguyễn Đăng Dương"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Giới tính *">
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
                  className={inputClass}
                  disabled={!!editing}
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </Field>
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
            </div>
            <Field label="Email *">
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                placeholder="VD: duong@iuh.edu.vn"
                type="email"
              />
            </Field>
            <Field label="Zalo UID">
              <input
                value={form.zaloUid}
                onChange={(e) => setForm({ ...form, zaloUid: e.target.value })}
                className={inputClass}
                placeholder="VD: zalo_123456"
              />
            </Field>
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
        <Modal title="Chi tiết sinh viên" onClose={() => setViewing(null)}>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">MSSV</dt>
              <dd className="font-mono font-medium text-slate-900 dark:text-white">
                {viewing.studentId}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Họ và tên</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{viewing.studentName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Giới tính</dt>
              <dd className="text-slate-900 dark:text-white">{GENDER_LABEL[viewing.gender]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Email</dt>
              <dd className="text-slate-900 dark:text-white">{viewing.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Zalo UID</dt>
              <dd className="font-mono text-xs text-slate-900 dark:text-white">
                {viewing.zaloUid}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Ngành</dt>
              <dd className="text-slate-900 dark:text-white">{viewing.major}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Khóa</dt>
              <dd className="text-slate-900 dark:text-white">K{viewing.batch}</dd>
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
          title="Xóa sinh viên?"
          message={`Sinh viên “${deleting.studentName}” (MSSV ${deleting.studentId}) sẽ bị xóa. Hành động này không thể hoàn tác.`}
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

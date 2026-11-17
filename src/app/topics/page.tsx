"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { demoStore, demoUpdateTopic, deleteTopic, fetchTopics, updateTopic } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DemoBanner,
  EmptyState,
  Field,
  Modal,
  inputClass,
} from "@/components/ui";
import type { Topic, TopicKind } from "@/types";

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<"all" | TopicKind>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Topic | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Topic | null>(null);
  const [form, setForm] = useState({
    name: "",
    kind: "faculty" as TopicKind,
    label: "",
    description: "",
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTopics(await fetchTopics());
      setDemo(false);
    } catch {
      setTopics([...demoStore.topics]);
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
      topics.filter((t) => {
        if (kindFilter !== "all" && t.kind !== kindFilter) return false;
        if (search && !`${t.name} ${t.label}`.toLowerCase().includes(search.toLowerCase()))
          return false;
        return true;
      }),
    [topics, kindFilter, search],
  );

  const facultyTopics = filtered.filter((t) => t.kind === "faculty");
  const cohortTopics = filtered.filter((t) => t.kind === "cohort");
  const totalSubscribers = topics.reduce((s, t) => s + t.subscriberCount, 0);

  const openCreate = () => {
    setForm({ name: "", kind: "faculty", label: "", description: "", enabled: true });
    setCreating(true);
  };

  const openEdit = (t: Topic) => {
    setEditing(t);
    setForm({
      name: t.name,
      kind: t.kind,
      label: t.label,
      description: t.description ?? "",
      enabled: t.enabled,
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.label.trim()) {
      setFormError("Tên topic và nhãn hiển thị không được để trống.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = demo
          ? demoUpdateTopic(editing.id, {
              label: form.label,
              description: form.description,
              enabled: form.enabled,
            })
          : await updateTopic(editing.id, {
              label: form.label,
              description: form.description,
              enabled: form.enabled,
            });
        setTopics((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
        setEditing(null);
      } else {
        // The BE owns the canonical 20 topics; creating a topic here only
        // registers its metadata. In demo mode it is added locally.
        if (demo) {
          const item: Topic = {
            id: `tp-custom-${Date.now().toString(36)}`,
            name: form.name.trim(),
            kind: form.kind,
            label: form.label.trim(),
            description: form.description,
            subscriberCount: 0,
            enabled: form.enabled,
          };
          demoStore.topics.push(item);
          setTopics([...demoStore.topics]);
        } else {
          throw new Error(
            "BE chưa hỗ trợ tạo topic mới — 20 topic chuẩn do BE quản lý. Hãy sửa metadata của topic có sẵn.",
          );
        }
        setCreating(false);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (t: Topic) => {
    try {
      const updated = demo
        ? demoUpdateTopic(t.id, { enabled: !t.enabled })
        : await updateTopic(t.id, { enabled: !t.enabled });
      setTopics((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch {
      /* keep as-is */
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    try {
      if (demo) {
        demoStore.topics = demoStore.topics.filter((t) => t.id !== deleting.id);
      } else {
        await deleteTopic(deleting.id);
      }
      setTopics((prev) => prev.filter((t) => t.id !== deleting.id));
    } catch {
      /* keep the topic; BE rejected the delete */
    } finally {
      setDeleting(null);
    }
  };

  const renderTable = (list: Topic[], title: string) => (
    <Card className="mb-6">
      <h2 className="border-b border-slate-200 px-4 py-3 text-base font-semibold text-slate-900 dark:border-slate-700 dark:text-white">
        {title} ({list.length})
      </h2>
      {list.length === 0 ? (
        <EmptyState title="Không có topic nào khớp bộ lọc." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Nhãn</th>
                <th className="px-4 py-3">Người đăng ký</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700">
                  <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white">
                    {t.name}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{t.label}</p>
                    {t.description ? (
                      <p className="text-xs text-slate-500">{t.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {t.subscriberCount.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleEnabled(t)} title="Bấm để bật/tắt topic">
                      <Badge tone={t.enabled ? "green" : "slate"}>
                        {t.enabled ? "Đang bật" : "Đã tắt"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" onClick={() => openEdit(t)}>
                        Sửa
                      </Button>
                      <Button variant="ghost" onClick={() => setDeleting(t)}>
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
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Topic FCM</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            20 topic chuẩn: 15 khoa + 5 khóa. Tổng {totalSubscribers.toLocaleString("vi-VN")} lượt
            đăng ký. Mỗi client đăng ký 1 topic khoa + 1 topic khóa.
          </p>
        </div>
        <Button onClick={openCreate}>+ Thêm topic</Button>
      </div>

      {demo && <DemoBanner />}
      {loading && <p className="mb-4 text-sm text-slate-500">Đang tải dữ liệu…</p>}

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm topic, nhãn…"
            className={inputClass}
          />
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as "all" | TopicKind)}
            className={inputClass}
          >
            <option value="all">Tất cả loại</option>
            <option value="faculty">Khoa (faculty_*)</option>
            <option value="cohort">Khóa (cohort_*)</option>
          </select>
        </div>
      </Card>

      {renderTable(facultyTopics, "Topic khoa")}
      {renderTable(cohortTopics, "Topic khóa")}

      {(creating || editing) && (
        <Modal
          title={editing ? `Sửa topic ${editing.name}` : "Thêm topic"}
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
            <Field label="Tên topic *">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="VD: faculty_cntt"
                disabled={!!editing}
              />
            </Field>
            <Field label="Loại">
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as TopicKind })}
                className={inputClass}
                disabled={!!editing}
              >
                <option value="faculty">Khoa (faculty_*)</option>
                <option value="cohort">Khóa (cohort_*)</option>
              </select>
            </Field>
            <Field label="Nhãn hiển thị *">
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Mô tả">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Bật topic (tắt thì BE không gửi vào topic này)
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

      {deleting && (
        <ConfirmDialog
          title="Xóa topic?"
          message={`Topic “${deleting.name}” sẽ bị xóa. Sinh viên đang đăng ký topic này sẽ không nhận thông báo qua topic đó nữa.`}
          onConfirm={doDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

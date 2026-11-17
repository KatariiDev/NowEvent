import type {
  EventItem,
  EventStatus,
  Gender,
  NotificationLog,
  Registration,
  RegistrationStatus,
  SendNotificationInput,
  Student,
  Topic,
} from "@/types";
import { ApiError } from "@/types";
import { buildFcmCondition, cohortLabel, facultyLabel } from "./faculties";
import { mockEvents, mockNotifications, mockRegistrations, mockTopics, mockUsers } from "./mock";

export const DEFAULT_API_BASE_URL = "http://localhost:8080/api";
const STORAGE_KEY = "nowevent.apiBaseUrl";

/** Runtime API base URL: Settings override (localStorage) > env > default. */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return saved.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export function setApiBaseUrl(url: string): void {
  window.localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ""));
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `BE trả lỗi ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string }; message?: string };
      message = body?.error?.message ?? body?.message ?? message;
    } catch {
      /* keep default message */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Paginated list shape the BE returns (see docs/api.md). */
interface ListResponse<T> {
  data: T[];
  total?: number;
}

function unwrapList<T>(res: ListResponse<T> | T[] | null | undefined): T[] {
  // BE Go encode slice rỗng thành `null` — coi như danh sách rỗng.
  if (res == null) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  // VD: catch-all của BE trả {"status":"success",...} thay cho danh sách —
  // đó không phải dữ liệu thật, báo lỗi để trang rơi về Demo Mode thay vì vỡ.
  throw new ApiError(0, "BE trả về dữ liệu không đúng dạng danh sách");
}

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------------ */
/* Mapping snake_case (BE Go) ↔ camelCase (UI). Mọi chuyển đổi nằm ở   */
/* đây — component chỉ làm việc với dạng camelCase.                    */
/* ------------------------------------------------------------------ */

interface StudentApi {
  student_id: number | string;
  student_name: string;
  gender: Gender;
  email: string;
  zalo_uid: string;
  major: string;
  batch: number;
}

interface EventApi {
  _id?: string;
  id?: string;
  title: string;
  content: string;
  major: string;
  batch: number;
  event_time_start: string;
  current_slot: number;
  max_slot: number;
  status: EventStatus;
}

interface RegistrationApi {
  student_id: number | string;
  event_id: string;
  registered_at: string;
  status: RegistrationStatus;
}

function toStudent(raw: StudentApi): Student {
  return {
    studentId: Number(raw.student_id),
    studentName: raw.student_name,
    gender: raw.gender,
    email: raw.email,
    zaloUid: raw.zalo_uid,
    major: raw.major,
    batch: raw.batch,
  };
}

function toEvent(raw: EventApi): EventItem {
  return {
    id: raw._id ?? raw.id ?? "",
    title: raw.title,
    content: raw.content,
    major: raw.major,
    batch: raw.batch,
    eventTimeStart: raw.event_time_start,
    currentSlot: raw.current_slot,
    maxSlot: raw.max_slot,
    status: raw.status,
  };
}

function toRegistration(raw: RegistrationApi): Registration {
  return {
    studentId: Number(raw.student_id),
    eventId: raw.event_id,
    registeredAt: raw.registered_at,
    status: raw.status,
  };
}

/* ------------------------------------------------------------------ */
/* Users (sinh viên) — khớp đúng tài liệu BE Go.                       */
/* POST nhận đủ 7 trường; PUT không có student_id và gender.           */
/* ------------------------------------------------------------------ */

export async function fetchUsers(): Promise<Student[]> {
  const raw = await apiFetch<ListResponse<StudentApi> | StudentApi[]>("/users");
  return unwrapList(raw).map(toStudent);
}

export async function createUser(input: Student): Promise<Student> {
  // BE trả {message, data} — phải bóc data ra, map thẳng response sẽ ra NaN.
  const raw = await apiFetch<{ message: string; data: StudentApi } | StudentApi>("/users", {
    method: "POST",
    body: JSON.stringify({
      // BE model.User.StudentID là string — gửi số là Go decode lỗi -> 400.
      student_id: String(input.studentId),
      student_name: input.studentName,
      gender: input.gender,
      email: input.email,
      zalo_uid: input.zaloUid,
      major: input.major,
      batch: input.batch,
    }),
  });
  return toStudent("data" in raw ? raw.data : raw);
}

/** Body PUT của BE không có student_id và gender — 2 trường này không sửa được. */
export interface StudentUpdateInput {
  studentName: string;
  email: string;
  zaloUid: string;
  major: string;
  batch: number;
}

/**
 * BE PUT /users/{id} chỉ trả {message} — không có dữ liệu user.
 * Trả về void; trang tự gộp giá trị form vào dòng hiện tại.
 */
export async function updateUser(studentId: number, input: StudentUpdateInput): Promise<void> {
  await apiFetch(`/users/${studentId}`, {
    method: "PUT",
    body: JSON.stringify({
      student_name: input.studentName,
      email: input.email,
      zalo_uid: input.zaloUid,
      major: input.major,
      batch: input.batch,
    }),
  });
}

export async function deleteUser(studentId: number): Promise<void> {
  await apiFetch(`/users/${studentId}`, { method: "DELETE" });
}

/* ------------------------------------------------------------------ */
/* Events — khớp đúng tài liệu BE Go. BE không có PUT/PATCH cho event. */
/* ------------------------------------------------------------------ */

export interface EventCreateInput {
  title: string;
  content: string;
  major: string;
  batch: number;
  eventTimeStart: string;
  maxSlot: number;
  currentSlot: number;
  status: EventStatus;
}

export async function fetchEvents(): Promise<EventItem[]> {
  const raw = await apiFetch<ListResponse<EventApi> | EventApi[]>("/events");
  return unwrapList(raw).map(toEvent);
}

export async function createEvent(input: EventCreateInput): Promise<EventItem> {
  // BE trả {message, data} — phải bóc data ra, map thẳng response sẽ ra dòng trống.
  const raw = await apiFetch<{ message: string; data: EventApi } | EventApi>("/events", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      major: input.major,
      batch: input.batch,
      event_time_start: input.eventTimeStart,
      max_slot: input.maxSlot,
      current_slot: input.currentSlot,
      status: input.status,
    }),
  });
  return toEvent("data" in raw ? raw.data : raw);
}

export async function deleteEvent(id: string): Promise<void> {
  await apiFetch(`/events/${id}`, { method: "DELETE" });
}

/* ------------------------------------------------------------------ */
/* Registrations — danh sách đăng ký theo sự kiện.                     */
/* ------------------------------------------------------------------ */

export async function fetchRegistrationsByEvent(eventId: string): Promise<Registration[]> {
  const raw = await apiFetch<ListResponse<RegistrationApi> | RegistrationApi[]>(
    `/registrations/event/${eventId}`,
  );
  return unwrapList(raw).map(toRegistration);
}

/* ------------------------------------------------------------------ */
/* Topics                                                              */
/* ------------------------------------------------------------------ */

export async function fetchTopics(): Promise<Topic[]> {
  return unwrapList(await apiFetch<ListResponse<Topic> | Topic[]>("/topics"));
}

export async function updateTopic(id: string, input: Partial<Topic>): Promise<Topic> {
  return apiFetch<Topic>(`/topics/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteTopic(id: string): Promise<void> {
  await apiFetch(`/topics/${id}`, { method: "DELETE" });
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export async function fetchNotifications(): Promise<NotificationLog[]> {
  return unwrapList(
    await apiFetch<ListResponse<NotificationLog> | NotificationLog[]>("/notifications?limit=100"),
  );
}

export async function sendNotification(input: SendNotificationInput): Promise<NotificationLog> {
  return apiFetch<NotificationLog>("/notifications/send", {
    method: "POST",
    body: JSON.stringify({
      event_id: input.eventId ?? null,
      title: input.title,
      body: input.body,
      faculty: input.faculty,
      cohorts: input.cohorts,
      condition: buildFcmCondition(input.faculty, input.cohorts),
      send_mode: input.sendMode ?? "condition",
    }),
  });
}

export async function retryNotification(id: string): Promise<NotificationLog> {
  return apiFetch<NotificationLog>(`/notifications/${id}/retry`, { method: "POST" });
}

/** GET /health — used by Settings to test the connection. */
export async function testConnection(
  baseUrl?: string,
): Promise<{ ok: boolean; latencyMs: number }> {
  const base = (baseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const started = Date.now();
  // BE chưa chắc có /health — thử lần lượt các endpoint có thật.
  // Endpoint nào trả 2xx cũng chứng tỏ BE đang chạy.
  const candidates = ["/health", "/events", "/users"];
  let lastError: ApiError | null = null;
  for (const path of candidates) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return { ok: true, latencyMs: Date.now() - started };
      lastError = new ApiError(res.status, `BE trả lỗi ${res.status}`);
    } catch (err) {
      lastError = err instanceof ApiError ? err : new ApiError(0, "Không kết nối được tới BE");
      // Lỗi mạng/CORS thì các endpoint còn lại cũng lỗi tương tự — dừng sớm.
      break;
    }
  }
  throw lastError ?? new ApiError(0, "Không kết nối được tới BE");
}

/* ------------------------------------------------------------------ */
/* Demo mode — in-memory mock store (session only, never persisted).   */
/* Every page tries the real BE first and falls back here on failure.  */
/* ------------------------------------------------------------------ */

export const demoStore = {
  events: [...mockEvents],
  users: [...mockUsers],
  registrations: [...mockRegistrations],
  topics: [...mockTopics],
  notifications: [...mockNotifications],
};

/** Demo id dạng ObjectId 24 ký tự hex (giống _id MongoDB của BE). */
function demoObjectId(): string {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export function demoCreateEvent(input: EventCreateInput): EventItem {
  const item: EventItem = { ...input, id: demoObjectId() };
  demoStore.events.unshift(item);
  return item;
}

export function demoDeleteEvent(id: string): void {
  demoStore.events = demoStore.events.filter((e) => e.id !== id);
}

export function demoCreateUser(input: Student): Student {
  demoStore.users.unshift({ ...input });
  return input;
}

export function demoUpdateUser(studentId: number, input: StudentUpdateInput): Student {
  const i = demoStore.users.findIndex((u) => u.studentId === studentId);
  if (i < 0) throw new Error("Không tìm thấy sinh viên");
  const kept = demoStore.users[i];
  demoStore.users[i] = { ...kept, ...input };
  return demoStore.users[i];
}

export function demoDeleteUser(studentId: number): void {
  demoStore.users = demoStore.users.filter((u) => u.studentId !== studentId);
}

export function demoUpdateTopic(id: string, input: Partial<Topic>): Topic {
  const i = demoStore.topics.findIndex((t) => t.id === id);
  if (i < 0) throw new Error("Không tìm thấy topic");
  demoStore.topics[i] = { ...demoStore.topics[i], ...input };
  return demoStore.topics[i];
}

export function demoSendNotification(input: SendNotificationInput): NotificationLog {
  const batches = input.cohorts
    .map((c) => Number(c.replace(/^k/i, "")))
    .filter((n) => Number.isFinite(n));
  const item: NotificationLog = {
    id: uid("nt"),
    eventId: input.eventId ?? null,
    title: input.title,
    body: input.body,
    condition: buildFcmCondition(input.faculty, input.cohorts),
    targetDescription: `${facultyLabel(input.faculty)} — ${input.cohorts.map(cohortLabel).join(", ")}`,
    status: "delivered",
    sentAt: new Date().toISOString(),
    successCount: demoStore.users.filter((u) => batches.includes(u.batch)).length,
    failureCount: 0,
  };
  demoStore.notifications.unshift(item);
  return item;
}

export function demoRetryNotification(id: string): NotificationLog {
  const item = demoStore.notifications.find((n) => n.id === id);
  if (!item) throw new Error("Không tìm thấy thông báo");
  item.status = "delivered";
  item.error = undefined;
  return item;
}

/** Shared helpers for pages. */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

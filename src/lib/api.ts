import type { Client, EventItem, NotificationLog, SendNotificationInput, Topic } from "@/types";
import { ApiError } from "@/types";
import { buildFcmCondition, cohortLabel, facultyLabel } from "./faculties";
import { mockClients, mockEvents, mockNotifications, mockTopics } from "./mock";

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

function unwrapList<T>(res: ListResponse<T> | T[]): T[] {
  return Array.isArray(res) ? res : res.data;
}

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export async function fetchEvents(): Promise<EventItem[]> {
  return unwrapList(await apiFetch<ListResponse<EventItem> | EventItem[]>("/events?limit=100"));
}

export async function createEvent(
  input: Omit<EventItem, "id" | "createdAt" | "scrapedAt"> & { scrapedAt?: string },
): Promise<EventItem> {
  return apiFetch<EventItem>("/events", { method: "POST", body: JSON.stringify(input) });
}

export async function updateEvent(id: string, input: Partial<EventItem>): Promise<EventItem> {
  return apiFetch<EventItem>(`/events/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteEvent(id: string): Promise<void> {
  await apiFetch(`/events/${id}`, { method: "DELETE" });
}

export async function markEvent(id: string, status: "notified" | "ignored"): Promise<EventItem> {
  return apiFetch<EventItem>(`/events/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export async function fetchClients(): Promise<Client[]> {
  return unwrapList(await apiFetch<ListResponse<Client> | Client[]>("/clients?limit=100"));
}

export async function createClient(
  input: Omit<Client, "id" | "createdAt" | "lastActiveAt">,
): Promise<Client> {
  return apiFetch<Client>("/clients", { method: "POST", body: JSON.stringify(input) });
}

export async function updateClient(id: string, input: Partial<Client>): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteClient(id: string): Promise<void> {
  await apiFetch(`/clients/${id}`, { method: "DELETE" });
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
  const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new ApiError(res.status, `BE trả lỗi ${res.status}`);
  return { ok: true, latencyMs: Date.now() - started };
}

/* ------------------------------------------------------------------ */
/* Demo mode — in-memory mock store (session only, never persisted).   */
/* Every page tries the real BE first and falls back here on failure.  */
/* ------------------------------------------------------------------ */

export const demoStore = {
  events: [...mockEvents],
  clients: [...mockClients],
  topics: [...mockTopics],
  notifications: [...mockNotifications],
};

export function demoCreateEvent(
  input: Omit<EventItem, "id" | "createdAt" | "scrapedAt">,
): EventItem {
  const now = new Date().toISOString();
  const item: EventItem = { ...input, id: uid("ev"), createdAt: now, scrapedAt: now };
  demoStore.events.unshift(item);
  return item;
}

export function demoUpdateEvent(id: string, input: Partial<EventItem>): EventItem {
  const i = demoStore.events.findIndex((e) => e.id === id);
  if (i < 0) throw new Error("Không tìm thấy sự kiện");
  demoStore.events[i] = { ...demoStore.events[i], ...input };
  return demoStore.events[i];
}

export function demoDeleteEvent(id: string): void {
  demoStore.events = demoStore.events.filter((e) => e.id !== id);
}

export function demoCreateClient(input: Omit<Client, "id" | "createdAt" | "lastActiveAt">): Client {
  const now = new Date().toISOString();
  const item: Client = { ...input, id: uid("cl"), createdAt: now, lastActiveAt: now };
  demoStore.clients.unshift(item);
  return item;
}

export function demoUpdateClient(id: string, input: Partial<Client>): Client {
  const i = demoStore.clients.findIndex((c) => c.id === id);
  if (i < 0) throw new Error("Không tìm thấy client");
  demoStore.clients[i] = { ...demoStore.clients[i], ...input };
  return demoStore.clients[i];
}

export function demoDeleteClient(id: string): void {
  demoStore.clients = demoStore.clients.filter((c) => c.id !== id);
}

export function demoUpdateTopic(id: string, input: Partial<Topic>): Topic {
  const i = demoStore.topics.findIndex((t) => t.id === id);
  if (i < 0) throw new Error("Không tìm thấy topic");
  demoStore.topics[i] = { ...demoStore.topics[i], ...input };
  return demoStore.topics[i];
}

export function demoSendNotification(input: SendNotificationInput): NotificationLog {
  const item: NotificationLog = {
    id: uid("nt"),
    eventId: input.eventId ?? null,
    title: input.title,
    body: input.body,
    condition: buildFcmCondition(input.faculty, input.cohorts),
    targetDescription: `${facultyLabel(input.faculty)} — ${input.cohorts.map(cohortLabel).join(", ")}`,
    status: "delivered",
    sentAt: new Date().toISOString(),
    successCount: demoStore.clients.filter(
      (c) => c.enabled && c.faculty === input.faculty && input.cohorts.includes(c.cohort),
    ).length,
    failureCount: 0,
  };
  demoStore.notifications.unshift(item);
  if (input.eventId) {
    demoStore.events = demoStore.events.map((e) =>
      e.id === input.eventId ? { ...e, status: "notified", notifiedAt: item.sentAt } : e,
    );
  }
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

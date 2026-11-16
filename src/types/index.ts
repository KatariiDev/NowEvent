export type EventStatus = "new" | "notified" | "ignored";

export interface EventItem {
  id: string;
  title: string;
  content: string;
  sourceUrl: string;
  /** Faculty slug, e.g. "cntt" (see src/lib/faculties.ts). */
  faculty: string;
  /** Cohort slugs, e.g. ["k21", "k22"]. */
  cohorts: string[];
  type: string;
  status: EventStatus;
  scrapedAt: string;
  notifiedAt?: string | null;
  createdAt: string;
}

/**
 * Client = User — chỉ 1 thực thể duy nhất (anh đính chính 16/11).
 * 1 người dùng gồm 5 trường thông tin: họ tên, mã lớp, khoa, ngành, SĐT;
 * cộng các trường FCM để gửi thông báo (fcmToken, topics, enabled).
 * cohort là trường nội bộ cho topic FCM, suy ra từ mã lớp (VD "CNTT-K21A"
 * → "k21"), không hiển thị cột riêng trong bảng.
 */
export interface Client {
  id: string;
  /** Họ và tên. */
  fullName: string;
  /** Mã lớp, VD "CNTT-K21A". Khóa suy ra từ mã lớp, VD chứa K21 → k21. */
  classCode: string;
  /** Faculty slug, e.g. "cntt" (see src/lib/faculties.ts). */
  faculty: string;
  /** Ngành, free text, VD "Công nghệ thông tin". */
  major: string;
  /** Số điện thoại — optional, null khi không có. Hiển thị "--" khi trống. */
  phone?: string | null;
  /** Khóa suy ra từ mã lớp, VD "k21". Dùng để tính topic FCM. */
  cohort: string;
  /** FCM registration token (device token). Never log this value. */
  fcmToken: string;
  /** Subscribed topics, e.g. ["faculty_cntt", "cohort_k21"]. */
  topics: string[];
  enabled: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export type TopicKind = "faculty" | "cohort";

export interface Topic {
  id: string;
  /** Full FCM topic name, e.g. "faculty_cntt" / "cohort_k21". */
  name: string;
  kind: TopicKind;
  label: string;
  description?: string;
  subscriberCount: number;
  enabled: boolean;
}

export type NotificationStatus = "sent" | "delivered" | "failed" | "pending";

export interface NotificationLog {
  id: string;
  eventId?: string | null;
  title: string;
  body: string;
  /** FCM condition string actually used, e.g. 'faculty_cntt' in topics && ... */
  condition: string;
  targetDescription: string;
  status: NotificationStatus;
  sentAt: string;
  successCount?: number;
  failureCount?: number;
  error?: string;
}

export interface SendNotificationInput {
  eventId?: string;
  title: string;
  body: string;
  faculty: string;
  cohorts: string[];
  /** "condition" (one send, OR of cohorts) or "per-cohort" (one send per cohort). */
  sendMode?: "condition" | "per-cohort";
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

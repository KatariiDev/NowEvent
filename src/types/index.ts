/** Trạng thái sự kiện theo BE Go: chỉ 2 giá trị. */
export type EventStatus = "Open" | "Closed";

export interface EventItem {
  /** MongoDB _id của sự kiện (BE trả `_id`, FE map sang `id`). */
  id: string;
  title: string;
  content: string;
  /** Ngành, text tự do, VD "Công nghệ thông tin". */
  major: string;
  /** Khóa dạng số, VD 21 = K21. */
  batch: number;
  /** Giờ bắt đầu sự kiện, ISO 8601 (BE: `event_time_start`). */
  eventTimeStart: string;
  /** Số slot đã đăng ký (BE: `current_slot`). */
  currentSlot: number;
  /** Số slot tối đa (BE: `max_slot`). */
  maxSlot: number;
  status: EventStatus;
}

export type Gender = "male" | "female" | "other";

/**
 * Sinh viên — thực thể người dùng duy nhất của dashboard, khớp đúng
 * collection `users` của BE Go. Khóa chính là `studentId` (MSSV, số).
 * BE còn lưu `_id` và `Student_web_password` nhưng FE không bao giờ
 * lấy, lưu hay hiển thị mật khẩu.
 */
export interface Student {
  /** MSSV, VD 21084201. */
  studentId: number;
  studentName: string;
  gender: Gender;
  email: string;
  /** Zalo UID, VD "zalo_123456". */
  zaloUid: string;
  /** Ngành, VD "Công nghệ thông tin". */
  major: string;
  /** Khóa dạng số, VD 21 = K21. */
  batch: number;
}

export type RegistrationStatus = "SUCCESS" | "FAILED";

/** 1 lượt đăng ký của 1 sinh viên vào 1 sự kiện (collection `registrations`). */
export interface Registration {
  /** MSSV của sinh viên đăng ký. */
  studentId: number;
  /** MongoDB _id của sự kiện. */
  eventId: string;
  /** Giờ đăng ký, ISO 8601. */
  registeredAt: string;
  status: RegistrationStatus;
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

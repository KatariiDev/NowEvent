/**
 * Faculty / cohort reference data.
 *
 * IMPORTANT: the 15 faculty names below are PLACEHOLDERS. The FCM summary
 * (~/workspace/fcm-doan-truong-tom-tat-gon.md) states the real faculty list
 * was never confirmed — replace these slugs/labels with the school's real
 * list, or (preferred) let the BE own the list via GET /topics and treat
 * this file as a fallback for demo mode only.
 */
export interface Faculty {
  slug: string;
  label: string;
  topic: string;
}

export const FACULTIES: Faculty[] = [
  { slug: "cntt", label: "Công nghệ Thông tin", topic: "faculty_cntt" },
  { slug: "dientu", label: "Điện tử – Viễn thông", topic: "faculty_dientu" },
  { slug: "cokhi", label: "Cơ khí", topic: "faculty_cokhi" },
  { slug: "xaydung", label: "Xây dựng", topic: "faculty_xaydung" },
  { slug: "kientruc", label: "Kiến trúc", topic: "faculty_kientruc" },
  { slug: "dien", label: "Điện", topic: "faculty_dien" },
  { slug: "kinhte", label: "Kinh tế", topic: "faculty_kinhte" },
  { slug: "qtkd", label: "Quản trị Kinh doanh", topic: "faculty_qtkd" },
  { slug: "ketoan", label: "Kế toán", topic: "faculty_ketoan" },
  { slug: "luat", label: "Luật", topic: "faculty_luat" },
  { slug: "ngoaingu", label: "Ngoại ngữ", topic: "faculty_ngoaingu" },
  { slug: "supham", label: "Sư phạm", topic: "faculty_supham" },
  { slug: "y", label: "Y", topic: "faculty_y" },
  { slug: "moitruong", label: "Môi trường", topic: "faculty_moitruong" },
  { slug: "nongnghiep", label: "Nông nghiệp", topic: "faculty_nongnghiep" },
];

export interface Cohort {
  slug: string;
  label: string;
  topic: string;
}

export const COHORTS: Cohort[] = [
  { slug: "k18", label: "Khóa K18", topic: "cohort_k18" },
  { slug: "k19", label: "Khóa K19", topic: "cohort_k19" },
  { slug: "k20", label: "Khóa K20", topic: "cohort_k20" },
  { slug: "k21", label: "Khóa K21", topic: "cohort_k21" },
  { slug: "k22", label: "Khóa K22", topic: "cohort_k22" },
];

export const ALL_TOPICS: string[] = [
  ...FACULTIES.map((f) => f.topic),
  ...COHORTS.map((c) => c.topic),
];

export function facultyLabel(slug: string): string {
  return FACULTIES.find((f) => f.slug === slug)?.label ?? slug;
}

export function cohortLabel(slug: string): string {
  return COHORTS.find((c) => c.slug === slug)?.label ?? slug;
}

/**
 * Build the FCM condition for one faculty + N cohorts.
 * Rule (from the FCM summary): every cohort to receive MUST appear in the
 * condition — writing cohorts only in body/data does NOT select recipients.
 * FCM allows at most 5 topics in one condition.
 */
export function buildFcmCondition(facultySlug: string, cohortSlugs: string[]): string {
  const facultyTopic = `faculty_${facultySlug}`;
  if (cohortSlugs.length === 0) return `'${facultyTopic}' in topics`;
  if (cohortSlugs.length === 1) {
    return `'${facultyTopic}' in topics && 'cohort_${cohortSlugs[0]}' in topics`;
  }
  const orPart = cohortSlugs.map((c) => `'cohort_${c}' in topics`).join(" || ");
  return `'${facultyTopic}' in topics && (${orPart})`;
}

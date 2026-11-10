/**
 * مرحلہ 27 — اطلاعات اور اعلانات
 * قسم: اطلاع / اعلان / تعطیل۔ حالت: فعال / محفوظ شدہ (حذف کبھی نہیں)۔
 */
export type NoticeKind = "notice" | "announcement" | "holiday";
export type NoticeStatus = "active" | "archived";

export const NOTICE_KINDS: NoticeKind[] = ["notice", "announcement", "holiday"];

export const NOTICE_KIND_LABELS: Record<NoticeKind, string> = {
  notice: "اطلاع",
  announcement: "اعلان",
  holiday: "تعطیل",
};

export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
  active: "فعال",
  archived: "محفوظ شدہ",
};

export interface Notice {
  id: string;
  madrasa_id: string;
  title: string;
  body: string | null;
  kind: NoticeKind;
  notice_date: string;
  status: NoticeStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

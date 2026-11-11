/**
 * مرحلہ 7 — اساتذہ کی حاضری لگانے کا فارم (کلائنٹ)
 * تاریخ اور شعبہ بدلنے سے صفحہ نئے پیرامیٹر کے ساتھ دوبارہ کھلتا ہے۔
 * صرف نشان لگائے گئے اساتذہ محفوظ ہوتے ہیں — باقی بعد میں لگائے جا سکتے ہیں۔
 */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@/lib/attendance";
import {
  DEPARTMENT_IDS,
  DEPARTMENT_LABELS,
  SECTION_IDS,
  SECTION_LABELS,
  type SectionId,
} from "@/lib/students";
import { saveTeacherAttendance } from "@/app/departments/att-teachers/actions";

export interface AttendanceTeacher {
  id: string;
  name: string;
  father_name: string;
  department: string;
  section: string;
  position: string | null;
}

export default function TeacherAttendanceForm({
  teachers,
  existing,
  date,
  department,
  section,
}: {
  teachers: AttendanceTeacher[];
  existing: Record<string, AttendanceStatus>;
  date: string;
  department: string;
  section: string;
}) {
  const router = useRouter();
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(
    existing,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, leave: 0, late: 0, unmarked: 0 };
    for (const t of teachers) {
      const m = marks[t.id];
      if (!m) c.unmarked += 1;
      else c[m] += 1;
    }
    return c;
  }, [marks, teachers]);

  function go(nextDate: string, nextDepartment: string, nextSection: string) {
    router.push(
      `/departments/att-teachers?date=${nextDate}&department=${nextDepartment}&section=${nextSection}`,
    );
  }

  function markAllPresent() {
    const all: Record<string, AttendanceStatus> = {};
    for (const t of teachers) all[t.id] = "present";
    setMarks(all);
    setSuccess("");
  }

  function clearAll() {
    setMarks({});
    setSuccess("");
  }

  async function handleSave() {
    setError("");
    setSuccess("");
    setLoading(true);
    const formData = new FormData();
    formData.set("date", date);
    for (const [teacherId, status] of Object.entries(marks)) {
      formData.set(`status_${teacherId}`, status);
    }
    const res = await saveTeacherAttendance(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    const s = res.summary;
    setSuccess(
      `حاضری محفوظ ہو گئی — حاضر: ${s.present}، غیر حاضر: ${s.absent}، رخصت: ${s.leave}، تاخیر: ${s.late}`,
    );
    router.refresh();
  }

  return (
    <div>
      <div className="att-controls">
        <label className="field">
          <span className="field-label">تاریخ</span>
          <input
            className="field-input"
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) go(e.target.value, department, section);
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">شعبہ</span>
          <select
            className="field-input"
            value={department}
            onChange={(e) => go(date, e.target.value, section)}
          >
            <option value="all">سب شعبے</option>
            {DEPARTMENT_IDS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">شعبہ (بنین / بنات)</span>
          <select
            className="field-input"
            value={section}
            onChange={(e) => go(date, department, e.target.value)}
          >
            <option value="all">سب</option>
            {SECTION_IDS.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <span className="spacer" />
        <button
          className="btn-primary"
          type="button"
          onClick={markAllPresent}
          disabled={teachers.length === 0}
        >
          سب کو حاضر کریں
        </button>
        <button
          className="btn-ghost"
          type="button"
          onClick={clearAll}
          disabled={teachers.length === 0}
        >
          سب صاف کریں
        </button>
      </div>

      <div className="att-summary">
        <span className="att-chip att-chip-present">
          حاضر: {counts.present.toLocaleString("ur-PK")}
        </span>
        <span className="att-chip att-chip-absent">
          غیر حاضر: {counts.absent.toLocaleString("ur-PK")}
        </span>
        <span className="att-chip att-chip-leave">
          رخصت: {counts.leave.toLocaleString("ur-PK")}
        </span>
        <span className="att-chip att-chip-late">
          تاخیر: {counts.late.toLocaleString("ur-PK")}
        </span>
        <span className="att-chip">باقی: {counts.unmarked.toLocaleString("ur-PK")}</span>
      </div>

      {teachers.length === 0 ? (
        <p className="empty-state">
          اس شعبے میں کوئی فعال استاد نہیں ہے۔
        </p>
      ) : (
        <div>
          {teachers.map((t) => (
            <div className="att-row" key={t.id}>
              <div className="att-name">
                <div>
                  <strong>{t.name}</strong>
                </div>
                <div className="sub">
                  {t.father_name}
                  {t.position ? ` — ${t.position}` : ""}
                  {t.section ? ` — ${SECTION_LABELS[t.section as SectionId]}` : ""}
                </div>
              </div>
              <div className="att-btns">
                {ATTENDANCE_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`att-btn${marks[t.id] === st ? ` sel-${st}` : ""}`}
                    onClick={() => {
                      setMarks((prev) => ({ ...prev, [t.id]: st }));
                      setSuccess("");
                    }}
                  >
                    {ATTENDANCE_LABELS[st]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="att-success">{success}</p> : null}

      <div className="form-actions">
        <button
          className="btn-primary"
          type="button"
          onClick={handleSave}
          disabled={loading || teachers.length === 0}
        >
          {loading ? "براہِ کرم انتظار کریں…" : "حاضری محفوظ کریں"}
        </button>
      </div>
    </div>
  );
}

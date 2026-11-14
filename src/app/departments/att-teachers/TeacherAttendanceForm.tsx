/**
 * مرحلہ 7 — اساتذہ کی حاضری لگانے کا فارم (کلائنٹ)
 * تاریخ اور شعبہ بدلنے سے صفحہ نئے پیرامیٹر کے ساتھ دوبارہ کھلتا ہے۔
 * صرف نشان لگائے گئے اساتذہ محفوظ ہوتے ہیں — باقی بعد میں لگائے جا سکتے ہیں۔
 */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@/lib/attendance";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
} from "@/lib/students";
import { t, type Lang } from "@/i18n/dictionary";
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
  allowedSections,
  lang = "ur",
}: {
  teachers: AttendanceTeacher[];
  existing: Record<string, AttendanceStatus>;
  date: string;
  department: string;
  section: string;
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  allowedSections: string[];
  lang?: Lang;
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
    for (const tr of teachers) {
      const m = marks[tr.id];
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
    for (const tr of teachers) all[tr.id] = "present";
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
    formData.set("lang", lang);
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
      t(lang, "att.saved", {
        present: s.present,
        absent: s.absent,
        leave: s.leave,
        late: s.late,
      }),
    );
    router.refresh();
  }

  return (
    <div>
      <div className="att-controls">
        <label className="field">
          <span className="field-label">{t(lang, "att.form.date")}</span>
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
          <span className="field-label">{t(lang, "col.dept")}</span>
          <select
            className="field-input"
            value={department}
            onChange={(e) => go(date, e.target.value, section)}
          >
            <option value="all">{t(lang, "att.form.all_depts")}</option>
            {DEPARTMENT_IDS.map((d) => (
              <option key={d} value={d}>
                {t(lang, `dept.${d}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">
            {t(lang, "classes.section_filter")}
          </span>
          <select
            className="field-input"
            value={section}
            onChange={(e) => go(date, department, e.target.value)}
          >
            <option value="all">{t(lang, "common.all")}</option>
            {SECTION_IDS.filter((s) => allowedSections.includes(s)).map((s) => (
              <option key={s} value={s}>
                {t(lang, `section.${s}`)}
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
          {t(lang, "att.form.mark_all")}
        </button>
        <button
          className="btn-ghost"
          type="button"
          onClick={clearAll}
          disabled={teachers.length === 0}
        >
          {t(lang, "att.form.clear_all")}
        </button>
      </div>

      <div className="att-summary">
        <span className="att-chip att-chip-present">
          {t(lang, "att.status.present")}: {counts.present.toLocaleString("ur-PK")}
        </span>
        <span className="att-chip att-chip-absent">
          {t(lang, "att.status.absent")}: {counts.absent.toLocaleString("ur-PK")}
        </span>
        <span className="att-chip att-chip-leave">
          {t(lang, "att.status.leave")}: {counts.leave.toLocaleString("ur-PK")}
        </span>
        <span className="att-chip att-chip-late">
          {t(lang, "att.status.late")}: {counts.late.toLocaleString("ur-PK")}
        </span>
        <span className="att-chip">
          {t(lang, "att.summary.remaining")}: {counts.unmarked.toLocaleString("ur-PK")}
        </span>
      </div>

      {teachers.length === 0 ? (
        <p className="empty-state">
          {t(lang, "att.empty.teachers")}
        </p>
      ) : (
        <div>
          {teachers.map((tr) => (
            <div className="att-row" key={tr.id}>
              <div className="att-name">
                <div>
                  <strong>{tr.name}</strong>
                </div>
                <div className="sub">
                  {tr.father_name}
                  {tr.position ? ` — ${tr.position}` : ""}
                  {tr.section ? ` — ${t(lang, `section.${tr.section}`)}` : ""}
                </div>
              </div>
              <div className="att-btns">
                {ATTENDANCE_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`att-btn${marks[tr.id] === st ? ` sel-${st}` : ""}`}
                    onClick={() => {
                      setMarks((prev) => ({ ...prev, [tr.id]: st }));
                      setSuccess("");
                    }}
                  >
                    {t(lang, `att.status.${st}`)}
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
          {loading ? t(lang, "common.wait") : t(lang, "att.save")}
        </button>
      </div>
    </div>
  );
}

/**
 * استاد کی پڑھائی گئی جماعتیں (کلائنٹ) — استاد کی تفصیل کا صفحہ۔
 * فہرست سب کو دکھتی ہے؛ سونپنے کا فارم اور ہٹانے کا بٹن صرف
 * منتظم/مالک کو (canAssign)۔ ہٹانے سے پہلے تصدیق لی جاتی ہے —
 * صرف جوڑ مٹتا ہے، استاد یا جماعت کا ریکارڈ نہیں۔
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  assignTeacherClass,
  removeTeacherClass,
} from "@/app/departments/teachers/actions";
import { t, type Lang } from "@/i18n/dictionary";

export interface TeacherClassRow {
  id: string;
  class_name: string;
  subject: string;
}

export interface TeacherClassOption {
  id: string;
  name: string;
}

export default function TeacherClasses({
  lang = "ur",
  teacherId,
  assignments,
  classes,
  canAssign,
}: {
  lang?: Lang;
  teacherId: string;
  assignments: TeacherClassRow[];
  classes: TeacherClassOption[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function handleAssign(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setDone(false);
    const formData = new FormData(ev.currentTarget);
    const classId = String(formData.get("class_id") ?? "").trim();
    if (!classId) {
      setError(t(lang, "teacher.classes.err.class"));
      return;
    }
    setLoading(true);
    formData.set("lang", lang);
    const result = await assignTeacherClass(teacherId, formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  async function handleRemove(assignmentId: string) {
    setError("");
    setDone(false);
    setConfirmingId(null);
    const formData = new FormData();
    formData.set("assignment_id", assignmentId);
    formData.set("lang", lang);
    const result = await removeTeacherClass(teacherId, formData);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <div>
      <h3 className="form-section-title">
        {t(lang, "teacher.classes.title")}
      </h3>
      {assignments.length === 0 ? (
        <p className="sub">{t(lang, "teacher.classes.none")}</p>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t(lang, "col.class")}</th>
                <th>{t(lang, "teacher.classes.subject")}</th>
                {canAssign ? <th>{t(lang, "col.action")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td>{a.class_name}</td>
                  <td>{a.subject === "" ? "—" : a.subject}</td>
                  {canAssign ? (
                    <td>
                      {confirmingId === a.id ? (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleRemove(a.id)}
                        >
                          {t(lang, "teacher.classes.remove_confirm")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setConfirmingId(a.id)}
                        >
                          {t(lang, "teacher.classes.remove")}
                        </button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canAssign && classes.length > 0 ? (
        <form onSubmit={handleAssign}>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">{t(lang, "col.class")}</span>
              <select className="field-input" name="class_id" required>
                <option value="">{t(lang, "class.select.choose")}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">
                {t(lang, "teacher.classes.subject")}
              </span>
              <input
                className="field-input"
                name="subject"
                type="text"
                maxLength={100}
                placeholder={t(lang, "teacher.classes.subject_ph")}
              />
            </label>
          </div>

          {error ? <p className="form-error">{error}</p> : null}
          {done ? <p className="sub">{t(lang, "teacher.classes.saved")}</p> : null}

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading
                ? t(lang, "common.wait")
                : t(lang, "teacher.classes.assign")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

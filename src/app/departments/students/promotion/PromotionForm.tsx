/**
 * ترقی کا جائزہ + تصدیق (کلائنٹ)
 * نیا سال بدلیں تو صفحہ خود بدل جاتا ہے (کوئی 'دکھائیں' بٹن نہیں)۔
 * ہر قطار پر "دوبارہ" کا نشان — ٹک لگے تو اگلی جماعت کی جگہ وہی
 * جماعت دکھتی ہے اور وہیں کا اندراج بنتا ہے۔
 */
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { promoteStudents } from "./actions";
import type {
  AcademicYear,
  PromotionPreview,
} from "@/lib/academicYears";
import { t, type Lang } from "@/i18n/dictionary";

export default function PromotionForm({
  lang,
  source,
  targets,
  targetId,
  preview,
}: {
  lang: Lang;
  source: AcademicYear;
  targets: AcademicYear[];
  targetId: string;
  preview: PromotionPreview;
}) {
  const router = useRouter();
  const [repeat, setRepeat] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  function toggleRepeat(id: string, checked: boolean) {
    setRepeat((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <>
      <div className="detail-rows">
        <div className="row">
          <span>{t(lang, "promotion.source")}</span>
          <strong>{source.label}</strong>
        </div>
        <div className="row">
          <span>{t(lang, "promotion.target")}</span>
          <select
            value={targetId}
            onChange={(e) =>
              router.push(
                `/departments/students/promotion?year=${e.target.value}`,
              )
            }
          >
            {targets.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {preview.rows.length === 0 ? (
        <p className="sub">{t(lang, "promotion.none")}</p>
      ) : (
        <form
          action={async (fd: FormData) => {
            setBusy(true);
            setMsg(null);
            const res = await promoteStudents(fd);
            setBusy(false);
            setIsError(!res.ok);
            setMsg(
              res.ok
                ? t(lang, "promotion.done", {
                    n: (res.promoted ?? 0).toLocaleString("ur-PK"),
                  })
                : (res.error ?? ""),
            );
          }}
        >
          <input type="hidden" name="target_year_id" value={targetId} />
          <input type="hidden" name="lang" value={lang} />
          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.name")}</th>
                  <th>{t(lang, "promotion.current_class")}</th>
                  <th>{t(lang, "promotion.next_class")}</th>
                  <th>{t(lang, "promotion.repeat")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.student_id}>
                    <td>
                      {row.name} ({row.father_name}) —{" "}
                      <span dir="ltr">{row.registration_number}</span>
                    </td>
                    <td>{row.current_class ?? "—"}</td>
                    <td>
                      {repeat.has(row.student_id)
                        ? (row.current_class ?? "—")
                        : (row.next_class ?? "—")}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        name={`repeat_${row.student_id}`}
                        checked={repeat.has(row.student_id)}
                        onChange={(e) =>
                          toggleRepeat(row.student_id, e.target.checked)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? t(lang, "common.wait") : t(lang, "promotion.confirm")}
            </button>
          </div>
        </form>
      )}

      {msg ? (
        isError ? (
          <p className="form-error">{msg}</p>
        ) : (
          <p className="sub">✓ {msg}</p>
        )
      ) : null}

      {preview.lastClass.length > 0 ? (
        <>
          <h3 className="form-section-title">
            {t(lang, "promotion.last_class_title")}
          </h3>
          <div className="tbl-wrap">
            <table className="tbl">
              <tbody>
                {preview.lastClass.map((row) => (
                  <tr key={row.student_id}>
                    <td>
                      {row.name} ({row.father_name}) —{" "}
                      <span dir="ltr">{row.registration_number}</span>
                    </td>
                    <td>{row.current_class ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {preview.noEnrollment.length > 0 ? (
        <>
          <h3 className="form-section-title">
            {t(lang, "promotion.no_enrollment_title")}
          </h3>
          <div className="tbl-wrap">
            <table className="tbl">
              <tbody>
                {preview.noEnrollment.map((row) => (
                  <tr key={row.student_id}>
                    <td>
                      {row.name} ({row.father_name}) —{" "}
                      <span dir="ltr">{row.registration_number}</span>
                    </td>
                    <td>{row.class_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}

/**
 * طالبہ کی نتائج کی تاریخ — تفصیل والے صفحے کا حصہ
 * ہر سال کا ہر امتحان: خلاصہ (کل، فیصد، درجہ، پوزیشن) + ہر مضمون کے نمبر۔
 * مضمون کے نمبر ہمیشہ دکھتے ہیں (کھلنے/بند ہونے والا حصہ نہیں) تاکہ
 * پرنٹ میں بھی سب کچھ چھپے — یہی اس صفحے کا مقصد ہے۔
 * پرنٹ میں صرف یہ حصہ چھپتا ہے (باقی حصے no-print ہیں)۔
 */
import PrintButton from "@/components/PrintButton";
import {
  examTypeLabelLang,
  gradeKey,
  t,
  type Lang,
} from "@/i18n/dictionary";
import type { HistoryYearGroup } from "@/lib/exams";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ur-PK");
}

export default function StudentHistory({
  lang,
  studentName,
  regNo,
  groups,
}: {
  lang: Lang;
  studentName: string;
  regNo: string;
  groups: HistoryYearGroup[];
}) {
  return (
    <>
      <h3 className="form-section-title">{t(lang, "student.history.title")}</h3>
      {groups.length === 0 ? (
        <p className="sub">{t(lang, "student.history.none")}</p>
      ) : (
        <div className="student-history">
          <div className="print-only print-sheet-head">
            <h2>
              {studentName} — {regNo}
            </h2>
            <p>{t(lang, "student.history.title")}</p>
          </div>
          <div className="no-print" style={{ marginBottom: 12 }}>
            <PrintButton lang={lang} />
          </div>
          {groups.map((group) => (
            <div key={group.yearId ?? "none"} style={{ marginBottom: 20 }}>
              <h4 className="form-section-title">
                {group.yearId
                  ? group.yearLabel
                  : t(lang, "student.history.no_year")}
              </h4>
              {group.exams.map((exam) => (
                <div
                  key={exam.examId}
                  className="page-card"
                  style={{ marginBottom: 12 }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <strong>{exam.name}</strong>
                    {" — "}
                    {examTypeLabelLang(lang, exam.examType)}
                    {" — "}
                    {formatDate(exam.examDate)}
                    {exam.className
                      ? ` — ${t(lang, "student.history.class")}: ${exam.className}`
                      : ""}
                  </div>
                  <div className="detail-rows">
                    <div className="row">
                      <span>{t(lang, "student.history.total")}</span>
                      <span>
                        {exam.totalObtained.toLocaleString("ur-PK")}
                        {" / "}
                        {exam.totalPossible.toLocaleString("ur-PK")}
                      </span>
                    </div>
                    <div className="row">
                      <span>{t(lang, "student.history.percentage")}</span>
                      <span>{exam.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="row">
                      <span>{t(lang, "student.history.grade")}</span>
                      <span>{t(lang, gradeKey(exam.grade))}</span>
                    </div>
                    <div className="row">
                      <span>{t(lang, "student.history.position")}</span>
                      <span>
                        {exam.position?.toLocaleString("ur-PK") ?? "—"}
                      </span>
                    </div>
                  </div>
                  <table
                    className="exam-print"
                    style={{ width: "100%", marginTop: 8 }}
                  >
                    <thead>
                      <tr>
                        <th>{t(lang, "student.history.subject")}</th>
                        <th>{t(lang, "student.history.marks")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exam.marks.map((m) => (
                        <tr key={m.subject}>
                          <td>{m.subject}</td>
                          <td>{m.obtained.toLocaleString("ur-PK")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

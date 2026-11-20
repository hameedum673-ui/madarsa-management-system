/**
 * عملے کی تاریخ — تفصیل والے صفحے کا حصہ
 * صرف تنخواہوں کی تاریخ — عملے کی حاضری کا کوئی ریکارڈ نہیں ہے،
 * اس لیے حاضری کا حصہ یہاں بنتا ہی نہیں۔
 * صرف مالک کے لیے (showSalaries) — مہینہ، رقم، طریقہ، تاریخ، حالت؛
 * کالعدم (voided) الگ نشان کے ساتھ۔
 */
import { formatMonthUrdu } from "@/lib/fees";
import type { SalaryHistoryRow } from "@/app/departments/teachers/[id]/TeacherHistory";
import { t, type Lang } from "@/i18n/dictionary";

function formatDate(value: string): string {
  return new Date(value + "T00:00:00").toLocaleDateString("ur-PK");
}

export default function StaffHistory({
  lang,
  salaries,
  showSalaries,
}: {
  lang: Lang;
  salaries: SalaryHistoryRow[];
  showSalaries: boolean;
}) {
  if (!showSalaries) return null;
  return (
    <>
      <h3 className="form-section-title">
        {t(lang, "teacher.history.sal_title")}
      </h3>
      {salaries.length === 0 ? (
        <p className="sub">{t(lang, "teacher.history.sal_none")}</p>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t(lang, "teacher.history.month")}</th>
                <th>{t(lang, "teacher.history.amount")}</th>
                <th>{t(lang, "fee.method_label")}</th>
                <th>{t(lang, "teacher.history.pay_date")}</th>
                <th>{t(lang, "col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map((s) => (
                <tr key={`${s.salary_month}-${s.payment_date}`}>
                  <td>{formatMonthUrdu(s.salary_month)}</td>
                  <td>
                    {t(lang, "common.money", {
                      n: s.amount.toLocaleString("ur-PK"),
                    })}
                  </td>
                  <td>{t(lang, `fee.method.${s.payment_method}`)}</td>
                  <td>{formatDate(s.payment_date)}</td>
                  <td>
                    <span
                      className={`badge${s.status === "voided" ? " badge-withdrawn" : ""}`}
                    >
                      {t(lang, `salary.status.${s.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

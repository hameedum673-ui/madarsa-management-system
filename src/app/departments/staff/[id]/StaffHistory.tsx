/**
 * عملے کی تاریخ — تفصیل والے صفحے کے حصے
 * 1) حاضری کی تاریخ: مہینے کے حساب سے گنتی + کل خلاصہ + فیصد
 *    (سب کو دکھتی ہے — استاد جیسی ہی)
 * 2) تنخواہوں کی تاریخ: صرف مالک کے لیے (showSalaries) — مہینہ، رقم،
 *    طریقہ، تاریخ، حالت؛ کالعدم (voided) الگ نشان کے ساتھ۔
 */
import { formatMonthUrdu } from "@/lib/fees";
import type { SalaryHistoryRow } from "@/app/departments/teachers/[id]/TeacherHistory";
import type { TeacherAttendanceHistory } from "@/lib/attendance";
import { t, type Lang } from "@/i18n/dictionary";

function formatDate(value: string): string {
  return new Date(value + "T00:00:00").toLocaleDateString("ur-PK");
}

export default function StaffHistory({
  lang,
  att,
  salaries,
  showSalaries,
}: {
  lang: Lang;
  att: TeacherAttendanceHistory;
  salaries: SalaryHistoryRow[];
  showSalaries: boolean;
}) {
  return (
    <>
      <h3 className="form-section-title">
        {t(lang, "teacher.history.att_title")}
      </h3>
      {att.total === 0 ? (
        <p className="sub">{t(lang, "teacher.history.att_none")}</p>
      ) : (
        <>
          <div className="detail-rows">
            <div className="row">
              <span>{t(lang, "att.report.total")}</span>
              <span>{att.total.toLocaleString("ur-PK")}</span>
            </div>
            <div className="row">
              <span>{t(lang, "att.status.present")}</span>
              <span>{att.present.toLocaleString("ur-PK")}</span>
            </div>
            <div className="row">
              <span>{t(lang, "att.status.absent")}</span>
              <span>{att.absent.toLocaleString("ur-PK")}</span>
            </div>
            <div className="row">
              <span>{t(lang, "att.status.leave")}</span>
              <span>{att.leave.toLocaleString("ur-PK")}</span>
            </div>
            <div className="row">
              <span>{t(lang, "att.status.sick")}</span>
              <span>{att.sick.toLocaleString("ur-PK")}</span>
            </div>
            <div className="row">
              <span>{t(lang, "teacher.history.percentage")}</span>
              <span>{att.percentage.toFixed(1)}%</span>
            </div>
          </div>
          <div className="tbl-wrap" style={{ marginTop: 12 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "teacher.history.month")}</th>
                  <th>{t(lang, "att.status.present")}</th>
                  <th>{t(lang, "att.status.absent")}</th>
                  <th>{t(lang, "att.status.leave")}</th>
                  <th>{t(lang, "att.status.sick")}</th>
                  <th>{t(lang, "att.report.total")}</th>
                </tr>
              </thead>
              <tbody>
                {att.months.map((m) => (
                  <tr key={m.month}>
                    <td>{formatMonthUrdu(m.month)}</td>
                    <td>{m.present.toLocaleString("ur-PK")}</td>
                    <td>{m.absent.toLocaleString("ur-PK")}</td>
                    <td>{m.leave.toLocaleString("ur-PK")}</td>
                    <td>{m.sick.toLocaleString("ur-PK")}</td>
                    <td>{m.total.toLocaleString("ur-PK")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showSalaries ? (
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
      ) : null}
    </>
  );
}

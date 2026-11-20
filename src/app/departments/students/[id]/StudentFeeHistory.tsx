/**
 * طالبہ کی فیس کی تاریخ — تفصیل والے صفحے کا حصہ
 * نیا مہینہ پہلے: رسید نمبر (کلک سے رسید کا صفحہ — پرنٹ وہاں سے)،
 * مہینہ، رقم، طریقہ، تاریخ، حالت؛ کالعدم رسید الگ نشان کے ساتھ۔
 * یہ حصہ پرنٹ میں نہیں آتا (no-print) تاکہ نتائج کی تاریخ کا پرنٹ
 * ویسا ہی رہے جیسا بتایا گیا تھا۔
 */
import Link from "next/link";
import { formatMonthUrdu } from "@/lib/fees";
import { t, type Lang } from "@/i18n/dictionary";

export interface FeeHistoryRow {
  id: string;
  receipt_number: string;
  fee_month: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
}

function formatDate(value: string): string {
  return new Date(value + "T00:00:00").toLocaleDateString("ur-PK");
}

export default function StudentFeeHistory({
  lang,
  fees,
}: {
  lang: Lang;
  fees: FeeHistoryRow[];
}) {
  return (
    <div className="no-print">
      <h3 className="form-section-title">
        {t(lang, "student.fee_history.title")}
      </h3>
      {fees.length === 0 ? (
        <p className="sub">{t(lang, "student.fee_history.none")}</p>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t(lang, "col.receipt")}</th>
                <th>{t(lang, "teacher.history.month")}</th>
                <th>{t(lang, "teacher.history.amount")}</th>
                <th>{t(lang, "fee.method_label")}</th>
                <th>{t(lang, "col.date")}</th>
                <th>{t(lang, "col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link href={`/departments/income/fees/${f.id}`}>
                      {f.receipt_number}
                    </Link>
                  </td>
                  <td>{formatMonthUrdu(f.fee_month)}</td>
                  <td>
                    {t(lang, "common.money", {
                      n: f.amount.toLocaleString("ur-PK"),
                    })}
                  </td>
                  <td>{t(lang, `fee.method.${f.payment_method}`)}</td>
                  <td>{formatDate(f.payment_date)}</td>
                  <td>
                    <span
                      className={`badge${f.status === "voided" ? " badge-withdrawn" : ""}`}
                    >
                      {t(lang, `fee.status.${f.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

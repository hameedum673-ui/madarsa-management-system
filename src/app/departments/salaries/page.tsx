/**
 * مرحلہ 50 — تنخواہوں کی فہرست (سرور صفحہ، صرف ایڈمن)
 * مہینہ چنیں — ہر فعال استاد/ملازم کی قطار: مقررہ تنخواہ، اس مہینے
 * کی ادا شدہ رقم، حالت (ادا شدہ/بقایا)۔ نیچے ادائیگیوں کی تاریخ۔
 * میز ابھی نہ بنی ہو (migration 028 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isMadrasaOwner } from "@/lib/approval";
import { PAYMENT_METHOD_LABELS } from "@/lib/fees";
import {
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
} from "@/lib/fees";
import {
  SALARY_PERSON_TYPE_LABELS,
  SALARY_STATUS_LABELS,
  type SalaryPayment,
} from "@/lib/salaries";
import { getSalaryPersons } from "@/app/departments/salaries/people";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function SalariesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = isValidMonth(params.month ?? "")
    ? (params.month as string)
    : currentMonthInKarachi();

  const supabase = await createClient();
  // حصہ 4 کی درستگی — تنخواہیں مدرسے کے مالک کے لیے ہیں (سپر ایڈمن ہونا ضروری نہیں)
  if (!(await isMadrasaOwner(supabase))) {
    redirect("/");
  }
  const mine = await getMyMadrasa(supabase);
  if (!mine) redirect("/login");

  const persons = await getSalaryPersons(supabase, mine.madrasaId);

  const { data: paymentsData, error } = await supabase
    .from("salary_payments")
    .select("*")
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const payments = (paymentsData ?? []) as SalaryPayment[];

  // اس مہینے کی فعال ادائیگیاں — فی شخص
  const paidThisMonth = new Map<string, SalaryPayment>();
  for (const p of payments) {
    if (p.salary_month === month && p.status === "active") {
      paidThisMonth.set(`${p.person_type}:${p.person_id}`, p);
    }
  }

  // جڑے ہوئے واؤچروں کے نمبر
  const expenseIds = [...new Set(payments.map((p) => p.expense_id).filter(Boolean))];
  const voucherByExpenseId = new Map<string, string>();
  if (expenseIds.length > 0) {
    const { data: expenseRows } = await supabase
      .from("expenses")
      .select("id, voucher_number")
      .in("id", expenseIds as string[]);
    for (const e of (expenseRows ?? []) as {
      id: string;
      voucher_number: string;
    }[]) {
      voucherByExpenseId.set(e.id, e.voucher_number);
    }
  }

  const personName = new Map(
    persons.map((p) => [`${p.type}:${p.id}`, p.name]),
  );

  // خلاصہ — صرف جن کی مقررہ تنخواہ طے ہے
  const totalFixed = persons.reduce(
    (sum, p) => sum + (p.monthly_salary ?? 0),
    0,
  );
  const totalPaid = [...paidThisMonth.values()].reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0,
  );
  const totalRemaining = totalFixed - totalPaid;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>تنخواہیں</h2>
          <span className="spacer" />
          <Link
            className="btn-primary"
            href={`/departments/salaries/new?month=${month}`}
          >
            + تنخواہ دیں
          </Link>
        </div>

        <p className="sub">
          تنخواہیں صرف ایڈمن دیکھ سکتا ہے — یہ رقم اساتذہ یا عملے کے
          ریکارڈ میں کہیں نہیں دکھائی جائے گی۔
        </p>

        <div className="detail-rows">
          <div className="row">
            <span>کل مقررہ تنخواہیں ({formatMonthUrdu(month)})</span>
            <span>{totalFixed.toLocaleString("ur-PK")} روپے</span>
          </div>
          <div className="row">
            <span>اس مہینے ادا شدہ</span>
            <span>{totalPaid.toLocaleString("ur-PK")} روپے</span>
          </div>
          <div className="row">
            <span>باقی</span>
            <span>{totalRemaining.toLocaleString("ur-PK")} روپے</span>
          </div>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">مہینہ</span>
            <input
              className="field-input"
              type="month"
              name="month"
              defaultValue={month}
            />
          </label>
          <button className="btn-primary" type="submit">
            دکھائیں
          </button>
        </form>
        <p className="sub">
          ’دکھائیں‘ دبانے سے پہلے مہینہ بدلیں — مہینہ بدلے بغیر دبانے
          سے فہرست ویسی ہی رہے گی۔
        </p>

        {tableMissing ? (
          <p className="empty-state">
            تنخواہوں کی میز ابھی نہیں بنی — پہلے مرحلہ 50 کی SQL چلائیں۔
          </p>
        ) : persons.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی فعال استاد یا ملازم درج نہیں ہے — پہلے اساتذہ یا
            عملے کا ریکارڈ بنائیں۔
          </p>
        ) : (
          <>
            <h3 className="form-section-title">
              {formatMonthUrdu(month)} کی تنخواہیں
            </h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>نام</th>
                    <th>قسم</th>
                    <th>مقررہ تنخواہ</th>
                    <th>ادا شدہ</th>
                    <th>حالت</th>
                    <th>عمل</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p) => {
                    const paid = paidThisMonth.get(`${p.type}:${p.id}`);
                    return (
                      <tr key={`${p.type}-${p.id}`}>
                        <td>{p.name}</td>
                        <td>{SALARY_PERSON_TYPE_LABELS[p.type]}</td>
                        <td>
                          {p.monthly_salary
                            ? `${p.monthly_salary.toLocaleString("ur-PK")} روپے`
                            : "طے نہیں"}
                        </td>
                        <td>
                          {paid
                            ? `${paid.amount.toLocaleString("ur-PK")} روپے`
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={`badge${paid ? "" : " badge-withdrawn"}`}
                          >
                            {paid
                              ? "ادا شدہ"
                              : p.monthly_salary
                                ? "بقایا"
                                : "طے نہیں"}
                          </span>
                        </td>
                        <td>
                          {paid ? (
                            <Link href={`/departments/salaries/${paid.id}`}>
                              تفصیل
                            </Link>
                          ) : (
                            <>
                              <Link
                                href={`/departments/salaries/new?person=${p.type}:${p.id}&month=${month}`}
                              >
                                تنخواہ دیں
                              </Link>{" "}
                              ·{" "}
                              <Link
                                href={`/departments/salaries/set?person=${p.type}:${p.id}`}
                              >
                                طے کریں
                              </Link>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3 className="form-section-title">ادائیگیوں کی تاریخ</h3>
            {payments.length === 0 ? (
              <p className="empty-state">ابھی کوئی تنخواہ دی نہیں گئی۔</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>واؤچر</th>
                      <th>نام</th>
                      <th>مہینہ</th>
                      <th>رقم</th>
                      <th>ادائیگی کی تاریخ</th>
                      <th>طریقہ</th>
                      <th>حالت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 20).map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/departments/salaries/${p.id}`}>
                            {p.expense_id
                              ? voucherByExpenseId.get(p.expense_id) ?? "—"
                              : "—"}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/departments/salaries/${p.id}`}>
                            {personName.get(`${p.person_type}:${p.person_id}`) ??
                              "—"}
                          </Link>
                        </td>
                        <td>{formatMonthUrdu(p.salary_month)}</td>
                        <td>{p.amount.toLocaleString("ur-PK")}</td>
                        <td>{formatDate(p.payment_date)}</td>
                        <td>
                          {
                            PAYMENT_METHOD_LABELS[
                              p.payment_method as keyof typeof PAYMENT_METHOD_LABELS
                            ]
                          }
                        </td>
                        <td>
                          <span
                            className={`badge${p.status === "voided" ? " badge-withdrawn" : ""}`}
                          >
                            {SALARY_STATUS_LABELS[p.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

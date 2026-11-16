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
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import {
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
} from "@/lib/fees";
import { type SalaryPayment } from "@/lib/salaries";
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
  const lang = await getMyLanguage();
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
          <h2>{t(lang, "salaries.title")}</h2>
          <span className="spacer" />
          <Link
            className="btn-primary"
            href={`/departments/salaries/new?month=${month}`}
          >
            {t(lang, "salaries.add")}
          </Link>
        </div>

        <p className="sub">{t(lang, "salaries.admin_note")}</p>

        <div className="detail-rows">
          <div className="row">
            <span>
              {t(lang, "salaries.total_fixed", { month: formatMonthUrdu(month) })}
            </span>
            <span>
              {t(lang, "common.money", { n: totalFixed.toLocaleString("ur-PK") })}
            </span>
          </div>
          <div className="row">
            <span>{t(lang, "salaries.paid_this_month")}</span>
            <span>
              {t(lang, "common.money", { n: totalPaid.toLocaleString("ur-PK") })}
            </span>
          </div>
          <div className="row">
            <span>{t(lang, "salaries.remaining")}</span>
            <span>
              {t(lang, "common.money", { n: totalRemaining.toLocaleString("ur-PK") })}
            </span>
          </div>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">{t(lang, "fees.month")}</span>
            <input
              className="field-input"
              type="month"
              name="month"
              defaultValue={month}
            />
          </label>
          <button className="btn-primary" type="submit">
            {t(lang, "common.show")}
          </button>
        </form>
        <p className="sub">{t(lang, "salaries.month_hint")}</p>

        {tableMissing ? (
          <p className="empty-state">
            {t(lang, "salaries.table_missing")}
          </p>
        ) : persons.length === 0 ? (
          <p className="empty-state">
            {t(lang, "salaries.empty_persons")}
          </p>
        ) : (
          <>
            <h3 className="form-section-title">
              {t(lang, "salaries.month_title", { month: formatMonthUrdu(month) })}
            </h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t(lang, "col.name")}</th>
                    <th>{t(lang, "col.type")}</th>
                    <th>{t(lang, "salaries.col_fixed")}</th>
                    <th>{t(lang, "salary.status.active")}</th>
                    <th>{t(lang, "col.status")}</th>
                    <th>{t(lang, "col.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p) => {
                    const paid = paidThisMonth.get(`${p.type}:${p.id}`);
                    return (
                      <tr key={`${p.type}-${p.id}`}>
                        <td>{p.name}</td>
                        <td>{t(lang, `salary.person.${p.type}`)}</td>
                        <td>
                          {p.monthly_salary
                            ? t(lang, "common.money", {
                                n: p.monthly_salary.toLocaleString("ur-PK"),
                              })
                            : t(lang, "salaries.not_set")}
                        </td>
                        <td>
                          {paid
                            ? t(lang, "common.money", {
                                n: paid.amount.toLocaleString("ur-PK"),
                              })
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={`badge${paid ? "" : " badge-withdrawn"}`}
                          >
                            {paid
                              ? t(lang, "salary.status.active")
                              : p.monthly_salary
                                ? t(lang, "salaries.due")
                                : t(lang, "salaries.not_set")}
                          </span>
                        </td>
                        <td>
                          {paid ? (
                            <Link href={`/departments/salaries/${paid.id}`}>
                              {t(lang, "exp.col_title")}
                            </Link>
                          ) : (
                            <>
                              <Link
                                href={`/departments/salaries/new?person=${p.type}:${p.id}&month=${month}`}
                              >
                                {t(lang, "salaries.pay_link")}
                              </Link>{" "}
                              ·{" "}
                              <Link
                                href={`/departments/salaries/set?person=${p.type}:${p.id}`}
                              >
                                {t(lang, "salaries.set_link")}
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

            <h3 className="form-section-title">
              {t(lang, "salaries.history_title")}
            </h3>
            {payments.length === 0 ? (
              <p className="empty-state">{t(lang, "salaries.no_payments")}</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "exp.col_voucher")}</th>
                      <th>{t(lang, "col.name")}</th>
                      <th>{t(lang, "fees.month")}</th>
                      <th>{t(lang, "exp.col_amount")}</th>
                      <th>{t(lang, "salaries.col_payment_date")}</th>
                      <th>{t(lang, "col.method")}</th>
                      <th>{t(lang, "col.status")}</th>
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
                          {t(lang, `fee.method.${p.payment_method}`)}
                        </td>
                        <td>
                          <span
                            className={`badge${p.status === "voided" ? " badge-withdrawn" : ""}`}
                          >
                            {t(lang, `salary.status.${p.status}`)}
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

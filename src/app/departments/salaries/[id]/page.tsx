/**
 * مرحلہ 50 — تنخواہ کی ادائیگی کی تفصیل (سرور صفحہ، صرف ایڈمن)
 * غلط ادائیگی منسوخ کرنے کا بٹن موجود ہے — ریکارڈ حذف نہیں ہوتا،
 * اور اس سے جڑا واؤچر بھی منسوخ ہوتا ہے۔
 * میز ابھی نہ بنی ہو (migration 028 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isMadrasaOwner } from "@/lib/approval";
import { PAYMENT_METHOD_LABELS, formatMonthUrdu } from "@/lib/fees";
import {
  SALARY_PERSON_TYPE_LABELS,
  SALARY_STATUS_LABELS,
  type SalaryPayment,
} from "@/lib/salaries";
import VoidButton from "@/app/departments/salaries/[id]/VoidButton";
import SaveSlipImageButton, {
  type SlipImageData,
} from "@/components/SaveSlipImageButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function SalaryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  // حصہ 4 کی درستگی — تنخواہیں مدرسے کے مالک کے لیے ہیں (سپر ایڈمن ہونا ضروری نہیں)
  if (!(await isMadrasaOwner(supabase))) {
    redirect("/");
  }

  const { data, error } = await supabase
    .from("salary_payments")
    .select("*")
    .eq("id", id)
    .single();

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/salaries" />
            <h2>تنخواہ کی ادائیگی</h2>
          </div>
          <p className="empty-state">
            تنخواہوں کی میز ابھی نہیں بنی — پہلے مرحلہ 50 کی SQL چلائیں۔
          </p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    notFound();
  }

  const record = data as SalaryPayment;
  const mine = await getMyMadrasa(supabase);
  let madrasaName = "جامعہ منیجمنٹ سسٹم";
  if (mine) {
    const { data: madrasa } = await supabase
      .from("madrasas")
      .select("name")
      .eq("id", mine.madrasaId)
      .single();
    if (madrasa?.name) madrasaName = madrasa.name as string;
  }

  // شخص کا نام ID سے دیکھیں
  let personName = "—";
  if (mine) {
    const table = record.person_type === "teacher" ? "teachers" : "staff";
    const { data: person } = await supabase
      .from(table)
      .select("name")
      .eq("id", record.person_id)
      .eq("madrasa_id", mine.madrasaId)
      .maybeSingle();
    if (person?.name) personName = person.name as string;
  }

  // جڑے ہوئے واؤچر کا نمبر
  let voucherNumber = "—";
  if (record.expense_id) {
    const { data: expense } = await supabase
      .from("expenses")
      .select("voucher_number")
      .eq("id", record.expense_id)
      .maybeSingle();
    if (expense?.voucher_number)
      voucherNumber = expense.voucher_number as string;
  }

  // مرحلہ 40 — تصویر کے لیے وہی قطاریں جو صفحے پر ہیں
  const imageRows: [string, string][] = [
    ["شخص", personName],
    ["قسم", SALARY_PERSON_TYPE_LABELS[record.person_type]],
    ["مہینہ", formatMonthUrdu(record.salary_month)],
    ["رقم", `${record.amount.toLocaleString("ur-PK")} روپے`],
    ["ادائیگی کی تاریخ", formatDate(record.payment_date)],
    ["ادائیگی کا طریقہ", PAYMENT_METHOD_LABELS[record.payment_method]],
  ];
  if (record.note) imageRows.push(["نوٹ", record.note]);
  imageRows.push(["حالت", SALARY_STATUS_LABELS[record.status]]);
  const imageData: SlipImageData = {
    madrasaName,
    title: "تنخواہ کی ادائیگی",
    numberLabel: "واؤچر نمبر",
    numberValue: voucherNumber,
    rows: imageRows,
    filename: `salary-${record.salary_month}.png`,
  };

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href="/departments/salaries" />
          <h2>تنخواہ کی ادائیگی</h2>
          <span className="page-count">{voucherNumber}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <span>شادی لارج، ضلع بدین، سندھ</span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>واؤچر نمبر</span>
            <span>
              {record.expense_id ? (
                <Link href={`/departments/expenses/${record.expense_id}`}>
                  {voucherNumber}
                </Link>
              ) : (
                voucherNumber
              )}
            </span>
          </div>
          <div className="row">
            <span>شخص</span>
            <span>{personName}</span>
          </div>
          <div className="row">
            <span>قسم</span>
            <span>{SALARY_PERSON_TYPE_LABELS[record.person_type]}</span>
          </div>
          <div className="row">
            <span>تنخواہ کا مہینہ</span>
            <span>{formatMonthUrdu(record.salary_month)}</span>
          </div>
          <div className="row">
            <span>رقم</span>
            <span>{record.amount.toLocaleString("ur-PK")} روپے</span>
          </div>
          <div className="row">
            <span>ادائیگی کی تاریخ</span>
            <span>{formatDate(record.payment_date)}</span>
          </div>
          <div className="row">
            <span>ادائیگی کا طریقہ</span>
            <span>{PAYMENT_METHOD_LABELS[record.payment_method]}</span>
          </div>
          {record.note ? (
            <div className="row">
              <span>نوٹ</span>
              <span>{record.note}</span>
            </div>
          ) : null}
          <div className="row">
            <span>حالت</span>
            <span>{SALARY_STATUS_LABELS[record.status]}</span>
          </div>
        </div>

        <div className="form-actions no-print">
          <SaveSlipImageButton data={imageData} />
          {record.status === "active" ? <VoidButton id={record.id} /> : null}
        </div>
      </div>
    </div>
  );
}

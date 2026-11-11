/**
 * مرحلہ 30 — بیک اپ (سرور صفحہ)
 * ہر میز کی تعداد دکھاتا ہے + "بیک اپ ڈاؤن لوڈ کریں" کا بٹن۔
 * مرحلہ 42 — بیک اپ واپس لانے کا حصہ (RestoreBackupForm) بھی یہیں ہے۔
 */
import BackButton from "@/components/BackButton";
import RestoreBackupForm from "@/app/departments/backup/RestoreBackupForm";
import { createClient } from "@/lib/supabase/server";

const TABLE_LABELS: { table: string; label: string }[] = [
  { table: "students", label: "طلبہ" },
  { table: "teachers", label: "اساتذہ" },
  { table: "staff", label: "عملہ" },
  { table: "classes", label: "درجات اور جماعتیں" },
  { table: "student_attendance", label: "طلبہ کی حاضری" },
  { table: "teacher_attendance", label: "اساتذہ کی حاضری" },
  { table: "fee_payments", label: "فیس کی رسیدیں" },
  { table: "fee_schedule", label: "طے شدہ فیس" },
  { table: "expenses", label: "اخراجات" },
  { table: "donations", label: "عطیات" },
  { table: "zakat_records", label: "زکوٰۃ کا ریکارڈ" },
  { table: "ushr_records", label: "عشر کا ریکارڈ" },
  { table: "welfare_records", label: "وظائف اور مالی معاونت" },
  { table: "student_expenses", label: "طلبہ کے اخراجات" },
  { table: "exams", label: "امتحانات" },
  { table: "exam_results", label: "امتحان کے نتائج" },
  { table: "hifz_progress", label: "حفظ کی پیش رفت" },
  { table: "month_closings", label: "مہینے کی بندش" },
  { table: "admissions", label: "داخلے" },
  { table: "notices", label: "اطلاعات اور اعلانات" },
  { table: "documents", label: "دستاویزات" },
  { table: "document_files", label: "دستاویز کی فائلیں" },
  { table: "audit_log", label: "آڈٹ لاگ" },
];

export default async function BackupPage() {
  const supabase = await createClient();

  const counts: { label: string; count: number | null }[] = [];
  for (const { table, label } of TABLE_LABELS) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    counts.push({
      label,
      count: error ? null : (count ?? 0),
    });
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>بیک اپ</h2>
        </div>

        <p className="sub">
          نیچے والا بٹن دبانے سے آپ کے اپنے مدرسے کا سارا ڈیٹا ایک فائل
          (JSON) کے طور پر ڈاؤن لوڈ ہوگا — فعال اور منسوخ ریکارڈ سمیت۔
          صرف اپنا ڈیٹا آئے گا، دوسرے صارف کا ڈیٹا کبھی نہیں۔ فائل کو
          محفوظ جگہ رکھیں۔ Supabase خود بھی روزانہ بیک اپ بناتا ہے — یہ
          ڈاؤن لوڈ آپ کی اپنی اضافی کاپی ہے۔
        </p>

        <div className="form-actions">
          <a className="btn-primary" href="/api/backup">
            بیک اپ ڈاؤن لوڈ کریں
          </a>
        </div>

        <h3 className="form-section-title">آپ کے ڈیٹا کی تعداد</h3>
        <div className="detail-rows">
          {counts.map((c) => (
            <div className="row" key={c.label}>
              <span>{c.label}</span>
              <strong>{c.count === null ? "میز نہیں بنی" : c.count}</strong>
            </div>
          ))}
        </div>

        <h3 className="form-section-title">بیک اپ واپس لائیں</h3>
        <RestoreBackupForm />
      </div>
    </div>
  );
}

/**
 * مرحلہ 15 — ایک طالبہ کا مکمل تعلیمی ریکارڈ (سرور صفحہ، صرف دیکھنے کے لیے)
 * کوئی نئی میز نہیں — ریکارڈ پہلے سے موجود میزوں سے بنتا ہے:
 * طلبہ (ذاتی تفصیل)، حاضری (خلاصہ)، امتحانات اور نتائج (کارکردگی)، داخلے۔
 * جس چیز کا ریکارڈ ابھی نہیں ہے وہاں "ابھی درج نہیں ہے" لکھا ہوتا ہے۔
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کا ریکارڈ کھل سکتا ہے۔
 * مرحلہ 38 — حفظ شعبے کی طالبات کے لیے "حفظ کی پیش رفت" کا حصہ بھی ہے
 * (سبق / سبقی / منزل)۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  DEPARTMENT_LABELS,
  STUDENT_STATUS_LABELS,
  type Student,
} from "@/lib/students";
import {
  ATTENDANCE_LABELS,
  type AttendanceRecord,
  type AttendanceStatus,
} from "@/lib/attendance";
import {
  summarizeExamResults,
  type Exam,
  type ExamResult,
  examTypeLabel,
} from "@/lib/exams";
import {
  HIFZ_KIND_LABELS,
  HIFZ_PROGRESS_STATUS_LABELS,
  HIFZ_QUALITY_LABELS,
  type HifzProgress,
} from "@/lib/hifz";
import HifzProgressForm, {
  type HifzTeacher,
} from "@/app/departments/academic/HifzProgressForm";
import VoidHifzButton from "@/app/departments/academic/VoidHifzButton";
import {
  examResultMessage,
  getMadrasaNameForMessage,
  messagePhone,
  whatsappLink,
} from "@/lib/whatsapp";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function AcademicRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();
  if (studentError || !studentData) {
    notFound();
  }
  const student = studentData as Student;
  // مرحلہ 54 — بند شعبے کا ریکارڈ نہیں کھلے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(student.section)) notFound();

  // حاضری — اس طالبہ کے تمام دن
  const { data: attData } = await supabase
    .from("student_attendance")
    .select("status")
    .eq("student_id", id);
  const attendance = (attData ?? []) as Pick<AttendanceRecord, "status">[];
  const attCount: Record<AttendanceStatus, number> = {
    present: 0,
    absent: 0,
    leave: 0,
    late: 0,
  };
  for (const a of attendance) {
    attCount[a.status] = (attCount[a.status] ?? 0) + 1;
  }
  const attTotal = attendance.length;
  const attPercentage =
    attTotal > 0
      ? ((attCount.present + attCount.late) / attTotal) * 100
      : null;

  // امتحانات — مدرسے کے تمام امتحان + اس طالبہ کے نمبر + پوزیشن کے لیے
  // اس امتحان میں شریک تمام طلبہ کے نمبر
  const { data: examsData } = await supabase
    .from("exams")
    .select("id, name, exam_date, department, class_name, subjects, exam_type")
    .order("exam_date", { ascending: false });
  const exams = (examsData ?? []) as Exam[];
  const { data: allStudentsData } = await supabase
    .from("students")
    .select("id");
  const allStudentIds = ((allStudentsData ?? []) as { id: string }[]).map(
    (s) => s.id,
  );
  const { data: resultsData } = await supabase
    .from("exam_results")
    .select("exam_id, student_id, marks_obtained");
  const allResults = (resultsData ?? []) as ExamResult[];

  const examRows = exams
    .map((exam) => {
      const examResults = allResults.filter((r) => r.exam_id === exam.id);
      const summaries = summarizeExamResults(
        allStudentIds,
        examResults,
        exam.subjects.length * 100,
      );
      const mine = summaries.get(student.id);
      return { exam, mine };
    })
    .filter((row) => row.mine);

  const madrasaName = await getMadrasaNameForMessage(supabase);

  // داخلہ — اگر یہ طالبہ داخلے سے آئی ہو
  const { data: admissionData } = await supabase
    .from("admissions")
    .select("admission_date, previous_madrasa, status")
    .eq("student_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const admission = admissionData as {
    admission_date: string;
    previous_madrasa: string | null;
    status: string;
  } | null;

  // مرحلہ 38 — حفظ کی پیش رفت (صرف حفظ شعبے کی طالبات کے لیے)
  let hifzRows: HifzProgress[] = [];
  let hifzTableMissing = false;
  let hifzTeachers: HifzTeacher[] = [];
  if (student.department === "hifz") {
    const { data: hifzData, error: hifzError } = await supabase
      .from("hifz_progress")
      .select("*, teachers(name, father_name)")
      .eq("student_id", id)
      .order("progress_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    hifzTableMissing =
      (hifzError as { code?: string } | null)?.code === "42P01";
    hifzRows = (hifzData ?? []) as HifzProgress[];
    const { data: teachersData } = await supabase
      .from("teachers")
      .select("id, name, father_name, position")
      .eq("status", "active")
      .order("name", { ascending: true });
    hifzTeachers = (teachersData ?? []) as HifzTeacher[];
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/academic" />
          <h2>{student.name}</h2>
          <span
            className={`badge${student.status === "withdrawn" ? " badge-withdrawn" : ""}`}
          >
            {STUDENT_STATUS_LABELS[student.status]}
          </span>
        </div>

        <h3 className="form-section-title">ذاتی تفصیل</h3>
        <div className="detail-rows">
          <div className="row">
            <span>رجسٹریشن نمبر</span>
            <span>{student.registration_number}</span>
          </div>
          <div className="row">
            <span>والد کا نام</span>
            <span>{student.father_name}</span>
          </div>
          <div className="row">
            <span>شعبہ</span>
            <span>{DEPARTMENT_LABELS[student.department]}</span>
          </div>
          <div className="row">
            <span>جماعت</span>
            <span>{student.class_name || "—"}</span>
          </div>
          <div className="row">
            <span>داخلے کی تاریخ</span>
            <span>{formatDate(student.admission_date)}</span>
          </div>
          <div className="row">
            <span>سرپرست</span>
            <span>{student.guardian_name || "—"}</span>
          </div>
        </div>

        <h3 className="form-section-title">حاضری کا خلاصہ</h3>
        {attTotal === 0 ? (
          <p className="empty-state">ابھی کوئی حاضری درج نہیں ہے۔</p>
        ) : (
          <div className="detail-rows">
            <div className="row">
              <span>کل دن</span>
              <span>{attTotal.toLocaleString("ur-PK")}</span>
            </div>
            <div className="row">
              <span>{ATTENDANCE_LABELS.present}</span>
              <span>{attCount.present.toLocaleString("ur-PK")}</span>
            </div>
            <div className="row">
              <span>{ATTENDANCE_LABELS.late}</span>
              <span>{attCount.late.toLocaleString("ur-PK")}</span>
            </div>
            <div className="row">
              <span>{ATTENDANCE_LABELS.absent}</span>
              <span>{attCount.absent.toLocaleString("ur-PK")}</span>
            </div>
            <div className="row">
              <span>{ATTENDANCE_LABELS.leave}</span>
              <span>{attCount.leave.toLocaleString("ur-PK")}</span>
            </div>
            <div className="row">
              <span>حاضری کا فیصد (حاضر + تاخیر)</span>
              <span>
                {attPercentage === null
                  ? "—"
                  : `${attPercentage.toLocaleString("ur-PK", { maximumFractionDigits: 1 })}٪`}
              </span>
            </div>
          </div>
        )}

        <h3 className="form-section-title">امتحانات</h3>
        {examRows.length === 0 ? (
          <p className="empty-state">ابھی کوئی امتحان نہیں دیا۔</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>امتحان</th>
                  <th>تاریخ</th>
                  <th>کل نمبر</th>
                  <th>فیصد</th>
                  <th>درجہ</th>
                  <th>پوزیشن</th>
                  <th>پیغام</th>
                  <th>نتیجہ</th>
                </tr>
              </thead>
              <tbody>
                {examRows.map(({ exam, mine }) => {
                  // مرحلہ 44 — امتحان کے نتیجے کا WhatsApp پیغام
                  const resultLink = mine
                    ? whatsappLink(
                        messagePhone(
                          student.guardian_phone,
                          student.whatsapp_number,
                        ),
                        examResultMessage({
                          madrasaName,
                          studentName: student.name,
                          examName: exam.name,
                          obtained: mine.totalObtained,
                          possible: mine.totalPossible,
                          percentage: mine.percentage,
                          grade: mine.grade,
                        }),
                      )
                    : null;
                  return (
                    <tr key={exam.id}>
                      <td>
                        <Link href={`/departments/exams/${exam.id}`}>
                          {exam.name}
                        </Link>
                        {exam.exam_type
                          ? ` (${examTypeLabel(exam.exam_type)})`
                          : ""}
                      </td>
                      <td>{formatDate(exam.exam_date)}</td>
                      <td>
                        {mine
                          ? `${mine.totalObtained.toLocaleString("ur-PK")} / ${mine.totalPossible.toLocaleString("ur-PK")}`
                          : "—"}
                      </td>
                      <td>
                        {mine
                          ? `${mine.percentage.toLocaleString("ur-PK", { maximumFractionDigits: 1 })}٪`
                          : "—"}
                      </td>
                      <td>{mine ? mine.grade : "—"}</td>
                      <td>
                        {mine && mine.position !== null
                          ? mine.position.toLocaleString("ur-PK")
                          : "—"}
                      </td>
                      <td>
                        {mine ? (
                          resultLink ? (
                            <a
                              className="btn-ghost"
                              href={resultLink}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp پر بھیجیں
                            </a>
                          ) : (
                            "فون نمبر درج نہیں ہے"
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {mine ? (
                          <Link
                            href={`/departments/exams/${exam.id}/result/${id}`}
                          >
                            دیکھیں
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {student.department === "hifz" ? (
          <>
            <h3 className="form-section-title">حفظ کی پیش رفت</h3>
            {hifzTableMissing ? (
              <p className="empty-state">
                حفظ کی پیش رفت کی میز ابھی نہیں بنی — پہلے مرحلہ 38 کی SQL چلائیں۔
              </p>
            ) : (
              <>
                <HifzProgressForm studentId={student.id} teachers={hifzTeachers} />
                {hifzRows.length === 0 ? (
                  <p className="empty-state">
                    ابھی کوئی پیش رفت درج نہیں ہے — اوپر والے فارم سے پہلا اندراج شامل کریں۔
                  </p>
                ) : (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>تاریخ</th>
                          <th>قسم</th>
                          <th>حصہ</th>
                          <th>کیفیت</th>
                          <th>سننے والا</th>
                          <th>حالت</th>
                          <th>کارروائی</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hifzRows.map((r) => (
                          <tr key={r.id}>
                            <td>{formatDate(r.progress_date)}</td>
                            <td>{HIFZ_KIND_LABELS[r.kind]}</td>
                            <td>{r.portion}</td>
                            <td>{HIFZ_QUALITY_LABELS[r.quality]}</td>
                            <td>
                              {r.teachers
                                ? `${r.teachers.name} — ${r.teachers.father_name}`
                                : "—"}
                            </td>
                            <td>
                              <span
                                className={`badge${r.status === "voided" ? " badge-withdrawn" : ""}`}
                              >
                                {HIFZ_PROGRESS_STATUS_LABELS[r.status]}
                              </span>
                            </td>
                            <td>
                              {r.status === "active" ? (
                                <VoidHifzButton
                                  id={r.id}
                                  studentId={student.id}
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}

        <h3 className="form-section-title">داخلہ</h3>
        {admission ? (
          <div className="detail-rows">
            <div className="row">
              <span>داخلے کی تاریخ</span>
              <span>{formatDate(admission.admission_date)}</span>
            </div>
            <div className="row">
              <span>پچھلا مدرسہ</span>
              <span>{admission.previous_madrasa || "—"}</span>
            </div>
          </div>
        ) : (
          <p className="empty-state">
            یہ طالبہ داخلے کے ریکارڈ سے نہیں آئی — براہِ راست شامل کی گئی تھی۔
          </p>
        )}

        <div className="form-actions">
          <Link className="btn-ghost" href={`/departments/students/${student.id}`}>
            طالبہ کا ریکارڈ دیکھیں
          </Link>
        </div>

      </div>
    </div>
  );
}

/**
 * مرحلہ 101 — کتاب دینے کا صفحہ (سرور)
 * کتاب، دستیاب تعداد اور تینوں قسم کے لوگ (فعال طالبات، اساتذہ، عملہ) لاتا ہے۔
 * میز ابھی نہ بنی ہو (migration 052/053 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import IssueForm from "@/app/departments/library/IssueForm";
import { issueBook } from "@/app/departments/library/actions";
import { createClient } from "@/lib/supabase/server";
import { todayInKarachi } from "@/lib/attendance";
import {
  countActiveIssues,
  type BorrowerRef,
  type LibraryBook,
} from "@/lib/library";

export default async function IssueBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_books")
    .select("*")
    .eq("id", id)
    .single();

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/library" />
            <h2>کتاب دیں</h2>
          </div>
          <p className="empty-state">
            لائبریری کی میز ابھی نہیں بنی — پہلے مرحلہ 100 کی SQL چلائیں۔
          </p>
        </div>
      </div>
    );
  }

  const book = data as LibraryBook | null;
  if (!book) {
    notFound();
  }

  // دستیاب تعداد = کل تعداد − دیے ہوئے نسخے
  let issuedCount = 0;
  let issuesMissing = false;
  try {
    const res = await countActiveIssues(supabase, book.id);
    issuedCount = res.count;
    issuesMissing = res.missing;
  } catch {
    issuesMissing = true;
  }
  const available = book.quantity - issuedCount;

  // تینوں قسم کے فعال لوگ
  const [studentsRes, teachersRes, staffRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, registration_number")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("teachers")
      .select("id, name, position")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("staff")
      .select("id, name, position")
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);
  const students: BorrowerRef[] = (
    (studentsRes.data ?? []) as {
      id: string;
      name: string;
      registration_number: string;
    }[]
  ).map((r) => ({ id: r.id, name: r.name, detail: r.registration_number }));
  const teachers: BorrowerRef[] = (
    (teachersRes.data ?? []) as {
      id: string;
      name: string;
      position: string | null;
    }[]
  ).map((r) => ({ id: r.id, name: r.name, detail: r.position ?? "" }));
  const staff: BorrowerRef[] = (
    (staffRes.data ?? []) as {
      id: string;
      name: string;
      position: string | null;
    }[]
  ).map((r) => ({ id: r.id, name: r.name, detail: r.position ?? "" }));

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href={`/departments/library/${book.id}`} />
          <h2>کتاب دیں</h2>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>کتاب کا نام</span>
            <strong>{book.title}</strong>
          </div>
          <div className="row">
            <span>کل تعداد</span>
            <strong>{book.quantity}</strong>
          </div>
          <div className="row">
            <span>دستیاب</span>
            <strong>{issuesMissing ? "—" : available}</strong>
          </div>
        </div>

        {issuesMissing ? (
          <p className="empty-state">
            دینے/واپسی کی میز ابھی نہیں بنی — پہلے مرحلہ 101 کی SQL چلائیں۔
          </p>
        ) : book.status !== "active" ? (
          <p className="empty-state">
            یہ کتاب محفوظ شدہ ہے — دی نہیں جا سکتی۔
          </p>
        ) : available <= 0 ? (
          <p className="empty-state">
            کتاب دستیاب نہیں ہے — سب نسخے دیے جا چکے ہیں۔
          </p>
        ) : (
          <IssueForm
            bookId={book.id}
            bookTitle={book.title}
            today={todayInKarachi()}
            students={students}
            teachers={teachers}
            staff={staff}
            action={issueBook}
          />
        )}
      </div>
    </div>
  );
}

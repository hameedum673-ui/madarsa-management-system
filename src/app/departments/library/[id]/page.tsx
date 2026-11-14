/**
 * مرحلہ 100 — کتاب کی تفصیل + ترمیم (سرور)
 * میز ابھی نہ بنی ہو (migration 052 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import BookForm from "@/app/departments/library/BookForm";
import ArchiveButton from "@/app/departments/library/ArchiveButton";
import { updateBook } from "@/app/departments/library/actions";
import { createClient } from "@/lib/supabase/server";
import {
  BOOK_CATEGORY_LABELS,
  BOOK_STATUS_LABELS,
  type LibraryBook,
} from "@/lib/library";

export default async function BookDetailPage({
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
            <h2>کتاب کی تفصیل</h2>
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

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/library" />
          <h2>کتاب کی تفصیل</h2>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>کتاب کا نام</span>
            <strong>{book.title}</strong>
          </div>
          <div className="row">
            <span>مصنف</span>
            <strong>{book.author ?? "—"}</strong>
          </div>
          <div className="row">
            <span>قسم</span>
            <strong>{BOOK_CATEGORY_LABELS[book.category]}</strong>
          </div>
          <div className="row">
            <span>تعداد</span>
            <strong>{book.quantity}</strong>
          </div>
          <div className="row">
            <span>الماری/جگہ</span>
            <strong>{book.shelf ?? "—"}</strong>
          </div>
          <div className="row">
            <span>حالت</span>
            <strong>{BOOK_STATUS_LABELS[book.status]}</strong>
          </div>
        </div>

        {book.status === "active" ? (
          <div className="form-actions">
            <ArchiveButton id={book.id} />
          </div>
        ) : null}

        <BookForm
          book={book}
          action={updateBook}
          detailId={`/departments/library/${book.id}`}
        />
      </div>
    </div>
  );
}

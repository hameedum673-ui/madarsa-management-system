/**
 * مرحلہ 100 — کتاب کی تفصیل + ترمیم (سرور)
 * میز ابھی نہ بنی ہو (migration 052 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import BookForm from "@/app/departments/library/BookForm";
import ArchiveButton from "@/app/departments/library/ArchiveButton";
import { updateBook } from "@/app/departments/library/actions";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import {
  countActiveIssues,
  resolveBorrowerNames,
  type LibraryBook,
  type LibraryIssue,
} from "@/lib/library";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const langP = getMyLanguage();
  const { data, error } = await supabase
    .from("library_books")
    .select("*")
    .eq("id", id)
    .single();
  const lang = await langP;

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/library" />
            <h2>{t(lang, "library.detail_title")}</h2>
          </div>
          <p className="empty-state">{t(lang, "library.table_missing")}</p>
        </div>
      </div>
    );
  }

  const book = data as LibraryBook | null;
  if (!book) {
    notFound();
  }

  // مرحلہ 101 — دستیاب تعداد اور ابھی کس کے پاس ہے (میز نہ بنی ہو تو خالی)
  let issuedCount = 0;
  let issuesMissing = false;
  let activeIssues: LibraryIssue[] = [];
  try {
    const res = await countActiveIssues(supabase, book.id);
    issuedCount = res.count;
    issuesMissing = res.missing;
    if (!issuesMissing) {
      const { data: issueRows, error: issueError } = await supabase
        .from("library_issues")
        .select("*")
        .eq("book_id", book.id)
        .eq("status", "issued")
        .order("issued_at", { ascending: false });
      if (!issueError) {
        activeIssues = (issueRows ?? []) as LibraryIssue[];
      }
    }
  } catch {
    issuesMissing = true;
  }
  const available = book.quantity - issuedCount;
  const borrowerNames = activeIssues.length
    ? await resolveBorrowerNames(supabase, activeIssues)
    : new Map();

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/library" />
          <h2>{t(lang, "library.detail_title")}</h2>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "library.col.title")}</span>
            <strong>{book.title}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "library.col.author")}</span>
            <strong>{book.author ?? "—"}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "col.type")}</span>
            <strong>{t(lang, `library.cat.${book.category}`)}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "library.col.quantity")}</span>
            <strong>{book.quantity}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "library.col.available")}</span>
            <strong>{issuesMissing ? "—" : available}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "library.col.shelf")}</span>
            <strong>{book.shelf ?? "—"}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "col.status")}</span>
            <strong>{t(lang, `library.status.${book.status}`)}</strong>
          </div>
        </div>

        {book.status === "active" ? (
          <div className="form-actions">
            <Link
              className="btn-primary"
              href={`/departments/library/${book.id}/issue`}
            >
              {t(lang, "library.issue")}
            </Link>
            <ArchiveButton id={book.id} lang={lang} />
          </div>
        ) : null}

        {activeIssues.length > 0 ? (
          <>
            <h3 className="form-section-title">
              {t(lang, "library.borrowers_now")}
            </h3>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.name")}</th>
                  <th>{t(lang, "library.col.issued_at")}</th>
                  <th>{t(lang, "library.col.due_date")}</th>
                </tr>
              </thead>
              <tbody>
                {activeIssues.map((issue) => {
                  const person = borrowerNames.get(issue.borrower_id);
                  return (
                    <tr key={issue.id}>
                      <td>
                        {person
                          ? `${person.name} (${t(lang, `library.borrower.${issue.borrower_type}`)}${person.detail ? ` — ${person.detail}` : ""})`
                          : t(lang, `library.borrower.${issue.borrower_type}`)}
                      </td>
                      <td>{issue.issued_at}</td>
                      <td>{issue.due_date ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : null}

        <BookForm
          book={book}
          action={updateBook}
          detailId={`/departments/library/${book.id}`}
          lang={lang}
        />
      </div>
    </div>
  );
}

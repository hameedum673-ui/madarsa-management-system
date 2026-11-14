/**
 * مرحلہ 101 — دی ہوئی کتابیں (سرور)
 * پہلے دی ہوئی کتابیں، پھر واپس آئی ہوئی — حالت کا فلٹر (پہلے چنیں،
 * پھر "دکھائیں" دبائیں)۔ میز ابھی نہ بنی ہو (migration 053 نہ چلی ہو)
 * تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import ReturnButton from "@/app/departments/library/ReturnButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import {
  BORROWER_TYPE_LABELS,
  ISSUE_STATUS_LABELS,
  resolveBorrowerNames,
  type LibraryIssue,
} from "@/lib/library";

type IssueRow = LibraryIssue & {
  library_books: { title: string } | null;
};

export default async function LibraryIssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const status = params.status ?? "issued";
  const statusValid =
    status === "all" || status === "issued" || status === "returned";

  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("library_issues")
    .select("*, library_books(title)", { count: "exact" })
    .order("issued_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (statusValid && status !== "all") {
    query = query.eq("status", status);
  }

  query = query.range(from, to);
  const { data, error, count } = await query;
  const issues = (data ?? []) as IssueRow[];
  const pages = pageCount(count);
  const tableMissing = (error as { code?: string } | null)?.code === "42P01";

  const names = tableMissing
    ? new Map()
    : await resolveBorrowerNames(supabase, issues);

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/library" />
          <h2>دی ہوئی کتابیں</h2>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            دینے/واپسی کی میز ابھی نہیں بنی — پہلے مرحلہ 101 کی SQL چلائیں۔
          </p>
        ) : (
          <>
            <form className="filter-row" method="get">
              <label className="field">
                <span className="field-label">حالت</span>
                <select
                  className="field-input"
                  name="status"
                  defaultValue={statusValid ? status : "issued"}
                >
                  <option value="issued">دی ہوئی</option>
                  <option value="returned">واپس آ گئی</option>
                  <option value="all">سب</option>
                </select>
              </label>
              <button className="btn-primary" type="submit">
                دکھائیں
              </button>
            </form>

            <p className="sub">
              پہلے اوپر والے خانے میں حالت چنیں، پھر "دکھائیں" دبائیں — اگر
              "دی ہوئی" چنا ہو تو صرف وہ کتابیں دکھیں گی جو ابھی واپس نہیں
              آئیں۔
            </p>

            {issues.length === 0 ? (
              <p className="empty-state">کوئی ریکارڈ نہیں ہے۔</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>کتاب</th>
                    <th>کس کو دی</th>
                    <th>دینے کی تاریخ</th>
                    <th>واپسی کی تاریخ</th>
                    <th>حالت</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => {
                    const person = names.get(issue.borrower_id);
                    return (
                      <tr key={issue.id}>
                        <td>
                          <Link
                            href={`/departments/library/${issue.book_id}`}
                          >
                            {issue.library_books?.title ?? "—"}
                          </Link>
                        </td>
                        <td>
                          {person
                            ? `${person.name} (${BORROWER_TYPE_LABELS[issue.borrower_type]}${person.detail ? ` — ${person.detail}` : ""})`
                            : BORROWER_TYPE_LABELS[issue.borrower_type]}
                        </td>
                        <td>{issue.issued_at}</td>
                        <td>
                          {issue.status === "returned"
                            ? issue.returned_at
                              ? issue.returned_at.slice(0, 10)
                              : "—"
                            : issue.due_date ?? "—"}
                        </td>
                        <td>
                          <span className="badge">
                            {ISSUE_STATUS_LABELS[issue.status]}
                          </span>
                        </td>
                        <td>
                          {issue.status === "issued" ? (
                            <ReturnButton id={issue.id} />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        <Pagination page={page} totalPages={pages} params={params} />
      </div>
    </div>
  );
}

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
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import {
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
  const langP = getMyLanguage();
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
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/library" />
          <h2>{t(lang, "library.issued_title")}</h2>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            {t(lang, "library.issues_table_missing")}
          </p>
        ) : (
          <>
            <form className="filter-row" method="get">
              <label className="field">
                <span className="field-label">{t(lang, "col.status")}</span>
                <select
                  className="field-input"
                  name="status"
                  defaultValue={statusValid ? status : "issued"}
                >
                  <option value="issued">
                    {t(lang, "library.issue_status.issued")}
                  </option>
                  <option value="returned">
                    {t(lang, "library.issue_status.returned")}
                  </option>
                  <option value="all">{t(lang, "common.all")}</option>
                </select>
              </label>
              <button className="btn-primary" type="submit">
                {t(lang, "common.show")}
              </button>
            </form>

            <p className="sub">{t(lang, "library.issues_hint")}</p>

            {issues.length === 0 ? (
              <p className="empty-state">{t(lang, "library.issues_empty")}</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t(lang, "library.col.book")}</th>
                    <th>{t(lang, "library.col.borrower")}</th>
                    <th>{t(lang, "library.col.issued_at")}</th>
                    <th>{t(lang, "library.col.due_date")}</th>
                    <th>{t(lang, "col.status")}</th>
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
                            ? `${person.name} (${t(lang, `library.borrower.${issue.borrower_type}`)}${person.detail ? ` — ${person.detail}` : ""})`
                            : t(lang, `library.borrower.${issue.borrower_type}`)}
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
                            {t(lang, `library.issue_status.${issue.status}`)}
                          </span>
                        </td>
                        <td>
                          {issue.status === "issued" ? (
                            <ReturnButton id={issue.id} lang={lang} />
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

        <Pagination page={page} totalPages={pages} params={params} lang={lang} />
      </div>
    </div>
  );
}

/**
 * مرحلہ 28 — دستاویزات کی فہرست (سرور)
 * قسم کا فلٹر (پہلے قسم چنیں، پھر "دکھائیں" دبائیں)۔
 * میعاد گزر چکی ہو تو "میعاد ختم" کا نشان خودبخود دکھایا جاتا ہے۔
 * میز ابھی نہ بنی ہو (migration 021 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  isExpired,
  type MadrasaDocument,
} from "@/lib/documents";
import { todayInKarachi } from "@/lib/attendance";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const type = params.type ?? "all";
  const typeValid =
    type === "all" ||
    DOCUMENT_TYPES.includes(type as (typeof DOCUMENT_TYPES)[number]);

  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (typeValid && type !== "all") {
    query = query.eq("doc_type", type);
  }

  query = query.range(from, to);
  const { data, error, count } = await query;
  const documents = (data ?? []) as MadrasaDocument[];
  const pages = pageCount(count);
  const tableMissing = (error as { code?: string } | null)?.code === "42P01";
  const today = todayInKarachi();

  // مرحلہ 41 — کن دستاویزات کے ساتھ فائل لگی ہے (میز نہ ہو تو کوئی نشان نہیں)
  const docsWithFiles = new Set<string>();
  try {
    const { data: filesData } = await supabase
      .from("document_files")
      .select("document_id")
      .eq("status", "active");
    for (const r of (filesData ?? []) as { document_id: string }[]) {
      docsWithFiles.add(r.document_id);
    }
  } catch {
    /* میز نہ ہو تو کوئی نشان نہیں دکھایا جاتا */
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>دستاویزات</h2>
          <Link className="btn-primary" href="/departments/documents/new">
            نئی دستاویز درج کریں
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            دستاویزات کی میز ابھی نہیں بنی — پہلے مرحلہ 28 کی SQL چلائیں۔
          </p>
        ) : (
          <>
            <form className="filter-row" method="get">
              <label className="field">
                <span className="field-label">قسم</span>
                <select
                  className="field-input"
                  name="type"
                  defaultValue={typeValid ? type : "all"}
                >
                  <option value="all">سب</option>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {DOCUMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit">
                دکھائیں
              </button>
            </form>

            <p className="sub">
              پہلے اوپر والے خانے میں قسم چنیں، پھر "دکھائیں" دبائیں — اگر
              "سب" چنا ہو تو "دکھائیں" دبانے سے فہرست ویسے ہی رہے گی۔
            </p>

            {documents.length === 0 ? (
              <p className="empty-state">ابھی کوئی دستاویز درج نہیں ہے۔</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>عنوان</th>
                    <th>قسم</th>
                    <th>میعاد ختم</th>
                    <th>حالت</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/departments/documents/${d.id}`}>
                          {d.title}
                        </Link>
                        {docsWithFiles.has(d.id) ? (
                          <>
                            {" "}
                            <span className="badge">فائل ہے</span>
                          </>
                        ) : null}
                      </td>
                      <td>{DOCUMENT_TYPE_LABELS[d.doc_type]}</td>
                      <td>
                        {formatDate(d.expiry_date)}
                        {isExpired(d, today) ? " — میعاد ختم" : ""}
                      </td>
                      <td>
                        <span className="badge">
                          {DOCUMENT_STATUS_LABELS[d.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
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

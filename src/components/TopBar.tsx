"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BELL_SVG } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { hijriTodayArabic, hijriTodayUrdu } from "@/lib/hijri";
import { NOTICE_KIND_LABELS, type NoticeKind } from "@/lib/notices";
import { setLanguage } from "@/app/profile/actions";
import { LANG_OPTIONS, t, type Lang } from "@/i18n/dictionary";

/** مرحلہ 32 — گھنٹی میں دکھانے کے لیے اطلاع کا مختصر ریکارڈ */
export interface TopBarNotice {
  id: string;
  title: string;
  kind: string;
  notice_date: string;
}

/**
 * اوپر کی سرخی (TopBar) — منظور شدہ ڈیزائن جوں کا توں:
 * لوگو، مدرسے کا نام، تاریخ (عیسوی + ہجری)، اطلاعات کا بٹن، صارف کا مینو۔
 * ڈراپ ڈاؤن مینو اور تاریخیں براؤزر میں چلتی ہیں، جیسے اصل فائل میں تھا۔
 */

const PROFILE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
const USERS_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
const SETTINGS_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06-.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
const LOGOUT_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
const LANGUAGE_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

export default function TopBar({
  madrasaName,
  madrasaLogoUrl,
  isAdmin = true,
  userName,
  userRole,
  notices = [],
  noticesCount = 0,
  lang = "ur",
}: {
  madrasaName?: string | null;
  madrasaLogoUrl?: string | null;
  isAdmin?: boolean;
  userName?: string | null;
  userRole?: string | null;
  notices?: TopBarNotice[];
  noticesCount?: number;
  lang?: Lang;
} = {}) {
  const router = useRouter();
  const [gregorian, setGregorian] = useState("—");
  const [hijri, setHijri] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  // مرحلہ 102 — مینیو میں زبان کے اندرونی آپشن (ڈی پی مینیو میں ہی کھلتے ہیں)
  const [langOpen, setLangOpen] = useState(false);
  const [langBusy, setLangBusy] = useState(false);
  const [langError, setLangError] = useState("");

  useEffect(() => {
    try {
      const now = new Date();
      // مرحلہ 102 — تاریخ چنی ہوئی زبان میں (اردو/عربی — دونوں مشرقی ہندسے)
      const locale = lang === "ar" ? "ar-EG" : "ur-PK";
      setGregorian(
        new Intl.DateTimeFormat(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now),
      );
      setHijri(
        lang === "ar" ? hijriTodayArabic(now) : hijriTodayUrdu(now),
      );
    } catch {
      /* تاریخ دستیاب نہ ہو تو جگہ خالی رہتی ہے، جیسے اصل فائل میں تھا */
    }
  }, [lang]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setBellOpen(false);
        setUserOpen(false);
        setLangOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const closeMenus = () => {
    setBellOpen(false);
    setUserOpen(false);
    setLangOpen(false);
  };

  // مرحلہ 102 — مینیو سے زبان چننا (وہی setLanguage ایکشن — RPC + کوکی)
  async function chooseLanguage(next: Lang) {
    if (next === "en" || next === lang || langBusy) return;
    setLangError("");
    setLangBusy(true);
    const formData = new FormData();
    formData.set("language", next);
    const result = await setLanguage(formData);
    setLangBusy(false);
    if ("error" in result) {
      setLangError(result.error);
      return;
    }
    closeMenus();
    // پوری سرخی اور ڈیش بورڈ نئی زبان میں کھلے — صفحہ دوبارہ لادیں
    window.location.reload();
  }

  // مرحلہ 4 — لاگ آؤٹ: سیشن ختم کر کے لاگ اِن صفحے پر لے جائیں
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    closeMenus();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo" aria-hidden="true">
          {/* مرحلہ 79 — سفید JMS لوگو (شفاف PNG؛ سرنامہ gradient ہے،
              اس لیے چوکور نیلا آئیکن نہیں چلے گا) */}
          <img src="/icons/logo-white.png" alt="" />
        </div>
        <div>
          <h1>
            {madrasaName ? (
              madrasaName
            ) : (
              <>{t(lang, "app.name")}</>
            )}
          </h1>
          <div className="sysname">{t(lang, "app.sysname")}</div>
        </div>
      </div>
      <div className="spacer"></div>
      <div className="datebox">
        <div>{gregorian}</div>
        <div className="hijri">{hijri}</div>
      </div>
      <div className="topbar-actions">
      <div className="menu-wrap">
        <button
          className="icon-btn"
          type="button"
          aria-label={t(lang, "topbar.notifications")}
          aria-haspopup="true"
          onClick={(ev) => {
            ev.stopPropagation();
            setUserOpen(false);
            setBellOpen((v) => !v);
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: BELL_SVG }} />
          {noticesCount > 0 ? (
            <span className="bell-count" aria-hidden="true">
              {noticesCount > 9 ? "9+" : noticesCount}
            </span>
          ) : null}
        </button>

      </div>
      <div className="menu-wrap">
        <button
          className="userchip"
          type="button"
          aria-haspopup="true"
          aria-label={t(lang, "topbar.user_menu")}
          onClick={(ev) => {
            ev.stopPropagation();
            setBellOpen(false);
            setUserOpen((v) => !v);
          }}
        >
          {/* مرحلہ 98 — گول بٹن: صرف دائرہ؛ لوگو ہو تو تصویر،
              ورنہ مدرسے کے نام کا پہلا حرف (جیسا پہلے تھا) */}
          <span className="avatar" aria-hidden="true">
            {madrasaLogoUrl ? (
              <img src={madrasaLogoUrl} alt="" />
            ) : (
              (madrasaName ?? userName ?? "حمید").trim().charAt(0) || "ح"
            )}
          </span>
        </button>

      </div>
      </div>
      <div
        className={`dropdown${bellOpen ? " open" : ""}`}
        role="menu"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="dd-head">{t(lang, "topbar.notifications")}</div>
        {notices.length === 0 ? (
          <div className="dd-empty">{t(lang, "topbar.no_notices")}</div>
        ) : (
          <>
            {notices.map((n) => (
              <Link
                key={n.id}
                className="dd-item dd-notice"
                href={`/departments/notices/${n.id}`}
                onClick={closeMenus}
              >
                <span className="dd-notice-title">{n.title}</span>
                <span className="dd-notice-meta">
                  {/* مرحلہ 102 — گھنٹی میں اطلاع کی قسم چنی ہوئی زبان میں */}
                  {["notice", "announcement", "holiday"].includes(n.kind)
                    ? t(lang, `notice.kind.${n.kind as NoticeKind}`)
                    : (NOTICE_KIND_LABELS[n.kind as NoticeKind] ?? n.kind)}{" "}
                  —{" "}
                  {new Date(n.notice_date).toLocaleDateString(
                    lang === "ar" ? "ar-EG" : "ur-PK",
                  )}
                </span>
              </Link>
            ))}
            <Link
              className="dd-item"
              href="/departments/notices"
              onClick={closeMenus}
            >
              {t(lang, "topbar.all_notices")}
            </Link>
          </>
        )}
      </div>
      <div
        className={`dropdown${userOpen ? " open" : ""}`}
        role="menu"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="dd-head">
          {userName ?? "حمید"} — {userRole ?? "سپر ایڈمن"}
        </div>
        <Link className="dd-item" href="/profile" onClick={closeMenus}>
          <span dangerouslySetInnerHTML={{ __html: PROFILE_ICON_SVG }} />
          {t(lang, "topbar.my_profile")}
        </Link>
        {isAdmin ? (
          <Link
            className="dd-item"
            href="/departments/users-permissions"
            onClick={closeMenus}
          >
            <span dangerouslySetInnerHTML={{ __html: USERS_ICON_SVG }} />
            {t(lang, "topbar.users")}
          </Link>
        ) : null}
        <Link className="dd-item" href="/departments/settings" onClick={closeMenus}>
          <span dangerouslySetInnerHTML={{ __html: SETTINGS_ICON_SVG }} />
          {t(lang, "topbar.settings")}
        </Link>
        {/* مرحلہ 102 — زبان: پانچواں بٹن؛ دبانے پر تینوں آپشن وہیں مینیو میں کھلتے ہیں */}
        <button
          type="button"
          aria-expanded={langOpen}
          onClick={() => setLangOpen((v) => !v)}
        >
          <span dangerouslySetInnerHTML={{ __html: LANGUAGE_ICON_SVG }} />
          {t(lang, "topbar.language")}
          <span aria-hidden="true" style={{ marginInlineStart: "auto" }}>
            {langOpen ? "▴" : "▾"}
          </span>
        </button>
        {langOpen ? (
          <div role="group" aria-label={t(lang, "topbar.language")}>
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="dd-lang"
                disabled={opt.comingSoon || langBusy}
                onClick={() => chooseLanguage(opt.id)}
              >
                {opt.label}
                {opt.comingSoon ? (
                  <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
                    ({t(lang, "common.coming_soon")})
                  </span>
                ) : null}
                {opt.id === lang ? (
                  <span className="tick" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </button>
            ))}
            {langError ? (
              <div className="dd-empty">{langError}</div>
            ) : null}
          </div>
        ) : null}
        <button type="button" onClick={handleLogout}>
          <span dangerouslySetInnerHTML={{ __html: LOGOUT_ICON_SVG }} />
          {t(lang, "topbar.logout")}
        </button>
      </div>
    </header>
  );
}

/**
 * آئیکون — مرحلہ 1 کی سادہ HTML فائل کے SVG آئیکون بالکل ویسے ہی رکھے گئے ہیں۔
 * ہر آئیکون صرف لکیروں (paths) کی شکل میں ہے؛ رنگ اور موٹائی CSS سے آتی ہے،
 * جیسے اصل فائل میں تھا۔
 */

export type IconName =
  | "users"
  | "userPlus"
  | "idCard"
  | "teacher"
  | "staff"
  | "classes"
  | "checkCal"
  | "clockCheck"
  | "book"
  | "award"
  | "income"
  | "expense"
  | "monthCalc"
  | "yearChart"
  | "zakat"
  | "gift"
  | "support"
  | "studentExpense"
  | "report"
  | "general"
  | "shield"
  | "bell"
  | "folder"
  | "backup"
  | "settings"
  | "wallet"
  | "chev"
  | "gradCap"
  | "coins"
  | "building";

const ICON_PATHS: Record<IconName, string> = {
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  userPlus:
    '<path d="M2 21a8 8 0 0 1 13.3-5.1"/><circle cx="10" cy="8" r="5"/><path d="M19 16v6"/><path d="M22 19h-6"/>',
  idCard:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16.5c.6-1.4 1.7-2 3-2s2.4.6 3 2"/><path d="M15 9h4"/><path d="M15 13h4"/>',
  teacher:
    '<path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/><path d="M22 9v5"/>',
  staff:
    '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
  classes:
    '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 13h.01"/>',
  checkCal:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  clockCheck:
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  award:
    '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
  income:
    '<path d="M12 2v20"/><path d="M17 6.5c-.8-1-2.6-1.5-5-1.5-3 0-5 1.3-5 3.2 0 4.4 10 2.4 10 6.6 0 1.9-2 3.2-5 3.2-2.4 0-4.2-.6-5-1.7"/>',
  expense:
    '<path d="M3 6h18l-1.5 9h-13z"/><path d="M3 6l-1-3"/><circle cx="7" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/>',
  monthCalc:
    '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 11h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 15h.01"/><path d="M12 15h.01"/><path d="M16 15h.01"/>',
  yearChart:
    '<path d="M3 3v18h18"/><path d="M8 17v-6"/><path d="M13 17V7"/><path d="M18 17v-9"/>',
  zakat:
    '<path d="M12 21s-7.5-4.6-7.5-10A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 7.5 4c0 5.4-7.5 10-7.5 10z"/>',
  gift: '<rect x="3" y="8" width="18" height="4"/><path d="M12 8v13"/><path d="M19 12v9H5v-9"/><path d="M12 8s-4 .2-5.5-1.2A2.3 2.3 0 0 1 8.5 3C11 3 12 8 12 8z"/><path d="M12 8s4 .2 5.5-1.2A2.3 2.3 0 0 0 15.5 3C13 3 12 8 12 8z"/>',
  support:
    '<path d="M11 15H6a3 3 0 0 1 0-6h13"/><path d="M18 9a3 3 0 0 1 0 6h-1"/><circle cx="8.5" cy="12" r="1"/>',
  studentExpense:
    '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
  report:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15v3"/><path d="M12.5 12v6"/><path d="M16 9v9"/>',
  general:
    '<path d="M3 21h18"/><path d="M6 21V8l6-5 6 5v13"/><path d="M10 21v-5h4v5"/>',
  shield:
    '<path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10z"/><path d="m9 11.5 2 2 4-4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  folder:
    '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  backup:
    '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06-.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  wallet:
    '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  chev: '<path d="m14 7-5 5 5 5"/>',
  gradCap:
    '<path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/>',
  coins:
    '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  building:
    '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M12 14h.01"/>',
};

/** اصل فائل کا svg() مددگار — وہی لپیٹ، وہی موٹائی (1.8) */
export function iconSvg(name: IconName): string {
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    ICON_PATHS[name] +
    "</svg>"
  );
}

/** React میں آئیکون دکھانے والا جزو */
export function Icon({ name }: { name: IconName }) {
  return <span dangerouslySetInnerHTML={{ __html: iconSvg(name) }} />;
}

/** سرخی میں لوگو (کتاب کا نشان) — اصل فائل جیسا، موٹائی 1.7 */
export const LOGO_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';

/** گھنٹی کا بٹن — اصل فائل جیسا (stroke موجودہ رنگ) */
export const BELL_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

/** واپس جانے والے بٹن کا تیر — اصل فائل جیسا، موٹائی 2 */
export const BACK_ARROW_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';

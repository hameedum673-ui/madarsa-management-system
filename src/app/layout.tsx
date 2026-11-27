import type { Metadata, Viewport } from "next";
import { Noto_Naskh_Arabic, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import AutoLogout from "@/components/AutoLogout";
import NavigationLoader from "@/components/NavigationLoader";
import OfflineBanner from "@/components/OfflineBanner";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { getMyLanguage } from "@/lib/language";
import { getMyTheme } from "@/lib/theme";
import { t } from "@/i18n/dictionary";

/**
 * بنیادی ڈھانچہ — زبان اردو، سمت RTL، وہی عنوان اور وہی اردو فونٹ،
 * جیسے مرحلہ 1 کی منظور شدہ فائل میں تھے۔
 * مرحلہ 97 — فونٹ اب Google سے نہیں، سائٹ کے ساتھ اپنے سرور (ممبئی)
 * سے ملیں گے (next/font — بناتے وقت ڈاؤن لوڈ، کیش شدہ)۔ فونٹ کی
 * شکل وہی ہے (نستعلیق + نسخ) — صرف جگہ بدلی ہے، اس لیے نقطے/اعراب
 * ویسے ہی رہیں گے۔
 */
const naskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-naskh",
  display: "swap",
});
const nastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nastaliq",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  // زبان کے حساب سے ٹیب کا عنوان اور ایپ کا نام (اردو / عربی)
  const lang = await getMyLanguage();
  // تھیم 3 — براؤزر کو چنے ہوئے انداز (دن/رات) کے رنگ بتائیں
  const theme = await getMyTheme();
  return {
    title: t(lang, "app.sysname"),
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/icons/icon-180.png",
    },
    appleWebApp: {
      capable: true,
      title: t(lang, "app.name"),
      statusBarStyle: "default",
    },
    other: { "color-scheme": theme },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e6b66",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // مرحلہ 102 — صارف کی زبان: کوکی، پھر پروفائل، پھر اردو۔
  // عربی اور اردو دونوں RTL ہیں، اس لیے سمت نہیں بدلتی؛ صرف lang اور
  // فونٹ بدلتا ہے (lang-ar سرخیوں کو نسخ فونٹ دیتی ہے — globals.css)۔
  const lang = await getMyLanguage();
  // تھیم 3 — دن/رات (کوکی "theme"؛ نہ ہو تو دن والا انداز)
  const theme = await getMyTheme();
  return (
    <html
      lang={lang}
      dir="rtl"
      data-theme={theme}
      className={`${naskhArabic.variable} ${nastaliqUrdu.variable}${lang === "ar" ? " lang-ar" : ""}`}
    >
      <head>
        {/* ایپ ڈاؤن لوڈ والا بٹن — انسٹال کا اشارہ ری ایکٹ لگنے سے پہلے
            پکڑ لیں، ورنہ کبھی بٹن دکھتا ہے کبھی نہیں (اشارہ پہلے آ جاتا ہے) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__deferredInstallPrompt=e;});window.addEventListener('appinstalled',function(){window.__deferredInstallPrompt=null;});`,
          }}
        />
      </head>
      <body>
        <AutoLogout />
        <NavigationLoader />
        <OfflineBanner lang={lang} />
        <ServiceWorkerRegister />
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}

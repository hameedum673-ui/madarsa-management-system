import type { Metadata, Viewport } from "next";
import { Noto_Naskh_Arabic, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import AutoLogout from "@/components/AutoLogout";
import NavigationLoader from "@/components/NavigationLoader";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

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

export const metadata: Metadata = {
  title: "جامعہ منیجمنٹ سسٹم — مین ڈیش بورڈ",
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
    title: "جامعہ مینجمنٹ",
    statusBarStyle: "default",
  },
  other: { "color-scheme": "light dark" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#123a63",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ur" dir="rtl" className={`${naskhArabic.variable} ${nastaliqUrdu.variable}`}>
      <body>
        <AutoLogout />
        <NavigationLoader />
        <ServiceWorkerRegister />
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}

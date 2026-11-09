import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * بنیادی ڈھانچہ — زبان اردو، سمت RTL، وہی عنوان اور وہی اردو فونٹ،
 * جیسے مرحلہ 1 کی منظور شدہ فائل میں تھے۔
 */

export const metadata: Metadata = {
  title: "جامع مدرسہ مینجمنٹ سسٹم — مین ڈیش بورڈ",
  icons: { icon: "data:," },
  other: { "color-scheme": "light dark" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ur" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}

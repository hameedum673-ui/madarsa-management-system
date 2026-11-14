import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // مرحلہ 98 کی درستی — Server Action میں فائل کی حد: پہلے سے طے شدہ
  // 1MB تھی، لوگو 2MB تک کی اجازت ہے، اس لیے 4MB (Vercel کی حد
  // ~4.5MB سے نیچے) — ورنہ بڑی تصویر دروازے پر ہی رک جاتی تھی۔
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;

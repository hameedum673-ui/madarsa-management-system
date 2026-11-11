/**
 * مرحلہ 45 — صفحہ بدلتے وقت لوڈنگ اسکرین (سرور)
 * جب کوئی بٹن دبے یا بیک آیا جائے اور اگلا صفحہ کھلنے میں وقت لگے، تو
 * یہ اسکرین نظر آتی ہے — ذکر + چھوٹا گھومتا ہوا گول دائرہ — تاکہ پتا
 * چلے کہ بٹن دب گیا ہے اور کام ہو رہا ہے۔
 * Next.js خود یہ اسکرین دکھاتا ہے جب تک اگلا صفحہ تیار نہ ہو۔
 */
export default function Loading() {
  return (
    <div className="loading-screen">
      <p className="loading-dhikr" lang="ar" dir="rtl">
        سبحان اللہ و بحمدہ سبحان اللہ العظیم
      </p>
      <div className="loading-spinner" aria-label="لوڈ ہو رہا ہے" />
    </div>
  );
}

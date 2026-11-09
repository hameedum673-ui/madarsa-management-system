import ModuleCard from "@/components/ModuleCard";

/**
 * «میرا پروفائل» کا صفحہ — صارف کے مینو سے کھلتا ہے۔
 * ابھی کوئی لاگ اِن نظام نہیں؛ دکھائی جانے والی معلومات وہی ہیں جو
 * مرحلہ 1 کی منظور شدہ فائل میں لکھی تھیں۔
 */
export default function ProfilePage() {
  return (
    <ModuleCard
      department={{
        id: "profile",
        label: "میرا پروفائل",
        icon: "users",
        group: "اکاؤنٹ",
        desc: "",
      }}
      extra={
        <div className="profile-rows">
          <div className="row">
            <span>نام</span>
            <span>حمید</span>
          </div>
          <div className="row">
            <span>عہدہ</span>
            <span>سپر ایڈمن</span>
          </div>
          <div className="row">
            <span>ادارہ</span>
            <span>مدرسہ سیدہ عائشہ صدیقہ (رضی اللہ عنہا) للبنات</span>
          </div>
        </div>
      }
    />
  );
}

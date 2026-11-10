import { notFound } from "next/navigation";
import ModuleCard from "@/components/ModuleCard";
import { ALL_DEPARTMENTS, DEPARTMENT_BY_ID } from "@/data/departments";

/**
 * ہر شعبے کا الگ صفحہ، مثلاً ‎/departments/students۔
 * فی الحال ہر صفحے پر صرف «زیرِ تعمیر» حالت اور واپس جانے کا بٹن ہے۔
 * تمام 27 صفحے build کے وقت تیار ہوتے ہیں۔
 */
export function generateStaticParams() {
  // 'students'، 'teachers'، 'att-students'، 'att-teachers'، 'income'،
  // 'admissions'، 'exams'، 'users'، 'idcards'، 'staff'، 'classes'،
  // 'academic'، 'expenses'، 'monthly'، 'yearly'، 'zakat'، 'donations'،
  // 'welfare'، 'student-exp'، 'fin-reports'، 'general'، 'permissions'،
  // 'notices'، 'documents' اور 'reports' کے اپنے اصل صفحے ہیں — اس لیے
  // یہاں سے خارج ہیں، ورنہ build میں دو صفحے ایک ہی پتے پر بنتے۔
  return ALL_DEPARTMENTS.filter(
    (m) =>
      m.id !== "students" &&
      m.id !== "teachers" &&
      m.id !== "att-students" &&
      m.id !== "att-teachers" &&
      m.id !== "income" &&
      m.id !== "admissions" &&
      m.id !== "exams" &&
      m.id !== "users" &&
      m.id !== "idcards" &&
      m.id !== "staff" &&
      m.id !== "classes" &&
      m.id !== "academic" &&
      m.id !== "expenses" &&
      m.id !== "monthly" &&
      m.id !== "yearly" &&
      m.id !== "zakat" &&
      m.id !== "donations" &&
      m.id !== "welfare" &&
      m.id !== "student-exp" &&
      m.id !== "fin-reports" &&
      m.id !== "general" &&
      m.id !== "permissions" &&
      m.id !== "notices" &&
      m.id !== "documents" &&
      m.id !== "reports",
  ).map((m) => ({
    slug: m.id,
  }));
}

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const department = DEPARTMENT_BY_ID[slug];
  if (!department) {
    notFound();
  }
  return <ModuleCard department={department} />;
}

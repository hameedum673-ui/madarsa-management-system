import { notFound } from "next/navigation";
import ModuleCard from "@/components/ModuleCard";
import { ALL_DEPARTMENTS, DEPARTMENT_BY_ID } from "@/data/departments";

/**
 * ہر شعبے کا الگ صفحہ، مثلاً ‎/departments/students۔
 * فی الحال ہر صفحے پر صرف «زیرِ تعمیر» حالت اور واپس جانے کا بٹن ہے۔
 * تمام 27 صفحے build کے وقت تیار ہوتے ہیں۔
 */
export function generateStaticParams() {
  // 'students' کا اپنا اصل صفحہ ہے (‎/departments/students) — اس لیے
  // یہاں سے خارج ہے، ورنہ build میں دو صفحے ایک ہی پتے پر بنتے۔
  return ALL_DEPARTMENTS.filter((m) => m.id !== "students").map((m) => ({
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

import TopBar from "@/components/TopBar";
import StatsRow from "@/components/StatsRow";
import DepartmentGroups from "@/components/DepartmentGroups";

/** مین ڈیش بورڈ — منظور شدہ ڈیزائن جوں کا توں */
export default function DashboardPage() {
  return (
    <>
      <TopBar />
      <StatsRow />
      <DepartmentGroups />
      <footer className="foot">
        مدرسہ سیدہ عائشہ صدیقہ <span className="gold">(رضی اللہ عنہا)</span> للبنات — شادی
        لارج، ضلع بدین، سندھ
      </footer>
    </>
  );
}

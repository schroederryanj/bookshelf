import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const titleSetting = await prisma.setting.findUnique({
    where: { key: "adminTitle" },
  });
  const adminTitle = titleSetting?.value || "Bookshelf";

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <AdminNav adminTitle={adminTitle} />
      <main className="flex-1 min-w-0 bg-gray-100 p-4 pt-20 lg:p-8 lg:pt-8 overflow-x-hidden">{children}</main>
    </div>
  );
}

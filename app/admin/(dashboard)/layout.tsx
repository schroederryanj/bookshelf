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
    <div className="flex min-h-screen">
      <AdminNav adminTitle={adminTitle} />
      <main className="flex-1 bg-gray-100 p-8">{children}</main>
    </div>
  );
}

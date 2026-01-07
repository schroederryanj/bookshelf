import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/admin/SettingsForm";

const DEFAULT_SETTINGS: Record<string, string> = {
  adminTitle: "Bookshelf",
};

export default async function SettingsPage() {
  const dbSettings = await prisma.setting.findMany();

  // Merge with defaults
  const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const setting of dbSettings) {
    settings[setting.key] = setting.value;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm sm:text-base">
          Configure your bookshelf admin panel.
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}

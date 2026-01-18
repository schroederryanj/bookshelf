"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SettingsFormProps = {
  initialSettings: Record<string, string>;
};

// Parse comma-separated phone numbers into array
function parsePhoneNumbers(value: string): string[] {
  return value
    .split(",")
    .map((num) => num.trim())
    .filter((num) => num.length > 0);
}

// Format phone numbers array back to comma-separated string
function formatPhoneNumbers(numbers: string[]): string {
  return numbers.filter((num) => num.trim().length > 0).join(", ");
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(() => {
    const parsed = parsePhoneNumbers(initialSettings.adminPhoneNumbers || "");
    return parsed.length > 0 ? parsed : [""];
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendingWelcome, setSendingWelcome] = useState(false);
  const [welcomeResult, setWelcomeResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert("Failed to save setting");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleSendWelcomeSMS = async () => {
    setSendingWelcome(true);
    setWelcomeResult(null);

    try {
      const res = await fetch("/api/sms/send-welcome", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setWelcomeResult({ success: true, message: data.message });
      } else {
        setWelcomeResult({
          success: false,
          message: data.error || "Failed to send welcome SMS",
        });
      }
    } catch {
      setWelcomeResult({
        success: false,
        message: "An error occurred while sending SMS",
      });
    } finally {
      setSendingWelcome(false);
      setTimeout(() => setWelcomeResult(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Title Setting */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Admin Title
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              The title displayed in the sidebar and login page.
            </p>
            <div className="max-w-md">
              <input
                type="text"
                value={settings.adminTitle}
                onChange={(e) =>
                  setSettings({ ...settings, adminTitle: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Enter admin title"
              />
            </div>
          </div>
          <div className="sm:ml-4">
            <button
              onClick={() => handleSave("adminTitle", settings.adminTitle)}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Admin Phone Numbers Setting */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              SMS Assistant Phone Numbers
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Phone numbers that can use the SMS assistant. Use E.164 format
              (e.g., +15551234567) or 10-digit US numbers.
            </p>
            <div className="space-y-3 max-w-md">
              {phoneNumbers.map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const newNumbers = [...phoneNumbers];
                      newNumbers[index] = e.target.value;
                      setPhoneNumbers(newNumbers);
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="+15551234567"
                  />
                  {phoneNumbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newNumbers = phoneNumbers.filter(
                          (_, i) => i !== index
                        );
                        setPhoneNumbers(newNumbers);
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove phone number"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPhoneNumbers([...phoneNumbers, ""])}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add another phone number
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                const formatted = formatPhoneNumbers(phoneNumbers);
                setSettings({ ...settings, adminPhoneNumbers: formatted });
                handleSave("adminPhoneNumbers", formatted);
              }}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </button>
            <button
              onClick={handleSendWelcomeSMS}
              disabled={
                sendingWelcome ||
                !phoneNumbers.some((num) => num.trim().length > 0)
              }
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {sendingWelcome ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Send Welcome SMS
                </>
              )}
            </button>
          </div>
          {welcomeResult && (
            <div
              className={`mt-2 p-3 rounded-lg text-sm ${
                welcomeResult.success
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {welcomeResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
        <div className="bg-gray-900 rounded-lg p-4 inline-flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">
              {settings.adminTitle || "Bookshelf"}
            </h1>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>
    </div>
  );
}

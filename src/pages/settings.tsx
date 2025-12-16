import { useState } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageLayout } from "@/components/common";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";

interface UserSettings {
  emailOnNewItem: boolean;
  emailOnOutbid: boolean;
}

interface SettingsPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  initialSettings: UserSettings;
}

export default function SettingsPage({
  user,
  initialSettings,
}: SettingsPageProps) {
  const { theme, setTheme } = useTheme();

  // Profile form state
  const [name, setName] = useState(user.name || "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email notification settings
  const [emailOnNewItem, setEmailOnNewItem] = useState(
    initialSettings.emailOnNewItem,
  );
  const [emailOnOutbid, setEmailOnOutbid] = useState(
    initialSettings.emailOnOutbid,
  );
  const [emailSettingsLoading, setEmailSettingsLoading] = useState(false);
  const [emailSettingsSuccess, setEmailSettingsSuccess] = useState<
    string | null
  >(null);

  const handleEmailSettingChange = async (
    setting: "emailOnNewItem" | "emailOnOutbid",
    value: boolean,
  ) => {
    if (setting === "emailOnNewItem") {
      setEmailOnNewItem(value);
    } else {
      setEmailOnOutbid(value);
    }

    setEmailSettingsLoading(true);
    setEmailSettingsSuccess(null);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [setting]: value }),
      });

      if (res.ok) {
        setEmailSettingsSuccess("Settings saved");
        setTimeout(() => setEmailSettingsSuccess(null), 2000);
      }
    } catch (err) {
      console.error("Failed to update email settings:", err);
      // Revert on error
      if (setting === "emailOnNewItem") {
        setEmailOnNewItem(!value);
      } else {
        setEmailOnOutbid(!value);
      }
    } finally {
      setEmailSettingsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const result = await res.json();

      if (!res.ok) {
        setProfileError(result.message || "Failed to update profile");
      } else {
        setProfileSuccess("Profile updated successfully");
        setTimeout(() => setProfileSuccess(null), 3000);
      }
    } catch {
      setProfileError("An error occurred. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await res.json();

      if (!res.ok) {
        setPasswordError(result.message || "Failed to change password");
      } else {
        setPasswordSuccess("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(null), 3000);
      }
    } catch {
      setPasswordError("An error occurred. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <PageLayout user={user} maxWidth="2xl">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-linear-to-r from-base-content to-base-content/60 bg-clip-text text-transparent mb-2">
          Settings
        </h1>
        <p className="text-base-content/60 text-lg">
          Manage your account preferences and profile
        </p>
      </div>

      {/* Profile Section */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="icon-[tabler--user] size-6"></span>
            </div>
            Profile
          </h2>

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            {profileError && (
              <div className="alert alert-error">
                <span className="icon-[tabler--alert-circle] size-5"></span>
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="alert alert-success">
                <span className="icon-[tabler--check] size-5"></span>
                <span>{profileSuccess}</span>
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                type="email"
                value={user.email}
                className="input input-bordered w-full bg-base-200/50 opacity-70"
                disabled
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50 flex items-center gap-1">
                  <span className="icon-[tabler--lock] size-3"></span>
                  Email cannot be changed
                </span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Display Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={profileLoading}
                loadingText="Saving..."
                icon={
                  <span className="icon-[tabler--device-floppy] size-5"></span>
                }
                className="shadow-lg shadow-primary/20"
              >
                Save Profile
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Password Section */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="icon-[tabler--lock] size-6"></span>
            </div>
            Change Password
          </h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            {passwordError && (
              <div className="alert alert-error">
                <span className="icon-[tabler--alert-circle] size-5"></span>
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="alert alert-success">
                <span className="icon-[tabler--check] size-5"></span>
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Current Password</span>
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">New Password</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                required
                minLength={8}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  Confirm New Password
                </span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                required
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                buttonStyle="outline"
                isLoading={passwordLoading}
                loadingText="Changing..."
                icon={<span className="icon-[tabler--key] size-5"></span>}
              >
                Change Password
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Email Notifications Section */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <span className="icon-[tabler--mail] size-6"></span>
            </div>
            Email Notifications
          </h2>

          {emailSettingsSuccess && (
            <div className="alert alert-success py-2 text-sm shadow-sm mb-2">
              <span className="icon-[tabler--check] size-5"></span>
              <span>{emailSettingsSuccess}</span>
            </div>
          )}

          <div className="space-y-2 mt-2 divide-y divide-base-content/5">
            <div className="form-control py-3">
              <label className="label cursor-pointer justify-between gap-4 p-0">
                <div className="flex-1">
                  <span className="label-text font-bold text-base block mb-1">
                    New item notifications
                  </span>
                  <p className="text-sm text-base-content/60 leading-tight">
                    Receive an email when a new item is added to an auction
                    you&apos;re a member of
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailOnNewItem}
                  onChange={(e) =>
                    handleEmailSettingChange("emailOnNewItem", e.target.checked)
                  }
                  className="toggle toggle-primary toggle-lg"
                  disabled={emailSettingsLoading}
                />
              </label>
            </div>

            <div className="form-control py-3 pt-5">
              <label className="label cursor-pointer justify-between gap-4 p-0">
                <div className="flex-1">
                  <span className="label-text font-bold text-base block mb-1">
                    Outbid notifications
                  </span>
                  <p className="text-sm text-base-content/60 leading-tight">
                    Receive an email when someone outbids you on an item
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailOnOutbid}
                  onChange={(e) =>
                    handleEmailSettingChange("emailOnOutbid", e.target.checked)
                  }
                  className="toggle toggle-primary toggle-lg"
                  disabled={emailSettingsLoading}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-neutral/10 flex items-center justify-center text-neutral-content">
              <span className="icon-[tabler--palette] size-6 text-base-content"></span>
            </div>
            Appearance
          </h2>

          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text font-medium">Theme Preference</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`btn h-20 flex-col gap-2 ${theme === "light" ? "btn-primary ring-2 ring-primary ring-offset-2 ring-offset-base-100" : "btn-outline border-base-content/10 hover:bg-base-200 hover:border-base-content/20"}`}
              >
                <span className="icon-[tabler--sun] size-6"></span>
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`btn h-20 flex-col gap-2 ${theme === "dark" ? "btn-primary ring-2 ring-primary ring-offset-2 ring-offset-base-100" : "btn-outline border-base-content/10 hover:bg-base-200 hover:border-base-content/20"}`}
              >
                <span className="icon-[tabler--moon] size-6"></span>
                Dark
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`btn h-20 flex-col gap-2 ${theme === "system" ? "btn-primary ring-2 ring-primary ring-offset-2 ring-offset-base-100" : "btn-outline border-base-content/10 hover:bg-base-200 hover:border-base-content/20"}`}
              >
                <span className="icon-[tabler--device-desktop] size-6"></span>
                System
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  // Get or create user settings
  let settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: { emailOnNewItem: true, emailOnOutbid: true },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId: session.user.id },
      select: { emailOnNewItem: true, emailOnOutbid: true },
    });
  }

  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      user,
      initialSettings: {
        emailOnNewItem: settings.emailOnNewItem,
        emailOnOutbid: settings.emailOnOutbid,
      },
      messages,
    },
  };
};

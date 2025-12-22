import { useState } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as userService from "@/lib/services/user.service";
import { PageLayout, SEO } from "@/components/common";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { LanguageSelect } from "@/components/ui/language-select";

interface UserSettings {
  emailOnNewItem: boolean;
  emailOnOutbid: boolean;
}

interface ConnectedAccount {
  provider: string;
}

interface SettingsPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  initialSettings: UserSettings;
  connectedAccounts: ConnectedAccount[];
  hasPassword: boolean;
  googleOAuthEnabled: boolean;
}

export default function SettingsPage({
  user,
  initialSettings,
  connectedAccounts,
  hasPassword,
  googleOAuthEnabled,
}: SettingsPageProps) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("settings");
  const tErrors = useTranslations("errors");

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
        setEmailSettingsSuccess(t("emailNotifications.settingsSaved"));
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
        setProfileError(result.message || tErrors("profile.updateFailed"));
      } else {
        setProfileSuccess(t("profile.profileUpdated"));
        setTimeout(() => setProfileSuccess(null), 3000);
      }
    } catch {
      setProfileError(tErrors("generic"));
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError(tErrors("validation.passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(tErrors("validation.passwordTooShort", { min: 8 }));
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
        setPasswordError(
          result.message || tErrors("profile.passwordChangeFailed"),
        );
      } else {
        setPasswordSuccess(t("password.passwordChanged"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(null), 3000);
      }
    } catch {
      setPasswordError(tErrors("generic"));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <PageLayout user={user} maxWidth="2xl">
      <SEO title={t("seo.title")} description={t("seo.description")} />
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-linear-to-r from-base-content to-base-content/60 bg-clip-text text-transparent mb-2">
          {t("title")}
        </h1>
        <p className="text-base-content/60 text-lg">{t("subtitle")}</p>
      </div>

      {/* Profile Section */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="icon-[tabler--user] size-6"></span>
            </div>
            {t("profile.title")}
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
                <span className="label-text font-medium">
                  {t("profile.email")}
                </span>
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
                  {t("profile.emailCannotChange")}
                </span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  {t("profile.displayName")}
                </span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profile.displayNamePlaceholder")}
                className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={profileLoading}
                loadingText={t("profile.saving")}
                icon={
                  <span className="icon-[tabler--device-floppy] size-5"></span>
                }
                className="shadow-lg shadow-primary/20"
              >
                {t("profile.saveProfile")}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Connected Accounts Section */}
      {googleOAuthEnabled && (
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <span className="icon-[tabler--link] size-6"></span>
              </div>
              {t("connectedAccounts.title")}
            </h2>

            <div className="space-y-3 mt-2">
              {/* Google Account */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-base-200/50 border border-base-content/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <svg className="size-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Google</p>
                    <p className="text-sm text-base-content/60">
                      {connectedAccounts.some(
                        (acc) => acc.provider === "google",
                      )
                        ? t("connectedAccounts.connected")
                        : t("connectedAccounts.notConnected")}
                    </p>
                  </div>
                </div>
                {connectedAccounts.some((acc) => acc.provider === "google") ? (
                  <span className="badge badge-success gap-1">
                    <span className="icon-[tabler--check] size-3"></span>
                    {t("connectedAccounts.connected")}
                  </span>
                ) : (
                  <span className="badge badge-ghost">
                    {t("connectedAccounts.notConnected")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Section - Only show if user has a password */}
      {hasPassword && (
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="icon-[tabler--lock] size-6"></span>
              </div>
              {t("password.title")}
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
                  <span className="label-text font-medium">
                    {t("password.currentPassword")}
                  </span>
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
                  <span className="label-text font-medium">
                    {t("password.newPassword")}
                  </span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("password.newPasswordPlaceholder")}
                  className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  required
                  minLength={8}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t("password.confirmNewPassword")}
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
                  loadingText={t("password.changing")}
                  icon={<span className="icon-[tabler--key] size-5"></span>}
                >
                  {t("password.changePassword")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Notifications Section */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <span className="icon-[tabler--mail] size-6"></span>
            </div>
            {t("emailNotifications.title")}
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
                    {t("emailNotifications.newItemNotifications")}
                  </span>
                  <p className="text-sm text-base-content/60 leading-tight">
                    {t("emailNotifications.newItemDescription")}
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
                    {t("emailNotifications.outbidNotifications")}
                  </span>
                  <p className="text-sm text-base-content/60 leading-tight">
                    {t("emailNotifications.outbidDescription")}
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

      {/* Language Section */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info">
              <span className="icon-[tabler--language] size-6"></span>
            </div>
            {t("language.title")}
          </h2>

          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text font-medium">
                {t("language.selectLanguage")}
              </span>
            </label>
            <p className="text-sm text-base-content/60 mb-4">
              {t("language.languageDescription")}
            </p>
            <LanguageSelect />
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
            {t("appearance.title")}
          </h2>

          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text font-medium">
                {t("appearance.themePreference")}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`btn h-20 flex-col gap-2 ${
                  theme === "light"
                    ? "btn-primary ring-2 ring-primary ring-offset-2 ring-offset-base-100"
                    : "btn-outline border-base-content/10 hover:bg-base-200 hover:border-base-content/20"
                }`}
              >
                <span className="icon-[tabler--sun] size-6"></span>
                {t("appearance.light")}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`btn h-20 flex-col gap-2 ${
                  theme === "dark"
                    ? "btn-primary ring-2 ring-primary ring-offset-2 ring-offset-base-100"
                    : "btn-outline border-base-content/10 hover:bg-base-200 hover:border-base-content/20"
                }`}
              >
                <span className="icon-[tabler--moon] size-6"></span>
                {t("appearance.dark")}
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`btn h-20 flex-col gap-2 ${
                  theme === "system"
                    ? "btn-primary ring-2 ring-primary ring-offset-2 ring-offset-base-100"
                    : "btn-outline border-base-content/10 hover:bg-base-200 hover:border-base-content/20"
                }`}
              >
                <span className="icon-[tabler--device-desktop] size-6"></span>
                {t("appearance.system")}
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

  const user = await userService.getUserById(session.user.id);

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  // Get or create user settings
  const settings = await userService.getOrCreateUserSettings(session.user.id);

  // Get connected OAuth accounts
  const connectedAccounts = await userService.getUserConnectedAccounts(
    session.user.id,
  );

  // Check if user has a password (for OAuth-only users)
  const hasPassword = await userService.userHasPassword(session.user.id);

  // Check if Google OAuth is enabled
  const googleOAuthEnabled = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      initialSettings: {
        emailOnNewItem: settings.emailOnNewItem,
        emailOnOutbid: settings.emailOnOutbid,
      },
      connectedAccounts: connectedAccounts.map((acc) => ({
        provider: acc.provider,
      })),
      hasPassword,
      googleOAuthEnabled,
      messages,
    },
  };
};

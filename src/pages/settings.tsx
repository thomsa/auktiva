import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { signOut } from "next-auth/react";
import { authOptions } from "@/lib/auth";
import * as userService from "@/lib/services/user.service";
import * as systemService from "@/lib/services/system.service";
import { PageLayout, SEO } from "@/components/common";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { LanguageSelect } from "@/components/ui/language-select";
import { createLogger } from "@/lib/logger";
import { useToast } from "@/components/ui/toast";

const settingsLogger = createLogger("settings");

interface UserSettings {
  emailOnNewItem: boolean;
  emailOnOutbid: boolean;
}

interface ConnectedAccount {
  provider: string;
}

interface VersionInfo {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
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
  isDeploymentAdmin: boolean;
  hasDeploymentAdmin: boolean;
  versionInfo: VersionInfo | null;
  isHostedDeployment: boolean;
}

export default function SettingsPage({
  user,
  initialSettings,
  connectedAccounts,
  hasPassword,
  googleOAuthEnabled,
  isDeploymentAdmin: initialIsDeploymentAdmin,
  hasDeploymentAdmin: initialHasDeploymentAdmin,
  versionInfo,
  isHostedDeployment,
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
    initialSettings.emailOnNewItem
  );
  const [emailOnOutbid, setEmailOnOutbid] = useState(
    initialSettings.emailOnOutbid
  );
  const [emailSettingsLoading, setEmailSettingsLoading] = useState(false);
  const [emailSettingsSuccess, setEmailSettingsSuccess] = useState<
    string | null
  >(null);

  // Deployment admin state
  const [isDeploymentAdmin, setIsDeploymentAdmin] = useState(
    initialIsDeploymentAdmin
  );
  const [hasDeploymentAdmin, setHasDeploymentAdmin] = useState(
    initialHasDeploymentAdmin
  );
  const [deploymentAdminLoading, setDeploymentAdminLoading] = useState(false);
  const [deploymentAdminError, setDeploymentAdminError] = useState<
    string | null
  >(null);
  const [deploymentAdminSuccess, setDeploymentAdminSuccess] = useState<
    string | null
  >(null);
  const [transferEmail, setTransferEmail] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [ownedAuctions, setOwnedAuctions] = useState<
    { id: string; name: string }[]
  >([]);
  const [auctionActions, setAuctionActions] = useState<
    Record<string, { action: "transfer" | "delete"; email?: string }>
  >({});
  const { showToast } = useToast();

  // Fetch owned auctions when modal opens
  useEffect(() => {
    if (showDeleteModal) {
      fetch("/api/user/account")
        .then((res) => res.json())
        .then((data) => {
          setOwnedAuctions(data.ownedAuctions || []);
          // Initialize auction actions
          const actions: Record<
            string,
            { action: "transfer" | "delete"; email?: string }
          > = {};
          (data.ownedAuctions || []).forEach(
            (auction: { id: string; name: string }) => {
              actions[auction.id] = { action: "delete" };
            }
          );
          setAuctionActions(actions);
        })
        .catch(() => {
          showToast(tErrors("generic"), "error");
        });
    }
  }, [showDeleteModal, showToast, tErrors]);

  const handleOpenDeleteModal = () => {
    setDeleteError(null);
    setDeletePassword("");
    setDeleteConfirmEmail("");
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteError(null);
    setDeletePassword("");
    setDeleteConfirmEmail("");
    setOwnedAuctions([]);
    setAuctionActions({});
  };

  const handleAuctionActionChange = (
    auctionId: string,
    action: "transfer" | "delete"
  ) => {
    setAuctionActions((prev) => ({
      ...prev,
      [auctionId]: { action, email: action === "transfer" ? "" : undefined },
    }));
  };

  const handleAuctionTransferEmailChange = (
    auctionId: string,
    email: string
  ) => {
    setAuctionActions((prev) => ({
      ...prev,
      [auctionId]: { ...prev[auctionId], email },
    }));
  };

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setDeleteLoading(true);

    // Validate auction transfers have emails
    for (const auction of ownedAuctions) {
      const action = auctionActions[auction.id];
      if (action?.action === "transfer" && !action.email?.trim()) {
        setDeleteError(
          t("deleteAccount.enterTransferEmail", { auction: auction.name })
        );
        setDeleteLoading(false);
        return;
      }
    }

    // Build request body
    const body: {
      password?: string;
      confirmEmail?: string;
      auctionTransfers?: { auctionId: string; newOwnerEmail: string }[];
      deleteAuctions?: string[];
    } = {};

    if (hasPassword) {
      if (!deletePassword) {
        setDeleteError(t("deleteAccount.passwordRequired"));
        setDeleteLoading(false);
        return;
      }
      body.password = deletePassword;
    } else {
      if (!deleteConfirmEmail) {
        setDeleteError(t("deleteAccount.emailRequired"));
        setDeleteLoading(false);
        return;
      }
      body.confirmEmail = deleteConfirmEmail;
    }

    // Add auction actions
    body.auctionTransfers = [];
    body.deleteAuctions = [];

    for (const auction of ownedAuctions) {
      const action = auctionActions[auction.id];
      if (action?.action === "transfer" && action.email) {
        body.auctionTransfers.push({
          auctionId: auction.id,
          newOwnerEmail: action.email,
        });
      } else {
        body.deleteAuctions.push(auction.id);
      }
    }

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.code === "IS_DEPLOYMENT_ADMIN") {
          setDeleteError(t("deleteAccount.mustTransferAdmin"));
        } else if (result.code === "TRANSFER_EMAIL_NOT_FOUND") {
          setDeleteError(result.message);
        } else if (result.code === "INVALID_PASSWORD") {
          setDeleteError(t("deleteAccount.incorrectPassword"));
        } else if (result.code === "INVALID_EMAIL") {
          setDeleteError(t("deleteAccount.incorrectEmail"));
        } else {
          setDeleteError(result.message || tErrors("generic"));
        }
        setDeleteLoading(false);
        return;
      }

      // Success - sign out and redirect
      showToast(t("deleteAccount.accountDeleted"), "success");
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError(tErrors("generic"));
      setDeleteLoading(false);
    }
  };

  const handleEmailSettingChange = async (
    setting: "emailOnNewItem" | "emailOnOutbid",
    value: boolean
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
          result.message || tErrors("profile.passwordChangeFailed")
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

  const handleBecomeDeploymentAdmin = async () => {
    setDeploymentAdminLoading(true);
    setDeploymentAdminError(null);
    setDeploymentAdminSuccess(null);

    try {
      const res = await fetch("/api/system/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentAdminEmail: user.email }),
      });

      const result = await res.json();

      if (!res.ok) {
        setDeploymentAdminError(result.error || tErrors("generic"));
      } else {
        setIsDeploymentAdmin(true);
        setHasDeploymentAdmin(true);
        setDeploymentAdminSuccess(t("deploymentAdmin.becameAdmin"));
        setTimeout(() => setDeploymentAdminSuccess(null), 3000);
      }
    } catch {
      setDeploymentAdminError(tErrors("generic"));
    } finally {
      setDeploymentAdminLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    // Fire and forget - the app will restart
    fetch("/api/system/update", { method: "POST" }).catch(() => {});
    // Redirect to home after a short delay to let the update start
    setTimeout(() => {
      window.location.href = "/";
    }, 1000);
  };

  const handleTransferDeploymentAdmin = async () => {
    if (!transferEmail.trim()) {
      setDeploymentAdminError(t("deploymentAdmin.enterEmail"));
      return;
    }

    setDeploymentAdminLoading(true);
    setDeploymentAdminError(null);
    setDeploymentAdminSuccess(null);

    try {
      const res = await fetch("/api/system/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentAdminEmail: transferEmail.trim() }),
      });

      const result = await res.json();

      if (!res.ok) {
        setDeploymentAdminError(result.error || tErrors("generic"));
      } else {
        setIsDeploymentAdmin(false);
        setHasDeploymentAdmin(true);
        setTransferEmail("");
        setDeploymentAdminSuccess(t("deploymentAdmin.transferred"));
        setTimeout(() => setDeploymentAdminSuccess(null), 3000);
      }
    } catch {
      setDeploymentAdminError(tErrors("generic"));
    } finally {
      setDeploymentAdminLoading(false);
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
                className="w-full sm:w-auto shadow-lg shadow-primary/20"
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
              <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-base-200/50 border border-base-content/5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
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
                  <div className="min-w-0">
                    <p className="font-medium">Google</p>
                    <p className="text-sm text-base-content/60 truncate">
                      {connectedAccounts.some(
                        (acc) => acc.provider === "google"
                      )
                        ? t("connectedAccounts.connected")
                        : t("connectedAccounts.notConnected")}
                    </p>
                  </div>
                </div>
                {connectedAccounts.some((acc) => acc.provider === "google") ? (
                  <span className="badge badge-success gap-1 shrink-0">
                    <span className="icon-[tabler--check] size-3"></span>
                    {t("connectedAccounts.connected")}
                  </span>
                ) : (
                  <span className="badge badge-ghost shrink-0">
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
                  className="w-full sm:w-auto"
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
              <label className="label cursor-pointer p-0 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <span className="label-text font-bold text-base block mb-1">
                    {t("emailNotifications.newItemNotifications")}
                  </span>
                  <p className="text-sm text-base-content/60 leading-tight text-wrap">
                    {t("emailNotifications.newItemDescription")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailOnNewItem}
                  onChange={(e) =>
                    handleEmailSettingChange("emailOnNewItem", e.target.checked)
                  }
                  className="toggle toggle-primary toggle-lg shrink-0"
                  disabled={emailSettingsLoading}
                />
              </label>
            </div>

            <div className="form-control py-3 pt-5">
              <label className="label cursor-pointer p-0 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <span className="label-text font-bold text-base block mb-1">
                    {t("emailNotifications.outbidNotifications")}
                  </span>
                  <p className="text-sm text-base-content/60 leading-tight text-wrap">
                    {t("emailNotifications.outbidDescription")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailOnOutbid}
                  onChange={(e) =>
                    handleEmailSettingChange("emailOnOutbid", e.target.checked)
                  }
                  className="toggle toggle-primary toggle-lg shrink-0"
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
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-neutral/10 flex items-center justify-center text-neutral-content">
              <span className="icon-[tabler--palette] size-6 text-base-content"></span>
            </div>
            {t("appearance.title")}
          </h2>

          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text font-medium mb-2 bold">
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

      {/* Deployment Admin Section - Hidden on hosted deployments */}
      {!isHostedDeployment && (
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                <span className="icon-[tabler--server] size-6"></span>
              </div>
              {t("deploymentAdmin.title")}
            </h2>

            {deploymentAdminError && (
              <div className="alert alert-error py-2 text-sm shadow-sm mb-2">
                <span className="icon-[tabler--alert-circle] size-5"></span>
                <span>{deploymentAdminError}</span>
              </div>
            )}

            {deploymentAdminSuccess && (
              <div className="alert alert-success py-2 text-sm shadow-sm mb-2">
                <span className="icon-[tabler--check] size-5"></span>
                <span>{deploymentAdminSuccess}</span>
              </div>
            )}

            <p className="text-sm text-base-content/60 mb-4">
              {t("deploymentAdmin.description")}
            </p>

            {isDeploymentAdmin ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                  <span className="icon-[tabler--shield-check] size-6 text-success shrink-0"></span>
                  <div className="min-w-0">
                    <p className="font-medium text-success">
                      {t("deploymentAdmin.youAreAdmin")}
                    </p>
                    <p className="text-sm text-base-content/60">
                      {t("deploymentAdmin.adminDescription")}
                    </p>
                  </div>
                </div>

                {/* Version info */}
                {versionInfo && (
                  <div className="p-4 rounded-xl bg-base-200/50 border border-base-content/5">
                    <p className="font-medium mb-3">
                      {t("deploymentAdmin.versionTitle")}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-base-content/60">
                          {t("deploymentAdmin.currentVersion")}
                        </span>
                        <span className="font-mono text-sm">
                          v{versionInfo.currentVersion}
                        </span>
                      </div>
                      {versionInfo.latestVersion && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-base-content/60">
                            {t("deploymentAdmin.latestVersion")}
                          </span>
                          <span
                            className={`font-mono text-sm ${
                              versionInfo.updateAvailable
                                ? "text-warning font-medium"
                                : "text-success"
                            }`}
                          >
                            v{versionInfo.latestVersion}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <a
                        href="https://github.com/thomsa/auktiva/blob/main/CHANGELOG.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                      >
                        <span className="icon-[tabler--file-text] size-4" />
                        {t("deploymentAdmin.viewChangelog")}
                      </a>
                      {versionInfo.updateAvailable && (
                        <Button
                          onClick={handleUpdate}
                          variant="primary"
                          size="sm"
                          isLoading={isUpdating}
                          loadingText={t("deploymentAdmin.updating")}
                          icon={
                            <span className="icon-[tabler--download] size-4" />
                          }
                        >
                          {t("deploymentAdmin.updateNow")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Transfer admin rights */}
                <div className="p-4 rounded-xl bg-base-200/50 border border-base-content/5">
                  <p className="font-medium mb-2">
                    {t("deploymentAdmin.transferTitle")}
                  </p>
                  <p className="text-sm text-base-content/60 mb-3">
                    {t("deploymentAdmin.transferDescription")}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                      placeholder={t("deploymentAdmin.emailPlaceholder")}
                      className="input input-bordered w-full sm:flex-1 sm:min-w-0"
                    />
                    <Button
                      onClick={handleTransferDeploymentAdmin}
                      buttonStyle="outline"
                      className="w-full sm:w-auto"
                      isLoading={deploymentAdminLoading}
                      loadingText={t("deploymentAdmin.transferring")}
                      icon={
                        <span className="icon-[tabler--arrow-right] size-5"></span>
                      }
                    >
                      {t("deploymentAdmin.transfer")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : hasDeploymentAdmin ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-base-200/50 border border-base-content/5">
                <span className="icon-[tabler--shield-lock] size-6 text-base-content/50 shrink-0"></span>
                <div className="min-w-0">
                  <p className="font-medium">
                    {t("deploymentAdmin.adminAlreadySet")}
                  </p>
                  <p className="text-sm text-base-content/60">
                    {t("deploymentAdmin.contactCurrentAdmin")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
                  <span className="icon-[tabler--alert-triangle] size-6 text-warning shrink-0"></span>
                  <div className="min-w-0">
                    <p className="font-medium text-warning">
                      {t("deploymentAdmin.noAdminSet")}
                    </p>
                    <p className="text-sm text-base-content/60">
                      {t("deploymentAdmin.claimAdminDescription")}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleBecomeDeploymentAdmin}
                  variant="primary"
                  isLoading={deploymentAdminLoading}
                  loadingText={t("deploymentAdmin.claiming")}
                  icon={
                    <span className="icon-[tabler--shield-plus] size-5"></span>
                  }
                  className="w-full sm:w-auto shadow-lg shadow-primary/20"
                >
                  {t("deploymentAdmin.becomeAdmin")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile-only: Quick Links & Logout Section */}
      <div className="md:hidden card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mt-8">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="icon-[tabler--link] size-6"></span>
            </div>
            {t("quickLinks.title")}
          </h2>

          <div className="space-y-2">
            <a
              href="https://docs.auktiva.org/users"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors"
            >
              <span className="icon-[tabler--book] size-5 text-primary"></span>
              <span className="font-medium">
                {t("quickLinks.documentation")}
              </span>
              <span className="icon-[tabler--external-link] size-4 ml-auto text-base-content/40"></span>
            </a>

            <a
              href="https://github.com/thomsa/auktiva/issues/new/choose"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors"
            >
              <span className="icon-[tabler--message-report] size-5 text-secondary"></span>
              <span className="font-medium">{t("quickLinks.feedback")}</span>
              <span className="icon-[tabler--external-link] size-4 ml-auto text-base-content/40"></span>
            </a>
          </div>

          <div className="divider my-4"></div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn btn-error btn-outline w-full gap-2"
          >
            <span className="icon-[tabler--logout] size-5"></span>
            {t("quickLinks.signOut")}
          </button>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-error/20 shadow-xl mt-8">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error">
              <span className="icon-[tabler--trash] size-6"></span>
            </div>
            {t("deleteAccount.title")}
          </h2>

          <p className="text-sm text-base-content/60 mb-4">
            {t("deleteAccount.description")}
          </p>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-error/5 border border-error/10">
            <span className="icon-[tabler--alert-triangle] size-6 text-error shrink-0"></span>
            <div className="min-w-0">
              <p className="font-medium text-error">
                {t("deleteAccount.warning")}
              </p>
              <p className="text-sm text-base-content/60">
                {t("deleteAccount.warningDescription")}
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleOpenDeleteModal}
              variant="error"
              buttonStyle="outline"
              className="w-full sm:w-auto"
              icon={<span className="icon-[tabler--trash] size-5"></span>}
            >
              {t("deleteAccount.deleteButton")}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg flex items-center gap-2 text-error">
              <span className="icon-[tabler--alert-triangle] size-6"></span>
              {t("deleteAccount.modalTitle")}
            </h3>

            <div className="py-4 space-y-4">
              {deleteError && (
                <div className="alert alert-error py-2 text-sm">
                  <span className="icon-[tabler--alert-circle] size-5"></span>
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-base-content/70">
                {t("deleteAccount.modalDescription")}
              </p>

              {/* Owned Auctions Section */}
              {ownedAuctions.length > 0 && (
                <div className="space-y-3">
                  <p className="font-medium">
                    {t("deleteAccount.ownedAuctionsTitle")}
                  </p>
                  <p className="text-sm text-base-content/60">
                    {t("deleteAccount.ownedAuctionsDescription")}
                  </p>

                  {ownedAuctions.map((auction) => (
                    <div
                      key={auction.id}
                      className="p-3 rounded-lg bg-base-200/50 border border-base-content/10 space-y-2"
                    >
                      <p className="font-medium">{auction.name}</p>
                      <div className="flex gap-2">
                        <label className="label cursor-pointer gap-2">
                          <input
                            type="radio"
                            name={`auction-${auction.id}`}
                            className="radio radio-sm radio-error"
                            checked={
                              auctionActions[auction.id]?.action === "delete"
                            }
                            onChange={() =>
                              handleAuctionActionChange(auction.id, "delete")
                            }
                          />
                          <span className="label-text">
                            {t("deleteAccount.deleteAuction")}
                          </span>
                        </label>
                        <label className="label cursor-pointer gap-2">
                          <input
                            type="radio"
                            name={`auction-${auction.id}`}
                            className="radio radio-sm radio-primary"
                            checked={
                              auctionActions[auction.id]?.action === "transfer"
                            }
                            onChange={() =>
                              handleAuctionActionChange(auction.id, "transfer")
                            }
                          />
                          <span className="label-text">
                            {t("deleteAccount.transferOwnership")}
                          </span>
                        </label>
                      </div>
                      {auctionActions[auction.id]?.action === "transfer" && (
                        <input
                          type="email"
                          placeholder={t("deleteAccount.newOwnerEmail")}
                          className="input input-bordered input-sm w-full"
                          value={auctionActions[auction.id]?.email || ""}
                          onChange={(e) =>
                            handleAuctionTransferEmailChange(
                              auction.id,
                              e.target.value
                            )
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Identity Confirmation */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {hasPassword
                      ? t("deleteAccount.enterPassword")
                      : t("deleteAccount.enterEmail")}
                  </span>
                </label>
                {hasPassword ? (
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder={t("deleteAccount.passwordPlaceholder")}
                    className="input input-bordered w-full"
                  />
                ) : (
                  <input
                    type="email"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    placeholder={user.email}
                    className="input input-bordered w-full"
                  />
                )}
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    {hasPassword
                      ? t("deleteAccount.passwordHint")
                      : t("deleteAccount.emailHint")}
                  </span>
                </label>
              </div>
            </div>

            <div className="modal-action flex-col-reverse sm:flex-row gap-2">
              <Button
                onClick={handleCloseDeleteModal}
                buttonStyle="ghost"
                className="w-full sm:w-auto"
                disabled={deleteLoading}
              >
                {t("deleteAccount.cancel")}
              </Button>
              <Button
                onClick={handleDeleteAccount}
                variant="error"
                className="w-full sm:w-auto"
                isLoading={deleteLoading}
                loadingText={t("deleteAccount.deleting")}
                icon={<span className="icon-[tabler--trash] size-5"></span>}
              >
                {t("deleteAccount.confirmDelete")}
              </Button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/50"
            onClick={handleCloseDeleteModal}
          ></div>
        </div>
      )}
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
    session.user.id
  );

  // Check if user has a password (for OAuth-only users)
  const hasPassword = await userService.userHasPassword(session.user.id);

  // Check if Google OAuth is enabled
  const googleOAuthEnabled = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  // Check deployment admin status
  const systemSettings = await systemService.getSystemSettings();
  const isDeploymentAdmin = systemSettings.deploymentAdminEmail === user.email;
  const hasDeploymentAdmin = !!systemSettings.deploymentAdminEmail;

  // Fetch version info for deployment admin
  let versionInfo: VersionInfo | null = null;
  settingsLogger.debug(
    { isDeploymentAdmin },
    "Checking deployment admin status"
  );
  if (isDeploymentAdmin) {
    try {
      const packageJson = await import("../../package.json");
      const currentVersion = packageJson.version;
      settingsLogger.debug(
        { currentVersion },
        "Current version from package.json"
      );

      // Fetch latest version from GitHub
      const response = await fetch(
        "https://api.github.com/repos/thomsa/auktiva/releases/latest",
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Auktiva",
          },
        }
      );

      settingsLogger.debug({ status: response.status }, "GitHub API response");

      if (response.ok) {
        const release = await response.json();
        const latestVersion = release.tag_name?.replace(/^v/, "") || null;
        const updateAvailable =
          latestVersion && latestVersion !== currentVersion;

        settingsLogger.debug(
          { latestVersion, updateAvailable },
          "Version check result"
        );

        versionInfo = {
          currentVersion,
          latestVersion,
          updateAvailable: !!updateAvailable,
          releaseUrl: release.html_url || null,
        };
      } else {
        settingsLogger.warn({ status: response.status }, "GitHub API failed");
        versionInfo = {
          currentVersion,
          latestVersion: null,
          updateAvailable: false,
          releaseUrl: null,
        };
      }
    } catch (error) {
      // If fetching fails, just show current version
      settingsLogger.error({ error }, "Error fetching version info");
      const packageJson = await import("../../package.json");
      versionInfo = {
        currentVersion: packageJson.version,
        latestVersion: null,
        updateAvailable: false,
        releaseUrl: null,
      };
    }
  }
  settingsLogger.debug({ versionInfo }, "Final version info");

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
      isDeploymentAdmin,
      hasDeploymentAdmin,
      versionInfo,
      isHostedDeployment: !!process.env.VERCEL || process.env.HOSTED === "true",
      messages,
    },
  };
};

import { useState } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";

interface SettingsPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function SettingsPage({ user }: SettingsPageProps) {
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
    <div className="min-h-screen bg-base-200">
      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8 pb-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {/* Profile Section */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">
              <span className="icon-[tabler--user] size-6"></span>
              Profile
            </h2>

            <form onSubmit={handleProfileSubmit} className="space-y-4 mt-4">
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
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  value={user.email}
                  className="input input-bordered w-full"
                  disabled
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Email cannot be changed
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Display Name</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="input input-bordered w-full"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={profileLoading}
                loadingText="Saving..."
                icon={
                  <span className="icon-[tabler--device-floppy] size-5"></span>
                }
              >
                Save Profile
              </Button>
            </form>
          </div>
        </div>

        {/* Password Section */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">
              <span className="icon-[tabler--lock] size-6"></span>
              Change Password
            </h2>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-4">
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
                  <span className="label-text">Current Password</span>
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">New Password</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="input input-bordered w-full"
                  required
                  minLength={8}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Confirm New Password</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={passwordLoading}
                loadingText="Changing..."
                icon={<span className="icon-[tabler--key] size-5"></span>}
              >
                Change Password
              </Button>
            </form>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <span className="icon-[tabler--palette] size-6"></span>
              Appearance
            </h2>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Theme</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`btn flex-1 ${theme === "light" ? "btn-primary" : "btn-ghost"}`}
                >
                  <span className="icon-[tabler--sun] size-5"></span>
                  Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`btn flex-1 ${theme === "dark" ? "btn-primary" : "btn-ghost"}`}
                >
                  <span className="icon-[tabler--moon] size-5"></span>
                  Dark
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`btn flex-1 ${theme === "system" ? "btn-primary" : "btn-ghost"}`}
                >
                  <span className="icon-[tabler--device-desktop] size-5"></span>
                  System
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
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

  return {
    props: {
      user,
    },
  };
};

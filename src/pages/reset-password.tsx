import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AlertMessage, SEO } from "@/components/common";
import { Button } from "@/components/ui/button";

interface ResetPasswordPageProps {
  token: string | null;
}

export default function ResetPasswordPage({ token }: ResetPasswordPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Client-side validation
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setFieldErrors({ password: "Password must be at least 6 characters" });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
        } else {
          setError(data.message || "Something went wrong. Please try again.");
        }
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login?reset=true");
        }, 3000);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <>
        <SEO
          title="Reset Password"
          description="Reset your Auktiva password"
          noindex
        />
        <div className="min-h-screen flex items-center justify-center bg-base-300 p-6">
          <div className="w-full max-w-md text-center">
            <div className="mb-6">
              <span className="icon-[tabler--alert-circle] size-16 text-error"></span>
            </div>
            <h1 className="text-2xl font-bold text-base-content mb-4">
              Invalid Reset Link
            </h1>
            <p className="text-base-content/60 mb-6">
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
            <Link href="/forgot-password" className="btn btn-primary">
              Request New Link
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Reset Password"
        description="Reset your Auktiva password"
        noindex
      />
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Branding (hidden on mobile) */}
        <div
          className="hidden lg:flex lg:w-1/2 bg-[#fff2d4] items-center justify-center p-12 relative"
          style={{
            backgroundImage: "url('/pictures/login-bg.png')",
            backgroundPosition: "bottom center",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-base-100/80"></div>
          <Link
            href="/"
            className="relative z-10 flex flex-col items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="icon-[tabler--gavel] size-12 text-primary"></span>
              <h1 className="text-4xl font-bold text-base-content">Auktiva</h1>
            </div>
            <p className="text-base-content/60 text-lg text-center">
              The free auction platform for fundraisers and charities
            </p>
          </Link>
        </div>

        {/* Right side - Form */}
        <div className="flex-1 lg:w-1/2 bg-base-300 flex flex-col items-center justify-center p-6 sm:p-12">
          {/* Mobile logo */}
          <Link
            href="/"
            className="lg:hidden mb-8 flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="icon-[tabler--gavel] size-8 text-primary"></span>
            <span className="text-xl font-bold text-base-content">Auktiva</span>
          </Link>

          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-base-content">
                Reset your password
              </h2>
              <p className="text-base-content/60 mt-1">
                Enter your new password below
              </p>
            </div>

            {success ? (
              <div className="space-y-6">
                <AlertMessage type="success">
                  Your password has been reset successfully! Redirecting to
                  login...
                </AlertMessage>
                <Link href="/login" className="btn btn-primary w-full">
                  Go to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <AlertMessage type="error">{error}</AlertMessage>}

                <div className="form-control">
                  <label className="label" htmlFor="password">
                    <span className="label-text text-base-content/80">
                      New Password
                    </span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`input input-bordered w-full bg-base-100 ${
                      fieldErrors.password ? "input-error" : ""
                    }`}
                    required
                    minLength={6}
                  />
                  {fieldErrors.password && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {fieldErrors.password}
                      </span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label" htmlFor="confirmPassword">
                    <span className="label-text text-base-content/80">
                      Confirm New Password
                    </span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`input input-bordered w-full bg-base-100 ${
                      fieldErrors.confirmPassword ? "input-error" : ""
                    }`}
                    required
                    minLength={6}
                  />
                  {fieldErrors.confirmPassword && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {fieldErrors.confirmPassword}
                      </span>
                    </label>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  modifier="block"
                  isLoading={isLoading}
                  loadingText="Resetting..."
                >
                  Reset Password
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<
  ResetPasswordPageProps
> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (session) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const token = (context.query.token as string) || null;

  return {
    props: {
      token,
    },
  };
};

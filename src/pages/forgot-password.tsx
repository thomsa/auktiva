import { useState } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AlertMessage, SEO } from "@/components/common";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Forgot Password"
        description="Reset your Auktiva password"
        noindex
      />
      <div className="min-h-screen flex flex-col lg:flex-row bg-base-100">
        {/* Left side - Branding (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-base-200 overflow-hidden items-center justify-center">
          {/* Background effects */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center max-w-lg">
            <Link href="/" className="mb-8 group">
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-base-100 shadow-2xl shadow-primary/10 border border-base-content/5 mb-6 group-hover:scale-105 transition-transform duration-300">
                <span className="icon-[tabler--gavel] size-10 text-primary group-hover:-rotate-12 transition-transform duration-300"></span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                Auktiva
              </h1>
            </Link>

            <h2 className="text-2xl font-bold mb-4">Password Recovery</h2>
            <p className="text-base-content/60 text-lg leading-relaxed">
              Don&apos;t worry, it happens to the best of us. We&apos;ll help
              you get back into your account.
            </p>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="flex-1 lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative bg-base-100">
          <Link
            href="/"
            className="lg:hidden absolute top-8 left-6 flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="icon-[tabler--gavel] size-6 text-primary"></span>
            <span className="text-lg font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Auktiva
            </span>
          </Link>

          <div className="w-full max-w-[400px]">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-base-content mb-2">
                Forgot Password?
              </h2>
              <p className="text-base-content/60">
                Enter your email to receive a reset link
              </p>
            </div>

            {success ? (
              <div className="space-y-6">
                <div className="alert alert-success shadow-lg border-none bg-success/10 text-success-content">
                  <span className="icon-[tabler--mail-check] size-6"></span>
                  <div>
                    <h3 className="font-bold">Check your inbox</h3>
                    <div className="text-sm opacity-90 mt-1">
                      If an account exists, we&apos;ve sent a password reset
                      link.
                    </div>
                  </div>
                </div>

                <p className="text-sm text-base-content/60 bg-base-200/50 p-4 rounded-xl">
                  <span className="font-semibold block mb-1">Note:</span>
                  The link will expire in 10 minutes. If you don&apos;t see the
                  email, check your spam folder.
                </p>

                <Link
                  href="/login"
                  className="btn btn-primary w-full shadow-lg shadow-primary/20"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && <AlertMessage type="error">{error}</AlertMessage>}

                <div className="form-control">
                  <label className="label pl-0" htmlFor="email">
                    <span className="label-text font-medium text-base-content/80">
                      Email Address
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--mail] size-5"></span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="input input-bordered w-full pl-10 bg-base-200/50 focus:bg-base-100 transition-colors"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  modifier="block"
                  isLoading={isLoading}
                  loadingText="Sending..."
                  className="btn-lg text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
                  icon={<span className="icon-[tabler--send] size-5"></span>}
                >
                  Send Reset Link
                </Button>
              </form>
            )}

            <div className="mt-8 text-center">
              <p className="text-sm text-base-content/60">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="link link-primary font-bold hover:text-primary/80 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (session) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      messages,
    },
  };
};

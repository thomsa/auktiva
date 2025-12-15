import { useState } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AlertMessage, SEO } from "@/components/common";
import { Button } from "@/components/ui/button";

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
                Forgot your password?
              </h2>
              <p className="text-base-content/60 mt-1">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            {success ? (
              <div className="space-y-6">
                <AlertMessage type="success">
                  If an account with that email exists, we&apos;ve sent a
                  password reset link. Please check your inbox.
                </AlertMessage>
                <p className="text-sm text-base-content/60">
                  The link will expire in 10 minutes. If you don&apos;t see the
                  email, check your spam folder.
                </p>
                <Link href="/login" className="btn btn-primary w-full">
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && <AlertMessage type="error">{error}</AlertMessage>}

                <div className="form-control">
                  <label className="label" htmlFor="email">
                    <span className="label-text text-base-content/80">
                      Email
                    </span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="input input-bordered w-full bg-base-100"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  modifier="block"
                  isLoading={isLoading}
                  loadingText="Sending..."
                >
                  Send Reset Link
                </Button>
              </form>
            )}

            <div className="divider my-6">or</div>

            <p className="text-center text-sm text-base-content/60">
              Remember your password?{" "}
              <Link href="/login" className="link link-primary font-medium">
                Sign in
              </Link>
            </p>
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

  return {
    props: {},
  };
};

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AlertMessage } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
        } else {
          setError(data.message || "Registration failed");
        }
      } else {
        router.push("/login?registered=true");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
          className="relative z-10 flex flex-col items-center gap-4 hover:opacity-80 transition-opacity"
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
              Create account
            </h2>
            <p className="text-base-content/60 mt-1">
              Join Auktiva to start bidding
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <AlertMessage type="error">{error}</AlertMessage>}

            <div className="form-control">
              <label className="label" htmlFor="name">
                <span className="label-text text-base-content/80">Name</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                className={`input input-bordered w-full bg-base-100 ${
                  fieldErrors.name ? "input-error" : ""
                }`}
                required
              />
              {fieldErrors.name && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {fieldErrors.name}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label" htmlFor="email">
                <span className="label-text text-base-content/80">Email</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className={`input input-bordered w-full bg-base-100 ${
                  fieldErrors.email ? "input-error" : ""
                }`}
                required
              />
              {fieldErrors.email && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {fieldErrors.email}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text text-base-content/80">
                  Password
                </span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
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
                  Confirm Password
                </span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
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
              loadingText="Creating account..."
            >
              Create account
            </Button>
          </form>

          <div className="divider my-6">or</div>

          <p className="text-center text-sm text-base-content/60">
            Already have an account?{" "}
            <Link href="/login" className="link link-primary font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
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

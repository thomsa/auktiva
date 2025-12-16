import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AlertMessage, SEO, pageSEO } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO {...pageSEO.login} />
      <div className="min-h-screen flex flex-col lg:flex-row bg-base-100">
        {/* Left side - Branding (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-base-200 overflow-hidden items-center justify-center">
          {/* Background effects */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
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

            <h2 className="text-2xl font-bold mb-4">Welcome Back!</h2>
            <p className="text-base-content/60 text-lg leading-relaxed">
              The modern, open-source auction platform designed for fundraisers,
              charities, and communities.
            </p>

            <div className="mt-12 grid grid-cols-2 gap-4 w-full">
              <div className="p-4 rounded-2xl bg-base-100/50 backdrop-blur-sm border border-base-content/5">
                <div className="text-2xl font-bold text-primary mb-1">100%</div>
                <div className="text-xs text-base-content/60 font-medium uppercase tracking-wider">
                  Free & Open
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-base-100/50 backdrop-blur-sm border border-base-content/5">
                <div className="text-2xl font-bold text-secondary mb-1">
                  Zero
                </div>
                <div className="text-xs text-base-content/60 font-medium uppercase tracking-wider">
                  Fees
                </div>
              </div>
            </div>
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
                Sign in
              </h2>
              <p className="text-base-content/60">
                Enter your credentials to access your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <AlertMessage type="error">{error}</AlertMessage>}

              {router.query.registered && (
                <AlertMessage type="success">
                  Account created successfully! Please sign in.
                </AlertMessage>
              )}

              <div className="space-y-4">
                <div className="form-control">
                  <label className="label pl-0" htmlFor="email">
                    <span className="label-text font-medium text-base-content/80">
                      Email
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

                <div className="form-control">
                  <label className="label pl-0" htmlFor="password">
                    <span className="label-text font-medium text-base-content/80">
                      Password
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--lock] size-5"></span>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="input input-bordered w-full pl-10 bg-base-200/50 focus:bg-base-100 transition-colors"
                      required
                    />
                  </div>
                  <label className="label pb-0">
                    <Link
                      href="/forgot-password"
                      className="label-text-alt link link-primary hover:text-primary/80 transition-colors ml-auto"
                    >
                      Forgot password?
                    </Link>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                modifier="block"
                isLoading={isLoading}
                loadingText="Signing in..."
                className="btn-lg text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
              >
                Sign in
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-base-content/60">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="link link-primary font-bold hover:text-primary/80 transition-colors"
                >
                  Create one now
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

  return {
    props: {},
  };
};

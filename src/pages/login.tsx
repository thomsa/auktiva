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
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Branding (hidden on mobile) */}
        <div
          className="hidden lg:flex lg:w-1/2 bg-[#fff2d4] items-center justify-center p-12 relative "
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
                Welcome back
              </h2>
              <p className="text-base-content/60 mt-1">
                Sign in to your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <AlertMessage type="error">{error}</AlertMessage>}

              {router.query.registered && (
                <AlertMessage type="success">
                  Account created successfully! Please sign in.
                </AlertMessage>
              )}

              <div className="form-control">
                <label className="label" htmlFor="email">
                  <span className="label-text text-base-content/80">Email</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="input input-bordered w-full bg-base-100"
                  required
                />
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
                  className="input input-bordered w-full bg-base-100"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                modifier="block"
                isLoading={isLoading}
                loadingText="Signing in..."
              >
                Sign in
              </Button>
            </form>

            <div className="divider my-6">or</div>

            <p className="text-center text-sm text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="link link-primary font-medium">
                Create one
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

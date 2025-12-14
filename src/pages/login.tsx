import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AlertMessage } from "@/components/common";
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
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-base-content">
              Welcome back
            </h1>
            <p className="text-base-content/60 mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <AlertMessage type="error">{error}</AlertMessage>
            )}

            {router.query.registered && (
              <AlertMessage type="success">
                Account created successfully! Please sign in.
              </AlertMessage>
            )}

            <div className="form-control">
              <label className="label" htmlFor="email">
                <span className="label-text">Email</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="input input-bordered w-full"
                required
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text">Password</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="input input-bordered w-full"
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

          <div className="divider">or</div>

          <p className="text-center text-sm text-base-content/60">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="link link-primary font-medium">
              Create one
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

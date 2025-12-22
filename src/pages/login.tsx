import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AlertMessage, SEO } from "@/components/common";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

interface LoginPageProps {
  googleOAuthEnabled: boolean;
}

export default function LoginPage({ googleOAuthEnabled }: LoginPageProps) {
  const router = useRouter();
  const t = useTranslations("auth.login");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
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
        setError(tErrors("auth.invalidCredentials"));
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title={t("title")}
        description={tErrors("auth.brandingDescription")}
      />
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
                {tCommon("appName")}
              </h1>
            </Link>

            <h2 className="text-2xl font-bold mb-4">{t("brandingTitle")}</h2>
            <p className="text-base-content/60 text-lg leading-relaxed">
              {t("brandingDescription")}
            </p>

            <div className="mt-12 grid grid-cols-2 gap-4 w-full">
              <div className="p-4 rounded-2xl bg-base-100/50 backdrop-blur-sm border border-base-content/5">
                <div className="text-2xl font-bold text-primary mb-1">100%</div>
                <div className="text-xs text-base-content/60 font-medium uppercase tracking-wider">
                  {t("freeAndOpen")}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-base-100/50 backdrop-blur-sm border border-base-content/5">
                <div className="text-2xl font-bold text-secondary mb-1">
                  {t("zeroFees")}
                </div>
                <div className="text-xs text-base-content/60 font-medium uppercase tracking-wider">
                  {t("fees")}
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
              {tCommon("appName")}
            </span>
          </Link>

          <div className="w-full max-w-[400px]">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-base-content mb-2">
                {t("title")}
              </h2>
              <p className="text-base-content/60">{t("subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <AlertMessage type="error">{error}</AlertMessage>}

              {router.query.registered && (
                <AlertMessage type="success">
                  {t("accountCreatedSuccess")}
                </AlertMessage>
              )}

              <div className="space-y-4">
                <div className="form-control">
                  <label className="label pl-0" htmlFor="email">
                    <span className="label-text font-medium text-base-content/80">
                      {t("email")}
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--mail] size-5"></span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      autoComplete="email"
                      className="input input-bordered w-full pl-10 bg-base-200/50 focus:bg-base-100 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label pl-0" htmlFor="password">
                    <span className="label-text font-medium text-base-content/80">
                      {t("password")}
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--lock] size-5"></span>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder={t("passwordPlaceholder")}
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
                      {t("forgotPassword")}
                    </Link>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                modifier="block"
                isLoading={isLoading}
                loadingText={t("submitting")}
                className="btn-lg text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
              >
                {t("submitButton")}
              </Button>
            </form>

            {googleOAuthEnabled && (
              <>
                <div className="divider my-6 text-base-content/40 text-sm">
                  {t("orContinueWith")}
                </div>
                <GoogleSignInButton />
              </>
            )}

            <div className="mt-8 text-center">
              <p className="text-sm text-base-content/60">
                {t("noAccount")}{" "}
                <Link
                  href="/register"
                  className="link link-primary font-bold hover:text-primary/80 transition-colors"
                >
                  {t("createAccount")}
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

  // Check if Google OAuth is enabled
  const googleOAuthEnabled = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return {
    props: {
      messages,
      googleOAuthEnabled,
    },
  };
};

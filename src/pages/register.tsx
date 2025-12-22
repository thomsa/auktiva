import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import ReCAPTCHA from "react-google-recaptcha";
import { authOptions } from "@/lib/auth";
import { AlertMessage, SEO } from "@/components/common";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

const LazyReCAPTCHA = lazy(() => import("react-google-recaptcha"));

interface RegisterPageProps {
  recaptchaSiteKey: string | null;
  googleOAuthEnabled: boolean;
}

export default function RegisterPage({
  recaptchaSiteKey,
  googleOAuthEnabled,
}: RegisterPageProps) {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(!recaptchaSiteKey);
  const [loadCaptcha, setLoadCaptcha] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Delay loading reCAPTCHA slightly for better UX
  useEffect(() => {
    if (!recaptchaSiteKey) return;

    const timer = setTimeout(() => {
      setLoadCaptcha(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [recaptchaSiteKey]);

  // Handle reCAPTCHA verification
  const handleCaptchaChange = async (token: string | null) => {
    if (!token) {
      setIsVerified(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-recaptcha", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setIsVerified(true);
      } else {
        setIsVerified(false);
        recaptchaRef.current?.reset();
      }
    } catch {
      setIsVerified(false);
      recaptchaRef.current?.reset();
    }
  };

  const handleCaptchaExpired = () => {
    setIsVerified(false);
  };

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
      setFieldErrors({
        confirmPassword: tErrors("validation.passwordsDoNotMatch"),
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setFieldErrors({
        password: tErrors("validation.passwordTooShort", { min: 6 }),
      });
      setIsLoading(false);
      return;
    }

    // Check reCAPTCHA verification status
    if (recaptchaSiteKey && !isVerified) {
      setError(t("recaptchaRequired"));
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
          setError(data.message || t("registrationFailed"));
        }
      } else {
        router.push("/login?registered=true");
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO title={t("title")} description={t("brandingDescription")} />
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
                {tCommon("appName")}
              </h1>
            </Link>

            <h2 className="text-2xl font-bold mb-4">{t("brandingTitle")}</h2>
            <p className="text-base-content/60 text-lg leading-relaxed">
              {t("brandingDescription")}
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
              {tCommon("appName")}
            </span>
          </Link>

          <div className="w-full max-w-[400px]">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-base-content mb-2">
                {t("title")}
              </h2>
              <p className="text-base-content/60">{t("subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <AlertMessage type="error">{error}</AlertMessage>}

              <div className="form-control">
                <label className="label pl-0" htmlFor="name">
                  <span className="label-text font-medium text-base-content/80">
                    {t("fullName")}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--user] size-5"></span>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder={t("fullNamePlaceholder")}
                    autoComplete="name"
                    className={`input input-bordered w-full pl-10 bg-base-200/50 focus:bg-base-100 transition-colors ${
                      fieldErrors.name ? "input-error" : ""
                    }`}
                    required
                  />
                </div>
                {fieldErrors.name && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {fieldErrors.name}
                    </span>
                  </label>
                )}
              </div>

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
                    className={`input input-bordered w-full pl-10 bg-base-200/50 focus:bg-base-100 transition-colors ${
                      fieldErrors.email ? "input-error" : ""
                    }`}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {fieldErrors.email}
                    </span>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      autoComplete="new-password"
                      className={`input input-bordered w-full pl-10 bg-base-200/50 focus:bg-base-100 transition-colors ${
                        fieldErrors.password ? "input-error" : ""
                      }`}
                      required
                      minLength={6}
                    />
                  </div>
                  {fieldErrors.password && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {fieldErrors.password}
                      </span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label pl-0" htmlFor="confirmPassword">
                    <span className="label-text font-medium text-base-content/80">
                      {t("confirmPassword")}
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--lock-check] size-5"></span>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder={t("confirmPasswordPlaceholder")}
                      autoComplete="new-password"
                      className={`input input-bordered w-full pl-10 bg-base-200/50 focus:bg-base-100 transition-colors ${
                        fieldErrors.confirmPassword ? "input-error" : ""
                      }`}
                      required
                      minLength={6}
                    />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {fieldErrors.confirmPassword}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* reCAPTCHA Widget */}
              {recaptchaSiteKey && (
                <div className="flex flex-col items-center my-4">
                  {loadCaptcha ? (
                    <Suspense
                      fallback={
                        <div className="text-base-content/60 text-sm">
                          {t("loadingRecaptcha")}
                        </div>
                      }
                    >
                      <LazyReCAPTCHA
                        sitekey={recaptchaSiteKey}
                        ref={recaptchaRef}
                        onChange={handleCaptchaChange}
                        onExpired={handleCaptchaExpired}
                        theme="light"
                      />
                    </Suspense>
                  ) : (
                    <div className="text-base-content/60 text-sm">
                      {t("preparingRecaptcha")}
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                modifier="block"
                isLoading={isLoading}
                loadingText={t("submitting")}
                disabled={recaptchaSiteKey ? !isVerified : false}
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
                {t("hasAccount")}{" "}
                <Link
                  href="/login"
                  className="link link-primary font-bold hover:text-primary/80 transition-colors"
                >
                  {t("signIn")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<RegisterPageProps> = async (
  context,
) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (session) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  // Pass reCAPTCHA site key to client (null if not configured)
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || null;
  const messages = await getMessages(context.locale as Locale);

  // Check if Google OAuth is enabled
  const googleOAuthEnabled = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return {
    props: {
      recaptchaSiteKey,
      messages,
      googleOAuthEnabled,
    },
  };
};

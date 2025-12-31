import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SEO } from "@/components/common";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

interface VerifyEmailPageProps {
  token: string | null;
}

export default function VerifyEmailPage({ token }: VerifyEmailPageProps) {
  const router = useRouter();
  const t = useTranslations("auth.verifyEmail");
  const tErrors = useTranslations("errors");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifyEmail = useCallback(async () => {
    if (!token) {
      setStatus("error");
      setErrorMessage(tErrors("auth.invalidToken"));
      return;
    }

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.message || tErrors("generic"));
      } else {
        setStatus("success");
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login?verified=true");
        }, 3000);
      }
    } catch {
      setStatus("error");
      setErrorMessage(tErrors("generic"));
    }
  }, [token, router, tErrors]);

  useEffect(() => {
    void verifyEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <SEO title={t("title")} description={t("subtitle")} noindex />
      <div className="min-h-screen flex items-center justify-center bg-base-200 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
        </div>

        <div className="w-full max-w-md text-center p-8 relative z-10">
          {status === "loading" && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              </div>
              <h1 className="text-3xl font-extrabold text-base-content mb-4 tracking-tight">
                {t("verifying")}
              </h1>
              <p className="text-base-content/60 text-lg">{t("pleaseWait")}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
                  <span className="icon-[tabler--check] size-10 text-success"></span>
                </div>
              </div>
              <h1 className="text-3xl font-extrabold text-base-content mb-4 tracking-tight">
                {t("successTitle")}
              </h1>
              <p className="text-base-content/60 mb-2 text-lg">
                {t("successMessage")}
              </p>
              <p className="text-base-content/40 mb-8">{t("redirecting")}</p>
              <Link
                href="/login"
                className="btn btn-primary btn-lg shadow-lg shadow-primary/20"
              >
                {t("signInNow")}
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center animate-pulse">
                  <span className="icon-[tabler--alert-circle] size-10 text-error"></span>
                </div>
              </div>
              <h1 className="text-3xl font-extrabold text-base-content mb-4 tracking-tight">
                {t("errorTitle")}
              </h1>
              <p className="text-base-content/60 mb-8 text-lg">{errorMessage}</p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="btn btn-primary btn-lg w-full shadow-lg shadow-primary/20"
                >
                  {t("backToLogin")}
                </Link>
                <p className="text-base-content/40 text-sm">
                  {t("needNewLink")}{" "}
                  <Link href="/login" className="link link-primary">
                    {t("requestNewLink")}
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<
  VerifyEmailPageProps
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
  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      token,
      messages,
    },
  };
};

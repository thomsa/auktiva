"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function CallToAction() {
  const t = useTranslations("landing.cta");
  const [copied, setCopied] = useState(false);
  const installCommand =
    "curl -fsSL https://raw.githubusercontent.com/thomsa/auktiva/main/scripts/install.sh | bash";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        {/* Main CTA */}
        <div className="relative rounded-[3rem] overflow-hidden bg-primary text-primary-content px-8 py-20 text-center mb-16">
          {/* Background decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-black/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
          </div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-extrabold mb-8 tracking-tight">
              {t("title")}
            </h2>
            <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto font-light">
              {t("description")}
            </p>

            <div className="flex flex-col items-center gap-2">
              <Link
                href="/register"
                className="btn btn-lg bg-white text-primary hover:bg-white/90 border-none shadow-xl h-14 px-8 rounded-full"
              >
                {t("getStarted")}{" "}
                <span className="icon-[tabler--rocket] size-6"></span>
              </Link>
              <p className="text-sm opacity-70">
                {t("freeForever")}
              </p>
            </div>
          </div>
        </div>

        {/* Self-Host Section */}
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            {t("selfHostTitle")}
          </h3>
          <p className="text-base-content/60 mb-8">
            {t("selfHostDescription")}
          </p>

          {/* Terminal mockup */}
          <div className="mockup-code bg-neutral text-neutral-content text-left">
            <pre data-prefix="$" className="flex items-center justify-between">
              <code className="flex-1 overflow-x-auto text-sm">
                {installCommand}
              </code>
              <button
                onClick={handleCopy}
                className="btn btn-ghost btn-sm ml-4 text-neutral-content/70 hover:text-neutral-content"
                aria-label="Copy to clipboard"
              >
                {copied ? (
                  <span className="icon-[tabler--check] size-5 text-success"></span>
                ) : (
                  <span className="icon-[tabler--copy] size-5"></span>
                )}
              </button>
            </pre>
          </div>

          <p className="text-sm text-base-content/50 mt-4">
            {t.rich("seeDocumentation", {
              link: (chunks) => (
                <Link
                  href="https://docs.auktiva.org/developers"
                  className="link link-primary"
                  target="_blank"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
    </section>
  );
}

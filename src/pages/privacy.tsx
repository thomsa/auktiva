import Link from "next/link";
import { GetStaticProps } from "next";
import { SEO, pageSEO } from "@/components/common";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("legal.privacy");
  const tSections = useTranslations("legal.privacy.sections");
  const tCommon = useTranslations("common");

  return (
    <>
      <SEO
        {...pageSEO.privacy}
        title={t("title")}
        description={t("description")}
      />

      <div className="min-h-screen bg-base-100">
        {/* Navigation */}
        <nav className="navbar bg-base-100/80 backdrop-blur-lg sticky top-0 z-50 border-b border-base-200">
          <div className="container mx-auto px-4">
            <div className="flex-1">
              <Link
                href="/"
                className="text-2xl font-bold flex items-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <span className="icon-[tabler--gavel] size-6"></span>
                </div>
                <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {tCommon("appName")}
                </span>
              </Link>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-16 max-w-3xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
              {t("title")}
            </h1>
            <p className="text-base-content/60 text-lg">{t("lastUpdated")}</p>
          </div>

          <div className="space-y-12 prose prose-lg prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary max-w-none">
            {/* Introduction */}
            <section>
              <h2 className="flex items-center gap-3 text-2xl font-bold mb-6">
                <span className="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center text-base-content/70 text-lg">
                  1
                </span>
                {tSections("1.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("1.content")}
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="flex items-center gap-3 text-2xl font-bold mb-6">
                <span className="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center text-base-content/70 text-lg">
                  2
                </span>
                {tSections("2.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-6">
                {tSections("2.content")}
              </p>
              <div className="grid sm:grid-cols-2 gap-4 not-prose">
                <div className="bg-base-200/50 rounded-2xl p-6 border border-base-content/5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <span className="icon-[tabler--user] size-6"></span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">
                    {tSections("2.accountInfo")}
                  </h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {tSections("2.accountInfoDesc")}
                  </p>
                </div>
                <div className="bg-base-200/50 rounded-2xl p-6 border border-base-content/5">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary mb-3">
                    <span className="icon-[tabler--gavel] size-6"></span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">
                    {tSections("2.auctionData")}
                  </h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {tSections("2.auctionDataDesc")}
                  </p>
                </div>
                <div className="bg-base-200/50 rounded-2xl p-6 border border-base-content/5">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-3">
                    <span className="icon-[tabler--photo] size-6"></span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">
                    {tSections("2.uploadedContent")}
                  </h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {tSections("2.uploadedContentDesc")}
                  </p>
                </div>
                <div className="bg-base-200/50 rounded-2xl p-6 border border-base-content/5">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center text-info mb-3">
                    <span className="icon-[tabler--settings] size-6"></span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">
                    {tSections("2.preferences")}
                  </h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {tSections("2.preferencesDesc")}
                  </p>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("3.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("3.content")}
              </p>
              <ul className="list-disc list-inside space-y-2 text-base-content/80">
                <li>{tSections("3.point1")}</li>
                <li>{tSections("3.point2")}</li>
                <li>{tSections("3.point3")}</li>
                <li>{tSections("3.point4")}</li>
                <li>{tSections("3.point5")}</li>
              </ul>
            </section>

            {/* Data Storage */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("4.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("4.content1")}
              </p>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("4.content2")}
              </p>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("5.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("5.content1")}
              </p>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("5.content2")}
              </p>
            </section>

            {/* Third-Party Authentication (Google OAuth) */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("5b.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("5b.content1")}
              </p>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("5b.content2")}
              </p>
            </section>

            {/* Email Communications */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("6.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("6.content1")}
              </p>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("6.content2")}
              </p>
            </section>

            {/* Cookies and Local Storage */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("7.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("7.content")}
              </p>
            </section>

            {/* Open Source Transparency */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("8.title")}
              </h2>
              <p
                className="text-base-content/80 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: tSections.raw("8.content") }}
              />
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("9.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("9.content1")}
              </p>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("9.content2")}
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("10.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("10.content")}
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("11.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("11.content")}
              </p>
            </section>

            {/* Changes to This Policy */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("12.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("12.content")}
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("13.title")}
              </h2>
              <p
                className="text-base-content/80 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: tSections.raw("13.content"),
                }}
              />
            </section>
          </div>

          <div className="mt-12">
            <Link href="/" className="btn btn-ghost">
              <span className="icon-[tabler--arrow-left] size-5"></span>
              {t("backToHome")}
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  const messages = await getMessages(locale as Locale);
  return {
    props: {
      messages,
    },
  };
};

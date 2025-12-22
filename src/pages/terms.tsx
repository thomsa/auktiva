import Link from "next/link";
import { GetStaticProps } from "next";
import { SEO, pageSEO } from "@/components/common";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("legal.terms");
  const tSections = useTranslations("legal.terms.sections");
  const tCommon = useTranslations("common");

  return (
    <>
      <SEO
        {...pageSEO.terms}
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
            {/* Acceptance of Terms */}
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

            {/* What is Auktiva */}
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
              <div className="not-prose bg-warning/10 border border-warning/30 rounded-xl p-5 flex gap-4 items-start">
                <span className="icon-[tabler--alert-triangle] size-6 text-warning mt-0.5 shrink-0"></span>
                <div>
                  <h3 className="font-bold text-warning mb-1">
                    {tSections("2.disclaimerTitle")}
                  </h3>
                  <p
                    className="text-base-content/80 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: tSections.raw("2.disclaimer"),
                    }}
                  />
                </div>
              </div>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="flex items-center gap-3 text-2xl font-bold mb-6">
                <span className="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center text-base-content/70 text-lg">
                  3
                </span>
                {tSections("3.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("3.content1")}
              </p>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("3.content2")}
              </p>
            </section>

            {/* Third-Party Authentication */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("3b.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("3b.content1")}
              </p>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("3b.content2")}
              </p>
            </section>

            {/* Roles and Permissions */}
            <section>
              <h2 className="flex items-center gap-3 text-2xl font-bold mb-6">
                <span className="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center text-base-content/70 text-lg">
                  4
                </span>
                {tSections("4.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-6">
                {tSections("4.content")}
              </p>
              <div className="grid sm:grid-cols-2 gap-4 not-prose">
                <div className="bg-base-200/50 rounded-xl p-5 border border-base-content/5">
                  <div className="badge badge-primary badge-outline mb-2 font-bold">
                    {tSections("4.owner")}
                  </div>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {tSections("4.ownerDesc")}
                  </p>
                </div>
                <div className="bg-base-200/50 rounded-xl p-5 border border-base-content/5">
                  <div className="badge badge-secondary badge-outline mb-2 font-bold">
                    {tSections("4.admin")}
                  </div>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {tSections("4.adminDesc")}
                  </p>
                </div>
                <div className="bg-base-200/50 rounded-xl p-5 border border-base-content/5">
                  <div className="badge badge-accent badge-outline mb-2 font-bold">
                    {tSections("4.creator")}
                  </div>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {tSections("4.creatorDesc")}
                  </p>
                </div>
                <div className="bg-base-200/50 rounded-xl p-5 border border-base-content/5">
                  <div className="badge badge-ghost badge-outline mb-2 font-bold">
                    {tSections("4.bidder")}
                  </div>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    {tSections("4.bidderDesc")}
                  </p>
                </div>
              </div>
            </section>

            {/* Auction Participation */}
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

            {/* Acceptable Use */}
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

            {/* No Payment Processing */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("7.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("7.content1")}
              </p>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("7.content2")}
              </p>
            </section>

            {/* Content Ownership */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("8.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("8.content1")}
              </p>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("8.content2")}
              </p>
            </section>

            {/* Open Source License */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("9.title")}
              </h2>
              <p
                className="text-base-content/80 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: tSections.raw("9.content") }}
              />
            </section>

            {/* Self-Hosting */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("10.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("10.content")}
              </p>
            </section>

            {/* Cloud Hosting */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("11.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                {tSections("11.content1")}
              </p>
              <div className="bg-info/10 border border-info/30 rounded-lg p-4 mb-4">
                <p className="text-base-content/80 text-sm">
                  <strong className="text-info">
                    {tSections("11.commitmentTitle")}
                  </strong>{" "}
                  {tSections("11.commitment")}
                </p>
              </div>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("11.content2")}
              </p>
            </section>

            {/* Disclaimer of Warranties */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("12.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("12.content")}
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("13.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("13.content")}
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("14.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("14.content")}
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("15.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("15.content")}
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("16.title")}
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                {tSections("16.content")}
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                {tSections("17.title")}
              </h2>
              <p
                className="text-base-content/80 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: tSections.raw("17.content"),
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

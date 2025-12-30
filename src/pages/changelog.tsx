import Link from "next/link";
import { GetStaticProps } from "next";
import ReactMarkdown from "react-markdown";
import { SEO } from "@/components/common";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import packageJson from "../../package.json";

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  published_at: string;
  name: string;
  body: string;
}

interface ChangelogPageProps {
  releases: GitHubRelease[];
  currentVersion: string;
}

export default function ChangelogPage({
  releases,
  currentVersion,
}: ChangelogPageProps) {
  const t = useTranslations("changelog");
  const tCommon = useTranslations("common");

  const latestRelease = releases[0];
  const previousReleases = releases.slice(1);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <SEO title={t("title")} description={t("description")} />

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
            <p className="text-base-content/60 text-lg mb-4">
              {t("description")}
            </p>
            <div className="badge badge-primary badge-lg">
              {t("currentVersion")}: v{currentVersion}
            </div>
          </div>

          {releases.length === 0 ? (
            <div className="text-center py-12">
              <span className="icon-[tabler--package] size-16 text-base-content/30 mb-4"></span>
              <p className="text-base-content/60">{t("noReleases")}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Latest Release - Featured */}
              {latestRelease && (
                <div className="card bg-linear-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 shadow-xl">
                  <div className="card-body">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="badge badge-primary badge-lg">
                        {t("latest")}
                      </span>
                      <span className="text-2xl font-bold">
                        {latestRelease.tag_name}
                      </span>
                      {latestRelease.tag_name.replace(/^v/, "") ===
                        currentVersion && (
                        <span className="badge badge-success badge-sm">
                          {t("installed")}
                        </span>
                      )}
                    </div>

                    <h2 className="card-title text-xl mb-2">
                      {latestRelease.name || latestRelease.tag_name}
                    </h2>

                    <p className="text-base-content/60 text-sm mb-4">
                      {t("releasedOn")} {formatDate(latestRelease.published_at)}
                    </p>

                    {latestRelease.body && (
                      <div className="prose prose-sm max-w-none text-base-content/80 prose-headings:text-base-content prose-headings:font-semibold prose-h2:text-lg prose-h3:text-base prose-li:my-0 prose-ul:my-2 prose-p:my-1">
                        <ReactMarkdown>{latestRelease.body}</ReactMarkdown>
                      </div>
                    )}

                    <div className="card-actions justify-end mt-4">
                      <a
                        href={latestRelease.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm gap-2"
                      >
                        <span className="icon-[tabler--brand-github] size-4"></span>
                        {t("viewOnGitHub")}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Releases - Accordion */}
              {previousReleases.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-base-content/70">
                    {t("previousReleases")}
                  </h3>

                  <div className="space-y-2">
                    {previousReleases.map((release) => (
                      <div
                        key={release.tag_name}
                        className="collapse collapse-arrow bg-base-200/50 rounded-lg"
                      >
                        <input type="checkbox" />
                        <div className="collapse-title flex items-center gap-3">
                          <span className="font-mono font-semibold text-sm">
                            {release.tag_name}
                          </span>
                          <span className="text-base-content/50 text-xs">
                            {release.name && release.name !== release.tag_name
                              ? `— ${release.name}`
                              : ""}
                          </span>
                          <span className="text-base-content/40 text-xs ml-auto mr-6">
                            {formatDate(release.published_at)}
                          </span>
                        </div>
                        <div className="collapse-content">
                          {release.body ? (
                            <div className="prose prose-sm max-w-none text-base-content/70 prose-headings:text-base-content prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm prose-li:my-0 prose-ul:my-1 prose-p:my-1">
                              <ReactMarkdown>{release.body}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-base-content/50 text-sm italic">
                              {t("noReleaseNotes")}
                            </p>
                          )}
                          <div className="mt-4">
                            <a
                              href={release.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-xs gap-1"
                            >
                              <span className="icon-[tabler--external-link] size-3"></span>
                              {t("viewOnGitHub")}
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Back to home */}
          <div className="mt-16 text-center">
            <Link href="/" className="btn btn-ghost gap-2">
              <span className="icon-[tabler--arrow-left] size-5"></span>
              {t("backToHome")}
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<ChangelogPageProps> = async ({
  locale,
}) => {
  const messages = await getMessages(locale as Locale);

  let releases: GitHubRelease[] = [];

  try {
    const response = await fetch(
      "https://api.github.com/repos/thomsa/auktiva/releases?per_page=20",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Auktiva-Changelog",
        },
      },
    );

    if (response.ok) {
      releases = await response.json();
    }
  } catch (error) {
    console.error("Failed to fetch releases:", error);
  }

  return {
    props: {
      messages,
      releases,
      currentVersion: packageJson.version,
    },
    // Revalidate every hour
    revalidate: 3600,
  };
};

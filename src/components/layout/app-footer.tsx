import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import packageJson from "../../../package.json";

export function AppFooter() {
  const t = useTranslations();
  const { data: session } = useSession();
  const currentYear = new Date().getFullYear();

  // Only show on logged-in pages
  if (!session) return null;

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-base-100/80 backdrop-blur-sm border-t border-base-300 py-1.5 px-4 z-40">
      <div className="container mx-auto flex items-center justify-between text-xs text-base-content/50">
        <div className="flex items-center gap-2">
          <span className="font-mono">v{packageJson.version}</span>
          <span>
            © {currentYear} {t("common.appName")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="https://docs.auktiva.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            {t("nav.docs")}
          </Link>
          <Link
            href="https://github.com/thomsa/auktiva/issues/new/choose"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            {t("footer.reportIssue")}
          </Link>
        </div>
      </div>
    </footer>
  );
}

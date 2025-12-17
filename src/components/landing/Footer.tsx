import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations();
  return (
    <footer className="bg-base-100 border-t border-base-content/10 pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <span className="icon-[tabler--gavel] size-8 text-primary"></span>
              <span className="text-2xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                {t("common.appName")}
              </span>
            </Link>
            <p className="text-base-content/60 max-w-md mb-8">
              {t("footer.description")}
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/thomsa/auktiva"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-circle hover:bg-base-content/5"
              >
                <span className="icon-[tabler--brand-github] size-6"></span>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-lg">{t("footer.resources")}</h4>
            <ul className="space-y-4 text-base-content/60">
              <li>
                <Link
                  href="https://docs.auktiva.org"
                  className="hover:text-primary transition-colors"
                  target="_blank"
                >
                  {t("nav.documentation")}
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/thomsa/auktiva"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.github")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-lg">{t("footer.legal")}</h4>
            <ul className="space-y-4 text-base-content/60">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.termsOfService")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-base-content/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-base-content/40">
          <p>
            © {new Date().getFullYear()} {t("common.appName")}.{" "}
            {t("footer.allRightsReserved")}
          </p>
          <p>
            {t("footer.designedBy")}{" "}
            <a
              href="https://tamaslorincz.com"
              className="text-base-content/60 hover:text-primary transition-colors"
            >
              Tamas Lorincz
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

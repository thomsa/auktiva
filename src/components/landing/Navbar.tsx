import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslations } from "next-intl";

export function Navbar() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // This is an intentional hydration pattern to prevent SSR mismatch
    setMounted(true); // eslint-disable-line
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-base-100/80 backdrop-blur-lg border-b border-base-200 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold text-primary flex items-center gap-2 group"
        >
          <div className="relative">
            <span className="icon-[tabler--gavel] size-8 transition-transform group-hover:-rotate-12 duration-300"></span>
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
          <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent font-extrabold tracking-tight">
            {tCommon("appName")}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-6 text-sm font-medium text-base-content/80">
            <Link
              href="#features"
              className="hover:text-primary transition-colors"
            >
              {t("features")}
            </Link>
            <Link
              href="#how-it-works"
              className="hover:text-primary transition-colors"
            >
              {t("howItWorks")}
            </Link>
            <a
              href="https://docs.auktiva.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              {t("docs")}
            </a>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-base-content/10">
            <LanguageSwitcher compact />
            {mounted && (
              <button
                onClick={toggleTheme}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Toggle theme"
              >
                {resolvedTheme === "dark" ? (
                  <span className="icon-[tabler--sun] size-5"></span>
                ) : (
                  <span className="icon-[tabler--moon] size-5"></span>
                )}
              </button>
            )}
            <Link
              href="/login"
              className="btn btn-ghost btn-sm hover:bg-base-content/5"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/register"
              className="btn btn-primary btn-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
            >
              {t("getStarted")}
            </Link>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <LanguageSwitcher compact />
          {mounted && (
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <span className="icon-[tabler--sun] size-5"></span>
              ) : (
                <span className="icon-[tabler--moon] size-5"></span>
              )}
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <span className="icon-[tabler--x] size-6"></span>
            ) : (
              <span className="icon-[tabler--menu-2] size-6"></span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-base-100/95 backdrop-blur-lg border-b border-base-content/10 shadow-lg">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <Link
              href="#features"
              onClick={closeMobileMenu}
              className="btn btn-ghost justify-start"
            >
              {t("features")}
            </Link>
            <Link
              href="#how-it-works"
              onClick={closeMobileMenu}
              className="btn btn-ghost justify-start"
            >
              {t("howItWorks")}
            </Link>
            <a
              href="https://docs.auktiva.org"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost justify-start"
            >
              {t("docs")}
            </a>
            <div className="divider my-1"></div>
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className="btn btn-ghost justify-start"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/register"
              onClick={closeMobileMenu}
              className="btn btn-primary"
            >
              {t("getStarted")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

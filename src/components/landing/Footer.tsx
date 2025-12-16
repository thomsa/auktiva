import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-base-100 border-t border-base-content/10 pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <span className="icon-[tabler--gavel] size-8 text-primary"></span>
              <span className="text-2xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                Auktiva
              </span>
            </Link>
            <p className="text-base-content/60 max-w-md mb-8">
              A free, open-source auction platform designed for fundraisers,
              charities, and communities. Built with modern tech for modern
              events.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/thomsa/auktiva"
                className="btn btn-ghost btn-circle hover:bg-base-content/5"
              >
                <span className="icon-[tabler--brand-github] size-6"></span>
              </a>
              <a
                href="https://twitter.com"
                className="btn btn-ghost btn-circle hover:bg-base-content/5"
              >
                <span className="icon-[tabler--brand-twitter] size-6"></span>
              </a>
              <a
                href="https://discord.com"
                className="btn btn-ghost btn-circle hover:bg-base-content/5"
              >
                <span className="icon-[tabler--brand-discord] size-6"></span>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-lg">Product</h4>
            <ul className="space-y-4 text-base-content/60">
              <li>
                <Link
                  href="/features"
                  className="hover:text-primary transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-primary transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.auktiva.org"
                  className="hover:text-primary transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/showcase"
                  className="hover:text-primary transition-colors"
                >
                  Showcase
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-lg">Legal</h4>
            <ul className="space-y-4 text-base-content/60">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-primary transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/license"
                  className="hover:text-primary transition-colors"
                >
                  MIT License
                </Link>
              </li>
              <li>
                <Link
                  href="/security"
                  className="hover:text-primary transition-colors"
                >
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-base-content/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-base-content/40">
          <p>© {new Date().getFullYear()} Auktiva. All rights reserved.</p>
          <p>
            Designed & Built by{" "}
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

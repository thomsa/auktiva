import { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Head from "next/head";
import Link from "next/link";

const SITE_URL = "https://auktiva.org";
const SITE_NAME = "Auktiva";
const SITE_DESCRIPTION =
  "Free, open-source auction platform for fundraisers, charities, and internal events. Host private auctions without payment processing - everything settles offline.";

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  return savedTheme || (systemPrefersDark ? "dark" : "light");
}

export default function LandingPage() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    // Sync the data-theme attribute with the current theme state
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>
          Auktiva - Open Source Auction Platform for Fundraisers & Charities
        </title>
        <meta
          name="title"
          content="Auktiva - Open Source Auction Platform for Fundraisers & Charities"
        />
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta
          name="keywords"
          content="auction platform, fundraiser auction, charity auction, silent auction, open source auction, internal auction, event auction, nonprofit auction, free auction software"
        />
        <meta name="author" content="Tamas Lorincz" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />
        <link rel="canonical" href={SITE_URL} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta
          property="og:title"
          content="Auktiva - Open Source Auction Platform for Fundraisers & Charities"
        />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="en_US" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={SITE_URL} />
        <meta
          name="twitter:title"
          content="Auktiva - Open Source Auction Platform for Fundraisers & Charities"
        />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#6366f1" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Auktiva",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              description: SITE_DESCRIPTION,
              url: SITE_URL,
              author: {
                "@type": "Person",
                name: "Tamas Lorincz",
                url: "https://www.tamaslorincz.com",
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-full bg-base-100">
        {/* Navigation */}
        <nav className="bg-base-100/80 backdrop-blur-lg sticky top-0 z-50 border-b border-base-200">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl font-bold text-primary flex items-center gap-2"
            >
              <span className="icon-[tabler--gavel] size-7"></span>
              Auktiva
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <span className="icon-[tabler--moon] size-5"></span>
                ) : (
                  <span className="icon-[tabler--sun] size-5"></span>
                )}
              </button>
              <a
                href="https://github.com/thomsa/auktiva"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
              >
                <span className="icon-[tabler--brand-github] size-5"></span>
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <Link href="/login" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10"></div>
          <div className="container mx-auto px-4 py-20 lg:py-32 relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="badge badge-primary badge-outline mb-6">
                <span className="icon-[tabler--sparkles] size-4 mr-1"></span>
                100% Free & Open Source
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                The Auction Platform for{" "}
                <span className="text-primary">Fundraisers</span> &{" "}
                <span className="text-secondary">Charities</span>
              </h1>
              <p className="text-lg md:text-xl text-base-content/70 mb-8 max-w-2xl mx-auto">
                Host private auctions for your organization without the
                complexity of payment processing. Perfect for company events,
                charity fundraisers, and community gatherings.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register" className="btn btn-primary btn-lg">
                  <span className="icon-[tabler--rocket] size-5"></span>
                  Start Free Auction
                </Link>
                <a
                  href="https://github.com/thomsa/auktiva"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-lg"
                >
                  <span className="icon-[tabler--brand-github] size-5"></span>
                  Self-Host It
                </a>
              </div>
              <p className="text-sm text-base-content/50 mt-4">
                No credit card required • No payment fees • Your data, your
                control
              </p>
              <Link
                href="https://docs.auktiva.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
              >
                <span className="icon-[tabler--book] size-4"></span>
                Read the documentation
              </Link>
            </div>
          </div>
        </section>

        {/* What is Auktiva */}
        <section className="py-20 bg-base-200/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                What is Auktiva?
              </h2>
              <p className="text-lg text-base-content/70">
                Auktiva is not a traditional marketplace. It&apos;s a tool
                designed specifically for organizations that want to run
                internal auctions where payments and item exchanges happen
                offline, in person.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <span className="icon-[tabler--heart-handshake] size-8 text-primary"></span>
                  </div>
                  <h3 className="card-title">Charity Events</h3>
                  <p className="text-base-content/70">
                    Run silent auctions for nonprofit fundraisers. Let donors
                    bid on items and settle payments directly.
                  </p>
                </div>
              </div>
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                    <span className="icon-[tabler--building] size-8 text-secondary"></span>
                  </div>
                  <h3 className="card-title">Company Auctions</h3>
                  <p className="text-base-content/70">
                    Internal company events, team fundraisers, or employee
                    appreciation auctions made simple.
                  </p>
                </div>
              </div>
              <div className="card bg-base-100 shadow-lg">
                <div className="card-body items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                    <span className="icon-[tabler--users-group] size-8 text-accent"></span>
                  </div>
                  <h3 className="card-title">Community Groups</h3>
                  <p className="text-base-content/70">
                    Schools, clubs, churches, and community organizations can
                    easily organize auction events.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need
              </h2>
              <p className="text-lg text-base-content/70">
                Simple yet powerful features to run successful auctions
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                {
                  icon: "icon-[tabler--lock]",
                  title: "Private Auctions",
                  description:
                    "Invite-only auctions with role-based access control. Keep your events exclusive.",
                },
                {
                  icon: "icon-[tabler--photo]",
                  title: "Image Uploads",
                  description:
                    "Add photos to your auction items. Supports local storage or S3-compatible providers.",
                },
                {
                  icon: "icon-[tabler--clock]",
                  title: "Real-time Bidding",
                  description:
                    "Live bid updates so participants never miss the action. Set end times per item or auction.",
                },
                {
                  icon: "icon-[tabler--users]",
                  title: "Member Management",
                  description:
                    "Invite members via email or shareable links. Assign roles: Owner, Admin, Creator, Bidder.",
                },
                {
                  icon: "icon-[tabler--currency-dollar]",
                  title: "Multi-Currency",
                  description:
                    "Support for multiple currencies. Perfect for international organizations.",
                },
                {
                  icon: "icon-[tabler--bell]",
                  title: "Notifications",
                  description:
                    "Get notified when you're outbid or when auctions are ending soon.",
                },
                {
                  icon: "icon-[tabler--eye]",
                  title: "Bidder Privacy",
                  description:
                    "Choose whether bidders are visible or anonymous. Per-auction or per-item settings.",
                },
                {
                  icon: "icon-[tabler--device-mobile]",
                  title: "Mobile Friendly",
                  description:
                    "Fully responsive design. Bid from any device at your event.",
                },
                {
                  icon: "icon-[tabler--code]",
                  title: "Open Source",
                  description:
                    "MIT licensed. Self-host it, modify it, contribute to it. Your data stays yours.",
                },
              ].map((feature, index) => (
                <div key={index} className="flex gap-4 p-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span
                      className={`${feature.icon} size-6 text-primary`}
                    ></span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-base-content/70">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-base-200/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-lg text-base-content/70">
                Get your auction running in minutes
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-4 gap-8">
                {[
                  {
                    step: "1",
                    title: "Create Auction",
                    desc: "Set up your auction with a name, description, and end date",
                  },
                  {
                    step: "2",
                    title: "Add Items",
                    desc: "Upload items with photos, descriptions, and starting bids",
                  },
                  {
                    step: "3",
                    title: "Invite Members",
                    desc: "Send invites via email or share a join link",
                  },
                  {
                    step: "4",
                    title: "Start Bidding",
                    desc: "Members bid in real-time. Winners settle offline",
                  },
                ].map((item, index) => (
                  <div key={index} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-content font-bold text-xl flex items-center justify-center mx-auto mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-base-content/70">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Self-Host Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body p-8 md:p-12">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1">
                      <div className="badge badge-primary badge-outline mb-4">
                        <span className="icon-[tabler--server] size-4 mr-1"></span>
                        Self-Hosted Option
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-base-content">
                        Host It Yourself
                      </h2>
                      <p className="text-base-content/70 mb-6">
                        Auktiva is fully open source. Clone the repository,
                        configure your environment, and run it on your own
                        infrastructure. Perfect for organizations with strict
                        data privacy requirements.
                      </p>
                      <div className="mockup-code bg-neutral text-neutral-content text-sm mb-6 overflow-x-auto">
                        <pre
                          data-prefix="$"
                          className="whitespace-pre-wrap break-all"
                        >
                          <code>curl -fsSL https://get.auktiva.org | bash</code>
                        </pre>
                      </div>
                      <a
                        href="https://github.com/thomsa/auktiva"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                      >
                        <span className="icon-[tabler--brand-github] size-5"></span>
                        View on GitHub
                      </a>
                    </div>
                    <div className="shrink-0">
                      <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="icon-[tabler--brand-open-source] size-16 text-primary"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-content">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Run Your Auction?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Join organizations already using Auktiva for their fundraising
              events. It&apos;s free, it&apos;s open source, and it just works.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="btn btn-secondary btn-lg">
                <span className="icon-[tabler--rocket] size-5"></span>
                Create Free Account
              </Link>
              <a
                href="https://github.com/thomsa/auktiva"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline border-primary-content text-primary-content hover:bg-primary-content hover:text-primary btn-lg"
              >
                <span className="icon-[tabler--download] size-5"></span>
                Download & Self-Host
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-base-200 py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div className="md:col-span-2">
                <Link
                  href="/"
                  className="text-2xl font-bold text-primary flex items-center gap-2 mb-4"
                >
                  <span className="icon-[tabler--gavel] size-7"></span>
                  Auktiva
                </Link>
                <p className="text-base-content/70 mb-4 max-w-md">
                  Free, open-source auction platform for fundraisers, charities,
                  and internal events. No payment processing, no fees, no
                  complexity.
                </p>
                <div className="flex gap-2">
                  <a
                    href="https://github.com/thomsa/auktiva"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm btn-square"
                    aria-label="GitHub"
                  >
                    <span className="icon-[tabler--brand-github] size-5"></span>
                  </a>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-base-content/70">
                  <li>
                    <Link
                      href="/register"
                      className="hover:text-primary transition-colors"
                    >
                      Get Started
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login"
                      className="hover:text-primary transition-colors"
                    >
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://github.com/thomsa/auktiva"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/thomsa/auktiva/issues/new/choose"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      Report Issue
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://docs.auktiva.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      Documentation
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-base-content/70">
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
                    <a
                      href="https://github.com/thomsa/auktiva/blob/main/LICENSE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      MIT License
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-base-300 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-base-content/60">
                © {new Date().getFullYear()} Auktiva. Open source under MIT
                License.
              </p>
              <p className="text-sm text-base-content/60">
                Created by{" "}
                <a
                  href="https://www.tamaslorincz.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Tamas Lorincz
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  // If logged in, redirect to dashboard
  if (session) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  // Show landing page for non-authenticated users
  return {
    props: {},
  };
};

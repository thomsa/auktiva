import Link from "next/link";
import { GetStaticProps } from "next";
import { SEO, pageSEO } from "@/components/common";
import { getMessages, Locale } from "@/i18n";

export default function PrivacyPage() {
  return (
    <>
      <SEO {...pageSEO.privacy} />

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
                  Auktiva
                </span>
              </Link>
            </div>
            <Link href="/" className="btn btn-ghost btn-sm">
              Back to Home
            </Link>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-16 max-w-3xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-base-content/60 text-lg">
              Last updated: December 15, 2025
            </p>
          </div>

          <div className="space-y-12 prose prose-lg prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary max-w-none">
            {/* Introduction */}
            <section>
              <h2 className="flex items-center gap-3 text-2xl font-bold mb-6">
                <span className="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center text-base-content/70 text-lg">
                  1
                </span>
                Introduction
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                Auktiva (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
                committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, and safeguard your information
                when you use our free, open-source auction platform for
                fundraisers, charities, and internal events.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="flex items-center gap-3 text-2xl font-bold mb-6">
                <span className="w-8 h-8 rounded-lg bg-base-200 flex items-center justify-center text-base-content/70 text-lg">
                  2
                </span>
                Information We Collect
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-6">
                We collect information you provide directly to us when you use
                Auktiva:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 not-prose">
                <div className="bg-base-200/50 rounded-2xl p-6 border border-base-content/5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <span className="icon-[tabler--user] size-6"></span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">
                    Account Information
                  </h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    Your name, email address, and password when you create an
                    account.
                  </p>
                </div>
                <div className="bg-base-200/50 rounded-2xl p-6 border border-base-content/5">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary mb-3">
                    <span className="icon-[tabler--gavel] size-6"></span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Auction Data</h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    Information about auctions you create or join, items you
                    list, bids you place, and your membership roles.
                  </p>
                </div>
                <div className="bg-base-200/50 rounded-2xl p-6 border border-base-content/5">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-3">
                    <span className="icon-[tabler--photo] size-6"></span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Uploaded Content</h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    Images and descriptions you upload for auction items and
                    auction thumbnails.
                  </p>
                </div>
                <div className="bg-base-200/50 rounded-2xl p-6 border border-base-content/5">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center text-info mb-3">
                    <span className="icon-[tabler--settings] size-6"></span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Preferences</h3>
                  <p className="text-base-content/70 text-sm leading-relaxed">
                    Your email notification settings and theme preferences.
                  </p>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                How We Use Your Information
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                We use the information we collect to provide and improve our
                auction services:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base-content/80">
                <li>
                  Process your auction activities, bids, and membership roles
                </li>
                <li>
                  Display real-time bid updates and auction status to
                  participants
                </li>
                <li>
                  Send you email notifications about auction activity when you
                  opt in
                </li>
                <li>Generate auction results and allow you to export data</li>
                <li>Respond to your questions and provide support</li>
              </ul>
            </section>

            {/* Data Storage */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Data Storage
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                If you use the hosted version at auktiva.org, your data is
                stored securely using industry-standard infrastructure. Database
                information is stored using Turso (distributed SQLite), and
                uploaded images are stored using S3-compatible cloud storage.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                If you choose to self-host Auktiva, you are responsible for your
                own data storage and security. Self-hosted instances can use
                local SQLite databases and local filesystem storage for complete
                control over your data.
              </p>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Data Sharing
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                We do not sell, trade, or otherwise transfer your personal
                information to third parties. Your auction data is only visible
                to members of the auctions you participate in, according to the
                privacy settings configured by each auction owner.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                Auction owners can configure privacy settings including
                anonymous bidding to hide bidder identities, invite-only access
                restrictions, and role-based permissions to control what each
                member can see and do.
              </p>
            </section>

            {/* Email Communications */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Email Communications
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                We may send you emails for welcome messages when you register,
                auction invitations when someone invites you to participate,
                outbid notifications when another user places a higher bid, and
                new item notifications for auctions you&apos;ve joined.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                You can manage your email preferences in your account settings
                at any time. Notifications for outbids and new items are
                disabled by default to respect your inbox.
              </p>
            </section>

            {/* Cookies and Local Storage */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Cookies and Local Storage
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                We use browser local storage to remember your theme preference
                (light or dark mode) and to maintain your session
                authentication. We do not use third-party tracking cookies or
                analytics services that track your behavior across websites.
              </p>
            </section>

            {/* Open Source Transparency */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Open Source Transparency
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                Auktiva is 100% open source software released under the MIT
                License. You can review our complete codebase on{" "}
                <a
                  href="https://github.com/thomsa/auktiva"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub
                </a>{" "}
                to see exactly how we collect, store, and handle your data. You
                can also self-host Auktiva for complete control over your
                information.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Your Rights
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                You have the right to access your personal data through your
                account settings, correct inaccurate information by updating
                your profile, request deletion of your account and associated
                data, export your auction data in JSON or CSV format, and manage
                your email notification preferences.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                To exercise any of these rights, visit your account settings or
                contact us through the channels listed below.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Data Retention
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                We retain your data for as long as your account is active.
                Auction data is retained until the auction owner deletes the
                auction. You may request deletion of your account at any time,
                and we will remove your personal information from our systems.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Children&apos;s Privacy
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                Auktiva is not intended for users under 18 years of age. We do
                not knowingly collect personal information from children under
                18. If you believe we have collected information from a child,
                please contact us immediately.
              </p>
            </section>

            {/* Changes to This Policy */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Changes to This Policy
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                We may update this Privacy Policy from time to time. When we
                make changes, we will post the new Privacy Policy on this page
                and update the &quot;Last updated&quot; date at the top. We
                encourage you to review this policy periodically.
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Contact Us
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                If you have questions about this Privacy Policy or how we handle
                your data, please reach out through our{" "}
                <a
                  href="https://github.com/thomsa/auktiva/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub Issues
                </a>{" "}
                or contact the project maintainer at{" "}
                <a
                  href="https://www.tamaslorincz.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  tamaslorincz.com
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-12">
            <Link href="/" className="btn btn-ghost">
              <span className="icon-[tabler--arrow-left] size-5"></span>
              Back to Home
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

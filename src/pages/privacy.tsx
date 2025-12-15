import Link from "next/link";
import { SEO, pageSEO } from "@/components/common";

export default function PrivacyPage() {
  return (
    <>
      <SEO {...pageSEO.privacy} />

      <div className="min-h-screen bg-base-100">
        {/* Navigation */}
        <nav className="navbar bg-base-100 border-b border-base-200">
          <div className="container mx-auto px-4">
            <div className="flex-1">
              <Link
                href="/"
                className="text-2xl font-bold text-primary flex items-center gap-2"
              >
                <span className="icon-[tabler--gavel] size-7"></span>
                Auktiva
              </Link>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-12 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-base-content/60 mb-8">
            Last updated: December 15, 2025
          </p>

          <div className="space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
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
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Information We Collect
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                We collect information you provide directly to us when you use
                Auktiva:
              </p>
              <div className="space-y-3">
                <div className="bg-base-200 rounded-lg p-4">
                  <h3 className="font-medium text-base-content mb-1">
                    Account Information
                  </h3>
                  <p className="text-base-content/70 text-sm">
                    Your name, email address, and password when you create an
                    account.
                  </p>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <h3 className="font-medium text-base-content mb-1">
                    Auction Data
                  </h3>
                  <p className="text-base-content/70 text-sm">
                    Information about auctions you create or join, items you
                    list, bids you place, and your membership roles.
                  </p>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <h3 className="font-medium text-base-content mb-1">
                    Uploaded Content
                  </h3>
                  <p className="text-base-content/70 text-sm">
                    Images and descriptions you upload for auction items and
                    auction thumbnails.
                  </p>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <h3 className="font-medium text-base-content mb-1">
                    Preferences
                  </h3>
                  <p className="text-base-content/70 text-sm">
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

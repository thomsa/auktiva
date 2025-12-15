import Link from "next/link";
import { SEO, pageSEO } from "@/components/common";

export default function TermsPage() {
  return (
    <>
      <SEO {...pageSEO.terms} />

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
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-base-content/60 mb-8">
            Last updated: December 15, 2025
          </p>

          <div className="space-y-8">
            {/* Acceptance of Terms */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Acceptance of Terms
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                By accessing or using Auktiva, you agree to be bound by these
                Terms of Service. If you do not agree to these terms, please do
                not use our service. These terms apply to all users of the
                platform, whether using the hosted version or a self-hosted
                instance.
              </p>
            </section>

            {/* What is Auktiva */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                What is Auktiva
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                Auktiva is a free, open-source auction platform designed for
                fundraisers, charities, schools, churches, company events, and
                community organizations. The platform enables you to create and
                manage auctions, invite participants, and facilitate real-time
                bidding.
              </p>
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <p className="text-base-content/80 text-sm">
                  <strong className="text-warning">Important:</strong> Auktiva
                  facilitates bidding but does not process payments. All
                  transactions are settled offline between participants. We are
                  not a marketplace or payment processor.
                </p>
              </div>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                User Accounts
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                To use Auktiva, you must create an account with accurate
                information including your name, email address, and a secure
                password. You are responsible for maintaining the security of
                your account credentials and should not share your account with
                others.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                You must be at least 18 years old or have parental consent to
                use Auktiva. Please keep your account information up to date to
                ensure you receive important notifications about your auctions.
              </p>
            </section>

            {/* Roles and Permissions */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Roles and Permissions
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                Auctions use a role-based permission system to control what each
                member can do. Auction owners are responsible for managing their
                members and resolving any disputes within their auctions.
              </p>
              <div className="space-y-3">
                <div className="bg-base-200 rounded-lg p-4">
                  <h3 className="font-medium text-base-content mb-1">Owner</h3>
                  <p className="text-base-content/70 text-sm">
                    Full control over the auction including settings, members,
                    items, and deletion.
                  </p>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <h3 className="font-medium text-base-content mb-1">Admin</h3>
                  <p className="text-base-content/70 text-sm">
                    Can manage members, add and edit items, and modify auction
                    settings.
                  </p>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <h3 className="font-medium text-base-content mb-1">
                    Creator
                  </h3>
                  <p className="text-base-content/70 text-sm">
                    Can add new items and edit their own items in the auction.
                  </p>
                </div>
                <div className="bg-base-200 rounded-lg p-4">
                  <h3 className="font-medium text-base-content mb-1">Bidder</h3>
                  <p className="text-base-content/70 text-sm">
                    Can view items and place bids in the auction.
                  </p>
                </div>
              </div>
            </section>

            {/* Auction Participation */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Auction Participation
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                When participating in auctions, you agree to honor your winning
                bids and complete transactions offline with the item seller. You
                should provide accurate descriptions for any items you list and
                respect the auction end times and bidding rules set by the
                auction owner.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                Each auction may have its own specific rules determined by the
                owner. Make sure to review any auction-specific guidelines
                before participating.
              </p>
            </section>

            {/* Acceptable Use */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Acceptable Use
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                You agree to use Auktiva responsibly and legally. You must not
                use the service for illegal purposes, post fraudulent or
                misleading items, or engage in bid manipulation such as shill
                bidding.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                Harassment, abuse, or threats toward other users are strictly
                prohibited. You must not attempt to gain unauthorized access to
                the system, use automated bots or scripts, or upload malicious
                content that could compromise the platform or other users.
              </p>
            </section>

            {/* No Payment Processing */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                No Payment Processing
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                Auktiva does not process payments, collect payment information,
                or facilitate financial transactions of any kind. Winning
                bidders and item sellers are solely responsible for arranging
                payment methods, completing the exchange of items, and resolving
                any disputes that arise.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                Auktiva is not liable for any disputes, losses, or damages
                arising from offline transactions between users. We recommend
                discussing payment and pickup arrangements before the auction
                ends.
              </p>
            </section>

            {/* Content Ownership */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Content Ownership
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                You retain ownership of all content you upload to Auktiva,
                including item images and descriptions. By uploading content,
                you grant Auktiva a non-exclusive, royalty-free license to
                display that content to auction participants for the purpose of
                operating the service.
              </p>
              <p className="text-base-content/80 leading-relaxed">
                You represent that you have the right to upload any content you
                submit and that it does not infringe on any third-party rights
                including copyrights, trademarks, or privacy rights.
              </p>
            </section>

            {/* Open Source License */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Open Source License
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                Auktiva is open source software released under the MIT License.
                You may use, modify, and distribute the software according to
                the terms of that license. The complete source code is available
                on{" "}
                <a
                  href="https://github.com/thomsa/auktiva"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub
                </a>
                , and you can review our{" "}
                <a
                  href="https://github.com/thomsa/auktiva/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  LICENSE file
                </a>{" "}
                for complete details.
              </p>
            </section>

            {/* Self-Hosting */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Self-Hosting
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                You may self-host Auktiva on your own infrastructure. When
                self-hosting, you are solely responsible for server security and
                maintenance, data backup and protection, compliance with
                applicable laws in your jurisdiction, and providing user support
                and dispute resolution for your users.
              </p>
            </section>

            {/* Cloud Hosting */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Cloud Hosting at auktiva.org
              </h2>
              <p className="text-base-content/80 leading-relaxed mb-4">
                The hosted version at auktiva.org is provided free of charge and
                runs entirely on free-tier services under the project
                creator&apos;s personal accounts. We use Vercel for hosting,
                Turso for database storage, and Brevo for email delivery — all
                on their respective free tiers.
              </p>
              <div className="bg-info/10 border border-info/30 rounded-lg p-4 mb-4">
                <p className="text-base-content/80 text-sm">
                  <strong className="text-info">Our Commitment:</strong> As a
                  .org domain, Auktiva strives to remain free and accessible to
                  everyone. We are committed to using free and open-source
                  services wherever possible to keep the platform running at no
                  cost to users.
                </p>
              </div>
              <p className="text-base-content/80 leading-relaxed">
                While we make every effort to keep the service running, please
                understand that free-tier services have limitations. There may
                be usage caps, occasional downtime, or service changes beyond
                our control. For mission-critical use cases or higher
                reliability requirements, we recommend self-hosting Auktiva on
                your own infrastructure.
              </p>
            </section>

            {/* Disclaimer of Warranties */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Disclaimer of Warranties
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                Auktiva is provided &quot;as is&quot; and &quot;as
                available&quot; without warranties of any kind, either express
                or implied. We do not guarantee that the service will be
                uninterrupted, secure, error-free, or meet your specific
                requirements. Use of the service is at your own risk.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Limitation of Liability
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                To the maximum extent permitted by law, Auktiva and its
                creators, contributors, and maintainers shall not be liable for
                any indirect, incidental, special, consequential, or punitive
                damages arising from your use of the service. This includes but
                is not limited to loss of profits, data, or goodwill, failed or
                disputed transactions, unauthorized access to your account, and
                service interruptions or errors.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Termination
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                We reserve the right to suspend or terminate accounts that
                violate these terms. You may delete your account at any time
                through your account settings. Upon termination, your access to
                the service will be revoked, but auction data you created may be
                retained for other participants.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Changes to Terms
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                We may update these Terms of Service from time to time. When we
                make significant changes, we will post a notice on the platform
                and update the &quot;Last updated&quot; date at the top of this
                page. Continued use of the service after changes constitutes
                acceptance of the new terms.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Governing Law
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                These terms shall be governed by and construed in accordance
                with applicable laws. Any disputes shall be resolved through
                good-faith negotiation or, if necessary, through appropriate
                legal channels in the relevant jurisdiction.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-base-content">
                Contact
              </h2>
              <p className="text-base-content/80 leading-relaxed">
                If you have questions about these Terms of Service, please reach
                out through our{" "}
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

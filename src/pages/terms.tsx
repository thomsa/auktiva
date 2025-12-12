import Head from "next/head";
import Link from "next/link";

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service - Auktiva</title>
        <meta
          name="description"
          content="Terms of Service for Auktiva - Open source auction platform"
        />
        <meta name="robots" content="noindex" />
      </Head>

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
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-base-content/70">Last updated: December 2024</p>

            <h2>Acceptance of Terms</h2>
            <p>
              By accessing or using Auktiva, you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do
              not use our service.
            </p>

            <h2>Description of Service</h2>
            <p>
              Auktiva is a free, open-source auction platform designed for
              internal auctions, fundraisers, and charity events. The platform
              facilitates bidding but does not process payments. All
              transactions are settled offline between participants.
            </p>

            <h2>User Accounts</h2>
            <p>To use Auktiva, you must:</p>
            <ul>
              <li>Create an account with accurate information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old or have parental consent</li>
              <li>Not share your account with others</li>
            </ul>

            <h2>Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for illegal purposes</li>
              <li>Post fraudulent or misleading auction items</li>
              <li>Harass or abuse other users</li>
              <li>Attempt to gain unauthorized access to the system</li>
              <li>Use automated systems to interact with the service</li>
            </ul>

            <h2>Auction Rules</h2>
            <p>
              Auctions are managed by their respective owners. Auction owners
              set the rules for their auctions, including bidding rules, item
              descriptions, and settlement terms. Auktiva is not responsible for
              disputes between auction participants.
            </p>

            <h2>No Payment Processing</h2>
            <p>
              Auktiva does not process payments. Winning bidders and item
              sellers are responsible for arranging payment and item exchange
              offline. Auktiva is not liable for any disputes arising from these
              transactions.
            </p>

            <h2>Content Ownership</h2>
            <p>
              You retain ownership of content you upload to Auktiva. By
              uploading content, you grant Auktiva a license to display that
              content to other auction participants.
            </p>

            <h2>Open Source License</h2>
            <p>
              Auktiva is open source software released under the MIT License.
              You may use, modify, and distribute the software according to the
              terms of that license. See our{" "}
              <a
                href="https://github.com/thomsa/auktiva/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary"
              >
                LICENSE file
              </a>{" "}
              for details.
            </p>

            <h2>Disclaimer of Warranties</h2>
            <p>
              Auktiva is provided &quot;as is&quot; without warranties of any
              kind. We do not guarantee that the service will be uninterrupted,
              secure, or error-free.
            </p>

            <h2>Limitation of Liability</h2>
            <p>
              Auktiva and its creators shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your
              use of the service.
            </p>

            <h2>Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the
              service after changes constitutes acceptance of the new terms.
            </p>

            <h2>Contact</h2>
            <p>
              For questions about these Terms of Service, please contact us
              through our{" "}
              <a
                href="https://github.com/thomsa/auktiva/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary"
              >
                GitHub Issues
              </a>
              .
            </p>
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

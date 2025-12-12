import Head from "next/head";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Auktiva</title>
        <meta
          name="description"
          content="Privacy Policy for Auktiva - Open source auction platform"
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
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-base-content/70">Last updated: December 2024</p>

            <h2>Introduction</h2>
            <p>
              Auktiva (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
              committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, and safeguard your information when you use
              our open-source auction platform.
            </p>

            <h2>Information We Collect</h2>
            <p>We collect information you provide directly to us:</p>
            <ul>
              <li>
                <strong>Account Information:</strong> Name, email address, and
                password when you create an account
              </li>
              <li>
                <strong>Auction Data:</strong> Information about auctions you
                create, items you list, and bids you place
              </li>
              <li>
                <strong>Uploaded Content:</strong> Images and descriptions you
                upload for auction items
              </li>
            </ul>

            <h2>How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our services</li>
              <li>Process your auction activities and bids</li>
              <li>Send you notifications about auction activity</li>
              <li>Respond to your comments and questions</li>
            </ul>

            <h2>Data Storage</h2>
            <p>
              If you use the hosted version at auktiva.org, your data is stored
              securely on our servers. If you self-host Auktiva, you are
              responsible for your own data storage and security.
            </p>

            <h2>Data Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal
              information to third parties. Your auction data is only visible to
              members of the auctions you participate in, according to the
              privacy settings configured by the auction owner.
            </p>

            <h2>Open Source</h2>
            <p>
              Auktiva is open source software. You can review our code on{" "}
              <a
                href="https://github.com/thomsa/auktiva"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary"
              >
                GitHub
              </a>{" "}
              to see exactly how we handle your data.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
            </ul>

            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us
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

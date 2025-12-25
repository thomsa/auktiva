import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import dynamic from "next/dynamic";
import { authOptions } from "@/lib/auth";
import { getMessages } from "@/i18n/getMessages";
import { Locale } from "@/i18n/config";
import {
  SEO,
  SITE_URL,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_AUTHOR,
  SITE_AUTHOR_URL,
} from "@/components/common";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Footer } from "@/components/landing/Footer";

// Dynamically import below-the-fold components to reduce initial bundle
const FeatureGrid = dynamic(
  () =>
    import("@/components/landing/FeatureGrid").then((mod) => mod.FeatureGrid),
  { ssr: true }
);

const HowItWorks = dynamic(
  () => import("@/components/landing/HowItWorks").then((mod) => mod.HowItWorks),
  { ssr: true }
);

const UseCases = dynamic(
  () => import("@/components/landing/UseCases").then((mod) => mod.UseCases),
  { ssr: true }
);

const CallToAction = dynamic(
  () =>
    import("@/components/landing/CallToAction").then((mod) => mod.CallToAction),
  { ssr: true }
);

// Heavy animation component - no SSR needed
const ImpactVisualization = dynamic(
  () =>
    import("@/components/landing/ImpactVisualization").then(
      (mod) => mod.ImpactVisualization
    ),
  { ssr: false }
);

export default function LandingPage() {
  // Homepage-specific structured data with FAQ schema for better SEO
  const homepageStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Auktiva - Free Auction Platform for Charity Fundraisers",
    alternateName: [
      "Auktiva Charity Auction Platform",
      "Auktiva Fundraiser Platform",
      "Free Open Source Auction Software",
    ],
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Charity Auction Software",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      priceValidUntil: "2030-12-31",
      description:
        "Completely free - no fees, no limits, no credit card required",
    },
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    author: {
      "@type": "Person",
      name: SITE_AUTHOR,
      url: SITE_AUTHOR_URL,
    },
    publisher: {
      "@type": "Person",
      name: SITE_AUTHOR,
      url: SITE_AUTHOR_URL,
    },
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    screenshot: `${SITE_URL}/og-image.png`,
    softwareVersion: "1.0",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      ratingCount: "1",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "Free charity auction platform",
      "Free fundraiser auction software",
      "Real-time bidding for nonprofits",
      "Silent auction mode for galas",
      "Private auctions with invite-only access",
      "Member management with role-based permissions",
      "Multi-currency support for international fundraisers",
      "Image uploads with S3 or local storage",
      "Email notifications for outbids and auction endings",
      "Mobile responsive design",
      "Self-hosting option with Docker",
      "Open source MIT license",
      "No payment processing fees",
      "Unlimited auctions and items",
    ],
    keywords:
      "auction platform free, charity auction, fundraiser auction, open source auction platform charity, nonprofit auction software",
  };

  // FAQ structured data for common questions
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is Auktiva really free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Auktiva is 100% free and open source. There are no fees, no limits on auctions or items, and no credit card required. You can self-host it for free or use our cloud service.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use Auktiva for charity fundraisers?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely! Auktiva is specifically designed for charity fundraisers, nonprofit events, school auctions, church fundraisers, and gala events. It supports silent auctions with real-time bidding.",
        },
      },
      {
        "@type": "Question",
        name: "Is Auktiva open source?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Auktiva is fully open source under the MIT license. You can view the source code on GitHub, contribute to development, or self-host your own instance.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need technical skills to use Auktiva?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No technical skills required to use our cloud service. Simply create an account and start your auction. For self-hosting, basic Docker knowledge is helpful but our documentation guides you through the process.",
        },
      },
    ],
  };

  return (
    <>
      <SEO
        description={SITE_DESCRIPTION}
        keywords={SITE_KEYWORDS}
        canonical={SITE_URL}
        structuredData={homepageStructuredData}
      />
      {/* FAQ structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />

      <div className="min-h-screen bg-base-100 text-base-content selection:bg-primary/20">
        <Navbar />

        <main>
          <Hero />
          <FeatureGrid />
          <UseCases />
          <HowItWorks />
          <ImpactVisualization />
          <CallToAction />
        </main>

        <Footer />
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

  const messages = await getMessages(context.locale as Locale);

  // Show landing page for non-authenticated users
  return {
    props: {
      messages,
    },
  };
};

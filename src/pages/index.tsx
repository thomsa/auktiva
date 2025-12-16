import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CallToAction } from "@/components/landing/CallToAction";
import { Footer } from "@/components/landing/Footer";
import { ImpactVisualization } from "@/components/landing/ImpactVisualization";

export default function LandingPage() {
  // Homepage-specific structured data with FAQ schema for better SEO
  const homepageStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Auktiva",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Auction Software",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
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
      "Real-time bidding",
      "Private auctions with invite-only access",
      "Member management with role-based permissions",
      "Multi-currency support",
      "Image uploads with S3 or local storage",
      "Email notifications for outbids and auction endings",
      "Mobile responsive design",
      "Self-hosting option with Docker",
      "Silent auction mode",
      "Bidder privacy controls",
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

      <div className="min-h-screen bg-base-100 text-base-content selection:bg-primary/20">
        <Navbar />

        <main>
          <Hero />
          <FeatureGrid />
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

  // Show landing page for non-authenticated users
  return {
    props: {},
  };
};

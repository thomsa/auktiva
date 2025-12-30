import Head from "next/head";

// Site-wide SEO constants
export const SITE_URL = "https://auktiva.org";
export const SITE_NAME = "Auktiva";
export const SITE_AUTHOR = "Tamas Lorincz";
export const SITE_AUTHOR_URL = "https://www.tamaslorincz.com";
export const SITE_TWITTER = "@auktiva";

// Comprehensive keyword list for auction platform SEO
// Primary target searches:
// - "open source auction platform charity"
// - "auction platform free", "auction free"
// - "auction fundraiser", "auction charity"
// - "auction platform charity", "auction platform fundraiser"
// - "auction platform charity free", "auction platform fundraiser free"
// - "declutter auction", "garage sale online", "sell unused items"
export const SITE_KEYWORDS = [
  // Primary high-intent keywords (exact match targets)
  "open source auction platform charity",
  "auction platform free",
  "auction free",
  "auction fundraiser",
  "auction charity",
  "auction platform charity",
  "auction platform fundraiser",
  "auction platform charity free",
  "auction platform fundraiser free",
  "free auction platform",
  // Charity & Fundraising variations
  "free charity auction software",
  "free fundraiser auction platform",
  "nonprofit auction platform free",
  "charity auction software free",
  "fundraising auction platform",
  "silent auction software free",
  "charity fundraising platform",
  "donation auction free",
  "benefit auction software",
  "gala auction platform",
  // Open source variations
  "open source auction software",
  "open source fundraiser platform",
  "open source charity software",
  "self-hosted auction platform",
  "auction platform github",
  // Event types
  "school auction platform free",
  "church auction software free",
  "nonprofit auction software",
  "community auction platform",
  "private auction software",
  // Decluttering & Personal use
  "declutter auction app",
  "sell unused items online",
  "garage sale online platform",
  "storage clearance auction",
  "yearly declutter sale",
  "family auction platform",
  "friends and family auction",
  "private sale platform free",
  "sell stuff to friends",
  "neighborhood auction app",
  // Features
  "real-time bidding platform",
  "silent auction app free",
  "online auction software free",
  "auction management system",
].join(", ");

export const SITE_DESCRIPTION =
  "Auktiva is a 100% free, open-source auction platform for charity fundraisers, nonprofit events, schools, churches, and personal use. Perfect for yearly decluttering, garage sales, or clearing out storage with friends and family. Create unlimited auctions with real-time bidding, member management, and multi-currency support. No fees, no limits, no credit card required.";

export const SITE_DESCRIPTION_SHORT =
  "Free open-source auction platform for charity fundraisers, decluttering sales, and private auctions with friends. Host unlimited auctions with real-time bidding - completely free, no fees ever.";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  noindex?: boolean;
  ogType?: "website" | "article" | "product";
  ogImage?: string;
  ogImageAlt?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  structuredData?: object;
}

export function SEO({
  title,
  description = SITE_DESCRIPTION_SHORT,
  keywords = SITE_KEYWORDS,
  canonical,
  noindex = false,
  ogType = "website",
  ogImage = `${SITE_URL}/pictures/og-image.png`,
  ogImageAlt = "Auktiva - Open Source Auction Platform",
  article,
  structuredData,
}: SEOProps) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} - Free Open Source Auction Platform for Fundraisers & Charities`;

  const canonicalUrl = canonical || SITE_URL;

  // Default structured data for the software application
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Auction Software",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
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
    featureList: [
      "Real-time bidding",
      "Private auctions",
      "Member management",
      "Multi-currency support",
      "Image uploads",
      "Email notifications",
      "Mobile responsive",
      "Self-hosting option",
    ],
  };

  // Organization structured data
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: SITE_DESCRIPTION_SHORT,
    founder: {
      "@type": "Person",
      name: SITE_AUTHOR,
      url: SITE_AUTHOR_URL,
    },
    sameAs: ["https://github.com/thomsa/auktiva"],
  };

  // WebSite structured data for search
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION_SHORT,
    publisher: {
      "@type": "Person",
      name: SITE_AUTHOR,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={SITE_AUTHOR} />
      <meta name="creator" content={SITE_AUTHOR} />
      <meta name="publisher" content={SITE_AUTHOR} />

      {/* Robots */}
      <meta
        name="robots"
        content={
          noindex
            ? "noindex, nofollow"
            : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        }
      />
      <meta
        name="googlebot"
        content={noindex ? "noindex, nofollow" : "index, follow"}
      />
      <meta
        name="bingbot"
        content={noindex ? "noindex, nofollow" : "index, follow"}
      />

      {/* Language & Locale */}
      <meta name="language" content="English" />
      <meta httpEquiv="content-language" content="en-US" />

      {/* Revisit & Cache */}
      <meta name="revisit-after" content="3 days" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Article specific OG tags */}
      {article && (
        <>
          {article.publishedTime && (
            <meta
              property="article:published_time"
              content={article.publishedTime}
            />
          )}
          {article.modifiedTime && (
            <meta
              property="article:modified_time"
              content={article.modifiedTime}
            />
          )}
          {article.author && (
            <meta property="article:author" content={article.author} />
          )}
          {article.section && (
            <meta property="article:section" content={article.section} />
          )}
          {article.tags?.map((tag, i) => (
            <meta key={i} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE_TWITTER} />
      <meta name="twitter:creator" content={SITE_TWITTER} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogImageAlt} />

      {/* Apple & Mobile */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      <meta name="application-name" content={SITE_NAME} />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="format-detection" content="telephone=no" />

      {/* Theme Color */}
      <meta name="theme-color" content="#6366f1" />
      <meta name="msapplication-TileColor" content="#6366f1" />
      <meta name="msapplication-navbutton-color" content="#6366f1" />

      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
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
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData || defaultStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteData),
        }}
      />
    </Head>
  );
}

// Page-specific SEO presets
export const pageSEO = {
  home: {
    title: undefined, // Uses default full title
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
  },
  login: {
    title: "Sign In",
    description:
      "Sign in to Auktiva to manage your auctions, place bids, and track your fundraising events. Free auction platform for charities and organizations.",
    keywords:
      "auction login, sign in auction platform, charity auction access, fundraiser login, auction account",
    noindex: true,
  },
  register: {
    title: "Create Free Account",
    description:
      "Create a free Auktiva account to start hosting charity auctions, fundraiser events, and silent auctions. No credit card required - completely free and open source.",
    keywords:
      "create auction account, free auction signup, charity auction registration, fundraiser account, auction platform signup",
    noindex: true,
  },
  dashboard: {
    title: "Dashboard",
    description:
      "Manage your auctions, view active bids, and track your fundraising progress. Your central hub for all auction activities.",
    noindex: true,
  },
  createAuction: {
    title: "Create New Auction",
    description:
      "Create a new auction for your charity, fundraiser, or organization. Set up private or public auctions with custom settings.",
    noindex: true,
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "Auktiva Privacy Policy - Learn how we protect your data and respect your privacy. Open source auction platform committed to data security.",
    keywords:
      "auction privacy policy, data protection, auction platform privacy",
    noindex: true,
  },
  terms: {
    title: "Terms of Service",
    description:
      "Auktiva Terms of Service - Understand the terms and conditions for using our free, open-source auction platform.",
    keywords:
      "auction terms of service, auction platform terms, usage agreement",
    noindex: true,
  },
};

export default SEO;

import Link from "next/link";
import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
import "./globals.css";

export const metadata = {
  title: {
    default: "Auktiva Documentation",
    template: "%s – Auktiva Docs",
  },
  description: "Auktiva - Self-hosted auction platform documentation",
};

const navbar = (
  <Navbar
    logo={
      <>
        <span style={{ fontWeight: 800, marginRight: "0.5rem" }}>Auktiva</span>
        <span style={{ color: "#666" }}>Documentation</span>
      </>
    }
    projectLink="https://github.com/thomsa/auktiva"
  >
    {/* Search disabled in dev - will work after build */}
  </Navbar>
);

const footer = (
  <Footer>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "2rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link href="https://auktiva.org" style={{ opacity: 0.7 }}>
          ← Back to App
        </Link>
        <a
          href="https://github.com/thomsa/auktiva"
          target="_blank"
          rel="noreferrer"
          style={{ opacity: 0.7 }}
        >
          GitHub
        </a>
        <a
          href="https://github.com/thomsa/auktiva/issues"
          target="_blank"
          rel="noreferrer"
          style={{ opacity: 0.7 }}
        >
          Report an Issue
        </a>
        <a
          href="https://github.com/thomsa/auktiva/releases"
          target="_blank"
          rel="noreferrer"
          style={{ opacity: 0.7 }}
        >
          Releases
        </a>
      </div>
      <div style={{ textAlign: "center", opacity: 0.6, fontSize: "0.875rem" }}>
        MIT {new Date().getFullYear()} ©{" "}
        <a href="https://auktiva.org" target="_blank" rel="noreferrer">
          Auktiva
        </a>
      </div>
    </div>
  </Footer>
);

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head
        faviconGlyph="🔨"
        color={{
          hue: { light: 300, dark: 300 },
          saturation: { light: 80, dark: 80 },
          lightness: { light: 45, dark: 55 },
        }}
      >
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/thomsa/auktiva/tree/main/docs"
          footer={footer}
          sidebar={{ defaultMenuCollapseLevel: 1, toggleButton: true }}
          toc={{ backToTop: true }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}

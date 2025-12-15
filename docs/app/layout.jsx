import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";

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
    MIT {new Date().getFullYear()} ©{" "}
    <a href="https://auktiva.org" target="_blank" rel="noreferrer">
      Auktiva
    </a>
  </Footer>
);

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
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

import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import * as auctionService from "@/lib/services/auction.service";
import { RichTextRenderer } from "@/components/ui/rich-text-editor";

interface PublicAuctionPageProps {
  auction: {
    id: string;
    name: string;
    description: string | null;
    thumbnailUrl: string | null;
    endDate: string | null;
    joinMode: string;
    creatorName: string | null;
    _count: {
      items: number;
      members: number;
    };
  };
  baseUrl: string;
}

export default function PublicAuctionPage({
  auction,
  baseUrl,
}: PublicAuctionPageProps) {
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations("auction.public");
  const tCommon = useTranslations("common");

  const isLoggedIn = status === "authenticated";
  const isLoading = status === "loading";

  const ogImageUrl = auction.thumbnailUrl || `${baseUrl}/pictures/og-image.png`;
  const ogUrl = `${baseUrl}/a/${auction.id}`;
  const plainDescription = auction.description
    ? auction.description.replace(/<[^>]*>/g, "").slice(0, 200)
    : t("defaultDescription");

  const handleJoin = () => {
    if (isLoggedIn) {
      router.push(`/auctions/${auction.id}`);
    } else {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/auctions/${auction.id}`)}`,
      );
    }
  };

  return (
    <>
      <Head>
        <title>{`${auction.name} | ${tCommon("appName")}`}</title>
        <meta name="description" content={plainDescription} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:title" content={auction.name} />
        <meta property="og:description" content={plainDescription} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:site_name" content={tCommon("appName")} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={ogUrl} />
        <meta name="twitter:title" content={auction.name} />
        <meta name="twitter:description" content={plainDescription} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Head>

      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
        </div>

        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl max-w-lg w-full relative z-10">
          <div className="card-body p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                {auction.thumbnailUrl ? (
                  <picture>
                    <img
                      src={auction.thumbnailUrl}
                      alt={auction.name}
                      className="w-24 h-24 rounded-3xl object-cover relative z-10 border border-base-content/5 shadow-lg"
                    />
                  </picture>
                ) : (
                  <div className="w-24 h-24 bg-linear-to-br from-primary/10 to-secondary/10 rounded-3xl flex items-center justify-center relative z-10 border border-base-content/5 rotate-3">
                    <span className="icon-[tabler--gavel] size-12 text-primary -rotate-3"></span>
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-extrabold mt-6 bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                {auction.name}
              </h1>
              {auction.creatorName && (
                <p className="text-base-content/60 mt-2">
                  {t("hostedBy", { name: auction.creatorName })}
                </p>
              )}
            </div>

            {/* Auction Info */}
            <div className="bg-base-100/80 rounded-xl p-5 mb-6 border border-base-content/5 shadow-inner">
              {auction.description && (
                <div className="mb-4">
                  <RichTextRenderer
                    content={auction.description}
                    className="text-sm text-base-content/70"
                  />
                </div>
              )}

              <div className="divider my-3 opacity-50"></div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col items-center p-3 bg-base-200/50 rounded-lg">
                  <span className="icon-[tabler--package] size-5 text-primary mb-1"></span>
                  <span className="font-bold text-lg">
                    {auction._count.items}
                  </span>
                  <span className="text-base-content/60 text-xs">
                    {t("items")}
                  </span>
                </div>
                <div className="flex flex-col items-center p-3 bg-base-200/50 rounded-lg">
                  <span className="icon-[tabler--users] size-5 text-secondary mb-1"></span>
                  <span className="font-bold text-lg">
                    {auction._count.members}
                  </span>
                  <span className="text-base-content/60 text-xs">
                    {t("members")}
                  </span>
                </div>
              </div>

              {auction.endDate && (
                <div className="mt-4 text-center">
                  <div className="badge badge-outline gap-1">
                    <span className="icon-[tabler--clock] size-3"></span>
                    {t("endsOn", {
                      date: new Date(auction.endDate).toLocaleDateString(),
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="space-y-4">
              <button
                onClick={handleJoin}
                disabled={isLoading}
                className="btn btn-primary btn-lg w-full shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  <>
                    <span className="icon-[tabler--login] size-5"></span>
                    {isLoggedIn ? t("viewAuction") : t("joinAuction")}
                  </>
                )}
              </button>

              {!isLoggedIn && (
                <>
                  <div className="text-center">
                    <span className="text-xs text-base-content/40 uppercase font-bold tracking-widest">
                      {t("or")}
                    </span>
                  </div>
                  <Link
                    href={`/register?callbackUrl=${encodeURIComponent(
                      `/auctions/${auction.id}`,
                    )}`}
                    className="btn btn-outline w-full hover:bg-base-content/5"
                  >
                    {t("createAccount")}
                  </Link>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-base-content/50 hover:text-primary transition-colors"
              >
                {t("poweredBy", { appName: tCommon("appName") })}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auctionId = context.params?.id as string;

  const auction = await auctionService.getPublicAuctionData(auctionId);

  if (!auction) {
    return {
      notFound: true,
    };
  }

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host = context.req.headers.host || "localhost:3000";
  const baseUrl = `${protocol}://${host}`;

  return {
    props: {
      auction,
      baseUrl,
      messages: await getMessages(context.locale as Locale),
    },
  };
};

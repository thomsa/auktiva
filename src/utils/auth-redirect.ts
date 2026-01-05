import type { GetServerSidePropsContext, Redirect } from "next";

/**
 * Creates a redirect to the login page with the current URL as redirectUrl.
 * This allows users to be redirected back to their original destination after login.
 *
 * @param context - The GetServerSideProps context containing the request URL
 * @returns A redirect object for use in getServerSideProps
 *
 * @example
 * export const getServerSideProps: GetServerSideProps = async (context) => {
 *   const session = await getServerSession(context.req, context.res, authOptions);
 *   if (!session) {
 *     return { redirect: createLoginRedirect(context) };
 *   }
 *   // ...
 * };
 */
export function createLoginRedirect(
  context: GetServerSidePropsContext,
): Redirect {
  // Build the full URL path including query string
  const { resolvedUrl } = context;

  // Encode the callback URL to safely include it as a query parameter
  const redirectUrl = encodeURIComponent(resolvedUrl);

  return {
    destination: `/login?redirectUrl=${redirectUrl}`,
    permanent: false,
  };
}

/**
 * Validates and sanitizes a callback URL to prevent open redirect attacks.
 * Only allows relative URLs (starting with /) to the same origin.
 *
 * @param redirectUrl - The callback URL to validate
 * @param defaultUrl - The default URL to return if validation fails
 * @returns A safe URL to redirect to
 */
export function getSafeRedirectUrl(
  redirectUrl: string | string[] | undefined,
  defaultUrl: string = "/dashboard",
): string {
  if (!redirectUrl || Array.isArray(redirectUrl)) {
    return defaultUrl;
  }

  // Decode the URL
  let decoded: string;
  try {
    decoded = decodeURIComponent(redirectUrl);
  } catch {
    return defaultUrl;
  }

  // Only allow relative URLs starting with /
  // This prevents open redirect attacks to external sites
  if (!decoded.startsWith("/")) {
    return defaultUrl;
  }

  // Prevent protocol-relative URLs (//evil.com)
  if (decoded.startsWith("//")) {
    return defaultUrl;
  }

  // Prevent javascript: or other protocol URLs
  if (decoded.includes(":")) {
    return defaultUrl;
  }

  return decoded;
}

import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  Redirect,
} from "next";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Extended context with authenticated session
 */
export interface AuthenticatedContext extends GetServerSidePropsContext {
  session: Session & {
    user: { id: string; name?: string | null; email?: string | null };
  };
}

/**
 * Type for authenticated getServerSideProps handler
 */
export type AuthenticatedGetServerSideProps<P = Record<string, unknown>> = (
  context: AuthenticatedContext,
) => Promise<GetServerSidePropsResult<P>>;

/**
 * Creates a redirect to the login page with the current URL as redirectUrl.
 */
function createLoginRedirect(context: GetServerSidePropsContext): Redirect {
  const { resolvedUrl } = context;
  const redirectUrl = encodeURIComponent(resolvedUrl);

  return {
    destination: `/login?redirectUrl=${redirectUrl}`,
    permanent: false,
  };
}

/**
 * HOC wrapper that handles authentication for getServerSideProps.
 * Automatically redirects to login with redirectUrl if not authenticated.
 *
 * @param handler - The getServerSideProps handler that receives authenticated context
 * @returns A wrapped getServerSideProps function
 *
 * @example
 * export const getServerSideProps = withAuth(async (context) => {
 *   // context.session is guaranteed to exist and have user.id
 *   const userId = context.session.user.id;
 *   return { props: { userId } };
 * });
 */
export function withAuth<P extends Record<string, unknown>>(
  handler: AuthenticatedGetServerSideProps<P>,
): GetServerSideProps<P> {
  return async (context) => {
    const session = await getServerSession(
      context.req,
      context.res,
      authOptions,
    );

    if (!session?.user?.id) {
      return { redirect: createLoginRedirect(context) };
    }

    // Cast context with session
    const authenticatedContext = {
      ...context,
      session: session as AuthenticatedContext["session"],
    };

    return handler(authenticatedContext);
  };
}

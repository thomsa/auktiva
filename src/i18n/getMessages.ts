import { Locale } from "./config";

export async function getMessages(locale: Locale) {
  return {
    ...(await import(`../../messages/${locale}/common.json`)).default,
    ...(await import(`../../messages/${locale}/auth.json`)).default,
    ...(await import(`../../messages/${locale}/landing.json`)).default,
    ...(await import(`../../messages/${locale}/auction.json`)).default,
    ...(await import(`../../messages/${locale}/item.json`)).default,
    ...(await import(`../../messages/${locale}/dashboard.json`)).default,
    ...(await import(`../../messages/${locale}/settings.json`)).default,
    ...(await import(`../../messages/${locale}/errors.json`)).default,
    ...(await import(`../../messages/${locale}/legal.json`)).default,
    ...(await import(`../../messages/${locale}/maintenance.json`)).default,
    ...(await import(`../../messages/${locale}/listings.json`)).default,
    ...(await import(`../../messages/${locale}/bulkEdit.json`)).default,
    ...(await import(`../../messages/${locale}/csvImport.json`)).default,
  };
}

export function getStaticPropsWithMessages(locale: string) {
  return async () => {
    const messages = await getMessages(locale as Locale);
    return {
      props: {
        messages,
      },
    };
  };
}

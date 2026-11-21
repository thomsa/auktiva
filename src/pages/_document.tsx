import { Html, Head, Main, NextScript } from "next/document";

const themeScript = `
(function() {
  var now = new Date();
  var month = now.getMonth() + 1;
  var day = now.getDate();
  if ((month === 11 && day >= 20) || month === 12 || (month === 1 && day <= 6)) {
    document.documentElement.setAttribute('data-season', 'christmas');
  }

  try {
    var theme = localStorage.getItem('auktiva-theme') || 'system';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head />
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

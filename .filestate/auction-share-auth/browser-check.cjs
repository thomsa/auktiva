const assert = require("node:assert/strict");
const path = require("node:path");
const modules = "/home/tamas/historey.shorts/anim/node_modules";
const esbuild = require(modules + "/esbuild");
const { chromium } = require("/home/tamas/src/nextcloud-proofing-gallery-013/node_modules/playwright");
const root = process.env.AUKTIVA_SNAPSHOT || path.join(__dirname, "source");
let verificationUrl;
const stubs = {
  "next/router": "export const useRouter = () => ({query: globalThis.query, push: (href) => globalThis.navigate(href)});",
  "next/link": "import React from 'react'; export default function Link(props) { return React.createElement('a', props); }",
  "next-auth": "export const getServerSession = async () => null;",
  "next-auth/react": "export const signIn = async () => ({ok: true});",
  "next-intl": "export const useTranslations = () => (key) => key;",
  "@/lib/auth": "export const authOptions = {};",
  "@/i18n": "export const getMessages = async () => ({});",
  "@/components/common": "export const AlertMessage = ({children}) => children; export const SEO = () => null;",
  "@/components/ui/button": "import React from 'react'; export const Button = ({isLoading, loadingText, ...props}) => React.createElement('button', props);",
  "@/components/auth/google-sign-in-button": "export const GoogleSignInButton = () => null;",
  "@/components/auth/microsoft-sign-in-button": "export const MicrosoftSignInButton = () => null;",
  "react-google-recaptcha": "export default () => null;",
  "@/lib/prisma": "export const prisma = { emailVerificationToken: { count: async () => 0, deleteMany: async () => {}, create: async () => {} }, user: { findUnique: async () => null, create: async ({data}) => ({id: 'user', ...data}) } };",
  "bcryptjs": "export const hash = async () => 'test-hash';",
  "@/lib/email": "export const sendEmail = async ({replacements}) => globalThis.captureVerificationUrl(replacements);",
  "@/lib/email/templates": "export const getEmailVerificationTemplateData = ({verificationUrl}) => ({replacements: verificationUrl}); export const getPasswordResetTemplateData = () => ({}); export const getAccountExistsTemplateData = () => ({});",
};
const dependencies = {
  name: "local-test-dependencies",
  setup(build) {
    build.onResolve({filter: /.*/}, ({path: id}) => {
      if (Object.hasOwn(stubs, id)) return {path: id, namespace: "stub"};
      if (id.startsWith("@/")) return {path: path.join(root, "src", id.slice(2) + ".ts")};
    });
    build.onLoad({filter: /.*/, namespace: "stub"}, ({path: id}) => ({contents: stubs[id], resolveDir: root}));
  },
};
const buildOptions = {bundle: true, write: false, jsx: "automatic", nodePaths: [modules], plugins: [dependencies], logLevel: "silent"};
async function run() {
  const routes = ["login", "register", "verify-email"];
  const browserBundle = await esbuild.build({...buildOptions, stdin: {
    resolveDir: root,
    contents: `
      import React from "react";
      import { createRoot } from "react-dom/client";
      ${routes.map((r,i) => `import Page${i}, { getServerSideProps as props${i} } from "./src/pages/${r}.tsx";`).join("\n")}
      (async () => {
        globalThis.navigate ??= (href) => location.assign(href);
        globalThis.process ??= {env: {}};
        const route = location.pathname.slice(1);
        const index = ${JSON.stringify(routes)}.indexOf(route);
        const query = globalThis.query = Object.fromEntries(new URLSearchParams(location.search));
        const { props } = await [${routes.map((r,i)=>"props"+i)}][index]({query});
        createRoot(document.getElementById("root")).render(React.createElement([${routes.map((r,i)=>"Page"+i)}][index], props));
      })();
    `,
  }});
  const serviceBuild = await esbuild.build({...buildOptions, entryPoints: [path.join(root, "src/lib/services/auth.service.ts")], platform: "node", format: "cjs"});
  const service = {exports: {}};
  new Function("module", "exports", "require", serviceBuild.outputFiles[0].text)(service, service.exports, require);
  globalThis.captureVerificationUrl = (url) => { verificationUrl = url; };
  const destination = "/auctions/auction-123";
  const base = process.env.NEXT_PUBLIC_APP_URL = process.env.AUTH_URL = "http://auktiva.test";
  async function intercept(route) {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/bundle.js") {
      return route.fulfill({contentType: "text/javascript", body: browserBundle.outputFiles[0].text});
    }
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname.endsWith("/register")) await service.exports.registerUser(request.postDataJSON());
      return route.fulfill({json: {}});
    }
    let body = url.pathname;
    if (url.pathname === "/a/auction-123") {
      body = `<a href="/register?callbackUrl=${encodeURIComponent(destination)}">Register</a>
        <a href="/login?callbackUrl=${encodeURIComponent(destination)}">Sign in</a>`;
    } else if (routes.includes(url.pathname.slice(1))) {
      body = '<div id="root"></div><script src="/bundle.js"></script>';
    }
    return route.fulfill({contentType: "text/html", body});
  }
  if (process.env.AUKTIVA_DOM_ONLY === "1") {
    const { JSDOM } = require("/home/tamas/src/nextcloud-proofing-gallery-013/node_modules/jsdom");
    async function open(href) {
      const dom = new JSDOM('<div id="root"></div>', {url: new URL(href, base).href, runScripts: "outside-only"});
      const {window} = dom;
      const result = {window, navigation: null};
      window.navigate = href => { result.navigation = href; };
      window.fetch = async (url, options) => {
        if (url.endsWith("/register")) await service.exports.registerUser(JSON.parse(options.body));
        return {ok: true, json: async () => ({})};
      };
      window.eval(browserBundle.outputFiles[0].text);
      return result;
    }
    const until = async test => {
      for (let attempt = 0; attempt < 200; attempt++) {
        if (test()) return;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      assert.fail("Timed out waiting for page state");
    };
    async function submit(page, values) {
      const {window} = page;
      await until(() => window.document.querySelector("form"));
      const form = window.document.querySelector("form");
      for (const [name, value] of Object.entries(values)) form.elements[name].value = value;
      form.dispatchEvent(new window.Event("submit", {bubbles: true, cancelable: true}));
    }
    const credentials = {email: "bidder@example.test", password: "example-password"};
    const register = await open("/register?callbackUrl=" + encodeURIComponent(destination));
    await submit(register, {...credentials, name: "Test Bidder", confirmPassword: credentials.password});
    await until(() => verificationUrl);
    assert.equal(new URL(verificationUrl).searchParams.get("redirectUrl"), destination);
    register.window.close();
    const verify = await open(verificationUrl);
    await until(() => verify.navigation);
    assert.equal(new URL(verify.navigation, base).searchParams.get("verified"), "true");
    const login = await open(verify.navigation);
    verify.window.close();
    await submit(login, credentials);
    await until(() => login.navigation);
    assert.equal(login.navigation, destination);
    login.window.close();

    for (const [href, target] of [
      ["/login?callbackUrl=" + encodeURIComponent(destination), destination],
      ["/login?redirectUrl=" + encodeURIComponent(destination + "?view=list%26grid"), destination + "?view=list%26grid"],
      ["/login?callbackUrl=" + encodeURIComponent("/\\example.org"), "/dashboard"],
      ["/login", "/dashboard"],
    ]) {
      const page = await open(href);
      await submit(page, credentials);
      await until(() => page.navigation);
      assert.equal(page.navigation, target);
      page.window.close();
    }
    console.log("DOM regression passed: registration, verification in a fresh context, email login, encoded destination, invalid destination, and dashboard fallback.");
    return;
  }
  let browser;
  try {
    browser = await chromium.launch({executablePath: "/home/tamas/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell", args: ["--no-sandbox"]});
    async function signIn(page) {
      await page.locator('[name=email]').fill("bidder@example.test");
      await page.locator('[name=password]').fill("example-password");
      await page.locator('button[type=submit]').click();
    }
    const page = await browser.newPage();
    await page.route(base + "/**", intercept);
    await page.goto(base + "/a/auction-123");
    await page.getByRole("link", {name:"Register"}).click();
    await page.locator('[name=name]').fill("Test Bidder");
    await page.locator('[name=email]').fill("bidder@example.test");
    await page.locator('[name=password]').fill("example-password");
    await page.locator('[name=confirmPassword]').fill("example-password");
    await page.locator('button[type=submit]').click();
    await page.getByText("verifyEmailTitle", {exact:true}).waitFor();
    assert.equal(new URL(verificationUrl).searchParams.get("redirectUrl"), destination);
    const emailTab = await browser.newPage();
    await emailTab.route(base + "/**", intercept);
    await emailTab.goto(verificationUrl);
    await emailTab.waitForURL(url => url.pathname === "/login" && url.searchParams.get("verified") === "true");
    await signIn(emailTab);
    await emailTab.waitForURL(base + destination);
    await page.goto(base + "/a/auction-123");
    await page.getByRole("link", {name:"Sign in"}).click();
    await signIn(page);
    await page.waitForURL(base + destination);
    await page.goto(base + "/login");
    await signIn(page);
    await page.waitForURL(base + "/dashboard");
    console.log("Browser routing checks passed: registration with verification in a fresh browser context, existing account login, and dashboard fallback.");
  } finally {
    await browser?.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });

import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      Welcome to Auktiva, {{NAME}}! 🎉
    </mj-text>
    <mj-text>
      Thank you for joining Auktiva - your private auction platform. We're excited to have you on board!
    </mj-text>
    <mj-text>
      With Auktiva, you can:
    </mj-text>
    <mj-text padding-left="20px">
      • Create and manage private auctions<br/>
      • Invite friends and colleagues to bid<br/>
      • Track your bids in real-time<br/>
      • Customize auction settings to your needs
    </mj-text>
    <mj-text>
      Ready to get started? Click the button below to explore your dashboard.
    </mj-text>
    <mj-button href="{{APP_URL}}/dashboard">
      Go to Dashboard
    </mj-button>
`;

export const welcomeTemplate = renderLayout({
  title: "Welcome to Auktiva",
  previewText: "Welcome to Auktiva - Your Private Auction Platform",
  content,
});

export function getWelcomeTemplateData(data: { name: string; appUrl: string }) {
  return {
    template: welcomeTemplate,
    replacements: {
      // HTML-encode user-provided content to prevent injection
      "{{NAME}}": escapeHtml(data.name || "there"),
      "{{APP_URL}}": data.appUrl,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}

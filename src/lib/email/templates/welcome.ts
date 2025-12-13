export const welcomeTemplate = `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" />
      <mj-text font-size="14px" color="#374151" line-height="1.6" />
      <mj-button background-color="#6366f1" color="#ffffff" font-size="16px" font-weight="600" border-radius="8px" padding="12px 24px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f3f4f6">
    <mj-section padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="28px" font-weight="700" color="#6366f1">
          Auktiva
        </mj-text>
      </mj-column>
    </mj-section>
    
    <mj-section background-color="#ffffff" border-radius="12px" padding="32px">
      <mj-column>
        <mj-text font-size="22px" font-weight="600" color="#111827">
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
      </mj-column>
    </mj-section>
    
    <mj-section padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#9ca3af">
          © {{YEAR}} Auktiva.org - Your Private Auction Platform
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

export function getWelcomeTemplateData(data: { name: string; appUrl: string }) {
  return {
    template: welcomeTemplate,
    replacements: {
      "{{NAME}}": data.name || "there",
      "{{APP_URL}}": data.appUrl,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
